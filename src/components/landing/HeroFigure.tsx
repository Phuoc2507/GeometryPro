import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line, Html, OrbitControls, Grid } from '@react-three/drei';
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

/** Cạnh: đáy + 4 cạnh bên. */
const EDGES: [VId, VId][] = [
  ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
  ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D'],
];

/** Nhãn + hướng lệch để chữ không đè lên cạnh. */
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

function Scene() {
  return (
    <>
      <Faces />
      {EDGES.map(([a, b]) => (
        <Line key={`${a}${b}`} points={[P[a], P[b]]} color={EDGE_COLOR} lineWidth={1.8} />
      ))}
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
    </>
  );
}

export default function HeroFigure() {
  const { toast } = useToast();
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
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

  const exportPng = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;
    try {
      const src = gl.domElement;
      // Ghép lên nền trắng để in ấn / chèn đề đẹp.
      const out = document.createElement('canvas');
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('no ctx');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0);
      const url = out.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hinh-chop-SABCD.png';
      a.click();
      toast({ title: 'Đã xuất ảnh', description: 'hinh-chop-SABCD.png' });
    } catch {
      toast({ title: 'Không xuất được ảnh', description: 'Thử lại sau nhé.', variant: 'destructive' });
    }
  }, [toast]);

  return (
    <div className="relative glass rounded-3xl border border-border/50 shadow-2xl overflow-hidden">
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
          gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => { glRef.current = gl; }}
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
