// scripts/eval/split.mjs
// TÁCH TRAIN/TEST cho benchmark — tất định theo --seed, PHÂN TẦNG theo dạng bài (kind) để cả hai tập
// đều đa dạng. Mục đích khoa học: tối ưu prompt CHỈ trên TRAIN, báo accuracy trên TEST (giữ riêng) ⇒
// tránh chỉ trích "overfit prompt vào tập test".
//
//   node scripts/eval/split.mjs --ratio 0.3 --seed 42 --name default
//   → ghi bench/splits/default.json = { seed, ratio, train:[id...], test:[id...] }
import fs from 'node:fs';
import path from 'node:path';
import { makeRng } from '../prompt-opt/prng.mjs';
import { loadDataset } from '../prompt-opt/dataset.mjs';

const SPLIT_DIR = path.resolve('bench/splits');

export function kindOf(item) {
  return (item.expect?.answers?.[0]?.kind) ||
    (/dist/.test(item.id) ? 'distance' : /vol/.test(item.id) ? 'volume' : 'khác');
}

// Phân tầng: gom theo kind, xáo trộn từng nhóm bằng RNG hạt giống, lấy `ratio` mỗi nhóm cho TEST.
export function makeSplit(items, ratio = 0.3, seed = 42) {
  const rng = makeRng(seed);
  const byKind = new Map();
  for (const it of items) {
    const k = kindOf(it);
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push(it.id);
  }
  const train = [], test = [];
  for (const k of [...byKind.keys()].sort()) {
    const ids = rng.shuffle([...byKind.get(k)]);
    const nTest = Math.max(1, Math.round(ids.length * ratio)); // mỗi kind ≥1 ca test nếu có
    test.push(...ids.slice(0, nTest));
    train.push(...ids.slice(nTest));
  }
  return { seed, ratio, train: train.sort(), test: test.sort() };
}

export function loadSplit(name) {
  const p = path.join(SPLIT_DIR, name.endsWith('.json') ? name : name + '.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const args = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) args[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  const ratio = Number(args.ratio ?? 0.3);
  const seed = Number(args.seed ?? 42);
  const name = args.name || 'default';
  const dataDir = args.data || path.resolve('bench/golden');

  const items = loadDataset(dataDir);
  const split = makeSplit(items, ratio, seed);
  fs.mkdirSync(SPLIT_DIR, { recursive: true });
  const out = path.join(SPLIT_DIR, name + '.json');
  fs.writeFileSync(out, JSON.stringify(split, null, 2) + '\n');
  console.log(`Split '${name}': ${items.length} ca → train ${split.train.length} / test ${split.test.length} (ratio=${ratio}, seed=${seed})`);
  console.log(`  test ids: ${split.test.join(', ')}`);
  console.log(`  ghi: ${path.relative(process.cwd(), out)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
