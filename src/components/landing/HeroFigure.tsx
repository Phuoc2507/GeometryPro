import { useCallback, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Grid } from '@react-three/drei';
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

/** Cạnh có nét khuất động: mỗi cạnh vẽ 2 line (liền + đứt), bật/tắt theo góc nhìn.
 *  Hình chóp là khối lồi nên phép khử nét khuất là chính xác: một cạnh bị khuất
 *  khi CẢ hai mặt kề đều quay lưng khỏi camera. */
function Edges() {
  // Pháp tuyến hướng ra ngoài + tâm mỗi mặt (cố định trong không gian, tính 1 lần).
  const faceData = useMemo(() => {
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
  }, []);

  // Mỗi cạnh: một object nét liền + một object nét đứt (tạo 1 lần).
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

  const viewDir = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    const front = faceData.map(
      (f) => viewDir.current.subVectors(camera.position, f.center).dot(f.normal) > 0,
    );
    EDGES.forEach((e, i) => {
      const hidden = !e.faces.some((f) => front[f]);
      lines[i].solid.visible = !hidden;
      lines[i].dashed.visible = hidden;
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
