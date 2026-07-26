import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Hexagon, GraduationCap, Presentation, ArrowRight, Sparkles,
  ListChecks, PencilRuler, ImageDown, Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

const LAST_MODE_KEY = 'geo3d:last-mode';
type Mode = 'student' | 'teacher';

/* ─── Minh hoạ khung dây (đúng phong cách nét khuất SGK của sản phẩm) ─── */

function PyramidArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      {/* cạnh khuất */}
      <g strokeDasharray="4 4" opacity="0.6">
        <path d="M100 28 L100 132" />
        <path d="M32 150 L100 132" />
        <path d="M168 150 L100 132" />
      </g>
      {/* cạnh thấy */}
      <path d="M100 28 L32 150 L100 178 L168 150 Z" />
      <path d="M100 28 L100 178" opacity="0.0" />
      <path d="M100 28 L32 150 M100 28 L168 150 M100 28 L100 178" />
      <circle cx="100" cy="28" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PrismArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <g strokeDasharray="4 4" opacity="0.6">
        <path d="M96 66 L44 92 M96 66 L152 96 M96 66 L96 148" />
      </g>
      {/* đáy trên, đáy dưới, cạnh bên thấy */}
      <path d="M44 92 L152 96 M44 92 L44 170 M152 96 L152 176" />
      <path d="M44 170 L96 148 L152 176" />
      <path d="M44 92 L96 66 L152 96" opacity="0" />
    </svg>
  );
}

function SphereArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="100" cy="100" r="72" />
      {/* xích đạo: nửa trước liền, nửa sau đứt */}
      <path d="M28 100 A72 24 0 0 0 172 100" />
      <path d="M28 100 A72 24 0 0 1 172 100" strokeDasharray="4 4" opacity="0.6" />
      <circle cx="100" cy="28" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const FEATURES = [
  { icon: Sparkles, title: 'AI vẽ hình 3D từ đề', desc: 'Dán đề hình học không gian, AI dựng ngay mô hình 3D xoay được — đúng toạ độ, không đoán mò.' },
  { icon: ListChecks, title: 'Giải từng bước trực quan', desc: 'Lời giải bóc từng bước, mỗi bước tô sáng đúng phần tử trên hình để dễ theo dõi.' },
  { icon: PencilRuler, title: 'Nét khuất chuẩn SGK', desc: 'Cạnh khuất vẽ nét đứt, mặt phẳng và mặt cong (cầu/trụ/nón) theo đúng quy ước vẽ hình phổ thông.' },
  { icon: ImageDown, title: 'Xuất PNG & LaTeX TikZ', desc: 'Xoay tới góc ưng ý rồi xuất ảnh đen trắng hoặc mã TikZ để chèn thẳng vào đề thi Word/LaTeX.' },
];

const STEPS = [
  { n: '1', title: 'Nhập đề bài', desc: 'Gõ hoặc dán đề hình học không gian bằng tiếng Việt.' },
  { n: '2', title: 'AI vẽ hình & giải', desc: 'Nhận mô hình 3D + lời giải từng bước trong vài giây.' },
  { n: '3', title: 'Xoay & xuất', desc: 'Chỉnh góc nhìn, kéo-thả nhãn, xuất PNG hoặc TikZ.' },
];

