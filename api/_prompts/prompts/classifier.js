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

CHỈ trả về JSON thuần, KHÔNG markdown theo định dạng sau:
{
  "text": "đề bài đã chuẩn hóa",
  "shape_type": "pyramid / cube / prism / tetrahedron / parallelepiped / circles_sphere / composite / angle_plane_locus",
  "points_needed": ["A", "B", "C"],
  "constraints": ["SA ⊥ đáy", "AB = 4", "f(0)=0"],
  "base_type": "none / isosceles_right_triangle / equilateral_triangle / square / rectangle",
  "dimensions": {"a": 4, "h": 6},
  "special_points": [{"id": "M", "type": "midpoint", "of": ["A", "B"]}],
  "circles_needed": [],
  "spheres_needed": [],
  "tags": ["3D", "Polyhedra", "Static", "Measurement"]
}`;
