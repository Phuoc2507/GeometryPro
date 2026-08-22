// api/_lib/kernel/physics/dynamics.ts
// THUẦN (Scalar) — không zod, không I/O. Tầng GIẢI động lực học chất điểm lớp 10 (spec §7–§9):
//  - chuẩn hoá hệ (trục, chiều dương = chiều chuyển động thực), đổi đơn vị per-quantity HỮU TỈ EXACT;
//  - giải Newton bằng công thức ĐÓNG trên Scalar (exact-first): a, N, F_ms, T;
//  - TỰ KIỂM thay-a-ngược từng vật (ΣF − ma = 0) + lực căng hai đầu khớp + ràng buộc vật lý
//    (N ≥ 0, dây căng, thắng ma sát nghỉ); vi phạm ⇒ violations, KHÔNG bịa đáp;
//  - BÀN GIAO gia tốc sang tầng động học v0 (Quad) để trả tiếp s/v/t.
// Mỗi đại lượng có CẶP FLOAT ĐỘC LẬP (…N, số học `number` thường) — đường đối chiếu cho certify (§7.5).
import { type Scalar, rat, add, sub, mul, div, neg, sqrt, exactToApprox, displayScalar } from '../scalar';
import { cmpScalar } from '../compute/answer';
import { recognizeConstant } from '../analysis/recognize';
import {
  scalarFromNumber, trigOf, qtyVelocity, evalQuadS, derivQuad, rootsFor, type Quad, type BaseUnits,
} from './kinematics';
import type { DynamicsPlan, DynamicsQuery, DynamicsBodyOp, DynamicsForceOp } from './dynamicsSchema';

// EPS_SELF: ngưỡng thay-ngược/tự-kiểm khi rơi float (dùng chung TRỊ SỐ 1e-6 của v0 — §9.3, không hằng riêng).
export const EPS_SELF = 1e-6;
const SI: BaseUnits = { length: 'm', time: 's' };
const ZERO = rat(0n);
const HALF = rat(1n, 2n);

export type Check = { kind: string; detail: string; residual: number; pass: boolean };
export type Violation = { id: string; message: string };

// Trạng thái đã giải của MỘT vật: mọi đại lượng exact + bản float độc lập. Field vắng ⇒ chưa cần tính
// (vd bài nghiêng thuần-gia-tốc không cho m: a tính được nhưng N/weight/friction phải reqMass khi query).
export type BodyState = {
  name: string;
  op: DynamicsBodyOp;
  config: 'ngang' | 'nghieng' | 'hanging';
  hasMass: boolean;
  m?: Scalar; mN?: number;
  hasMu: boolean;
  mu: Scalar; muN: number;
  theta?: number; sinT?: Scalar; cosT?: Scalar; sinTN?: number; cosTN?: number;
  v0: Scalar; v0N: number;
  moves: boolean; // engine có giải chuyển động cho vật này không (statics thuần ⇒ false)
  a?: Scalar; aN?: number; // gia tốc ĐẠI SỐ theo chiều dương (âm = hãm)
  N?: Scalar; NN?: number;
  weight?: Scalar; weightN?: number;
  friction?: Scalar; frictionN?: number; // μN (độ lớn)
  tension?: Scalar; tensionN?: number; // T (nếu vật nằm trong dây)
  quad?: Quad; // {0, v0, a/2} — handoff động học
  tStop: number | null; // thời điểm dừng (a < 0, v0 > 0) hoặc null
  motionDesc: string;
  blockReason?: string; // lý do KHÔNG giải được chuyển động (thiếu g/mass) — query dùng làm lỗi rõ 1 dòng
};

// Các violation VẬT LÝ (mô hình không thoả đề) ⇒ KHÔNG serve đáp (§9.2). Assert-sai KHÔNG thuộc nhóm này.
export const PHYSICAL_VIOLATIONS = new Set(['vat-khong-truot', 'he-khong-chuyen-dong', 'phan-luc-am', 'day-chung']);

export type Solved = {
  bodies: Map<string, BodyState>;
  g?: Scalar; gN?: number;
  checks: Check[];
  violations: Violation[];
  errors: { message: string }[];
  meta: { config: string; direction: string; horizonNote?: string };
};

// ── Đổi đơn vị per-quantity → SI, HỮU TỈ EXACT (§6.3) ─────────────────────────
function convMass(b: DynamicsBodyOp): { s: Scalar; n: number } {
  const mv = b.mass as number;
  if (b.massUnit === 'g') return { s: mul(scalarFromNumber(mv), rat(1n, 1000n)), n: mv / 1000 };
  if (b.massUnit === 'tan') return { s: mul(scalarFromNumber(mv), rat(1000n)), n: mv * 1000 };
  return { s: scalarFromNumber(mv), n: mv };
}
function convForce(f: DynamicsForceOp): { s: Scalar; n: number } {
  return f.unit === 'kN' ? { s: mul(scalarFromNumber(f.value), rat(1000n)), n: f.value * 1000 } : { s: scalarFromNumber(f.value), n: f.value };
}

