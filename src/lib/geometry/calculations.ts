import { GeometryData, Point3D } from '@/types/geometry';

// ═══ Distance ═══
export function distance3D(a: Point3D, b: Point3D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

// ═══ Edge lengths ═══
export function computeEdgeLengths(geometry: GeometryData): { label: string; length: number }[] {
  return geometry.lines.map(line => {
    const from = geometry.points.find(p => p.id === line.from);
    const to = geometry.points.find(p => p.id === line.to);
    if (!from || !to) return { label: `${line.from}${line.to}`, length: 0 };
    return {
      label: `${from.label}${to.label}`,
      length: distance3D(from, to),
    };
  });
}

// ═══ Triangle area (3 points) ═══
function triangleArea(a: Point3D, b: Point3D, c: Point3D): number {
  // Cross product of AB × AC
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
  const cx = aby * acz - abz * acy;
  const cy = abz * acx - abx * acz;
  const cz = abx * acy - aby * acx;
  return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
}

// ═══ Polygon area (convex, coplanar points) ═══
function polygonArea(pts: Point3D[]): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    area += triangleArea(pts[0], pts[i], pts[i + 1]);
  }
  return area;
}

// ═══ Detect base face ═══
// Heuristic: points on z=0 or the most common z-plane
function detectBaseFace(geometry: GeometryData): Point3D[] {
  // Group points by z coordinate (rounded)
  const zGroups = new Map<number, Point3D[]>();
  for (const p of geometry.points) {
    const zKey = Math.round(p.z * 1000) / 1000;
    if (!zGroups.has(zKey)) zGroups.set(zKey, []);
    zGroups.get(zKey)!.push(p);
  }

  // Find the z-level with the most points (likely the base)
  let basePoints: Point3D[] = [];
  let maxCount = 0;
  for (const [, pts] of zGroups) {
    if (pts.length > maxCount) {
      maxCount = pts.length;
      basePoints = pts;
    }
  }
  return basePoints;
}

// ═══ Detect apex (highest point not on base) ═══
function detectApex(geometry: GeometryData, basePoints: Point3D[]): Point3D | null {
  const baseIds = new Set(basePoints.map(p => p.id));
  const nonBase = geometry.points.filter(p => !baseIds.has(p.id));
  if (nonBase.length === 0) return null;
  // Return the point with max z
  return nonBase.reduce((max, p) => (p.z > max.z ? p : max), nonBase[0]);
}

// ═══ Compute geometry properties ═══
export interface GeometryProperties {
  edgeLengths: { label: string; length: number }[];
  baseArea: number | null;
  height: number | null;
  volume: number | null;
  totalSurfaceArea: number | null;
  // For special shapes
  shapeType: string;
  radius?: number;
}

export function computeProperties(geometry: GeometryData): GeometryProperties {
  const edgeLengths = computeEdgeLengths(geometry);

  // Check for special shapes first
  if (geometry.spheres && geometry.spheres.length > 0) {
    const s = geometry.spheres[0];
    const r = s.radius;
    return {
      edgeLengths,
      baseArea: null,
      height: 2 * r,
      volume: (4 / 3) * Math.PI * r ** 3,
      totalSurfaceArea: 4 * Math.PI * r ** 2,
      shapeType: 'Hình cầu',
      radius: r,
    };
  }

  if (geometry.cylinders && geometry.cylinders.length > 0) {
    const c = geometry.cylinders[0];
    const r = c.radius;
    const dx = c.center2.x - c.center1.x;
    const dy = c.center2.y - c.center1.y;
    const dz = c.center2.z - c.center1.z;
    const h = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return {
      edgeLengths,
      baseArea: Math.PI * r ** 2,
      height: h,
      volume: Math.PI * r ** 2 * h,
      totalSurfaceArea: 2 * Math.PI * r * (r + h),
      shapeType: 'Hình trụ',
      radius: r,
    };
  }

  if (geometry.cones && geometry.cones.length > 0) {
    const c = geometry.cones[0];
    const r = c.radius;
    const dx = c.apex.x - c.baseCenter.x;
    const dy = c.apex.y - c.baseCenter.y;
    const dz = c.apex.z - c.baseCenter.z;
    const h = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const l = Math.sqrt(r * r + h * h); // slant height
    return {
      edgeLengths,
      baseArea: Math.PI * r ** 2,
      height: h,
      volume: (1 / 3) * Math.PI * r ** 2 * h,
      totalSurfaceArea: Math.PI * r * (r + l),
      shapeType: 'Hình nón',
      radius: r,
    };
  }

  // Polyhedron (pyramid, prism, cube, etc.)
  const basePoints = detectBaseFace(geometry);
  const baseArea = basePoints.length >= 3 ? polygonArea(basePoints) : null;
  const apex = detectApex(geometry, basePoints);

  let height: number | null = null;
  let volume: number | null = null;
  let shapeType = 'Khối đa diện';

  if (apex && basePoints.length >= 3) {
    // Height = distance from apex to base plane (z difference for z=0 base)
    const baseZ = basePoints[0].z;
    height = Math.abs(apex.z - baseZ);
    
    if (baseArea !== null && height > 0) {
      // Check if it's a pyramid (1 apex) or prism
      const baseIds = new Set(basePoints.map(p => p.id));
      const topPoints = geometry.points.filter(p => !baseIds.has(p.id));
      
      if (topPoints.length === 1) {
        // Pyramid
        volume = (1 / 3) * baseArea * height;
        shapeType = `Hình chóp (${basePoints.length} đỉnh đáy)`;
      } else if (topPoints.length === basePoints.length) {
        // Prism
        volume = baseArea * height;
        shapeType = `Lăng trụ (${basePoints.length} đỉnh đáy)`;
      }
    }
  } else if (basePoints.length === geometry.points.length && basePoints.length >= 3) {
    shapeType = 'Đa giác phẳng';
  }

  return {
    edgeLengths,
    baseArea,
    height,
    volume,
    totalSurfaceArea: null, // Complex for general polyhedra
    shapeType,
  };
}

// ═══ Angle between two vectors ═══
export function angleBetweenPoints(vertex: Point3D, p1: Point3D, p2: Point3D): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y, z: p1.z - vertex.z };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y, z: p2.z - vertex.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosA = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosA) * (180 / Math.PI);
}

// ═══ Format number nicely ═══
export function fmt(n: number, decimals = 2): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}
