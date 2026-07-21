import { describe, it, expect, vi } from 'vitest';
vi.mock('../vilao.js', () => ({ callVilao: vi.fn() }));
import { callVilao } from '../vilao.js';
import { solveSteps } from '../solveCore.js';

const geo = { name: 'g', points: [{ id: 'A', label: 'A', x: 0, y: 0, z: 0 }], lines: [] };

describe('solveSteps — lõi giải thuần, tái dùng (không auth/credit/http)', () => {
  it('có engineAnswer + LLM trả steps → verified=true + steps', async () => {
    // final_answer bắt buộc theo parseSolveResponse (mirror solve.js); LLM thật luôn trả field này.
    callVilao.mockResolvedValue(JSON.stringify({ steps: [{ id: 's1', title: 'B1', explanation: 'x', highlight: [] }], final_answer: '√2' }));
    const r = await solveSteps('Tính d(A,B)', geo, { text: '√2', approx: 1.4142, verified: true }, {});
    expect(Array.isArray(r.steps)).toBe(true);
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.verified).toBe(true);
  });

  it('LLM ném → KHÔNG throw, trả kết quả an toàn (steps rỗng, verified giữ theo engine)', async () => {
    callVilao.mockRejectedValue(new Error('boom'));
    const r = await solveSteps('P', geo, { text: '√2', approx: 1.4142, verified: true }, {});
    expect(r).toBeTruthy();
    expect(Array.isArray(r.steps)).toBe(true);   // không throw
    expect(r.verified).toBe(true);               // đáp engine vẫn giữ dù LLM hỏng
  });
});
