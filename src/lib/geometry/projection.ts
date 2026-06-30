import { Point3D } from '@/types/geometry';

export interface ProjectedPoint extends Point3D {
    projected: { x: number; y: number };
}

/**
 * Projects a 3D point in math coordinates (z=up) to 2D screen coordinates
 * based on the current Three.js camera state (y=up).
 */
export const project3DTo2D = (
    point: Point3D,
    cameraPos: [number, number, number],
    target: [number, number, number]
): { x: number; y: number } => {
    // Convert from math coords (z=up) to Three.js coords (y=up): swap y and z
    const px = Number(point.x) || 0;
    const py = Number(point.z) || 0; // math z -> three y
    const pz = Number(point.y) || 0; // math y -> three z

    const [cx, cy, cz] = cameraPos;
    const [tx, ty, tz] = target;

    // Forward vector (camera looks toward target)
    let fx = tx - cx, fy = ty - cy, fz = tz - cz;
    const fLen = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
    fx /= fLen; fy /= fLen; fz /= fLen;

    // World up
    const ux = 0, uy = 1, uz = 0;

    // Right = forward × up
    let rx = fy * uz - fz * uy;
    let ry = fz * ux - fx * uz;
    let rz = fx * uy - fy * ux;
    const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rLen; ry /= rLen; rz /= rLen;

    // True up = right × forward
    const tux = ry * fz - rz * fy;
    const tuy = rz * fx - rx * fz;
    const tuz = rx * fy - ry * fx;

    // Vector from camera to point
    const vx = px - cx, vy = py - cy, vz = pz - cz;

    // Project onto right and up axes
    const screenX = vx * rx + vy * ry + vz * rz;
    const screenY = vx * tux + vy * tuy + vz * tuz;

    return { x: screenX, y: screenY };
};

import { GeometryData } from '@/types/geometry';
import { sanitizeLatexLabel, sanitizeLatexName } from '@/lib/sanitizeLatex';

const formatCoord = (val: number): string => {
    if (Math.abs(val) < 0.005) return "0.00";
    const fixed = val.toFixed(2);
    return fixed === "-0.00" ? "0.00" : fixed;
};

