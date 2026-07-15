export type Vec3 = { x: number; y: number; z: number };

export type SymbolTable = {
  points: Map<string, Vec3>;
  namedPlanes: Map<string, string[]>;
  edges: Set<string>; // canonical "A|B" key, A < B lexicographically
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
