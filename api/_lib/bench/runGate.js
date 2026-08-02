// Điều phối cổng: mỗi ca chạy qua solveOne(case) (TIÊM VÀO để test không cần engine/LLM),
// phân loại bằng compareCase. solveOne ném → ghi { __throw } (verdict error), KHÔNG làm sập cổng.
// Trả { results, summary, hasRegression }. hasRegression = có bất kỳ verdict ≠ 'pass'.
import { compareCase } from './compareCase.js';

export async function runGate(cases, solveOne) {
  const results = [];
  for (const c of cases) {
    let result;
    try { result = await solveOne(c); }
    catch (e) { result = { __throw: e && e.message ? e.message : String(e) }; }
    results.push(compareCase(c, result));
  }
  const summary = { pass: 0, 'regress-status': 0, 'regress-answer': 0, error: 0 };
  for (const r of results) summary[r.verdict] = (summary[r.verdict] || 0) + 1;
  const hasRegression = results.some((r) => r.verdict !== 'pass');
  return { results, summary, hasRegression };
}
