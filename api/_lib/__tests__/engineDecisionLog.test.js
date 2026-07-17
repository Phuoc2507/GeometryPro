import { describe, it, expect, vi } from 'vitest';
import { logEngineDecision } from '../engineDecisionLog.js';
describe('logEngineDecision', () => {
  it('in một dòng JSON có prefix [engine-decision]', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logEngineDecision({ mode: 'quick', served: true, reason: '', ms: 1234, promptLen: 80 });
    const line = spy.mock.calls.at(-1)[0];
    expect(line).toContain('[engine-decision]');
    const obj = JSON.parse(line.replace('[engine-decision] ', ''));
    expect(obj.served).toBe(true); expect(obj.mode).toBe('quick'); expect(obj.ms).toBe(1234);
    expect(obj).not.toHaveProperty('prompt'); // KHÔNG log nội dung đề
    spy.mockRestore();
  });
});
