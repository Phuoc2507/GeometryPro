import React from 'react';
import { useToolMode } from '@/context/ToolModeContext';

export function ToolSlider() {
  const { mode, sliderValue, setSliderValue, setMode } = useToolMode();

  if (mode === 'none') return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-lg w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">
          {mode === 'cut' ? 'Mặt cắt động' : 'Trải phẳng khối hình'}
        </h3>
        <button 
          onClick={() => setMode('none')}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Đóng
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono w-8">{sliderValue}%</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={sliderValue}
          onChange={(e) => setSliderValue(parseInt(e.target.value))}
          className="flex-1 accent-primary"
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        {mode === 'cut' ? 'Kéo thanh trượt để di chuyển mặt phẳng cắt' : 'Kéo thanh trượt để mở tung các bề mặt'}
      </p>
    </div>
  );
}
