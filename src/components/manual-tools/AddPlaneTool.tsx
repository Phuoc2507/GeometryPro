import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Square } from 'lucide-react';
import { Point3D } from '@/types/geometry';

interface AddPlaneToolProps {
  points: Point3D[];
  onAdd: (pointIds: string[]) => void;
}

export function AddPlaneTool({ points, onAdd }: AddPlaneToolProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const togglePoint = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const handleAdd = () => {
    if (selected.length < 3) return;
    onAdd(selected);
    setSelected([]);
  };

  if (points.length < 3) {
    return <p className="text-xs text-muted-foreground">Cần ít nhất 3 điểm để tạo mặt phẳng.</p>;
  }

  return (
    <div className="space-y-2">
      <Label className="text-[10px] text-muted-foreground">Chọn 3-4 điểm (đã chọn: {selected.length})</Label>
      <div className="flex flex-wrap gap-1">
        {points.map(p => (
          <Button
            key={p.id}
            size="sm"
            variant={selected.includes(p.id) ? 'default' : 'outline'}
            className="h-6 text-[10px] px-2"
            onClick={() => togglePoint(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={handleAdd} disabled={selected.length < 3}>
        <Square className="w-3 h-3 mr-1" /> Tạo mặt phẳng
      </Button>
    </div>
  );
}
