import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Seed } from "./seedTypes";
import type { PromptStyle, EvalRecord } from "./types";
import { runEval } from "./runEval";
import { callModel } from "./callModel";

// ===== Phần THUẦN: đọc tham số dòng lệnh. Test được. =====
export interface CliArgs {
  seedsPath: string;
  models: string[];
  k: number;
  styles: PromptStyle[];
  date: string;                 // YYYY-MM-DD, LẤY TỪ THAM SỐ — không hardcode
  temperature: number;
  outDir: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  const seedsPath = get("--seeds");
  const modelsRaw = get("--models");
  const date = get("--date");
  if (!seedsPath) throw new Error("Thiếu --seeds <đường-dẫn file .jsonl>");
  if (!modelsRaw) throw new Error("Thiếu --models <ds ngăn bởi dấu phẩy>");
  if (!date) throw new Error("Thiếu --date <YYYY-MM-DD> (không hardcode ngày để tái lập được)");

  const styles = (get("--styles") ?? "zero_shot")
    .split(",").map((s) => s.trim()).filter(Boolean) as PromptStyle[];

  // Ép & KIỂM tham số số học. Bản cũ dùng Number() TRẦN: "--k abc" => NaN, vòng lặp
  // `run <= NaN` sai ngay => 0 lượt, ghi JSONL rỗng, thoát 0 (bộ tự-phản-biện phát hiện:
  // benchmark IM LẶNG không ra dữ liệu, đầu độc oracle bằng tập rỗng). Nay từ chối rõ ràng.
  const kRaw = get("--k") ?? "3";
  const k = Number(kRaw);
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`--k phải là số nguyên ≥ 1 (số lần lặp mỗi bài), nhận: "${kRaw}"`);
  }
  // Tương tự: "--temperature hot" => NaN => temperature:null lọt vào request (?? KHÔNG chặn
  // NaN) => vỡ tính TÁI LẬP của benchmark. Chặn về [0, 2] (bao trọn dải của các nhà cung cấp).
  const tempRaw = get("--temperature") ?? "0";
  const temperature = Number(tempRaw);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error(`--temperature phải là số trong [0, 2], nhận: "${tempRaw}"`);
  }

  return {
    seedsPath,
    models: modelsRaw.split(",").map((s) => s.trim()).filter(Boolean),
    k,
    styles,
    date,
    temperature,
    outDir: get("--out") ?? "research/vsgeo-bench/results",
  };
}

// ===== Phần THUẦN: đọc seed từ JSONL (mỗi dòng một JSON). Test được. =====
export function loadSeeds(path: string): Seed[] {
  const text = readFileSync(path, "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Seed);
}

// ===== Phần CÓ MẠNG: chạy thật. Không unit test (gọi model + grader thật). =====
async function main() {
  // Nạp khoá API từ .env (OPENAI_API_KEY, GEMINI_API_KEY, ...).
  const dotenv = await import("dotenv");
  dotenv.config({ path: "research/vsgeo-bench/.env" });

  const args = parseArgs(process.argv.slice(2));
  const seeds = loadSeeds(args.seedsPath);

  // Nạp grade() THẬT từ kế hoạch 02. Chỉ import ở đây (đường chạy thật) để test không cần grader.
  // Ghi chú: import "../grader" trỏ tới barrel grader/index.ts do kế hoạch 02 tạo (fix #5), nên dòng này hoạt động.
  const { grade } = await import("../grader");

  console.log(
    `[run] ${seeds.length} bài × ${args.models.length} model × ${args.styles.length} style × k=${args.k} ` +
    `= ${seeds.length * args.models.length * args.styles.length * args.k} lượt (temperature=${args.temperature})`
  );

  const outPath = `${args.outDir}/${args.date}.jsonl`;
  mkdirSync(dirname(outPath), { recursive: true });
  const lines: string[] = [];

  const records: EvalRecord[] = await runEval(
    seeds, args.models,
    { k: args.k, styles: args.styles, temperature: args.temperature, timeoutMs: 120000 },
    {
      callModel,          // adapter THẬT (gọi mạng)
      grade,              // grader THẬT
      onProgress: (done, total, rec) => {
        // Ghi ngay từng dòng để không mất dữ liệu nếu chạy dở bị ngắt.
        lines.push(JSON.stringify(rec));
        writeFileSync(outPath, lines.join("\n") + "\n");
        if (done % 10 === 0 || done === total) {
          console.log(`[run] ${done}/${total} — ${rec.seedId}/${rec.modelId}/run${rec.run} => ${rec.verdict}`);
        }
      },
    }
  );

  console.log(`[run] Xong. Ghi ${records.length} bản ghi vào ${outPath}`);
}

// Chỉ chạy main() khi gọi trực tiếp bằng `npx tsx run.ts`, KHÔNG chạy khi bị test import.
// import.meta.url so với argv[1] là cách nhận biết "được chạy trực tiếp" trong ESM.
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[run] LỖI:", e);
    process.exit(1);
  });
}
