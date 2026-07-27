/**
 * SolverPanel — Sprint 2 student-mode solver UI
 *
 * Right-side panel that:
 *   1. Lets student enter (or review) the problem text
 *   2. Calls POST /api/solve with current geometry
 *   3. Shows steps[] with Bước N/Total navigation
 *   4. Displays final answer with ✓ verified / ⚠️ flag
 *
 * Desktop: fixed panel on right (lg:w-80)
 * Mobile:  Sheet trigger at bottom-right
 */
import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  ChevronLeft, ChevronRight, Sparkles, Loader2,
  AlertTriangle, RotateCcw, BookOpen, ChevronDown, Eye,
  Lightbulb, CheckCircle2, XCircle,
} from 'lucide-react';
import { gradeAnswer, type GradeVerdict } from '@/lib/gradeAnswer';
import { useLocation } from 'react-router-dom';
import { Button }      from '@/components/ui/button';
import { Textarea }    from '@/components/ui/textarea';
import { ScrollArea }  from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional }   from '@/context/CameraContext';
import { useSolveJobs } from '@/context/SolveJobsContext';
import { useGeometryHistory } from '@/hooks/useGeometryHistory';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { buildSolveReveal, type SolveReveal } from '@/lib/solveReveal';
import { cn }          from '@/lib/utils';
import { safetyTierMeta, verifiedToLevel, exactnessLabel } from '@/lib/safetyTier';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Các chuỗi placeholder khi vẽ từ ảnh (OCR tắt trên Vercel nên đề thật KHÔNG được trích) —
// không auto-fill mấy chuỗi này vì chúng không phải đề bài, dễ khiến người dùng bấm giải nhầm.
const IMAGE_PLACEHOLDERS = ['Đề bài từ ảnh', 'Đề bài trong ảnh được đính kèm.', 'Đang nhận dạng ảnh'];

/**
 * Đề bài để tự điền vào ô giải. Ưu tiên:
 *   1. Đề gõ tay: prompt hàng đợi gần nhất (không phải ảnh) — sạch, đầy đủ.
 *   2. Đề từ ảnh: problemText ĐẦY ĐỦ lưu trên queue item (không bị cắt như nhãn hiển thị).
 *   3. Hình nạp lại (Lưu / URL, không có queue): geometry.llmPrompt.
 *   4. Fallback cuối: nhãn hàng đợi ảnh đã cắt (bỏ "📷" và "…").
 */
function useLastProblem(): string {
  const ctx = useGeometryOptional();
  if (!ctx) return '';

  const { queue, activeQueueId } = ctx.state;
  const isUsable = (q?: { status: string; prompt?: string }) =>
    !!q && (q.status === 'done' || q.status === 'processing') && !!q.prompt;

  // Ưu tiên item đang xem (active) để đúng với hình đang hiển thị; nếu không có, lấy item mới nhất.
  const active = activeQueueId ? queue.find(q => q.id === activeQueueId) : undefined;
  const last = isUsable(active)
    ? active
    : [...queue].reverse().find(isUsable);

  // 1) Đề gõ tay (không phải ảnh) → prompt hàng đợi là đề sạch, đầy đủ.
  if (last && !last.prompt.startsWith('📷')) return last.prompt;

  // 2) Đề ĐẦY ĐỦ từ ảnh, lưu nguyên trên queue item (nhãn `prompt` bị cắt 80 ký tự — KHÔNG dùng nó).
  const fromQueue = (last?.problemText || '').trim();
  if (fromQueue && !IMAGE_PLACEHOLDERS.includes(fromQueue)) return fromQueue;

  // 3) Hình nạp lại (Lưu / URL) → đề đã đọc lưu ở geometry.llmPrompt.
  const fromGeom = (ctx.state.geometry?.llmPrompt || '').trim();
  if (fromGeom && !IMAGE_PLACEHOLDERS.includes(fromGeom)) return fromGeom;

  // 4) Fallback: hình cũ chưa có llmPrompt → dùng tạm text đã cắt trong nhãn hàng đợi ảnh.
  if (last) {
    const cleaned = last.prompt.replace(/^📷\s*/, '').replace(/…$|\.{3}$/, '').trim();
    if (cleaned && !IMAGE_PLACEHOLDERS.includes(cleaned)) return cleaned;
  }
  return '';
}

// ─── Math rendering (KaTeX) ────────────────────────────────────────────────────

const isUpperLetter = (c: string) =>
  !!c && c.toLowerCase() !== c.toUpperCase() && c === c.toUpperCase();

