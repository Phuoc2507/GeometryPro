
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Save, Settings, Sparkles, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const DAY_MS = 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_DAYS = 7;

export function UserMenu() {
  const navigate = useNavigate();
  const { user, profile, isPro, tier, credits, signOut, openUpgradeModal } = useAuth();

  const daysLeft = useMemo(() => {
    if (!isPro || !profile?.plan_expires_at) return null;
    const ms = new Date(profile.plan_expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / DAY_MS));
  }, [isPro, profile?.plan_expires_at]);

  const expiringSoon = daysLeft !== null && daysLeft <= RENEW_THRESHOLD_DAYS;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleUpgrade = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        alert('Vui lòng đăng nhập lại để mua gói Pro.');
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          returnUrl: window.location.href.split('?')[0] + '?payment=success',
          cancelUrl: window.location.href.split('?')[0],
        })
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else alert('Lỗi tạo link thanh toán: ' + (data.error || 'Unknown'));
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  if (!user) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => navigate('/auth')}
        className="gap-2"
      >
        <User className="w-4 h-4" />
        Đăng nhập
      </Button>
    );
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Avatar className="w-7 h-7">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline max-w-24 truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{displayName}</p>
            {isPro && (
              <Badge className="h-4 px-1.5 text-[10px] font-semibold tracking-wide bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-500 hover:to-yellow-400 border-0 shrink-0">
                PRO
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-primary/5 px-2 py-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-foreground">{credits}</span>
            <span className="text-[10px] text-muted-foreground">credit</span>
            {tier !== 'free' && (
              <span className="ml-auto text-[9px] uppercase font-bold tracking-wide text-primary">{tier}</span>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        {!isPro && (
          <DropdownMenuItem onClick={() => openUpgradeModal()} className="text-primary font-medium focus:text-primary focus:bg-primary/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Nâng cấp Pro
          </DropdownMenuItem>
        )}

        {isPro && expiringSoon && (
          <DropdownMenuItem onClick={() => openUpgradeModal()} className="text-amber-500 font-medium focus:text-amber-500 focus:bg-amber-500/10">
            <Sparkles className="w-4 h-4 mr-2" />
            <span className="flex-1">Gia hạn Pro</span>
            <span className="text-[10px] text-muted-foreground ml-2">
              {daysLeft === 0 ? 'hết hạn hôm nay' : `còn ${daysLeft} ngày`}
            </span>
          </DropdownMenuItem>
        )}

        {isPro && !expiringSoon && (
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Crown className="w-4 h-4 mr-2 text-amber-500" />
            <span className="flex-1">Gói Pro</span>
            {daysLeft !== null && (
              <span className="text-[10px] text-muted-foreground ml-2">còn {daysLeft} ngày</span>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate('/saved')}>
          <Save className="w-4 h-4 mr-2" />
          Hình đã lưu
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Cài đặt
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
