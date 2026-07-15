import type { SymbolTable, ResolvedEntity, Vec3 } from './types';

const PAREN_RE = /^\((.+)\)$/;

function tokenizePointNames(raw: string, known: Set<string>): string[] | null {
  const names = Array.from(known).sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let rest = raw;
  while (rest.length > 0) {
    const match = names.find((n) => rest.startsWith(n));
    if (!match) return null;
    tokens.push(match);
    rest = rest.slice(match.length);
  }
  return tokens;
}

function requirePoint(symtab: SymbolTable, name: string): Vec3 {
  const p = symtab.points.get(name);
  if (!p) throw new Error(`Unknown point "${name}"`);
  return p;
}

export function resolveEntity(token: string, symtab: SymbolTable): ResolvedEntity {
  const parenMatch = token.match(PAREN_RE);
  const inner = parenMatch ? parenMatch[1] : token;

  if (symtab.points.has(inner)) {
    return { type: 'point', name: inner, pos: requirePoint(symtab, inner) };
  }

  if (symtab.namedPlanes.has(inner)) {
    const names = symtab.namedPlanes.get(inner)!;
    return { type: 'plane', points: names, positions: names.map((n) => requirePoint(symtab, n)) };
  }

  const known = new Set(symtab.points.keys());
  const tokens = tokenizePointNames(inner, known);
  if (!tokens) {
    throw new Error(
      `Cannot resolve entity "${token}": it is not a known point, a registered named plane, or a compound of known point names`
    );
  }
  if (tokens.length === 1) {
    return { type: 'point', name: tokens[0], pos: requirePoint(symtab, tokens[0]) };
  }
  if (tokens.length === 2) {
    return {
      type: 'line',
      a: tokens[0],
      b: tokens[1],
      posA: requirePoint(symtab, tokens[0]),
      posB: requirePoint(symtab, tokens[1]),
    };
  }
  return { type: 'plane', points: tokens, positions: tokens.map((n) => requirePoint(symtab, n)) };
}
