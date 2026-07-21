/**
 * AdvanceSolutionPanel — hiện LỜI GIẢI từng bước cho CÂU đang xem trong Advance.
 *
 * Advance scene (B2) nạp sẵn `advanceScene.steps[i].solution` (SolveResult) cho từng câu.
 * Panel này KHÔNG gọi API: mỗi khi đổi câu (state.currentStep) và câu đó có solution →
 * `hydrate()` vào một useSolver riêng rồi render lại phần thân kết quả (SolveResultView tái dùng).
 * Câu không có solution → không hiện panel. Điểm dựng của lời giải được reveal ở
 * GeometryRenderer (projectScene trên mergedGeometry), độc lập với panel này.
 *
 * v1: hiện panel nổi bên TRÁI khung (không đụng SolverPanel/RightPanel bên phải).
 * Đồng bộ camera / bước-trong-câu để Task C.
 */
import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional } from '@/context/CameraContext';
import { useSolver } from '@/hooks/useSolver';
import { SolveResultView } from '@/components/SolverPanel';

export function AdvanceSolutionPanel() {
  const ctx = useGeometryOptional();
  const cameraCtx = useCameraOptional();
  const advanceScene = ctx?.state.advanceScene ?? null;
  const questionIndex = ctx?.state.currentStep ?? 0;               // CÂU đang xem
  const solution = advanceScene?.steps?.[questionIndex]?.solution ?? null;

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

  return (
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
        />
      </div>
    </aside>
  );
}
