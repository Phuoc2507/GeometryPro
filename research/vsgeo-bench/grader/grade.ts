// grader/grade.ts
// Lớp điều phối: nối extract → normalize → compare thành một hàm grade() duy nhất
// theo HỢP ĐỒNG DÙNG CHUNG. Đây là "giao thức chấm" mà 2 em phải giải thích (design.md §4.4).
import type { Answer, GradeResult, Verdict } from './types';
import { extractBoxed } from './extract';
import { canonicalScalar } from './normalize';
import {
  compareScalar, compareRatio, comparePoint, comparePlane,
  compareBoolean, compareMcq,
} from './compare';

/** Câu giải thích tiếng Việt cho từng phán quyết. */
function reasonFor(verdict: Verdict, type: string): string {
  if (verdict === 'correct') return `Đáp án model tương đương đáp án chuẩn (loại "${type}").`;
  if (verdict === 'incorrect') return `Đáp án model khác đáp án chuẩn (loại "${type}").`;
  return `Máy chấm không chắc (loại "${type}") — đánh dấu để soát tay, không đoán bừa.`;
}

/**
 * Chấm một đáp án THÔ của model so với đáp án chuẩn.
 * Trả GradeResult { verdict, canonicalModel?, canonicalTruth?, reason }.
 */
export function grade(modelAnswerRaw: string, truth: Answer): GradeResult {
  const extracted = extractBoxed(modelAnswerRaw);
  if (extracted === null) {
    return {
      verdict: 'unsure',
      canonicalTruth: truth.canonical,
      reason: 'Không trích được đáp án: thiếu \\boxed{...} và không có dòng "Đáp án:/Kết luận:".',
    };
  }

  let verdict: Verdict;
  switch (truth.type) {
    case 'rational':
    case 'surd':
      verdict = compareScalar(extracted, truth.canonical);
      break;
    case 'ratio':
      verdict = compareRatio(extracted, truth.canonical);
      break;
    case 'point':
    case 'vector':
      verdict = comparePoint(extracted, truth.canonical);
      break;
    case 'plane_eq':
      verdict = comparePlane(extracted, truth.canonical);
      break;
    case 'line_eq':
      // Giới hạn hiện tại: chỉ xử lý được đường dạng hệ số tuyến tính giống mặt phẳng.
      // Dạng tham số/chính tắc → comparePlane trả 'unsure' (đánh dấu soát tay). Xem "câu hỏi mở".
      verdict = comparePlane(extracted, truth.canonical);
      break;
    case 'boolean':
      verdict = compareBoolean(extracted, truth.canonical);
      break;
    case 'mcq':
      verdict = compareMcq(extracted, truth.canonical);
      break;
    default:
      verdict = 'unsure';
  }

  // canonicalModel: chỉ có nghĩa cho đáp án vô hướng; loại khác để nguyên chuỗi trích được.
  const isScalarLike = truth.type === 'rational' || truth.type === 'surd' || truth.type === 'ratio';
  const canonicalModel = isScalarLike ? (canonicalScalar(extracted) ?? extracted) : extracted;

  return {
    verdict,
    canonicalModel,
    canonicalTruth: truth.canonical,
    reason: reasonFor(verdict, truth.type),
  };
}
