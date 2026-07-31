// dashboard/CheckAiSolution.tsx
// ⭐ ĐIỂM NHẤN PHỎNG VẤN — DEMO SỐNG "Kiểm tra lời giải AI".
// Giám khảo dán ĐỀ + LỜI GIẢI của một AI, chọn đáp án chuẩn, bấm "Chấm" → máy chấm phán
// Đúng / Sai / Không chắc kèm đáp án chuẩn để đối chiếu. Đây là bằng chứng SỐNG rằng máy
// chấm bảo vệ học sinh khỏi lời giải AI "trôi chảy nhưng sai".
// Mọi phép tính nằm ở hàm thuần checkAiSolution() (đã test); component chỉ thu input & bày kết quả.
import { useState } from "react";
import { checkAiSolution, type CheckResult } from "./check-ai-solution";
import type { Answer, AnswerType } from "../grader/types";

const ANSWER_TYPES: AnswerType[] = [
  "rational", "surd", "ratio", "point", "vector", "plane_eq", "line_eq", "boolean", "mcq",
];

// Ví dụ nạp sẵn để demo chạy được ngay (điền cả đề, đáp án chuẩn, và một lời giải AI mẫu).
const PRESETS: { label: string; de: string; canonical: string; type: AnswerType; ai: string }[] = [
  {
    label: "AI giải ĐÚNG",
    de: "Cho hình chóp S.ABCD có đáy là hình vuông cạnh a, SA vuông góc đáy. Tính khoảng cách từ A đến mặt phẳng (SBD).",
    canonical: "√6/3",
    type: "surd",
    ai: "Dựng AH vuông góc BD, rồi AK vuông góc SH... Sau khi tính, khoảng cách bằng \\boxed{\\dfrac{\\sqrt6}{3}}.",
  },
  {
    label: "AI tự tin nhưng SAI",
    de: "Cho hình chóp S.ABCD... Tính khoảng cách từ A đến mặt phẳng (SBD).",
    canonical: "√6/3",
    type: "surd",
    ai: "Lời giải dài, nhiều bước, lập luận nghe rất thuyết phục, kết luận dứt khoát: \\boxed{5}.",
  },
];

// Màu khung kết quả theo verdict.
const BADGE: Record<CheckResult["verdict"], { bg: string; fg: string; text: string }> = {
  correct: { bg: "#dcfce7", fg: "#166534", text: "ĐÚNG" },
  incorrect: { bg: "#fee2e2", fg: "#991b1b", text: "SAI" },
  unsure: { bg: "#fef9c3", fg: "#854d0e", text: "KHÔNG CHẮC" },
};

export function CheckAiSolution() {
  const [de, setDe] = useState(PRESETS[0].de);
  const [canonical, setCanonical] = useState(PRESETS[0].canonical);
  const [type, setType] = useState<AnswerType>(PRESETS[0].type);
  const [ai, setAi] = useState(PRESETS[0].ai);
  const [result, setResult] = useState<CheckResult | null>(null);

  function loadPreset(i: number) {
    const p = PRESETS[i];
    setDe(p.de);
    setCanonical(p.canonical);
    setType(p.type);
    setAi(p.ai);
    setResult(null);
  }

  function onCheck() {
    const truth: Answer = { canonical: canonical.trim(), type };
    setResult(checkAiSolution(truth, ai)); // gọi hàm thuần đã test
  }

  const badge = result ? BADGE[result.verdict] : null;

  return (
    <section style={box}>
      <h2 style={{ marginTop: 0 }}>Demo sống: Kiểm tra lời giải AI</h2>
      <p style={{ color: "#555", marginTop: 0 }}>
        Dán đề và lời giải của một AI, chọn đáp án chuẩn, rồi bấm <b>Chấm</b>. Máy chấm sẽ phán
        lời giải <b>Đúng / Sai / Không chắc</b> — bảo vệ học sinh khỏi lời giải "trôi chảy nhưng sai".
      </p>

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 600, marginRight: 8 }}>Ví dụ nạp sẵn:</span>
        {PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => loadPreset(i)} style={{ marginRight: 8, cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>

      <label style={lbl}>Đề bài (để đối chiếu — máy chấm chỉ so đáp án, không cần đọc đề)</label>
      <textarea value={de} onChange={(e) => setDe(e.target.value)} rows={3} style={ta} />

      <label style={lbl}>Lời giải của AI (dán nguyên văn; AI thường chốt đáp án trong \boxed)</label>
      <textarea value={ai} onChange={(e) => setAi(e.target.value)} rows={5} style={ta} />

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
        <div>
          <label style={lbl}>Đáp án chuẩn</label>
          <input value={canonical} onChange={(e) => setCanonical(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>Dạng đáp án</label>
          <select value={type} onChange={(e) => setType(e.target.value as AnswerType)} style={inp}>
            {ANSWER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button onClick={onCheck} style={btn}>Chấm</button>
      </div>

      {result && badge && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: badge.bg, color: badge.fg }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{badge.text}</div>
          <div style={{ marginTop: 6 }}>
            Máy đọc đáp án của AI: <b>{result.extracted ?? "(không trích được đáp án)"}</b>
          </div>
          <div>
            Đáp án chuẩn của bài: <b>{result.canonicalTruth}</b>
          </div>
          <div style={{ marginTop: 6, color: "#333" }}>{result.reason}</div>
        </div>
      )}
    </section>
  );
}

const box: React.CSSProperties = {
  border: "2px solid #2563eb",
  borderRadius: 12,
  padding: 16,
  margin: "24px 0",
  fontFamily: "system-ui, sans-serif",
};
const lbl: React.CSSProperties = { display: "block", fontWeight: 600, margin: "8px 0 4px" };
const ta: React.CSSProperties = { width: "100%", fontFamily: "inherit", padding: 8, boxSizing: "border-box" };
const inp: React.CSSProperties = { padding: 8, fontFamily: "inherit" };
const btn: React.CSSProperties = { padding: "8px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer" };
