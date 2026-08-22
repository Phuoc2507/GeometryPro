// api/_lib/kernel-bridge/planPostcheck.js
// HẬU-KIỂM TẤT ĐỊNH (deterministic postcheck) — chốt chặn "không bao giờ sai" đặt GIỮA translator (LLM)
// và engine. Engine tự-kiểm (backsub/assert) chỉ bảo đảm mô hình TỰ NHẤT QUÁN, KHÔNG đối chiếu lại ĐỀ;
// với đề "1 dữ kiện → 1 đáp" (đa số THPT) một plan dịch SAI vẫn ok:true âm thầm. Tầng này so ĐỀ ↔ PLAN
// bằng CHUỖI/REGEX (KHÔNG gọi LLM, không mạng) để bắt các lỗi dịch có hậu quả nặng nhưng tín hiệu chắc.
//
// Hai mức:
//   • REJECT (ok:false, reason) — tín hiệu chắc + sai nặng ⇒ TỪ CHỐI serve, KHÔNG chạy engine.
//   • WARN (warnings[]) — nghi vấn có thể false-positive ⇒ đính mềm vào trace, KHÔNG lật ok.
//
// Luật (theo báo cáo phản biện 2026-08-22-bridge-review.md):
//   B1 [reject] Hóa: lẫn đktc(22,4) ↔ đkc(24,79).
//   B2 [reject] Lý : hỏi độ cao nhưng query position_at/time_when trên projectile/free_fall sai trục.
//   B3 [warn]   Lý : lệch đơn vị km/h giữa đề và plan (nghi tự đổi / bịa unit).
//   B4 [warn]   Lý : đề "chậm dần/hãm phanh" nhưng gia tốc CÙNG dấu vận tốc (đang nhanh dần).
//   B5 [reject] Lý : đề cho gia tốc m/s² nhưng plan chọn hệ nền km/h (a bị hiểu sai ~10⁴ lần).

// Chuẩn hóa NFC (gộp dấu tiếng Việt về một dạng) + lowercase để so chuỗi ổn định.
function norm(text) {
  return String(text == null ? '' : text).normalize('NFC').toLowerCase();
}

// Số thập phân kiểu VN (24.79 → "24,79") cho thông điệp.
function fmtVn(n) {
  return String(n).replace('.', ',');
}

// ── B1 (Hóa) — lẫn điều kiện thể tích mol khí ──────────────────────────────────
// đktc (0°C, 1 atm — chương trình cũ) ⇒ molarVolume PHẢI 22,4.
// đkc  (25°C, 1 bar — GDPT 2018)      ⇒ molarVolume PHẢI 24,79 (default).
// BẪY CHỮ "tiêu": cụm "điều kiện tiêu chuẩn" (đktc) CHỨA chữ "chuẩn" của "điều kiện chuẩn" (đkc).
// Regex /điều kiện chuẩn/ KHÔNG khớp "điều kiện tiêu chuẩn" vì có "tiêu " chen giữa — nên đọc đúng cụm
// đầy đủ. Tương tự "đkc" (đ-k-c) KHÔNG phải chuỗi con của "đktc" (đ-k-t-c). Vẫn kiểm đktc TRƯỚC cho chắc.
const DKTC_RE = /đktc|điều kiện tiêu chuẩn|0\s*°?\s*c\s*,?\s*1\s*atm/;
const DKC_RE = /đkc|điều kiện chuẩn|25\s*°?\s*c\s*,?\s*1\s*bar/;

export function postcheckChem(problemText, plan) {
  const t = norm(problemText);
  const mv = (plan && plan.molarVolume != null) ? plan.molarVolume : 24.79; // schema default = 24,79

  const dktc = t.match(DKTC_RE);
  const dkc = t.match(DKC_RE);
  const hasDktc = !!dktc;
  const hasDkc = !!dkc;

  // Chiều 1: đề nói đktc mà molarVolume ≠ 22,4 (kể cả default 24,79) → nghi lấy nhầm đkc.
  if (hasDktc && mv !== 22.4) {
    return {
      ok: false,
      reason: `Nghi lẫn đktc(22,4)/đkc(24,79) — đề nói '${dktc[0]}' (đktc ⇒ 22,4) nhưng plan dùng molarVolume ${fmtVn(mv)}`,
    };
  }
  // Chiều 2: đề nói đkc (KHÔNG có "tiêu") mà molarVolume = 22,4 → nghi lấy nhầm đktc.
  if (hasDkc && !hasDktc && mv === 22.4) {
    return {
      ok: false,
      reason: `Nghi lẫn đktc(22,4)/đkc(24,79) — đề nói '${dkc[0]}' (đkc ⇒ 24,79) nhưng plan dùng molarVolume 22,4`,
    };
  }
  return { ok: true, warnings: [] };
}

// ── Vật lý — tiện ích ───────────────────────────────────────────────────────────
function opByName(plan) {
  const map = new Map();
  for (const op of (plan && plan.ops) || []) {
    if (op && typeof op.name === 'string') map.set(op.name, op);
  }
  return map;
}

// Gom mọi giá trị *Unit trên ops + queries + assert-queries (để soi 'km/h').
function collectUnitValues(plan) {
  const vals = [];
  const push = (obj, keys) => {
    for (const k of keys) if (obj && obj[k]) vals.push(obj[k]);
  };
  for (const op of (plan && plan.ops) || []) push(op, ['v0Unit', 'xUnit', 'tUnit']);
  for (const q of (plan && plan.queries) || []) push(q, ['tUnit', 'xUnit', 'vUnit']);
  for (const a of (plan && plan.asserts) || []) push(a && a.query, ['tUnit', 'xUnit', 'vUnit']);
  return vals;
}

