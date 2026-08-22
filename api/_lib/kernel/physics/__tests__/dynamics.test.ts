// Unit test tầng schema + giải: superRefine từ chối sớm (lỗi tiếng Việt rõ), đổi đơn vị per-quantity
// HỮU TỈ EXACT, chuỗi exact một-căn, self-check (newton_axis/tension_match/static_threshold), biên N≥0.
import { describe, it, expect } from 'vitest';
import { DynamicsPlanSchema } from '../dynamicsSchema';
import { runDynamics } from '../runDynamics';

// Trả issue đầu tiên của một plan sai (hoặc null nếu parse thành công).
function firstIssue(plan: unknown): string | null {
  const p = DynamicsPlanSchema.safeParse(plan);
  return p.success ? null : `${p.error.issues[0].path.join('.')}: ${p.error.issues[0].message}`;
}

describe('DynamicsPlanSchema — superRefine từ chối sớm (§6)', () => {
  it('incline thiếu inclineDeg ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', on: 'incline' }], queries: [{ kind: 'acceleration', of: 'vat' }] })).toMatch(/thiếu inclineDeg/);
  });
  it('inclineDeg ngoài (0,90) ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', on: 'incline', inclineDeg: 90 }], queries: [{ kind: 'acceleration', of: 'vat' }] })).toMatch(/khoảng \(0, 90\)/);
  });
  it('motion trên mặt ngang ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', ops: [{ op: 'body', name: 'vat', mass: 1, motion: 'down' }], queries: [{ kind: 'acceleration', of: 'vat' }] })).toMatch(/motion chỉ hợp lệ với on='incline'/);
  });
  it('3 vật ⇒ lỗi vượt trần', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'a', mass: 1, on: 'hanging' }, { op: 'body', name: 'b', mass: 1, on: 'hanging' }, { op: 'body', name: 'c', mass: 1, on: 'hanging' }, { op: 'string', between: ['a', 'b'] }], queries: [{ kind: 'acceleration' }] })).toMatch(/tối đa 2 vật/);
  });
  it('2 vật thiếu string ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'a', mass: 1, on: 'hanging' }, { op: 'body', name: 'b', mass: 1, on: 'hanging' }], queries: [{ kind: 'acceleration' }] })).toMatch(/cần đúng 1 dây/);
  });
  it('DY-2: {horizontal, horizontal} hai vật CÙNG mặt ngang ⇒ NGOÀI phạm vi v1', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'a', mass: 1 }, { op: 'body', name: 'b', mass: 1 }, { op: 'string', between: ['a', 'b'] }], queries: [{ kind: 'acceleration' }] })).toMatch(/chưa hỗ trợ v1/);
  });
  it('incline + hanging (ròng rọc đỉnh dốc) ⇒ NGOÀI phạm vi v1', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'a', mass: 1, on: 'incline', inclineDeg: 30 }, { op: 'body', name: 'b', mass: 1, on: 'hanging' }, { op: 'string', between: ['a', 'b'] }], queries: [{ kind: 'acceleration' }] })).toMatch(/chưa hỗ trợ v1/);
  });
  it('vật treo ngoài string (hệ treo đơn) ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', mass: 1, on: 'hanging' }], queries: [{ kind: 'acceleration', of: 'vat' }] })).toMatch(/phải nằm trong một dây/);
  });
  it('lực trên mặt nghiêng với angleDeg≠0 ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', mass: 1, on: 'incline', inclineDeg: 30 }, { op: 'force', on: 'vat', value: 5, angleDeg: 20 }], queries: [{ kind: 'acceleration', of: 'vat' }] })).toMatch(/dọc mặt dốc/);
  });
  it('vật treo khai mu ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'a', mass: 1, on: 'hanging', mu: 0.1 }, { op: 'body', name: 'b', mass: 1, on: 'hanging' }, { op: 'string', between: ['a', 'b'] }], queries: [{ kind: 'acceleration' }] })).toMatch(/không được khai mu/);
  });
  it('DY-1: min_force_to_move angleDeg≠0 fail parse với lỗi tiếng Việt', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', mass: 3, mu: 0.4 }], queries: [{ kind: 'min_force_to_move', on: 'vat', angleDeg: 45 }] })).toMatch(/angleDeg = 0/);
  });
  it('hệ 2 vật v0≠0 ⇒ lỗi (xuất phát từ nghỉ — §17.10)', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'a', mass: 3, on: 'hanging', v0: 1 }, { op: 'body', name: 'b', mass: 2, on: 'hanging' }, { op: 'string', between: ['a', 'b'] }], queries: [{ kind: 'acceleration' }] })).toMatch(/xuất phát từ nghỉ/);
  });
  it('|angleDeg| ≥ 90 ⇒ lỗi', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', mass: 2 }, { op: 'force', on: 'vat', value: 5, angleDeg: 90 }], queries: [{ kind: 'acceleration', of: 'vat' }] })).toMatch(/\|α\| phải < 90/);
  });
  it('plan hợp lệ (B03) ⇒ parse OK', () => {
    expect(firstIssue({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', mass: 5, mu: 0.2 }, { op: 'force', on: 'vat', value: 20 }], queries: [{ kind: 'acceleration', of: 'vat' }] })).toBeNull();
  });
});

describe('Đổi đơn vị per-quantity HỮU TỈ EXACT (§6.3)', () => {
  it('g → kg: 2000 g = 2 kg (a = 10/2 = 5)', () => {
    const r = runDynamics({ problemName: 'x', ops: [{ op: 'body', name: 'v', mass: 2000, massUnit: 'g' }, { op: 'force', on: 'v', value: 10 }], queries: [{ kind: 'acceleration', of: 'v' }] });
    expect(r.answers[0].text).toBe('5');
    expect(r.answers[0].approximate).toBe(false);
  });
  it('kN → N: 2 kN trên 1000 kg ⇒ a = 2 m/s²', () => {
    const r = runDynamics({ problemName: 'x', ops: [{ op: 'body', name: 'v', mass: 1000 }, { op: 'force', on: 'v', value: 2, unit: 'kN' }], queries: [{ kind: 'acceleration', of: 'v' }] });
    expect(r.answers[0].text).toBe('2');
  });
  it('km/h → m/s exact: 72 km/h = 20 m/s (v tại t=0 kiểm gián tiếp qua distance_to_stop)', () => {
    // hãm μ=0,5 g=10 ⇒ a=−5; v0=72 km/h=20 ⇒ s=400/10=40
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'v', mass: 100, mu: 0.5, v0: 72, v0Unit: 'km/h' }], queries: [{ kind: 'distance_to_stop', of: 'v' }] });
    expect(r.answers[0].text).toBe('40');
    expect(r.answers[0].approximate).toBe(false);
  });
});

