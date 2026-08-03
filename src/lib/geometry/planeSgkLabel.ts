import { cleanPointLabel } from '@/lib/pointLabel';

/**
 * Đặt tên mặt phẳng kiểu SGK.
 *
 * Nhiều mặt phẳng do AI/producer sinh ra có 4 đỉnh "ẩn danh" đặt theo cùng một
 * chữ gốc kèm dấu phẩy (P, P', P'', P''' …). Hiển thị đủ 4 nhãn đó trông rối và
 * không giống sách giáo khoa — SGK chỉ ghi MỘT nhãn "(P)" cạnh một góc.
 *
 * Hàm này nhận nhãn các đỉnh của một mặt phẳng và trả về CHỮ GỐC ("P") nếu đây
 * là mặt phẳng ẩn danh (mọi đỉnh đều là placeholder cùng chữ gốc). Nếu các đỉnh
 * là điểm có tên thật khác nhau (A, B, C, D…) thì trả null — KHÔNG đụng tới.
 */

/** Nhãn góc là "placeholder" khi chỉ gồm 1 chữ cái + dấu phẩy: P, P', P''… */
function placeholderBase(label: string | undefined | null): string | null {
  const c = cleanPointLabel((label || '').trim());
  return /^[A-Za-z]'*$/.test(c) ? c[0] : null;
}

/**
 * @param cornerLabels nhãn thô của các đỉnh mặt phẳng (theo thứ tự pointIds)
 * @returns chữ gốc SGK ("P") nếu là mặt phẳng ẩn danh; ngược lại null
 */
export function planeSgkName(cornerLabels: (string | undefined | null)[]): string | null {
  if (cornerLabels.length < 3) return null;
  const bases = cornerLabels.map(placeholderBase);
  if (bases.some((b) => b == null)) return null;      // có đỉnh tên thật → bỏ qua
  const first = bases[0]!;
  if (!bases.every((b) => b === first)) return null;   // các đỉnh khác chữ gốc → không ẩn danh
  return first;
}
