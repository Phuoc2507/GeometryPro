# Nhật ký quyết định — phiên chạy tự quản đêm 21/08/2026

> Người dùng giao toàn quyền trong ~5 giờ (từ ~23:30 giờ VN): lên lịch, giao việc,
> phản biện, code nhiều vòng lặp. Mọi quyết định tự đưa ra đều ghi tại đây để
> sáng hôm sau duyệt lại. Quyết định nào bị bác thì đảo lại được — không có gì
> irreversible ngoài các commit docs/code trên nhánh `claude/edu-tech-ecosystem-if51pn`
> (chưa merge vào main, chưa deploy).

## Bối cảnh nhiệm vụ

Mở rộng geo3d thành đa môn theo mô hình "engine pack": Vật lý động học lớp 10 +
Hóa vô cơ THPT, cùng dây chuyền "LLM chỉ dịch → engine tất định tính + tự kiểm".
Pipeline: spec (3 agent) → phản biện thiết kế (2 agent) → sửa spec → thi công
(2 agent, TDD) → phản biện code (2 agent) → tích hợp + full test → báo cáo.

## Quyết định đã đưa ra

- **D1 · Mở phiên phản biện thiết kế sớm, không chờ plan Lý.** Lý do: spec thiết kế
  Lý đã xong, chỉ thiếu file plan (checklist thi công) — tôi tự soát phần đó.
  Rút ngắn đường găng ~30 phút.
- **D2 · Giao thêm agent "bộ đề vàng" 24 bài (12 Lý + 12 Hóa) ngoài kế hoạch gốc.**
  Lý do: người dùng muốn giao nhiều việc song song; kho bài này thành contract
  test bổ sung cho giai đoạn thi công, không giẫm chân ai.
- **D3 · Commit docs theo từng đợt agent hoàn thành** (thay vì gom một commit cuối).
  Lý do: stop-hook của repo yêu cầu; chấp nhận lịch sử có bản nháp trung gian
  trên nhánh làm việc.
- **D4 · Bảng nguyên tử khối dùng giá trị SGK VN (Fe=56, Cu=64, Cl=35,5...),
  thể tích mol khí hỗ trợ cả 22,4 (đktc cũ) lẫn 24,79 (đkc GDPT 2018), default 24,79.**
  Lý do: đáp số phải khớp đáp án SGK/đề thi VN chứ không phải IUPAC. Sáng mai
  cần bạn xác nhận default 24,79 có hợp tệp người dùng hiện tại không (nếu đa số
  giáo viên còn dạy bộ cũ thì đổi default về 22,4 — một dòng).
- **D5 · DB phản ứng Hóa v0 "thà ít mà đúng":** 50 phản ứng đã tự kiểm cân bằng;
  các phản ứng nhạy (HNO₃/H₂SO₄ đặc, Al+NaOH, CO₂+kiềm 2 muối...) để ngoài v0,
  chờ phản biện duyệt mới vào v1. Engine gặp chất ngoài DB trả "ngoài phạm vi",
  không bao giờ bịa.

- **D6 · Phản biện Hóa phiên 1 kết luận "chưa đủ chín" → cho sửa spec TRƯỚC khi
  thi công, không bỏ qua.** Báo cáo đầy đủ: `docs/superpowers/reviews/2026-08-21-chem-review-phien1.md`.
  Điểm chính: 50/50 phương trình đúng nhưng 4 record (R19/R23/R29/R39) thiếu guard
  miền áp dụng → sẽ trả đáp sai cho bài kinh điển (Fe+AgNO3 dư, CO2 dư, nhỏ từ từ
  axit); công thức C% sai khi có rắn dư; thiếu tầng ion cho guard trao đổi. Tôi
  chấp nhận TOÀN BỘ khuyến nghị của phản biện (kể cả bổ sung 8 phản ứng canon:
  K+H2O, Mg+CuSO4, BaCl2+H2SO4, AgNO3+HCl, Ba(OH)2+Na2SO4, NaHCO3+HCl,
  NaHCO3+NaOH, Ca(OH)2+Na2CO3 → DB lên ~58 record) vì mỗi finding đều kèm phép
  tính chứng minh. Giao agent sửa 2 tài liệu chem ngay, không đợi phản biện
  kiến trúc (độc lập nhau; điểm giao F13 đã được chốt "chem-pack thắng").

