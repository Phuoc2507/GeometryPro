// src/lib/__tests__/subjectPrefilter.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Đối chiếu prefilter môn (mirror của subjectClassifier.js) trên BẢNG ĐỀ có nhãn.
// Gồm 3 đề "vàng" y hệt route test backend (PHYS/CHEM/GEO) + đề biên (mơ hồ, rỗng, đề hình
// lỡ dính đơn vị). Môn mặc định an toàn = geometry; 'unknown' (Lý-Hóa ngang nhau) gộp về geometry.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { detectSubject, classifySubject, subjectScores, type Subject } from '../subjectPrefilter';

// 3 đề khớp CHÍNH XÁC api/_lib/__tests__/analyze-problem-route.test.js (bản classifier thật).
const PHYS = 'Một ô tô đang chạy với tốc độ 54 km/h thì hãm phanh, chuyển động thẳng chậm dần đều với gia tốc 3 m/s². Tính vận tốc sau 3 s.';
const CHEM = 'Hòa tan hoàn toàn 5,4 g nhôm trong dung dịch HCl dư. Tính thể tích khí H2 ở đktc và khối lượng muối.';
const GEO = 'Cho hình chóp S.ABCD có đáy là hình vuông cạnh 2, SA vuông góc mặt đáy. Tính thể tích khối chóp và khoảng cách từ A đến mặt phẳng (SCD).';

// Bảng đề → nhãn kỳ vọng (detectSubject: 3 nhãn geometry|physics|chem).
const TABLE: { label: string; problem: string; expect: Subject }[] = [
  { label: 'ô tô hãm phanh (km/h, gia tốc)', problem: PHYS, expect: 'physics' },
  { label: 'hoà tan nhôm trong HCl (đktc, muối)', problem: CHEM, expect: 'chem' },
  { label: 'hình chóp S.ABCD (mặt phẳng, thể tích khối)', problem: GEO, expect: 'geometry' },
  {
    label: 'rơi tự do chạm đất (m/s²)',
    problem: 'Thả rơi tự do một vật từ độ cao 80 m, lấy g = 10 m/s². Tính thời gian vật chạm đất.',
    expect: 'physics',
  },
  {
    label: 'hai xe gặp nhau (km/h)',
    problem: 'Hai xe xuất phát cùng lúc, xe A tốc độ 40 km/h, xe B 60 km/h, sau bao lâu hai xe gặp nhau?',
    expect: 'physics',
  },
  {
    label: 'nung sắt tạo oxit (gam, oxit)',
    problem: 'Nung nóng 16,8 gam sắt trong khí oxi thu được oxit sắt từ. Tính khối lượng oxit tạo thành.',
    expect: 'chem',
  },
  {
    label: 'kết tủa từ dung dịch (phản ứng, kết tủa)',
    problem: 'Cho dung dịch NaOH vào dung dịch FeCl3, phản ứng tạo kết tủa nâu đỏ. Tính khối lượng kết tủa.',
    expect: 'chem',
  },
  {
    label: 'hình lập phương (đề hình thuần)',
    problem: 'Cho hình lập phương cạnh a. Tính thể tích khối lập phương và khoảng cách từ tâm đến một mặt.',
    expect: 'geometry',
  },
];

describe('detectSubject · bảng đề có nhãn', () => {
  for (const row of TABLE) {
    it(`${row.label} → ${row.expect}`, () => {
      expect(detectSubject(row.problem)).toBe(row.expect);
    });
  }
});

describe('detectSubject · biên & mặc định an toàn', () => {
  it('chuỗi rỗng / khoảng trắng → geometry (mặc định)', () => {
    expect(detectSubject('')).toBe('geometry');
    expect(detectSubject('   \n  ')).toBe('geometry');
    // Truyền sai kiểu (null) để chắc chắn không ném — cast vì strictNullChecks tắt.
    expect(detectSubject(null as unknown as string)).toBe('geometry');
  });

  it('đề mơ hồ (Lý và Hóa cùng mạnh, ngang nhau) → classifySubject=unknown, detectSubject=geometry', () => {
    const ambiguous = 'Vật chuyển động nhanh dần đều rồi phản ứng với dung dịch.';
    expect(classifySubject(ambiguous)).toBe('unknown');
    expect(detectSubject(ambiguous)).toBe('geometry'); // 'unknown' gộp về geometry (delegate luồng Toán)
  });

  it('đề hình lỡ dính vài token đơn vị vẫn là geometry (điểm hình vượt)', () => {
    const geoWithUnit = 'Cho hình chóp đều S.ABCD cạnh đáy 2, chiều cao 3. Tính thể tích khối chóp.';
    expect(detectSubject(geoWithUnit)).toBe('geometry');
  });

  it('tín hiệu Lý/Hóa quá yếu (dưới ngưỡng) → geometry', () => {
    // "vật" (WEAK=1) một mình < CONFIDENT_MIN(3) ⇒ mặc định geometry.
    expect(detectSubject('Cho một vật bất kỳ trong đề.')).toBe('geometry');
  });
});

describe('subjectScores · điểm thô phản ánh đúng môn', () => {
  it('đề Lý: physics vượt trội chem/geometry', () => {
    const s = subjectScores(PHYS);
    expect(s.physics).toBeGreaterThan(s.chem);
    expect(s.physics).toBeGreaterThan(s.geometry);
    expect(s.physics).toBeGreaterThanOrEqual(4);
  });

  it('đề Hóa: chem vượt trội (có điểm công thức HCl/H2)', () => {
    const s = subjectScores(CHEM);
    expect(s.chem).toBeGreaterThan(s.physics);
    expect(s.chem).toBeGreaterThan(s.geometry);
  });

  it('đề Hình: geometry vượt trội, Lý/Hóa ~0', () => {
    const s = subjectScores(GEO);
    expect(s.geometry).toBeGreaterThan(s.chem);
    expect(s.geometry).toBeGreaterThan(s.physics);
  });
});
