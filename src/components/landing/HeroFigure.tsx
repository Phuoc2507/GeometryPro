import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Grid, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { FileText, ImageDown, RotateCcw, Hand } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ── Đỉnh hình chóp S.ABCD (toạ độ three.js, trục y hướng lên) ── */
const P = {
  S: new THREE.Vector3(0, 1.35, 0),
  A: new THREE.Vector3(-1, -0.6, 1),
  B: new THREE.Vector3(1, -0.6, 1),
  C: new THREE.Vector3(1, -0.6, -1),
  D: new THREE.Vector3(-1, -0.6, -1),
} as const;

type VId = keyof typeof P;

/** Mỗi mặt của hình chóp (dùng để xác định cạnh khuất theo góc nhìn). */
const FACES: VId[][] = [
  ['S', 'A', 'B'], ['S', 'B', 'C'], ['S', 'C', 'D'], ['S', 'D', 'A'],
  ['A', 'B', 'C', 'D'], // đáy
];

/** Cạnh + chỉ số các mặt kề (để test khuất). */
const EDGES: { a: VId; b: VId; faces: number[] }[] = [
  { a: 'A', b: 'B', faces: [0, 4] },
  { a: 'B', b: 'C', faces: [1, 4] },
  { a: 'C', b: 'D', faces: [2, 4] },
  { a: 'D', b: 'A', faces: [3, 4] },
  { a: 'S', b: 'A', faces: [0, 3] },
  { a: 'S', b: 'B', faces: [0, 1] },
  { a: 'S', b: 'C', faces: [1, 2] },
  { a: 'S', b: 'D', faces: [2, 3] },
];

/** Nhãn + hướng lệch để chữ không đè lên cạnh (trong khung 3D). */
const LABELS: { id: VId; dx: number; dy: number }[] = [
  { id: 'S', dx: 0, dy: -16 },
  { id: 'A', dx: -14, dy: 6 },
  { id: 'B', dx: 4, dy: 14 },
  { id: 'C', dx: 14, dy: 4 },
  { id: 'D', dx: -14, dy: -2 },
];

const EDGE_COLOR = '#e5edff';
const FACE_COLOR = '#3b82f6';

/** Mã TikZ chuẩn của hình chóp (nét khuất đứt) để dán vào đề LaTeX. */
const TIKZ = `\\begin{tikzpicture}[scale=1.25,line join=round,line cap=round]
  \\coordinate (A) at (-1.6,-0.9);
  \\coordinate (B) at (1.9,-0.55);
  \\coordinate (C) at (2.7,0.45);
  \\coordinate (D) at (-0.8,0.05);
  \\coordinate (S) at (0.45,2.6);
  % canh khuat
  \\draw[dashed] (D)--(A);
  \\draw[dashed] (D)--(C);
  \\draw[dashed] (D)--(S);
  % canh thay
  \\draw (A)--(B)--(C);
  \\draw (S)--(A);  \\draw (S)--(B);  \\draw (S)--(C);
  % dinh
  \\foreach \\p/\\pos in {S/above,A/left,B/below,C/right,D/left}
    \\fill (\\p) circle (1.3pt) node[\\pos] {$\\p$};
\\end{tikzpicture}`;

/** Pháp tuyến hướng ra ngoài + tâm mỗi mặt (cố định, tính 1 lần). */
const FACE_INFO = (() => {
  const centroid = new THREE.Vector3();
  (Object.keys(P) as VId[]).forEach((k) => centroid.add(P[k]));
  centroid.multiplyScalar(1 / 5);
  return FACES.map((ids) => {
    const center = new THREE.Vector3();
    ids.forEach((id) => center.add(P[id]));
    center.multiplyScalar(1 / ids.length);
    const n = new THREE.Vector3()
      .subVectors(P[ids[1]], P[ids[0]])
      .cross(new THREE.Vector3().subVectors(P[ids[2]], P[ids[0]]))
      .normalize();
    if (n.dot(new THREE.Vector3().subVectors(center, centroid)) < 0) n.negate();
    return { center, normal: n };
  });
})();

/** Khối lồi: một cạnh bị khuất khi CẢ hai mặt kề đều quay lưng khỏi camera. */
function computeHidden(camPos: THREE.Vector3): boolean[] {
  const tmp = new THREE.Vector3();
  const front = FACE_INFO.map((f) => tmp.subVectors(camPos, f.center).dot(f.normal) > 0);
  return EDGES.map((e) => !e.faces.some((f) => front[f]));
}