/**
 * Tách văn xuôi thành từng CÂU (để mỗi câu xuống dòng cho dễ đọc). Ngắt tại dấu chấm + khoảng trắng
 * mà câu sau bắt đầu bằng chữ HOA / số / công thức. TÔN TRỌNG $...$ (không ngắt trong công thức) và
 * số thập phân (2.5 không bị ngắt), bỏ qua dấu ba chấm (...).
 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inMath = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    cur += ch;
    if (ch === '$') inMath = !inMath;
    if (!inMath && ch === '.' && text[i - 1] !== '.' && text[i + 1] !== '.') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      const next = text[j];
      if (j > i + 1 && next && (next === '$' || /[0-9]/.test(next) || isUpperLetter(next))) {
        out.push(cur.trim());
        cur = '';
        i = j - 1; // nuốt khoảng trắng
      }
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/**
 * Đề bài do người dùng dán / đọc từ ảnh thường chứa LaTeX THÔ, không có $...$
 * (vd "A. \frac{\sqrt{3}a^3}{9}."). Tự bọc các "mảnh LaTeX" (token chứa \ ^ _ { })
 * vào $...$ để render đẹp như lời giải. Nếu đã có $ (lời giải AI) thì giữ nguyên.
 */
function autoMathWrap(text: string): string {
  if (!text || text.includes('$')) return text;
  return text.replace(/\S+/g, (tok) => {
    const m = tok.match(/^(.*?)([.,;]*)$/);        // tách dấu câu đuôi (. , ;) khỏi phần công thức
    const core = m ? m[1] : tok;
    const tail = m ? m[2] : '';
    if (core && /[\\^_{}]/.test(core)) return `$${core}$${tail}`;
    return tok;
  });
}

/** Render một câu: phần $...$ / \(...\) dùng KaTeX, còn lại là chữ. */
function renderInline(text: string, keyPrefix: string) {
  const parts = (text || '').split(/(\$[^$]+\$|\\\([^)]*?\\\))/g);
  return parts.map((part, i) => {
    const inline =
      (part.startsWith('$') && part.endsWith('$') && part.length > 2) ? part.slice(1, -1) :
      (part.startsWith('\\(') && part.endsWith('\\)')) ? part.slice(2, -2) : null;
    if (inline != null) {
      return <InlineMath key={keyPrefix + i} math={inline} renderError={() => <span>{part}</span>} />;
    }
    return <span key={keyPrefix + i} className="whitespace-pre-wrap">{part}</span>;
  });
}

/** Đoạn văn có công thức inline: tách từng câu, mỗi câu một dòng cho dễ theo dõi. */
function MathText({ text, className }: { text: string; className?: string }) {
  const sentences = splitSentences(text || '');
  if (sentences.length <= 1) {
    return <p className={className}>{renderInline(text || '', 's0-')}</p>;
  }
  return (
    <div className={cn(className, 'space-y-1.5')}>
      {sentences.map((s, i) => (
        <p key={i}>{renderInline(s, `s${i}-`)}</p>
      ))}
    </div>
  );
}

// Các toán tử SUY RA / TƯƠNG ĐƯƠNG ở cấp ngoài cùng — chỗ xuống dòng tự nhiên của công thức dài.
const BREAK_OPS = new Set(['Longleftrightarrow', 'Leftrightarrow', 'Longrightarrow', 'Rightarrow',
  'Longleftarrow', 'Leftarrow', 'implies', 'impliedby', 'iff', 'longmapsto', 'longrightarrow', 'mapsto', 'to']);

/**
 * Tự xuống dòng công thức display dài: cắt tại các mũi tên suy ra (⇒, ⇔, →...) Ở CẤP NGOÀI CÙNG
 * (không nằm trong {}, \left...\right), gói vào \begin{gathered} để KaTeX render nhiều dòng.
 * Không cắt được thì trả nguyên (vẫn cuộn ngang được như cũ).
 */
function wrapTex(tex: string): string {
  if (tex.includes('\\begin{')) return tex; // đã là môi trường nhiều dòng -> để yên
  const s = tex;
  let depth = 0;
  const breaks: number[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth = Math.max(0, depth - 1); i++; continue; }
    if (c === '\\') {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const name = s.slice(i + 1, j);
      if (name === 'left') { depth++; i = j; continue; }
      if (name === 'right') { depth = Math.max(0, depth - 1); i = j; continue; }
      if (depth === 0 && BREAK_OPS.has(name)) breaks.push(i);
      i = j; continue;
    }
    i++;
  }
  if (breaks.length === 0) return tex;
  const segs: string[] = [];
  let start = 0;
  for (const b of breaks) { segs.push(s.slice(start, b).trim()); start = b; }
  segs.push(s.slice(start).trim());
  const lines = segs.filter(Boolean);
  if (lines.length <= 1) return tex;
  return `\\begin{gathered}${lines.join(' \\\\ ')}\\end{gathered}`;
}

