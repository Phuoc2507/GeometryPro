// api/_lib/kernel/entityToGeometry.ts
// Chuyển EntityTable (kết quả run()) sang GeometryData của frontend để render.
import type { EntityTable } from './entityTable';
import type { LineE, PointE } from './entities';
import type { GeometryData } from '../../../src/types/geometry';

// Một line-entity (tiếp tuyến/trục/đường qua 2 điểm) là đường VÔ HẠN — không thành edge nên xưa nay
// KHÔNG được vẽ (bài "đống rơm" mất đoạn thang B→C). Nối các điểm-CÓ-TÊN nằm TRÊN đường thành một đoạn
// hữu hạn: 2 điểm cực biên dọc theo hướng đường (các điểm giữa nằm sẵn trên đoạn đó). Trả null nếu
// đường suy biến hoặc < 2 điểm nằm trên (không bịa đoạn cho đường trơ). Generic — không cần translator
// phát edge riêng cho từng bài.
function segmentForLine(le: LineE, points: Map<string, PointE>): { from: string; to: string } | null {
  const p0 = { x: le.p.x.approx, y: le.p.y.approx, z: le.p.z.approx };
  const d = { x: le.dir.x.approx, y: le.dir.y.approx, z: le.dir.z.approx };
  const dd = d.x * d.x + d.y * d.y + d.z * d.z;
  if (!(dd > 0)) return null; // hướng suy biến (0,0,0) — không phải đường
  const onLine: { label: string; t: number }[] = [];
  for (const [label, pe] of points) {
    const v = { x: pe.p.x.approx - p0.x, y: pe.p.y.approx - p0.y, z: pe.p.z.approx - p0.z };
    const vv = v.x * v.x + v.y * v.y + v.z * v.z;
    const vd = v.x * d.x + v.y * d.y + v.z * d.z;
    // Khoảng cách vuông góc² từ điểm tới đường = |v|² − (v·d)²/|d|² (có thể âm nhẹ do làm tròn float).
    const perp2 = vv - (vd * vd) / dd;
    // Dung sai TƯƠNG ĐỐI theo tầm toạ độ đang xét: điểm dựng đúng cách đường ~1e-12, điểm lệch cách ~O(1).
    const scale = Math.max(1, Math.abs(p0.x), Math.abs(p0.y), Math.abs(p0.z), Math.sqrt(vv));
    const tol2 = (1e-6 * scale) ** 2;
    if (perp2 <= tol2) onLine.push({ label, t: vd / dd });
  }
  if (onLine.length < 2) return null;
  onLine.sort((a, b) => a.t - b.t);
  const from = onLine[0].label;
  const to = onLine[onLine.length - 1].label;
  return from === to ? null : { from, to };
}

export function entityTableToGeometryData(et: EntityTable, name: string): GeometryData {
  const points = Array.from(et.points.entries()).map(([label, pe]) => ({
    id: label,
    label,
    x: pe.p.x.approx,
    y: pe.p.y.approx,
    z: pe.p.z.approx,
  }));

  const lines = Array.from(et.edges).map((key) => {
    const [from, to] = key.split('|');
    return { id: `${from}${to}`, from, to, style: 'solid' as const };
  });

  // Bồi thêm đoạn hữu hạn cho MỖI line-entity (tiếp tuyến/trục/…): nối các điểm-có-tên nằm trên nó.
  // Dedupe theo cặp không thứ tự để không vẽ chồng lên edge đã có.
  const seenPairs = new Set(
    lines.map((l) => (l.from < l.to ? `${l.from}|${l.to}` : `${l.to}|${l.from}`)),
  );
  for (const le of et.lines.values()) {
    const seg = segmentForLine(le, et.points);
    if (!seg) continue;
    const key = seg.from < seg.to ? `${seg.from}|${seg.to}` : `${seg.to}|${seg.from}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    lines.push({ id: `${seg.from}${seg.to}`, from: seg.from, to: seg.to, style: 'solid' as const });
  }

  const spheres = Array.from(et.spheres.entries()).map(([label, s]) => ({
    id: label,
    label,
    center: { x: s.center.x.approx, y: s.center.y.approx, z: s.center.z.approx },
    radius: Math.sqrt(Math.max(0, s.r2.approx)),
  }));

  // Mặt hiển thị lấy từ face (đa giác có tên) — góc mặt là các đỉnh.
  const planes = Array.from(et.faces.entries())
    .filter(([, verts]) => verts.length >= 3)
    .map(([key, verts]) => ({
      id: key,
      label: key,
      pointIds: [...verts],
      points: verts.map((n) => {
        const p = et.points.get(n)!;
        return { x: p.p.x.approx, y: p.p.y.approx, z: p.p.z.approx };
      }),
    }));

  return { name, points, lines, spheres, planes } as GeometryData;
}
