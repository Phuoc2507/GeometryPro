import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  confirmHiddenLineTransition,
  hiddenLineMapsEqual,
  resolveHiddenLineCandidate,
  scheduleHiddenLinePublish,
} from './hiddenLineState';

describe('hidden-line state', () => {
  afterEach(() => vi.useRealTimers());

  it('compares maps by their contents', () => {
    expect(hiddenLineMapsEqual(
      new Map([['AB', true], ['BC', false]]),
      new Map([['BC', false], ['AB', true]]),
    )).toBe(true);
    expect(hiddenLineMapsEqual(
      new Map([['AB', true]]),
      new Map([['AB', false]]),
    )).toBe(false);
  });

  it('uses hysteresis when entering and leaving the hidden state', () => {
    expect(resolveHiddenLineCandidate(false, 2)).toBe(false);
    expect(resolveHiddenLineCandidate(false, 3)).toBe(true);
    expect(resolveHiddenLineCandidate(true, 2)).toBe(true);
    expect(resolveHiddenLineCandidate(true, 1)).toBe(false);
  });

  it('requires two consecutive confirmations', () => {
    const first = confirmHiddenLineTransition(false, true, undefined);
    expect(first).toEqual({
      value: false,
      pending: { value: true, count: 1 },
      changed: false,
    });

    const second = confirmHiddenLineTransition(false, true, first.pending ?? undefined);
    expect(second).toEqual({ value: true, pending: null, changed: true });

    const cancelled = confirmHiddenLineTransition(false, false, first.pending ?? undefined);
    expect(cancelled).toEqual({ value: false, pending: null, changed: false });
  });

  it('publishes a changed map only once', () => {
    vi.useFakeTimers();
    const previous = new Map([['AB', true]]);
    let current = previous;
    const setter = vi.fn((update: (value: Map<string, boolean>) => Map<string, boolean>) => {
      current = update(current);
    });

    scheduleHiddenLinePublish(setter, new Map([['BC', true]]), 180);
    vi.advanceTimersByTime(180);
    vi.advanceTimersByTime(1000);

    expect(setter).toHaveBeenCalledTimes(1);
    expect(current).not.toBe(previous);
    expect(current).toEqual(new Map([['BC', true]]));
  });

  it('preserves the previous reference for equal maps', () => {
    vi.useFakeTimers();
    const previous = new Map([['AB', true]]);
    let current = previous;
    const setter = vi.fn((update: (value: Map<string, boolean>) => Map<string, boolean>) => {
      current = update(current);
    });

    scheduleHiddenLinePublish(setter, new Map([['AB', true]]), 180);
    vi.advanceTimersByTime(180);

    expect(current).toBe(previous);
  });
});
