# 🎤 Bộ hỏi–đáp phỏng vấn (lời dễ hiểu)

> Câu trả lời viết bằng lời thường, không dùng từ khó chưa giải thích. Số nào chưa đo ghi "đang đo" — **không bịa số**.
> Đây là câu trả lời MẪU: em đọc hiểu rồi **nói lại bằng giọng mình**, đừng học thuộc.

---

## A. Hiểu đề tài & điểm mới

**1. Đề tài của em giải quyết vấn đề gì?**
> Các phần mềm AI hiện nay khi giải hình không gian hay tính sai mà vẫn trả lời rất chắc chắn, học sinh dễ tin theo. Em làm một phần mềm giải loại toán này **đúng và kiểm chứng được**, và quan trọng là **khi không chắc thì nó báo "chưa giải được" thay vì đoán bừa**.

**2. Điểm mới so với ChatGPT là gì?**
> ChatGPT tự đọc đề rồi tự tính luôn — mà tính là chỗ nó hay sai. Hệ của em **tách hai việc**: AI chỉ **đọc hiểu đề**, còn **tính thì giao cho một chương trình toán em tự viết**, chạy lần nào cũng ra một kết quả. Nhờ tách ra, em kiểm soát được phần tính, nên đáng tin hơn.

**3. Có phải em chỉ gọi API AI có sẵn không?**
> Không ạ. Nếu chỉ gọi API thì nó vẫn bịa — đúng cái vấn đề em muốn giải. Trong hệ của em, AI **chỉ được đọc đề và đặt bài lên toạ độ**, **không được tính**. Toàn bộ phần tính và tự kiểm nằm ở **chương trình em viết**. Cái mới nằm ở chương trình đó và ở cơ chế biết từ chối, không phải ở việc gọi API.

**4. Khác gì các nghiên cứu trước (như AlphaGeometry của Google)?**
> AlphaGeometry giải toán hình **phẳng** và để **chứng minh định lý**, lại phải huấn luyện máy trên hàng trăm triệu bài. Còn em làm hình **không gian**, để **tính ra con số** (khoảng cách, góc, thể tích), **không huấn luyện gì cả** — chỉ dùng AI sẵn có để đọc đề, cộng thêm cơ chế biết từ chối. Điểm chung chỉ là ý tưởng "AI kết hợp với chương trình tính chính xác".

## B. Hỏi vặn cách hoạt động

**5. Chương trình của em tính bằng cách nào?**
> Sau khi AI đặt bài lên hệ trục toạ độ (cho mỗi điểm một bộ số), chương trình dùng **công thức hình học toạ độ** để tính — ví dụ khoảng cách, góc, thể tích đều có công thức. Em không dùng số thập phân gần đúng mà **giữ nguyên dạng căn** cho chính xác.

**6. Vì sao đặt toạ độ cụ thể rồi tính mà vẫn đúng cho hình tổng quát?**
> Vì với những đại lượng như khoảng cách, góc, thể tích, kết quả **không phụ thuộc vào việc mình đặt trục ở đâu**. Đặt hệ trục cho tiện tính, kết quả vẫn là kết quả của hình đó. Đây là **phương pháp toạ độ hoá**, học sinh lớp 12 được học.
> *(Nếu bị hỏi sâu:)* Với những tính chất phải chứng minh như "vuông góc", "bằng nhau" thì đặt một trường hợp cụ thể là chưa đủ — nên hệ của em **từ chối** những bài kiểu đó thay vì nhận bừa.

**7. Làm sao trả đúng dạng căn mà không làm tròn?**
> Em cho chương trình lưu số ở dạng "phân số nhân với một căn", ví dụ `√3/3`, và tính toán trực tiếp trên dạng đó, thay vì đổi ra số thập phân. Nên đáp cuối cùng vẫn là căn thức đúng.

**8. Cơ chế "biết từ chối" hoạt động ra sao? Cho ví dụ.**
> Trước khi giải, hệ tự hỏi: đề đã cho đủ dữ kiện chưa, và bài này có thuộc loại tính được không. Ví dụ đề hỏi thể tích cụ thể nhưng **chỉ cho tỉ số các cạnh** (không cho cạnh dài bao nhiêu) thì không thể ra một con số — hệ báo "không đủ căn cứ". Hay gặp bài **chứng minh, quỹ tích** thì nó cũng từ chối. Em chọn "thà nói chưa biết còn hơn dạy sai".

