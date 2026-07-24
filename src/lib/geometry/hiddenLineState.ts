export interface PendingHiddenLineTransition {
  value: boolean;
  count: number;
}

export interface HiddenLineTransitionResult {
  value: boolean;
  pending: PendingHiddenLineTransition | null;
  changed: boolean;
}

export type HiddenLineMapSetter = (
  update: (previous: Map<string, boolean>) => Map<string, boolean>,
) => void;

export function hiddenLineMapsEqual(
  first: ReadonlyMap<string, boolean>,
  second: ReadonlyMap<string, boolean>,
): boolean {
  if (first.size !== second.size) return false;
  for (const [id, hidden] of first) {
    if (second.get(id) !== hidden) return false;
  }
  return true;
}

/**
 * Applies spatial hysteresis to the four edge samples.
 * Hidden edges need 3/4 occluded samples; visible edges need 3/4 visible samples.
 */
export function resolveHiddenLineCandidate(
  current: boolean,
  occludedSamples: number,
  sampleCount = 4,
): boolean {
  const enterHiddenThreshold = Math.ceil(sampleCount * 0.75);
  const exitHiddenThreshold = Math.floor(sampleCount * 0.25);

  if (!current && occludedSamples >= enterHiddenThreshold) return true;
  if (current && occludedSamples <= exitHiddenThreshold) return false;
  return current;
}

/**
 * Requires the same new candidate twice before changing React-visible state.
 */
export function confirmHiddenLineTransition(
  current: boolean,
  candidate: boolean,
  pending: PendingHiddenLineTransition | undefined,
  requiredConfirmations = 2,
): HiddenLineTransitionResult {
  if (candidate === current) {
    return { value: current, pending: null, changed: false };
  }

  const nextPending = pending?.value === candidate
    ? { value: candidate, count: pending.count + 1 }
    : { value: candidate, count: 1 };

  if (nextPending.count < requiredConfirmations) {
    return { value: current, pending: nextPending, changed: false };
  }

  return { value: candidate, pending: null, changed: true };
}

export function scheduleHiddenLinePublish(
  setter: HiddenLineMapSetter,
  next: ReadonlyMap<string, boolean>,
  delayMs = 180,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    setter((previous) => (
      hiddenLineMapsEqual(previous, next) ? previous : new Map(next)
    ));
  }, delayMs);
}
