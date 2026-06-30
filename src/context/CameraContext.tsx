import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

interface CameraContextType {
  cameraState: CameraState;
  setCameraState: (state: CameraState) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hiddenLines: Map<string, boolean>;
  setHiddenLines: (lines: Map<string, boolean>) => void;
  /** IDs of points/lines to highlight (solver step highlight) */
  highlightedIds: Set<string>;
  setHighlightedIds: (ids: Set<string>) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [cameraState, setCameraState] = useState<CameraState>({
    position: [6, 5, 8],
    target: [0, 1.5, 0]
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hiddenLines, setHiddenLines] = useState<Map<string, boolean>>(new Map());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  return (
    <CameraContext.Provider value={{ cameraState, setCameraState, canvasRef, hiddenLines, setHiddenLines, highlightedIds, setHighlightedIds }}>
      {children}
    </CameraContext.Provider>
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