// ── Dựng đáp 3 tầng (spec §7.5, y v0 §6.3): exact certify → recognize → thập phân trung thực ─────
export type DynAns = { label?: string; kind: string; text: string; approx: number; unit: string; approximate: boolean; queryIndex?: number };

function fmtNum(x: number): string {
  if (!Number.isFinite(x)) return '(lỗi)';
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1000 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}

// s = giá trị exact-first; floatRef = bản float ĐỘC LẬP. Khớp ⇒ displayScalar; chết exact ⇒ recognize
// (nhánh p + q√r cho bài lực xiên B09); trượt nốt ⇒ thập phân + approximate:true. text KHÔNG kèm unit.
export function mkAns(kind: string, s: Scalar, floatRef: number, unit: string, label?: string): DynAns {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum(floatRef), approx: floatRef, unit, approximate: !nice };
}

// residual exact-0 ⇒ pass (num === 0n); rơi float ⇒ ngưỡng tương đối EPS_SELF (§9.1). residual number lấy
// GIÁ TRỊ EXACT khi có (0 đúng nghĩa, không phải bóng float ~1e-16).
function resCheck(kind: string, detail: string, resid: Scalar, scaleN: number): Check {
  const e = resid.exact;
  const residual = e !== null ? exactToApprox(e) : resid.approx;
  const pass = e !== null ? e.num === 0n : Math.abs(resid.approx) <= EPS_SELF * Math.max(1, scaleN);
  return { kind, detail, residual, pass };
}

