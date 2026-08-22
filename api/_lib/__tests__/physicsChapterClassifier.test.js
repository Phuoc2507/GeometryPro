import { describe, it, expect } from 'vitest';
import { classifyPhysicsChapter, physicsChapterScores } from '../kernel-bridge/physicsChapterClassifier.js';

// Prefilter tất định cấp 2: đề ĐÃ là physics thuộc CHƯƠNG nào? Mặc định an toàn 'kinematics'.
// Nhận nhầm chương KHÔNG gây "đáp sai âm thầm" (engine chương kia abstain), nhưng vẫn muốn CHÍNH XÁC.

describe('classifyPhysicsChapter — định tuyến chương Vật lý', () => {
  it('DAO ĐỘNG: con lắc / biên độ / chu kỳ → oscillation', () => {
    expect(classifyPhysicsChapter('Một con lắc lò xo dao động điều hòa với biên độ 4 cm, chu kỳ 0,2 s. Viết phương trình dao động.')).toBe('oscillation');
    expect(classifyPhysicsChapter('Con lắc đơn dài 1 m dao động điều hòa, lấy g = π². Tính chu kỳ.')).toBe('oscillation');
    expect(classifyPhysicsChapter('Vật dao động điều hòa có li độ x = 3 cm, tần số góc 10 rad/s. Tính vận tốc.')).toBe('oscillation');
  });

  it('MẠCH ĐIỆN: điện trở / hiệu điện thế / cường độ dòng điện → circuit', () => {
    expect(classifyPhysicsChapter('Cho mạch điện gồm điện trở R1 mắc nối tiếp R2, hiệu điện thế nguồn 12 V. Tính cường độ dòng điện.')).toBe('circuit');
    expect(classifyPhysicsChapter('Nguồn điện suất điện động 6 V, điện trở trong 0,5 Ω mắc với bóng đèn. Tính công suất tiêu thụ.')).toBe('circuit');
    expect(classifyPhysicsChapter('Ba điện trở mắc song song vào hiệu điện thế 9 V, tính điện trở tương đương.')).toBe('circuit');
  });

  it('ĐỘNG LỰC HỌC: lực / ma sát / mặt nghiêng / ròng rọc → dynamics', () => {
    expect(classifyPhysicsChapter('Vật khối lượng 2 kg trên mặt phẳng nghiêng 30°, hệ số ma sát 0,2. Tính gia tốc.')).toBe('dynamics');
    expect(classifyPhysicsChapter('Hệ hai vật nối qua ròng rọc, m1 = 3 kg trên bàn, m2 = 2 kg treo. Tính gia tốc và lực căng dây.')).toBe('dynamics');
    // có "vận tốc/gia tốc" (động học) NHƯNG lực + ma sát mạnh hơn ⇒ dynamics.
    expect(classifyPhysicsChapter('Một vật 5 kg chịu lực ma sát khi trượt, hệ số ma sát 0,25, tính gia tốc và vận tốc sau 3 s.')).toBe('dynamics');
  });

  it('ĐỘNG HỌC (mặc định): rơi/ném/quãng đường/chuyển động thẳng → kinematics', () => {
    expect(classifyPhysicsChapter('Một ô tô chuyển động thẳng nhanh dần đều, vận tốc đầu 10 m/s, gia tốc 2 m/s². Tính quãng đường sau 5 s.')).toBe('kinematics');
    expect(classifyPhysicsChapter('Thả rơi tự do một vật từ độ cao 20 m, lấy g = 10. Tính thời gian chạm đất.')).toBe('kinematics');
    expect(classifyPhysicsChapter('Ném ngang một vật với vận tốc 10 m/s từ độ cao 45 m. Tính tầm xa.')).toBe('kinematics');
  });

  it('mặc định an toàn kinematics khi tín hiệu yếu/rỗng', () => {
    expect(classifyPhysicsChapter('')).toBe('kinematics');
    expect(classifyPhysicsChapter('Tính vận tốc của vật.')).toBe('kinematics');
    expect(classifyPhysicsChapter(null)).toBe('kinematics');
    expect(classifyPhysicsChapter(undefined)).toBe('kinematics');
  });

  it('physicsChapterScores trả điểm thô 4 chương (telemetry/debug)', () => {
    const s = physicsChapterScores('Cho mạch điện có điện trở R1 mắc nối tiếp, hiệu điện thế 12 V');
    expect(s.circuit).toBeGreaterThan(s.kinematics);
    expect(s).toHaveProperty('kinematics');
    expect(s).toHaveProperty('dynamics');
    expect(s).toHaveProperty('oscillation');
  });
});
