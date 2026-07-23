// src/data/problemTypeCatalog.ts
// Bảng phân loại DẠNG BÀI cho giáo viên (trang /teacher/dang-bai).
// MỖI dòng = một dạng bài + MỨC AN TOÀN của engine với dạng đó:
//   • Mức 1 (Đã kiểm chứng): engine giải & tự chứng thực → KÈM ví dụ chạy được
//     + (nếu là hình học) hình đã-chứng-thực để "Vẽ thử".
//   • Mức 3 (Chưa chứng thực): engine CHƯA chứng thực dạng này → KHÔNG bịa ví dụ, chỉ ghi chú.
//
// NHÃN `type` LÀ NHÃN CƠ HỌC CỦA ENGINE (classifyTier.problemTypeOf), KHÔNG phải nhãn SGK.
//   ⇒ Câu-1 "đỉnh đống rơm" (tối ưu theo SGK) mang nhãn máy 'Giải phương trình';
//     Câu-4a "diện tích mặt cắt lớn nhất" (diện tích theo SGK) mang nhãn máy 'Cực trị'.
//   `curriculumNote` giải thích chênh lệch này.
//
// MỌI ví dụ Mức-1 được HAI lớp guard chứng thực (KHÔNG bịa):
//   • Lớp A — src/data/__tests__/problemTypeCatalog.structure.test.ts (cấu trúc + toàn vẹn hình).
//   • Lớp B — api/_lib/__tests__/problemTypeCatalog.engine.test.js (chạy runAny + classifyTier,
//     đối chiếu level/problemType/exactness/đáp số với engine THẬT).
// Nếu Lớp B đỏ ⇒ SỬA DỮ LIỆU (program/đáp số/nhãn), TUYỆT ĐỐI không sửa assertion.

import type { GeometryData } from '../types/geometry';
import type { SafetyLevel } from '../lib/safetyTier';

export interface CatalogExample {
  /** Đề rút gọn hiển thị cho giáo viên. */
  de: string;
  /** Đáp án hiển thị cho người đọc (vd "d(A,(SCD)) = √2"). Chỉ để hiển thị — guard không so chuỗi này. */
  answer: string;
  /** Engine trả 'exact' (căn/phân số đúng) hay 'numeric' (giá trị số). */
  exactness: 'exact' | 'numeric';
  /** Đầu vào runAny — chương trình đã probe chứng minh ra Mức 1. */
  program: unknown;
  /** answers[0].approx mà engine PHẢI trả (Lớp B đối chiếu bằng toBeCloseTo). */
  expectApprox: number;
  /** answers[0].text mà engine PHẢI trả — chỉ đặt cho ví dụ 'exact'. */
  expectText?: string;
  /** Trích dẫn test gốc chứng minh con số này. */
  sourceTest: string;
  /** Hình để "Vẽ thử". CÓ ⇒ hiện nút; VẮNG ⇒ ví dụ chỉ có đáp số (dạng giải tích). */
  geometry?: GeometryData;
}

export interface CatalogEntry {
  /** Nhãn CƠ HỌC của engine (classifyTier.problemType). */
  type: string;
  /** 1 = Đã kiểm chứng (có ví dụ) · 3 = Chưa chứng thực (không ví dụ). */
  level: SafetyLevel;
  /** Ghi chú trung thực cho giáo viên về dạng bài & mức. */
  note: string;
  /** Giải thích chênh lệch nhãn-máy vs nhãn-SGK (nếu có). */
  curriculumNote?: string;
  /** Chỉ Mức-1 mới có ví dụ. */
  example?: CatalogExample;
}

