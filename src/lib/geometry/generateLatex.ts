import { GeometryData } from '@/types/geometry';
import { sanitizeLatexLabel, sanitizeLatexName } from '@/lib/sanitizeLatex';

/**
 * Generates TikZ LaTeX code from geometry data.
 * Used as fallback when the server doesn't return latexCode.
 */
export function generateLatexCode(geometry: GeometryData): string {
  const name = sanitizeLatexName(geometry.name);
  const lines: string[] = [];

  lines.push(`\\begin{tikzpicture}[scale=1.5]`);
  lines.push(`  % ${name}`);
  lines.push(`  % Define coordinates`);

  // Points
  for (const point of geometry.points) {
    const label = sanitizeLatexLabel(point.label);
    lines.push(`  \\coordinate (${label}) at (${point.x}, ${point.y}, ${point.z});`);
  }

  lines.push('');

  // Solid edges
  const solidLines = geometry.lines.filter(l => l.style !== 'dashed');
  const dashedLines = geometry.lines.filter(l => l.style === 'dashed');

  if (solidLines.length > 0) {
    lines.push('  % Draw solid edges');
    for (const line of solidLines) {
      const from = sanitizeLatexLabel(line.from);
      const to = sanitizeLatexLabel(line.to);
      lines.push(`  \\draw[thick] (${from}) -- (${to});`);
    }
  }

  if (dashedLines.length > 0) {
    lines.push('');
    lines.push('  % Draw hidden edges (dashed)');
    for (const line of dashedLines) {
      const from = sanitizeLatexLabel(line.from);
      const to = sanitizeLatexLabel(line.to);
      lines.push(`  \\draw[dashed] (${from}) -- (${to});`);
    }
  }

  lines.push('');
  lines.push('  % Label vertices');
  for (const point of geometry.points) {
    const label = sanitizeLatexLabel(point.label);
    // Choose position based on point's relative position
    const pos = point.y > 2 ? 'above' : 'below';
    lines.push(`  \\node[${pos}] at (${label}) {$${label}$};`);
  }

  lines.push('\\end{tikzpicture}');

  return lines.join('\n');
}
