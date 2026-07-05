import { useEffect, useState } from 'react';
import { useGeometry } from '@/context/GeometryContext';

export function AddLineTool() {
  const { state, addLine, clearSelection } = useGeometry();
  const [style, setStyle] = useState<'solid' | 'dashed'>('solid');

  const selectedPoints = state.selectedIds.filter(id => !id.startsWith('line_') && !id.startsWith('plane_'));

  useEffect(() => {
    if (selectedPoints.length === 2) {
      addLine(selectedPoints[0], selectedPoints[1], style);
      clearSelection();
    }
  }, [selectedPoints, addLine, clearSelection, style]);

  return (
    <div className="space-y-2 text-center text-xs text-muted-foreground pb-1">
      <p>💡 Click vào 2 điểm trên hình để nối đường.</p>
      
      <div className="flex justify-center items-center gap-2 mt-2 bg-secondary/50 p-1 rounded-md">
        <label className="text-[10px] cursor-pointer flex items-center gap-1">
          <input 
            type="radio" 
            checked={style === 'solid'} 
            onChange={() => setStyle('solid')} 
            className="w-3 h-3 accent-primary" 
          />
          Nét liền
        </label>
        <label className="text-[10px] cursor-pointer flex items-center gap-1">
          <input 
            type="radio" 
            checked={style === 'dashed'} 
            onChange={() => setStyle('dashed')} 
            className="w-3 h-3 accent-primary"
          />
          Nét đứt
        </label>
      </div>

      {selectedPoints.length > 0 && (
        <p className="text-primary font-medium text-[10px] animate-pulse">
          Đã chọn: {selectedPoints.join(', ')} (Cần 1 điểm nữa)
        </p>
      )}
    </div>
  );
}
