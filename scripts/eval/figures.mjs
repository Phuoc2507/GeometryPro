// scripts/eval/figures.mjs
// Sinh BIỂU ĐỒ SVG tự chứa (không phụ thuộc thư viện) từ kết quả chạy, để đưa vào báo cáo/poster.
//   node scripts/eval/figures.mjs --fitness docs/nghien-cuu/prompt-opt-runs/<run>/history.csv
//   node scripts/eval/figures.mjs --baseline docs/nghien-cuu/eval-runs/<run>/results.json
// Ghi ra file .svg cạnh dữ liệu nguồn. SVG có nền/màu tường minh, đọc được ở cả nền sáng lẫn tối.
import fs from 'node:fs';
import path from 'node:path';

const C = { ink: '#1f2937', grid: '#d1d5db', axis: '#6b7280', best: '#2563eb', mean: '#9333ea',
  acc: '#2563eb', wrong: '#dc2626', prec: '#059669', bg: '#ffffff' };

function svgWrap(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="system-ui,Segoe UI,Roboto,sans-serif">
<title>${title}</title>
<rect width="${w}" height="${h}" fill="${C.bg}"/>
${body}
</svg>\n`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---- Biểu đồ đường: fitness qua các thế hệ ----
function fitnessSvg(rows) {
  const W = 720, H = 400, m = { t: 48, r: 130, b: 48, l: 56 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const gens = rows.map((r) => r.gen);
  const ys = rows.flatMap((r) => [r.bestFitness, r.meanFitness]);
  const yMin = Math.min(0, ...ys), yMax = Math.max(1, ...ys);
  const x = (g) => m.l + (gens.length <= 1 ? 0 : (g - gens[0]) / (gens[gens.length - 1] - gens[0]) * iw);
  const y = (v) => m.t + ih - (v - yMin) / (yMax - yMin || 1) * ih;
  const line = (key, color) => `<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${rows.map((r) => `${x(r.gen).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ')}"/>` +
    rows.map((r) => `<circle cx="${x(r.gen).toFixed(1)}" cy="${y(r[key]).toFixed(1)}" r="3" fill="${color}"/>`).join('');
  const yticks = Array.from({ length: 5 }, (_, i) => yMin + (yMax - yMin) * i / 4);
  const body = [
    `<text x="${m.l}" y="26" font-size="16" font-weight="700" fill="${C.ink}">Đường cong fitness qua các thế hệ</text>`,
    ...yticks.map((t) => `<line x1="${m.l}" y1="${y(t).toFixed(1)}" x2="${m.l + iw}" y2="${y(t).toFixed(1)}" stroke="${C.grid}" stroke-width="1"/><text x="${m.l - 8}" y="${(y(t) + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="${C.axis}">${t.toFixed(2)}</text>`),
    ...gens.map((g) => `<text x="${x(g).toFixed(1)}" y="${m.t + ih + 18}" font-size="11" text-anchor="middle" fill="${C.axis}">${g}</text>`),
    `<text x="${m.l + iw / 2}" y="${H - 10}" font-size="12" text-anchor="middle" fill="${C.axis}">Thế hệ</text>`,
    line('meanFitness', C.mean), line('bestFitness', C.best),
    `<rect x="${m.l + iw + 18}" y="${m.t}" width="12" height="12" fill="${C.best}"/><text x="${m.l + iw + 34}" y="${m.t + 11}" font-size="12" fill="${C.ink}">best</text>`,
    `<rect x="${m.l + iw + 18}" y="${m.t + 20}" width="12" height="12" fill="${C.mean}"/><text x="${m.l + iw + 34}" y="${m.t + 31}" font-size="12" fill="${C.ink}">mean</text>`,
  ].join('\n');
  return svgWrap(W, H, body, 'Fitness over generations');
}

// ---- Biểu đồ cột nhóm: baseline ----
function baselineSvg(metrics) {
  const methods = Object.keys(metrics);
  const groups = [
    { key: 'accuracy', label: 'Accuracy', color: C.acc },
    { key: 'confidentlyWrong', label: 'Confidently-wrong', color: C.wrong },
    { key: 'precisionWhenAnswered', label: 'Precision khi trả lời', color: C.prec },
  ];
  const W = 720, H = 420, m = { t: 48, r: 20, b: 90, l: 48 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const gw = iw / methods.length;
  const bw = gw / (groups.length + 1);
  const y = (v) => m.t + ih - v * ih;
  const bars = [];
  methods.forEach((meth, mi) => {
    groups.forEach((g, gi) => {
      const v = metrics[meth][g.key] || 0;
      const bx = m.l + mi * gw + (gi + 0.5) * bw;
      bars.push(`<rect x="${bx.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw * 0.9).toFixed(1)}" height="${(ih - y(v) + m.t).toFixed(1)}" fill="${g.color}"/>` +
        `<text x="${(bx + bw * 0.45).toFixed(1)}" y="${(y(v) - 5).toFixed(1)}" font-size="10" text-anchor="middle" fill="${C.ink}">${(v * 100).toFixed(0)}%</text>`);
    });
    bars.push(`<text x="${(m.l + mi * gw + gw / 2).toFixed(1)}" y="${m.t + ih + 20}" font-size="13" font-weight="600" text-anchor="middle" fill="${C.ink}">${esc(meth)}</text>`);
  });
  const yticks = [0, 0.25, 0.5, 0.75, 1];
  const legend = groups.map((g, i) => `<rect x="${m.l + i * 200}" y="${H - 30}" width="12" height="12" fill="${g.color}"/><text x="${m.l + i * 200 + 16}" y="${H - 20}" font-size="12" fill="${C.ink}">${g.label}</text>`).join('');
  const body = [
    `<text x="${m.l}" y="26" font-size="16" font-weight="700" fill="${C.ink}">So sánh baseline</text>`,
    ...yticks.map((t) => `<line x1="${m.l}" y1="${y(t).toFixed(1)}" x2="${m.l + iw}" y2="${y(t).toFixed(1)}" stroke="${C.grid}"/><text x="${m.l - 8}" y="${(y(t) + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="${C.axis}">${(t * 100).toFixed(0)}%</text>`),
    ...bars, legend,
  ].join('\n');
  return svgWrap(W, H, body, 'Baseline comparison');
}

function parseCsv(text) {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',');
  return lines.map((l) => { const v = l.split(','); return Object.fromEntries(cols.map((c, i) => [c, Number(v[i])])); });
}

function main() {
  const a = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) args[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;

  if (args.fitness) {
    const rows = parseCsv(fs.readFileSync(args.fitness, 'utf8'));
    const out = path.join(path.dirname(args.fitness), 'fitness-curve.svg');
    fs.writeFileSync(out, fitnessSvg(rows));
    console.log('ghi', out);
  }
  if (args.baseline) {
    const data = JSON.parse(fs.readFileSync(args.baseline, 'utf8'));
    const out = path.join(path.dirname(args.baseline), 'baseline-bars.svg');
    fs.writeFileSync(out, baselineSvg(data.metrics));
    console.log('ghi', out);
  }
  if (!args.fitness && !args.baseline) {
    console.log('Dùng: --fitness <history.csv>  và/hoặc  --baseline <results.json>');
  }
}
main();
