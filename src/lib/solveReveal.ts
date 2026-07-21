/**
 * solveReveal — dựng dần các điểm mà LỜI GIẢI giới thiệu, đồng bộ với hình đang vẽ.
 *
 * Ý tưởng: LLM giải bài chỉ khai "LUẬT DỰNG" mỗi bước (vd N = trung điểm SA,
 * F = giao điểm DN với mp(SBC)) — KHÔNG tự cho toạ độ (dễ lệch với hình đã vẽ).
 * File này tính toạ độ điểm mới TỪ CHÍNH hình đang hiển thị → luôn khớp, không lệch.
 *
 * Các phép dựng hỗ trợ: midpoint, centroid, section (chia đoạn theo tỉ lệ),
 * foot_line / foot_plane (chân đường vuông góc), intersect_line_plane,
 * intersect_line_line. Phép nào không giải được (song song, thiếu điểm...) → BỎ QUA
 * điểm đó (bước vẫn hiển thị bình thường), không bao giờ chèn toạ độ sai.
 */
import type { GeometryData, Point3D, Line3D } from '@/types/geometry';

// ─── Vec3 ─────────────────────────────────────────────────────────────────────
type V3 = { x: number; y: number; z: number };

const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const dot = (a: V3, b: V3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const len2 = (a: V3): number => dot(a, a);
const EPS = 1e-9;

const round4 = (v: V3): V3 => ({
  x: Math.round(v.x * 1e4) / 1e4,
  y: Math.round(v.y * 1e4) / 1e4,
  z: Math.round(v.z * 1e4) / 1e4,
});

// ─── Luật dựng (LLM khai; frontend tính toạ độ) ─────────────────────────────────
export type ConstructRule =
  | { type: 'midpoint'; of: [string, string] }
  | { type: 'centroid'; of: string[] }
  // P chia đoạn seg[0]->seg[1] sao cho (seg[0]P):(Pseg[1]) = ratio[0]:ratio[1]
  | { type: 'section'; seg: [string, string]; ratio: [number, number] }
  // chân đường vuông góc hạ từ `from` xuống đường thẳng qua line[0],line[1]
  | { type: 'foot_line'; from: string; line: [string, string] }
  // chân đường vuông góc hạ từ `from` xuống mặt phẳng qua plane[0..2]
  | { type: 'foot_plane'; from: string; plane: [string, string, string] }
  // giao của đường thẳng (line[0],line[1]) với mặt phẳng (plane[0..2])
  | { type: 'intersect_line_plane'; line: [string, string]; plane: [string, string, string] }
  // giao của hai đường thẳng (nếu đồng phẳng và cắt nhau)
  | { type: 'intersect_line_line'; line1: [string, string]; line2: [string, string] };

export interface ConstructSpec {
  id: string;
  label?: string;
  rule: ConstructRule;
}

// ─── Phép dựng hình học ─────────────────────────────────────────────────────────

function midpoint(a: V3, b: V3): V3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

function centroid(pts: V3[]): V3 | null {
  if (pts.length < 2) return null;
  const s = pts.reduce((acc, p) => add(acc, p), { x: 0, y: 0, z: 0 });
  return scale(s, 1 / pts.length);
}

// P sao cho A->P : P->B = m:n  ⇒ P = A + m/(m+n)·(B−A)
function section(a: V3, b: V3, m: number, n: number): V3 | null {
  const t = m + n;
  if (Math.abs(t) < EPS) return null;
  return add(a, scale(sub(b, a), m / t));
}

// Chân vuông góc từ P xuống đường thẳng qua L0,L1.
function footOnLine(p: V3, l0: V3, l1: V3): V3 | null {
  const d = sub(l1, l0);
  const dd = len2(d);
  if (dd < EPS) return null;
  const t = dot(sub(p, l0), d) / dd;
  return add(l0, scale(d, t));
}

// Pháp tuyến mặt phẳng qua 3 điểm (null nếu suy biến/thẳng hàng).
function planeNormal(p0: V3, p1: V3, p2: V3): V3 | null {
  const n = cross(sub(p1, p0), sub(p2, p0));
  if (len2(n) < EPS) return null;
  return n;
}

// Chân vuông góc từ P xuống mặt phẳng qua 3 điểm.
function footOnPlane(p: V3, p0: V3, p1: V3, p2: V3): V3 | null {
  const n = planeNormal(p0, p1, p2);
  if (!n) return null;
  const t = dot(sub(p0, p), n) / len2(n);
  return add(p, scale(n, t));
}

// Giao đường thẳng (A,B) với mặt phẳng qua 3 điểm. null nếu song song/nằm trong mp.
function intersectLinePlane(a: V3, b: V3, p0: V3, p1: V3, p2: V3): V3 | null {
  const n = planeNormal(p0, p1, p2);
  if (!n) return null;
  const dir = sub(b, a);
  const denom = dot(n, dir);
  if (Math.abs(denom) < EPS) return null; // đường song song mặt phẳng
  const t = dot(n, sub(p0, a)) / denom;
  return add(a, scale(dir, t));
}

// Giao hai đường thẳng (A1,A2) và (B1,B2) trong 3D — chỉ trả khi thực sự cắt (đồng phẳng, không song song).
function intersectLineLine(a1: V3, a2: V3, b1: V3, b2: V3): V3 | null {
  const da = sub(a2, a1);
  const db = sub(b2, b1);
  const dc = sub(b1, a1);
  const cab = cross(da, db);
  const denom = len2(cab);
  if (denom < EPS) return null; // song song hoặc trùng
  // Đồng phẳng? (dc phải nằm trong mp của da,db)
  if (Math.abs(dot(dc, cab)) > 1e-6) return null; // chéo nhau, không cắt
  const t = dot(cross(dc, db), cab) / denom;
  return add(a1, scale(da, t));
}

// ─── Phân giải tên điểm → toạ độ ────────────────────────────────────────────────

// Map linh hoạt: id chính xác, id không phân biệt hoa/thường, hoặc label.
function makeResolver(map: Map<string, V3>, labelToId: Map<string, string>) {
  return (token: string): V3 | null => {
    if (!token || typeof token !== 'string') return null;
    const t = token.trim();
    if (map.has(t)) return map.get(t)!;
    const lower = t.toLowerCase();
    if (map.has(lower)) return map.get(lower)!;
    const viaLabel = labelToId.get(t) || labelToId.get(lower);
    if (viaLabel && map.has(viaLabel)) return map.get(viaLabel)!;
    return null;
  };
}

// ─── Kết quả ────────────────────────────────────────────────────────────────────
export interface SolveReveal {
  /** Hình gốc + các điểm dựng thêm (đủ toạ độ). */
  mergedGeometry: GeometryData;
  /** Các điểm mới được dựng (để commit/giữ vào hình). */
  newPoints: Point3D[];
  /** id các điểm dựng ở đúng từng bước (không cộng dồn). */
  stepConstructIds: string[][];
  /** id nhìn thấy CỘNG DỒN tới từng bước = mọi id gốc ∪ điểm dựng của bước 0..i. */
  stepVisibleIds: string[][];
}

interface StepLike { construct?: ConstructSpec[] | null }

/**
 * Dựng toạ độ cho mọi điểm mà các bước giới thiệu, tính từ toạ độ hình gốc.
 * @param base   hình đang vẽ (nguồn toạ độ chuẩn).
 * @param steps  các bước lời giải; mỗi bước có thể có `construct: ConstructSpec[]`.
 */
export function buildSolveReveal(base: GeometryData, steps: StepLike[]): SolveReveal {
  const map = new Map<string, V3>();
  const labelToId = new Map<string, string>();
  for (const p of base.points || []) {
    map.set(p.id, { x: p.x, y: p.y, z: p.z });
    map.set(p.id.toLowerCase(), { x: p.x, y: p.y, z: p.z });
    if (p.label) {
      labelToId.set(p.label, p.id);
      labelToId.set(p.label.toLowerCase(), p.id);
    }
  }
  const resolve = makeResolver(map, labelToId);

  const baseIds = (base.points || []).map(p => p.id);
  const existingIds = new Set(baseIds);
  const newPoints: Point3D[] = [];
  const stepConstructIds: string[][] = [];

  const computeRule = (rule: ConstructRule): V3 | null => {
    try {
      switch (rule.type) {
        case 'midpoint': {
          const a = resolve(rule.of?.[0]); const b = resolve(rule.of?.[1]);
          return a && b ? midpoint(a, b) : null;
        }
        case 'centroid': {
          const pts = (rule.of || []).map(resolve);
          if (pts.some(p => !p)) return null;
          return centroid(pts as V3[]);
        }
        case 'section': {
          const a = resolve(rule.seg?.[0]); const b = resolve(rule.seg?.[1]);
          const [m, n] = rule.ratio || [];
          if (!a || !b || !Number.isFinite(m) || !Number.isFinite(n)) return null;
          return section(a, b, m, n);
        }
        case 'foot_line': {
          const p = resolve(rule.from); const l0 = resolve(rule.line?.[0]); const l1 = resolve(rule.line?.[1]);
          return p && l0 && l1 ? footOnLine(p, l0, l1) : null;
        }
        case 'foot_plane': {
          const p = resolve(rule.from);
          const [q0, q1, q2] = (rule.plane || []).map(resolve);
          return p && q0 && q1 && q2 ? footOnPlane(p, q0, q1, q2) : null;
        }
        case 'intersect_line_plane': {
          const a = resolve(rule.line?.[0]); const b = resolve(rule.line?.[1]);
          const [q0, q1, q2] = (rule.plane || []).map(resolve);
          return a && b && q0 && q1 && q2 ? intersectLinePlane(a, b, q0, q1, q2) : null;
        }
        case 'intersect_line_line': {
          const a1 = resolve(rule.line1?.[0]); const a2 = resolve(rule.line1?.[1]);
          const b1 = resolve(rule.line2?.[0]); const b2 = resolve(rule.line2?.[1]);
          return a1 && a2 && b1 && b2 ? intersectLineLine(a1, a2, b1, b2) : null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  // Tìm điểm sẵn có gần trùng (tránh dựng đôi 1 điểm) — mirror 0.001 của localCommands.
  const nearExistingId = (v: V3): string | null => {
    for (const [id, q] of map.entries()) {
      if (id !== id.toLowerCase() && Math.abs(q.x - v.x) < 1e-3 && Math.abs(q.y - v.y) < 1e-3 && Math.abs(q.z - v.z) < 1e-3) {
        return id; // dùng nhánh id gốc (không phải bản lowercase)
      }
    }
    return null;
  };

  const usedIds = new Set(baseIds);

  for (const step of steps) {
    const constructedThisStep: string[] = [];
    for (const spec of (step.construct || [])) {
      if (!spec || typeof spec.id !== 'string' || !spec.rule) continue;
      const coord = computeRule(spec.rule);
      if (!coord) continue; // không giải được → bỏ qua, không chèn toạ độ sai
      const rounded = round4(coord);

      // Trùng điểm đã có → chỉ tham chiếu để hiện, không thêm điểm mới.
      const dup = nearExistingId(rounded);
      if (dup) {
        constructedThisStep.push(dup);
        continue;
      }

      // id duy nhất (nếu LLM đặt trùng id gốc thì thêm hậu tố).
      let id = spec.id;
      if (usedIds.has(id)) id = `${spec.id}_c${newPoints.length + 1}`;
      usedIds.add(id);

      const point: Point3D = {
        id,
        label: (spec.label || spec.id || id).slice(0, 6),
        x: rounded.x, y: rounded.y, z: rounded.z,
      };
      newPoints.push(point);
      map.set(id, rounded);
      map.set(id.toLowerCase(), rounded);
      if (point.label) { labelToId.set(point.label, id); labelToId.set(point.label.toLowerCase(), id); }
      constructedThisStep.push(id);
    }
    stepConstructIds.push(constructedThisStep);
  }

  // Toàn bộ id gốc luôn nhìn thấy từ bước 0; điểm dựng cộng dồn theo bước.
  const stepVisibleIds: string[][] = [];
  const cumulative = new Set<string>(baseIds);
  const baseLineIds = (base.lines || []).map(l => l.id);
  baseLineIds.forEach(id => cumulative.add(id));
  for (const ids of stepConstructIds) {
    ids.forEach(id => cumulative.add(id));
    stepVisibleIds.push([...cumulative]);
  }
  if (stepVisibleIds.length === 0) {
    stepVisibleIds.push([...cumulative]);
  }

  const mergedGeometry: GeometryData = {
    ...base,
    points: [...(base.points || []), ...newPoints],
    lines: [...(base.lines || [])] as Line3D[],
  };

  return { mergedGeometry, newPoints, stepConstructIds, stepVisibleIds };
}
