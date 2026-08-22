// Contract test — 10 bài C1–C10 chương ĐIỆN TRƯỜNG (spec 2026-08-22-physics-pack-v1-efield §12).
// Plan CHÉP NGUYÊN từ tài liệu; đáp là HỢP ĐỒNG tính tay. Lệch thì SỬA CODE, KHÔNG sửa đáp.
// Mọi bài §12: ok, checks pass hết, approximate:false 100% (cam kết §15.1). C6 = "300000√3" exact.
//
// GHI CHÚ TỰ QUYẾT (mâu thuẫn spec): §12 C3 khối JSON ghi q.value=4 nC nhưng tính tay + bảng tổng
// hợp dùng 4·10⁻⁸ C = 40 nC để ra E=900000 (9·10⁵). value:4 nC (=4·10⁻⁹) chỉ ra 90000, SAI so với
// đáp cam kết. Theo mandate "chọn phương án ĐÚNG VẬT LÝ", C3 dùng {value:40,unit:"nC"} (= 4·10⁻⁸ C,
// đúng chú thích ngay dưới JSON: "4·10⁻⁸ C = 40 nC = {value:40,unit:'nC'}").
import { describe, it, expect } from 'vitest';
import { runEfield, type EFieldResult } from '../runEfield';

const texts = (r: EFieldResult) => r.answers.map((a) => a.text);
const units = (r: EFieldResult) => r.answers.map((a) => a.unit);
const approx = (r: EFieldResult) => r.answers.map((a) => a.approx);
const allExact = (r: EFieldResult) => r.answers.every((a) => !a.approximate);
const checksPass = (r: EFieldResult) => r.checks.every((c) => c.pass);

