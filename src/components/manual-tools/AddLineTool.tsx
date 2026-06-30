import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus } from 'lucide-react';
import { Point3D } from '@/types/geometry';

interface AddLineToolProps {
  points: Point3D[];
  onAdd: (fromId: string, toId: string, style: 'solid' | 'dashed') => void;
}

export function AddLineTool({ points, onAdd }: AddLineToolProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [style, setStyle] = useState<'solid' | 'dashed'>('solid');

  const handleAdd = () => {
    if (!from || !to || from === to) return;
    onAdd(from, to, style);
    setFrom('');
    setTo('');
  };

  if (points.length < 2) {
    return <p className="text-xs text-muted-foreground">Cần ít nhất 2 điểm để nối đường.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-[10px] text-muted-foreground">Từ</Label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Chọn" /></SelectTrigger>
            <SelectContent>
              {points.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Đến</Label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Chọn" /></SelectTrigger>
            <SelectContent>
              {points.filter(p => p.id !== from).map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Kiểu</Label>
        <Select value={style} onValueChange={v => setStyle(v as 'solid' | 'dashed')}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Nét liền</SelectItem>
            <SelectItem value="dashed">Nét đứt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={handleAdd} disabled={!from || !to || from === to}>
        <Minus className="w-3 h-3 mr-1" /> Nối đường
      </Button>
    </div>
  );
}
