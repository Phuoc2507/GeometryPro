export function validateAndFixProjections(geometry, originalGeometry, prompt) {
  const projectionPatterns = [
    /nối\s+(?:điểm\s+)?(\w+)\s+(?:đến|lên|tới|với|xuống)\s+(?:đường\s+thẳng\s+|đường\s+)?(\w+?)(\w+)\b/i,
    /hình chiếu\s+(?:của\s+)?(\w+)\s+(?:lên|xuống)\s+(?:đường\s+thẳng\s+|đường\s+)?(\w+?)(\w+)\b/i,
    /đường\s+(?:vuông góc|cao)\s+từ\s+(\w+)\s+(?:đến|xuống)\s+(?:đường\s+thẳng\s+|đường\s+)?(\w+?)(\w+)\b/i,
    /chân\s+đường\s+cao\s+(?:từ|hạ từ)\s+(\w+)\s+(?:đến|xuống|lên)\s+(?:đường\s+)?(\w+?)(\w+)\b/i,
  ];

  for (const pattern of projectionPatterns) {
    const match = prompt.match(pattern);
    if (!match) continue;

    const resolveId = (raw) => {
      const p = geometry.points.find((pt) =>
        pt.id === raw || pt.id.toLowerCase() === raw.toLowerCase() ||
        pt.label === raw || pt.label.toLowerCase() === raw.toLowerCase()
      );
      return p?.id || raw.toUpperCase();
    };

    const resolvedSource = resolveId(match[1]);
    const resolvedLP1 = resolveId(match[2]);
    const resolvedLP2 = resolveId(match[3]);

    console.log(`Detected projection: ${resolvedSource} → line ${resolvedLP1}${resolvedLP2}`);

    const sourcePoint = geometry.points.find((p) => p.id === resolvedSource);
    const linePoint1 = geometry.points.find((p) => p.id === resolvedLP1);
    const linePoint2 = geometry.points.find((p) => p.id === resolvedLP2);

    if (!sourcePoint || !linePoint1 || !linePoint2) continue;

    const addedPointIds = geometry.addedElements?.points || [];
    const projectionPointId = addedPointIds.find((id) =>
      id.toLowerCase().startsWith('h') ||
      id.toLowerCase().includes('proj') ||
      id.toLowerCase().includes('foot')
    );
    if (!projectionPointId) continue;

    const projectionPoint = geometry.points.find((p) => p.id === projectionPointId);
    if (!projectionPoint) continue;

    const P = { x: sourcePoint.x, y: sourcePoint.y, z: sourcePoint.z };
    const A = { x: linePoint1.x, y: linePoint1.y, z: linePoint1.z };
    const B = { x: linePoint2.x, y: linePoint2.y, z: linePoint2.z };

    const AB = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z };
    const AP = { x: P.x - A.x, y: P.y - A.y, z: P.z - A.z };

    const dot_AP_AB = AP.x * AB.x + AP.y * AB.y + AP.z * AB.z;
    const dot_AB_AB = AB.x * AB.x + AB.y * AB.y + AB.z * AB.z;

    if (dot_AB_AB === 0) continue;

    const t = dot_AP_AB / dot_AB_AB;
    const correctH = {
      x: Math.round((A.x + t * AB.x) * 10000) / 10000,
      y: Math.round((A.y + t * AB.y) * 10000) / 10000,
      z: Math.round((A.z + t * AB.z) * 10000) / 10000,
    };

    console.log(`Original: (${projectionPoint.x}, ${projectionPoint.y}, ${projectionPoint.z})`);
    console.log(`Corrected: (${correctH.x}, ${correctH.y}, ${correctH.z}), t=${t}`);

    projectionPoint.x = correctH.x;
    projectionPoint.y = correctH.y;
    projectionPoint.z = correctH.z;
  }

  return geometry;
}
