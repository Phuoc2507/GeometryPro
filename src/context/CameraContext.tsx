import React, { createContext, useContext, useState, useRef, useMemo, useCallback } from 'react';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface CapturePoint {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface CaptureResult {
  canvas: HTMLCanvasElement;
  labelPositions: Map<string, { x: number; y: number; visible: boolean }>;
}

export type CaptureHandler = (
  cameraState: CameraState,
  hiddenLines: ReadonlyMap<string, boolean>,
  points: readonly CapturePoint[],
  transparent: boolean,
) => Promise<CaptureResult>;

export interface CameraFocus { pts: Array<{ x: number; y: number; z: number }>; nonce: number }

interface CameraStateContextType {
  /** Last camera pose committed after interaction ends. */
  cameraState: CameraState;
  /** High-frequency pose used only by the lightweight SVG preview. */
  previewCameraState: CameraState;
  setCameraState: (state: CameraState) => void;
  setLiveCameraState: (state: CameraState) => void;
}

interface CameraContextType {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hiddenLines: Map<string, boolean>;
  setHiddenLines: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
  highlightedIds: Set<string>;
  setHighlightedIds: (ids: Set<string>) => void;
  /** Bóc-lớp theo bước LỜI GIẢI: id nhìn thấy ở bước hiện tại (null = tắt, hiện đủ). */
  revealVisibleIds: Set<string> | null;
  setRevealVisibleIds: (ids: Set<string> | null) => void;
  /** Bumped each time a "reset view" is requested; CameraFitter re-fits when it changes. */
  resetNonce: number;
  /** Đặt lại góc nhìn về khung auto-fit ban đầu. */
  resetCamera: () => void;
  /** Điểm cần "bay tới" (toạ độ math). nonce đổi = trigger bay. null = không bay. */
  cameraFocus: CameraFocus | null;
  /** Yêu cầu bay camera tới ôm tập điểm (toạ độ math). Bỏ qua nếu rỗng. */
  requestFocus: (pts: Array<{ x: number; y: number; z: number }>) => void;
  /** Bước LỜI GIẢI (inner) đang xem của câu hiện tại — để orchestrator biết bay tới điểm dựng nào. */
  solutionStep: number;
  setSolutionStep: (n: number) => void;
  /** Tỉ lệ đáy màn bị panel che (0..~0.5). >0 → camera nhắm LỆCH LÊN để hình nằm ở phần đang thấy. */
  bottomInset: number;
  setBottomInset: (v: number) => void;
  /** The expanded PNG/TikZ editor owns its own camera while it is open. */
  isExportPreviewOpen: boolean;
  setExportPreviewOpen: (open: boolean) => void;
  /** Publish the main camera every frame so the small export preview can follow live. */
  isLivePreviewEnabled: boolean;
  setLivePreviewEnabled: (enabled: boolean) => void;
  registerCaptureHandler: (handler: CaptureHandler | null) => void;
  captureAtCamera: CaptureHandler;
}

const CameraStateContext = createContext<CameraStateContextType | undefined>(undefined);
const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const initialCameraState: CameraState = {
    position: [6, 5, 8],
    target: [0, 1.5, 0],
    zoom: 1
  };
  const [cameraState, setSettledCameraState] = useState<CameraState>(initialCameraState);
  const [previewCameraState, setLiveCameraState] = useState<CameraState>(initialCameraState);
  const setCameraState = useCallback((state: CameraState) => {
    setSettledCameraState(state);
    setLiveCameraState(state);
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hiddenLines, setHiddenLines] = useState<Map<string, boolean>>(new Map());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [revealVisibleIds, setRevealVisibleIds] = useState<Set<string> | null>(null);
  const [resetNonce, setResetNonce] = useState(0);
  const resetCamera = useCallback(() => setResetNonce((n) => n + 1), []);
  const [cameraFocus, setCameraFocus] = useState<CameraFocus | null>(null);
  const [solutionStep, setSolutionStep] = useState(0);
  const [bottomInset, setBottomInset] = useState(0);
  const [isExportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [isLivePreviewEnabled, setLivePreviewEnabled] = useState(false);
  const captureHandlerRef = useRef<CaptureHandler | null>(null);
  const registerCaptureHandler = useCallback((handler: CaptureHandler | null) => {
    captureHandlerRef.current = handler;
  }, []);
  const captureAtCamera = useCallback<CaptureHandler>(async (...args) => {
    if (!captureHandlerRef.current) {
      throw new Error('The 3D renderer is not ready for export');
    }
    return captureHandlerRef.current(...args);
  }, []);
  const requestFocus = useCallback((pts: Array<{ x: number; y: number; z: number }>) => {
    if (!pts || pts.length === 0) return;
    setCameraFocus((prev) => ({ pts, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const stateValue = useMemo(
    () => ({ cameraState, previewCameraState, setCameraState, setLiveCameraState }),
    [cameraState, previewCameraState, setCameraState],
  );
  const mainValue = useMemo(() => ({ canvasRef, hiddenLines, setHiddenLines, highlightedIds, setHighlightedIds, revealVisibleIds, setRevealVisibleIds, resetNonce, resetCamera, cameraFocus, requestFocus, solutionStep, setSolutionStep, bottomInset, setBottomInset, isExportPreviewOpen, setExportPreviewOpen, isLivePreviewEnabled, setLivePreviewEnabled, registerCaptureHandler, captureAtCamera }), [hiddenLines, highlightedIds, revealVisibleIds, resetNonce, resetCamera, cameraFocus, requestFocus, solutionStep, bottomInset, isExportPreviewOpen, isLivePreviewEnabled, registerCaptureHandler, captureAtCamera]);

  return (
    <CameraStateContext.Provider value={stateValue}>
      <CameraContext.Provider value={mainValue}>
        {children}
      </CameraContext.Provider>
    </CameraStateContext.Provider>
  );
}

export function useCamera() {
  const context = useContext(CameraContext);
  if (context === undefined) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
}

export function useCameraOptional() {
  return useContext(CameraContext);
}

export function useCameraState() {
  const context = useContext(CameraStateContext);
  if (context === undefined) {
    throw new Error('useCameraState must be used within a CameraProvider');
  }
  return context;
}

export function useCameraStateOptional() {
  return useContext(CameraStateContext);
}