// ── Giải một vật ĐƠN (§7.2, §7.3) — có thể ném lỗi thiếu g/mass (caller bắt) ─────────────────────
function solveSingle(
  body: DynamicsBodyOp, forcesOn: DynamicsForceOp[], gS: Scalar | undefined, gN: number | undefined,
  needsMotion: boolean, checks: Check[], violations: Violation[],
): BodyState {
  const reqG = (): { s: Scalar; n: number } => {
    if (gS === undefined || gN === undefined) throw new Error('cần g (gia tốc trọng trường) cho mô hình này — bổ sung "g" vào plan');
    return { s: gS, n: gN };
  };
  const mass = body.mass !== undefined ? convMass(body) : undefined;
  const reqMass = (): { s: Scalar; n: number } => {
    if (!mass) throw new Error(`cần khối lượng của "${body.name}" cho đại lượng này`);
    return mass;
  };

  const hasMu = body.mu !== undefined && body.mu > 0;
  const mu = scalarFromNumber(body.mu ?? 0);
  const muN = body.mu ?? 0;
  const v0 = qtyVelocity(body.v0, body.v0Unit, SI);
  const v0N = body.v0 * (body.v0Unit === 'km/h' ? 5 / 18 : 1);

  const st: BodyState = {
    name: body.name, op: body, config: body.on === 'incline' ? 'nghieng' : body.on === 'hanging' ? 'hanging' : 'ngang',
    hasMass: !!mass, m: mass?.s, mN: mass?.n, hasMu, mu, muN, v0, v0N, moves: false, tStop: null, motionDesc: '',
  };

  // Lực đề cho tác dụng lên vật: thành phần dọc trục (± theo direction) + thành phần pháp tuyến (F·sinα, chếch lên GIẢM N).
  let appAxial = ZERO, appAxialN = 0, vertUp = ZERO, vertUpN = 0;
  for (const f of forcesOn) {
    const F = convForce(f);
    const { cos, sin } = trigOf(f.angleDeg);
    const cosN = Math.cos((f.angleDeg * Math.PI) / 180), sinN = Math.sin((f.angleDeg * Math.PI) / 180);
    const sgn = f.direction === 'backward' ? -1 : 1;
    appAxial = add(appAxial, mul(F.s, f.direction === 'backward' ? neg(cos) : cos));
    appAxialN += sgn * F.n * cosN;
    vertUp = add(vertUp, mul(F.s, sin));
    vertUpN += F.n * sinN;
  }
  const hasApplied = forcesOn.length > 0;

  if (st.config === 'ngang') {
    // Phản lực + trọng lượng + ma sát: chỉ tính khi có g & mass (bài thuần lực nhẵn B01/B10 không cần).
    if (mass && gS !== undefined && gN !== undefined) {
      st.N = sub(mul(mass.s, gS), vertUp); st.NN = mass.n * gN - vertUpN;
      st.weight = mul(mass.s, gS); st.weightN = mass.n * gN;
      st.friction = mul(mu, st.N); st.frictionN = muN * st.NN;
      // N ≥ 0 (lực xiên nhấc vật khỏi mặt ⇒ mô hình v1 không phủ).
      if (cmpScalar(st.N, ZERO) < 0) violations.push({ id: 'phan-luc-am', message: `phản lực âm (N = ${st.NN.toFixed(2)} N < 0): lực nhấc vật khỏi mặt tựa, mô hình v1 không phủ` });
      // Trục pháp: N + F·sinα − mg = 0 (bài lực xiên).
      checks.push(resCheck('newton_axis', `trục pháp "${body.name}": N + F·sinα − mg`, sub(add(st.N, vertUp), mul(mass.s, gS)), Math.max(1, st.NN)));
    }
    if (needsMotion) try {
      const m = reqMass();
      // Ma sát trượt luôn ngược chiều dương ⇒ −μN. Cần N ⇒ reqG (bài có ma sát/hãm).
      let fric = ZERO, fricN = 0;
      if (hasMu) { reqG(); fric = st.friction as Scalar; fricN = st.frictionN as number; }
      // Ngưỡng ma sát nghỉ (chỉ v0 = 0, mu > 0): driving = appAxial; driving ≤ μN ⇒ vật không trượt.
      if (body.v0 === 0 && hasMu) {
        if (cmpScalar(appAxial, fric) <= 0) {
          violations.push({ id: 'vat-khong-truot', message: `lực chưa thắng ma sát nghỉ (driving ${appAxialN.toFixed(2)} ≤ μN ${fricN.toFixed(2)}), vật không trượt. Đứng yên là KẾT QUẢ VẬT LÝ HỢP LỆ của đề — nhưng v1 không có nhánh tĩnh (§3.2), không serve đáp` });
        } else {
          checks.push({ kind: 'static_threshold', detail: `driving ${appAxialN.toFixed(2)} > μN ${fricN.toFixed(2)} — vật bắt đầu trượt`, residual: 0, pass: true });
        }
      }
      st.a = div(sub(appAxial, fric), m.s); st.aN = (appAxialN - fricN) / m.n;
      st.moves = true;
      st.motionDesc = body.v0 > 0 ? 'theo-v0' : 'theo-luc-keo';
      // Thay-a-ngược trục chuyển động: appAxial − μN − m·a = 0.
      checks.push(resCheck('newton_axis', `trục chuyển động "${body.name}": ΣF − m·a`, sub(sub(appAxial, fric), mul(m.s, st.a)), Math.max(1, Math.abs(appAxialN))));
    } catch (e) { st.blockReason = (e as Error).message; }
  } else if (st.config === 'nghieng') {
    const theta = body.inclineDeg as number;
    const { cos, sin } = trigOf(theta);
    st.theta = theta; st.sinT = sin; st.cosT = cos;
    st.sinTN = Math.sin((theta * Math.PI) / 180); st.cosTN = Math.cos((theta * Math.PI) / 180);
    const down = (body.motion ?? 'down') === 'down';
    // N, weight, friction (cần mass + g); bài B05 (không cho m) bỏ qua — chỉ tính khi đủ dữ kiện.
    if (mass && gS !== undefined && gN !== undefined) {
      st.N = mul(mul(mass.s, gS), cos); st.NN = mass.n * gN * st.cosTN; // N = mg·cosθ
      st.weight = mul(mass.s, gS); st.weightN = mass.n * gN;
      st.friction = mul(mu, st.N); st.frictionN = muN * st.NN;
      checks.push(resCheck('newton_axis', `trục pháp "${body.name}": N − mg·cosθ`, sub(st.N, mul(mul(mass.s, gS), cos)), Math.max(1, st.NN as number)));
    }
    if (needsMotion) try {
      const g = reqG();
      // a mass-independent: a = ±g·sinθ − μ·g·cosθ (+ lực đề cho/m nếu có). Down: +g·sinθ; Up: −g·sinθ.
      const gSin = mul(g.s, sin), gSinN = g.n * st.sinTN;
      const gCosMu = mul(mu, mul(g.s, cos)), gCosMuN = muN * g.n * st.cosTN; // μ·g·cosθ
      // Ngưỡng trượt (v0 = 0, mu > 0): so g·sinθ với μ·g·cosθ ⇔ tanθ với μ (DY-6/DY-7).
      if (body.v0 === 0 && hasMu && down) {
        if (cmpScalar(gSin, gCosMu) <= 0) {
          violations.push({ id: 'vat-khong-truot', message: `chiều chuyển động khai trong plan không khớp mô hình: đề khai vật trượt xuống nhưng tanθ = ${(st.sinTN / st.cosTN).toFixed(3)} ≤ μ = ${muN} — vật không trượt theo chiều đó` });
        } else {
          checks.push({ kind: 'static_threshold', detail: `g·sinθ ${gSinN.toFixed(3)} > μ·g·cosθ ${gCosMuN.toFixed(3)} — vật trượt xuống`, residual: 0, pass: true });
        }
      }
      if (body.v0 === 0 && !down && !hasApplied) {
        violations.push({ id: 'vat-khong-truot', message: `chiều chuyển động khai trong plan không khớp mô hình: khai motion:'up' với v0 = 0 và không có lực kéo dọc dốc — vật không thể tự đi lên` });
      }
      let appPerMass = ZERO, appPerMassN = 0;
      if (hasApplied) { const m = reqMass(); appPerMass = div(appAxial, m.s); appPerMassN = appAxialN / m.n; }
      // a = gAlong + appPerMass − μ·g·cosθ ; gAlong = down ? +g·sinθ : −g·sinθ
      const gAlong = down ? gSin : neg(gSin), gAlongN = down ? gSinN : -gSinN;
      st.a = sub(add(gAlong, appPerMass), gCosMu); st.aN = gAlongN + appPerMassN - gCosMuN;
      st.moves = true; st.motionDesc = down ? 'xuong-doc' : 'len-doc';
      // Thay-a-ngược: với mass ⇒ mg·sinθ (±) + appAxial − μN − m·a; không mass ⇒ per-mass.
      if (mass) {
        const mgSin = down ? mul(mass.s, gSin) : neg(mul(mass.s, gSin));
        checks.push(resCheck('newton_axis', `trục dốc "${body.name}": ΣF − m·a`, sub(sub(add(mgSin, appAxial), st.friction as Scalar), mul(mass.s, st.a)), Math.max(1, Math.abs((mass.n * g.n * st.sinTN)))));
      } else {
        checks.push(resCheck('newton_axis', `trục dốc "${body.name}" (per-mass): (g·sinθ − μ·g·cosθ) − a`, sub(sub(gAlong, gCosMu), st.a), Math.max(1, Math.abs(gAlongN))));
      }
    } catch (e) { st.blockReason = (e as Error).message; }
  }

  // Handoff động học (mọi vật CÓ chuyển động): x(τ) = v0·τ + (a/2)·τ².
  if (st.a !== undefined) {
    st.quad = { k0: ZERO, k1: st.v0, k2: mul(HALF, st.a) };
    st.tStop = (st.aN as number) < 0 && st.v0N > 1e-12 ? -st.v0N / (st.aN as number) : null;
  }
  return st;
}

