// Lưới coverage TẤT ĐỊNH cho bước "tách đề" (chống ảo giác tách đề).
//
// Token "quan trọng" của đề gốc = số (nguyên/thập phân) + tên điểm (chữ IN HOA đơn,
// có thể kèm phẩy '), kể cả dính chùm "ABCD" → A,B,C,D. Bỏ dấu tiếng Việt khi so khớp
// để không lệ thuộc cách gõ. Mọi token đó phải xuất hiện trong ít nhất một part
// (gộp `hoi` + `phan_tu_moi`); nếu thiếu → coverage FAIL → KHÔNG serve đa-cảnh.
// Triết lý "thà thừa hơn thiếu": token rác chỉ làm gate khó pass hơn (an toàn).

const noAccent = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

// Chữ IN HOA hay mở đầu một TỪ thường (vd "C" trong "Cho", "T" trong "Tính") → token rác.
// Chỉ loại khi chữ hoa DÍNH LIỀN chữ thường ngay sau nó (vd "Cho" = C+h+o),
// KHÔNG loại khi sau nó là dấu cách/dấu câu/chữ hoa (vd "M của SC", "tính V").
const STOP = new Set(['C', 'T', 'G', 'B', 'H', 'V', 'M', 'D']);

export function extractTokens(text) {
  const t = noAccent(text);
  const nums = (t.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => x.replace(',', '.'));
  const pts = [];
  const re = /[A-Z]'?/g; // A, B, S, M, A'; "ABCD" → A,B,C,D
  let m;
  while ((m = re.exec(t)) !== null) {
    const tok = m[0];
    const next = t[m.index + tok.length]; // ký tự NGAY SAU match hiện tại (đúng vị trí)
    if (STOP.has(tok[0]) && next && /[a-z]/.test(next)) continue; // "C" trong "Cho" → bỏ
    pts.push(tok);
  }
  return [...new Set([...nums, ...pts])];
}

// LƯU Ý 1: soi cả `setup` (phần dựng hình chung) LẪN `parts` — kích thước/toạ độ của đề
// thường nằm ở setup, không trong câu hỏi. Chỉ soi parts sẽ loại oan (vd "cạnh 2a" ở setup).
// LƯU Ý 2: so khớp theo TẬP TOKEN (không phải substring). Substring có lỗ hổng: token "2" bị nuốt
// vẫn "được phủ" nếu "12" xuất hiện ở nơi khác → serve bài đa-cảnh thiếu ràng buộc → engine có thể
// bịa đáp verified-sai. Tách haystack thành cùng loại token rồi kiểm THÀNH VIÊN TẬP.
export function coverageCheck(originalText, parts, setup = '') {
  const blob = [String(setup || '')]
    .concat((parts || []).map((p) => `${p.hoi || ''} ${JSON.stringify(p.phan_tu_moi || [])}`))
    .join(' ');
  const have = new Set(extractTokens(blob));
  const missing = extractTokens(originalText).filter((tok) => !have.has(tok));
  return { ok: missing.length === 0, missing };
}