/** Công thức khối: bỏ $...$/\[...\] bao ngoài (nếu có) rồi render KaTeX display. */
function FormulaBlock({ formula }: { formula: string }) {
  let tex = formula.trim();
  if (tex.startsWith('$$') && tex.endsWith('$$')) tex = tex.slice(2, -2);
  else if (tex.startsWith('$') && tex.endsWith('$')) tex = tex.slice(1, -1);
  else if (tex.startsWith('\\[') && tex.endsWith('\\]')) tex = tex.slice(2, -2);
  tex = wrapTex(tex);
  return (
    // Công thức dài không bị cắt: cuộn ngang (xử lý ở index.css cho .katex-display) + thu nhỏ chút.
    <div className="mt-1 rounded-lg bg-secondary/40 border border-border/40 px-3 py-2 overflow-x-auto [&_.katex]:text-[0.95rem]">
      <BlockMath math={tex} renderError={() => <span className="text-sm font-mono text-foreground/90 break-all">{formula}</span>} />
    </div>
  );
}

// ─── Step card ───────────────────────────────────────────────────────────────

interface StepCardProps {
  step: import('@/hooks/useSolver').SolveStep;
  index: number;
  total: number;
  constructedIds?: string[]; // điểm bước này DỰNG THÊM (đánh dấu khác điểm gốc)
  gated?: boolean;           // học sinh: ẩn giải thích sau nút "Vì sao?" để tự nghĩ trước
}

