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
    })) as GeometryData['planes'];

  // Mặt phẳng cho bởi PHƯƠNG TRÌNH (P): ax+by+cz+d=0 là mặt VÔ HẠN — không có đa giác nên
  // trước đây "Vẽ kỹ" (kernel) KHÔNG hiện, khác "Vẽ nhanh" (LLM tự dựng 4 góc). Dựng một TẤM
  // HỮU HẠN quanh vùng hình: 4 điểm góc (placeholder → tự ẩn nhãn), 4 cạnh, và plane có
  // label "(P)" để hiện đúng kiểu SGK. Bỏ qua mặt đã là face (đa giác có tên).
  const EQ_PLANE_COLORS = ['#9ca3af', '#4ade80', '#60a5fa', '#f59e0b'];
  // Chỉ dựng tấm tổng hợp cho mặt PHƯƠNG TRÌNH thật sự: mặt mà DƯỚI 3 điểm-có-tên nằm trên nó.
  // Mặt định nghĩa bằng ≥3 điểm có tên (vd (ABCD) qua A,B,C) đã có/được vẽ bằng chính các điểm đó —
  // bỏ qua để không sinh góc thừa (giữ đúng hành vi cũ, tránh làm rối hình).
  const onPlaneCount = (n: { x: number; y: number; z: number }, d: number): number => {
    const len = Math.hypot(n.x, n.y, n.z) || 1;
    let cnt = 0;
    for (const p of points) {
      if (Math.abs(n.x * p.x + n.y * p.y + n.z * p.z + d) / len <= 1e-6 * Math.max(1, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))) cnt++;
    }
    return cnt;
  };
  const eqPlanes = Array.from(et.planes.entries()).filter(([key, pe]) =>
    !et.faces.has(key) && onPlaneCount({ x: pe.n.x.approx, y: pe.n.y.approx, z: pe.n.z.approx }, pe.d.approx) < 3,
  );
  if (eqPlanes.length > 0) {
    // Tâm + bán kính vùng hình (từ các điểm đã có) để canh kích thước tấm.
    let cx = 0, cy = 0, cz = 0;
    for (const p of points) { cx += p.x; cy += p.y; cz += p.z; }
    const nP = Math.max(1, points.length);
    const center = { x: cx / nP, y: cy / nP, z: cz / nP };
    let radius = 4;
    for (const p of points) {
      radius = Math.max(radius, Math.hypot(p.x - center.x, p.y - center.y, p.z - center.z));
    }
    const half = radius * 1.3;

    eqPlanes.forEach(([key, pe], idx) => {
      const n = { x: pe.n.x.approx, y: pe.n.y.approx, z: pe.n.z.approx };
      const d = pe.d.approx;
      const nn = n.x * n.x + n.y * n.y + n.z * n.z;
      if (!(nn > 0)) return;
      // Chiếu tâm vùng hình xuống mặt phẳng để tấm bám sát hình.
      const t = (n.x * center.x + n.y * center.y + n.z * center.z + d) / nn;
      const c = { x: center.x - n.x * t, y: center.y - n.y * t, z: center.z - n.z * t };
      // Hai vector đơn vị nằm trong mặt (vuông góc n).
      const axis = Math.abs(n.x) < Math.abs(n.z) ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
      const u0 = { x: n.y * axis.z - n.z * axis.y, y: n.z * axis.x - n.x * axis.z, z: n.x * axis.y - n.y * axis.x };
      const ul = Math.hypot(u0.x, u0.y, u0.z) || 1;
      const u = { x: u0.x / ul, y: u0.y / ul, z: u0.z / ul };
      const v0 = { x: n.y * u.z - n.z * u.y, y: n.z * u.x - n.x * u.z, z: n.x * u.y - n.y * u.x };
      const vl = Math.hypot(v0.x, v0.y, v0.z) || 1;
      const v = { x: v0.x / vl, y: v0.y / vl, z: v0.z / vl };
      // 4 góc đi quanh biên (không đi chéo).
      const signs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      const corners = signs.map(([su, sv]) => ({
        x: c.x + u.x * half * su + v.x * half * sv,
        y: c.y + u.y * half * su + v.y * half * sv,
        z: c.z + u.z * half * su + v.z * half * sv,
      }));
      const ids = corners.map((_, i) => `${key}${i + 1}`);
      corners.forEach((pt, i) => points.push({ id: ids[i], label: ids[i], x: pt.x, y: pt.y, z: pt.z }));
      for (let i = 0; i < 4; i++) {
        const a = ids[i], b = ids[(i + 1) % 4];
        lines.push({ id: `${a}${b}`, from: a, to: b, style: 'solid' as const });
      }
      planes.push({
        id: key,
        label: `(${key})`,
        pointIds: ids,
        points: corners,
        color: EQ_PLANE_COLORS[idx % EQ_PLANE_COLORS.length],
        opacity: 0.12,
      });
    });
  }

  return { name, points, lines, spheres, planes } as GeometryData;
}