describe('Self-check + biên vật lý', () => {
  it('B06 chuỗi exact một-căn: newton_axis residual 0 exact', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', mass: 4, on: 'incline', inclineDeg: 45, mu: 0.5 }], queries: [{ kind: 'acceleration', of: 'vat' }] });
    const nk = r.checks.filter((c) => c.kind === 'newton_axis');
    expect(nk.length).toBeGreaterThanOrEqual(1);
    expect(nk.every((c) => c.pass && c.residual === 0)).toBe(true);
  });
  it('Atwood tension_match residual 0 (hai đầu khớp exact)', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'm1', mass: 3, on: 'hanging' }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }], queries: [{ kind: 'acceleration' }] });
    const tm = r.checks.find((c) => c.kind === 'tension_match');
    expect(tm?.pass).toBe(true);
    expect(tm?.residual).toBe(0);
  });
  it('min_force trên vật nhẵn (không mu) ⇒ error rõ', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'vat', mass: 3 }], queries: [{ kind: 'min_force_to_move', on: 'vat' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /nhẵn/.test(e.message))).toBe(true);
  });
  it('normal_force trên vật treo ⇒ error (không có phản lực)', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'm1', mass: 3, on: 'hanging' }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }], queries: [{ kind: 'normal_force', on: 'm1' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /phản lực/.test(e.message))).toBe(true);
  });
  it('DY-5: time_when position sau dừng vĩnh viễn ⇒ error "không bao giờ đạt"', () => {
    // hãm: v0=10, a=−5 ⇒ s_dừng=10; hỏi vị trí 20 > 10.
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'xe', mass: 100, mu: 0.5, v0: 36, v0Unit: 'km/h' }], queries: [{ kind: 'time_when', of: 'xe', position: 20 }] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /không bao giờ đạt/.test(e.message))).toBe(true);
  });
  it('distance_to_stop khi vật KHÔNG hãm (a≥0) ⇒ error "vật không dừng"', () => {
    const r = runDynamics({ problemName: 'x', ops: [{ op: 'body', name: 'v', mass: 2 }, { op: 'force', on: 'v', value: 10 }], queries: [{ kind: 'distance_to_stop', of: 'v' }] });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /không dừng/.test(e.message))).toBe(true);
  });
});