- **D7 · Phản biện kiến trúc + Lý phiên 1: chấp nhận toàn bộ 18 finding + 16 phán
  quyết (C1–C10, D1–D6).** Báo cáo: `docs/superpowers/reviews/2026-08-21-arch-physics-review-phien1.md`.
  Nổi bật: route mới phải bọc nguyên tầng quota/billing như v2 (F1 — nếu không
  là lỗ hổng chi phí); schema Lý thêm unit per-quantity để ENGINE đổi km/h→m/s
  bằng hữu tỉ exact (F2); thêm query time_when_velocity cho bài hãm phanh (F3);
  scene v0 hạ về mức plan, các mốc "đỉnh/điểm gặp" dời v1 (F8 — chọn phương án
  rẻ); EXACT_TRIG thêm góc âm (C8); ChemScene chốt theo chem spec, kiến trúc
  thành pointer (F5/C9); tsc gate rỗng với kernel → thêm tsconfig.kernel.json
  vào nghi thức kiểm (F9). Xác nhận độc lập: 10/10 bài mẫu Lý đúng, mọi quirk
  frontend có thật (trích dòng). Giao agent sửa 4 tài liệu (kiến trúc, rollout,
  spec Lý, plan Lý) — không đụng 2 file Hóa (vòng sửa Hóa đang chạy song song).
- **D8 · Trình tự thi công chốt theo phản biện:** physics pack code ngay sau
  vòng sửa docs Lý; chem pack code ngay sau vòng sửa docs Hóa; route/bridge (P2)
  và UI (P4) KHÔNG thi công đêm nay — cần bàn giao có người xem (quota, UX).

- **D9 · Người dùng yêu cầu "làm cho các chương khác luôn" → mở rộng theo kiểu
  SPEC-TRƯỚC, không code-trước.** 3 agent spec đợt 2 khởi chạy song song (không
  chặn v0): Lý-động lực học lớp 10, Lý-dao động điều hòa lớp 11, Hóa-v1 (7 ứng
  viên + phi kim ~25-30 record + 3 cơ chế mới: trộn tuần tự, CO2+kiềm 2 muối,
  phản ứng nối tiếp Fe/AgNO3). Các spec này phải qua đúng sàng phản biện như
  đợt 1 rồi mới code — code đợt 2 dự kiến NGÀY MAI trừ khi v0 xanh sớm trong
  đêm. Lý do không code thẳng: chuẩn "không bao giờ sai" chỉ giữ được nếu mọi
  chương qua cùng quy trình; nền v0 chưa xanh thì chưa có gì để chương mới tựa.
- **D10 · Bộ đề vàng 24 bài (L01-L12, H01-H12) nhận làm test bổ sung cho giai
  đoạn thi công**, kèm 5 cảnh báo thi công (L11 meet trục y; cos90 exact; nghiệm
  ma sau dừng; CM với chất excess; g nhận từ đề). Bài nào engine v0 chưa phục vụ
  được sẽ chuyển phụ lục v1 thay vì nới engine vội.

- **D11 · Người dùng yêu cầu phủ lớp 11+12 → giao thêm 3 spec đợt 3** (Lý 11
  dòng điện không đổi; Lý 12 khí lý tưởng + nhiệt; Hóa 11-12 hữu cơ tầng 1:
  đốt cháy/CTPT/este — chọn theo tiêu chí tính-được-tất-định + nặng đề thi).
  Lập bản đồ phủ chương đầy đủ tại `docs/superpowers/2026-08-21-lo-trinh-phu-chuong.md`;
  các chương còn lại (sóng, điện trường, từ trường, hạt nhân, cân bằng, điện
  phân, hữu cơ 12 nặng DB) xếp đợt 4 CÓ CHỦ ĐÍCH — 6 spec đang bay đã chạm trần
  băng thông phản biện; thứ tự code sau v0 quyết sáng mai cùng người dùng.

