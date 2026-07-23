// research/vsgeo-bench/perturbations/rescale.ts
// Đổi tỉ lệ mọi độ dài lên k lần; đáp án co giãn theo scale_degree (bậc): x -> x * k^degree.
import type { Seed, Variant } from "./types";
import { cloneSeed, variantId } from "./types";
// Engine ký hiệu có sẵn (ghi nguồn: api/_lib/kernel) — KHÔNG phải do nhóm phát minh.
import { toExactForm } from "../../../api/_lib/kernel/exactForm";
import { evalExpr } from "../../../api/_lib/kernel/analysis/expr";

const NUMERIC_TYPES = new Set(["rational", "surd", "ratio"]);

// F1(c) TIỀN-KIỂM: từ chối co giãn khi đề chứa dữ kiện KHÔNG co giãn tuyến tính theo k.
// Nguyên tắc §4.3: thà SKIP còn hơn sinh bài tự mâu thuẫn (góc bị nhân đôi, thể tích cho
// bằng số sẽ sai bậc). generateVariantsForSeed bọc try/catch nên ném = biến thể bị bỏ.
// F9 Toạ độ literal "L(x;y;z)" (nhãn HOA + 3 số ngăn bởi ';' hoặc ','), cùng dạng reflect nhận.
const HAS_COORD_LITERAL =
  /[A-Z]\(\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*[;,]\s*-?\d+(?:\.\d+)?\s*\)/;

// RS-1 (Round-5) ĐỘ DÀI NGOẠI LAI: cỗ máy co giãn chỉ nắm 'cạnh [n]a' và số sau từ khoá độ
// dài / 'AB = n'. Khi đề TRỘN một độ dài co-giãn-được (khiến câu ĐỔI ⇒ chốt F22 line 200 KHÔNG
// bắt) với một độ dài "ngoại lai" mà measureNumbers (line 147) mù, độ dài ngoại lai GIỮ NGUYÊN
// trong khi đáp án ×k^bậc ⇒ statement tự mâu thuẫn answer (sai-im-lặng §4.3, tệ hơn crash).
// Các dạng ngoại lai measureNumbers không thấy: ký hiệu ≠'a' (h/b/x, không có chữ số); hệ số+ký
// hiệu '2x' (số bị miễn bởi luật (S)); đơn vị dính '3m/6cm/5dm' (đọc '6c' rồi miễn '6'); căn
// TRẦN '√3'/'căn 5' (radicand miễn bởi luật (R)); luỹ thừa ký hiệu 'b^2' (mũ miễn bởi (R));
// số viết CHỮ 'ba' (không có chữ số nào). Bất kỳ dạng nào xuất hiện ⇒ ném để bị bỏ (§4.3).
// LƯU Ý: các nhánh CỐ Ý bỏ qua độ dài HỢP LỆ — hệ số+căn 'cạnh 2√3'/'2 căn 3' (nhánh 1 lột hệ
// số trước), đơn vị CÁCH số '8 cm' (nhánh 2 đòi chữ DÍNH), 'cạnh a'/'cạnh 2a' — nên KHÔNG oan.
function assertNoForeignLength(orig: string): void {
  // (1) căn TRẦN / căn-bằng-chữ KHÔNG có hệ số số học đứng trước ("2√3" / "2 căn 3" là HỢP LỆ).
  const noCoefSurd = orig.replace(/\d+\s*(?:√|căn(?:\s+bậc\s+\w+)?\s*)/giu, " ");
  if (/√|\bcăn\b/iu.test(noCoefSurd)) {
    throw new Error(
      `rescale: đề chứa CĂN TRẦN (√/căn) không có hệ số số học co-giãn-được đứng trước — độ dài ngoại lai measureNumbers mù (bỏ qua §4.3)`
    );
  }
  // (2) chữ số DÍNH ngay vào một chữ latin thường ≠ 'a' ⇒ hệ số+ký hiệu (2x) HOẶC đơn vị dính
  //     (6cm/3m/5dm). KHÔNG có \s — đơn vị viết CÁCH số "8 cm" co giãn được, không được ném.
  if (/\d[b-z]/i.test(orig)) {
    throw new Error(
      `rescale: đề có chữ số DÍNH ký hiệu/đơn vị ≠'a' (hệ số+ký hiệu '2x' hoặc đơn vị dính '3m/6cm') — độ dài ngoại lai (bỏ qua §4.3)`
    );
  }
  // (3) một ký hiệu chữ thường ĐƠN ≠ 'a' đứng ngay sau (chuỗi) từ khoá độ dài (h/b/x làm kích
  //     thước). (?![a-zà-ỹ]) chặn khớp nhầm cụm bổ nghĩa "cạnh bên/cạnh đáy" (bên/đáy nối chữ).
  if (
    /(cạnh|chiều\s+cao|chiều\s+rộng|chiều\s+dài|đường\s+cao|đường\s+chéo|đường\s+sinh|đường\s+kính|bán\s+kính|trung\s+đoạn|cao|dài|rộng)((?:\s+(?:đáy|bên|xung quanh|nghiêng|bằng|tương ứng))*\s+)([b-z])(?![a-zà-ỹ])/iu.test(
      orig
    )
  ) {
    throw new Error(
      `rescale: đề có ký hiệu độ dài ≠'a' (h/b/x) sau từ khoá — cỗ máy chỉ co giãn 'a', ký hiệu này giữ nguyên (bỏ qua §4.3)`
    );
  }
  // (4) ký hiệu ≠'a' luỹ THỪA = dữ kiện diện tích/thể tích ký hiệu (b^2) — mũ bị measureNumbers miễn.
  if (/[b-z]\s*\^\s*\d/i.test(orig)) {
    throw new Error(
      `rescale: đề chứa luỹ thừa ký hiệu ≠'a' (b^2 = diện tích/thể tích ký hiệu) — độ dài ngoại lai (bỏ qua §4.3)`
    );
  }
  // (5) số đo viết bằng CHỮ (một/hai/ba…) làm kích thước, ngay sau từ khoá độ dài / 'bằng'.
  if (
    /(cao|dài|rộng|cạnh|bằng)\s+(một|hai|ba|bốn|bon|năm|nam|sáu|sau|bảy|bay|tám|tam|chín|chin|mười|muoi)(?![a-zà-ỹ])/iu.test(
      orig
    )
  ) {
    throw new Error(
      `rescale: đề có số đo viết bằng CHỮ (một/hai/ba…) làm kích thước — không có chữ số để co giãn (bỏ qua §4.3)`
    );
  }
}

