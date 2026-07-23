import { describe, it, expect } from 'vitest';
import {
  compareScalar, compareRatio, comparePoint, comparePlane,
  compareBoolean, compareMcq,
} from '../compare';

describe('compareScalar — tương đương vô hướng', () => {
  it('√6/3 == sqrt(6)/3 == 0.8164 đều correct', () => {
    expect(compareScalar('√6/3', '√6/3')).toBe('correct');
    expect(compareScalar('sqrt(6)/3', '√6/3')).toBe('correct');
    expect(compareScalar('0.8164', '√6/3')).toBe('correct');
  });
  it('1/2 == 0.5 correct', () => {
    expect(compareScalar('0.5', '1/2')).toBe('correct');
  });
  it('2√3 == sqrt(12) correct', () => {
    expect(compareScalar('sqrt(12)', '2√3')).toBe('correct');
  });
  it('đáp án sai rõ → incorrect', () => {
    expect(compareScalar('5', '1/2')).toBe('incorrect');
    expect(compareScalar('0.82', '√6/3')).toBe('incorrect'); // lệch > eps
  });
  it('đáp án đọc không ra → unsure', () => {
    expect(compareScalar('không rõ', '1/2')).toBe('unsure');
  });
});

describe('compareRatio — tỉ số', () => {
  it('1:2 == 1/2 correct (rút gọn chính xác)', () => {
    expect(compareRatio('1:2', '1/2')).toBe('correct');
    expect(compareRatio('2/4', '1/2')).toBe('correct');
  });
  it('1:3 != 1/2 incorrect', () => {
    expect(compareRatio('1:3', '1/2')).toBe('incorrect');
  });
});

describe('comparePoint — điểm/vector', () => {
  it('(1,2,3) == (1, 2, 3) correct', () => {
    expect(comparePoint('(1,2,3)', '(1, 2, 3)')).toBe('correct');
  });
  it('sai một tọa độ → incorrect', () => {
    expect(comparePoint('(1,2,4)', '(1,2,3)')).toBe('incorrect');
  });
  it('khác số chiều → incorrect', () => {
    expect(comparePoint('(1,2)', '(1,2,3)')).toBe('incorrect');
  });
  it('đọc không ra → unsure', () => {
    expect(comparePoint('abc', '(1,2,3)')).toBe('unsure');
  });
});

describe('comparePlane — mặt phẳng (sai khác nhân vô hướng)', () => {
  it('x+2y-2z+3=0 == 2x+4y-4z+6=0 correct', () => {
    expect(comparePlane('x+2y-2z+3=0', '2x+4y-4z+6=0')).toBe('correct');
  });
  it('x+2y-2z+3=0 != x+2y-2z-3=0 incorrect', () => {
    expect(comparePlane('x+2y-2z-3=0', 'x+2y-2z+3=0')).toBe('incorrect');
  });
  it('đọc không ra → unsure', () => {
    expect(comparePlane('tào lao', 'x+2y-2z+3=0')).toBe('unsure');
  });
});

describe('compareBoolean & compareMcq', () => {
  it('boolean: đúng/sai và true/false', () => {
    expect(compareBoolean('đúng', 'đúng')).toBe('correct');
    expect(compareBoolean('true', 'đúng')).toBe('correct');
    expect(compareBoolean('sai', 'đúng')).toBe('incorrect');
    expect(compareBoolean('hửm?', 'đúng')).toBe('unsure');
  });
  it('mcq: lấy chữ cái A–D', () => {
    expect(compareMcq('C', 'C')).toBe('correct');
    expect(compareMcq('Chọn đáp án B', 'B')).toBe('correct');
    expect(compareMcq('A', 'C')).toBe('incorrect');
    expect(compareMcq('không có chữ cái', 'C')).toBe('unsure');
  });
});
