import { Suspense, lazy, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Hexagon, GraduationCap, Presentation, ArrowRight, Sparkles,
  PencilRuler, FileText, Clock, Layers,
  Check, Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

const HeroFigure = lazy(() => import('@/components/landing/HeroFigure'));

const LAST_MODE_KEY = 'geo3d:last-mode';
type Mode = 'student' | 'teacher';

/* ─── Minh hoạ khung dây có nhãn (đúng phong cách nét khuất SGK) ─── */

function mathLabel(x: number, y: number, t: string) {
  return (
    <text
      x={x} y={y}
      fontFamily='"Computer Modern Serif", Georgia, serif'
      fontStyle="italic" fontWeight="700" fontSize="15"
      fill="currentColor" stroke="none"
      textAnchor="middle"
    >
      {t}
    </text>
  );
}

/** Hình chóp S.ABCD có nhãn — dùng làm ảnh chủ đạo. */
function LabeledPyramid({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 210" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      {/* cạnh khuất: SD, AD, DC */}
      <g strokeDasharray="4 5" opacity="0.55">
        <path d="M110 30 L70 112" />
        <path d="M44 160 L70 112" />
        <path d="M70 112 L176 122" />
      </g>
      {/* cạnh thấy */}
      <path d="M110 30 L44 160 L150 170 L176 122" />
      <path d="M110 30 L150 170" />
      <path d="M110 30 L176 122" />
      {/* đỉnh */}
      <circle cx="110" cy="30" r="3" fill="currentColor" stroke="none" />
      {/* nhãn */}
      {mathLabel(110, 20, 'S')}
      {mathLabel(32, 168, 'A')}
      {mathLabel(154, 186, 'B')}
      {mathLabel(190, 120, 'C')}
      {mathLabel(58, 104, 'D')}
    </svg>
  );
}

function PrismArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <g strokeDasharray="4 5" opacity="0.55">
        <path d="M96 66 L44 92 M96 66 L152 96 M96 66 L96 148" />
      </g>
      <path d="M44 92 L152 96 M44 92 L44 170 M152 96 L152 176" />
      <path d="M44 170 L96 148 L152 176" />
    </svg>
  );
}

function SphereArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="100" cy="100" r="72" />
      <path d="M28 100 A72 24 0 0 0 172 100" />
      <path d="M28 100 A72 24 0 0 1 172 100" strokeDasharray="4 5" opacity="0.55" />
      <circle cx="100" cy="28" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ─── Nội dung, ưu tiên GIÁO VIÊN ─── */

const TEACHER_VALUE = [
  { icon: Clock, title: 'Soạn đề nhanh gấp nhiều lần', desc: 'Dán đề, nhận ngay hình dựng đúng toạ độ. Không còn loay hoay vẽ tay hay căn chỉnh trong Word.' },
  { icon: FileText, title: 'Xuất TikZ & PNG để in đề', desc: 'Xuất mã LaTeX TikZ dán thẳng vào đề, hoặc ảnh PNG nền trắng/trong suốt sắc nét khi in.' },
  { icon: PencilRuler, title: 'Nét vẽ chuẩn sách giáo khoa', desc: 'Cạnh khuất nét đứt, mặt cầu/trụ/nón vẽ theo đúng quy ước hình học phổ thông — hình lên đề là chuẩn.' },
  { icon: Layers, title: 'Lưu lại thành ngân hàng hình', desc: 'Đăng nhập để lưu hình đã dựng, xem lại và tái sử dụng cho những đề sau.' },
];

const STEPS = [
  { n: '1', title: 'Dán đề bài', desc: 'Gõ hoặc dán đề hình học không gian bằng tiếng Việt.' },
  { n: '2', title: 'AI dựng hình', desc: 'Nhận mô hình 3D xoay được + lời giải từng bước trong vài giây.' },
  { n: '3', title: 'Xoay & xuất đề', desc: 'Chọn góc nhìn ưng ý, kéo-thả nhãn, xuất PNG hoặc TikZ.' },
];