// ── Giải hệ 2 vật + dây qua ròng rọc cố định (§7.4) — một đường code ─────────────────────────────
function solveTwoBody(
  bodies: DynamicsBodyOp[], gS: Scalar | undefined, gN: number | undefined,
  checks: Check[], violations: Violation[], meta: Solved['meta'],
): Map<string, BodyState> {
  const out = new Map<string, BodyState>();
  if (gS === undefined || gN === undefined) throw new Error('cần g cho hệ 2 vật (có vật treo) — bổ sung "g" vào plan');
  for (const b of bodies) if (b.mass === undefined) throw new Error(`cần khối lượng của "${b.name}" (hệ 2 vật cần cả hai khối lượng)`);

  const atwood = bodies.every((b) => b.on === 'hanging');
  // Chuẩn hoá: với bàn+treo, xác định vật treo (hanging) và vật ngang (horizontal).
  let hangB: DynamicsBodyOp, horizB: DynamicsBodyOp | undefined, downB: DynamicsBodyOp, upB: DynamicsBodyOp;
  const m = (b: DynamicsBodyOp) => convMass(b);
  const M = add(m(bodies[0]).s, m(bodies[1]).s), MN = m(bodies[0]).n + m(bodies[1]).n;

  let D: Scalar, DN: number, Fmax: Scalar, FmaxN: number, a: Scalar, aN: number, T: Scalar, TN: number, Tverify: Scalar, TverifyN: number;

  if (atwood) {
    // D = (m1 − m2)·g; vật nặng hơn đi xuống. |D| = |m1−m2|·g.
    const c = cmpScalar(m(bodies[0]).s, m(bodies[1]).s);
    if (c === 0) { violations.push({ id: 'he-khong-chuyen-dong', message: `hệ cân bằng (m₁ = m₂): a = 0, T = mg — trạng thái hợp lệ nhưng v1 không serve đáp tĩnh` }); }
    downB = c >= 0 ? bodies[0] : bodies[1]; upB = c >= 0 ? bodies[1] : bodies[0];
    hangB = downB;
    D = mul(sub(m(downB).s, m(upB).s), gS); DN = (m(downB).n - m(upB).n) * gN;
    Fmax = ZERO; FmaxN = 0;
    a = div(D, M); aN = DN / MN; // |D| (downB nặng hơn ⇒ D ≥ 0)
    T = mul(m(upB).s, add(gS, a)); TN = m(upB).n * (gN + aN); // vật đi lên: T = m_up(g + a)
    Tverify = mul(m(downB).s, sub(gS, a)); TverifyN = m(downB).n * (gN - aN); // đi xuống: T = m_down(g − a)
    meta.config = 'atwood'; meta.direction = `${downB.name}-di-xuong`;
  } else {
    hangB = bodies.find((b) => b.on === 'hanging') as DynamicsBodyOp;
    horizB = bodies.find((b) => b.on !== 'hanging') as DynamicsBodyOp;
    const muH = horizB.mu ?? 0;
    const N1 = mul(m(horizB).s, gS), N1N = m(horizB).n * gN; // phản lực vật ngang = m·g
    Fmax = mul(scalarFromNumber(muH), N1); FmaxN = muH * N1N;
    D = mul(m(hangB).s, gS); DN = m(hangB).n * gN; // lực phát động = trọng lực vật treo
    downB = hangB; upB = horizB;
    if (cmpScalar(D, Fmax) <= 0) {
      violations.push({ id: 'he-khong-chuyen-dong', message: `lực phát động ${DN.toFixed(2)} N ≤ ngưỡng ma sát ${FmaxN.toFixed(2)} N — hệ không chuyển động (đứng yên là kết quả hợp lệ, v1 không serve nhánh tĩnh)` });
    }
    a = div(sub(D, Fmax), M); aN = (DN - FmaxN) / MN;
    T = mul(m(hangB).s, sub(gS, a)); TN = m(hangB).n * (gN - aN); // vật treo đi xuống: T = m_hang(g − a)
    Tverify = add(mul(m(horizB).s, a), Fmax); TverifyN = m(horizB).n * aN + FmaxN; // vật ngang: T = m·a + μN
    meta.config = 'ban-treo'; meta.direction = `${hangB.name}-di-xuong`;
  }

  // Lực căng hai đầu khớp nhau (§9.1 tension_match).
  checks.push(resCheck('tension_match', 'lực căng hai đầu dây khớp nhau', sub(T, Tverify), Math.max(1, Math.abs(TN))));

  // Dây chỉ kéo, không đẩy: T ≥ 0.
  if (cmpScalar(T, ZERO) < 0) violations.push({ id: 'day-chung', message: `lực căng âm (T = ${TN.toFixed(2)} N < 0): dây chùng, mô hình không khớp` });

  for (const b of bodies) {
    const mb = m(b);
    const st: BodyState = {
      name: b.name, op: b, config: b.on === 'incline' ? 'nghieng' : b.on === 'hanging' ? 'hanging' : 'ngang',
      hasMass: true, m: mb.s, mN: mb.n, hasMu: (b.mu ?? 0) > 0, mu: scalarFromNumber(b.mu ?? 0), muN: b.mu ?? 0,
      v0: ZERO, v0N: 0, moves: true, a, aN, tension: T, tensionN: TN, tStop: null,
      motionDesc: b === downB ? 'di-xuong' : b === upB ? (atwood ? 'di-len' : 'bi-keo') : '',
      quad: { k0: ZERO, k1: ZERO, k2: mul(HALF, a) },
    };
    if (b.on === 'horizontal') { st.N = mul(mb.s, gS); st.NN = mb.n * gN; st.friction = mul(st.mu, st.N); st.frictionN = st.muN * (st.NN as number); }
    if (b.on !== 'hanging') { st.weight = mul(mb.s, gS); st.weightN = mb.n * gN; }
    else { st.weight = mul(mb.s, gS); st.weightN = mb.n * gN; }
    // Thay-a-ngược từng vật: vật treo đi xuống: mg − T − ma; đi lên: T − mg − ma; vật ngang: T − μN − ma.
    let resid: Scalar, scale: number;
    if (b.on === 'hanging') {
      if (b === downB) { resid = sub(sub(mul(mb.s, gS), T), mul(mb.s, a)); }
      else { resid = sub(sub(T, mul(mb.s, gS)), mul(mb.s, a)); }
      scale = mb.n * gN;
    } else {
      const fr = st.friction ?? ZERO;
      resid = sub(sub(T, fr), mul(mb.s, a));
      scale = Math.max(1, TN);
    }
    checks.push(resCheck('newton_axis', `thay-a-ngược "${b.name}": ΣF − m·a`, resid, Math.max(1, Math.abs(scale))));
    out.set(b.name, st);
  }
  meta.horizonNote = 'mô hình bỏ qua giới hạn hành trình dây/độ cao — đáp hợp lệ trong phạm vi lý tưởng hóa của đề';
  return out;
}

