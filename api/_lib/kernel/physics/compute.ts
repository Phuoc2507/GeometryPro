// api/_lib/kernel/physics/compute.ts
// Tầng compute: mỗi query MỘT công thức đóng trên Quad/Scalar (exact-first) + certify bằng bản float
// ĐỘC LẬP + TỰ KIỂM thay-ngược (checks). Không quét lưới — động học lớp 10 nghiệm đóng hết (spec §6–§7).
// Tham số query mang đơn vị riêng (tUnit/xUnit/vUnit) được đổi về hệ nền HỮU TỈ EXACT ngay tại đây (F2).
import { type Scalar, rat, add, sub, mul, div, neg, sqrt as sqrtS, displayScalar, exactToApprox } from '../scalar';
import { recognizeConstant } from '../analysis/recognize';
import {
  type Motion, type Quad, evalQuadS, evalQuadN, derivQuad, expandAbs, subQuad, rootsFor,
  scalarFromNumber, mainAxis, qtyLength, qtyTime, qtyVelocity,
} from './kinematics';
import type { PhysicsQuery } from './planSchema';

export const EPS_SELF = 1e-6; // thay-ngược: nghiệm đóng residual ~1e-12, công thức sai lệch O(1) — 1e-6 cách cả hai 6 bậc
export const EPS_T = 1e-9;    // ngưỡng miền thời gian

// CAO-1: thêm `severity` MỞ RỘNG TƯƠNG THÍCH — check cũ không khai (undefined) giữ nguyên hành vi
// đang có: pass:false tính là FAIL (đổ vào errors, lật ok), check 'info' luôn pass nên vô hại.
// Chỉ severity:'warn' đổi cách tính: pass:false HIỂN THỊ cảnh báo nhưng KHÔNG tính vào ok
// (quyết định thiết kế: answers giữ để tương thích, cảnh báo hiển thị; chính sách error bàn sau).
export type Check = { kind: string; detail: string; residual: number; pass: boolean; severity?: 'info' | 'warn' | 'fail' };
// VỪA-3: queryIndex = số thứ tự trong plan.queries (runPhysics điền) — answers dồn chỉ số khi
// query lỗi giữa chừng, cần map ngược đáp ↔ câu hỏi.
export type PhysicsAnswer = { label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean; queryIndex?: number };
export type QueryOutcome =
  | { ok: true; answer: PhysicsAnswer; checks: Check[]; tSolved?: number }
  | { ok: false; problem: string };
type Units = { length: string; time: string };

// Gắn đơn vị theo kind ĐẦY ĐỦ (spec §6.3): nhớ liệt kê 'time_when_velocity' tường minh ở nhánh
// thời gian — so `kind === 'time_when'` KHÔNG bắt được nó; position_when_velocity rơi về length.
const unitOf = (kind: string, u: Units): string =>
  kind === 'velocity_at' || kind === 'impact_velocity' ? `${u.length}/${u.time}`
    : kind === 'time_to_ground' || kind === 'meet_time' || kind === 'time_when' || kind === 'time_when_velocity' ? u.time
    : u.length;

export function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  // THẤP(4): |x| nhỏ nhưng ≠ 0 — toFixed(4) in "0" (nói dối); toPrecision giữ chữ số có nghĩa.
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// THẤP(3): displayScalar/displayExact nằm ở scalar.ts DÙNG CHUNG toàn kernel — KHÔNG sửa file chung.
// Formatter riêng của physics bọc lại: phân số "xấu" den > 100 mà den = 2^a·5^b (thập phân HỮU HẠN,
// vd 378391/4000) in thẳng thập phân — dựng chuỗi bằng BigInt nên vẫn ĐÚNG TUYỆT ĐỐI (exact giữ nguyên,
// approximate vẫn false). den ≤ 100 giữ phân số kiểu SGK ("75/2", "343/10"); có căn giữ displayScalar.
function displayPhys(s: Scalar): string {
  const e = s.exact;
  if (e && e.radicand === 1 && e.den > 100n) {
    let d = e.den, a = 0, b = 0;
    while (d % 2n === 0n) { d /= 2n; a++; }
    while (d % 5n === 0n) { d /= 5n; b++; }
    if (d === 1n) {                                       // den chỉ chứa thừa số 2 và 5
      const digits = Math.max(a, b);                      // 10^digits chia hết cho den
      const n = e.num < 0n ? -e.num : e.num;
      const scaled = (n * 10n ** BigInt(digits)) / e.den; // chia HẾT — không mất mát
      const str = scaled.toString().padStart(digits + 1, '0');
      return `${e.num < 0n ? '-' : ''}${str.slice(0, str.length - digits)}.${str.slice(str.length - digits)}`;
    }
  }
  return displayScalar(s);
}

