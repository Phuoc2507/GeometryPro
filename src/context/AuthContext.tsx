import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isPro: boolean;
  // Ví credit
  tier: string;                 // tier hiệu lực ('free' nếu hết hạn)
  credits: number;              // tổng còn lại = plan + purchased
  planCredits: number;          // credit theo gói (reset mỗi kỳ)
  purchasedCredits: number;     // credit mua lẻ (không hết hạn)
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  
  // Auth Modal State
  isAuthModalOpen: boolean;
  authModalReason: 'save' | 'project' | 'quota' | 'general' | null;
  openAuthModal: (reason?: 'save' | 'project' | 'quota' | 'general') => void;
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
  const [isLoading, setIsLoading] = useState(true);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<'save' | 'project' | 'quota' | 'general' | null>(null);

  const openAuthModal = (reason: 'save' | 'project' | 'quota' | 'general' = 'general') => {
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
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
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
    await supabase.auth.signOut();
    setProfile(null);
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

  const isPro = profile?.plan_type === 'pro' && profile?.plan_expires_at
    ? new Date(profile.plan_expires_at) > new Date()
    : false;

  // Ví credit — tier hiệu lực hạ về 'free' khi gói hết hạn (mirror effective_tier ở SQL).
  const planActive = profile?.plan_expires_at
    ? new Date(profile.plan_expires_at).getTime() > Date.now()
    : false;
  const tier = planActive
    ? (profile?.plan_tier || (profile?.plan_type === 'pro' ? 'pro' : 'free'))
    : 'free';
  const planCredits = tier === 'free' ? 0 : (profile?.plan_credits ?? 0);
  const purchasedCredits = profile?.purchased_credits ?? 0;  // không hết hạn
  const credits = planCredits + purchasedCredits;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isPro,
      tier,
      credits,
      planCredits,
      purchasedCredits,
      refreshProfile,
      isLoading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      updateProfile,
      resetPassword,
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
