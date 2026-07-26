import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, LogOut, Save, Crown, Sparkles, SlidersHorizontal, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { usePreferences } from '@/hooks/usePreferences';
import { AppPreferences } from '@/lib/preferences';
import { formatCredits } from '@/lib/utils';
import { authUrlWithRedirect } from '@/lib/authRedirect';

const TIER_LABELS: Record<string, string> = {
  free: 'Miễn phí',
  teacher: 'Giáo viên',
  pro: 'Chuyên nghiệp',
  school: 'Trường học',
};

const PREF_TOGGLES: { key: keyof AppPreferences; label: string; hint: string }[] = [
  { key: 'showCoordinateGrid', label: 'Lưới toạ độ', hint: 'Hiện mặt phẳng lưới Oxy trong không gian.' },
  { key: 'showPoints', label: 'Hiện điểm', hint: 'Hiện nhãn và chấm cho các điểm.' },
  { key: 'autoColorPlanes', label: 'Tô màu mặt phẳng', hint: 'Tự tô màu các mặt phẳng để dễ phân biệt.' },
  { key: 'autoRotate', label: 'Tự xoay', hint: 'Tự động xoay hình 3D.' },
  { key: 'showIllustrationValues', label: 'Hiện số ở bài minh hoạ', hint: 'Hiện giá trị đo được ở các hình minh hoạ đại diện.' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, isPro, tier, credits, openUpgradeModal, updateProfile, signOut, deleteAccount, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { prefs, setPref } = usePreferences();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(authUrlWithRedirect('/settings'));
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { error } = await updateProfile({
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    setIsSaving(false);

    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin: " + error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Thành công",
        description: "Thông tin của bạn đã được cập nhật.",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Chấp nhận "xóa"/"xoá"/"XÓA"… — bỏ dấu + hạ chữ rồi so với "xoa" (tránh kẹt vì vị trí dấu).
  const deleteConfirmed = deleteConfirm.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') === 'xoa';

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);
    if (error) {
      toast({
        title: 'Không xoá được tài khoản',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Đã xoá tài khoản',
      description: 'Tài khoản và toàn bộ dữ liệu của bạn đã được xoá vĩnh viễn.',
    });
    navigate('/');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const initial = displayName ? displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase() || 'US';

  const planName = TIER_LABELS[tier] ?? 'Miễn phí';
  const planStatus = (() => {
    if (tier === 'free') return 'Miễn phí';
    const exp = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
    if (!exp) return 'Đang kích hoạt';
    const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
    return days > 0 ? `Còn ${days} ngày` : 'Đã hết hạn';
  })();

  return (
    <div className="min-h-screen radial-gradient-bg p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cài đặt</h1>
            <p className="text-muted-foreground">
              Quản lý thông tin tài khoản và tùy chọn
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardContent className="pt-6 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary/20 shadow-xl">
                  <AvatarImage src={avatarUrl || profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{displayName || 'Người dùng'}</h3>
                <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                
                <div className="mt-4 pt-4 border-t border-border/50 space-y-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isPro
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    <Shield className="w-3.5 h-3.5" />
                    Gói {isPro ? 'Pro' : 'Free'}
                  </span>
                  {isPro && profile?.plan_expires_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Hết hạn {new Date(profile.plan_expires_at).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button variant="destructive" className="w-full gap-2" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  Thông tin cá nhân
                </CardTitle>
                <CardDescription>
                  Cập nhật tên hiển thị và ảnh đại diện của bạn.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email đăng nhập</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" value={user.email || ''} disabled className="pl-9 bg-secondary/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">Email không thể thay đổi.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Tên hiển thị</Label>
                  <Input 
                    id="displayName" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    placeholder="Nhập tên của bạn" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">URL Ảnh đại diện</Label>
                  <Input 
                    id="avatarUrl" 
                    value={avatarUrl} 
                    onChange={(e) => setAvatarUrl(e.target.value)} 
                    placeholder="https://example.com/avatar.jpg" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Dán đường dẫn (link) ảnh của bạn từ các trang web lưu trữ ảnh.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Lưu thay đổi
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Gói của tôi
                </CardTitle>
                <CardDescription>
                  Gói hiện tại và số credit còn lại.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gói</span>
                  <span className="font-medium">{planName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trạng thái</span>
                  <span className="font-medium">{planStatus}</span>
                </div>
                {tier !== 'free' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Credit còn lại</span>
                    <span className="font-medium">{formatCredits(credits)}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-6">
                <Button variant="outline" className="gap-2" onClick={() => openUpgradeModal()}>
                  <Sparkles className="w-4 h-4" />
                  Nâng cấp / Quản lý gói
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  Hiển thị & Bản vẽ
                </CardTitle>
                <CardDescription>
                  Tuỳ chọn hiển thị bản vẽ 3D. Lưu trên trình duyệt này.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {PREF_TOGGLES.map(({ key, label, hint }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor={`pref-${key}`}>{label}</Label>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <Switch
                      id={`pref-${key}`}
                      checked={prefs[key]}
                      onCheckedChange={(v) => setPref(key, v)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Vùng nguy hiểm — xoá tài khoản */}
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Vùng nguy hiểm
                </CardTitle>
                <CardDescription>
                  Xoá tài khoản sẽ xoá <strong>vĩnh viễn</strong> hồ sơ, toàn bộ hình đã lưu, lịch sử,
                  gói và credit của bạn. Hành động này <strong>không thể hoàn tác</strong>.
                </CardDescription>
              </CardHeader>
              <CardFooter className="border-t border-destructive/20 pt-6">
                <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirm(''); }}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Xoá tài khoản
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xoá tài khoản vĩnh viễn?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Toàn bộ dữ liệu của bạn (hình đã lưu, lịch sử, gói, credit) sẽ bị xoá và
                        <strong> không thể khôi phục</strong>. Nếu bạn còn credit hoặc gói trả phí,
                        chúng sẽ mất mà không được hoàn tiền.
                        <br /><br />
                        Nhập <strong>xóa</strong> để xác nhận.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="Nhập xóa"
                      autoComplete="off"
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Huỷ</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                        disabled={!deleteConfirmed || isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Liên kết pháp lý */}
        <div className="text-center text-xs text-muted-foreground pt-2">
          <button onClick={() => navigate('/dieu-khoan')} className="hover:text-foreground underline underline-offset-2">Điều khoản dịch vụ</button>
          <span className="mx-2">·</span>
          <button onClick={() => navigate('/quyen-rieng-tu')} className="hover:text-foreground underline underline-offset-2">Chính sách bảo mật</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
