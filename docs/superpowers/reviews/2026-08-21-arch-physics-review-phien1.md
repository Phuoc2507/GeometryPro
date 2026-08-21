# Phản biện kiến trúc + physics pack (phiên 1, 21/08/2026)

> Báo cáo của agent phản biện (lăng kính kiến trúc sư + giáo viên Vật lý).
> Tài liệu soi: spec kiến trúc, rollout plan, spec Lý, plan Lý (đầy đủ), đối
> chiếu spec Hóa cho các điểm giao. Baseline 1072 test xanh tự chạy xác nhận.

## Kiểm chứng nền (đều ĐÚNG, có trích dòng code)

- Mọi quirk frontend spec Lý viện dẫn đều có thật: `AnimatedAgent.tsx:67-74`
  (ưu tiên `equations`, `path` split theo dấu phẩy), `:94` (`t^2` chỉ replace
  1 lần → phải phát `t*t`), `:109-116` (thiếu `landing_point` → agent nhảy về
  vị trí đầu), `:64` (t = giây kể từ track.start), map trục đứng z→three.y.
- `GeometryData.tags` tồn tại, tự persist nguyên khối vào localStorage +
  Supabase → claim zero-migration ĐỨNG VỮNG.
- Dry-run v2 dev-only đúng như mô tả. `scalar.ts` đúng "hữu tỉ + một căn".
- **10/10 bài mẫu Lý tính lại tay ĐÚNG**; các chuỗi contract ("2√2", "20√5",
  "1/2 + √13/2"…) khớp hành vi displayExact/recognize THẬT (đã chạy code).
- `solvePoly` KHÔNG tồn tại (chỉ có `solveQuadratic`) — spec kiến trúc ghi sai.

## Finding CAO

- **[F1]** Route mới `/api/analyze-problem` trong spec KHÔNG có tầng
  quota/billing (v2 bọc resolveAiAccess/withQuota/refundAiUsage/logBrokenProblem
  — spec không nhắc chữ nào) → nếu code đúng theo spec, người dùng + khách gọi
  LLM không giới hạn, thêm classifier là lượt gọi phụ mỗi request. Sửa: route
  mới PHẢI bọc y như v2 cho mọi nhánh LLM; định nghĩa feature/action cho
  physics/chem; nghiệm thu P2 thêm "vượt quota bị chặn giống v2".
