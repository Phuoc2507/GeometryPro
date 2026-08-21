import type { SafetyClassification } from '@/lib/safetyTier';
export interface Point3D {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  color?: string;
  hidden?: boolean;
  dim?: boolean;        // ∈ visibleIds nhưng thuộc câu trước → mờ
  highlight?: boolean;  // mới ở câu hiện tại → nổi
}

export interface PointCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface Line3D {
  id: string;
  from: string; // Point ID
  to: string; // Point ID
  style?: 'solid' | 'dashed';
  color?: string;
  hidden?: boolean;     // ∉ visibleIds ở câu hiện tại → không vẽ
  dim?: boolean;        // ∈ visibleIds nhưng thuộc câu trước → mờ
  highlight?: boolean;  // mới ở câu hiện tại → nổi
}

// Cờ bóc-lớp (advance mode) dùng chung cho các shape có id: ẩn/mờ/nổi theo câu hiện tại.
interface AdvanceFlags {
  hidden?: boolean;     // ∉ visibleIds ở câu hiện tại → không vẽ
  dim?: boolean;        // ∈ visibleIds nhưng thuộc câu trước → mờ
  highlight?: boolean;  // mới ở câu hiện tại → nổi
}

export interface Sphere3D extends AdvanceFlags {
  id: string;
  label?: string;
  center: { x: number; y: number; z: number };
  radius: number;
  color?: string;
  opacity?: number;
}

export interface Circle3D extends AdvanceFlags {
  id: string;
  label?: string;
  center: { x: number; y: number; z: number };
  radius: number;
  normal: { x: number; y: number; z: number }; // orientation vector
  color?: string;
}

export interface Cylinder3D extends AdvanceFlags {
  id: string;
  label?: string;
  center1: { x: number; y: number; z: number }; // bottom center
  center2: { x: number; y: number; z: number }; // top center
  radius: number;
  color?: string;
}

export interface Cone3D extends AdvanceFlags {
  id: string;
  label?: string;
  apex: { x: number; y: number; z: number };
  baseCenter: { x: number; y: number; z: number };
  radius: number;
  color?: string;
}

export interface Plane3D {
  id: string;
  label?: string;
  /** Corner coordinates are retained for API and saved-geometry compatibility. */
  points: PointCoordinates[];
  /** Point identities when this plane was created from existing points. */
  pointIds?: string[];
  color?: string;
  opacity?: number;
  hidden?: boolean;     // ∉ visibleIds ở câu hiện tại → không vẽ
  dim?: boolean;        // ∈ visibleIds nhưng thuộc câu trước → mờ
  highlight?: boolean;  // mới ở câu hiện tại → nổi
}

// ═══ Annotation types (Phase 1 Pro) ═══

export interface Vector3D {
  id: string;
  from: string; // Point ID
  to: string;   // Point ID
  label?: string;
  color?: string;
}

export interface Angle3D {
  id: string;
  vertex: string;  // Point ID — đỉnh góc
  p1: string;      // Point ID — điểm trên tia 1
  p2: string;      // Point ID — điểm trên tia 2
  label?: string;   // e.g. "60°"
  color?: string;
}

export interface RightAngle3D {
  id: string;
  vertex: string;  // Point ID — đỉnh vuông góc
  p1: string;      // Point ID — điểm trên tia 1
  p2: string;      // Point ID — điểm trên tia 2
}

export interface EqualMark {
  id: string;
  lineId: string;  // Line ID to mark
  count: 1 | 2 | 3; // number of tick marks
}

export interface ParallelMark {
  id: string;
  lineId: string;  // Line ID to mark
  count: 1 | 2;   // number of arrow marks
}

export interface Measurement3D {
  id: string;
  type: 'distance' | 'angle';
  value: string;  // display text, e.g. "2a" or "60°"
  from: string;   // Point ID
  to: string;     // Point ID (or vertex for angle)
  color?: string;
}

export interface DynamicPoint {
  id: string;         // e.g. "M"
  label: string;
  from: string;       // Point ID — start of segment
  to: string;         // Point ID — end of segment
  k: number;          // 0..1 ratio AM/AB
  color?: string;
}

