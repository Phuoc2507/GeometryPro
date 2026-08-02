/**
 * GeometryPropertiesTab — thân tab "Thuộc tính" dùng CHUNG cho panel Giáo viên (RightPanel)
 * và panel Học sinh (StudentRightPanel). Chỉ là phần nội dung cuộn bên trong <TabsContent>;
 * mỗi panel tự bọc trong TabsContent của mình. Tách ra để hai vỏ panel sửa độc lập nhưng
 * phần xem/sửa hình (chip tổng quan, số đo, độ dài cạnh, sửa toạ độ, JSON) không bị nhân đôi.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Box, MapPin, Ruler, Cuboid, Code, ChevronDown, Info, Pencil, Undo2, Redo2, Check, Copy, Globe } from 'lucide-react';
import type { Point3D } from '@/types/geometry';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGeometryOptional } from '@/context/GeometryContext';
import { computeProperties, fmt, isAnalysisFigure } from '@/lib/geometry/calculations';
import { getPrimarySphereCenter, recenterGeometry } from '@/lib/geometry/recenterGeometry';
import { projectScene } from '@/lib/advanceProject';
import { DynamicPointControls } from '@/components/DynamicPointControls';
import { cn } from '@/lib/utils';

// Bảng màu cho các NHÓM cạnh bằng nhau (chỉ tô khi nhóm ≥ 2 cạnh) — giúp nhìn ra cấu trúc hình.
const EQ_COLORS = [
  { dot: 'bg-blue-400',    ring: 'border-blue-400/40' },
  { dot: 'bg-green-400',   ring: 'border-green-400/40' },
  { dot: 'bg-amber-400',   ring: 'border-amber-400/40' },
  { dot: 'bg-fuchsia-400', ring: 'border-fuchsia-400/40' },
  { dot: 'bg-cyan-400',    ring: 'border-cyan-400/40' },
  { dot: 'bg-rose-400',    ring: 'border-rose-400/40' },
];

// Ô nhập MỘT toạ độ (x/y/z). Giữ state chuỗi cục bộ để gõ được dấu "-", ".", số dở dang;
// chỉ commit khi rời ô / Enter và giá trị hợp lệ. Khi điểm đổi từ ngoài (và ô không focus) thì đồng bộ lại.
// Ctrl/⌘+Z / Ctrl/⌘+Y (hoặc +Shift+Z) hoàn tác/làm lại NGAY trong ô — vì handler toàn cục bỏ qua khi đang gõ.
function CoordInput({ value, onCommit, onUndo, onRedo, label }: {
  value: number; onCommit: (n: number) => void; onUndo: () => void; onRedo: () => void; label: string;
}) {
  const [txt, setTxt] = useState(() => fmt(value));
  const focused = useRef(false);
  const skipCommit = useRef(false); // true → onBlur không commit (khi undo/redo/Escape)
  useEffect(() => { if (!focused.current) setTxt(fmt(value)); }, [value]);

  const commit = () => {
    if (skipCommit.current) { skipCommit.current = false; setTxt(fmt(value)); return; }
    const n = parseFloat(txt.replace(',', '.'));
    if (Number.isFinite(n)) { if (n !== value) onCommit(n); }
    else setTxt(fmt(value)); // nhập rác → khôi phục
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={txt}
      aria-label={label}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={() => { focused.current = false; commit(); }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'y' || e.key === 'Y')) {
          e.preventDefault();
          e.stopPropagation(); // đừng để handler toàn cục undo lần nữa
          const isRedo = e.key === 'y' || e.key === 'Y' || e.shiftKey;
          skipCommit.current = true;
          focused.current = false;                 // cho phép effect đồng bộ txt về giá trị mới sau undo
          (e.target as HTMLInputElement).blur();
          if (isRedo) onRedo(); else onUndo();
        } else if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          skipCommit.current = true;
          focused.current = false;
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-full min-w-0 text-center font-mono text-xs rounded-md bg-secondary/40 border border-border/40 px-1 py-1 text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/60 hover:border-border transition-colors"
    />
  );
}

// Một dòng đỉnh: nhãn + 3 ô nhập x/y/z. Sửa xong → updatePoint ⇒ các cạnh/điểm nối theo id tự đi theo.
function VertexRow({ point, onUpdate, onUndo, onRedo }: {
  point: Point3D;
  onUpdate: (id: string, x: number, y: number, z: number) => void;
  onUndo: () => void; onRedo: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-md bg-secondary/30">
      <span className="font-serif italic text-sm text-primary w-6 shrink-0 text-center">{point.label}</span>
      <div className="grid grid-cols-3 gap-1 flex-1 min-w-0">
        <CoordInput value={point.x} label={`Tọa độ x của ${point.label}`} onUndo={onUndo} onRedo={onRedo} onCommit={(n) => onUpdate(point.id, n, point.y, point.z)} />
        <CoordInput value={point.y} label={`Tọa độ y của ${point.label}`} onUndo={onUndo} onRedo={onRedo} onCommit={(n) => onUpdate(point.id, point.x, n, point.z)} />
        <CoordInput value={point.z} label={`Tọa độ z của ${point.label}`} onUndo={onUndo} onRedo={onRedo} onCommit={(n) => onUpdate(point.id, point.x, point.y, n)} />
      </div>
    </div>
  );
}

export function GeometryPropertiesTab() {
  const context = useGeometryOptional();
  const [copied, setCopied] = useState(false);
  const rawGeometry = context?.state.geometry ?? null;
  const advanceScene = context?.state.advanceScene ?? null;
  const currentStep = context?.state.currentStep ?? 0;

  // Ở Advance, hình = base + cờ hiển thị của BƯỚC hiện tại (projectScene) — giống canvas & LaTeX.
  // Base thô chứa điểm mẫu đường sinh ẩn (r_s*) không phải đỉnh hình; phải chiếu để đo/liệt kê
  // đúng phần đang thấy. Bài thường (advanceScene=null) giữ nguyên base.
  const geometry = useMemo(() => {
    if (!rawGeometry) return null;
    if (advanceScene && advanceScene.base && Array.isArray(advanceScene.steps)) {
      return projectScene(rawGeometry, advanceScene.steps, currentStep);
    }
    return rawGeometry;
  }, [rawGeometry, advanceScene, currentStep]);

  const properties = useMemo(() => (geometry ? computeProperties(geometry) : null), [geometry]);
  const analysisFig = useMemo(() => (geometry ? isAnalysisFigure(geometry) : false), [geometry]);

  // ─── Chế độ xem: DỜI GỐC TOẠ ĐỘ VỀ TÂM MẶT CẦU (chỉ hiện với bài có mặt cầu) ───
  // Bật ⇒ toạ độ mọi điểm được tính lại theo tâm cầu (tâm cầu thành O(0,0,0)); trục & lưới
  // đi qua tâm nên dễ nhìn. Đây là đổi gốc (tịnh tiến) — không sai hình học.
  const recenter = context?.state.recenterToSphere ?? false;
  const sphereCenter = useMemo(() => getPrimarySphereCenter(geometry), [geometry]);
  const hasSphere = !!sphereCenter;
  const displayGeometry = useMemo(
    () => (recenter && sphereCenter && geometry ? recenterGeometry(geometry, sphereCenter) : geometry),
    [geometry, recenter, sphereCenter],
  );
  // Bảng hiển thị toạ độ theo gốc MỚI; khi ghi phải cộng lại tâm cầu để lưu về gốc GỐC
  // (giữ khớp với lời giải/đề — vốn neo theo gốc gốc).
  const handleUpdatePoint = useCallback((id: string, x: number, y: number, z: number) => {
    if (!context) return;
    if (recenter && sphereCenter) {
      context.updatePoint(id, x + sphereCenter.x, y + sphereCenter.y, z + sphereCenter.z);
    } else {
      context.updatePoint(id, x, y, z);
    }
  }, [context, recenter, sphereCenter]);

  // Đỉnh/cạnh để ĐẾM & LIỆT KÊ: ở Advance chỉ lấy phần ĐANG HIỆN (bỏ điểm mẫu/khung dây ẩn);
  // bài thường giữ nguyên toàn bộ.
  const inAdvance = !!advanceScene;
  const listPoints = useMemo(
    () => (displayGeometry ? (inAdvance ? displayGeometry.points.filter(p => !p.hidden) : displayGeometry.points) : []),
    [displayGeometry, inAdvance],
  );
  const listLines = useMemo(
    () => (geometry ? (inAdvance ? geometry.lines.filter(l => !l.hidden) : geometry.lines) : []),
    [geometry, inAdvance],
  );

  // Gán màu cho các NHÓM cạnh bằng nhau: cạnh sắp theo độ dài, mỗi độ dài lặp lại ≥2 lần được 1 màu.
  const edgeView = useMemo(() => {
    if (!properties || properties.edgeLengths.length === 0) return null;
    const count = new Map<string, number>();
    for (const e of properties.edgeLengths) {
      const k = e.length.toFixed(3);
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    const multiKeys = [...count.entries()]
      .filter(([, c]) => c >= 2)
      .map(([k]) => k)
      .sort((a, b) => parseFloat(a) - parseFloat(b));
    const colorIdx = new Map<string, number>();
    multiKeys.forEach((k, i) => colorIdx.set(k, i % EQ_COLORS.length));
    const sorted = [...properties.edgeLengths]
      .map((e, i) => ({ ...e, key: e.length.toFixed(3), i }))
      .sort((a, b) => a.length - b.length || a.label.localeCompare(b.label));
    return sorted.map((e) => ({ ...e, color: colorIdx.has(e.key) ? EQ_COLORS[colorIdx.get(e.key)!] : null }));
  }, [properties]);

  // Số đo tính trên hình minh hoạ (tương đối) — chỉ hiện các mục có giá trị.
  const measures = useMemo(() => {
    if (!properties) return [];
    const out: { k: string; v: number }[] = [];
    if (properties.radius != null)           out.push({ k: 'Bán kính',       v: properties.radius });
    if (properties.volume != null)           out.push({ k: 'Thể tích',       v: properties.volume });
    if (properties.totalSurfaceArea != null) out.push({ k: 'S toàn phần',    v: properties.totalSurfaceArea });
    if (properties.baseArea != null)         out.push({ k: 'Diện tích đáy',  v: properties.baseArea });
    if (properties.height != null)           out.push({ k: 'Chiều cao',      v: properties.height });
    return out;
  }, [properties]);

  if (!context || !geometry) return null;

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-5 p-4">
        {/* ─── Tổng quan: loại hình + số đỉnh/cạnh ─── */}
        <div className="flex flex-wrap gap-1.5">
          {properties?.shapeType && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/12 text-primary border border-primary/25">
              <Box className="w-3 h-3" /> {properties.shapeType}
            </span>
          )}
          {/* Đỉnh/cạnh: ẩn với cảnh giải tích (tròn xoay/thiết diện/hình phẳng) — không có đỉnh hình học. */}
          {!analysisFig && (
            <>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/50">
                {listPoints.length} đỉnh
              </span>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/50">
                {listLines.length} cạnh
              </span>
            </>
          )}
        </div>

        {/* ─── Dynamic Point Sliders ─── */}
        {geometry.dynamicPoints && geometry.dynamicPoints.length > 0 && context.updateDynamicPoint && (
          <DynamicPointControls
            geometry={geometry}
            onUpdateDynamicPoint={context.updateDynamicPoint}
          />
        )}

        {/* ─── Ghi chú mục đích: số đo tương đối, đáp số ở Giải bài ─── */}
        {measures.length > 0 && (
          <div className="flex gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11.5px] leading-relaxed text-amber-600/90 dark:text-amber-300/90">
              Số đo dưới đây tính trên <strong>hình minh hoạ</strong> (tỉ lệ tương đối để vẽ).
              Đáp số chính xác theo đề xem ở tab <strong>Giải bài</strong>.
            </p>
          </div>
        )}

        {/* ─── Số đo mô hình ─── */}
        {measures.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Cuboid className="w-3 h-3" /> Số đo mô hình
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {measures.map((m) => (
                <div key={m.k} className="px-3 py-2 rounded-xl bg-card border border-border/60">
                  <div className="text-[10.5px] text-muted-foreground">{m.k}</div>
                  <div className="text-base font-serif text-foreground mt-0.5 tabular-nums">{fmt(m.v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Độ dài cạnh (gom nhóm cạnh bằng nhau bằng màu) ─── */}
        {edgeView && edgeView.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Ruler className="w-3 h-3" /> Độ dài cạnh
              <span className="font-medium normal-case tracking-normal text-muted-foreground/70">· cùng màu = bằng nhau</span>
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {edgeView.map((e) => (
                <div key={e.i} className={cn('flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card border text-xs', e.color ? e.color.ring : 'border-border/50')}>
                  <span className="flex items-center gap-1.5 font-serif italic text-foreground">
                    {e.color && <span className={cn('w-1.5 h-1.5 rounded-full', e.color.dot)} />}
                    {e.label}
                  </span>
                  <span className="font-serif text-muted-foreground tabular-nums">{fmt(e.length)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Tọa độ đỉnh — SỬA ĐƯỢC TRỰC TIẾP ─── */}
        {/* Ẩn cả khối khi không có đỉnh nào để hiện (cảnh giải tích: chỉ đường sinh/khối, không đỉnh). */}
        {listPoints.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Tọa độ đỉnh
            </h3>
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Hoàn tác" title="Hoàn tác (Ctrl+Z)"
                disabled={!context.canUndo} onClick={() => context.undo()}>
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Làm lại" title="Làm lại (Ctrl+Y)"
                disabled={!context.canRedo} onClick={() => context.redo()}>
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mb-2 flex items-center gap-1">
            <Pencil className="w-2.5 h-2.5" /> Sửa số (x, y, z) rồi Enter — cạnh nối theo đỉnh tự đi theo, thay đổi được tự động lưu.
          </p>

          {/* Công tắc: DỜI GỐC VỀ TÂM MẶT CẦU — chỉ hiện khi hình có mặt cầu. */}
          {hasSphere && (
            <div className="flex items-start gap-2 mb-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
              <Globe className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <label className="flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-[11.5px] font-medium text-foreground">Dời trục toạ độ về tâm hình cầu</span>
                  <Switch
                    checked={recenter}
                    onCheckedChange={() => context.toggleRecenterToSphere()}
                    aria-label="Dời trục toạ độ về tâm hình cầu"
                  />
                </label>
                <p className="text-[10.5px] text-muted-foreground/80 mt-0.5 leading-snug">
                  {recenter
                    ? 'Đang lấy tâm cầu làm gốc O(0,0,0) — toạ độ bên dưới đã tính lại theo gốc mới.'
                    : 'Đặt tâm mặt cầu về gốc O(0,0,0); toạ độ mọi điểm được tính lại theo gốc mới.'}
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1 px-1.5 mb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider ml-8">
            <span className="text-center">x</span><span className="text-center">y</span><span className="text-center">z</span>
          </div>
          <div className="space-y-1">
            {listPoints.map((point) => (
              <VertexRow key={point.id} point={point} onUpdate={handleUpdatePoint} onUndo={context.undo} onRedo={context.redo} />
            ))}
          </div>
        </div>
        )}

        {/* Nâng cao — JSON + Prompt (dev/debug, thu gọn) */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors [&[data-state=open]>svg:first-child]:rotate-180">
            <ChevronDown className="w-4 h-4 transition-transform" />
            <Code className="w-3 h-3" />
            Nâng cao (JSON · Prompt)
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4">
            {/* Raw JSON */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Raw Geometry JSON</span>
                <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5" onClick={() => {
                  const { latexCode, ...rest } = geometry;
                  navigator.clipboard.writeText(JSON.stringify(rest, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}>
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">JSON</span>
                </Button>
              </div>
              <div className="bg-secondary/20 rounded-md border border-border/30 max-h-48 overflow-auto">
                <pre className="p-2 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {(() => {
                    const { latexCode, ...rest } = geometry;
                    return JSON.stringify(rest, null, 2);
                  })()}
                </pre>
              </div>
            </div>
            {/* Prompt đã gửi */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Đề đã gửi (Prompt)</span>
              <div className="mt-1.5 bg-secondary/20 rounded-md border border-border/30 max-h-48 overflow-auto">
                <pre className="p-2 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words">
                  {geometry.llmPrompt || 'No prompt available.'}
                </pre>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}
