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
};

describe('Định tuyến Lý end-to-end (deterministic) — 4 chương đã nối route', () => {
  for (const [chapter, problem] of Object.entries(PROBLEMS)) {
    it(`${chapter}: đề → subject 'physics' → chapter '${chapter}'`, () => {
      expect(classifySubject(problem)).toBe('physics');
      expect(classifyPhysicsChapter(problem)).toBe(chapter);
    });
  }

  it('cả 4 chương Lý ĐÃ có bộ dịch (prompt non-null) — nhận đề chữ end-to-end', () => {
    const wired = wiredPhysicsChapters();
    expect(wired).toContain('kinematics');
    expect(wired).toContain('dynamics');
    expect(wired).toContain('circuit');
    expect(wired).toContain('oscillation');
  });
});

describe('Không hồi quy định tuyến môn khác + chương chưa nối', () => {
  it('đề Toán vẫn → geometry (không bị nhận nhầm physics)', () => {
    expect(classifySubject('Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA vuông góc với mặt phẳng đáy. Tính thể tích khối chóp.')).toBe('geometry');
  });
  it('đề Hóa vẫn → chem', () => {
    expect(classifySubject('Hòa tan 5,4 gam Al trong dung dịch HCl dư. Tính thể tích khí H2 thoát ra ở đktc.')).toBe('chem');
  });
  it('điện trường (efield CHƯA nối) vẫn stop-word → geometry (thà rơi Toán còn hơn abstain)', () => {
    expect(classifySubject('Xác định cường độ điện trường tại điểm M do điện tích điểm gây ra.')).toBe('geometry');
    expect(wiredPhysicsChapters()).not.toContain('efield');
  });
});
