// answerScale (số hoặc biểu thức) nhân vào trị hiển thị; answerUnit gắn đuôi đơn vị. KHÔNG ảnh hưởng phép
// tính, chỉ khâu hiển thị cuối. Dùng kind:'eval' (đồng bộ, không hình học) để pin.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('answerScale / answerUnit (qua eval)', () => {
  it('answerScale số: 2000 × 0.001 = 2, gắn đơn vị "lít"', () => {
    const r = runAnalysis({
      solidName: 'sc',
      analyze: { kind: 'eval', of: { kind: 'expr', expr: '2000' } },
      answerScale: 0.001,
      answerUnit: 'lít',
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(2, 9);
    expect(r.answer.text).toContain('lít');
  });

  it('answerScale biểu thức chuỗi: 8 × (1/4) = 2', () => {
    const r = runAnalysis({
      solidName: 'sc',
      analyze: { kind: 'eval', of: { kind: 'expr', expr: '8' } },
      answerScale: '1/4',
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBeCloseTo(2, 9);
  });

  it('không khai answerScale/answerUnit → trị trần, không đuôi đơn vị', () => {
    const r = runAnalysis({
      solidName: 'sc',
      analyze: { kind: 'eval', of: { kind: 'expr', expr: '7' } },
    });
    expect(r.ok).toBe(true);
    expect(r.answer.approx).toBe(7);
    expect(r.answer.text.trim()).toBe('7');
  });
});
