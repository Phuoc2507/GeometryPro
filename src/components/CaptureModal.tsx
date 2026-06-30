import { useState } from 'react';
import { Camera, Image, Code, X, Download, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { GeometryData, Point3D } from '@/types/geometry';
import { convertToHighContrastBW } from '@/lib/capture/convertToHighContrastBW';
import { sanitizeLatexLabel, sanitizeLatexName } from '@/lib/sanitizeLatex';

import { project3DTo2D, generateProjectedLatex } from '@/lib/geometry/projection';
import { useGeometryOptional } from '@/context/GeometryContext';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  geometry: GeometryData | null;
  cameraState: {
    position: [number, number, number];
    target: [number, number, number];
  } | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hiddenLines?: Map<string, boolean>;
}

export function CaptureModal({ isOpen, onClose, geometry, cameraState, canvasRef, hiddenLines }: CaptureModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'latex'>('image');
  const geometryContext = useGeometryOptional();
  const showPoints = geometryContext?.state.showPoints ?? true;

  const getDynamicLatex = () => {
    if (!geometry || !cameraState) return '';
    
    // Luôn khóa mục tiêu vào gốc tọa độ O(0,0,0) để tọa độ trong TikZ luôn chuẩn xác
    const fixedTarget: [number, number, number] = [0, 0, 0];
    
    const viewDir = [
      cameraState.position[0] - cameraState.target[0],
      cameraState.position[1] - cameraState.target[1],
      cameraState.position[2] - cameraState.target[2]
    ];
    const fixedCameraPos: [number, number, number] = [
      fixedTarget[0] + viewDir[0],
      fixedTarget[1] + viewDir[1],
      fixedTarget[2] + viewDir[2]
    ];

    return generateProjectedLatex(geometry, fixedCameraPos, fixedTarget, hiddenLines, showPoints);
  };

  const captureImage = async (mode: 'color' | 'bw') => {
    if (!canvasRef.current) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy canvas",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      const canvas = canvasRef.current;

      // Create a new canvas for export
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;

      if (mode === 'bw') {
        // White background for B&W
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        // Draw the original canvas
        ctx.drawImage(canvas, 0, 0);

        // Convert to high contrast B&W (edge-aware so bright lines still show)
        const imageData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
        const bw = convertToHighContrastBW(imageData);
        ctx.putImageData(bw, 0, 0);
      } else {
        // Keep original colors
        ctx.drawImage(canvas, 0, 0);
      }

      // Download the image
      const link = document.createElement('a');
      link.download = `${geometry?.name || 'geometry'}_${mode}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Thành công!",
        description: `Đã xuất ảnh ${mode === 'bw' ? 'trắng đen' : 'màu'}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xuất ảnh",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const copyLatex = () => {
    const latex = getDynamicLatex();
    navigator.clipboard.writeText(latex);
    toast({
      title: "Đã sao chép!",
      description: "Code LaTeX đã được sao chép vào clipboard",
    });
  };

  const downloadLatex = () => {
    const latex = getDynamicLatex();
    const blob = new Blob([latex], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = `${geometry?.name || 'geometry'}.tex`;
    link.href = URL.createObjectURL(blob);
    link.click();

    toast({
      title: "Thành công!",
      description: "Đã tải xuống file LaTeX",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Xuất hình ảnh
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'image' | 'latex')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Ảnh
            </TabsTrigger>
            <TabsTrigger value="latex" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              LaTeX
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Xuất hình ảnh theo góc nhìn hiện tại
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 border-2 hover:border-primary"
                onClick={() => captureImage('bw')}
                disabled={isExporting}
              >
                <div className="w-12 h-12 bg-white border-2 border-black rounded flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-black transform rotate-45" />
                </div>
                <span className="text-sm font-medium">Trắng đen</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col gap-2 border-2 hover:border-primary"
                onClick={() => captureImage('color')}
                disabled={isExporting}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/50 rounded flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary transform rotate-45" />
                </div>
                <span className="text-sm font-medium">Theo giao diện</span>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="latex" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Bản vẽ TikZ theo góc nhìn hiện tại (nét khuất tự động xử lý)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLatex}
                  className="h-8 gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Sao chép
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadLatex}
                  className="h-8 gap-1"
                >
                  <Download className="w-3 h-3" />
                  Tải .tex
                </Button>
              </div>
            </div>

            {/* Visual TikZ Preview Card */}
            <div className="relative group">
              <div className="aspect-square sm:aspect-video bg-white rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center p-8 shadow-sm overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                {geometry && cameraState && (() => {
                  const fixedTarget: [number, number, number] = [0, 0, 0];
                  
                  const viewDir = [
                    cameraState.position[0] - cameraState.target[0],
                    cameraState.position[1] - cameraState.target[1],
                    cameraState.position[2] - cameraState.target[2]
                  ];
                  const fixedCameraPos: [number, number, number] = [
                    fixedTarget[0] + viewDir[0],
                    fixedTarget[1] + viewDir[1],
                    fixedTarget[2] + viewDir[2]
                  ];

                  return (
                  <svg
                    viewBox="-150 -150 300 300"
                    className="w-full h-full drop-shadow-md"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <marker id="dot" markerWidth="4" markerHeight="4" refX="2" refY="2">
                        <circle cx="2" cy="2" r="1.5" fill="black" />
                      </marker>
                    </defs>

                    {/* Render Grid */}
                    {(() => {
                      const gridSvg = [];
                      const gridSize = 15;
                      const scale = 35;
                      for (let i = -gridSize; i <= gridSize; i++) {
                          const p1_y = project3DTo2D({id:'', label:'', x: i, y: -gridSize, z: 0}, fixedCameraPos, fixedTarget);
                          const p2_y = project3DTo2D({id:'', label:'', x: i, y: gridSize, z: 0}, fixedCameraPos, fixedTarget);
                          gridSvg.push(
                            <line key={`v${i}`} x1={p1_y.x * scale} y1={-p1_y.y * scale} x2={p2_y.x * scale} y2={-p2_y.y * scale} stroke={i === 0 ? "#9ca3af" : "#e5e7eb"} strokeWidth={i === 0 ? 1.5 : 1} strokeDasharray={i === 0 ? "" : "4,4"} />
                          );
                          const p1_x = project3DTo2D({id:'', label:'', x: -gridSize, y: i, z: 0}, fixedCameraPos, fixedTarget);
                          const p2_x = project3DTo2D({id:'', label:'', x: gridSize, y: i, z: 0}, fixedCameraPos, fixedTarget);
                          gridSvg.push(
                            <line key={`h${i}`} x1={p1_x.x * scale} y1={-p1_x.y * scale} x2={p2_x.x * scale} y2={-p2_x.y * scale} stroke={i === 0 ? "#9ca3af" : "#e5e7eb"} strokeWidth={i === 0 ? 1.5 : 1} strokeDasharray={i === 0 ? "" : "4,4"} />
                          );
                      }
                      return gridSvg;
                    })()}

                    {/* Render Curves */}
                    {geometry.curves && geometry.curves.map(curve => {
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
                      
                      const projectedPts = pts.map(p => project3DTo2D(p, fixedCameraPos, fixedTarget));
                      const pathData = projectedPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 35} ${-p.y * 35}`).join(' ');
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
                    })}

                    {/* Render Lines */}
                    {geometry.lines.map(line => {
                      const from = geometry.points.find(p => p.id === line.from);
                      const to = geometry.points.find(p => p.id === line.to);
                      if (!from || !to) return null;

                      const p1 = project3DTo2D(from, fixedCameraPos, fixedTarget);
                      const p2 = project3DTo2D(to, fixedCameraPos, fixedTarget);

                      const isHidden = hiddenLines?.get(line.id) ?? line.style === 'dashed';

                      // Scale projected coords for SVG viewing (projected values are around -5 to 5)
                      const scale = 35;
                      return (
                        <line
                          key={line.id}
                          x1={p1.x * scale}
                          y1={-p1.y * scale}
                          x2={p2.x * scale}
                          y2={-p2.y * scale}
                          stroke="black"
                          strokeWidth={isHidden ? 1 : 2}
                          strokeDasharray={isHidden ? "4,3" : "0"}
                          strokeLinecap="round"
                        />
                      );
                    })}

                    {/* Render Points & Labels */}
                    {(() => {
                      const projectedPoints = geometry.points.map(p => ({
                        ...p,
                        proj: project3DTo2D(p, fixedCameraPos, fixedTarget)
                      }));

                      const avgX = projectedPoints.reduce((sum, p) => sum + p.proj.x, 0) / projectedPoints.length;
                      const avgY = projectedPoints.reduce((sum, p) => sum + p.proj.y, 0) / projectedPoints.length;
                      const scale = 35;

                      return projectedPoints.map(p => {
                        const x = p.proj.x * scale;
                        const y = -p.proj.y * scale;

                        const dx = p.proj.x - avgX;
                        const dy = p.proj.y - avgY;

                        let offX = 0, offY = 0, anchor: "start" | "end" | "middle" = "middle";

                        if (Math.abs(dx) > Math.abs(dy)) {
                          offX = dx > 0 ? 8 : -8;
                          offY = 4;
                          anchor = dx > 0 ? "start" : "end";
                        } else {
                          offY = dy > 0 ? -12 : 15;
                          offX = 0;
                          anchor = "middle";
                        }

                        return (
                          <g key={p.id}>
                            <circle cx={x} cy={y} r={3} fill="black" />
                            {showPoints && p.label && (
                              <g style={{ pointerEvents: 'none' }}>
                                {/* Halo effect */}
                                <text
                                  x={x + offX}
                                  y={y + offY}
                                  textAnchor={anchor}
                                  className="text-[14px] font-serif italic stroke-white stroke-[4px] fill-transparent select-none opacity-90"
                                  strokeLinejoin="round"
                                >
                                  {p.label}
                                </text>
                                {/* Actual text */}
                                <text
                                  x={x + offX}
                                  y={y + offY}
                                  textAnchor={anchor}
                                  className="text-[14px] font-serif italic fill-black select-none"
                                >
                                  {p.label}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      });
                    })()}

                    {/* Render Cones in Preview */}
                    {geometry.cones && geometry.cones.map(c => {
                       const scale = 35;
                       const apexProj = project3DTo2D(c.apex, fixedCameraPos, fixedTarget);
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
                       let d = '';
                       const ringPoints2D = [];
                       for (let j = 0; j <= segments; j++) {
                           const angle = (j / segments) * Math.PI * 2;
                           const p3d = {
                               id: '', label: '',
                               x: c.baseCenter.x + c.radius * Math.cos(angle) * u.x + c.radius * Math.sin(angle) * v.x,
                               y: c.baseCenter.y + c.radius * Math.cos(angle) * u.y + c.radius * Math.sin(angle) * v.y,
                               z: c.baseCenter.z + c.radius * Math.cos(angle) * u.z + c.radius * Math.sin(angle) * v.z
                           };
                           const p2d = project3DTo2D(p3d, fixedCameraPos, fixedTarget);
                           ringPoints2D.push(p2d);
                           const x = p2d.x * scale;
                           const y = -p2d.y * scale;
                           if (j === 0) d += `M ${x} ${y} `;
                           else d += `L ${x} ${y} `;
                       }

                       let minXIdx = 0, maxXIdx = 0;
                       for (let j = 1; j < segments; j++) {
                           if (ringPoints2D[j].x < ringPoints2D[minXIdx].x) minXIdx = j;
                           if (ringPoints2D[j].x > ringPoints2D[maxXIdx].x) maxXIdx = j;
                       }

                       return (
                         <g key={c.apex.x + "_" + c.baseCenter.x}>
                           <path d={d} stroke="gray" fill="rgba(150,150,150,0.1)" strokeWidth="1.5" />
                           <line x1={ax} y1={ay} x2={ringPoints2D[minXIdx].x * scale} y2={-ringPoints2D[minXIdx].y * scale} stroke="gray" strokeWidth="1.5" />
                           <line x1={ax} y1={ay} x2={ringPoints2D[maxXIdx].x * scale} y2={-ringPoints2D[maxXIdx].y * scale} stroke="gray" strokeWidth="1.5" />
                         </g>
                       );
                    })}

                    {/* Render Surfaces in Preview */}
                    {geometry.surfaces && geometry.surfaces.map(s => {
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
                          return project3DTo2D(p3d, fixedCameraPos, fixedTarget);
                        };

                        const elements = [];
                        const scale = 35;

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
                    })}

                    {/* Render Agents in Preview */}
                    {geometry.agents && geometry.agents.map(a => {
                      const p3d = { id: a.id, label: a.label, x: a.initialPosition[0], y: a.initialPosition[1], z: a.initialPosition[2] };
                      const p2d = project3DTo2D(p3d, fixedCameraPos, fixedTarget);
                      const scale = 35;
                      const cx = p2d.x * scale;
                      const cy = -p2d.y * scale;
                      const fill = a.id === 'rescuer' ? '#eab308' : '#ef4444';
                      return (
                        <g key={a.id}>
                          <circle cx={cx} cy={cy} r={4} fill={fill} />
                          {showPoints && (
                            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill={fill}>{a.label}</text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  );
                })()}

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full font-medium uppercase tracking-wider">
                    Live Preview
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">TikZ Source Code</label>
              <div className="bg-secondary/20 rounded-md border border-border/30">
                <pre className="p-3 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {getDynamicLatex()}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
