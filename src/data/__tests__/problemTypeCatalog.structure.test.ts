import { describe, it, expect } from 'vitest';
import { problemTypeCatalog, type CatalogEntry } from '../problemTypeCatalog';

// Lớp A: chỉ kiểm CẤU TRÚC + TOÀN VẸN HÌNH (không đụng engine). Đáp số đúng-hay-sai là việc của Lớp B.
describe('problemTypeCatalog — guard cấu trúc (Lớp A)', () => {
  it('có ít nhất 7 dạng Mức-1 và vài dạng Mức-3', () => {
    const m1 = problemTypeCatalog.filter((e) => e.level === 1);
    const m3 = problemTypeCatalog.filter((e) => e.level === 3);
    expect(m1.length).toBeGreaterThanOrEqual(7);
    expect(m3.length).toBeGreaterThanOrEqual(5);
  });

  it('mọi dòng có type/note hợp lệ và level ∈ {1,3}', () => {
    for (const e of problemTypeCatalog) {
      expect(typeof e.type).toBe('string');
      expect(e.type.trim().length).toBeGreaterThan(0);
      expect(typeof e.note).toBe('string');
      expect(e.note.trim().length).toBeGreaterThan(0);
      expect([1, 3]).toContain(e.level);
    }
  });

  it('dòng Mức-1 PHẢI có example đầy đủ; Mức-3 KHÔNG có example', () => {
    for (const e of problemTypeCatalog) {
      if (e.level === 1) {
        expect(e.example, `Mức-1 "${e.type}" phải có example`).toBeDefined();
        const ex = e.example!;
        expect(ex.de.trim().length).toBeGreaterThan(0);
        expect(ex.answer.trim().length).toBeGreaterThan(0);
        expect(ex.sourceTest.trim().length).toBeGreaterThan(0);
        expect(['exact', 'numeric']).toContain(ex.exactness);
        expect(Number.isFinite(ex.expectApprox)).toBe(true);
        expect(ex.program).toBeTruthy();
        expect(typeof ex.program).toBe('object');
        if (ex.exactness === 'exact') {
          expect(typeof ex.expectText, `"${e.type}" exact phải có expectText`).toBe('string');
          expect(ex.expectText!.trim().length).toBeGreaterThan(0);
        }
      } else {
        expect(e.example, `Mức-3 "${e.type}" không được có example`).toBeUndefined();
      }
    }
  });

  it('mọi hình (nếu có) toàn vẹn: ≥3 điểm, toạ độ hữu hạn, đường tham chiếu điểm tồn tại', () => {
    const withGeom = problemTypeCatalog.filter((e) => e.example?.geometry);
    expect(withGeom.length).toBeGreaterThanOrEqual(5); // 5 dạng hình học
    for (const e of withGeom) {
      const g = e.example!.geometry!;
      expect(g.name.trim().length).toBeGreaterThan(0);
      expect(g.points.length).toBeGreaterThanOrEqual(3);
      const ids = new Set(g.points.map((p) => p.id));
      for (const p of g.points) {
        expect(p.id.trim().length).toBeGreaterThan(0);
        for (const c of [p.x, p.y, p.z]) expect(Number.isFinite(c)).toBe(true);
      }
      for (const ln of g.lines) {
        expect(ids.has(ln.from), `đường ${ln.id} có from="${ln.from}" không tồn tại`).toBe(true);
        expect(ids.has(ln.to), `đường ${ln.id} có to="${ln.to}" không tồn tại`).toBe(true);
      }
      for (const s of g.spheres ?? []) {
        for (const c of [s.center.x, s.center.y, s.center.z]) expect(Number.isFinite(c)).toBe(true);
        expect(s.radius).toBeGreaterThan(0);
      }
    }
  });

  it('hai dòng nhãn-lệch-SGK có curriculumNote', () => {
    const solve = problemTypeCatalog.find((e) => e.type === 'Giải phương trình');
    const optimize = problemTypeCatalog.find((e) => e.type === 'Cực trị');
    expect(solve?.curriculumNote?.trim().length).toBeGreaterThan(0);
    expect(optimize?.curriculumNote?.trim().length).toBeGreaterThan(0);
  });
});
