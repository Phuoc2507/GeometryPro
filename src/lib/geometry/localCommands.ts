/**
 * Local command processor for simple geometry modifications.
 * Handles connect points, rename, midpoint, centroid, delete, etc.
 * Returns null if the command is too complex and should be sent to AI.
 */

import { GeometryData, Point3D, Line3D } from '@/types/geometry';
import { generateLatexCode } from './generateLatex';

export interface LocalCommandResult {
  geometry: GeometryData;
  addedElements: { points: string[]; lines: string[]; spheres: string[] };
  description: string;
}

/**
 * Try to handle a command locally. Returns null if the command
 * requires AI (projections to planes, line-line intersections, etc.)
 */
export function tryLocalCommand(
  prompt: string,
  geometry: GeometryData
): LocalCommandResult | null {
  const trimmed = prompt.trim();

  // Try each handler in order
  const handlers = [
    tryConnectPoints,
    tryRenamePoint,
    tryMidpoint,
    tryCentroid,
    tryDeletePoint,
    tryDeleteLine,
  ];

  for (const handler of handlers) {
    const result = handler(trimmed, geometry);
    if (result) {
      // Auto-generate LaTeX
      result.geometry.latexCode = generateLatexCode(result.geometry);
      return result;
    }
  }

  return null; // Not a local command → send to AI
}

