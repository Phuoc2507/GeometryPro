import { describe, it, expect } from 'vitest';
import { classifyTier, tierFromThrow } from '../kernel-bridge/classifyTier.js';
import { engineSolved } from '../solveAssemble.js';

// Fixtures: `result` như solveProblem tạo (đã jsonSafe ⇒ exact là object/null, KHÔNG BigInt).
const distExact = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: true,
  answers: [{ kind: 'distance', exact: { num: '1', den: '1', radicand: 3 }, approx: 1.7320508, text: '√3', approximate: false }],
  violations: [], errors: [], trace: [],
};
const distNumeric = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: true,
  answers: [{ kind: 'distance', exact: null, approx: 1.4142, text: '1.4142', approximate: true }],
  violations: [], errors: [], trace: [],
};
const analysisNumeric = {
  plan: { analyze: { kind: 'optimize', parameter: 'x' } },
  ok: true,
  parameter: { name: 'x', value: 2 },
  answers: [{ kind: 'kết quả', approx: 7.49, text: '7,49', approximate: false }], // KHÔNG có field `exact`
  violations: [], errors: [],
};
const angleUnsolved = {
  plan: { queries: [{ kind: 'angle', a: 'A', b: 'B' }] },
  ok: true,
  answers: [{ kind: 'angle', degrees: 60, exactDegrees: 60, exactCos: null, text: '60°', approximate: false }], // KHÔNG approx
  violations: [], errors: [], trace: [],
};
const scaleSymbolUnsolved = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }], scaleSymbol: 'a' },
  ok: true,
  answers: [{ kind: 'distance', exact: { num: '1', den: '1', radicand: 3 }, approx: null, text: 'a·√3', approximate: false, scaleSymbol: 'a', scaleExp: 1 }],
  violations: [], errors: [],
};
const violated = {
  plan: { queries: [{ kind: 'volume', solid: 'pyramid', points: ['A', 'B', 'C'], apex: 'D' }] },
  ok: false, answers: [], violations: [{ message: 'pyramid vertices are not coplanar' }], errors: [],
};
const errored = {
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: false, answers: [], violations: [], errors: [{ message: 'execute failed: unknown point' }],
};
const representative = {
  representative: true,
  plan: { queries: [{ kind: 'distance', a: 'A', b: 'B' }] },
  ok: true, answers: [{ kind: 'distance', exact: null, approx: 5, text: '5', approximate: true }], violations: [], errors: [],
};

describe('classifyTier — trục an toàn', () => {
  it('Mức 1 exact (hình học, exact != null, approximate=false)', () => {
    const t = classifyTier(distExact);
    expect(t.level).toBe(1);
    expect(t.exactness).toBe('exact');
    expect(t.problemType).toBe('Khoảng cách');
    expect(t.reason).toBeNull();
  });
  it('Mức 1 numeric (hình học approximate=true)', () => {
    expect(classifyTier(distNumeric).exactness).toBe('numeric');
    expect(classifyTier(distNumeric).level).toBe(1);
  });
  it('Mức 1 numeric (phân tích — chống bẫy undefined != null)', () => {
    const t = classifyTier(analysisNumeric);
    expect(t.level).toBe(1);
    expect(t.exactness).toBe('numeric'); // KHÔNG được là 'exact' dù answers[0].exact là undefined
    expect(t.problemType).toBe('Cực trị');
  });
  it('Mức 3 unsolved — góc (không approx)', () => {
    const t = classifyTier(angleUnsolved);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('unsolved');
    expect(t.problemType).toBe('Góc');
    expect(t.exactness).toBeNull();
  });
  it('Mức 3 unsolved — THANG CHỮ (approx=null)', () => {
    const t = classifyTier(scaleSymbolUnsolved);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('unsolved');
  });
  it('Mức 3 violation', () => {
    const t = classifyTier(violated);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('violation');
    expect(t.reason.message).toContain('coplanar');
  });
  it('Mức 3 error', () => {
    const t = classifyTier(errored);
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('error');
  });
  it('Mức 2 representative (thắng cả engineSolved)', () => {
    const t = classifyTier(representative);
    expect(t.level).toBe(2);
    expect(t.exactness).toBeNull();
  });
});

describe('classifyTier — problemType', () => {
  it('volume_ratio → Tỉ số thể tích', () => {
    expect(classifyTier({ plan: { queries: [{ kind: 'volume_ratio' }] }, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Tỉ số thể tích');
  });
  it('analyze integrate → Tích phân', () => {
    expect(classifyTier({ plan: { analyze: { kind: 'integrate' } }, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Tích phân');
  });
  it('vắng/lạ → Khác', () => {
    expect(classifyTier({ plan: {}, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Khác');
    expect(classifyTier({ plan: null, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Khác');
  });
  it('problemKind của translator (Nhịp 2) được ưu tiên', () => {
    expect(classifyTier({ plan: { problemKind: 'Khoảng cách điểm–mặt', queries: [{ kind: 'distance' }] }, ok: false, answers: [], violations: [], errors: [] }).problemType).toBe('Khoảng cách điểm–mặt');
  });
});

describe('classifyTier — bất biến level 1 ⟺ engineSolved', () => {
  it('khớp trên mọi fixture', () => {
    for (const r of [distExact, distNumeric, analysisNumeric, angleUnsolved, scaleSymbolUnsolved, violated, errored]) {
      expect(classifyTier(r).level === 1).toBe(engineSolved(r) === true);
    }
  });
});

describe('tierFromThrow', () => {
  it('abstain → kind=abstain, giữ message', () => {
    const t = tierFromThrow(new Error('translator abstained: thiếu số liệu / ngoài danh mục'));
    expect(t.level).toBe(3);
    expect(t.reason.kind).toBe('abstain');
    expect(t.reason.message).toContain('thiếu số liệu');
  });
  it('non-JSON → kind=error', () => {
    expect(tierFromThrow(new Error('Translator returned non-JSON output')).reason.kind).toBe('error');
  });
  it('schema fail → kind=error', () => {
    expect(tierFromThrow(new Error('Translator plan failed schema: invalid')).reason.kind).toBe('error');
  });
});