export interface Surface3D {
  id: string;
  label?: string;
  type: 'hyperboloid' | 'paraboloid' | 'torus' | 'revolution';
  center: { x: number; y: number; z: number };
  params: Record<string, number>; // a, b, c, r, R etc. (parabola: a,b,c,xMin,xMax)
  color?: string;
  opacity?: number;
  /** Trục quay. Vắng ⇒ đứng (quanh Oz). 'Ox'/[1,0,0] ⇒ nằm ngang, mở dọc trục x. Vẽ nhanh phát field này. */
  axis?: 'Ox' | 'Oy' | 'Oz' | [number, number, number];
  /** Loại đường sinh: 'parabola' ⇒ bán kính = a·x²+b·x+c trên [xMin,xMax] (thay cho r0/h/taper mặc định). */
  curve?: string;
}

// ConstraintVerifier — structured constraint from step1 parse
export interface GeometryConstraint {
  type:
    | 'perpendicular_lines'   // AB ⊥ CD
    | 'perpendicular_plane'   // AB ⊥ đáy
    | 'parallel'              // AB ∥ CD
    | 'midpoint'              // M là trung điểm AB
    | 'equal_length'          // AB = CD
    | 'distance'              // AB = 4
    | 'unknown';
  entities: string[];          // segment/point IDs involved
  value?: number;              // for 'distance' type
  label: string;               // original constraint string, e.g. "SA ⊥ đáy"
  ok?: boolean;                // verification result (filled by server)
  delta?: number;              // numeric error (filled by server)
}

export interface AnimationTrack {
  id: string;
  start: number; // time in seconds
  end: number;   // time in seconds
  type: 'water_level' | 'translate' | 'parametric_path' | 'fold' | 'fade';
  targetId?: string; // which object to animate (e.g., 'tent', 'rescuer', 'victim')
  params: {
    displacement_function?: string;
    D?: string;
    height_function?: string;
    h?: string;
    path?: string;
    equations?: { x: string; y: string; z: string };
    final_position?: [number, number, number];
    landing_point?: [number, number, number];
    axisPoint?: PointCoordinates;
    axisDir?: PointCoordinates;
    x_start?: number;
    y_start?: number;
    z_start?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    final_height?: number;
    max_height?: number;
    opacityStart?: number;
    opacityEnd?: number;
    angleStart?: number;
    angleEnd?: number;
    [key: string]: unknown;
  };
}

export interface AnimationTimeline {
  duration: number; // total duration in seconds
  tracks: AnimationTrack[];
}

// ═══ Advance mode — hình dẫn xuất theo từng câu ═══

export interface AdvanceStep {
  id: string;
  label: string;
  visibleIds: string[];
  highlightIds?: string[];
  answer?: { text?: string; approx?: number; verified: boolean };
  timeline?: AnimationTimeline;
  /** Lời giải từng bước cho câu này (B2 backend nạp). import type: bị erase, không tạo vòng lặp runtime. */
  solution?: import('@/hooks/useSolver').SolveResult;
  anim?: {
    param: 'sweep' | 'angle' | 'slab' | 'reveal';
    label: string;   // nhãn hiển thị cạnh thanh kéo, ví dụ "Quét tròn xoay"
    tMax: number;    // giá trị vật lý ứng với t=1 (Đợt 1: bằng b của domain)
    autoplay?: boolean;
  };
}

export interface AdvanceScene {
  base: GeometryData;
  steps: AdvanceStep[];
}

export interface Agent3D {
  id: string;
  label: string;
  initialPosition: [number, number, number];
  color: string;
  radius?: number;
}

export interface Curve3D extends AdvanceFlags {
  id: string;
  type: 'parabola' | 'cubic' | 'rational' | 'expr';
  params: Record<string, number>; // e.g. {a, b, c, d, xMin, xMax}
  /** Biểu thức 1 biến x (cùng ngữ pháp parseExpr: exp, sqrt, ln/log, sin/cos/tan, abs, pi, e, ^). */
  expr?: string;
  /** Mẫu {x,y} do engine tính sẵn (từ expr) ⇒ frontend vẽ Line mượt mà KHÔNG cần parser. */
  samples?: { x: number; y: number }[];
  color?: string;
  style?: 'solid' | 'dashed';
  plane?: 'xy' | 'xz' | 'yz'; // Which mathematical plane the curve is drawn on
  fill?: boolean;
  fillOpacity?: number;
}

