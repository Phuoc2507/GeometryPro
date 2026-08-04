import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { setSentryUser } from '@/lib/sentry';
import { buildMigrationRows } from '@/lib/history/anonMigration';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_type: string | null;
  plan_expires_at: string | null;
  // Ví credit (thêm ở migration credit; có thể undefined nếu chưa áp SQL).
  plan_tier?: string | null;
  plan_code?: string | null;
  plan_credits?: number | null;
  purchased_credits?: number | null;
  // Vai trò: 'user' (mặc định) hoặc 'admin'. Có thể undefined nếu chưa áp migration role.
  role?: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isPro: boolean;
  isAdmin: boolean;             // tài khoản quản trị viên (profile.role === 'admin')
  // Ví credit
  tier: string;                 // tier hiệu lực ('free' nếu hết hạn)
  // Vai trò bị KHOÁ theo gói đang hiệu lực: 'student' | 'teacher' | null (null = tự do đổi).
  // Hết hạn → tier về 'free' → tự mở khoá lại.
  lockedRole: 'student' | 'teacher' | null;
  isRoleLocked: boolean;
  credits: number;              // tổng còn lại = plan + purchased
  planCredits: number;          // credit theo gói (reset mỗi kỳ)
  purchasedCredits: number;     // credit mua lẻ (không hết hạn)
  drawQuotaRemaining: number | null;  // số lượt vẽ free còn lại hôm nay (null nếu chưa biết)
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;

  // Auth Modal State
  isAuthModalOpen: boolean;
  authModalReason: 'save' | 'project' | 'quota' | 'general' | 'advance' | null;
  openAuthModal: (reason?: 'save' | 'project' | 'quota' | 'general' | 'advance') => void;
  closeAuthModal: () => void;

  // Upgrade Modal (mở khi hết credit/quota hoặc bấm "Nâng cấp")
  isUpgradeModalOpen: boolean;
  openUpgradeModal: () => void;
  closeUpgradeModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [drawQuotaRemaining, setDrawQuotaRemaining] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const migrationInFlight = useRef(false);
  // Đã từng có phiên đăng nhập trong vòng đời tab này (phân biệt hết hạn vs chưa từng đăng nhập).
  const hadSession = useRef(false);
  // Đăng xuất do NGƯỜI DÙNG chủ động (nút Đăng xuất / xử lý hết phiên ở nơi khác) → không báo "hết hạn".
  const intentionalSignOut = useRef(false);

  // Cờ "vừa bấm đăng nhập" (đặt trước khi gọi Supabase, kể cả trước vòng OAuth chuyển trang);
  // tiêu thụ đúng MỘT lần khi phiên xuất hiện → toast thành công. Reload có phiên cũ thì im lặng.
  const consumeSignInToast = () => {
    if (sessionStorage.getItem('geo3d:pending-signin')) {
      sessionStorage.removeItem('geo3d:pending-signin');
      toast.success('Đăng nhập thành công');
    }
  };

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<'save' | 'project' | 'quota' | 'general' | 'advance' | null>(null);

  const openAuthModal = (reason: 'save' | 'project' | 'quota' | 'general' | 'advance' = 'general') => {
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalReason(null);
  };

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const openUpgradeModal = () => setIsUpgradeModalOpen(true);
  const closeUpgradeModal = () => setIsUpgradeModalOpen(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
    }

    // Số lượt VẼ miễn phí còn lại (gói free đếm bằng usage_counters phía server).
    // Fetch luôn cho mọi user (query nhỏ); chỉ hiển thị khi tier='free'.
    const FREE_DRAW_MAX = 3;
    const DRAW_PERIOD_MS = 24 * 60 * 60 * 1000;
    const { data: ctr } = await supabase
      .from('usage_counters')
      .select('used, window_start')
      .eq('user_id', userId)
      .eq('feature', 'draw')
      .maybeSingle();
    if (!ctr) {
      setDrawQuotaRemaining(FREE_DRAW_MAX);
    } else {
      const windowActive = Date.now() < new Date(ctr.window_start).getTime() + DRAW_PERIOD_MS;
      setDrawQuotaRemaining(windowActive ? Math.max(0, FREE_DRAW_MAX - ctr.used) : FREE_DRAW_MAX);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user]);

  // Di trú lịch sử vẽ vô danh (localStorage) sang tài khoản khi đăng nhập lần đầu.
  // Trước đây khi đăng nhập, useGeometryHistory chuyển thẳng sang query Supabase và
  // BỎ RƠI các bản vẽ khách → "Gần đây" trống trơn, ngược lời hứa "đồng bộ mọi thiết bị".
  // Idempotent: chỉ chạy khi còn dữ liệu local, xoá local sau khi upload thành công,
  // và có cờ in-flight chống chạy trùng (SIGNED_IN có thể bắn nhiều lần).
  const migrateAnonymousHistory = useCallback(async (userId: string) => {
    if (migrationInFlight.current) return;
    const raw = localStorage.getItem('geo3d_anonymous_history');
    if (!raw) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.removeItem('geo3d_anonymous_history');
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem('geo3d_anonymous_history');
      return;
    }

    migrationInFlight.current = true;
    try {
      // Chỉ tái dùng id local khi là UUID hợp lệ (bản mới); id cũ "Local_..." → cấp uuid mới,
      // tránh 22P02 làm 400 cả mẻ upsert. Chi tiết ở buildMigrationRows.
      const rows = buildMigrationRows(parsed, userId);

      if (rows.length === 0) {
        localStorage.removeItem('geo3d_anonymous_history');
        return;
      }

      const { error } = await supabase
        .from('saved_geometries')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;

      localStorage.removeItem('geo3d_anonymous_history');
      window.dispatchEvent(new Event('geo3d_history_sync'));
      toast.success(`Đã đồng bộ ${rows.length} bản vẽ vào tài khoản`);
    } catch (err) {
      // Lỗi mạng/RLS → GIỮ NGUYÊN localStorage để thử lại lần đăng nhập sau, không mất dữ liệu.
      console.error('Failed to migrate anonymous history:', err);
    } finally {
      migrationInFlight.current = false;
    }
  }, []);

  // Chạy khi user chuyển sang trạng thái đã đăng nhập (login mới hoặc khôi phục phiên).
  useEffect(() => {
    if (user) migrateAnonymousHistory(user.id);
  }, [user, migrateAnonymousHistory]);

  // Số dư credit đổi ở server (vẽ, thanh toán ở tab khác...) -> refresh khi tab được focus / hiện lại.
  // visibilitychange bắt được cả trường hợp PWA/mobile quay lại tab nền (focus không luôn bắn).
  useEffect(() => {
    const refetch = () => { if (user) fetchProfile(user.id); };
    const onVisible = () => { if (document.visibilityState === 'visible') refetch(); };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setSentryUser(session.user.id);
          consumeSignInToast();
          hadSession.current = true;
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setSentryUser(null);
          setProfile(null);
          // Phiên hết hạn (Supabase tự đăng xuất khi refresh token hỏng) mà KHÔNG do người dùng
          // chủ động → trước đây im lặng. Giờ báo rõ để họ biết cần đăng nhập lại.
          if (event === 'SIGNED_OUT' && hadSession.current && !intentionalSignOut.current) {
            toast.error('Phiên đăng nhập đã hết hạn', {
              description: 'Vui lòng đăng nhập lại để tiếp tục.',
            });
          }
          intentionalSignOut.current = false;
          hadSession.current = false;
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setSentryUser(session.user.id);
        consumeSignInToast();
        hadSession.current = true;
        fetchProfile(session.user.id);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    sessionStorage.setItem('geo3d:pending-signin', '1');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) sessionStorage.removeItem('geo3d:pending-signin');  // đăng nhập hỏng → đừng toast nhầm ở lần sau
    return { error: error as Error | null };
  };

  // Sau vòng OAuth, Supabase quay lại URL này rồi tự bắt session; đưa về /auth mang
  // theo ?redirect để Auth trả người dùng về đúng đích họ đang muốn tới.
  const authReturnUrl = (redirectPath?: string) =>
    redirectPath
      ? `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectPath)}`
      : `${window.location.origin}/`;

  const signInWithGoogle = async (redirectPath?: string) => {
    // Đặt cờ TRƯỚC khi chuyển sang Google; sau khi quay lại, phiên xuất hiện sẽ tiêu thụ cờ → toast.
    sessionStorage.setItem('geo3d:pending-signin', '1');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authReturnUrl(redirectPath),
      },
    });
    if (error) sessionStorage.removeItem('geo3d:pending-signin');
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string, redirectPath?: string) => {
    const redirectUrl = authReturnUrl(redirectPath);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    intentionalSignOut.current = true;  // đăng xuất chủ động → SIGNED_OUT không báo "hết hạn"
    await supabase.auth.signOut();
    setProfile(null);
  };

  // Xoá vĩnh viễn tài khoản + dữ liệu (gọi endpoint service-role), rồi dọn phiên cục bộ.
  const deleteAccount = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return { error: new Error('Bạn cần đăng nhập lại để xoá tài khoản') };

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { error: new Error(body.error || 'Không xoá được tài khoản') };
      }

      // Tài khoản đã bị xoá ở server → dọn phiên cục bộ (đăng xuất chủ động, không báo "hết hạn").
      intentionalSignOut.current = true;
      await supabase.auth.signOut();
      setProfile(null);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('Không xoá được tài khoản') };
    }
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>) => {
    if (!user) return { error: new Error('Chưa đăng nhập') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }

    return { error: error as Error | null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    return { error: error as Error | null };
  };

  // Đặt mật khẩu mới trong phiên khôi phục (sau khi bấm link reset trong email).
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  };

  const isPro = profile?.plan_type === 'pro' && profile?.plan_expires_at
    ? new Date(profile.plan_expires_at) > new Date()
    : false;

  // Quyền admin không phụ thuộc gói/credit — chỉ dựa trên cột role trong hồ sơ.
  const isAdmin = profile?.role === 'admin';

  // Ví credit — tier hiệu lực hạ về 'free' khi gói hết hạn (mirror effective_tier ở SQL).
  const planActive = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at).getTime() > Date.now()
    : false;
  const tier = planActive
    ? (profile?.plan_tier || (profile?.plan_type === 'pro' ? 'pro' : 'free'))
    : 'free';
  // numeric(12,2) về từ PostgREST là CHUỖI -> ép Number, không thì "+" thành nối chuỗi.
  const planCredits = tier === 'free' ? 0 : Number(profile?.plan_credits ?? 0);
  const purchasedCredits = Number(profile?.purchased_credits ?? 0);  // không hết hạn
  const credits = planCredits + purchasedCredits;

  // Vai trò bị khoá theo gói: tier 'student' → học sinh; tier trả phí khác → giáo viên; free → mở khoá.
  // ADMIN được MIỄN khoá — tự do chuyển Học sinh ↔ Giáo viên bất kể gói (để test/hỗ trợ khách).
  const planLockedRole: 'student' | 'teacher' | null =
    tier === 'free' ? null : (tier === 'student' ? 'student' : 'teacher');
  const lockedRole: 'student' | 'teacher' | null = isAdmin ? null : planLockedRole;
  const isRoleLocked = lockedRole !== null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isPro,
      isAdmin,
      tier,
      lockedRole,
      isRoleLocked,
      credits,
      planCredits,
      purchasedCredits,
      drawQuotaRemaining,
      refreshProfile,
      isLoading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      deleteAccount,
      updateProfile,
      resetPassword,
      updatePassword,
      isAuthModalOpen,
      authModalReason,
      openAuthModal,
      closeAuthModal,
      isUpgradeModalOpen,
      openUpgradeModal,
      closeUpgradeModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