- **[F2]** Hai spec mâu thuẫn về đơn vị (kiến trúc: "engine quy đổi SI ở
  schema-parse"; spec Lý: "engine không đổi đơn vị, LLM chỉ đổi lượng nhỏ") —
  bài "54 km/h, a=3 m/s²" buộc LLM chia 3,6 = LLM tính hộ, vi phạm R1. Sửa:
  thêm unit per-quantity vào schema (vd `v0Unit?: 'm/s'|'km/h'`), engine đổi
  bằng hữu tỉ exact ×5/18. Phải xong TRƯỚC khi thi công P1 (đụng schema).
- **[F3]** Thiếu query `time_when_velocity` → nửa lớp bài "biến đổi đều"
  (hãm phanh/dừng lại, đạt vận tốc cho trước) không giải được mà không vi phạm
  R1; mô hình parabol sau khi dừng cho xe chạy lùi không ai bắt. Sửa: thêm
  query (nghiệm tuyến tính, ~15 dòng), ghi giới hạn vào §11, thêm contract P11
  bài hãm phanh.

## Finding VỪA

- **[F4]** Spec kiến trúc + rollout ghi sai: `solvePoly` → `solveQuadratic`;
  physics không dùng `expr.ts`; "t giây thật trên [start,end]" → sửa thành
  "giây kể từ track.start".
- **[F5]** Chem: 2 schema plan + 2 ChemScene khác hẳn nhau giữa kiến trúc §8.1/§6.3
  và chem spec §10/§11. CHỐT: theo chem spec cả hai; kiến trúc sửa thành pointer.
- **[F6]** Chem asserts dữ-kiện-đề exact không dung sai → violation oan với đề
  làm tròn. CHỐT hai tầng: bảo toàn nội bộ EXACT; asserts từ đề tol 1e-3
  (trùng kết luận F10 của phản biện Hóa).
- **[F7]** Contract response: PhysicsResult thiếu `trace`, tên `geometry` vs
  `scene`. CHỐT: bridge alias `scene = result.geometry`, `trace` tổng hợp từ
  checks; checks/charts/meta là mở rộng hợp lệ.
- **[F8]** Plan Lý Task 4 buildScene KHÔNG khớp scene spec Lý hứa (thiếu điểm
  đỉnh, điểm gặp, giá trị trong label) trong khi tiêu chí §13.3 đòi khớp. CHỐT
  (rẻ nhất): hạ spec §8.1/§8.4/§13.3 xuống mức plan, các mốc "đỉnh/điểm gặp/
  giá-trị-trong-label" → v1.
- **[F9]** Gate "tsc sạch" KHÔNG typecheck `api/_lib/kernel/**` (tsconfig
  không include) — gate rỗng; đã có sẵn vi phạm minh họa: buildScene phát
  Curve3D thiếu field bắt buộc `params`. Sửa: thêm tsconfig.kernel.json vào
  nghi thức kiểm + scene phát `params: {}`.
- **[F10]** Tags DB Hóa không theo registry 4 tầng → bị isKnownTag drop lặng
  lẽ (trùng F14 phản biện Hóa — đang được sửa); rollout P0 ghi "10 tag Hóa",
  đếm đúng là 11.
- **[F11]** "Ném thẳng đứng xuống" không có đường sạch: thêm góc âm
  (−30,−45,−60,−90) vào EXACT_TRIG + 1 bài contract ném xuống + ghi vào §3.
- **[F12]** Mapping "quãng đường = position_at" của P2 chỉ đúng khi v không
  đổi dấu — ghi chú cạnh P2 kẻo few-shot dạy LLM sai hệ thống; `path_length` → v1.
- **[F13]** Rollout P0 bảo "chốt điểm phân vân cuối spec kiến trúc" nhưng spec
  kiến trúc KHÔNG có mục đó → thêm "§14 — Điểm phân vân & phán quyết" chép 10
  phán quyết C1–C10 vào.

## Finding THẤP

- **[F14]** Rollout P2 dẫn `scripts/e2e-kinematic.mjs` không tồn tại → đổi
  sang `scripts/e2e-advance.mjs`.
- **[F15]** Plan Lý Task 6 đếm 12 `it` trong compute.test.ts, đúng là 11 →
  tổng ≈ 40.
- **[F16]** `meet_time` inclusive t=t0: hai xe cùng xuất phát cùng chỗ trả
  "gặp tại t=0" — ghi chú vào §12.
- **[F17]** Prefilter classifier thêm biến thể `m/s2`, `m/s^2`. Đã kiểm đề
  radar thật: prefilter tự chốt geometry đúng.
- **[F18]** `impact_velocity component:'y'` trả số âm — quy ước trình bày để
  prompt v1.

## Phán quyết 10 điểm phân vân kiến trúc (C) — đã duyệt

1. C1: Route MỚI `/api/analyze-problem`, v2 đóng băng, kèm điều kiện F1.
2. C2: Chấp nhận cross-import v0 (`solver1d`, `recognize`, `compute/answer`;
   BỎ `expr`); TODO mathlib.
3. C3: Giữ quy tắc ranh giới §4.2 + few-shot radar + biến thể regex; mơ hồ → geometry.
4. C4: Grade theo "lớp thường-gặp-trong-đề" + alias sau; registry là nguồn
   sự thật duy nhất.
5. C5: molarVolume default 24,79, literal-union {22.4, 24.79}; answer ghi mốc.
   (Chờ user xác nhận theo nhật ký D4.)
6. C6: `answers[].unit` do engine ghi cho Lý/Hóa; Toán giữ cơ chế cũ.
7. C7: Field chuẩn là `scene`; nhánh Toán kèm `geometry` alias.
8. C8: EXACT_TRIG = {0,±30,±45,±60,±90}; góc lẻ float+recognize, KHÔNG CAS.
9. C9: ChemScene theo chem spec (events-based); render v0 = 2D overlay,
   không r3f.
10. C10: tol hai tầng như F6.

## Phán quyết 6 điểm mở spec Lý (D)

1. Đơn vị: unit per-quantity, engine đổi exact ×5/18 (= F2).
2. Playback 3–15s: GIỮ; thêm bước thử canvas vào P2.
3. meet_time 2 nghiệm: trả nghiệm đầu + dòng trace "còn nghiệm t₂=…".
4. timeOrigin: không vào v0; việc trình bày của prompt v1.
5. position2d: tách 2 query, không thêm query mới.
6. charts: v0 giữ trong PhysicsResult; hướng v1 = field optional
   `charts?` trên GeometryData; KHÔNG nhét vào tags; v0 mất charts khi lưu
   lịch sử — ghi rõ.

## Kết luận

- **P1 (physics engine): thi công được SAU khi sửa docs**: F2 (schema unit),
  F3 (time_when_velocity + P11), F8 (chốt scene theo plan), F9 (params:{} +
  tsconfig.kernel), F11 (góc âm + bài ném xuống).
- **P2 (route/bridge): KHÔNG thi công theo spec hiện tại** tới khi sửa F1,
  F2, F7, F14.
- **P3/P4 (Hóa): chờ chốt F5, F6, F10** (đang được vòng sửa Hóa xử lý).
- **P0 (taxonomy): làm được ngay** sau F10/F13.
- Danh sách sửa TỐI THIỂU trước khi 2 agent code: **F1, F2, F3, F5, F6, F8**.
