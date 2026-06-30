import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, GraduationCap, Presentation, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LAST_MODE_KEY = 'geo3d:last-mode';
type Mode = 'student' | 'teacher';

const Landing = () => {
  const navigate = useNavigate();

  const lastMode = localStorage.getItem(LAST_MODE_KEY) as Mode | null;

  const goTo = (mode: Mode) => {
    localStorage.setItem(LAST_MODE_KEY, mode);
    navigate(`/${mode}`);
  };

  // If user already has a preferred mode, show a "continue" shortcut
  const lastModeLabel = lastMode === 'student' ? 'Học sinh' : lastMode === 'teacher' ? 'Giáo viên' : null;

  return (
    <div className="min-h-screen radial-gradient-bg flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-primary/10 glow-primary">
            <Hexagon className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">geo3d</h1>
        </div>
        <p className="text-muted-foreground text-lg">Hình học không gian bằng mắt</p>
      </div>

      {/* Mode Cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {/* Student card */}
        <button
          onClick={() => goTo('student')}
          className="flex-1 glass rounded-2xl p-7 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
        >
          <div className="mb-4 inline-flex p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <GraduationCap className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Học sinh</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5">
            Nhập đề bài → AI vẽ hình 3D và giải từng bước. Xem lại từng bước kèm minh hoạ trực quan.
          </p>
          <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
            Vào ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Teacher card */}
        <button
          onClick={() => goTo('teacher')}
          className="flex-1 glass rounded-2xl p-7 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
        >
          <div className="mb-4 inline-flex p-3 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
            <Presentation className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Giáo viên</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-5">
            Nhập đề → xoay hình tới góc ưng ý → xuất PNG đen trắng hoặc LaTeX TikZ để chèn vào đề thi.
          </p>
          <div className="flex items-center gap-1.5 text-primary text-sm font-medium">
            Vào ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Continue shortcut */}
      {lastModeLabel && (
        <p className="mt-6 text-sm text-muted-foreground">
          Lần cuối dùng:{' '}
          <button
            onClick={() => goTo(lastMode!)}
            className="text-primary hover:underline font-medium"
          >
            Tiếp tục với chế độ {lastModeLabel}
          </button>
        </p>
      )}

      {/* Auth link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Lưu hình và xem lịch sử?{' '}
          <button
            onClick={() => navigate('/auth')}
            className="text-primary hover:underline font-medium"
          >
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  );
};

export default Landing;
