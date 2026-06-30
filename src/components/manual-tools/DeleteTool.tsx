import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { GeometryData } from '@/types/geometry';

interface DeleteToolProps {
  geometry: GeometryData | null;
  onDelete: (type: 'point' | 'line' | 'plane', id: string) => void;
}

export function DeleteTool({ geometry, onDelete }: DeleteToolProps) {
  if (!geometry) return <p className="text-xs text-muted-foreground">Chưa có hình.</p>;

  const hasItems = geometry.points.length > 0 || geometry.lines.length > 0 || (geometry.planes?.length || 0) > 0;
  if (!hasItems) return <p className="text-xs text-muted-foreground">Không có phần tử nào.</p>;

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {geometry.points.map(p => (
        <div key={p.id} className="flex items-center justify-between text-xs">
          <span>🔵 {p.label} ({p.x}, {p.y}, {p.z})</span>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => onDelete('point', p.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
      {geometry.lines.map(l => (
        <div key={l.id} className="flex items-center justify-between text-xs">
          <span>📏 {l.from}→{l.to}</span>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => onDelete('line', l.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
      {geometry.planes?.map(p => (
        <div key={p.id} className="flex items-center justify-between text-xs">
          <span>🟦 {p.label || p.id}</span>
          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => onDelete('plane', p.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
