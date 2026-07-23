import { describe, it, expect } from 'vitest';
import { grade } from '../index';
import type { Answer } from '../index';

describe('barrel grader/index.ts — điểm vào công khai', () => {
  it('lấy được grade() từ cửa vào và nó chạy đúng', () => {
    expect(typeof grade).toBe('function');
    const truth: Answer = { canonical: '√6/3', type: 'surd' };
    expect(grade('Vậy \\boxed{sqrt(6)/3}.', truth).verdict).toBe('correct');
  });
});