// ── Calculus: khối tròn xoay (Đợt 1) ───────────────────────────────
// Biên dạng r(x): khoảng cách từ trục tới mặt, theo tọa độ dọc trục x.
export type ProfileFn =
  | { kind: 'poly'; coeffs: number[] }   // c0 + c1·x + c2·x² + …
  | { kind: 'sqrt'; a: number; b: number } // a·√x + b
  | { kind: 'const'; c: number }
  | { kind: 'expr'; expr: string }       // biểu thức 1 biến x tổng quát: e^x, sin(x), ln(x), 1/x, sqrt(4-x^2)…
  | { kind: 'piecewise'; segments: VesselSegment[] }; // biên dạng GHÉP khúc — vật thật (bình/lu/chậu/phễu)

// Một KHÚC của biên dạng ghép (vessel = vật thể tròn xoay quanh trục đứng, cho bằng SỐ ĐO).
// [x0,x1] là đoạn dọc trục (tăng dần, các khúc tiếp giáp nhau, có thể có bậc bán kính giữa 2 khúc).
//  - cylinder : bán kính không đổi r  → r(x)=r.
//  - frustum  : bán kính đi thẳng r0→r1 (nón cụt; nón đặc khi r0=0 hoặc r1=0) → r(x) tuyến tính.
//  - sphereZone: cung mặt cầu bán kính R, tâm nằm trên trục tại toạ độ c → r(x)=√(R²−(x−c)²)
//                (chỏm cầu / đới cầu; cầu bị cắt 2 chỏm = 1 sphereZone với [x0,x1] nằm trong (c−R,c+R)).
export type VesselSegment =
  | { type: 'cylinder'; x0: number; x1: number; r: number }
  | { type: 'frustum'; x0: number; x1: number; r0: number; r1: number }
  | { type: 'sphereZone'; x0: number; x1: number; R: number; c: number };

// Kết quả đã (hoặc chưa) tự-kiểm bằng lõi tất định.
export interface Verified<T> {
  value: T;
  latex: string;
  verified: boolean;        // false ⇒ hiển thị "chưa kiểm chứng", không bịa
  estimatedError?: number;
}

export interface RevolutionSolid extends AdvanceFlags {
  id: string;
  outer: ProfileFn;         // biên ngoài r(x)
  inner?: ProfileFn;        // biên trong (washer) — Đợt 2, giữ optional
  axis: 'Ox' | 'Oy';        // Đợt 1 chỉ dùng 'Ox'
  // Trục quay DỜI theo phương ngang y=axisY (chỉ với axis='Ox'). Mặc định/vắng ⇒ 0 (chính là Ox).
  // Bán kính mỗi điểm = |r(x) − axisY|; renderer tịnh tiến khối lên y=axisY để hiển thị đúng.
  axisY?: number;
  domain: [number, number]; // [a, b]
  method: 'disk' | 'washer' | 'shell';
  volume?: Verified<number>;
  color?: string;
  /** Vẽ nhanh/Vẽ kỹ: khối bán trong suốt (nhìn xuyên thấy đường sinh). Advance KHÔNG set ⇒ giữ khối đục. */
  translucent?: boolean;
  // Mẫu biên dạng do engine tính sẵn ⇒ frontend dựng LatheGeometry mà KHÔNG cần parser biểu thức.
  samples?: { x: number; r: number }[];
  innerSamples?: { x: number; r: number }[];
}

// ── Calculus Đợt 2: thiết diện đã biết & diện tích hình phẳng ──────
// (1) Khối có thiết diện vuông góc trục đã biết: V = ∫ k·side(t)² dt.
export interface SliceStack extends AdvanceFlags {
  id: string;
  axis: 'Ox' | 'Oy';
  domain: [number, number];            // [a,b] theo biến trục
  outer: ProfileFn;                    // biên "trên" miền đáy theo biến trục
  inner?: ProfileFn;                   // biên "dưới"; bỏ ⇒ side = |outer|
  section: 'square' | 'equilateral' | 'semicircle' | 'rect';
  ratio?: number;                      // chỉ 'rect': cạnh vuông góc = ratio·side
  volume?: Verified<number>;
  color?: string;
  samples?: { t: number; side: number }[];
}

// (2) Diện tích hình phẳng: S = ∫ |outer(x) − inner(x)| dx. ĐƠN VỊ² (không phải thể tích).
export interface AreaRegion extends AdvanceFlags {
  id: string;
  outer: ProfileFn;                    // đường trên f(x)
  inner: ProfileFn;                    // đường dưới g(x)
  domain: [number, number];            // [a,b]
  area?: Verified<number>;
  color?: string;
  slabDepth?: number;                  // bề dày "tấm" khi đùn để nhìn 3D
  samples?: { x: number; top: number; bot: number }[];
}

