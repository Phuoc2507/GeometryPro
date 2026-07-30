export function normalizeId(id) {
  if (!id) return 'unknown';
  return id.replace(/_prime/g, 'p').replace(/'/g, 'p');
}

export function normalizeLabel(id, label) {
  if (label) return label;
  if (!id) return '?';
  let l = id.replace(/_prime/g, "'");
  if (l.endsWith('p') && l.length === 2) l = l[0] + "'";
  return l;
}

export function normalizeGeometryData(data) {
  const normalized = {
    name: data.name || 'Geometry',
    points: [],
    lines: [],
    spheres: [],
    circles: [],
    cylinders: data.cylinders || [],
    cones: data.cones || [],
    planes: [],
  };

  if (Array.isArray(data.points)) {
    normalized.points = data.points.map((p) => {
      if (Array.isArray(p.point)) {
        return { id: normalizeId(p.id), label: normalizeLabel(p.id, p.label), x: p.point[0], y: p.point[1], z: p.point[2] };
      }
      if (Array.isArray(p.coords)) {
        return { id: normalizeId(p.id), label: normalizeLabel(p.id, p.label), x: p.coords[0], y: p.coords[1], z: p.coords[2] };
      }
      return {
        id: normalizeId(p.id),
        label: normalizeLabel(p.id, p.label),
        x: Number(p.x) || 0,
        y: Number(p.y) || 0,
        z: Number(p.z) || 0,
      };
    });
  }

  // Build point lookup map
  const pointMap = {};
  for (const p of normalized.points) {
    pointMap[p.id] = { x: p.x, y: p.y, z: p.z };
    if (p.label) pointMap[p.label] = { x: p.x, y: p.y, z: p.z };
  }

  function resolveCenter(center) {
    if (!center) return null;
    if (typeof center === 'string') {
      const nid = normalizeId(center);
      return pointMap[nid] || pointMap[center] || null;
    }
    if (typeof center === 'object' && ('x' in center || 'y' in center || 'z' in center)) {
      return { x: Number(center.x) || 0, y: Number(center.y) || 0, z: Number(center.z) || 0 };
    }
    return null;
  }

  if (Array.isArray(data.planes)) {
    normalized.planes = data.planes.map((plane, index) => {
      const rawPointIds = Array.isArray(plane.pointIds)
        ? plane.pointIds
        : Array.isArray(plane.points) && plane.points.every((point) => typeof point === 'string')
          ? plane.points
          : [];
      const normalizedPointIds = rawPointIds.map((id) => normalizeId(id));
      const pointIds = normalizedPointIds
        .filter((id) => normalized.points.some((point) => point.id === id));
      const hasCompletePointIds = pointIds.length >= 3
        && pointIds.length === normalizedPointIds.length;

      let points = hasCompletePointIds
        ? pointIds.map((id) => pointMap[id])
        : (Array.isArray(plane.points) ? plane.points : [])
          .filter((point) => point && typeof point === 'object')
          .map((point) => ({
            x: Number(point.x),
            y: Number(point.y),
            z: Number(point.z),
          }))
          .filter((point) => [point.x, point.y, point.z].every(Number.isFinite));
      if (points.length < 3) return null;

      let resolvedPointIds = pointIds;
      if (resolvedPointIds.length !== points.length) {
        resolvedPointIds = points.map((corner) => {
          const match = normalized.points.find((point) =>
            Math.abs(point.x - corner.x) <= 1e-6
            && Math.abs(point.y - corner.y) <= 1e-6
            && Math.abs(point.z - corner.z) <= 1e-6);
          return match?.id;
        }).filter(Boolean);
      }

      // Prefer canonical coordinates from referenced geometry points. Besides
      // avoiding drift, this keeps plane edits attached to their vertices.
      if (resolvedPointIds.length === points.length) {
        points = resolvedPointIds.map((id) => pointMap[id]);
      }

      return {
        ...plane,
        id: plane.id || `plane-${index + 1}`,
        pointIds: resolvedPointIds.length === points.length ? resolvedPointIds : undefined,
        points,
        opacity: Number.isFinite(Number(plane.opacity))
          ? Math.min(0.35, Math.max(0.03, Number(plane.opacity)))
          : 0.12,
      };
    }).filter(Boolean);
  }

  if (Array.isArray(data.lines)) {
    normalized.lines = data.lines.map((l, index) => ({
      id: l.id || `l${index + 1}`,
      from: normalizeId(l.from),
      to: normalizeId(l.to),
      style: l.style || l.type || 'solid',
    }));
  }

  if (Array.isArray(data.circles)) {
    normalized.circles = data.circles.map((c, i) => {
      const center = resolveCenter(c.center);
      if (!center) {
        console.warn(`Circle ${c.id || i}: cannot resolve center "${c.center}", skipping`);
        return null;
      }
      let normal = { x: 0, y: 0, z: 1 };
      if (c.normal) {
        if (Array.isArray(c.normal)) {
          normal = { x: Number(c.normal[0]) || 0, y: Number(c.normal[1]) || 0, z: Number(c.normal[2]) || 0 };
        } else if (typeof c.normal === 'object') {
          normal = { x: Number(c.normal.x) || 0, y: Number(c.normal.y) || 0, z: Number(c.normal.z) || 0 };
        }
      }
      return {
        id: c.id || `circle-${i}`,
        label: c.label,
        center,
        radius: Number(c.radius) || 1,
        normal,
        color: c.color,
      };
    }).filter(Boolean);
  }

  if (Array.isArray(data.spheres)) {
    normalized.spheres = data.spheres.map((s, i) => {
      const center = resolveCenter(s.center);
      if (!center) {
        console.warn(`Sphere ${s.id || i}: cannot resolve center "${s.center}", skipping`);
        return null;
      }
      return {
        id: s.id || `sphere-${i}`,
        label: s.label,
        center,
        radius: Number(s.radius) || 1,
        color: s.color,
        opacity: s.opacity,
      };
    }).filter(Boolean);
  }

  if (Array.isArray(data.cones)) {
    normalized.cones = data.cones.map((c, i) => {
      const apex = resolveCenter(c.apex);
      const baseCenter = resolveCenter(c.baseCenter);
      if (apex && baseCenter) {
        return { ...c, id: c.id || `cone-${i}`, apex, baseCenter, radius: Number(c.radius) || 1 };
      }
      return c;
    });
  }

  if (Array.isArray(data.cylinders)) {
    normalized.cylinders = data.cylinders.map((c, i) => {
      const center1 = resolveCenter(c.center1);
      const center2 = resolveCenter(c.center2);
      if (center1 && center2) {
        return { ...c, id: c.id || `cyl-${i}`, center1, center2, radius: Number(c.radius) || 1 };
      }
      return c;
    });
  }

  // Surfaces (mặt cong tròn xoay) cần center + params HỢP LỆ: renderer AnimatedSurface destructure
  // `surface.center` — thiếu ⇒ crash CẢ canvas (THREE mất context). LLM đôi khi quên center ⇒ resolve
  // (id điểm hoặc {x,y,z}) rồi mặc định gốc toạ độ; params thiếu ⇒ {} (profileOf tự có default a/h/…).
  if (Array.isArray(data.surfaces)) {
    normalized.surfaces = data.surfaces
      .filter((s) => s && typeof s === 'object')
      .map((s, i) => ({
        ...s,
        id: s.id || `surface-${i}`,
        center: resolveCenter(s.center) || { x: 0, y: 0, z: 0 },
        params: (s.params && typeof s.params === 'object') ? s.params : {},
      }));
  }

  const annotationArrays = ['vectors', 'angles', 'rightAngles', 'equalMarks', 'parallelMarks', 'dynamicPoints', 'curves', 'revolutionSolids', 'areaRegions', 'agents', 'measurements'];
  for (const key of annotationArrays) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      normalized[key] = data[key];
    }
  }

  // Remove empty optional arrays
  const optionalKeys = ['spheres', 'circles', 'cylinders', 'cones', 'planes', 'vectors', 'angles', 'rightAngles', 'equalMarks', 'parallelMarks', 'dynamicPoints', 'surfaces', 'curves', 'revolutionSolids', 'areaRegions', 'agents', 'measurements'];
  for (const key of optionalKeys) {
    if (Array.isArray(normalized[key]) && normalized[key].length === 0) delete normalized[key];
  }

  // Pass-through verification metadata nếu có
  if (typeof data.confidence === 'number') normalized.confidence = data.confidence;
  if (Array.isArray(data.constraints) && data.constraints.length > 0) normalized.constraints = data.constraints;

  // Animation + hiển thị pass-through (KHÔNG được cắt — frontend cần để animate/vẽ)
  if (data.timeline && Array.isArray(data.timeline.tracks) && data.timeline.tracks.length > 0) {
    normalized.timeline = data.timeline;
  }
  if (typeof data.latexCode === 'string' && data.latexCode) normalized.latexCode = data.latexCode;

  return normalized;
}
