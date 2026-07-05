import { useEffect } from 'react';
import { useGeometry } from '@/context/GeometryContext';

export function MidpointTool() {
  const { state, addMidpoint, clearSelection } = useGeometry();
  
  const selectedPoints = state.selectedIds.filter(id => !id.startsWith('line_') && !id.startsWith('plane_'));

  useEffect(() => {
    if (selectedPoints.length === 2) {
      addMidpoint(selectedPoints[0], selectedPoints[1]);
      clearSelection();
    }
  }, [selectedPoints, addMidpoint, clearSelection]);

  return (
    <div className="space-y-2 text-center text-xs text-muted-foreground pb-1">
      <p>💡 Click vào 2 điểm trên hình để tạo trung điểm.</p>
      
      {selectedPoints.length > 0 && (
        <p className="text-primary font-medium text-[10px] animate-pulse">
          Đã chọn: {selectedPoints.join(', ')} (Cần 1 điểm nữa)
        </p>
      )}
    </div>
  );
}
