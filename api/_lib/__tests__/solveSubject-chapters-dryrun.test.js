import { describe, it, expect } from 'vitest';
import { solvePhysicsPlan } from '../kernel-bridge/solveSubject.js';

// DRY-RUN đa chương Lý: cấp PLAN JSON sẵn (KHÔNG qua LLM) → bridge AUTO-NHẬN chương từ hình dạng plan
// → chạy ĐÚNG engine → đối chiếu đáp golden + hình dạng scene. Chứng minh 3 engine (mạch điện / động lực
// học / dao động) ĐÃ NỐI được vào route (trước đây build+test riêng nhưng route chỉ tới kinematics).
// Tầng dịch LLM (đề chữ → plan) là lớp riêng, test thủ công/agent; ở đây khoá tầng engine tất định.

const byLabel = (r, l) => r.answers.find((a) => a.label === l);

describe('solvePhysicsPlan — auto-nhận chương + dispatch đúng engine', () => {
  it('MẠCH ĐIỆN: series[R1=4, //(R2=6,R3=3)] emf=12 → R_tđ=6Ω, I=2A; scene có bảng R/U/I/P', () => {
    const r = solvePhysicsPlan({
      problemName: 'hon-hop', source: { emf: 12 },
      circuit: { kind: 'series', items: [
        { kind: 'resistor', name: 'R1', ohms: 4 },
        { kind: 'parallel', name: 'P', items: [{ kind: 'resistor', name: 'R2', ohms: 6 }, { kind: 'resistor', name: 'R3', ohms: 3 }] },
      ] },
      queries: [{ kind: 'resistance', label: 'Rtd' }, { kind: 'current', label: 'I' }],
    });
    expect(r.subject).toBe('physics');
    expect(r.chapter).toBe('circuit');   // auto-nhận từ {source, circuit}
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
    expect(Number(byLabel(r, 'Rtd').text)).toBe(6);
    expect(Number(byLabel(r, 'I').text)).toBe(2);
    expect(Array.isArray(r.scene.table)).toBe(true);
    expect(r.scene.table.length).toBeGreaterThan(0);
    expect(r.scene.geometry).toBeTruthy();
  });

  it('ĐỘNG LỰC HỌC: m=2kg, μ=0,3, F=10N, g=10 → a=2 m/s²; scene có geometry chuyển động', () => {
    const r = solvePhysicsPlan({
      problemName: 'keo-ngang', g: 10,
      ops: [{ op: 'body', name: 'v', mass: 2, mu: 0.3 }, { op: 'force', on: 'v', value: 10 }],
      queries: [{ kind: 'acceleration', of: 'v', label: 'a' }],
    });
    expect(r.chapter).toBe('dynamics');  // auto-nhận từ op:'body'/'force'
    expect(r.ok).toBe(true);
    expect(byLabel(r, 'a').approx).toBeCloseTo(2, 9);
    expect(byLabel(r, 'a').unit).toBe('m/s²');
    expect(r.scene.geometry).toBeTruthy();
  });

  it('DAO ĐỘNG: A=4cm, ω=10π, φ=π/3 → T=1/5 s (exact); x(1/30 s) = −2 cm; scene có playback', () => {
    const r = solvePhysicsPlan({
      units: { length: 'cm', time: 's' },
      ops: [{ op: 'oscillator', name: 'vat', A: 4, omega: { n: 10, pi: true }, phi: { n: 1, d: 3, pi: true } }],
      queries: [{ kind: 'period', of: 'vat', label: 'T' }, { kind: 'x_at', of: 'vat', t: { n: 1, d: 30 }, label: 'x' }],
    });
    expect(r.chapter).toBe('oscillation'); // auto-nhận từ op:'oscillator'
    expect(r.ok).toBe(true);
    expect(byLabel(r, 'T').text).toBe('1/5');
    expect(byLabel(r, 'T').approx).toBeCloseTo(0.2, 9);
    expect(byLabel(r, 'x').approx).toBeCloseTo(-2, 9);
    expect(r.scene.geometry).toBeTruthy();
    expect(r.scene.playback).toBeTruthy();
  });

  it('KINEMATICS vẫn auto-nhận đúng (không hồi quy nhánh cũ)', () => {
    const r = solvePhysicsPlan({
      problemName: 'oto', units: { length: 'm', time: 's' },
      ops: [{ op: 'mover1d', name: 'oto', x0: 0, v0: 54, v0Unit: 'km/h', a: -3 }],
      queries: [{ kind: 'velocity_at', of: 'oto', t: 3, component: 'x', label: 'a' }],
    });
    expect(r.chapter).toBe('kinematics');
    expect(r.ok).toBe(true);
    expect(byLabel(r, 'a').text).toBe('6 m/s');
  });

  it('chapter tường minh (cưỡng chế) cũng dispatch đúng', () => {
    const r = solvePhysicsPlan({
      problemName: 'p', source: { emf: 6 },
      circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 2 }, { kind: 'resistor', name: 'R2', ohms: 1 }] },
      queries: [{ kind: 'resistance', label: 'Rtd' }],
    }, 'circuit');
    expect(r.chapter).toBe('circuit');
    expect(r.ok).toBe(true);
    expect(Number(byLabel(r, 'Rtd').text)).toBe(3);
  });
});