- **D12 · SỰ CỐ 17:45Z: chạm trần quota phiên khi chạy 8 agent song song — cả 8
  bị ngắt; phiên đứng im tới 22:23Z (trần reset 18:50Z nhưng không có wake).**
  Thiệt hại & cứu được: (a) 3 spec đợt 2/3 KỊP VIẾT XONG (động lực học, dao động,
  mạch điện — commit ngay); (b) 3 spec chết trước khi viết (khí+nhiệt, hữu cơ,
  Hóa-v1 mở rộng) → làm lại sáng mai; (c) agent sửa docs Lý/kiến trúc chết GIỮA
  CHỪNG — 3 file mang sửa đổi dở (commit nguyên trạng, đánh dấu "phần 1");
  (d) agent sửa docs Hóa chết TRƯỚC khi sửa — 2 file Hóa còn nguyên bản gốc.
  Bài học ghi nhớ: không quá 4-5 agent song song; luôn đặt nhịp wake KẾ TIẾP
  trước khi giao đợt agent mới.
- **D13 · Phương án gỡ: KHÔNG chờ sửa xong docs mới code.** Agent thi công nhận
  bộ nguồn: plan TDD (không bị sửa dở) + spec gốc + BÁO CÁO PHẢN BIỆN với quy
  tắc "review đè spec khi vênh nhau" + bộ đề vàng. Sửa docs hoàn chỉnh xếp sau
  code hoặc sáng mai — docs là bản đồ, code+test mới là sản phẩm đêm nay.
  Đổi mục tiêu giờ: code v0 + phản biện code + tích hợp xong trước ~01:00Z
  (8g sáng VN).

- **D14 · [NGƯỜI DÙNG PHÁN, sáng 22/08] molarVolume default = 24,79 L/mol** —
  xác nhận trực tiếp, đóng câu hỏi treo ở D4. Engine vẫn hỗ trợ cả 22,4 khi đề
  ghi "đktc".
- **D15 · Sáng 22/08, trong lúc 2 agent thi công chạy:** giao 1 agent phản biện
  3 spec chương mới (động lực học, dao động, mạch điện) + 1 agent viết lại spec
  Hóa-v1 bị mất trong sự cố. Tổng 4 agent — đúng trần an toàn D12.

- **D16 · Phản biện 3 spec lớp 11-12: chấp nhận toàn bộ finding + phán quyết**
  (báo cáo: `reviews/2026-08-21-wave2-specs-review.md`). 31/31 bài mẫu đúng.
  Xếp hạng chín: mạch điện → động lực học → dao động. 3 phán quyết CHUNG cho
  mọi pack từ nay: (a) label scene KHÔNG nhúng giá trị engine tính; (b) engine
  exact-first, thập phân là việc bridge/UI; (c) field query dùng chính tả v0.
  Giao 1 agent sửa 3 spec theo danh sách; thứ tự code đợt 2 (sau khi user duyệt):
  mạch điện → động lực học → dao động.
- **D17 · Physics pack v0 HOÀN THÀNH + commit afd58b3**: 66/66 test xanh, toàn
  suite 1169 pass/0 fail, tsc kernel sạch, smoke end-to-end đúng đáp exact.
  Đang phản biện code (phiên 2). Chem pack: snapshot WIP d1f811d, agent đang
  viết tiếp.

- **D18 · [NGƯỜI DÙNG, sáng 22/08] Từ đợt agent tiếp theo: dùng model opus 4.8,
  reasoning effort high.** Các agent đợt trước chạy model mặc định của phiên;
  từ giờ mọi agent mới spawn với opus 4.8 để tăng chất lượng phản biện/thi công.