function assertScalable(orig: string, scaleDegree?: number): void {
  // F12 Nhánh '°/độ' cũ dùng '\b' sau '°'/'ộ' (ký tự phi-từ) nên KHÔNG BAO GIỜ khớp khi
  // theo sau là dấu câu/khoảng trắng — guard chết, "45°." / "60 độ." lọt lưới. Thay bằng
  // lookahead (?![\p{L}\d]) với cờ /u: chặn khi sau đơn vị góc KHÔNG phải chữ/số (tức là
  // '°'/'độ' đứng như đơn vị, không phải mở đầu từ khác như "độ dài" — vốn cần \d ngay trước).
  if (/\bgóc\b/i.test(orig) || /\d\s*(?:°|độ)(?![\p{L}\d])/iu.test(orig)) {
    throw new Error(`rescale: đề chứa góc/độ — co giãn cạnh không được đổi góc (bỏ qua)`);
  }
  if (/\b(diện tích|thể tích)\b[^.]*\bbằng\b\s*\d/i.test(orig)) {
    throw new Error(
      `rescale: diện tích/thể tích cho bằng số — bậc co giãn ≠ 1, không đảm bảo nhất quán (bỏ qua)`
    );
  }
  // F13 Tỉ số/tỉ lệ là đại lượng BẤT BIẾN co giãn (bậc 0): nhân k^degree vào đáp án sẽ sai.
  // Viết cả "tỉ"/"tỷ". Thà bỏ còn hơn sinh biến thể có đáp án sai bậc.
  if (/t[ỉỷ]\s*(số|lệ)/i.test(orig)) {
    throw new Error(
      `rescale: đề hỏi tỉ số/tỉ lệ — bất biến co giãn (bậc 0), nhân k^degree sẽ sai (bỏ qua)`
    );
  }
  // F18 "SỐ cạnh/mặt/đỉnh" = SỐ ĐẾM của đa giác/đa diện (lục giác có 6 cạnh), KHÔNG phải độ
  // dài. scaleLengthsInText lại khớp "cạnh ... bằng 6" và nhân 6->12 (biến lục giác thành
  // 12-giác) một cách NHẤT QUÁN với k nên hậu-kiểm số-đo không phát hiện — phải từ chối trước.
  if (/\bsố\s+(c[aạ]nh|m[aặ]t|đỉnh)\b/iu.test(orig)) {
    throw new Error(
      `rescale: đề nêu SỐ cạnh/mặt/đỉnh (số đếm đa giác, không phải độ dài) — co giãn sẽ đổi hình (bỏ qua §4.3)`
    );
  }
  // F23 Kích thước định nghĩa THEO BỘI SỐ: "đường cao bằng 2 lần cạnh đáy", "gấp đôi"…
  // Số "2" ở "2 lần" là HỆ SỐ HÌNH DẠNG (tỉ lệ), không phải độ dài; scaler nhân nhầm nó ⇒ đổi
  // hình một cách mà hậu-kiểm số-đo không thấy (bội số co giãn cùng nhịp với độ dài thật). Bỏ.
  if (/\d+\s*lần/i.test(orig) || /\bgấp\s+(?:đôi|rưỡi|ba|bốn|năm|sáu|bảy|\d)/i.test(orig)) {
    throw new Error(
      `rescale: đề định nghĩa kích thước theo BỘI SỐ ("N lần"/"gấp …") — hệ số bội là tỉ lệ hình (bất biến co giãn), scaler nhân nhầm ⇒ đổi hình (bỏ qua §4.3)`
    );
  }
  // F24 Gán dạng "XY = N ZT" (một đoạn = SỐ LẦN một đoạn khác), vd "SM = 2 MA": số N là TỈ LỆ
  // chia điểm, không phải độ dài theo đơn vị. pattern-3 nhân nhầm N ⇒ dời điểm sai. Bỏ (§4.3).
  if (/\b[A-Z]{1,2}\s*=\s*\d+(?:[.,]\d+)?\s+[A-Z]/.test(orig)) {
    throw new Error(
      `rescale: đề có gán "XY = N ZT" (đoạn = số lần đoạn khác — tỉ lệ chia điểm) — hệ số là tỉ lệ, scaler nhân nhầm ⇒ dời điểm sai (bỏ qua §4.3)`
    );
  }
  // F9 (MỞ RỘNG) TỪ CHỐI, KHÔNG cố co giãn toạ độ. scaleLengthsInText không khớp "A(1;2;3)"
  // nên câu giữ nguyên toạ độ (⇒ khoảng cách cũ) trong khi figure.points và đáp án đã ×k ⇒
  // statement mâu thuẫn với answer (model trả đúng theo đề lại bị chấm sai — §4.3 sai-im-lặng).
  // Co giãn toạ độ chỉ hợp lệ cho bài THUẦN BẬC ĐỒNG NHẤT và đòi xử lý riêng phương trình
  // mặt/mặt cầu (có hạng tử tự do) và vector phương-vs-vị-trí; một scaler nửa vời sẽ đẻ thêm
  // ca sai-emit mới. Theo "thà bỏ còn hơn sai", ta bỏ. Bù đắp toạ độ để MỞ RỘNG sau.
  if (HAS_COORD_LITERAL.test(orig)) {
    throw new Error(
      `rescale: đề chứa toạ độ literal A(x;y;z) — co giãn toạ độ cần xử lý riêng (pt mặt/vector), thà bỏ còn hơn sinh sai (MỞ RỘNG) — bỏ qua`
    );
  }
  // RS-1 (Round-5) ĐẶT SAU mọi guard cũ để chúng giữ ưu tiên thông điệp: bỏ độ dài ngoại lai.
  assertNoForeignLength(orig);
  // RS-2 (Round-5) SANITY BẬC: suy bậc đồng nhất từ đại lượng ĐỀ HỎI ("Tính … diện tích / thể
  // tích") và đối chiếu scale_degree. factor=k^scale_degree (line rescale()) TIN scale_degree một
  // cách mù quáng; nếu tác giả gán lệch (thể tích mà deg=2) hoặc đề hỏi TỔNG đại lượng khác bậc
  // (diện tích bậc 2 + thể tích bậc 3) thì không một factor nào đúng ⇒ ném (bỏ qua §4.3).
  const asksArea = /Tính[^.]*\bdiện tích\b/iu.test(orig);
  const asksVol = /Tính[^.]*\bthể tích\b/iu.test(orig);
  // (a) TỔNG diện tích + thể tích: khác bậc, không thể một factor đúng cả hai — luôn ném (sạch).
  if (asksArea && asksVol) {
    throw new Error(
      `rescale: đề hỏi TỔNG đại lượng KHÁC BẬC (diện tích bậc 2 + thể tích bậc 3) — không một k^degree nào đúng cả hai (bỏ qua §4.3)`
    );
  }
  // (b) LỆCH BẬC (heuristic): bậc suy từ đại lượng hỏi (thể tích→3, diện tích→2) phải khớp
  //     scale_degree. Chỉ ném khi LỆCH nên seed soạn đúng (thể tích+3, diện tích+2) không hề hấn.
  if (scaleDegree != null) {
    const expected = asksVol ? 3 : asksArea ? 2 : undefined;
    if (expected !== undefined && scaleDegree !== expected) {
      throw new Error(
        `rescale: scale_degree=${scaleDegree} LỆCH bậc suy từ đại lượng đề hỏi (=${expected}) — factor=k^${scaleDegree} sai bậc (bỏ qua §4.3)`
      );
    }
  }
}

