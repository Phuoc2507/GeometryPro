import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { GeometryState, GeometryAction, GeometryData, QueueItem, Point3D, Line3D, Plane3D, ManualTool } from '@/types/geometry';
import { PYRAMID_MOCK_DATA, SATELLITE_DEMO_DATA, SCAN_STATUSES } from '@/data/mockData';
import { lod4DemoData } from '@/lib/lod4DemoData';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { checkAndIncrementGuestQuota } from '@/lib/quota';
const LOCAL_API = import.meta.env.VITE_LOCAL_API_URL ?? '';

async function invokeLocalApi(endpoint: string, body: Record<string, unknown>): Promise<{ data: any; error: any }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${LOCAL_API}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: { message: data?.error || `HTTP ${res.status}`, code: data?.code, status: res.status } };
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Network error' } };
  }
}

async function invokeLocalApiStream(
  endpoint: string, 
  body: Record<string, unknown>, 
  onProgress: (statusText: string, progress: number, chunk?: string) => void
): Promise<{ data: any; error: any }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${LOCAL_API}${endpoint}?stream=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { data: null, error: { message: data?.error || `HTTP ${res.status}`, code: data?.code, status: res.status } };
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Stream not supported");
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let finalData = null;

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
            const parsed = JSON.parse(dataStr);
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
    
    return { data: finalData, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Network error' } };
  }
}

// Lỗi hết credit/quota (từ API 402) -> nên mở modal nâng cấp.
const NEEDS_UPGRADE_CODES = ['insufficient', 'quota_exceeded', 'blocked'];
function needsUpgrade(err: any): boolean {
  return err?.status === 402 || NEEDS_UPGRADE_CODES.includes(err?.code);
}
import { generateLatexCode } from '@/lib/geometry/generateLatex';
import { tryLocalCommand } from '@/lib/geometry/localCommands';
import { DrawMode } from '@/components/DrawModeSelector';
import { useGeometryHistory } from '@/hooks/useGeometryHistory';