- **D19 · Phản biện code cả 2 pack: mỗi pack lộ đúng loại lỗi "dạy sai có dấu
  kiểm chứng" — chấp nhận vá TRƯỚC khi tích hợp.** Physics: 1 CAO (miền sau
  dừng/chạm đất) + 6 VỪA (báo cáo `reviews/2026-08-21-physics-code-review.md`) —
  agent vá đang chạy. Chem: 2 CAO (spectator ẩn Al+Fe+CuSO4 → 6,4g thay 16g;
  phán bừa "không phản ứng" cho NaCl+H2SO4 đặc) + 3 VỪA (báo cáo
  `reviews/2026-08-21-chem-code-review.md`) — giao agent vá (opus 4.8 theo D18).
  Cả 2 pack DB/lõi toán được xác nhận SẠCH; lỗi nằm ở tầng guard/miền — đúng
  chỗ khó thấy nhất, đúng lý do cần phản biện code.

- **D20 · Physics pack HOÀN THIỆN qua vòng vá (commit f82819b):** 16 finding
  săn lỗi đã vá, 90 test pack, toàn suite 1301 xanh, tsc sạch. CAO-1 dùng cơ
  chế Check severity 'warn' (answers giữ, cảnh báo hiện) — quyết định thiết kế
  hợp lý vì mover1d không phân biệt "dừng hẳn" với "lăn ngược dốc". Chờ vá chem
  xong là tới bước tích hợp cuối.
- **D21 · Spec Hóa-v1 mở rộng hoàn chỉnh (trong f82819b):** 38 record mới (7
  nhạy + 29 phi kim + 2 nấc trung gian) + 3 cơ chế giải đúng 3 bài v0 phải
  chặn (nhỏ từ từ 0,896 L; CO2 dư 10 g; Fe+AgNO3 dư 27 g). Cần phản biện Hóa
  trước khi code — xếp lịch sau khi chốt v0. Có 1 việc cần xác nhận đánh số
  R51-R58 giữa 2 đợt (agent tự ghi là giả định).

- **D22 · [NGƯỜI DÙNG, sáng 22/08] Nối 2 engine vào app — KHÔNG trừ credit.**
  Tính năng Lý/Hóa chạy ẩn (chỉ người dùng biết cách kích hoạt bằng cách dán đề
  Lý/Hóa). Chấp nhận rủi ro F1 (thiếu quota) CÓ CHỦ ĐÍCH. Cơ chế tôi chọn để an
  toàn tối thiểu mà vẫn miễn phí: route mới YÊU CẦU đăng nhập (auth) nhưng KHÔNG
  charge credit/quota — chặn spam ẩn danh, miễn phí cho người đăng nhập. (Nêu
  lại với người dùng; đổi được nếu họ muốn mở cả cho khách.)
- **D23 · Tự nhận diện môn, KHÔNG làm UI chọn.** Vẫn ô gửi đề như hiện tại;
  prefilter từ khóa tất định (Hóa: "phản ứng/dung dịch/mol/gam/..."; Lý:
  "vận tốc/gia tốc/m/s/ném/...") bắt đề Lý/Hóa TRƯỚC — chỉ khi bắt được mới đi
  route mới, còn lại luồng Toán y nguyên (không thêm độ trễ, theo F17). Đề Lý/
  Hóa → "chỗ mô phỏng khác": Lý tái dùng canvas + timeline (agents đã render
  được); Hóa cần renderer ChemScene mới (2D overlay, phán quyết C9).
- **D24 · Thứ tự code chương lớp 11-12 (người dùng duyệt theo đề xuất):**
  mạch điện → động lực học → dao động. R51-R58 và opus 4.8: người dùng OK.

- **D25 · Cầu LLM + route XONG (bc13a8d), toàn suite 1428 xanh.** Điểm cần lưu:
  (a) auth — agent KHÔNG dùng resolveAiAccess thẳng (nó LUÔN consume quota/credit,
  mâu thuẫn "không trừ") mà chép nửa xác thực thành `resolveAuthNoCharge` (Bearer
  → supabase getUser, dừng trước bước tiêu). Đúng kỹ thuật; rủi ro: lệch nếu
  resolveAiAccess đổi sau — cần phản biện. (b) 6 điểm rủi ro prompt engine KHÔNG
  bắt được (self-check chỉ cứu khi đề có dữ kiện dư): Lý — km/h vừa-đổi-vừa-khai-
  unit (đổi 2 lần), quên axis:y hỏi độ cao, dấu a/v0; Hóa — đktc(22,4)↔đkc(24,79)
  hai cụm tiếng Việt cực giống, gán excess sai, variant loãng/đặc. → PHẢI phản
  biện cầu LLM + test đề thật bằng curl trước khi nối frontend.
