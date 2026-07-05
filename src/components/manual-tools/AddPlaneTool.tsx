import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { useGeometry } from '@/context/GeometryContext';

export function AddPlaneTool() {
  const { state, addPlane, clearSelection } = useGeometry();
  const selectedPoints = state.selectedIds.filter(id => !id.startsWith('line_') && !id.startsWith('plane_'));
  
  const prevSelectedRef = useRef<string[]>([]);

  useEffect(() => {
    const prev = prevSelectedRef.current;
    
    // Detect if user clicked the FIRST point again to close the loop
    // When they click it, toggleSelection removes it from the array.
    if (prev.length >= 3 && selectedPoints.length === prev.length - 1) {
      if (prev[0] && !selectedPoints.includes(prev[0])) {
        // First point was removed, treat as loop closure!
        addPlane(prev);
        clearSelection();
        prevSelectedRef.current = [];
        return;
      }
    }
    
    prevSelectedRef.current = selectedPoints;
  }, [selectedPoints, addPlane, clearSelection]);

  const handleAdd = () => {
    if (selectedPoints.length < 3) return;
    addPlane(selectedPoints);
    clearSelection();
  };

  return (
    <div className="space-y-3 text-center text-xs text-muted-foreground pb-1">
      <p>💡 Click ít nhất 3 điểm trên hình. Bấm "Tạo" hoặc click lại điểm đầu tiên để hoàn thành.</p>
      
      {selectedPoints.length > 0 && (
        <p className="text-primary font-medium text-[10px] animate-pulse">
          Đã chọn: {selectedPoints.join(', ')} 
          {selectedPoints.length < 3 ? ` (Cần thêm ${3 - selectedPoints.length} điểm)` : ' (Sẵn sàng)'}
        </p>
      )}

      <Button 
        size="sm" 
        className="w-full h-7 text-xs" 
        onClick={handleAdd} 
        disabled={selectedPoints.length < 3}
      >
        <Square className="w-3 h-3 mr-1" /> Tạo mặt phẳng
      </Button>
    </div>
  );
}
