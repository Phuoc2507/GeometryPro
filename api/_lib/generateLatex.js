function sanitizeLatexLabel(label) {
  if (!label) return '?';
  if (/^[A-Za-z][A-Za-z0-9_']*$/.test(label) && label.length <= 50) return label;
  return label.replace(/[^A-Za-z0-9_']/g, '').slice(0, 50) || '?';
}

function sanitizeLatexName(name) {
  if (!name) return 'Geometry';
  return name.replace(/\\/g, '').replace(/[{}$%]/g, '').replace(/[^\w\s\-.,()]/g, '').trim().slice(0, 100) || 'Geometry';
}

export function generateLatexCode(geometry) {
  const safeName = sanitizeLatexName(geometry.name);
  const coordDefs = (geometry.points || [])
    .map((p) => `  \\coordinate (${sanitizeLatexLabel(p.id)}) at (${p.x}, ${p.y}, ${p.z});`)
    .join('\n');
  const solidLines = (geometry.lines || []).filter((l) => l.style !== 'dashed');
  const dashedLines = (geometry.lines || []).filter((l) => l.style === 'dashed');
  const solidEdgeDefs = solidLines
    .map((l) => `  \\draw[thick] (${sanitizeLatexLabel(l.from)}) -- (${sanitizeLatexLabel(l.to)});`)
    .join('\n');
  const dashedEdgeDefs = dashedLines
    .map((l) => `  \\draw[thick, dashed] (${sanitizeLatexLabel(l.from)}) -- (${sanitizeLatexLabel(l.to)});`)
    .join('\n');
  const labelDefs = (geometry.points || [])
    .map((p) => `  \\node[above] at (${sanitizeLatexLabel(p.id)}) {$${sanitizeLatexLabel(p.label)}$};`)
    .join('\n');
  const sphereDefs = (geometry.spheres || []).map((s) => {
    const safeLabel = s.label ? sanitizeLatexLabel(s.label) : '';
    const centerLabel = safeLabel ? `\\node at (${s.center.x}, ${s.center.y}, ${s.center.z}) {$${safeLabel}$};` : '';
    return `  \\draw[thick] (${s.center.x}, ${s.center.y}, ${s.center.z}) circle (${s.radius});\n  ${centerLabel}`;
  }).join('\n') || '';

  return `\\begin{tikzpicture}[scale=1.5]
  % ${safeName}

  % Define coordinates
${coordDefs}

  % Draw visible edges
${solidEdgeDefs}

  % Draw hidden edges (dashed)
${dashedEdgeDefs}

  % Draw spheres
${sphereDefs}

  % Label vertices
${labelDefs}
\\end{tikzpicture}`;
}
