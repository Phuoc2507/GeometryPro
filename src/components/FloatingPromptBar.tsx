import { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, Send, Loader2, HelpCircle, Waypoints, GitCommitVertical, Triangle, PencilLine, Eraser, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useAuth } from '@/context/AuthContext';
import { cn, formatCredits } from '@/lib/utils';

const AI_MODE_KEY = 'geo3d_ai_modify_mode';

// Bỏ dấu + thường hoá để so khớp không phân biệt dấu.
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// "Hàm" cú pháp cho chế độ local (gợi ý kiểu công thức Excel).
interface CmdDef {
  key: string;
  label: string;
  icon: React.ElementType;
  syntax: string;
  desc: string;
  build: (p: string[]) => string;
}
const COMMANDS: CmdDef[] = [
  { key: 'noi', label: 'Nối 2 điểm', icon: Waypoints, syntax: 'nối A và B', desc: 'Vẽ đoạn thẳng nối 2 điểm',
    build: (p) => `nối ${p[0] ?? 'A'} và ${p[1] ?? 'B'}` },
  { key: 'trung diem', label: 'Trung điểm', icon: GitCommitVertical, syntax: 'trung điểm AB', desc: 'Điểm giữa của một đoạn',
    build: (p) => `trung điểm ${p[0] ?? 'A'}${p[1] ?? 'B'}` },
  { key: 'trong tam', label: 'Trọng tâm', icon: Triangle, syntax: 'trọng tâm ABC', desc: 'Trọng tâm tam giác',
    build: (p) => `trọng tâm ${p[0] ?? 'A'}${p[1] ?? 'B'}${p[2] ?? 'C'}` },
  { key: 'doi ten', label: 'Đổi tên điểm', icon: PencilLine, syntax: 'đổi tên A thành M', desc: 'Đổi nhãn một điểm',
    build: (p) => `đổi tên ${p[0] ?? 'A'} thành M` },
  { key: 'xoa diem', label: 'Xóa điểm', icon: Eraser, syntax: 'xóa điểm A', desc: 'Xóa 1 điểm và đường liên quan',
    build: (p) => `xóa điểm ${p[0] ?? 'A'}` },
  { key: 'xoa duong', label: 'Xóa đường', icon: Scissors, syntax: 'xóa đường AB', desc: 'Xóa đoạn nối 2 điểm',
    build: (p) => `xóa đường ${p[0] ?? 'A'}${p[1] ?? 'B'}` },
];

