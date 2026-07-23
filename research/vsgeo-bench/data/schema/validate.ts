// validate.ts — CLI kiểm tra toàn bộ file trong data/seeds/.
// Cách chạy:  npx tsx research/vsgeo-bench/data/schema/validate.ts
// Thoát mã 0 nếu tất cả hợp lệ; mã 1 nếu có bất kỳ lỗi nào (để chạy tự động biết dừng).

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, basename } from "node:path";
import { validateSeed } from "./problem";
import { isValidSeedId } from "./id";

// Một file seed dạng thô: tên + nội dung chuỗi (chưa parse).
export type SeedFile = { file: string; content: string };
// Báo cáo: đếm số bài ok + danh sách mô tả lỗi (mỗi lỗi một dòng).
export type ValidationReport = { okCount: number; problems: string[] };

/**
 * runValidation — phần "não" thuần tính toán, KHÔNG đụng đĩa, KHÔNG thoát tiến trình.
 * Nhờ vậy test gọi trực tiếp được. Quy tắc kiểm (mỗi file, dừng ở lỗi đầu tiên gặp):
 *   1) JSON có parse được không.
 *   2) Có khớp SeedSchema không (validateSeed).
 *   3) id có đúng định dạng vsgeo-XXXX không.
 *   4) id có trùng với file khác không (kiểm trước tên file, xem chú thích dưới).
 *   5) Tên file có bằng "<id>.json" không (để tra cứu dễ, tránh lẫn).
 */
export function runValidation(files: SeedFile[]): ValidationReport {
  let okCount = 0;
  const problems: string[] = [];
  const seenIds = new Map<string, string>(); // id -> tên file đã gặp trước

  for (const { file, content } of files) {
    // (1) JSON hỏng?
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch (e) {
      problems.push(`${file}: JSON hỏng — ${(e as Error).message}`);
      continue;
    }

    // (2) Khớp schema?
    const res = validateSeed(raw);
    if (!res.ok) {
      for (const err of res.errors) problems.push(`${file}: ${err}`);
      continue;
    }
    const seed = res.seed;

    // (3) id đúng định dạng?
    if (!isValidSeedId(seed.id)) {
      problems.push(`${file}: id "${seed.id}" sai định dạng vsgeo-XXXX`);
      continue;
    }

    // (4) id trùng? (kiểm TRƯỚC tên file: một bản sao đặt sai tên vẫn phải bị
    //     bắt là trùng id — nếu kiểm tên file trước thì lỗi tên sẽ che mất lỗi trùng.)
    const truoc = seenIds.get(seed.id);
    if (truoc) {
      problems.push(`${file}: id "${seed.id}" trùng với file "${truoc}"`);
      continue;
    }

    // (5) Tên file khớp id?
    const expected = `${seed.id}.json`;
    if (basename(file) !== expected) {
      problems.push(`${file}: tên file phải là "${expected}" để khớp id "${seed.id}"`);
      continue;
    }

    seenIds.set(seed.id, file);
    okCount++;
  }

  return { okCount, problems };
}

/** Đọc mọi *.json trong data/seeds/ thành mảng SeedFile. */
function docThuMucSeeds(seedsDir: string): SeedFile[] {
  const names = readdirSync(seedsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return names.map((file) => ({
    file,
    content: readFileSync(join(seedsDir, file), "utf8"),
  }));
}

/** main — phần "tay chân": đọc đĩa, in báo cáo, thoát với mã phù hợp. */
function main(): void {
  const here = dirname(fileURLToPath(import.meta.url)); // .../data/schema
  const seedsDir = join(here, "..", "seeds"); // .../data/seeds

  let files: SeedFile[];
  try {
    files = docThuMucSeeds(seedsDir);
  } catch {
    console.error(`✗ Không đọc được thư mục seeds: ${seedsDir}`);
    process.exit(1);
    return;
  }

  if (files.length === 0) {
    console.error(`✗ Chưa có file .json nào trong ${seedsDir}`);
    process.exit(1);
    return;
  }

  const rep = runValidation(files);

  console.log(`\n=== Báo cáo kiểm tra seeds (${files.length} file) ===`);
  console.log(`Hợp lệ: ${rep.okCount}`);
  console.log(`Lỗi:    ${rep.problems.length}`);
  if (rep.problems.length > 0) {
    console.log(`\n--- Chi tiết lỗi ---`);
    for (const p of rep.problems) console.log(`  ✗ ${p}`);
    console.log("");
    process.exit(1);
  } else {
    console.log(`\n✓ Tất cả ${rep.okCount} bài đều hợp lệ!\n`);
    process.exit(0);
  }
}

// Chỉ chạy khi được gọi trực tiếp qua tsx (không chạy khi bị test import).
// Dùng pathToFileURL của Node để so khớp URL cho ĐÚNG trên mọi HĐH: trên Windows
// import.meta.url là "file:///C:/..." (ba dấu /) nên KHÔNG được tự ghép chuỗi
// "file://" + đường dẫn (chỉ hai dấu /) — sẽ luôn lệch và main() không bao giờ chạy.
const calledDirectly =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (calledDirectly) {
  main();
}
