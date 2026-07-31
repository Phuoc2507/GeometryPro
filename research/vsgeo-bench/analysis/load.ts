// research/vsgeo-bench/analysis/load.ts
// Đọc log kết quả (JSONL) + dữ liệu bài (seed), rồi nối chúng lại.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { EvalRecord, Seed, SeedIndex } from "./types";
import { isVerdict } from "./types";

// Đọc MỘT chuỗi JSONL -> EvalRecord[]. Bỏ dòng trống. Ném lỗi RÕ nếu verdict sai.
export function parseJsonl(text: string): EvalRecord[] {
  const out: EvalRecord[] = [];
  const lines = text.split(/\r?\n/); // \r?\n để chịu được cả file Windows (CRLF) lẫn Unix (LF)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue; // bỏ dòng trống
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      throw new Error(`Dòng ${i + 1}: JSON hỏng: ${line.slice(0, 80)}`);
    }
    if (!isVerdict(obj.verdict)) {
      throw new Error(`Dòng ${i + 1}: verdict không hợp lệ: ${JSON.stringify(obj.verdict)}`);
    }
    out.push(obj as EvalRecord);
  }
  return out;
}

// Đọc TẤT CẢ file .jsonl trong một thư mục (vd results/) và gộp thành một mảng.
export function loadRecords(dir: string): EvalRecord[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const all: EvalRecord[] = [];
  for (const f of files) {
    all.push(...parseJsonl(readFileSync(join(dir, f), "utf8")));
  }
  return all;
}

// Đọc thư mục seeds/*.json -> SeedIndex (Map theo id) để tra nhanh.
export function loadSeeds(dir: string): SeedIndex {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const index: SeedIndex = new Map();
  for (const f of files) {
    const seed = JSON.parse(readFileSync(join(dir, f), "utf8")) as Seed;
    index.set(seed.id, seed);
  }
  return index;
}

// Nối một bản ghi với BÀI GỐC:
// - Nếu là biến thể -> tra theo perturbation.parentSeedId.
// - Ngược lại -> tra theo seedId.
export function seedForRecord(rec: EvalRecord, seeds: SeedIndex): Seed | undefined {
  const baseId = rec.perturbation ? rec.perturbation.parentSeedId : rec.seedId;
  return seeds.get(baseId);
}
