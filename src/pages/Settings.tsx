import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, LogOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const initial = displayName ? displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase() || 'US';

  return (
    <div className="min-h-screen radial-gradient-bg p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
                
                <div className="mt-4 pt-4 border-t border-border/50">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Shield className="w-3.5 h-3.5" />
                    Gói {(profile as any)?.plan || 'Free'}
                  </span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
