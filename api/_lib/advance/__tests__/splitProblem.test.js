import { describe, it, expect, vi } from 'vitest';
vi.mock('../../vilao.js', () => ({ callVilao: vi.fn() }));
import { callVilao } from '../../vilao.js';
import { splitProblem } from '../splitProblem.js';

describe('splitProblem (Pass 0)', () => {
  it('parse + coverage ok → giữ multi_question', async () => {
    callVilao.mockResolvedValue(JSON.stringify({ type: 'multi_question', setup: 'chóp S.ABCD SA=2',
      parts: [{ label: 'a', hoi: 'thể tích chóp SA=2 ABCD', phan_tu_moi: [] },
              { label: 'b', hoi: 'trung điểm M của SC', phan_tu_moi: ['M'] }] }));
    const r = await splitProblem('Cho chóp S.ABCD SA=2. a) thể tích. b) M trung điểm SC.', {});
    expect(r.type).toBe('multi_question');
    expect(r.parts).toHaveLength(2);
  });
  it('coverage fail → rơi về single', async () => {
    callVilao.mockResolvedValue(JSON.stringify({ type: 'multi_question', setup: 'x',
      parts: [{ label: 'a', hoi: 'thể tích' }] })); // nuốt hết số/điểm
    const r = await splitProblem('Cho chóp S.ABCD SA=2a canh 3. a) V.', {});
    expect(r.type).toBe('single');
  });
  it('LLM ném/JSON hỏng → single (an toàn)', async () => {
    callVilao.mockRejectedValue(new Error('boom'));
    const r = await splitProblem('...', {});
    expect(r.type).toBe('single');
  });
});