const initialState: GeometryState = {
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
  aiModel: 'high',
  useReasoning: false,
  streamingText: '',
  selectedIds: [],
  advanceScene: null,
  currentStep: 0,
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

function rawGeometryReducer(state: GeometryState, action: GeometryAction): GeometryState {
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
    case 'UPDATE_SCAN_PROGRESS':
      return { ...state, scanProgress: action.progress, scanStatus: action.status };
    case 'SET_GEOMETRY':
      return {
        ...state,
        geometry: action.geometry,
        undoStack: [],
        redoStack: [],
        isScanning: false,
        advanceScene: null,
      };
    case 'SET_ADVANCE_SCENE':
      return { ...state, advanceScene: action.scene, currentStep: 0,
               geometry: action.scene.base, undoStack: [], redoStack: [] };
    case 'SET_STEP':
      return { ...state, currentStep: Math.max(0, Math.min(action.index, (state.advanceScene?.steps.length ?? 1) - 1)) };
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
        // Fully delete the point
        g.points = g.points.filter(p => p.id !== action.elementId);
        
        // Fully delete any lines connected to it
        g.lines = g.lines.filter(l => l.from !== action.elementId && l.to !== action.elementId);
        
        // Fully delete any planes containing it
        g.planes = (g.planes || []).filter(p => !p.points.includes(action.elementId));
      } else if (action.elementType === 'line') {
        const lineToRemove = g.lines.find(l => l.id === action.elementId);
        g.lines = g.lines.filter(l => l.id !== action.elementId);
        
        // Garbage collection for hidden points
        if (lineToRemove) {
          [lineToRemove.from, lineToRemove.to].forEach(ptId => {
            const pt = g.points.find(p => p.id === ptId);
            if (pt && pt.hidden) {
              const stillUsedByLine = g.lines.some(l => l.from === ptId || l.to === ptId);
              const stillUsedByPlane = (g.planes || []).some(p => p.points.includes(ptId));
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
          planeToRemove.points.forEach(ptId => {
            const pt = g.points.find(p => p.id === ptId);
            if (pt && pt.hidden) {
              const stillUsedByLine = g.lines.some(l => l.from === ptId || l.to === ptId);
              const stillUsedByPlane = (g.planes || []).some(p => p.points.includes(ptId));
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
  startDemo: (type?: 'pyramid' | 'satellite') => void;
  analyzeImage: (imageBase64: string) => Promise<void>;
  analyzeText: (prompt: string, mode?: DrawMode) => Promise<void>;
  analyzeAdvance: (prompt: string) => Promise<void>;
  setStep: (i: number) => void;
  queueAnalyzeText: (prompt: string, mode?: DrawMode, tags?: string[], detailLevel?: import('@/types/geometry').DetailLevel, offset?: [number, number, number]) => void;
  queueAnalyzeImage: (imageBase64: string, mode?: DrawMode, tags?: string[], detailLevel?: import('@/types/geometry').DetailLevel) => void;
  modifyGeometry: (prompt: string, opts?: { aiMode?: boolean }) => Promise<void>;
  loadGeometry: (geometry: GeometryData) => void;
  clearGeometry: () => void;
  stopScanning: () => void;
  viewQueueItem: (id: string) => void;
  removeQueueItem: (id: string) => void;
  clearActiveQueue: () => void;
  updateDynamicPoint: (id: string, k: number) => void;
  addPoint: (label: string, x: number, y: number, z: number) => void;
  addLine: (fromId: string, toId: string, style: 'solid' | 'dashed') => void;
  addMidpoint: (p1Id: string, p2Id: string) => void;
  addPlane: (pointIds: string[]) => void;
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
  const [state, dispatch] = useReducer(rawGeometryReducer, initialState);
  const stateRef = useRef(state);
  const scanSessionRef = useRef(0);
  const { addToHistory } = useGeometryHistory();
  const { user, openAuthModal, openUpgradeModal, refreshProfile } = useAuth();
  stateRef.current = state;

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

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
  }, []);

  const startDemo = useCallback((type: 'pyramid' | 'satellite' | 'lod4' | any = 'pyramid') => {
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
    if (!user && !checkAndIncrementGuestQuota()) {
      openAuthModal('quota');
      return;
    }

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
  }, [finishWithGeometry]);

  const analyzeText = useCallback(async (prompt: string, mode: DrawMode = 'quick') => {
    if (!user && !checkAndIncrementGuestQuota()) {
      openAuthModal('quota');
      return;
    }

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
  }, [finishWithGeometry]);

  const analyzeAdvance = useCallback(async (prompt: string) => {
    dispatch({ type: 'START_SCANNING' });
    try {
      const { data, error } = await invokeLocalApi('/api/analyze-advance', { prompt });
      if (error) throw new Error(error.message || String(error));
      if (data?.mode === 'advance' && data.scene) {
        dispatch({ type: 'SET_ADVANCE_SCENE', scene: data.scene });
      } else if (data?.geometry) {
        dispatch({ type: 'SET_GEOMETRY', geometry: data.geometry });
      } else {
        toast({ title: 'Chưa dựng được hình cho đề này', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Lỗi Advance', description: String((e as Error).message), variant: 'destructive' });
    } finally {
      dispatch({ type: 'STOP_SCANNING' });
    }
  }, []);

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
          const updates: any = { progress, statusText };
          if (chunk !== undefined) updates.streamingText = chunk; 
          dispatch({ type: 'QUEUE_UPDATE', id, updates });
        });

        if (error || data?.error) {
          let errorMessage = data?.error || error?.message || "Không thể phân tích đề bài";
          
          if (errorMessage.includes('Missing or invalid token')) {
            errorMessage = "Vui lòng đăng nhập để sử dụng tính năng AI vẽ hình.";
          }
          if (needsUpgrade(error)) openUpgradeModal();
          
          dispatch({
            type: 'QUEUE_UPDATE',
            id,
            updates: { status: 'error', progress: 0, statusText: errorMessage, error: errorMessage },
          });
          toast({ title: "❌ Lỗi vẽ hình", description: `"${prompt.substring(0, 50)}..." — ${errorMessage}`, variant: "destructive" });
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

          const historyId = await addToHistory(geometry, prompt);
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
  }, []);

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
            prompt: `📷 ${promptText.substring(0, 80)}...`, 
            geometry, 
            completedAt: Date.now() 
          },
        });

        const historyId = await addToHistory(geometry, promptText);
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
  }, []);

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
      dispatch({ type: 'SET_GEOMETRY', geometry: localResult.geometry });
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
        description: 'Dùng gợi ý cú pháp, hoặc bật "Sửa bằng AI" để chat tự do (0,2 credit/lần).',
        variant: "destructive",
      });
      return;
    }

    // Chế độ AI (trừ 0,2 credit ở server, hoàn nếu sửa không thành).
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
        dispatch({ type: 'SET_GEOMETRY', geometry: data.geometry });
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

  const loadGeometry = useCallback((geometry: GeometryData) => {
    dispatch({ type: 'SET_GEOMETRY', geometry });
    dispatch({ type: 'START_BUILDING' });
    setTimeout(() => {
      dispatch({ type: 'FINISH_BUILDING' });
      toast({ title: "Đã tải hình!", description: `${geometry.name} với ${geometry.points.length} điểm` });
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
    dispatch({ type: 'ADD_POINT', point: { id, label, x, y, z } });
  }, []);

  const addLine = useCallback((fromId: string, toId: string, style: 'solid' | 'dashed') => {
    const id = `line_${fromId}_${toId}`;
    dispatch({ type: 'ADD_LINE', line: { id, from: fromId, to: toId, style } });
  }, []);

  const addMidpoint = useCallback((p1Id: string, p2Id: string) => {
    const geo = stateRef.current.geometry;
    if (!geo) return;
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
  }, []);

  const addPlane = useCallback((pointIds: string[]) => {
    const geo = stateRef.current.geometry;
    if (!geo) return;
    const pts = pointIds.map(id => geo.points.find(p => p.id === id)).filter(Boolean) as Point3D[];
    if (pts.length < 3) return;
    const id = `plane_${pointIds.join('_')}`;
    const label = `(${pts.map(p => p.label).join('')})`;
    dispatch({ type: 'ADD_PLANE', plane: { id, label, points: pts.map(p => ({ x: p.x, y: p.y, z: p.z })), opacity: 0.15 } });
  }, []);

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
    dispatch({ type: 'ADD_PLANE', plane: { id, label, points: corners, opacity: 0.15 } });
  }, []);

  const removeElement = useCallback((type: 'point' | 'line' | 'plane' | 'curve' | 'sphere' | 'cylinder' | 'circle' | 'cone', id: string) => {
    dispatch({ type: 'REMOVE_ELEMENT', elementType: type, elementId: id });
  }, []);

  const updatePoint = useCallback((id: string, x: number, y: number, z: number) => {
    dispatch({ type: 'UPDATE_POINT', pointId: id, x, y, z });
  }, []);

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

  const setAiModel = useCallback((model: 'max' | 'high' | 'medium' | 'low') => {
    dispatch({ type: 'SET_AI_MODEL', model });
  }, []);

  const setUseReasoning = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_USE_REASONING', enabled });
  }, []);

  const toggleSelection = useCallback((id: string) => dispatch({ type: 'TOGGLE_SELECTION', id }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);
  const setStep = useCallback((i: number) => dispatch({ type: 'SET_STEP', index: i }), []);

  return (
    <GeometryContext.Provider value={{
      state, startDemo, analyzeImage, analyzeText, analyzeAdvance, setStep, queueAnalyzeText, queueAnalyzeImage,
      modifyGeometry, loadGeometry, clearGeometry, stopScanning, viewQueueItem, removeQueueItem, clearActiveQueue,
      updateDynamicPoint, addPoint, addLine, addMidpoint, addPlane, addPlaneFromEquation, removeElement,
      updatePoint, setManualMode, setManualTool, setVideoMode, toggleVideoMode, setSelectedIds, setAutoRotate, togglePoints, toggleAutoColor,
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
