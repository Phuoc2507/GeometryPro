// grader/selfcheck.ts
// Tự kiểm định oracle (design.md §4.3): chứng minh máy chấm đáng tin bằng cách
// đối chiếu một MẪU NGẪU NHIÊN với người chấm tay, rồi báo precision/recall.
import { readFileSync, writeFileSync } from 'node:fs';
import type { EvalRecord, Verdict } from './types';

/**
 * precision/recall của máy chấm, lớp "positive" = máy phán 'correct'.
 *  - precision = tp / (tp + fp): trong ca máy nói correct, bao nhiêu người cũng correct.
 *  - recall    = tp / (tp + fn): trong ca người nói correct, bao nhiêu máy bắt được.
 * human[i], machine[i] là phán quyết cho CÙNG một lượt chấm.
 */
export function computePrecisionRecall(
  human: Verdict[],
  machine: Verdict[],
): { precision: number; recall: number } {
  if (human.length !== machine.length) {
    throw new Error('human và machine phải cùng độ dài');
  }
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (let i = 0; i < human.length; i++) {
    const mCorrect = machine[i] === 'correct';
    const hCorrect = human[i] === 'correct';
    if (mCorrect && hCorrect) tp++;
    else if (mCorrect && !hCorrect) fp++;
    else if (!mCorrect && hCorrect) fn++;
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  return { precision, recall };
}

/** Sinh số giả ngẫu nhiên tái lập được (mulberry32) — cùng seed cho cùng dãy số. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rút n bản ghi ngẫu nhiên (không lặp) bằng xáo trộn Fisher–Yates có seed.
 * Cùng seed → cùng mẫu, để kết quả tái lập được khi phản biện.
 */
export function sampleForAudit(records: EvalRecord[], n: number, seed: number): EvalRecord[] {
  const arr = records.slice();
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

/** Một dòng trong bảng chấm tay: có sẵn phán máy, để trống ô người điền. */
interface AuditRow {
  seedId: string;
  modelId: string;
  run: number;
  extractedAnswer: string | null;
  machine_verdict: Verdict;
  human_verdict: '';           // NGƯỜI điền tay: 'correct' | 'incorrect' | 'unsure'
}

function toAuditRows(sample: EvalRecord[]): AuditRow[] {
  return sample.map((r) => ({
    seedId: r.seedId,
    modelId: r.modelId,
    run: r.run,
    extractedAnswer: r.extractedAnswer,
    machine_verdict: r.verdict,
    human_verdict: '',
  }));
}

// --------- CLI: npx tsx research/vsgeo-bench/grader/selfcheck.ts <in.jsonl> <n> [out.json] ---------
// Đọc file JSONL các EvalRecord, rút mẫu, ghi bảng chấm tay JSON.
function main(): void {
  const [inPath, nStr, outPath = 'audit-sample.json', seedStr = '42'] = process.argv.slice(2);
  if (!inPath || !nStr) {
    console.error('Cách dùng: npx tsx grader/selfcheck.ts <in.jsonl> <n> [out.json] [seed]');
    process.exit(1);
  }
  const lines = readFileSync(inPath, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const records: EvalRecord[] = lines.map((l) => JSON.parse(l) as EvalRecord);
  const sample = sampleForAudit(records, Number(nStr), Number(seedStr));
  writeFileSync(outPath, JSON.stringify(toAuditRows(sample), null, 2), 'utf8');
  console.log(`Đã ghi ${sample.length} dòng chấm tay vào ${outPath}.`);
  console.log('Bước tiếp: mở file, điền cột human_verdict, rồi tính precision/recall.');
}

// Chỉ chạy main() khi gọi trực tiếp bằng tsx (không chạy khi bị import trong test).
// import.meta.url so với đường dẫn file được node truyền vào argv[1].
const invoked = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (invoked) main();
