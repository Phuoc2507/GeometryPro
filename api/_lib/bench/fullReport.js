// api/_lib/bench/fullReport.js
// Phân loại & tổng hợp cho chế độ `bench:gate --full` (chạy CẢ bước LLM dịch đề).
// THUẦN — không I/O, không gọi mạng ⇒ test được mà không tốn một lượt LLM nào.
//
// Vì sao cần riêng một tầng này thay vì dùng thẳng compareCase:
//
//   compareCase chỉ trả 'pass' / 'regress-status' / 'regress-answer' / 'error'.
//   Ở chế độ engine-replay thế là đủ vì chỉ có MỘT khâu có thể sai. Nhưng ở --full
//   có tới BỐN khâu: dịch có thể từ chối, dịch có thể ra JSON sai schema, engine có
//   thể bó tay, engine có thể ra đáp lệch. Cả bốn đều rơi vào 'regress-status' —
//   tức là con số duy nhất đọc được ("hỏng 12/40") KHÔNG nói cho ta biết phải sửa
//   cái gì: sửa prompt dịch, hay vá engine?
//
//   Tách giai đoạn cho ra hai con số khác nhau về bản chất:
//     • tỉ lệ DỊCH ĐƯỢC   → chất lượng prompt/model translator
//     • tỉ lệ ĐÁP ĐÚNG    → chất lượng engine
//
// Và vì bước LLM là NGẪU NHIÊN, một lần chạy là một mẫu chứ không phải sự thật:
// đó là lý do có `--repeat` và có phần thống kê ca KHÔNG ỔN ĐỊNH bên dưới.

/** Các giai đoạn một ca có thể dừng lại. Thứ tự = từ sớm tới muộn trong đường ống. */
export const STAGES = [
  'api-error',
  'translate-abstain',
  'translate-fail',
  'engine-unusable',
  'wrong-answer',
  'error',
  'pass',
];

export const STAGE_LABELS = {
  'pass': 'đúng',
  'wrong-answer': 'đáp lệch (engine)',
  'engine-unusable': 'engine bó tay',
  'translate-fail': 'dịch hỏng (sai JSON/schema)',
  'translate-abstain': 'dịch từ chối (thiếu số liệu/ngoài danh mục)',
  'api-error': 'KHÔNG GỌI ĐƯỢC API (khoá/mạng/quota) — không phải lỗi chất lượng',
  'error': 'văng ngoại lệ',
};

const ABSTAIN_PREFIX = 'translator abstained';

// Lỗi ở tầng VẬN CHUYỂN, không phải model trả về plan tồi. Gộp chung vào
// 'translate-fail' là đánh lừa người đọc: khoá hết hạn / bị chặn / hết quota sẽ hiện
// thành "dịch hỏng 40/40" và người ta đi sửa prompt trong khi prompt chẳng sao cả.
// (Phát hiện đúng bằng cách chạy thật: môi trường chặn miền api.vilao.ai và toàn bộ
// rổ bị gán nhãn "sai JSON/schema".)
const API_ERROR_PATTERNS = [
  'Vilao API error:',            // HTTP 4xx/5xx từ nhà cung cấp
  'Vilao API key is not set',    // thiếu cấu hình
  'Vilao failed after maximum retries',
  'Failed to parse Vilao response',
  'Vilao returned empty content',
  'Request timed out',
];

function isApiError(message) {
  return API_ERROR_PATTERNS.some((p) => message.includes(p));
}

/**
 * Ca này dừng ở đâu?
 * @param {object|null} result  kết quả solveProblem (có thể mang __throw)
 * @param {string} verdict      phán quyết của compareCase cho chính result đó
 * @returns {string} một phần tử của STAGES
 */
export function classifyFullResult(result, verdict) {
  if (result && result.__throw) return 'error';
  if (!result) return 'error';

  // Bước dịch không ra Plan ⇒ engine chưa từng chạy. Phân biệt TỪ CHỐI (hành vi
  // đúng khi đề thiếu số liệu) với DỊCH HỎNG (lỗi thật của translator).
  if (!result.plan) {
    const msg = String(result.errors?.[0]?.message || '');
    if (msg.startsWith(ABSTAIN_PREFIX)) return 'translate-abstain';
    // Chưa gọi được API thì bước dịch CHƯA TỪNG chạy — đừng đổ lỗi cho translator.
    if (isApiError(msg)) return 'api-error';
    return 'translate-fail';
  }

  if (verdict === 'pass') return 'pass';

  // Có Plan nhưng engine không cho ra đáp dùng được.
  // KHÔNG dùng số điểm hình để phán đoán: ca giải tích không dựng hình mà vẫn hợp lệ.
  if (!result.ok || !Array.isArray(result.answers) || result.answers.length === 0) {
    return 'engine-unusable';
  }
  return 'wrong-answer';
}

/** Tỉ lệ, làm tròn 4 chữ số. Mẫu bằng 0 ⇒ 0 chứ không phải NaN. */
function rate(part, total) {
  return total > 0 ? Number((part / total).toFixed(4)) : 0;
}

