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
import { rename, extractVertexLabels, extractRayAnchors } from "../rename";
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
    // NOTE(F22): câu phải chứa MỘT độ dài co giãn được ('cạnh a') để không dính CHỐT "không-đổi"
    // mới (đáp án ×factor mà lời văn y hệt ⇒ ném). Trọng tâm test (e) — đáp án số không-exact
    // KHÔNG bị lưu decimal cắt cụt mà được bọc ký hiệu — vẫn nguyên vẹn.
    const s = mkSeed({
      statement_vi: "Cho hình lập phương cạnh a. Tính giá trị biểu thức đã cho.",
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

// ===========================================================================
// LƯỢT ĐỐI KHÁNG THỨ TƯ (F22–F26) — 17 ca SINH-SAI-IM-LẶNG do AUDIT chạy CODE THẬT (tsx)
// xác nhận: transform EMIT một biến thể có statement mâu thuẫn answer.canonical. §4.3 "thà bỏ
// còn hơn sai" ⇒ mọi ca dưới đây PHẢI trở thành SKIP (throw). Mỗi test = một bằng chứng hồi quy.
// ===========================================================================

describe("F22 — rescale: CHỐT 'không-đổi' — đáp án ×factor mà lời văn y hệt => PHẢI ném (skip)", () => {
  // Điểm mù TỔNG QUÁT của cỗ máy co-giãn-ký-hiệu (chỉ nắm ký hiệu 'a'): ký hiệu khác 'a' (h,b,x),
  // hệ số+ký hiệu (2x), đơn vị dính số (3m,6cm,5dm), hay căn trần (√3) đều khiến scaler GIỮ NGUYÊN
  // lời văn, trong khi nhánh đáp án vẫn ×factor ⇒ câu mâu thuẫn đáp án. CHỐT so byte statement.
  const seedsF22: any[] = [
    // Seed 1 — cạnh ký hiệu 'h' (khác 'a'), bậc 1.
    {"id":"vsgeo-7101","source":{"type":"synthetic","ref":"lap-phuong-duong-cheo-h"},"statement_vi":"Cho hình lập phương ABCD.A'B'C'D' có cạnh bằng h. Tính độ dài đường chéo của hình lập phương đó.","answer":{"canonical":"h√3","type":"surd"},"tags":{"topic":["hinh_hoc_khong_gian","do_dai"],"answer_form":"surd","difficulty":1,"requires_auxiliary_construction":false},"scale_degree":1},
    // Seed 2 — cạnh ký hiệu 'b', bậc 3.
    {"id":"vsgeo-7102","source":{"type":"synthetic","ref":"tu-dien-deu-the-tich-b"},"statement_vi":"Cho khối tứ diện đều có cạnh bằng b. Tính thể tích của khối tứ diện đó theo b.","answer":{"canonical":"b^3*√2/12","type":"surd"},"tags":{"topic":["the_tich"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
    // Seed 3 — hệ số+ký hiệu '2x', bậc 3.
    {"id":"vsgeo-7103","source":{"type":"synthetic","ref":"lap-phuong-the-tich-2x"},"statement_vi":"Cho khối lập phương có cạnh 2x. Tính thể tích khối lập phương theo x.","answer":{"canonical":"8x^3","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false},"scale_degree":3},
    // Seed 4 — đơn vị dính số 'AB = 3m', bậc 3.
    {"id":"vsgeo-7104","source":{"type":"synthetic","ref":"unit-suffix-cube-volume"},"statement_vi":"Cho hình lập phương ABCD.A'B'C'D' có cạnh AB = 3m. Tính thể tích khối lập phương đó.","answer":{"canonical":"27","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false},"scale_degree":3},
    // Seed 5 — đơn vị dính số 'AB = 2m' + đáp án căn, bậc 1.
    {"id":"vsgeo-7105","source":{"type":"synthetic","ref":"unit-suffix-cube-diagonal"},"statement_vi":"Cho hình lập phương ABCD.A'B'C'D' có AB = 2m. Tính độ dài đường chéo AC' của khối lập phương.","answer":{"canonical":"2√3","type":"surd"},"tags":{"topic":["khoang_cach"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":1},
    // Seed 6 — nhiều đơn vị dính số '5dm/3dm/2dm', bậc 3.
    {"id":"vsgeo-7106","source":{"type":"synthetic","ref":"unit-suffix-box-volume"},"statement_vi":"Cho hình hộp chữ nhật có chiều dài 5dm, chiều rộng 3dm và chiều cao 2dm. Tính thể tích khối hộp.","answer":{"canonical":"30","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false},"scale_degree":3},
    // Seed 7 — cạnh ký hiệu 'x', bậc 3.
    {"id":"vsgeo-9001","source":{"type":"synthetic","ref":"symbol-x-tetra"},"statement_vi":"Cho khối tứ diện đều có cạnh bằng x. Tính thể tích của khối tứ diện đều đó theo x.","answer":{"canonical":"x^3*√2/12","type":"surd"},"tags":{"topic":["the_tich"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
    // Seed 8 — đơn vị dính số '6cm', bậc 3.
    {"id":"vsgeo-9002","source":{"type":"synthetic","ref":"glued-unit-cube"},"statement_vi":"Cho khối lập phương có cạnh bằng 6cm. Tính thể tích của khối lập phương đó.","answer":{"canonical":"216","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false},"scale_degree":3},
    // Seed 9 — căn trần '√3', bậc 3.
    {"id":"vsgeo-9003","source":{"type":"synthetic","ref":"bare-surd-cube"},"statement_vi":"Cho khối lập phương có cạnh bằng √3. Tính thể tích của khối lập phương đó.","answer":{"canonical":"3√3","type":"surd"},"tags":{"topic":["the_tich"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
  ];
  for (const s of seedsF22) {
    it(`seed ${s.id} (${s.source.ref}) => rescale PHẢI ném (bỏ qua §4.3)`, () => {
      expect(() => rescale(s, 2)).toThrow();
    });
  }
});

describe("F23 — rescale: kích thước theo BỘI SỐ ('N lần' / 'gấp …') => PHẢI ném", () => {
  // Số ở "2 lần" là HỆ SỐ HÌNH DẠNG (tỉ lệ), không phải độ dài; scaler nhân nhầm ⇒ đổi hình mà
  // hậu-kiểm số-đo không thấy (bội số co giãn cùng nhịp với độ dài thật).
  const seedsF23: any[] = [
    // D1 — đường cao "2 lần cạnh đáy".
    {"id":"vsgeo-7201","source":{"type":"synthetic","ref":"pyramid-height-multiple"},"statement_vi":"Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng 3, đường cao bằng 2 lần cạnh đáy. Tính thể tích khối chóp S.ABCD.","answer":{"canonical":"18","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
    // D2 — đường sinh "2 lần bán kính đáy".
    {"id":"vsgeo-7202","source":{"type":"synthetic","ref":"cone-slant-multiple"},"statement_vi":"Cho hình nón có bán kính đáy bằng 3, độ dài đường sinh bằng 2 lần bán kính đáy. Tính chiều cao của hình nón.","answer":{"canonical":"3√3","type":"surd"},"tags":{"topic":["hinh_non"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":1},
  ];
  for (const s of seedsF23) {
    it(`seed ${s.id} (${s.source.ref}) => rescale PHẢI ném (bội số là tỉ lệ hình)`, () => {
      expect(() => rescale(s, 2)).toThrow(/bội số|lần|gấp|tỉ lệ/i);
    });
  }
});

describe("F24 — rescale: gán tỉ lệ đoạn 'XY = N ZT' (vd 'SM = 2 MA') => PHẢI ném", () => {
  // "SM = 2 MA": số 2 là TỈ LỆ chia điểm M trên SA, không phải độ dài theo đơn vị. pattern-3 nhân
  // nhầm 2->4 ⇒ dời M sai. measureNumbers mù (tỉ lệ co giãn cùng nhịp với hai đoạn thật).
  const seedE1: any = {"id":"vsgeo-7203","source":{"type":"synthetic","ref":"segment-ratio-pattern3"},"statement_vi":"Cho hình chóp S.ABCD có đáy là hình vuông cạnh 3, cạnh bên SA ⊥ đáy và SA = 6. Gọi M là điểm trên cạnh SA sao cho SM = 2 MA. Tính khoảng cách từ điểm M đến mặt phẳng đáy.","answer":{"canonical":"2","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":1};
  it("seed vsgeo-7203 'SM = 2 MA' => rescale PHẢI ném (tỉ lệ chia điểm)", () => {
    expect(() => rescale(seedE1, 2)).toThrow(/tỉ lệ|chia điểm|XY = N/i);
  });
});

describe("F25 — reflect: đại lượng phụ thuộc ĐỊNH HƯỚNG diễn đạt bằng LỜI => PHẢI ném", () => {
  // Tính thuận/nghịch tam diện (handedness), chiều kim đồng hồ (định hướng 2D), so sánh vị trí
  // theo "chiều dương/phía trước" của trục — tất cả ĐỔI khi phản chiếu (phép đảo hướng) nên đáp
  // án boolean KHÔNG bất biến. SIGNED_ORIENTED chỉ bắt TÊN công thức (tích hỗn hợp…) nên lọt;
  // topic gate (goc/khoang_cach ∈ nhóm bất biến) cũng cho qua. ORIENTATION_SENSITIVE bắt bằng lời.
  const seedsF25: any[] = [
    // F1 — tam diện thuận (handedness).
    {"id":"vsgeo-3101","source":{"type":"synthetic","ref":"orientation-handedness set A"},"statement_vi":"Trong không gian Oxyz, cho các điểm O(0;0;0), A(1;1;0), B(0;1;0), C(0;0;1). Hỏi ba vectơ OA, OB, OC (theo thứ tự đó) có lập thành một tam diện thuận hay không?","figure":{"coords_given":true,"points":[{"id":"O","x":0,"y":0,"z":0},{"id":"A","x":1,"y":1,"z":0},{"id":"B","x":0,"y":1,"z":0},{"id":"C","x":0,"y":0,"z":1}]},"answer":{"canonical":"Đúng","type":"boolean"},"tags":{"topic":["goc"],"answer_form":"boolean","difficulty":2,"requires_auxiliary_construction":false}},
    // F2 — ngược chiều kim đồng hồ (định hướng 2D).
    {"id":"vsgeo-3102","source":{"type":"synthetic","ref":"orientation-clockwise set A"},"statement_vi":"Trong không gian Oxyz cho ba điểm A(2;0;1), B(0;2;1), C(0;0;1). Một người quan sát đứng phía trên và nhìn từ hướng dương trục Oz xuống. Theo thứ tự A, B, C, ba điểm này được sắp xếp ngược chiều kim đồng hồ. Khẳng định trên đúng hay sai?","figure":{"coords_given":true,"points":[{"id":"A","x":2,"y":0,"z":1},{"id":"B","x":0,"y":2,"z":1},{"id":"C","x":0,"y":0,"z":1}]},"answer":{"canonical":"Đúng","type":"boolean"},"tags":{"topic":["goc"],"answer_form":"boolean","difficulty":3,"requires_auxiliary_construction":false}},
    // F3 — phía trước / chiều dương Ox (so sánh dấu toạ độ).
    {"id":"vsgeo-3103","source":{"type":"synthetic","ref":"orientation-frontback set A"},"statement_vi":"Trong không gian Oxyz, quy ước chiều dương của trục Ox là hướng tiến về phía trước. Cho hai điểm A(3;1;2) và B(1;5;2). Khi đó điểm A nằm ở phía trước điểm B. Khẳng định này đúng hay sai?","figure":{"coords_given":true,"points":[{"id":"A","x":3,"y":1,"z":2},{"id":"B","x":1,"y":5,"z":2}]},"answer":{"canonical":"Đúng","type":"boolean"},"tags":{"topic":["khoang_cach"],"answer_form":"boolean","difficulty":2,"requires_auxiliary_construction":false}},
  ];
  for (const s of seedsF25) {
    it(`seed ${s.id} (${s.source.ref}) => reflect PHẢI ném (không bất biến phản chiếu)`, () => {
      expect(() => reflect(s)).toThrow(/định hướng|thuận|nghịch|chiều|phía|bất biến/i);
    });
  }
});

// ===========================================================================
// LƯỢT ĐỐI KHÁNG THỨ NĂM (RS-1, RS-2, RN-1, RF-1, RF-2, DS-1) — 6 LỚP SINH-SAI-IM-LẶNG
// do bộ dò nhiễu VSGeo-Bench (perturbations) phát hiện: transform EMIT một biến thể có
// statement mâu thuẫn answer.canonical. §4.3 "thà bỏ còn hơn sai" ⇒ mọi ca PHẢI thành SKIP.
// ===========================================================================

describe("RS-1 — rescale: bỏ ĐỘ DÀI NGOẠI LAI (căn trần/đơn vị dính/ký hiệu≠a/luỹ thừa/chữ số)", () => {
  // GỐC RỄ: cỗ máy co giãn chỉ nắm 'cạnh [n]a' và số sau từ khoá/'AB = n'. Khi đề TRỘN một độ
  // dài co-giãn-được (khiến câu ĐỔI ⇒ chốt F22 không bắt) với một độ dài "ngoại lai" mà
  // measureNumbers mù (ký hiệu ≠'a' không có chữ số, hệ số+ký hiệu '2x', đơn vị dính '3m',
  // căn trần '√3', luỹ thừa ký hiệu 'b^2', số viết CHỮ 'ba'), độ dài ngoại lai GIỮ NGUYÊN
  // trong khi đáp án ×k^bậc ⇒ câu tự mâu thuẫn. assertNoForeignLength phải ném (bỏ qua §4.3).
  const seedsRS1: any[] = [
    // Rule 3 — ký hiệu ≠'a' ('h') ngay sau từ khoá độ dài (spec vsgeo-2001).
    {"id":"vsgeo-2001","source":{"type":"synthetic","ref":"VSGeo adversarial round2 finder1 mixed-symbol h"},"statement_vi":"Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, chiều cao h. Tính thể tích khối chóp S.ABCD.","answer":{"canonical":"a^2*h/3","type":"surd","human_note":"V = (1/3)·a²·h"},"tags":{"topic":["the_tich"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
    // Rule 2 — đơn vị dính số '3m' (spec vsgeo-2101).
    {"id":"vsgeo-2101","source":{"type":"synthetic","ref":"adversarial-round2-finder2:unit-suffix-blindspot"},"statement_vi":"Cho khối hộp chữ nhật có đáy là hình vuông cạnh đáy bằng 5 và chiều cao 3m. Tính thể tích khối hộp.","answer":{"canonical":"75","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
    // Rule 1 — căn TRẦN '√3' trộn với số co-giãn-được '4' (spec vsgeo-1101).
    {"id":"vsgeo-1101","source":{"type":"synthetic","ref":"adversarial round4 finder2"},"statement_vi":"Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh đáy bằng 4, chiều cao bằng √3. Tính thể tích khối chóp S.ABCD.","answer":{"canonical":"16*sqrt(3)/3","type":"surd"},"tags":{"topic":["the_tich"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
    // Rule 4 — luỹ thừa ký hiệu ≠'a' 'b^2' (diện tích ký hiệu) trộn số co-giãn-được '6'.
    {"id":"vsgeo-4102","source":{"type":"synthetic","ref":"round5-RS1-rule4-symbolic-power-area"},"statement_vi":"Cho hình chóp có chiều cao bằng 6 và diện tích đáy là b^2. Tính thể tích khối chóp.","answer":{"canonical":"6*b^2/3","type":"surd"},"tags":{"topic":["the_tich"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
    // Rule 5 — số viết CHỮ 'ba' (dimension) trộn số co-giãn-được '5'.
    {"id":"vsgeo-3104","source":{"type":"synthetic","ref":"round5-RS1-rule5-spelled-number-height"},"statement_vi":"Cho hình hộp chữ nhật có chiều dài bằng 5 và chiều cao bằng ba. Tính thể tích khối hộp.","answer":{"canonical":"45","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3},
  ];
  for (const s of seedsRS1) {
    it(`seed ${s.id} (${s.source.ref}) => rescale PHẢI ném (độ dài ngoại lai, bỏ qua §4.3)`, () => {
      expect(() => rescale(s, 2)).toThrow();
    });
  }

  it("HỒI QUY DƯƠNG: hệ số+căn 'cạnh 2√3' (F21) KHÔNG bị rule-1 chặn oan (vẫn emit '4√3')", () => {
    // Rule 1 lột hệ số trước √ nên "2√3" -> "  3" (không còn √) => không ném; căn TRẦN mới ném.
    const s = mkSeed({
      statement_vi: "Cho hình lập phương ABCD.A'B'C'D' có đường chéo bằng 2√3. Tính thể tích khối lập phương.",
      answer: { canonical: "8", type: "rational" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("4√3");
  });

  it("HỒI QUY DƯƠNG: 'cạnh 2' và 'cạnh a' (thuần) KHÔNG bị chặn oan", () => {
    expect(() => rescale(seedNumeric, 2)).not.toThrow(); // cạnh 2 -> 64
    expect(() => rescale(seedSymbolic, 2)).not.toThrow(); // cạnh a -> cạnh 2a
  });
});

describe("RS-2 — rescale: SANITY BẬC — hỏi TỔNG khác bậc / scale_degree lệch bậc suy từ đề", () => {
  // (a) Đề hỏi TỔNG một diện tích (bậc 2) và một thể tích (bậc 3): không một k^degree nào đúng
  //     cho cả hai ⇒ PHẢI ném. (b) scale_degree tác giả gán LỆCH với bậc suy từ đại lượng hỏi
  //     (vd thể tích mà scale_degree=2) ⇒ factor=k^2 sai ⇒ PHẢI ném (bỏ qua §4.3).
  const seedAreaVol: any = {"id":"vsgeo-4101","source":{"type":"synthetic","ref":"adversarial round-4 finder-2 (heterogeneous-degree answer)"},"statement_vi":"Cho khối lập phương cạnh 2. Tính tổng diện tích toàn phần và thể tích của khối lập phương.","answer":{"canonical":"32","type":"rational"},"tags":{"topic":["the_tich","dien_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":3};
  const seedDegMismatch: any = {"id":"vsgeo-2104","source":{"type":"synthetic","ref":"adversarial-round2-finder2:scale-degree-mismatch"},"statement_vi":"Cho khối lăng trụ đứng có đáy là hình vuông cạnh 4 và chiều cao 5. Tính thể tích khối lăng trụ.","answer":{"canonical":"80","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":2};

  it("(a) vsgeo-4101 'tổng diện tích toàn phần và thể tích' (bậc 2 + bậc 3) => PHẢI ném", () => {
    expect(() => rescale(seedAreaVol, 2)).toThrow(/bậc|đồng bậc|diện tích/i);
  });
  it("(b) vsgeo-2104 thể tích nhưng scale_degree=2 (lệch bậc) => PHẢI ném", () => {
    expect(() => rescale(seedDegMismatch, 2)).toThrow(/bậc/i);
  });

  it("HỒI QUY DƯƠNG: thể tích + scale_degree=3 (khớp bậc) VẪN emit", () => {
    expect(() => rescale(seedNumeric, 2)).not.toThrow(); // Tính thể tích, deg 3
    expect(rescale(seedNumeric, 2).answer.canonical).toBe("64");
  });
  it("HỒI QUY DƯƠNG: diện tích + scale_degree=2 (khớp bậc) VẪN emit", () => {
    const s = mkSeed({
      statement_vi: "Cho hình vuông cạnh 3. Tính diện tích hình vuông.",
      answer: { canonical: "9", type: "rational" },
      scale_degree: 2,
      tags: { topic: ["dien_tich"], answer_form: "rational", difficulty: 1, requires_auxiliary_construction: false },
    });
    const v = rescale(s, 2);
    expect(v.answer.canonical).toBe("36"); // 9 * 2^2
  });
});

describe("RN-1 — rename: BẤT BIẾN-ĐỔI-TÊN cho đáp án (nhãn nhiều ký tự: chỉ số/phẩy)", () => {
  // GỐC RỄ: figure.points có nhãn NHIỀU KÝ TỰ (M1, Ma, B') nên renameMap KHOÁ là chuỗi đầy đủ;
  // renameInText đổi đúng chúng trong statement nhưng answer.canonical GIỮ NGUYÊN (rename thiết
  // kế không đổi đáp án). Guard F20/F26 cũ dùng extractVertexLabels/extractRayAnchors KHÔNG thấy
  // nhãn nhiều ký tự: 'M1M2'->['M'] mà khoá là 'M1' (miss); 'MaMb'->[] (miss); "B'C'"->['B','C']
  // mà khoá là "B'" (miss). ⇒ statement đổi nhãn còn đáp án trỏ nhãn đã biến mất (sai-im-lặng).
  // RN-1: nếu renameInText(answer, map) ≠ answer thì đáp án tham chiếu nhãn sẽ đổi ⇒ ném (§4.3).
  const seedsRN1: any[] = [
    // Chỉ số CHỮ SỐ 'M1M2' (spec vsgeo-1201) — extractVertexLabels->['M'], khoá 'M1' (miss).
    {"id":"vsgeo-1201","source":{"type":"synthetic","ref":"finder3 r1 subscript-answer"},"statement_vi":"Trong không gian Oxyz, cho hình chóp S.ABCD có đáy là hình vuông. Gọi M1, M2 lần lượt là trung điểm của cạnh SA và cạnh SC. Trong các đường thẳng sau, đường thẳng nào song song với mặt phẳng (ABCD)?","figure":{"points":[{"id":"S","x":0,"y":0,"z":2},{"id":"A","x":0,"y":0,"z":0},{"id":"B","x":2,"y":0,"z":0},{"id":"C","x":2,"y":2,"z":0},{"id":"D","x":0,"y":2,"z":0},{"id":"M1","x":0,"y":0,"z":1},{"id":"M2","x":1,"y":1,"z":1}],"coords_given":true},"answer":{"canonical":"M1M2","type":"line_eq","human_note":"đường thẳng nối hai trung điểm M1, M2 (song song đáy)"},"tags":{"topic":["quan_he_song_song"],"answer_form":"line_eq","difficulty":2,"requires_auxiliary_construction":true}},
    // Chỉ số CHỮ THƯỜNG 'MaMb' (spec vsgeo-3201) — extractVertexLabels->[] (miss hoàn toàn).
    {"id":"vsgeo-3201","source":{"type":"synthetic","ref":"VSGeo-Bench adversarial rename round-3 finder-3 (lowercase-subscript midpoint labels)"},"statement_vi":"Cho tam giác ABC. Gọi Ma, Mb, Mc lần lượt là trung điểm của các cạnh BC, CA, AB. Hỏi đoạn thẳng nối trung điểm của cạnh BC với trung điểm của cạnh CA là đoạn thẳng nào?","figure":{"points":[{"id":"A","x":0,"y":0,"z":0},{"id":"B","x":4,"y":0,"z":0},{"id":"C","x":0,"y":3,"z":0},{"id":"Ma","x":2,"y":1.5,"z":0},{"id":"Mb","x":0,"y":1.5,"z":0},{"id":"Mc","x":2,"y":0,"z":0}],"coords_given":true},"answer":{"canonical":"MaMb","type":"mcq","human_note":"đoạn nối trung điểm BC (Ma) và trung điểm CA (Mb)"},"tags":{"topic":["ti_so"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
    // Nhãn có PHẨY "B'C'" (spec vsgeo-4201) — extractVertexLabels->['B','C'], khoá "B'" (miss).
    {"id":"vsgeo-4201","source":{"type":"synthetic","ref":"round4-finder3-primed-label-segment"},"statement_vi":"Cho tứ diện A'B'C'D' có A'B', A'C', A'D' đôi một vuông góc và A'B' = A'C' = A'D' = 1. Trong hai đoạn thẳng A'B' và B'C', đoạn nào có độ dài lớn hơn?","figure":{"points":[{"id":"A'","x":0,"y":0,"z":0},{"id":"B'","x":1,"y":0,"z":0},{"id":"C'","x":0,"y":1,"z":0},{"id":"D'","x":0,"y":0,"z":1}],"coords_given":true},"answer":{"canonical":"B'C'","type":"mcq","human_note":"B'C'=√2 > A'B'=1"},"tags":{"topic":["do_dai"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
  ];
  for (const s of seedsRN1) {
    it(`seed ${s.id} đáp án '${s.answer.canonical}' => rename PHẢI ném (bất biến-đổi-tên vỡ)`, () => {
      expect(() => rename(s)).toThrow(/nhãn|đáp án|đỉnh/i);
    });
  }

  it("HỒI QUY DƯƠNG: đáp án ký hiệu/căn (seedSymbolic) KHÔNG chứa nhãn HOA => VẪN rename được", () => {
    const v = rename(seedSymbolic);
    expect(v.variant.kind).toBe("rename");
    expect(v.answer.canonical).toBe(seedSymbolic.answer.canonical);
  });
});

describe("F26 — rename: đáp án dạng TIA 'Vx' (Sx/Ax) chứa NHÃN ĐỈNH bị đổi tên => PHẢI ném", () => {
  // extractVertexLabels bỏ 'S' trong "Sx" (theo sau chữ thường 'x') nên nhãn đỉnh neo trong tên
  // tia LỌT lưới guard F20 ⇒ rename đổi S->M trong câu mà đáp án vẫn "Sx" (trỏ đỉnh đã biến mất).
  // extractRayAnchors rút 'S'/'A' để guard bắt được.
  const seedsF26: any[] = [
    // G1 — đáp án "Sx" (giao tuyến hai mặt phẳng qua đỉnh chung S).
    {"id":"vsgeo-0731","source":{"type":"exam","ref":"On tap HKII lop 11 - giao tuyen hai mat phang"},"statement_vi":"Cho hình chóp S.ABCD có đáy ABCD là hình bình hành tâm O. Tìm giao tuyến của hai mặt phẳng (SAB) và (SCD).","answer":{"canonical":"Sx","type":"line_eq"},"tags":{"topic":["giao_tuyen","quan_he_song_song"],"answer_form":"line_eq","difficulty":2,"requires_auxiliary_construction":true}},
    // G2 — đáp án "Ax" (giao tuyến qua đỉnh A song song BC).
    {"id":"vsgeo-0742","source":{"type":"textbook","ref":"Hinh hoc 11 - giao tuyen trong tu dien"},"statement_vi":"Cho tứ diện ABCD. Mặt phẳng (P) đi qua đỉnh A và song song với cạnh BC. Xác định giao tuyến của (P) với mặt phẳng (ABC).","answer":{"canonical":"Ax","type":"line_eq"},"tags":{"topic":["giao_tuyen","quan_he_song_song"],"answer_form":"line_eq","difficulty":2,"requires_auxiliary_construction":true}},
  ];
  for (const s of seedsF26) {
    it(`seed ${s.id} đáp án '${s.answer.canonical}' => rename PHẢI ném (nhãn đỉnh trong tên tia)`, () => {
      expect(() => rename(s)).toThrow(/nhãn|đáp án|đỉnh/i);
    });
  }

  it("extractRayAnchors: 'Sx'->['S'], 'Ax'->['A']; đáp án ký hiệu/căn -> [] (không chặn oan)", () => {
    expect(extractRayAnchors("Sx")).toEqual(["S"]);
    expect(extractRayAnchors("Ax")).toEqual(["A"]);
    expect(extractRayAnchors("2√3")).toEqual([]);
    expect(extractRayAnchors("a*sqrt(6)/3")).toEqual([]);
    expect(extractRayAnchors("AB")).toEqual([]); // 'B' không thuộc {x,y,z,t} => không phải tia
  });
});

describe("RF-1 — reflect: đáp án dạng TOẠ ĐỘ (point/vector/plane_eq/line_eq) đổi khi phản chiếu => PHẢI ném", () => {
  // GỐC RỄ: assertReflectInvariant xét theo topic + LỜI VĂN, không xét answer.TYPE. Một đáp án
  // TOẠ ĐỘ (điểm trung điểm, vector pháp tuyến, phương trình mặt/đường) ĐỔI dưới phép x→-x, nhưng
  // reflect GIỮ NGUYÊN answer.canonical ⇒ figure lật toạ độ mà đáp án cũ ⇒ sai-im-lặng (§4.3).
  // Các cổng lời-văn hiện có KHÔNG bắt được (không có '=', không "mặt phẳng", không "toạ độ").
  const seedsRF1: any[] = [
    // Đáp án ĐIỂM: trung điểm M=(4;2;1); sau reflect true = (-4;2;1) nhưng canonical vẫn "(4;2;1)".
    {"id":"vsgeo-2501","source":{"type":"synthetic","ref":"adversarial round2 finder6 - reflect ignores answer_form (point-valued answer flips under x->-x)"},"statement_vi":"Trong không gian Oxyz cho hai điểm A(2;0;0) và B(6;4;2). Tìm trung điểm M của đoạn thẳng AB.","figure":{"points":[{"id":"A","x":2,"y":0,"z":0},{"id":"B","x":6,"y":4,"z":2}],"coords_given":true},"answer":{"canonical":"(4;2;1)","type":"point"},"tags":{"topic":["khoang_cach"],"answer_form":"point","difficulty":1,"requires_auxiliary_construction":false}},
    // Đáp án VECTOR: pháp tuyến (4;2;1); sau reflect true = (4;-2;-1) nhưng canonical vẫn "(4;2;1)".
    {"id":"vsgeo-4302","source":{"type":"synthetic","ref":"round4-finder4-normalvector"},"statement_vi":"Trong không gian Oxyz, cho ba điểm A, B, C (xem hình). Tìm một vector pháp tuyến của mặt (ABC).","figure":{"points":[{"id":"A","x":1,"y":0,"z":0},{"id":"B","x":0,"y":2,"z":0},{"id":"C","x":0,"y":0,"z":4}],"coords_given":true},"answer":{"canonical":"(4;2;1)","type":"vector","human_note":"n = AB x AC ∝ (4;2;1)"},"tags":{"topic":["goc"],"answer_form":"vector","difficulty":2,"requires_auxiliary_construction":false}},
  ];
  for (const s of seedsRF1) {
    it(`seed ${s.id} đáp án toạ độ '${s.answer.type}' => reflect PHẢI ném`, () => {
      expect(() => reflect(s)).toThrow(/toạ độ|bất biến/i);
    });
  }

  it("HỒI QUY DƯƠNG: đáp án surd 'độ dài AB' (seedWithCoords) BẤT BIẾN => VẪN reflect được", () => {
    const v = reflect(seedWithCoords);
    expect(v.variant.kind).toBe("reflect");
    expect(v.answer.canonical).toBe(seedWithCoords.answer.canonical);
  });
});

describe("RF-2 — reflect: đại lượng CÓ DẤU/ĐỊNH HƯỚNG diễn đạt bằng lời (đại số/lượng giác/phần tám...) => PHẢI ném", () => {
  // GỐC RỄ: phản chiếu ĐẢO HƯỚNG nên đại lượng có dấu/định hướng ĐỔI DẤU. Hai bộ dò lời văn hiện có
  // (SIGNED_ORIENTED, ORIENTATION_SENSITIVE) thiếu từ vựng: "diện tích đại số", "góc lượng giác",
  // "góc phần tám", "bàn tay phải", "có dấu"... Các cổng '='/mặt-phẳng cũng không bắt. ⇒ emit sai
  // (đáp án giữ, giá trị thật đảo dấu). RF-2 thêm một bộ dò rộng ORIENTED_OR_SIGNED.
  const seedsRF2: any[] = [
    // "diện tích đại số (có dấu)": true=−6 sau reflect nhưng canonical "6".
    {"id":"vsgeo-1301","source":{"type":"synthetic","ref":"adversarial-reflect-signed-area"},"statement_vi":"Trong không gian Oxyz cho ba điểm O(0;0;0), A(4;0;0), B(0;3;0). Tính diện tích đại số (có dấu) của tam giác OAB lấy theo thứ tự các đỉnh O, A, B.","figure":{"coords_given":true,"points":[{"id":"O","x":0,"y":0,"z":0},{"id":"A","x":4,"y":0,"z":0},{"id":"B","x":0,"y":3,"z":0}]},"answer":{"canonical":"6","type":"rational"},"tags":{"topic":["dien_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false}},
    // "góc lượng giác (OA, OB)": true=−90 sau reflect nhưng canonical "90".
    {"id":"vsgeo-3302","source":{"type":"synthetic","ref":"VSGeo adversarial r3 finder4 — directed angle"},"statement_vi":"Trong không gian Oxyz, cho hai tia OA và OB với A(2;0;0), B(0;2;0). Tính số đo góc lượng giác (OA, OB), đơn vị độ, lấy giá trị trong nửa khoảng (-180; 180].","figure":{"coords_given":true,"points":[{"id":"A","x":2,"y":0,"z":0},{"id":"B","x":0,"y":2,"z":0}]},"answer":{"canonical":"90","type":"rational"},"tags":{"topic":["goc"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false}},
    // "góc phần tám thứ mấy" (octant): true=II sau reflect nhưng canonical "A" (octant I).
    {"id":"vsgeo-4301","source":{"type":"synthetic","ref":"round4-finder4-octant"},"statement_vi":"Trong không gian Oxyz, cho điểm M (xem hình). Hỏi điểm M nằm trong góc phần tám thứ mấy? A. Thứ nhất. B. Thứ hai. C. Thứ năm. D. Thứ tám.","figure":{"points":[{"id":"M","x":3,"y":2,"z":1}],"coords_given":true},"answer":{"canonical":"A","type":"mcq","human_note":"M(3;2;1) dấu (+,+,+) => góc phần tám thứ nhất"},"tags":{"topic":["goc"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
  ];
  for (const s of seedsRF2) {
    it(`seed ${s.id} '${s.answer.canonical}' => reflect PHẢI ném (đại lượng có dấu/định hướng)`, () => {
      expect(() => reflect(s)).toThrow(/dấu|hướng|bất biến/i);
    });
  }

  it("HỒI QUY DƯƠNG: 'độ dài AB' (không dấu) VẪN reflect được", () => {
    const v = reflect(seedWithCoords);
    expect(v.answer.canonical).toBe(seedWithCoords.answer.canonical);
  });
});

describe("DS-1 — distractor: nhãn NEO TIA 'Kx/Ky/Kz' bị pickSafeDistractor bỏ sót => né BANK[0] ('K')", () => {
  // GỐC RỄ: pickSafeDistractor tính "used" chỉ bằng extractVertexLabels — hàm này BỎ SÓT 'K' khi
  // 'K' đứng trước chữ thường hướng ('Kz' => AFTER_LABEL_NEG loại 'K'). Các đề dưới neo điểm tải
  // trọng (đỉnh chung của ba tia, toạ độ/khoảng cách CHÍNH là yêu cầu) tại 'K' viết 'Kx/Ky/Kz'.
  // 'K' không bị coi là đã dùng ⇒ chọn BANK[0] "gọi K là một điểm tuỳ ý (không liên quan)" ⇒ ĐỊNH
  // NGHĨA LẠI điểm K tải trọng thành "tuỳ ý/không liên quan" ⇒ statement tự mâu thuẫn, đáp án giữ
  // nguyên ⇒ sai-im-lặng (§4.3). DS-1: gộp extractRayAnchors vào "used" ⇒ né BANK[0], dùng BANK[1].
  const seedsDS1: any[] = [
    // Khoảng cách: đỉnh tia Kz có toạ độ (1;2;2); đáp án 2 (khoảng cách tới (Oxy)).
    {"id":"vsgeo-4401","source":{"type":"synthetic","ref":"VSGeo-Bench round4 finder5 - distractor ray-anchor K (distance)"},"statement_vi":"Trong khong gian voi he toa do Oxyz, goc cua tia Kz co toa do (1;2;2). Tinh khoang cach tu goc cua tia Kz den mat phang (Oxy).","figure":{"coords_given":true},"answer":{"canonical":"2","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false},"scale_degree":1},
    // Điểm: đỉnh chung ba tia Kx,Ky,Kz; đáp án CHÍNH là toạ độ của K = (2,3,5).
    {"id":"vsgeo-3402","source":{"type":"synthetic","ref":"VSGeo adversarial round-3 finder-5 distractor ray-anchor-K point-answer"},"statement_vi":"Trong khong gian Oxyz, cho ba tia Kx, Ky, Kz doi mot vuong goc, chung goc, lan luot cung huong voi cac truc toa do. Biet goc chung cua ba tia do co toa do nguyen, cach mat phang (Oyz) mot khoang bang 2, cach (Oxz) mot khoang bang 3, cach (Oxy) mot khoang bang 5, va nam trong goc phan tam thu nhat. Tim toa do goc chung cua ba tia Kx, Ky, Kz.","figure":{"coords_given":true},"answer":{"canonical":"(2,3,5)","type":"point"},"tags":{"topic":["toa_do"],"answer_form":"point","difficulty":2,"requires_auxiliary_construction":false}},
  ];
  for (const s of seedsDS1) {
    it(`seed ${s.id} neo tia 'K' => distractor KHÔNG chèn BANK[0] (định nghĩa lại K)`, () => {
      const v = distractor(s);
      expect(v.statement_vi).not.toContain(DISTRACTOR_BANK[0]);
      expect(v.statement_vi).toContain(DISTRACTOR_BANK[1]); // câu an toàn không nhãn HOA
    });
  }

  it("HỒI QUY DƯƠNG: đề KHÔNG có nhãn 'K' (kể cả neo tia) vẫn dùng BANK[0]", () => {
    const v = distractor(seedNumeric); // "ABCD.A'B'C'D'" — không có K neo tia
    expect(v.statement_vi).toContain(DISTRACTOR_BANK[0]);
  });
});

// ===========================================================================
// ROUND-7 — bịt 11 lớp sinh-sai-im-lặng cấu trúc + 4 vá chất-lượng-guard.
// Mỗi test là bằng chứng hồi quy cho một guard §4.3 (thà SKIP còn hơn emit sai).
// ===========================================================================

describe("RS-3 — rescale: TỈ LỆ đoạn 'XY/ZT = N' / 'XY:ZT = N' (bất biến co giãn) => skip", () => {
  const seeds: any[] = [
    // Tỉ lệ chia điểm MD/MA = 2: pattern-3 nhân nhầm 2 => dời điểm M sai.
    {"id":"vsgeo-9001","source":{"type":"synthetic","ref":"round7-rs3-ratio-slash"},"statement_vi":"Cho tứ diện ABCD cạnh a. Gọi M thuộc đoạn AD sao cho MD/MA = 2. Tính khoảng cách từ M đến mặt phẳng (BCD).","figure":{"coords_given":false},"answer":{"canonical":"a*sqrt(6)/9","type":"surd"},"tags":{"topic":["khoang_cach"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":1},
    // So đoạn AB : MN = 2.
    {"id":"vsgeo-9002","source":{"type":"synthetic","ref":"round7-rs3-ratio-colon"},"statement_vi":"Cho hình chóp cạnh a, các đoạn thoả AB : MN = 2. Tính khoảng cách giữa hai đường thẳng.","figure":{"coords_given":false},"answer":{"canonical":"a*sqrt(2)/2","type":"surd"},"tags":{"topic":["khoang_cach"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false},"scale_degree":1},
  ];
  for (const s of seeds) {
    it(`seed ${s.id} tỉ lệ đoạn => rescale PHẢI ném`, () => {
      expect(() => rescale(s, 2)).toThrow(/tỉ lệ|chia điểm|bất biến/i);
    });
  }
  it("HỒI QUY DƯƠNG: 'AB = 3' (cạnh trần, KHÔNG '/'/':') vẫn co giãn => AB = 6", () => {
    const s = mkSeed({
      statement_vi: "Cho tứ diện đều ABCD có AB = 3. Tính thể tích khối tứ diện ABCD.",
      answer: { canonical: "9*sqrt(2)/4", type: "surd" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("AB = 6");
  });
});

describe("RS-4 — rescale: 'số đường chéo/đường sinh/…' = SỐ ĐẾM (không độ dài) => skip", () => {
  it("seed vsgeo-9003 'số đường chéo bằng 9' => rescale PHẢI ném", () => {
    const s = mkSeed({
      statement_vi:
        "Cho hình chóp đều cạnh a, đáy là đa giác đều có số đường chéo bằng 9. Tính thể tích khối chóp.",
      answer: { canonical: "a^3*sqrt(3)/12", type: "surd" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/số|đa giác|đổi hình/i);
  });
  it("HỒI QUY DƯƠNG: 'số cạnh đáy bằng 6' (F18 gốc) vẫn ném", () => {
    const s = mkSeed({
      statement_vi: "Cho lăng trụ đều có số cạnh đáy bằng 6, cạnh a. Tính thể tích.",
      answer: { canonical: "a^3", type: "surd" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/số/i);
  });
});

describe("RS-5 — rescale: bội số hình dạng 'bằng/= N <danh từ độ dài>' (bậc 0) => skip", () => {
  const seeds: any[] = [
    {"id":"vsgeo-9001","statement_vi":"Cho hình chóp tứ giác đều S.ABCD có cạnh a và chiều cao bằng 3 cạnh đáy. Tính thể tích khối chóp.","answer":{"canonical":"a^3","type":"surd"},"scale_degree":3},
    {"id":"vsgeo-9002","statement_vi":"Cho hình chóp S.ABCD có cạnh a và đường cao bằng 2 cạnh đáy. Tính thể tích khối chóp.","answer":{"canonical":"a^3","type":"surd"},"scale_degree":3},
    {"id":"vsgeo-9003","statement_vi":"Cho hình chóp S.ABCD đáy hình vuông cạnh a, đường cao SA = 3 cạnh đáy. Tính thể tích khối chóp.","answer":{"canonical":"a^3","type":"surd"},"scale_degree":3},
  ];
  for (const raw of seeds) {
    it(`seed ${raw.id} '${raw.statement_vi.slice(0, 40)}…' => rescale PHẢI ném`, () => {
      const s = mkSeed(raw as any);
      expect(() => rescale(s, 2)).toThrow(/bội số|cạnh đáy|đổi hình/i);
    });
  }
  it("HỒI QUY DƯƠNG: 'cạnh đáy bằng 3 và chiều cao bằng 4' (số ĐỘC LẬP) vẫn co giãn", () => {
    const s = mkSeed({
      statement_vi: "Cho hình chóp S.ABCD có cạnh đáy bằng 3 và chiều cao bằng 4. Tính thể tích khối chóp.",
      answer: { canonical: "12", type: "rational" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("bằng 6");
    expect(v.statement_vi).toContain("bằng 8");
  });
});

describe("RS-6 / OS-2 — rescale: TỔNG đại lượng khác bậc (chu vi/diện tích/thể tích) => skip", () => {
  const seeds: any[] = [
    {"id":"vsgeo-0001","statement_vi":"Cho hình lập phương ABCD.A'B'C'D' có cạnh a. Tính tổng chu vi đáy và diện tích đáy.","answer":{"canonical":"4*a + a^2","type":"surd"},"scale_degree":2},
    {"id":"vsgeo-0002","statement_vi":"Cho hình lập phương ABCD.A'B'C'D' có cạnh a. Tính tổng diện tích một mặt và chu vi đáy.","answer":{"canonical":"a^2 + 4*a","type":"surd"},"scale_degree":2},
  ];
  for (const raw of seeds) {
    it(`RS-6 seed ${raw.id} chu vi+diện tích => rescale PHẢI ném`, () => {
      const s = mkSeed(raw as any);
      expect(() => rescale(s, 2)).toThrow(/khác bậc|đồng bậc|chu vi/i);
    });
  }
  it("HỒI QUY DƯƠNG (RS-6): CHỈ diện tích (đơn bậc, deg=2) vẫn co giãn", () => {
    const s = mkSeed({
      statement_vi: "Cho hình lập phương có cạnh a. Tính diện tích đáy.",
      answer: { canonical: "a^2", type: "surd" },
      scale_degree: 2,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("cạnh 2a");
  });

  // OS-2: dấu chấm GIỮA hai chữ HOA trong tên đỉnh ("S.ABCD") KHÔNG được cắt chuỗi [^.]* của asks*.
  it("OS-2: 'S.ABCD … Tính thể tích' + scale_degree=2 => ném /bậc/ (không câm)", () => {
    const s = mkSeed({
      statement_vi: "Cho hình chóp S.ABCD có cạnh a. Tính thể tích khối chóp S.ABCD.",
      answer: { canonical: "a^3", type: "surd" },
      scale_degree: 2,
    });
    expect(() => rescale(s, 2)).toThrow(/bậc/);
  });
  it("OS-2: 'S.ABCD … Tính thể tích' + scale_degree=3 => EMIT (khớp bậc)", () => {
    const s = mkSeed({
      statement_vi: "Cho hình chóp S.ABCD có cạnh a. Tính thể tích khối chóp S.ABCD.",
      answer: { canonical: "a^3", type: "surd" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("cạnh 2a");
  });
  it("OS-2 (LÀM PHẲNG có tác dụng): 'Tính thể tích … S.ABCD … diện tích' bị dấu chấm cắt => vẫn ném", () => {
    // Không làm phẳng: [^.]* của asksArea bị cắt ở dấu chấm trong 'S.ABCD' => asksArea SAI => emit sai.
    const s = mkSeed({
      statement_vi:
        "Cho khối chóp S.ABCD có cạnh a. Tính thể tích khối chóp S.ABCD, biết thêm diện tích xung quanh.",
      answer: { canonical: "a^3 + a^2", type: "surd" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/bậc/);
  });
});

describe("RS-7 — rescale: đáp án type=ratio KHÔNG THỨ NGUYÊN (bậc 0) mà scale_degree≠0 => skip", () => {
  const seeds: any[] = [
    {"id":"vsgeo-0005","statement_vi":"Cho hình chóp S.ABCD có cạnh a. Tính MN so với AB.","answer":{"canonical":"1/2","type":"ratio"},"scale_degree":1},
    {"id":"vsgeo-0002","statement_vi":"Cho hình chóp S.ABCD có cạnh a. Tính giá trị của AM/AN.","answer":{"canonical":"1/2","type":"ratio"},"scale_degree":1},
  ];
  for (const raw of seeds) {
    it(`seed ${raw.id} ratio + scale_degree≠0 => rescale PHẢI ném`, () => {
      const s = mkSeed(raw as any);
      expect(() => rescale(s, 2)).toThrow(/tỉ số|ratio|thứ nguyên/i);
    });
  }
  it("HỒI QUY DƯƠNG: ratio + scale_degree=0 => EMIT (bất biến, factor=1)", () => {
    const s = mkSeed({
      statement_vi: "Cho hình lập phương cạnh a. Tính giá trị của biểu thức đã cho.",
      answer: { canonical: "1/2", type: "ratio" },
      scale_degree: 0,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("cạnh 2a");
    expect(canonicalToNumber(v.answer.canonical)).toBeCloseTo(0.5, 6);
  });
});

describe("RS-8 — rescale: chữ số phi-ASCII & số đo viết bằng CHỮ sau danh từ độ dài => skip", () => {
  it("RS-8a: full-width '７' (U+FF17) — scaler/hậu-kiểm mù chữ số phi-ASCII => ném", () => {
    const s = mkSeed({
      statement_vi: "Cho khối lăng trụ có cạnh a và chiều cao ７. Tính thể tích khối lăng trụ.",
      answer: { canonical: "7*a^2", type: "surd" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/ASCII|chữ số|không co giãn/i);
  });
  it("RS-8b: 'bán kính ba' (số viết CHỮ sau danh từ độ dài) => ném", () => {
    const s = mkSeed({
      statement_vi: "Cho hình nón có bán kính ba và chiều cao bằng 4. Tính thể tích khối nón.",
      answer: { canonical: "12*pi", type: "surd" },
      scale_degree: 3,
    });
    expect(() => rescale(s, 2)).toThrow(/chữ|số đo|co giãn/i);
  });
  it("HỒI QUY DƯƠNG (RS-8a): 'chiều cao 7' (ASCII) vẫn co giãn => 'chiều cao 14'", () => {
    const s = mkSeed({
      statement_vi: "Cho khối lăng trụ có cạnh a và chiều cao 7. Tính thể tích khối lăng trụ.",
      answer: { canonical: "7*a^2", type: "surd" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("chiều cao 14");
    expect(v.statement_vi).toContain("cạnh 2a");
  });
  it("HỒI QUY DƯƠNG (RS-8b): 'bán kính 3' (chữ số) vẫn co giãn => 'bán kính 6'", () => {
    const s = mkSeed({
      statement_vi: "Cho hình nón có bán kính 3 và chiều cao bằng 4. Tính thể tích khối nón.",
      answer: { canonical: "12*pi", type: "surd" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("bán kính 6");
  });
});

describe("OS-1 — rescale: chỉ số HOA trong tên đỉnh ('A1B1C1') KHÔNG bị coi là đơn vị dính => EMIT", () => {
  it("'ABC.A1B1C1' co giãn cạnh a bình thường (không ném oan)", () => {
    const s = mkSeed({
      statement_vi: "Cho lăng trụ ABC.A1B1C1 có cạnh a. Tính thể tích khối lăng trụ.",
      answer: { canonical: "a^3*sqrt(3)/4", type: "surd" },
      scale_degree: 3,
    });
    const v = rescale(s, 2);
    expect(v.statement_vi).toContain("cạnh 2a");
  });
});

// --- Reflect Round-7 (foldVi lexicon + FIXED_FRAME + MIXED_PRODUCT + RF-6 rewriter/hậu-kiểm) ---

const P4 = [
  { id: "A", x: 1, y: 0, z: 0 },
  { id: "B", x: 0, y: 1, z: 0 },
  { id: "C", x: 0, y: 0, z: 1 },
  { id: "D", x: 1, y: 1, z: 1 },
];

describe("RF-3 — reflect: từ CHIRALITY/ĐỊNH HƯỚNG (có dấu) diễn đạt bằng lời => skip", () => {
  const seeds: any[] = [
    {"id":"vsgeo-9001","statement_vi":"Trong không gian Oxyz, cho ba vectơ OA, OB, OC. Theo quy tắc vặn nút chai (ốc vít), hệ ba vectơ đó tạo thành tam diện thuận tay hay nghịch tay?","figure":{"coords_given":true,"points":P4},"answer":{"canonical":"A","type":"mcq"},"tags":{"topic":["the_tich"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-9002","statement_vi":"Trong mặt phẳng Oxy, ba điểm A, B, C (xem hình) được liệt kê ngược chiều với kim đồng hồ hay cùng chiều?","figure":{"coords_given":true,"points":P4},"answer":{"canonical":"A","type":"mcq"},"tags":{"topic":["dien_tich"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-9003","statement_vi":"Trong không gian Oxyz, cho ba vectơ như hình vẽ. Hỏi hệ ba vectơ đó theo chiều thuận hay chiều nghịch?","figure":{"coords_given":true,"points":P4},"answer":{"canonical":"A","type":"mcq"},"tags":{"topic":["goc"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-9004","statement_vi":"Cho tứ diện với các đỉnh như hình vẽ. Tính giá trị của tích [AB, AC, AD].","figure":{"coords_given":true,"points":P4},"answer":{"canonical":"1","type":"rational"},"tags":{"topic":["the_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-9005","statement_vi":"Cho hệ ba vectơ (xem hình). Hỏi bộ ba đó xoắn phải hay xoắn trái?","figure":{"coords_given":true,"points":P4},"answer":{"canonical":"A","type":"mcq"},"tags":{"topic":["the_tich"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
  ];
  for (const s of seeds) {
    it(`seed ${s.id} chirality => reflect PHẢI ném`, () => {
      expect(() => reflect(s)).toThrow(/hướng|dấu|bất biến/i);
    });
  }
});

describe("RF-4 — reflect: dấu KHÔNG DẤU (fold) — 'hoanh do'/'tam dien thuan'/'dai so' => skip", () => {
  const seeds: any[] = [
    {"id":"vsgeo-5001","statement_vi":"Trong khong gian Oxyz cho diem A(3;2;1). Tinh hoanh do cua diem A.","figure":{"coords_given":true,"points":[{"id":"A","x":3,"y":2,"z":1}]},"answer":{"canonical":"3","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-5002","statement_vi":"Trong khong gian Oxyz cho ba diem O(0;0;0), A(4;0;0), B(0;3;0). Tinh dien tich dai so co dau cua tam giac OAB.","figure":{"coords_given":true,"points":[{"id":"O","x":0,"y":0,"z":0},{"id":"A","x":4,"y":0,"z":0},{"id":"B","x":0,"y":3,"z":0}]},"answer":{"canonical":"6","type":"rational"},"tags":{"topic":["dien_tich"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-5003","statement_vi":"Trong khong gian Oxyz cho O(0;0;0), A(1;0;0), B(0;1;0), C(0;0;1). Hoi ba vecto OA, OB, OC theo thu tu do co lap thanh mot tam dien thuan hay khong?","figure":{"coords_given":true,"points":[{"id":"O","x":0,"y":0,"z":0},{"id":"A","x":1,"y":0,"z":0},{"id":"B","x":0,"y":1,"z":0},{"id":"C","x":0,"y":0,"z":1}]},"answer":{"canonical":"A","type":"mcq"},"tags":{"topic":["the_tich"],"answer_form":"mcq","difficulty":1,"requires_auxiliary_construction":false}},
  ];
  for (const s of seeds) {
    it(`seed ${s.id} (không dấu) => reflect PHẢI ném`, () => {
      expect(() => reflect(s)).toThrow(/toạ độ|hướng|dấu|bất biến/i);
    });
  }
  it("HỒI QUY DƯƠNG: khoảng cách KHÔNG DẤU vẫn reflect được (đáp án bất biến)", () => {
    const s: any = {"id":"vsgeo-5099","statement_vi":"Trong khong gian Oxyz cho A(1;0;0), B(4;0;0). Tinh khoang cach giua A va B.","figure":{"coords_given":true,"points":[{"id":"A","x":1,"y":0,"z":0},{"id":"B","x":4,"y":0,"z":0}]},"answer":{"canonical":"3","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false}};
    const v = reflect(s);
    expect(v.answer.canonical).toBe("3");
    expect(v.statement_vi).toContain("A(-1;0;0)");
    expect(v.statement_vi).toContain("B(-4;0;0)");
  });
});

describe("RF-5 — reflect: đại lượng đo RELATIVE với khung toạ độ CỐ ĐỊNH (tia/trục Ox, (Oxy)) => skip", () => {
  const seeds: any[] = [
    {"id":"vsgeo-9001","statement_vi":"Trong khong gian Oxyz cho hai diem A, B nhu hinh ve. Tinh cosin cua goc giua vecto AB va tia Ox.","figure":{"coords_given":true,"points":[{"id":"A","x":1,"y":2,"z":0},{"id":"B","x":3,"y":1,"z":0}]},"answer":{"canonical":"1/2","type":"rational"},"tags":{"topic":["goc"],"answer_form":"rational","difficulty":2,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-9003","statement_vi":"Trong khong gian Oxyz cho hai diem A, B nhu hinh. Tinh goc nhon giua AB va tia Ox.","figure":{"coords_given":true,"points":[{"id":"A","x":1,"y":2,"z":0},{"id":"B","x":3,"y":1,"z":0}]},"answer":{"canonical":"sqrt(2)/2","type":"surd"},"tags":{"topic":["goc"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-9002","statement_vi":"Trong khong gian Oxyz cho diem M nhu hinh. Tinh cosin goc giua OM va truc Ox.","figure":{"coords_given":true,"points":[{"id":"M","x":2,"y":2,"z":1}]},"answer":{"canonical":"sqrt(3)/3","type":"surd"},"tags":{"topic":["goc"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false}},
    {"id":"vsgeo-9005","statement_vi":"Cho diem A nhu hinh ve. Tinh tang cua goc giua OA va mat phang (Oxy).","figure":{"coords_given":true,"points":[{"id":"A","x":2,"y":2,"z":2}]},"answer":{"canonical":"sqrt(2)/2","type":"surd"},"tags":{"topic":["goc"],"answer_form":"surd","difficulty":2,"requires_auxiliary_construction":false}},
  ];
  for (const s of seeds) {
    it(`seed ${s.id} đo tới khung cố định => reflect PHẢI ném`, () => {
      expect(() => reflect(s)).toThrow(/trục|khung|bất biến/i);
    });
  }
});

describe("RF-6 — reflect: viết lại toạ độ literal dạng ĐÁNH MÁY + hậu-kiểm dư mọi emit", () => {
  it("vsgeo-0001 (khoảng trắng trước '('): 'A(2;0;0) và B (5;0;0)' => phản chiếu cả hai", () => {
    const s: any = {"id":"vsgeo-0001","statement_vi":"Cho hai điểm A(2;0;0) và B (5;0;0). Tính khoảng cách giữa A và B.","figure":{"coords_given":true,"points":[{"id":"A","x":2,"y":0,"z":0},{"id":"B","x":5,"y":0,"z":0}]},"answer":{"canonical":"3","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false}};
    const v = reflect(s);
    expect(v.statement_vi).toContain("A(-2;0;0)");
    expect(v.statement_vi).toContain("B(-5;0;0)");
    expect(v.answer.canonical).toBe("3");
  });
  it("vsgeo-0003 (dấu trừ Unicode '−'): 'A(−4;0;0)' => phản chiếu thành A(4;0;0)", () => {
    const s: any = {"id":"vsgeo-0003","statement_vi":"Cho hai điểm A(−4;0;0) và B(1;0;0). Tính khoảng cách giữa A và B.","figure":{"coords_given":true,"points":[{"id":"A","x":-4,"y":0,"z":0},{"id":"B","x":1,"y":0,"z":0}]},"answer":{"canonical":"5","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false}};
    const v = reflect(s);
    expect(v.statement_vi).toContain("A(4;0;0)");
    expect(v.statement_vi).toContain("B(-1;0;0)");
  });
  it("vsgeo-0006 (dấu '+' đầu): 'A(+2;0;0)' => phản chiếu thành A(-2;0;0)", () => {
    const s: any = {"id":"vsgeo-0006","statement_vi":"Cho hai điểm A(+2;0;0) và B(1;0;0). Tính khoảng cách giữa A và B.","figure":{"coords_given":true,"points":[{"id":"A","x":2,"y":0,"z":0},{"id":"B","x":1,"y":0,"z":0}]},"answer":{"canonical":"1","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false}};
    const v = reflect(s);
    expect(v.statement_vi).toContain("A(-2;0;0)");
    expect(v.statement_vi).toContain("B(-1;0;0)");
  });
  it("HẬU-KIỂM (hardening): dạng lạ chưa xử lý (full-width '７') CÒN SÓT => ném, KHÔNG emit nửa vời", () => {
    const s: any = {"id":"vsgeo-0007","statement_vi":"Cho hai điểm A(７;0;0) và B(1;0;0). Tính khoảng cách giữa A và B.","figure":{"coords_given":true,"points":[{"id":"A","x":7,"y":0,"z":0},{"id":"B","x":1,"y":0,"z":0}]},"answer":{"canonical":"6","type":"rational"},"tags":{"topic":["khoang_cach"],"answer_form":"rational","difficulty":1,"requires_auxiliary_construction":false}};
    expect(() => reflect(s)).toThrow(/chưa phản chiếu|khớp hình|một phần/i);
  });
});
