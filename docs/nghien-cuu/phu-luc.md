# Phụ lục — Báo cáo nghiên cứu

*Kèm theo `bao-cao-nghien-cuu.md`. Mọi nội dung trích/đối chiếu trực tiếp từ mã nguồn và từ rổ benchmark thật.*

---

## Phụ lục A — Lược đồ *Construction Plan* JSON

Đây là "hợp đồng dữ liệu" giữa khối Neural (LLM dịch) và khối Symbolic (engine). LLM xuất một JSON theo lược đồ này; engine kiểm bằng schema (`RunPlanSchema` / `AnalysisPlanSchema`, kiểm bằng zod) trước khi chạy.

**Các trường cấp cao (plan hình học):**

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `solidName` | string | Tên khối (vd `"S.ABCD"`) — nhãn hiển thị |
| `ops` | mảng | Các thao tác **dựng**: khai báo điểm/mặt/cạnh… |
| `asserts` | mảng | Các **ràng buộc** của đề (⊥, ∥, khoảng cách…) — engine dùng để tự kiểm |
| `queries` | mảng | Các **đại lượng cần tính** (mỗi câu hỏi = một phần tử) |
| `scaleSymbol` | string (1 chữ) | *Tuỳ chọn* — chỉ khi dùng "thang chữ" (vd `"a"`); engine ghép `×aᵏ` vào đáp |

**`ops` thường gặp:**
- `{ "op":"oxyz_point", "name":"A", "at":[x,y,z] }` — khai một điểm bằng toạ độ.
- `{ "op":"oxyz_plane", "name":"ABCD", "by":{ "form":"three_points", "a":"A","b":"B","c":"C" } }` — mặt phẳng qua 3 điểm.
- `{ "op":"edge", "from":"S", "to":"A" }` — cạnh (để dựng hình & vẽ).

**`asserts` thường gặp:**
- `{ "relation":"perp", "args":["SA","ABCD"] }` — SA ⊥ (ABCD).
- `{ "relation":"dist", "args":["S","A"], "value":2 }` — |SA| = 2.

**`queries` thường gặp:** `kind ∈ { distance, angle, volume, area, equation, relative_position, intersection, point_coord, sphere_metric, volume_ratio }` (bài giải tích dùng khối `analyze` với `kind ∈ { optimize, optimize_multi, integrate, solve, solve_multi, eval }`).

*Nguyên tắc: LLM CHỈ khai toạ độ + ràng buộc + câu hỏi; nó KHÔNG điền đáp số. Engine mới tính.* (Mã: `api/_lib/kernel/**`, `api/_lib/kernel-bridge/translatorPrompt.js`.)

---

## Phụ lục B — Ví dụ end‑to‑end (đề → plan → đáp dạng căn)

Ca thật trong benchmark (`bench/golden/cap-dist-A-SCD-canh2-SA2.json`), minh hoạ trọn vẹn nguyên tắc "LLM dịch — engine tính".

**Đề:** *Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 2, SA vuông góc với mặt phẳng đáy và SA = 2. Tính khoảng cách từ A đến mặt phẳng (SBD).*

**Khối Neural dịch → Plan JSON (rút gọn):** LLM **tự chọn hệ toạ độ** đặt `A=(0,0,0)`, `B=(2,0,0)`, `C=(2,2,0)`, `D=(0,2,0)`, `S=(0,0,2)`; khai mặt `(SBD)` qua 3 điểm; ghi ràng buộc `SA⊥(ABCD)`, `|SA|=2`, `|AB|=2`; câu hỏi `{ "kind":"distance", "a":"A", "b":"SBD" }`.

**Khối Symbolic tính (chạy thật `solvePlan`):**
```
ok: true
answers: [ { kind: "distance", text: "2√3/3", approx: 1.1547005383792515 } ]
```

**Nhận xét:** đáp là **dạng căn chính xác `2√3/3`** (không phải `1.1547…` làm tròn). LLM không hề tính khoảng cách — nó chỉ *toạ‑độ‑hoá* bài toán; engine mới dựng mặt phẳng, tính khoảng cách điểm–mặt bằng số học chính xác và tự kiểm. Đây là điểm khác biệt cốt lõi so với để LLM tự giải.

---

## Phụ lục C — Cổng từ chối: 3 câu hỏi (nguyên tắc)

Trích/tóm lược trung thực từ `api/_lib/kernel-bridge/translatorPrompt.js` (dòng 8–63). Cổng gác **theo TÍNH CHẤT toán học, không theo TỪ KHOÁ**; muốn từ chối, LLM trả đúng `{ "abstain": true, "abstain_reason": "<lý do ngắn>" }`.