const FAQS = [
  { q: 'geo3d dành cho ai?', a: 'Học sinh muốn hiểu hình học không gian trực quan, và giáo viên cần hình đẹp — chuẩn để đưa vào đề thi, giáo án.' },
  { q: 'Vẽ được những loại hình nào?', a: 'Khối đa diện (chóp, lăng trụ, hộp, tứ diện…), mặt cầu, hình trụ, hình nón, mặt tròn xoay, thiết diện, và bài toạ độ Oxyz/đồ thị.' },
  { q: 'Xuất ra định dạng gì để chèn vào đề?', a: 'Ảnh PNG (nền trắng hoặc trong suốt) và mã LaTeX TikZ — dán thẳng vào Word hoặc file LaTeX.' },
  { q: 'Có cần đăng nhập không?', a: 'Dùng thử được ngay không cần đăng nhập. Đăng nhập để lưu hình và xem lại lịch sử.' },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const lastMode = (typeof window !== 'undefined' ? localStorage.getItem(LAST_MODE_KEY) : null) as Mode | null;
  const lastModeLabel = lastMode === 'student' ? 'Học sinh' : lastMode === 'teacher' ? 'Giáo viên' : null;

  useEffect(() => {
    document.title = 'geo3d — Vẽ hình học không gian 3D bằng AI, xuất PNG & TikZ';
  }, []);

  const goTo = (mode: Mode) => {
    localStorage.setItem(LAST_MODE_KEY, mode);
    navigate(`/${mode}`);
  };

  return (
    <div className="min-h-screen radial-gradient-bg text-foreground">
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/40">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 glow-primary">
              <Hexagon className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg gradient-text">geo3d</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#tinh-nang" className="hover:text-foreground transition-colors">Tính năng</a>
            <a href="#vi-du" className="hover:text-foreground transition-colors">Ví dụ</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Đăng nhập</Button>
            )}
            <Button size="sm" onClick={() => goTo('student')} className="gap-1.5">
              Dùng thử <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-12 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Vẽ hình bằng AI · chuẩn SGK
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            Hình học không gian, <span className="gradient-text">nhìn là hiểu</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-7 max-w-xl">
            Nhập đề → AI dựng mô hình 3D xoay được và giải từng bước. Xuất PNG đen trắng hoặc LaTeX TikZ để đưa thẳng vào đề thi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => goTo('student')} className="gap-2 h-12">
              <GraduationCap className="w-5 h-5" /> Vào chế độ Học sinh
            </Button>
            <Button size="lg" variant="outline" onClick={() => goTo('teacher')} className="gap-2 h-12">
              <Presentation className="w-5 h-5" /> Vào chế độ Giáo viên
            </Button>
          </div>
          {lastModeLabel && (
            <button onClick={() => goTo(lastMode!)} className="mt-4 text-sm text-primary hover:underline">
              Tiếp tục với chế độ {lastModeLabel} →
            </button>
          )}
        </div>
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-primary/10 rounded-full" />
          <div className="relative glass rounded-3xl border border-border/50 p-8 grid grid-cols-2 gap-6 text-primary/90">
            <PyramidArt className="w-full aspect-square" />
            <PrismArt className="w-full aspect-square" />
            <SphereArt className="w-full aspect-square col-span-2 max-w-[45%] mx-auto" />
          </div>
        </div>
      </section>

      {/* ─── Tính năng ─── */}
      <section id="tinh-nang" className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Đủ cho cả học và dạy</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Từ hiểu bài tới ra đề — geo3d lo phần hình.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl border border-border/50 p-6">
              <div className="inline-flex p-2.5 rounded-xl bg-primary/10 mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Cách dùng ─── */}
      <section className="max-w-4xl mx-auto px-5 py-10">
        <div className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-3">{s.n}</div>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Gallery / Ví dụ ─── */}
      <section id="vi-du" className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Nét vẽ đúng chuẩn hình học</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { Art: PyramidArt, label: 'Hình chóp — cạnh khuất nét đứt' },
            { Art: PrismArt, label: 'Lăng trụ — đáy & đường sinh' },
            { Art: SphereArt, label: 'Mặt cầu — đường bao + xích đạo' },
          ].map(({ Art, label }) => (
            <div key={label} className="glass rounded-2xl border border-border/50 p-8 flex flex-col items-center gap-4">
              <Art className="w-40 h-40 text-foreground/80" />
              <span className="text-sm text-muted-foreground text-center">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Hai chế độ ─── */}
      <section className="max-w-4xl mx-auto px-5 py-10">
        <div className="flex flex-col sm:flex-row gap-5">
          <button onClick={() => goTo('student')} className="flex-1 glass rounded-2xl p-7 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left">
            <div className="mb-4 inline-flex p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <GraduationCap className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Học sinh</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Nhập đề → AI vẽ hình 3D và giải từng bước, xem lại kèm minh hoạ trực quan.
            </p>
            <span className="flex items-center gap-1.5 text-primary text-sm font-medium">
              Vào ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          <button onClick={() => goTo('teacher')} className="flex-1 glass rounded-2xl p-7 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left">
            <div className="mb-4 inline-flex p-3 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
              <Presentation className="w-7 h-7 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Giáo viên</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Nhập đề → xoay tới góc ưng ý → xuất PNG đen trắng hoặc LaTeX TikZ để chèn vào đề thi.
            </p>
            <span className="flex items-center gap-1.5 text-primary text-sm font-medium">
              Vào ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Câu hỏi thường gặp</h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ─── CTA cuối ─── */}
      <section className="max-w-4xl mx-auto px-5 pb-16">
        <div className="glass rounded-3xl border border-border/50 p-10 text-center">
          <Type className="w-8 h-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Thử với đề đầu tiên của bạn</h2>
          <p className="text-muted-foreground mb-6">Miễn phí, không cần cài đặt.</p>
          <Button size="lg" onClick={() => goTo('student')} className="gap-2 h-12">
            Bắt đầu ngay <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-primary" />
            <span>geo3d — Hình học không gian bằng mắt</span>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => goTo('student')} className="hover:text-foreground transition-colors">Học sinh</button>
            <button onClick={() => goTo('teacher')} className="hover:text-foreground transition-colors">Giáo viên</button>
            {!user && <button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">Đăng nhập</button>}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
