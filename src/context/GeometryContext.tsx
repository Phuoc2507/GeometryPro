import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { GeometryState, GeometryAction, GeometryData, QueueItem, Point3D, Line3D, Plane3D, ManualTool, AdvanceScene, DetailLevel } from '@/types/geometry';
import { loadPreferences, savePreferences } from '@/lib/preferences';
import { PYRAMID_MOCK_DATA, SATELLITE_DEMO_DATA, SCAN_STATUSES } from '@/data/mockData';
import { lod4DemoData } from '@/lib/lod4DemoData';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cacheQuotaFromResponse } from '@/lib/quota';
import { collectPlanePointIds, planeReferencesPoint } from '@/lib/geometry/planeReferences';
import { normalizePlanarPolygon } from '@/lib/geometry/planeGeometry';
const LOCAL_API = import.meta.env.VITE_LOCAL_API_URL ?? '';

interface LocalApiError {
  message: string;
  code?: string;
  status?: number;
}

interface LocalApiData {
  error?: string;
  code?: string;
  mode?: string;
  scene?: AdvanceScene;
  geometry?: GeometryData;
  step1?: { text?: string; tags?: string[]; detailLevel?: DetailLevel };
  step2?: { geometry?: GeometryData; llmPrompt?: string };
  needsClarification?: boolean;
  message?: string;
  addedElements?: { points?: unknown[]; lines?: unknown[] };
  /** Đề tròn xoay KHÔNG dựng được → báo thẳng, giữ canvas cũ (server đã hoàn credit). */
  revUnsupported?: boolean;
  /** Đọc ảnh đề hỏng (không chắc là đề tròn xoay) → đổi tiêu đề báo cho đúng. */
  imageReadFailed?: boolean;
}

interface LocalApiResult {
  data: LocalApiData | null;
  error: LocalApiError | null;
}

async function invokeLocalApi(endpoint: string, body: Record<string, unknown>): Promise<LocalApiResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${LOCAL_API}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    // Đọc thân dạng CHỮ trước rồi mới thử parse JSON. Khi hàm máy chủ crash/quá giờ, Vercel trả về
    // TRANG LỖI (không phải JSON, vd "An error occurred…") — gọi res.json() thẳng sẽ ném
    // "Unexpected token 'A'…" khó hiểu. Tách ra để báo lỗi gọn gàng cho người dùng.
    const rawBody = await res.text();
    let data: LocalApiData | null = null;
    try { data = rawBody ? (JSON.parse(rawBody) as LocalApiData) : null; }
    catch { data = null; }
    if (data) cacheQuotaFromResponse(res, data);
    if (!res.ok) {
      const message = data?.error
        || (rawBody && !data
          ? `Máy chủ đang lỗi hoặc quá tải (HTTP ${res.status}), vui lòng thử lại — nếu gửi ảnh, thử chụp gọn/đề ngắn hơn.`
          : `HTTP ${res.status}`);
      return { data: null, error: { message, code: data?.code, status: res.status } };
    }
    if (!data) return { data: null, error: { message: 'Máy chủ trả dữ liệu không hợp lệ, vui lòng thử lại.' } };
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } };
  }
}