/**
 * Tổng hợp nhiều lượt chạy thành các con số đọc được.
 *
 * @param {Array<{id:string, run:number, stage:string, detail?:string}>} records
 * @returns {{
 *   totalRuns:number, caseCount:number, repeat:number,
 *   passRate:number, translateRate:number, byStage:Record<string,number>,
 *   perCase:Array<{id:string, runs:number, passes:number, passRate:number, stages:string[]}>,
 *   unstable:Array<{id:string, passes:number, runs:number}>,
 *   worstStages:Array<[string,number]>
 * }}
 */
export function summarizeFull(records) {
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0]));
  const perCaseMap = new Map();

  for (const r of records) {
    byStage[r.stage] = (byStage[r.stage] || 0) + 1;
    if (!perCaseMap.has(r.id)) perCaseMap.set(r.id, { id: r.id, runs: 0, passes: 0, stages: [] });
    const c = perCaseMap.get(r.id);
    c.runs += 1;
    if (r.stage === 'pass') c.passes += 1;
    c.stages.push(r.stage);
  }

  const perCase = [...perCaseMap.values()].map((c) => ({ ...c, passRate: rate(c.passes, c.runs) }));
  perCase.sort((a, b) => a.passRate - b.passRate || a.id.localeCompare(b.id));

  const totalRuns = records.length;
  // "Dịch được" = mọi giai đoạn TỪ engine trở đi. Đây là thước đo của translator,
  // tách hẳn khỏi chuyện engine tính đúng hay sai.
  // Lượt KHÔNG gọi được API không đo được gì cả ⇒ loại khỏi mẫu, không tính là
  // "dịch không được" (sẽ vu oan cho translator).
  const measured = totalRuns - byStage['api-error'];
  const translated = measured - byStage['translate-abstain'] - byStage['translate-fail'];

  // KHÔNG ỔN ĐỊNH = cùng một đề, lần được lần không. Chỉ lộ ra khi repeat > 1;
  // đây là thứ một lần chạy đơn lẻ không bao giờ cho thấy.
  const unstable = perCase
    .filter((c) => c.runs > 1 && c.passes > 0 && c.passes < c.runs)
    .map((c) => ({ id: c.id, passes: c.passes, runs: c.runs }));

  const worstStages = Object.entries(byStage)
    .filter(([s, n]) => s !== 'pass' && n > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    totalRuns,
    caseCount: perCaseMap.size,
    repeat: perCaseMap.size > 0 ? Math.round(totalRuns / perCaseMap.size) : 0,
    // Mẫu để tính tỉ lệ là các lượt THỰC SỰ gọi được API.
    measuredRuns: measured,
    apiErrors: byStage['api-error'],
    passRate: rate(byStage.pass, measured),
    translateRate: rate(translated, measured),
    byStage,
    perCase,
    unstable,
    worstStages,
  };
}

/**
 * Chạy `tasks` với tối đa `limit` việc đồng thời, GIỮ NGUYÊN thứ tự kết quả.
 * Bước dịch mất 5–10s/đề; chạy tuần tự 40 đề là ~6 phút chờ không lý do.
 * @param {Array<() => Promise<any>>} tasks
 */
export async function runPool(tasks, limit) {
  const size = Math.max(1, Math.min(Number(limit) || 1, tasks.length || 1));
  const out = new Array(tasks.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= tasks.length) return;
      out[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: size }, worker));
  return out;
}

/**
 * Điều phối TOÀN BỘ một lượt đo full-pipeline.
 *
 * Tách khỏi script để test được mà KHÔNG tốn một lượt LLM nào: chỉ cần tiêm `solve`
 * giả. Script bên ngoài chỉ còn việc đọc cờ và in ra màn hình.
 *
 * @param {object} o
 * @param {Array} o.cases              ca golden (đã lọc, đều có `text`)
 * @param {number} o.repeat            số lượt mỗi ca
 * @param {number} o.concurrency       số lượt chạy song song
 * @param {(text:string)=>Promise<any>} o.solve   thường là solveProblem
 * @param {(g:any,r:any)=>{verdict:string,detail:string}} o.compare  thường là compareCase
 * @param {(done:number,total:number)=>void} [o.onProgress]
 */
export async function runFullBench({ cases, repeat, concurrency, solve, compare, onProgress }) {
  const jobs = [];
  for (let run = 1; run <= repeat; run++) {
    for (const c of cases) jobs.push({ c, run });
  }
  let done = 0;
  const records = await runPool(jobs.map(({ c, run }) => async () => {
    let result;
    try { result = await solve(c.text); }
    catch (e) { result = { __throw: e?.message || String(e) }; }
    const cmp = compare(c, result);
    const stage = classifyFullResult(result, cmp.verdict);
    done += 1;
    if (onProgress) onProgress(done, jobs.length);
    return {
      id: c.id,
      run,
      stage,
      detail: cmp.detail,
      answers: (result?.answers || []).map((a) => a?.text).filter(Boolean),
    };
  }), concurrency);
  return { records, summary: summarizeFull(records) };
}
