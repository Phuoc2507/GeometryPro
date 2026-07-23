// api/_lib/kernel/dialects/oxyz.ts
import { z } from 'zod';
import { rat, mul, num } from '../scalar';
import { type Vec3S, addV, subV, scaleV, crossV, lenSqV } from '../vec3s';
import {
  type PointE,
  pointFromCoords, lineFromTwoPoints, lineFromPointDir,
  planeFromThreePoints, planeFromPointNormal, planeFromCoeffs,
  sphereFromCenterRadius2, sphereFromCenterPoint, sphereFromEquation, sphereFromFourPoints,
} from '../entities';
import { type EntityTable, createEmptyEntityTable } from '../entityTable';
import { parseScalar, parseVec3S } from './oxyzInput';
import { footOnPlaneE, footOnLineE, reflectAcrossPlaneE, reflectAcrossLineE, orthocenterE, circumcenterE } from '../constructions';
import { computeIntersection } from '../compute/intersect';
import { resolveEntityE } from '../resolveE';

const RInput = z.union([z.number(), z.string().min(1)]);
const Coord3 = z.tuple([RInput, RInput, RInput]);
const Name = z.string().min(1);
// Điểm dùng grammar chặt (chữ hoa + số + phẩy) như dialect tổng hợp — tránh tên nhiều-chữ
// (vd "BC") làm hỏng tách token ghép ("ABC") ở resolver.
const PointNameStrict = z.string().regex(/^[A-Z]\d*'?$/);

export const OxyzPointSchema = z.object({ op: z.literal('oxyz_point'), name: PointNameStrict, at: Coord3 });

export const OxyzLineSchema = z.object({
  op: z.literal('oxyz_line'),
  name: Name,
  by: z.discriminatedUnion('form', [
    z.object({ form: z.literal('two_points'), a: Name, b: Name }),
    z.object({ form: z.literal('point_dir'), base: Coord3, dir: Coord3 }),
  ]),
});

export const OxyzPlaneSchema = z.object({
  op: z.literal('oxyz_plane'),
  name: Name,
  by: z.discriminatedUnion('form', [
    z.object({ form: z.literal('three_points'), a: Name, b: Name, c: Name }),
    z.object({ form: z.literal('point_normal'), point: Name, normal: Coord3 }),
    z.object({ form: z.literal('coeffs'), a: RInput, b: RInput, c: RInput, d: RInput }),
  ]),
});

export const OxyzSphereSchema = z.object({
  op: z.literal('oxyz_sphere'),
  name: Name,
  by: z.discriminatedUnion('form', [
    z.object({ form: z.literal('center_radius'), center: Name, radius: RInput }),
    z.object({ form: z.literal('center_point'), center: Name, through: Name }),
    z.object({ form: z.literal('equation'), a: RInput, b: RInput, c: RInput, d: RInput }),
    z.object({ form: z.literal('four_points'), a: Name, b: Name, c: Name, d: Name }),
  ]),
});

const PointName = z.string().regex(/^[A-Z]\d*'?$/);

export const OxyzMidpointSchema = z.object({ op: z.literal('oxyz_midpoint'), name: PointName, a: Name, b: Name });
export const OxyzRatioSchema = z.object({ op: z.literal('oxyz_ratio'), name: PointName, a: Name, b: Name, t: RInput });
export const OxyzCentroidSchema = z.object({ op: z.literal('oxyz_centroid'), name: PointName, of: z.array(Name).min(2) });
export const OxyzReflectSchema = z.object({ op: z.literal('oxyz_reflect'), name: PointName, point: Name, about: Name });

export const OxyzFootSchema = z.object({ op: z.literal('oxyz_foot'), name: PointName, from: Name, onto: z.enum(['line', 'plane']), target: Name });
export const OxyzReflectAcrossSchema = z.object({ op: z.literal('oxyz_reflect_across'), name: PointName, point: Name, across: z.enum(['line', 'plane']), target: Name });
export const OxyzOrthocenterSchema = z.object({ op: z.literal('oxyz_orthocenter'), name: PointName, of: z.tuple([Name, Name, Name]) });
export const OxyzCircumcenterSchema = z.object({ op: z.literal('oxyz_circumcenter'), name: PointName, of: z.tuple([Name, Name, Name]) });
export const OxyzIntersectSchema = z.object({ op: z.literal('oxyz_intersect'), name: PointName, a: Name, b: Name });

export const OxyzCircumsphereOffsetSchema = z.object({
  op: z.literal('oxyz_circumsphere_offset'),
  name: PointName, // dùng grammar tên chặt như các op dựng khác
  of: z.tuple([Name, Name, Name]),
  t: RInput, // số (đã thay tham số) — khoảng cách CÓ DẤU dọc pháp tuyến ĐƠN VỊ của mặt (ABC)
});

export const OxyzOpSchema = z.union([
  OxyzPointSchema,
  OxyzLineSchema,
  OxyzPlaneSchema,
  OxyzSphereSchema,
  OxyzMidpointSchema,
  OxyzRatioSchema,
  OxyzCentroidSchema,
  OxyzReflectSchema,
  OxyzFootSchema,
  OxyzReflectAcrossSchema,
  OxyzOrthocenterSchema,
  OxyzCircumcenterSchema,
  OxyzIntersectSchema,
  OxyzCircumsphereOffsetSchema,
]);

export type OxyzOp = z.infer<typeof OxyzOpSchema>;

function requirePointE(et: EntityTable, name: string): PointE {
  const p = et.points.get(name);
  if (!p) throw new Error(`Oxyz: point "${name}" is referenced before it is defined`);
  return p;
}

// Tên phải duy nhất XUYÊN mọi loại entity — nếu không resolver (point→line→plane→sphere)
// sẽ âm thầm che entity trùng tên bằng cái tra được trước.
function ensureNameFree(et: EntityTable, name: string, kind: string): void {
  if (et.points.has(name) || et.lines.has(name) || et.planes.has(name) || et.spheres.has(name)) {
    throw new Error(`Oxyz: name "${name}" is already used; cannot define ${kind} "${name}"`);
  }
}

// `derived` marks helper points (midpoint/ratio/centroid/reflect) so downstream degeneracy
// handling treats them like the synthetic dialect's derived points.
function setPointE(et: EntityTable, name: string, p: Vec3S, derived = false): void {
  ensureNameFree(et, name, 'point');
  et.points.set(name, pointFromCoords(p));
  if (derived) (et.derivedPoints ??= new Set()).add(name);
}

function setLineE(et: EntityTable, name: string, l: ReturnType<typeof lineFromTwoPoints>): void {
  ensureNameFree(et, name, 'line');
  et.lines.set(name, l);
}

function setPlaneE(et: EntityTable, name: string, pl: ReturnType<typeof planeFromThreePoints>): void {
  ensureNameFree(et, name, 'plane');
  et.planes.set(name, pl);
}

function setSphereE(et: EntityTable, name: string, s: ReturnType<typeof sphereFromEquation>): void {
  ensureNameFree(et, name, 'sphere');
  et.spheres.set(name, s);
}

export function executeOxyzOp(op: OxyzOp, et: EntityTable): void {
  switch (op.op) {
    case 'oxyz_point':
      setPointE(et, op.name, parseVec3S(op.at));
      break;
    case 'oxyz_line': {
      if (op.by.form === 'two_points') {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        setLineE(et, op.name, lineFromTwoPoints(a.p, b.p));
      } else {
        setLineE(et, op.name, lineFromPointDir(parseVec3S(op.by.base), parseVec3S(op.by.dir)));
      }
      break;
    }
    case 'oxyz_plane': {
      if (op.by.form === 'three_points') {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        const c = requirePointE(et, op.by.c);
        setPlaneE(et, op.name, planeFromThreePoints(a.p, b.p, c.p));
      } else if (op.by.form === 'point_normal') {
        const point = requirePointE(et, op.by.point);
        setPlaneE(et, op.name, planeFromPointNormal(point.p, parseVec3S(op.by.normal)));
      } else {
        setPlaneE(et, op.name, planeFromCoeffs(
          parseScalar(op.by.a), parseScalar(op.by.b), parseScalar(op.by.c), parseScalar(op.by.d),
        ));
      }
      break;
    }
    case 'oxyz_sphere': {
      if (op.by.form === 'center_radius') {
        const center = requirePointE(et, op.by.center);
        const r = parseScalar(op.by.radius);
        setSphereE(et, op.name, sphereFromCenterRadius2(center.p, mul(r, r)));
      } else if (op.by.form === 'center_point') {
        const center = requirePointE(et, op.by.center);
        const through = requirePointE(et, op.by.through);
        setSphereE(et, op.name, sphereFromCenterPoint(center.p, through.p));
      } else if (op.by.form === 'four_points') {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        const c = requirePointE(et, op.by.c);
        const d = requirePointE(et, op.by.d);
        setSphereE(et, op.name, sphereFromFourPoints(a.p, b.p, c.p, d.p));
      } else {
        // Quy ước: x²+y²+z² + a·x + b·y + c·z + d = 0 (hệ số x²=1), tâm (−a/2,−b/2,−c/2).
        setSphereE(et, op.name, sphereFromEquation(
          parseScalar(op.by.a), parseScalar(op.by.b), parseScalar(op.by.c), parseScalar(op.by.d),
        ));
      }
      break;
    }
    case 'oxyz_midpoint': {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      setPointE(et, op.name, scaleV(addV(a.p, b.p), rat(1n, 2n)), true);
      break;
    }
    case 'oxyz_ratio': {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      const t = parseScalar(op.t);
      // A + t·(B − A)
      setPointE(et, op.name, addV(a.p, scaleV(subV(b.p, a.p), t)), true);
      break;
    }
    case 'oxyz_centroid': {
      const pts = op.of.map((n) => requirePointE(et, n).p);
      let sum = pts[0];
      for (let i = 1; i < pts.length; i++) sum = addV(sum, pts[i]);
      setPointE(et, op.name, scaleV(sum, rat(1n, BigInt(pts.length))), true);
      break;
    }
    case 'oxyz_reflect': {
      const point = requirePointE(et, op.point);
      const about = requirePointE(et, op.about);
      // 2·about − point
      setPointE(et, op.name, subV(scaleV(about.p, rat(2n)), point.p), true);
      break;
    }
    case 'oxyz_foot': {
      const from = requirePointE(et, op.from);
      const target = resolveEntityE(op.target, et);
      if (op.onto === 'plane') {
        if (target.kind !== 'plane') throw new Error(`oxyz_foot onto plane: "${op.target}" is not a plane`);
        setPointE(et, op.name, footOnPlaneE(from.p, target), true);
      } else {
        if (target.kind !== 'line') throw new Error(`oxyz_foot onto line: "${op.target}" is not a line`);
        setPointE(et, op.name, footOnLineE(from.p, target), true);
      }
      break;
    }
    case 'oxyz_reflect_across': {
      const pt = requirePointE(et, op.point);
      const target = resolveEntityE(op.target, et);
      if (op.across === 'plane') {
        if (target.kind !== 'plane') throw new Error(`oxyz_reflect_across plane: "${op.target}" is not a plane`);
        setPointE(et, op.name, reflectAcrossPlaneE(pt.p, target), true);
      } else {
        if (target.kind !== 'line') throw new Error(`oxyz_reflect_across line: "${op.target}" is not a line`);
        setPointE(et, op.name, reflectAcrossLineE(pt.p, target), true);
      }
      break;
    }
    case 'oxyz_orthocenter': {
      const [a, b, c] = op.of.map((n) => requirePointE(et, n).p);
      setPointE(et, op.name, orthocenterE(a, b, c), true);
      break;
    }
    case 'oxyz_circumcenter': {
      const [a, b, c] = op.of.map((n) => requirePointE(et, n).p);
      setPointE(et, op.name, circumcenterE(a, b, c), true);
      break;
    }
    case 'oxyz_intersect': {
      const r = computeIntersection(resolveEntityE(op.a, et), resolveEntityE(op.b, et));
      if (!r.ok) throw new Error(r.problem);
      const res = r.answer.result;
      if (res === 'point' || res === 'tangent-point') { setPointE(et, op.name, r.answer.point!.p, true); break; }
      const why = res === 'parallel' ? 'hai đối tượng song song — không có giao điểm'
        : res === 'coincident' ? 'hai đối tượng trùng nhau — vô số giao điểm, không xác định một điểm'
        : res === 'none' ? 'hai đối tượng không cắt nhau (chéo nhau) — không có giao điểm'
        : res === 'line' ? 'giao là một ĐƯỜNG (mặt×mặt) — dùng query intersection, không phải op oxyz_intersect'
        : `không phải một điểm (${res})`;
      throw new Error(`oxyz_intersect: ${op.a} ∩ ${op.b} — ${why}`);
    }
    case 'oxyz_circumsphere_offset': {
      const a = requirePointE(et, op.of[0]).p;
      const b = requirePointE(et, op.of[1]).p;
      const c = requirePointE(et, op.of[2]).p;
      const Q = circumcenterE(a, b, c);
      const normal = crossV(subV(b, a), subV(c, a));
      const nlen = Math.sqrt(lenSqV(normal).approx);
      const tv = parseScalar(op.t).approx;
      const center = addV(Q, scaleV(normal, num(tv / nlen))); // Q + (t/|n|)·n  (số)
      const r2 = lenSqV(subV(center, a));
      setSphereE(et, op.name, sphereFromCenterRadius2(center, r2));
      break;
    }
  }
}

export function executeOxyzPlan(ops: OxyzOp[]): EntityTable {
  const et = createEmptyEntityTable();
  for (const op of ops) executeOxyzOp(op, et);
  return et;
}
