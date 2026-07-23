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
import { generateVariantsForSeed, DETERMINISTIC } from "../generate";
import { robustnessReport } from "../metrics";
import { seedNumeric, seedSymbolic, seedWithCoords } from "./fixtures";

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

describe("F4 — generate: phép bị bỏ được GHI LẠI (không nuốt lỗi im lặng)", () => {
  it("reflect bị bỏ (seed không toạ độ) được đếm vào bản ghi skips", async () => {
    // catch{} rỗng che mất trường hợp một phép hỏng cho MỌI seed => 0 biến thể mà không ai hay.
    // Tham số skips cho phép runGenerate cộng dồn và cảnh báo phép có 0 thành công.
    const skips: Record<string, number> = {};
    const vs = await generateVariantsForSeed(seedSymbolic, DETERMINISTIC, skips);
    expect(vs.map((v) => v.variant.kind).sort()).toEqual(["distractor", "rename", "rescale"]);
    expect(skips.reflect).toBe(1); // reflect ném => bị bỏ => phải được ghi
    expect(skips.rename ?? 0).toBe(0); // phép thành công không tăng skip
  });
});

describe("F5 — metrics: tập rỗng => NaN (không phải 0), byKind so với base ĐÚNG cha", () => {
  it("variants rỗng => overall là NaN, không phải gap giả '1'", () => {
    // accRecords([]) cũ trả 0 => overall = acc(base) - 0 = acc(base): đọc nhầm thành "rớt sạch".
    const base = [{ verdict: "correct" as const }];
    const rep = robustnessReport(base, []);
    expect(Number.isNaN(rep.overall)).toBe(true);
    expect(rep.nVariant).toBe(0);
  });

  it("byKind so biến thể với base của CHÍNH seed cha, không phải base toàn cục", () => {
    // S1 gốc ĐÚNG, S2 gốc SAI (base toàn cục = 0.5). rename chỉ áp cho S1 và làm S1 SAI.
    // Gap đúng của rename = acc(base S1)=1 - acc(rename)=0 = 1, KHÔNG phải 0.5 (base toàn cục).
    const base = [
      { verdict: "correct" as const, seedId: "vsgeo-0001" },
      { verdict: "incorrect" as const, seedId: "vsgeo-0002" },
    ];
    const variants = [
      { verdict: "incorrect" as const, perturbation: { kind: "rename" }, parentSeedId: "vsgeo-0001" },
    ];
    const rep = robustnessReport(base, variants);
    expect(rep.byKind.rename).toBeCloseTo(1, 9); // 1 (base cha) - 0 (rename) = 1
    expect(rep.counts.rename).toEqual({ nBase: 1, nVariant: 1 });
    expect(rep.nBase).toBe(2);
  });
});

describe("F9 — rescale: từ chối đề có toạ độ literal (tránh mâu thuẫn statement vs answer)", () => {
  it("seedWithCoords có A(1;2;3)/B(4;0;0) => PHẢI ném (không sinh biến thể mâu thuẫn)", () => {
    // Mâu thuẫn cụ thể nếu KHÔNG chặn: scaleLengthsInText không khớp toạ độ literal nên
    // câu vẫn "A(1;2;3) và B(4;0;0)" => AB=√22; nhưng figure.points và đáp án đều ×2 => 2√22.
    // Đề nói √22, đáp án lưu 2√22: model trả đúng √22 sẽ bị chấm SAI (§4.3 sai-im-lặng).
    // Co giãn toạ độ chỉ đúng cho bài thuần bậc đồng nhất và cần xử lý pt mặt/vector => thà bỏ.
    expect(() => rescale(seedWithCoords, 2)).toThrow(/to[aạ] độ|literal|co giãn/i);
  });

  it("hồi quy: đề KHÔNG có toạ độ literal vẫn co giãn bình thường (guard hẹp)", () => {
    // seedNumeric "ABCD.A'B'C'D' có cạnh 2" — không có A(x;y;z) => không bị chặn nhầm.
    expect(rescale(seedNumeric, 2).answer.canonical).toBe("64");
  });
});