- **D26 · Chương mạch điện XONG (18be29a), physics 161 test.** 10 bài C1-C10 khớp
  exact, approximate:false 100%, Kirchhoff K1-K4 pass. Tiếp theo D24: động lực
  học → dao động (chờ, vì cùng đụng physics/ — không chạy song song agent code).
- **D27 · Renderer ChemScene XONG (002b3fe, 8 test).** 4 ghi chú giới hạn hợp
  đồng scene (contents không cập nhật sản phẩm; color_change chỉ nhạt dần không
  đổi sang màu sản phẩm) — việc nâng engine scene sau, không chặn demo.

- **D28 · Phản biện cầu LLM: PHẢI vá hậu-kiểm trước khi nối frontend.** Báo cáo
  `reviews/2026-08-22-bridge-review.md`. Xác nhận 6 điểm D25 + 5 mới, tái hiện
  thật. Giao agent vá: (1) module hậu-kiểm tất định trong solveSubject — B1 đktc/
  đkc + B2 axis:y reject cứng, B3/B4/B5 warn; (2) sửa câu chữ 2 prompt (phản-ví-
  dụ cho A1/A2/A3/A5/A6, luật dấu a, hệ đơn vị); (3) classifier STOP-words ion/
  điện-trường/hạt-nhân → không nhận nhầm sang physics; (4) auth: thêm chặn
  `blocked`/hết hạn (KHÔNG trừ credit, giữ D22) + rate-limit thô chống đốt tiền
  + map error.message cuối route. KHÔNG thêm từ khóa mạch điện vào classifier
  (route chưa có nhánh circuit — thứ tự: mở nhánh circuit trước).
- **D29 · [CHỜ NGƯỜI DÙNG] rate-limit:** tôi cho agent thêm trần thô ~20-30 req/
  phút/user để chống đốt tiền LLM (token rò rỉ). KHÔNG phải quota tính tiền —
  vẫn đúng "không trừ credit". Nếu bạn thấy thừa (tính năng đã ẩn) thì bỏ được.

- **D30 · SỰ CỐ quota lần 2 (03:2x UTC): agent dao động bị ngắt giữa chừng.**
  Khác lần 1 (D12): chỉ 1 agent, thiệt hại nhỏ. Đã cứu: piScalar.ts nền xong
  + 60 test xanh → commit riêng f6e1809 (nền dùng chung waves/efield). Phần
  oscillation dở (oscillation.ts/schema/scene, thiếu runOscillation + test) →
  WIP commit fb4264a (ghi rõ CHƯA nghiệm thu, để không mất khi container tái
  chế). Giờ 03:27 UTC đã qua mốc reset 3:20 → thử 1 agent hoàn thiện dao động;
  nếu quota chưa hồi hẳn thì chờ + đặt send_later.
- **ĐIỂM NỐI FRONTEND XONG (57a7212):** dán đề Lý/Hóa vào ô Toán → trang
  /simulate. tsc + build production OK. Toàn bộ chuỗi người dùng giao đã khép
  trừ chương dao động (đang hoàn thiện). Cần user test thủ công với VILAO_API_KEY.