export function FloatingPromptBar() {
  const context = useGeometryOptional();
  const { credits, tier } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [highlighted, setHighlighted] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Nạp lựa chọn "Sửa bằng AI" đã lưu.
  useEffect(() => {
    try { setAiMode(localStorage.getItem(AI_MODE_KEY) === '1'); } catch { /* ignore */ }
  }, []);
  const toggleAiMode = (v: boolean) => {
    setAiMode(v);
    try { localStorage.setItem(AI_MODE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  const placeholders = aiMode
    ? [
        'Vẽ đường cao từ S xuống mặt đáy...',
        'Hình chiếu của A lên mặt phẳng (SBC)...',
        'Giao điểm của AC và BD...',
        'Vẽ mặt cầu ngoại tiếp chóp...',
      ]
    : [
        'Gõ lệnh: trung điểm AB, nối A và B...',
        'trọng tâm ABC...',
        'xóa điểm D...',
      ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [prompt]);

  const pointLabels = useMemo(() => {
    const pts = context?.state.geometry?.points ?? [];
    return pts.filter((p) => p.label && !p.hidden).map((p) => p.label);
  }, [context?.state.geometry]);

  // Lọc lệnh theo chữ đang gõ (chế độ local).
  const filtered = useMemo(() => {
    const q = norm(prompt.trim());
    if (!q) return COMMANDS;
    return COMMANDS.filter((c) => norm(c.label).includes(q) || norm(c.syntax).includes(q) || c.key.includes(q));
  }, [prompt]);

  const showMenu = !aiMode && isFocused && !menuDismissed && filtered.length > 0;

  useEffect(() => { setHighlighted(0); }, [prompt, aiMode]);

  // Guard against rendering outside provider
  if (!context) return null;
  const { state, modifyGeometry } = context;
  if (!state.geometry || state.isBuilding) return null;

  const pickCommand = (cmd: CmdDef) => {
    setPrompt(cmd.build(pointLabels));
    setMenuDismissed(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const insertPoint = (label: string) => {
    setPrompt((prev) => (prev.length && !prev.endsWith(' ') ? prev + ' ' : prev) + label);
    textareaRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;

    // Cho phép dán JSON hình học để nạp nhanh.
    try {
      const parsed = JSON.parse(prompt.trim());
      if (parsed && typeof parsed === 'object') {
        const geo = parsed.geometry || parsed;
        if (geo.points && Array.isArray(geo.points)) {
          context.loadGeometry({ ...geo, name: geo.name || 'Imported JSON' });
          setPrompt('');
          return;
        }
      }
    } catch { /* không phải JSON -> xử lý bình thường */ }

    setIsLoading(true);
    try {
      await modifyGeometry(prompt, { aiMode });
      setPrompt('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMenu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMenuDismissed(true); return; }
      if (e.key === 'Enter' && !e.shiftKey && filtered[highlighted]) {
        e.preventDefault();
        pickCommand(filtered[highlighted]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-xl animate-fade-in">
      <div
        className={cn(
          'relative glass rounded-2xl p-1.5 border transition-all duration-300',
          isFocused ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/50'
        )}
      >
        {/* Mini progress bar when loading */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary/30 rounded-t-2xl overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-progress-indeterminate" />
          </div>
        )}

        {/* ── Gợi ý cú pháp kiểu Excel (chế độ local) — nổi phía TRÊN thanh ── */}
        {showMenu && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 glass rounded-xl border border-border/50 shadow-xl overflow-hidden"
            onMouseDown={(e) => e.preventDefault()} // giữ focus khi bấm
          >
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/30">
              Lệnh chỉnh sửa · gõ hoặc bấm để chèn cú pháp
            </div>
            <div className="max-h-56 overflow-y-auto scrollbar-hide py-1">
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.key}
                    onClick={() => pickCommand(cmd)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                      i === highlighted ? 'bg-primary/15' : 'hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-primary/80" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground flex items-center gap-2">
                        {cmd.label}
                        <code className="text-[10px] text-primary bg-primary/10 rounded px-1 py-px">{cmd.syntax}</code>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{cmd.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Chip điểm để chèn nhanh tên điểm */}
            {pointLabels.length > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 border-t border-border/30 overflow-x-auto scrollbar-hide">
                <span className="text-[10px] text-muted-foreground shrink-0 mr-0.5">Điểm:</span>
                {pointLabels.map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => insertPoint(lbl)}
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-secondary/60 hover:bg-secondary text-secondary-foreground shrink-0"
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* AI Icon */}
          <div className={cn('p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-colors self-end mb-0.5', isLoading ? 'bg-primary/20' : 'bg-primary/10')}>
            {isLoading ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
          </div>

          {/* Textarea Field */}
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setMenuDismissed(false); }}
            onKeyDown={handleKeyDown}
            onFocus={() => { setIsFocused(true); setMenuDismissed(false); }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholders[placeholderIndex % placeholders.length]}
            disabled={isLoading}
            rows={1}
            className={cn(
              'flex-1 bg-transparent border-0 outline-none text-sm resize-none',
              'placeholder:text-muted-foreground/60 text-foreground min-w-0',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[36px] py-2'
            )}
          />

          {/* Send Button */}
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading}
            className={cn(
              'rounded-xl h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all self-end mb-0.5',
              prompt.trim() && !isLoading ? 'bg-primary hover:bg-primary/90 scale-100' : 'bg-muted scale-95 opacity-50'
            )}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>

        {/* Loading status text */}
        {isLoading && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <span className="text-xs text-muted-foreground animate-pulse">
              {aiMode ? 'AI đang tính toán tọa độ...' : 'Đang xử lý lệnh...'}
            </span>
          </div>
        )}

        {/* ── Hàng nút gạt "Sửa bằng AI" ── */}
        {!isLoading && (
          <div className="flex items-center justify-between mt-1.5 px-1.5 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Switch checked={aiMode} onCheckedChange={toggleAiMode} className="scale-90" />
              <span className={cn('text-xs font-medium', aiMode ? 'text-primary' : 'text-muted-foreground')}>Sửa bằng AI</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/70 hover:text-foreground" aria-label="Giải thích Sửa bằng AI">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                  Sửa bằng AI, cứ chat mà không cần rõ cú pháp. Lưu ý tốn 0,2 credit cho 1 lần gửi.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
              {aiMode
                ? (tier === 'free' ? 'Cần gói trả phí' : `0,2 credit/lần · còn ${formatCredits(credits)}`)
                : 'Miễn phí · lệnh cú pháp'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
