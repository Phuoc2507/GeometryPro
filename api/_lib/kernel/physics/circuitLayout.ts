// api/_lib/kernel/physics/circuitLayout.ts
// circuitLayout — DỮ-LIỆU-CHỜ-UI (§10.3): format DRAFT cho render 2D schematic tương lai, CHƯA có
// component nào tiêu thụ (cùng số phận `charts` v0 — KHÔNG persist, được phép đổi khi làm UI thật).
// Layout TẤT ĐỊNH từ cây (test được): lá {w:1,h:1}; series trải NGANG; parallel xếp DỌC.
// valueText CHỈ mang SỐ LIỆU ĐỀ CHO đã khai trong plan (§17.1) — TUYỆT ĐỐI không nhúng giá trị
// engine TÍNH (I, U, R_tđ…) khi làm UI.
import type { CircuitNode } from './circuitSchema';

export type LayoutCell = { x: number; y: number; w: number; h: number };
export type LayoutElement = {
  id: string;
  type: 'source' | 'resistor' | 'lamp' | 'unknown_resistor';
  name: string;
  valueText: string;
  cell: LayoutCell;
};
export type Junction = { id: string; at: [number, number] };
export type Wire = { from: [number, number]; to: [number, number] };
export type CircuitLayout = {
  grid: { cols: number; rows: number };
  elements: LayoutElement[];
  junctions: Junction[];
  wires: Wire[];
};

// Mọi field optional để nhận THẲNG CircuitPlan (z.infer dưới strictNullChecks:false suy ra tất cả
// optional — quy ước v0); runtime luôn có circuit + source (schema bắt buộc).
type LayoutInput = {
  problemName?: string;
  source?: { emf?: number; r?: number };
  circuit?: CircuitNode;
};

type Box = { w: number; h: number };

// Kích thước đệ quy: lá 1×1; series Σw × max h; parallel max w × Σh.
function size(node: CircuitNode): Box {
  if (node.kind === 'series') {
    return node.items.reduce((b, it) => { const s = size(it); return { w: b.w + s.w, h: Math.max(b.h, s.h) }; }, { w: 0, h: 0 });
  }
  if (node.kind === 'parallel') {
    return node.items.reduce((b, it) => { const s = size(it); return { w: Math.max(b.w, s.w), h: b.h + s.h }; }, { w: 0, h: 0 });
  }
  return { w: 1, h: 1 };
}

function valueTextOf(node: CircuitNode): string {
  if (node.kind === 'resistor') return `${node.ohms} ${node.unit === 'kohm' ? 'kΩ' : 'Ω'}`;
  if (node.kind === 'lamp') return `${node.ratedVolts} V – ${node.ratedWatts} W`;
  return `${node.name} = ?`; // unknown_resistor: đánh dấu ẩn
}

export function buildLayout(plan: LayoutInput): CircuitLayout {
  const elements: LayoutElement[] = [];
  const junctions: Junction[] = [];
  const wires: Wire[] = [];
  let jid = 0;

  // Đặt chỗ: căn TRÁI/TRÊN trong dải được cấp phát ⇒ các cell luôn rời nhau (dải x rời cho series,
  // dải y rời cho parallel). Lá phát element 1×1; nhóm chỉ định tuyến dây + junction.
  const place = (node: CircuitNode, x: number, y: number): void => {
    if (node.kind === 'series') {
      let cx = x;
      let prevRight: [number, number] | null = null;
      for (const it of node.items) {
        const s = size(it);
        place(it, cx, y);
        const left: [number, number] = [cx, y];
        if (prevRight) wires.push({ from: prevRight, to: left }); // nối tiếp: mắt xích trái→phải
        prevRight = [cx + s.w, y];
        cx += s.w;
      }
      return;
    }
    if (node.kind === 'parallel') {
      const box = size(node);
      const jLeft: Junction = { id: `j${jid++}`, at: [x, y] };
      const jRight: Junction = { id: `j${jid++}`, at: [x + box.w, y] };
      junctions.push(jLeft, jRight);
      let cy = y;
      for (const it of node.items) {
        const s = size(it);
        place(it, x, cy);
        // mỗi nhánh chạm ĐỦ hai junction mép (bất biến §10.3)
        wires.push({ from: jLeft.at, to: [x, cy] });
        wires.push({ from: [x + box.w, cy], to: jRight.at });
        cy += s.h;
      }
      return;
    }
    // lá
    elements.push({ id: node.name, type: node.kind, name: node.name, valueText: valueTextOf(node), cell: { x, y, w: 1, h: 1 } });
  };

  const rootBox = size(plan.circuit);
  place(plan.circuit, 0, 0);

  // Nguồn ở hàng đáy (dải y riêng ⇒ không đè mạch ngoài); dây khép vòng chữ nhật.
  const srcY = rootBox.h;
  const rParts = plan.source.r !== undefined ? `; r = ${plan.source.r} Ω` : '';
  elements.push({
    id: 'src', type: 'source', name: 'nguon', valueText: `E = ${plan.source.emf} V${rParts}`,
    cell: { x: 0, y: srcY, w: 1, h: 1 },
  });
  wires.push({ from: [0, 0], to: [0, srcY] });                    // cực (−) lên mạch ngoài
  wires.push({ from: [rootBox.w, 0], to: [rootBox.w, srcY] });    // cực (+) khép vòng
  wires.push({ from: [0, srcY], to: [rootBox.w, srcY] });         // đáy qua nguồn

  return {
    grid: { cols: Math.max(1, rootBox.w) + 1, rows: srcY + 1 },
    elements, junctions, wires,
  };
}
