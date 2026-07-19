import { describe, it, expect, vi } from 'vitest';
vi.mock('../../kernel-bridge/solveWithKernel.js', () => ({
  planFromProblem: vi.fn(), solvePlan: vi.fn(),
}));
import { planFromProblem, solvePlan } from '../../kernel-bridge/solveWithKernel.js';
import { buildAdvanceScene } from '../buildAdvanceScene.js';

it('multi_question → base + steps cumulative', async () => {
  planFromProblem.mockResolvedValue({ solidName: 'x' });
  solvePlan.mockReturnValue({ ok: true, geometry: { name: 'x',
    points: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'M' }], lines: [] },
    answers: [] });
  const split = { type: 'multi_question', setup: 'chóp S.ABCD',
    parts: [{ label: 'Câu a', hoi: 'thể tích', phan_tu_moi: [] },
            { label: 'Câu b', hoi: 'góc AM', phan_tu_moi: ['M'] }] };
  const scene = await buildAdvanceScene('...', split, {});
  expect(scene.base.points).toHaveLength(6);
  expect(scene.steps).toHaveLength(2);
  expect(scene.steps[0].visibleIds).not.toContain('M');            // câu a chưa có M
  expect(scene.steps[1].visibleIds).toContain('M');                // câu b cumulative có M
  expect(scene.steps[0].visibleIds.every((id) => scene.steps[1].visibleIds.includes(id))).toBe(true);
});

it('base fail (engine không dựng được) → null (route rơi về bài đơn)', async () => {
  planFromProblem.mockResolvedValue({ solidName: 'x' });
  solvePlan.mockReturnValue({ ok: false, geometry: null, answers: [] });
  const split = { type: 'multi_question', setup: 's', parts: [
    { label: 'a', hoi: 'x', phan_tu_moi: [] }, { label: 'b', hoi: 'y', phan_tu_moi: [] }] };
  expect(await buildAdvanceScene('...', split, {})).toBeNull();
});

it('I1: base translate NÉM (translator abstain) → null (không để 500 xuyên lên)', async () => {
  planFromProblem.mockRejectedValue(new Error('translator abstained: thiếu số liệu'));
  const split = { type: 'multi_question', setup: 's', parts: [
    { label: 'a', hoi: 'x', phan_tu_moi: [] }, { label: 'b', hoi: 'y', phan_tu_moi: [] }] };
  expect(await buildAdvanceScene('...', split, {})).toBeNull();
});

it('câu engine giải được → verified=true; câu engine chịu → verified=false, không bịa', async () => {
  planFromProblem.mockResolvedValue({ solidName: 'x' });
  solvePlan.mockReturnValue({ ok: true, geometry: { name: 'x', points: [{ id: 'A' }], lines: [] }, answers: [] });
  const solveQ = vi.fn()
    .mockResolvedValueOnce({ ok: true, text: '√2', approx: 1.4142 })   // câu a giải được
    .mockResolvedValueOnce({ ok: false });                            // câu b engine chịu
  const split = { type: 'multi_question', setup: 's', parts: [
    { label: 'a', hoi: 'd(A,B)', phan_tu_moi: [] },
    { label: 'b', hoi: 'chứng minh', phan_tu_moi: [] }] };
  const scene = await buildAdvanceScene('...', split, { solveQuestion: solveQ });
  expect(scene.steps[0].answer.verified).toBe(true);
  expect(scene.steps[0].answer.text).toBe('√2');
  expect(scene.steps[1].answer.verified).toBe(false);
  expect(scene.steps[1].answer.text).toBeUndefined();   // không bịa số
});
