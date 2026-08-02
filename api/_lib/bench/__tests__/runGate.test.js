import { describe, it, expect } from 'vitest';
import { runGate } from '../runGate.js';

const goodCase = { id: 'g', plan: {}, expect: { ok: true, answers: [{ text: '2' }] } };
const passResult = { ok: true, answers: [{ text: '2' }] };

describe('runGate', () => {
  it('không tụt lùi khi mọi ca pass', async () => {
    const { summary, hasRegression } = await runGate([goodCase], async () => passResult);
    expect(hasRegression).toBe(false);
    expect(summary.pass).toBe(1);
  });

  it('bắt regress-answer khi solver trả đáp lệch', async () => {
    const { summary, hasRegression } = await runGate([goodCase], async () => ({ ok: true, answers: [{ text: '5' }] }));
    expect(hasRegression).toBe(true);
    expect(summary['regress-answer']).toBe(1);
  });

  it('solver NÉM → verdict error (không làm sập cổng)', async () => {
    const { summary, hasRegression } = await runGate([goodCase], async () => { throw new Error('boom'); });
    expect(hasRegression).toBe(true);
    expect(summary.error).toBe(1);
  });

  it('tổng hợp nhiều ca đúng', async () => {
    const cases = [goodCase, { ...goodCase, id: 'g2' }];
    let n = 0;
    const { results } = await runGate(cases, async () => (n++ === 0 ? passResult : { ok: false, answers: [] }));
    expect(results.map((r) => r.verdict)).toEqual(['pass', 'regress-status']);
  });
});
