import { describe, it, expect } from "vitest";
import { rename, extractVertexLabels, defaultRenameMap, renameInText } from "../rename";
import { seedSymbolic } from "./fixtures";

describe("rename — đổi tên đỉnh", () => {
  it("extractVertexLabels bắt đúng nhãn đỉnh, bỏ qua chữ HOA đầu từ", () => {
    // 'C' trong "Cho" theo sau bởi 'h' => không phải đỉnh. S,A,B,C,D là đỉnh.
    expect(extractVertexLabels("Cho hình chóp S.ABCD.")).toEqual(["S", "A", "B", "C", "D"]);
  });

  it("defaultRenameMap tránh trùng với nhãn đang dùng", () => {
    const map = defaultRenameMap(["A", "B", "C", "D"]);
    const targets = [...map.values()];
    // Không đích nào trùng nguồn (tránh thay dây chuyền).
    for (const t of targets) expect(["A", "B", "C", "D"]).not.toContain(t);
    // Mỗi nguồn có đúng một đích khác nhau.
    expect(new Set(targets).size).toBe(4);
  });

  it("renameInText không đụng chữ HOA đầu từ tiếng Việt", () => {
    const map = new Map([["A", "M"]]);
    // "An toàn" — 'A' theo sau 'n' => giữ nguyên; còn 'A' trong "(A)" => đổi.
    expect(renameInText("Điểm (A) và An toàn", map)).toBe("Điểm (M) và An toàn");
  });

  it("rename: mọi đỉnh được thay, đáp án GIỮ NGUYÊN", () => {
    const v = rename(seedSymbolic);
    // Các đỉnh cũ S,A,B,C,D biến mất khỏi lời văn.
    for (const old of ["S", "A", "B", "C", "D"]) {
      expect(v.statement_vi.includes(`${old}.`) || /[A-Z]/.test(v.statement_vi)).toBeTruthy();
    }
    expect(v.statement_vi).not.toContain("S.ABCD");
    // Đáp án và bậc không đổi.
    expect(v.answer.canonical).toBe(seedSymbolic.answer.canonical);
    // Metadata truy vết đúng.
    expect(v.variant).toEqual({ kind: "rename", parentSeedId: "vsgeo-0002" });
    expect(v.id).toBe("vsgeo-0002__rename");
  });
});
