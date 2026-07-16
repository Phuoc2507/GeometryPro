// scripts/kernel-smoke.mjs
// Proves a PLAIN .js/.mjs consumer (like an API route) can import the built kernel and
// solve a problem end-to-end. Run: node scripts/kernel-smoke.mjs
import { run, entityTableToGeometryData } from '../api/_lib/kernel-dist/index.mjs';

// Flagship pyramid S.ABCD (đáy vuông cạnh 2, SA⊥đáy, SA=2), coordinatized.
const res = run({
  solidName: 'S.ABCD',
  ops: [
    { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
    { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
    { op: 'oxyz_point', name: 'C', at: [2, 2, 0] },
    { op: 'oxyz_point', name: 'D', at: [0, 2, 0] },
    { op: 'oxyz_point', name: 'S', at: [0, 0, 2] },
    { op: 'oxyz_plane', name: 'BASE', by: { form: 'three_points', a: 'A', b: 'B', c: 'C' } },
    { op: 'oxyz_plane', name: 'SCD', by: { form: 'three_points', a: 'S', b: 'C', c: 'D' } },
    { op: 'edge', from: 'A', to: 'B' }, { op: 'edge', from: 'B', to: 'C' },
    { op: 'edge', from: 'C', to: 'D' }, { op: 'edge', from: 'D', to: 'A' },
    { op: 'edge', from: 'S', to: 'A' }, { op: 'edge', from: 'S', to: 'B' },
    { op: 'edge', from: 'S', to: 'C' }, { op: 'edge', from: 'S', to: 'D' },
  ],
  asserts: [{ relation: 'perp', args: ['AS', 'BASE'] }],
  queries: [
    { kind: 'distance', a: 'A', b: 'SCD' },
    { kind: 'volume', solid: 'pyramid', points: ['A', 'B', 'C', 'D'], apex: 'S' },
  ],
});

console.log('ok:', res.ok);
console.log('violations:', res.violations.length, 'errors:', res.errors.length);
console.log('answers:');
for (const a of res.answers) console.log('  -', a.kind, '=', a.text ?? a.relation);

const geo = entityTableToGeometryData(res.entities, 'S.ABCD');
console.log('GeometryData: points=%d lines=%d planes=%d', geo.points.length, geo.lines.length, geo.planes.length);

const ok = res.ok && res.answers[0]?.text === '√2' && res.answers[1]?.text === '8/3' && geo.lines.length === 8;
console.log(ok ? 'SMOKE PASS ✅' : 'SMOKE FAIL ❌');
process.exit(ok ? 0 : 1);
