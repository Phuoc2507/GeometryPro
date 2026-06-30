import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { z } from 'zod';

const emailSchema = z.string().email('Email không hợp lệ');
const passwordSchema = z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự');

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading, signIn, signUp } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      let result;
      
      if (isSignUp) {
        result = await signUp(email, password, displayName || undefined);
      } else {
        result = await signIn(email, password);
      }
      
      if (result.error) {
        let errorMessage = result.error.message;
        
        // Friendly error messages
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Email hoặc mật khẩu không đúng';
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'Email này đã được đăng ký';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Vui lòng xác nhận email trước khi đăng nhập';
        }
        
        setErrors({ general: errorMessage });
      } else if (isSignUp) {
        setErrors({ general: 'Vui lòng kiểm tra email để xác nhận tài khoản!' });
      }
    } catch {
      setErrors({ general: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <div className="animate-spin">
          <Hexagon className="w-8 h-8 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen radial-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 glow-primary">
              <Hexagon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">GeoMagic Pro</h1>
          </div>
          <p className="text-muted-foreground">
            {isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập để tiếp tục'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass rounded-2xl p-6 border border-border/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (Sign Up only) */}
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Tên hiển thị</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Nhập tên của bạn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Error Message */}
            {errors.general && (
              <div className={`p-3 rounded-lg text-sm ${
                errors.general.includes('xác nhận') 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}>
                {errors.general}
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full glow-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSignUp ? 'Đang đăng ký...' : 'Đang đăng nhập...'}
                </div>
              ) : (
                isSignUp ? 'Đăng ký' : 'Đăng nhập'
              )}
            </Button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrors({});
                }}
                className="ml-1 text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Đăng nhập' : 'Đăng ký ngay'}
              </button>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