// ── Calculus Đợt 3: thiết diện = mặt phẳng ∩ khối đa diện ───────────
// Cách xác định điểm tạo mặt phẳng: đỉnh có tên, HOẶC điểm trên cạnh (t∈[0,1] từ v1→v2; 0.5 = trung điểm).
export type SectionPointSpec =
  | { vertex: string }                              // 'A', 'S', "C'"…
  | { onEdge: [string, string]; t: number };        // t·(v2−v1)+v1; t=0.5 ⇒ trung điểm

export type PolyhedronKind = 'cube' | 'box' | 'pyramid-quad' | 'prism-tri';

export interface SectionCut extends AdvanceFlags {
  id: string;
  targetKind: PolyhedronKind;                       // khối bị cắt (nhãn)
  polygon: [number, number, number][];              // đỉnh đa giác thiết diện, thứ tự vòng (engine dựng)
  plane: { point: [number, number, number]; normal: [number, number, number] };
  area?: Verified<number>;
  color?: string;
}

export interface GeometryData {
  id?: string;
  position?: [number, number, number];
  name: string;
  points: Point3D[];
  lines: Line3D[];
  spheres?: Sphere3D[];
  circles?: Circle3D[];
  cylinders?: Cylinder3D[];
  cones?: Cone3D[];
  planes?: Plane3D[];
  vectors?: Vector3D[];
  angles?: Angle3D[];
  rightAngles?: RightAngle3D[];
  equalMarks?: EqualMark[];
  parallelMarks?: ParallelMark[];
  measurements?: Measurement3D[];
  dynamicPoints?: DynamicPoint[];
  surfaces?: Surface3D[];
  curves?: Curve3D[];
  revolutionSolids?: RevolutionSolid[];
  sliceStacks?: SliceStack[];
  areaRegions?: AreaRegion[];
  sectionCuts?: SectionCut[];
  latexCode?: string;
  llmPrompt?: string;
  /** Ràng buộc từ step1, có thể kèm kết quả verify */
  constraints?: GeometryConstraint[];
  /** 0–1: mức độ tin cậy từ ConstraintVerifier (1 = pass hết) */
  confidence?: number;
  /** Phân loại 3 mức an toàn (B): mức + chính xác + dạng bài + lý do. Lồng ⇒ tự sống sót qua spread. */
  classification?: SafetyClassification;
  /** Đáp engine (text/approx) đã tính ở bước VẼ — /api/solve tái dùng để KHỎI dịch lại. */
  engineAnswer?: { text: string; approx: number | null; verified?: boolean };
  /** TRỌN kết quả engine tất định từ bước VẼ (ok/answers/violations/tier). /api/solve tái dùng
   *  để bỏ HẲN lượt gọi translator LLM lần hai (tiết kiệm token cho bài THANG CHỮ, cạnh 'a'…). */
  engineSolve?: { ok: boolean; answers: unknown[]; violations: unknown[]; tier: unknown };
  /** ĐỀ đã sinh ra engineAnswer/engineSolve ở bước VẼ. /api/solve chỉ tái dùng đáp engine khi đề
   *  hiện tại KHỚP giá trị này (chống dùng đáp cũ cho câu hỏi đã bị sửa trên cùng một hình). */
  engineProblem?: string;
  timeline?: AnimationTimeline;
  agents?: Agent3D[];
  tags?: string[];
  axisUnit?: string;
  detailLevel?: DetailLevel;
  /** Lời giải đã lưu KÈM hình để tải lại không mất (đề + các bước). import type: không tạo vòng lặp runtime. */
  solve?: { problem: string; result: import('@/hooks/useSolver').SolveResult };
  /** Advance: nhúng CẢ cảnh (base + steps + lời giải) khi lưu 1 lượt Advance vào lịch sử,
   *  để mở lại KHÔNG mất stepper/lời giải/reveal. loadGeometry phát hiện field này → SET_ADVANCE_SCENE. */
  advanceScene?: AdvanceScene;
  /** Chế độ vẽ đã tạo ra hình này (quick=Vẽ nhanh, detailed=Vẽ kỹ, advance=Advance).
   *  Nhúng vào geometry_data để danh sách lịch sử hiển thị "dùng mô hình nào" mà không cần cột DB mới. */
  drawMode?: 'quick' | 'detailed' | 'advance';
}

export type DetailLevel = 'static' | 'cinematic' | 'step_by_step';

