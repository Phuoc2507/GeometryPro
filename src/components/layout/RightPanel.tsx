import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Copy, Check, Box, Download, Image as ImageIcon, Sparkles, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraOptional, useCameraStateOptional, type CameraState } from '@/context/CameraContext';
import { project3DTo2D, generateProjectedLatex } from '@/lib/geometry/projection';
import { buildRevolutionSolidFigure } from '@/lib/geometry/revolutionSolidFigure';
import { wrapTikzAsDocument } from '@/lib/geometry/latexDocument';
import { computeProperties, isAnalysisFigure } from '@/lib/geometry/calculations';
import { cn } from '@/lib/utils';
import { scaleGeometry } from '@/lib/geometry/scaleGeometry';
import { projectScene } from '@/lib/advanceProject';
import { CaptureModal } from '@/components/CaptureModal';
import { ShareSheet } from '@/components/ShareSheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SolverContent, ResizeHandle } from '@/components/SolverPanel';
import { GeometryPropertiesTab } from './GeometryPropertiesTab';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { TierBanner } from './TierBanner';
import {
  createHiddenLineDetector,
  isLineDashed,
  mergeLineDashStyles,
} from '@/lib/geometry/hiddenLineDetection';

function PanelContent() {
  const [copied, setCopied] = useState(false);
  const [tikzScale, setTikzScale] = useState(1.2);
  const [activeTab, setActiveTab] = useState('export');
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const context = useGeometryOptional();
  const camera = useCameraOptional();
  const cameraStateContext = useCameraStateOptional();

  // Ở chế độ Advance, HÌNH TRÊN CANVAS = base + cờ hiển thị của BƯỚC hiện tại (projectScene): các phần
  // tử như revolutionSolids trong base mặc định `hidden:true`, chỉ hiện khi bước lộ ra. Bản LaTeX phải
  // dựng từ CÙNG hình đó, không phải base thô — nếu không khối tròn xoay (đang hiện trên canvas) sẽ bị
  // bỏ trắng trong LaTeX vì ở base nó vẫn hidden. Bài thường (advanceScene=null) giữ nguyên base.
  const effectiveGeometry = useMemo(() => {
    const g = context?.state.geometry;
    if (!g) return null;
    const scene = context?.state.advanceScene;
    if (scene && scene.base && Array.isArray(scene.steps)) {
      return projectScene(g, scene.steps, context?.state.currentStep ?? 0);
    }
    return g;
  }, [context?.state.geometry, context?.state.advanceScene, context?.state.currentStep]);

  const scaledGeometry = useMemo(() => {
    if (!effectiveGeometry) return null;
    return scaleGeometry(effectiveGeometry);
  }, [effectiveGeometry]);

  const properties = useMemo(() => {
    if (!context?.state.geometry) return null;
    return computeProperties(context.state.geometry);
  }, [context?.state.geometry]);

  const visualCameraState = camera?.isLivePreviewEnabled
    ? cameraStateContext?.previewCameraState
    : cameraStateContext?.cameraState;
  const buildFixedCamera = useCallback((st: CameraState | undefined) => {
    if (!st) return null;
    
    // Luôn khóa mục tiêu vào gốc tọa độ O(0,0,0) để tọa độ trong TikZ luôn chuẩn xác
    const target: [number, number, number] = [0, 0, 0];
    
    const viewDir = [
      st.position[0] - st.target[0],
      st.position[1] - st.target[1],
      st.position[2] - st.target[2]
    ];
    const cameraPos: [number, number, number] = [
      target[0] + viewDir[0],
      target[1] + viewDir[1],
      target[2] + viewDir[2]
    ];
    return { cameraPos, target, zoom: st.zoom || 1 };
  }, []);
  const fixedCamera = useMemo(() => buildFixedCamera(visualCameraState), [buildFixedCamera, visualCameraState]);
  const settledFixedCamera = useMemo(
    () => buildFixedCamera(cameraStateContext?.cameraState),
    [buildFixedCamera, cameraStateContext?.cameraState],
  );
  const settledHiddenLineDetector = useMemo(
    () => scaledGeometry ? createHiddenLineDetector(scaledGeometry) : null,
    [scaledGeometry],
  );
  const settledHiddenLines = useMemo(() => {
    if (!scaledGeometry || !settledHiddenLineDetector || !settledFixedCamera) {
      return undefined;
    }
    return mergeLineDashStyles(
      scaledGeometry.lines,
      settledHiddenLineDetector.detect(settledFixedCamera.cameraPos),
    );
  }, [
    scaledGeometry,
    settledFixedCamera,
    settledHiddenLineDetector,
  ]);

  // TikZ follows only the settled camera. Live camera updates therefore redraw
  // the lightweight SVG without rebuilding the source dozens of times a second.
  const dynamicLatex = useMemo(() => {
    const geometry = effectiveGeometry;
    if (!geometry || !settledFixedCamera) return context?.state.geometry?.latexCode || '';
    return generateProjectedLatex(
      scaledGeometry || geometry,
      settledFixedCamera.cameraPos,
      settledFixedCamera.target,
      settledHiddenLines,
      context?.state.showPoints,
      tikzScale * (settledFixedCamera.zoom || 1)
    );
  }, [
    effectiveGeometry,
    context?.state.geometry,
    context?.state.showPoints,
    scaledGeometry,
    settledFixedCamera,
    settledHiddenLines,
    tikzScale,
  ]);

  // All hooks above must run even when this panel is rendered without a provider.
  if (!context) return null;

  const { state } = context;

  const getDynamicLatex = () => wrapTikzAsDocument(dynamicLatex);

  const handleCopy = () => {
    const latex = getDynamicLatex();
    if (latex) {
      navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!state.geometry) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
        <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40">
          <Box className="w-8 h-8 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground/80">Chưa có hình nào</p>
          <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
            Vẽ hoặc nhập đề ở khung chính để xem thuộc tính và xuất hình tại đây.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h2 className="font-semibold text-foreground">{state.geometry.name}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {/* Cảnh giải tích: chỉ hiện loại hình, bỏ "N đỉnh • N cạnh" (điểm mẫu đường sinh không phải đỉnh). */}
          {properties?.shapeType || 'Geometry'}
          {!isAnalysisFigure(state.geometry) && ` • ${state.geometry.points.length} đỉnh • ${state.geometry.lines.length} cạnh`}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-3">
          <TabsTrigger value="export" className="gap-1.5 text-xs px-1">
            <Download className="w-3 h-3" />
            Xuất
          </TabsTrigger>
          <TabsTrigger value="problem" className="gap-1.5 text-xs px-1">
            <Sparkles className="w-3 h-3" />
            Giải bài
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-1.5 text-xs px-1">
            <Box className="w-3 h-3" />
            Thuộc tính
          </TabsTrigger>
        </TabsList>

        <TabsContent value="problem" className="flex-1 p-0 m-0 min-h-0 data-[state=active]:flex flex-col">
          {/* Chưa gắn trừ credit cho /api/solve (chờ engine) -> không hiện creditNote sai. */}
          <SolverContent />
        </TabsContent>

        <TabsContent value="properties" className="flex-1 overflow-hidden p-0 min-h-0 data-[state=active]:flex flex-col">
          <GeometryPropertiesTab />
        </TabsContent>

        <TabsContent value="export" className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full w-full">
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Bản xem trước</h3>
                  <Button
                    type="button"
                    variant={camera?.isLivePreviewEnabled ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-[10px] font-semibold"
                    onClick={() => camera?.setLivePreviewEnabled(!(camera?.isLivePreviewEnabled ?? false))}
                    aria-pressed={camera?.isLivePreviewEnabled ?? false}
                  >
                    Live
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Scale {tikzScale.toFixed(1)}</span>
                  <input
                    type="range" min="0.5" max="3.0" step="0.1"
                    value={tikzScale}
                    onChange={e => setTikzScale(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

          {/* Visual Preview */}
          <div className="aspect-square w-full bg-white rounded-lg border border-border/50 flex items-center justify-center p-4 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:10px_10px]" />
            {scaledGeometry && fixedCamera && camera && (
              <svg
                viewBox="-120 -120 240 240"
                className="w-full h-full drop-shadow-sm"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <radialGradient id="sphere-grad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6"/>
                    <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.45"/>
                  </radialGradient>
                </defs>
                {(() => {
                  if (activeTab !== 'export') return null;
                  // Center the projected drawing inside the fixed SVG view box. The old preview
                  // always treated the world origin as the centre, so drawings located away from
                  // O(0, 0, 0) were pushed against an edge and could be clipped.
                  const projectedPoints = scaledGeometry.points.map(p => ({
                    ...p,
                    proj: project3DTo2D(p, fixedCamera.cameraPos, fixedCamera.target)
                  }));
                  const previewPoints = projectedPoints.length > 0
                    ? projectedPoints.map(p => p.proj)
                    : [{ x: 0, y: 0 }];
                  const minX = Math.min(...previewPoints.map(p => p.x));
                  const maxX = Math.max(...previewPoints.map(p => p.x));
                  const minY = Math.min(...previewPoints.map(p => -p.y));
                  const maxY = Math.max(...previewPoints.map(p => -p.y));
                  const projectedSize = Math.max(maxX - minX, maxY - minY, 1);

                  // Preserve the familiar canvas scale where it fits, while reserving a small
                  // margin for point labels on large drawings.
                  const canvasScale = 30.4 * (fixedCamera.zoom || 1);
                  const fitScale = Math.min(canvasScale, 204 / projectedSize);
                  const scale = fitScale * (tikzScale / 1.2);
                  const offsetX = -((minX + maxX) / 2) * scale;
                  const offsetY = -((minY + maxY) / 2) * scale;

                  // Removed grid (mặt phẳng z=0) to improve performance and clean up the view

                  // 1. Vẽ các mặt cầu
                  const spheresSvg = (scaledGeometry.spheres || []).map(s => {
                    const centerProj = project3DTo2D(s.center, fixedCamera.cameraPos, fixedCamera.target);
                    const cx = centerProj.x * scale;
                    const cy = -centerProj.y * scale;
                    const r = s.radius * scale;
                    return (
                      <g key={s.id}>
                        {/* Shaded ball */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          fill="url(#sphere-grad)"
                        />
                        {/* Outer border */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke="#2563eb"
                          strokeWidth={1.2}
                          fill="none"
                        />
                        {/* Equator ellipse */}
                        <ellipse
                          cx={cx}
                          cy={cy}
                          rx={r}
                          ry={r * 0.25}
                          stroke="#3b82f6"
                          strokeWidth={0.8}
                          strokeDasharray="3,3"
                          fill="none"
                        />
                        {/* Meridian ellipse */}
                        <ellipse
                          cx={cx}
                          cy={cy}
                          rx={r * 0.25}
                          ry={r}
                          stroke="#3b82f6"
                          strokeWidth={0.8}
                          strokeDasharray="3,3"
                          fill="none"
                        />
                      </g>
                    );
                  });

                  // 2.5. Vẽ các hình nón (Cones)
                  const conesSvg = (scaledGeometry.cones || []).map(c => {
                    const apexProj = project3DTo2D(c.apex, fixedCamera.cameraPos, fixedCamera.target);
                    const ax = apexProj.x * scale;
                    const ay = -apexProj.y * scale;

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
                    const dParts: string[] = [];
                    const ringPoints2D: {x: number, y: number}[] = [];
                    
                    for (let j = 0; j < segments; j++) {
                        const angle = (j / segments) * Math.PI * 2;
                        const p3d = {
                            id: '', label: '',
                            x: c.baseCenter.x + c.radius * Math.cos(angle) * u.x + c.radius * Math.sin(angle) * v.x,
                            y: c.baseCenter.y + c.radius * Math.cos(angle) * u.y + c.radius * Math.sin(angle) * v.y,
                            z: c.baseCenter.z + c.radius * Math.cos(angle) * u.z + c.radius * Math.sin(angle) * v.z
                        };
                        const p2d = project3DTo2D(p3d, fixedCamera.cameraPos, fixedCamera.target);
                        ringPoints2D.push(p2d);
                        dParts.push(`${j === 0 ? 'M' : 'L'} ${p2d.x * scale} ${-p2d.y * scale}`);
                    }
                    dParts.push('Z');

                    let minXIdx = 0, maxXIdx = 0;
                    for (let j = 1; j < segments; j++) {
                        if (ringPoints2D[j].x < ringPoints2D[minXIdx].x) minXIdx = j;
                        if (ringPoints2D[j].x > ringPoints2D[maxXIdx].x) maxXIdx = j;
                    }

                    return (
                      <g key={c.id}>
                        {/* Base ring */}
                        <path
                          d={dParts.join(' ')}
                          stroke="#9ca3af"
                          strokeWidth={1.5}
                          fill="none"
                        />
                        {/* Lines from apex to extremeties */}
                        <line x1={ax} y1={ay} x2={ringPoints2D[minXIdx].x * scale} y2={-ringPoints2D[minXIdx].y * scale} stroke="#6b7280" strokeWidth={1.5} />
                        <line x1={ax} y1={ay} x2={ringPoints2D[maxXIdx].x * scale} y2={-ringPoints2D[maxXIdx].y * scale} stroke="#6b7280" strokeWidth={1.5} />
                      </g>
                    );
                  });

                  // 2.6. Vẽ các hình trụ (Cylinders)
                  const cylindersSvg = (scaledGeometry.cylinders || []).map(c => {
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
                    const dParts1: string[] = [];
                    const dParts2: string[] = [];
                    const ringPoints1: {x: number, y: number}[] = [];
                    const ringPoints2: {x: number, y: number}[] = [];
                    
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
                        const p1_2d = project3DTo2D(p1_3d, fixedCamera.cameraPos, fixedCamera.target);
                        ringPoints1.push(p1_2d);
                        dParts1.push(`${j === 0 ? 'M' : 'L'} ${p1_2d.x * scale} ${-p1_2d.y * scale}`);
                        
                        const p2_3d = {
                            id: '', label: '',
                            x: c.center2.x + rcos * u.x + rsin * v.x,
                            y: c.center2.y + rcos * u.y + rsin * v.y,
                            z: c.center2.z + rcos * u.z + rsin * v.z
                        };
                        const p2_2d = project3DTo2D(p2_3d, fixedCamera.cameraPos, fixedCamera.target);
                        ringPoints2.push(p2_2d);
                        dParts2.push(`${j === 0 ? 'M' : 'L'} ${p2_2d.x * scale} ${-p2_2d.y * scale}`);
                    }
                    dParts1.push('Z');
                    dParts2.push('Z');

                    let minXIdx = 0, maxXIdx = 0;
                    for (let j = 1; j < segments; j++) {
                        if (ringPoints1[j].x < ringPoints1[minXIdx].x) minXIdx = j;
                        if (ringPoints1[j].x > ringPoints1[maxXIdx].x) maxXIdx = j;
                    }

                    return (
                      <g key={c.id}>
                        <path d={dParts1.join(' ')} stroke="#9ca3af" strokeWidth={1.5} fill="none" />
                        <path d={dParts2.join(' ')} stroke="#9ca3af" strokeWidth={1.5} fill="none" />
                        <line x1={ringPoints1[minXIdx].x * scale} y1={-ringPoints1[minXIdx].y * scale} x2={ringPoints2[minXIdx].x * scale} y2={-ringPoints2[minXIdx].y * scale} stroke="#6b7280" strokeWidth={1.5} />
                        <line x1={ringPoints1[maxXIdx].x * scale} y1={-ringPoints1[maxXIdx].y * scale} x2={ringPoints2[maxXIdx].x * scale} y2={-ringPoints2[maxXIdx].y * scale} stroke="#6b7280" strokeWidth={1.5} />
                      </g>
                    );
                  });

                  // 2. Vẽ các đường tròn
                  const circlesSvg = (scaledGeometry.circles || []).map(c => {
                    const n = c.normal;
                    let temp = { x: 1, y: 0, z: 0 };
                    if (Math.abs(n.x) > 0.9) {
                      temp = { x: 0, y: 1, z: 0 };
                    }
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
                    const dParts: string[] = [];
                    for (let j = 0; j < segments; j++) {
                      const angle = (j / segments) * Math.PI * 2;
                      const p3d = {
                        id: '', label: '',
                        x: c.center.x + c.radius * Math.cos(angle) * u.x + c.radius * Math.sin(angle) * v.x,
                        y: c.center.y + c.radius * Math.cos(angle) * u.y + c.radius * Math.sin(angle) * v.y,
                        z: c.center.z + c.radius * Math.cos(angle) * u.z + c.radius * Math.sin(angle) * v.z
                      };
                      const p2d = project3DTo2D(p3d, fixedCamera.cameraPos, fixedCamera.target);
                      dParts.push(`${j === 0 ? 'M' : 'L'} ${p2d.x * scale} ${-p2d.y * scale}`);
                    }
                    dParts.push('Z');
                    return (
                      <path
                        key={c.id}
                        d={dParts.join(' ')}
                        stroke="red"
                        strokeWidth={1.2}
                        strokeOpacity={0.7}
                        fill="none"
                      />
                    );
                  });

                    // 2.8 Vẽ các đường cong (Curves)
                    const curvesSvg = (scaledGeometry.curves || []).map(curve => {
                      const pts = [];
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
                      
                      if (pts.length === 0) return null;
                      
                      const projectedPts = pts.map(p => project3DTo2D(p, fixedCamera.cameraPos, fixedCamera.target));
                      const pathData = projectedPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${-p.y * scale}`).join(' ');
                      return (
                        <path 
                          key={curve.id} 
                          d={pathData} 
                          fill="none" 
                          stroke={curve.color || "#3b82f6"} 
                          strokeWidth={curve.style === 'dashed' ? 1.5 : 2} 
                          strokeDasharray={curve.style === 'dashed' ? "4,4" : ""} 
                        />
                      );
                    });

                  // 3. Vẽ các đoạn thẳng
                  const linesSvg = scaledGeometry.lines.map(line => {
                    const from = scaledGeometry.points.find(p => p.id === line.from);
                    const to = scaledGeometry.points.find(p => p.id === line.to);
                    if (!from || !to) return null;

                    const p1 = project3DTo2D(from, fixedCamera.cameraPos, fixedCamera.target);
                    const p2 = project3DTo2D(to, fixedCamera.cameraPos, fixedCamera.target);

                    const isHidden = isLineDashed(line, camera.hiddenLines);
                    return (
                      <line
                        key={line.id}
                        x1={p1.x * scale}
                        y1={-p1.y * scale}
                        x2={p2.x * scale}
                        y2={-p2.y * scale}
                        stroke="black"
                        strokeWidth={isHidden ? 1 : 1.5}
                        strokeDasharray={isHidden ? "3,2" : "0"}
                        strokeLinecap="round"
                      />
                    );
                  });

                  // 4. Vẽ các điểm và nhãn chữ
                  const avgX = projectedPoints.reduce((sum, p) => sum + p.proj.x, 0) / (projectedPoints.length || 1);
                  const avgY = projectedPoints.reduce((sum, p) => sum + p.proj.y, 0) / (projectedPoints.length || 1);

                  const pointsSvg = projectedPoints.map(p => {
                    const x = p.proj.x * scale;
                    const y = -p.proj.y * scale;

                    const dx = p.proj.x - avgX;
                    const dy = p.proj.y - avgY;

                    let offX = 0, offY = 0, anchor: "start" | "end" | "middle" = "middle";

                    if (Math.abs(dx) > Math.abs(dy)) {
                      offX = dx > 0 ? 5 : -5;
                      offY = 3;
                      anchor = dx > 0 ? "start" : "end";
                    } else {
                      offY = dy > 0 ? -8 : 12;
                      offX = 0;
                      anchor = "middle";
                    }

                    return (
                      <g key={p.id}>
                        <circle cx={x} cy={y} r={2} fill="black" />
                        {state.showPoints && p.label && (
                          <g style={{ pointerEvents: 'none' }}>
                            {/* Halo effect */}
                            <text
                              x={x + offX}
                              y={y + offY}
                              textAnchor={anchor}
                              className="text-[10px] font-serif italic stroke-white stroke-[4px] fill-transparent select-none opacity-90"
                              strokeLinejoin="round"
                            >
                              {p.label}
                            </text>
                            {/* Actual text */}
                            <text
                              x={x + offX}
                              y={y + offY}
                              textAnchor={anchor}
                              className="text-[10px] font-serif italic fill-black select-none"
                            >
                              {p.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  });

                  // 5. Vẽ các bề mặt (Surfaces)
                  const surfacesSvg = (scaledGeometry.surfaces || []).map(s => {
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
                        const p3d = { id: '', label: '', x: a * Math.cosh(v) * Math.cos(u) + cx, y: b * Math.cosh(v) * Math.sin(u) + cy, z: c * Math.sinh(v) + cz };
                        return project3DTo2D(p3d, fixedCamera.cameraPos, fixedCamera.target);
                      };

                      const elements = [];

                      // rings
                      const vs = [vMin, 0, vMax];
                      vs.forEach((v, idx) => {
                         let d = '';
                         for (let i = 0; i <= 32; i++) {
                            const u = (i / 32) * Math.PI * 2;
                            const p2d = getP(u, v);
                            const x = p2d.x * scale;
                            const y = -p2d.y * scale;
                            if (i === 0) d += `M ${x} ${y} `;
                            else d += `L ${x} ${y} `;
                         }
                         elements.push(<path key={`r${idx}`} d={d} stroke="#c084fc" fill="none" strokeWidth="1.5" />);
                      });

                      // meridians
                      for (let i = 0; i < 8; i++) {
                         const u = (i / 8) * Math.PI * 2;
                         let d = '';
                         for (let j = 0; j <= 10; j++) {
                            const v = vMin + (j / 10) * (vMax - vMin);
                            const p2d = getP(u, v);
                            const x = p2d.x * scale;
                            const y = -p2d.y * scale;
                            if (j === 0) d += `M ${x} ${y} `;
                            else d += `L ${x} ${y} `;
                         }
                         elements.push(<path key={`m${i}`} d={d} stroke="#d8b4fe" fill="none" strokeWidth="1" strokeDasharray="3,3" />);
                      }
                      
                      return <g key={s.id}>{elements}</g>;
                    }
                    return null;
                  });

                  // 5b. Vẽ KHỐI TRÒN XOAY (revolutionSolids). Trước đây preview BỎ QUA hẳn field này ⇒ bài
                  // "thể tích khối tròn xoay" hiện trên canvas 3D nhưng preview/LaTeX trống. Nay dùng CHUNG
                  // helper với trình xuất TikZ nên hình preview KHỚP mã LaTeX xuất ra.
                  const revolutionSolidsSvg = (scaledGeometry.revolutionSolids || []).map(solid => {
                    if (!solid || solid.hidden) return null;
                    let fig = null;
                    try {
                      fig = buildRevolutionSolidFigure(solid, fixedCamera.cameraPos, fixedCamera.target, project3DTo2D);
                    } catch { fig = null; }
                    if (!fig) return null;
                    const S = (p: { x: number; y: number }) => `${(p.x * scale).toFixed(2)} ${(-p.y * scale).toFixed(2)}`;
                    const pathOf = (pts: { x: number; y: number }[], close = false) =>
                      pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${S(p)}`).join(' ') + (close ? ' Z' : '');
                    const [upper, lower] = fig.silhouettes;
                    return (
                      <g key={solid.id}>
                        {/* Thân khối tô nhạt */}
                        <path d={pathOf(fig.body, true)} fill="#a855f7" fillOpacity={0.16} stroke="none" />
                        {/* Trục quay nét đứt */}
                        <path d={pathOf([fig.axis[0], fig.axis[1]])} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4,3" fill="none" />
                        {/* Elip nắp hai đầu: nửa gần nét liền, nửa xa nét đứt */}
                        {fig.caps.map((arc, i) => (
                          <path key={`cap${i}`} d={pathOf(arc.pts)} fill="none"
                            stroke={arc.near ? '#7e22ce' : '#c084fc'} strokeWidth={arc.near ? 1.5 : 1}
                            strokeDasharray={arc.near ? undefined : '5,4'} />
                        ))}
                        {/* Hai đường sinh nét liền */}
                        {upper.length > 1 && <path d={pathOf(upper)} stroke="#7e22ce" strokeWidth={2} fill="none" />}
                        {lower.length > 1 && <path d={pathOf(lower)} stroke="#7e22ce" strokeWidth={2} fill="none" />}
                      </g>
                    );
                  });

                  // 6. Vẽ các tác nhân (Agents)
                  const agentsSvg = (scaledGeometry.agents || []).map(a => {
                    const p3d = { id: a.id, label: a.label, x: a.initialPosition[0], y: a.initialPosition[1], z: a.initialPosition[2] };
                    const p2d = project3DTo2D(p3d, fixedCamera.cameraPos, fixedCamera.target);
                    const cx = p2d.x * scale;
                    const cy = -p2d.y * scale;
                    const fill = a.id === 'rescuer' ? '#eab308' : '#ef4444';
                    return (
                      <g key={a.id}>
                        <circle cx={cx} cy={cy} r={4} fill={fill} />
                        {state.showPoints && (
                          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill={fill}>{a.label}</text>
                        )}
                      </g>
                    );
                  });

                  return (
                    <g transform={`translate(${offsetX} ${offsetY})`}>
                      {spheresSvg}
                      {surfacesSvg}
                      {revolutionSolidsSvg}
                      {conesSvg}
                      {cylindersSvg}
                      {circlesSvg}
                      {curvesSvg}
                      {linesSvg}
                      {pointsSvg}
                      {agentsSvg}
                    </g>
                  );
                })()}
              </svg>
            )}
            <div className="absolute bottom-2 right-2 bg-black/5 rounded px-1.5 py-0.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[8px] font-bold text-black/40 uppercase tracking-tighter">Đồng bộ góc nhìn chính</span>
            </div>
          </div>

            {/* Hành động xuất */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-green-600 dark:text-green-400 border-green-500/40 hover:bg-green-500/10 hover:text-green-700 dark:hover:text-green-300" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-xs">{copied ? 'Đã chép' : 'Copy TikZ'}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-blue-600 dark:text-blue-400 border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300" onClick={() => setIsCaptureOpen(true)}>
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="text-xs">Xuất ảnh</span>
              </Button>
            </div>

            {/* Chia sẻ bài — bottom sheet (copy/lưu ảnh/lưu tệp) */}
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-primary border-primary/40 hover:bg-primary/10" onClick={() => setIsShareOpen(true)}>
              <Share2 className="w-3.5 h-3.5" />
              <span className="text-xs">Chia sẻ bài</span>
            </Button>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">TikZ Source</span>
              <div className="bg-secondary/20 rounded-md border border-border/30">
                <pre className="p-3 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {activeTab === 'export' ? getDynamicLatex() : '% Chuyển sang tab Xuất để tạo mã'}
                </pre>
              </div>
            </div>
          </div>
          </ScrollArea>
        </TabsContent>

      </Tabs>

      {/* Modal xuất đầy đủ (PNG, kéo-thả nhãn) — mở từ nút "Xuất ảnh" ở tab Xuất */}
      {camera && (
        <CaptureModal
          isOpen={isCaptureOpen}
          onClose={() => setIsCaptureOpen(false)}
          geometry={state.geometry}
          hiddenLines={camera.hiddenLines}
        />
      )}
      <ShareSheet
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        geometry={state.geometry}
        onSaveImage={() => setIsCaptureOpen(true)}
      />
    </div>
  );
}

// Mobile Right Panel with Sheet
export function MobileRightPanel() {
  const context = useGeometryOptional();
  const [open, setOpen] = useState(false);

  if (!context) return null;

  const { state } = context;
  if (!state.geometry) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mở bảng thông tin"
          className="fixed top-4 right-4 z-50 lg:hidden glass border border-border/50"
        >
          <Box className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0 glass border-l border-border/50">
        <ErrorBoundary>
          <PanelContent />
        </ErrorBoundary>
      </SheetContent>
    </Sheet>
  );
}

export function RightPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const context = useGeometryOptional();
  const { onPointerDown, reset } = useResizableWidth({ cssVar: '--rp-w', storageKey: 'right_panel_w', def: 320, min: 280, max: 720 });

  if (!context) return null;

  const { state } = context;

  return (
    <div className="relative h-screen hidden lg:flex z-40 shrink-0">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ẩn/hiện bảng bên phải"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ right: isCollapsed ? 0 : 'var(--rp-w, 20rem)' }}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full glass border border-border/50 z-50 h-7 w-7 bg-background shadow-sm flex items-center justify-center",
          "transition-all duration-150 hover:scale-110 hover:bg-secondary hover:border-primary/60 hover:shadow-md hover:[&_svg]:text-primary",
          isCollapsed ? "-translate-x-1/2" : "translate-x-1/2"
        )}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </Button>

      <aside
        style={{ width: isCollapsed ? 0 : 'var(--rp-w, 20rem)' }}
        className={cn(
          "h-full flex flex-col glass border-l border-border/50 sticky right-0 top-0 bg-background/95 overflow-hidden",
          isCollapsed && "border-none"
        )}
      >
        {!isCollapsed && <ResizeHandle onPointerDown={onPointerDown} onReset={reset} />}
        <div style={{ width: 'var(--rp-w, 20rem)' }} className="h-full flex flex-col relative">
          <TierBanner classification={state.geometry?.classification} />
          <ErrorBoundary>
            <PanelContent />
          </ErrorBoundary>
        </div>
      </aside>
    </div>
  );
}