// Đáp 3 tầng (spec §6.3): exact certify với float độc lập → displayScalar; chết exact → recognize; trượt → thập phân.
function mkAnswer(kind: string, s: Scalar, floatRef: number, unit: string, label?: string): PhysicsAnswer {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: unit ? `${displayPhys(s)} ${unit}` : displayPhys(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  const numTxt = nice ? nice.text : fmtNum(floatRef);
  return { label, kind, text: unit ? `${numTxt} ${unit}` : numTxt, approx: floatRef, unit, approximate: !nice };
}

const quadOf = (m: Motion, axis: 'x' | 'y'): Quad => (axis === 'x' ? m.x : m.y);
const scaleOf = (q: Quad): number => Math.max(1, Math.abs(q.k0.approx), Math.abs(q.k1.approx), Math.abs(q.k2.approx));

// Nghiệm float ĐỘC LẬP của q(τ)=value (đường certify — không qua số học exact).
function floatRootsFor(q: Quad, value: number): number[] {
  const a = q.k2.approx, b = q.k1.approx, c = q.k0.approx - value;
  if (Math.abs(a) < 1e-15) return Math.abs(b) < 1e-15 ? [] : [-c / b];
  const d = b * b - 4 * a * c;
  if (d < 0) return [];
  const s = Math.sqrt(d);
  return [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((x, y) => x - y);
}
function pickMin(roots: Scalar[], min: number, exclusive: boolean): Scalar | null {
  for (const r of roots) if (exclusive ? r.approx > min + EPS_T : r.approx >= min - EPS_T) return r;
  return null;
}
const backsub = (kind: string, detail: string, residual: number, scale: number): Check =>
  ({ kind, detail, residual, pass: Math.abs(residual) <= EPS_SELF * scale });
// Dòng trace minh bạch (D3/F16): không phải phép kiểm — luôn pass, residual 0.
const info = (detail: string): Check => ({ kind: 'info', detail, residual: 0, pass: true, severity: 'info' });

// ── CAO-1: mốc miền tin cậy của mô hình parabol cho từng vật ──────────────────
// Sau mốc này parabol KHÔNG còn mô tả chuyển động thực:
//  - mover1d có k2≠0 và v đổi dấu tại τ>0 (hãm phanh): t_dừng = t0 − k1/(2k2) — sau khi dừng,
//    parabol cho xe "chạy lùi" (bài hãm phanh thực tế xe đứng luôn);
//  - free_fall/projectile: t_chạm_đất — sau đó parabol cho vật "xuyên xuống đất".
// QUYẾT ĐỊNH THIẾT KẾ: đây là CẢNH BÁO (Check kind:'warn', severity:'warn', pass:false), KHÔNG
// phải error — đáp vẫn trả (giữ tương thích), cảnh báo hiển thị, KHÔNG tính vào ok. Lý do warn
// thay vì error: với mover1d engine không phân biệt được "hãm phanh dừng hẳn" với "lăn ngược
// dốc rồi quay lại" (mô hình vẫn đúng) — chỉ người đọc đề biết; chính sách error bàn sau (review).
function trustBound(m: Motion): { tEnd: number; moc: string } | null {
  if (m.op.op === 'mover1d') {
    const q = quadOf(m, mainAxis(m));
    if (Math.abs(q.k2.approx) < 1e-15) return null;        // thẳng đều: tin cậy mọi t
    const tauStop = -q.k1.approx / (2 * q.k2.approx);      // nghiệm v(τ)=0
    if (tauStop <= EPS_T) return null;                     // v KHÔNG đổi dấu trong τ>0 ⇒ không có mốc
    return { tEnd: m.t0.approx + tauStop, moc: 'dừng' };
  }
  const g = groundTau(m);
  if ('problem' in g) return null;                         // không chạm đất ⇒ không có mốc
  return { tEnd: m.t0.approx + g.tauN, moc: 'chạm đất' };
}
// Check warn cho mọi vật liên quan có t (đầu vào HOẶC nghiệm trả về) vượt mốc miền tin cậy.
function warnBeyond(ms: Motion[], t: number): Check[] {
  const out: Check[] = [];
  for (const m of ms) {
    const b = trustBound(m);
    if (b && t > b.tEnd + EPS_T) {
      out.push({
        kind: 'warn', severity: 'warn', pass: false, residual: 0,
        detail: `t=${fmtNum(t)} vượt thời điểm ${b.moc} t=${fmtNum(b.tEnd)} của "${m.name}" — mô hình không còn mô tả chuyển động thực`,
      });
    }
  }
  return out;
}

// τ chạm đất: nghiệm NHỎ NHẤT > EPS_T của y(τ)=0 (loại τ=0 khi ném từ mặt đất — spec P5).
export function groundTau(m: Motion): { tau: Scalar; tauN: number } | { problem: string } {
  if (m.op.op === 'mover1d') return { problem: `"${m.name}" là mover1d — time_to_ground/range/impact chỉ dành cho free_fall/projectile` };
  const tau = pickMin(rootsFor(m.y, rat(0n)), 0, true);
  const tauN = floatRootsFor(m.y, 0).filter((t) => t > EPS_T)[0];
  if (!tau || tauN === undefined) return { problem: `"${m.name}" không chạm đất (y(τ)=0 vô nghiệm dương)` };
  return { tau, tauN };
}

// Vị trí theo t TUYỆT ĐỐI, kẹp quy ước "đứng yên tại vị trí đầu trước t0" (spec §6.2).
const posClamped = (m: Motion, axis: 'x' | 'y', tS: Scalar): { s: Scalar; n: number } => {
  const q = quadOf(m, axis);
  if (tS.approx <= m.t0.approx + EPS_T) return { s: evalQuadS(q, rat(0n)), n: evalQuadN(q, 0) };
  const tau = sub(tS, m.t0);
  return { s: evalQuadS(q, tau), n: evalQuadN(q, tau.approx) };
};

export function computePhysicsQuery(motions: Map<string, Motion>, query: PhysicsQuery, units: Units): QueryOutcome {
  const need = (name: string): Motion => {
    const m = motions.get(name);
    if (!m) throw new Error(`Vật "${name}" chưa khai báo trong ops`);
    return m;
  };
  const unit = unitOf(query.kind, units);
  try {
    switch (query.kind) {
      case 'position_at': {
        const m = need(query.of);
        const tS = qtyTime(query.t, query.tUnit, units); // F2: t theo đơn vị riêng → hệ nền exact
        // THẤP-1: t trước t₀ — KHÔNG reject nữa, THỐNG NHẤT quy ước §6.2 với distance_between_at:
        // vật "đứng yên tại vị trí đầu cho tới t0" (khớp AnimatedAgent đậu ở initialPosition)
        // ⇒ kẹp về vị trí đầu + info nói rõ quy ước.
        if (tS.approx < m.t0.approx - EPS_T) {
          const q0 = quadOf(m, query.axis ?? mainAxis(m));
          const checks = [info(`t=${query.t} trước lúc xuất phát t₀=${fmtNum(m.t0.approx)} của "${m.name}" — theo quy ước §6.2 vật đứng yên tại vị trí đầu`)];
          return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q0, rat(0n)), evalQuadN(q0, 0), unit, query.label), checks };
        }
        const q = quadOf(m, query.axis ?? mainAxis(m));
        const tau = sub(tS, m.t0);
        // CAO-1: t vượt mốc dừng/chạm đất ⇒ vẫn trả đáp + warn (không tính vào ok)
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q, tau), evalQuadN(q, tau.approx), unit, query.label), checks: warnBeyond([m], tS.approx) };
      }
      case 'velocity_at':
      case 'impact_velocity': {
        const m = need(query.of);
        const checks: Check[] = [];
        let tau: Scalar, tauN: number;
        if (query.kind === 'impact_velocity') {
          const g = groundTau(m);
          if ('problem' in g) return { ok: false, problem: g.problem };
          tau = g.tau; tauN = g.tauN;
          checks.push(backsub('backsub', `y(t_đất)=0 của "${m.name}"`, evalQuadN(m.y, tauN), scaleOf(m.y)));
        } else {
          const tS = qtyTime(query.t, query.tUnit, units);
          // THẤP-1: t trước t₀ — thống nhất quy ước §6.2: vật ĐỨNG YÊN trước lúc xuất phát ⇒ v = 0
          // (không phải v(t₀)=v0 — "đứng yên" nghĩa đen; khớp AnimatedAgent đậu tại initialPosition).
          if (tS.approx < m.t0.approx - EPS_T) {
            checks.push(info(`t=${query.t} trước lúc xuất phát t₀=${fmtNum(m.t0.approx)} của "${m.name}" — theo quy ước §6.2 vật đứng yên (v=0)`));
            return { ok: true, answer: mkAnswer(query.kind, rat(0n), 0, unit, query.label), checks };
          }
          tau = sub(tS, m.t0); tauN = tau.approx;
          checks.push(...warnBeyond([m], tS.approx));   // CAO-1 (impact_velocity đúng TẠI mốc — không warn)
        }
        const dx = derivQuad(m.x), dy = derivQuad(m.y);
        if (query.component === 'x') return { ok: true, answer: mkAnswer(query.kind, evalQuadS(dx, tau), evalQuadN(dx, tauN), unit, query.label), checks };
        if (query.component === 'y') return { ok: true, answer: mkAnswer(query.kind, evalQuadS(dy, tau), evalQuadN(dy, tauN), unit, query.label), checks };
        const vx = evalQuadS(dx, tau), vy = evalQuadS(dy, tau);
        const speed = sqrtS(add(mul(vx, vx), mul(vy, vy)));
        const speedN = Math.hypot(evalQuadN(dx, tauN), evalQuadN(dy, tauN));
        return { ok: true, answer: mkAnswer(query.kind, speed, speedN, unit, query.label), checks };
      }
      case 'time_to_ground': {
        const m = need(query.of);
        const g = groundTau(m);
        if ('problem' in g) return { ok: false, problem: g.problem };
        const checks = [backsub('backsub', `y(t_đất)=0 của "${m.name}"`, evalQuadN(m.y, g.tauN), scaleOf(m.y))];
        return { ok: true, answer: mkAnswer(query.kind, add(m.t0, g.tau), m.t0.approx + g.tauN, unit, query.label), checks, tSolved: m.t0.approx + g.tauN };
      }
      case 'range': {
        const m = need(query.of);
        const g = groundTau(m);
        if ('problem' in g) return { ok: false, problem: g.problem };
        const r = sub(evalQuadS(m.x, g.tau), evalQuadS(m.x, rat(0n)));
        const rN = evalQuadN(m.x, g.tauN) - evalQuadN(m.x, 0);
        const checks = [backsub('backsub', `y(t_đất)=0 của "${m.name}"`, evalQuadN(m.y, g.tauN), scaleOf(m.y))];
        return { ok: true, answer: mkAnswer(query.kind, r, rN, unit, query.label), checks, tSolved: m.t0.approx + g.tauN };
      }
      case 'max_height': {
        const m = need(query.of);
        if (m.y.k2.approx >= -EPS_T) return { ok: false, problem: `max_height: "${m.name}" không có đỉnh (y không phải parabol mở xuống)` };
        const tauStar = neg(div(m.y.k1, mul(rat(2n), m.y.k2)));   // nghiệm v_y(τ*)=0
        if (tauStar.approx < -EPS_T) return { ok: false, problem: 'max_height: đỉnh trước lúc xuất phát (vật không đi lên)' };
        const H = evalQuadS(m.y, tauStar);
        const HN = evalQuadN(m.y, tauStar.approx);
        const dy = derivQuad(m.y);
        const h = Math.max(1e-3, Math.abs(tauStar.approx) * 1e-3);
        const isPeak = HN >= evalQuadN(m.y, tauStar.approx - h) && HN >= evalQuadN(m.y, tauStar.approx + h);
        const checks = [
          backsub('vertex', `v_y(τ*)=0 của "${m.name}"`, evalQuadN(dy, tauStar.approx), scaleOf(dy)),
          { kind: 'peak', detail: 'y(τ*) ≥ y(τ*±h)', residual: isPeak ? 0 : 1, pass: isPeak },
        ];
        return { ok: true, answer: mkAnswer(query.kind, H, HN, unit, query.label), checks, tSolved: m.t0.approx + tauStar.approx };
      }
      case 'meet_time':
      case 'meet_position': {
        const ma = need(query.a), mb = need(query.b);
        // Trục "tương đối" (golden L11): trừ theo TỪNG trục (t tuyệt đối) rồi lấy trục CÓ CHUYỂN ĐỘNG
        // tương đối (k1/k2 ≠ 0) làm trục chính — bài xe cộ ra x, bài ném-lên-gặp-thả-rơi ra y (hai x
        // hằng bằng nhau ⇒ dX ≡ 0, KHÔNG được chọn x kẻo "vô số nghiệm"). Trục còn lại vẫn được
        // thay-ngược: gặp nhau nghĩa là TRÙNG CẢ HAI toạ độ.
        const aX = expandAbs(ma.x, ma.t0), bX = expandAbs(mb.x, mb.t0);
        const aY = expandAbs(ma.y, ma.t0), bY = expandAbs(mb.y, mb.t0);
        const dX = subQuad(aX, bX), dY = subQuad(aY, bY);
        const hasMotion = (q: Quad): boolean => Math.abs(q.k1.approx) + Math.abs(q.k2.approx) > 1e-15;
        const tMin = Math.max(ma.t0.approx, mb.t0.approx);
        const tMinS = ma.t0.approx >= mb.t0.approx ? ma.t0 : mb.t0;
        const scale = Math.max(scaleOf(aX), scaleOf(bX), scaleOf(aY), scaleOf(bY));
        let axis: 'x' | 'y';
        if (hasMotion(dX)) axis = 'x';
        else if (hasMotion(dY)) axis = 'y';
        else {
          // Không có chuyển động tương đối trên trục nào: hoặc luôn trùng nhau, hoặc không bao giờ gặp.
          if (Math.abs(dX.k0.approx) <= EPS_SELF * scale && Math.abs(dY.k0.approx) <= EPS_SELF * scale) {
            const checks = [info(`hai vật chuyển động trùng nhau hoàn toàn — trả thời điểm sớm nhất cả hai cùng xuất phát t = ${fmtNum(tMin)} ${units.time} (meet_time inclusive t=t₀)`)];
            if (query.kind === 'meet_time') return { ok: true, answer: mkAnswer(query.kind, tMinS, tMin, unit, query.label), checks, tSolved: tMin };
            return { ok: true, answer: mkAnswer(query.kind, evalQuadS(aX, tMinS), evalQuadN(aX, tMin), unit, query.label), checks, tSolved: tMin };
          }
          return { ok: false, problem: `"${query.a}" và "${query.b}" không gặp nhau (khoảng cách không đổi theo thời gian)` };
        }
        const dPrim = axis === 'x' ? dX : dY;
        const dOther = axis === 'x' ? dY : dX;
        const qa = axis === 'x' ? aX : aY;
        const rootsN = floatRootsFor(dPrim, 0).filter((r) => r >= tMin - EPS_T);
        const t = pickMin(rootsFor(dPrim, rat(0n)), tMin, false);
        const tN = rootsN[0];
        if (!t || tN === undefined) return { ok: false, problem: `"${query.a}" và "${query.b}" không gặp nhau sau khi cả hai xuất phát` };
        // "x gặp của 2 xe bằng nhau" — thay-ngược trên CẢ HAI trục (trục phụ khác 0 ⇒ không gặp thật).
        // VỪA-4: trục CÒN LẠI lệch ⇒ hai vật không hề gặp — trả error NGHIỆP VỤ rõ ràng thay vì
        // ok:true + check fail kỹ thuật (đáp ma từng nằm trong answers[]).
        const residOther = evalQuadN(dOther, tN);
        if (Math.abs(residOther) > EPS_SELF * scale) {
          return { ok: false, problem: `"${query.a}" và "${query.b}" không thực sự gặp nhau (lệch nhau ${fmtNum(Math.abs(residOther))} ${units.length} trên trục còn lại tại t=${fmtNum(tN)})` };
        }
        const resid = Math.hypot(evalQuadN(dPrim, tN), residOther);
        const checks = [backsub('backsub', `pos_${query.a}(t_gặp) = pos_${query.b}(t_gặp)`, resid, scale)];
        // D3: còn nghiệm gặp hợp lệ thứ hai (1 xe có gia tốc) ⇒ vẫn trả nghiệm ĐẦU + dòng trace minh bạch.
        if (rootsN.length > 1 && rootsN[1] > tN + EPS_T) checks.push(info(`còn nghiệm gặp lần 2: t₂ = ${fmtNum(rootsN[1])} ${units.time} (trả nghiệm đầu)`));
        // F16: gặp ngay tại t = t₀ (hai vật cùng vị trí ngay lúc xuất phát) — quy ước inclusive, nói rõ.
        if (tN <= tMin + EPS_T) checks.push(info(`gặp ngay tại thời điểm xuất phát t = t₀ = ${fmtNum(tMin)} ${units.time}: hai vật ở cùng vị trí ngay lúc bắt đầu (quy ước meet_time inclusive t=t₀)`));
        if (query.kind === 'meet_time') return { ok: true, answer: mkAnswer(query.kind, t, tN, unit, query.label), checks, tSolved: tN };
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(qa, t), evalQuadN(qa, tN), unit, query.label), checks, tSolved: tN };
      }
      case 'distance_between_at': {
        const ma = need(query.a), mb = need(query.b);
        const tS = qtyTime(query.t, query.tUnit, units);
        const ax = posClamped(ma, 'x', tS), bx = posClamped(mb, 'x', tS);
        const ay = posClamped(ma, 'y', tS), by = posClamped(mb, 'y', tS);
        const dxS = sub(ax.s, bx.s), dyS = sub(ay.s, by.s);
        const dist = sqrtS(add(mul(dxS, dxS), mul(dyS, dyS)));
        // CAO-1: kiểm mốc miền tin cậy trên CẢ HAI vật liên quan
        return { ok: true, answer: mkAnswer(query.kind, dist, Math.hypot(ax.n - bx.n, ay.n - by.n), unit, query.label), checks: warnBeyond([ma, mb], tS.approx) };
      }
      case 'time_when': {
        const m = need(query.of);
        const q = quadOf(m, query.axis ?? mainAxis(m));
        const posS = qtyLength(query.position, query.xUnit, units); // F2
        // VỪA-5: vật ĐỨNG YÊN trên trục hỏi (k1=k2=0) — solveQuadratic trả [] cho CẢ "vô số nghiệm"
        // (đúng vị trí) lẫn "vô nghiệm" (chỗ khác), phải tách TRƯỚC khi rootsFor kẻo báo sai
        // "không bao giờ tới" với vật đang ở đúng vị trí đó.
        if (Math.abs(q.k1.approx) < 1e-15 && Math.abs(q.k2.approx) < 1e-15) {
          if (Math.abs(q.k0.approx - posS.approx) <= EPS_SELF * Math.max(scaleOf(q), Math.abs(posS.approx))) {
            const checks = [info(`"${m.name}" đứng yên và LUÔN ở vị trí ${query.position} — trả thời điểm sớm nhất t = t₀`)];
            return { ok: true, answer: mkAnswer(query.kind, m.t0, m.t0.approx, unit, query.label), checks, tSolved: m.t0.approx };
          }
          return { ok: false, problem: `time_when: "${m.name}" đứng yên tại ${fmtNum(q.k0.approx)} ${units.length} — không bao giờ tới vị trí ${query.position}` };
        }
        const tau = pickMin(rootsFor(q, posS), 0, false);
        const tauN = floatRootsFor(q, posS.approx).filter((r) => r >= -EPS_T)[0];
        if (!tau || tauN === undefined) return { ok: false, problem: `time_when: "${m.name}" không bao giờ tới vị trí ${query.position}` };
        const checks = [backsub('backsub', `coord(t) = ${query.position} của "${m.name}"`, evalQuadN(q, tauN) - posS.approx, scaleOf(q))];
        checks.push(...warnBeyond([m], m.t0.approx + tauN));   // CAO-1: NGHIỆM vượt mốc (nhánh ma sau-dừng)
        return { ok: true, answer: mkAnswer(query.kind, add(m.t0, tau), m.t0.approx + tauN, unit, query.label), checks, tSolved: m.t0.approx + tauN };
      }
      case 'time_when_velocity':
      case 'position_when_velocity': {
        // F3: v_comp(t) TUYẾN TÍNH (deriv của Quad) ⇒ nghiệm nhỏ nhất τ ≥ 0 của v(τ)=value, exact thuần.
        const m = need(query.of);
        const axis = query.component ?? mainAxis(m);
        const q = quadOf(m, axis);
        const dq = derivQuad(q);                       // v(τ) = k1 + 2k2·τ
        const valueS = qtyVelocity(query.value, query.vUnit, units); // F2
        if (Math.abs(dq.k1.approx) < 1e-15) {
          // v hằng: bằng value ⇒ đạt ngay từ lúc xuất phát (mọi t thoả — trả sớm nhất); khác ⇒ error rõ.
          if (Math.abs(dq.k0.approx - valueS.approx) <= EPS_T * scaleOf(dq)) {
            const checks = [info(`v_${axis} không đổi và ĐÚNG BẰNG ${query.value} — đạt ngay từ lúc xuất phát t = t₀`)];
            if (query.kind === 'time_when_velocity') return { ok: true, answer: mkAnswer(query.kind, m.t0, m.t0.approx, unit, query.label), checks, tSolved: m.t0.approx };
            return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q, rat(0n)), evalQuadN(q, 0), unit, query.label), checks, tSolved: m.t0.approx };
          }
          return { ok: false, problem: `${query.kind}: "${m.name}" có v_${axis} không đổi (a=0) — không bao giờ đạt v=${query.value}` };
        }
        const tau = pickMin(rootsFor(dq, valueS), 0, false);
        const tauN = floatRootsFor(dq, valueS.approx).filter((r) => r >= -EPS_T)[0];
        if (!tau || tauN === undefined) return { ok: false, problem: `${query.kind}: "${m.name}" đạt v=${query.value} TRƯỚC lúc xuất phát (sai chiều gia tốc) — không có nghiệm t ≥ t₀` };
        const checks = [backsub('backsub', `v_${axis}(t) = ${query.value} của "${m.name}"`, evalQuadN(dq, tauN) - valueS.approx, scaleOf(dq))];
        checks.push(...warnBeyond([m], m.t0.approx + tauN));   // CAO-1: nghiệm vượt mốc dừng/chạm đất
        if (query.kind === 'time_when_velocity') {
          return { ok: true, answer: mkAnswer(query.kind, add(m.t0, tau), m.t0.approx + tauN, unit, query.label), checks, tSolved: m.t0.approx + tauN };
        }
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q, tau), evalQuadN(q, tauN), unit, query.label), checks, tSolved: m.t0.approx + tauN };
      }
      default: {
        // THẤP(5): exhaustive check — thêm kind mới vào schema mà quên nhánh ⇒ LỖI COMPILE ngay đây
        // (query đã thu hẹp về never); plan lách schema lúc runtime ⇒ error có cấu trúc, không undefined.
        query satisfies never;
        return { ok: false, problem: `query kind không hỗ trợ: ${(query as { kind: string }).kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
