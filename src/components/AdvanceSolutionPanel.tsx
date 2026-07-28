/**
 * AdvanceSolutionPanel — hiện LỜI GIẢI từng bước cho CÂU đang xem trong Advance.
 *
 * Advance scene (B2) nạp sẵn `advanceScene.steps[i].solution` (SolveResult) cho từng câu.
 * Panel này KHÔNG gọi API: mỗi khi đổi câu (state.currentStep) và câu đó có solution →
 * `hydrate()` vào một useSolver riêng rồi render lại phần thân kết quả (SolveResultView tái dùng).
 * Câu không có solution → không hiện panel. Điểm dựng của lời giải được reveal ở
 * GeometryRenderer (projectScene trên mergedGeometry), độc lập với panel này.
 *
 * Desktop: panel nổi bên TRÁI khung. Mobile: nút "Lời giải" + Sheet trượt từ dưới
 * (trước đây panel bị `hidden md:flex` nên điện thoại KHÔNG xem được lời giải câu nào).
 */
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional } from '@/context/CameraContext';
import { useSolver } from '@/hooks/useSolver';
import { SolveResultView } from '@/components/SolverPanel';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function AdvanceSolutionPanel() {
  const ctx = useGeometryOptional();
  const cameraCtx = useCameraOptional();
  const advanceScene = ctx?.state.advanceScene ?? null;
  const questionIndex = ctx?.state.currentStep ?? 0;               // CÂU đang xem
  const solution = advanceScene?.steps?.[questionIndex]?.solution ?? null;
  const [open, setOpen] = useState(false);

  const { hydrate, result, currentStep, setCurrentStep } = useSolver();

  // Nạp lời giải mỗi khi đổi câu / solution đổi (hydrate reset bước-trong-câu về 0).
  useEffect(() => {
    if (solution) hydrate(solution);
  }, [solution, hydrate]);

  // Soi (mirror) bước-trong-câu ra context để orchestrator (GeometryRenderer) bay
  // camera tới điểm dựng của bước đó. Hydrate reset currentStep=0 → mirror đẩy 0.
  useEffect(() => { cameraCtx?.setSolutionStep(currentStep); }, [currentStep, cameraCtx]);

  // Câu không có lời giải (hoặc chưa nạp) → không hiện panel.
  if (!advanceScene || !solution || !result) return null;

  const questionLabel = advanceScene.steps?.[questionIndex]?.label ?? undefined;

  return (
    <>
      {/* ─── Desktop: panel nổi bên trái ─── */}
      <aside className="absolute left-4 top-20 bottom-28 z-30 w-[340px] max-w-[calc(100%-2rem)] hidden md:flex flex-col glass rounded-xl border border-border/50 shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2 shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Lời giải câu này</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <SolveResultView
            result={result}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            problem={questionLabel}
          />
        </div>
      </aside>

      {/* ─── Mobile: nút mở + Sheet trượt từ dưới ─── */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              aria-label="Xem lời giải câu này"
              className="fixed top-20 left-4 z-30 h-11 gap-1.5 rounded-full shadow-md glass border border-primary/40 text-primary bg-background/80 hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold">Lời giải</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] p-0 glass border-t border-border/50 flex flex-col">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2 shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Lời giải {questionLabel ?? 'câu này'}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <SolveResultView
                result={result}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                problem={questionLabel}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
