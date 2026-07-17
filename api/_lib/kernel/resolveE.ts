// api/_lib/kernel/resolveE.ts
import type { EntityTable } from './entityTable';
import { type Entity, lineFromTwoPoints, planeFromThreePoints } from './entities';
import { coplanarityProblem } from './compute/answer';

// Tách token thành các tên điểm (khớp dài nhất trước, như Phase 1).
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

// token → entity trên EntityTable. Ưu tiên tên đã đăng ký (điểm/đường/mặt/cầu), rồi ghép
// tên điểm ("AB"=đường, "ABC…"=mặt qua 3 điểm đầu). Ném nếu không giải được.
export function resolveEntityE(token: string, et: EntityTable): Entity {
  const paren = token.match(/^\((.+)\)$/);
  const inner = paren ? paren[1] : token;

  const p = et.points.get(inner);
  if (p) return p;
  const l = et.lines.get(inner);
  if (l) return l;
  const pl = et.planes.get(inner);
  if (pl) return pl;
  const s = et.spheres.get(inner);
  if (s) return s;

  const tokens = tokenizePointNames(inner, new Set(et.points.keys()));
  if (!tokens) {
    throw new Error(`Cannot resolve entity "${token}": not a named entity or a compound of known points`);
  }
  if (tokens.length === 1) return et.points.get(tokens[0])!;
  if (tokens.length === 2) {
    return lineFromTwoPoints(et.points.get(tokens[0])!.p, et.points.get(tokens[1])!.p);
  }
  const positions = tokens.map((n) => et.points.get(n)!.p);
  // Mặt ghép từ >3 điểm: kiểm đồng phẳng (nếu không, dựng mặt qua 3 điểm đầu sẽ bỏ im lặng
  // các đỉnh sau, khiến assert/query về "mặt ABCD" đánh giá nhầm một mặt khác).
  if (tokens.length > 3) {
    const cp = coplanarityProblem(positions, `compound plane "${inner}"`);
    if (cp) throw new Error(cp);
  }
  return planeFromThreePoints(positions[0], positions[1], positions[2]);
}