// F1(d) HẬU-KIỂM: sau khi co giãn, không được còn độ dài KÝ HIỆU ('a', '2a') đứng tự do
// mà chưa nhân k (vd "SA = a" bị bỏ sót trong khi "cạnh a" đã thành "cạnh 2a").
// m[1] là tiền tố "cạnh " (đã co giãn) — chỉ ném khi độ dài ký hiệu KHÔNG có tiền tố này.
// F11 PHÂN BIỆT HOA/THƯỜNG (/g KHÔNG /gi): 'a' thường là cạnh ký hiệu, 'A' HOA là NHÃN
// đỉnh — cờ /i cũ khớp cả nhãn "A" đứng tự do ⇒ ném NHẦM ⇒ bài co-giãn-được bị bỏ oan.
function assertFullyScaled(scaled: string): void {
  const EDGE = /(?<=^|[\s=(:])(cạnh\s+)?(\d*)a(?=$|[\s.,;)√^])/g;
  for (const m of scaled.matchAll(EDGE)) {
    if (!m[1]) {
      throw new Error(
        `rescale: còn độ dài ký hiệu '${m[0].trim()}' chưa co giãn — bài sẽ tự mâu thuẫn (bỏ qua)`
      );
    }
  }
}

// Chuẩn hoá canonical về cú pháp evalExpr đọc được (√ -> sqrt), rồi tính giá trị số.
// env cho phép gán a=1 khi canonical còn ký hiệu cạnh 'a'.
export function canonicalToNumber(canonical: string, env: Record<string, number> = {}): number {
  let s = canonical.trim();
  s = s.replace(/(\d)\s*√/g, "$1*√"); // "3√14" -> "3*√14" (chèn dấu nhân)
  s = s.replace(/√\s*(\d+)/g, "sqrt($1)"); // "√14" -> "sqrt(14)"
  return evalExpr(s, env);
}

