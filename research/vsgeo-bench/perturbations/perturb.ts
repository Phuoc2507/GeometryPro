// research/vsgeo-bench/perturbations/perturb.ts
// Điều phối: gọi đúng phép biến đổi theo kind. Trả Promise<Variant[]> (async vì paraphrase cần model).
import type { Seed, Variant, PerturbKind } from "./types";
import { rename } from "./rename";
import { rescale } from "./rescale";
import { distractor } from "./distractor";
import { paraphrase, type Rewriter } from "./paraphrase";
import { reflect } from "./reflect";

export type PerturbOpts = {
  k?: number; // hệ số cho rescale (mặc định 2)
  rewriter?: Rewriter; // cho paraphrase
  distractorSentence?: string; // cho distractor
};

export async function perturb(
  seed: Seed,
  kind: PerturbKind,
  opts: PerturbOpts = {}
): Promise<Variant[]> {
  switch (kind) {
    case "rename":
      return [rename(seed)];
    case "rescale":
      return [rescale(seed, opts.k ?? 2)];
    case "distractor":
      return [distractor(seed, opts.distractorSentence)];
    case "reflect":
      return [reflect(seed)];
    case "paraphrase":
      return [await paraphrase(seed, opts.rewriter)];
    default: {
      const _never: never = kind; // ép TypeScript kiểm đủ mọi kind
      throw new Error(`kind không hỗ trợ: ${_never}`);
    }
  }
}
