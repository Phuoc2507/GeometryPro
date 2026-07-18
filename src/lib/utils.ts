import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Hiển thị credit: số nguyên -> "200"; số lẻ -> "203,8" (dấu phẩy kiểu VN).
 * Dùng cho số dư ví (có thể lẻ 0,2 sau khi "sửa bằng AI").
 */
export function formatCredits(n: number): string {
  const v = Number(n) || 0;
  if (Number.isInteger(v)) return String(v);
  return v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}