- **D31 · [NGƯỜI DÙNG] Chọn "A" — phủ tiếp thế mạnh (vùng tính được), chưa làm
  fallback-LLM (b).** Nguyên tắc phân tầng nhãn (đã-kiểm-chứng vs tham-khảo) được
  đồng ý về TƯ DUY nhưng chưa code — để sau khi phủ đủ thế mạnh. Batch phủ đầu:
  (1) phản biện 2 spec đã có (sóng cơ, điện trường) để mở đường code; (2) viết
  lại 2 spec MẤT trong sự cố quota lần 1 (khí lý tưởng+nhiệt Lý 12, hữu cơ đốt
  cháy Hóa); (3) viết spec điện xoay chiều Lý 12 (đỉnh đề thi ĐH, chưa có).
  Sau phản biện waves/efield → code chúng. Nhắc: mạch điện/động lực/dao động
  vẫn CHƯA nối route (task nối-app còn nợ, làm sau khi phủ thêm).

- **D32 · [TỰ QUYẾT] TRẢ NỢ nối engine vào route — dispatch theo CHƯƠNG (3bf7eba).**
  Lý do tự quyết: 3 engine (mạch điện/động lực/dao động) đã build+test nhưng route
  chỉ tới kinematics → "thế mạnh" build ra mà KHÔNG dùng được = làm thừa (đúng thứ
  bạn dặn tránh). Nên nối trước khi code thêm chương. Kiến trúc chọn:
  (1) `physicsChapterClassifier.js` — prefilter TẤT ĐỊNH cấp 2 (đề physics → chương
      nào), MẶC ĐỊNH an toàn 'kinematics'; nhận nhầm chương ⇒ engine chương kia
      ABSTAIN (không bịa), sai lầm tệ nhất chỉ "từ chối bài giải được".
  (2) `solveSubject.js` — đăng ký chương {schema, run, prompt, scene, postcheck};
      `solvePhysicsPlan` AUTO-NHẬN chương từ hình dạng plan (4 schema rời nhau) rồi
      dispatch đúng engine; scene chuẩn hoá theo chương (motion vs circuit-có-bảng).
  (3) kernel/index.ts export 3 run + 3 schema; rebuild bundle. Toàn suite 1718 XANH.
  QUYẾT ĐỊNH AN TOÀN: commit này KHÔNG đổi định tuyến người dùng — subjectClassifier
  GIỮ NGUYÊN (circuit/dao động/động lực vẫn rơi geometry→Toán), prompt 3 chương = null
  (ABSTAIN rõ). Chỉ khi bộ dịch (prompt) từng chương viết + tự-kiểm xong tôi mới MỞ
  từ khóa vào subjectClassifier — tránh trạng thái nửa-vời (route sang physics rồi
  abstain, tệ hơn để Toán LLM trả lời). Frontend KHÔNG cần sửa: SimulationView luôn
  hiện AnswerPanel; dynamics/oscillation phát GeometryData nên PhysicsSceneView vẽ
  được; circuit xuống nhẹ (đáp số + sơ đồ điểm/đường thô), renderer sơ đồ điện là
  đánh bóng sau.

- **D33 · [TỰ QUYẾT] Batch phủ thế mạnh vòng 2 (song song ≤5 agent).** Sau khi 3
  phản biện spec mới về (khí-nhiệt 10/10 1CAO, hữu cơ 11/11 1CAO+4VỪA, điện xoay
  chiều 10/10 0CAO — π-triệt-tiêu XÁC NHẬN đúng) và fix sóng/điện-trường xong (commit
  78b9f48): thả (a) 3 agent viết BỘ DỊCH circuit/dynamics/oscillation (mọi ví dụ
  BẮT BUỘC tự-kiểm qua `solvePhysicsPlan(plan,'<chương>')` = ok:true — hoàn tất D32
  để người dùng dùng được); (b) 1 agent code SÓNG CƠ (spec chín nhất, đã fix) theo
  TDD pack riêng. Kế tiếp: code điện trường + điện xoay chiều (đều đủ chín); còn
  gas-heat + hữu cơ cần 1 vòng SỬA SPEC (mỗi cái 1 CAO + vài VỪA từ phản biện) TRƯỚC
  khi code — H1 hữu cơ (match muối bằng atom-map) và H2 (ester sai SỐ âm thầm) là lỗi
  đúng loại dự án thề chặn, phải bịt ở spec trước.

