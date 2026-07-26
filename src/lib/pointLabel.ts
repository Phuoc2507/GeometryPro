/**
 * Reduce a point label to a bare vertex name: a single letter plus any primes,
 * dropping the coordinates or descriptions a producer may append. Vertex names
 * on a figure are just letters (with an optional prime) — the coordinates live
 * in the problem, not on the point.
 *
 *   "A(8;0)"      → "A"
 *   "M(4; 16/3)"  → "M"
 *   "O(0;0)"      → "O"
 *   "S (đỉnh)"    → "S"
 *   "A′" / "A'"   → "A'"   (prime kept, unicode prime normalised)
 *   "A"           → "A"
 */
export function cleanPointLabel(label: string): string {
  if (!label) return label;
  const trimmed = label.trim();
  const core = trimmed
    .split('(')[0] // drop "(…coordinates/description…)"
    .trim()
    .split(/\s+/)[0] // drop a trailing descriptive word
    .replace(/[′’]/g, "'"); // normalise unicode primes to an apostrophe
  return core || trimmed;
}