// ── Hình dùng chung cho chóp S.ABCD (đáy vuông cạnh 2, SA⊥đáy, SA=2) ─────────────
const SABCD_POINTS = [
  { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
  { id: 'B', label: 'B', x: 2, y: 0, z: 0 },
  { id: 'C', label: 'C', x: 2, y: 2, z: 0 },
  { id: 'D', label: 'D', x: 0, y: 2, z: 0 },
  { id: 'S', label: 'S', x: 0, y: 0, z: 2 },
];
const SABCD_LINES = [
  { id: 'AB', from: 'A', to: 'B' }, { id: 'BC', from: 'B', to: 'C' },
  { id: 'CD', from: 'C', to: 'D' }, { id: 'DA', from: 'D', to: 'A' },
  { id: 'SA', from: 'S', to: 'A' }, { id: 'SB', from: 'S', to: 'B' },
  { id: 'SC', from: 'S', to: 'C' }, { id: 'SD', from: 'S', to: 'D' },
];

export const problemTypeCatalog: CatalogEntry[] = [
  // ── MỨC 1 — hình học (5 dạng, đều có "Vẽ thử") ──────────────────────────────
  {
    type: 'Khoảng cách',
    level: 1,
    note: 'Khoảng cách điểm→mặt phẳng, điểm→đường, hai đường chéo nhau. Engine dựng mặt phẳng rồi tính chính xác.',
    example: {
      de: 'Chóp S.ABCD đáy vuông cạnh 2, SA⊥đáy, SA=2. Tính d(A, (SCD)).',
      answer: 'd(A,(SCD)) = √2',
      exactness: 'exact',
      expectApprox: Math.SQRT2,
      expectText: '√2',
      sourceTest: 'api/_lib/kernel/__tests__/e2e-flagship.test.ts:38',
      program: {
        solidName: 'khoang-cach',
        ops: [
          { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
          { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
          { op: 'oxyz_point', name: 'C', at: [2, 2, 0] },
          { op: 'oxyz_point', name: 'D', at: [0, 2, 0] },
          { op: 'oxyz_point', name: 'S', at: [0, 0, 2] },
          { op: 'oxyz_plane', name: 'SCD', by: { form: 'three_points', a: 'S', b: 'C', c: 'D' } },
        ],
        queries: [{ kind: 'distance', a: 'A', b: 'SCD' }],
      },
      geometry: { name: 'Chóp S.ABCD — khoảng cách A đến (SCD)', points: SABCD_POINTS, lines: SABCD_LINES },
    },
  },
  {
    type: 'Thể tích',
    level: 1,
    note: 'Thể tích khối chóp / lăng trụ / tứ diện từ toạ độ đỉnh. Engine tính bằng định thức, ra phân số đúng.',
    example: {
      de: 'Chóp S.ABCD đáy vuông cạnh 2, SA⊥đáy, SA=2. Tính thể tích khối chóp.',
      answer: 'V(S.ABCD) = 8/3',
      exactness: 'exact',
      expectApprox: 8 / 3,
      expectText: '8/3',
      sourceTest: 'api/_lib/kernel/__tests__/e2e-flagship.test.ts:49',
      program: {
        solidName: 'the-tich',
        ops: [
          { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
          { op: 'oxyz_point', name: 'B', at: [2, 0, 0] },
          { op: 'oxyz_point', name: 'C', at: [2, 2, 0] },
          { op: 'oxyz_point', name: 'D', at: [0, 2, 0] },
          { op: 'oxyz_point', name: 'S', at: [0, 0, 2] },
        ],
        queries: [{ kind: 'volume', solid: 'pyramid', points: ['A', 'B', 'C', 'D'], apex: 'S' }],
      },
      geometry: { name: 'Khối chóp S.ABCD (đáy vuông cạnh 2, SA⊥đáy)', points: SABCD_POINTS, lines: SABCD_LINES },
    },
  },
  {
    type: 'Diện tích',
    level: 1,
    note: 'Diện tích tam giác / đa giác phẳng từ toạ độ đỉnh (½|AB×AC|). Ra giá trị đúng.',
    example: {
      de: 'Tam giác ABC vuông tại A, AB=3, AC=4. Tính diện tích.',
      answer: 'S(ABC) = 6',
      exactness: 'exact',
      expectApprox: 6,
      expectText: '6',
      sourceTest: 'api/_lib/kernel/compute/query.ts:29 (schema area/triangle)',
      program: {
        solidName: 'dien-tich',
        ops: [
          { op: 'oxyz_point', name: 'A', at: [0, 0, 0] },
          { op: 'oxyz_point', name: 'B', at: [3, 0, 0] },
          { op: 'oxyz_point', name: 'C', at: [0, 4, 0] },
        ],
        queries: [{ kind: 'area', shape: 'triangle', points: ['A', 'B', 'C'] }],
      },
      geometry: {
        name: 'Tam giác ABC vuông tại A (AB=3, AC=4)',
        points: [
          { id: 'A', label: 'A', x: 0, y: 0, z: 0 },
          { id: 'B', label: 'B', x: 3, y: 0, z: 0 },
          { id: 'C', label: 'C', x: 0, y: 4, z: 0 },
        ],
        lines: [
          { id: 'AB', from: 'A', to: 'B' },
          { id: 'BC', from: 'B', to: 'C' },
          { id: 'CA', from: 'C', to: 'A' },
        ],
      },
    },
  },
  {
    type: 'Toạ độ điểm',
    level: 1,
    note: 'Engine TÍNH điểm đặc biệt (trực tâm, trọng tâm, chân đường cao...) rồi đọc toạ độ — không để AI tự cắm số.',
    example: {
      de: 'A(1,0,0), B(0,2,0), C(0,0,4). Tìm hoành độ trực tâm H của tam giác ABC.',
      answer: 'H_x = 16/21',
      exactness: 'exact',
      expectApprox: 16 / 21,
      expectText: '16/21',
      sourceTest: 'api/_lib/kernel/__tests__/translator-contract.test.ts:108',
      program: {
        solidName: 'truc-tam',
        ops: [
          { op: 'oxyz_point', name: 'A', at: [1, 0, 0] },
          { op: 'oxyz_point', name: 'B', at: [0, 2, 0] },
          { op: 'oxyz_point', name: 'C', at: [0, 0, 4] },
          { op: 'oxyz_orthocenter', name: 'H', of: ['A', 'B', 'C'] },
        ],
        queries: [{ kind: 'point_coord', target: 'H', axis: 'x' }],
      },
      geometry: {
        name: 'Trực tâm H của tam giác ABC',
        points: [
          { id: 'A', label: 'A', x: 1, y: 0, z: 0 },
          { id: 'B', label: 'B', x: 0, y: 2, z: 0 },
          { id: 'C', label: 'C', x: 0, y: 0, z: 4 },
          { id: 'H', label: 'H', x: 16 / 21, y: 8 / 21, z: 4 / 21, highlight: true },
        ],
        lines: [
          { id: 'AB', from: 'A', to: 'B' },
          { id: 'BC', from: 'B', to: 'C' },
          { id: 'CA', from: 'C', to: 'A' },
        ],
      },
    },
  },
  {
    type: 'Mặt cầu',
    level: 1,
    note: 'Mặt cầu ngoại tiếp / qua các điểm; đọc bán kính, tâm, đỉnh. Bán kính thường là giá trị số.',
    example: {
      de: 'Ba đỉnh cột A(0,0,10), B(4,0,6), C(0,4,6). Bán kính mặt cầu ngoại tiếp (t=0)?',
      answer: 'R = 4√6/3 ≈ 3,266',
      exactness: 'numeric',
      expectApprox: 4 * Math.sqrt(6) / 3,
      sourceTest: 'api/_lib/kernel/dialects/__tests__/oxyz-circumsphere.test.ts:6',
      program: {
        solidName: 'poles',
        ops: [
          { op: 'oxyz_point', name: 'A', at: [0, 0, 10] },
          { op: 'oxyz_point', name: 'B', at: [4, 0, 6] },
          { op: 'oxyz_point', name: 'C', at: [0, 4, 6] },
          { op: 'oxyz_circumsphere_offset', name: 'S', of: ['A', 'B', 'C'], t: 0 },
        ],
        queries: [{ kind: 'sphere_metric', target: 'S', what: 'radius' }],
      },
      geometry: {
        name: 'Mặt cầu ngoại tiếp A, B, C (t=0)',
        points: [
          { id: 'A', label: 'A', x: 0, y: 0, z: 10 },
          { id: 'B', label: 'B', x: 4, y: 0, z: 6 },
          { id: 'C', label: 'C', x: 0, y: 4, z: 6 },
        ],
        lines: [
          { id: 'AB', from: 'A', to: 'B' },
          { id: 'BC', from: 'B', to: 'C' },
          { id: 'CA', from: 'C', to: 'A' },
        ],
        spheres: [
          { id: 'S', label: 'S', center: { x: 4 / 3, y: 4 / 3, z: 22 / 3 }, radius: 4 * Math.sqrt(6) / 3, opacity: 0.25 },
        ],
      },
    },
  },
  // ── MỨC 1 — giải tích (2 dạng, CHỈ đáp số, KHÔNG "Vẽ thử") ────────────────────
  {
    type: 'Cực trị',
    level: 1,
    note: 'Tối ưu một/nhiều biến trên miền cho trước; engine tìm cực trị số. Ví dụ không có hình vì kết quả là một giá trị.',
    curriculumNote: 'Ví dụ dưới là "diện tích mặt cắt lớn nhất" (theo SGK là bài Diện tích); engine xử lý cơ học như tối ưu 1 biến ⇒ nhãn máy "Cực trị".',
    example: {
      de: 'Đèn lồng cao 40, nửa đường chéo r(z) là parabol qua (0,10),(20,14),(40,10). Diện tích mặt cắt (=2r²) lớn nhất?',
      answer: 'S_max = 392 cm² (tại z = 20)',
      exactness: 'numeric',
      expectApprox: 392,
      sourceTest: 'api/_lib/kernel/analysis/__tests__/cau4-contract.test.ts:9',
      program: {
        solidName: 'lantern',
        functions: [{ name: 'r', form: 'poly', degree: 2, through: [[0, 10], [20, 14], [40, 10]] }],
        parameters: [{ name: 'z', domain: [0, 40] }],
        analyze: { kind: 'optimize', parameter: 'z', sense: 'max', objective: { kind: 'expr', expr: '2*r(z)^2' } },
      },
    },
  },
  {
    type: 'Giải phương trình',
    level: 1,
    note: 'Tìm tham số thoả một ràng buộc (đạo hàm, khoảng cách...) rồi báo cáo đại lượng phụ thuộc. Kết quả là giá trị số.',
    curriculumNote: 'Ví dụ dưới là "đỉnh cao nhất của đống rơm" (theo SGK là bài Cực trị/tối ưu); engine quy về GIẢI phương trình ràng buộc thang dài 5 ⇒ nhãn máy "Giải phương trình".',
    example: {
      de: 'Đống rơm y=f(x) parabol qua (0,0),(8,0); thang dài 5 tiếp tuyến tại x=6 chạm đất. Đỉnh cao nhất?',
      answer: 'V_y = 16/3 ≈ 5,33 m (a = −1/3)',
      exactness: 'numeric',
      expectApprox: 16 / 3,
      sourceTest: 'api/_lib/kernel/analysis/__tests__/cau1-contract.test.ts:5',
      program: {
        solidName: 'haystack',
        parameters: [{ name: 'a', domain: [-2, -0.01] }],
        functions: [{ name: 'f', form: 'poly', degree: 2, through: [[0, 0], [8, 0]], leading: 'a' }],
        ops: [
          { op: 'curve_point', name: 'B', f: 'f', x: 6 },
          { op: 'tangent_line', name: 'T', f: 'f', x: 6 },
          { op: 'oxyz_plane', name: 'G', by: { form: 'coeffs', a: 0, b: 1, c: 0, d: 0 } },
          { op: 'oxyz_intersect', name: 'C', a: 'T', b: 'G' },
          { op: 'curve_extremum', name: 'V', f: 'f', domain: [0, 8] },
        ],
        analyze: {
          kind: 'solve', parameter: 'a',
          constraint: { of: { kind: 'distance', a: 'B', b: 'C' }, equals: 5 },
          report: { kind: 'point_coord', target: 'V', axis: 'y' },
        },
      },
    },
  },
  // ── MỨC 3 — Chưa chứng thực (TRUNG THỰC, không bịa ví dụ) ─────────────────────
  { type: 'Góc', level: 3, note: 'Góc giữa đường/mặt. Engine chưa chứng thực một chương trình chạy sạch cho dạng này — đang hiện lời giải AI, chưa kiểm chứng.' },
  { type: 'Phương trình', level: 3, note: 'Lập phương trình mặt phẳng/đường/mặt cầu. Chưa có ví dụ chứng thực.' },
  { type: 'Vị trí tương đối', level: 3, note: 'Xét vị trí tương đối đường-mặt, mặt-mặt, cầu-mặt. Chưa chứng thực.' },
  { type: 'Giao', level: 3, note: 'Giao tuyến / giao điểm. Trường hợp đường×đường còn đang vá — chưa chứng thực.' },
  { type: 'Tỉ số thể tích', level: 3, note: 'Tỉ số thể tích khi cắt khối. Chưa chứng thực.' },
  { type: 'Tích phân', level: 3, note: 'Thể tích/diện tích bằng tích phân. Engine có nhánh integrate nhưng dạng này chưa được chốt chứng thực.' },
  { type: 'Tính giá trị', level: 3, note: 'Thay số vào biểu thức/hàm. Chưa chứng thực như một dạng độc lập.' },
  { type: 'Khác', level: 3, note: 'Dạng chưa nhận diện được — luôn hiển thị honest "chưa kiểm chứng".' },
];
