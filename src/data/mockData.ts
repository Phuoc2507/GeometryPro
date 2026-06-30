import { GeometryData } from '@/types/geometry';

export const PYRAMID_MOCK_DATA: GeometryData = {
  name: 'Square Pyramid S.ABCD',
  points: [
    { id: 'A', label: 'A', x: -2, y: 0, z: -2 },
    { id: 'B', label: 'B', x: 2, y: 0, z: -2 },
    { id: 'C', label: 'C', x: 2, y: 0, z: 2 },
    { id: 'D', label: 'D', x: -2, y: 0, z: 2 },
    { id: 'S', label: 'S', x: 0, y: 5, z: 0 },
  ],
  lines: [
    // Base edges
    { id: 'AB', from: 'A', to: 'B', style: 'solid' },
    { id: 'BC', from: 'B', to: 'C', style: 'solid' },
    { id: 'CD', from: 'C', to: 'D', style: 'solid' },
    { id: 'DA', from: 'D', to: 'A', style: 'solid' },
    // Apex edges
    { id: 'SA', from: 'S', to: 'A', style: 'solid' },
    { id: 'SB', from: 'S', to: 'B', style: 'solid' },
    { id: 'SC', from: 'S', to: 'C', style: 'solid' },
    { id: 'SD', from: 'S', to: 'D', style: 'solid' },
    // Hidden diagonals (dashed)
    { id: 'AC', from: 'A', to: 'C', style: 'dashed' },
    { id: 'BD', from: 'B', to: 'D', style: 'dashed' },
  ],
  latexCode: `\\begin{tikzpicture}[scale=1.5]
  % Define coordinates
  \\coordinate (A) at (-2, 0, -2);
  \\coordinate (B) at (2, 0, -2);
  \\coordinate (C) at (2, 0, 2);
  \\coordinate (D) at (-2, 0, 2);
  \\coordinate (S) at (0, 4, 0);
  
  % Draw base (ABCD)
  \\draw[thick] (A) -- (B) -- (C) -- (D) -- cycle;
  
  % Draw edges to apex
  \\draw[thick] (S) -- (A);
  \\draw[thick] (S) -- (B);
  \\draw[thick] (S) -- (C);
  \\draw[thick] (S) -- (D);
  
  % Draw hidden edges (dashed)
  \\draw[dashed] (A) -- (C);
  \\draw[dashed] (B) -- (D);
  
  % Label vertices
  \\node[below left] at (A) {$A$};
  \\node[below right] at (B) {$B$};
  \\node[above right] at (C) {$C$};
  \\node[above left] at (D) {$D$};
  \\node[above] at (S) {$S$};
\\end{tikzpicture}`,
  llmPrompt: `=== SYSTEM PROMPT ===
Bạn là chuyên gia phân tích hình học không gian 3D.
Nhiệm vụ của bạn là dựng hình chóp tứ giác đều S.ABCD.

=== USER MESSAGE ===
Vẽ cho tôi hình chóp S.ABCD có đáy là hình vuông.`,
};

export const SCAN_STATUSES = [
  'Đang gửi yêu cầu...',
  'Đang phân tích đề bài...',
  'Đang xác định loại hình...',
  'Đang tính toán tọa độ...',
  'Đang xác định nét khuất...',
  'Đang xây dựng mô hình...',
];

export const HISTORY_ITEMS = [
  { id: '1', name: 'Cube ABCD.EFGH', date: '2 hours ago' },
  { id: '2', name: 'Tetrahedron ABCD', date: 'Yesterday' },
  { id: '3', name: 'Triangular Prism', date: '3 days ago' },
  { id: '4', name: 'Octahedron', date: 'Last week' },
];

export const SATELLITE_DEMO_DATA: GeometryData = {
  name: 'Quỹ đạo vệ tinh Oxyz',
  points: [
    { id: 'O', label: 'O', x: 0, y: 0, z: 0 },
    { id: 'B', label: 'B', x: 4032, y: 0, z: -5376 },
    { id: 'M', label: 'M', x: 0, y: 3840, z: 5120 },
    { id: 'I', label: 'I', x: -4032, y: 0, z: 5376 },
    { id: 'P', label: 'P', x: 9380.991683, y: 0, z: 4524.38148 }
  ],
  lines: [
    { id: 'l1', from: 'B', to: 'P', style: 'solid' },
    { id: 'l2', from: 'O', to: 'B', style: 'dashed' },
    { id: 'l3', from: 'O', to: 'P', style: 'dashed' },
    { id: 'l4', from: 'M', to: 'P', style: 'dashed' },
    { id: 'l5', from: 'M', to: 'B', style: 'dashed' },
    { id: 'l6', from: 'I', to: 'P', style: 'dashed' },
    { id: 'l7', from: 'I', to: 'B', style: 'dashed' }
  ],
  spheres: [
    {
      id: 'sphere_O',
      label: 'Trái Đất',
      center: { x: 0, y: 0, z: 0 },
      radius: 6400
    }
  ],
  circles: [
    {
      id: 'circle_I',
      label: 'Quỹ đạo',
      center: { x: -4032, y: 0, z: 5376 },
      radius: 13440,
      normal: { x: 0, y: 1, z: 0 }
    }
  ],
  latexCode: `% Vẽ trực tiếp trên giao diện hoặc sử dụng TikZ xuất bản.`
};
