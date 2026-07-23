import { describe, it, expect } from 'vitest';
import { computePrecisionRecall, sampleForAudit } from '../selfcheck';
import type { EvalRecord, Verdict } from '../types';

function rec(seedId: string, verdict: Verdict): EvalRecord {
  return {
    seedId, modelId: 'm', run: 1, promptStyle: 'zero_shot',
    rawOutput: '', extractedAnswer: null, verdict, latencyMs: 0,
  };
}

describe('computePrecisionRecall', () => {
  it('tính đúng trên dữ liệu biết trước', () => {
    // người:  correct, correct,  incorrect, correct
    // máy:    correct, incorrect, correct,  correct
    // → tp=2 (i0,i3), fp=1 (i2), fn=1 (i1) → precision=2/3, recall=2/3
    const human: Verdict[]   = ['correct', 'correct', 'incorrect', 'correct'];
    const machine: Verdict[] = ['correct', 'incorrect', 'correct', 'correct'];
    const r = computePrecisionRecall(human, machine);
    expect(r.precision).toBeCloseTo(2 / 3, 10);
    expect(r.recall).toBeCloseTo(2 / 3, 10);
  });

  it('máy hoàn hảo → precision=recall=1', () => {
    const v: Verdict[] = ['correct', 'incorrect', 'correct'];
    const r = computePrecisionRecall(v, v);
    expect(r.precision).toBe(1);
    expect(r.recall).toBe(1);
  });

  it('hai mảng lệch độ dài → ném lỗi', () => {
    expect(() => computePrecisionRecall(['correct'], [])).toThrow();
  });
});

describe('sampleForAudit', () => {
  const data: EvalRecord[] = Array.from({ length: 20 }, (_, i) =>
    rec(`vsgeo-${i}`, 'correct'));

  it('rút đúng số lượng', () => {
    expect(sampleForAudit(data, 5, 42)).toHaveLength(5);
  });

  it('cùng seed → cùng mẫu (tái lập được)', () => {
    const a = sampleForAudit(data, 5, 42).map((r) => r.seedId);
    const b = sampleForAudit(data, 5, 42).map((r) => r.seedId);
    expect(a).toEqual(b);
  });

  it('khác seed → (thường) khác mẫu', () => {
    const a = sampleForAudit(data, 5, 1).map((r) => r.seedId);
    const b = sampleForAudit(data, 5, 999).map((r) => r.seedId);
    expect(a).not.toEqual(b);
  });

  it('n lớn hơn dữ liệu → trả hết, không lặp', () => {
    expect(sampleForAudit(data, 100, 7)).toHaveLength(20);
  });
});
