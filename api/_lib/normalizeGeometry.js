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
    planes: data.planes || [],
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

  const annotationArrays = ['vectors', 'angles', 'rightAngles', 'equalMarks', 'parallelMarks', 'dynamicPoints', 'surfaces', 'curves', 'agents', 'measurements'];
  for (const key of annotationArrays) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      normalized[key] = data[key];
    }
  }

  // Remove empty optional arrays
  const optionalKeys = ['spheres', 'circles', 'cylinders', 'cones', 'planes', 'vectors', 'angles', 'rightAngles', 'equalMarks', 'parallelMarks', 'dynamicPoints', 'surfaces', 'curves', 'agents', 'measurements'];
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
