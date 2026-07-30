import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { sweepIndexCount } from '../revolutionAnim';

// Nền tảng của animation "quét theo góc": AnimatedRevolutionSolid lộ mặt khối bằng
// geometry.setDrawRange(0, sweepIndexCount(total, sweepFrac)). Chỉ đúng NẾU LatheGeometry
// đánh chỉ số THEO GÓC trước (phi-major) — tức k chỉ số đầu = các lát góc đầu tiên. Ba bất
// biến dưới đây khoá đúng giả định đó với three thật (không cần canvas).
describe('LatheGeometry — cơ chế lộ theo góc bằng drawRange', () => {
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(1, 1), new THREE.Vector2(2, 4)];
  const SEGMENTS = 96;
  const geo = new THREE.LatheGeometry(pts, SEGMENTS);

  it('index.count = SEGMENTS·(points−1)·6 và chia hết 6 (mỗi quad = 2 tam giác)', () => {
    expect(geo.index).not.toBeNull();
    const total = geo.index!.count;
    expect(total).toBe(SEGMENTS * (pts.length - 1) * 6);
    expect(total % 6).toBe(0);
  });

  it('k chỉ số đầu chỉ chạm CÁC LÁT GÓC ĐẦU (phi-major): maxSegment ≈ sweepFrac·SEGMENTS', () => {
    const total = geo.index!.count;
    const idx = geo.index!.array;
    for (const f of [0.25, 0.5, 0.75]) {
      const k = sweepIndexCount(total, f);
      let maxSeg = 0;
      for (let n = 0; n < k; n++) {
        // vertex = j + i·points.length ⇒ segment i = floor(vertexIndex / points.length)
        maxSeg = Math.max(maxSeg, Math.floor(idx[n] / pts.length));
      }
      // Lộ đúng phần đầu ~f theo GÓC (không nhảy lung tung sang lát cuối).
      expect(maxSeg).toBeLessThanOrEqual(Math.ceil(SEGMENTS * f) + 1);
      expect(maxSeg).toBeGreaterThanOrEqual(Math.floor(SEGMENTS * f) - 2);
    }
  });

  it('sweepFrac 0 ⇒ ẩn hẳn; 1 ⇒ trọn khối', () => {
    const total = geo.index!.count;
    expect(sweepIndexCount(total, 0)).toBe(0);
    expect(sweepIndexCount(total, 1)).toBe(total);
  });
});
