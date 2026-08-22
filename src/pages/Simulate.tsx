// Trang mô phỏng Lý/Hóa — "chỗ mô phỏng khác" khi người dùng dán đề Lý hoặc Hóa.
// Nhận đề qua location.state.problem (từ DropZone khi detectSubject ≠ 'geometry'),
// hoặc cho nhập trực tiếp tại đây. Gọi /api/analyze-problem qua useSubjectSolver rồi
// render bằng SimulationView (THUẦN). KHÔNG đụng luồng Toán — đây là route riêng.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSubjectSolver } from '@/hooks/useSubjectSolver';
import { SimulationView } from '@/components/simulate/SimulationView';
import { detectSubject } from '@/lib/subjectPrefilter';

const Simulate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialProblem = (location.state as { problem?: string } | null)?.problem ?? '';
  const { loading, result, error, solve } = useSubjectSolver();
  const [text, setText] = useState(initialProblem);
  const solvedFor = useRef<string | null>(null);

  // Tự giải đề được chuyển từ DropZone (chỉ một lần cho mỗi đề).
  useEffect(() => {
    const p = initialProblem.trim();
    if (p && solvedFor.current !== p) {
      solvedFor.current = p;
      solve(p);
    }
  }, [initialProblem, solve]);

  const handleSubmit = () => {
    const p = text.trim();
    if (!p || loading) return;
    solvedFor.current = p;
    solve(p);
  };

  const subjectLabel =
    result?.subject === 'physics' ? 'Vật lý' : result?.subject === 'chem' ? 'Hóa học' : 'Mô phỏng';

  return (
    <div className="min-h-screen w-full radial-gradient-bg flex flex-col">
      {/* Thanh trên */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Về
        </button>
        <span className="text-sm font-medium">{subjectLabel}</span>
      </div>

      {/* Ô nhập đề (cho phép nhập lại ngay trên trang) */}
      <div className="px-4 py-3 flex gap-2 items-end max-w-3xl w-full mx-auto">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={2}
          placeholder="Dán đề Vật lý hoặc Hóa học…"
          className="flex-1 resize-none rounded-lg border border-border bg-background/70 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? 'Đang giải…' : 'Giải'}
        </button>
      </div>

      {/* Gợi ý phân loại khi đang gõ (không gọi AI) */}
      {text.trim() && !loading && !result && (
        <p className="px-4 text-xs text-muted-foreground max-w-3xl w-full mx-auto">
          Nhận diện: {detectSubject(text) === 'chem' ? 'Hóa học' : detectSubject(text) === 'physics' ? 'Vật lý' : 'chưa rõ (có thể là Toán — hãy dùng trang chính)'}
        </p>
      )}

      {/* Sân khấu mô phỏng */}
      <div className="flex-1 min-h-0 px-4 py-4 max-w-5xl w-full mx-auto">
        <SimulationView result={result} loading={loading} error={error} />
      </div>
    </div>
  );
};

export default Simulate;
