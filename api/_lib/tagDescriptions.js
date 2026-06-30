export const TAG_DESCRIPTIONS = {
  // Spatial
  "2D": "Bài toán hình học phẳng (2D). Chỉ sử dụng hệ tọa độ Oxy, z=0.",
  "3D": "Bài toán hình học không gian (3D). Sử dụng hệ tọa độ Oxyz với z hướng lên.",
  "2D_to_3D": "Bài toán biến đổi từ 2D sang 3D (ví dụ quay hình phẳng quanh trục).",
  "Pseudo_3D": "Bài toán giả lập 3D từ các góc nhìn hoặc hình chiếu.",
  
  // Geometry
  "Polyhedra": "Dựng khối đa diện (hình chóp, hình lăng trụ, hình lập phương...). Sử dụng các điểm và đoạn thẳng để nối các đỉnh.",
  "Round_Bodies": "Khối tròn xoay (hình cầu, hình trụ, hình nón...). Hãy sử dụng thuộc tính circles hoặc spheres thay vì vẽ chi tiết lưới.",
  "Conic_Surfaces": "Mặt conic (paraboloid, hyperboloid, elipsoid). Thiết lập các phương trình bề mặt hoặc các đường cong tương ứng.",
  "Composite": "Khối phức hợp, kết hợp nhiều hình với nhau.",
  "Curve_Driven": "Hình tạo bởi đường cong tham số. Sử dụng phương trình tham số cho đường cong.",
  
  // Dynamic
  "Static": "Bài toán tĩnh. CHỈ cần xác định toạ độ tĩnh của đối tượng, không cần thiết lập timeline hay chuyển động.",
  "Kinematic": "Bài toán động học hoặc quỹ tích. BẮT BUỘC thiết lập 'timeline' với 'duration' và các 'tracks' chuyển động (tịnh tiến, quay, quỹ đạo) cho các điểm/mặt liên quan.",
  "Morphing": "Bài toán biến dạng (thay đổi kích thước/hình dạng theo thời gian). Sử dụng timeline để biến đổi các thông số toạ độ.",
  "Geodesic": "Bài toán trắc địa, đường đi ngắn nhất trên mặt cong.",
  
  // Goal
  "Measurement": "Bài toán tính toán đại lượng (độ dài, góc, khoảng cách). Đảm bảo tọa độ của các điểm chính xác để đo đạc.",
  "Volume_Area": "Bài toán tính thể tích / diện tích. Dựng chính xác các đỉnh và đường bao của mặt phẳng/khối.",
  "Extremum": "Bài toán cực trị (Min/Max). Cần tham số hóa một biến (ví dụ x, t) và biểu diễn sự thay đổi để tìm vị trí tối ưu.",
  "Intersection": "Bài toán tìm giao tuyến, thiết diện. Rất quan trọng việc dựng được mặt cắt (thiết diện) xuyên qua khối.",
  "Proof": "Bài toán chứng minh tính chất hình học.",
  
  // Technique
  "Integral_2D": "Tính tích phân 2D (diện tích hình phẳng).",
  "Integral_Solid_of_Revolution": "Tích phân mặt tròn xoay (thể tích vật thể xoay).",
  "Integral_Cross_Section": "Tích phân mặt cắt ngang (thể tích theo lát cắt).",
  "Related_Rates": "Tốc độ biến thiên liên quan.",
  "CSG": "Kiến tạo khối (Constructive Solid Geometry).",
  "Mesh_Geodesic": "Lưới trắc địa.",
  "Variational": "Phép biến phân."
};

/**
 * Maps an array of tag IDs to a formatted string of descriptions.
 */
export function getDescriptionsForTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  
  const descriptions = tags
    .map(tag => TAG_DESCRIPTIONS[tag])
    .filter(Boolean);
    
  if (descriptions.length === 0) return '';
  
  return descriptions.map((desc, i) => `${i + 1}. ${desc}`).join('\\n');
}
