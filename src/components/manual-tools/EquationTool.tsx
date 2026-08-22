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
    // Parse mặt phẳng linh hoạt: cho phép thiếu số hạng và MỌI thứ tự — z=3, x=2, 2x-y=6,
    // y+x+z=3… (trước đây bắt buộc đủ x,y,z đúng thứ tự nên gõ z=3 là báo sai).
    const cleaned = eq.replace(/\s/g, '').toLowerCase();
    // Chỉ chấp nhận ký tự hợp lệ (x,y,z, số, dấu). Ký tự lạ → sai định dạng (không "nuốt" âm thầm).
    if (!/^[xyz0-9+\-.=]+$/.test(cleaned)) return null;
    const eqIdx = cleaned.indexOf('=');
    if (eqIdx < 0 || cleaned.indexOf('=', eqIdx + 1) >= 0) return null;  // phải có đúng 1 dấu '='
    const lhs = cleaned.slice(0, eqIdx);
    const rhs = cleaned.slice(eqIdx + 1);
    if (/[xyz]/.test(rhs)) return null;  // vế phải phải là hằng số (vd x=3z chưa hỗ trợ)
    const rhsVal = parseFloat(rhs);
    if (!lhs || !Number.isFinite(rhsVal)) return null;

    const coeff: Record<'x' | 'y' | 'z', number> = { x: 0, y: 0, z: 0 };
    let constLhs = 0;
    let matchedAny = false;
    const tokenRe = /([+-]?)(\d*\.?\d*)([xyz]?)/g;
    let m: RegExpExecArray | null;
    while ((m = tokenRe.exec(lhs)) !== null) {
      if (m[0] === '') { tokenRe.lastIndex++; continue; }  // tránh lặp vô hạn ở khớp rỗng
      const sign = m[1] === '-' ? -1 : 1;
      const numStr = m[2];
      const v = m[3] as 'x' | 'y' | 'z' | '';
      if (v) {
        const num = numStr === '' || numStr === '.' ? 1 : parseFloat(numStr);
        if (!Number.isFinite(num)) return null;
        coeff[v] += sign * num;
        matchedAny = true;
      } else if (numStr !== '' && numStr !== '.') {
        const num = parseFloat(numStr);
        if (!Number.isFinite(num)) return null;
        constLhs += sign * num;  // hằng số bên trái → chuyển sang phải
        matchedAny = true;
      }
    }
    if (!matchedAny) return null;
    if (coeff.x === 0 && coeff.y === 0 && coeff.z === 0) return null;  // không có biến ⇒ không phải mặt phẳng
    return { a: coeff.x, b: coeff.y, c: coeff.z, d: rhsVal - constLhs };
  };

  const handleAdd = () => {
    const parsed = parseEquation(equation);
    if (!parsed) {
      setError('Sai định dạng. VD: x+y+z=3, 2x-y+3z=6, hoặc z=3');
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
