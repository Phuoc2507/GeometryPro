import { describe, it, expect } from "vitest";
import { paraphrase, assertParaphrasePreserves, ParaphraseDriftError } from "../paraphrase";
import { seedSymbolic } from "./fixtures";

describe("paraphrase — viết lại lời văn, giữ nghĩa", () => {
  it("assertParaphrasePreserves: đổi thứ tự chữ nhưng giữ số & nhãn => KHÔNG ném", () => {
    expect(() =>
      assertParaphrasePreserves("Cho S.ABCD cạnh 2.", "Hình S.ABCD có cạnh 2 cho trước.")
    ).not.toThrow();
  });

  it("assertParaphrasePreserves: đổi một con số => NÉM (đổi nghĩa)", () => {
    expect(() =>
      assertParaphrasePreserves("cạnh 2.", "cạnh 3.")
    ).toThrow(ParaphraseDriftError);
  });

  it("assertParaphrasePreserves: mất nhãn đỉnh => NÉM", () => {
    expect(() =>
      assertParaphrasePreserves("Cho S.ABCD.", "Cho hình chóp ABCD.")
    ).toThrow(ParaphraseDriftError);
  });

  it("paraphrase dùng rewriter GIẢ, giữ đáp án, gắn metadata", async () => {
    const fakeRewriter = async (t: string) => `Xét bài toán sau: ${t}`;
    const v = await paraphrase(seedSymbolic, fakeRewriter);
    expect(v.statement_vi.startsWith("Xét bài toán sau:")).toBe(true);
    expect(v.answer.canonical).toBe(seedSymbolic.answer.canonical);
    expect(v.variant).toEqual({ kind: "paraphrase", parentSeedId: "vsgeo-0002" });
  });

  it("paraphrase: rewriter làm đổi số => ném ParaphraseDriftError", async () => {
    const badRewriter = async () => "Cho hình chóp đều S.ABCD có đáy hình vuông cạnh b. Tính thể tích.";
    // seedSymbolic không có số, nhưng đổi 'a' -> 'b' làm MẤT nhãn? 'a' là chữ thường không tính nhãn.
    // Test số: dùng một rewriter thêm số lạ.
    const addNumberRewriter = async (t: string) => `${t} (phiên bản 2)`;
    await expect(paraphrase(seedSymbolic, addNumberRewriter)).rejects.toThrow(ParaphraseDriftError);
    // badRewriter không dùng, chỉ minh hoạ; giữ để 2 em thử.
    void badRewriter;
  });
});
