import { describe, it, expect } from 'vitest';
import { classifySubject } from '../kernel-bridge/subjectClassifier.js';
import { classifyPhysicsChapter } from '../kernel-bridge/physicsChapterClassifier.js';
import { wiredPhysicsChapters } from '../kernel-bridge/solveSubject.js';

// TÍCH HỢP ĐỊNH TUYẾN (tất định, KHÔNG LLM): đề chữ → subjectClassifier → 'physics' → chapterClassifier
// → đúng chương → registry có bộ dịch (prompt non-null). Đây là chuỗi khiến 3 chương mới (mạch điện/
// động lực học/dao động) DÙNG ĐƯỢC end-to-end. Bước dịch LLM (đề→plan) validate riêng ở tầng prompt.

const PROBLEMS = {
  circuit: 'Cho mạch điện gồm điện trở R1 = 4 Ω mắc nối tiếp với R2 = 6 Ω, hiệu điện thế hai đầu đoạn mạch 12 V. Tính cường độ dòng điện trong mạch.',
  dynamics: 'Một vật khối lượng 2 kg đặt trên mặt phẳng nghiêng góc 30°, hệ số ma sát 0,2. Tính gia tốc của vật khi trượt xuống.',
  oscillation: 'Một con lắc lò xo dao động điều hòa với biên độ 4 cm, chu kỳ 0,2 s. Viết phương trình dao động và tính vận tốc cực đại.',
  kinematics: 'Một ô tô chuyển động thẳng nhanh dần đều, vận tốc đầu 10 m/s, gia tốc 2 m/s². Tính quãng đường đi được sau 5 s.',
  waves: 'Một sóng cơ truyền trên dây với bước sóng 40 cm và tần số 500 Hz. Tính vận tốc truyền sóng và độ lệch pha giữa hai điểm cách nhau 17 cm.',
  efield: 'Hai điện tích điểm đặt tại A và B. Tính cường độ điện trường tại điểm M do các điện tích điểm gây ra.',
  ac: 'Đặt điện áp xoay chiều u = 200cos(100πt) V vào đoạn mạch RLC nối tiếp gồm điện trở R = 50 Ω, cuộn cảm và tụ điện. Tính tổng trở và cường độ dòng điện hiệu dụng.',
  gasHeat: 'Một mol khí lý tưởng ở 27°C, áp suất 2 atm, nén đẳng nhiệt đến thể tích 3 lít. Tính áp suất khí sau khi nén.',
};

describe('Định tuyến Lý end-to-end (deterministic) — 4 chương đã nối route', () => {
  for (const [chapter, problem] of Object.entries(PROBLEMS)) {
    it(`${chapter}: đề → subject 'physics' → chapter '${chapter}'`, () => {
      expect(classifySubject(problem)).toBe('physics');
      expect(classifyPhysicsChapter(problem)).toBe(chapter);
    });
  }

  it('cả 8 chương Lý ĐÃ có bộ dịch (prompt non-null) — nhận đề chữ end-to-end', () => {
    const wired = wiredPhysicsChapters();
    for (const ch of ['kinematics', 'dynamics', 'circuit', 'oscillation', 'waves', 'efield', 'ac', 'gasHeat']) {
      expect(wired).toContain(ch);
    }
  });

  it('phân biệt AC vs DC: đề xoay chiều → ac, đề một chiều → circuit (không lẫn)', () => {
    expect(classifyPhysicsChapter('Đặt điện áp xoay chiều vào mạch RLC nối tiếp, cuộn cảm và tụ điện, tính tổng trở.')).toBe('ac');
    expect(classifyPhysicsChapter('Mạch điện một chiều gồm R1 nối tiếp R2, hiệu điện thế 12 V, tính cường độ dòng điện.')).toBe('circuit');
  });

  it('gas-heat mang "mol" (tín hiệu Hóa) vẫn route physics, KHÔNG rơi chem', () => {
    expect(classifySubject('Một mol khí lý tưởng đẳng nhiệt, tính thể tích.')).toBe('physics');
    expect(classifySubject('Hòa tan 5,4 gam Al trong dung dịch HCl dư thu 0,3 mol khí H2.')).toBe('chem');
  });
});

describe('Không hồi quy định tuyến môn khác + chương chưa nối', () => {
  it('đề Toán vẫn → geometry (không bị nhận nhầm physics)', () => {
    expect(classifySubject('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA vuông góc với mặt phẳng đáy. Tính thể tích khối chóp.')).toBe('geometry');
  });
  it('đề Hóa vẫn → chem', () => {
    expect(classifySubject('Hòa tan 5,4 gam Al trong dung dịch HCl dư. Tính thể tích khí H2 thoát ra ở đktc.')).toBe('chem');
  });
  it('từ trường / hạt nhân (CHƯA có engine) vẫn stop-word → geometry (thà rơi Toán còn hơn abstain)', () => {
    expect(classifySubject('Một hạt điện tích chuyển động trong từ trường đều, xác định lực Lorentz.')).toBe('geometry');
    expect(classifySubject('Tính năng lượng liên kết hạt nhân urani, phóng xạ alpha.')).toBe('geometry');
    // các chương này CHƯA có trong danh sách wired (chưa build engine)
    const wired = wiredPhysicsChapters();
    expect(wired).not.toContain('magnetism');
    expect(wired).not.toContain('nuclear');
  });
});
