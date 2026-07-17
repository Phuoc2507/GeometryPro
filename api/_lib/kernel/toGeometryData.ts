import type { SymbolTable } from './types';
import type { GeometryData } from '../../../src/types/geometry';

export function toGeometryData(symtab: SymbolTable, name: string): GeometryData {
  const points = Array.from(symtab.points.entries()).map(([label, pos]) => ({
    id: label,
    label,
    x: pos.x,
    y: pos.y,
    z: pos.z,
  }));

  const lines = Array.from(symtab.edges).map((key) => {
    const [from, to] = key.split('|');
    return { id: `${from}${to}`, from, to, style: 'solid' as const };
  });

  return { name, points, lines } as GeometryData;
}
