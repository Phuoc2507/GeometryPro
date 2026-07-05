export interface Point3D {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  color?: string;
  hidden?: boolean;
}

export interface Line3D {
  id: string;
  from: string; // Point ID
  to: string; // Point ID
  style?: 'solid' | 'dashed';
  color?: string;
}

export interface Sphere3D {
  id: string;
  label?: string;
  center: { x: number; y: number; z: number };
  radius: number;
  color?: string;
  opacity?: number;
}

export interface Circle3D {
  id: string;
  label?: string;
  center: { x: number; y: number; z: number };
  radius: number;
  normal: { x: number; y: number; z: number }; // orientation vector
  color?: string;
}

export interface Cylinder3D {
  id: string;
  label?: string;
  center1: { x: number; y: number; z: number }; // bottom center
  center2: { x: number; y: number; z: number }; // top center
  radius: number;
  color?: string;
}

export interface Cone3D {
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
  points: { x: number; y: number; z: number }[]; // 3-4 corner points defining the plane
  color?: string;
  opacity?: number;
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
  params: Record<string, number>; // a, b, c, r, R etc.
  color?: string;
  opacity?: number;
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
  params: Record<string, any>; // vx, vy, vz, function strings, etc.
}

export interface AnimationTimeline {
  duration: number; // total duration in seconds
  tracks: AnimationTrack[];
}

export interface Agent3D {
  id: string;
  label: string;
  initialPosition: [number, number, number];
  color: string;
  radius?: number;
}

export interface Curve3D {
  id: string;
  type: 'parabola' | 'cubic' | 'rational';
  params: any; // e.g. {a, b, c, d, xMin, xMax}
  color?: string;
  style?: 'solid' | 'dashed';
  plane?: 'xy' | 'xz' | 'yz'; // Which mathematical plane the curve is drawn on
  fill?: boolean;
  fillOpacity?: number;
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
  latexCode?: string;
  /** Ràng buộc từ step1, có thể kèm kết quả verify */
  constraints?: GeometryConstraint[];
  /** 0–1: mức độ tin cậy từ ConstraintVerifier (1 = pass hết) */
  confidence?: number;
  timeline?: AnimationTimeline;
  agents?: Agent3D[];
  tags?: string[];
  axisUnit?: string;
  detailLevel?: DetailLevel;
}

export type DetailLevel = 'static' | 'cinematic' | 'step_by_step';

export type QueueItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface QueueItem {
  id: string;
  prompt: string;
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
  aiModel: 'max' | 'high' | 'medium' | 'low';
  useReasoning: boolean;
  streamingText?: string;
  selectedIds: string[];
}

export type GeometryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'START_SCANNING' }
  | { type: 'STOP_SCANNING' }
  | { type: 'TOGGLE_POINTS' }
  | { type: 'TOGGLE_AUTO_COLOR' }
  | { type: 'UPDATE_SCAN_PROGRESS'; progress: number; status: string }
  | { type: 'SET_GEOMETRY'; geometry: GeometryData }
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
  | { type: 'CLEAR_SELECTION' };
