#!/usr/bin/env bash
# Chạy ĐO THẬT số end-to-end + baseline (điền các ô ⟦CHỜ ĐO⟧ trong báo cáo).
# CHẠY TRÊN MÁY CỦA BẠN (môi trường web của Claude chặn api.vilao.ai).
#
# Dùng:
#   VILAO_API_KEY=sk-... bash scripts/eval/chay-do-that.sh
#
# Nó đo trên TẬP TEST giữ riêng (65 ca, không dùng để tối ưu prompt) và ghi kết quả
# vào docs/nghien-cuu/eval-runs/default-test/ (report.md + results.json).
set -euo pipefail

if [ -z "${VILAO_API_KEY:-}" ]; then
  echo "❌ Chưa đặt VILAO_API_KEY. Chạy:  VILAO_API_KEY=sk-... bash scripts/eval/chay-do-that.sh"
  exit 1
fi

echo "== 0. Kiểm tra kết nối API (1 lệnh nhỏ) =="
node --input-type=module -e '
import { callVilao } from "./api/_lib/vilao.js";
try { const r = await callVilao("Trả lời ngắn.","Nói: OK",{maxTokens:10,timeoutMs:30000,apiKey:process.env.VILAO_API_KEY});
  console.log("   API OK →", JSON.stringify(r).slice(0,80)); }
catch(e){ console.error("   ❌ API lỗi:", String(e.message||e).slice(0,200)); process.exit(2); }
'

echo ""
echo "== 1. Baseline end-to-end trên TẬP TEST (system = LLM dịch→engine  vs  llm-direct = LLM giải thẳng) =="
echo "   (65 ca, mỗi ca 1–2 lần gọi LLM — chạy vài phút, tốn ít token)"
npm run eval:baseline -- --methods system,llm-direct --split default --use test

echo ""
echo "== 2. (Tuỳ chọn) Tối ưu prompt tiến hoá trên LLM THẬT, trên TẬP TRAIN =="
echo "   Bỏ qua nếu muốn tiết kiệm token. Bỏ ghi chú dòng dưới để chạy:"
echo "   # node scripts/prompt-opt/run.mjs --provider vilao --pop 8 --gen 6 --seed 42 --split default --use train"

echo ""
echo "✅ XONG. Số thật nằm ở:  docs/nghien-cuu/eval-runs/default-test/report.md"
echo "   Mở file đó, chép bảng số vào báo cáo §5.5 / §5.7 (thay các ô ⟦CHỜ ĐO⟧)."
echo "   Rồi tự commit:  git add docs/nghien-cuu/eval-runs/ && git commit -m \"eval: số end-to-end thật trên tập test\""
echo ""
echo "⚠️  Bảo mật: sau khi chạy xong, vào Vilao tạo key MỚI và huỷ key cũ (nó đã từng dán ra ngoài)."
