// grader/extract.ts
// Lớp 1 của oracle (design.md §4.2): kéo đáp án ra khỏi văn bản dài của model.

/**
 * Trả về nội dung trong \boxed{...} XUẤT HIỆN CUỐI CÙNG (đã cân ngoặc lồng nhau).
 * Nếu không có \boxed hợp lệ, thử dòng "Đáp án:" / "Kết luận:" / "Answer:" / "ĐS:" cuối cùng.
 * Không có gì → null (KHÔNG đoán bừa).
 */
export function extractBoxed(raw: string): string | null {
  const KEY = '\\boxed{';
  let last: string | null = null;
  let searchFrom = 0;

  // Duyệt mọi lần xuất hiện của "\boxed{", giữ lại cái cuối cùng ĐÓNG NGOẶC CÂN.
  while (true) {
    const start = raw.indexOf(KEY, searchFrom);
    if (start === -1) break;
    let i = start + KEY.length;
    let depth = 1;        // đã mở 1 ngoặc "{" của \boxed
    let out = '';
    while (i < raw.length && depth > 0) {
      const c = raw[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) break;   // gặp "}" đóng của \boxed → dừng, KHÔNG thêm nó vào out
      }
      out += c;
      i++;
    }
    if (depth === 0) last = out.trim();   // chỉ nhận khi ngoặc đóng cân
    searchFrom = start + KEY.length;      // tìm tiếp cái sau
  }
  if (last !== null) return last;

  // Fallback: quét từ dưới lên, tìm dòng mở đầu bằng nhãn đáp án.
  const lines = raw.split(/\r?\n/);
  for (let k = lines.length - 1; k >= 0; k--) {
    const m = lines[k].match(/^\s*(?:Đáp\s*án|Kết\s*luận|Answer|ĐS)\s*[:：]\s*(.+)$/i);
    if (m) return m[1].trim();
  }
  return null;
}
