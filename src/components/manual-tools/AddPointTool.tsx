import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface AddPointToolProps {
  onAdd: (label: string, x: number, y: number, z: number) => void;
  existingLabels: string[];
}

export function AddPointTool({ onAdd, existingLabels }: AddPointToolProps) {
  const [label, setLabel] = useState('');
  const [x, setX] = useState('0');
  const [y, setY] = useState('0');
  const [z, setZ] = useState('0');

  const nextLabel = () => {
    const used = new Set(existingLabels);
    for (let i = 0; i < 26; i++) {
      const ch = String.fromCharCode(65 + i);
      if (!used.has(ch)) return ch;
    }
    return `P${existingLabels.length + 1}`;
  };

  const handleAdd = () => {
    const l = label.trim() || nextLabel();
    onAdd(l, parseFloat(x) || 0, parseFloat(y) || 0, parseFloat(z) || 0);
    setLabel('');
    setX('0');
    setY('0');
    setZ('0');
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        <div>
          <Label className="text-[10px] text-muted-foreground">Tên</Label>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={nextLabel()}
            className="h-7 text-xs px-1.5"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">X</Label>
          <Input value={x} onChange={e => setX(e.target.value)} className="h-7 text-xs px-1.5" type="number" step="0.5" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Y</Label>
          <Input value={y} onChange={e => setY(e.target.value)} className="h-7 text-xs px-1.5" type="number" step="0.5" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Z</Label>
          <Input value={z} onChange={e => setZ(e.target.value)} className="h-7 text-xs px-1.5" type="number" step="0.5" />
        </div>
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={handleAdd}>
        <Plus className="w-3 h-3 mr-1" /> Thêm điểm
      </Button>
    </div>
  );
}
