// research/vsgeo-bench/analysis/compute-kappa.ts
// Đọc hai file nhãn JSON, ghép cặp theo recordId, in Cohen's κ. Chạy:
//   npx tsx research/vsgeo-bench/analysis/compute-kappa.ts labels-em1.json labels-em2.json
import { readFileSync } from "node:fs";
import { cohensKappa } from "./kappa";

interface Label { recordId: string; labeler: string; errorType: string; }

const [fileA, fileB] = process.argv.slice(2);
if (!fileA || !fileB) {
  console.error("Dùng: npx tsx analysis/compute-kappa.ts <nhãn-em1.json> <nhãn-em2.json>");
  process.exit(1);
}

const a: Label[] = JSON.parse(readFileSync(fileA, "utf8"));
const b: Label[] = JSON.parse(readFileSync(fileB, "utf8"));

// Ghép theo recordId để chắc chắn so cùng một bản ghi (không phụ thuộc thứ tự file).
const mapB = new Map(b.map((x) => [x.recordId, x.errorType]));
const labelsA: string[] = [];
const labelsB: string[] = [];
const missing: string[] = [];
for (const la of a) {
  const lb = mapB.get(la.recordId);
  if (lb === undefined) { missing.push(la.recordId); continue; }
  labelsA.push(la.errorType);
  labelsB.push(lb);
}

if (missing.length > 0) {
  console.warn(`Cảnh báo: ${missing.length} recordId chỉ có ở file A (bỏ qua): ${missing.slice(0, 5).join(", ")}...`);
}
console.log(`Số cặp so được: ${labelsA.length}`);
console.log(`Cohen's κ = ${cohensKappa(labelsA, labelsB).toFixed(4)}`);
