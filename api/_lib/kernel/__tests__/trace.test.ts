// api/_lib/kernel/__tests__/trace.test.ts
import { describe, it, expect } from 'vitest';
import { Trace } from '../trace';

describe('Trace', () => {
  it('records events in order with stage/message/data', () => {
    const trace = new Trace();
    trace.log('execute', 'started', { opCount: 3 });
    trace.log('verify', 'passed');
    expect(trace.events).toHaveLength(2);
    expect(trace.events[0]).toMatchObject({ stage: 'execute', message: 'started', data: { opCount: 3 } });
    expect(trace.events[1]).toMatchObject({ stage: 'verify', message: 'passed' });
  });

  it('summary() counts events per stage', () => {
    const trace = new Trace();
    trace.log('execute', 'a');
    trace.log('execute', 'b');
    trace.log('verify', 'c');
    const summary = trace.summary();
    expect(summary.totalEvents).toBe(3);
    expect(summary.byStage).toEqual({ execute: 2, verify: 1 });
  });

  it('starts empty', () => {
    const trace = new Trace();
    expect(trace.events).toHaveLength(0);
    expect(trace.summary().totalEvents).toBe(0);
  });
});