// canonical có chứa ký hiệu chữ (vd 'a') không? (bỏ qua chữ trong "sqrt")
export function isNumericCanonical(canonical: string): boolean {
  const withoutSqrt = canonical.replace(/sqrt/gi, "");
  return !/[a-zA-Z]/.test(withoutSqrt);
}

// Nhân độ dài trong lời văn lên k lần — BẢO THỦ, chỉ khớp các mẫu SGK phổ biến.
// (Đây là ranh giới: Em 1 soạn bài rescale-được theo các mẫu này — xem "Lưu ý phối hợp".)
export function scaleLengthsInText(text: string, k: number): string {
  let out = text;
  // 1) hệ số của cạnh ký hiệu: "cạnh a" -> "cạnh (k)a"; "cạnh 2a" -> "cạnh (2k)a"
  // F1(b') PHÂN BIỆT HOA/THƯỜNG (bỏ cờ /i): 'a' là ký hiệu cạnh, 'A' là NHÃN đỉnh —
  // "cạnh A." không được biến thành "cạnh 2a" (làm hỏng nhãn hình học).
  out = out.replace(/(cạnh\s+)(\d*)a\b/g, (_m, pre: string, coef: string) => {
    const c = coef ? Number(coef) : 1;
    return `${pre}${c * k}a`;
  });
  // 2) số sau từ khoá ĐỘ DÀI, KHÔNG theo sau bởi chữ/số (tránh đụng "2a" đã xử lý ở trên).
  // F1(a) BỎ 'bằng' khỏi từ khoá: "bằng 60" (số đo góc), "bằng 8" (thể tích cho sẵn) KHÔNG
  // phải độ dài — nhân k vào chúng là sai. Chỉ giữ các danh từ chỉ độ dài thực sự.
  // F13 (a) NỚI RỘNG: cho phép bổ nghĩa "(đáy|bên|xung quanh|nghiêng)*" và liên từ "bằng"
  // giữa từ khoá và con số — "cạnh đáy bằng 3" trước đây bị bỏ sót (số không kề từ khoá) nên
  // câu giữ nguyên 3 trong khi đáp án ×k^bậc => mâu thuẫn. Thêm từ khoá chiều cao|đường cao.
  // F21 THÊM từ khoá độ dài "đường chéo|đường sinh|trung đoạn" (đều là độ dài bậc-1) để
  // "đường chéo bằng 2√3" -> "đường chéo bằng 4√3". Lookahead (?![\da-zA-Z]) đã cho dừng trước '√'.
  out = out.replace(
    /(cạnh|dài|cao|bán kính|đường kính|chiều cao|đường cao|đường chéo|đường sinh|trung đoạn)((?:\s+(?:đáy|bên|xung quanh|nghiêng|bằng))*\s+)(\d+(?:\.\d+)?)(?![\da-zA-Z])/gi,
    (_m, kw: string, mid: string, num: string) => `${kw}${mid}${Number(num) * k}`
  );
  // F19 3) gán cạnh TRẦN "AB = 3" (không có từ khoá độ dài) — tên đoạn = HAI chữ HOA.
  //    Chỉ khớp RHS là SỐ (không phải ký hiệu 'a' -> để assertFullyScaled lo) và không dính chữ/số.
  //    Lookahead (?![\da-zA-Z]) dừng sau số nguyên/thập-phân trọn vẹn (nhóm (?:\.\d+)? đã nuốt
  //    phần thập phân) và VẪN cho phép dấu chấm CÂU cuối vế ("AB = 3." -> "AB = 6.").
  out = out.replace(
    /\b([A-Z][A-Z])(\s*=\s*)(\d+(?:\.\d+)?)(?![\da-zA-Z])/g,
    (_m, seg: string, mid: string, num: string) => `${seg}${mid}${Number(num) * k}`
  );
  return out;
}

