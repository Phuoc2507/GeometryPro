// SMOKE "Claude đóng vai bộ dịch": tôi tự dịch 10 đề → plan, rồi chạy qua ENGINE THẬT (dry-run, không mạng).
// Chứng minh: engine ra đúng số cho đề thực + xem trước đáp người dùng sẽ thấy. (Model production gemini-flash
// vẫn cần test live riêng; đây là cận trên "một LLM đủ giỏi dịch đúng thì engine trả đúng".)
import { solvePhysicsPlan, solveChemPlan } from '../api/_lib/kernel-bridge/solveSubject.js';

const CASES = [
  ['Rơi tự do 20 m, g=10 → t chạm đất', 't = 2 s', () => solvePhysicsPlan({
    problemName: 'roi', units: { length: 'm', time: 's' },
    ops: [{ op: 'free_fall', name: 'v', h0: 20, g: 10 }],
    queries: [{ kind: 'time_to_ground', of: 'v', label: 't' }] })],

  ['Mạch R1=4Ω nt R2=6Ω, U=12V → I', 'I = 1,2 A', () => solvePhysicsPlan({
    problemName: 'nt', source: { emf: 12 },
    circuit: { kind: 'series', items: [{ kind: 'resistor', name: 'R1', ohms: 4 }, { kind: 'resistor', name: 'R2', ohms: 6 }] },
    queries: [{ kind: 'current', label: 'I' }] })],

  ['Vật 2kg, F kéo 10N, μ=0,2, g=10 → a', 'a = 3 m/s²', () => solvePhysicsPlan({
    problemName: 'keo', g: 10,
    ops: [{ op: 'body', name: 'v', mass: 2, mu: 0.2 }, { op: 'force', on: 'v', value: 10 }],
    queries: [{ kind: 'acceleration', of: 'v', label: 'a' }] })],

  ['Con lắc lò xo A=4cm, T=0,2s → vmax', 'vmax = 40π ≈ 125,7 cm/s', () => solvePhysicsPlan({
    units: { length: 'cm', time: 's' },
    ops: [{ op: 'oscillator', name: 'v', A: 4, T: { n: 1, d: 5 } }],
    queries: [{ kind: 'vmax', of: 'v', label: 'vmax' }] })],

  ['Sóng cơ λ=40cm, f=500Hz → v', 'v = 20000 cm/s (=200 m/s)', () => solvePhysicsPlan({
    units: { length: 'cm', time: 's' },
    ops: [{ op: 'wave', name: 's', f: 500, lambda: 40 }],
    queries: [{ kind: 'speed', of: 's', label: 'v' }] })],

  ['Điện tích điểm q=4·10⁻⁸C, E cách 3cm', 'E = 4·10⁵ V/m', () => solvePhysicsPlan({
    problemName: 'e', units: { length: 'cm' },
    ops: [{ op: 'point_charge', name: 'A', q: { value: 40, unit: 'nC' }, at: [0, 0] }],
    queries: [{ kind: 'field_at', at: [3, 0], label: 'E' }] })],

  ['RLC: R=100, L=1/π, C=10⁻⁴/π, U=200V → Z', 'Z = 100 Ω', () => solvePhysicsPlan({
    problemName: 'rlc', source: { omega: { n: 100, pi: true }, U: 200 },
    R: 100, L: { n: 1, overPi: true }, C: { n: 1, exp: -4, overPi: true },
    queries: [{ kind: 'impedance', label: 'Z' }] })],

  ['Khí 1atm/3L/27°C nén đẳng nhiệt →1L, p₂', 'p₂ = 3 atm', () => solvePhysicsPlan({
    problemName: 'boyle',
    ops: [
      { op: 'state', name: 's1', p: { value: 1, unit: 'atm' }, V: { value: 3, unit: 'L' }, T: { value: 27, unit: 'C' } },
      { op: 'state', name: 's2', V: { value: 1, unit: 'L' } },
      { op: 'process', kind: 'isothermal', from: 's1', to: 's2' },
    ],
    queries: [{ kind: 'state_value', of: 's2', quantity: 'p', unit: 'atm' }] })],

  ['Al 5,4g + HCl dư → V(H₂) đktc', 'V = 6,72 L (168/25)', () => solveChemPlan({
    ops: [{ op: 'species', formula: 'Al', amount: { grams: '5,4' } },
          { op: 'species', formula: 'HCl', amount: { excess: true }, state: 'solution' }, { op: 'mix' }],
    molarVolume: 22.4, queries: [{ kind: 'volume_gas', of: 'H2' }] })],

  ['Đốt HC: 8,8g CO₂ + 5,4g H₂O, d/H₂=15 → CTPT', 'C2H6', () => solveChemPlan({
    ops: [{ op: 'organic_unknown', name: 'A', contains: ['C', 'H'] },
          { op: 'combustion', of: 'A', co2: { grams: '8,8' }, h2o: { grams: '5,4' } },
          { op: 'measure', of: 'A', kind: 'vapor_density', ref: 'H2', value: 15 }],
    queries: [{ kind: 'molecular_formula', of: 'A' }] })],
];

let ok = 0;
for (const [desc, expect, run] of CASES) {
  let r;
  try { r = run(); } catch (e) { console.log(`\n• ${desc}\n  ✗ NÉM: ${e.message}`); continue; }
  const status = r.ok ? '✓' : '✗';
  if (r.ok) ok++;
  const ans = (r.answers || []).map((a) => `${a.label ? a.label + '=' : ''}${a.text ?? a.exact ?? a.approx}${a.unit ? ' ' + a.unit : ''}`).join(' | ');
  const err = r.ok ? '' : `  (${(r.errors || [])[0]?.message || (r.violations || [])[0]?.message || '?'})`;
  console.log(`\n• ${desc}`);
  console.log(`  ${status} ${r.chapter || r.subject} | KỲ VỌNG: ${expect}`);
  console.log(`  ĐÁP: ${ans || '(không)'}${err}`);
}
console.log(`\n=== ${ok}/${CASES.length} đề engine ra ok:true ===`);
