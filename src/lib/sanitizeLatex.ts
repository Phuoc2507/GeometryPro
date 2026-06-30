/**
 * Sanitizes a string for safe use in LaTeX code.
 * Prevents LaTeX injection attacks by escaping/removing dangerous commands.
 */
export function escapeLatex(str: string): string {
  if (!str) return '';
  
  return str
    // Remove dangerous LaTeX commands first
    .replace(/\\\\input/gi, '')
    .replace(/\\\\include/gi, '')
    .replace(/\\\\write/gi, '')
    .replace(/\\\\immediate/gi, '')
    .replace(/\\\\openout/gi, '')
    .replace(/\\\\closeout/gi, '')
    .replace(/\\\\read/gi, '')
    .replace(/\\\\catcode/gi, '')
    .replace(/\\\\csname/gi, '')
    .replace(/\\\\endcsname/gi, '')
    // Escape backslashes (except our escaped ones)
    .replace(/\\/g, '\\textbackslash{}')
    // Remove braces (prevent command grouping)
    .replace(/[{}]/g, '')
    // Escape special LaTeX characters
    .replace(/[$%&_#]/g, (match) => `\\${match}`)
    // Escape accents
    .replace(/[\^~]/g, (match) => `\\${match}{}`)
    // Trim and limit length
    .trim()
    .slice(0, 100);
}

/**
 * Validates that a LaTeX label contains only safe characters.
 * Returns true if the label is safe for direct use in LaTeX.
 */
export function isValidLatexLabel(label: string): boolean {
  if (!label) return false;
  // Only allow letters, numbers, apostrophes, underscores, and primes
  return /^[A-Za-z][A-Za-z0-9_']*$/.test(label) && label.length <= 50;
}

/**
 * Sanitizes a geometry label for LaTeX use.
 * If the label is valid, returns it as-is.
 * Otherwise, returns a sanitized version.
 */
export function sanitizeLatexLabel(label: string): string {
  if (!label) return '?';
  
  if (isValidLatexLabel(label)) {
    return label;
  }
  
  // Remove all non-alphanumeric characters except apostrophe and underscore
  const sanitized = label
    .replace(/[^A-Za-z0-9_']/g, '')
    .slice(0, 50);
  
  return sanitized || '?';
}

/**
 * Sanitizes a geometry name for use in LaTeX comments.
 * Removes dangerous characters while keeping the name readable.
 */
export function sanitizeLatexName(name: string): string {
  if (!name) return 'Geometry';
  
  return name
    // Remove backslashes and dangerous patterns
    .replace(/\\/g, '')
    .replace(/[{}$%]/g, '')
    // Only keep word characters, spaces, dashes, and common punctuation (hyphen at end)
    .replace(/[^\w\s.,()-]/g, '')
    .trim()
    .slice(0, 100) || 'Geometry';
}
