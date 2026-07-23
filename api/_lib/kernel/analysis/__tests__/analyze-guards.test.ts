// Pin CHÍNH XÁC thông điệp các cổng chặn của nhánh analyze. Đổi lời nhắc = phải cập nhật test có chủ đích
// (không âm thầm nới lỏng). Mọi cổng ở đây trả về đồng bộ, không chạy optimizer.
import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../runAnalysis';

describe('cổng chặn nhánh analyze — thông điệp chính xác', () => {
  it('schema hỏng (thiếu solidName) → "Invalid analysis plan:"', () => {
    const r = runAnalysis({ analyze: { kind: 'eval', of: { kind: 'expr', expr: '1' } } });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toContain('Invalid analysis plan:');
    expect(r.parameter.name).toBe('?');
  });

  it('eval nguồn không hợp lệ → "analyze.eval chỉ nhận nguồn ..."', () => {
    const r = runAnalysis({
      solidName: 'g',
      analyze: { kind: 'eval', of: { kind: 'distance', a: 'A', b: 'B' } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('analyze.eval chỉ nhận nguồn "expr" hoặc "solid_volume"');
  });

  it('optimize_multi objective không phải expr → "optimize_multi chỉ nhận objective dạng \\"expr\\""', () => {
    const r = runAnalysis({
      solidName: 'g',
      parameters: [{ name: 'a', domain: [0, 1] }, { name: 'b', domain: [0, 1] }],
      analyze: { kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min', objective: { kind: 'distance', a: 'A', b: 'B' } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('optimize_multi chỉ nhận objective dạng "expr"');
  });

  it('optimize_multi tham số chưa khai báo → "parameter \\"b\\" chưa khai báo"', () => {
    const r = runAnalysis({
      solidName: 'g',
      parameters: [{ name: 'a', domain: [0, 1] }],
      analyze: { kind: 'optimize_multi', parameters: ['a', 'b'], sense: 'min', objective: { kind: 'expr', expr: 'a+b' } },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('parameter "b" chưa khai báo');
  });

  it('solve_multi tham số chưa khai báo → "parameter \\"b\\" chưa khai báo"', () => {
    const r = runAnalysis({
      solidName: 'g',
      parameters: [{ name: 'a', domain: [0, 1] }],
      analyze: {
        kind: 'solve_multi', parameters: ['a', 'b'],
        constraints: [{ of: { kind: 'expr', expr: 'a+b' }, equals: 1 }],
        report: { kind: 'expr', expr: 'a+b' },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toBe('parameter "b" chưa khai báo');
  });
});
