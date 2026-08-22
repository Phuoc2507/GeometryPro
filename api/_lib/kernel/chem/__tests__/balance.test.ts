// Task 3 — balancer nullspace hữu tỉ (plan Task 3, golden kiểm tay spec §7).
import { describe, it, expect } from 'vitest';
import { balance } from '../balance';

describe('balance — nullspace hữu tỉ, hệ số nguyên tối giản', () => {
  it('Fe + O2 → Fe3O4 ⇒ [3,2,1]', () => {
    const r = balance(['Fe', 'O2'], ['Fe3O4']);
    expect(r).toEqual({ ok: true, coefficients: [3, 2, 1] });
  });
  it('KMnO4 → K2MnO4 + MnO2 + O2 ⇒ [2,1,1,1]', () => {
    expect(balance(['KMnO4'], ['K2MnO4', 'MnO2', 'O2'])).toEqual({ ok: true, coefficients: [2, 1, 1, 1] });
  });
  it('Cu + HNO3 → Cu(NO3)2 + NO + H2O ⇒ [3,8,3,2,4]', () => {
    expect(balance(['Cu', 'HNO3'], ['Cu(NO3)2', 'NO', 'H2O'])).toEqual({ ok: true, coefficients: [3, 8, 3, 2, 4] });
  });
  it('Al + H2SO4 → Al2(SO4)3 + H2 ⇒ [2,3,1,3]', () => {
    expect(balance(['Al', 'H2SO4'], ['Al2(SO4)3', 'H2'])).toEqual({ ok: true, coefficients: [2, 3, 1, 3] });
  });
  it('TỪ CHỐI nullspace dim 2: C + O2 → CO + CO2', () => {
    const r = balance(['C', 'O2'], ['CO', 'CO2']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problem).toMatch(/không xác định duy nhất/);
  });
  it('TỪ CHỐI không cân bằng được (dim 0): Fe → Cu', () => {
    expect(balance(['Fe'], ['Cu']).ok).toBe(false);
  });
  it('TỪ CHỐI hệ số trái dấu (chất đặt nhầm vế): H2 + H2O → O2', () => {
    // Kiểm tay: H: 2a+2b=0 ⇒ a=−b; nullspace dim 1 nhưng dấu lẫn lộn ⇒ không phải
    // một phản ứng hợp lệ theo vế đã khai — balancer phải từ chối, không tự đảo vế.
    expect(balance(['H2', 'H2O'], ['O2']).ok).toBe(false);
  });
  it('TỪ CHỐI hệ số 0 (chất không tham gia): Fe + Cu → Fe (Cu thừa vế)', () => {
    expect(balance(['Fe', 'Cu'], ['Fe']).ok).toBe(false);
  });
  it('công thức lỗi → ok:false có thông điệp, không throw', () => {
    const r = balance(['Xy'], ['XyO']);
    expect(r.ok).toBe(false);
  });
});
