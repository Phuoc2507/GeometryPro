// Contract test — 11 bài B01–B11 (spec §13) + 6 bài vàng DL01–DL06 (golden §B) + 7 test âm bản (§13).
// Plan CHÉP NGUYÊN từ tài liệu; đáp là HỢP ĐỒNG tính tay (exact "15√2/4", "72/5", "-3", "-5/2 + 5√3").
// Lệch thì SỬA CODE, KHÔNG sửa đáp. Bài dương: ok, checks pass hết, approximate:false 100% (trừ ghi rõ).
import { describe, it, expect } from 'vitest';
import { runDynamics, type DynamicsResult } from '../runDynamics';

const texts = (r: DynamicsResult) => r.answers.map((a) => a.text);
const units = (r: DynamicsResult) => r.answers.map((a) => a.unit);
const allExact = (r: DynamicsResult) => r.answers.every((a) => !a.approximate);
const checksPass = (r: DynamicsResult) => r.checks.every((c) => c.pass);

describe('Dynamics contract — 11 bài B01–B11 (spec §13)', () => {
  it('B01 F=ma trơn 1 lực (+ v sau t): 5 m/s²; 15 m/s', () => {
    const r = runDynamics({
      problemName: 'f-ma-tron-mot-luc',
      ops: [{ op: 'body', name: 'vat', mass: 2 }, { op: 'force', on: 'vat', value: 10 }],
      queries: [{ kind: 'acceleration', of: 'vat', label: 'a' }, { kind: 'velocity_at', of: 'vat', t: 3, label: 'b' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['5', '15']);
    expect(units(r)).toEqual(['m/s²', 'm/s']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('B02 F=ma trơn 2 lực ngược chiều: 12 N; 3 m/s²; 24 m', () => {
    const r = runDynamics({
      problemName: 'f-ma-hai-luc',
      ops: [{ op: 'body', name: 'vat', mass: 4 }, { op: 'force', on: 'vat', value: 18 }, { op: 'force', on: 'vat', value: 6, direction: 'backward' }],
      queries: [{ kind: 'force_value', force: 'net', on: 'vat', label: 'a' }, { kind: 'acceleration', of: 'vat', label: 'b' }, { kind: 'position_at', of: 'vat', t: 4, label: 'c' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['12', '3', '24']);
    expect(units(r)).toEqual(['N', 'm/s²', 'm']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('B03 ma sát ngang kéo dọc trục: 50 N; 50 N; 10 N; 2 m/s²', () => {
    const r = runDynamics({
      problemName: 'ma-sat-ngang-keo', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 5, mu: 0.2 }, { op: 'force', on: 'vat', value: 20 }],
      queries: [
        { kind: 'force_value', force: 'weight', on: 'vat', label: 'a' },
        { kind: 'normal_force', on: 'vat', label: 'b' },
        { kind: 'force_value', force: 'friction', on: 'vat', label: 'c' },
        { kind: 'acceleration', of: 'vat', label: 'd' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['50', '50', '10', '2']);
    expect(units(r)).toEqual(['N', 'N', 'N', 'm/s²']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    // DY-6: check static_threshold pass (driving 20 > μN 10).
    expect(r.checks.some((c) => c.kind === 'static_threshold' && c.pass)).toBe(true);
  });

  it('B04 hãm ma sát (54 km/h, 1 tấn — engine đổi ×5/18, ×1000): -3 m/s²; 75/2 m; 5 s', () => {
    const r = runDynamics({
      problemName: 'oto-ham-truot', g: 10,
      ops: [{ op: 'body', name: 'oto', mass: 1, massUnit: 'tan', mu: 0.3, v0: 54, v0Unit: 'km/h' }],
      queries: [
        { kind: 'acceleration', of: 'oto', label: 'a' },
        { kind: 'distance_to_stop', of: 'oto', label: 'b' },
        { kind: 'time_when_velocity', of: 'oto', value: 0, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['-3', '75/2', '5']); // a ĐẠI SỐ (âm) — khoá quy ước dấu
    expect(units(r)).toEqual(['m/s²', 'm', 's']);
    expect(allExact(r)).toBe(true);
    expect(r.answers[1].approx).toBeCloseTo(37.5, 6);
    expect(checksPass(r)).toBe(true);
  });

  it('B05 nghiêng 30° nhẵn + nối động học (KHÔNG cho m): 5 m/s²; 5√2 m/s; √2 s', () => {
    const r = runDynamics({
      problemName: 'nghieng-30-nhan', g: 10,
      ops: [{ op: 'body', name: 'vat', on: 'incline', inclineDeg: 30 }],
      queries: [
        { kind: 'acceleration', of: 'vat', label: 'a' },
        { kind: 'velocity_after_distance', of: 'vat', distance: 5, label: 'b' },
        { kind: 'time_when', of: 'vat', position: 5, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['5', '5√2', '√2']);
    expect(units(r)).toEqual(['m/s²', 'm/s', 's']);
    expect(allExact(r)).toBe(true);
    expect(r.answers[1].approx).toBeCloseTo(7.0711, 3);
    expect(r.answers[2].approx).toBeCloseTo(1.4142, 3);
  });

  it('B06 nghiêng 45° có ma sát — exact MỘT-CĂN xuyên suốt: 20√2 N; 10√2 N; 5√2/2 m/s²', () => {
    const r = runDynamics({
      problemName: 'nghieng-45-ma-sat', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 4, on: 'incline', inclineDeg: 45, mu: 0.5 }],
      queries: [
        { kind: 'normal_force', on: 'vat', label: 'a' },
        { kind: 'force_value', force: 'friction', on: 'vat', label: 'b' },
        { kind: 'acceleration', of: 'vat', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['20√2', '10√2', '5√2/2']);
    expect(units(r)).toEqual(['N', 'N', 'm/s²']);
    expect(allExact(r)).toBe(true); // chuỗi subExact cùng radicand 2 — KHÔNG rơi float
    expect(r.answers[2].approx).toBeCloseTo(3.5355, 3);
  });

  it('B07 Atwood 3–2: 2 m/s²; 24 N (tension_match, hai đầu khớp)', () => {
    const r = runDynamics({
      problemName: 'atwood-3-2', g: 10,
      ops: [{ op: 'body', name: 'm1', mass: 3, on: 'hanging' }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }],
      queries: [{ kind: 'acceleration', label: 'a' }, { kind: 'force_value', force: 'tension', on: 'm1', label: 'b' }],
      scene: { labels: { m1: 'm₁', m2: 'm₂' } },
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['2', '24']);
    expect(units(r)).toEqual(['m/s²', 'N']);
    expect(allExact(r)).toBe(true);
    expect(r.checks.some((c) => c.kind === 'tension_match' && c.pass)).toBe(true);
    expect(r.meta.model.config).toBe('atwood');
    expect(r.meta.model.direction).toBe('m1-di-xuong'); // engine tự xác định chiều
    // tension với on:m2 CÙNG 24 N.
    const r2 = runDynamics({
      problemName: 'atwood-3-2', g: 10,
      ops: [{ op: 'body', name: 'm1', mass: 3, on: 'hanging' }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }],
      queries: [{ kind: 'force_value', force: 'tension', on: 'm2', label: 'b' }],
    });
    expect(r2.answers[0].text).toBe('24');
  });

  it('B08 bàn (μ=0,2) + treo, ròng rọc mép bàn: 14/5 m/s²; 72/5 N', () => {
    const r = runDynamics({
      problemName: 'ban-treo-rong-roc', g: 10,
      ops: [{ op: 'body', name: 'm1', mass: 3, mu: 0.2 }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }],
      queries: [{ kind: 'acceleration', label: 'a' }, { kind: 'force_value', force: 'tension', on: 'm2', label: 'b' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['14/5', '72/5']);
    expect(units(r)).toEqual(['m/s²', 'N']);
    expect(allExact(r)).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo(2.8, 6);
    expect(r.answers[1].approx).toBeCloseTo(14.4, 6);
    expect(r.checks.some((c) => c.kind === 'tension_match' && c.pass)).toBe(true);
  });

  it('B09 kéo xiên 30° có ma sát (chiếu 2 trục): 10 N; 5 N; -5/2 + 5√3 m/s² (recognize, KHOÁ CỨNG)', () => {
    const r = runDynamics({
      problemName: 'keo-xien-30', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 2, mu: 0.5 }, { op: 'force', on: 'vat', value: 20, angleDeg: 30 }],
      queries: [
        { kind: 'normal_force', on: 'vat', label: 'a' },
        { kind: 'force_value', force: 'friction', on: 'vat', label: 'b' },
        { kind: 'acceleration', of: 'vat', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['10', '5', '-5/2 + 5√3']); // §17.4 — đã chạy máy recognize.ts
    expect(units(r)).toEqual(['N', 'N', 'm/s²']);
    expect(allExact(r)).toBe(true); // recognize dựng lại 1e-10 ⇒ approximate:false
    expect(r.answers[2].approx).toBeCloseTo(6.1603, 3); // khoá CẢ approx LẪN text
  });

  it('B10 nối động học (2 tấn, kéo + cản): 1 m/s²; 50 m; 10 m/s', () => {
    const r = runDynamics({
      problemName: 'oto-2-tan-noi-dong-hoc',
      ops: [{ op: 'body', name: 'oto', mass: 2, massUnit: 'tan' }, { op: 'force', on: 'oto', value: 4000 }, { op: 'force', on: 'oto', value: 2000, direction: 'backward' }],
      queries: [
        { kind: 'acceleration', of: 'oto', label: 'a' },
        { kind: 'position_at', of: 'oto', t: 10, label: 'b' },
        { kind: 'velocity_at', of: 'oto', t: 10, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1', '50', '10']);
    expect(units(r)).toEqual(['m/s²', 'm', 'm/s']);
    expect(allExact(r)).toBe(true);
  });

  it('B11 F_min bắt đầu trượt (bonus, α=0 — DY-1): 12 N, KHÔNG op force', () => {
    const r = runDynamics({
      problemName: 'luc-toi-thieu-truot', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 3, mu: 0.4 }],
      queries: [{ kind: 'min_force_to_move', on: 'vat', label: 'a' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['12']);
    expect(units(r)).toEqual(['N']);
    expect(allExact(r)).toBe(true);
    expect(r.checks.some((c) => c.kind === 'static_threshold' && c.pass)).toBe(true);
  });
});

describe('Dynamics golden — 6 bài DL01–DL06 (golden §B)', () => {
  it('DL01 ma sát ngang kéo dọc trục: 20 N; 20 N; 6 N; 2 m/s²; 8 m/s', () => {
    const r = runDynamics({
      problemName: 'ma-sat-ngang-keo-doc-truc', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 2, mu: 0.3 }, { op: 'force', on: 'vat', value: 10 }],
      queries: [
        { kind: 'force_value', force: 'weight', on: 'vat', label: 'a' },
        { kind: 'normal_force', on: 'vat', label: 'b' },
        { kind: 'force_value', force: 'friction', on: 'vat', label: 'c' },
        { kind: 'acceleration', of: 'vat', label: 'd' },
        { kind: 'velocity_at', of: 'vat', t: 4, label: 'e' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['20', '20', '6', '2', '8']);
    expect(units(r)).toEqual(['N', 'N', 'N', 'm/s²', 'm/s']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('DL02 hai lực ngang nhẵn (KHÔNG g): 12 N; 4 m/s²; 18 m; 2 s', () => {
    const r = runDynamics({
      problemName: 'hai-luc-ngang-nhan',
      ops: [{ op: 'body', name: 'vat', mass: 3 }, { op: 'force', on: 'vat', value: 20 }, { op: 'force', on: 'vat', value: 8, direction: 'backward' }],
      queries: [
        { kind: 'force_value', force: 'net', on: 'vat', label: 'a' },
        { kind: 'acceleration', of: 'vat', label: 'b' },
        { kind: 'position_at', of: 'vat', t: 3, label: 'c' },
        { kind: 'time_when', of: 'vat', position: 8, label: 'd' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['12', '4', '18', '2']);
    expect(units(r)).toEqual(['N', 'm/s²', 'm', 's']);
    expect(allExact(r)).toBe(true); // plan KHÔNG có g vẫn chạy
  });

  it('DL03 hãm phanh ma sát (36 km/h): -5 m/s²; 10 m; 2 s', () => {
    const r = runDynamics({
      problemName: 'ham-phanh-ma-sat-36kmh', g: 10,
      ops: [{ op: 'body', name: 'xe', mass: 1000, mu: 0.5, v0: 36, v0Unit: 'km/h' }],
      queries: [
        { kind: 'acceleration', of: 'xe', label: 'a' },
        { kind: 'distance_to_stop', of: 'xe', label: 'b' },
        { kind: 'time_when_velocity', of: 'xe', value: 0, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['-5', '10', '2']);
    expect(units(r)).toEqual(['m/s²', 'm', 's']);
    expect(allExact(r)).toBe(true);
  });

  it('DL04 nghiêng 45° có ma sát — một-căn √2 EXACT (10√2; 5√2/2; 15√2/4)', () => {
    const r = runDynamics({
      problemName: 'nghieng-45-ma-sat-025', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 2, on: 'incline', inclineDeg: 45, mu: 0.25, motion: 'down' }],
      queries: [
        { kind: 'normal_force', on: 'vat', label: 'a' },
        { kind: 'force_value', force: 'friction', on: 'vat', label: 'b' },
        { kind: 'acceleration', of: 'vat', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['10√2', '5√2/2', '15√2/4']);
    expect(units(r)).toEqual(['N', 'N', 'm/s²']);
    expect(allExact(r)).toBe(true); // subExact cùng radicand 2, KHÔNG cần recognize
    expect(r.answers[0].approx).toBeCloseTo(14.1421, 3);
    expect(r.answers[1].approx).toBeCloseTo(3.5355, 3);
    expect(r.answers[2].approx).toBeCloseTo(5.3033, 3);
  });

  it('DL05 ròng rọc bàn nhẵn + treo: 4 m/s²; 12 N; 2√2 m/s (căn qua handoff √8)', () => {
    const r = runDynamics({
      problemName: 'rong-roc-ban-nhan-treo', g: 10,
      ops: [{ op: 'body', name: 'm1', mass: 3 }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }],
      queries: [
        { kind: 'acceleration', label: 'a' },
        { kind: 'force_value', force: 'tension', on: 'm2', label: 'b' },
        { kind: 'velocity_after_distance', of: 'm2', distance: 1, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['4', '12', '2√2']);
    expect(units(r)).toEqual(['m/s²', 'N', 'm/s']);
    expect(allExact(r)).toBe(true);
    expect(r.answers[2].approx).toBeCloseTo(2.8284, 3);
    expect(r.checks.some((c) => c.kind === 'tension_match' && c.pass)).toBe(true);
  });

  it('DL06 lực tối thiểu để bắt đầu trượt (α=0): 40 N; 40 N; 20 N', () => {
    const r = runDynamics({
      problemName: 'luc-toi-thieu-truot-4kg', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 4, mu: 0.5 }],
      queries: [
        { kind: 'force_value', force: 'weight', on: 'vat', label: 'a' },
        { kind: 'normal_force', on: 'vat', label: 'b' },
        { kind: 'min_force_to_move', on: 'vat', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['40', '40', '20']);
    expect(units(r)).toEqual(['N', 'N', 'N']);
    expect(allExact(r)).toBe(true);
  });
});

describe('Dynamics test âm bản — 7 ca (spec §13) — violation/error, ok:false, KHÔNG serve đáp', () => {
  it('1) vật không trượt (B03 với F=5 < μmg=10): violation vat-khong-truot, answers rỗng', () => {
    const r = runDynamics({
      problemName: 'khong-truot', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 5, mu: 0.2 }, { op: 'force', on: 'vat', value: 5 }],
      queries: [{ kind: 'acceleration', of: 'vat', label: 'd' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'vat-khong-truot')).toBe(true);
    expect(r.answers).toHaveLength(0); // KHÔNG bịa đáp
    expect(r.violations[0].message).toMatch(/kết quả vật lý hợp lệ|không có nhánh tĩnh/i);
  });

  it('2) phản lực âm (B09 với F=50, F·sin30=25 > mg=20): violation phan-luc-am', () => {
    const r = runDynamics({
      problemName: 'phan-luc-am', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 2, mu: 0.5 }, { op: 'force', on: 'vat', value: 50, angleDeg: 30 }],
      queries: [{ kind: 'normal_force', on: 'vat', label: 'a' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'phan-luc-am')).toBe(true);
    expect(r.answers).toHaveLength(0);
  });

  it('3) thiếu g khi cần (B03 bỏ g): error rõ "cần g"', () => {
    const r = runDynamics({
      problemName: 'thieu-g',
      ops: [{ op: 'body', name: 'vat', mass: 5, mu: 0.2 }, { op: 'force', on: 'vat', value: 20 }],
      queries: [{ kind: 'acceleration', of: 'vat', label: 'd' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /cần g/i.test(e.message))).toBe(true);
  });

  it('4) thiếu mass khi cần (B03 bỏ mass): error rõ "cần khối lượng của vat"', () => {
    const r = runDynamics({
      problemName: 'thieu-mass', g: 10,
      ops: [{ op: 'body', name: 'vat', mu: 0.2 }, { op: 'force', on: 'vat', value: 20 }],
      queries: [{ kind: 'acceleration', of: 'vat', label: 'd' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /cần khối lượng của "vat"/i.test(e.message))).toBe(true);
  });

  it('5) assert dữ kiện dư sai (B08 khai a=2 nhưng đúng 2,8): violation assert, ok:false — đáp VẪN đúng', () => {
    const r = runDynamics({
      problemName: 'assert-sai', g: 10,
      ops: [{ op: 'body', name: 'm1', mass: 3, mu: 0.2 }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }],
      queries: [{ kind: 'acceleration', label: 'a' }],
      asserts: [{ query: { kind: 'acceleration' }, equals: 2 }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.assert === 'acceleration')).toBe(true);
    expect(r.answers[0].text).toBe('14/5'); // engine tính ĐÚNG; assert-sai KHÔNG xoá đáp
  });

  it('6) min_force_to_move với angleDeg≠0 (DY-1): fail PARSE từ zod', () => {
    const r = runDynamics({
      problemName: 'minforce-angle', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 3, mu: 0.4 }],
      queries: [{ kind: 'min_force_to_move', on: 'vat', angleDeg: 30, label: 'a' }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/angleDeg = 0/);
  });

  it('7) chiều khai không khớp (DY-7): incline 30°, μ=0,7, motion down (tan30<0,7)', () => {
    const r = runDynamics({
      problemName: 'chieu-khong-khop', g: 10,
      ops: [{ op: 'body', name: 'vat', mass: 2, on: 'incline', inclineDeg: 30, mu: 0.7, motion: 'down' }],
      queries: [{ kind: 'acceleration', of: 'vat', label: 'a' }],
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.id === 'vat-khong-truot')).toBe(true);
    expect(r.violations[0].message).toMatch(/chiều chuyển động khai trong plan không khớp/);
    expect(r.answers).toHaveLength(0);
  });
});