function Faces() {
  const geom = useMemo(() => {
    const tris: THREE.Vector3[] = [
      P.S, P.A, P.B,
      P.S, P.B, P.C,
      P.S, P.C, P.D,
      P.S, P.D, P.A,
      P.A, P.B, P.C, P.A, P.C, P.D, // đáy (2 tam giác)
    ];
    const g = new THREE.BufferGeometry();
    g.setFromPoints(tris);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geom}>
      <meshBasicMaterial color={FACE_COLOR} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** Cạnh có nét khuất động: mỗi cạnh vẽ 2 line (liền + đứt), bật/tắt theo góc nhìn. */
function Edges() {
  const lines = useMemo(
    () =>
      EDGES.map((e) => {
        const g = new THREE.BufferGeometry().setFromPoints([P[e.a], P[e.b]]);
        const solid = new THREE.Line(g, new THREE.LineBasicMaterial({ color: EDGE_COLOR }));
        const dashed = new THREE.Line(
          g,
          new THREE.LineDashedMaterial({
            color: EDGE_COLOR, dashSize: 0.13, gapSize: 0.09, transparent: true, opacity: 0.7,
          }),
        );
        dashed.computeLineDistances(); // cần cho nét đứt (ghi vào geometry dùng chung)
        dashed.visible = false;
        return { solid, dashed };
      }),
    [],
  );

  useFrame(({ camera }) => {
    const hidden = computeHidden(camera.position);
    hidden.forEach((h, i) => {
      lines[i].solid.visible = !h;
      lines[i].dashed.visible = h;
    });
  });

  return (
    <>
      {lines.map((l, i) => (
        <group key={i}>
          <primitive object={l.solid} />
          <primitive object={l.dashed} />
        </group>
      ))}
    </>
  );
}

function Scene() {
  return (
    <>
      <Faces />
      <Edges />
      {LABELS.map(({ id, dx, dy }) => (
        <group key={id} position={P[id]}>
          <mesh>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshBasicMaterial color={EDGE_COLOR} />
          </mesh>
          <Html center style={{ transform: `translate(${dx}px, ${dy}px)`, pointerEvents: 'none' }}>
            <span
              style={{
                fontFamily: '"Computer Modern Serif", Georgia, serif',
                fontStyle: 'italic', fontWeight: 700, fontSize: 17,
                color: '#f8fafc', textShadow: '0 0 6px #020817, 0 0 6px #020817',
                userSelect: 'none', whiteSpace: 'nowrap',
              }}
            >
              {id}
            </span>
          </Html>
        </group>
      ))}
      <Grid
        position={[0, -0.62, 0]}
        args={[12, 12]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#1e3a8a"
        sectionSize={3}
        sectionThickness={1}
        sectionColor="#2563eb"
        fadeDistance={16}
        fadeStrength={1.5}
        infiniteGrid
      />
      {/* Bụi sáng trôi nhẹ tạo chiều sâu — không ảnh hưởng tính nét khuất (chỉ là điểm trang trí). */}
      <Sparkles count={36} scale={7} size={2} speed={0.35} opacity={0.5} color="#60a5fa" />
    </>
  );
}

export default function HeroFigure() {
  const { toast } = useToast();
  const cameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<{ reset: () => void } | null>(null);
  const [hint, setHint] = useState(true);

  const copyTikz = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(TIKZ);
      toast({ title: 'Đã copy TikZ', description: 'Dán thẳng vào file LaTeX của bạn.' });
    } catch {
      toast({ title: 'Không copy được', description: 'Trình duyệt chặn clipboard.', variant: 'destructive' });
    }
  }, [toast]);

  // Xuất ảnh nét đen trên nền trắng (dạng vector, giống "xuất ảnh trắng đen" trong app),
  // chiếu điểm 3D theo đúng góc nhìn hiện tại.
  const exportPng = useCallback(() => {
    const cam = cameraRef.current;
    if (!cam) return;
    try {
      const S = 1400;
      const M = 0.18 * S; // lề
      const INK = '#111111';

      // Chiếu các đỉnh sang toạ độ màn hình chuẩn hoá (NDC).
      const ids = Object.keys(P) as VId[];
      const ndc = new Map<VId, { x: number; y: number }>();
      ids.forEach((id) => {
        const v = P[id].clone().project(cam);
        ndc.set(id, { x: v.x, y: v.y });
      });
      const xs = ids.map((id) => ndc.get(id)!.x);
      const ys = ids.map((id) => ndc.get(id)!.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
      const scale = Math.min((S - 2 * M) / spanX, (S - 2 * M) / spanY);
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const toPx = (id: VId) => {
        const p = ndc.get(id)!;
        return { x: S / 2 + (p.x - cx) * scale, y: S / 2 - (p.y - cy) * scale };
      };

      const canvas = document.createElement('canvas');
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, S, S);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK;

      const hidden = computeHidden(cam.position);
      EDGES.forEach((e, i) => {
        const a = toPx(e.a), b = toPx(e.b);
        ctx.beginPath();
        if (hidden[i]) {
          ctx.lineWidth = S * 0.004;
          ctx.setLineDash([S * 0.014, S * 0.012]);
        } else {
          ctx.lineWidth = S * 0.0052;
          ctx.setLineDash([]);
        }
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Tâm hình chiếu để đẩy nhãn ra ngoài (độc lập với góc xoay).
      const centerPx = ids.reduce(
        (acc, id) => { const p = toPx(id); acc.x += p.x; acc.y += p.y; return acc; },
        { x: 0, y: 0 },
      );
      centerPx.x /= ids.length;
      centerPx.y /= ids.length;

      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `italic 700 ${Math.round(S * 0.045)}px "Computer Modern Serif", Georgia, serif`;
      ids.forEach((id) => {
        const p = toPx(id);
        ctx.beginPath();
        ctx.arc(p.x, p.y, S * 0.006, 0, Math.PI * 2);
        ctx.fill();
        const dx = p.x - centerPx.x, dy = p.y - centerPx.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = S * 0.05;
        ctx.fillText(id, p.x + (dx / len) * off, p.y + (dy / len) * off);
      });

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'hinh-chop-SABCD.png';
      a.click();
      toast({ title: 'Đã xuất ảnh', description: 'Ảnh nét đen trên nền trắng.' });
    } catch {
      toast({ title: 'Không xuất được ảnh', description: 'Thử lại sau nhé.', variant: 'destructive' });
    }
  }, [toast]);

  return (
    <div className="relative glass rounded-xl border border-border/50 shadow-2xl overflow-hidden">
      {/* thanh tiêu đề giả lập cửa sổ */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-border/40 bg-background/40">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        <span className="ml-2 text-xs text-muted-foreground">geo3d · Chế độ Giáo viên</span>
      </div>

      {/* không gian 3D tương tác */}
      <div className="relative h-[300px] sm:h-[340px] bg-gradient-to-b from-background/0 to-primary/5">
        <Canvas
          camera={{ position: [3.4, 1.7, 3.8], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={({ camera }) => { cameraRef.current = camera; }}
          onPointerDown={() => setHint(false)}
        >
          <ambientLight intensity={0.9} />
          <Scene />
          <OrbitControls
            ref={controlsRef as never}
            enablePan={false}
            enableZoom={false}
            autoRotate
            autoRotateSpeed={0.9}
            minPolarAngle={0.5}
            maxPolarAngle={1.5}
            target={[0, 0.2, 0]}
          />
        </Canvas>

        {hint && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 backdrop-blur rounded-full px-3 py-1 border border-border/40">
            <Hand className="w-3.5 h-3.5" /> Kéo để xoay hình
          </div>
        )}
        <button
          onClick={() => controlsRef.current?.reset()}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
          title="Về góc nhìn ban đầu"
          aria-label="Về góc nhìn ban đầu"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* nút xuất thật */}
      <div className="flex items-center justify-center gap-3 py-4 border-t border-border/40">
        <button
          onClick={copyTikz}
          className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3.5 py-2 border border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-300 transition-colors"
        >
          <FileText className="w-4 h-4" /> Copy TikZ
        </button>
        <button
          onClick={exportPng}
          className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3.5 py-2 border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <ImageDown className="w-4 h-4" /> Xuất ảnh
        </button>
      </div>
    </div>
  );
}
