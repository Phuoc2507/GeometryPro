export type Vec3 = { x: number; y: number; z: number };

export type SymbolTable = {
  points: Map<string, Vec3>;
  namedPlanes: Map<string, string[]>;
  edges: Set<string>; // canonical "A|B" key, A < B lexicographically
  // Names of points produced by a derivation op (midpoint/centroid/ratio/reflect/
  // perp_point/foot/intersect). A derived point may legitimately land on an existing
  // point (e.g. the foot of an apex on its base coinciding with a base vertex), so
  // degeneracy detection exempts any coincidence that involves a derived point.
  derivedPoints?: Set<string>;
};

export type ResolvedEntity =
  | { type: 'point'; name: string; pos: Vec3 }
  | { type: 'line'; a: string; b: string; posA: Vec3; posB: Vec3 }
  | { type: 'plane'; points: string[]; positions: Vec3[] };

export type Violation = {
  kind: 'assert_failed' | 'degenerate' | 'underconstrained';
  relation?: string;
  args?: string[];
  expected?: number;
  actual?: number;
  message: string;
};

export type VerifyResult = {
  ok: boolean;
  violations: Violation[];
};
