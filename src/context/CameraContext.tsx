import React, { createContext, useContext, useState, useRef, useMemo, useCallback } from 'react';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

export interface CameraFocus { pts: Array<{ x: number; y: number; z: number }>; nonce: number }

interface CameraStateContextType {
  cameraState: CameraState;
  setCameraState: (state: CameraState) => void;
}

interface CameraContextType {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hiddenLines: Map<string, boolean>;
  setHiddenLines: (lines: Map<string, boolean>) => void;
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
}

const CameraStateContext = createContext<CameraStateContextType | undefined>(undefined);
const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [6, 5, 8],
    target: [0, 1.5, 0],
    zoom: 1
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hiddenLines, setHiddenLines] = useState<Map<string, boolean>>(new Map());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [revealVisibleIds, setRevealVisibleIds] = useState<Set<string> | null>(null);
  const [resetNonce, setResetNonce] = useState(0);
  const resetCamera = useCallback(() => setResetNonce((n) => n + 1), []);
  const [cameraFocus, setCameraFocus] = useState<CameraFocus | null>(null);
  const [solutionStep, setSolutionStep] = useState(0);
  const requestFocus = useCallback((pts: Array<{ x: number; y: number; z: number }>) => {
    if (!pts || pts.length === 0) return;
    setCameraFocus((prev) => ({ pts, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const stateValue = useMemo(() => ({ cameraState, setCameraState }), [cameraState]);
  const mainValue = useMemo(() => ({ canvasRef, hiddenLines, setHiddenLines, highlightedIds, setHighlightedIds, revealVisibleIds, setRevealVisibleIds, resetNonce, resetCamera, cameraFocus, requestFocus, solutionStep, setSolutionStep }), [hiddenLines, highlightedIds, revealVisibleIds, resetNonce, resetCamera, cameraFocus, requestFocus, solutionStep]);

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
