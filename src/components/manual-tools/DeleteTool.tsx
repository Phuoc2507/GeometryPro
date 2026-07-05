import { useEffect } from 'react';
import { useGeometry } from '@/context/GeometryContext';
import { Eraser } from 'lucide-react';

export function DeleteTool() {
  const { state, removeElement, clearSelection } = useGeometry();

  useEffect(() => {
    if (state.selectedIds.length > 0) {
      const id = state.selectedIds[0];
      const geo = state.geometry;
      if (geo) {
        if (geo.points?.some(p => p.id === id)) {
          removeElement('point', id);
        } else if (geo.planes?.some(p => p.id === id)) {
          removeElement('plane', id);
        } else if (geo.lines?.some(l => l.id === id)) {
          removeElement('line', id);
        } else if (geo.curves?.some(c => c.id === id)) {
          removeElement('curve', id);
        } else if (geo.spheres?.some(s => s.id === id)) {
          removeElement('sphere', id);
        } else if (geo.cylinders?.some(c => c.id === id)) {
          removeElement('cylinder', id);
        } else if (geo.circles?.some(c => c.id === id)) {
          removeElement('circle', id);
        } else if (geo.cones?.some(c => c.id === id)) {
          removeElement('cone', id);
        }
      }
      clearSelection();
    }
  }, [state.selectedIds, state.geometry, removeElement, clearSelection]);

  return (
    <div className="space-y-2 text-center text-xs text-muted-foreground pb-1">
      <div className="flex items-center justify-center text-destructive mb-1 animate-pulse">
        <Eraser className="w-4 h-4" />
      </div>
      <p>👉 Click vào bất kỳ đối tượng nào (điểm, đường, mặt phẳng) để xóa. Xóa điểm sẽ xóa luôn các thành phần liên kết.</p>
    </div>
  );
}
