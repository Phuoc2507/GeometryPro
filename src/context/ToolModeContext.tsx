import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type ToolMode = 'none' | 'cut' | 'unfold';

interface ToolModeContextType {
  mode: ToolMode;
  setMode: (mode: ToolMode) => void;
  sliderValue: number;
  setSliderValue: (value: number) => void;
}

const ToolModeContext = createContext<ToolModeContextType | undefined>(undefined);

export function ToolModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ToolMode>('none');
  const [sliderValue, setSliderValue] = useState<number>(50); // Default middle

  useEffect(() => {
    const handleClear = () => setMode('none');
    window.addEventListener('geometryCleared', handleClear);
    return () => window.removeEventListener('geometryCleared', handleClear);
  }, []);

  const handleSetMode = (newMode: ToolMode) => {
    setMode(newMode);
    // Reset slider when changing mode
    if (newMode === 'cut') setSliderValue(50);
    if (newMode === 'unfold') setSliderValue(0);
  };

  return (
    <ToolModeContext.Provider value={{ mode, setMode: handleSetMode, sliderValue, setSliderValue }}>
      {children}
    </ToolModeContext.Provider>
  );
}

export function useToolMode() {
  const context = useContext(ToolModeContext);
  if (!context) {
    throw new Error('useToolMode must be used within a ToolModeProvider');
  }
  return context;
}
