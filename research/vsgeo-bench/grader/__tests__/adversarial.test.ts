// grader/__tests__/adversarial.test.ts
// ===========================================================================
// BỘ TEST TỰ-PHẢN-BIỆN (adversarial self-review) — design.md §4.3.
//
// Sau khi máy chấm chạy được và bộ test "đường hạnh phúc" (happy path) đã XANH hết, chúng
// em CỐ TÌNH ĐI TÌM CÁCH LÀM NÓ CHẤM SAI. Đây là bước quan trọng nhất với một "máy chấm
// oracle": một suite test xanh KHÔNG chứng minh máy chấm đúng — nó chỉ chứng minh máy chấm
// vượt qua ĐÚNG những ca ta đã nghĩ ra. Các lỗi dưới đây đều LỌT QUA suite gốc.
//
// Lỗi nguy hiểm nhất của máy chấm là FALSE POSITIVE: chấm "correct" cho một đáp án SAI
// (làm điểm benchmark ảo cao). Hai lỗi CRITICAL (F1, F2) đều thuộc loại này.
//
//   F1  boolean: "Không đúng" (=SAI) từng bị chấm bằng "đúng" vì bắt chuỗi con "đúng".
//   F2  mcq:     "A sai nên chọn C" (model chọn C) từng bị chấm là 'A' vì lấy chữ ĐẦU TIÊN.
//   F3  scalar:  đáp án lớn làm tròn 2 chữ số (8.49 của 6√2) từng bị chấm SAI oan (false neg).
//   F4  parse:   "\frac12" (thiếu ngoặc) từng đọc không ra → unsure (giảm recall).
//   F5  parse:   "1.5.2" (số hỏng) từng bị nuốt thành 1.5 (chấp nhận sai).
//
// MỖI test dưới đây là một "bằng chứng hồi quy": nếu ai đó lỡ tay làm hồi lại lỗi cũ,
// test này sẽ ĐỎ ngay.
// ===========================================================================
import { describe, it, expect } from 'vitest';
import { grade } from '../grade';
import { compareScalar, compareBoolean, compareMcq } from '../compare';
import { parseScalar } from '../normalize';
import type { Answer } from '../types';

const boolAns = (canonical: string): Answer => ({ canonical, type: 'boolean' });
const mcqAns = (canonical: string): Answer => ({ canonical, type: 'mcq' });

describe('F1 — boolean: phủ định KHÔNG được chấm thành khẳng định', () => {
  it('"Không đúng" (=SAI) KHÔNG bao giờ là correct khi đáp án chuẩn là "đúng"', () => {
    expect(grade('\\boxed{Không đúng}', boolAns('đúng')).verdict).toBe('incorrect');
    expect(grade('\\boxed{chưa đúng}', boolAns('đúng')).verdict).toBe('incorrect');
    expect(grade('\\boxed{Không đúng.}', boolAns('đúng')).verdict).toBe('incorrect');
  });
  it('phủ định của "sai" thì thành đúng: "không sai" == "đúng"', () => {
    expect(compareBoolean('không sai', 'đúng')).toBe('correct');
  });
  it('token phủ định trần vẫn là SAI: "Không"/"Chưa"/"ko" == "sai"', () => {
    expect(compareBoolean('Không', 'sai')).toBe('correct');
    expect(compareBoolean('Chưa', 'sai')).toBe('correct');
    expect(compareBoolean('ko', 'sai')).toBe('correct');
  });
  it('câu mơ hồ (không phải token/cụm rõ) → unsure, KHÔNG đoán bừa', () => {
    expect(compareBoolean('không đúng lắm', 'đúng')).toBe('unsure');
    expect(compareBoolean('có lẽ đúng', 'đúng')).toBe('unsure');
  });
  it('đường hạnh phúc vẫn nguyên: "Đúng"/"Sai" chấm chuẩn', () => {
    expect(compareBoolean('Đúng', 'đúng')).toBe('correct');
    expect(compareBoolean('Sai', 'đúng')).toBe('incorrect');
    expect(compareBoolean('true', 'đúng')).toBe('correct');
  });
});

describe('F2 — mcq: phải lấy chữ được CHỐT, không phải chữ đầu tiên', () => {
  it('"A sai nên chọn C" (model chọn C) KHÔNG được chấm là A', () => {
    expect(grade('\\boxed{A sai nên chọn C}', mcqAns('A')).verdict).toBe('incorrect');
    expect(grade('\\boxed{A sai nên chọn C}', mcqAns('C')).verdict).toBe('correct');
  });
  it('câu qua đường "Đáp án:" cũng lấy đúng chữ chốt cuối', () => {
    expect(grade('Kết luận: Vì A và B đều sai nên chọn D', mcqAns('A')).verdict).toBe('incorrect');
    expect(grade('Kết luận: Vì A và B đều sai nên chọn D', mcqAns('D')).verdict).toBe('correct');
  });
  it('liệt kê nhiều chữ mà không có cụm chốt → mơ hồ → unsure', () => {
    expect(compareMcq('A, B, C', 'A')).toBe('unsure');
  });
  it('đường hạnh phúc vẫn nguyên: "C", "Chọn đáp án B", "(B)"', () => {
    expect(compareMcq('C', 'C')).toBe('correct');
    expect(compareMcq('Chọn đáp án B', 'B')).toBe('correct');
    expect(compareMcq('(B)', 'B')).toBe('correct');
    expect(compareMcq('không có chữ cái', 'C')).toBe('unsure');
  });
});

describe('F3 — scalar: sai số theo ĐỘ LỚN, không phạt oan đáp án lớn làm tròn', () => {
  it('6√2 ≈ 8.4853: model viết 8.49 (làm tròn 2 chữ số) vẫn correct', () => {
    expect(compareScalar('8.49', '6√2')).toBe('correct');
    expect(compareScalar('84.85', '60√2')).toBe('correct');
  });
  it('nhưng đáp án nhỏ vẫn giữ chặt: 0.82 vs √6/3(≈0.8165) vẫn incorrect', () => {
    expect(compareScalar('0.82', '√6/3')).toBe('incorrect');
  });
  it('đáp án lớn KHÁC hẳn vẫn incorrect: 8.5 (=17/2) vs 6√2', () => {
    expect(compareScalar('8.5', '6√2')).toBe('incorrect');
  });
});

describe('F4/F5 — parse: đọc \\frac rút gọn; từ chối số hỏng', () => {
  it('F4 "\\frac12" đọc được thành 0.5 (dạng model hay xuất)', () => {
    expect(parseScalar('\\frac12')).toBeCloseTo(0.5, 9);
    expect(parseScalar('\\frac1{2}')).toBeCloseTo(0.5, 9);
    expect(parseScalar('\\frac{1}2')).toBeCloseTo(0.5, 9);
  });
  it('F4 KHÔNG làm hỏng dạng lồng ngoặc \\dfrac{\\sqrt{6}}{3}', () => {
    expect(parseScalar('\\dfrac{\\sqrt{6}}{3}')).toBeCloseTo(Math.sqrt(6) / 3, 9);
  });
  it('F5 số hỏng "1.5.2" → null (từ chối, không nuốt thành 1.5)', () => {
    expect(parseScalar('1.5.2')).toBeNull();
  });
  it('F5 số thập phân hợp lệ vẫn đọc bình thường (".5", "0.5", "1.5")', () => {
    expect(parseScalar('.5')).toBeCloseTo(0.5, 9);
    expect(parseScalar('0.5')).toBeCloseTo(0.5, 9);
    expect(parseScalar('1.5')).toBeCloseTo(1.5, 9);
  });
});
