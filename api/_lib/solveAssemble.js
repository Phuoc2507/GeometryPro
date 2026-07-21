// Lắp SolveResult: đáp SỐ từ engine (khi giải được → verified thật); LỜI từ LLM.
export function engineSolved(eng) {
  return !!(eng && eng.ok && eng.answers && eng.answers[0]
    && typeof eng.answers[0].approx === 'number' && Number.isFinite(eng.answers[0].approx)
    && (eng.violations?.length ?? 0) === 0);
}

// Chỉ giữ construct hợp lệ: có id(string) + rule.type(string). Toạ độ do frontend tự tính
// từ hình, nên ở đây chỉ cần lọc rác, không cần validate sâu từng loại rule.
function sanitizeConstruct(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(c => c && typeof c.id === 'string' && c.rule && typeof c.rule.type === 'string')
    .map(c => ({ id: c.id, label: typeof c.label === 'string' ? c.label : c.id, rule: c.rule }));
}

function normalizeSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map((s, i) => ({
    id: s.id || `s${i + 1}`,
    title: s.title || `Bước ${i + 1}`,
    explanation: s.explanation || '',
    formula: s.formula || null,
    highlight: Array.isArray(s.highlight) ? s.highlight : [],
    construct: sanitizeConstruct(s.construct),
    view_mode: s.view_mode === '2d' ? '2d' : '3d',
  }));
}

export function assembleSolveResult(eng, llm) {
  const steps = normalizeSteps(llm?.steps);
  if (engineSolved(eng)) {
    const a = eng.answers[0];
    return { steps, final_answer: a.text, answer_value: a.approx, verified: true, verify_error: null };
  }
  return {
    steps,
    final_answer: typeof llm?.final_answer === 'string' ? llm.final_answer : '',
    answer_value: typeof llm?.answer_value === 'number' ? llm.answer_value : null,
    verified: false,
    verify_error: 'Engine chưa giải được dạng này — lời giải từ AI, CHƯA kiểm chứng tất định.',
  };
}
