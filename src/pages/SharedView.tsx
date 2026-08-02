/**
 * SharedView — route /s/:id
 *
 * Trang XEM CÔNG KHAI (không cần đăng nhập) cho một bài đã đánh dấu is_public.
 * Hiện: hình 3D xoay được + đề bài + lời giải (advance: stepper/panel; solve:
 * danh sách bước read-only). Đọc qua RLS "Public can read public geometries".
 */
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Save, Check } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { supabase } from '@/integrations/supabase/client';
import { GeometryProvider, useGeometryOptional } from '@/context/GeometryContext';
import { CameraProvider } from '@/context/CameraContext';
import { GeometryCanvas } from '@/components/3d/GeometryCanvas';
import { AdvanceStepper } from '@/components/layout/AdvanceStepper';
import { AdvanceSolutionPanel } from '@/components/AdvanceSolutionPanel';
import { Wordmark } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GeometryData } from '@/types/geometry';
import { useAuth } from '@/context/AuthContext';
import { saveSharedProblem } from '@/lib/saveSharedProblem';
import { toast } from '@/hooks/use-toast';
import type { SolveResult } from '@/hooks/useSolver';

interface SharedRow {
  name: string;
  prompt: string | null;
  geometry_data: GeometryData;
}

/** Nạp hình vào provider cục bộ, dùng đúng bộ render thật. */
function FigureLoader({ geometry }: { geometry: GeometryData }) {
  const ctx = useGeometryOptional();
  useEffect(() => {
    ctx?.loadGeometry(geometry, { silent: true });
  }, [ctx, geometry]);
  return null;
}

/** Lời giải read-only cho bài dạng solve (không phải advance). */
function SolveSolution({ result }: { result: SolveResult }) {
  return (
    <div className="flex flex-col gap-3">
      {result.steps?.map((step, i) => (
        <div key={step.id || i} className="rounded-lg border border-border/50 bg-secondary/20 p-3">
          <p className="text-sm font-medium mb-1">
            Bước {i + 1}. {step.title}
          </p>
          {step.explanation && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.explanation}</p>
          )}
          {step.formula && (
            <div className="mt-2 overflow-x-auto">
              <BlockMath math={step.formula} />
            </div>
          )}
        </div>
      ))}

      {result.final_answer && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            result.verified
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          {result.verified ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          )}
          <div>
            <p className="font-medium">Đáp số</p>
            <div className="overflow-x-auto">
              <BlockMath math={result.final_answer} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SharedViewInner({ row }: { row: SharedRow }) {
  const geometry = row.geometry_data;
  const problem = row.prompt || geometry.solve?.problem || geometry.llmPrompt || '';
  const solve = geometry.solve?.result;

  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Người được share lưu bài về tài khoản: vào cả Lịch sử (left panel) lẫn kho
  // /saved, chống trùng + đẩy lên đầu (xem saveSharedProblem).
  const handleSave = async () => {
    if (saved) {
      navigate('/saved');
      return;
    }
    if (!user) {
      openAuthModal('save');
      return;
    }
    setSaving(true);
    try {
      const result = await saveSharedProblem({
        userId: user.id,
        name: row.name,
        prompt: row.prompt ?? null,
        geometry,
      });
      if (result.ok) {
        setSaved(true);
        toast({
          title: result.duplicated ? 'Bài đã có trong kho' : 'Đã lưu vào tài khoản!',
          description: result.duplicated
            ? 'Đã đưa bài lên đầu danh sách của bạn.'
            : 'Xem lại trong "Hình đã lưu".',
        });
      } else {
        toast({ title: 'Lỗi', description: 'Không lưu được bài. Thử lại nhé.', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FigureLoader geometry={geometry} />
      <div className="min-h-screen radial-gradient-bg flex flex-col">
        {/* Thanh trên */}
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50 backdrop-blur-sm">
          <Link to="/" className="flex items-center gap-2">
            <Wordmark />
          </Link>
          <Button size="sm" variant={saved ? 'outline' : 'default'} className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Đang lưu…' : saved ? 'Đã lưu — Xem lại' : 'Lưu bài này'}
          </Button>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Hình 3D */}
          <div className="relative w-full lg:flex-1 h-[46vh] lg:h-auto lg:min-h-[calc(100vh-57px)]">
            <GeometryCanvas />
            <AdvanceStepper />
            <AdvanceSolutionPanel />
          </div>

          {/* Đề + lời giải */}
          <aside className="w-full lg:w-[380px] lg:border-l border-border/50 border-t lg:border-t-0">
            <ScrollArea className="h-auto lg:h-[calc(100vh-57px)]">
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <h1 className="text-lg font-bold leading-tight">{row.name}</h1>
                </div>

                {problem && (
                  <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                      Đề bài
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{problem}</p>
                  </div>
                )}

                {solve ? (
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                      Lời giải
                    </p>
                    <SolveSolution result={solve} />
                  </div>
                ) : !geometry.advanceScene ? (
                  <p className="text-xs text-muted-foreground">
                    Bài này chưa kèm lời giải — bạn có thể xoay hình để xem.
                  </p>
                ) : null}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </div>
    </>
  );
}

export default function SharedView() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<SharedRow | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setStatus('notfound');
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('saved_geometries')
        .select('name, prompt, geometry_data')
        .eq('id', id)
        .eq('is_public', true)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setStatus('notfound');
        return;
      }
      setRow(data as unknown as SharedRow);
      setStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'notfound' || !row) {
    return (
      <div className="min-h-screen radial-gradient-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Không tìm thấy bài</h1>
          <p className="text-sm text-muted-foreground">
            Link có thể đã bị gỡ công khai hoặc không tồn tại.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <GeometryProvider>
      <CameraProvider>
        <SharedViewInner row={row} />
      </CameraProvider>
    </GeometryProvider>
  );
}