**9. Làm sao em chắc đáp của máy đúng?**
> Hai cách. Một: mỗi đáp chương trình **tự tính lại bằng một cách độc lập**, hai cách khớp mới nhận. Hai: với bộ đề mẫu, em **tự giải tay** ra đáp rồi so với máy — khớp mới đưa vào. Hai con đường khác nhau cùng ra một kết quả thì em tin.

## C. Số liệu

**10. "210 trên 210 đúng" nghĩa là hệ chính xác 100% à?**
> Dạ **không**, em cẩn thận không nói vậy. Con số đó chỉ nói **phần chương trình tính đúng trên bộ đề mẫu** khi đã đặt toạ độ chuẩn. Nó **chưa** đo khâu AI đọc đề đúng bao nhiêu — phần đó em **đang đo**. Nên "100%" chỉ có nghĩa "chưa phát hiện lỗi trên bộ đề này", không phải "hệ đúng tuyệt đối".

**11. Bộ đề của em ở đâu ra? Có phải đề thật không?**
> Một phần là đề em **tự soạn có kiểm chứng**, một phần lấy từ **đề thi thật, có ghi rõ nguồn** (sách nào, đề năm nào). Mỗi đề em đều tự giải để xác minh đáp.

**12. Em so với "để AI tự giải thẳng" thế nào?**
> Em đã dựng công cụ đo việc này: chạy cùng một bộ đề qua "AI giải thẳng" và qua "hệ của em", rồi so. Con số cụ thể em **đang đo** *(hoặc: kết quả cho thấy hệ của em ít trả lời sai tự tin hơn hẳn — nếu đã đo xong thì nêu số)*.

## D. Liêm chính & tự làm (quan trọng nhất)

**13. Phần nào em tự làm, phần nào dùng có sẵn?**
> Em ghi minh bạch: phần **AI đọc đề** là dùng mô hình có sẵn qua API; phần **vẽ hình 3D** dùng thư viện đồ hoạ. Phần **em tự xây dựng** là: chương trình tính toán, cơ chế biết từ chối, bộ đề chuẩn và cách đánh giá. Đó là phần cốt lõi và là cái mới của đề tài.

**14. Đề tài này có quá tầm học sinh không? Ai giúp em?**
> Em xin trả lời thẳng: em **hiểu và giải thích được từng phần** của hệ — mời thầy cô hỏi bất kỳ chỗ nào. Em có tham khảo tài liệu và công cụ để học, nhưng thiết kế, quyết định cách làm, và kiểm chứng là của nhóm em. *(Mẹo: nói xong, chủ động mời "thầy cô chỉ vào đoạn nào cũng được, em giải thích" — sự tự tin này đáng giá hơn mọi lời khẳng định.)*

**15. Thầy chỉ vào đoạn này, em giải thích xem.**
> *(Không có câu mẫu — đây là lúc em phải THẬT SỰ hiểu code. Cách trả lời: nói đoạn này làm gì, vì sao cần, đầu vào là gì, đầu ra là gì. Nếu là đoạn tính khoảng cách thì chỉ ra công thức. Muốn trả lời được câu này, tuần này phải đọc kỹ code — không nhồi phút chót được.)*

## E. Hạn chế & tương lai

**16. Hạn chế lớn nhất?**
> Chương trình **có giới hạn phạm vi**: bài quỹ tích, bất đẳng thức, biện luận thì nó từ chối chứ không giải. Và bộ đề còn cần mở rộng thêm. Em nêu rõ ranh giới này chứ không giấu.

**17. Có thêm thời gian em làm gì?**
> Mở rộng bộ đề bằng nhiều đề thi thật hơn; đo đầy đủ các con số so sánh; và dạy chương trình giải thêm vài dạng nó đang từ chối.

**18. Giá trị thực tế?**
> Một công cụ học tập **đáng tin**: học sinh nhập đề, thấy hình 3D xoay được và đáp **kiểm chứng được**; và quan trọng — nó **không dạy sai**, gặp bài ngoài khả năng thì nói thẳng chứ không bịa.

---

## 3 câu "bẫy" hay gặp — nhớ cách xử lý
- **"Đúng 100% à?"** → thu hẹp ngay: đó là phần tính, chưa phải cả hệ (xem câu 10).
- **"AI làm hộ em à?"** → mời hỏi bất kỳ đoạn nào, tự tin giải thích (câu 14–15).
- **"Có gì mới đâu, gọi API thôi mà?"** → nhấn: cái mới là **chương trình tính + biết từ chối**, AI chỉ đọc đề (câu 3).

> Nguyên tắc vàng: **cái gì đo rồi thì nói chắc; cái gì chưa đo thì nói "đang đo".** Trung thực chủ động = ghi điểm.
