import { describe, it, expect } from 'vitest';
import { runAny } from '../kernel/analysis/runAnalysis';
import { classifyTier } from '../kernel-bridge/classifyTier.js';
import { problemTypeCatalog } from '../../../src/data/problemTypeCatalog';

// Adapter GIỐNG production (solvePlan): gói kết quả run()/runAnalysis() về shape mà classifyTier đọc.
//   • Nhánh hình học (run): có `entities`, `answers` là MẢNG.
//   • Nhánh giải tích (runAnalysis): KHÔNG có `entities`, có `parameter` + `answer` (ĐƠN) ⇒ bọc thành answers[0].
function classify(program) {
  const raw = runAny(program);
  let adapted;
  if (!('entities' in raw)) {
    adapted = {
      ok: raw.ok,
      parameter: raw.parameter,
      answers: raw.ok ? [{ kind: 'kết quả', ...raw.answer }] : [],
      violations: raw.violations || [],
      errors: raw.errors || [],
    };
  } else {
    adapted = {
      ok: raw.ok,
      answers: raw.answers,
      violations: raw.violations || [],
      errors: raw.errors || [],
    };
  }
  const result = { plan: program, ...adapted };
  return { tier: classifyTier(result), answers: adapted.answers, raw };
}

describe('problemTypeCatalog — guard engine thật (Lớp B)', () => {
  const m1 = problemTypeCatalog.filter((e) => e.level === 1);

  it('có đúng 7 dạng Mức-1 để kiểm', () => {
    expect(m1.length).toBe(7);
  });

  for (const entry of m1) {
    it(`Mức-1 "${entry.type}" — engine xác nhận level/nhãn/đáp số [${entry.example.sourceTest}]`, () => {
      const ex = entry.example;
      const { tier, answers, raw } = classify(ex.program);

      // 1) Engine phải giải sạch.
      expect(raw.ok, 'engine phải ok').toBe(true);
      expect((raw.violations || []).length, 'không được có vi phạm').toBe(0);

      // 2) Đúng MỨC 1 (engine tự chứng thực).
      expect(tier.level, 'phải là Mức 1').toBe(1);

      // 3) Nhãn CƠ HỌC engine dán khớp `type` khai báo trong catalog (chống dán nhãn sai).
      expect(tier.problemType).toBe(entry.type);

      // 4) exactness khớp.
      expect(tier.exactness).toBe(ex.exactness);

      // 5) Đáp số khớp engine (toBeCloseTo 6 chữ số — engine tất định).
      expect(Number.isFinite(answers[0].approx)).toBe(true);
      expect(answers[0].approx).toBeCloseTo(ex.expectApprox, 6);

      // 6) Với ví dụ 'exact', text đúng dạng căn/phân số engine trả.
      if (ex.expectText) {
        expect(answers[0].text).toBe(ex.expectText);
      }
    });
  }
});
