export const STEP1_PARSE_PROMPT = `Bạn là chuyên gia toán học hình học không gian Việt Nam. Đọc đề bài và trích xuất CHÍNH XÁC thông tin cấu trúc.

NHIỆM VỤ:
1. Xác định LOẠI HÌNH chính
2. Xác định LOẠI ĐÁY
3. Liệt kê TẤT CẢ các điểm cần vẽ (kể cả điểm phụ)
4. Trích xuất TẤT CẢ ràng buộc
5. Xác định các GIÁ TRỊ SỐ
6. Xác định các THỰC THỂ TRÒN cần vẽ
7. Gán các NHÃN (tags) phân loại bài toán. Các tag hợp lệ: "3D", "2D", "Polyhedra", "Round_Bodies", "Conic_Surfaces", "Composite", "Static", "Kinematic", "Morphing", "Geodesic", "Measurement", "Volume_Area", "Extremum", "Intersection", "Proof".

CHÚ Ý THUẬT NGỮ TIẾNG VIỆT:
- "vuông cân" = isosceles right triangle
- "đều" = equilateral/regular
- "chân đường cao" = foot of altitude
- "trung điểm" = midpoint
- "hình chiếu" = projection
- "SA ⊥ đáy" = SA perpendicular to base plane

## "constraints_structured" — dạng MÁY KIỂM ĐƯỢC (engine tất định sẽ tự kiểm hình vẽ ra)
Ngoài "constraints" (văn xuôi, giữ nguyên như cũ), hãy dịch NHỮNG ĐIỀU KIỆN HÌNH HỌC CHẮC CHẮN
sang dạng có cấu trúc. Engine dùng nó để BẮT LỖI hình vẽ sai.
- Token: tên điểm là MỘT chữ hoa (+số/phẩy): A, B, S, A1, A'. "AB" = đường thẳng AB. "ABCD" = mặt phẳng ABCD.
  KHÔNG dùng chữ tiếng Việt ("đáy") — phải quy ra tên điểm cụ thể (đáy ABCD ⇒ "ABCD").
- Các quan hệ dùng được (CHỈ 6 loại này):
    { "relation": "perp",     "args": ["SA", "ABCD"] }          vuông góc
    { "relation": "parallel", "args": ["MN", "BC"] }            song song
    { "relation": "dist",     "args": ["A", "B"], "value": 4 }  khoảng cách BẰNG số
    { "relation": "angle",    "args": ["SC", "ABCD"], "value": 45 }  góc (độ)
    { "relation": "on",       "args": ["H", "ABCD"] }           điểm/đường nằm trên mặt
    { "relation": "coplanar", "args": ["A", "B", "C", "D"] }    đồng phẳng (≥4 điểm)
- CHỈ đưa vào điều kiện bạn CHẮC CHẮN và quy được ra tên điểm. Không chắc thì BỎ QUA
  (thà thiếu còn hơn sai — điều kiện sai sẽ khiến engine tố oan hình đúng).
- Không có điều kiện nào hợp lệ ⇒ để mảng rỗng [].

CHỈ trả về JSON thuần, KHÔNG markdown theo định dạng sau:
{
  "text": "đề bài đã chuẩn hóa",
  "shape_type": "pyramid / cube / prism / tetrahedron / parallelepiped / circles_sphere / composite / angle_plane_locus",
  "points_needed": ["A", "B", "C"],
  "constraints": ["SA ⊥ đáy", "AB = 4", "f(0)=0"],
  "constraints_structured": [
    { "relation": "perp", "args": ["SA", "ABCD"] },
    { "relation": "dist", "args": ["A", "B"], "value": 4 }
  ],
  "base_type": "none / isosceles_right_triangle / equilateral_triangle / square / rectangle",
  "dimensions": {"a": 4, "h": 6},
  "special_points": [{"id": "M", "type": "midpoint", "of": ["A", "B"]}],
  "circles_needed": [],
  "spheres_needed": [],
  "tags": ["3D", "Polyhedra", "Static", "Measurement"]
}`;