// ═══════════════════════════════════════════════════════════════
// CONNECT TWO EXISTING POINTS
// "nối A và B", "nối A B", "nối A với B", "connect A B"
// ═══════════════════════════════════════════════════════════════
function tryConnectPoints(prompt: string, geo: GeometryData): LocalCommandResult | null {
  // Match: nối [điểm] X (và|với|,) [điểm] Y
  const patterns = [
    /^nối\s+(?:điểm\s+)?([A-Za-z][A-Za-z0-9']*)\s+(?:và|với|,)\s+(?:điểm\s+)?([A-Za-z][A-Za-z0-9']*)\s*$/i,
    /^nối\s+(?:điểm\s+)?([A-Za-z][A-Za-z0-9']*)\s+([A-Za-z][A-Za-z0-9']*)\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (!match) continue;

    const idA = findPointId(geo, match[1]);
    const idB = findPointId(geo, match[2]);

    if (!idA || !idB) continue;
    if (idA === idB) continue;

    // Check if line already exists
    const exists = geo.lines.some(
      l => (l.from === idA && l.to === idB) || (l.from === idB && l.to === idA)
    );
    if (exists) {
      return {
        geometry: { ...geo },
        addedElements: { points: [], lines: [], spheres: [] },
        description: `Đường nối ${idA}-${idB} đã tồn tại`,
      };
    }

    const newLineId = `l_${idA}_${idB}`;
    const newLine: Line3D = { id: newLineId, from: idA, to: idB, style: 'solid' };

    return {
      geometry: {
        ...geo,
        lines: [...geo.lines, newLine],
      },
      addedElements: { points: [], lines: [newLineId], spheres: [] },
      description: `Đã nối ${idA} với ${idB}`,
    };
  }

  // Multi-point connect: "nối A, B và C" or "nối A B C"
  const multiMatch = prompt.match(
    /^nối\s+(?:điểm\s+)?([A-Za-z][A-Za-z0-9']*(?:\s*[,\s]\s*(?:và\s+)?[A-Za-z][A-Za-z0-9']*)+)\s*$/i
  );
  if (multiMatch) {
    const pointNames = multiMatch[1]
      .replace(/\bvà\b/gi, ',')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(name => findPointId(geo, name))
      .filter((id): id is string => id !== null);

    if (pointNames.length >= 2) {
      const newLines: Line3D[] = [];
      const addedLineIds: string[] = [];

      // Connect consecutive points
      for (let i = 0; i < pointNames.length - 1; i++) {
        const a = pointNames[i];
        const b = pointNames[i + 1];
        const exists = geo.lines.some(
          l => (l.from === a && l.to === b) || (l.from === b && l.to === a)
        );
        if (!exists) {
          const lineId = `l_${a}_${b}`;
          newLines.push({ id: lineId, from: a, to: b, style: 'solid' });
          addedLineIds.push(lineId);
        }
      }

      if (newLines.length > 0) {
        return {
          geometry: {
            ...geo,
            lines: [...geo.lines, ...newLines],
          },
          addedElements: { points: [], lines: addedLineIds, spheres: [] },
          description: `Đã nối ${pointNames.join(' → ')}`,
        };
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// RENAME POINT
// "đổi tên X thành Y", "rename X to Y"
// ═══════════════════════════════════════════════════════════════
function tryRenamePoint(prompt: string, geo: GeometryData): LocalCommandResult | null {
  const match = prompt.match(
    /^đổi\s+tên\s+(?:điểm\s+)?([A-Za-z][A-Za-z0-9']*)\s+thành\s+([A-Za-z][A-Za-z0-9']*)\s*$/i
  );
  if (!match) return null;

  const oldId = findPointId(geo, match[1]);
  if (!oldId) return null;

  const newLabel = match[2];
  const newId = newLabel;

  // Check if new ID already exists
  if (geo.points.some(p => p.id === newId) && newId !== oldId) return null;

  const updatedPoints = geo.points.map(p =>
    p.id === oldId ? { ...p, id: newId, label: newLabel } : p
  );

  const updatedLines = geo.lines.map(l => ({
    ...l,
    from: l.from === oldId ? newId : l.from,
    to: l.to === oldId ? newId : l.to,
  }));

  return {
    geometry: {
      ...geo,
      points: updatedPoints,
      lines: updatedLines,
    },
    addedElements: { points: [], lines: [], spheres: [] },
    description: `Đã đổi tên ${oldId} thành ${newLabel}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// MIDPOINT
// "trung điểm AB", "trung điểm A và B", "vẽ trung điểm AB"
// ═══════════════════════════════════════════════════════════════
function tryMidpoint(prompt: string, geo: GeometryData): LocalCommandResult | null {
  const patterns = [
    /(?:vẽ\s+)?trung\s+điểm\s+(?:của\s+)?(?:đoạn\s+)?([A-Za-z][A-Za-z0-9']*)\s*(?:và\s+)?([A-Za-z][A-Za-z0-9']*)/i,
    /(?:vẽ\s+)?trung\s+điểm\s+(?:của\s+)?([A-Za-z][A-Za-z0-9']+)/i, // "trung điểm SC" where S and C are single chars
  ];

  let idA: string | null = null;
  let idB: string | null = null;

  // Try two-argument patterns first
  const match2 = prompt.match(patterns[0]);
  if (match2) {
    idA = findPointId(geo, match2[1]);
    idB = findPointId(geo, match2[2]);
  }

  // Try single-argument pattern (e.g., "trung điểm SC")
  if (!idA || !idB) {
    const match1 = prompt.match(patterns[1]);
    if (match1) {
      const combined = match1[1];
      // Try splitting: first check if it's a known point ID
      if (!findPointId(geo, combined)) {
        // Try splitting into two point IDs
        for (let i = 1; i < combined.length; i++) {
          const a = findPointId(geo, combined.substring(0, i));
          const b = findPointId(geo, combined.substring(i));
          if (a && b) {
            idA = a;
            idB = b;
            break;
          }
        }
      }
    }
  }

  if (!idA || !idB) return null;

  const pA = geo.points.find(p => p.id === idA)!;
  const pB = geo.points.find(p => p.id === idB)!;

  const midId = `M_${idA}${idB}`;
  const midLabel = `M`;

  // Check if midpoint already exists (close enough)
  const mx = (pA.x + pB.x) / 2;
  const my = (pA.y + pB.y) / 2;
  const mz = (pA.z + pB.z) / 2;

  const existing = geo.points.find(
    p => Math.abs(p.x - mx) < 0.001 && Math.abs(p.y - my) < 0.001 && Math.abs(p.z - mz) < 0.001
  );
  if (existing) {
    return {
      geometry: { ...geo },
      addedElements: { points: [], lines: [], spheres: [] },
      description: `Trung điểm đã tồn tại: ${existing.label}`,
    };
  }

  // Choose a unique label M, M1, M2...
  let label = 'M';
  let counter = 1;
  while (geo.points.some(p => p.label === label)) {
    label = `M${counter}`;
    counter++;
  }

  const newPoint: Point3D = {
    id: `mid_${idA}_${idB}`,
    label,
    x: Math.round(mx * 10000) / 10000,
    y: Math.round(my * 10000) / 10000,
    z: Math.round(mz * 10000) / 10000,
  };

  return {
    geometry: {
      ...geo,
      points: [...geo.points, newPoint],
    },
    addedElements: { points: [newPoint.id], lines: [], spheres: [] },
    description: `Trung điểm ${label}(${newPoint.x}, ${newPoint.y}, ${newPoint.z}) của ${idA}${idB}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// CENTROID
// "trọng tâm ABC", "trọng tâm tam giác ABC"
// ═══════════════════════════════════════════════════════════════
function tryCentroid(prompt: string, geo: GeometryData): LocalCommandResult | null {
  const match = prompt.match(
    /(?:vẽ\s+)?trọng\s+tâm\s+(?:(?:tam\s+giác|tứ\s+diện)\s+)?([A-Za-z][A-Za-z0-9']+)/i
  );
  if (!match) return null;

  const combined = match[1];
  // Split into individual point IDs
  const pointIds: string[] = [];
  let remaining = combined;

  while (remaining.length > 0) {
    let found = false;
    // Try longest match first
    for (let len = Math.min(remaining.length, 4); len >= 1; len--) {
      const candidate = remaining.substring(0, len);
      const id = findPointId(geo, candidate);
      if (id) {
        pointIds.push(id);
        remaining = remaining.substring(len);
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  if (pointIds.length < 3) return null;

  const points = pointIds.map(id => geo.points.find(p => p.id === id)!);
  const gx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const gy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const gz = points.reduce((s, p) => s + p.z, 0) / points.length;

  let label = 'G';
  let counter = 1;
  while (geo.points.some(p => p.label === label)) {
    label = `G${counter}`;
    counter++;
  }

  const newPoint: Point3D = {
    id: `centroid_${pointIds.join('')}`,
    label,
    x: Math.round(gx * 10000) / 10000,
    y: Math.round(gy * 10000) / 10000,
    z: Math.round(gz * 10000) / 10000,
  };

  return {
    geometry: {
      ...geo,
      points: [...geo.points, newPoint],
    },
    addedElements: { points: [newPoint.id], lines: [], spheres: [] },
    description: `Trọng tâm ${label}(${newPoint.x}, ${newPoint.y}, ${newPoint.z})`,
  };
}

// ═══════════════════════════════════════════════════════════════
// DELETE POINT
// "xóa điểm X", "bỏ điểm X"
// ═══════════════════════════════════════════════════════════════
function tryDeletePoint(prompt: string, geo: GeometryData): LocalCommandResult | null {
  const match = prompt.match(/^(?:xóa|bỏ|xoá)\s+(?:điểm\s+)?([A-Za-z][A-Za-z0-9']*)\s*$/i);
  if (!match) return null;

  const id = findPointId(geo, match[1]);
  if (!id) return null;

  return {
    geometry: {
      ...geo,
      points: geo.points.filter(p => p.id !== id),
      lines: geo.lines.filter(l => l.from !== id && l.to !== id),
    },
    addedElements: { points: [], lines: [], spheres: [] },
    description: `Đã xóa điểm ${id} và các đường liên quan`,
  };
}

// ═══════════════════════════════════════════════════════════════
// DELETE LINE
// "xóa đường AB", "bỏ cạnh AB"
// ═══════════════════════════════════════════════════════════════
function tryDeleteLine(prompt: string, geo: GeometryData): LocalCommandResult | null {
  const match = prompt.match(
    /^(?:xóa|bỏ|xoá)\s+(?:đường|cạnh|đoạn)\s+([A-Za-z][A-Za-z0-9']*)\s*(?:và\s+|,\s*)?([A-Za-z][A-Za-z0-9']*)\s*$/i
  );
  if (!match) return null;

  const idA = findPointId(geo, match[1]);
  const idB = findPointId(geo, match[2]);
  if (!idA || !idB) return null;

  const updatedLines = geo.lines.filter(
    l => !((l.from === idA && l.to === idB) || (l.from === idB && l.to === idA))
  );

  if (updatedLines.length === geo.lines.length) {
    return null; // Line not found
  }

  return {
    geometry: {
      ...geo,
      lines: updatedLines,
    },
    addedElements: { points: [], lines: [], spheres: [] },
    description: `Đã xóa đường ${idA}-${idB}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Find point ID by fuzzy matching
// ═══════════════════════════════════════════════════════════════
function findPointId(geo: GeometryData, input: string): string | null {
  if (!input) return null;
  const normalized = input.trim();

  // Exact match by ID
  const exact = geo.points.find(p => p.id === normalized);
  if (exact) return exact.id;

  // Case-insensitive ID match
  const caseInsensitive = geo.points.find(p => p.id.toLowerCase() === normalized.toLowerCase());
  if (caseInsensitive) return caseInsensitive.id;

  // Match by label
  const byLabel = geo.points.find(p => p.label === normalized);
  if (byLabel) return byLabel.id;

  // Case-insensitive label match
  const byLabelCI = geo.points.find(p => p.label.toLowerCase() === normalized.toLowerCase());
  if (byLabelCI) return byLabelCI.id;

  // Handle prime notation: A' → Ap
  if (normalized.endsWith("'")) {
    const base = normalized.slice(0, -1);
    const primeId = geo.points.find(p => p.id === base + 'p' || p.id === base + 'P');
    if (primeId) return primeId.id;
  }
  // Handle: Ap → A'
  if (normalized.endsWith('p') || normalized.endsWith('P')) {
    const base = normalized.slice(0, -1);
    const primeLabel = geo.points.find(p => p.label === base + "'");
    if (primeLabel) return primeLabel.id;
  }

  return null;
}
