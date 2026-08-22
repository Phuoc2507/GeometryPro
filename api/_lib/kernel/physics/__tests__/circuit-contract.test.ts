// Contract test — 10 bài C1–C10 (spec §11). Plan CHÉP NGUYÊN từ tài liệu; đáp là HỢP ĐỒNG tính tay
// (exact "11/20", "63/4", "18/5"…). Lệch thì SỬA CODE, KHÔNG sửa đáp. Mọi bài: ok, checks pass hết,
// approximate:false 100% (cam kết §7.4).
import { describe, it, expect } from 'vitest';
import { runCircuit, type CircuitResult } from '../runCircuit';

const texts = (r: CircuitResult) => r.answers.map((a) => a.text);
const units = (r: CircuitResult) => r.answers.map((a) => a.unit);
const allExact = (r: CircuitResult) => r.answers.every((a) => !a.approximate);
const checksPass = (r: CircuitResult) => r.checks.every((c) => c.pass);

describe('Circuit contract — 10 bài SGK/đề thi VN (spec §11)', () => {
  it('C1 nối tiếp thuần r=0: 12 Ω; 1 A; 8 V', () => {
    const r = runCircuit({
      problemName: 'noi-tiep-hai-dien-tro', source: { emf: 12 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 4 }, { kind: 'resistor', name: 'R2', ohms: 8 }] },
      queries: [{ kind: 'resistance', label: 'a' }, { kind: 'current', label: 'b' }, { kind: 'voltage', of: 'R2', label: 'c' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['12', '1', '8']);
    expect(units(r)).toEqual(['Ω', 'A', 'V']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C2 nối tiếp r≠0 + P + hao phí + công nguồn kJ: 1 A; 4 V; 3/2 W; 1/2 W; 18/5 kJ', () => {
    const r = runCircuit({
      problemName: 'noi-tiep-co-r', source: { emf: 6, r: 0.5 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 1.5 }, { kind: 'resistor', name: 'R2', ohms: 4 }] },
      queries: [
        { kind: 'current', label: 'a' },
        { kind: 'voltage', of: 'R2', label: 'b' },
        { kind: 'power', of: 'R1', label: 'c' },
        { kind: 'power_source', part: 'internal', label: 'd' },
        { kind: 'energy_source', t: 10, tUnit: 'min', unit: 'kJ', label: 'e' },
      ],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1', '4', '3/2', '1/2', '18/5']);
    expect(units(r)).toEqual(['A', 'V', 'W', 'W', 'kJ']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C3 song song 2 nhánh: 2 Ω; 3 A; 1 A', () => {
    const r = runCircuit({
      problemName: 'song-song-hai-nhanh', source: { emf: 6 },
      circuit: { kind: 'parallel', items: [{ kind: 'resistor', name: 'R1', ohms: 6 }, { kind: 'resistor', name: 'R2', ohms: 3 }] },
      queries: [{ kind: 'resistance', label: 'a' }, { kind: 'current', label: 'b' }, { kind: 'current', of: 'R1', label: 'c' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['2', '3', '1']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C4 song song 3 nhánh + r + công suất nguồn: 2 Ω; 3 A; 3/2 A; 27 W', () => {
    const r = runCircuit({
      problemName: 'song-song-ba-nhanh-co-r', source: { emf: 9, r: 1 },
      circuit: { kind: 'parallel', items: [
        { kind: 'resistor', name: 'R1', ohms: 6 }, { kind: 'resistor', name: 'R2', ohms: 12 }, { kind: 'resistor', name: 'R3', ohms: 4 }] },
      queries: [
        { kind: 'resistance', label: 'a' }, { kind: 'current', label: 'b' },
        { kind: 'current', of: 'R3', label: 'c' }, { kind: 'power_source', part: 'total', label: 'd' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['2', '3', '3/2', '27']);
    expect(units(r)).toEqual(['Ω', 'A', 'A', 'W']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C5 hỗn hợp R1 nt (R2//R3): 6 Ω; 2 A; 2/3 A', () => {
    const r = runCircuit({
      problemName: 'hon-hop-r1-nt-r2-ss-r3', source: { emf: 12 },
      circuit: { kind: 'series', items: [
        { kind: 'resistor', name: 'R1', ohms: 4 },
        { kind: 'parallel', name: 'P23', items: [{ kind: 'resistor', name: 'R2', ohms: 6 }, { kind: 'resistor', name: 'R3', ohms: 3 }] }] },
      queries: [{ kind: 'resistance', label: 'a' }, { kind: 'current', of: 'R1', label: 'b' }, { kind: 'current', of: 'R2', label: 'c' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['6', '2', '2/3']);
    expect(r.answers[2].approx).toBeCloseTo(0.6667, 3);
    expect(allExact(r)).toBe(true); // hữu tỉ exact — khóa hành vi displayExact phân số
    expect(checksPass(r)).toBe(true);
  });

  it('C6 hỗn hợp lồng 3 tầng + r + hiệu suất: 4 Ω; 2 A; 2/3 A; 80 %', () => {
    const r = runCircuit({
      problemName: 'hon-hop-long-ba-tang-hieu-suat', source: { emf: 10, r: 1 },
      circuit: { kind: 'series', items: [
        { kind: 'resistor', name: 'R1', ohms: 2 },
        { kind: 'parallel', name: 'cum', items: [
          { kind: 'resistor', name: 'R2', ohms: 3 },
          { kind: 'series', name: 'nhanh34', items: [{ kind: 'resistor', name: 'R3', ohms: 2 }, { kind: 'resistor', name: 'R4', ohms: 4 }] }] }] },
      queries: [
        { kind: 'resistance', label: 'a' }, { kind: 'current', label: 'b' },
        { kind: 'current', of: 'R4', label: 'c' }, { kind: 'efficiency', label: 'd' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['4', '2', '2/3', '80']);
    expect(units(r)).toEqual(['Ω', 'A', 'A', '%']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
    expect(r.checks.some((c) => c.kind === 'K4')).toBe(true); // hiệu suất 2 đường kiểm chéo
  });

  it('C7 hỗn hợp + U_MN giữa mạch: 9/2 V; 3/8 A; 63/4 W', () => {
    const r = runCircuit({
      problemName: 'hon-hop-u-giua-hai-diem', source: { emf: 12, r: 1 },
      circuit: { kind: 'series', items: [
        { kind: 'resistor', name: 'R1', ohms: 3 },
        { kind: 'parallel', name: 'MN', items: [{ kind: 'resistor', name: 'R2', ohms: 4 }, { kind: 'resistor', name: 'R3', ohms: 12 }] },
        { kind: 'resistor', name: 'R4', ohms: 1 }] },
      queries: [{ kind: 'voltage', of: 'MN', label: 'a' }, { kind: 'current', of: 'R3', label: 'b' }, { kind: 'power_source', part: 'external', label: 'c' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['9/2', '3/8', '63/4']);
    expect(units(r)).toEqual(['V', 'A', 'W']);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C8 đèn sáng bình thường: 12 Ω; 1/2 A; ratio 1 → sang_binh_thuong', () => {
    const r = runCircuit({
      problemName: 'den-sang-binh-thuong', source: { emf: 9 },
      circuit: { kind: 'series', items: [{ kind: 'lamp', name: 'den', ratedVolts: 6, ratedWatts: 3 }, { kind: 'resistor', name: 'Rb', ohms: 6 }] },
      queries: [{ kind: 'resistance', of: 'den', label: 'a' }, { kind: 'current', of: 'den', label: 'b' }, { kind: 'lamp_check', of: 'den', label: 'c' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['12', '1/2', '1']);
    expect(r.answers[2].unit).toBe('');
    expect(r.answers[2].verdict).toBe('sang_binh_thuong');
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C9 điện năng J ↔ kWh: 1100 W; 1 980 000 J; 11/20 kWh', () => {
    const r = runCircuit({
      problemName: 'bep-dien-kwh', source: { emf: 220 },
      circuit: { kind: 'resistor', name: 'bep', ohms: 44 },
      queries: [
        { kind: 'power', of: 'bep', label: 'a' },
        { kind: 'energy', of: 'bep', t: 30, tUnit: 'min', unit: 'J', label: 'b' },
        { kind: 'energy', of: 'bep', t: 30, tUnit: 'min', unit: 'kWh', label: 'c' }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['1100', '1980000', '11/20']);
    expect(units(r)).toEqual(['W', 'J', 'kWh']);
    expect(r.answers[2].approx).toBe(0.55);
    expect(allExact(r)).toBe(true);
    expect(checksPass(r)).toBe(true);
  });

  it('C10 nghịch: tìm Rx cho I = 1,2 A ⇒ Rx = 4 Ω, backsub residual 0', () => {
    const r = runCircuit({
      problemName: 'tim-r-de-i-cho-truoc', source: { emf: 12, r: 1 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 5 }, { kind: 'unknown_resistor', name: 'Rx' }] },
      queries: [{ kind: 'solve_resistance', of: 'Rx', targetCurrent: 1.2 }],
    });
    expect(r.ok).toBe(true);
    expect(texts(r)).toEqual(['4']);
    expect(units(r)).toEqual(['Ω']);
    expect(allExact(r)).toBe(true);
    expect(r.checks.find((c) => c.kind === 'solve_backsub')?.pass).toBe(true);
    expect(r.checks.find((c) => c.kind === 'solve_backsub')?.residual).toBe(0);
  });
});
