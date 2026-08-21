// scripts/prompt-opt/translate.mjs
// Hai "nhà cung cấp" bước DỊCH đề → plan, dùng chung một giao diện: translate(item, prompt, genome) → plan
// (ném lỗi nếu dịch hỏng / abstain). Fitness bọc try/catch + đo thời gian ở ngoài.
//
//  • provider 'vilao' — GỌI LLM THẬT qua đường sản xuất (planFromProblem, đã cho phép override
//    systemPrompt). Cần VILAO_API_KEY. TỐN PHÍ.
//  • provider 'mock'  — GIẢ LẬP TẤT ĐỊNH, OFFLINE, 0 ĐỒNG. Dùng để KIỂM THỬ cỗ máy tiến hoá và
//    dựng "đường cong fitness" mà không đốt tiền API. KHÔNG phải kết quả khoa học — chỉ là self-test.
//    Quy tắc: một ca coi như "dịch đúng" nếu genome BẬT đủ các gene mà ca đó CẦN (requiredTags);
//    khi đó trả về chính `plan` golden (⇒ engine cho đáp đúng). Ngược lại ⇒ ném "thiếu gene".
import { activeTags } from './genome.mjs';

// ---- MOCK: bản đồ "ca cần gene nào" (tất định, suy từ id/đáp) ----
export function requiredTags(item) {
  const id = String(item.id || '');
  const t = ['json-only']; // mọi ca đều cần "chỉ in JSON" để parse được (giả lập lỗi parsing)
  if (/vol/.test(id)) t.push('integer-coords'); // bài thể tích: cần toạ độ gọn
  if (/dist/.test(id)) t.push('verify-asserts'); // bài khoảng cách: cần tự soát ràng buộc
  if ((item.expect?.answers?.length || 0) > 1) t.push('queries-list'); // nhiều câu hỏi
  return t;
}

export function makeTranslator({ provider = 'mock', apiKey = null, model = null, timeoutMs = 25000 } = {}) {
  if (provider === 'mock') {
    return async function translateMock(item, _prompt, genome) {
      const tags = activeTags(genome);
      const need = requiredTags(item);
      const missing = need.filter((t) => !tags.includes(t));
      if (missing.length > 0) {
        throw new Error('mock: thiếu gene ' + missing.join(','));
      }
      return item.plan; // "dịch đúng" ⇒ trả plan golden
    };
  }
  if (provider === 'vilao') {
    // Nạp động để môi trường mock/offline KHÔNG cần build kernel-dist mới import được.
    const mod = import('../../api/_lib/kernel-bridge/solveWithKernel.js');
    return async function translateVilao(item, prompt, _genome) {
      const { planFromProblem } = await mod;
      return planFromProblem(item.text, { systemPrompt: prompt, apiKey, model, timeoutMs });
    };
  }
  throw new Error('provider không hỗ trợ: ' + provider);
}