// HẬU-KIỂM ĐỘC LẬP VỚI TỪ KHOÁ (F17/F19/F21): mọi SỐ trong đề PHẢI co giãn ×k, trừ các số
// được MIỄN vì bản chất không co giãn tuyến tính:
//   (R) radicand/số mũ: đứng ngay sau √ , ^ , "sqrt(" , hoặc "căn …"  (vd '3' trong "2√3")
//   (S) hệ số ký hiệu: đứng ngay TRƯỚC một chữ thường latin (vd '2' trong "2a") — pattern-1 lo
//   (L) chỉ số nhãn: dính ngay sau một chữ/số (vd '1' trong "A1") — nhờ lookbehind loại luôn
// Số còn lại = "số đo". Đòi multiset(số đo bản co giãn) == multiset(số đo gốc ×k), nếu lệch => bỏ.
// KHÁC hẳn bản cũ (dò theo cùng danh sách từ khoá với scaler nên chung điểm mù): bản này thấy
// MỌI số nên bắt được cả "khoảng cách", "đường chéo", "AB = 3" mà scaler không nắm.
function measureNumbers(text: string): number[] {
  const out: number[] = [];
  // lookbehind (?<![\p{L}\d.]) : không khớp số dính ngay sau chữ/số/'.'  => tự loại (L) và tránh
  // cắt giữa số thập phân ("2.5" khớp trọn ở '2', không khớp lại ở '5').
  const re = /(?<![\p{L}\d.])\d+(?:\.\d+)?/gu;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    const before = text.slice(Math.max(0, i - 24), i);
    const after = text.slice(i + m[0].length);
    if (/^[a-z]/.test(after)) continue; // (S) hệ số ký hiệu "2a"
    if (/(?:√|\^|sqrt\s*\(|căn(?:\s+bậc\s+\S+)?(?:\s+của)?\s*)$/iu.test(before)) continue; // (R)
    out.push(Number(m[0]));
  }
  return out;
}
function assertNoUnscaledLength(original: string, scaled: string, k: number): void {
  const key = (arr: number[]) =>
    arr
      .map((x) => Math.round(x * 1e6) / 1e6)
      .sort((a, b) => a - b)
      .join(",");
  const expected = key(measureNumbers(original).map((x) => x * k));
  const actual = key(measureNumbers(scaled));
  if (expected !== actual) {
    throw new Error(
      `rescale: có SỐ ĐO trong đề chưa được co giãn ×${k} (scaler không nắm được cách diễn đạt: khoảng cách/đường chéo/cạnh trần…) — câu sẽ mâu thuẫn đáp án (bỏ qua §4.3)`
    );
  }
}

