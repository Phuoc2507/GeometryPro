// id.ts — sinh & kiểm mã định danh của một bài seed.
// Mã có dạng "vsgeo-" + 4 chữ số đệm 0, ví dụ vsgeo-0001, vsgeo-0300.
// Vì sao đệm 0 tới 4 chữ số? Để khi liệt kê file theo thứ tự chữ cái,
// chúng cũng tự sắp đúng theo thứ tự số (0002 đứng trước 0010).

// Biểu thức chính quy (regex) khớp đúng một mã hợp lệ:
//  ^      = đầu chuỗi (không cho ký tự lạ đứng trước)
//  vsgeo- = tiền tố cố định
//  \d{4}  = đúng 4 chữ số
//  $      = cuối chuỗi (không cho ký tự lạ, kể cả khoảng trắng, đứng sau)
const SEED_ID_RE = /^vsgeo-\d{4}$/;

/** Sinh mã bài từ số thứ tự (1..9999). makeSeedId(1) === "vsgeo-0001". */
export function makeSeedId(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9999) {
    throw new Error(`Số thứ tự phải là số nguyên trong khoảng 1..9999, nhận: ${n}`);
  }
  // padStart(4, "0"): "1" -> "0001", "137" -> "0137".
  return `vsgeo-${String(n).padStart(4, "0")}`;
}

/** Kiểm một chuỗi có đúng định dạng mã bài không. */
export function isValidSeedId(id: string): boolean {
  return SEED_ID_RE.test(id);
}
