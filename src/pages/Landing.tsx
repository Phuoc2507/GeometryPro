import { Suspense, lazy, useEffect, type ReactNode, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap, Presentation, ArrowRight, Sparkles,
  PencilRuler, FileText, Clock, Layers, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Wordmark } from '@/components/Brand';
import { ResumeCard } from '@/components/landing/ResumeCard';
import { Reveal } from '@/components/landing/Reveal';

// Độ trễ so le cho hiệu ứng xuất hiện (dùng biến CSS --d).
const stagger = (s: number): CSSProperties => ({ ['--d']: `${s}s` } as CSSProperties);

const HeroFigure = lazy(() => import('@/components/landing/HeroFigure'));

const LAST_MODE_KEY = 'geo3d:last-mode';
type Mode = 'student' | 'teacher';

/* ─────────── Hoạ tiết dựng hình: dấu ke góc, minh hoạ khung dây ─────────── */

/** Dấu ke góc kiểu bản vẽ kỹ thuật. */
function RegMarks({ color = 'border-primary/50' }: { color?: string }) {
  const c = `pointer-events-none absolute w-3 h-3 ${color}`;
  return (
    <>
      <span className={`${c} -top-px -left-px border-t border-l`} />
      <span className={`${c} -top-px -right-px border-t border-r`} />
      <span className={`${c} -bottom-px -left-px border-b border-l`} />
      <span className={`${c} -bottom-px -right-px border-b border-r`} />
    </>
  );
}

function SectionHead({ marker, eyebrow, title, sub }: {
  marker: string; eyebrow: string; title: ReactNode; sub?: string;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="font-cm italic text-primary text-2xl leading-none w-6 text-center">{marker}</span>
        <span className="h-px w-8 bg-border" />
        <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">{eyebrow}</span>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold [text-wrap:balance]">{title}</h2>
      {sub && <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{sub}</p>}
    </div>
  );
}

/* Minh hoạ khung dây cho gallery */
function PyramidArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <g strokeDasharray="4 5" opacity="0.55">
        <path d="M100 30 L64 118 M40 158 L64 118 M64 118 L166 128" />
      </g>
      <path d="M100 30 L40 158 L150 170 L166 128" />
      <path d="M100 30 L150 170 M100 30 L166 128" />
      <circle cx="100" cy="30" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}
function PrismArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <g strokeDasharray="4 5" opacity="0.55">
        <path d="M96 60 L44 88 M96 60 L152 92 M96 60 L96 146" />
      </g>
      <path d="M44 88 L152 92 M44 88 L44 168 M152 92 L152 174" />
      <path d="M44 168 L96 146 L152 174" />
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

/* ─────────── Nội dung ─────────── */

const VALUE = [
  { icon: Clock, title: 'Soạn đề nhanh', desc: 'Dán đề, nhận ngay hình dựng đúng toạ độ — không còn vẽ tay hay căn chỉnh thủ công.' },
  { icon: FileText, title: 'Xuất TikZ & PNG', desc: 'Mã LaTeX TikZ dán thẳng vào đề, hoặc ảnh PNG nền trắng / trong suốt sắc nét khi in.' },
  { icon: PencilRuler, title: 'Chuẩn sách giáo khoa', desc: 'Cạnh khuất nét đứt, mặt cầu / trụ / nón đúng quy ước hình học phổ thông.' },
  { icon: Layers, title: 'Lưu ngân hàng hình', desc: 'Đăng nhập để lưu lại hình đã dựng, xem lại và tái sử dụng cho những đề sau.' },
];

const STEPS = [
  { n: '1', title: 'Dán đề bài', desc: 'Gõ hoặc dán đề hình không gian bằng tiếng Việt.' },
  { n: '2', title: 'AI dựng hình', desc: 'Mô hình 3D xoay được + lời giải từng bước trong vài giây.' },
  { n: '3', title: 'Xoay & xuất', desc: 'Chọn góc nhìn, kéo-thả nhãn, xuất PNG hoặc TikZ.' },
];

