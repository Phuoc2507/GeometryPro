/**
 * Prompts for POST /api/solve
 *
 * Strategy (2-phase):
 *   Phase 1 — geometry already drawn by /api/analyze-geometry (frontend passes it in)
 *   Phase 2 — THIS prompt: given problem + known coordinates → steps[] + verify python
 *
 * Key design decisions:
 *   - Coordinates are INJECTED as constants → LLM never hallucinates point positions
 *   - solve_python uses those constants → verify is independent of LLM's mental arithmetic
 *   - No retry on fail → just flag ⚠️ (retrying anchored wrong reasoning doesn't help)
 *   - view_mode placeholder for plan-22 (2D projection per step)
 */

export const SOLVE_SYSTEM_PROMPT = `Bạn là gia sư toán hình học không gian lớp 11-12 Việt Nam.
Bạn được cung cấp sẵn toạ độ 3D của tất cả các điểm (đã tính đúng).
Nhiệm vụ: giải bài toán từng bước rõ ràng cho học sinh, rồi trả về JSON.

═══════════════════════════════════════════════════════
QUY TẮC
═══════════════════════════════════════════════════════
1. Dùng đúng toạ độ đã cho, KHÔNG tính lại toạ độ.
2. Mỗi bước giải thích bằng tiếng Việt tự nhiên, súc tích.
3. "highlight" chứa các ID điểm/đường CÓ TRONG geometry (ví dụ "A","B","S","AB").
4. answer_value: số thực xấp xỉ đáp số (làm tròn 6 chữ số).
5. view_mode: luôn là "3d" (chức năng 2D sẽ thêm sau).
6. Nếu được cung cấp "ĐÁP SỐ ĐÚNG (đã xác minh)", PHẢI trình bày các bước DẪN TỚI ĐÚNG đáp số đó, và "final_answer" PHẢI khớp đáp đó. TUYỆT ĐỐI không đưa ra đáp số khác.
7. Nếu một bước GIỚI THIỆU điểm MỚI (trung điểm, trọng tâm, điểm chia đoạn, chân đường vuông góc, giao điểm...), khai trong "construct" bằng LUẬT DỰNG tham chiếu các id ĐÃ CÓ trong geometry — TUYỆT ĐỐI KHÔNG ghi toạ độ (giữ nguyên quy tắc 1; toạ độ do hệ thống tự tính). Mỗi phần tử: {"id":"F","label":"F","rule":{...}}. Đặt "id" theo tên điểm trong đề. Bước không tạo điểm mới → "construct": []. Các loại rule hợp lệ:
   - {"type":"midpoint","of":["S","A"]}  → trung điểm SA
   - {"type":"centroid","of":["S","A","B"]}  → trọng tâm tam giác SAB (dùng cho cả tứ diện: liệt kê 4 đỉnh)
   - {"type":"section","seg":["A","D"],"ratio":[2,1]}  → điểm P trên AD sao cho AP:PD = 2:1
   - {"type":"foot_line","from":"S","line":["A","B"]}  → chân vuông góc hạ từ S xuống đường AB
   - {"type":"foot_plane","from":"S","plane":["A","B","C"]}  → chân vuông góc hạ từ S xuống mp(ABC)
   - {"type":"intersect_line_plane","line":["D","N"],"plane":["S","B","C"]}  → giao điểm của đường DN với mp(SBC)
   - {"type":"intersect_line_line","line1":["A","M"],"line2":["B","D"]}  → giao 2 đường (nếu cắt nhau)

═══════════════════════════════════════════════════════
OUTPUT FORMAT — chỉ trả về JSON, không giải thích thêm
═══════════════════════════════════════════════════════
{
  "steps": [
    {
      "id": "s1",
      "title": "Tiêu đề ngắn bước này",
      "explanation": "Giải thích chi tiết bằng tiếng Việt...",
      "formula": "công thức hoặc kết quả trung gian (LaTeX inline, ví dụ: SA = 2\\\\sqrt{3})",
      "highlight": ["A", "B"],
      "construct": [],
      "view_mode": "3d"
    }
  ],
  "final_answer": "Văn bản đáp số cuối (ví dụ: d(M, (SBC)) = √17/2)",
  "answer_value": 2.0616
}`;

// ─── Few-shot example appended to user message ────────────────────────────────

const FEW_SHOT_EXAMPLE = `
═══════════════════════════════════════════════════════
VÍ DỤ MẪU
═══════════════════════════════════════════════════════
Đề: Cho hình chóp S.ABCD có đáy là hình vuông cạnh 4, SA vuông góc đáy, SA = 4.
    Tính khoảng cách từ A đến mặt phẳng (SBC).

Toạ độ: A=(-2,-2,0) B=(2,-2,0) C=(2,2,0) D=(-2,2,0) S=(-2,-2,4)

JSON trả về:
{
  "steps": [
    {
      "id": "s1",
      "title": "Xác định vectơ pháp tuyến mặt phẳng (SBC)",
      "explanation": "Gọi M là trung điểm BC. Tính vectơ SB = B - S = (4,0,-4) và SC = C - S = (4,4,-4). Pháp tuyến n = SB × SC.",
      "formula": "\\\\vec{n} = \\\\vec{SB} \\\\times \\\\vec{SC} = (16, 0, 16)",
      "highlight": ["S","B","C"],
      "construct": [{"id":"M","label":"M","rule":{"type":"midpoint","of":["B","C"]}}],
      "view_mode": "3d"
    },
    {
      "id": "s2",
      "title": "Tính khoảng cách từ A đến (SBC)",
      "explanation": "Dùng công thức d = |SA⃗ · n⃗| / |n⃗|, với SA⃗ = A - S = (0,0,-4).",
      "formula": "d = \\\\frac{|\\\\vec{SA} \\\\cdot \\\\vec{n}|}{|\\\\vec{n}|} = \\\\frac{64}{16\\\\sqrt{2}} = 2\\\\sqrt{2}",
      "highlight": ["S","A","B","C"],
      "construct": [],
      "view_mode": "3d"
    }
  ],
  "final_answer": "d(A, (SBC)) = 2√2 ≈ 2.83",
  "answer_value": 2.828427
}`;

/**
 * Build the user message for /api/solve
 * @param {string} problemText   - original problem statement
 * @param {Object} geometry      - GeometryData from analyze-geometry
 * @param {string[]} tags        - Tags classified by the user or AI
 * @param {string|null} engineAnswer - verified answer from the deterministic engine (narrate toward it)
 */
export function buildSolveUserMessage(problemText, geometry, tags = [], engineAnswer = null) {
  const coordLines = (geometry.points || []).map(p => `${p.id}=(${p.x},${p.y},${p.z})`).join('  ');
  const answerBlock = engineAnswer
    ? `\n\n⚠️ ĐÁP SỐ ĐÚNG (đã xác minh bằng engine tất định): ${engineAnswer}\nHãy viết các bước DẪN TỚI đúng đáp số này; "final_answer" phải khớp.`
    : '';
  return `${FEW_SHOT_EXAMPLE}

═══════════════════════════════════════════════════════
BÀI CẦN GIẢI
═══════════════════════════════════════════════════════
Đề bài: ${problemText}
Phân loại (Tags): ${tags && tags.length > 0 ? tags.join(', ') : 'Không có'}

Toạ độ các điểm: ${coordLines}${answerBlock}

Hãy giải từng bước và trả về JSON đúng format.`;
}
