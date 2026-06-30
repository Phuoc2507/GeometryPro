import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CircleDot } from 'lucide-react';
import { Point3D } from '@/types/geometry';

interface MidpointToolProps {
  points: Point3D[];
  onAdd: (p1Id: string, p2Id: string) => void;
}

export function MidpointTool({ points, onAdd }: MidpointToolProps) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');

  const handleAdd = () => {
    if (!p1 || !p2 || p1 === p2) return;
    onAdd(p1, p2);
    setP1('');
    setP2('');
  };

  if (points.length < 2) {
    return <p className="text-xs text-muted-foreground">Cần ít nhất 2 điểm.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-[10px] text-muted-foreground">Điểm 1</Label>
          <Select value={p1} onValueChange={setP1}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Chọn" /></SelectTrigger>
            <SelectContent>
              {points.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Điểm 2</Label>
          <Select value={p2} onValueChange={setP2}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Chọn" /></SelectTrigger>
            <SelectContent>
              {points.filter(p => p.id !== p1).map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={handleAdd} disabled={!p1 || !p2 || p1 === p2}>
        <CircleDot className="w-3 h-3 mr-1" /> Thêm trung điểm
      </Button>
    </div>
  );
}