describe("F10 — reflect: từ chối MỌI phương trình/ràng buộc, không chỉ dạng chuẩn tắc", () => {
  // HAS_EQUATION cũ /[xyz][+-]...[xyz]/ chỉ bắt dạng chuẩn "x+2y-2z=0"; bỏ lọt dạng đoạn chắn,
  // "z=2x+1", "x-5=0", "2x=z"... => reflect lật ĐIỂM nhưng để nguyên phương trình + đáp án =>
  // khoảng-cách-đến-mặt sai. Cách chắc chắn: bỏ toạ độ literal rồi nếu CÒN '=' thì bỏ qua.
  it("mặt phẳng dạng ĐOẠN CHẮN 'x/1 + y/2 + z/3 = 1' => PHẢI ném", () => {
    const s = mkCoordSeed({
      statement_vi:
        "Trong Oxyz cho mặt phẳng (P): x/1 + y/2 + z/3 = 1 và điểm M(3;4;5). Tính khoảng cách từ M đến (P).",
      answer: { canonical: "sqrt(2)", type: "surd" },
    });
    expect(() => reflect(s)).toThrow(/phương trình|ràng buộc|mặt phẳng|đường thẳng|bất biến/i);
  });

  it("phương trình 'z = 2x + 1' (không đúng dạng chuẩn) => PHẢI ném", () => {
    const s = mkCoordSeed({
      statement_vi:
        "Trong Oxyz cho A(1;2;3) và mặt phẳng z = 2x + 1. Tính khoảng cách từ A đến mặt phẳng đó.",
      answer: { canonical: "sqrt(5)", type: "surd" },
    });
    expect(() => reflect(s)).toThrow(/phương trình|ràng buộc|mặt phẳng|đường thẳng|bất biến/i);
  });

  it("ràng buộc 'x - 5 = 0' => PHẢI ném", () => {
    const s = mkCoordSeed({
      statement_vi:
        "Trong Oxyz cho mặt phẳng (P): x - 5 = 0 và điểm A(1;2;3). Tính khoảng cách từ A đến (P).",
      answer: { canonical: "4", type: "rational" },
    });
    expect(() => reflect(s)).toThrow(/phương trình|ràng buộc|mặt phẳng|đường thẳng|bất biến/i);
  });

  it("hồi quy dương: bài hai điểm THUẦN (không '=', không mặt phẳng) VẪN reflect được", () => {
    const s = mkCoordSeed({
      statement_vi: "Trong không gian Oxyz cho A(1;2;3) và B(4;0;0). Tính độ dài đoạn AB.",
      answer: { canonical: "sqrt(22)", type: "surd" },
    });
    const v = reflect(s);
    expect(v.statement_vi).toContain("A(-1;2;3)");
    expect(v.answer.canonical).toBe("sqrt(22)");
  });
});

