// api/_lib/kernel/__tests__/resolve.test.ts
import { describe, it, expect } from 'vitest';
import { resolveEntity } from '../resolve';
import type { SymbolTable } from '../types';
import { vec3 } from '../vecMath';

function makeSymtab(): SymbolTable {
  const points = new Map([
    ['A', vec3(0, 0, 0)],
    ['B', vec3(1, 0, 0)],
    ['C', vec3(1, 1, 0)],
    ['D', vec3(0, 1, 0)],
    ["A'", vec3(0, 0, 2)],
    ["B'", vec3(1, 0, 2)],
    ["C'", vec3(1, 1, 2)],
    ['S', vec3(0, 0, 3)],
  ]);
  const namedPlanes = new Map([['ABCD', ['A', 'B', 'C', 'D']]]);
  return { points, namedPlanes, edges: new Set() };
}

describe('resolveEntity', () => {
  it('resolves a single known point name', () => {
    const st = makeSymtab();
    const r = resolveEntity('A', st);
    expect(r).toEqual({ type: 'point', name: 'A', pos: vec3(0, 0, 0) });
  });

  it('resolves a two-letter compound token as a line', () => {
    const st = makeSymtab();
    const r = resolveEntity('SA', st);
    expect(r.type).toBe('line');
    if (r.type === 'line') {
      expect(r.a).toBe('S');
      expect(r.b).toBe('A');
      expect(r.posA).toEqual(vec3(0, 0, 3));
      expect(r.posB).toEqual(vec3(0, 0, 0));
    }
  });

  it('resolves a 3+ letter compound token as a plane (positions in token order)', () => {
    const st = makeSymtab();
    const r = resolveEntity('ABC', st);
    expect(r.type).toBe('plane');
    if (r.type === 'plane') {
      expect(r.points).toEqual(['A', 'B', 'C']);
      expect(r.positions).toEqual([vec3(0, 0, 0), vec3(1, 0, 0), vec3(1, 1, 0)]);
    }
  });

  it('resolves a parenthesized token, e.g. "(ABCD)", to the registered named plane', () => {
    const st = makeSymtab();
    const r = resolveEntity('(ABCD)', st);
    expect(r.type).toBe('plane');
    if (r.type === 'plane') {
      expect(r.points).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('greedily tokenizes compound names containing primed points, e.g. "A\'B\'"', () => {
    const st = makeSymtab();
    const r = resolveEntity("A'B'", st);
    expect(r.type).toBe('line');
    if (r.type === 'line') {
      expect(r.a).toBe("A'");
      expect(r.b).toBe("B'");
    }
  });

  it('throws a clear error for an unresolvable token', () => {
    const st = makeSymtab();
    expect(() => resolveEntity('XYZ', st)).toThrow(/Cannot resolve entity "XYZ"/);
  });
});
