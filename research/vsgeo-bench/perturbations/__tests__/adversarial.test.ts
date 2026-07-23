// perturbations/__tests__/adversarial.test.ts
// ===========================================================================
// BỘ TEST TỰ-PHẢN-BIỆN cho BỘ BIẾN ĐỔI (design.md §4.3) — song song với
// grader/__tests__/adversarial.test.ts và harness/__tests__/adversarial.test.ts.
//
// Suite "đường hạnh phúc" (32 test) đã XANH hết. Nhưng một suite xanh KHÔNG chứng minh
// bộ biến đổi ĐÚNG — nó chỉ chứng minh ta vượt qua ĐÚNG các ca đã nghĩ ra. Một lượt review
// đối kháng độc lập lôi ra các lỗi SINH DỮ LIỆU SAI-IM-LẶNG (lớp §4.3 coi tệ hơn crash):
//
//   F1  rescale: sinh bài TỰ MÂU THUẪN mà không báo lỗi:
//        (a) under-scale: "SA = a" giữ nguyên trong khi đáp án ×k^degree;
//        (b) over-scale: "bằng" bắt cả góc ("bằng 60"→120) và thể-tích-cho-số (×k thay vì ×k³);
//        (b') cờ /i ở mẫu-1 biến "cạnh A." (nhãn HOA) thành "cạnh 2a" (hỏng nhãn);
//        (e) đáp án số không biểu diễn được exact bị lưu decimal .toFixed(4) (mất mát).
//   F2  reflect: cổng theo answer.TYPE (rational/surd...) không phân biệt được đại lượng
//        BẤT BIẾN (khoảng cách) với đại lượng ĐỔI theo phản chiếu (hoành độ) cùng type.
//   F3  rename: bể chữ đích trùng nhãn CHỈ-XUẤT-HIỆN-TRONG-LỜI-VĂN (trung điểm M) => A→M đụng M.
//   F4  generate: catch{} nuốt mọi lỗi => một phép hỏng CHO MỌI seed => 0 biến thể mà không cảnh báo.
//   F5  metrics: tập rỗng => gap giả 0 (đọc thành "rớt thảm hại"); byKind trừ base TOÀN CỤC (thiên lệch).
//   F6  paraphrase: guard bỏ sót (a) mất ký hiệu 'a' mà đáp án còn dùng; (b) hoán vai "SA=2,SB=3"→"SA=3,SB=2".
//   F8  distractor: câu nhiễu mặc định thêm điểm 'K' — nếu seed đã có 'K' thì đụng nhãn.
//
// MỖI test là một bằng chứng hồi quy: lỡ tay làm hồi lỗi cũ thì test này ĐỎ ngay.
// ===========================================================================
import { describe, it, expect } from "vitest";
import type { Seed } from "../../data/schema/problem";
import { rescale, scaleLengthsInText, canonicalToNumber } from "../rescale";
import { reflect } from "../reflect";
import { rename, extractVertexLabels } from "../rename";
import { distractor, DISTRACTOR_BANK } from "../distractor";
import { paraphrase, assertParaphrasePreserves, ParaphraseDriftError } from "../paraphrase";
import { seedNumeric, seedSymbolic } from "./fixtures";

