// harness/__tests__/adversarial.test.ts
// ===========================================================================
// BỘ TEST TỰ-PHẢN-BIỆN cho HARNESS (design.md §4.3) — song song với
// grader/__tests__/adversarial.test.ts.
//
// Suite "đường hạnh phúc" của harness đã XANH hết (35/35). Bước quan trọng nhất kế tiếp là
// CỐ TÌNH ĐI TÌM CÁCH LÀM HARNESS GHI DỮ LIỆU SAI/THIẾU. Các lỗi dưới đây đều LỌT QUA suite
// gốc; một lượt review đa-góc (10 finder + refute-verify độc lập) mới lôi ra được:
//
//   F1  callModel: timeout do CHÍNH harness kích (AbortController) từng KHÔNG được thử lại —
//       bị coi là lỗi vĩnh viễn dù "timeout" là lỗi tạm thời phổ biến nhất khi gọi model chậm.
//   F4  callModel: chuỗi con "500" từng khớp NHẦM "8500" trong thân lỗi HTTP 400 => 4xx vĩnh
//       viễn bị thử lại vô ích (ngược đúng ý định "không retry 4xx").
//   F2  run.ts: "--k abc" => NaN => 0 lượt, JSONL rỗng, thoát 0 (im lặng không ra dữ liệu).
//   F5  run.ts: "--temperature hot" => NaN => temperature:null trong request (vỡ tái lập).
//   F3  extract.ts: một \boxed{ hỏng/cụt phía TRƯỚC từng che mất \boxed{...} hợp lệ phía SAU.
//
// MỖI test là một "bằng chứng hồi quy": lỡ tay làm hồi lỗi cũ thì test này ĐỎ ngay.
// ===========================================================================
import { describe, it, expect, vi } from "vitest";
import { callModel } from "../callModel";
import { parseArgs } from "../run";
import { extractBoxed } from "../extract";
import type { ModelReply } from "../types";

const noSleep = async (_ms: number) => {};            // sleep giả: không chờ gì cả
const okReply: ModelReply = { text: "\\boxed{1}", latencyMs: 1 };

// Dựng lỗi y như fetch ném khi AbortController.abort() bắn (đường timeout của mọi adapter).
function abortError(): Error {
  const e = new Error("This operation was aborted");
  e.name = "AbortError";
  return e;
}

describe("F1 — callModel: timeout (AbortError) PHẢI được thử lại", () => {
  it('AbortError "This operation was aborted" được coi là tạm thời => thử lại rồi thành công', async () => {
    let n = 0;
    const flaky = vi.fn(async () => {
      n++;
      if (n === 1) throw abortError();
      return okReply;
    });
    const reply = await callModel(
      "openai:gpt-x", "S", "U", {},
      { adapters: { openai: flaky }, sleep: noSleep, maxAttempts: 3 }
    );
    expect(n).toBe(2);
    expect(reply.text).toBe("\\boxed{1}");
  });

  it("AbortError liên tục => thử ĐỦ maxAttempts lần (không bỏ ngay lần đầu)", async () => {
    const always = vi.fn(async () => { throw abortError(); });
    await expect(
      callModel("openai:gpt-x", "S", "U", {}, { adapters: { openai: always }, sleep: noSleep, maxAttempts: 3 })
    ).rejects.toThrow(/aborted/i);
    expect(always).toHaveBeenCalledTimes(3);
  });
});

