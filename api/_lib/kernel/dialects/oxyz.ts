// api/_lib/kernel/dialects/oxyz.ts
import { z } from 'zod';
import { rat, mul } from '../scalar';
import { type Vec3S, addV, subV, scaleV } from '../vec3s';
import {
  type PointE,
  pointFromCoords, lineFromTwoPoints, lineFromPointDir,
  planeFromThreePoints, planeFromPointNormal, planeFromCoeffs,
  sphereFromCenterRadius2, sphereFromCenterPoint, sphereFromEquation,
} from '../entities';
import { type EntityTable, createEmptyEntityTable } from '../entityTable';
import { parseScalar, parseVec3S } from './oxyzInput';

const RInput = z.union([z.number(), z.string().min(1)]);
const Coord3 = z.tuple([RInput, RInput, RInput]);
const Name = z.string().min(1);

export const OxyzPointSchema = z.object({ op: z.literal('oxyz_point'), name: Name, at: Coord3 });

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
  ]),
});

const PointName = z.string().regex(/^[A-Z]\d*'?$/);

export const OxyzMidpointSchema = z.object({ op: z.literal('oxyz_midpoint'), name: PointName, a: Name, b: Name });
export const OxyzRatioSchema = z.object({ op: z.literal('oxyz_ratio'), name: PointName, a: Name, b: Name, t: RInput });
export const OxyzCentroidSchema = z.object({ op: z.literal('oxyz_centroid'), name: PointName, of: z.array(Name).min(2) });
export const OxyzReflectSchema = z.object({ op: z.literal('oxyz_reflect'), name: PointName, point: Name, about: Name });

export const OxyzOpSchema = z.union([
  OxyzPointSchema,
  OxyzLineSchema,
  OxyzPlaneSchema,
  OxyzSphereSchema,
  OxyzMidpointSchema,
  OxyzRatioSchema,
  OxyzCentroidSchema,
  OxyzReflectSchema,
]);

export type OxyzOp = z.infer<typeof OxyzOpSchema>;

function requirePointE(et: EntityTable, name: string): PointE {
  const p = et.points.get(name);
  if (!p) throw new Error(`Oxyz: point "${name}" is referenced before it is defined`);
  return p;
}

function setPointE(et: EntityTable, name: string, p: Vec3S): void {
  if (et.points.has(name)) throw new Error(`Oxyz: point "${name}" is already defined`);
  et.points.set(name, pointFromCoords(p));
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
        et.lines.set(op.name, lineFromTwoPoints(a.p, b.p));
      } else {
        et.lines.set(op.name, lineFromPointDir(parseVec3S(op.by.base), parseVec3S(op.by.dir)));
      }
      break;
    }
    case 'oxyz_plane': {
      if (op.by.form === 'three_points') {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        const c = requirePointE(et, op.by.c);
        et.planes.set(op.name, planeFromThreePoints(a.p, b.p, c.p));
      } else if (op.by.form === 'point_normal') {
        const point = requirePointE(et, op.by.point);
        et.planes.set(op.name, planeFromPointNormal(point.p, parseVec3S(op.by.normal)));
      } else {
        et.planes.set(op.name, planeFromCoeffs(
          parseScalar(op.by.a), parseScalar(op.by.b), parseScalar(op.by.c), parseScalar(op.by.d),
        ));
      }
      break;
    }
    case 'oxyz_sphere': {
      if (op.by.form === 'center_radius') {
        const center = requirePointE(et, op.by.center);
        const r = parseScalar(op.by.radius);
        et.spheres.set(op.name, sphereFromCenterRadius2(center.p, mul(r, r)));
      } else if (op.by.form === 'center_point') {
        const center = requirePointE(et, op.by.center);
        const through = requirePointE(et, op.by.through);
        et.spheres.set(op.name, sphereFromCenterPoint(center.p, through.p));
      } else {
        et.spheres.set(op.name, sphereFromEquation(
          parseScalar(op.by.a), parseScalar(op.by.b), parseScalar(op.by.c), parseScalar(op.by.d),
        ));
      }
      break;
    }
    case 'oxyz_midpoint': {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      setPointE(et, op.name, scaleV(addV(a.p, b.p), rat(1n, 2n)));
      break;
    }
    case 'oxyz_ratio': {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      const t = parseScalar(op.t);
      // A + t·(B − A)
      setPointE(et, op.name, addV(a.p, scaleV(subV(b.p, a.p), t)));
      break;
    }
    case 'oxyz_centroid': {
      const pts = op.of.map((n) => requirePointE(et, n).p);
      let sum = pts[0];
      for (let i = 1; i < pts.length; i++) sum = addV(sum, pts[i]);
      setPointE(et, op.name, scaleV(sum, rat(1n, BigInt(pts.length))));
      break;
    }
    case 'oxyz_reflect': {
      const point = requirePointE(et, op.point);
      const about = requirePointE(et, op.about);
      // 2·about − point
      setPointE(et, op.name, subV(scaleV(about.p, rat(2n)), point.p));
      break;
    }
  }
}

export function executeOxyzPlan(ops: OxyzOp[]): EntityTable {
  const et = createEmptyEntityTable();
  for (const op of ops) executeOxyzOp(op, et);
  return et;
}