const GALLERY = [
  { Art: PyramidArt, tag: 'Hình 1', name: 'Hình chóp', note: 'cạnh khuất nét đứt' },
  { Art: PrismArt, tag: 'Hình 2', name: 'Lăng trụ', note: 'đáy & đường sinh' },
  { Art: SphereArt, tag: 'Hình 3', name: 'Mặt cầu', note: 'đường bao + xích đạo' },
];

const FAQS = [
  { q: 'geo3d giúp giáo viên việc gì?', a: 'Dựng hình hình học không gian chuẩn để đưa vào đề thi, đề kiểm tra và giáo án — xuất được cả ảnh PNG lẫn mã LaTeX TikZ, tiết kiệm thời gian so với vẽ tay.' },
  { q: 'Vẽ được những loại hình nào?', a: 'Khối đa diện (chóp, lăng trụ, hộp, tứ diện…), mặt cầu, hình trụ, hình nón, mặt tròn xoay, thiết diện, và bài toạ độ Oxyz / đồ thị.' },
  { q: 'Xuất ra định dạng gì để chèn vào đề?', a: 'Ảnh PNG (nền trắng hoặc trong suốt) và mã LaTeX TikZ — dán thẳng vào Word hoặc file LaTeX.' },
  { q: 'Nét khuất, nhãn điểm có đúng chuẩn không?', a: 'Có. Cạnh bị che vẽ nét đứt, đỉnh khối đặt tên theo quy ước (A, B, C… và ký hiệu phẩy cho mặt trên); bạn còn kéo-thả để chỉnh vị trí nhãn.' },
  { q: 'Có cần đăng nhập không?', a: 'Dùng thử được ngay không cần đăng nhập. Đăng nhập để lưu hình và xem lại lịch sử.' },
];