// Vật cần giải chuyển động? (statics thuần — chỉ hỏi weight/normal/min_force — thì KHÔNG giải a, không kiểm ngưỡng trượt.)
function bodyNeedsMotion(name: string, isSingle: boolean, plan: DynamicsPlan): boolean {
  return plan.queries.some((q) => {
    if (q.kind === 'acceleration') return q.of === name || (q.of === undefined && isSingle);
    if (q.kind === 'force_value' && q.force === 'net') return q.on === name;
    if (q.kind === 'velocity_at' || q.kind === 'position_at' || q.kind === 'time_when' || q.kind === 'time_when_velocity' || q.kind === 'velocity_after_distance' || q.kind === 'distance_to_stop') return q.of === name;
    return false;
  });
}

export function solveDynamics(plan: DynamicsPlan): Solved {
  const checks: Check[] = [];
  const violations: Violation[] = [];
  const errors: { message: string }[] = [];
  const meta: Solved['meta'] = { config: 'ngang', direction: '' };
  const gS = plan.g !== undefined ? scalarFromNumber(plan.g) : undefined;
  const gN = plan.g;
  const bodies = plan.ops.filter((o): o is DynamicsBodyOp => o.op === 'body');
  const forces = plan.ops.filter((o): o is DynamicsForceOp => o.op === 'force');
  const bodyMap = new Map<string, BodyState>();

  try {
    if (bodies.length === 2) {
      const solved = solveTwoBody(bodies, gS, gN, checks, violations, meta);
      solved.forEach((v, k) => bodyMap.set(k, v));
    } else {
      const b = bodies[0];
      const isSingle = true;
      const needsMotion = b.on === 'incline' || b.v0 > 0 || forces.some((f) => f.on === b.name) || bodyNeedsMotion(b.name, isSingle, plan);
      const st = solveSingle(b, forces.filter((f) => f.on === b.name), gS, gN, needsMotion, checks, violations);
      bodyMap.set(b.name, st);
      meta.config = st.config === 'nghieng' ? 'nghieng' : 'ngang';
      meta.direction = st.motionDesc || (st.config === 'nghieng' ? 'xuong-doc' : 'tinh');
    }
  } catch (e) {
    errors.push({ message: (e as Error).message });
  }

  return { bodies: bodyMap, g: gS, gN, checks, violations, errors, meta };
}

