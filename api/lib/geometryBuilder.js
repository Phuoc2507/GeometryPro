// Convert a raw points dict from Python sandbox → full geometry JSON for Three.js.
// Infers edges based on shape topology heuristics.

let lineCounter = 0;
function lineId() { return `l${++lineCounter}`; }

/**
 * Sort convex polygon points in cyclic (CCW) order around their centroid (XY plane).
 */
function sortCyclic(pts) {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return [...pts].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );
}

function dist3(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Add edge only if not already present (undirected).
 */
function addEdge(lines, from, to, style = 'solid') {
  const exists = lines.some(
    (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from)
  );
  if (!exists) lines.push({ id: lineId(), from, to, style });
}

/**
 * Make ring of edges: A-B-C-D-A
 */
function ringEdges(lines, pts) {
  for (let i = 0; i < pts.length; i++) {
    addEdge(lines, pts[i].id, pts[(i + 1) % pts.length].id);
  }
}

/**
 * Label a point id nicely: Ap → A', A1p → A1', etc.
 */
function makeLabel(id) {
  if (/^[A-Z][a-z]?p$/.test(id)) return id.slice(0, -1) + "'";
  return id;
}

/**
 * Main export: builds full geometry JSON from sandbox output.
 * @param {Object} pointsDict  { id: {x,y,z} }
 * @param {Object} meta        _meta from Python (spheres, name, shape_type, extra_lines)
 * @param {string} promptText  Original problem text (for shape detection hints)
 */
export function buildGeometryFromPoints(pointsDict, meta = {}, promptText = '') {
  lineCounter = 0;
  const ids = Object.keys(pointsDict);

  // Build points array
  const points = ids.map((id) => ({
    id,
    label: makeLabel(id),
    x: pointsDict[id].x,
    y: pointsDict[id].y,
    z: pointsDict[id].z,
  }));

  const byId = Object.fromEntries(points.map((p) => [p.id, p]));

  // Classify point roles
  const hasS = ids.includes('S');
  const primeIds = ids.filter((id) => /^[A-Z][a-z]?p$/.test(id));   // Ap, Bp, Cp, Dp
  const structureAlpha = ids.filter((id) => /^[A-Z]$/.test(id));     // A,B,C,D,S,...
  const specialIds = ids.filter((id) => /^[MHGNFIOT]\d*$/.test(id) && id !== 'S'); // M,H,G,N,F,I,O,T

  // Base polygon candidates (not S, not primed, not special)
  const baseIds = structureAlpha.filter(
    (id) => id !== 'S' && !specialIds.includes(id)
  );

  const lines = [];
  const circles = [];
  const spheres = [];
  const cones = [];
  const cylinders = [];

  // ─── Detect shape class ──────────────────────────────────────────────────────

  const shapeHint = (meta.shape_type || '').toLowerCase();
  const promptLower = promptText.toLowerCase();

  const isCuboidOrPrism = primeIds.length >= 3;
  const isPyramid = hasS && !isCuboidOrPrism;
  const isTetrahedron =
    !hasS &&
    !isCuboidOrPrism &&
    baseIds.length === 4 &&
    !baseIds.every((id) => Math.abs(byId[id]?.z || 0) < 0.001);

  // ─── Draw base polygon ────────────────────────────────────────────────────────

  if (baseIds.length >= 2) {
    const basePts = baseIds.map((id) => byId[id]).filter(Boolean);
    // Sort by angle for convex polygon
    const sorted = basePts.length >= 3 ? sortCyclic(basePts) : basePts;
    ringEdges(lines, sorted);
  }

  // ─── Pyramid lateral edges (S → each base vertex) ────────────────────────────

  if (isPyramid) {
    for (const id of baseIds) {
      addEdge(lines, 'S', id);
    }
  }

  // ─── Prism / Cuboid ──────────────────────────────────────────────────────────

  if (isCuboidOrPrism) {
    // Top polygon (primed points)
    const topPts = primeIds.map((id) => byId[id]).filter(Boolean);
    const topSorted = topPts.length >= 3 ? sortCyclic(topPts) : topPts;
    ringEdges(lines, topSorted);

    // Vertical edges: match each base point to its primed counterpart
    for (const baseId of baseIds) {
      const primeId = baseId + 'p';
      if (byId[primeId]) addEdge(lines, baseId, primeId);
    }
  }

  // ─── Tetrahedron: all 6 edges ─────────────────────────────────────────────────

  if (isTetrahedron && baseIds.length === 4) {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        addEdge(lines, baseIds[i], baseIds[j]);
      }
    }
  }

  // ─── Special points: connect to collinear pair or 2 nearest structural points ──

  const structureAll = [...baseIds, ...(hasS ? ['S'] : []), ...primeIds];

  // Check if point P lies on segment AB (collinear + between A and B)
  function isOnSegment(P, A, B) {
    const AB = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };
    const AP = { x: P.x - A.x, y: P.y - A.y, z: P.z - A.z };
    const lenAB = Math.sqrt(AB.x ** 2 + AB.y ** 2 + AB.z ** 2);
    if (lenAB < 1e-9) return false;
    // Cross product AP × AB should be ~0 for collinear
    const cx = AP.y * AB.z - AP.z * AB.y;
    const cy = AP.z * AB.x - AP.x * AB.z;
    const cz = AP.x * AB.y - AP.y * AB.x;
    const crossLen = Math.sqrt(cx ** 2 + cy ** 2 + cz ** 2);
    if (crossLen / lenAB > 0.05) return false; // not collinear
    // Check t in [0,1]
    const t = (AB.x * AP.x + AB.y * AP.y + AB.z * AP.z) / (lenAB ** 2);
    return t > 0.01 && t < 0.99;
  }

  for (const spId of specialIds) {
    if (!byId[spId]) continue;
    const sp = byId[spId];

    // Check if sp lies on any structural edge
    let connectedViaCollinear = false;
    const structPts = structureAll.filter((id) => byId[id]);
    for (let i = 0; i < structPts.length && !connectedViaCollinear; i++) {
      for (let j = i + 1; j < structPts.length && !connectedViaCollinear; j++) {
        const A = byId[structPts[i]], B = byId[structPts[j]];
        if (isOnSegment(sp, A, B)) {
          addEdge(lines, spId, structPts[i], 'dashed');
          addEdge(lines, spId, structPts[j], 'dashed');
          connectedViaCollinear = true;
        }
      }
    }

    if (!connectedViaCollinear) {
      // Fallback: connect to 2 nearest structural points
      const nearest = structPts
        .map((id) => ({ id, d: dist3(sp, byId[id]) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { id } of nearest) {
        addEdge(lines, spId, id, 'dashed');
      }
    }
  }

  // ─── Extra lines from _meta ───────────────────────────────────────────────────

  if (Array.isArray(meta.extra_lines)) {
    for (const [from, to] of meta.extra_lines) {
      if (byId[from] && byId[to]) addEdge(lines, from, to, 'dashed');
    }
  }

  // ─── Cones from _meta ────────────────────────────────────────────────────────

  if (Array.isArray(meta.cones)) {
    for (const c of meta.cones) {
      const apex = byId[c.apex];
      const baseCenter = byId[c.base_center] || byId[c.baseCenter];
      if (apex && c.radius) {
        const bc = baseCenter || { x: apex.x, y: apex.y, z: 0 };
        cones.push({
          id: `cone_${c.apex}`,
          apex: { x: apex.x, y: apex.y, z: apex.z },
          baseCenter: { x: bc.x, y: bc.y, z: bc.z },
          radius: Number(c.radius),
        });
      }
    }
  }

  // Auto-detect cone: has S (apex) + O (base center) + meta says cone or prompt has "hình nón"
  if (cones.length === 0 && meta.shape === 'cone') {
    const S2 = byId['S'], O2 = byId['O'];
    if (S2 && O2 && meta.radius) {
      cones.push({
        id: 'cone_S',
        apex: { x: S2.x, y: S2.y, z: S2.z },
        baseCenter: { x: O2.x, y: O2.y, z: O2.z },
        radius: Number(meta.radius),
      });
    }
  }

  // ─── Circles from _meta ───────────────────────────────────────────────────────

  if (Array.isArray(meta.circles)) {
    for (const c of meta.circles) {
      const center = byId[c.center];
      if (center && c.radius) {
        circles.push({
          id: `circle_${c.center}`,
          center: { x: center.x, y: center.y, z: center.z },
          radius: Number(c.radius),
          normal: c.normal || [0, 0, 1],
        });
      }
    }
  }

  // ─── Spheres from _meta ───────────────────────────────────────────────────────

  if (Array.isArray(meta.spheres)) {
    for (const s of meta.spheres) {
      const center = byId[s.center];
      if (center && s.radius) {
        spheres.push({
          id: `sphere_${s.center}`,
          center: { x: center.x, y: center.y, z: center.z },
          radius: Number(s.radius),
        });
      }
    }
  }

  // ─── Name ────────────────────────────────────────────────────────────────────

  const name = meta.name || inferName(ids, hasS, isCuboidOrPrism, isTetrahedron);

  return {
    name,
    points,
    lines,
    circles,
    spheres,
    cones,
    cylinders,
  };
}

function inferName(ids, hasS, isCuboidOrPrism, isTetrahedron) {
  if (isCuboidOrPrism) {
    const baseLetters = ids.filter((id) => /^[A-Z]$/.test(id) && id !== 'S').join('');
    const topLetters = ids
      .filter((id) => /^[A-Z]p$/.test(id))
      .map((id) => id[0] + "'")
      .join('');
    if (baseLetters.length === 4) return `Hình hộp ${baseLetters}.${topLetters}`;
    return `Lăng trụ ${baseLetters}.${topLetters}`;
  }
  if (isTetrahedron) {
    return 'Tứ diện ' + ids.filter((id) => /^[A-Z]$/.test(id)).join('');
  }
  if (hasS) {
    const base = ids.filter((id) => /^[A-Z]$/.test(id) && id !== 'S').join('');
    return `Hình chóp S.${base}`;
  }
  return 'Hình hình học 3D';
}
