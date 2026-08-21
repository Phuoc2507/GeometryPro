// Contract test — 12 bài P1–P12 (spec §10 + P11/P12 theo phản biện F3/F11)
// + 12 bài L01–L12 (golden problems) + 2 test biên L02 (nghiệm kép / vô nghiệm).
// Plan CHÉP NGUYÊN từ tài liệu; đáp là HỢP ĐỒNG tính tay — lệch thì sửa code, không sửa đáp.
import { describe, it, expect } from 'vitest';
import { runPhysics } from '../runPhysics';

const texts = (r: ReturnType<typeof runPhysics>) => r.answers.map((a) => a.text);

describe('Physics contract — 12 bai SGK (spec §10 + P11/P12 phan bien)', () => {
  it('P1 thang deu (v0Unit km/h nen km/h — factor 1 exact): 90 km; 5/2 h', () => {
    const r = runPhysics({
      problemName: 'oto-thang-deu', units: { length: 'km', time: 'h' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 60, v0Unit: 'km/h' }],
      queries: [
        { kind: 'position_at', of: 'oto', t: 1.5, label: 'a' },
        { kind: 'time_when', of: 'oto', position: 150, label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['90 km', '5/2 h']);
    expect(r.answers[1].approx).toBeCloseTo(2.5, 10);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('P2 bien doi deu: 20 m/s; 75 m', () => {
    const r = runPhysics({
      problemName: 'oto-nhanh-dan-deu',
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 10, a: 2 }],
      queries: [
        { kind: 'velocity_at', of: 'oto', t: 5, component: 'x', label: 'a' },
        { kind: 'position_at', of: 'oto', t: 5, label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['20 m/s', '75 m']);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('P3 roi tu do 45 m: 3 s; 30 m/s', () => {
    const r = runPhysics({
      problemName: 'roi-tu-do-45m',
      ops: [{ op: 'free_fall', name: 'da', h0: 45, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'da', label: 'a' },
        { kind: 'impact_velocity', of: 'da', label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['3 s', '30 m/s']);
  });

  it('P4 nem ngang thap 80 m: 4 s; 80 m; 20√5 m/s ≈ 44.7214', () => {
    const r = runPhysics({
      problemName: 'nem-ngang-thap-80m',
      ops: [{ op: 'projectile', name: 'vat', h0: 80, v0: 20, angleDeg: 0, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'vat', label: 'a' },
        { kind: 'range', of: 'vat', label: 'b' },
        { kind: 'impact_velocity', of: 'vat', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['4 s', '80 m', '20√5 m/s']);
    expect(r.answers[2].approx).toBeCloseTo(44.7214, 3);
    expect(r.answers[2].approximate).toBe(false);
  });

  it('P5 nem xien 45°: 2√2 s ≈ 2.8284 (loai t=0); 40 m', () => {
    const r = runPhysics({
      problemName: 'nem-xien-45',
      ops: [{ op: 'projectile', name: 'bong', h0: 0, v0: 20, angleDeg: 45, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'bong', label: 'a' },
        { kind: 'range', of: 'bong', label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['2√2 s', '40 m']);
    expect(r.answers[0].approx).toBeCloseTo(2.8284, 3);
    expect(r.answers[0].approximate).toBe(false);
  });

  it('P6 nem xien 60° KET HOP: 15 m; 20√3 m; ≈12.3931 m/s (approximate)', () => {
    const r = runPhysics({
      problemName: 'nem-xien-60-ket-hop',
      ops: [{ op: 'projectile', name: 'bong', h0: 0, v0: 20, angleDeg: 60, g: 10 }],
      queries: [
        { kind: 'max_height', of: 'bong', label: 'a' },
        { kind: 'range', of: 'bong', label: 'b' },
        { kind: 'velocity_at', of: 'bong', t: 1, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].text).toBe('15 m');
    expect(r.answers[1].text).toBe('20√3 m');
    expect(r.answers[1].approx).toBeCloseTo(20 * Math.sqrt(3), 6);
    expect(r.answers[2].approx).toBeCloseTo(12.3931, 3);
    expect(r.answers[2].approximate).toBe(true);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('P7 hai xe duoi nhau: 3/2 h; 90 km', () => {
    const r = runPhysics({
      problemName: 'hai-xe-duoi-nhau', units: { length: 'km', time: 'h' },
      ops: [
        { op: 'mover1d', name: 'oto', x0: 0, v0: 60 },
        { op: 'mover1d', name: 'khach', x0: 30, v0: 40 },
      ],
      queries: [
        { kind: 'meet_time', a: 'oto', b: 'khach', label: 'a' },
        { kind: 'meet_position', a: 'oto', b: 'khach', label: 'b' },
      ],
      scene: { labels: { oto: 'Ô tô', khach: 'Xe khách' } },
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['3/2 h', '90 km']);
    expect(r.answers[0].approx).toBeCloseTo(1.5, 10);
  });

  it('P8 hai xe nguoc chieu lech gio: 3/2 h; 60 km; 50 km', () => {
    const r = runPhysics({
      problemName: 'hai-xe-nguoc-chieu-lech-gio', units: { length: 'km', time: 'h' },
      ops: [
        { op: 'mover1d', name: 'xe1', x0: 0, v0: 40 },
        { op: 'mover1d', name: 'xe2', x0: 120, v0: -60, startAt: 0.5 },
      ],
      queries: [
        { kind: 'meet_time', a: 'xe1', b: 'xe2', label: 'a' },
        { kind: 'meet_position', a: 'xe1', b: 'xe2', label: 'b' },
        { kind: 'distance_between_at', a: 'xe1', b: 'xe2', t: 1, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['3/2 h', '60 km', '50 km']);
  });

  it('P9 time_when NDD: 20 s', () => {
    const r = runPhysics({
      problemName: 'ndd-quang-duong-100m',
      ops: [{ op: 'mover1d', name: 'vat', x0: 0, v0: 0, a: 0.5 }],
      queries: [{ kind: 'time_when', of: 'vat', position: 100 }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['20 s']);
    expect(r.answers[0].approximate).toBe(false);
  });

  it('P10 nem xien tu do cao 15 m: (1+√13)/2 s qua recognize; ≈19.9426 m float; impact 20 m/s', () => {
    const r = runPhysics({
      problemName: 'nem-xien-tu-do-cao',
      ops: [{ op: 'projectile', name: 'bong', x0: 0, h0: 15, v0: 10, angleDeg: 30, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'bong', label: 'a' },
        { kind: 'range', of: 'bong', label: 'b' },
        { kind: 'impact_velocity', of: 'bong', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.answers[0].approx).toBeCloseTo((1 + Math.sqrt(13)) / 2, 6);
    expect(r.answers[0].text).toBe('1/2 + √13/2 s');   // solver rơi float → recognize dựng lại dạng đẹp
    expect(r.answers[0].approximate).toBe(false);
    expect(r.answers[1].approx).toBeCloseTo(19.9426, 3);
    expect(r.answers[1].approximate).toBe(true);       // (5√3+5√39)/2 — hai căn, thập phân trung thực
    expect(r.answers[2].text).toBe('20 m/s');          // √(75+325)=20 — recognize bắt lại từ float
  });

  it('P11 (F2+F3) ham phanh 54 km/h khai unit, a=−3: t_dung=5 s; s=75/2 m=37,5 m', () => {
    const r = runPhysics({
      problemName: 'oto-ham-phanh-54kmh',
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: -3 }],
      queries: [
        { kind: 'time_when_velocity', of: 'oto', value: 0, label: 'a' },
        { kind: 'position_when_velocity', of: 'oto', value: 0, label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['5 s', '75/2 m']);       // 54·5/18 = 15 EXACT → 15/3 = 5; x(5) = 37,5
    expect(r.answers[0].approx).toBeCloseTo(5, 10);
    expect(r.answers[1].approx).toBeCloseTo(37.5, 10);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('P12 (F11) nem thang dung XUONG h=60, v0=5, g=10: 5t²+5t−60=0 → t=3 s; v cham = 35 m/s', () => {
    const r = runPhysics({
      problemName: 'nem-thang-dung-xuong',
      ops: [{ op: 'projectile', name: 'vat', x0: 0, h0: 60, v0: 5, angleDeg: -90, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'vat', label: 'a' },
        { kind: 'impact_velocity', of: 'vat', label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['3 s', '35 m/s']);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });
});

describe('Physics contract — 12 bai golden L01–L12', () => {
  it('L01 xe dap thang deu, phut→gio: 9 km; 5/4 h', () => {
    const r = runPhysics({
      problemName: 'xe-dap-thang-deu', units: { length: 'km', time: 'h' },
      ops: [{ op: 'mover1d', name: 'xe', x0: 0, v0: 12 }],
      queries: [
        { kind: 'position_at', of: 'xe', t: 0.75, label: 'a' },
        { kind: 'time_when', of: 'xe', position: 15, label: 'b' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['9 km', '5/4 h']);
    expect(r.answers[1].approx).toBeCloseTo(1.25, 10);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('L02 oto ham phanh (54 km/h → 15 m/s): 6 m/s; 75/2 m; 4 s (loai nghiem ma 6 s) + assert dung sau 5 s', () => {
    const r = runPhysics({
      problemName: 'oto-ham-phanh',
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 15, a: -3 }],
      queries: [
        { kind: 'velocity_at', of: 'oto', t: 3, component: 'x', label: 'a' },
        { kind: 'position_at', of: 'oto', t: 5, label: 'b' },
        { kind: 'time_when', of: 'oto', position: 36, label: 'c' },
      ],
      asserts: [{ query: { kind: 'velocity_at', of: 'oto', t: 5, component: 'x' }, equals: 0 }],
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
    expect(texts(r)).toEqual(['6 m/s', '75/2 m', '4 s']);
    expect(r.answers[1].approx).toBeCloseTo(37.5, 10);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('L02-bien 1: time_when 37,5 m — nghiem KEP t=5 → "5 s" exact', () => {
    const r = runPhysics({
      problemName: 'oto-ham-phanh-bien-kep',
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 15, a: -3 }],
      queries: [{ kind: 'time_when', of: 'oto', position: 37.5 }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['5 s']);
    expect(r.answers[0].approximate).toBe(false);
  });

  it('L02-bien 2: time_when 40 m — VO NGHIEM (parabol dinh 37,5) → error ro, khong serve dap', () => {
    const r = runPhysics({
      problemName: 'oto-ham-phanh-bien-vo-nghiem',
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 15, a: -3 }],
      queries: [{ kind: 'time_when', of: 'oto', position: 40 }],
    });
    expect(r.ok).toBe(false);
    expect(r.answers).toHaveLength(0);
    expect(r.errors.some((e) => /không bao giờ tới/.test(e.message))).toBe(true);
  });

  it('L03 roi tu do g=9,8 (49/5 exact — bat hard-code g): 4 s; 196/5 m/s; 343/10 m', () => {
    const r = runPhysics({
      problemName: 'roi-tu-do-78-4',
      ops: [{ op: 'free_fall', name: 'vat', h0: 78.4, g: 9.8 }],
      queries: [
        { kind: 'time_to_ground', of: 'vat', label: 'a' },
        { kind: 'impact_velocity', of: 'vat', label: 'b' },
        { kind: 'position_at', of: 'vat', t: 3, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['4 s', '196/5 m/s', '343/10 m']);
    expect(r.answers[1].approx).toBeCloseTo(39.2, 10);
    expect(r.answers[2].approx).toBeCloseTo(34.3, 10);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('L04 nem thang dung LEN 90° (cos90 = 0 EXACT): 45 m; 6 s; 30 m/s', () => {
    const r = runPhysics({
      problemName: 'nem-thang-dung-30',
      ops: [{ op: 'projectile', name: 'vat', h0: 0, v0: 30, angleDeg: 90, g: 10 }],
      queries: [
        { kind: 'max_height', of: 'vat', label: 'a' },
        { kind: 'time_to_ground', of: 'vat', label: 'b' },
        { kind: 'impact_velocity', of: 'vat', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['45 m', '6 s', '30 m/s']);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('L05 nem thang dung qua 15 m: 1 s (2 nghiem 1|3, lay lan dau); 10 m/s; 20 m', () => {
    const r = runPhysics({
      problemName: 'nem-thang-dung-qua-15m',
      ops: [{ op: 'projectile', name: 'vat', h0: 0, v0: 20, angleDeg: 90, g: 10 }],
      queries: [
        { kind: 'time_when', of: 'vat', position: 15, axis: 'y', label: 'a' },
        { kind: 'velocity_at', of: 'vat', t: 1, label: 'b' },
        { kind: 'max_height', of: 'vat', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1 s', '10 m/s', '20 m']);
  });

  it('L06 may bay tha hang (nem ngang): 10 s; 1000 m; 100√2 m/s ≈ 141.4214 (can dep exact)', () => {
    const r = runPhysics({
      problemName: 'may-bay-tha-hang',
      ops: [{ op: 'projectile', name: 'hang', h0: 500, v0: 100, angleDeg: 0, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'hang', label: 'a' },
        { kind: 'range', of: 'hang', label: 'b' },
        { kind: 'impact_velocity', of: 'hang', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['10 s', '1000 m', '100√2 m/s']);
    expect(r.answers[2].approx).toBeCloseTo(141.4214, 3);
    expect(r.answers[2].approximate).toBe(false);
  });

  it('L07 nem ngang vach da (position_at truc y): 3 s; 25 m; 45 m', () => {
    const r = runPhysics({
      problemName: 'nem-ngang-vach-da',
      ops: [{ op: 'projectile', name: 'da', h0: 45, v0: 15, angleDeg: 0, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'da', label: 'a' },
        { kind: 'position_at', of: 'da', t: 2, axis: 'y', label: 'b' },
        { kind: 'range', of: 'da', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['3 s', '25 m', '45 m']);
  });

  it('L08 nem xien 30°: 4 s; 20 m; 80√3 m ≈ 138.5641 (can dep exact)', () => {
    const r = runPhysics({
      problemName: 'nem-xien-30-tu-dat',
      ops: [{ op: 'projectile', name: 'bong', h0: 0, v0: 40, angleDeg: 30, g: 10 }],
      queries: [
        { kind: 'time_to_ground', of: 'bong', label: 'a' },
        { kind: 'max_height', of: 'bong', label: 'b' },
        { kind: 'range', of: 'bong', label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['4 s', '20 m', '80√3 m']);
    expect(r.answers[2].approx).toBeCloseTo(138.5641, 3);
    expect(r.answers[2].approximate).toBe(false);
  });

  it('L09 oto duoi xe may (meet BAC 2, loai nghiem am −2): 12 s; 144 m; 24 m/s', () => {
    const r = runPhysics({
      problemName: 'oto-duoi-xe-may',
      ops: [
        { op: 'mover1d', name: 'oto', x0: 0, v0: 0, a: 2 },
        { op: 'mover1d', name: 'xemay', x0: 24, v0: 10 },
      ],
      queries: [
        { kind: 'meet_time', a: 'oto', b: 'xemay', label: 'a' },
        { kind: 'meet_position', a: 'oto', b: 'xemay', label: 'b' },
        { kind: 'velocity_at', of: 'oto', t: 12, component: 'x', label: 'c' },
      ],
      scene: { labels: { oto: 'Ô tô', xemay: 'Xe máy' } },
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['12 s', '144 m', '24 m/s']);
    expect(r.checks.filter((c) => c.kind === 'backsub').every((c) => c.pass)).toBe(true);
  });

  it('L10 xe tai + oto con cung chieu lech gio (km/h, startAt): 2 h; 72 km; 12 km', () => {
    const r = runPhysics({
      problemName: 'xe-tai-oto-con-lech-gio', units: { length: 'km', time: 'h' },
      ops: [
        { op: 'mover1d', name: 'tai', x0: 0, v0: 36 },
        { op: 'mover1d', name: 'con', x0: 0, v0: 48, startAt: 0.5 },
      ],
      queries: [
        { kind: 'meet_time', a: 'tai', b: 'con', label: 'a' },
        { kind: 'meet_position', a: 'tai', b: 'con', label: 'b' },
        { kind: 'distance_between_at', a: 'tai', b: 'con', t: 1, label: 'c' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['2 h', '72 km', '12 km']);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
  });

  it('L11 nem len gap tha roi (meet TRUC Y — canh bao golden #1): 1 s; 20 m; 15 m/s; 25/2 m', () => {
    const r = runPhysics({
      problemName: 'nem-len-gap-tha-roi',
      ops: [
        { op: 'projectile', name: 'A', h0: 0, v0: 25, angleDeg: 90, g: 10 },
        { op: 'free_fall', name: 'B', h0: 25, g: 10 },
      ],
      queries: [
        { kind: 'meet_time', a: 'A', b: 'B', label: 'a' },
        { kind: 'meet_position', a: 'A', b: 'B', label: 'b' },
        { kind: 'velocity_at', of: 'A', t: 1, label: 'c' },
        { kind: 'distance_between_at', a: 'A', b: 'B', t: 0.5, label: 'd' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1 s', '20 m', '15 m/s', '25/2 m']);
    expect(r.answers[3].approx).toBeCloseTo(12.5, 10);
    expect(r.answers.every((a) => !a.approximate)).toBe(true);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it('L12 truot doc NDD tu nghi (can 5√2 + assert du kien du): 5√2 s ≈ 7.0711; 12 m/s', () => {
    const r = runPhysics({
      problemName: 'truot-doc-50m',
      ops: [{ op: 'mover1d', name: 'vat', x0: 0, v0: 0, a: 2 }],
      queries: [
        { kind: 'time_when', of: 'vat', position: 50, label: 'a' },
        { kind: 'velocity_at', of: 'vat', t: 6, component: 'x', label: 'b' },
      ],
      asserts: [{ query: { kind: 'position_at', of: 'vat', t: 2 }, equals: 4 }],
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toHaveLength(0);
    expect(texts(r)).toEqual(['5√2 s', '12 m/s']);
    expect(r.answers[0].approx).toBeCloseTo(7.0711, 3);
    expect(r.answers[0].approximate).toBe(false);
  });
});