export type QueueItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  prompt: string;
  /** Đề bài ĐẦY ĐỦ (không cắt) — dùng cho ô Giải; `prompt` chỉ là nhãn hiển thị ngắn. */
  problemText?: string;
  mode: string;
  status: QueueItemStatus;
  progress: number;
  statusText: string;
  streamingText?: string;
  geometry: GeometryData | null;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export type ManualTool = 'addPoint' | 'addLine' | 'midpoint' | 'addPlane' | 'delete' | 'equation' | null;

export interface GeometryState {
  geometry: GeometryData | null;
  undoStack: GeometryData[];
  redoStack: GeometryData[];
  isScanning: boolean;
  isBuilding: boolean;
  scanProgress: number;
  scanStatus: string;
  queue: QueueItem[];
  activeQueueId: string | null;
  manualMode: boolean;
  manualTool: ManualTool;
  videoMode: boolean;
  autoRotate: boolean;
  freeCameraMode: boolean;
  showPoints: boolean;
  autoColor: boolean;
  showCoordinateGrid: boolean;
  /** Chế độ xem: dời gốc toạ độ về tâm mặt cầu (chỉ hình có cầu). Xem recenterGeometry.ts. */
  recenterToSphere: boolean;
  /** Chế độ xem: dời gốc toạ độ về tâm mặt phẳng đáy (hình chóp/khối có đáy). Loại trừ với recenterToSphere. */
  recenterToBase: boolean;
  aiModel: 'max' | 'high' | 'medium' | 'low';
  useReasoning: boolean;
  streamingText?: string;
  selectedIds: string[];
  advanceScene?: AdvanceScene | null;
  currentStep: number;
  advanceT: number;
}

export type GeometryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'START_SCANNING' }
  | { type: 'STOP_SCANNING' }
  | { type: 'TOGGLE_POINTS' }
  | { type: 'TOGGLE_AUTO_COLOR' }
  | { type: 'TOGGLE_COORDINATE_GRID' }
  | { type: 'TOGGLE_RECENTER_TO_SPHERE' }
  | { type: 'TOGGLE_RECENTER_TO_BASE' }
  | { type: 'UPDATE_SCAN_PROGRESS'; progress: number; status: string }
  | { type: 'SET_GEOMETRY'; geometry: GeometryData; undoStack?: GeometryData[]; redoStack?: GeometryData[] }
  | { type: 'START_BUILDING' }
  | { type: 'FINISH_BUILDING' }
  | { type: 'CLEAR_GEOMETRY' }
  | { type: 'QUEUE_ADD'; item: QueueItem }
  | { type: 'QUEUE_UPDATE'; id: string; updates: Partial<QueueItem> }
  | { type: 'QUEUE_REMOVE'; id: string }
  | { type: 'QUEUE_SET_ACTIVE'; id: string | null }
  | { type: 'ADD_POINT'; point: Point3D }
  | { type: 'ADD_LINE'; line: Line3D }
  | { type: 'ADD_PLANE'; plane: Plane3D }
  | { type: 'REMOVE_ELEMENT'; elementType: 'point' | 'line' | 'plane' | 'curve' | 'sphere' | 'cylinder' | 'circle' | 'cone'; elementId: string }
  | { type: 'UPDATE_POINT'; pointId: string; x: number; y: number; z: number }
  | { type: 'SET_MANUAL_MODE'; enabled: boolean }
  | { type: 'SET_MANUAL_TOOL'; tool: ManualTool }
  | { type: 'SET_VIDEO_MODE'; enabled: boolean }
  | { type: 'SET_AUTO_ROTATE'; enabled: boolean }
  | { type: 'SET_AI_MODEL'; model: 'max' | 'high' | 'medium' | 'low' }
  | { type: 'SET_USE_REASONING'; enabled: boolean }
  | { type: 'APPEND_STREAMING_TEXT'; text: string }
  | { type: 'CLEAR_STREAMING_TEXT' }
  | { type: 'TOGGLE_VIDEO_MODE' }
  | { type: 'SET_FREE_CAMERA_MODE'; enabled: boolean }
  | { type: 'SET_SELECTED_IDS'; ids: string[] }
  | { type: 'TOGGLE_SELECTION'; id: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_ADVANCE_SCENE'; scene: AdvanceScene }
  | { type: 'SET_STEP'; index: number }
  | { type: 'ADVANCE_SET_T'; payload: number };
