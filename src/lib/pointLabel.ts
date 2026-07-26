const SUBSCRIPT_DIGITS: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};

/**
 * Reduce a point label to a bare vertex name: a single letter plus any primes.
 *
 * Two clean-ups:
 *  1. Drop appended coordinates / descriptions — "A(8;0)" → "A", "S (đỉnh)" → "S".
 *  2. Rewrite a trailing index as primes so a name never carries a digit —
 *     "S1" / "S_1" / "S₁" → "S'", "A2" → "A''". This matches the textbook
 *     convention (letters and apostrophes only) and fixes already-saved figures
 *     at display time, since the server only cleans newly generated ones.
 *
 *   "A(8;0)"      → "A"
 *   "M(4; 16/3)"  → "M"
 *   "S_1"         → "S'"
 *   "A′" / "A'"   → "A'"   (prime kept, unicode prime normalised)
 *   "A"           → "A"
 */
export function cleanPointLabel(label: string): string {
  if (!label) return label;
  const trimmed = label.trim();
  let core = trimmed
    .split('(')[0] // drop "(…coordinates/description…)"
    .trim()
    .split(/\s+/)[0] // drop a trailing descriptive word
    .replace(/[′’]/g, "'") // normalise unicode primes to an apostrophe
    .replace(/_/g, '') // drop LaTeX-style subscript underscore ("S_1" → "S1")
    .replace(/[₀-₉]/g, (ch) => SUBSCRIPT_DIGITS[ch] || ch); // unicode subscripts → digits

  // A trailing index becomes primes: X1 → X', X2 → X''. Vertex names carry
  // letters and apostrophes only, never digits.
  const indexed = /^([A-Za-z]'*)(\d+)$/.exec(core);
  if (indexed) {
    const count = Number(indexed[2]);
    core = indexed[1] + (count >= 1 && count <= 3 ? "'".repeat(count) : '');
  }

  return core || trimmed;
}
