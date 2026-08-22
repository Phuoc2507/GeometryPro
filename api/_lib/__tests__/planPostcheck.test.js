import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postcheckPhysics, postcheckChem } from '../kernel-bridge/planPostcheck.js';

// HẬU-KIỂM tất định — mỗi luật kiểm 2 CHIỀU: (1) BẮT ĐÚNG lỗi dịch; (2) KHÔNG reject/warn nhầm
// plan ĐÚNG (chống false-positive — chốt chặn "không bao giờ sai" mà không được từ chối bài đúng).

// ─────────────────────────────────────────────────────────────────────────────
// B1 (Hóa) — lẫn đktc(22,4) ↔ đkc(24,79)
// ─────────────────────────────────────────────────────────────────────────────
describe('B1 postcheckChem — đktc(22,4) vs đkc(24,79)', () => {
  const planWith = (mv) => ({
    ops: [
      { op: 'species', formula: 'Al', amount: { grams: '5,4' } },
      { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
      { op: 'mix' },
    ],
    ...(mv == null ? {} : { molarVolume: mv }),
    queries: [{ kind: 'volume_gas', of: 'H2' }],
  });

  it('BẮT: đề "đktc" nhưng molarVolume 24,79 → reject', () => {
    const r = postcheckChem('Tính thể tích H2 ở đktc.', planWith(24.79));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/đktc/);
    expect(r.reason).toMatch(/24,79/);
  });

  it('BẮT: đề "đktc" nhưng molarVolume để trống (default 24,79) → reject', () => {
    const r = postcheckChem('Thể tích khí ở đktc là bao nhiêu?', planWith(null));
    expect(r.ok).toBe(false);
  });

  it('BẮT: đề "điều kiện tiêu chuẩn" (cụm đầy đủ) + 24,79 → reject', () => {
    const r = postcheckChem('... ở điều kiện tiêu chuẩn.', planWith(24.79));
    expect(r.ok).toBe(false);
  });

  it('BẮT: đề "đkc"/"điều kiện chuẩn" nhưng molarVolume 22,4 → reject', () => {
    expect(postcheckChem('... ở đkc.', planWith(22.4)).ok).toBe(false);
    const r = postcheckChem('... ở điều kiện chuẩn 25°C.', planWith(22.4));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/22,4/);
  });

  it('KHÔNG false-positive: đề "đktc" + molarVolume 22,4 → pass', () => {
    expect(postcheckChem('Thể tích H2 ở đktc.', planWith(22.4)).ok).toBe(true);
  });

  it('KHÔNG false-positive: đề "đkc"/"điều kiện chuẩn" + 24,79 → pass', () => {
    expect(postcheckChem('... ở đkc.', planWith(24.79)).ok).toBe(true);
    expect(postcheckChem('... ở điều kiện chuẩn.', planWith(24.79)).ok).toBe(true);
  });

  it('BẪY CHỮ "tiêu": "điều kiện tiêu chuẩn" + 22,4 → pass (đúng là đktc, KHÔNG bị regex "chuẩn" bắt nhầm)', () => {
    // "điều kiện tiêu chuẩn" chứa chữ "chuẩn" của cụm đkc, nhưng phải hiểu là đktc ⇒ 22,4 hợp lệ.
    expect('điều kiện tiêu chuẩn'.includes('điều kiện chuẩn')).toBe(false); // khoá lại tính chất chuỗi
    expect(postcheckChem('... ở điều kiện tiêu chuẩn (đktc).', planWith(22.4)).ok).toBe(true);
  });

  it('KHÔNG false-positive: đề KHÔNG nói điều kiện + default 24,79 → pass', () => {
    expect(postcheckChem('Cho 6,5 g kẽm vào dung dịch CuSO4. Khối lượng đồng?', planWith(null)).ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B2 (Lý) — hỏi độ cao nhưng query position_at/time_when sai trục
// ─────────────────────────────────────────────────────────────────────────────
describe('B2 postcheckPhysics — độ cao ↔ axis:y', () => {
  const base = { length: 'm', time: 's' };
  const projPlan = (q) => ({
    problemName: 'nem', units: base,
    ops: [{ op: 'projectile', name: 'vat', h0: 80, v0: 20, angleDeg: 90, g: 10 }],
    queries: [q],
  });
  const fallPlan = (q) => ({
    problemName: 'roi', units: base,
    ops: [{ op: 'free_fall', name: 'vat', h0: 80, g: 10 }],
    queries: [q],
  });

  it('BẮT: projectile + position_at THIẾU axis + đề "độ cao" → reject (A2)', () => {
    const r = postcheckPhysics('Sau 2 s vật ở độ cao bao nhiêu?', projPlan({ kind: 'position_at', of: 'vat', t: 2 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/axis/);
  });

  it('BẮT: projectile + time_when THIẾU axis + đề "độ cao" → reject (biến thể time_when)', () => {
    const r = postcheckPhysics('Sau bao lâu vật qua độ cao 60 m?', projPlan({ kind: 'time_when', of: 'vat', position: 60 }));
    expect(r.ok).toBe(false);
  });

  it('BẮT: projectile + position_at axis:x tường minh + "độ cao" → reject', () => {
    expect(postcheckPhysics('độ cao sau 2 s?', projPlan({ kind: 'position_at', of: 'vat', t: 2, axis: 'x' })).ok).toBe(false);
  });

  it('BẮT: free_fall + position_at axis:x + "độ cao" → reject (đặt sai trục)', () => {
    expect(postcheckPhysics('độ cao sau 2 s?', fallPlan({ kind: 'position_at', of: 'vat', t: 2, axis: 'x' })).ok).toBe(false);
  });

  it('KHÔNG false-positive: projectile + position_at axis:y + "độ cao" → pass', () => {
    expect(postcheckPhysics('độ cao sau 2 s?', projPlan({ kind: 'position_at', of: 'vat', t: 2, axis: 'y' })).ok).toBe(true);
  });

  it('KHÔNG false-positive: free_fall + position_at THIẾU axis + "độ cao" → pass (mainAxis mặc định y)', () => {
    // Đây là ca dễ reject NHẦM nhất: free_fall khỏi khai axis vẫn đúng vì trục hiệu dụng = 'y'.
    expect(postcheckPhysics('độ cao sau 2 s?', fallPlan({ kind: 'position_at', of: 'vat', t: 2 })).ok).toBe(true);
  });

  it('KHÔNG false-positive: projectile + position_at axis:x nhưng đề KHÔNG hỏi độ cao → pass', () => {
    // Hỏi khoảng cách ngang là hợp lệ; không có tín hiệu "độ cao" ⇒ không reject.
    expect(postcheckPhysics('Sau 2 s vật cách chỗ ném bao xa theo phương ngang?', projPlan({ kind: 'position_at', of: 'vat', t: 2, axis: 'x' })).ok).toBe(true);
  });

  it('KHÔNG false-positive: mover1d + position_at + "độ cao" (thang máy) → pass (không phải ném/rơi)', () => {
    const plan = {
      problemName: 'thang', units: base,
      ops: [{ op: 'mover1d', name: 'tm', x0: 0, v0: 2, axis: 'y' }],
      queries: [{ kind: 'position_at', of: 'tm', t: 3 }],
    };
    expect(postcheckPhysics('Thang máy lên cao, sau 3 s ở độ cao nào?', plan).ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B3 (Lý, WARN) — lệch đơn vị km/h
// ─────────────────────────────────────────────────────────────────────────────
describe('B3 postcheckPhysics — km/h (warn, không lật ok)', () => {
  it('BẮT: đề "km/h", hệ nền m-s, KHÔNG khai v0Unit → warn (nghi tự đổi)', () => {
    const r = postcheckPhysics('Ô tô 54 km/h. Vận tốc sau 3 s?', {
      problemName: 'x', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 15, a: 0 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3 }],
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /km\/h/.test(w))).toBe(true);
  });

  it('BẮT: plan khai v0Unit "km/h" nhưng đề KHÔNG có "km/h" → warn (nghi bịa)', () => {
    const r = postcheckPhysics('Ô tô 15 m/s. Vận tốc sau 3 s?', {
      problemName: 'x', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: 0 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3 }],
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('KHÔNG false-positive: đề "km/h" + v0Unit "km/h" (L02 đúng) → không warn km/h', () => {
    const r = postcheckPhysics('Ô tô 54 km/h hãm phanh, gia tốc độ lớn 3 m/s². Vận tốc sau 3 s?', {
      problemName: 'oto', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: -3 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3, component: 'x' }],
    });
    expect(r.warnings.some((w) => /km\/h/.test(w))).toBe(false);
  });

  it('KHÔNG false-positive: đề "km/h" + hệ nền km-h, không cần *Unit → không warn', () => {
    const r = postcheckPhysics('Xe đạp 12 km/h. Sau 45 phút cách A bao nhiêu km?', {
      problemName: 'xe', units: { length: 'km', time: 'h' },
      ops: [{ op: 'mover1d', name: 'xe', x0: 0, v0: 12 }],
      queries: [{ kind: 'position_at', of: 'xe', t: 45, tUnit: 'min' }],
    });
    expect(r.warnings.some((w) => /km\/h/.test(w))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B4 (Lý, WARN) — chậm dần nhưng a cùng dấu v0
// ─────────────────────────────────────────────────────────────────────────────
describe('B4 postcheckPhysics — chậm dần ↔ dấu a (warn)', () => {
  it('BẮT: "chậm dần" + a cùng dấu v0 (v0:54, a:+3) → warn', () => {
    const r = postcheckPhysics('Ô tô 54 km/h chậm dần đều, độ lớn 3. Vận tốc sau 3 s?', {
      problemName: 'x', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: 3 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3, component: 'x' }],
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /nhanh dần|dấu/.test(w))).toBe(true);
  });

  it('BẮT: "hãm phanh" + v0 âm & a âm (cùng dấu) → warn', () => {
    const r = postcheckPhysics('Vật đi ngược chiều dương rồi hãm phanh.', {
      problemName: 'x', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'v', x0: 0, v0: -20, a: -2 }],
      queries: [{ kind: 'velocity_at', of: 'v', t: 1, component: 'x' }],
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('KHÔNG false-positive: "chậm dần" + a NGƯỢC dấu v0 (v0:54, a:-3) → không warn dấu', () => {
    const r = postcheckPhysics('Ô tô 54 km/h chậm dần đều, độ lớn 3. Vận tốc sau 3 s?', {
      problemName: 'x', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: -3 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3, component: 'x' }],
    });
    expect(r.warnings.some((w) => /nhanh dần|dấu/.test(w))).toBe(false);
  });

  it('KHÔNG false-positive: "chậm dần" nhưng a=0 (thẳng đều) → không warn', () => {
    const r = postcheckPhysics('Xe chậm dần...', {
      problemName: 'x', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'v', x0: 0, v0: 10, a: 0 }],
      queries: [{ kind: 'velocity_at', of: 'v', t: 1, component: 'x' }],
    });
    expect(r.warnings.some((w) => /nhanh dần|dấu/.test(w))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B5 (Lý) — a m/s² nhưng hệ nền km/h
// ─────────────────────────────────────────────────────────────────────────────
describe('B5 postcheckPhysics — a m/s² ↔ hệ nền', () => {
  const opKm = [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, a: 3 }];
  const q = [{ kind: 'velocity_at', of: 'oto', t: 3, component: 'x' }];

  it('BẮT: đề "3 m/s²" + hệ nền km-h → reject', () => {
    const r = postcheckPhysics('Ô tô, gia tốc 3 m/s².', { problemName: 'x', units: { length: 'km', time: 'h' }, ops: opKm, queries: q });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/m\/s²|hệ nền/);
  });

  it('BẮT: đề "3 m/s2" + time=h → reject; "m/s^2" cũng bắt', () => {
    expect(postcheckPhysics('gia tốc 3 m/s2', { problemName: 'x', units: { length: 'm', time: 'h' }, ops: opKm, queries: q }).ok).toBe(false);
    expect(postcheckPhysics('gia tốc 3 m/s^2', { problemName: 'x', units: { length: 'km', time: 's' }, ops: opKm, queries: q }).ok).toBe(false);
  });

  it('KHÔNG false-positive: đề "3 m/s²" + hệ nền m-s → pass', () => {
    expect(postcheckPhysics('Ô tô, gia tốc 3 m/s².', { problemName: 'x', units: { length: 'm', time: 's' }, ops: opKm, queries: q }).ok).toBe(true);
  });

  it('KHÔNG false-positive: projectile "g=10 m/s²" hệ nền m-s → pass', () => {
    const plan = {
      problemName: 'nem', units: { length: 'm', time: 's' },
      ops: [{ op: 'projectile', name: 'vat', h0: 500, v0: 100, angleDeg: 0, g: 10 }],
      queries: [{ kind: 'time_to_ground', of: 'vat' }],
    };
    expect(postcheckPhysics('Máy bay thả hàng, g = 10 m/s².', plan).ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tích hợp: nối vào solveSubject (reject chặn engine; warn đính mềm) — mock LLM
// ─────────────────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({ callVilao: vi.fn() }));
vi.mock('../vilao.js', () => ({ callVilao: mocks.callVilao }));

describe('solveSubject wiring — postcheck chặn/đính', () => {
  beforeEach(() => mocks.callVilao.mockReset());

  it('Lý B2 reject: LLM trả plan thiếu axis:y → ok:false, KHÔNG có answers (engine không chạy)', async () => {
    const { solvePhysicsProblem } = await import('../kernel-bridge/solveSubject.js');
    mocks.callVilao.mockResolvedValue(JSON.stringify({
      problemName: 'nem', units: { length: 'm', time: 's' },
      ops: [{ op: 'projectile', name: 'vat', h0: 80, v0: 20, angleDeg: 90, g: 10 }],
      queries: [{ kind: 'position_at', of: 'vat', t: 2, label: 'a' }],
    }));
    const out = await solvePhysicsProblem('Ném thẳng đứng lên, sau 2 s vật ở độ cao bao nhiêu?');
    expect(out.ok).toBe(false);
    expect(out.postcheck.ok).toBe(false);
    expect(out.answers).toEqual([]);
    expect(out.plan).toBeTruthy(); // giữ plan để route log
  });

  it('Hóa B1 reject: LLM trả molarVolume 24,79 cho đề "đktc" → ok:false, không answers', async () => {
    const { solveChemProblem } = await import('../kernel-bridge/solveSubject.js');
    mocks.callVilao.mockResolvedValue(JSON.stringify({
      ops: [
        { op: 'species', formula: 'Al', amount: { grams: '5,4' } },
        { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' },
        { op: 'mix' },
      ],
      molarVolume: 24.79,
      queries: [{ kind: 'volume_gas', of: 'H2' }],
    }));
    const out = await solveChemProblem('Hòa tan 5,4 g nhôm trong HCl dư. Thể tích H2 ở đktc?');
    expect(out.ok).toBe(false);
    expect(out.postcheck.ok).toBe(false);
    expect(out.answers).toEqual([]);
  });

  it('Lý B4 warn: plan sai dấu a vẫn chạy engine (ok:true) + có warning trong trace', async () => {
    const { solvePhysicsProblem } = await import('../kernel-bridge/solveSubject.js');
    mocks.callVilao.mockResolvedValue(JSON.stringify({
      problemName: 'oto', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 10, a: 2 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3, component: 'x', label: 'a' }],
    }));
    const out = await solvePhysicsProblem('Ô tô 10 m/s chuyển động chậm dần đều, gia tốc độ lớn 2 m/s². Vận tốc sau 3 s?');
    expect(out.ok).toBe(true);
    expect(out.warnings.length).toBeGreaterThan(0);
    expect(out.trace.some((c) => c.severity === 'warn' && c.kind === 'postcheck')).toBe(true);
    expect(out.answers.length).toBeGreaterThan(0); // engine vẫn tính (warn không chặn)
  });

  it('Lý đúng (L02): LLM trả plan chuẩn → ok:true, KHÔNG warning', async () => {
    const { solvePhysicsProblem } = await import('../kernel-bridge/solveSubject.js');
    mocks.callVilao.mockResolvedValue(JSON.stringify({
      problemName: 'oto-ham-phanh', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: -3 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3, component: 'x', label: 'a' }],
    }));
    const out = await solvePhysicsProblem('Ô tô 54 km/h hãm phanh, chậm dần đều gia tốc độ lớn 3 m/s². Vận tốc sau 3 s?');
    expect(out.ok).toBe(true);
    expect(out.postcheck).toBeUndefined(); // không có warning ⇒ attachWarnings bỏ qua
    expect(out.answers[0].text).toBe('6 m/s');
  });
});
