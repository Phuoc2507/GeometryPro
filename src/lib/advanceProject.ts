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
    planes: (base.planes || []).map(flag),
    // Bóc-lớp cho phần tử ngoài điểm/đường/mặt: mỗi phần tử đều có id.
    // Chỉ map mảng nào TỒN TẠI trên base (giữ undefined nếu base không có).
    spheres: (base.spheres || []).map(flag),
    circles: (base.circles || []).map(flag),
    cylinders: (base.cylinders || []).map(flag),
    cones: (base.cones || []).map(flag),
    curves: (base.curves || []).map(flag),
    revolutionSolids: (base.revolutionSolids || []).map(flag),
    sliceStacks: (base.sliceStacks || []).map(flag),
    areaRegions: (base.areaRegions || []).map(flag),
    sectionCuts: (base.sectionCuts || []).map(flag),
  };
}