// Bộ dựng seed tối thiểu cho các ca đối kháng (ghi đè trường cần thiết).
function mkSeed(over: Partial<Seed> & Pick<Seed, "statement_vi" | "answer">): Seed {
  return {
    id: "vsgeo-0009",
    source: { type: "synthetic", ref: "adversarial" },
    figure: { points: [], coords_given: false },
    tags: {
      topic: ["the_tich"],
      answer_form: "surd",
      difficulty: 1,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
    ...over,
  } as Seed;
}

describe("F1 — rescale: từ chối (skip) thay vì sinh bài tự mâu thuẫn", () => {
  it("(a) under-scale: 'SA = a' còn nguyên trong khi đáp án ×k => PHẢI ném (bị skip)", () => {
    const s = mkSeed({
      statement_vi:
        "Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, cạnh bên SA = a. Tính thể tích khối chóp.",
      answer: { canonical: "a^3/6", type: "surd" },
      scale_degree: 3,
    });
    // "cạnh a" -> "cạnh 2a" nhưng "SA = a" không đổi => hậu-kiểm bắt được độ dài ký hiệu sót.
    expect(() => rescale(s, 2)).toThrow(/ký hiệu|chưa co giãn/);
  });

  it("(b) over-scale góc: đề chứa 'góc ... bằng 60' => PHẢI ném (không nhân đôi góc)", () => {
    const s = mkSeed({
      statement_vi:
        "Cho hình chóp S.ABCD, góc giữa SC và mặt đáy bằng 60. Tính thể tích khối chóp.",
      answer: { canonical: "a^3*sqrt(3)/3", type: "surd" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/góc|độ/);
  });

  it("(b) over-scale thể tích cho bằng số: 'thể tích ... bằng 8' => PHẢI ném", () => {
    const s = mkSeed({
      statement_vi: "Cho khối chóp có thể tích bằng 8. Tính độ dài cạnh đáy.",
      answer: { canonical: "sqrt(6)", type: "surd" },
      scale_degree: 1,
    });
    expect(() => rescale(s, 2)).toThrow(/diện tích|thể tích/);
  });

  it("(b') mẫu-1 KHÔNG được đụng nhãn HOA: 'cạnh A.' giữ nguyên (không thành 'cạnh 2a')", () => {
    // Trước sửa: cờ /i làm 'A' khớp 'a' => "cạnh A." -> "cạnh 2a." (hỏng nhãn đỉnh).
    expect(scaleLengthsInText("Lấy điểm trên cạnh A.", 2)).toBe("Lấy điểm trên cạnh A.");
    // Cạnh ký hiệu thường vẫn co giãn:
    expect(scaleLengthsInText("hình vuông cạnh a.", 2)).toBe("hình vuông cạnh 2a.");
  });

  it("(e) đáp án số không biểu diễn exact được => KHÔNG lưu decimal mất mát, bọc ký hiệu", () => {
    const s = mkSeed({
      statement_vi: "Tính giá trị biểu thức đã cho.",
      answer: { canonical: "sqrt(2)+sqrt(3)", type: "surd" },
      scale_degree: 1,
    });
    const v = rescale(s, 2);
    // 2*(√2+√3) ≈ 6.2925 -> toExactForm.isExact=false. Lỗi cũ lưu "6.2925" (mất mát).
    expect(v.answer.canonical).not.toMatch(/^-?\d+\.\d+$/);
    // Vẫn đúng giá trị: canonicalToNumber(kết quả) = giá trị gốc × k^degree.
    expect(canonicalToNumber(v.answer.canonical)).toBeCloseTo(
      canonicalToNumber("sqrt(2)+sqrt(3)") * 2,
      6
    );
  });

  it("hồi quy: đáp án SỐ exact vẫn co giãn gọn (khối lập phương cạnh 2 => 64)", () => {
    const v = rescale(seedNumeric, 2);
    expect(v.answer.canonical).toBe("64");
  });
});

// Seed có toạ độ tối thiểu cho reflect (coords_given + points bắt buộc).
function mkCoordSeed(over: Partial<Seed> & Pick<Seed, "statement_vi" | "answer">): Seed {
  return mkSeed({
    figure: {
      points: [
        { id: "A", x: 1, y: 2, z: 3 },
        { id: "B", x: 4, y: 0, z: 0 },
      ],
      coords_given: true,
    },
    tags: {
      topic: ["khoang_cach"],
      answer_form: "surd",
      difficulty: 1,
      requires_auxiliary_construction: false,
    },
    scale_degree: 1,
    ...over,
  });
}

describe("F2 — reflect: cổng theo TÍNH BẤT BIẾN, không theo answer.type", () => {
  it("hỏi toạ độ ('hoành độ') dù type=rational vẫn PHẢI ném (đáp án đổi khi phản chiếu)", () => {
    // Lỗi cũ: type 'rational' ∈ INVARIANT_TYPES => reflect giữ nguyên đáp án "1" trong khi
    // hoành độ x=1 phản chiếu thành -1 => sinh biến thể SAI-IM-LẶNG.
    const s = mkCoordSeed({
      statement_vi: "Trong không gian Oxyz cho A(1;2;3). Tính hoành độ của điểm A.",
      answer: { canonical: "1", type: "rational" },
      tags: {
        topic: ["toa_do_oxyz", "khoang_cach"], // qua cổng topic, nhưng hỏi toạ độ => phải chặn
        answer_form: "rational",
        difficulty: 1,
        requires_auxiliary_construction: false,
      },
    });
    expect(() => reflect(s)).toThrow(/to[aạ] độ|hoành|bất biến/i);
  });

  it("có phương trình mặt phẳng (x+2y-2z=0) dù type=surd vẫn PHẢI ném", () => {
    // reflectCoordsInText đổi A(1;2;3)->A(-1;2;3) nhưng KHÔNG đổi hệ số phương trình =>
    // khoảng cách A đến (P) đổi giá trị, đáp án cũ sai. Type surd không nhận ra được điều này.
    const s = mkCoordSeed({
      statement_vi:
        "Trong Oxyz cho mặt phẳng (P): x+2y-2z=0 và điểm A(1;2;3). Tính khoảng cách từ A đến (P).",
      answer: { canonical: "sqrt(2)", type: "surd" },
    });
    expect(() => reflect(s)).toThrow(/phương trình|mặt phẳng|bất biến/i);
  });

  it("hồi quy dương: bài khoảng cách thuần (không toạ-độ-hỏi, không pt) VẪN reflect được", () => {
    const s = mkCoordSeed({
      statement_vi: "Trong không gian Oxyz cho A(1;2;3) và B(4;0;0). Tính độ dài đoạn AB.",
      answer: { canonical: "sqrt(22)", type: "surd" },
    });
    const v = reflect(s);
    expect(v.answer.canonical).toBe("sqrt(22)"); // bất biến, giữ nguyên
    expect(v.statement_vi).toContain("A(-1;2;3)");
  });
});

describe("F3 — rename: không chọn đích trùng nhãn CHỈ có trong lời văn", () => {
  it("nhãn phụ 'M' (trung điểm) trong lời văn không bị chọn làm đích => không gộp điểm", () => {
    // figure.points chỉ liệt kê đỉnh S,A,B,C,D; 'M' (trung điểm) chỉ nằm trong câu chữ.
    // Lỗi cũ: defaultRenameMap loại {S,A,B,C,D} khỏi bể => chọn 'M' làm đích cho 'S' =>
    // 'M' (S đổi tên) và 'M' (trung điểm gốc) trùng nhau: hai điểm khác nhau cùng tên.
    const s = mkSeed({
      statement_vi:
        "Cho hình chóp S.ABCD có M là trung điểm cạnh SA. Tính thể tích khối chóp.",
      answer: { canonical: "a^3/6", type: "surd" },
      figure: {
        points: [
          { id: "S", x: 0, y: 0, z: 1 },
          { id: "A", x: 0, y: 0, z: 0 },
          { id: "B", x: 1, y: 0, z: 0 },
          { id: "C", x: 1, y: 1, z: 0 },
          { id: "D", x: 0, y: 1, z: 0 },
        ],
        coords_given: false,
      },
    });
    const before = new Set(extractVertexLabels(s.statement_vi)).size; // {S,A,B,C,D,M} = 6
    const v = rename(s);
    const after = new Set(extractVertexLabels(v.statement_vi)).size;
    // Không đỉnh nào bị gộp nhãn: số nhãn phân biệt phải được bảo toàn.
    expect(after).toBe(before);
    // Cụ thể: 'M' phụ vẫn còn, nhưng KHÔNG được là đích của một đỉnh mới.
    expect(v.statement_vi).toContain("M là trung điểm");
  });
});

describe("F8 — distractor: không chèn câu đưa nhãn trùng với đề", () => {
  it("đề đã có điểm 'K' => KHÔNG dùng câu nhiễu giới thiệu 'K' (BANK[0])", () => {
    // BANK[0] "gọi K là một điểm tuỳ ý" — nếu đề đã có K, sinh ra hai điểm K khác nhau.
    const s = mkSeed({
      statement_vi: "Cho hình chóp S.ABCD, K là trung điểm cạnh SA. Tính thể tích khối chóp.",
      answer: { canonical: "a^3/6", type: "surd" },
    });
    const v = distractor(s);
    expect(v.statement_vi).not.toContain(DISTRACTOR_BANK[0]); // né câu đưa thêm 'K'
    expect(v.statement_vi).toContain(DISTRACTOR_BANK[1]); // dùng câu an toàn (không nhãn HOA)
    // Không phát sinh nhãn 'K' thứ hai từ câu nhiễu (K trong đề vẫn là K duy nhất).
    expect(v.statement_vi).toContain("K là trung điểm");
  });

  it("hồi quy: đề KHÔNG có 'K' vẫn dùng câu nhiễu mặc định BANK[0]", () => {
    const v = distractor(seedNumeric); // "ABCD.A'B'C'D'" — không có K
    expect(v.statement_vi).toContain(DISTRACTOR_BANK[0]);
  });
});

describe("F6 — paraphrase: bắt mất ký hiệu đáp án và hoán vai dữ kiện", () => {
  it("(a) rewriter đổi 'a'->'b' trong khi đáp án còn dùng 'a' => PHẢI ném", () => {
    // Lỗi cũ: 'a' là chữ THƯỜNG nên không tính là nhãn đỉnh, số cũng không đổi => lọt lưới,
    // đáp án 'a^3*sqrt(2)/12' trở nên vô nghĩa với đề đã đổi sang 'b'. (paraphrase.test còn để
    // sẵn badRewriter đúng ca này nhưng `void` bỏ qua — nay bắt được nhờ tham số answerCanonical.)
    expect(() =>
      assertParaphrasePreserves("hình vuông cạnh a.", "hình vuông cạnh b.", "a^3*sqrt(2)/12")
    ).toThrow(ParaphraseDriftError);
  });

  it("(a) tích hợp: paraphrase truyền answer.canonical => rewriter làm mất 'a' bị chặn", async () => {
    const aToB = async () =>
      "Cho hình chóp đều S.ABCD có đáy là hình vuông cạnh b. Tính thể tích khối chóp.";
    await expect(paraphrase(seedSymbolic, aToB)).rejects.toThrow(ParaphraseDriftError);
  });

  it("(b) hoán vai 'SA=2, SB=3' -> 'SA=3, SB=2' (giữ multiset số) => PHẢI ném", () => {
    // Kiểm-số dựa trên MULTISET nên {2,3}=={2,3} lọt; nhưng vai của SA/SB bị tráo => đề khác nghĩa.
    expect(() =>
      assertParaphrasePreserves(
        "Cho tứ diện SABC có SA = 2, SB = 3. Tính thể tích.",
        "Cho tứ diện SABC có SA = 3, SB = 2. Tính thể tích."
      )
    ).toThrow(ParaphraseDriftError);
  });

  it("hồi quy: paraphrase hợp lệ (giữ 'a', không hoán vai) VẪN chạy", async () => {
    const ok = async (t: string) => `Xét bài toán sau: ${t}`;
    const v = await paraphrase(seedSymbolic, ok);
    expect(v.statement_vi.startsWith("Xét bài toán sau:")).toBe(true);
    expect(v.answer.canonical).toBe(seedSymbolic.answer.canonical);
  });
});
