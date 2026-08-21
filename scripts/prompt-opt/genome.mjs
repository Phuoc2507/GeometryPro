// scripts/prompt-opt/genome.mjs
// BIỂU DIỄN "BỘ GEN" CỦA MỘT PROMPT ỨNG VIÊN.
//
// Triết lý (quan trọng để bảo vệ trước hội đồng):
//   • KHÔNG đột biến/xoá phần lõi của prompt gốc — đặc biệt là "cổng từ chối" 3 câu hỏi đã tinh chỉnh
//     kỹ. Làm hỏng nó sẽ khiến hệ thống bịa đáp, đi ngược mục tiêu an toàn.
//   • Thay vào đó, THUẬT TOÁN TIẾN HOÁ tìm kiếm trên phần "PHỤ TRỢ": chọn BẬT/TẮT một số CÂU CHỈ DẪN
//     ngắn (genes) gắn THÊM sau prompt gốc, và THỨ TỰ gắn chúng. Đây là không gian tìm kiếm rõ ràng,
//     rẻ, tái lập, và dễ giải thích: "GA khám phá xem thêm gợi ý nào giúp DỊCH đề chính xác hơn."
//
// GENOME = { bits: number[0/1] theo GENES, order: number[] hoán vị 0..N-1 }.
//   assemblePrompt(base, genome) = base + (các gene bit=1, nối theo `order`).

// Mỗi gene là một chỉ dẫn ngắn, nhắm vào MỘT lỗi dịch điển hình. Tất cả bằng tiếng Việt, đồng bộ với
// hệ thống thật (toạ-độ-hoá, scaleSymbol, cổng từ chối, queries…). `tag` để mock/diagnostics tham chiếu.
export const GENES = [
  { tag: 'json-only',      text: 'CHỈ in đúng một JSON object, KHÔNG kèm giải thích, KHÔNG rào ```.' },
  { tag: 'gate-first',     text: 'TRƯỚC khi viết JSON, chạy 3 CÂU HỎI CỔNG; nếu dính ô cấm ⇒ trả {"abstain":true,...}.' },
  { tag: 'origin-hint',    text: 'Ưu tiên đặt gốc toạ độ ở chân đường cao hoặc đỉnh có nhiều cạnh vuông góc để toạ độ gọn.' },
  { tag: 'integer-coords', text: 'Chọn toạ độ NGUYÊN/đơn giản nhất có thể; tránh số lẻ không cần thiết.' },
  { tag: 'strip-units',    text: 'Bỏ đơn vị (cm, m, dm) khỏi số; chỉ giữ giá trị số thuần.' },
  { tag: 'scale-symbol',   text: 'Nếu kích thước cho bằng MỘT chữ (vd a, và các bội a√2, 2a…), toạ-độ-hoá tại 1 và thêm "scaleSymbol":"a".' },
  { tag: 'queries-list',   text: 'Mỗi đại lượng đề hỏi phải là MỘT phần tử riêng trong mảng "queries" (đúng thứ tự đề hỏi).' },
  { tag: 'verify-asserts', text: 'Trước khi trả, tự soát: mọi ràng buộc vuông góc/song song/khoảng cách của đề đã khớp với toạ độ đã chọn.' },
];

export const N_GENES = GENES.length;

// Genome gốc (baseline) = KHÔNG bật gene nào, thứ tự tự nhiên ⇒ prompt y hệt bản sản xuất.
export function baselineGenome() {
  return { bits: new Array(N_GENES).fill(0), order: [...Array(N_GENES).keys()] };
}

export function randomGenome(rng, pOn = 0.5) {
  const bits = Array.from({ length: N_GENES }, () => (rng.bool(pOn) ? 1 : 0));
  const order = rng.shuffle([...Array(N_GENES).keys()]);
  return { bits, order };
}

// Ghép prompt cuối = prompt gốc + các gene đang bật, nối theo `order`.
export function assemblePrompt(basePrompt, genome) {
  const chosen = genome.order.filter((i) => genome.bits[i] === 1);
  if (chosen.length === 0) return basePrompt;
  const extra = chosen.map((i) => '- ' + GENES[i].text).join('\n');
  return (
    basePrompt +
    '\n\n## CHỈ DẪN BỔ SUNG (tối ưu tự động)\n' +
    extra
  );
}

// Khoá định danh genome (để cache fitness, khử trùng lặp). Chỉ phụ thuộc TẬP gene bật và THỨ TỰ của
// riêng các gene bật (gene tắt không ảnh hưởng prompt ⇒ không tính vào khoá).
export function genomeKey(genome) {
  const chosen = genome.order.filter((i) => genome.bits[i] === 1);
  return chosen.join('-') || 'baseline';
}

// Danh sách tag các gene đang bật (dùng cho mock & báo cáo).
export function activeTags(genome) {
  return genome.order.filter((i) => genome.bits[i] === 1).map((i) => GENES[i].tag);
}

// ---- Toán tử di truyền ----

// Lai ghép: bits theo kiểu ĐỒNG NHẤT (mỗi bit lấy ngẫu nhiên từ cha/mẹ); order theo kiểu OX (Order
// Crossover) để con vẫn là một HOÁN VỊ hợp lệ.
export function crossover(rng, pa, pb) {
  const bits = pa.bits.map((b, i) => (rng.bool() ? b : pb.bits[i]));
  const order = orderCrossover(rng, pa.order, pb.order);
  return { bits, order };
}

function orderCrossover(rng, a, b) {
  const n = a.length;
  const i = rng.int(n);
  const j = rng.int(n);
  const lo = Math.min(i, j);
  const hi = Math.max(i, j);
  const child = new Array(n).fill(-1);
  const taken = new Set();
  for (let k = lo; k <= hi; k++) {
    child[k] = a[k];
    taken.add(a[k]);
  }
  let idx = 0;
  for (let k = 0; k < n; k++) {
    if (child[k] !== -1) continue;
    while (taken.has(b[idx])) idx++;
    child[k] = b[idx];
    taken.add(b[idx]);
  }
  return child;
}

// Đột biến: lật một số bit (xác suất pBit mỗi bit) và đôi khi hoán vị hai vị trí trong order.
export function mutate(rng, genome, pBit = 0.15, pSwap = 0.3) {
  const bits = genome.bits.map((b) => (rng.bool(pBit) ? 1 - b : b));
  const order = [...genome.order];
  if (rng.bool(pSwap)) {
    const i = rng.int(order.length);
    const j = rng.int(order.length);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { bits, order };
}
