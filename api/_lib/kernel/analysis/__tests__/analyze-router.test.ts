// runAny là bộ định tuyến: plan có `analyze` → runAnalysis (AnalysisResult, có `answer`); ngược lại → run()
// (EngineResult, có `entities`). Pin để đổi router không âm thầm gãy.
import { describe, it, expect } from 'vitest';
import { runAny } from '../runAnalysis';

describe('runAny — định tuyến geometry vs analyze', () => {
  it('plan KHÔNG có analyze → run() (EngineResult có entities)', () => {
    const g = runAny({ solidName: 'r', ops: [{ op: 'oxyz_point', name: 'A', at: [1, 2, 3] }] });
    expect('entities' in g).toBe(true);
    if ('entities' in g) {
      expect(g.ok).toBe(true);
      expect(g.entities.points.has('A')).toBe(true);
    }
  });

  it('plan CÓ analyze → runAnalysis (AnalysisResult có answer)', () => {
    const a = runAny({ solidName: 'r', analyze: { kind: 'eval', of: { kind: 'expr', expr: '6' } } });
    expect('answer' in a).toBe(true);
    if ('answer' in a) {
      expect(a.ok).toBe(true);
      expect(a.answer.approx).toBe(6);
    }
  });
});
