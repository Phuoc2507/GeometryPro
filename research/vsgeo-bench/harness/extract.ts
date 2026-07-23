// Trích nội dung trong \boxed{...} CUỐI CÙNG của chuỗi.
// Tự đếm ngoặc để xử lý lồng nhau (regex thường không làm được ngoặc lồng).
// Trả null nếu không tìm thấy \boxed{ hợp lệ.
export function extractBoxed(raw: string): string | null {
  const marker = "\\boxed{";
  let result: string | null = null;
  let searchFrom = 0;

  while (true) {
    const start = raw.indexOf(marker, searchFrom);
    if (start === -1) break;               // hết \boxed{ để xét
    const contentStart = start + marker.length;

    // Quét từ contentStart, đếm độ sâu ngoặc để tìm } đóng khớp.
    let depth = 1;
    let i = contentStart;
    for (; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;            // } đóng khớp với \boxed{
      }
    }
    if (depth === 0) {
      result = raw.slice(contentStart, i).trim();  // ghi đè => giữ cái CUỐI
      searchFrom = i + 1;
    } else {
      break;                                // ngoặc không đóng => bỏ, tránh lặp vô tận
    }
  }
  return result;
}
