// api/_lib/kernel/analysis/sliceVolume.ts
// Lõi tất định cho khối "thiết diện đã biết" (Đợt 2): V = ∫ k·side(t)² dt, side = |outer−inner|.
// k theo hình lát: vuông=1, tam giác đều=√3/4, nửa tròn=π/8, chữ nhật=ratio.
import type { ProfileFn, SliceStack, Verified } from '../../../../src/types/geometry';
import { integrate } from './quadrature';
import { compileProfile } from './revolution';

export type SectionKind = 'square' | 'equilateral' | 'semicircle' | 'rect';

// Hệ số k của diện tích thiết diện theo cạnh `side`.
export function sectionK(section: SectionKind, ratio = 1): number {
  switch (section) {
    case 'square': return 1;
    case 'equilateral': return Math.sqrt(3) / 4;
    case 'semicircle': return Math.PI / 8;          // đường kính = side
    case 'rect': return ratio;                      // cạnh kia = ratio·side
  }
}

const LATEX_S: Record<SectionKind, string> = {
  square: 's^2',
  equilateral: '\\tfrac{\\sqrt3}{4}s^2',
  semicircle: '\\tfrac{\\pi}{8}s^2',
  rect: 'k\\,s^2',
};

// side(t) = |outer(t) − inner(t)| (inner vắng ⇒ |outer|).
function compileSide(outer: ProfileFn, inner?: ProfileFn): (t: number) => number {
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  return (t) => Math.abs(go(t) - (gi ? gi(t) : 0));
}

export function sliceStackVolume(
  section: SectionKind,
  outer: ProfileFn,
  domain: [number, number],
  inner?: ProfileFn,
  ratio = 1,
): { value: number; estimatedError: number } {
  const [a, b] = domain;
  const side = compileSide(outer, inner);
  const k = sectionK(section, ratio);
  return integrate((t) => k * side(t) * side(t), a, b);
}

function sampleSide(
  outer: ProfileFn, domain: [number, number], inner?: ProfileFn, n = 64,
): { t: number; side: number }[] {
  const [a, b] = domain;
  const side = compileSide(outer, inner);
  const out: { t: number; side: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = a + ((b - a) * i) / n;
    const s = side(t);
    out.push({ t, side: Number.isFinite(s) ? Math.max(0, s) : 0 });
  }
  return out;
}

export function buildSliceStack(
  id: string,
  section: SectionKind,
  outer: ProfileFn,
  domain: [number, number],
  color?: string,
  inner?: ProfileFn,
  ratio?: number,
  axis: 'Ox' | 'Oy' = 'Ox',
): SliceStack {
  const r = section === 'rect' ? (ratio && ratio > 0 ? ratio : 1) : undefined;
  const { value, estimatedError } = sliceStackVolume(section, outer, domain, inner, r ?? 1);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = `V=\\int_{${domain[0]}}^{${domain[1]}} ${LATEX_S[section]}\\,d${axis === 'Oy' ? 'y' : 'x'}`;
  const volume: Verified<number> = { value, latex, verified, estimatedError };
  return {
    id, axis, domain, outer, section, volume, color,
    ...(inner ? { inner } : {}),
    ...(r !== undefined ? { ratio: r } : {}),
    samples: sampleSide(outer, domain, inner),
  };
}
