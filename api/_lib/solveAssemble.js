// Lắp SolveResult: đáp SỐ từ engine (khi giải được → verified thật); LỜI từ LLM.
export function engineSolved(eng) {
  return !!(eng && eng.ok && eng.answers && eng.answers[0]
    && typeof eng.answers[0].approx === 'number' && Number.isFinite(eng.answers[0].approx)
    && (eng.violations?.length ?? 0) === 0);
}

function normalizeSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map((s, i) => ({
    id: s.id || `s${i + 1}`,
    title: s.title || `Bước ${i + 1}`,
    explanation: s.explanation || '',
    formula: s.formula || null,
    highlight: Array.isArray(s.highlight) ? s.highlight : [],
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
