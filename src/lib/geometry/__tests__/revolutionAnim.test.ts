import { describe, it, expect } from 'vitest';
import { revolutionPhase, sweepIndexCount, buildBladeRegion, REVOLVE_PHASE1_END } from '../revolutionAnim';

describe('revolutionPhase — 2 giai đoạn: vẽ phẳng rồi quay', () => {
  it('t=0 → giai đoạn 1, chưa quay', () => {
    const p = revolutionPhase(0);
    expect(p.phase).toBe(1);
    expect(p.drawFrac).toBeCloseTo(0, 9);
    expect(p.sweepFrac).toBe(0);
    expect(p.angle).toBe(0);
  });

  it('cuối giai đoạn 1 → miền vẽ xong (drawFrac=1) nhưng vẫn chưa quay', () => {
    const p = revolutionPhase(REVOLVE_PHASE1_END);
    expect(p.phase).toBe(1);
    expect(p.drawFrac).toBeCloseTo(1, 9);
    expect(p.sweepFrac).toBe(0);
    expect(p.angle).toBe(0);
  });

  it('giữa giai đoạn 2 → quay một nửa (π)', () => {
    const mid = REVOLVE_PHASE1_END + (1 - REVOLVE_PHASE1_END) / 2;
    const p = revolutionPhase(mid);
    expect(p.phase).toBe(2);
    expect(p.drawFrac).toBe(1);
    expect(p.sweepFrac).toBeCloseTo(0.5, 9);
    expect(p.angle).toBeCloseTo(Math.PI, 9);
  });

  it('t=1 → quay trọn 360°, khối đầy đủ', () => {
    const p = revolutionPhase(1);
    expect(p.phase).toBe(2);
    expect(p.sweepFrac).toBeCloseTo(1, 9);
    expect(p.angle).toBeCloseTo(Math.PI * 2, 9);
  });

  it('kẹp ngoài [0,1]', () => {
    expect(revolutionPhase(-1).sweepFrac).toBe(0);
    expect(revolutionPhase(-1).phase).toBe(1);
    expect(revolutionPhase(2).sweepFrac).toBeCloseTo(1, 9);
  });
});

describe('sweepIndexCount — lộ lưỡi quét theo góc bằng drawRange', () => {
  it('0 khi chưa quay', () => {
    expect(sweepIndexCount(600, 0)).toBe(0);
  });
  it('đầy đủ khi quét trọn (kể cả total không chia hết 6)', () => {
    expect(sweepIndexCount(600, 1)).toBe(600);
    expect(sweepIndexCount(604, 1)).toBe(604);
  });
  it('làm tròn XUỐNG bội 6 để giữ nguyên tam giác', () => {
    // 604 * 0.5 = 302 → về 300 (bội 6)
    expect(sweepIndexCount(604, 0.5)).toBe(300);
  });
  it('kẹp biên', () => {
    expect(sweepIndexCount(600, -0.2)).toBe(0);
    expect(sweepIndexCount(600, 5)).toBe(600);
  });
});

describe('buildBladeRegion — vòng kín miền kinh tuyến (hệ đầu-vào Lathe: x=bán kính, y=cao)', () => {
  const outer = [
    { radius: 0, axial: 0 },
    { radius: 1, axial: 1 },
    { radius: 2, axial: 4 },
  ];

  it('Ox không lỗ: khép về trục (x=0) ở hai đầu, ôm đường cong ở giữa', () => {
    const loop = buildBladeRegion({ outer, inner: null, domain: [0, 4], aroundOy: false, oyDisk: false, axisY: 0 });
    expect(loop[0]).toEqual({ x: 0, y: 0 });                       // đầu trên trục
    expect(loop[loop.length - 1]).toEqual({ x: 0, y: 4 });         // cuối trên trục
    // giữa là các điểm đường cong (bán kính = |r|)
    expect(loop).toContainEqual({ x: 2, y: 4 });
    expect(loop.length).toBe(outer.length + 2);
  });

  it('Ox trục dời y=axisY: bán kính = |r − axisY|', () => {
    const loop = buildBladeRegion({ outer, inner: null, domain: [0, 4], aroundOy: false, oyDisk: false, axisY: 1 });
    // r=0 → |0-1|=1 ; r=2 → |2-1|=1
    expect(loop).toContainEqual({ x: 1, y: 0 });
    expect(loop).toContainEqual({ x: 1, y: 4 });
  });

  it('Ox có lỗ (washer): đi biên ngoài rồi vòng về biên trong, khép kín', () => {
    const inner = [
      { radius: 0.2, axial: 0 },
      { radius: 0.5, axial: 4 },
    ];
    const loop = buildBladeRegion({ outer, inner, domain: [0, 4], aroundOy: false, oyDisk: false, axisY: 0 });
    // điểm đầu = biên ngoài đầu tiên; điểm khép cuối trùng điểm đầu
    expect(loop[0]).toEqual({ x: 0, y: 0 });
    expect(loop[loop.length - 1]).toEqual(loop[0]);
    // có chứa biên trong (đảo chiều)
    expect(loop).toContainEqual({ x: 0.5, y: 4 });
  });

  it('Oy vỏ trụ (shell): đáy y=0, x=bán kính-từ-Oy = axial', () => {
    const loop = buildBladeRegion({ outer, inner: null, domain: [0, 4], aroundOy: true, oyDisk: false, axisY: 0 });
    expect(loop[0]).toEqual({ x: 0, y: 0 });   // (a,0)
    expect(loop[loop.length - 1]).toEqual({ x: 4, y: 0 }); // (b,0)
    expect(loop).toContainEqual({ x: 4, y: 2 }); // đỉnh: axial=4 → x, radius=2 → y
  });
});