// ── Compute query trên trạng thái đã giải (§6.2, §8) ─────────────────────────────────────────────
export type QueryOutcome = { ok: true; answer: DynAns; checks: Check[]; tSolved?: number } | { ok: false; problem: string };

const posRootsPositive = (roots: Scalar[]): Scalar | null => {
  for (const r of roots) if (r.approx > 1e-9) return r;
  return null;
};

export function computeDynQuery(solved: Solved, query: DynamicsQuery, isSingle: boolean): QueryOutcome {
  const bodyByName = (name?: string): BodyState => {
    if (name === undefined) {
      if (solved.bodies.size === 1) return [...solved.bodies.values()][0];
      // hệ 2 vật: gia tốc/hệ chung — trả vật bất kỳ (|a| chung).
      return [...solved.bodies.values()][0];
    }
    const b = solved.bodies.get(name);
    if (!b) throw new Error(`không có vật tên "${name}"`);
    return b;
  };
  const reqG = (): { s: Scalar; n: number } => {
    if (solved.g === undefined || solved.gN === undefined) throw new Error('cần g cho đại lượng này — bổ sung "g" vào plan');
    return { s: solved.g, n: solved.gN };
  };
  const reqMass = (b: BodyState): { s: Scalar; n: number } => {
    if (!b.hasMass || b.m === undefined || b.mN === undefined) throw new Error(`cần khối lượng của "${b.name}" cho đại lượng này`);
    return { s: b.m, n: b.mN };
  };
  const reqA = (b: BodyState): { s: Scalar; n: number } => {
    if (b.blockReason) throw new Error(b.blockReason); // thiếu g/mass — báo lỗi rõ 1 dòng
    if (b.a === undefined || b.aN === undefined) throw new Error(`chưa giải được gia tốc của "${b.name}"`);
    return { s: b.a, n: b.aN };
  };

  try {
    switch (query.kind) {
      case 'acceleration': {
        const b = bodyByName(query.of);
        const a = reqA(b);
        return { ok: true, answer: mkAns('acceleration', a.s, a.n, 'm/s²', query.label), checks: [] };
      }
      case 'force_value': {
        const b = bodyByName(query.on);
        if (query.force === 'weight') {
          reqG(); const m = reqMass(b);
          const w = b.weight ?? mul(m.s, solved.g as Scalar); const wN = b.weightN ?? m.n * (solved.gN as number);
          return { ok: true, answer: mkAns('force_value', w, wN, 'N', query.label), checks: [] };
        }
        if (query.force === 'friction') {
          if (b.config === 'hanging') return { ok: false, problem: `vật treo "${b.name}" không có ma sát` };
          reqG(); reqMass(b);
          const f = b.friction ?? ZERO; const fN = b.frictionN ?? 0;
          return { ok: true, answer: mkAns('force_value', f, fN, 'N', query.label), checks: [] };
        }
        if (query.force === 'net') {
          const m = reqMass(b); const a = reqA(b);
          const net = mul(m.s, a.s); const netN = m.n * a.n;
          // Hợp lực = ĐỘ LỚN.
          const netMag = netN < 0 ? neg(net) : net; const netMagN = Math.abs(netN);
          return { ok: true, answer: mkAns('force_value', netMag, netMagN, 'N', query.label), checks: [] };
        }
        // tension
        if (b.tension === undefined || b.tensionN === undefined) return { ok: false, problem: `vật "${b.name}" không nằm trong dây — không có lực căng` };
        return { ok: true, answer: mkAns('force_value', b.tension, b.tensionN, 'N', query.label), checks: [] };
      }
      case 'normal_force': {
        const b = bodyByName(query.on);
        if (b.config === 'hanging') return { ok: false, problem: `vật treo "${b.name}" không có phản lực pháp tuyến` };
        reqG(); reqMass(b);
        if (b.N === undefined || b.NN === undefined) return { ok: false, problem: `chưa lập được phản lực của "${b.name}"` };
        return { ok: true, answer: mkAns('normal_force', b.N, b.NN, 'N', query.label), checks: [] };
      }
      case 'min_force_to_move': {
        const b = bodyByName(query.on);
        if (b.config !== 'ngang') return { ok: false, problem: `min_force_to_move v1 chỉ cho mặt ngang (vật "${b.name}")` };
        if (!b.hasMu) return { ok: false, problem: `vật "${b.name}" nhẵn (không mu) — không có ngưỡng trượt` };
        reqG(); const m = reqMass(b);
        // α = 0 (schema chặn): F_min = μmg/(cos0 + μ·sin0) = μmg.
        const fmin = mul(b.mu, mul(m.s, solved.g as Scalar)); const fminN = b.muN * m.n * (solved.gN as number);
        const chk: Check[] = [{ kind: 'static_threshold', detail: `F_min = μmg = ${fminN.toFixed(2)} N (ngưỡng bắt đầu trượt, α = 0)`, residual: 0, pass: true }];
        return { ok: true, answer: mkAns('min_force_to_move', fmin, fminN, 'N', query.label), checks: chk };
      }

      // ── Kế thừa động học (handoff Quad) ──
      case 'velocity_at': {
        const b = bodyByName(query.of); const a = reqA(b);
        const t = query.t; const chk: Check[] = [];
        let vS: Scalar, vN: number;
        if (b.tStop !== null && t > b.tStop + 1e-9) {
          vS = ZERO; vN = 0;
          chk.push({ kind: 'stop_domain', detail: `vật đã dừng tại t = ${b.tStop.toFixed(4)} s, giữ nguyên (v = 0)`, residual: 0, pass: true });
        } else {
          vS = add(b.v0, mul(a.s, scalarFromNumber(t))); vN = b.v0N + a.n * t;
          chk.push(resCheck('kinematic_back', `v(${t}) = v0 + a·t`, sub(vS, add(b.v0, mul(a.s, scalarFromNumber(t)))), Math.max(1, Math.abs(vN))));
        }
        return { ok: true, answer: mkAns('velocity_at', vS, vN, 'm/s', query.label), checks: chk, tSolved: t };
      }
      case 'position_at': {
        const b = bodyByName(query.of); const a = reqA(b); const q = b.quad as Quad;
        const t = query.t; const chk: Check[] = [];
        let xS: Scalar, xN: number, tEff = t;
        if (b.tStop !== null && t > b.tStop + 1e-9) {
          tEff = b.tStop; xS = evalQuadS(q, scalarFromNumber(b.tStop)); xN = b.v0N * b.tStop + 0.5 * a.n * b.tStop * b.tStop;
          chk.push({ kind: 'stop_domain', detail: `vật đã dừng tại t = ${b.tStop.toFixed(4)} s, giữ nguyên vị trí s_dừng`, residual: 0, pass: true });
        } else {
          xS = evalQuadS(q, scalarFromNumber(t)); xN = b.v0N * t + 0.5 * a.n * t * t;
        }
        return { ok: true, answer: mkAns('position_at', xS, xN, 'm', query.label), checks: chk, tSolved: tEff };
      }
      case 'time_when': {
        const b = bodyByName(query.of); const a = reqA(b); const q = b.quad as Quad;
        // Sau dừng vĩnh viễn: position > s_dừng ⇒ không bao giờ đạt (DY-5), không serve nghiệm parabol ma.
        if (b.tStop !== null) {
          const sStopN = b.v0N * b.tStop + 0.5 * a.n * b.tStop * b.tStop;
          if (query.position > sStopN + 1e-9) return { ok: false, problem: `vật dừng tại s_dừng = ${sStopN.toFixed(4)} m, không bao giờ đạt vị trí ${query.position} m — kiểm tra lại đề/plan` };
        }
        const roots = rootsFor(q, scalarFromNumber(query.position));
        const t = posRootsPositive(roots);
        if (t === null) return { ok: false, problem: `không có thời điểm dương để vật ở vị trí ${query.position} m` };
        const chk = [resCheck('kinematic_back', `x(t) = ${query.position}`, sub(evalQuadS(q, t), scalarFromNumber(query.position)), Math.max(1, query.position))];
        return { ok: true, answer: mkAns('time_when', t, t.approx, 's', query.label), checks: chk, tSolved: t.approx };
      }
      case 'time_when_velocity': {
        const b = bodyByName(query.of); const a = reqA(b);
        if (Math.abs(a.n) < 1e-12) return { ok: false, problem: `gia tốc bằng 0 — không xác định thời điểm đạt tốc độ` };
        const vStar = qtyVelocity(query.value, query.vUnit, SI); const vStarN = query.value * (query.vUnit === 'km/h' ? 5 / 18 : 1);
        const t = div(sub(vStar, b.v0), a.s); const tN = (vStarN - b.v0N) / a.n;
        if (tN < -1e-9) return { ok: false, problem: `tốc độ ${query.value} ${query.vUnit} đạt ở thời điểm âm — ngoài miền` };
        const chk = [resCheck('kinematic_back', `v(t) = ${query.value} ${query.vUnit}`, sub(add(b.v0, mul(a.s, t)), vStar), Math.max(1, Math.abs(vStarN)))];
        return { ok: true, answer: mkAns('time_when_velocity', t, tN, 's', query.label), checks: chk, tSolved: Math.max(0, tN) };
      }
      case 'velocity_after_distance': {
        const b = bodyByName(query.of); const a = reqA(b);
        // v = √(v0² + 2·a·s)
        const inner = add(mul(b.v0, b.v0), mul(mul(rat(2n), a.s), scalarFromNumber(query.distance)));
        const innerN = b.v0N * b.v0N + 2 * a.n * query.distance;
        if (innerN < -1e-9) return { ok: false, problem: `v0² + 2as = ${innerN.toFixed(4)} < 0 — vật không đạt tới quãng đường ${query.distance} m` };
        const vS = sqrt(inner); const vN = Math.sqrt(Math.max(0, innerN));
        const chk = [resCheck('kinematic_back', `v² = v0² + 2as`, sub(mul(vS, vS), inner), Math.max(1, Math.abs(innerN)))];
        return { ok: true, answer: mkAns('velocity_after_distance', vS, vN, 'm/s', query.label), checks: chk };
      }
      case 'distance_to_stop': {
        const b = bodyByName(query.of); const a = reqA(b);
        // Đòi a ngược chiều v0 (a < 0 khi v0 > 0). s = v0²/(2|a|).
        if (!(a.n < 0 && b.v0N > 0)) return { ok: false, problem: `vật không dừng (a = ${a.n.toFixed(4)} m/s² không hãm chuyển động) — không có quãng đường dừng` };
        const absA = neg(a.s); const absAN = -a.n;
        const s = div(mul(b.v0, b.v0), mul(rat(2n), absA)); const sN = (b.v0N * b.v0N) / (2 * absAN);
        const chk = [resCheck('kinematic_back', `s·2|a| = v0²`, sub(mul(s, mul(rat(2n), absA)), mul(b.v0, b.v0)), Math.max(1, b.v0N * b.v0N))];
        return { ok: true, answer: mkAns('distance_to_stop', s, sN, 'm', query.label), checks: chk, tSolved: -b.v0N / a.n };
      }
      default: {
        query satisfies never;
        return { ok: false, problem: `query kind không hỗ trợ: ${(query as { kind: string }).kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: (e as Error).message };
  }
}