const FAQS = [
  { q: 'geo3d giúp giáo viên việc gì?', a: 'Dựng hình hình học không gian chuẩn để đưa vào đề thi, đề kiểm tra và giáo án — xuất được cả ảnh PNG lẫn mã LaTeX TikZ, tiết kiệm thời gian so với vẽ tay.' },
  { q: 'Vẽ được những loại hình nào?', a: 'Khối đa diện (chóp, lăng trụ, hộp, tứ diện…), mặt cầu, hình trụ, hình nón, mặt tròn xoay, thiết diện, và bài toạ độ Oxyz / đồ thị.' },
  { q: 'Xuất ra định dạng gì để chèn vào đề?', a: 'Ảnh PNG (nền trắng hoặc trong suốt) và mã LaTeX TikZ — dán thẳng vào Word hoặc file LaTeX.' },
  { q: 'Nét khuất, nhãn điểm có đúng chuẩn không?', a: 'Có. Cạnh bị che vẽ nét đứt, đỉnh khối được đặt tên theo quy ước (A, B, C… và ký hiệu phẩy cho mặt trên), bạn còn kéo-thả để chỉnh vị trí nhãn.' },
  { q: 'Có cần đăng nhập không?', a: 'Dùng thử được ngay không cần đăng nhập. Đăng nhập để lưu hình và xem lại lịch sử.' },
];

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const lastMode = (typeof window !== 'undefined' ? localStorage.getItem(LAST_MODE_KEY) : null) as Mode | null;
  const lastModeLabel = lastMode === 'student' ? 'Học sinh' : lastMode === 'teacher' ? 'Giáo viên' : null;

  useEffect(() => {
    document.title = 'geo3d — Vẽ hình học không gian cho giáo viên, xuất PNG & TikZ';
  }, []);

  const goTo = (mode: Mode) => {
    localStorage.setItem(LAST_MODE_KEY, mode);
    navigate(`/${mode}`);
  };

  return (
    <div className="relative min-h-screen radial-gradient-bg text-foreground overflow-hidden">
      {/* ─── Nền trang trí ─── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--primary) / 0.10) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black, transparent)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-primary/10 blur-3xl" />

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
            <a href="#giao-vien" className="hover:text-foreground transition-colors">Cho giáo viên</a>
            <a href="#vi-du" className="hover:text-foreground transition-colors">Ví dụ</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Đăng nhập</Button>
            )}
            <Button size="sm" onClick={() => goTo('teacher')} className="gap-1.5">
              Dùng thử <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative max-w-6xl mx-auto px-5 pt-16 pb-14 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-5">
            <Presentation className="w-3.5 h-3.5" /> Công cụ dựng hình cho giáo viên Toán
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.1] mb-5">
            Hình học không gian <span className="gradient-text">đẹp như in</span>, chỉ từ đề bài
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-7 max-w-xl">
            Dán đề, AI dựng ngay mô hình 3D chuẩn sách giáo khoa. Xoay tới góc ưng ý rồi xuất <b className="text-foreground">PNG</b> hoặc <b className="text-foreground">LaTeX TikZ</b> để đưa thẳng vào đề thi, giáo án.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => goTo('teacher')} className="gap-2 h-12">
              <Presentation className="w-5 h-5" /> Vào chế độ Giáo viên
            </Button>
            <Button size="lg" variant="outline" onClick={() => goTo('student')} className="gap-2 h-12">
              <GraduationCap className="w-5 h-5" /> Chế độ Học sinh
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {['Không cần cài đặt', 'Dùng thử miễn phí', 'Chuẩn nét khuất SGK'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> {t}
              </span>
            ))}
          </div>
          {lastModeLabel && (
            <button onClick={() => goTo(lastMode!)} className="mt-4 block text-sm text-primary hover:underline">
              Tiếp tục với chế độ {lastModeLabel} →
            </button>
          )}
        </div>

        {/* Ảnh chủ đạo: không gian 3D tương tác + nút xuất thật */}
        <div className="relative">
          <div className="absolute -inset-4 blur-3xl bg-primary/10 rounded-full" />
          <Suspense
            fallback={
              <div className="relative glass rounded-3xl border border-border/50 h-[420px] grid place-items-center text-sm text-muted-foreground">
                Đang tải khung hình 3D…
              </div>
            }
          >
            <HeroFigure />
          </Suspense>
        </div>
      </section>

      {/* ─── Giá trị cho giáo viên ─── */}
      <section id="giao-vien" className="relative max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <span className="text-sm font-semibold text-primary">DÀNH CHO GIÁO VIÊN</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2 mb-3">Từ đề bài tới hình lên đề, trong vài phút</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            geo3d lo phần hình để bạn tập trung vào chuyên môn ra đề.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TEACHER_VALUE.map((f) => (
            <div key={f.title} className="glass rounded-2xl border border-border/50 p-6 hover:border-primary/40 transition-colors">
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
      <section className="relative max-w-4xl mx-auto px-5 py-8">
        <div className="glass rounded-3xl border border-border/50 p-8 sm:p-10">
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary text-lg font-bold flex items-center justify-center mx-auto mb-3">{s.n}</div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Gallery / Ví dụ ─── */}
      <section id="vi-du" className="relative max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Nét vẽ đúng chuẩn hình học</h2>
        <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
          Cạnh khuất nét đứt, mặt cong đúng quy ước — hình lên đề là dùng được ngay.
        </p>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { Art: LabeledPyramid, label: 'Hình chóp — cạnh khuất nét đứt, có nhãn đỉnh' },
            { Art: PrismArt, label: 'Lăng trụ — đáy & đường sinh' },
            { Art: SphereArt, label: 'Mặt cầu — đường bao + xích đạo' },
          ].map(({ Art, label }) => (
            <div key={label} className="glass rounded-2xl border border-border/50 p-8 flex flex-col items-center gap-4 hover:border-primary/40 transition-colors">
              <Art className="w-44 h-40 text-foreground/85" />
              <span className="text-sm text-muted-foreground text-center">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Trích dẫn giá trị ─── */}
      <section className="relative max-w-3xl mx-auto px-5 py-6">
        <div className="glass rounded-3xl border border-border/50 p-8 sm:p-10 text-center">
          <Quote className="w-8 h-8 text-primary/60 mx-auto mb-4" />
          <p className="text-xl sm:text-2xl font-medium leading-relaxed">
            Thay vì mất cả buổi vẽ hình cho một đề, giờ chỉ cần dán đề bài rồi
            <span className="gradient-text"> xuất hình chuẩn ngay.</span>
          </p>
        </div>
      </section>

      {/* ─── Hai chế độ (giáo viên nổi bật) ─── */}
      <section className="relative max-w-4xl mx-auto px-5 py-12">
        <div className="grid sm:grid-cols-5 gap-5">
          <button
            onClick={() => goTo('teacher')}
            className="sm:col-span-3 glass rounded-2xl p-7 border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all group text-left"
          >
            <div className="mb-4 inline-flex p-3 rounded-xl bg-violet-500/15 group-hover:bg-violet-500/25 transition-colors">
              <Presentation className="w-7 h-7 text-violet-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Giáo viên <span className="text-xs align-middle text-primary font-medium">· gợi ý</span></h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Dán đề → xoay tới góc ưng ý → xuất PNG đen trắng hoặc LaTeX TikZ để chèn vào đề thi, giáo án.
            </p>
            <span className="flex items-center gap-1.5 text-primary text-sm font-medium">
              Vào chế độ Giáo viên <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          <button
            onClick={() => goTo('student')}
            className="sm:col-span-2 glass rounded-2xl p-7 border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
          >
            <div className="mb-4 inline-flex p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <GraduationCap className="w-7 h-7 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Học sinh</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Nhập đề → AI vẽ hình 3D và giải từng bước để hiểu bài trực quan.
            </p>
            <span className="flex items-center gap-1.5 text-primary text-sm font-medium">
              Vào ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="relative max-w-3xl mx-auto px-5 py-16">
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
      <section className="relative max-w-4xl mx-auto px-5 pb-16">
        <div className="glass rounded-3xl border border-primary/30 p-10 text-center relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Dựng hình cho đề tiếp theo của bạn</h2>
            <p className="text-muted-foreground mb-6">Miễn phí, không cần cài đặt.</p>
            <Button size="lg" onClick={() => goTo('teacher')} className="gap-2 h-12">
              Bắt đầu ngay <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative border-t border-border/40">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Hexagon className="w-4 h-4 text-primary" />
            <span>geo3d — Hình học không gian bằng mắt</span>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => goTo('teacher')} className="hover:text-foreground transition-colors">Giáo viên</button>
            <button onClick={() => goTo('student')} className="hover:text-foreground transition-colors">Học sinh</button>
            {!user && <button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">Đăng nhập</button>}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
