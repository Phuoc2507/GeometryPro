// research/vsgeo-bench/perturbations/paraphrase.ts
// Viết lại lời văn nhờ một "rewriter" injectable (thật = gọi model; test = rewriter giả).
// Bắt buộc kiểm bất biến: mọi SỐ và mọi NHÃN ĐỈNH của đề gốc phải còn nguyên. Đáp án KHÔNG đổi.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";
import { extractVertexLabels } from "./rename";

export type Rewriter = (text: string) => Promise<string>;

export class ParaphraseDriftError extends Error {}

// Multiset các con số (đã sắp xếp) để so khớp không phụ thuộc thứ tự.
export function numberMultiset(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).slice().sort();
}

export function assertParaphrasePreserves(original: string, rewritten: string): void {
  const a = numberMultiset(original);
  const b = numberMultiset(rewritten);
  if (a.join(",") !== b.join(",")) {
    throw new ParaphraseDriftError(`Paraphrase làm đổi tập số: [${a}] -> [${b}]`);
  }
  const labelsOrig = extractVertexLabels(original);
  const labelsNew = new Set(extractVertexLabels(rewritten));
  for (const l of labelsOrig) {
    if (!labelsNew.has(l)) {
      throw new ParaphraseDriftError(`Paraphrase làm mất nhãn đỉnh '${l}'`);
    }
  }
}

// rewriter mặc định: kế hoạch này CHƯA nối model -> ném lỗi rõ nếu quên truyền rewriter.
const defaultRewriter: Rewriter = async () => {
  throw new Error(
    "paraphrase cần một rewriter (hàm gọi model). Truyền rewriter thật từ harness, hoặc rewriter giả trong test."
  );
};

export async function paraphrase(seed: Seed, rewriter: Rewriter = defaultRewriter): Promise<Variant> {
  const rewritten = (await rewriter(seed.statement_vi)).trim();
  assertParaphrasePreserves(seed.statement_vi, rewritten);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "paraphrase");
  v.statement_vi = rewritten;
  // answer KHÔNG đổi.
  v.variant = { kind: "paraphrase", parentSeedId: seed.id };
  return v;
}
