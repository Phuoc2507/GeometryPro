// api/_lib/kernel/analysis/vessel.ts
// Vật thể tròn xoay GHÉP KHÚC ("vessel": bình/lu/chậu/phễu/cốc), cho bằng SỐ ĐO trên thiết diện qua
// trục — KHÔNG phải hàm r(x). Biên dạng = danh sách khúc {cylinder | frustum | sphereZone}.
//
// CHÍNH XÁC NHẤT: thể tích tính HAI CÁCH độc lập rồi ĐỐI CHIẾU:
//   1) Công thức ĐÓNG cho từng khúc (trụ / nón cụt / đới cầu) — cộng lại (đây là đáp số chính, đúng tuyệt đối).
//   2) Tích phân SỐ π∫r(x)²dx trên toàn biên dạng (revolutionVolumeDisk, tái dùng bộ Simpson tự-kiểm).
// verified = danh sách khúc HỢP LỆ (không hở/chồng/vượt cầu) VÀ hai cách khớp nhau trong dung sai.
// Nếu lệch ⇒ mô hình bị dựng sai (khúc đặt nhầm, tham số cầu vô lý) ⇒ verified=false, KHÔNG bịa đáp.
//
// Renderer KHÔNG cần đổi: buildVesselSolid trả RevolutionSolid kèm `samples` (đường sinh) để lathe.
import type { ProfileFn, RevolutionSolid, VesselSegment, Verified } from '../../../../src/types/geometry';
import { revolutionVolumeDisk } from './revolution';

// Thể tích ĐÓNG (chính xác) của một khúc quay quanh trục.
export function vesselSegmentVolume(s: VesselSegment): number {
  const h = s.x1 - s.x0;
  switch (s.type) {
    // Trụ: V = π r² h.
    case 'cylinder': return Math.PI * s.r * s.r * h;
    // Nón cụt: V = π h/3 (r0² + r0 r1 + r1²).
    case 'frustum': return (Math.PI * h / 3) * (s.r0 * s.r0 + s.r0 * s.r1 + s.r1 * s.r1);
    // Đới/chỏm cầu: V = π ∫_{x0}^{x1} (R² − (x−c)²) dx = π [ R²·h − ((x1−c)³ − (x0−c)³)/3 ].
    case 'sphereZone': {
      const u1 = s.x1 - s.c;
      const u0 = s.x0 - s.c;
      return Math.PI * (s.R * s.R * h - (u1 * u1 * u1 - u0 * u0 * u0) / 3);
    }
  }
}

// Bán kính của một khúc tại toạ độ trục x (dùng để lấy mẫu đường sinh).
export function vesselSegmentRadius(s: VesselSegment, x: number): number {
  if (s.type === 'cylinder') return Math.max(0, s.r);
  if (s.type === 'frustum') {
    const w = s.x1 - s.x0;
    const t = w === 0 ? 0 : (x - s.x0) / w;
    return Math.max(0, s.r0 + (s.r1 - s.r0) * t);
  }
  const d = s.R * s.R - (x - s.c) * (x - s.c);
  return d > 0 ? Math.sqrt(d) : 0;
}

// Kiểm danh sách khúc có DỰNG ĐƯỢC một vật thể liền mạch không (chống mô hình vô lý từ LLM).
export function validateVesselSegments(segs: VesselSegment[]): { ok: boolean; reason?: string } {
  if (!Array.isArray(segs) || segs.length === 0) return { ok: false, reason: 'không có khúc nào' };
  const EPS = 1e-6;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!Number.isFinite(s.x0) || !Number.isFinite(s.x1)) return { ok: false, reason: `khúc ${i}: toạ độ trục không hợp lệ` };
    if (s.x1 - s.x0 <= EPS) return { ok: false, reason: `khúc ${i}: x1 phải lớn hơn x0` };
    if (s.type === 'cylinder') {
      if (!(s.r >= 0)) return { ok: false, reason: `khúc ${i}: bán kính âm` };
    } else if (s.type === 'frustum') {
      if (!(s.r0 >= 0) || !(s.r1 >= 0)) return { ok: false, reason: `khúc ${i}: bán kính âm` };
    } else {
      // sphereZone: R>0 và [x0,x1] phải nằm trong [c−R, c+R] (nếu không, r² âm ⇒ vô nghĩa).
      if (!(s.R > 0)) return { ok: false, reason: `khúc ${i}: bán kính cầu R phải > 0` };
      if (Math.abs(s.x0 - s.c) > s.R + EPS || Math.abs(s.x1 - s.c) > s.R + EPS) {
        return { ok: false, reason: `khúc ${i}: đoạn [x0,x1] vượt ra ngoài mặt cầu` };
      }
    }
    // Liền mạch: đầu khúc sau phải trùng cuối khúc trước (cho phép BẬC bán kính, không cho HỞ/CHỒNG trục).
    if (i > 0 && Math.abs(segs[i - 1].x1 - s.x0) > 1e-4) {
      return { ok: false, reason: `khúc ${i}: không tiếp giáp khúc trước (hở/chồng dọc trục)` };
    }
  }
  return { ok: true };
}