- **D34 · [TỰ QUYẾT] Chốt điểm phân vân §14 khí-nhiệt + cách vá gas-heat/hữu cơ.**
  Phản biện gas-heat nêu 6 điểm §14 cần điều phối quyết + 1 CAO(H1)/2 VỪA/3 THẤP.
  CHỐT §14 (để code agent theo): (a) geometry CẮT HẲN v1 (giữ chỗ `tags`, không dựng
  cảnh) — nhiệt không có chuỗi thời gian; (b) hiển thị lũy thừa 10 theo chuẩn efield
  (khoa học hoá text, giữ cả approx+exact); (c) MỘT process/plan cho v1; (d) ΔU/công
  khí → v1.1 (v1 chưa); (e) `plan.R` optional default 831/100; (f) +273 CỨNG (phép
  cộng hữu tỉ). CÁCH VÁ: KHÔNG sửa spec .md riêng rồi mới code (H1/H2/H3 chủ yếu là
  việc CODE: thêm self-check chống cộng-thừa latent, vị-từ pha tường minh, thêm 4 ca
  heat + ca abstain, công thức T0). Thay vào đó GIAO CODE AGENT (spec + review + chốt
  §14 này), áp toàn bộ finding NGAY TRONG lúc code TDD. H4 (THẤP): DẶN agent BỎ QUA
  lệnh "thêm gasHeat vào tsconfig.kernel.json" của §4 — glob `physics/**/*.ts` đã phủ,
  chạm config dùng chung là bẫy merge khi nhiều agent song song. Tương tự HỮU CƠ: gấp
  finding vào code agent (H1 match muối bằng ATOM-MAP; H2 guard ĐỘC LẬP chống ester
  đọc nhầm; H4 guard nO≥0; H5 liệt-kê đa nghiệm không bail). AC-CIRCUIT (0 CAO, đủ
  chín): 2 VỪA (is_resonance đòi cả L,C; chốt ký tự minus U+2212) áp trong lúc code.

- **D35 · [TỰ QUYẾT] MỞ định tuyến 3 chương → HOÀN TẤT nối route (9f08336).** 3 bộ dịch
  circuit/dynamics/oscillation về đủ (mỗi cái mọi ví dụ tự-kiểm ok:true qua engine, kiểm
  ĐỘC LẬP cả 2 phía). Đã: nối prompt vào registry + thêm từ khóa PHYS_LEXICAL cho 3 chương
  (không mơ hồ với hình/hóa) + test tích hợp 4 chương định tuyến đúng, Toán/Hóa/efield-hoãn
  KHÔNG hồi quy (54 test xanh). GIỜ dán đề mạch điện/động lực/dao động → /simulate ra đáp đã
  kiểm chứng. GIỮ stop-words điện trường/từ trường/hạt nhân/phóng xạ/điện phân (efield đang
  code chưa nối). Kế: code xong waves/efield/ac thì mỗi chương cần thêm bộ dịch + mở routing.
- **D36 · [CẦN NGƯỜI DÙNG QUYẾT] Mâu thuẫn phí AC-circuit: F1 (spec) vs D22 (bạn).** Spec
  điện-xoay-chiều §5 ghi "route nối AC PHẢI có quota" (F1) — NHƯNG D22 (quyết định của BẠN)
  là tính năng Lý/Hóa ẩn, KHÔNG trừ credit. Hai điều này NGƯỢC nhau. Tôi THEO D22 (không trừ,
  đồng nhất mọi chương Lý/Hóa hiện có) khi nối AC — trừ khi sáng mai bạn muốn AC (đỉnh đề thi
  ĐH) thành nội dung tính phí riêng. F1 có thể là ý của agent viết spec, chưa biết D22. Chờ bạn.

