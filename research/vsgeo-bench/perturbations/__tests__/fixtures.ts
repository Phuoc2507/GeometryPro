// research/vsgeo-bench/perturbations/__tests__/fixtures.ts
// 3 seed mẫu dùng chung cho mọi test, xây đúng schema §3.3 (khớp plan 01).
import type { Seed } from "../../data/schema/problem";

// (1) Seed SỐ cụ thể: khối lập phương cạnh 2, thể tích = 8 (đại lượng bậc 3).
export const seedNumeric: Seed = {
  id: "vsgeo-0001",
  source: { type: "synthetic", ref: "tự sinh - test rescale" },
  statement_vi:
    "Cho khối lập phương ABCD.A'B'C'D' có cạnh 2. Tính thể tích khối lập phương.",
  figure: { points: [], coords_given: false },
  answer: { canonical: "8", type: "rational", human_note: "thể tích khối lập phương cạnh 2" },
  tags: {
    topic: ["the_tich"],
    answer_form: "rational",
    difficulty: 1,
    requires_auxiliary_construction: false,
  },
  scale_degree: 3,
};

// (2) Seed KÝ HIỆU: cạnh a, đáp án còn chữ 'a'.
export const seedSymbolic: Seed = {
  id: "vsgeo-0002",
  source: { type: "synthetic", ref: "tự sinh - test rename/paraphrase" },
  statement_vi:
    "Cho hình chóp đều S.ABCD có đáy là hình vuông cạnh a. Tính thể tích khối chóp.",
  figure: { points: [], coords_given: false },
  answer: { canonical: "a^3*sqrt(2)/12", type: "surd", human_note: "thể tích hình chóp đều" },
  tags: {
    topic: ["the_tich"],
    answer_form: "surd",
    difficulty: 2,
    requires_auxiliary_construction: false,
  },
  scale_degree: 3,
};

// (3) Seed CÓ TOẠ ĐỘ: dùng cho reflect. AB = sqrt(3^2+2^2+3^2) = sqrt(22).
export const seedWithCoords: Seed = {
  id: "vsgeo-0003",
  source: { type: "synthetic", ref: "tự sinh - test reflect" },
  statement_vi:
    "Trong không gian Oxyz cho A(1;2;3) và B(4;0;0). Tính độ dài đoạn AB.",
  figure: {
    points: [
      { id: "A", x: 1, y: 2, z: 3 },
      { id: "B", x: 4, y: 0, z: 0 },
    ],
    coords_given: true,
  },
  answer: { canonical: "sqrt(22)", type: "surd", human_note: "độ dài đoạn AB" },
  tags: {
    topic: ["toa_do_oxyz", "khoang_cach"],
    answer_form: "surd",
    difficulty: 1,
    requires_auxiliary_construction: false,
  },
  scale_degree: 1,
};