const Landing = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'geo3d — Vẽ hình học không gian cho giáo viên, xuất PNG & TikZ';
  }, []);

  const goTo = (mode: Mode) => {
    localStorage.setItem(LAST_MODE_KEY, mode);
    navigate(`/${mode}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/50">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 h-14">
          <Wordmark />
          <div className="hidden sm:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#giao-vien" className="hover:text-foreground transition-colors">Cho giáo viên</a>
            <a href="#quy-trinh" className="hover:text-foreground transition-colors">Quy trình</a>
            <a href="#vi-du" className="hover:text-foreground transition-colors">Ví dụ</a>
            <button onClick={() => navigate('/bang-gia')} className="hover:text-foreground transition-colors">Bảng giá</button>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && !user && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Đăng nhập</Button>
            )}
            <Button size="sm" onClick={() => goTo('teacher')} className="gap-1.5">
              Dùng thử <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </nav>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div
          aria-hidden
          className="absolute inset-0 graph-paper-fine opacity-70"
          style={{
            maskImage: 'radial-gradient(ellipse 90% 70% at 60% 30%, black, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 60% 30%, black, transparent 75%)',
          }}
        />
        {/* Quầng sáng trôi nhẹ tạo chiều sâu */}
        <div aria-hidden className="lp-orb lp-orb-a w-72 h-72 -top-16 -left-10 bg-primary/25" />
        <div aria-hidden className="lp-orb lp-orb-b w-80 h-80 bottom-0 right-0 bg-blue-400/15" />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6 lp-enter" style={stagger(0.05)}>
              <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary">Công cụ dựng hình</span>
              <span className="h-px w-8 bg-primary/40" />
              <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">Cho giáo viên Toán</span>
            </div>
            <h1 className="text-4xl sm:text-[3.25rem] font-bold leading-[1.08] [text-wrap:balance] mb-5 lp-enter" style={stagger(0.12)}>
              Hình học không gian{' '}
              <span className="relative whitespace-nowrap text-primary">
                đẹp như in
                <span aria-hidden className="absolute left-0 -bottom-1 w-full border-b border-dashed border-primary/60" />
              </span>
              , chỉ từ đề bài
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-xl lp-enter" style={stagger(0.2)}>
              Dán đề, AI dựng ngay mô hình 3D chuẩn sách giáo khoa. Xoay tới góc ưng ý rồi xuất{' '}
              <b className="text-foreground font-semibold">PNG</b> hoặc{' '}
              <b className="text-foreground font-semibold font-cm italic">TikZ</b>{' '}
              để đưa thẳng vào đề thi, giáo án.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 lp-enter" style={stagger(0.28)}>
              <Button size="lg" onClick={() => goTo('teacher')} className="gap-2 h-12 transition-transform hover:-translate-y-0.5">
                <Presentation className="w-5 h-5" /> Vào chế độ Giáo viên
              </Button>
              <Button size="lg" variant="outline" onClick={() => goTo('student')} className="gap-2 h-12 transition-transform hover:-translate-y-0.5">
                <GraduationCap className="w-5 h-5" /> Chế độ Học sinh
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground lp-enter" style={stagger(0.36)}>
              {['Không cần cài đặt', 'Dùng thử miễn phí', 'Chuẩn nét khuất SGK'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" /> {t}
                </span>
              ))}
            </div>
            <div className="lp-enter" style={stagger(0.44)}>
              <ResumeCard />
            </div>
          </div>

          {/* Không gian 3D tương tác, đóng khung như một bản vẽ */}
          <div className="relative lp-enter" style={stagger(0.18)}>
            <div aria-hidden className="absolute -inset-8 blur-3xl bg-primary/15 rounded-full lp-orb-a" />
            <div className="relative lp-float">
              <RegMarks />
              <Suspense
                fallback={
                  <div className="glass rounded-xl border border-border/50 h-[420px] grid place-items-center text-sm text-muted-foreground">
                    Đang tải khung hình 3D…
                  </div>
                }
              >
                <HeroFigure />
              </Suspense>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground italic">
              Hình 1 — Hình chóp <span className="font-cm">S.ABCD</span> · nét khuất đổi theo góc nhìn
            </p>
          </div>
        </div>
      </section>

      {/* ─── Giá trị cho giáo viên ─── */}
      <section id="giao-vien" className="max-w-6xl mx-auto px-5 py-20">
        <SectionHead
          marker="a"
          eyebrow="Dành cho giáo viên"
          title="Từ đề bài tới hình lên đề, trong vài phút"
          sub="geo3d lo phần hình để bạn tập trung vào chuyên môn ra đề."
        />
        <Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60 rounded-xl overflow-hidden">
          {VALUE.map((f) => (
            <div key={f.title} className="group bg-background p-6 hover:bg-primary/[0.03] hover:-translate-y-0.5 transition-all">
              <div className="inline-flex items-center justify-center w-11 h-11 border border-primary/40 text-primary rounded-md mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-3">{f.title}</h3>
              <div className="border-t border-dashed border-border/70 mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        </Reveal>
      </section>

      {/* ─── Quy trình ─── */}
      <section id="quy-trinh" className="border-y border-border/50 bg-card/20">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <SectionHead marker="b" eyebrow="Quy trình" title="Ba bước, không cần cài gì" />
          <Reveal>
          <div className="relative grid sm:grid-cols-3 gap-8">
            <span aria-hidden className="hidden sm:block absolute top-5 left-[16.7%] right-[16.7%] border-t border-dashed border-border" />
            {STEPS.map((s) => (
              <div key={s.n} className="relative text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-primary/50 bg-background font-cm italic text-primary text-lg mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Gallery ─── */}
      <section id="vi-du" className="max-w-6xl mx-auto px-5 py-20">
        <SectionHead
          marker="c"
          eyebrow="Ví dụ"
          title="Nét vẽ đúng chuẩn hình học"
          sub="Cạnh khuất nét đứt, mặt cong đúng quy ước — hình lên đề là dùng được ngay."
        />
        <div className="grid sm:grid-cols-3 gap-5">
          {GALLERY.map(({ Art, tag, name, note }, i) => (
            <Reveal key={tag} delay={i * 0.1}>
            <figure className="group relative border border-border/60 rounded-xl overflow-hidden bg-card/30 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
              <RegMarks color="border-border" />
              <div className="graph-paper aspect-[4/3] grid place-items-center p-8">
                <Art className="w-36 h-36 text-foreground/85 transition-transform duration-500 group-hover:scale-105" />
              </div>
              <figcaption className="flex items-baseline gap-2 px-4 py-3 border-t border-border/60">
                <span className="font-cm italic text-primary text-sm shrink-0">{tag}</span>
                <span className="text-sm text-foreground/90 font-medium">{name}</span>
                <span className="text-sm text-muted-foreground truncate">— {note}</span>
              </figcaption>
            </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Câu trích giá trị ─── */}
      <section className="border-y border-border/50">
        <div className="max-w-4xl mx-auto px-5 py-16 text-center">
          <span aria-hidden className="font-cm italic text-primary/40 text-7xl leading-none block mb-2">“</span>
          <p className="text-2xl sm:text-3xl font-semibold leading-snug [text-wrap:balance] -mt-6">
            Thay vì mất cả buổi vẽ hình cho một đề, giờ chỉ cần dán đề bài rồi{' '}
            <span className="text-primary">xuất hình chuẩn ngay.</span>
          </p>
        </div>
      </section>

      {/* ─── Hai chế độ ─── */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <SectionHead marker="d" eyebrow="Bắt đầu" title="Chọn chế độ phù hợp" />
        <Reveal>
        <div className="grid sm:grid-cols-5 gap-5">
          <button
            onClick={() => goTo('teacher')}
            className="relative sm:col-span-3 text-left rounded-xl border border-primary/50 bg-primary/[0.04] p-7 hover:bg-primary/[0.08] hover:-translate-y-1 transition-all group"
          >
            <RegMarks />
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-md border border-primary/50 text-primary">
              <Presentation className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              Giáo viên
              <span className="text-[10px] font-semibold tracking-widest uppercase text-primary border border-primary/40 rounded px-1.5 py-0.5">Gợi ý</span>
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Dán đề → xoay tới góc ưng ý → xuất PNG đen trắng hoặc LaTeX TikZ để chèn vào đề thi, giáo án.
            </p>
            <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium">
              Vào chế độ Giáo viên <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          <button
            onClick={() => goTo('student')}
            className="sm:col-span-2 text-left rounded-xl border border-border/60 bg-card/30 p-7 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors group"
          >
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-md border border-border text-foreground/80">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Học sinh</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Nhập đề → AI vẽ hình 3D và giải từng bước để hiểu bài trực quan.
            </p>
            <span className="inline-flex items-center gap-1.5 text-primary text-sm font-medium">
              Vào ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
        </Reveal>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="border-t border-border/50 bg-card/20">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <SectionHead marker="e" eyebrow="Giải đáp" title="Câu hỏi thường gặp" />
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-left gap-4">
                  <span className="flex items-baseline gap-3">
                    <span className="font-cm italic text-primary/70 text-sm shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pl-8">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─── CTA cuối ─── */}
      <section className="relative overflow-hidden border-t border-border/50">
        <div aria-hidden className="absolute inset-0 graph-paper opacity-60" style={{ maskImage: 'radial-gradient(ellipse 60% 100% at 50% 0%, black, transparent)', WebkitMaskImage: 'radial-gradient(ellipse 60% 100% at 50% 0%, black, transparent)' }} />
        <div className="relative max-w-3xl mx-auto px-5 py-20 text-center">
          <Reveal>
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-5 lp-float" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 [text-wrap:balance]">Dựng hình cho đề tiếp theo của bạn</h2>
          <p className="text-muted-foreground mb-8">Miễn phí, không cần cài đặt.</p>
          <Button size="lg" onClick={() => goTo('teacher')} className="gap-2 h-12 transition-transform hover:-translate-y-0.5">
            Bắt đầu ngay <ArrowRight className="w-5 h-5" />
          </Button>
          </Reveal>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <Wordmark />
          <span className="text-xs">Hình học không gian bằng mắt.</span>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <button onClick={() => goTo('teacher')} className="hover:text-foreground transition-colors">Giáo viên</button>
            <button onClick={() => goTo('student')} className="hover:text-foreground transition-colors">Học sinh</button>
            {!isLoading && !user && <button onClick={() => navigate('/auth')} className="hover:text-foreground transition-colors">Đăng nhập</button>}
            <button onClick={() => navigate('/bang-gia')} className="hover:text-foreground transition-colors">Bảng giá</button>
            <button onClick={() => navigate('/dieu-khoan')} className="hover:text-foreground transition-colors">Điều khoản</button>
            <button onClick={() => navigate('/quyen-rieng-tu')} className="hover:text-foreground transition-colors">Bảo mật</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
