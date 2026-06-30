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
4. solve_python: viết code Python tính đáp số cuối, in ra "SOLVE_RESULT:<số thực>".
   Các biến điểm (A, B, C, S, ...) đã được định nghĩa sẵn là tuple (x,y,z).
   Các hàm helper đã có sẵn: vsub(a,b), vadd(a,b), vdot(a,b), vcross(a,b), vnorm(a), math.sqrt.
   Không cần import gì thêm, không định nghĩa lại toạ độ.
5. answer_value: số thực xấp xỉ đáp số (làm tròn 6 chữ số).
6. view_mode: luôn là "3d" (chức năng 2D sẽ thêm sau).

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
      "view_mode": "3d"
    }
  ],
  "final_answer": "Văn bản đáp số cuối (ví dụ: d(M, (SBC)) = √17/2)",
  "answer_value": 2.0616,
  "solve_python": "# Code SymPy — toạ độ đã có sẵn\\nSB = B - S\\n...\\nprint(f\\"SOLVE_RESULT:{float(result):.6f}\\")"
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
      "explanation": "Tính vectơ SB = B - S = (4,0,-4) và SC = C - S = (4,4,-4). Pháp tuyến n = SB × SC.",
      "formula": "\\\\vec{n} = \\\\vec{SB} \\\\times \\\\vec{SC} = (16, 0, 16)",
      "highlight": ["S","B","C"],
      "view_mode": "3d"
    },
    {
      "id": "s2",
      "title": "Tính khoảng cách từ A đến (SBC)",
      "explanation": "Dùng công thức d = |SA⃗ · n⃗| / |n⃗|, với SA⃗ = A - S = (0,0,-4).",
      "formula": "d = \\\\frac{|\\\\vec{SA} \\\\cdot \\\\vec{n}|}{|\\\\vec{n}|} = \\\\frac{64}{16\\\\sqrt{2}} = 2\\\\sqrt{2}",
      "highlight": ["S","A","B","C"],
      "view_mode": "3d"
    }
  ],
  "final_answer": "d(A, (SBC)) = 2√2 ≈ 2.83",
  "answer_value": 2.828427,
  "solve_python": "SB = vsub(B,S)\\nSC = vsub(C,S)\\nn = vcross(SB,SC)\\nSA_vec = vsub(A,S)\\nd = abs(vdot(SA_vec,n)) / vnorm(n)\\nprint(f\\"SOLVE_RESULT:{d:.6f}\\")"
}`;

/**
 * Build the user message for /api/solve
 * @param {string} problemText - original problem statement
 * @param {Object} geometry    - GeometryData from analyze-geometry
 * @param {string[]} tags      - Tags classified by the user or AI
 */
export function buildSolveUserMessage(problemText, geometry, tags = []) {
  const coordLines = (geometry.points || [])
    .map(p => `${p.id}=(${p.x},${p.y},${p.z})`)
    .join('  ');

  return `${FEW_SHOT_EXAMPLE}

═══════════════════════════════════════════════════════
BÀI CẦN GIẢI
═══════════════════════════════════════════════════════
Đề bài: ${problemText}
Phân loại (Tags): ${tags && tags.length > 0 ? tags.join(', ') : 'Không có'}

Toạ độ các điểm: ${coordLines}

Hãy giải từng bước và trả về JSON đúng format.`;
}

/**
 * Build the Python preamble injected before LLM's solve_python.
 *
 * Uses only stdlib `math` — no SymPy — to avoid sandbox import-chain issues.
 * Provides helper functions + point coordinates as (x, y, z) tuples.
 * LLM is instructed to use these helpers (see few-shot in buildSolveUserMessage).
 *
 * @param {Object} geometry - GeometryData
 * @returns {string} Python code string
 */
export function buildCoordPreamble(geometry) {
  const lines = [
    'import math',
    '# ── vector helpers ──',
    'def vadd(a,b): return tuple(x+y for x,y in zip(a,b))',
    'def vsub(a,b): return tuple(x-y for x,y in zip(a,b))',
    'def vdot(a,b): return sum(x*y for x,y in zip(a,b))',
    'def vcross(a,b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])',
    'def vnorm(a): return math.sqrt(vdot(a,a))',
    '# ── point coordinates (x, y, z) ──',
  ];
  for (const p of (geometry.points || [])) {
    lines.push(`${p.id} = (${p.x}, ${p.y}, ${p.z})`);
  }
  return lines.join('\n');
}