describe("F4 — callModel: 4xx KHÔNG bị thử lại chỉ vì thân lỗi chứa chuỗi số giống mã 5xx", () => {
  it('HTTP 400 với thân "...8500 tokens" chỉ gọi ĐÚNG 1 lần (không retry)', async () => {
    const badReq = vi.fn(async () => {
      throw new Error("OpenAI HTTP 400: max_tokens is too large: you requested 8500 tokens");
    });
    await expect(
      callModel("openai:gpt-x", "S", "U", {}, { adapters: { openai: badReq }, sleep: noSleep, maxAttempts: 3 })
    ).rejects.toThrow(/HTTP 400/);
    expect(badReq).toHaveBeenCalledTimes(1);
  });

  it('HTTP 404 (thân không có chuỗi số 5xx) cũng chỉ gọi 1 lần', async () => {
    const err404 = vi.fn(async () => { throw new Error("OpenAI HTTP 404: model not found"); });
    await expect(
      callModel("openai:x", "S", "U", {}, { adapters: { openai: err404 }, sleep: noSleep, maxAttempts: 3 })
    ).rejects.toThrow(/HTTP 404/);
    expect(err404).toHaveBeenCalledTimes(1);
  });

  it("nhưng 5xx & 429 THẬT vẫn được thử lại (đọc ĐÚNG mã trạng thái)", async () => {
    const err500 = vi.fn(async () => { throw new Error("Gemini HTTP 500: internal"); });
    await expect(
      callModel("gemini:g", "S", "U", {}, { adapters: { gemini: err500 }, sleep: noSleep, maxAttempts: 3 })
    ).rejects.toThrow(/HTTP 500/);
    expect(err500).toHaveBeenCalledTimes(3);

    const err429 = vi.fn(async () => { throw new Error("OpenAI HTTP 429: rate limited"); });
    await expect(
      callModel("openai:x", "S", "U", {}, { adapters: { openai: err429 }, sleep: noSleep, maxAttempts: 2 })
    ).rejects.toThrow(/HTTP 429/);
    expect(err429).toHaveBeenCalledTimes(2);
  });
});

// parseArgs bắt buộc có --seeds/--models/--date; BASE cấp sẵn để mỗi test chỉ thay cờ số học.
const BASE = ["--seeds", "s.jsonl", "--models", "openai:x", "--date", "2026-07-23"];

describe("F2 — run.ts: --k phải là số nguyên ≥ 1, nếu không THÌ NÉM (không im lặng NaN)", () => {
  it('"--k abc" ném lỗi rõ ràng', () => {
    expect(() => parseArgs([...BASE, "--k", "abc"])).toThrow(/--k/);
  });
  it('"--k 0" và "--k 2.5" bị từ chối', () => {
    expect(() => parseArgs([...BASE, "--k", "0"])).toThrow(/--k/);
    expect(() => parseArgs([...BASE, "--k", "2.5"])).toThrow(/--k/);
  });
  it("mặc định (thiếu --k) = 3; giá trị hợp lệ giữ nguyên", () => {
    expect(parseArgs([...BASE]).k).toBe(3);
    expect(parseArgs([...BASE, "--k", "5"]).k).toBe(5);
  });
});

describe("F5 — run.ts: --temperature phải là số trong [0,2], nếu không THÌ NÉM", () => {
  it('"--temperature hot" ném lỗi (không để NaN thành temperature:null)', () => {
    expect(() => parseArgs([...BASE, "--temperature", "hot"])).toThrow(/--temperature/);
  });
  it("ngoài [0,2] bị từ chối", () => {
    expect(() => parseArgs([...BASE, "--temperature", "3"])).toThrow(/--temperature/);
    expect(() => parseArgs([...BASE, "--temperature", "-1"])).toThrow(/--temperature/);
  });
  it("mặc định = 0; giá trị hợp lệ giữ nguyên", () => {
    expect(parseArgs([...BASE]).temperature).toBe(0);
    expect(parseArgs([...BASE, "--temperature", "0.7"]).temperature).toBeCloseTo(0.7, 9);
  });
});

describe("F3 — extract.ts: \\boxed{ hỏng phía trước KHÔNG che \\boxed{...} hợp lệ phía sau", () => {
  it("một \\boxed{ mở-không-đóng phía trước, vẫn lấy được box hợp lệ phía sau", () => {
    expect(extractBoxed("scratch \\boxed{x ... final \\boxed{a\\sqrt2}")).toBe("a\\sqrt2");
  });
  it("một \\boxed{ cụt ở CUỐI không xoá box hợp lệ trước đó", () => {
    expect(extractBoxed("answer \\boxed{a} then junk \\boxed{oops")).toBe("a");
  });
  it("đường hạnh phúc vẫn nguyên: lấy box CUỐI, xử lý ngoặc lồng, không có box => null", () => {
    expect(extractBoxed("foo \\boxed{1} bar \\boxed{2}")).toBe("2");
    expect(extractBoxed("\\boxed{\\frac{1}{2}}")).toBe("\\frac{1}{2}");
    expect(extractBoxed("khong co box")).toBeNull();
  });
});