describe('EField contract — 10 bài SGK/đề thi VN (spec §12)', () => {
  it('C1 Coulomb hai điện tích dương (đẩy): 40 N', () => {
    const r = runEfield({
      problemName: 'coulomb-2uC', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['40']);
    expect(units(r)).toEqual(['N']);
    expect(r.answers[0].direction).toContain('đẩy');
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C2 Coulomb trái dấu (hút), thang nC → khoa học: 5,4·10⁻⁴ N', () => {
    const r = runEfield({
      problemName: 'coulomb-nC-hut', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 4, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: -6, unit: 'nC' }, at: [2, 0] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['5,4·10⁻⁴']);
    expect(units(r)).toEqual(['N']);
    expect(r.answers[0].approx).toBeCloseTo(0.00054, 8);
    expect(r.answers[0].direction).toContain('hút');
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C3 E một điện tích (nguyên): 9·10⁵ V/m  [tự quyết: 40 nC = 4·10⁻⁸ C]', () => {
    const r = runEfield({
      problemName: 'E-diem-4e-8', units: { length: 'cm' },
      ops: [{ op: 'point_charge', name: 'Q', q: { value: 40, unit: 'nC' }, at: [0, 0] }],
      queries: [{ kind: 'field_at', at: [2, 0] }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['9·10⁵']);
    expect(units(r)).toEqual(['V/m']);
    expect(r.answers[0].approx).toBe(900000);
    expect(r.answers[0].direction).toContain('xa');
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C4 E, r vô tỉ nhưng r² hữu tỉ: 1,44·10⁵ V/m', () => {
    const r = runEfield({
      problemName: 'E-diem-r-vo-ti', units: { length: 'cm' },
      ops: [{ op: 'point_charge', name: 'Q', q: { value: 8, unit: 'nC' }, at: [0, 0] }],
      queries: [{ kind: 'field_at', at: [1, 2] }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1,44·10⁵']);
    expect(r.answers[0].approx).toBe(144000);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C5 chồng chất THẲNG HÀNG (trung điểm): 1,8·10⁵ V/m', () => {
    const r = runEfield({
      problemName: 'chong-chat-thang-hang', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 90, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 40, unit: 'nC' }, at: [10, 0] },
      ],
      queries: [{ kind: 'field_at', at: [5, 0] }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1,8·10⁵']);
    expect(r.answers[0].approx).toBe(180000);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    // Chứng chỉ đối xứng: thành phần ⊥ trục = exact 0.
    expect(r.checks.some((c) => c.kind === 'symmetry' && c.pass && c.residual === 0)).toBe(true);
  });

  it('C6 chồng chất TAM GIÁC ĐỀU (field_symmetric, trigOf-góc): 300000√3 V/m EXACT', () => {
    const r = runEfield({
      problemName: 'chong-chat-tam-giac-deu', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 30, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 30, unit: 'nC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'field_symmetric', sources: ['A', 'B'], r: { value: 3, unit: 'cm' }, angleBetweenDeg: 60 }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('300000√3'); // ĐIỂM SON: căn √3 exact qua trigOf(60)
    expect(r.answers[0].approximate).toBe(false);
    expect(r.answers[0].unit).toBe('V/m');
    expect(r.answers[0].approx).toBeCloseTo(519615.24, 1);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C7 công lực điện đều A=qEd: 10⁻⁴ J', () => {
    const r = runEfield({
      problemName: 'cong-luc-dien', units: { length: 'm' },
      ops: [
        { op: 'uniform_field', name: 'E1', E: { value: 1000, unit: 'V/m' }, direction: 'x' },
        { op: 'charged_body', name: 'q', q: { value: 2, unit: 'uC' } },
      ],
      queries: [{ kind: 'work', body: 'q', field: 'E1', d: { value: 5, unit: 'cm' } }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['10⁻⁴']);
    expect(units(r)).toEqual(['J']);
    expect(r.answers[0].approx).toBeCloseTo(0.0001, 10);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C8 U=Ed (80 V) + W=qU (4·10⁻⁶ J)', () => {
    const r = runEfield({
      problemName: 'hieu-dien-the-the-nang', units: { length: 'm' },
      ops: [
        { op: 'uniform_field', name: 'E1', E: { value: 2000, unit: 'V/m' }, direction: 'x' },
        { op: 'charged_body', name: 'q', q: { value: 50, unit: 'nC' } },
      ],
      queries: [
        { kind: 'voltage', field: 'E1', d: { value: 4, unit: 'cm' }, label: 'a' },
        { kind: 'potential_energy', body: 'q', U: { value: 80, unit: 'V' }, label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['80', '4·10⁻⁶']);
    expect(units(r)).toEqual(['V', 'J']);
    expect(approx(r)).toEqual([80, 0.000004]);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C9 cân bằng qE=mg: 10⁵ V/m, hướng lên', () => {
    const r = runEfield({
      problemName: 'can-bang-dien-truong-deu', units: { length: 'm' },
      ops: [
        { op: 'uniform_field', name: 'E1', E: { value: 1, unit: 'V/m' }, direction: 'up' },
        { op: 'charged_body', name: 'cau', q: { value: 10, unit: 'nC' }, mass: { value: 0.1, unit: 'g' } },
      ],
      queries: [{ kind: 'equilibrium_field', body: 'cau', g: 10 }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['10⁵']);
    expect(units(r)).toEqual(['V/m']);
    expect(r.answers[0].approx).toBe(100000);
    expect(r.answers[0].direction).toContain('lên');
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    // Thay-ngược cân bằng |q|E − mg = 0.
    expect(r.checks.some((c) => c.kind === 'equilibrium_backsub' && c.pass)).toBe(true);
  });

  it('C10 chuyển động trong điện trường đều: F=2·10⁻⁴ N; a=10 m/s²; v=2√5/5 m/s', () => {
    const r = runEfield({
      problemName: 'dien-tich-chuyen-dong', units: { length: 'm' },
      ops: [
        { op: 'uniform_field', name: 'E1', E: { value: 100, unit: 'V/m' }, direction: 'x' },
        { op: 'charged_body', name: 'hat', q: { value: 2, unit: 'uC' }, mass: { value: 0.00002, unit: 'kg' } },
      ],
      queries: [
        { kind: 'electric_force', body: 'hat', field: 'E1', label: 'a' },
        { kind: 'acceleration', body: 'hat', field: 'E1', label: 'b' },
        { kind: 'speed_after', body: 'hat', field: 'E1', d: { value: 4, unit: 'cm' }, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['2·10⁻⁴', '10', '2√5/5']);
    expect(units(r)).toEqual(['N', 'm/s²', 'm/s']);
    expect(r.answers[2].approx).toBeCloseTo(0.8944, 3);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    // Thay-ngược động năng ½mv² − qEd = 0.
    expect(r.checks.some((c) => c.kind === 'kinetic_backsub' && c.pass)).toBe(true);
  });
});

describe('EField engine — GATE §7.3, exact edge, tự kiểm (spec §13/§15)', () => {
  it('K exact: exactToApprox(K) === 9e9 (biểu diễn 9·10⁹ không mất bit)', () => {
    // Kiểm gián tiếp qua C1: đáp 40 exact chỉ đúng khi K exact = 9·10⁹.
    const r = runEfield({
      problemName: 'k-exact', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
    });
    expect(r.answers[0].text).toBe('40');
    expect(r.answers[0].approximate).toBe(false);
  });

  it('GATE (b) NHẬN: cặp đối xứng toạ-độ-hữu-tỉ 3-4-5 → E exact (vector hữu tỉ)', () => {
    // A(0,0) B(8,0) cm; P(4,3) cm → r=5 cm HỮU TỈ; q=10 nC mỗi bên (cùng dấu).
    // E_res dọc trục đối xứng (Oy) = kEff·q·480 = 9e9·1e-8·480 = 43200 V/m.
    const r = runEfield({
      problemName: 'doi-xung-345', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 10, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 10, unit: 'nC' }, at: [8, 0] },
      ],
      queries: [{ kind: 'field_at', at: [4, 3] }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(43200, 3);
    expect(r.answers[0].approximate).toBe(false); // r=5 cm hữu tỉ ⇒ vector hữu tỉ ⇒ exact
    expect(r.answers[0].text).toBe('4,32·10⁴');
  });

  it('GATE (b) TỪ CHỐI: field_at tam giác ĐỀU khai toạ-độ-VÔ-TỈ → abstain (buộc field_symmetric)', () => {
    // Đỉnh C ≈ (1.5, 2.598) cm: y vô tỉ (3√3/2). r² không ra hữu-tỉ-chính-phương ⇒ gate (b) reject.
    const r = runEfield({
      problemName: 'tam-giac-deu-toa-do-vo-ti', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 30, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 30, unit: 'nC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'field_at', at: [1.5, 2.598] }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0].message.toLowerCase()).toContain('exact-được');
  });

  it('GATE TỪ CHỐI: 3 điện tích tam giác LỆCH bất đối xứng, điểm ngoài trục → abstain', () => {
    const r = runEfield({
      problemName: 'ba-dien-tich-lech', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 10, unit: 'nC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 20, unit: 'nC' }, at: [5, 0] },
        { op: 'point_charge', name: 'C', q: { value: 7, unit: 'nC' }, at: [2, 4] },
      ],
      queries: [{ kind: 'field_at', at: [3, 1] }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('R5 vượt trần radicand (thang μC): sqrtExact→null ⇒ recognizeConstant cứu về a√b, approximate:false', () => {
    // q=3 μC: E=3·10⁷; 3E²=2,7·10¹⁵ > 10¹² ⇒ sqrtExact null ⇒ recognize "30000000√3".
    const r = runEfield({
      problemName: 'field-symmetric-uC', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 3, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 3, unit: 'uC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'field_symmetric', sources: ['A', 'B'], r: { value: 3, unit: 'cm' }, angleBetweenDeg: 60 }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('30000000√3');
    expect(r.answers[0].approximate).toBe(false);
  });

  it('R4 exact-preservation: mantissa+unit {0.5,"nC"} giữ exact ⇒ E=5000 exact', () => {
    const exactPlan = runEfield({
      problemName: 'r4-mantissa-unit', units: { length: 'cm' },
      ops: [{ op: 'point_charge', name: 'Q', q: { value: 0.5, unit: 'nC' }, at: [0, 0] }],
      queries: [{ kind: 'field_at', at: [3, 0] }],
    });
    expect(exactPlan.ok).toBe(true);
    expect(exactPlan.answers[0].text).toBe('5000');
    expect(exactPlan.answers[0].approx).toBe(5000);
    expect(exactPlan.answers[0].approximate).toBe(false); // mantissa+unit giữ exact chain (§5.3)
    // (Tương phản "5e-10 thô mất exact ở tầng Scalar" kiểm trong efield.test.ts — ở answer-level thì
    //  recognizeConstant cứu 5000 sạch nên vẫn approximate:false, đó là hành vi ĐÚNG & trung thực.)
  });

  it('assert dữ-kiện-dư SAI ⇒ violations + ok:false (không serve)', () => {
    const r = runEfield({
      problemName: 'assert-sai', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
      asserts: [{ query: { kind: 'coulomb_force', a: 'A', b: 'B' }, equals: 999 }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it('assert dữ-kiện-dư ĐÚNG ⇒ ok:true (dung nạp làm tròn đề)', () => {
    const r = runEfield({
      problemName: 'assert-dung', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
      asserts: [{ query: { kind: 'coulomb_force', a: 'A', b: 'B' }, equals: 40 }],
    });
    expect(r.ok).toBe(true);
    expect(r.violations.length).toBe(0);
  });

  it('miền hợp lệ: hai điện tích TRÙNG vị trí (r=0) ⇒ error, KHÔNG serve', () => {
    const r = runEfield({
      problemName: 'trung-vi-tri', units: { length: 'cm' },
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [1, 1] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [1, 1] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('môi trường điện môi ε: kEff = k/ε (C1 trong ε=2 ⇒ 20 N)', () => {
    const r = runEfield({
      problemName: 'dien-moi', units: { length: 'cm' }, epsilon: 2,
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('20');
    expect(r.answers[0].approximate).toBe(false);
    expect(r.meta.epsilon).toBe(2);
  });

  it('meta mang epsilon/units/knowledgeTags; geometry = null (v1 cắt hẳn §10.1)', () => {
    const r = runEfield({
      problemName: 'meta-check', units: { length: 'cm' }, knowledgeTags: ['ly/11/dien-truong/luc-tuong-tac-coulomb'],
      ops: [
        { op: 'point_charge', name: 'A', q: { value: 2, unit: 'uC' }, at: [0, 0] },
        { op: 'point_charge', name: 'B', q: { value: 2, unit: 'uC' }, at: [3, 0] },
      ],
      queries: [{ kind: 'coulomb_force', a: 'A', b: 'B' }],
    });
    expect(r.geometry).toBe(null);
    expect(r.meta.units.length).toBe('cm');
    expect(r.meta.knowledgeTags).toContain('ly/11/dien-truong/luc-tuong-tac-coulomb');
  });
});
