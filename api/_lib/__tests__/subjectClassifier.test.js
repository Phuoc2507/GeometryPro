import { describe, it, expect } from 'vitest';
import { classifySubject, subjectScores } from '../kernel-bridge/subjectClassifier.js';

// Bảng đề → nhãn kỳ vọng. Lý/Hóa lấy từ bộ đề vàng (golden L01–L12, H01–H12); geometry là
// vài đề Toán demo (gồm ca "bẫy": lăng trụ A1B1C1 có token giống công thức, đề Oxyz có toạ độ).
// Đề mơ hồ nặng (khớp cả Lý lẫn Hóa mạnh) → 'unknown'.
const CASES = [
  // ---- VẬT LÝ ----
  ['L01', 'physics', 'Một người đi xe đạp chuyển động thẳng đều với tốc độ 12 km/h, khởi hành từ A lúc 6 giờ. Lúc 6 giờ 45 phút người đó cách A bao nhiêu km?'],
  ['L02', 'physics', 'Một ô tô đang chạy với tốc độ 54 km/h thì hãm phanh, chuyển động thẳng chậm dần đều với gia tốc có độ lớn 3 m/s². Tính vận tốc của ô tô sau khi hãm 3 s.'],
  ['L03', 'physics', 'Thả một vật rơi tự do (không vận tốc đầu) từ độ cao 78,4 m. Lấy g = 9,8 m/s². Tính thời gian rơi và vận tốc khi chạm đất.'],
  ['L06', 'physics', 'Một máy bay bay theo phương ngang với tốc độ không đổi 100 m/s ở độ cao 500 m thì thả một gói hàng. Bỏ qua sức cản không khí, lấy g = 10 m/s². Sau bao lâu gói hàng chạm đất?'],
  ['L08', 'physics', 'Từ mặt đất, một quả bóng được ném với vận tốc đầu 40 m/s hợp với phương ngang góc 30°. Lấy g = 10 m/s². Tính tầm xa của quả bóng.'],
  ['L09', 'physics', 'Một xe máy chuyển động thẳng đều với tốc độ 10 m/s vừa đi qua vị trí cách ô tô 24 m thì ô tô xuất phát chuyển động nhanh dần đều với gia tốc 2 m/s². Sau bao lâu ô tô đuổi kịp xe máy?'],
  ['L11', 'physics', 'Từ mặt đất, vật A được ném thẳng đứng lên trên với vận tốc đầu 25 m/s. Cùng lúc đó từ độ cao 25 m vật B được thả rơi tự do. Lấy g = 10 m/s². Sau bao lâu hai vật gặp nhau?'],

  // ---- HÓA ----
  ['H01', 'chem', 'Hòa tan hoàn toàn 5,4 g nhôm trong dung dịch HCl dư. Viết phương trình hóa học. Tính thể tích khí H2 thoát ra ở điều kiện tiêu chuẩn (đktc) và khối lượng muối thu được.'],
  ['H02', 'chem', 'Cho 11,2 g sắt tác dụng hết với dung dịch H2SO4 loãng dư. Tính số mol H2 sinh ra và khối lượng muối FeSO4 tạo thành.'],
  ['H03', 'chem', 'Cho 6,5 g kẽm vào 200 ml dung dịch CuSO4 0,4M, khuấy đều đến khi phản ứng xảy ra hoàn toàn. Chất nào còn dư sau phản ứng? Tính khối lượng đồng sinh ra.'],
  ['H05', 'chem', 'Trộn 300 ml dung dịch H2SO4 0,5M với 200 ml dung dịch NaOH 2M. Chất nào còn dư? Tính nồng độ mol của muối và của chất dư trong dung dịch sau phản ứng.'],
  ['H08', 'chem', 'Nung 16,8 g NaHCO3 đến khối lượng không đổi. Tính khối lượng chất rắn Na2CO3 thu được và thể tích khí CO2 sinh ra ở điều kiện chuẩn.'],
  ['H09', 'chem', 'Nung 31,6 g KMnO4 đến khi phản ứng xảy ra hoàn toàn. Viết phương trình hóa học. Tính thể tích khí O2 thu được ở đktc.'],
  ['H12', 'chem', 'Nhỏ từ từ dung dịch NaOH vào ống nghiệm đựng dung dịch FeCl2, sau đó để ống nghiệm ngoài không khí. Nêu hiện tượng và viết phương trình hóa học của phản ứng.'],

  // ---- HÌNH HỌC (mặc định an toàn) ----
  ['G-chop', 'geometry', 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 2, SA vuông góc với mặt đáy và SA = 2. Tính khoảng cách từ A đến mặt phẳng (SCD) và thể tích khối chóp.'],
  ['G-lapphuong', 'geometry', 'Cho hình lập phương ABCD.A1B1C1D1 cạnh a. Tính khoảng cách từ đỉnh A đến mặt phẳng (A1BD).'],
  ['G-langtru', 'geometry', 'Cho lăng trụ đứng ABC.A1B1C1 có đáy là tam giác vuông tại A. Tính thể tích khối lăng trụ và khoảng cách từ B đến mặt phẳng (A1BC).'],
  ['G-oxyz', 'geometry', 'Trong không gian Oxyz, cho mặt cầu (S) và ba điểm A, B, C. Viết phương trình mặt phẳng đi qua ba điểm và tính bán kính đường tròn giao tuyến.'],
  ['G-tudien', 'geometry', 'Cho tứ diện ABCD, G là trọng tâm tứ diện, G1 là trọng tâm tam giác BCD. Chứng minh A, G, G1 thẳng hàng.'],
  ['G-daiso', 'geometry', 'Giải phương trình bậc hai x^2 - 5x + 6 = 0 và tìm tập nghiệm.'],
];

describe('classifySubject — bảng đề vàng + hình học demo', () => {
  for (const [id, expected, problem] of CASES) {
    it(`${id} → ${expected}`, () => {
      const got = classifySubject(problem);
      // In điểm để dễ chẩn khi lệch (không assert điểm, chỉ assert nhãn).
      if (got !== expected) {
        // eslint-disable-next-line no-console
        console.error(`${id} scores`, subjectScores(problem), '→', got, 'expected', expected);
      }
      expect(got).toBe(expected);
    });
  }
});

describe('classifySubject — biên & rỗng', () => {
  it('chuỗi rỗng → geometry (mặc định an toàn)', () => {
    expect(classifySubject('')).toBe('geometry');
    expect(classifySubject('   ')).toBe('geometry');
    expect(classifySubject(null)).toBe('geometry');
  });
  it('đề trung tính không dấu hiệu Lý/Hóa → geometry', () => {
    expect(classifySubject('Tính giá trị lớn nhất của biểu thức đã cho.')).toBe('geometry');
  });
  it('token giống công thức trong đề hình (A1B1C1) KHÔNG kéo sang chem', () => {
    const s = subjectScores('Cho lăng trụ ABC.A1B1C1 tính thể tích khối lăng trụ.');
    expect(s.chem).toBe(0); // A1B1C1 toàn hoa+số ⇒ regex công thức bỏ qua
  });
});
