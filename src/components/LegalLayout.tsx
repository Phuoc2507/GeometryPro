import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/Brand';

/** Khung chung cho các trang pháp lý (Điều khoản, Bảo mật). */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/50">
        <nav className="max-w-3xl mx-auto flex items-center justify-between px-5 h-14">
          <button onClick={() => navigate('/')} aria-label="Về trang chủ">
            <Wordmark />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-bold mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Cập nhật lần cuối: {updated}</p>

        <div
          className="space-y-5 leading-relaxed text-[15px] text-foreground/90
                     [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2
                     [&_p]:text-muted-foreground
                     [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:text-muted-foreground
                     [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
                     [&_strong]:text-foreground"
        >
          {children}
        </div>

        <div className="mt-12 pt-6 border-t border-border/50 flex gap-4 text-sm text-muted-foreground">
          <button onClick={() => navigate('/dieu-khoan')} className="hover:text-foreground">Điều khoản dịch vụ</button>
          <button onClick={() => navigate('/quyen-rieng-tu')} className="hover:text-foreground">Chính sách bảo mật</button>
          <button onClick={() => navigate('/')} className="hover:text-foreground">Trang chủ</button>
        </div>
      </main>
    </div>
  );
}
