import { describe, it, expect } from "vitest";
import { validateSeed, SeedSchema } from "../problem";
import type { Seed } from "../problem";

// Một bài hợp lệ tối thiểu, dùng làm "khuôn" rồi ta cố tình làm hỏng từng chỗ.
function baiHopLe(): Seed {
  return {
    id: "vsgeo-0001",
    source: { type: "exam", ref: "THPTQG 2019 - mã 101 - câu 43" },
    statement_vi: "Cho hình chóp S.ABCD ... Tính khoảng cách từ A đến (SBD).",
    answer: { canonical: "a*sqrt(3)/3", type: "surd", human_note: "khoảng cách A đến (SBD)" },
    tags: {
      topic: ["khoang_cach", "vuong_goc"],
      answer_form: "surd",
      difficulty: 3,
      requires_auxiliary_construction: true,
    },
  };
}

describe("validateSeed — ca hợp lệ", () => {
  it("bài đầy đủ các trường bắt buộc → ok", () => {
    const res = validateSeed(baiHopLe());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.seed.id).toBe("vsgeo-0001");
      expect(res.seed.answer.type).toBe("surd");
    }
  });

  it("bài có các trường tuỳ chọn (figure, solution_ref_vi, verified_by_engine, scale_degree) → ok", () => {
    const bai = baiHopLe();
    bai.figure = {
      coords_given: true,
      points: [{ id: "A", x: 1, y: 0, z: 0 }],
    };
    bai.solution_ref_vi = "Bước 1: dựng chân đường cao...";
    bai.verified_by_engine = true;
    bai.scale_degree = 1;
    const res = validateSeed(bai);
    expect(res.ok).toBe(true);
  });
});

describe("validateSeed — ca lỗi", () => {
  it("thiếu trường bắt buộc (answer) → báo lỗi rõ đường dẫn", () => {
    const bai: any = baiHopLe();
    delete bai.answer;
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors.some((e) => e.includes("answer"))).toBe(true);
    }
  });

  it("answer.type ngoài enum → báo lỗi", () => {
    const bai: any = baiHopLe();
    bai.answer.type = "so_thuc"; // không thuộc AnswerType
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.includes("answer.type"))).toBe(true);
    }
  });

  it("difficulty ngoài 1..4 → báo lỗi", () => {
    const bai: any = baiHopLe();
    bai.tags.difficulty = 7;
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.includes("difficulty"))).toBe(true);
    }
  });

  it("topic rỗng → báo lỗi (phải có ít nhất 1 nhãn)", () => {
    const bai: any = baiHopLe();
    bai.tags.topic = [];
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
  });

  it("thừa trường lạ (typo tên) → báo lỗi nhờ .strict()", () => {
    const bai: any = baiHopLe();
    bai.answ = bai.answer; // gõ nhầm tên trường
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
  });

  it("id sai định dạng → báo lỗi", () => {
    const bai: any = baiHopLe();
    bai.id = "vsgeo-1"; // thiếu đệm 0
    const res = validateSeed(bai);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.some((e) => e.includes("id"))).toBe(true);
    }
  });
});

describe("SeedSchema — dùng trực tiếp cũng được", () => {
  it("safeParse trả success cho bài hợp lệ", () => {
    expect(SeedSchema.safeParse(baiHopLe()).success).toBe(true);
  });
});
