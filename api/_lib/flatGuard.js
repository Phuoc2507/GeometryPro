export function isLikelyFlatGeometry(geometry) {
  const points = Array.isArray(geometry?.points) ? geometry.points : [];
  if (points.length < 4) return false;

  const zs = points.map((p) => Number(p?.z) || 0);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return Math.abs(maxZ - minZ) < 1e-3;
}

export function isLikely3DPrompt(prompt) {
  if (!prompt) return false;
  return /(hình chóp|hinh chop|hình hộp|hinh hop|lăng trụ|lang tru|tứ diện|tu dien|khối|khoi|s\.[a-z])/i.test(prompt);
}

export function applyApexLiftFallback(geometry) {
  if (!isLikelyFlatGeometry(geometry)) return geometry;

  const points = Array.isArray(geometry?.points) ? [...geometry.points] : [];
  if (points.length < 4) return geometry;

  const keyOf = (p) => String(p?.id || p?.label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const idxS = points.findIndex((p) => keyOf(p) === 's');
  if (idxS === -1) return geometry;

  const basePoints = points.filter((_, i) => i !== idxS);
  const xs = basePoints.map((p) => Number(p?.x) || 0);
  const ys = basePoints.map((p) => Number(p?.y) || 0);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const lift = Math.max(3, Number((Math.max(spanX, spanY) * 0.8).toFixed(4)) || 4);

  points[idxS] = { ...points[idxS], z: lift };

  const idxA = points.findIndex((p) => keyOf(p) === 'a');
  const idxN = points.findIndex((p) => keyOf(p) === 'n');
  if (idxA !== -1 && idxN !== -1) {
    const A = points[idxA];
    const S = points[idxS];
    points[idxN] = {
      ...points[idxN],
      x: Number(((Number(A.x) + Number(S.x)) / 2).toFixed(4)),
      y: Number(((Number(A.y) + Number(S.y)) / 2).toFixed(4)),
      z: Number(((Number(A.z) + Number(S.z)) / 2).toFixed(4)),
    };
  }

  return { ...geometry, points };
}
