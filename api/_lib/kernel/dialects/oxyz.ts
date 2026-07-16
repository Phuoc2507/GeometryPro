// api/_lib/kernel/dialects/oxyz.ts
import { z } from 'zod';

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
