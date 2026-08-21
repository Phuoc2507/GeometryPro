# Phụ lục — Ví dụ minh hoạ "kiểm hai chiều" (lời giải tay ↔ engine)

> **Mục đích:** làm rõ, bằng ví dụ cụ thể, ý nghĩa của tuyên bố trung tâm về liêm chính dữ liệu:
> mỗi ca golden có đáp được **hai con đường độc lập** cùng khẳng định — (1) **lời giải toán học của con người** và (2) **engine ký hiệu tất định** — chỉ nạp khi hai đáp **khớp bằng số**. Đây không phải "engine tự chấm engine": con người dựng lời giải bằng công thức hình học cổ điển, engine tính bằng toạ-độ-hoá + đại số chính xác; hai phương pháp khác nhau gặp nhau ở một kết quả.
>
> Bốn ví dụ dưới trải các dạng: thể tích "thang chữ", khoảng cách điểm–mặt, góc, và thiết diện. Với mỗi ví dụ: **đề → lời giải tay → plan đưa cho engine → đáp engine → đối chiếu**.

---

## Ví dụ 1 — Thể tích tứ diện đều cạnh `a` (dạng "kích thước bằng chữ")

**Đề.** Cho tứ diện đều `ABCD` cạnh `a`. Tính thể tích khối tứ diện.

**Lời giải tay.** Thể tích tứ diện đều cạnh `a` có công thức quen thuộc
$$V = \frac{a^3}{6\sqrt2} = \frac{a^3\sqrt2}{12}.$$
(Có thể suy ra: diện tích đáy đều cạnh `a` là `a²√3/4`, chiều cao `h = a√(2/3) = a√6/3`, nên `V = (1/3)·(a²√3/4)·(a√6/3) = a³√2/12`.)

**Plan đưa cho engine** (toạ-độ-hoá tại cạnh = 1, khai báo `scaleSymbol: "a"`):
```json
{ "scaleSymbol": "a",
  "ops": [
    {"op":"oxyz_point","name":"A","at":[0,0,0]},
    {"op":"oxyz_point","name":"B","at":[1,0,0]},
    {"op":"oxyz_point","name":"C","at":["1/2","sqrt(3)/2",0]},
    {"op":"oxyz_point","name":"D","at":["1/2","sqrt(3)/6","sqrt(6)/3"]}],
  "queries":[{"kind":"volume","solid":"tetrahedron","points":["A","B","C","D"]}] }
```
**Đáp engine:** `a³·√2/12`.  **Đối chiếu:** khớp lời giải tay ✓  *(ca `case-volume-ad64f798`)*

---

## Ví dụ 2 — Khoảng cách điểm đến mặt phẳng

**Đề.** Cho hình chóp `S.ABC` có `SA ⊥` mặt đáy, `SA = 6`; tam giác `ABC` vuông tại `B` với `AB = 3`, `BC = 4`. Tính khoảng cách từ `A` đến mặt phẳng `(SBC)`.

**Lời giải tay.** Chọn hệ toạ độ `B(0;0;0)`, `A(3;0;0)`, `C(0;4;0)`, `S(3;0;6)` (vì `SA ⊥` đáy và `SA = 6` nên `S` nằm trên `A`, cao 6). Mặt `(SBC)` qua `B` có cặp vectơ `\vec{BS}=(3;0;6)`, `\vec{BC}=(0;4;0)`; pháp tuyến
$$\vec n = \vec{BS}\times\vec{BC} = (-24;\,0;\,12)\ \parallel\ (-2;0;1),$$
nên `(SBC): -2x + z = 0`. Khoảng cách
$$d(A,(SBC)) = \frac{|-2\cdot 3 + 0|}{\sqrt{(-2)^2+1^2}} = \frac{6}{\sqrt5} = \frac{6\sqrt5}{5}.$$

**Plan đưa cho engine:** dựng `A,B,C,S` theo toạ độ trên, mặt `(SBC)` qua ba điểm, truy vấn `{"kind":"distance","a":"A","b":"SBC"}`.
**Đáp engine:** `6√5/5`.  **Đối chiếu:** khớp ✓  *(ca `cap-dist-A-SBC-345-SA6`)*

---

## Ví dụ 3 — Góc giữa hai đường thẳng

**Đề.** Trong `Oxyz`, đường thẳng `a` qua `A(0;0;0)` có vectơ chỉ phương `\vec u=(1;0;0)`; đường thẳng `b` qua `B(2;0;3)` có vectơ chỉ phương `\vec v=(1;1;0)`. Tính góc giữa `a` và `b`.

**Lời giải tay.** Góc giữa hai đường thẳng lấy từ trị tuyệt đối côsin giữa hai vectơ chỉ phương:
$$\cos\varphi = \frac{|\vec u\cdot\vec v|}{|\vec u|\,|\vec v|} = \frac{|1|}{1\cdot\sqrt2} = \frac{1}{\sqrt2}\ \Rightarrow\ \varphi = 45^\circ.$$

**Plan đưa cho engine:** hai `oxyz_line` dạng `point_dir`, truy vấn `{"kind":"angle","a":"a","b":"b"}`.
**Đáp engine:** `45°`.  **Đối chiếu:** khớp ✓  *(ca `case-angle-03089774`)*

---

## Ví dụ 4 — Diện tích thiết diện

**Đề.** Cho hình chóp `S.ABCD` đáy là hình vuông cạnh 4, `SA ⊥` đáy, `SA = 4`. Mặt phẳng `(P)` song song với đáy và đi qua trung điểm cạnh `SA`, cắt `SA, SB, SC, SD` lần lượt tại `M, N, P, Q`. Tính diện tích thiết diện `MNPQ`.

**Lời giải tay.** `(P)` song song đáy và cắt các cạnh bên tại trung điểm (do qua trung điểm `SA`) ⇒ thiết diện `MNPQ` **đồng dạng** với đáy `ABCD` theo tỉ số `k = 1/2`. Đáy là hình vuông cạnh 4 nên `MNPQ` là hình vuông cạnh `4·(1/2) = 2`, diện tích
$$S_{MNPQ} = 2^2 = 4.$$

**Plan đưa cho engine:** dựng `S,A,B,C,D`, lấy trung điểm bốn cạnh bên `M,N,P,Q` (`oxyz_midpoint`), truy vấn `{"kind":"area","shape":"polygon","points":["M","N","P","Q"]}`.
**Đáp engine:** `4`.  **Đối chiếu:** khớp ✓  *(ca `case-area-197ab457`)*

---

## Ý nghĩa

Bốn ví dụ cho thấy quy trình **không** phải vòng lặp tự xác nhận: con người dùng công thức hình học cổ điển (tích có hướng, tỉ số đồng dạng, công thức thể tích), engine dùng toạ-độ-hoá + số học chính xác trong trường `hữu tỉ × căn`. Hai đường độc lập cùng ra một đáp là bằng chứng chéo mạnh hơn nhiều so với một mình engine "chạy lại không hồi quy". Đây chính là cơ chế cho phép nói **"đáp đã kiểm hai chiều"** — và cũng là điều học sinh phải trình bày được với hội đồng cho **đề thật** (xem `huong-dan-nhap-de-that.md`).

> **Lưu ý phạm vi:** các ví dụ này minh hoạ *engine tính đúng khi đã có plan đúng*. Khâu **LLM dịch đề → plan** (đầu–cuối) là phép đo riêng, cần khoá API (xem báo cáo §5.7).
