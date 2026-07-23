import { describe, it, expect } from "vitest";
import { reflect, reflectX, reflectCoordsInText } from "../reflect";
import { seedWithCoords, seedSymbolic } from "./fixtures";

describe("reflect — phản chiếu hệ toạ độ, đáp án bất biến", () => {
  it("reflectCoordsInText đổi dấu x trong 'L(x;y;z)'", () => {
    expect(reflectCoordsInText("A(1;2;3) và B(4;0;0)", reflectX)).toBe("A(-1;2;3) và B(-4;0;0)");
  });

  it("reflect: toạ độ điểm bị đổi dấu x, đáp án GIỮ NGUYÊN", () => {
    const v = reflect(seedWithCoords);
    expect(v.figure!.points).toEqual([
      { id: "A", x: -1, y: 2, z: 3 },
      { id: "B", x: -4, y: 0, z: 0 },
    ]);
    expect(v.statement_vi).toContain("A(-1;2;3)");
    expect(v.answer.canonical).toBe(seedWithCoords.answer.canonical); // sqrt(22) không đổi
    expect(v.variant).toEqual({ kind: "reflect", parentSeedId: "vsgeo-0003" });
  });

  it("từ chối reflect khi seed không có toạ độ", () => {
    expect(() => reflect(seedSymbolic)).toThrow(/coords_given/);
  });
});
