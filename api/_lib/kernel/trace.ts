export type TraceStage = 'execute' | 'verify' | 'repair' | 'exactForm';

export type TraceEvent = {
  stage: TraceStage;
  message: string;
  data?: Record<string, unknown>;
};

/** Pure, I/O-free event log — no wall-clock timestamps, so the kernel stays deterministic
 * and trivially testable. Callers attach their own timing around kernel calls. */
export class Trace {
  events: TraceEvent[] = [];

  log(stage: TraceStage, message: string, data?: Record<string, unknown>): void {
    this.events.push({ stage, message, data });
  }

  summary(): { totalEvents: number; byStage: Record<string, number> } {
    return {
      totalEvents: this.events.length,
      byStage: this.events.reduce<Record<string, number>>((acc, e) => {
        acc[e.stage] = (acc[e.stage] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}