export const generateProjectedLatex = (
    geometry: GeometryData,
    cameraPos: [number, number, number],
    target: [number, number, number],
    hiddenLines?: Map<string, boolean>,
    showPoints: boolean = true,
    scale: number = 1.2
): string => {
    const projected = geometry.points.map(p => ({
        ...p,
        projected: project3DTo2D(p, cameraPos, target)
    }));

    const safeName = sanitizeLatexName(geometry.name);

    let latex = `\\begin{tikzpicture}[scale=${scale.toFixed(1)}]
  % Định nghĩa các điểm (đã chiếu theo góc nhìn hiện tại)
  % ${safeName}
`;

    if (showPoints) {
        projected.forEach(p => {
            const safeId = sanitizeLatexLabel(p.id);
            latex += `  \\coordinate (${safeId}) at (${formatCoord(p.projected.x)}, ${formatCoord(p.projected.y)});\n`;
        });
    }

    latex += `\n  % Vẽ các cạnh nét liền\n`;

    const solidLines: any[] = [];
    const dashedLines: any[] = [];

    geometry.lines.forEach(line => {
        const isHidden = hiddenLines?.get(line.id) ?? line.style === 'dashed';
        if (isHidden) {
            dashedLines.push(line);
        } else {
            solidLines.push(line);
        }
    });

    solidLines.forEach(line => {
        const safeFrom = sanitizeLatexLabel(geometry.points.find(p => p.id === line.from)?.id || line.from);
        const safeTo = sanitizeLatexLabel(geometry.points.find(p => p.id === line.to)?.id || line.to);
        latex += `  \\draw[thick] (${safeFrom}) -- (${safeTo});\n`;
    });

    if (dashedLines.length > 0) {
        latex += `\n  % Vẽ các cạnh khuất (nét đứt)\n`;
        dashedLines.forEach(line => {
            const safeFrom = sanitizeLatexLabel(geometry.points.find(p => p.id === line.from)?.id || line.from);
            const safeTo = sanitizeLatexLabel(geometry.points.find(p => p.id === line.to)?.id || line.to);
            latex += `  \\draw[dashed] (${safeFrom}) -- (${safeTo});\n`;
        });
    }

    // Vẽ các mặt cầu (nếu có)
    if (geometry.spheres && geometry.spheres.length > 0) {
        latex += `\n  % Vẽ các mặt cầu (hình chiếu 2D được tối ưu hóa với bóng đổ 3D)\n`;
        geometry.spheres.forEach(s => {
            const centerProj = project3DTo2D(s.center, cameraPos, target);
            const cx = formatCoord(centerProj.x);
            const cy = formatCoord(centerProj.y);
            const r = formatCoord(s.radius);
            latex += `  \\shade[ball color=blue!10, opacity=0.2] (${cx}, ${cy}) circle (${r});\n`;
            latex += `  \\draw[thick, blue!60] (${cx}, ${cy}) circle (${r});\n`;
            latex += `  \\draw[dashed, blue!40] (${cx}, ${cy}) ellipse (${r} and ${formatCoord(s.radius * 0.25)});\n`;
            latex += `  \\draw[dashed, blue!40] (${cx}, ${cy}) ellipse (${formatCoord(s.radius * 0.25)} and ${r});\n`;
        });
    }

    // Vẽ các đường tròn (nếu có)
    if (geometry.circles && geometry.circles.length > 0) {
        latex += `\n  % Vẽ các đường tròn quỹ đạo (hình chiếu 2D)\n`;
        geometry.circles.forEach(c => {
            const n = c.normal;
            let temp = { x: 1, y: 0, z: 0 };
            if (Math.abs(n.x) > 0.9) temp = { x: 0, y: 1, z: 0 };
            const ux = temp.y * n.z - temp.z * n.y;
            const uy = temp.z * n.x - temp.x * n.z;
            const uz = temp.x * n.y - temp.y * n.x;
            const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz) || 1;
            const u = { x: ux / uLen, y: uy / uLen, z: uz / uLen };
            const vx = n.y * u.z - n.z * u.y;
            const vy = n.z * u.x - n.x * u.z;
            const vz = n.x * u.y - n.y * u.x;
            const v = { x: vx, y: vy, z: vz };

            const segments = 32;
            const pathPoints: string[] = [];
            for (let j = 0; j < segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                const p3d = {
                    id: '', label: '',
                    x: c.center.x + c.radius * Math.cos(angle) * u.x + c.radius * Math.sin(angle) * v.x,
                    y: c.center.y + c.radius * Math.cos(angle) * u.y + c.radius * Math.sin(angle) * v.y,
                    z: c.center.z + c.radius * Math.cos(angle) * u.z + c.radius * Math.sin(angle) * v.z
                };
                const p2d = project3DTo2D(p3d, cameraPos, target);
                pathPoints.push(`(${formatCoord(p2d.x)}, ${formatCoord(p2d.y)})`);
            }
            latex += `  \\draw[thick, red!70] ${pathPoints.join(' -- ')} -- cycle;\n`;
        });
    }

    if (geometry.curves && geometry.curves.length > 0) {
        latex += `\n  % Vẽ các đường cong\n`;
        geometry.curves.forEach(curve => {
            const pts: any[] = [];
            const numPoints = 50;
            
            if (curve.type === 'parabola') {
                const { a, b, c, xMin, xMax } = curve.params;
                for (let i = 0; i <= numPoints; i++) {
                    const x = xMin + (xMax - xMin) * (i / numPoints);
                    const y = a * x * x + b * x + c;
                    pts.push({ id: '', label: '', x, y: 0, z: y });
                }
            } else if (curve.type === 'cubic') {
                const { a, b, c, d, xMin, xMax } = curve.params;
                for (let i = 0; i <= numPoints; i++) {
                    const x = xMin + (xMax - xMin) * (i / numPoints);
                    const y = a * x * x * x + b * x * x + c * x + d;
                    pts.push({ id: '', label: '', x, y: 0, z: y });
                }
            } else if (curve.type === 'rational') {
                const { numA, numB, denA, denB, xMin, xMax } = curve.params;
                for (let i = 0; i <= numPoints; i++) {
                    const x = xMin + (xMax - xMin) * (i / numPoints);
                    const y = (numA * x + numB) / (denA * x + denB);
                    pts.push({ id: '', label: '', x, y: 0, z: y });
                }
            }
            
            if (pts.length > 0) {
                const projectedPts = pts.map(p => project3DTo2D(p, cameraPos, target));
                const pathCoords = projectedPts.map(p => `(${formatCoord(p.x)}, ${formatCoord(p.y)})`).join(' -- ');
                const style = curve.style === 'dashed' ? 'dashed' : 'thick';
                const color = curve.color ? `, color=${curve.color.replace('#', '')}` : ', color=blue';
                latex += `  \\draw[${style}${color}] ${pathCoords};\n`;
            }
        });
    }

    // Vẽ các hình nón (Cones)
    if (geometry.cones && geometry.cones.length > 0) {
        latex += `\n  % Vẽ các hình nón (Cones)\n`;
        geometry.cones.forEach(c => {
            const apexProj = project3DTo2D(c.apex, cameraPos, target);
            const ax = formatCoord(apexProj.x);
            const ay = formatCoord(apexProj.y);

            const dx = c.apex.x - c.baseCenter.x;
            const dy = c.apex.y - c.baseCenter.y;
            const dz = c.apex.z - c.baseCenter.z;
            const dLen = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
            const n = { x: dx/dLen, y: dy/dLen, z: dz/dLen };

            let temp = { x: 1, y: 0, z: 0 };
            if (Math.abs(n.x) > 0.9) temp = { x: 0, y: 1, z: 0 };
            const ux = temp.y * n.z - temp.z * n.y;
            const uy = temp.z * n.x - temp.x * n.z;
            const uz = temp.x * n.y - temp.y * n.x;
            const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz) || 1;
            const u = { x: ux / uLen, y: uy / uLen, z: uz / uLen };
            const vx = n.y * u.z - n.z * u.y;
            const vy = n.z * u.x - n.x * u.z;
            const vz = n.x * u.y - n.y * u.x;
            const v = { x: vx, y: vy, z: vz };

            const segments = 32;
            const pathPoints: string[] = [];
            const ringPoints2D: {x: number, y: number}[] = [];
            
            for (let j = 0; j < segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                const p3d = {
                    id: '', label: '',
                    x: c.baseCenter.x + c.radius * Math.cos(angle) * u.x + c.radius * Math.sin(angle) * v.x,
                    y: c.baseCenter.y + c.radius * Math.cos(angle) * u.y + c.radius * Math.sin(angle) * v.y,
                    z: c.baseCenter.z + c.radius * Math.cos(angle) * u.z + c.radius * Math.sin(angle) * v.z
                };
                const p2d = project3DTo2D(p3d, cameraPos, target);
                ringPoints2D.push(p2d);
                pathPoints.push(`(${formatCoord(p2d.x)}, ${formatCoord(p2d.y)})`);
            }
            latex += `  \\draw[thick, gray!80] ${pathPoints.join(' -- ')} -- cycle;\n`;

            let minXIdx = 0, maxXIdx = 0;
            for (let j = 1; j < segments; j++) {
                if (ringPoints2D[j].x < ringPoints2D[minXIdx].x) minXIdx = j;
                if (ringPoints2D[j].x > ringPoints2D[maxXIdx].x) maxXIdx = j;
            }
            latex += `  \\draw[thick, gray!90] (${ax}, ${ay}) -- (${formatCoord(ringPoints2D[minXIdx].x)}, ${formatCoord(ringPoints2D[minXIdx].y)});\n`;
            latex += `  \\draw[thick, gray!90] (${ax}, ${ay}) -- (${formatCoord(ringPoints2D[maxXIdx].x)}, ${formatCoord(ringPoints2D[maxXIdx].y)});\n`;
        });
    }

    // Vẽ các hình trụ (Cylinders)
    if (geometry.cylinders && geometry.cylinders.length > 0) {
        latex += `\n  % Vẽ các hình trụ (Cylinders)\n`;
        geometry.cylinders.forEach(c => {
            const dx = c.center1.x - c.center2.x;
            const dy = c.center1.y - c.center2.y;
            const dz = c.center1.z - c.center2.z;
            const dLen = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
            const n = { x: dx/dLen, y: dy/dLen, z: dz/dLen };

            let temp = { x: 1, y: 0, z: 0 };
            if (Math.abs(n.x) > 0.9) temp = { x: 0, y: 1, z: 0 };
            const ux = temp.y * n.z - temp.z * n.y;
            const uy = temp.z * n.x - temp.x * n.z;
            const uz = temp.x * n.y - temp.y * n.x;
            const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz) || 1;
            const u = { x: ux / uLen, y: uy / uLen, z: uz / uLen };
            const vx = n.y * u.z - n.z * u.y;
            const vy = n.z * u.x - n.x * u.z;
            const vz = n.x * u.y - n.y * u.x;
            const v = { x: vx, y: vy, z: vz };

            const segments = 32;
            const ringPoints1: {x: number, y: number}[] = [];
            const ringPoints2: {x: number, y: number}[] = [];
            const path1: string[] = [];
            const path2: string[] = [];
            
            for (let j = 0; j < segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                const rcos = c.radius * Math.cos(angle);
                const rsin = c.radius * Math.sin(angle);
                
                const p1_3d = {
                    id: '', label: '',
                    x: c.center1.x + rcos * u.x + rsin * v.x,
                    y: c.center1.y + rcos * u.y + rsin * v.y,
                    z: c.center1.z + rcos * u.z + rsin * v.z
                };
                const p1_2d = project3DTo2D(p1_3d, cameraPos, target);
                ringPoints1.push(p1_2d);
                path1.push(`(${formatCoord(p1_2d.x)}, ${formatCoord(p1_2d.y)})`);
                
                const p2_3d = {
                    id: '', label: '',
                    x: c.center2.x + rcos * u.x + rsin * v.x,
                    y: c.center2.y + rcos * u.y + rsin * v.y,
                    z: c.center2.z + rcos * u.z + rsin * v.z
                };
                const p2_2d = project3DTo2D(p2_3d, cameraPos, target);
                ringPoints2.push(p2_2d);
                path2.push(`(${formatCoord(p2_2d.x)}, ${formatCoord(p2_2d.y)})`);
            }
            
            latex += `  \\draw[thick, gray!80] ${path1.join(' -- ')} -- cycle;\n`;
            latex += `  \\draw[thick, gray!80] ${path2.join(' -- ')} -- cycle;\n`;

            let minXIdx = 0, maxXIdx = 0;
            for (let j = 1; j < segments; j++) {
                if (ringPoints1[j].x < ringPoints1[minXIdx].x) minXIdx = j;
                if (ringPoints1[j].x > ringPoints1[maxXIdx].x) maxXIdx = j;
            }
            
            latex += `  \\draw[thick, gray!90] (${formatCoord(ringPoints1[minXIdx].x)}, ${formatCoord(ringPoints1[minXIdx].y)}) -- (${formatCoord(ringPoints2[minXIdx].x)}, ${formatCoord(ringPoints2[minXIdx].y)});\n`;
            latex += `  \\draw[thick, gray!90] (${formatCoord(ringPoints1[maxXIdx].x)}, ${formatCoord(ringPoints1[maxXIdx].y)}) -- (${formatCoord(ringPoints2[maxXIdx].x)}, ${formatCoord(ringPoints2[maxXIdx].y)});\n`;
        });
    }

    // Vẽ các bề mặt (Surfaces)
    if (geometry.surfaces && geometry.surfaces.length > 0) {
        latex += `\n  % Vẽ các mặt cong (Surfaces)\n`;
        geometry.surfaces.forEach(s => {
            if (s.type === 'hyperboloid') {
                const a = s.params.a || 2;
                const b = s.params.b || 2;
                const c = s.params.c || 1.5;
                const vMin = s.params.vMin || -0.327;
                const vMax = s.params.vMax || 1.098;
                const cx = s.center.x;
                const cy = s.center.y;
                const cz = s.center.z;

                const getP = (u: number, v: number) => {
                    return {
                        id: '', label: '',
                        x: a * Math.cosh(v) * Math.cos(u) + cx,
                        y: b * Math.cosh(v) * Math.sin(u) + cy,
                        z: c * Math.sinh(v) + cz
                    };
                };

                // Vẽ 3 vòng ngang
                const vs = [vMin, 0, vMax];
                vs.forEach(v => {
                    const pts = [];
                    for (let i = 0; i <= 32; i++) {
                        const u = (i / 32) * Math.PI * 2;
                        const p2d = project3DTo2D(getP(u, v), cameraPos, target);
                        pts.push(`(${formatCoord(p2d.x)}, ${formatCoord(p2d.y)})`);
                    }
                    latex += `  \\draw[purple!60, thick] ${pts.join(' -- ')};\n`;
                });

                // Vẽ 8 đường dọc (meridians)
                for (let i = 0; i < 8; i++) {
                    const u = (i / 8) * Math.PI * 2;
                    const pts = [];
                    for (let j = 0; j <= 10; j++) {
                        const v = vMin + (j / 10) * (vMax - vMin);
                        const p2d = project3DTo2D(getP(u, v), cameraPos, target);
                        pts.push(`(${formatCoord(p2d.x)}, ${formatCoord(p2d.y)})`);
                    }
                    latex += `  \\draw[purple!40, dashed] ${pts.join(' -- ')};\n`;
                }
            }
        });
    }

    // Vẽ các đường cong (Curves)
    if (geometry.curves && geometry.curves.length > 0) {
        latex += `\n  % Vẽ các đường cong 2D (Curves)\n`;
        geometry.curves.forEach(curve => {
            if (curve.type === 'parabola') {
                const { a, b, c, xMin, xMax } = curve.params;
                const steps = 50;
                const pts = [];
                for (let i = 0; i <= steps; i++) {
                    const x = xMin + (i / steps) * (xMax - xMin);
                    const y = a * x * x + b * x + c;
                    // Đường cong 2D nằm trên mặt phẳng Math XY (z=0)
                    const p3d = { id: '', label: '', x, y, z: 0 };
                    const p2d = project3DTo2D(p3d, cameraPos, target);
                    pts.push(`(${formatCoord(p2d.x)}, ${formatCoord(p2d.y)})`);
                }
                const drawColor = curve.color ? curve.color.replace('#', '') : 'orange!90!black';
                // Use a default thick line. Hex colors in TikZ require \definecolor, so we fallback to orange.
                latex += `  \\draw[thick, orange!90!black] ${pts.join(' -- ')};\n`;
            }
        });
    }

    // Vẽ agents
    if (geometry.agents && geometry.agents.length > 0) {
        latex += `\n  % Vẽ agents (ví dụ: người cứu hộ, nạn nhân)\n`;
        geometry.agents.forEach(a => {
            const p3d = { id: a.id, label: a.label, x: a.initialPosition[0], y: a.initialPosition[1], z: a.initialPosition[2] };
            const p2d = project3DTo2D(p3d, cameraPos, target);
            const cx = formatCoord(p2d.x);
            const cy = formatCoord(p2d.y);
            const color = a.id === 'rescuer' ? 'orange' : 'red';
            latex += `  \\fill[${color}] (${cx}, ${cy}) circle (3pt);\n`;
            latex += `  \\node[above, font=\\scriptsize, text=${color}] at (${cx}, ${cy}) {${a.label}};\n`;
        });
    }

    latex += `\n  % Nhãn các đỉnh\n`;

    if (showPoints) {
        projected.forEach(p => {
            const safeId = sanitizeLatexLabel(p.id);
            // Ignore intermediate points
            if (p.id.startsWith('P') || p.id.startsWith('curve_')) return;
            
            if (p.label) {
                // LaTeX labels should be wrapped in $ $ for math mode if they contain math, or just directly.
                // We'll wrap in $ $ to be safe and match the web UI which uses math-like italicization.
                const cleanLabel = sanitizeLatexLabel(p.label).replace(/\$/g, '');
                latex += `  \\fill (${safeId}) circle (1.5pt) node[above right] {$${cleanLabel}$};\n`;
            } else {
                latex += `  \\fill (${safeId}) circle (1.5pt);\n`;
            }
        });
    }

    latex += `\\end{tikzpicture}`;

    return latex;
};
