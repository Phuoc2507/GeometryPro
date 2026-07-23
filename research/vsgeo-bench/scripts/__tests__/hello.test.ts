// research/vsgeo-bench/scripts/__tests__/hello.test.ts
import { describe, it, expect } from "vitest";
import { greet } from "../hello";

describe("greet", () => {
  it("chào một cái tên bình thường", () => {
    expect(greet("Minh")).toBe("Xin chào, Minh!");
  });

  it("khi tên rỗng thì chào cả nhóm VSGeo-Bench", () => {
    expect(greet("")).toBe("Xin chào, nhóm VSGeo-Bench!");
  });

  it("cắt khoảng trắng thừa ở hai đầu tên", () => {
    expect(greet("  Lan  ")).toBe("Xin chào, Lan!");
  });
});