> **CÂU 1 — Đáp có phụ thuộc THANG TUYỆT ĐỐI mà đề KHÔNG cho không?**
> Góc và tỉ số bất biến theo cỡ ⇒ luôn qua. Chỉ khoảng cách/độ dài/diện tích/thể tích mới cần thang.
> *Ô CẤM:* hỏi đại lượng đo tuyệt đối nhưng chỉ cho **tỉ số** giữa các cạnh (vd `AD=2BC`) hoặc **thiếu kích thước** ⇒ **TỪ CHỐI**. *Ngoại lệ "thang chữ":* nếu cỡ cho bằng **một chữ** duy nhất (vd `a`) và hình rắn tới đồng dạng ⇒ qua cổng, dùng `scaleSymbol`.

> **CÂU 2 — Quan hệ cần kết luận có BẤT BIẾN AFFINE không, hoặc hình có XÁC ĐỊNH TỚI ĐỒNG DẠNG không?**
> Quan hệ bất biến affine (song song, thẳng hàng, đồng phẳng, tỉ số chia đoạn, giao điểm/giao tuyến, viết phương trình…): đúng tại **một** hệ toạ độ tự chọn ⇒ đúng tổng quát ⇒ kiểm một toạ độ = **chứng minh hợp lệ**. Quan hệ KHÔNG affine (vuông góc, bằng nhau, "là tam giác cân/đều"): chỉ mô hình khi hình đã cố định tới đồng dạng.

> **CÂU 3 — Engine có KIỂM được không?**
> Phải quy được về ≥1 truy vấn trả số/đối tượng, hoặc một khẳng định kiểm tại toạ độ cụ thể.
> *Ô CẤM:* quỹ tích/tập hợp điểm phải suy ra, bài biện luận/định tính, bất đẳng thức, tham số dạng chữ tổng quát, hoặc đề thiếu dữ kiện tới mức không dựng nổi ⇒ **TỪ CHỐI**.

**Tóm tắt:** qua cả 3 câu (không dính ô cấm nào) ⇒ mô hình bình thường; dính **bất kỳ** ô cấm ⇒ `abstain`. Đây là cơ chế *"thà từ chối còn hơn bịa"* — nền tảng cho chỉ số an toàn *confidently‑wrong* thấp.

---

## Phụ lục D — Thẻ mô tả bộ dữ liệu (Datasheet)

Theo khung *Datasheets for Datasets* (rút gọn).

- **Động cơ:** chưa có benchmark hình học không gian **tiếng Việt** có đáp kiểm chứng được; bộ này lấp khoảng trống đó và phục vụ đánh giá tất định.
- **Thành phần:** mỗi ca `{ id, source, text, plan, expect:{ ok, answers:[{kind,text}] } }`. Hiện **66 ca**: **40 synthetic** (đề gốc tự soạn) + **25 capture** + 1 smoke. Bao phủ đa diện · khoảng cách điểm–mặt · mặt cầu · nón/trụ · nón cụt/chóp cụt · tỉ số thể tích · giao điểm. Đáp lưu **dạng căn/π chính xác** (vd `2√3/3`, `8√2π/3`, `52π`).
- **Thu thập & gán nhãn (trạng thái THẬT):** 40 ca *synthetic* là **đề gốc tự soạn**, đáp **kiểm hai chiều** (tính bằng công thức độc lập ↔ engine tính lại; chỉ nạp khi khớp) qua công cụ `scripts/label/`; 25 ca *capture* do engine sinh. **Hiện chưa có đề từ SGK/đề thi thật** — đây là phần **mở rộng do nhóm (học sinh)**: nhập đề thật, **ghi nguồn**, tự giải tay ra đáp, rồi dùng `scripts/label/` đối chiếu và sửa `source` thành nguồn thật.
- **Kiểm định chất lượng:** mọi ca phải **PASS** `npm run bench:gate` (engine‑replay tất định). Ca engine giải sai/lệch **không** được nạp làm golden.
- **Phân phối & bảo trì:** công bố kèm mã nguồn & tài liệu; mở rộng dần theo các dạng còn thiếu (góc, thiết diện, tương giao, mặt cầu, tròn xoay, bài "thang chữ").
- **Hạn chế:** cỡ hiện tại nhỏ (66); toàn bộ là ca máy‑sinh, chưa có đề thật — đang mở rộng; phân bố dạng bài chưa cân bằng.

---

## Phụ lục E — Ảnh giao diện 3D *(chờ bổ sung)*

Chụp từ ứng dụng đang chạy (`npm run dev`) cho một vài ca tiêu biểu: nhập đề → hình 3D dựng bởi engine. *(Cần môi trường chạy app + cấu hình; sẽ bổ sung khi dựng demo.)*
