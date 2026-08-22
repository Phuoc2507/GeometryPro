// Entry runDynamics — hình dạng Result (§12), meta.model, propagate checks, chart handoff, chân trời
// ròng rọc (DY-8), queryIndex, đơn vị đầu ra SI (§9.4).
import { describe, it, expect } from 'vitest';
import { runDynamics } from '../runDynamics';

describe('runDynamics — hình dạng & meta', () => {
  it('parse lỗi ⇒ ok:false + errors có path, không ném', () => {
    const r = runDynamics({ problemName: '', ops: [], queries: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].message).toMatch(/Invalid dynamics plan/);
    expect(r.answers).toEqual([]);
  });

  it('meta.model config/direction cho từng cấu hình', () => {
    const ngang = runDynamics({ problemName: 'x', ops: [{ op: 'body', name: 'v', mass: 2 }, { op: 'force', on: 'v', value: 10 }], queries: [{ kind: 'acceleration', of: 'v' }] });
    expect(ngang.meta.model.config).toBe('ngang');
    const nghieng = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'v', on: 'incline', inclineDeg: 30 }], queries: [{ kind: 'acceleration', of: 'v' }] });
    expect(nghieng.meta.model.config).toBe('nghieng');
    const ban = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'm1', mass: 3 }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }], queries: [{ kind: 'acceleration' }] });
    expect(ban.meta.model.config).toBe('ban-treo');
    expect(ban.meta.model.direction).toBe('m2-di-xuong');
  });

  it('queryIndex gắn đúng thứ tự plan (kể cả khi query giữa chừng lỗi)', () => {
    const r = runDynamics({
      problemName: 'x', g: 10,
      ops: [{ op: 'body', name: 'v', mass: 2, mu: 0.3 }, { op: 'force', on: 'v', value: 10 }],
      queries: [
        { kind: 'acceleration', of: 'v', label: 'a' },
        { kind: 'velocity_at', of: 'v', t: 4, label: 'b' },
      ],
    });
    expect(r.answers.map((a) => a.queryIndex)).toEqual([0, 1]);
  });

  it('đơn vị đầu ra SI do engine ghi (§9.4)', () => {
    const r = runDynamics({
      problemName: 'x', g: 10,
      ops: [{ op: 'body', name: 'v', mass: 2, mu: 0.3 }, { op: 'force', on: 'v', value: 10 }],
      queries: [
        { kind: 'acceleration', of: 'v' }, { kind: 'force_value', force: 'weight', on: 'v' },
        { kind: 'normal_force', on: 'v' }, { kind: 'velocity_at', of: 'v', t: 2 },
        { kind: 'position_at', of: 'v', t: 2 },
      ],
    });
    expect(r.answers.map((a) => a.unit)).toEqual(['m/s²', 'N', 'N', 'm/s', 'm']);
  });

  it('DY-8: hệ 2 vật có horizonNote (chân trời ròng rọc lý tưởng hoá)', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'm1', mass: 3, on: 'hanging' }, { op: 'body', name: 'm2', mass: 2, on: 'hanging' }, { op: 'string', between: ['m1', 'm2'] }], queries: [{ kind: 'acceleration' }] });
    expect(r.meta.horizonNote).toMatch(/lý tưởng hóa/);
  });

  it('charts x_t/v_t handoff từ gia tốc engine', () => {
    const r = runDynamics({
      problemName: 'x',
      ops: [{ op: 'body', name: 'v', mass: 2 }, { op: 'force', on: 'v', value: 10 }],
      queries: [{ kind: 'velocity_at', of: 'v', t: 4 }],
      charts: [{ kind: 'v_t', of: ['v'] }, { kind: 'x_t', of: ['v'] }],
    });
    expect(r.charts).toHaveLength(2);
    const vt = r.charts.find((c) => c.kind === 'v_t');
    expect(vt?.series[0].samples[0]).toEqual([0, 0]); // v(0) = 0
    // v(4) = a·4 = 5·4 = 20 (a = 10/2 = 5)
    expect(vt?.series[0].samples[vt.series[0].samples.length - 1][1]).toBeCloseTo(20, 6);
  });

  it('bài thuần lực ⇒ T_phys = 2 s danh nghĩa (§10.2/§17.7)', () => {
    const r = runDynamics({ problemName: 'x', g: 10, ops: [{ op: 'body', name: 'v', mass: 4, on: 'incline', inclineDeg: 45, mu: 0.5 }], queries: [{ kind: 'acceleration', of: 'v' }] });
    expect(r.meta.tPhys).toBe(2);
  });

  it('bài có t trong query ⇒ T_phys = max(t)', () => {
    const r = runDynamics({ problemName: 'x', ops: [{ op: 'body', name: 'v', mass: 2 }, { op: 'force', on: 'v', value: 10 }], queries: [{ kind: 'velocity_at', of: 'v', t: 3 }] });
    expect(r.meta.tPhys).toBe(3);
  });
});
