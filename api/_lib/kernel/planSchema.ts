import { z } from 'zod';

const PointName = z
  .string()
  .regex(/^[A-Z]\d*'?$/, "Point names must be an uppercase letter, optional digits, optional trailing prime, e.g. \"A\", \"A1\", \"A'\"");

export const TriangleDimsSchema = z.discriminatedUnion('triangleType', [
  z.object({ triangleType: z.literal('equilateral'), edge: z.number().positive() }),
  z.object({ triangleType: z.literal('right'), leg1: z.number().positive(), leg2: z.number().positive() }),
  z.object({ triangleType: z.literal('isosceles'), base: z.number().positive(), legLength: z.number().positive() }),
  z.object({
    triangleType: z.literal('sss'),
    p1p2: z.number().positive(),
    p1p3: z.number().positive(),
    p2p3: z.number().positive(),
  }),
]);

const SquareDims = z.object({ edge: z.number().positive() }).strict();
const RectangleDims = z.object({ width: z.number().positive(), height: z.number().positive() }).strict();
const RhombusDims = z.object({ diag1: z.number().positive(), diag2: z.number().positive() }).strict();
const RegPolygonDims = z.object({ n: z.number().int().min(3), edge: z.number().positive() }).strict();

export const BaseOpSchema = z
  .object({
    op: z.literal('base'),
    shape: z.enum(['square', 'rectangle', 'triangle', 'reg_polygon', 'rhombus']),
    vertices: z.array(PointName).min(3),
    dims: z.union([SquareDims, RectangleDims, RhombusDims, RegPolygonDims, TriangleDimsSchema]),
  })
  .superRefine((val, ctx) => {
    const fixedCount: Record<string, number | undefined> = { square: 4, rectangle: 4, rhombus: 4, triangle: 3 };
    const expected = val.shape === 'reg_polygon' ? (val.dims as { n?: number }).n : fixedCount[val.shape];
    if (typeof expected === 'number' && val.vertices.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `shape "${val.shape}" requires exactly ${expected} vertices, got ${val.vertices.length}`,
        path: ['vertices'],
      });
    }
    const has = (key: string) => Object.prototype.hasOwnProperty.call(val.dims, key);
    const shapeMatchesDims: Record<string, boolean> = {
      square: has('edge') && !has('n') && !has('width'),
      rectangle: has('width') && has('height'),
      rhombus: has('diag1') && has('diag2'),
      reg_polygon: has('n') && has('edge'),
      triangle: has('triangleType'),
    };
    if (!shapeMatchesDims[val.shape]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `dims do not match shape "${val.shape}"`, path: ['dims'] });
    }
  });

export const PrismOpSchema = z
  .object({
    op: z.literal('prism'),
    base: z.array(PointName).min(3),
    top: z.array(PointName).min(3),
    height: z.number().positive(),
  })
  .superRefine((val, ctx) => {
    if (val.base.length !== val.top.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `prism "base" has ${val.base.length} vertices but "top" has ${val.top.length}; they must match`,
        path: ['top'],
      });
    }
  });

export const PyramidOpSchema = z.object({
  op: z.literal('pyramid'),
  base: z.array(PointName).min(3),
  apex: PointName,
  height: z.number().positive(),
});

export const PointOpSchema = z.object({
  op: z.literal('point'),
  name: PointName,
  def: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('midpoint'), of: z.tuple([PointName, PointName]) }),
    z.object({ kind: z.literal('centroid'), of: z.array(PointName).min(2) }),
    z.object({ kind: z.literal('ratio'), from: PointName, to: PointName, t: z.number() }),
    z.object({ kind: z.literal('reflect'), point: PointName, about: PointName }),
  ]),
});

export const PerpPointOpSchema = z.object({
  op: z.literal('perp_point'),
  name: PointName,
  from: PointName,
  to: z.literal('plane'),
  target: z.string().min(1),
  length: z.number().positive(),
});

export const FootOpSchema = z.object({
  op: z.literal('foot'),
  name: PointName,
  from: PointName,
  onto: z.enum(['plane', 'line']),
  target: z.string().min(1),
});

export const IntersectOpSchema = z.object({
  op: z.literal('intersect'),
  name: PointName,
  a: z.string().min(1),
  b: z.string().min(1),
});

// Declares a visible segment between two already-defined points. Needed because derived
// vertices (e.g. a pyramid apex built via perp_point) do not auto-generate lateral edges;
// the plan states them explicitly so the rendered figure is complete.
export const EdgeOpSchema = z.object({
  op: z.literal('edge'),
  from: PointName,
  to: PointName,
});

export const ConstructionOpSchema = z.union([
  BaseOpSchema,
  PrismOpSchema,
  PyramidOpSchema,
  PointOpSchema,
  PerpPointOpSchema,
  FootOpSchema,
  IntersectOpSchema,
  EdgeOpSchema,
]);

export const AssertOpSchema = z
  .object({
    relation: z.enum(['perp', 'parallel', 'coplanar', 'on', 'dist', 'angle']),
    args: z.array(z.string().min(1)).min(1),
    value: z.number().optional(),
    tolerance: z.number().positive().optional(),
  })
  .superRefine((val, ctx) => {
    const needsExactly2 = ['perp', 'parallel', 'on', 'dist', 'angle'];
    if (needsExactly2.includes(val.relation) && val.args.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `relation "${val.relation}" requires exactly 2 args, got ${val.args.length}`,
        path: ['args'],
      });
    }
    if (val.relation === 'coplanar' && val.args.length < 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'relation "coplanar" requires at least 4 args', path: ['args'] });
    }
    if ((val.relation === 'dist' || val.relation === 'angle') && val.value === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `relation "${val.relation}" requires a "value"`, path: ['value'] });
    }
  });

export const QuerySchema = z.object({
  kind: z.enum(['distance', 'angle', 'volume', 'area']),
  a: z.string().min(1).optional(),
  b: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
});

export const PlanSchema = z.object({
  solidName: z.string().min(1),
  ops: z.array(ConstructionOpSchema).min(1),
  asserts: z.array(AssertOpSchema).default([]),
  query: QuerySchema.optional(),
});

export type ConstructionOp = z.infer<typeof ConstructionOpSchema>;
export type AssertOp = z.infer<typeof AssertOpSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type Plan = z.infer<typeof PlanSchema>;
