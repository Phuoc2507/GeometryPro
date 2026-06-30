export const LEVEL_STATIC = `[MỨC ĐỘ YÊU CẦU: CƠ BẢN (STATIC)]
Chỉ cần lấy kết quả tĩnh, vẽ quỹ đạo thô bằng các đường thẳng, mặt cong paraboloid/hyperboloid tĩnh. KHÔNG SỬ DỤNG timeline hoặc tính toán animation động phức tạp để tiết kiệm resource. Chỉ cung cấp tọa độ tĩnh của các điểm và vật thể tại một thời điểm hoặc trạng thái cuối cùng.`;

export const LEVEL_CINEMATIC = `[MỨC ĐỘ YÊU CẦU: CAO NHẤT (CINEMATIC)]
Bài toán này CẦN tái hiện Timeline chuyển động vật lý chính xác. Bạn PHẢI thiết lập "timeline" trong JSON.
- Dùng các biến thời gian "t" để tính toán tọa độ.
- Thiết lập đối tượng (agents) như vệ tinh, máy bay, tàu thuyền, xe cộ, hoặc người di chuyển.
- "timeline" cần có thuộc tính "duration" (tổng thời gian) và mảng "tracks".
- Mỗi "track" xác định "type" (như 'parametric_path' hoặc 'translate'), "targetId" (chỉ tới id của agent), và "params" chứa các phương trình hoặc vector vận tốc (vx, vy, vz).
- Cố gắng phân tích kĩ tham số vận tốc, gia tốc, thời gian trong đề bài để mô phỏng chính xác.`;