function StepCard({ step, index, constructedIds, gated }: StepCardProps) {
  const constructed = new Set(constructedIds ?? []);
  const hasConstructed = step.highlight?.some((id) => constructed.has(id)) ?? false;
  const hasWhy = !!(step.explanation?.trim() || step.formula);
  const [revealed, setRevealed] = useState(!gated);
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3.5 my-1 animate-fade-in">
      {/* Số thứ tự + tiêu đề bước */}
      <div className="flex items-start gap-2.5">
        <span className="flex-none w-6 h-6 rounded-lg bg-primary/15 text-primary font-semibold text-xs flex items-center justify-center">
          {index + 1}
        </span>
        <span className="text-[13.5px] font-semibold text-foreground leading-snug mt-0.5">{step.title}</span>
      </div>

      {/* Học sinh: giải thích + công thức ẩn sau "Vì sao?" cho em tự nghĩ trước. */}
      {gated && hasWhy && !revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/45 px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5" /> Vì sao? · Gợi ý
        </button>
      ) : (
        <>
          {/* Giải thích (chữ + công thức inline) */}
          <MathText text={step.explanation} className="text-sm text-muted-foreground leading-relaxed mt-2.5" />

          {/* Công thức khối */}
          {step.formula && <FormulaBlock formula={step.formula} />}
        </>
      )}

      {/* Điểm liên quan bước này — điểm DỰNG THÊM viền nét đứt màu chính. */}
      {step.highlight && step.highlight.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {step.highlight.map(id => {
              const isNew = constructed.has(id);
              return (
                <span
                  key={id}
                  title={isNew ? 'Điểm dựng thêm ở bước này' : undefined}
                  className={cn(
                    'inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full border text-xs font-cm italic',
                    isNew
                      ? 'border-dashed border-primary/70 bg-primary/10 text-primary'
                      : 'border-border/70 bg-background/60 text-foreground/90',
                  )}
                >
                  {id}
                </span>
              );
            })}
          </div>
          {hasConstructed && (
            <p className="mt-1.5 text-[10.5px] text-primary/80 flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-dashed border-primary/70 bg-primary/10" />
              điểm dựng thêm ở bước này
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Phản hồi chấm đáp án tự nhập ───────────────────────────────────────────────
function AnswerFeedback({ verdict }: { verdict: GradeVerdict }) {
  const map = {
    correct:     { icon: CheckCircle2, text: 'Chính xác! 🎉 Giỏi lắm.',                      cls: 'text-green-600 dark:text-green-400 bg-green-500/12 border-green-500/30' },
    close:       { icon: AlertTriangle, text: 'Gần đúng rồi — có thể do làm tròn. Kiểm lại nhé.', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/30' },
    wrong:       { icon: XCircle,       text: 'Chưa đúng, thử lại nhé. Xem gợi ý “Vì sao?” ở mỗi bước.', cls: 'text-red-600 dark:text-red-400 bg-red-500/12 border-red-500/30' },
    unparseable: { icon: AlertTriangle, text: 'Chưa đọc được số — thử gõ kiểu 2√3, 4/3, pi/6.', cls: 'text-muted-foreground bg-secondary/40 border-border/60' },
    'no-reference': { icon: AlertTriangle, text: '', cls: '' },
  } as const;
  const m = map[verdict];
  if (!m.text) return null;
  const Icon = m.icon;
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-medium leading-snug animate-fade-in', m.cls)}>
      <Icon className="w-4 h-4 shrink-0 mt-px" />
      <span>{m.text}</span>
    </div>
  );
}

// ─── Reusable results view ─────────────────────────────────────────────────────
// Tách từ nhánh `if (result)` của SolverContent để tái dùng cho Advance (lời giải
// đã nạp sẵn, KHÔNG gọi API). `onReset` có → hiện nút "Giải lại" (luồng solve on-demand);
// không có → ẩn nút (advance chỉ xem lời giải đã lưu).
function SolveResultViewImpl({
  result, currentStep, setCurrentStep, onReset, problem, constructedByStep, compact,
}: {
  result: import('@/hooks/useSolver').SolveResult;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  onReset?: () => void;
  problem?: string;
  constructedByStep?: string[][]; // theo bước: id các điểm dựng thêm (để đánh dấu)
  compact?: boolean;             // mobile: bố cục gọn để thấy hình nhiều hơn
}) {
  // Chế độ Học sinh: ẩn đáp số lúc đầu để em TỰ NGHĨ trước rồi mới hé (productive struggle).
  const isStudent = useLocation().pathname.startsWith('/student');
  const step   = result.steps[currentStep] ?? null;
  const nSteps  = result.steps.length;
  const [showProblem, setShowProblem] = useState(false);
  const [showAll, setShowAll] = useState(false);          // xem TẤT CẢ bước cùng lúc
  const [answerShown, setAnswerShown] = useState(!isStudent);

  // Tự nhập đáp án để chấm (chấm tại máy dựa trên answer_value đã kiểm chứng).
  const [guess, setGuess] = useState('');
  const [verdict, setVerdict] = useState<GradeVerdict | null>(null);
  const [showGrade, setShowGrade] = useState(false); // compact: hiện ô tự chấm khi bấm
  const canGrade = result.answer_value != null && Number.isFinite(result.answer_value);
  // Bài mới -> ẩn lại đáp số & xoá ô nhập.
  useEffect(() => {
    setGuess('');
    setVerdict(null);
    setShowGrade(false);
    setAnswerShown(!isStudent);
  }, [result, isStudent]);
  const checkGuess = useCallback(() => {
    if (!guess.trim()) return;
    const g = gradeAnswer(guess, result.answer_value);
    setVerdict(g.verdict);
    if (g.verdict === 'correct') {
      // Đúng -> hé đáp án chính thức để em đối chiếu (giữ lời khen 1 nhịp).
      window.setTimeout(() => setAnswerShown(true), 850);
    }
  }, [guess, result.answer_value]);

  const level = result.tier?.level ?? verifiedToLevel(result.verified);
  const meta = safetyTierMeta(level);
  const TierIcon = meta.icon;
  const reasonMsg = result.tier?.reason?.message ?? result.verify_error;
  const chipTone =
    meta.tone === 'ok' ? 'bg-green-500/12 text-green-600 dark:text-green-400 border-green-500/30'
    : meta.tone === 'muted' ? 'bg-blue-500/12 text-blue-500 border-blue-500/30'
    : 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/30';
  const progressPct = nSteps > 0 ? ((currentStep + 1) / nSteps) * 100 : 0;

  return (
    <div className="h-full flex flex-col">
      {/* ─── Đáp số — bản GỌN (mobile): 1 dòng, tự chấm ẩn sau nút ─── */}
      {compact ? (
        <div className="px-3 pt-2 pb-1.5 shrink-0">
          {answerShown ? (
            <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">Đáp số</span>
              <MathText text={result.final_answer} className="text-sm font-semibold text-foreground break-words min-w-0 flex-1" />
              <TierIcon className={cn('w-3.5 h-3.5 shrink-0', meta.tone === 'ok' ? 'text-green-500' : meta.tone === 'muted' ? 'text-blue-500' : 'text-amber-500')} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {canGrade && (
                  <button
                    onClick={() => setShowGrade((v) => !v)}
                    className={cn('flex-1 h-9 rounded-xl border text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors',
                      showGrade ? 'border-primary bg-primary/10 text-primary' : 'border-primary/40 text-primary hover:bg-primary/10')}
                  >
                    <Lightbulb className="w-4 h-4" /> Tự chấm
                  </button>
                )}
                <button
                  onClick={() => setAnswerShown(true)}
                  className="flex-1 h-9 rounded-xl border border-dashed border-primary/50 text-primary text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors"
                >
                  <Eye className="w-4 h-4" /> Xem đáp án
                </button>
              </div>
              {canGrade && showGrade && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={guess}
                      onChange={(e) => { setGuess(e.target.value); setVerdict(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') checkGuess(); }}
                      placeholder="Đáp số của em… vd 2√3, 4/3, pi/6"
                      aria-label="Nhập đáp số của em"
                      className="flex-1 min-w-0 h-10 rounded-xl border border-primary/40 bg-background/60 px-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                    <Button onClick={checkGuess} disabled={!guess.trim()} size="sm" className="h-10 px-4 rounded-xl shrink-0">
                      Kiểm tra
                    </Button>
                  </div>
                  {verdict && <AnswerFeedback verdict={verdict} />}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
      /* ─── Đáp số nổi bật (bản đầy đủ — desktop) ─── */
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/[0.03] px-4 py-3.5">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary">Đáp số</div>
          {answerShown ? (
            <>
              <MathText text={result.final_answer} className="mt-1.5 text-lg font-semibold text-foreground break-words" />
              <span className={cn('inline-flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border', chipTone)}>
                <TierIcon className="w-3 h-3" />
                {meta.description}
                {level === 1 && result.tier?.exactness ? ` · ${exactnessLabel(result.tier.exactness)}` : ''}
              </span>
              {level === 3 && reasonMsg && (
                <p className="text-[11px] mt-2 text-muted-foreground/90 leading-snug break-words">{reasonMsg}</p>
              )}
            </>
          ) : (
            <div className="mt-2 space-y-2">
              {/* Tự nhập đáp án để tự chấm (nếu bài có số chuẩn). */}
              {canGrade && (
                <>
                  <div className="flex gap-2">
                    <input
                      value={guess}
                      onChange={(e) => { setGuess(e.target.value); setVerdict(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') checkGuess(); }}
                      placeholder="Nhập đáp số của em… vd 2√3, 4/3, pi/6"
                      aria-label="Nhập đáp số của em"
                      className="flex-1 min-w-0 h-10 rounded-xl border border-primary/40 bg-background/60 px-3 text-sm text-foreground outline-none focus:border-primary transition-colors"
                    />
                    <Button onClick={checkGuess} disabled={!guess.trim()} size="sm" className="h-10 px-4 rounded-xl shrink-0">
                      Kiểm tra
                    </Button>
                  </div>
                  {verdict && <AnswerFeedback verdict={verdict} />}
                </>
              )}
              <button
                onClick={() => setAnswerShown(true)}
                className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl border border-dashed border-primary/50 text-primary text-[13px] font-semibold hover:bg-primary/10 transition-colors"
              >
                <Eye className="w-4 h-4" /> Xem đáp án
              </button>
            </div>
          )}
        </div>
        {!answerShown && !verdict && (
          <p className="text-[11px] text-muted-foreground/70 text-center mt-1.5">
            {canGrade ? 'Tự làm rồi nhập đáp số để đối chiếu — hoặc bấm “Xem đáp án”.' : 'Thử tự làm theo các bước trước nhé — bấm khi muốn đối chiếu.'}
          </p>
        )}
      </div>
      )}

      {/* ─── Đề bài (thu gọn, render đẹp như lời giải) — ẩn ở bản gọn ─── */}
      {!compact && problem && problem.trim() && (
        <div className="mx-4 mb-2 shrink-0 rounded-xl border border-border/60 bg-secondary/15 overflow-hidden">
          <button
            onClick={() => setShowProblem((v) => !v)}
            aria-expanded={showProblem}
            className="w-full flex items-center gap-1.5 px-3.5 py-2.5 text-left hover:bg-secondary/40 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-1">Đề bài</span>
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', !showProblem && '-rotate-90')} />
          </button>
          {showProblem && (
            <div className="px-3.5 pb-3 max-h-40 overflow-y-auto">
              <MathText text={autoMathWrap(problem)} className="text-sm text-foreground/85 leading-relaxed" />
            </div>
          )}
        </div>
      )}

      {/* ─── Lời giải: tiêu đề + nút xem tất cả + thanh tiến độ ─── */}
      <div className="px-4 pt-1 shrink-0">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-[12.5px] font-semibold text-foreground">Lời giải từng bước</span>
          <div className="flex items-center gap-2">
            {!showAll && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {nSteps > 0 ? `Bước ${currentStep + 1} / ${nSteps}` : 'Không có bước'}
              </span>
            )}
            {nSteps > 1 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-[11px] font-medium text-primary hover:underline shrink-0"
              >
                {showAll ? 'Từng bước' : 'Xem tất cả'}
              </button>
            )}
          </div>
        </div>
        {!showAll && (
          <div className="h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>

      {/* ─── Thân: từng bước (điều hướng) hoặc tất cả các bước ─── */}
      {/* Ép child của viewport về block (Radix để display:table -> phình ngang theo công thức dài). */}
      <ScrollArea className="flex-1 px-4 pt-2 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!min-w-0">
        {nSteps === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Không có bước nào.</p>
        ) : showAll ? (
          // "Xem tất cả" = xem đầy đủ để ôn/đối chiếu ⇒ không ẩn giải thích.
          <div className="space-y-1 pb-2">
            {result.steps.map((s, i) => (
              <StepCard key={i} step={s} index={i} total={nSteps} constructedIds={constructedByStep?.[i]} />
            ))}
          </div>
        ) : step ? (
          // key theo bước ⇒ trạng thái "Vì sao?" reset khi chuyển bước.
          <StepCard key={step.id ?? currentStep} step={step} index={currentStep} total={nSteps} constructedIds={constructedByStep?.[currentStep]} gated={isStudent} />
        ) : null}
      </ScrollArea>

      {/* ─── Điều hướng bước (ẩn khi xem tất cả) ─── */}
      {!showAll && (
        <div className="flex gap-2 px-4 py-3 shrink-0">
          <Button
            variant="outline" size="sm"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(s => s - 1)}
            className="flex-1 gap-1 h-9"
          >
            <ChevronLeft className="w-4 h-4" /> Bước trước
          </Button>
          <Button
            size="sm"
            disabled={currentStep >= nSteps - 1}
            onClick={() => setCurrentStep(s => s + 1)}
            className="flex-1 gap-1 h-9"
          >
            Bước sau <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ─── Giải lại (chỉ luồng solve on-demand) ─── */}
      {onReset && (
        <div className="px-4 pb-3 shrink-0">
          <button onClick={onReset} className="w-full h-8 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors text-xs font-medium inline-flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3 h-3" /> Giải lại
          </button>
        </div>
      )}
    </div>
  );
}

// memo: khi xoay hình, SolverContent render lại mỗi khung nhưng props ở đây (result/currentStep/
// setCurrentStep/onReset/problem) không đổi ⇒ khối KaTeX nặng này KHÔNG render lại ⇒ hết lag.
export const SolveResultView = memo(SolveResultViewImpl);

// ─── Panel content ────────────────────────────────────────────────────────────

export function SolverContent({ creditNote, compact }: { creditNote?: string; compact?: boolean } = {}) {
  const ctx         = useGeometryOptional();
  const camera      = useCameraOptional();
  const lastProblem = useLastProblem();
  const { getJob, startJob, clearJob, claimSave, releaseSave } = useSolveJobs();
  const { updateGeometryData } = useGeometryHistory();
  const geometry = ctx?.state.geometry ?? null;
  const geometryKey = useMemo(() => {
    if (!geometry) return '';
    const points = geometry.points.map((point) => `${point.id}:${point.x},${point.y},${point.z}`).join('|');
    const lines = geometry.lines.map((line) => `${line.id}:${line.from}>${line.to}`).join('|');
    return `${geometry.name}:${points}:${lines}`;
  }, [geometry]);

  const [problem, setProblem]     = useState('');
  const [reveal, setReveal]       = useState<SolveReveal | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false); // đã bấm "Giải lại" → ẩn kết quả cũ để nhập/giải mới
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  // camera đổi tham chiếu MỖI KHUNG khi xoay hình (hiddenLines cập nhật liên tục). Giữ trong ref để
  // các effect/handler bên dưới KHÔNG phụ thuộc trực tiếp vào `camera` ⇒ không chạy lại mỗi khung ⇒ hết lag.
  const cameraRef                 = useRef(camera);
  cameraRef.current               = camera;
  // Theo dõi (bài, bước) đã lấy nét — chỉ bay camera khi ĐỔI BƯỚC trong cùng lời giải.
  const flyRef = useRef<{ result: unknown; step: number }>({ result: null, step: -1 });

  // Trạng thái giải LẤY THEO BÀI (khoá = geometryKey) từ SolveJobsProvider — không còn nằm trong panel,
  // nên đổi bài rồi quay lại vẫn thấy đúng "đang giải" / "đã giải" của bài đó.
  const jobKey = geometryKey;
  const job = getJob(jobKey);
  const savedSolve = geometry?.solve?.result ?? null;
  const loading = job?.status === 'solving';
  const error = job?.status === 'error' ? (job.error ?? 'Lỗi không xác định') : null;
  const result = dismissed ? null : (job?.status === 'done' ? job.result : savedSolve);
  const isFresh = !dismissed && job?.status === 'done'; // kết quả GIẢI MỚI phiên này → cần lưu kèm hình

  // Pre-fill with last detected problem when geometry changes
  useEffect(() => {
    if (lastProblem && !result) {
      setProblem(lastProblem);
    }
  }, [lastProblem, result]);

  const geometryKeyRef = useRef('');

  // Đổi bài → reset trạng thái XEM cục bộ (bước, dismiss, reveal) và điền lại đề đã lưu.
  // Không đụng tới job trong SolveJobsProvider: job của bài kia vẫn chạy/giữ nguyên.
  useEffect(() => {
    if (geometryKeyRef.current === geometryKey) return;
    geometryKeyRef.current = geometryKey;
    setReveal(null);
    setCurrentStep(0);
    setDismissed(false);
    const savedProblem = geometry?.solve?.problem;
    if (savedProblem) setProblem(savedProblem);
  }, [geometry, geometryKey]);

  // Khi có KẾT QUẢ: (1) dựng điểm lời giải giới thiệu & ghép vào hình, (2) LƯU lời giải kèm hình
  // để tải lại không mất. Deps CHỈ [result] để không lặp khi commit làm đổi state.geometry.
  useEffect(() => {
    const base = ctx?.state.geometry;
    if (!result || !base) { setReveal(null); return; }

    const hasConstruct = result.steps.some(s => s.construct && s.construct.length > 0);
    let merged = base;
    if (hasConstruct) {
      const rv = buildSolveReveal(base, result.steps);
      setReveal(rv);
      if (rv.newPoints.length > 0) merged = rv.mergedGeometry;
    } else {
      setReveal(null);
    }

    // Trong phiên ADVANCE (thanh câu + lời giải từng câu): Solver phẳng KHÔNG được ghép điểm vào hình
    // hay ghi đè bản đã lưu. state.geometry lúc này là scene.base (KHÔNG kèm advanceScene) nên
    // loadGeometry/updateGeometryData bằng nó sẽ thay cảnh Advance bằng 1 hình phẳng ⇒ mất sạch
    // thanh câu + lời giải khi mở lại (và rớt stepper ngay giữa phiên). Vẫn cho hiện reveal tạm ở trên.
    if (ctx?.state.advanceScene) return;

    if (isFresh && job && claimSave(jobKey)) {
      // Kết quả GIẢI MỚI của ĐÚNG bài này -> ghép điểm + đính lời giải + LƯU theo id của job.
      // claimSave đảm bảo chỉ lưu 1 lần (dù có 2 panel desktop+mobile cùng chạy effect).
      const withSolve = { ...merged, solve: { problem: job.problem, result } };
      ctx!.loadGeometry(withSolve, { silent: true });
      if (job.id) void updateGeometryData(job.id, withSolve);
    } else if (!isFresh && merged !== base) {
      // Khôi phục bản đã lưu mà hình thiếu điểm dựng (hiếm) -> ghép tạm, KHÔNG lưu lại.
      ctx!.loadGeometry(merged, { silent: true });
    }
  }, [ctx, result, isFresh, job, jobKey, claimSave, updateGeometryData]);

  // Bóc-lớp + nhấn mạnh theo bước hiện tại. Đọc camera qua ref (KHÔNG để trong deps) nên effect chỉ
  // chạy khi thật sự đổi result/bước/reveal — không chạy lại mỗi khung khi xoay hình.
  useEffect(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    if (reveal && result) {
      const visible = reveal.stepVisibleIds[currentStep] ?? reveal.stepVisibleIds[reveal.stepVisibleIds.length - 1] ?? [];
      cam.setRevealVisibleIds(new Set(visible));
      const constructedNow = reveal.stepConstructIds[currentStep] ?? [];
      cam.setHighlightedIds(new Set([...(result.steps[currentStep]?.highlight ?? []), ...constructedNow]));
    } else if (result && result.steps[currentStep]) {
      cam.setHighlightedIds(new Set(result.steps[currentStep].highlight ?? []));
      cam.setRevealVisibleIds(null);
    } else {
      cam.setHighlightedIds(new Set());
      cam.setRevealVisibleIds(null);
    }

    // ── Bay camera tới phần tử của bước (bài ĐƠN, không chỉ Advance) ──
    // Chỉ bay khi ĐỔI BƯỚC trong CÙNG lời giải; đổi bài / lần đầu để CameraFitter
    // fit toàn hình cho khỏi giật.
    const prev = flyRef.current;
    if (prev.result === result && prev.step !== currentStep && reveal && result && cam.requestFocus) {
      const construct = reveal.stepConstructIds?.[currentStep] ?? [];
      const focusIds = construct.length ? construct : (result.steps[currentStep]?.highlight ?? []);
      const byId = new Map((reveal.mergedGeometry.points ?? []).map((p) => [p.id, p]));
      const pts = focusIds
        .map((id) => byId.get(id))
        .map((p) => ({ x: Number(p?.x), y: Number(p?.y), z: Number(p?.z) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));
      if (pts.length) cam.requestFocus(pts);
    }
    flyRef.current = { result, step: currentStep };

    return () => { const c = cameraRef.current; c?.setHighlightedIds(new Set()); c?.setRevealVisibleIds(null); };
  }, [result, currentStep, reveal]);

  const canSolve = !!geometry && problem.trim().length >= 10 && !loading;

  const handleSolve = () => {
    if (!canSolve || !geometry) return;
    releaseSave(jobKey);            // cho phép LƯU lại kết quả mới của bài này
    setDismissed(false);
    const id = new URLSearchParams(window.location.search).get('id');
    startJob(jobKey, { id, problem: problem.trim(), geometry, tags: geometry.tags || [] });
  };

  // useCallback + đọc camera qua ref ⇒ onReset ỔN ĐỊNH tham chiếu khi xoay hình, giúp SolveResultView (memo) khỏi render lại.
  const handleReset = useCallback(() => {
    clearJob(jobKey);              // xoá job của bài này → ẩn kết quả, cho nhập/giải lại
    setDismissed(true);
    setProblem(lastProblem);
    setReveal(null);
    // Giữ điểm đã dựng trong hình (người dùng chọn "giữ lại"); chỉ tắt lớp bóc theo bước.
    cameraRef.current?.setHighlightedIds(new Set());
    cameraRef.current?.setRevealVisibleIds(null);
  }, [clearJob, jobKey, lastProblem]);

  // ── No geometry yet ──────────────────────────────────────────────────────
  if (!geometry) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Nhập đề bài ở thanh bên dưới để vẽ hình, rồi nhấn <strong>Giải bài</strong>.
        </p>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Đang giải bài toán...</p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="w-8 h-8 text-destructive/60" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> Thử lại
        </Button>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (result) {
    return (
      <SolveResultView
        result={result}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        onReset={handleReset}
        problem={job?.problem ?? geometry?.solve?.problem ?? undefined}
        constructedByStep={reveal?.stepConstructIds}
        compact={compact}
      />
    );
  }

  // ── Input / Solve CTA ─────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-0">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-foreground">Giải bài toán</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nhập đề bài rồi nhấn nút để xem lời giải từng bước.
        </p>
      </div>

      {/* Problem input */}
      <div className="flex-1 px-4 py-3 flex flex-col gap-2 min-h-0">
        <Textarea
          ref={textareaRef}
          value={problem}
          onChange={e => setProblem(e.target.value)}
          placeholder="Dán đề bài vào đây..."
          className="flex-1 min-h-[120px] resize-none text-sm bg-secondary/30 border-border/50 focus-visible:ring-primary/50"
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed shrink-0">
          💡 Đề gõ bằng chữ sẽ tự điền sẵn ở đây. Nếu bạn <strong className="text-foreground/80">vẽ hình từ ảnh</strong>, hãy gõ hoặc dán lại đề (kèm <strong className="text-foreground/80">câu hỏi</strong>, vd: "Tính thể tích khối chóp") vào ô này rồi nhấn Giải.
        </p>
      </div>

      {/* Solve button */}
      <div className="px-4 py-3 border-t">
        <Button
          onClick={handleSolve}
          disabled={!canSolve}
          className="w-full gap-2 font-semibold"
          size="lg"
        >
          <Sparkles className="w-4 h-4" />
          Giải bài toán
        </Button>
        {!geometry && (
          <p className="text-xs text-muted-foreground text-center mt-1.5">
            Cần vẽ hình trước
          </p>
        )}
        {geometry && creditNote && (
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            {creditNote}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Thanh kéo giãn ────────────────────────────────────────────────────────────

/** Nắm kéo ở MÉP TRÁI của panel bên phải: kéo để chỉnh rộng, nhấn đúp để đặt lại. */
export function ResizeHandle({ onPointerDown, onReset, edge = 'left' }: { onPointerDown: (e: React.PointerEvent) => void; onReset?: () => void; edge?: 'left' | 'right' }) {
  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      title="Kéo để chỉnh rộng · nhấn đúp để đặt lại"
      className={cn(
        "group absolute top-0 h-full w-2.5 cursor-col-resize z-50 flex items-center justify-center touch-none",
        edge === 'right' ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
      )}
    >
      <div className="h-12 w-1 rounded-full bg-border/70 group-hover:bg-primary transition-colors" />
    </div>
  );
}

// ─── Desktop panel ────────────────────────────────────────────────────────────

export function SolverPanel() {
  const { onPointerDown, reset } = useResizableWidth({ cssVar: '--solver-w', storageKey: 'solver_panel_w', def: 320, min: 280, max: 720 });
  return (
    <aside
      style={{ width: 'var(--solver-w, 20rem)' }}
      className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 border-l border-border/50 bg-background/95 backdrop-blur-sm z-40"
    >
      <ResizeHandle onPointerDown={onPointerDown} onReset={reset} />
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Lời giải</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <SolverContent />
      </div>
    </aside>
  );
}

// ─── Mobile sheet ─────────────────────────────────────────────────────────────

export function MobileSolverPanel() {
  const [open, setOpen] = useState(false);
  const ctx = useGeometryOptional();
  const hasGeo = !!ctx?.state.geometry;

  if (!hasGeo) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-20 right-4 z-50 rounded-full gap-2 shadow-lg lg:hidden"
          size="sm"
        >
          <Sparkles className="w-4 h-4" />
          Giải bài
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] p-0 flex flex-col">
        <div className="px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Lời giải</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <SolverContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
