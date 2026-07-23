import { describe, it, expect } from 'vitest';
import { ALL_ANSWER_TYPES, ALL_VERDICTS, isAnswerType } from '../types';

describe('Kiểu nền của máy chấm', () => {
  it('có đủ 9 loại đáp án theo hợp đồng dùng chung', () => {
    expect(ALL_ANSWER_TYPES).toEqual([
      'rational', 'surd', 'ratio', 'point', 'vector',
      'plane_eq', 'line_eq', 'boolean', 'mcq',
    ]);
  });

  it('có đúng 3 phán quyết', () => {
    expect(ALL_VERDICTS).toEqual(['correct', 'incorrect', 'unsure']);
  });

  it('isAnswerType nhận loại hợp lệ và loại chuỗi lạ', () => {
    expect(isAnswerType('surd')).toBe(true);
    expect(isAnswerType('plane_eq')).toBe(true);
    expect(isAnswerType('banana')).toBe(false);
    expect(isAnswerType('')).toBe(false);
  });
});
