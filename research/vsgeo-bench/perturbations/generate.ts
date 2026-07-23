// research/vsgeo-bench/perturbations/generate.ts
// CLI: đọc data/seeds/*.json, sinh biến thể TẤT ĐỊNH, ghi ra data/seeds-variants/.
// Chạy: npx tsx research/vsgeo-bench/perturbations/generate.ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Seed, Variant, PerturbKind } from "./types";
import { perturb } from "./perturb";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = resolve(HERE, "../data/seeds");
const OUT_DIR = resolve(HERE, "../data/seeds-variants");

// Các phép TẤT ĐỊNH (paraphrase cần model -> để harness chạy riêng).
export const DETERMINISTIC: PerturbKind[] = ["rename", "rescale", "distractor", "reflect"];

// Hàm THUẦN (không đụng ổ đĩa) -> test được.
export async function generateVariantsForSeed(
  seed: Seed,
  kinds: PerturbKind[] = DETERMINISTIC,
  skips?: Record<string, number> // F4: ghi lại số lần MỖI phép bị bỏ (để phát hiện lỗi hệ thống)
): Promise<Variant[]> {
  const out: Variant[] = [];
  for (const kind of kinds) {
    try {
      out.push(...(await perturb(seed, kind)));
    } catch {
      // Seed không hợp phép này (vd reflect mà không có toạ độ) -> bỏ qua, không làm sập mẻ.
      // F4: nhưng KHÔNG nuốt im lặng — cộng vào skips để tầng trên đối chiếu với số thành công.
      if (skips) skips[kind] = (skips[kind] ?? 0) + 1;
    }
  }
  return out;
}

// Phần đọc/ghi file — chỉ chạy khi gọi CLI.
export async function runGenerate(): Promise<void> {
  if (!existsSync(SEEDS_DIR)) {
    console.error(`Không thấy thư mục seeds: ${SEEDS_DIR}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".json"));
  let ok = 0;
  const skips: Record<string, number> = {};
  const oks: Record<string, number> = {};
  for (const f of files) {
    const seed = JSON.parse(readFileSync(join(SEEDS_DIR, f), "utf8")) as Seed;
    const variants = await generateVariantsForSeed(seed, DETERMINISTIC, skips);
    for (const v of variants) {
      writeFileSync(join(OUT_DIR, `${v.id}.json`), JSON.stringify(v, null, 2), "utf8");
      ok++;
      oks[v.variant.kind] = (oks[v.variant.kind] ?? 0) + 1;
    }
  }
  // F4: bảng đối chiếu per-kind + CẢNH BÁO khi một phép không sinh được biến thể nào
  // (nghĩa là nó bị bỏ cho MỌI seed — nhiều khả năng lỗi hệ thống chứ không phải do seed).
  console.log("Thống kê theo phép:");
  for (const kind of DETERMINISTIC) {
    const okN = oks[kind] ?? 0;
    const skN = skips[kind] ?? 0;
    console.log(`  ${kind}: ${okN} thành công, ${skN} bỏ`);
    if (okN === 0) {
      console.warn(
        `  ⚠ CẢNH BÁO: phép '${kind}' KHÔNG sinh được biến thể nào (bỏ ${skN}/${files.length} seed) — kiểm tra lỗi hệ thống, đừng cho là seed không hợp.`
      );
    }
  }
  console.log(`Sinh xong ${ok} biến thể từ ${files.length} seed. Thư mục: ${OUT_DIR}`);
}

// Tự chạy khi gọi trực tiếp bằng tsx (không chạy khi bị import trong test).
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  runGenerate();
}
