/**
 * Read an HSL token from CSS variables and return a concrete `hsl(...)` string.
 * Example: getCssHslVar('--foreground') -> 'hsl(210 40% 98%)'
 */
export function getCssHslVar(varName: `--${string}`): string {
  if (typeof window === 'undefined') return 'hsl(0 0% 0%)';

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();

  // Most shadcn-style tokens are like: "222.2 84% 4.9%"
  if (raw) return `hsl(${raw})`;

  return 'hsl(0 0% 0%)';
}
