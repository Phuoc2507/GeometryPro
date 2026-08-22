import { describe, it, expect } from 'vitest';
import { postcheckEfield } from '../kernel-bridge/planPostcheck.js';

// Hậu-kiểm ĐƠN VỊ tọa độ điện trường (phát hiện qua smoke test 22/08): đề dùng cm/mm cho khoảng cách
// mà plan để hệ nền khác ⇒ REJECT (chống "sai âm thầm ~10⁴ lần"). CHỈ áp khi tọa độ thực sự tham gia.

const CM = 'Điện tích điểm q đặt trong chân không, tính cường độ điện trường tại điểm cách 3 cm.';
const MM = 'Hai điện tích điểm cách nhau 5 mm, tính cường độ điện trường.';
const M = 'Hai điện tích điểm đặt cách nhau 2 m, tính lực tương tác giữa chúng.';

describe('postcheckEfield — đối chiếu đơn vị tọa độ với đề', () => {
  it('đề cm + plan để hệ nền m (quên khai units) ⇒ REJECT', () => {
    const r = postcheckEfield(CM, {
      ops: [{ op: 'point_charge', name: 'A', q: { value: 40, unit: 'nC' }, at: [0, 0] }],
      queries: [{ kind: 'field_at', at: [3, 0] }],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/cm/);
  });

  it('đề cm + plan khai units.length=cm ⇒ OK', () => {
    const r = postcheckEfield(CM, {
      units: { length: 'cm' },
      ops: [{ op: 'point_charge', name: 'A', q: { value: 40, unit: 'nC' } }],
      queries: [{ kind: 'field_at', at: [3, 0] }],
    });
    expect(r.ok).toBe(true);
  });

  it('đề mm + plan m ⇒ REJECT', () => {
    const r = postcheckEfield(MM, { queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }] });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/mm/);
  });

  it('đề m + plan m (coulomb) ⇒ OK (không oan)', () => {
    const r = postcheckEfield(M, { queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }] });
    expect(r.ok).toBe(true);
  });

  it('field_symmetric dùng r (Dist đơn vị riêng) ⇒ KHÔNG áp, không oan dù đề cm', () => {
    const r = postcheckEfield(CM, {
      queries: [{ kind: 'field_symmetric', sources: ['A', 'B'], r: { value: 3, unit: 'cm' }, angleBetweenDeg: 60 }],
    });
    expect(r.ok).toBe(true);
  });

  it('không có tọa độ tham gia (voltage với d riêng) ⇒ KHÔNG áp', () => {
    const r = postcheckEfield(CM, {
      queries: [{ kind: 'voltage', field: 'E', d: { value: 2, unit: 'cm' } }],
    });
    expect(r.ok).toBe(true);
  });

  it('"V/cm" (đơn vị trường, không phải khoảng cách) KHÔNG kích nhầm', () => {
    // Đề chỉ nhắc đơn vị trường V/cm, không có khoảng cách cm ⇒ không reject.
    const r = postcheckEfield('Cường độ điện trường là 300000 V/cm tại điểm khảo sát.', {
      queries: [{ kind: 'field_at', at: [1, 0] }],
    });
    expect(r.ok).toBe(true);
  });
});
