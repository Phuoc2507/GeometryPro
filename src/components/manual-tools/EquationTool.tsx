import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FunctionSquare } from 'lucide-react';

interface EquationToolProps {
  onAdd: (a: number, b: number, c: number, d: number) => void;
}

export function EquationTool({ onAdd }: EquationToolProps) {
  const [equation, setEquation] = useState('');
  const [error, setError] = useState('');

  const parseEquation = (eq: string): { a: number; b: number; c: number; d: number } | null => {
    // Parse "ax + by + cz = d" format
    const cleaned = eq.replace(/\s/g, '');
    const match = cleaned.match(/^([+-]?\d*\.?\d*)x([+-]\d*\.?\d*)y([+-]\d*\.?\d*)z=([+-]?\d*\.?\d+)$/);
    if (match) {
      const parseCoeff = (s: string) => {
        if (s === '' || s === '+') return 1;
        if (s === '-') return -1;
        return parseFloat(s);
      };
      return {
        a: parseCoeff(match[1]),
        b: parseCoeff(match[2]),
        c: parseCoeff(match[3]),
        d: parseFloat(match[4]),
      };
    }
    return null;
  };

  const handleAdd = () => {
    const parsed = parseEquation(equation);
    if (!parsed) {
      setError('Sai định dạng. VD: x+y+z=3 hoặc 2x-y+3z=6');
      return;
    }
    setError('');
    onAdd(parsed.a, parsed.b, parsed.c, parsed.d);
    setEquation('');
  };

  return (
    <div className="space-y-2">
      <Label className="text-[10px] text-muted-foreground">Phương trình mặt phẳng (ax+by+cz=d)</Label>
      <Input
        value={equation}
        onChange={e => { setEquation(e.target.value); setError(''); }}
        placeholder="x+y+z=3"
        className="h-7 text-xs"
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <Button size="sm" className="w-full h-7 text-xs" onClick={handleAdd}>
        <FunctionSquare className="w-3 h-3 mr-1" /> Vẽ mặt phẳng
      </Button>
    </div>
  );
}
