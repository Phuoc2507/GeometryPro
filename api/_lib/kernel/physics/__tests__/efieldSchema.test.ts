// Unit test EFieldPlanSchema + superRefine GATE §7.3 (ép abstain cho cấu hình ngoài lớp exact-được).
import { describe, it, expect } from 'vitest';
import { EFieldPlanSchema } from '../efieldSchema';

const parse = (raw: unknown) => EFieldPlanSchema.safeParse(raw);
const msgs = (raw: unknown) => {
  const r = parse(raw);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('EFieldPlanSchema — cấu trúc & default', () => {
  it('plan hợp lệ (Coulomb) parse OK, default epsilon=1, units.length="m"', () => {
    const r = parse({
      problemName: 'ok', ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [3, 0] },
      ], queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
    });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.epsilon).toBe(1); expect(r.data.units.length).toBe('m'); }
  });
});

describe('superRefine — ref & loại', () => {
  it('tên trùng ⇒ issue', () => {
    expect(msgs({
      problemName: 'dup', ops: [
        { op: 'point_charge', name: 'A', q: { value: 1, unit: 'uC' } },
        { op: 'point_charge', name: 'A', q: { value: 1, unit: 'uC' } },
      ], queries: [{ kind: 'coulomb_force', a: 'A', b: 'A' }],
    }).some((m) => m.includes('trùng'))).toBe(true);
  });

  it('coulomb_force.a trỏ uniform_field ⇒ issue (sai loại)', () => {
    expect(msgs({
      problemName: 'wrong-type', ops: [
        { op: 'uniform_field', name: 'F', E: { value: 100, unit: 'V/m' } },
        { op: 'point_charge', name: 'B', q: { value: 1, unit: 'uC' } },
      ], queries: [{ kind: 'coulomb_force', a: 'F', b: 'B' }],
    }).some((m) => m.includes('point_charge'))).toBe(true);
  });

  it('query trỏ tên không tồn tại ⇒ issue', () => {
    expect(msgs({
      problemName: 'missing', ops: [{ op: 'point_charge', name: 'A', q: { value: 1, unit: 'uC' } }],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'Z' }],
    }).some((m) => m.includes('không tồn tại'))).toBe(true);
  });
});

describe('superRefine — uniform_field {E, fromVoltage} (E4)', () => {
  it('cả E lẫn fromVoltage ⇒ issue', () => {
    expect(msgs({
      problemName: 'both', ops: [
        { op: 'uniform_field', name: 'E1', E: { value: 100, unit: 'V/m' }, fromVoltage: { U: { value: 10, unit: 'V' }, d: { value: 1, unit: 'cm' } } },
        { op: 'charged_body', name: 'q', q: { value: 1, unit: 'uC' } },
      ], queries: [{ kind: 'voltage', field: 'E1', d: { value: 1, unit: 'cm' } }],
    }).some((m) => m.includes('MỘT'))).toBe(true);
  });

  it('trống cả hai NHƯNG có query đọc ⇒ issue', () => {
    expect(msgs({
      problemName: 'empty-read', ops: [
        { op: 'uniform_field', name: 'E1' },
        { op: 'charged_body', name: 'q', q: { value: 1, unit: 'uC' } },
      ], queries: [{ kind: 'voltage', field: 'E1', d: { value: 1, unit: 'cm' } }],
    }).some((m) => m.includes('thiếu cả E'))).toBe(true);
  });

  it('trống cả hai và KHÔNG query nào đọc (chỉ equilibrium_field) ⇒ OK (E4 nới)', () => {
    expect(parse({
      problemName: 'empty-noread', ops: [
        { op: 'uniform_field', name: 'E1' },
        { op: 'charged_body', name: 'cau', q: { value: 10, unit: 'nC' }, mass: { value: 0.1, unit: 'g' } },
      ], queries: [{ kind: 'equilibrium_field', body: 'cau', g: 10 }],
    }).success).toBe(true);
  });
});

describe('superRefine — mass & field_symmetric', () => {
  it('equilibrium_field thiếu mass ⇒ issue', () => {
    expect(msgs({
      problemName: 'no-mass', ops: [{ op: 'charged_body', name: 'cau', q: { value: 10, unit: 'nC' } }],
      queries: [{ kind: 'equilibrium_field', body: 'cau', g: 10 }],
    }).some((m) => m.includes('mass'))).toBe(true);
  });

  it('field_symmetric |q_A| ≠ |q_B| ⇒ issue', () => {
    expect(msgs({
      problemName: 'sym-unequal', units: { length: 'cm' }, ops: [
        { op: 'point_charge', name: 'A', q: { value: 30, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 50, unit: 'nC' }, at: [3, 0] },
      ], queries: [{ kind: 'field_symmetric', sources: ['A', 'B'], r: { value: 3, unit: 'cm' }, angleBetweenDeg: 60 }],
    }).some((m) => m.includes('|q_A|'))).toBe(true);
  });
});

describe('superRefine — GATE §7.3 chồng chất', () => {
  it('thẳng hàng (C5) ⇒ OK', () => {
    expect(parse({
      problemName: 'collinear-ok', units: { length: 'cm' }, ops: [
        { op: 'point_charge', name: 'A', q: { value: 90, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 40, unit: 'nC' }, at: [10, 0] },
      ], queries: [{ kind: 'field_at', at: [5, 0] }],
    }).success).toBe(true);
  });

  it('đối xứng 3-4-5 (toạ-độ-hữu-tỉ) ⇒ OK', () => {
    expect(parse({
      problemName: 'sym-345-ok', units: { length: 'cm' }, ops: [
        { op: 'point_charge', name: 'A', q: { value: 10, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 10, unit: 'nC' }, at: [8, 0] },
      ], queries: [{ kind: 'field_at', at: [4, 3] }],
    }).success).toBe(true);
  });

  it('tam giác đều field_at toạ-độ-VÔ-TỈ ⇒ issue "exact-được" (buộc field_symmetric)', () => {
    expect(msgs({
      problemName: 'equilateral-reject', units: { length: 'cm' }, ops: [
        { op: 'point_charge', name: 'A', q: { value: 30, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 30, unit: 'nC' }, at: [3, 0] },
      ], queries: [{ kind: 'field_at', at: [1.5, 2.598] }],
    }).some((m) => m.includes('exact-được'))).toBe(true);
  });

  it('3 điện tích bất đối xứng ⇒ issue', () => {
    expect(msgs({
      problemName: 'asym-reject', units: { length: 'cm' }, ops: [
        { op: 'point_charge', name: 'A', q: { value: 10, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 20, unit: 'nC' }, at: [5, 0] },
        { op: 'point_charge', name: 'C', q: { value: 7, unit: 'nC' }, at: [2, 4] },
      ], queries: [{ kind: 'field_at', at: [3, 1] }],
    }).some((m) => m.includes('exact-được'))).toBe(true);
  });
});