export function rescale(seed: Seed, k: number): Variant {
  if (seed.scale_degree === undefined) {
    throw new Error(`rescale cần seed.scale_degree (seed ${seed.id})`);
  }
  if (!NUMERIC_TYPES.has(seed.answer.type)) {
    throw new Error(
      `rescale chỉ định nghĩa cho đáp án số (rational|surd|ratio), gặp ${seed.answer.type} ở seed ${seed.id}`
    );
  }
  assertScalable(seed.statement_vi, seed.scale_degree); // F1(c) góc/độ, diện/thể tích số; RS-1/RS-2
  const degree = seed.scale_degree;
  const factor = Math.pow(k, degree);

  const v = cloneSeed(seed) as Variant;
  v.id = variantId(seed.id, "rescale");
  v.statement_vi = scaleLengthsInText(seed.statement_vi, k);
  assertFullyScaled(v.statement_vi); // F1(d) hậu-kiểm: không còn độ dài ký hiệu chưa co giãn
  assertNoUnscaledLength(seed.statement_vi, v.statement_vi, k); // F13(b) hậu-kiểm số-độ-dài sót
  // F22 CHỐT "KHÔNG-ĐỔI": nếu đáp án SẼ đổi (factor≠1) nhưng scaler KHÔNG đổi được gì trong
  // lời văn (câu y hệt bản gốc) thì chắc chắn KHÔNG có độ dài nào được co giãn — trong khi đáp
  // án lại ×factor ⇒ câu mâu thuẫn đáp án. Đây là điểm mù TỔNG QUÁT của cả cỗ máy co-giãn-ký-hiệu
  // (vốn chỉ nắm ký hiệu 'a'): ký hiệu khác 'a' (h,b,x), hệ số+ký hiệu (2x), đơn vị dính số
  // (3m,6cm,5dm), hay căn trần (√3) đều khiến câu GIỮ NGUYÊN. Thà bỏ còn hơn sai (§4.3).
  if (factor !== 1 && v.statement_vi === seed.statement_vi) {
    throw new Error(
      `rescale: đáp án co giãn ×${factor} nhưng lời văn KHÔNG đổi (scaler không nắm được độ dài: ký hiệu ≠'a', đơn vị dính số, hay căn trần) — câu sẽ mâu thuẫn đáp án (bỏ qua §4.3) — seed ${seed.id}`
    );
  }
  if (v.figure?.points) {
    v.figure.points = v.figure.points.map((p) => ({ ...p, x: p.x * k, y: p.y * k, z: p.z * k }));
  }

  // Đáp án
  if (isNumericCanonical(seed.answer.canonical)) {
    const nv = canonicalToNumber(seed.answer.canonical) * factor;
    // F1(e) toExactForm.isExact=false nghĩa là nó rơi xuống nhánh .toFixed(4) (MẤT MÁT).
    // Không lưu decimal cắt cụt; thay vào đó bọc ký hiệu k^degree quanh canonical gốc để
    // giữ đáp án CHÍNH XÁC (grader chuẩn hoá số học khi chấm).
    const exact = toExactForm(nv);
    v.answer = {
      ...seed.answer,
      canonical: exact.isExact ? exact.text : `${factor}*(${seed.answer.canonical})`,
    };
  } else {
    // Còn ký hiệu 'a': bọc hệ số k^degree; grader sẽ chuẩn hoá khi chấm.
    v.answer = { ...seed.answer, canonical: `${factor}*(${seed.answer.canonical})` };
  }
  v.variant = { kind: "rescale", parentSeedId: seed.id };
  return v;
}
