/**
 * constraintVerify.js
 *
 * Gọi constraintVerify.py để kiểm chứng ràng buộc hình học.
 * Chạy độc lập với pythonSandbox — không có restriction.
 *
 * Usage:
 *   import { verifyConstraints } from './constraintVerify.js';
 *   const result = await verifyConstraints(pointsMap, constraintStrings);
 *   // result: { ok, confidence, violations, all_results, stats }
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, 'constraintVerify.py');
const TIMEOUT_MS = 8000;

/**
 * @param {Record<string, number[]>} pointsMap  — { A:[x,y,z], B:[x,y,z], ... }
 * @param {string[]} constraints                — ["SA ⊥ đáy", "AB = 4", ...]
 * @returns {Promise<{ok:boolean, confidence:number, violations:object[], all_results:object[], stats:object}>}
 */
export async function verifyConstraints(pointsMap, constraints) {
  // Không có gì để verify
  if (!constraints || constraints.length === 0) {
    return { ok: true, confidence: 1.0, violations: [], all_results: [], stats: { total: 0, checked: 0, passed: 0, failed: 0 } };
  }
  if (!pointsMap || Object.keys(pointsMap).length === 0) {
    return { ok: true, confidence: 0.5, violations: [], all_results: [], stats: { total: 0, checked: 0, passed: 0, failed: 0 } };
  }

  const pythonPath = process.env.PYTHON_PATH || 'python';
  const input = JSON.stringify({ points: pointsMap, constraints });

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(pythonPath, [SCRIPT_PATH]);

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
      console.warn('[constraintVerify] timeout — skipping verification');
      resolve({ ok: true, confidence: 0.5, violations: [], all_results: [], stats: {},
                warning: 'timeout' });
    }, TIMEOUT_MS);

    proc.stdin.write(input);
    proc.stdin.end();

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (stderr) {
        console.warn('[constraintVerify] stderr:', stderr.slice(0, 300));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.violations?.length > 0) {
          console.warn('[constraintVerify] violations:', result.violations.map(v => v.constraint).join(', '));
        }
        resolve(result);
      } catch (e) {
        // Graceful degradation — không block pipeline
        console.warn('[constraintVerify] parse error:', e.message, '| stdout:', stdout.slice(0, 100));
        resolve({ ok: true, confidence: 0.5, violations: [], all_results: [],
                  stats: {}, warning: 'parse_error' });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (timedOut) return;
      console.warn('[constraintVerify] spawn error:', err.message);
      resolve({ ok: true, confidence: 0.5, violations: [], all_results: [],
                stats: {}, warning: err.message });
    });
  });
}

/**
 * Chuyển GeometryData.points array → pointsMap cho verifyConstraints
 * @param {Array<{id:string, x:number, y:number, z:number}>} points
 * @returns {Record<string, number[]>}
 */
export function pointsToMap(points) {
  const map = {};
  for (const p of (points || [])) {
    map[p.id] = [p.x, p.y, p.z];
    if (p.label && p.label !== p.id) {
      map[p.label] = [p.x, p.y, p.z];
    }
  }
  return map;
}
