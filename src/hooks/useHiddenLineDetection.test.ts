import { describe, expect, it } from 'vitest';
import { mapsEqual, nextHiddenCandidate } from './useHiddenLineDetection';

describe('hidden-line state stabilization', () => {
  it('compares maps by content instead of identity', () => {
    const first = new Map([['AB', false], ['CD', true]]);
    const same = new Map([['CD', true], ['AB', false]]);
    expect(first).not.toBe(same);
    expect(mapsEqual(first, same)).toBe(true);
    expect(mapsEqual(first, new Map([['AB', true], ['CD', true]]))).toBe(false);
  });

  it('requires two consecutive hidden observations', () => {
    const first = nextHiddenCandidate(false, 3);
    expect(first).toEqual({
      hidden: false,
      candidate: { value: true, count: 1 },
    });
    expect(nextHiddenCandidate(false, 4, first.candidate)).toEqual({ hidden: true });
  });

  it('requires two consecutive visible observations', () => {
    const first = nextHiddenCandidate(true, 1);
    expect(first).toEqual({
      hidden: true,
      candidate: { value: false, count: 1 },
    });
    expect(nextHiddenCandidate(true, 0, first.candidate)).toEqual({ hidden: false });
  });

  it('holds the current state in the hysteresis band', () => {
    expect(nextHiddenCandidate(false, 2)).toEqual({ hidden: false });
    expect(nextHiddenCandidate(true, 2)).toEqual({ hidden: true });
  });

  it('drops a pending candidate when the next sample is not decisive', () => {
    const pending = nextHiddenCandidate(false, 4).candidate;
    expect(nextHiddenCandidate(false, 2, pending)).toEqual({ hidden: false });
  });
});