describe("F11 — rescale: assertFullyScaled không được nhầm NHÃN đỉnh 'A' là cạnh ký hiệu 'a'", () => {
  // EDGE /.../gi bắt cả 'A' HOA (nhãn đỉnh) lẫn 'a' thường (cạnh ký hiệu). Sau khi "cạnh a"
  // đã thành "cạnh 2a" (đã co giãn), hậu-kiểm vẫn quét thấy nhãn "A" đứng tự do => ném NHẦM
  // => bài co-giãn-được BỊ BỎ (false-skip). Sửa /gi -> /g: chỉ 'a' thường mới là cạnh.
  it("đề có 'cạnh a' và nhãn đỉnh 'A' => VẪN co giãn được (không ném nhầm)", () => {
    const s = mkSeed({
      statement_vi: "Cho hình lập phương có cạnh a. Gọi A là một đỉnh. Tính thể tích.",
      answer: { canonical: "a^3", type: "rational" },
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("cạnh 2a");
    expect(v.answer.canonical).toBe("8*(a^3)");
  });

  it("hồi quy: cạnh ký hiệu 'a' THẬT chưa co giãn ('SA = a') vẫn PHẢI ném", () => {
    const s = mkSeed({
      statement_vi: "Cho hình chóp S.ABC có SA = a. Tính thể tích.",
      answer: { canonical: "a^3", type: "rational" },
    });
    expect(() => rescale(s, 2)).toThrow(/ký hiệu|chưa co giãn/i);
  });
});

describe("F12 — rescale: cổng '°/độ' phải sống (số đo góc KHÔNG kèm chữ 'góc')", () => {
  // Guard cũ /\d\s*(?:°|độ)\b/i CHẾT: '\b' sau ký tự phi-từ '°'/'ộ' không bao giờ khớp khi
  // theo sau là dấu câu/khoảng trắng => "45°.", "60 độ." lọt lưới. Nếu đề KHÔNG có chữ "góc"
  // (nhánh \bgóc\b không bắt) thì bài góc bị co giãn im lặng. Sửa: (?![\p{L}\d]) với cờ /u.
  it("số đo '45°' KHÔNG kèm chữ 'góc' vẫn PHẢI bị từ chối", () => {
    const s = mkSeed({
      statement_vi: "Khối chóp có mặt bên nghiêng 45° so với mặt phẳng đáy. Tính thể tích.",
      answer: { canonical: "24", type: "rational" },
    });
    expect(() => rescale(s, 2)).toThrow(/góc|độ|°/i);
  });

  it("số đo '60 độ' (đơn vị viết chữ) KHÔNG kèm 'góc' vẫn PHẢI bị từ chối", () => {
    const s = mkSeed({
      statement_vi: "Khối lăng trụ có mặt bên nghiêng 60 độ so với đáy. Tính thể tích.",
      answer: { canonical: "24", type: "rational" },
    });
    expect(() => rescale(s, 2)).toThrow(/góc|độ|°/i);
  });

  it("hồi quy: 'độ dài' (không có số ngay trước 'độ') KHÔNG bị nhầm là góc", () => {
    // Nhánh mới đòi \d NGAY trước 'độ' nên "Tính độ dài" (không số) không kích hoạt.
    const s = mkSeed({
      statement_vi: "Cho hình lập phương cạnh a. Tính độ dài đường chéo.",
      answer: { canonical: "a*sqrt(3)", type: "surd" },
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("cạnh 2a");
  });
});

describe("F13 — rescale: số đo độ dài KHÔNG kề từ khoá phải được co giãn hoặc BỎ QUA", () => {
  // scaleLengthsInText cũ chỉ nhân số NGAY sau từ khoá ("cạnh 3"); "cạnh đáy bằng 3" bị bỏ
  // sót => figure.points & đáp án ×k^bậc trong khi câu vẫn ghi 3 => statement MÂU THUẪN answer
  // (§4.3 sai-im-lặng, tệ hơn crash). (a) nới scaler cho "(đáy|bên|xung quanh|nghiêng)?(bằng)? số";
  // (b) hậu-kiểm assertNoUnscaledLength: còn số-độ-dài chưa nhân => BỎ QUA thay vì emit sai.
  it("(a) 'cạnh đáy bằng 3' phải được co giãn thành 6 (không giữ nguyên 3)", () => {
    const s = mkSeed({
      statement_vi: "Cho hình chóp có cạnh đáy bằng 3. Tính thể tích khối chóp.",
      answer: { canonical: "9", type: "rational" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("cạnh đáy bằng 6");
    expect(v.statement_vi).not.toContain("bằng 3");
    // đáp án ×2^3 = 72, nhất quán với câu đã đổi 3->6.
    expect(canonicalToNumber(v.answer.canonical)).toBeCloseTo(72, 6);
  });

  it("(b) số-độ-dài mà scaler nới rộng VẪN không nắm được => PHẢI ném (bỏ qua, không emit sai)", () => {
    // "cạnh của nó là 5": từ nối 'của ... là' không thuộc tập bổ nghĩa của scaler => không nhân
    // được; hậu-kiểm phát hiện 5 còn nguyên sau từ khoá 'cạnh' => bỏ qua.
    const s = mkSeed({
      statement_vi: "Cho hình vuông có cạnh của nó là 5. Tính thể tích khối tạo thành.",
      answer: { canonical: "125", type: "rational" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/co giãn|độ dài|bỏ qua/i);
  });

  it("(c) đề hỏi 'tỉ số' (bất biến co giãn) => PHẢI ném", () => {
    const s = mkSeed({
      statement_vi: "Cho hình chóp, tính tỉ số thể tích hai phần bị chia bởi mặt phẳng qua trung điểm.",
      answer: { canonical: "1/7", type: "ratio" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/tỉ số|tỉ lệ|bất biến|bỏ qua/i);
  });

  it("hồi quy: 'cạnh 2' vẫn ra 64, 'cạnh a' vẫn thành '2a' (không chặn nhầm)", () => {
    expect(rescale(seedNumeric, 2).answer.canonical).toBe("64");
    expect(scaleLengthsInText("cạnh a.", 2)).toBe("cạnh 2a.");
  });
});

describe("F14 — paraphrase: bắt HOÁN VAI cả gán KÝ HIỆU ('SA=2a, SB=a'), không chỉ gán số", () => {
  // assignmentMap cũ chỉ bắt RHS là SỐ (\d+) nên "SA=2a" chỉ lưu '2', "SB=a" bị bỏ hẳn =>
  // hoán vai ký hiệu (SA<->SB) lọt lưới: kiểm-số multiset {2}=={2}, gán số không phát hiện
  // => sinh biến thể đổi nghĩa mà đáp án giữ nguyên (§4.3 sai-im-lặng). Fix: RHS bắt trọn
  // token "hệ số + ký hiệu + luỹ thừa" (khởi đầu bằng số HOẶC chữ thường).
  it("hoán vai KÝ HIỆU 'SA=2a, SB=a' -> 'SA=a, SB=2a' => PHẢI ném", () => {
    expect(() =>
      assertParaphrasePreserves(
        "Cho tứ diện SABC có SA = 2a, SB = a. Tính thể tích.",
        "Cho tứ diện SABC có SA = a, SB = 2a. Tính thể tích."
      )
    ).toThrow(ParaphraseDriftError);
  });

  it("hồi quy: gán số 'SA=2, SB=3' hoán vai vẫn PHẢI ném (F6b không thoái lui)", () => {
    expect(() =>
      assertParaphrasePreserves(
        "Cho tứ diện SABC có SA = 2, SB = 3. Tính thể tích.",
        "Cho tứ diện SABC có SA = 3, SB = 2. Tính thể tích."
      )
    ).toThrow(ParaphraseDriftError);
  });

  it("hồi quy: giữ nguyên gán ký hiệu, chỉ đổi lời văn => KHÔNG ném", () => {
    expect(() =>
      assertParaphrasePreserves(
        "Cho tứ diện SABC có SA = 2a, SB = a. Tính thể tích.",
        "Xét tứ diện SABC với SA = 2a và SB = a. Hãy tính thể tích khối đó."
      )
    ).not.toThrow();
  });
});

// ===========================================================================
// LƯỢT ĐỐI KHÁNG THỨ HAI (F16–F21) — 6 ca SINH-SAI-IM-LẶNG lọt suite xanh cũ.
// ===========================================================================

describe("F16 — reflect: đại lượng CÓ DẤU/ĐỊNH HƯỚNG đổi dấu khi phản chiếu => PHẢI ném", () => {
  // Phản chiếu (x->-x) là phép ĐẢO HƯỚNG: tích hỗn hợp (scalar triple product), tích có hướng
  // (cross product), định thức đều ĐỔI DẤU. Cổng bất biến cũ chỉ soi topic (the_tich ∈ nhóm) +
  // lời văn (toạ độ/pt/mặt) => KHÔNG bắt "tích hỗn hợp" nên GIỮ đáp án "2" trong khi giá trị
  // thật hoá "-2" => sinh biến thể sai-im-lặng (§4.3).
  const seedSignedVolume = {
    id: "vsgeo-0101",
    source: { type: "synthetic", ref: "adversarial-F16" },
    statement_vi:
      "Trong không gian Oxyz cho A(1;0;0), B(0;1;0), C(0;0;1), D(1;1;1). Tính tích hỗn hợp của ba vectơ AB, AC, AD.",
    figure: {
      coords_given: true,
      points: [
        { id: "A", x: 1, y: 0, z: 0 },
        { id: "B", x: 0, y: 1, z: 0 },
        { id: "C", x: 0, y: 0, z: 1 },
        { id: "D", x: 1, y: 1, z: 1 },
      ],
    },
    answer: { canonical: "2", type: "rational" },
    tags: {
      topic: ["the_tich"],
      answer_form: "rational",
      difficulty: 2,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
  } as const;

  it("'tích hỗn hợp' (scalar triple product) => reflect PHẢI ném (đại lượng có dấu)", () => {
    expect(() => reflect(seedSignedVolume as any)).toThrow(
      /dấu|định hướng|hỗn hợp|có hướng|định thức/i
    );
  });
});

describe("F20 — rename: đáp án tham chiếu NHÃN ĐỈNH bị đổi tên => PHẢI ném", () => {
  // rename đổi nhãn trong statement (A->N, B->P...) nhưng để nguyên answer.canonical, vốn
  // giả định đáp án là ký hiệu thường + căn. SAI với đáp án mcq/point/vector/line/plane có
  // canonical LÀ biểu thức nhãn đỉnh (vd "AB"): sau rename câu hỏi "NP" mà đáp án vẫn "AB".
  const seedLabelAnswer = {
    id: "vsgeo-0105",
    source: { type: "synthetic", ref: "adversarial-F20" },
    statement_vi:
      "Cho hình chóp S.ABCD có đáy ABCD là hình bình hành. Gọi d là giao tuyến của hai mặt phẳng (SAB) và (SCD). Đường thẳng d song song với đường thẳng nào trong hai đường thẳng AB và AD?",
    answer: { canonical: "AB", type: "mcq" },
    tags: {
      topic: ["quan_he_song_song"],
      answer_form: "mcq",
      difficulty: 2,
      requires_auxiliary_construction: false,
    },
  } as const;

  it("đáp án 'AB' chứa nhãn đỉnh sẽ bị đổi tên => rename PHẢI ném", () => {
    expect(() => rename(seedLabelAnswer as any)).toThrow(/nhãn|đáp án|đỉnh/i);
  });

  it("hồi quy dương: đáp án surd 'a^3*sqrt(2)/12' (không nhãn đỉnh) VẪN rename được", () => {
    // seedSymbolic.answer.canonical = "a^3*sqrt(2)/12" — extractVertexLabels = [] => không chặn.
    const v = rename(seedSymbolic);
    expect(v.variant.kind).toBe("rename");
    expect(v.answer.canonical).toBe(seedSymbolic.answer.canonical);
  });

  it("extractVertexLabels trên các dạng đáp án số/ký hiệu trả [] (không chặn oan)", () => {
    expect(extractVertexLabels("8")).toEqual([]);
    expect(extractVertexLabels("a*sqrt(2)/12")).toEqual([]);
    expect(extractVertexLabels("AB")).toEqual(["A", "B"]);
  });
});

describe("F18 — rescale: 'số cạnh/mặt/đỉnh' là SỐ ĐẾM đa giác, không phải độ dài => PHẢI ném", () => {
  // scaleLengthsInText pattern-2 khớp "cạnh ... bằng N" và nhân N. Nhưng "số cạnh đáy bằng 6"
  // là SỐ ĐẾM (lục giác có 6 cạnh), không phải độ dài — nhân k biến lăng trụ lục giác thành
  // 12-giác => đổi hình. Scaler nhân số đếm NHẤT QUÁN với k nên hậu-kiểm số-đo không bắt được;
  // phải từ chối NGAY từ đầu.
  const seedSideCount = {
    id: "vsgeo-0103",
    source: { type: "synthetic", ref: "adversarial-F18" },
    statement_vi:
      "Cho hình lăng trụ đứng có đáy là đa giác đều với số cạnh đáy bằng 6, mỗi cạnh đáy bằng 2 và chiều cao bằng 5. Tính thể tích khối lăng trụ.",
    answer: { canonical: "30*sqrt(3)", type: "surd" },
    tags: {
      topic: ["the_tich"],
      answer_form: "surd",
      difficulty: 3,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
  } as const;

  it("'số cạnh đáy bằng 6' (số đếm) => rescale PHẢI ném", () => {
    expect(() => rescale(seedSideCount as any, 2)).toThrow(/số cạnh|đa giác|đếm|số\b/i);
  });
});

describe("F17/F19/F21 — rescale: hậu-kiểm SỐ-ĐO độc lập từ khoá + phủ đường chéo/cạnh trần", () => {
  // GỐC RỄ: scaleLengthsInText và assertNoUnscaledLength cũ dùng CHUNG một danh sách từ khoá
  // {cạnh|dài|cao|bán kính|đường kính|chiều cao|đường cao} nên có CHUNG điểm mù: mọi độ dài
  // diễn đạt khác (khoảng cách/đường chéo/cạnh trần "AB=3") thoát CẢ scaler LẪN lưới an toàn
  // => câu giữ độ dài gốc trong khi đáp án ×k^bậc => sai-im-lặng (§4.3). Part A: hậu-kiểm mọi
  // SỐ (trừ radicand/hệ-số-ký-hiệu/chỉ-số-nhãn) phải ×k. Part B: mở scaler cho đường chéo + cạnh trần.

  // #2 (F17): "khoảng cách ... bằng 3" (chiều cao cho dưới dạng khoảng cách) — scaler không
  // nắm được cụm giữa ("từ S đến (ABCD)") tuỳ ý, KHÔNG an toàn để co giãn bằng regex => PHẢI SKIP.
  const seedKhoangCach = {
    id: "vsgeo-0102",
    source: { type: "synthetic", ref: "adversarial-F17" },
    statement_vi:
      "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 2, khoảng cách từ S đến mặt phẳng (ABCD) bằng 3. Tính thể tích khối chóp S.ABCD.",
    answer: { canonical: "4", type: "rational" },
    tags: {
      topic: ["the_tich"],
      answer_form: "rational",
      difficulty: 2,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
  } as const;

  it("#2 'khoảng cách ... bằng 3' (scaler không nắm được) => PHẢI ném (bỏ qua)", () => {
    expect(() => rescale(seedKhoangCach as any, 2)).toThrow();
  });

  // #4 (F19): "AB = 3" gán cạnh TRẦN, không có từ khoá độ dài. Part B pattern-3 co giãn -> "AB = 6".
  const seedBareEdge = {
    id: "vsgeo-0104",
    source: { type: "synthetic", ref: "adversarial-F19" },
    statement_vi: "Cho tứ diện đều ABCD có AB = 3. Tính thể tích khối tứ diện ABCD.",
    answer: { canonical: "9*sqrt(2)/4", type: "surd" },
    tags: {
      topic: ["the_tich"],
      answer_form: "surd",
      difficulty: 3,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
  } as const;

  it("#4 'AB = 3' (cạnh trần) => KHÔNG được giữ trạng thái sai; Part B emit 'AB = 6'", () => {
    let v: any;
    try {
      v = rescale(seedBareEdge as any, 2);
    } catch {
      v = null;
    }
    // Bất biến an toàn: nếu CÓ emit thì cạnh phải đã co giãn (không còn "AB = 3").
    if (v) expect(v.statement_vi).not.toMatch(/AB\s*=\s*3\b/);
    // Có Part B: phải EMIT với cạnh đã co giãn thành 6.
    expect(v && v.statement_vi).toMatch(/AB\s*=\s*6\b/);
  });

  // #6 (F21): "đường chéo bằng 2√3" — "đường chéo" chưa trong từ khoá scaler. Part B thêm -> "4√3".
  const seedDiagonal = {
    id: "vsgeo-0106",
    source: { type: "synthetic", ref: "adversarial-F21" },
    statement_vi: "Cho hình lập phương ABCD.A'B'C'D' có đường chéo bằng 2√3. Tính thể tích khối lập phương.",
    answer: { canonical: "8", type: "rational" },
    tags: {
      topic: ["the_tich"],
      answer_form: "rational",
      difficulty: 2,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
  } as const;

  it("#6 'đường chéo bằng 2√3' => KHÔNG giữ '2√3' khi co giãn đáp án; Part B emit '4√3'", () => {
    let v: any;
    try {
      v = rescale(seedDiagonal as any, 2);
    } catch {
      v = null;
    }
    if (v) expect(v.statement_vi).not.toContain("2√3"); // nếu emit, hệ số đường chéo phải ×k
    expect(v && v.statement_vi).toContain("4√3"); // có Part B: emit đường chéo 4√3
  });

  // HỒI QUY DƯƠNG cho Part A (đảm bảo không over-refuse các dạng thường gặp):
  it("hồi quy Part A: 'cạnh 2' vẫn co giãn (đáp án số exact => 64)", () => {
    expect(rescale(seedNumeric, 2).answer.canonical).toBe("64");
  });

  it("hồi quy Part A: 'cạnh a' (không có số đo) VẪN emit, hệ số 2a được miễn", () => {
    const v = rescale(seedSymbolic, 2);
    expect(v.statement_vi).toContain("cạnh 2a");
    expect(v.variant.kind).toBe("rescale");
  });
});