- **D37 · [TỰ QUYẾT] MỞ định tuyến sóng cơ + điện trường (6 chương Lý end-to-end).** 2 bộ dịch
  waves/efield tự-kiểm xong (7/7, 9/9 qua engine). Nối registry + chapterClassifier (lexicon sóng/
  điện-trường) + subjectClassifier (thêm từ khóa). QUAN TRỌNG: GỠ "điện trường"/"điện tích" khỏi
  stop-words vì efield ĐÃ phục vụ — đề điện-trường ngoài phạm vi engine sẽ TỰ ABSTAIN (an toàn),
  đổi 1 test cũ (ion-trong-điện-trường kỳ vọng geometry → nay physics, có chú thích). GIỮ stop-words
  từ trường/cảm ứng từ/hạt nhân/phóng xạ/điện phân (chưa có engine). Nguyên tắc: mở dần từng chương
  KHI bộ dịch chương đó tự-kiểm xong — không mở non.

## ═══ TRẠNG THÁI SÁNG 22/08 (đọc trước) ═══

**Đã làm xong đêm nay (đã commit + push nhánh `claude/edu-tech-ecosystem-if51pn`):**
- **Nối route đa chương Lý (trả nợ D32):** dispatch đề Lý theo CHƯƠNG (classifier tất định + auto-nhận
  từ plan). **6 chương Lý DÙNG ĐƯỢC end-to-end:** động học, mạch điện, động lực học, dao động, **sóng cơ**,
  **điện trường**. Dán đề vào ô Toán → nhận diện → /simulate → đáp đã kiểm chứng (ngoài phạm vi thì abstain).
- **Code + phản biện 5 chương mới:** sóng cơ (35 test), điện trường (50, C6=300000√3 exact), điện xoay
  chiều RLC (60, π-triệt-tiêu exact), khí+nhiệt (32, self-check chống cộng-thừa latent), + đang code Hóa hữu cơ.
  Mỗi chương: spec → phản biện "tin số" → code TDD → (đang) phản biện code vòng 2.
- **Mỗi bộ dịch mọi ví dụ TỰ KIỂM qua engine thật** (ok:true) trước khi nhận.
- Toàn suite Lý 534 test xanh; bridge/route/classifier xanh; 0 hồi quy Toán/Hóa.

**Còn dở (đang chạy agent / kế tiếp):**
- Nối route điện-xoay-chiều + khí-nhiệt (bộ dịch đang viết) → thêm 2 chương → 8 chương Lý.
- Hóa hữu cơ: đang code (áp finding phản biện atom-map + guard độc lập), rồi nối route (chương Hóa thứ 2).
- Phản biện code vòng 2 các chương mới + full suite + build production.

**CẦN BẠN QUYẾT (D36):** spec điện-xoay-chiều nói route phải TÍNH PHÍ (quota), ngược D22 (Lý/Hóa ẩn,
không trừ credit). Tôi tạm theo D22. Nếu muốn AC (đỉnh đề thi ĐH) thành nội dung tính phí → báo.

## Quyết định chờ ghi tiếp (sẽ bổ sung trong đêm)

- Phân xử 5 điểm lệch giữa spec kiến trúc và spec Lý (theo khuyến nghị phản biện).
- Phân xử 10 điểm phân vân kiến trúc + 9 nghi vấn Hóa + 6 điểm mở Lý.
- Kết quả thi công + các finding phản biện code và cách xử lý.

## Dòng thời gian

- 15:53Z — baseline 1072 test xanh, nhánh sạch.
- 16:10–16:30Z — 6 tài liệu spec/plan hoàn thành, 4 commit (b483dab, 6ff6556,
  9652d3f, 45f868e), đã push.
- 16:25Z — 2 agent phản biện thiết kế + 1 agent bộ đề vàng khởi chạy.
- (22/08) ~09:10Z — vào phiên tiếp: 3 agent phản biện spec mới (khí-nhiệt/hữu cơ/
  điện xoay chiều) + 1 agent fix spec sóng/điện-trường chạy song song.
- ~09:19Z — TỰ LÀM D32: nối engine vào route (chapter classifier + dispatch), toàn
  suite 1718 xanh, commit 3bf7eba.
- ~09:26Z — 3 phản biện + fix sóng/điện-trường về hết; commit 78b9f48 (fix spec) +
  8a10ed3 (3 review). Thả 3 agent viết bộ dịch + 1 agent code sóng cơ (D33).
- (ghi tiếp theo tiến độ)