async function invokeLocalApiStream(
  endpoint: string, 
  body: Record<string, unknown>, 
  onProgress: (statusText: string, progress: number, chunk?: string) => void
): Promise<LocalApiResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${LOCAL_API}${endpoint}?stream=true`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null) as LocalApiData | null;
      cacheQuotaFromResponse(res, data);
      return { data: null, error: { message: data?.error || `HTTP ${res.status}`, code: data?.code, status: res.status } };
    }
    cacheQuotaFromResponse(res);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Stream not supported");
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let finalData: LocalApiData | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || ""; 

      for (const chunk of chunks) {
        if (chunk.startsWith('data: ')) {
          try {
            const dataStr = chunk.slice(6);
            const parsed = JSON.parse(dataStr) as LocalApiData & {
              status?: string;
              data?: LocalApiData;
              statusText?: string;
              progress?: number;
              chunk?: string;
            };
            if (parsed.error) {
              return { data: null, error: { message: parsed.error, code: parsed.code } };
            }
            if (parsed.status === 'done') {
              finalData = parsed.data;
            } else if (parsed.statusText !== undefined && parsed.progress !== undefined) {
              onProgress(parsed.statusText, parsed.progress, parsed.chunk);
            } else if (parsed.chunk !== undefined) {
              onProgress('', 0, parsed.chunk);
            }
          } catch (e) {
            console.error("Error parsing SSE chunk:", e);
          }
        }
      }
    }
    
    cacheQuotaFromResponse(res, finalData);
    return { data: finalData, error: null };
  } catch (err: unknown) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } };
  }
}

// Lỗi hết credit/quota (từ API 402) -> nên mở modal nâng cấp.
const NEEDS_UPGRADE_CODES = ['insufficient', 'quota_exceeded', 'blocked'];
function needsUpgrade(err: LocalApiError | null): boolean {
  return err?.status === 402 || NEEDS_UPGRADE_CODES.includes(err?.code);
}
const NEEDS_AUTH_CODES = ['auth_required', 'guest_quota_exceeded', 'guest_ip_quota_exceeded'];
function needsAuth(err: LocalApiError | null): boolean {
  return err?.status === 401 || err?.status === 429 || NEEDS_AUTH_CODES.includes(err?.code);
}
import { generateLatexCode } from '@/lib/geometry/generateLatex';
import { tryLocalCommand } from '@/lib/geometry/localCommands';
import { DrawMode } from '@/components/DrawModeSelector';
import { useGeometryHistory } from '@/hooks/useGeometryHistory';
import { loadUndoHistory, saveUndoHistory } from '@/lib/undoHistoryStore';

export const initialGeometryState: GeometryState = {
  geometry: null,
  undoStack: [],
  redoStack: [],
  isScanning: false,
  isBuilding: false,
  scanProgress: 0,
  scanStatus: '',
  queue: [],
  activeQueueId: null,
  manualMode: false,
  manualTool: null,
  videoMode: false,
  autoRotate: false,
  freeCameraMode: false,
  showPoints: true,
  autoColor: false,
  showCoordinateGrid: true,
  aiModel: 'high',
  useReasoning: false,
  streamingText: '',
  selectedIds: [],
  advanceScene: null,
  currentStep: 0,
  advanceT: 0,
};

function ensureGeometry(state: GeometryState): GeometryData {
  return state.geometry || { name: 'Manual', points: [], lines: [] };
}

function saveHistory(state: GeometryState): GeometryState {
  if (!state.geometry) return state;
  return {
    ...state,
    undoStack: [...state.undoStack, JSON.parse(JSON.stringify(state.geometry))],
    redoStack: []
  };
}

export function rawGeometryReducer(state: GeometryState, action: GeometryAction): GeometryState {
  switch (action.type) {
    case 'UNDO': {
      if (state.undoStack.length === 0 || !state.geometry) return state;
      const newUndoStack = [...state.undoStack];
      const prevGeometry = newUndoStack.pop()!;
      return {
        ...state,
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, JSON.parse(JSON.stringify(state.geometry))],
        geometry: prevGeometry,
        selectedIds: [],
      };
    }
    case 'REDO': {
      if (state.redoStack.length === 0 || !state.geometry) return state;
      const newRedoStack = [...state.redoStack];
      const nextGeometry = newRedoStack.pop()!;
      return {
        ...state,
        undoStack: [...state.undoStack, JSON.parse(JSON.stringify(state.geometry))],
        redoStack: newRedoStack,
        geometry: nextGeometry,
        selectedIds: [],
      };
    }
    case 'START_SCANNING':
      return { ...state, isScanning: true, scanProgress: 0, scanStatus: SCAN_STATUSES[0], streamingText: '' };
    case 'STOP_SCANNING':
      return { ...state, isScanning: false, scanProgress: 0, scanStatus: '', streamingText: '' };
    case 'TOGGLE_POINTS':
      return { ...state, showPoints: !state.showPoints };
    case 'TOGGLE_AUTO_COLOR':
      return { ...state, autoColor: !state.autoColor };
    case 'TOGGLE_COORDINATE_GRID':
      return { ...state, showCoordinateGrid: !state.showCoordinateGrid };
    case 'UPDATE_SCAN_PROGRESS':
      return { ...state, scanProgress: action.progress, scanStatus: action.status };
    case 'SET_GEOMETRY':
      return {
        ...state,
        geometry: action.geometry,
        // Mở lại một hình đã lưu ⇒ khôi phục ngăn hoàn tác/làm lại của hình đó (nếu có); mặc định rỗng.
        undoStack: action.undoStack ?? [],
        redoStack: action.redoStack ?? [],
        isScanning: false,
        // Mở/hiện MỘT hình cụ thể ⇒ thôi "đang xem job đang chạy" nên bỏ lớp phủ streaming.
        // Job vẫn chạy nền trong queue; luồng "vẽ xong" tự set lại activeQueueId ngay sau dispatch này.
        activeQueueId: null,
        advanceScene: null,
      };
    case 'SET_ADVANCE_SCENE':
      return { ...state, advanceScene: action.scene, currentStep: 0, advanceT: 0,
               geometry: action.scene.base, undoStack: [], redoStack: [] };
    case 'SET_STEP': {
      const idx = Math.max(0, Math.min(action.index, (state.advanceScene?.steps.length ?? 1) - 1));
      // Bước có animation (thanh quét/autoplay) ⇒ bắt đầu từ 0 để lộ dần rồi kết đông.
      // Bước KHÔNG có animation (vd. Câu b đọc đáp án) ⇒ khối đã kết đông đầy đủ ⇒ advanceT = 1,
      // nếu để 0 thì mặt cắt gạt sạch khối bóng và người xem thấy khối biến mất.
      const nextT = state.advanceScene?.steps[idx]?.anim ? 0 : 1;
      return { ...state, currentStep: idx, advanceT: nextT };
    }
    case 'ADVANCE_SET_T':
      return { ...state, advanceT: Math.max(0, Math.min(1, action.payload)) };
    case 'START_BUILDING':
      return { ...state, isBuilding: true };
    case 'FINISH_BUILDING':
      return { ...state, isBuilding: false };
    case 'CLEAR_GEOMETRY':
      return { ...state, geometry: null, advanceScene: null, undoStack: [], redoStack: [], isScanning: false, isBuilding: false, scanProgress: 0, scanStatus: '', activeQueueId: null, manualMode: false, manualTool: null, videoMode: false, selectedIds: [] };
    case 'QUEUE_ADD':
      return {
        ...state,
        queue: [...state.queue, action.item],
        activeQueueId: action.item.id,
      };
    case 'QUEUE_UPDATE':
      return {
        ...state,
        queue: state.queue.map(q => 
          q.id === action.id 
            ? { 
                ...q, 
                ...action.updates, 
                streamingText: action.updates.streamingText !== undefined 
                  ? (q.streamingText || '') + action.updates.streamingText 
                  : q.streamingText 
              } 
            : q
        ),
      };
    case 'QUEUE_REMOVE':
      return { ...state, queue: state.queue.filter(item => item.id !== action.id), activeQueueId: state.activeQueueId === action.id ? null : state.activeQueueId };
    case 'QUEUE_SET_ACTIVE':
      return { ...state, activeQueueId: action.id };
    case 'ADD_POINT': {
      const stateWithHistory = saveHistory(state);
      const geo = ensureGeometry(stateWithHistory);
      return { ...stateWithHistory, geometry: { ...geo, points: [...geo.points, action.point] } };
    }
    case 'ADD_LINE': {
      const stateWithHistory = saveHistory(state);
      const geo = ensureGeometry(stateWithHistory);
      return { ...stateWithHistory, geometry: { ...geo, lines: [...geo.lines, action.line] } };
    }
    case 'ADD_PLANE': {
      const stateWithHistory = saveHistory(state);
      const geo = ensureGeometry(stateWithHistory);
      return { ...stateWithHistory, geometry: { ...geo, planes: [...(geo.planes || []), action.plane] } };
    }
    case 'REMOVE_ELEMENT': {
      if (!state.geometry) return state;
      const stateWithHistory = saveHistory(state);
      const g = { ...stateWithHistory.geometry! };
      
      if (action.elementType === 'point') {
        const pointToRemove = g.points.find((point) => point.id === action.elementId);
        // Fully delete the point
        g.points = g.points.filter(p => p.id !== action.elementId);
        
        // Fully delete any lines connected to it
        g.lines = g.lines.filter(l => l.from !== action.elementId && l.to !== action.elementId);
        
        // Fully delete any planes containing it
        if (pointToRemove) {
          g.planes = (g.planes || []).filter((plane) => !planeReferencesPoint(plane, pointToRemove));
        }
      } else if (action.elementType === 'line') {
        const lineToRemove = g.lines.find(l => l.id === action.elementId);
        g.lines = g.lines.filter(l => l.id !== action.elementId);
        
        // Garbage collection for hidden points
        if (lineToRemove) {
          [lineToRemove.from, lineToRemove.to].forEach(ptId => {
            const pt = g.points.find(p => p.id === ptId);
            if (pt && pt.hidden) {
              const stillUsedByLine = g.lines.some(l => l.from === ptId || l.to === ptId);
              const stillUsedByPlane = (g.planes || []).some((plane) => planeReferencesPoint(plane, pt));
              if (!stillUsedByLine && !stillUsedByPlane) {
                g.points = g.points.filter(p => p.id !== ptId);
              }
            }
          });
        }
      } else if (action.elementType === 'plane') {
        const planeToRemove = (g.planes || []).find(p => p.id === action.elementId);
        g.planes = (g.planes || []).filter(p => p.id !== action.elementId);

        // Garbage collection for hidden points
        if (planeToRemove) {
          collectPlanePointIds(planeToRemove, g.points).forEach((ptId) => {
            const pt = g.points.find(p => p.id === ptId);
            if (pt && pt.hidden) {
              const stillUsedByLine = g.lines.some(l => l.from === ptId || l.to === ptId);
              const stillUsedByPlane = (g.planes || []).some((plane) => planeReferencesPoint(plane, pt));
              if (!stillUsedByLine && !stillUsedByPlane) {
                g.points = g.points.filter(p => p.id !== ptId);
              }
            }
          });
        }
      } else if (action.elementType === 'curve') {
        g.curves = (g.curves || []).filter(c => c.id !== action.elementId);
      } else if (action.elementType === 'sphere') {
        g.spheres = (g.spheres || []).filter(s => s.id !== action.elementId);
      } else if (action.elementType === 'cylinder') {
        g.cylinders = (g.cylinders || []).filter(c => c.id !== action.elementId);
      } else if (action.elementType === 'circle') {
        g.circles = (g.circles || []).filter(c => c.id !== action.elementId);
      } else if (action.elementType === 'cone') {
        g.cones = (g.cones || []).filter(c => c.id !== action.elementId);
      }
      return { ...stateWithHistory, geometry: g };
    }
    case 'UPDATE_POINT': {
      if (!state.geometry) return state;
      const stateWithHistory = saveHistory(state);
      return {
        ...stateWithHistory,
        geometry: {
          ...stateWithHistory.geometry!,
          points: stateWithHistory.geometry!.points.map(p =>
            p.id === action.pointId ? { ...p, x: action.x, y: action.y, z: action.z } : p
          ),
        },
      };
    }
    case 'SET_MANUAL_MODE':
      return { ...state, manualMode: action.enabled, manualTool: action.enabled ? state.manualTool : null, selectedIds: [] };
    case 'SET_MANUAL_TOOL':
      return { ...state, manualTool: action.tool, selectedIds: [] };
    case 'TOGGLE_VIDEO_MODE':
      return { ...state, videoMode: !state.videoMode };
    case 'SET_SELECTED_IDS':
      return { ...state, selectedIds: action.ids };
    case 'SET_AUTO_ROTATE':
      return { ...state, autoRotate: action.enabled };
    case 'SET_AI_MODEL':
      return { ...state, aiModel: action.model };
    case 'SET_USE_REASONING':
      return { ...state, useReasoning: action.enabled };
    case 'APPEND_STREAMING_TEXT':
      return { ...state, streamingText: (state.streamingText || '') + action.text };
    case 'CLEAR_STREAMING_TEXT':
      return { ...state, streamingText: '' };
    case 'TOGGLE_SELECTION': {
      const isSelected = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: isSelected 
          ? state.selectedIds.filter(id => id !== action.id)
          : [...state.selectedIds, action.id]
      };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: [] };
    default:
      return state;
  }
}

export interface GeometryContextType {
  state: GeometryState;
  startDemo: (type?: 'pyramid' | 'satellite' | 'lod4' | GeometryData) => void;
  analyzeImage: (imageBase64: string) => Promise<void>;
  analyzeText: (prompt: string, mode?: DrawMode) => Promise<void>;
  analyzeAdvance: (prompt: string, imageBase64?: string) => Promise<void>;
  setStep: (i: number) => void;
  setAdvanceT: (t: number) => void;
  queueAnalyzeText: (prompt: string, mode?: DrawMode, tags?: string[], detailLevel?: import('@/types/geometry').DetailLevel, offset?: [number, number, number]) => void;
  queueAnalyzeImage: (imageBase64: string, mode?: DrawMode, tags?: string[], detailLevel?: import('@/types/geometry').DetailLevel) => void;
  modifyGeometry: (prompt: string, opts?: { aiMode?: boolean }) => Promise<void>;
  loadGeometry: (geometry: GeometryData, opts?: { silent?: boolean; historyId?: string }) => void;
  clearGeometry: () => void;
  stopScanning: () => void;
  viewQueueItem: (id: string) => void;
  removeQueueItem: (id: string) => void;
  clearActiveQueue: () => void;
  updateDynamicPoint: (id: string, k: number) => void;
  addPoint: (label: string, x: number, y: number, z: number) => void;
  addLine: (fromId: string, toId: string, style: 'solid' | 'dashed') => void;
  addMidpoint: (p1Id: string, p2Id: string) => void;
  addPlane: (pointIds: string[]) => boolean;
  addPlaneFromEquation: (a: number, b: number, c: number, d: number) => void;
  removeElement: (type: 'point' | 'line' | 'plane' | 'curve' | 'sphere' | 'cylinder' | 'circle' | 'cone', id: string) => void;
  updatePoint: (id: string, x: number, y: number, z: number) => void;
  setManualMode: (enabled: boolean) => void;
  setManualTool: (tool: ManualTool) => void;
  setVideoMode: (enabled: boolean) => void;
  toggleVideoMode: () => void;
  setSelectedIds: (ids: string[]) => void;
  setAutoRotate: (enabled: boolean) => void;
  togglePoints: () => void;
  toggleAutoColor: () => void;
  toggleCoordinateGrid: () => void;
  setAiModel: (model: 'max' | 'high' | 'medium' | 'low') => void;
  setUseReasoning: (enabled: boolean) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const GeometryContext = createContext<GeometryContextType | undefined>(undefined);

let queueIdCounter = 0;

export function GeometryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    rawGeometryReducer,
    initialGeometryState,
    (base): GeometryState => {
      const prefs = loadPreferences();
      return {
        ...base,
        showPoints: prefs.showPoints,
        autoColor: prefs.autoColorPlanes,
        autoRotate: prefs.autoRotate,
        showCoordinateGrid: prefs.showCoordinateGrid,
      };
    },
  );
  const stateRef = useRef(state);
  const scanSessionRef = useRef(0);
  const { addToHistory, updateGeometryData } = useGeometryHistory();

  // Chỉnh sửa thủ công (thêm/xóa/di chuyển điểm, đường, mặt phẳng…) và undo/redo bật cờ này.
  // Cờ giúp phân biệt "người dùng SỬA hình" với "nạp hình lúc load / AI sinh" → chỉ lưu ngược khi thật sự sửa.
  const pendingPersistRef = useRef(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestPersist = useCallback(() => { pendingPersistRef.current = true; }, []);

  // Auto-lưu bản đã sửa vào ĐÚNG mục lịch sử theo ?id (localStorage cho khách, Supabase cho user).
  // Trước đây thao tác vẽ thủ công chỉ đổi state trong bộ nhớ ⇒ reload là mất. Đây là chỗ ghi ngược.
  useEffect(() => {
    if (!pendingPersistRef.current) return;
    pendingPersistRef.current = false;
    const geometry = state.geometry;
    if (!geometry) return;
    // Trong phiên Advance, geometry_data đã nhúng cả cảnh (thanh câu + lời giải). Ghi đè bằng hình
    // phẳng ở đây sẽ xóa sạch cảnh khi mở lại — nên bỏ qua, giống guard trong SolverPanel.
    if (state.advanceScene) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return; // chưa từng lưu vào lịch sử ⇒ không có mục nào để cập nhật
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    // Gộp nhiều thao tác liên tiếp thành 1 lần ghi.
    persistTimerRef.current = setTimeout(() => { void updateGeometryData(id, geometry); }, 500);
  }, [state.geometry, state.advanceScene, updateGeometryData]);

  useEffect(() => () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current); }, []);

  // Lưu ngăn HOÀN TÁC/LÀM LẠI theo ?id để mở lại hình (đổi bài / tải lại / hôm sau) vẫn undo/redo được.
  // Bỏ qua phiên Advance (undo/redo không áp dụng cho stepper nhiều câu).
  const undoHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (state.advanceScene) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    const undoStack = state.undoStack;
    const redoStack = state.redoStack;
    if (undoHistoryTimerRef.current) clearTimeout(undoHistoryTimerRef.current);
    undoHistoryTimerRef.current = setTimeout(() => { saveUndoHistory(id, undoStack, redoStack, Date.now()); }, 400);
  }, [state.undoStack, state.redoStack, state.advanceScene]);
  useEffect(() => () => { if (undoHistoryTimerRef.current) clearTimeout(undoHistoryTimerRef.current); }, []);

  // Ghi ngược tuỳ chọn hiển thị vào localStorage khi đổi, để lần mount sau seed lại đúng.
  // Merge `...loadPreferences()` để giữ các khoá chỉ-Settings (vd showIllustrationValues).
  useEffect(() => {
    savePreferences({
      ...loadPreferences(),
      showPoints: state.showPoints,
      autoColorPlanes: state.autoColor,
      autoRotate: state.autoRotate,
      showCoordinateGrid: state.showCoordinateGrid,
    });
  }, [state.showPoints, state.autoColor, state.autoRotate, state.showCoordinateGrid]);
  const { openAuthModal, openUpgradeModal, refreshProfile } = useAuth();
  stateRef.current = state;

  const undo = useCallback(() => {
    requestPersist();
    dispatch({ type: 'UNDO' });
  }, [requestPersist]);

  const redo = useCallback(() => {
    requestPersist();
    dispatch({ type: 'REDO' });
  }, [requestPersist]);

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  const simulateScanProgress = useCallback((callback: () => void) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      const statusIndex = Math.min(Math.floor(progress / 25), SCAN_STATUSES.length - 1);
      dispatch({
        type: 'UPDATE_SCAN_PROGRESS',
        progress: Math.min(progress, 90),
        status: SCAN_STATUSES[statusIndex],
      });

      if (progress >= 100) {
        clearInterval(interval);
        callback();
      }
    }, 750);

    return () => clearInterval(interval);
  }, []);

  const finishWithGeometry = useCallback((geometry: GeometryData) => {
    refreshProfile();  // vẽ vừa trừ credit ở server -> cập nhật số dư hiển thị
    if (!geometry.latexCode) {
      geometry = { ...geometry, latexCode: generateLatexCode(geometry) };
    }
    dispatch({ type: 'UPDATE_SCAN_PROGRESS', progress: 100, status: 'Constructing geometry...' });

    setTimeout(() => {
      dispatch({ type: 'SET_GEOMETRY', geometry });
      dispatch({ type: 'START_BUILDING' });

      setTimeout(() => {
        dispatch({ type: 'FINISH_BUILDING' });
        toast({
          title: "Geometry constructed successfully!",
          description: `Created ${geometry.name} with ${geometry.points.length} vertices`,
        });
      }, 2000);
    }, 500);
  }, [refreshProfile]);

  const startDemo = useCallback((type: 'pyramid' | 'satellite' | 'lod4' | GeometryData = 'pyramid') => {
    dispatch({ type: 'START_SCANNING' });
    simulateScanProgress(() => {
      let demoData = PYRAMID_MOCK_DATA;
      if (typeof type === 'string') {
        if (type === 'satellite') demoData = SATELLITE_DEMO_DATA;
        if (type === 'lod4') demoData = lod4DemoData;
      } else {
        demoData = type;
      }
      
      if (type === 'lod4') {
        dispatch({ type: 'SET_GEOMETRY', geometry: demoData });
        dispatch({ type: 'FINISH_BUILDING' }); // instantly skip building
        setTimeout(() => {
          window.dispatchEvent(new Event('playAnimation'));
        }, 100);
      } else {
        finishWithGeometry(demoData);
      }
    });
  }, [simulateScanProgress, finishWithGeometry]);

  const analyzeImage = useCallback(async (imageBase64: string) => {
    dispatch({ type: 'START_SCANNING' });

    try {
      let progress = 0;
      let statusIndex = 0;
      const totalStatuses = SCAN_STATUSES.length;

      const progressInterval = setInterval(() => {
        const increment = progress < 20 ? 3 : progress < 50 ? 2 : progress < 80 ? 1 : 0.3;
        progress = Math.min(progress + increment, 95);

        if (progress < 10) statusIndex = 0;
        else if (progress < 25) statusIndex = 1;
        else if (progress < 45) statusIndex = 2;
        else if (progress < 65) statusIndex = 3;
        else if (progress < 85) statusIndex = 4;
        else statusIndex = 5;

        dispatch({
          type: 'UPDATE_SCAN_PROGRESS',
          progress,
          status: SCAN_STATUSES[Math.min(statusIndex, totalStatuses - 1)],
        });
      }, 800);

      const payload = {
        imageBase64,
        aiModel: stateRef.current.aiModel,
        useThinking: stateRef.current.useReasoning,
        detailLevel: 'cinematic'
      };
      const { data: geminiData, error: geminiError } = await invokeLocalApi('/api/analyze-geometry', payload);

      if (geminiError || geminiData?.error) {
        clearInterval(progressInterval);
        let errorMessage = geminiData?.error || geminiError?.message || "Không thể đọc đề bài từ ảnh";

        if (errorMessage.includes('Missing or invalid token')) {
          errorMessage = "Vui lòng đăng nhập để sử dụng tính năng AI phân tích ảnh.";
        }
        if (needsAuth(geminiError)) openAuthModal('quota');
        if (needsUpgrade(geminiError)) openUpgradeModal();

        toast({ title: "❌ Lỗi", description: errorMessage, variant: "destructive" });
        dispatch({ type: 'CLEAR_GEOMETRY' });
        return;
      }

      const step2 = geminiData?.step2;
      clearInterval(progressInterval);

      if (step2?.geometry && step2.geometry.points?.length > 0) {
        finishWithGeometry(step2.geometry);
      } else {
        finishWithGeometry(PYRAMID_MOCK_DATA);
      }
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xử lý hình ảnh", variant: "destructive" });
      dispatch({ type: 'CLEAR_GEOMETRY' });
    }
  }, [finishWithGeometry, openAuthModal, openUpgradeModal]);

  const analyzeText = useCallback(async (prompt: string, mode: DrawMode = 'quick') => {
    const sessionId = ++scanSessionRef.current;
    dispatch({ type: 'START_SCANNING' });

    try {
      let progress = 0;
      let statusIndex = 0;
      const totalStatuses = SCAN_STATUSES.length;
      const speedMultiplier = ({ quick: 1, detailed: 0.5, advance: 0.4 } as Record<string, number>)[mode] ?? 0.5;

      const progressInterval = setInterval(() => {
        if (scanSessionRef.current !== sessionId) { clearInterval(progressInterval); return; }
        const increment = (progress < 30 ? 5 : progress < 60 ? 3 : progress < 85 ? 1 : 0.5) * speedMultiplier;
        progress = Math.min(progress + increment, 95);

        if (progress < 15) statusIndex = 0;
        else if (progress < 30) statusIndex = 1;
        else if (progress < 50) statusIndex = 2;
        else if (progress < 75) statusIndex = 3;
        else if (progress < 90) statusIndex = 4;
        else statusIndex = 5;

        dispatch({
          type: 'UPDATE_SCAN_PROGRESS',
          progress,
          status: SCAN_STATUSES[Math.min(statusIndex, totalStatuses - 1)],
        });
      }, 500);

      const payload = {
        prompt, 
        mode,
        aiModel: stateRef.current.aiModel,
        useReasoning: stateRef.current.useReasoning,
        detailLevel: 'cinematic'
      };
      const { data: geminiData, error: geminiError } = await invokeLocalApiStream('/api/analyze-geometry', payload, (statusText, progress, chunk) => {
        dispatch({
          type: 'UPDATE_SCAN_PROGRESS',
          progress,
          status: statusText,
        });
        if (chunk !== undefined) {
          dispatch({ type: 'APPEND_STREAMING_TEXT', text: chunk });
        }
      });

      clearInterval(progressInterval);

      if (scanSessionRef.current !== sessionId) return;

      if (geminiError || geminiData?.error) {
        let errorMessage = geminiData?.error || geminiError?.message || "Không thể phân tích đề bài";
        
        if (errorMessage.includes('Missing or invalid token')) {
          errorMessage = "Vui lòng đăng nhập để sử dụng tính năng AI vẽ hình.";
        }
        if (needsAuth(geminiError)) openAuthModal('quota');
        if (needsUpgrade(geminiError)) openUpgradeModal();
        
        toast({ title: "❌ Lỗi", description: errorMessage, variant: "destructive" });
        dispatch({ type: 'CLEAR_GEOMETRY' });
        return;
      }

      const step2 = geminiData?.step2;

      if (step2?.geometry && step2.geometry.points?.length > 0) {
        const geomToSave = { ...step2.geometry };
        if (step2.llmPrompt) geomToSave.llmPrompt = step2.llmPrompt;
        finishWithGeometry(geomToSave);
      } else {
        finishWithGeometry(PYRAMID_MOCK_DATA);
      }
    } catch (error) {
      if (scanSessionRef.current !== sessionId) return;
      toast({ title: "Lỗi", description: "Không thể xử lý đề bài", variant: "destructive" });
      dispatch({ type: 'CLEAR_GEOMETRY' });
    }
  }, [finishWithGeometry, openAuthModal, openUpgradeModal]);

  const analyzeAdvance = useCallback(async (prompt: string, imageBase64?: string) => {
    // CHẠY NỀN như Vẽ nhanh/Vẽ kỹ (queueAnalyzeText): KHÔNG bật isScanning/scan-session nữa. Chỉ đẩy 1
    // item hàng đợi 'processing' — overlay hiện qua đường isViewingProcessing của ScanningOverlay
    // (activeQueueId do QUEUE_ADD tự trỏ tới item đang xử lý). Nút "Vẽ hình mới" trên overlay khi đó chỉ
    // ẨN overlay (clearActiveQueue) chứ KHÔNG huỷ việc giải. Nhờ vậy Advance đồng nhất 3 điểm với 2 chế
    // độ kia: (1) hiện đề ở left panel lúc giải, (2) không chặn thao tác canvas, (3) chạy song song nhiều
    // bài. Kết quả: done → toast + lưu Recents (item done bị lọc khỏi "Đang xử lý" y như Vẽ nhanh/Vẽ kỹ).
    const streamSeed = imageBase64 ? '📷 Đang đọc đề từ ảnh…\n' : `📝 ${prompt}\n`;
    const queueId = `q_${Date.now()}_${++queueIdCounter}`;
    dispatch({
      type: 'QUEUE_ADD',
      item: {
        id: queueId,
        prompt: imageBase64 ? '📷 Đang đọc đề từ ảnh…' : prompt,
        mode: 'advance',
        status: 'processing',
        progress: 0,
        statusText: SCAN_STATUSES[0],
        streamingText: streamSeed,
        geometry: null,
        createdAt: Date.now(),
      },
    });
    // Advance gọi 1 lần (KHÔNG stream) ~30-40s → mô phỏng progress feed thẳng vào item để overlay không
    // đứng hình. Interval dọn ở finally (mỗi lượt có interval + queueId riêng nên chạy song song vô hại).
    let progress = 0;
    let statusIndex = 0;
    const totalStatuses = SCAN_STATUSES.length;
    const progressInterval = setInterval(() => {
      // Advance chậm hơn vẽ thường (×0.4) cho khớp thời lượng thực (nhiều câu + lời giải).
      const increment = (progress < 30 ? 5 : progress < 60 ? 3 : progress < 85 ? 1 : 0.5) * 0.4;
      progress = Math.min(progress + increment, 95);
      if (progress < 15) statusIndex = 0;
      else if (progress < 30) statusIndex = 1;
      else if (progress < 50) statusIndex = 2;
      else if (progress < 75) statusIndex = 3;
      else if (progress < 90) statusIndex = 4;
      else statusIndex = 5;
      const status = SCAN_STATUSES[Math.min(statusIndex, totalStatuses - 1)];
      dispatch({ type: 'QUEUE_UPDATE', id: queueId, updates: { progress, statusText: status } });
    }, 500);
    // Chỉ đưa kết quả LÊN CANVAS khi người dùng đang xem chính item này (activeQueueId===queueId) hoặc
    // canvas đang trống (idle) — không giật hình nếu user đã chuyển sang bài khác. (Cùng tinh thần "chỉ
    // auto-load khi idle" của Vẽ nhanh/Vẽ kỹ, nới thêm "đang xem item này" cho hợp trực giác.)
    const maybeShow = (loader: () => void) => {
      const st = stateRef.current;
      if (st.activeQueueId === queueId || (!st.geometry && !st.isScanning)) {
        loader();
        dispatch({ type: 'QUEUE_SET_ACTIVE', id: queueId });
        dispatch({ type: 'START_BUILDING' });
        setTimeout(() => dispatch({ type: 'FINISH_BUILDING' }), 1000);
      }
    };
    try {
      const { data, error } = await invokeLocalApi('/api/analyze-advance', imageBase64 ? { imageBase64, prompt: prompt || undefined } : { prompt });
      if (error) throw new Error(error.message || String(error));
      if (data?.mode === 'advance' && data.scene) {
        // LƯU vào lịch sử để xem lại. Nhúng cả cảnh vào geometry_data ⇒ mở lại khôi phục nguyên stepper +
        // lời giải (xem loadGeometry). Chỉ nhúng scene MỘT lần (không spread base ra top-level) — khi mở
        // lại loadGeometry dùng advanceScene.base; base ở top-level là thừa (gấp đôi cỡ).
        const label = (prompt && prompt.trim()) || data.scene.base?.name || '📷 Đề Advance (từ ảnh)';
        const geometryForHistory: GeometryData = {
          name: data.scene.base?.name || label,
          points: [],
          lines: [],
          advanceScene: data.scene,
          drawMode: 'advance',
        };
        const historyId = await addToHistory(geometryForHistory, label);
        if (historyId) {
          const url = new URL(window.location.href);
          url.searchParams.set('id', historyId);
          window.history.replaceState({}, '', url.toString());
        }
        // Đánh dấu item done (lưu cả scene vào geometry) — mirror queueAnalyzeText. Item done bị lọc khỏi
        // "Đang xử lý" nên card tự biến mất, kết quả sống ở canvas (nếu maybeShow) + Recents.
        dispatch({
          type: 'QUEUE_UPDATE',
          id: queueId,
          updates: { status: 'done', progress: 100, statusText: 'Hoàn thành!', geometry: geometryForHistory, completedAt: Date.now() },
        });
        refreshProfile?.();   // Advance tốn credit (server đã trừ) → cập nhật số dư hiển thị
        toast({ title: '✅ Giải xong!', description: `${geometryForHistory.name} (Advance) — Nhấn để xem`, duration: 8000 });
        maybeShow(() => dispatch({ type: 'SET_ADVANCE_SCENE', scene: data.scene }));
      } else if (data?.revUnsupported) {
        // Đề tròn xoay KHÔNG dựng được ⇒ KHÔNG vẽ hình lạ; báo thẳng, giữ nguyên canvas cũ. Server đã hoàn
        // TOÀN BỘ credit. Đánh dấu item 'error' (bị lọc khỏi "Đang xử lý" như lỗi Vẽ nhanh/Vẽ kỹ) + toast.
        // `imageReadFailed` = đọc ẢNH hỏng (không chắc là đề tròn xoay) → tiêu đề nói về đọc ảnh cho đúng.
        const msg = data.error || 'Bạn thử gõ lại đề bằng chữ, hoặc chụp rõ hơn nhé.';
        dispatch({ type: 'QUEUE_UPDATE', id: queueId, updates: { status: 'error', progress: 0, statusText: msg, error: msg } });
        toast({
          title: data.imageReadFailed ? 'Chưa đọc được đề trong ảnh' : 'Chưa vẽ được đề tròn xoay này',
          description: msg,
        });
        refreshProfile?.();
      } else if (data?.geometry) {
        // Nhánh tụt-hạng vẫn ra 1 hình → lưu lịch sử như Vẽ kỹ để xem lại (nhãn "Vẽ kỹ" cho đúng mức server tính).
        const label = (prompt && prompt.trim()) || data.geometry.name || '📷 Đề (từ ảnh)';
        const geo: GeometryData = { ...data.geometry, drawMode: 'detailed' };
        const historyId = await addToHistory(geo, label);
        if (historyId) {
          const url = new URL(window.location.href);
          url.searchParams.set('id', historyId);
          window.history.replaceState({}, '', url.toString());
        }
        dispatch({
          type: 'QUEUE_UPDATE',
          id: queueId,
          updates: { status: 'done', progress: 100, statusText: 'Hoàn thành!', geometry: geo, completedAt: Date.now() },
        });
        refreshProfile?.();   // nhánh tụt-hạng vẫn tốn credit (đã hoàn về mức Vẽ kỹ ở server)
        toast({ title: '✅ Vẽ xong!', description: `${geo.name || 'Hình'} (Vẽ kỹ) — Nhấn để xem`, duration: 8000 });
        maybeShow(() => dispatch({ type: 'SET_GEOMETRY', geometry: geo }));
      } else {
        dispatch({ type: 'QUEUE_UPDATE', id: queueId, updates: { status: 'error', progress: 0, statusText: 'Chưa dựng được hình', error: 'Chưa dựng được hình cho đề này' } });
        toast({ title: 'Chưa dựng được hình cho đề này', variant: 'destructive' });
      }
    } catch (e) {
      const msg = String((e as Error).message);
      dispatch({ type: 'QUEUE_UPDATE', id: queueId, updates: { status: 'error', progress: 0, statusText: msg || 'Lỗi Advance', error: msg || 'Lỗi Advance' } });
      toast({ title: 'Lỗi Advance', description: msg, variant: 'destructive' });
    } finally {
      clearInterval(progressInterval);
    }
  }, [refreshProfile, addToHistory]);

  const queueAnalyzeText = useCallback((prompt: string, mode: DrawMode = 'detailed') => {
    const id = `q_${Date.now()}_${++queueIdCounter}`;
    const modeLabels: Record<string, string> = { quick: 'Nhanh', detailed: 'Kỹ', advance: 'Advance' };

    const item: QueueItem = {
      id,
      prompt,
      mode,
      status: 'pending',
      progress: 0,
      statusText: 'Đang chờ...',
      geometry: null,
      createdAt: Date.now(),
    };

    dispatch({ type: 'QUEUE_ADD', item });

    (async () => {
      dispatch({ type: 'QUEUE_UPDATE', id, updates: { status: 'processing', statusText: 'Đang gửi yêu cầu...' } });

      try {
        const payload = {
          prompt, mode,
          aiModel: stateRef.current.aiModel,
          useReasoning: stateRef.current.useReasoning
        };
        const { data, error } = await invokeLocalApiStream('/api/analyze-geometry', payload, (statusText, progress, chunk) => {
          const updates: Partial<QueueItem> = { progress, statusText };
          if (chunk !== undefined) updates.streamingText = chunk; 
          dispatch({ type: 'QUEUE_UPDATE', id, updates });
        });

        if (error || data?.error) {
          let errorMessage = data?.error || error?.message || "Không thể phân tích đề bài";
          
          if (errorMessage.includes('Missing or invalid token')) {
            errorMessage = "Vui lòng đăng nhập để sử dụng tính năng AI vẽ hình.";
          }
          if (needsAuth(error)) openAuthModal('quota');
          if (needsUpgrade(error)) openUpgradeModal();
          
          dispatch({
            type: 'QUEUE_UPDATE',
            id,
            updates: { status: 'error', progress: 0, statusText: errorMessage, error: errorMessage },
          });
          toast({ title: "❌ Lỗi vẽ hình", description: `"${prompt.substring(0, 50)}..." — ${errorMessage}`, variant: "destructive" });
          return;
        }

        // Vẽ kỹ định tuyến sang Nâng cao (vật thật tròn xoay/thiết diện/thể tích): server trả scene advance.
        // Xử như analyzeAdvance — nhúng scene vào geometry lịch sử (mở lại khôi phục stepper), SET_ADVANCE_SCENE.
        if (data?.mode === 'advance' && data.scene) {
          const label = (prompt && prompt.trim()) || data.scene.base?.name || 'Vật thể nâng cao';
          const geometryForHistory: GeometryData = {
            name: data.scene.base?.name || label,
            points: [], lines: [],
            advanceScene: data.scene,
            drawMode: 'advance',
          };
          dispatch({
            type: 'QUEUE_UPDATE', id,
            updates: { status: 'done', progress: 100, statusText: 'Hoàn thành!', geometry: geometryForHistory, completedAt: Date.now() },
          });
          const historyId = await addToHistory(geometryForHistory, label);
          if (historyId) {
            const url = new URL(window.location.href);
            url.searchParams.set('id', historyId);
            window.history.replaceState({}, '', url.toString());
          }
          refreshProfile();
          toast({ title: '✅ Vẽ xong!', description: `${geometryForHistory.name} — Nhấn để xem`, duration: 8000 });
          const st = stateRef.current;
          if (!st.geometry && !st.isScanning) {
            dispatch({ type: 'SET_ADVANCE_SCENE', scene: data.scene });
            dispatch({ type: 'QUEUE_SET_ACTIVE', id });
          }
          return;
        }

        const step2 = data?.step2;
        let geometry: GeometryData;

        if (step2?.geometry && step2.geometry.points?.length > 0) {
          geometry = { ...step2.geometry };
          geometry.llmPrompt = step2.llmPrompt || prompt;
        } else {
          geometry = PYRAMID_MOCK_DATA;
          geometry.llmPrompt = prompt;
        }

        if (!geometry.latexCode) {
          geometry = { ...geometry, latexCode: generateLatexCode(geometry) };
        }
        
        if (data.step1?.tags) {
          geometry = { ...geometry, tags: data.step1.tags };
        }
        if (data.step1?.detailLevel) {
          geometry = { ...geometry, detailLevel: data.step1.detailLevel };
        }

        dispatch({
          type: 'QUEUE_UPDATE',
          id,
          updates: {
            status: 'done',
            progress: 100,
            statusText: 'Hoàn thành!',
            geometry,
            completedAt: Date.now(),
          },
        });

          const historyId = await addToHistory({ ...geometry, drawMode: mode }, prompt);
          if (historyId) {
            const url = new URL(window.location.href);
            url.searchParams.set('id', historyId);
            window.history.replaceState({}, '', url.toString());
          }

          refreshProfile();  // vẽ vừa trừ credit ở server -> cập nhật số dư hiển thị
          toast({
          title: "✅ Vẽ xong!",
          description: `${geometry.name} (${modeLabels[mode] || mode}) — Nhấn để xem`,
          duration: 8000,
        });

        const currentState = stateRef.current;
        if (!currentState.geometry && !currentState.isScanning) {
          dispatch({ type: 'SET_GEOMETRY', geometry });
          dispatch({ type: 'QUEUE_SET_ACTIVE', id });
          dispatch({ type: 'START_BUILDING' });
          setTimeout(() => dispatch({ type: 'FINISH_BUILDING' }), 2000);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        dispatch({
          type: 'QUEUE_UPDATE',
          id,
          updates: { status: 'error', progress: 0, statusText: msg || 'Lỗi kết nối', error: msg || 'Lỗi kết nối' },
        });
        toast({ title: "❌ Lỗi", description: `Không thể xử lý "${prompt.substring(0, 40)}...": ${msg}`, variant: "destructive" });
      }
    })();
  }, [addToHistory, openAuthModal, openUpgradeModal, refreshProfile]);

  const queueAnalyzeImage = useCallback((imageBase64: string, mode: DrawMode = 'quick') => {
    const id = `q_${Date.now()}_${++queueIdCounter}`;
    const modeLabels: Record<string, string> = { quick: 'Nhanh', detailed: 'Kỹ', advance: 'Advance' };

    const item: QueueItem = {
      id,
      prompt: '📷 Đang nhận dạng ảnh...',
      mode,
      status: 'pending',
      progress: 0,
      statusText: 'Đang chờ...',
      geometry: null,
      createdAt: Date.now(),
    };

    dispatch({ type: 'QUEUE_ADD', item });

    (async () => {
      dispatch({ type: 'QUEUE_UPDATE', id, updates: { status: 'processing', statusText: 'Đang xử lý ảnh...' } });

      try {
        const payload = {
          imageBase64, mode,
          aiModel: stateRef.current.aiModel,
          useReasoning: stateRef.current.useReasoning
        };
        const { data, error } = await invokeLocalApiStream('/api/analyze-geometry', payload, (statusText, progress) => {
          dispatch({ type: 'QUEUE_UPDATE', id, updates: { progress, statusText } });
        });

        if (error || data?.error) {
          let errorMessage = data?.error || error?.message || "Không thể phân tích đề bài từ ảnh";
          
          if (errorMessage.includes('Missing or invalid token')) {
            errorMessage = "Vui lòng đăng nhập để sử dụng tính năng AI phân tích ảnh.";
          }
          if (needsAuth(error)) openAuthModal('quota');
          if (needsUpgrade(error)) openUpgradeModal();
          
          dispatch({ type: 'QUEUE_UPDATE', id, updates: { status: 'error', progress: 0, statusText: errorMessage, error: errorMessage } });
          toast({ title: "❌ Lỗi vẽ hình", description: errorMessage, variant: "destructive" });
          return;
        }

        const step2 = data?.step2;
        let geometry: GeometryData;

        if (step2?.geometry && step2.geometry.points?.length > 0) {
          geometry = { ...step2.geometry };
          geometry.llmPrompt = data?.step1?.text || step2.llmPrompt || "Đề bài từ ảnh";
        } else {
          geometry = PYRAMID_MOCK_DATA;
          geometry.llmPrompt = data?.step1?.text || "Đề bài từ ảnh";
        }

        if (!geometry.latexCode) {
          geometry = { ...geometry, latexCode: generateLatexCode(geometry) };
        }
        
        if (data.step1?.tags) {
          geometry = { ...geometry, tags: data.step1.tags };
        }
        if (data.step1?.detailLevel) {
          geometry = { ...geometry, detailLevel: data.step1.detailLevel };
        }

        const promptText = data?.step1?.text || "Đề bài từ ảnh";
        dispatch({
          type: 'QUEUE_UPDATE',
          id,
          updates: {
            status: 'done',
            progress: 100,
            statusText: 'Hoàn thành!',
            prompt: `📷 ${promptText.substring(0, 80)}...`,   // nhãn hiển thị ngắn
            problemText: promptText,                          // đề ĐẦY ĐỦ cho ô Giải
            geometry,
            completedAt: Date.now()
          },
        });

        const historyId = await addToHistory({ ...geometry, drawMode: mode }, promptText);
        if (historyId) {
          const url = new URL(window.location.href);
          url.searchParams.set('id', historyId);
          window.history.replaceState({}, '', url.toString());
        }

        toast({ title: "✅ Vẽ xong!", description: `${geometry.name} (${modeLabels[mode] || mode}) — Nhấn để xem`, duration: 8000 });

        const currentState = stateRef.current;
        if (!currentState.geometry && !currentState.isScanning) {
          dispatch({ type: 'SET_GEOMETRY', geometry });
          dispatch({ type: 'QUEUE_SET_ACTIVE', id });
          dispatch({ type: 'START_BUILDING' });
          setTimeout(() => dispatch({ type: 'FINISH_BUILDING' }), 2000);
        }
      } catch (err) {
        dispatch({ type: 'QUEUE_UPDATE', id, updates: { status: 'error', progress: 0, statusText: 'Lỗi kết nối', error: 'Lỗi kết nối' } });
        toast({ title: "❌ Lỗi", description: "Không thể xử lý ảnh đề bài", variant: "destructive" });
      }
    })();
  }, [addToHistory, openAuthModal, openUpgradeModal]);

  const viewQueueItem = useCallback((id: string) => {
    const item = stateRef.current.queue.find(q => q.id === id);
    if (!item) return;

    dispatch({ type: 'QUEUE_SET_ACTIVE', id });

    if (item.status === 'done' && item.geometry) {
      dispatch({ type: 'SET_GEOMETRY', geometry: item.geometry });
      dispatch({ type: 'START_BUILDING' });
      setTimeout(() => {
        dispatch({ type: 'FINISH_BUILDING' });
      }, 1000);
    }
  }, []);

  const clearActiveQueue = useCallback(() => {
    dispatch({ type: 'QUEUE_SET_ACTIVE', id: null });
  }, []);

  const removeQueueItem = useCallback((id: string) => {
    dispatch({ type: 'QUEUE_REMOVE', id });
  }, []);

  const modifyGeometry = useCallback(async (prompt: string, opts?: { aiMode?: boolean }) => {
    if (!state.geometry) return;
    const aiMode = opts?.aiMode ?? false;

    // Luôn thử lệnh local trước (tất định, nhanh, miễn phí).
    const localResult = tryLocalCommand(prompt, state.geometry);
    if (localResult) {
      // Giữ lại đề bài đã đọc (llmPrompt) — lệnh sửa chỉ đổi hình, không được mất đề để ô "Giải" còn tự điền.
      dispatch({ type: 'SET_GEOMETRY', geometry: { ...localResult.geometry, llmPrompt: localResult.geometry.llmPrompt ?? state.geometry?.llmPrompt } });
      dispatch({ type: 'START_BUILDING' });

      setTimeout(() => {
        dispatch({ type: 'FINISH_BUILDING' });
        toast({ title: "Đã cập nhật!", description: localResult.description });
      }, 800);
      return;
    }

    // Không khớp lệnh local. Nếu TẮT "Sửa bằng AI" -> không gọi AI, gợi ý bật lên.
    if (!aiMode) {
      toast({
        title: "Chưa hiểu lệnh này",
        description: 'Dùng gợi ý cú pháp, hoặc bật "Sửa bằng AI" để chat tự do (2 credit/lần).',
        variant: "destructive",
      });
      return;
    }

    // Chế độ AI (trừ 2 credit ở server, hoàn nếu sửa không thành).
    try {
      const { data, error } = await invokeLocalApi('/api/modify-geometry', { prompt, currentGeometry: state.geometry });

      if (error) {
        if (error.code === 'auth_required' || error.status === 401) { openAuthModal(); return; }
        if (needsUpgrade(error)) { openUpgradeModal(); return; }
        toast({ title: "Lỗi", description: error.message || "Không thể chỉnh sửa hình học", variant: "destructive" });
        return;
      }

      if (data?.needsClarification) {
        toast({ title: "AI cần bạn nói rõ hơn", description: (data.message || '').slice(0, 200) });
        return;
      }

      if (data?.geometry) {
        // Giữ đề bài đã đọc qua lần sửa bằng AI (server trả hình mới, không kèm llmPrompt).
        dispatch({ type: 'SET_GEOMETRY', geometry: { ...data.geometry, llmPrompt: data.geometry.llmPrompt ?? state.geometry?.llmPrompt } });
        dispatch({ type: 'START_BUILDING' });

        setTimeout(() => {
          dispatch({ type: 'FINISH_BUILDING' });
          toast({
            title: "Đã cập nhật hình học!",
            description: `Thêm ${data.addedElements?.points?.length || 0} điểm và ${data.addedElements?.lines?.length || 0} đường`,
          });
        }, 1500);
        refreshProfile();  // sửa vừa trừ credit ở server -> cập nhật số dư
      }
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xử lý yêu cầu", variant: "destructive" });
    }
  }, [state.geometry, openAuthModal, openUpgradeModal, refreshProfile]);

  const stopScanning = useCallback(() => {
    scanSessionRef.current++;
    dispatch({ type: 'STOP_SCANNING' });
  }, []);

  const clearGeometry = useCallback(() => {
    dispatch({ type: 'CLEAR_GEOMETRY' });
    window.dispatchEvent(new Event('geometryCleared'));
  }, []);

  const loadGeometry = useCallback((geometry: GeometryData, opts?: { silent?: boolean; historyId?: string }) => {
    // Lượt Advance đã lưu vào lịch sử nhúng cả cảnh (advanceScene) → mở lại KHÔI PHỤC nguyên
    // stepper + lời giải + reveal, KHÔNG chỉ hiện hình base. Mọi đường mở lại (sidebar/URL ?id=)
    // đều đi qua loadGeometry nên bắt tại đây là đủ.
    const embedded = geometry?.advanceScene;
    if (embedded && embedded.base && Array.isArray(embedded.steps)) {
      dispatch({ type: 'SET_ADVANCE_SCENE', scene: embedded });
      if (opts?.silent) return;
      dispatch({ type: 'START_BUILDING' });
      setTimeout(() => dispatch({ type: 'FINISH_BUILDING' }), 1000);
      return;
    }
    // Mở lại một hình đã lưu (có historyId) → nạp kèm ngăn hoàn tác/làm lại đã lưu của hình đó.
    const restored = opts?.historyId ? loadUndoHistory(opts.historyId) : { undo: [], redo: [] };
    dispatch({ type: 'SET_GEOMETRY', geometry, undoStack: restored.undo, redoStack: restored.redo });
    // silent: dùng khi ghép thêm điểm dựng của lời giải vào hình — không toast, không animation.
    if (opts?.silent) return;
    dispatch({ type: 'START_BUILDING' });
    setTimeout(() => {
      dispatch({ type: 'FINISH_BUILDING' });
      // (bỏ toast "Đã tải hình!" theo yêu cầu — vẽ/tải xong không cần báo)
    }, 1000);
  }, []);

  const updateDynamicPoint = useCallback((id: string, k: number) => {
    const currentGeometry = stateRef.current.geometry;
    if (!currentGeometry?.dynamicPoints) return;
    const updated = {
      ...currentGeometry,
      dynamicPoints: currentGeometry.dynamicPoints.map(dp =>
        dp.id === id ? { ...dp, k } : dp
      ),
    };
    dispatch({ type: 'SET_GEOMETRY', geometry: updated });
  }, []);

  const addPoint = useCallback((label: string, x: number, y: number, z: number) => {
    const id = label.toUpperCase();
    requestPersist();
    dispatch({ type: 'ADD_POINT', point: { id, label, x, y, z } });
  }, [requestPersist]);

  const addLine = useCallback((fromId: string, toId: string, style: 'solid' | 'dashed') => {
    const id = `line_${fromId}_${toId}`;
    requestPersist();
    dispatch({ type: 'ADD_LINE', line: { id, from: fromId, to: toId, style } });
  }, [requestPersist]);

  const addMidpoint = useCallback((p1Id: string, p2Id: string) => {
    const geo = stateRef.current.geometry;
    if (!geo) return;
    requestPersist();
    const p1 = geo.points.find(p => p.id === p1Id);
    const p2 = geo.points.find(p => p.id === p2Id);
    if (!p1 || !p2) return;
    
    // Find an available letter
    const usedLabels = new Set(geo.points.map(p => p.label));
    let label = 'M';
    if (usedLabels.has(label)) {
      const fallbacks = ['N', 'P', 'Q', 'I', 'J', 'K', 'E', 'F', 'H', 'G', 'R', 'T', 'U', 'V', 'W', 'A', 'B', 'C', 'D'];
      const found = fallbacks.find(l => !usedLabels.has(l));
      if (found) {
        label = found;
      } else {
        let counter = 1;
        while (usedLabels.has(`M_{${counter}}`)) counter++;
        label = `M_{${counter}}`;
      }
    }
    
    const id = label;
    dispatch({ type: 'ADD_POINT', point: { id, label, x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: (p1.z + p2.z) / 2 } });
    
    // Automatically draw a line if it doesn't exist
    const lineExists = geo.lines.some(l => 
      (l.from === p1Id && l.to === p2Id) || (l.from === p2Id && l.to === p1Id)
    );
    if (!lineExists) {
      const lineId = `line_${p1Id}_${p2Id}`;
      dispatch({ type: 'ADD_LINE', line: { id: lineId, from: p1Id, to: p2Id, style: 'solid' } });
    }
  }, [requestPersist]);

  const addPlane = useCallback((pointIds: string[]) => {
    const geo = stateRef.current.geometry;
    if (!geo) return false;
    const pts = pointIds.map(id => geo.points.find(p => p.id === id)).filter(Boolean) as Point3D[];
    if (pts.length !== pointIds.length || pts.length < 3) return false;
    const polygon = normalizePlanarPolygon(pts);
    if (!polygon) return false;
    const orderedPointIds = polygon.sourceIndices.map((index) => pointIds[index]);
    const orderedPoints = polygon.sourceIndices.map((index) => pts[index]);
    const id = `plane_${orderedPointIds.join('_')}`;
    const label = `(${orderedPoints.map(p => p.label).join('')})`;
    requestPersist();
    dispatch({
      type: 'ADD_PLANE',
      plane: {
        id,
        label,
        pointIds: orderedPointIds,
        points: orderedPoints.map(p => ({ x: p.x, y: p.y, z: p.z })),
        opacity: 0.15,
      },
    });
    return true;
  }, [requestPersist]);

  const addPlaneFromEquation = useCallback((a: number, b: number, c: number, d: number) => {
    const size = 5;
    const corners: { x: number; y: number; z: number }[] = [];
    if (Math.abs(c) > 0.001) {
      corners.push({ x: -size, y: -size, z: (d - a * -size - b * -size) / c });
      corners.push({ x: size, y: -size, z: (d - a * size - b * -size) / c });
      corners.push({ x: size, y: size, z: (d - a * size - b * size) / c });
      corners.push({ x: -size, y: size, z: (d - a * -size - b * size) / c });
    } else if (Math.abs(b) > 0.001) {
      corners.push({ x: -size, y: (d - a * -size) / b, z: -size });
      corners.push({ x: size, y: (d - a * size) / b, z: -size });
      corners.push({ x: size, y: (d - a * size) / b, z: size });
      corners.push({ x: -size, y: (d - a * -size) / b, z: size });
    } else if (Math.abs(a) > 0.001) {
      corners.push({ x: d / a, y: -size, z: -size });
      corners.push({ x: d / a, y: size, z: -size });
      corners.push({ x: d / a, y: size, z: size });
      corners.push({ x: d / a, y: -size, z: size });
    }
    if (corners.length < 3) return;
    const id = `plane_eq_${Date.now()}`;
    const label = `${a}x+${b}y+${c}z=${d}`;
    requestPersist();
    dispatch({ type: 'ADD_PLANE', plane: { id, label, points: corners, opacity: 0.15 } });
  }, [requestPersist]);

  const removeElement = useCallback((type: 'point' | 'line' | 'plane' | 'curve' | 'sphere' | 'cylinder' | 'circle' | 'cone', id: string) => {
    requestPersist();
    dispatch({ type: 'REMOVE_ELEMENT', elementType: type, elementId: id });
  }, [requestPersist]);

  const updatePoint = useCallback((id: string, x: number, y: number, z: number) => {
    requestPersist();
    dispatch({ type: 'UPDATE_POINT', pointId: id, x, y, z });
  }, [requestPersist]);

  const setManualMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_MANUAL_MODE', enabled });
  }, []);

  const setManualTool = useCallback((tool: ManualTool) => {
    dispatch({ type: 'SET_MANUAL_TOOL', tool });
  }, []);

  const setVideoMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'TOGGLE_VIDEO_MODE' });
  }, []);

  const toggleVideoMode = useCallback(() => dispatch({ type: 'TOGGLE_VIDEO_MODE' }), []);

  const setSelectedIds = useCallback((ids: string[]) => dispatch({ type: 'SET_SELECTED_IDS', ids }), []);

  const setAutoRotate = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_ROTATE', enabled });
  }, []);

  const togglePoints = useCallback(() => {
    dispatch({ type: 'TOGGLE_POINTS' });
  }, []);

  const toggleAutoColor = useCallback(() => {
    dispatch({ type: 'TOGGLE_AUTO_COLOR' });
  }, []);

  const toggleCoordinateGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_COORDINATE_GRID' });
  }, []);

  const setAiModel = useCallback((model: 'max' | 'high' | 'medium' | 'low') => {
    dispatch({ type: 'SET_AI_MODEL', model });
  }, []);

  const setUseReasoning = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_USE_REASONING', enabled });
  }, []);

  const toggleSelection = useCallback((id: string) => dispatch({ type: 'TOGGLE_SELECTION', id }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);
  const setStep = useCallback((i: number) => dispatch({ type: 'SET_STEP', index: i }), []);
  const setAdvanceT = useCallback((t: number) => dispatch({ type: 'ADVANCE_SET_T', payload: t }), []);

  return (
    <GeometryContext.Provider value={{
      state, startDemo, analyzeImage, analyzeText, analyzeAdvance, setStep, setAdvanceT, queueAnalyzeText, queueAnalyzeImage,
      modifyGeometry, loadGeometry, clearGeometry, stopScanning, viewQueueItem, removeQueueItem, clearActiveQueue,
      updateDynamicPoint, addPoint, addLine, addMidpoint, addPlane, addPlaneFromEquation, removeElement,
      updatePoint, setManualMode, setManualTool, setVideoMode, toggleVideoMode, setSelectedIds, setAutoRotate, togglePoints, toggleAutoColor, toggleCoordinateGrid,
      setAiModel, setUseReasoning, toggleSelection, clearSelection, undo, redo, canUndo, canRedo
    }}>
      {children}
    </GeometryContext.Provider>
  );
}

export function useGeometry() {
  const context = useContext(GeometryContext);
  if (context === undefined) {
    throw new Error('useGeometry must be used within a GeometryProvider');
  }
  return context;
}

export function useGeometryOptional() {
  return useContext(GeometryContext);
}