export function vesselProfile(segs: VesselSegment[]): ProfileFn {
  return { kind: 'piecewise', segments: segs };
}

// Mẫu đường sinh cho LatheGeometry: khúc thẳng (trụ/nón cụt) chỉ cần 2 đầu; khúc cầu lấy dày để cong mượt.
// Bao gồm cả điểm biên ⇒ bậc bán kính (vai phẳng) hiện đúng thành mặt vành khăn khi lathe.
export function sampleVesselProfile(segs: VesselSegment[]): { x: number; r: number }[] {
  const out: { x: number; r: number }[] = [];
  for (const s of segs) {
    const n = s.type === 'sphereZone' ? 24 : 1;
    for (let i = 0; i <= n; i++) {
      const x = s.x0 + ((s.x1 - s.x0) * i) / n;
      const pt = { x, r: vesselSegmentRadius(s, x) };
      // Bỏ điểm trùng x với điểm trước (biên chung) TRỪ khi bán kính đổi (bậc) — để giữ vai phẳng.
      const prev = out[out.length - 1];
      if (prev && Math.abs(prev.x - x) < 1e-9 && Math.abs(prev.r - pt.r) < 1e-9) continue;
      out.push(pt);
    }
  }
  return out;
}

function fmtNum(v: number): string {
  const r = Math.round(v * 1e6) / 1e6;
  return String(r);
}

/**
 * Tính thể tích vật thể ghép: công thức đóng (chính) + tích phân số (đối chiếu).
 * @returns value=đáp số (đóng), numeric=tích phân số, gap=|đóng−số|, verified.
 */
export function vesselVolume(segs: VesselSegment[]): {
  value: number; numeric: number; gap: number; verified: boolean; reason?: string;
} {
  const valid = validateVesselSegments(segs);
  const closed = segs.reduce((acc, s) => acc + vesselSegmentVolume(s), 0);
  const domain: [number, number] = [segs[0]?.x0 ?? 0, segs[segs.length - 1]?.x1 ?? 0];
  const num = revolutionVolumeDisk(vesselProfile(segs), domain);
  const gap = Math.abs(closed - num.value);
  // Đối chiếu tương đối; ngưỡng nới nhẹ vì tích phân số qua các điểm gãy (giữa 2 khúc) hội tụ chứ không tuyệt đối.
  const agree = gap <= 1e-5 * Math.max(1, Math.abs(closed));
  return { value: closed, numeric: num.value, gap, verified: valid.ok && agree, reason: valid.ok ? undefined : valid.reason };
}

/**
 * Dựng RevolutionSolid cho vật thể ghép — tái dùng type + renderer lathe sẵn có.
 * axis mặc định 'Oy' (vật đứng, quay quanh trục dọc). samples do engine tính sẵn ⇒ frontend khỏi parse.
 */
export function buildVesselSolid(
  id: string,
  segs: VesselSegment[],
  opts: { color?: string; axis?: 'Ox' | 'Oy' } = {},
): RevolutionSolid {
  const { value, gap, verified } = vesselVolume(segs);
  const domain: [number, number] = [segs[0]?.x0 ?? 0, segs[segs.length - 1]?.x1 ?? 0];
  const latex = `V=${fmtNum(value)}`;
  const volume: Verified<number> = { value, latex, verified, estimatedError: gap };
  return {
    id,
    outer: vesselProfile(segs),
    axis: opts.axis ?? 'Oy',
    domain,
    method: 'disk',
    color: opts.color,
    volume,
    samples: sampleVesselProfile(segs),
  };
}