// B2: đề hỏi ĐỘ CAO. "độ cao" phủ luôn "độ cao nào"; thêm "cao bao nhiêu"/"lên cao".
const HEIGHT_RE = /độ cao|cao bao nhiêu|lên cao/;
// B4: đề mô tả CHẬM DẦN (a ngược dấu v0).
const DECEL_RE = /chậm dần|hãm phanh|giảm tốc/;
// B5: gia tốc theo m/s² (chấp cả "m/s2", "m/s^2").
const ACCEL_MS2_RE = /m\/s(?:²|2|\^2)/;

export function postcheckPhysics(problemText, plan) {
  const t = norm(problemText);
  const ops = opByName(plan);
  const units = (plan && plan.units) || {};
  const baseLen = units.length;
  const baseTime = units.time;

  // ── REJECTS ─────────────────────────────────────────────────────────────────
  // B5 — đề cho a m/s² nhưng hệ nền km/h ⇒ a hiểu theo hệ nền (km/h² …) sai ~10⁴ lần.
  if (ACCEL_MS2_RE.test(t) && (baseTime === 'h' || baseLen === 'km')) {
    return {
      ok: false,
      reason: `Đề cho gia tốc theo m/s² nhưng plan chọn hệ nền ${baseLen || '?'}-${baseTime || '?'} — gia tốc sẽ bị engine hiểu theo hệ nền (sai ~10⁴ lần). Hệ nền BẮT BUỘC m-s khi đề có a/g m/s².`,
    };
  }

  // B2 — hỏi độ cao nhưng position_at/time_when trên vật ném/rơi giải SAI TRỤC.
  //   projectile: mainAxis mặc định 'x' (ngang) ⇒ thiếu axis:'y' hoặc axis:'x' đều SAI khi hỏi độ cao.
  //   free_fall : mainAxis mặc định 'y' (đứng)  ⇒ thiếu axis vẫn ĐÚNG (không reject); chỉ axis:'x' mới SAI.
  //   → dùng "trục hiệu dụng" (query.axis ?? mainAxis) để KHÔNG reject nhầm plan free_fall đúng.
  if (HEIGHT_RE.test(t)) {
    for (const q of (plan && plan.queries) || []) {
      if (q.kind !== 'position_at' && q.kind !== 'time_when') continue;
      const op = ops.get(q.of);
      if (!op) continue;
      if (op.op === 'projectile') {
        const eff = q.axis == null ? 'x' : q.axis; // mainAxis(projectile) = 'x'
        if (eff !== 'y') {
          return {
            ok: false,
            reason: `Hỏi độ cao nhưng query ${q.kind} (of "${q.of}", projectile) thiếu axis:'y' (trục hiệu dụng '${eff}') — engine sẽ giải TRỤC NGANG, ra đáp sai.`,
          };
        }
      } else if (op.op === 'free_fall') {
        const eff = q.axis == null ? 'y' : q.axis; // mainAxis(free_fall) = 'y'
        if (eff !== 'y') {
          return {
            ok: false,
            reason: `Hỏi độ cao nhưng query ${q.kind} (of "${q.of}", free_fall) đặt axis:'${eff}' thay vì 'y' — engine sẽ giải sai trục.`,
          };
        }
      }
    }
  }

  // ── WARNINGS (không lật ok) ──────────────────────────────────────────────────
  const warnings = [];

  // B3 — lệch đơn vị km/h giữa đề và plan.
  const hasKmhText = /km\/h/.test(t);
  const unitVals = collectUnitValues(plan);
  const hasKmhUnit = unitVals.includes('km/h');
  const baseIsKmH = baseLen === 'km' && baseTime === 'h'; // km/h nằm ngầm trong hệ nền ⇒ khỏi khai *Unit
  if (hasKmhText && !hasKmhUnit && !baseIsKmH) {
    warnings.push(
      "Đề chứa 'km/h' nhưng plan không khai *Unit='km/h' và hệ nền không phải km-h — nghi LLM tự đổi km/h→m/s (sai 3,6 lần nếu engine đổi tiếp).",
    );
  }
  if (hasKmhUnit && !hasKmhText) {
    warnings.push("Plan khai đơn vị 'km/h' nhưng đề KHÔNG chứa 'km/h' — nghi đơn vị bịa.");
  }

  // B4 — "chậm dần/hãm phanh" nhưng a cùng dấu v0 (đang nhanh dần).
  if (DECEL_RE.test(t)) {
    for (const op of (plan && plan.ops) || []) {
      if (op.op !== 'mover1d') continue;
      const v0 = Number(op.v0);
      const a = Number(op.a == null ? 0 : op.a);
      if (v0 !== 0 && a !== 0 && Math.sign(v0) === Math.sign(a)) {
        warnings.push(
          `Đề "chậm dần/hãm phanh" nhưng mover1d "${op.name}" có a=${a} CÙNG DẤU v0=${v0} (đang nhanh dần) — nghi sai dấu gia tốc.`,
        );
      }
    }
  }

  return { ok: true, warnings };
}

// Điểm vào chung theo môn (tiện cho solveSubject nối 1 chỗ).
export function postcheckPlan(subject, problemText, plan) {
  if (subject === 'physics') return postcheckPhysics(problemText, plan);
  if (subject === 'chem') return postcheckChem(problemText, plan);
  return { ok: true, warnings: [] };
}
