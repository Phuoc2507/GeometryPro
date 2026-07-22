// Pass -1 của Advance: CHÉP đề từ ẢNH ra CHỮ bằng model vision rẻ (gemini-3.5-flash-low),
// KHÔNG giải, KHÔNG thêm bớt. Có chữ rồi thì toàn bộ pipeline Advance (tách câu + coverageCheck
// chống-ảo-giác + dịch) chạy y như nhập-chữ. Không dùng OCR engine (model vision đọc ảnh tốt hơn).
import { callVilao } from '../vilao.js';

const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL || 'ram/gemini-3.5-flash-low';
const TRANSCRIBE_API_KEY = process.env.TRANSCRIBE_API_KEY || process.env.ADVANCE_API_KEY || undefined;

const TRANSCRIBE_PROMPT = `Bạn là công cụ CHÉP ĐỀ TOÁN từ ảnh sang chữ.
Đọc ảnh và chép LẠI TOÀN BỘ đề bài, GIỮ NGUYÊN: mọi số liệu, độ dài, tỉ lệ; mọi ký hiệu (mp(SBC), //, ⊥, √, phân số, số mũ, chỉ số dưới); tên điểm/đường/mặt; và thứ tự đầy đủ các câu (a, b, c...).
TUYỆT ĐỐI KHÔNG giải, KHÔNG thêm nhận xét, KHÔNG bỏ sót dữ kiện. Chỉ trả về đúng nội dung đề bằng chữ.`;

export async function transcribeImage(imageBase64, opts = {}) {
  const raw = await callVilao(TRANSCRIBE_PROMPT, 'Chép đề trong ảnh đính kèm.', {
    model: opts.transcribeModel || TRANSCRIBE_MODEL,
    apiKey: opts.transcribeApiKey || TRANSCRIBE_API_KEY,
    imageBase64,          // đúng tên opt callVilao nhận (vilao.js: options.imageBase64 → messages image_url)
    maxTokens: 2048,
    timeoutMs: 30000,
  });
  return String(raw || '').trim();
}
