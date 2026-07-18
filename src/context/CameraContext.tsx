import React, { createContext, useContext, useState, useRef, useMemo, useCallback } from 'react';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
}

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
  /** Bumped each time a "reset view" is requested; CameraFitter re-fits when it changes. */
  resetNonce: number;
  /** Đặt lại góc nhìn về khung auto-fit ban đầu. */
  resetCamera: () => void;
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
  const [resetNonce, setResetNonce] = useState(0);
  const resetCamera = useCallback(() => setResetNonce((n) => n + 1), []);

  const stateValue = useMemo(() => ({ cameraState, setCameraState }), [cameraState]);
  const mainValue = useMemo(() => ({ canvasRef, hiddenLines, setHiddenLines, highlightedIds, setHighlightedIds, resetNonce, resetCamera }), [hiddenLines, highlightedIds, resetNonce, resetCamera]);

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
