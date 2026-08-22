// scripts/smoke-subjects-live.mjs
// SMOKE TEST LIVE tầng LLM: đề chữ THẬT → bộ dịch (callVilao) → engine → đáp, cho mọi chương Lý + Hóa.
// KHÔNG qua route auth (gọi thẳng solvePhysicsProblem/solveChemProblem) — chỉ kiểm bước LLM dịch đề→plan
// mà 1957 test tất định không phủ được. Đáp kỳ vọng ghi sẵn để đối chiếu bằng mắt.
//
// CÁCH CHẠY:
//   1) Cần build bundle trước:            npm run build:kernel
//   2) Cần biến môi trường VILAO_API_KEY, và host api.vilao.ai phải nằm trong allowlist egress
//      (môi trường web: thêm vào network policy rồi mở SESSION MỚI; hoặc chạy ở máy local).
//   VILAO_API_KEY="sk-..." node scripts/smoke-subjects-live.mjs
//
// (Tùy chọn) VILAO_TRANSLATOR_MODEL đổi model dịch; mặc định ram/gemini-3.5-flash-low.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const bridge = resolve(HERE, '../api/_lib/kernel-bridge/solveSubject.js');
const classifier = resolve(HERE, '../api/_lib/kernel-bridge/subjectClassifier.js');
const { solvePhysicsProblem, solveChemProblem } = await import(bridge);
const { classifySubject } = await import(classifier);

if (!process.env.VILAO_API_KEY) {
  console.error('Thiếu VILAO_API_KEY. Chạy: VILAO_API_KEY="sk-..." node scripts/smoke-subjects-live.mjs');
  process.exit(1);
}

const PROBLEMS = [
  ['Lý', 'Một vật rơi tự do từ độ cao 20 m, lấy g = 10 m/s². Tính thời gian vật chạm đất.', 't ≈ 2 s'],
  ['Lý', 'Cho mạch điện gồm điện trở R1 = 4 Ω mắc nối tiếp với R2 = 6 Ω, hiệu điện thế hai đầu đoạn mạch là 12 V. Tính cường độ dòng điện trong mạch.', 'I = 1,2 A'],
  ['Lý', 'Một vật khối lượng 2 kg đặt trên mặt phẳng ngang, chịu lực kéo 10 N theo phương ngang, hệ số ma sát 0,2, lấy g = 10 m/s². Tính gia tốc của vật.', 'a = 3 m/s²'],
  ['Lý', 'Một con lắc lò xo dao động điều hòa với biên độ 4 cm và chu kỳ 0,2 s. Tính tốc độ cực đại của vật.', 'vmax = 40π ≈ 125,7 cm/s'],
  ['Lý', 'Một sóng cơ có bước sóng 40 cm và tần số 500 Hz. Tính tốc độ truyền sóng.', 'v = 200 m/s'],
  ['Lý', 'Một điện tích điểm q = 4·10⁻⁸ C đặt trong chân không. Tính cường độ điện trường tại điểm cách điện tích 3 cm.', 'E = 4·10⁵ V/m'],
  ['Lý', 'Mạch điện xoay chiều RLC nối tiếp gồm R = 100 Ω, cuộn cảm L = 1/π H, tụ điện C = 10⁻⁴/π F. Đặt vào hai đầu mạch điện áp u = 200√2·cos(100πt) V. Tính tổng trở của mạch.', 'Z = 100 Ω'],
  ['Lý', 'Một lượng khí lí tưởng ở nhiệt độ 27°C, áp suất 1 atm, thể tích 3 lít. Nén đẳng nhiệt lượng khí đến thể tích 1 lít. Tính áp suất khí sau khi nén.', 'p₂ = 3 atm'],
  ['Hóa', 'Hòa tan hoàn toàn 5,4 gam Al trong dung dịch HCl dư. Tính thể tích khí H2 thu được ở điều kiện tiêu chuẩn (đktc).', 'V(H2) = 6,72 L'],
  ['Hóa', 'Đốt cháy hoàn toàn một hiđrocacbon A thu được 8,8 gam CO2 và 5,4 gam H2O. Tỉ khối hơi của A so với H2 bằng 15. Tìm công thức phân tử của A.', 'C2H6'],
];

const short = (s, n = 68) => (s.length > n ? s.slice(0, n) + '…' : s);
let ok = 0;
for (const [tag, problem, expect] of PROBLEMS) {
  const subj = classifySubject(problem);
  let out;
  try {
    out = subj === 'chem' ? await solveChemProblem(problem) : await solvePhysicsProblem(problem);
  } catch (e) {
    console.log(`\n[${tag}] ${short(problem)}\n  ✗ NÉM: ${e.message}`);
    continue;
  }
  const chapter = out.chapter ? `/${out.chapter}` : '';
  const status = out.ok ? '✓ ok' : out.abstained ? '⚠ abstain' : '✗ ok:false';
  if (out.ok) ok++;
  const ans = (out.answers || []).map((a) => `${a.label ? a.label + ': ' : ''}${a.text ?? a.exact ?? a.approx}${a.unit ? ' ' + a.unit : ''}`).join(' | ');
  const err = out.ok ? '' : `  (${(out.errors || [])[0]?.message || (out.violations || [])[0]?.message || (out.violations || [])[0]?.detail || '?'})`;
  console.log(`\n[${tag} ${out.subject}${chapter}] ${short(problem)}`);
  console.log(`  ${status} | KỲ VỌNG: ${expect}`);
  console.log(`  ĐÁP: ${ans || '(không)'}${err}`);
}
console.log(`\n=== xong: ${ok}/${PROBLEMS.length} đề ra ok:true (đối chiếu "KỲ VỌNG" bằng mắt để chấm đúng/sai) ===`);
