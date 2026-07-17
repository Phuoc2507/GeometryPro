// api/_lib/kernelVerify.js
// Kiểm hình do LLM vẽ bằng ENGINE TẤT ĐỊNH — thay cho constraintVerify.js (spawn Python, file .py
// chưa từng tồn tại ⇒ luôn thất bại im lặng và trả confidence bịa 0.5).
//
// Cách làm: dựng một plan `oxyz_point` từ chính toạ độ LLM đưa ra, rồi để run() của engine kiểm các
// assert CÓ CẤU TRÚC mà Pass 1 khai báo. Không cần export thêm gì từ kernel — dùng lại đúng đường đã
// có 397 test chống lưng.
//
// Nguyên tắc THÀ IM LẶNG CÒN HƠN NÓI SAI:
//  - Không có assert cấu trúc ⇒ trả verified:false (KHÔNG bịa confidence).
//  - Điểm/assert nào engine không hiểu ⇒ tính là "không kiểm được", KHÔNG tính là vi phạm.
//  - Chỉ báo vi phạm khi engine thật sự bắt được.

// Grammar tên điểm của engine: một chữ HOA + số + phẩy (A, B, S, A1, A').
const POINT_NAME = /^[A-Z]\d*'?$/;

/**
 * @param {Array<{id:string,x:number,y:number,z:number}>} points  điểm LLM đã vẽ
 * @param {Array<{relation:string,args:string[],value?:number}>} asserts  ràng buộc CÓ CẤU TRÚC từ Pass 1
 * @returns {Promise<{verified:boolean, ok:boolean, confidence:number|null, violations:object[],
 *                    checked:number, skipped:number, reason?:string}>}
 */
export async function verifyWithKernel(points, asserts) {
  const NOT_VERIFIED = (reason) => ({
    verified: false, ok: true, confidence: null, violations: [], checked: 0, skipped: 0, reason,
  });

  if (!Array.isArray(asserts) || asserts.length === 0) return NOT_VERIFIED('no_structured_constraints');
  if (!Array.isArray(points) || points.length === 0) return NOT_VERIFIED('no_points');

  let run;
  try {
    // Nạp ĐỘNG: kernel-dist là sản phẩm build; thiếu nó thì bỏ qua chứ không giết route.
    ({ run } = await import('./kernel-dist/index.mjs'));
  } catch (e) {
    return NOT_VERIFIED('kernel_unavailable: ' + (e?.message || 'import failed'));
  }

  // Chỉ nhận điểm có tên hợp grammar engine và toạ độ là số hữu hạn.
  const usable = points.filter(
    (p) => p && POINT_NAME.test(String(p.id))
      && [p.x, p.y, p.z].every((v) => Number.isFinite(Number(v))),
  );
  if (usable.length === 0) return NOT_VERIFIED('no_usable_point_names');
  const known = new Set(usable.map((p) => String(p.id)));

  // Chỉ giữ assert mà MỌI token đều dựng được từ các điểm đã biết ("AB"=đường, "ABC"=mặt).
  const tokenOk = (tok) => {
    const s = String(tok);
    if (known.has(s)) return true;                      // tên điểm
    const parts = s.match(/[A-Z]\d*'?/g);               // token ghép: AB, ABCD...
    return !!parts && parts.join('') === s && parts.length >= 2 && parts.every((t) => known.has(t));
  };
  const keep = [];
  let skipped = 0;
  for (const a of asserts) {
    if (a && typeof a.relation === 'string' && Array.isArray(a.args) && a.args.every(tokenOk)) keep.push(a);
    else skipped++;
  }
  if (keep.length === 0) return { ...NOT_VERIFIED('no_checkable_constraints'), skipped };

  const plan = {
    solidName: 'verify',
    ops: usable.map((p) => ({ op: 'oxyz_point', name: String(p.id), at: [Number(p.x), Number(p.y), Number(p.z)] })),
    asserts: keep,
    queries: [],
  };

  let res;
  try {
    res = run(plan);
  } catch (e) {
    return { ...NOT_VERIFIED('kernel_threw: ' + (e?.message || 'unknown')), skipped };
  }
  // Plan sai schema ⇒ engine trả errors và KHÔNG có assert nào chạy ⇒ coi như không kiểm được.
  if (res.errors?.length > 0 && res.violations.length === 0 && !res.entities?.points?.size) {
    return { ...NOT_VERIFIED('plan_rejected: ' + (res.errors[0]?.message || '')), skipped };
  }

  const checked = keep.length;
  const violations = res.violations || [];
  return {
    verified: true,
    ok: violations.length === 0,
    confidence: checked > 0 ? (checked - violations.length) / checked : null,
    violations,
    checked,
    skipped,
  };
}
