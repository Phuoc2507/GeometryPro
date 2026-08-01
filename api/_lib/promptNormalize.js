// api/_lib/promptNormalize.js
// Chuẩn hoá đề bài thành KHOÁ so khớp cho "hình chuẩn" (golden_figures).
//
// Nguyên tắc: THẬN TRỌNG — chỉ bỏ khác biệt về ĐỊNH DẠNG (hoa/thường, khoảng
// trắng, unicode), TUYỆT ĐỐI không đụng vào SỐ hay dấu toán học. Trong hình học,
// "cạnh 3" và "cạnh 5" là HAI bài khác nhau; chuẩn hoá quá tay sẽ khiến hai đề
// khác nhau trùng khoá và phục vụ nhầm hình. Vì thế đây thực chất là "khớp gần
// đúng nguyên văn" (bỏ định dạng), KHÔNG phải khớp ngữ nghĩa. Khớp mờ/ngữ nghĩa
// (embedding) để dành cho giai đoạn sau.
//
// Hàm PHẢI tất định và dùng CHUNG cho cả đường GHI (admin duyệt golden) lẫn đường
// ĐỌC (phục vụ) — hai bên lệch chuẩn hoá thì golden sẽ không bao giờ khớp.

/**
 * @param {unknown} s  đề bài thô
 * @returns {string}   khoá đã chuẩn hoá ('' nếu không dùng được)
 */
export function normalizePrompt(s) {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFC')     // gộp tổ hợp dấu tiếng Việt về một dạng chuẩn
    .toLowerCase()         // bỏ khác biệt hoa/thường
    .replace(/\s+/g, ' ')  // gộp mọi khoảng trắng (xuống dòng, tab…) thành một dấu cách
    .trim();
}
