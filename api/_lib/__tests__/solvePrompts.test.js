import { describe, it, expect } from 'vitest';
import { buildSolveUserMessage, SOLVE_SYSTEM_PROMPT } from '../solvePrompts.js';
describe('solvePrompts', () => {
  const geo = { points: [{ id: 'A', x: 0, y: 0, z: 0 }, { id: 'B', x: 1, y: 0, z: 0 }] };
  it('chèn đáp engine khi có', () => {
    const msg = buildSolveUserMessage('Tính AB', geo, [], '√2');
    expect(msg).toContain('ĐÁP SỐ ĐÚNG');
    expect(msg).toContain('√2');
  });
  it('không có đáp engine thì không chèn', () => {
    expect(buildSolveUserMessage('Tính AB', geo)).not.toContain('ĐÁP SỐ ĐÚNG');
  });
  it('prompt không còn yêu cầu solve_javascript', () => {
    expect(SOLVE_SYSTEM_PROMPT).not.toContain('solve_javascript');
  });
});
