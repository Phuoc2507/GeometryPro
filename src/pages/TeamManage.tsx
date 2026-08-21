import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserPlus, Trash2, Crown, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { withTimeout } from '@/lib/promiseTimeout';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Member {
  user_id: string;
  role: 'owner' | 'member';
  email: string | null;
  plan_credits: number | string | null;
  purchased_credits: number | string | null;
}
interface TeamData {
  id: string;
  seat_limit: number;
  expires_at: string | null;
  is_owner: boolean;
  members: Member[];
}

const ADD_ERR: Record<string, string> = {
  not_owner: 'Chỉ chủ tổ mới thêm được thành viên.',
  expired: 'Gói Tổ Toán đã hết hạn — gia hạn để thêm thành viên.',
  full: 'Tổ đã đủ ghế.',
  user_not_found: 'Không tìm thấy tài khoản với email này. Giáo viên cần đăng ký trước rồi báo bạn.',
  is_owner: 'Đây là email của bạn (chủ tổ) — đã có sẵn trong tổ.',
  already_in_team: 'Giáo viên này đã ở trong một tổ khác.',
};

export default function TeamManage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<TeamData | null | undefined>(undefined); // undefined = đang tải
  const [loadError, setLoadError] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await withTimeout(supabase.rpc('team_get'));
    if (error) { setLoadError(true); setTeam(undefined); return; }
    setLoadError(false);
    const payload = data as unknown as { team: TeamData | null } | null;
    setTeam(payload?.team ?? null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    const mail = email.trim();
    if (!mail || busy) return;
    setBusy(true);
    try {
      const { data, error } = await withTimeout(supabase.rpc('team_add_member', { p_email: mail }));
      const res = data as unknown as { ok: boolean; err?: string } | null;
      if (error || !res?.ok) {
        toast({ title: 'Chưa thêm được', description: ADD_ERR[res?.err ?? ''] ?? 'Có lỗi xảy ra, thử lại.', variant: 'destructive' });
      } else {
        toast({ title: 'Đã thêm giáo viên', description: `${mail} đã vào tổ và được cấp credit.` });
        setEmail('');
        await load();
      }
    } finally { setBusy(false); }
  };

  const removeMember = async (m: Member) => {
    if (busy) return;
    setPendingRemove(null);
    setBusy(true);
    try {
      const { data, error } = await withTimeout(supabase.rpc('team_remove_member', { p_user_id: m.user_id }));
      const res = data as unknown as { ok: boolean; err?: string } | null;
      if (error || !res?.ok) {
        toast({ title: 'Chưa gỡ được', description: 'Có lỗi xảy ra, thử lại.', variant: 'destructive' });
      } else {
        toast({ title: 'Đã gỡ', description: `${m.email ?? 'Thành viên'} đã rời tổ.` });
        await load();
      }
    } finally { setBusy(false); }
  };

  const used = team?.members.length ?? 0;
  const canAdd = !!team?.is_owner && used < (team?.seat_limit ?? 0);

  return (
    <div className="min-h-screen radial-gradient-bg px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10"><Users className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Quản lý Tổ Toán</h1>
            <p className="text-sm text-muted-foreground">Mỗi giáo viên trong tổ có ví credit riêng.</p>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">Không tải được thông tin tổ (mạng chậm hoặc lỗi tạm thời).</p>
            <Button variant="outline" onClick={() => { setTeam(undefined); load(); }}>Thử lại</Button>
          </div>
        ) : team === undefined ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : team === null ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">Bạn chưa thuộc tổ nào. Mua gói <strong>Tổ Toán</strong> để tạo tổ cho nhóm ≤ 5 giáo viên.</p>
            <Button onClick={() => navigate('/bang-gia')}>Xem gói Tổ Toán</Button>
          </div>
        ) : (
          <>
            {/* Tổng quan ghế */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-bold">{used}<span className="text-lg text-muted-foreground">/{team.seat_limit}</span></div>
                <div className="text-xs text-muted-foreground mt-0.5">ghế đã dùng</div>
              </div>
              {team.expires_at && (
                <div className="text-right">
                  <div className="text-sm font-medium">{new Date(team.expires_at).toLocaleDateString('vi-VN')}</div>
                  <div className="text-xs text-muted-foreground">hạn gói tổ</div>
                </div>
              )}
            </div>

            {/* Thêm thành viên (chỉ chủ tổ) */}
            {team.is_owner && (
              <div className="rounded-2xl border border-border/60 bg-card/40 p-5 mb-4">
                <div className="text-sm font-semibold mb-2 flex items-center gap-1.5"><UserPlus className="w-4 h-4 text-primary" /> Thêm giáo viên</div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addMember(); }}
                    placeholder="email giáo viên (đã có tài khoản)…"
                    disabled={!canAdd || busy}
                    className="flex-1"
                  />
                  <Button onClick={addMember} disabled={!canAdd || !email.trim() || busy}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Thêm'}
                  </Button>
                </div>
                {!canAdd && used >= team.seat_limit && (
                  <p className="text-[11px] text-amber-500 mt-2">Đã đủ {team.seat_limit} ghế. Gỡ bớt thành viên để thêm người mới.</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">
                  <Mail className="w-3 h-3 inline mr-0.5" /> Giáo viên phải <strong>đã đăng ký tài khoản</strong> bằng đúng email này.
                </p>
              </div>
            )}

            {/* Danh sách thành viên */}
            <div className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
              {team.members.map((m, i) => {
                const credits = Number(m.plan_credits ?? 0) + Number(m.purchased_credits ?? 0);
                return (
                  <div key={m.user_id} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-border/40')}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                      {(m.email ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {m.email ?? 'Không rõ email'}
                        {m.role === 'owner' && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500"><Crown className="w-3 h-3" /> Chủ tổ</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{credits.toLocaleString('vi-VN')} credit</div>
                    </div>
                    {team.is_owner && m.role !== 'owner' && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" disabled={busy} onClick={() => setPendingRemove(m)} aria-label="Gỡ thành viên">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {!team.is_owner && (
              <p className="text-[11px] text-muted-foreground text-center mt-3">Bạn là thành viên của tổ này. Chỉ chủ tổ thêm/gỡ được thành viên.</p>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => { if (!o) setPendingRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gỡ thành viên khỏi tổ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingRemove?.email ?? 'Thành viên này'}</strong> sẽ rời tổ và mất phần credit của tổ. Bạn có thể thêm lại sau nếu còn ghế trống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingRemove) removeMember(pendingRemove); }}
            >
              Gỡ thành viên
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
