import { describe, it, expect } from 'vitest';
import { wrapTikzAsDocument } from './latexDocument';

describe('wrapTikzAsDocument', () => {
  it('wraps a bare tikzpicture into a complete, Overleaf-compilable document', () => {
    const snippet = '\\begin{tikzpicture}[scale=1.5]\n  \\draw (0,0) -- (1,1);\n\\end{tikzpicture}';
    const doc = wrapTikzAsDocument(snippet);

    expect(doc).toContain('\\documentclass');
    expect(doc).toContain('\\usepackage{tikz}');
    expect(doc).toContain('\\begin{document}');
    expect(doc).toContain('\\end{document}');
    // Picture body sits INSIDE the document body.
    expect(doc.indexOf('\\begin{document}')).toBeLessThan(doc.indexOf('\\begin{tikzpicture}'));
    expect(doc.indexOf('\\end{tikzpicture}')).toBeLessThan(doc.indexOf('\\end{document}'));
  });

  it('defines hex colors so xcolor does not error on Overleaf', () => {
    const snippet = '\\begin{tikzpicture}\n  \\draw[thick, color=eab308] (0,0) -- (1,1);\n\\end{tikzpicture}';
    const doc = wrapTikzAsDocument(snippet);
    expect(doc).toContain('\\definecolor{eab308}{HTML}{EAB308}');
    // Definition must come before the picture that uses it.
    expect(doc.indexOf('\\definecolor{eab308}')).toBeLessThan(doc.indexOf('\\begin{tikzpicture}'));
  });

  it('does not add \\definecolor for named colors', () => {
    const snippet = '\\begin{tikzpicture}\n  \\draw[color=blue] (0,0) -- (1,1);\n\\end{tikzpicture}';
    const doc = wrapTikzAsDocument(snippet);
    expect(doc).not.toContain('\\definecolor');
  });

  it('does not double-wrap content that is already a full document', () => {
    const full = '\\documentclass{article}\n\\usepackage{tikz}\n\\begin{document}\n\\begin{tikzpicture}\\end{tikzpicture}\n\\end{document}';
    expect(wrapTikzAsDocument(full)).toBe(full);
  });

  it('returns empty string unchanged', () => {
    expect(wrapTikzAsDocument('')).toBe('');
    expect(wrapTikzAsDocument('   ')).toBe('');
  });
});
