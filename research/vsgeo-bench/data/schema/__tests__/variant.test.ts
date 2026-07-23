import { describe, it, expect } from "vitest";
import { validateVariant, validateSeed } from "../problem";

// F15 — validateVariant: kiểm biến thể (Variant) đúng hợp đồng KHÔNG-NÉM như validateSeed.
// Bộ sinh biến thể (kế hoạch 04) xuất Variant = Seed + trường `variant`, id có hậu tố __<kind>.

// Một SEED hợp lệ tối thiểu (không có trường variant).
function baseSeed() {
  return {
    id: "vsgeo-0001",
    source: { type: "synthetic", ref: "tự sinh - test variant schema" },
    statement_vi: "Cho hình lập phương ABCD.A'B'C'D' có cạnh a. Tính thể tích.",
    figure: { points: [], coords_given: false },
    answer: { canonical: "a^3", type: "surd" },
    tags: {
      topic: ["the_tich"],
      answer_form: "surd",
      difficulty: 1,
      requires_auxiliary_construction: false,
    },
    scale_degree: 3,
  };
}

// Một VARIANT hợp lệ = baseSeed + id "__rename" + nhãn variant.
function goodVariant() {
  return {
    ...baseSeed(),
    id: "vsgeo-0001__rename",
    variant: { kind: "rename", parentSeedId: "vsgeo-0001" },
  };
}

describe("validateVariant — kiểm biến thể (Variant)", () => {
  it("Variant thật sự => validateVariant ok", () => {
    const r = validateVariant(goodVariant());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.variant.id).toBe("vsgeo-0001__rename");
      expect(r.variant.variant).toEqual({ kind: "rename", parentSeedId: "vsgeo-0001" });
    }
  });

  it("Seed gốc (không có trường variant) vẫn qua validateSeed như cũ", () => {
    const r = validateSeed(baseSeed());
    expect(r.ok).toBe(true);
  });

  it("Variant KHÔNG qua validateSeed (id sai mẫu seed + có trường lạ 'variant')", () => {
    const r = validateSeed(goodVariant());
    expect(r.ok).toBe(false);
  });

  it("Seed gốc KHÔNG qua validateVariant (thiếu trường variant, id không có __kind)", () => {
    const r = validateVariant(baseSeed());
    expect(r.ok).toBe(false);
  });

  it("variant.kind sai (không thuộc 5 phép) => { ok:false }, KHÔNG ném", () => {
    const bad = { ...goodVariant(), variant: { kind: "teleport", parentSeedId: "vsgeo-0001" } };
    const r = validateVariant(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("variant.kind"))).toBe(true);
  });

  it("parentSeedId sai mẫu id seed => { ok:false }", () => {
    const bad = { ...goodVariant(), variant: { kind: "rename", parentSeedId: "0001" } };
    const r = validateVariant(bad);
    expect(r.ok).toBe(false);
  });

  it("id biến thể sai mẫu (thiếu __<kind>) => { ok:false }", () => {
    const bad = { ...goodVariant(), id: "vsgeo-0001" };
    const r = validateVariant(bad);
    expect(r.ok).toBe(false);
  });

  it("đầu vào rác (null / số / mảng) => { ok:false }, KHÔNG ném", () => {
    for (const junk of [null, 42, [], "chuỗi", undefined]) {
      const r = validateVariant(junk);
      expect(r.ok).toBe(false);
    }
  });
});
