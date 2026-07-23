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
      result = raw.slice(contentStart, i).trim();  // chỉ nhận khi ngoặc đóng cân; ghi đè => giữ CUỐI
    }
    // LUÔN nhích qua marker này rồi quét tiếp — kể cả khi ngoặc KHÔNG đóng cân. Một \boxed{
    // hỏng/bị cắt cụt ở phía TRƯỚC không được che mất \boxed{...} hợp lệ phía SAU (khớp cách
    // grader/extract.ts làm; bộ tự-phản-biện phát hiện bản cũ `break` làm mất box sau).
    // contentStart > start nên indexOf lần sau luôn tiến => không lặp vô tận.
    searchFrom = contentStart;
  }
  return result;
}
