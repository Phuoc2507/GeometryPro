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

// F6(a) Ký hiệu chữ (a, h, r...) mà ĐÁP ÁN còn dùng — bỏ tên hàm để 's','q','r','t' của
// "sqrt" không bị nhầm là biến. Nếu paraphrase làm mất ký hiệu này thì đáp án hoá vô nghĩa.
const FUNC_NAMES = /\b(sqrt|sin|cos|tan|cot|sec|csc|log|ln|exp|abs|pi|arcsin|arccos|arctan)\b/gi;
export function symbolicVars(canonical: string): string[] {
  const stripped = canonical.replace(FUNC_NAMES, " ");
  const set = new Set<string>();
  for (const m of stripped.matchAll(/[a-z]/g)) set.add(m[0]);
  return [...set];
}

// F6(b) Bản đồ "NHÃN = số" (SA = 2, AB = 3...) để phát hiện HOÁN VAI: multiset số giữ nguyên
// nhưng gán số cho nhãn khác => đề đổi nghĩa mà kiểm-số không thấy.
export function assignmentMap(text: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const mm of text.matchAll(/\b([A-Z][A-Z0-9]{0,3})\s*=\s*(\d+(?:\.\d+)?)/g)) {
    m.set(mm[1], mm[2]);
  }
  return m;
}

export function assertParaphrasePreserves(
  original: string,
  rewritten: string,
  answerCanonical?: string
): void {
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
  // F6(a) mọi ký hiệu chữ mà đáp án còn dùng phải còn nguyên trong lời văn (phân biệt hoa/thường).
  if (answerCanonical) {
    for (const sym of symbolicVars(answerCanonical)) {
      if (!new RegExp(`\\b${sym}\\b`).test(rewritten)) {
        throw new ParaphraseDriftError(`Paraphrase làm mất ký hiệu '${sym}' mà đáp án còn dùng`);
      }
    }
  }
  // F6(b) không được hoán vai các gán "NHÃN = số".
  const mo = assignmentMap(original);
  const mr = assignmentMap(rewritten);
  for (const [label, val] of mo) {
    const nv = mr.get(label);
    if (nv !== undefined && nv !== val) {
      throw new ParaphraseDriftError(`Paraphrase hoán vai '${label}': ${val} -> ${nv}`);
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
  assertParaphrasePreserves(seed.statement_vi, rewritten, seed.answer.canonical); // F6: kèm đáp án

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "paraphrase");
  v.statement_vi = rewritten;
  // answer KHÔNG đổi.
  v.variant = { kind: "paraphrase", parentSeedId: seed.id };
  return v;
}
