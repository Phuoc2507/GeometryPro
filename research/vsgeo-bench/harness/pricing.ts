// Bảng giá mỗi model: USD cho MỖI 1 TRIỆU token.
// ĐÂY LÀ CẤU HÌNH — hãy cập nhật theo bảng giá hiện hành của nhà cung cấp trước khi chạy thật.
// Khoá là modelId ĐẦY ĐỦ (có tiền tố nhà cung cấp), vd "openai:gpt-5.6".
export interface PriceRow { inPer1M: number; outPer1M: number }

export const PRICING: Record<string, PriceRow> = {
  // Model demo chỉ dùng cho test (đừng xoá — pricing.test.ts dựa vào nó):
  "test:demo": { inPer1M: 1.0, outPer1M: 2.0 },

  // Ví dụ giá tham chiếu (SỐ MINH HOẠ — chỉnh lại theo thời giá thật):
  "openai:gpt-5.6": { inPer1M: 2.5, outPer1M: 10.0 },
  "gemini:gemini-2.5-pro": { inPer1M: 1.25, outPer1M: 5.0 },
  "gemini:gemini-2.5-flash": { inPer1M: 0.15, outPer1M: 0.6 },
  "anthropic:claude-opus-4-8": { inPer1M: 5.0, outPer1M: 25.0 },
  "openrouter:qwen/qwen-2.5-72b-instruct": { inPer1M: 0.4, outPer1M: 0.4 },
};

// Nhận usage token, trả chi phí USD; trả undefined nếu không đủ dữ liệu để tính.
// KHÔNG đoán bừa: model lạ hoặc thiếu usage => undefined (để dòng log ghi trống, minh bạch).
export function estimateCostUsd(
  modelId: string,
  usage?: { in: number; out: number }
): number | undefined {
  if (!usage) return undefined;
  const row = PRICING[modelId];
  if (!row) return undefined;
  return (usage.in / 1_000_000) * row.inPer1M + (usage.out / 1_000_000) * row.outPer1M;
}
