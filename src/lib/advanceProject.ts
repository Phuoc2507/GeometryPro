import type { AdvanceStep, GeometryData } from '@/types/geometry';

// Sinh hình dẫn xuất: base + cờ hidden/dim/highlight cho từng phần tử theo câu hiện tại.
// hidden = id ∉ visible; highlight = id ∈ (visible[cur] \ visible[cur-1]); dim = còn lại trong visible.
export function projectScene(base: GeometryData, steps: AdvanceStep[], cur: number): GeometryData {
  const c = Math.max(0, Math.min(cur, steps.length - 1));
  const visible = new Set(steps[c]?.visibleIds || []);
  const prev = new Set(c > 0 ? steps[c - 1]?.visibleIds || [] : []);
  const flag = <T extends { id: string }>(el: T) => {
    const shown = visible.has(el.id);
    return { ...el, hidden: !shown, dim: shown && prev.has(el.id), highlight: shown && !prev.has(el.id) };
  };
  return {
    ...base, // GIỮ timeline/agents/latexCode… nguyên (đừng cắt)
    points: (base.points || []).map(flag),
    lines: (base.lines || []).map(flag),
    planes: (base.planes || []).map(flag as any),
  };
}
