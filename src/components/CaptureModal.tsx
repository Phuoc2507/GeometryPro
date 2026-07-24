import { useState, useMemo } from 'react';
import { Camera, Image as ImageIcon, Code, Download, Copy, Settings2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { GeometryData } from '@/types/geometry';
import { sanitizeLatexLabel, sanitizeLatexName } from '@/lib/sanitizeLatex';

import { project3DTo2D, generateProjectedLatex } from '@/lib/geometry/projection';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useCameraStateOptional } from '@/context/CameraContext';
import { scaleGeometry } from '@/lib/geometry/scaleGeometry';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  geometry: GeometryData | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hiddenLines?: Map<string, boolean>;
}

export function CaptureModal({ isOpen, onClose, geometry, canvasRef, hiddenLines }: CaptureModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportScale, setExportScale] = useState(1.2);
  const [transparentBg, setTransparentBg] = useState(false);
  const [isCustomLabelMode, setIsCustomLabelMode] = useState(false);
  const [labelOffsets, setLabelOffsets] = useState<Record<string, {offsetX: number, offsetY: number}>>({});
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const [labelDragLastPos, setLabelDragLastPos] = useState<{x: number, y: number} | null>(null);

  const geometryContext = useGeometryOptional();
  const cameraStateContext = useCameraStateOptional();
  const showPoints = geometryContext?.state.showPoints ?? true;

  const cameraState = cameraStateContext?.cameraState;

  const fixedCamera = useMemo(() => {
    if (!cameraState) return { cameraPos: [0, 0, 0] as [number, number, number], target: [0, 0, 0] as [number, number, number], zoom: 1 };
    
    const viewDir = [
      cameraState.position[0] - cameraState.target[0],
      cameraState.position[1] - cameraState.target[1],
      cameraState.position[2] - cameraState.target[2]
    ];
    
    return {
      cameraPos: [
        viewDir[0],
        viewDir[1],
        viewDir[2]
      ] as [number, number, number],
      target: [0, 0, 0] as [number, number, 0],
      zoom: cameraState.zoom || 1
    };
  }, [cameraState]);

  const scaledGeometry = useMemo(() => {
    if (!geometry) return null;
    return scaleGeometry(geometry);
  }, [geometry]);

  const getDynamicLatex = () => {
    if (!scaledGeometry || !cameraState) return '';
    return generateProjectedLatex(scaledGeometry, fixedCamera.cameraPos, fixedCamera.target, hiddenLines, showPoints, exportScale);
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
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');

      const scaleFactor = exportScale / 1.2;

      if (mode === 'bw') {
        const svgEl = document.getElementById('math-svg-export');
        if (!svgEl) {
          throw new Error('Cannot find SVG element for export');
        }

        let svgString = new XMLSerializer().serializeToString(svgEl);
        if (!svgString.includes('background-color')) {
           svgString = svgString.replace('<svg ', `<svg style="background-color: ${transparentBg ? 'transparent' : 'white'};" `);
        } else {
           svgString = svgString.replace(/background-color:\s*[^;]+;?/, `background-color: ${transparentBg ? 'transparent' : 'white'};`);
        }
        
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL;
        const blobURL = URL.createObjectURL(svgBlob);
        
        const img = new window.Image();
        img.onload = () => {
          const targetSize = 1024 * scaleFactor;
          exportCanvas.width = targetSize;
          exportCanvas.height = targetSize;

          if (!transparentBg) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
          }
          
          ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);
          URL.revokeObjectURL(blobURL);
          
          const link = document.createElement('a');
          link.download = `${geometry?.name || 'geometry'}_bw.png`;
          link.href = exportCanvas.toDataURL('image/png');
          link.click();
          
          setIsExporting(false);
          toast({ title: "Thành công!", description: "Đã xuất ảnh trắng đen" });
        };
        img.onerror = () => {
           URL.revokeObjectURL(blobURL);
           setIsExporting(false);
           toast({ title: "Lỗi", description: "Không thể render ảnh SVG", variant: "destructive" });
        };
        img.src = blobURL;
        return; 
      } else {
        exportCanvas.width = canvas.width * scaleFactor;
        exportCanvas.height = canvas.height * scaleFactor;

        if (!transparentBg) {
          ctx.fillStyle = '#09090b'; 
          ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }

        ctx.save();
        ctx.scale(scaleFactor, scaleFactor);
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
      }

      if (showPoints && mode === 'color') {
        const labels = document.querySelectorAll('.math-label');
        const canvasRect = canvas.getBoundingClientRect();
        
        const scaleX = exportCanvas.width / canvasRect.width;
        const scaleY = exportCanvas.height / canvasRect.height;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        labels.forEach((labelEl) => {
          const text = labelEl.textContent || '';
          if (!text.trim()) return;
          
          const rect = labelEl.getBoundingClientRect();
          const x = rect.left - canvasRect.left + rect.width / 2;
          const y = rect.top - canvasRect.top + rect.height / 2;
          
          const scaledX = x * scaleX;
          const scaledY = y * scaleY;
          
          const fontSize = 18 * scaleX;
          ctx.font = `italic ${fontSize}px serif`;
          
          ctx.fillStyle = transparentBg ? '#000000' : '#ffffff';
          if (!transparentBg) {
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4 * scaleX;
          }
          ctx.fillText(text, scaledX, scaledY);
          if (!transparentBg) {
            ctx.shadowBlur = 2 * scaleX;
            ctx.fillText(text, scaledX, scaledY);
          }
        });
      }

      const link = document.createElement('a');
      link.download = `${geometry?.name || 'geometry'}_${mode}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Thành công!",
        description: `Đã xuất ảnh màu ${transparentBg ? '(Xóa nền)' : ''}`,
      });
      setIsExporting(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể xuất ảnh",
        variant: "destructive"
      });
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

  // --- INTERACTIVE ROTATION (SAFE MATH DRIVEN) ---
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);

  const interactiveHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!isDragging || !lastMousePos || !cameraState || !cameraStateContext) return;
      
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setLastMousePos({ x: e.clientX, y: e.clientY });

      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;

      const { position, target, zoom } = cameraState;
      
      // Calculate spherical coordinates relative to target (Y is up in ThreeJS)
      const vx = position[0] - target[0];
      const vy = position[1] - target[1];
      const vz = position[2] - target[2];

      const r = Math.sqrt(vx*vx + vy*vy + vz*vz) || 1;
      let theta = Math.atan2(vx, vz); // Azimuthal angle
      let phi = Math.acos(Math.max(-1, Math.min(1, vy / r))); // Polar angle

      // Adjust sensitivity
      theta -= dx * 0.01;
      phi -= dy * 0.01;
      
      // Clamp polar angle (phi) to avoid flipping over the poles
      phi = Math.max(0.001, Math.min(Math.PI - 0.001, phi));

      // Convert back to cartesian coordinates
      const newVx = r * Math.sin(phi) * Math.sin(theta);
      const newVy = r * Math.cos(phi);
      const newVz = r * Math.sin(phi) * Math.cos(theta);

      cameraStateContext.setCameraState({
        position: [target[0] + newVx, target[1] + newVy, target[2] + newVz],
        target,
        zoom
      });
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      setLastMousePos(null);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      setIsDragging(false);
      setLastMousePos(null);
    },
    onWheel: (e: React.WheelEvent) => {
      const step = e.deltaY > 0 ? -0.1 : 0.1;
      setExportScale(prev => {
        const newVal = prev + step;
        return Math.max(0.5, Math.min(3.0, Number(newVal.toFixed(1))));
      });
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
    }
  };

  const svgContent = useMemo(() => {
    if (!scaledGeometry || !cameraState) return null;
    const projectedPoints = scaledGeometry.points.map((point) => ({
      point,
      projection: project3DTo2D(point, fixedCamera.cameraPos, fixedCamera.target),
    }));
    const previewPoints = [
      ...projectedPoints.map(({ projection }) => ({ x: projection.x, y: -projection.y })),
      ...(scaledGeometry.spheres || []).flatMap((sphere) => {
        const center = project3DTo2D(sphere.center, fixedCamera.cameraPos, fixedCamera.target);
        const x = center.x;
        const y = -center.y;
        return [
          { x: x - sphere.radius, y: y - sphere.radius },
          { x: x + sphere.radius, y: y + sphere.radius },
        ];
      }),
    ];
    if (previewPoints.length === 0) previewPoints.push({ x: 0, y: 0 });
    const minX = Math.min(...previewPoints.map((point) => point.x));
    const maxX = Math.max(...previewPoints.map((point) => point.x));
    const minY = Math.min(...previewPoints.map((point) => point.y));
    const maxY = Math.max(...previewPoints.map((point) => point.y));
    const projectedSize = Math.max(maxX - minX, maxY - minY, 1);

    // Center from the projected geometry bounds rather than the world origin.
    // The scale slider still controls zoom through the SVG viewBox below.
    const canvasScale = 30.4 * fixedCamera.zoom;
    const scale = Math.min(canvasScale, 252 / projectedSize);
    const offsetX = -((minX + maxX) / 2) * scale;
    const offsetY = -((minY + maxY) / 2) * scale;
    const scaleFactor = exportScale / 1.2;
    return (
      <>
        <defs>
          <marker id="dot" markerWidth="4" markerHeight="4" refX="2" refY="2">
            <circle cx="2" cy="2" r="1.5" fill="black" />
          </marker>
          <radialGradient id="sphere-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.45" />
          </radialGradient>
        </defs>
        <g transform={`translate(${offsetX} ${offsetY})`}>
        {/* Mặt cầu — vẽ giống LIVE VIEW của panel (quả cầu bóng + xích đạo/kinh tuyến nét đứt) */}
        {(scaledGeometry.spheres || []).map(s => {
          const centerProj = project3DTo2D(s.center, fixedCamera.cameraPos, fixedCamera.target);
          const cx = centerProj.x * scale;
          const cy = -centerProj.y * scale;
          const r = s.radius * scale;
          return (
            <g key={s.id}>
              <circle cx={cx} cy={cy} r={r} fill="url(#sphere-grad)" />
              <circle cx={cx} cy={cy} r={r} stroke="#2563eb" strokeWidth={1.2} fill="none" />
              <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.25} stroke="#3b82f6" strokeWidth={0.8} strokeDasharray="3,3" fill="none" />
              <ellipse cx={cx} cy={cy} rx={r * 0.25} ry={r} stroke="#3b82f6" strokeWidth={0.8} strokeDasharray="3,3" fill="none" />
            </g>
          );
        })}
        {scaledGeometry.lines.map(line => {
          const from = scaledGeometry.points.find(p => p.id === line.from);
          const to = scaledGeometry.points.find(p => p.id === line.to);
          if (!from || !to) return null;
          const p1 = project3DTo2D(from, fixedCamera.cameraPos, fixedCamera.target);
          const p2 = project3DTo2D(to, fixedCamera.cameraPos, fixedCamera.target);
          const isHidden = hiddenLines?.get(line.id) ?? line.style === 'dashed';
          return (
            <line key={line.id} x1={p1.x * scale} y1={-p1.y * scale} x2={p2.x * scale} y2={-p2.y * scale} stroke="black" strokeWidth={isHidden ? 1.5 : 2} strokeDasharray={isHidden ? "6,4" : "0"} strokeLinecap="round" />
          );
        })}
        {projectedPoints.map(({ point: p, projection: proj }) => {
            
            let offsetX = 8;
            let offsetY = -12; // Default offset (top-right)
            
            if (isCustomLabelMode && labelOffsets[p.id]) {
                offsetX = labelOffsets[p.id].offsetX;
                offsetY = labelOffsets[p.id].offsetY;
            }
            
            // Apply SVG coordinates (SVG y goes down, Math y goes up)
            // So subtract offsetY to move it UP visually
            const labelX = proj.x * scale + offsetX;
            const labelY = -proj.y * scale + offsetY;
            
            return (
              <g key={p.id}>
                {showPoints && <circle cx={proj.x * scale} cy={-proj.y * scale} r={2.5} fill="black" />}
                {showPoints && p.label && (
                  <text 
                    x={labelX} 
                    y={labelY} 
                    textAnchor="middle" 
                    alignmentBaseline="middle"
                    style={{ 
                      fontSize: '16px', 
                      fontFamily: 'serif', 
                      fontStyle: 'italic', 
                      fill: 'black',
                      cursor: isCustomLabelMode ? (draggingLabelId === p.id ? 'grabbing' : 'grab') : 'default',
                      pointerEvents: isCustomLabelMode ? 'auto' : 'none'
                    }}
                    onPointerDown={(e) => {
                      if (!isCustomLabelMode) return;
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDraggingLabelId(p.id);
                      setLabelDragLastPos({ x: e.clientX, y: e.clientY });
                    }}
                    onPointerMove={(e) => {
                      if (draggingLabelId === p.id && labelDragLastPos) {
                        e.stopPropagation();
                        const dx = e.clientX - labelDragLastPos.x;
                        const dy = e.clientY - labelDragLastPos.y;
                        
                        setLabelOffsets(prev => {
                          const currentOffset = prev[p.id] || { offsetX: 8, offsetY: -12 };
                          return {
                            ...prev,
                            [p.id]: {
                              offsetX: currentOffset.offsetX + (dx * 0.8) / scaleFactor,
                              offsetY: currentOffset.offsetY + (dy * 0.8) / scaleFactor
                            }
                          };
                        });
                        setLabelDragLastPos({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onPointerUp={(e) => {
                      if (draggingLabelId === p.id) {
                        e.stopPropagation();
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        setDraggingLabelId(null);
                        setLabelDragLastPos(null);
                      }
                    }}
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
        })}
        </g>
      </>
    );
  }, [scaledGeometry, cameraState, fixedCamera, hiddenLines, showPoints, isCustomLabelMode, labelOffsets, draggingLabelId, labelDragLastPos, exportScale]);

  const scaleFactor = exportScale / 1.2;
  const vbSize = 300 / scaleFactor;
  const vbOffset = -vbSize / 2;
  const viewBoxStr = `${vbOffset} ${vbOffset} ${vbSize} ${vbSize}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-background border-border shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Camera className="w-6 h-6 text-primary" />
            Xuất hình ảnh & LaTeX
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: 'none' }}>
          <svg
            id="math-svg-export"
            xmlns="http://www.w3.org/2000/svg"
            viewBox={viewBoxStr}
            width="1024"
            height="1024"
            style={{ backgroundColor: transparentBg ? 'transparent' : 'white' }}
          >
            {svgContent}
          </svg>
        </div>

        <div className="grid md:grid-cols-[1fr,360px] gap-6 p-6 pt-2">
          <div className="flex flex-col gap-4">
            <div 
              className="relative aspect-square sm:aspect-auto sm:h-[400px] w-full bg-white rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center p-4 shadow-inner overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] cursor-grab active:cursor-grabbing touch-none select-none"
              {...interactiveHandlers}
            >
              {scaledGeometry && cameraState && (
                <svg
                  viewBox={viewBoxStr}
                  className="w-full h-full drop-shadow-sm pointer-events-none select-none"
                  style={{ userSelect: 'none' }}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {svgContent}
                </svg>
              )}
              
              <div className="absolute top-3 left-3 flex gap-2 pointer-events-none">
                 <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded shadow-sm font-medium uppercase tracking-wider backdrop-blur-sm">
                   Bản xem trước
                 </div>
              </div>
              <div className="absolute bottom-3 right-3 flex gap-2 pointer-events-none">
                 <div className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded shadow-sm font-medium uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                   Dùng chuột để xoay hình
                 </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 flex flex-col gap-5">
               <div>
                 <div className="flex justify-between items-center mb-2">
                   <label className="text-sm font-medium flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4 text-primary" />
                      Kích thước (Scale)
                   </label>
                   <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                     {exportScale.toFixed(1)}x
                   </span>
                 </div>
                 <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={exportScale}
                    onChange={(e) => setExportScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                 />
               </div>

               <div className="flex justify-between items-center">
                 <label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer" htmlFor="transparent-toggle">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Xóa nền (Trong suốt)
                 </label>
                 <div className="relative inline-block w-10 h-5 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      id="transparent-toggle" 
                      checked={transparentBg}
                      onChange={(e) => setTransparentBg(e.target.checked)}
                      className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-secondary transition-transform duration-200 checked:translate-x-5 checked:border-primary"
                      style={{ right: 'unset' }}
                    />
                    <label 
                      htmlFor="transparent-toggle" 
                      className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${transparentBg ? 'bg-primary' : 'bg-secondary'}`}
                    ></label>
                 </div>
               </div>

               <div className="flex justify-between items-center">
                 <label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer" htmlFor="custom-label-toggle">
                    <Settings2 className="w-4 h-4 text-primary" />
                    Cho phép kéo thả chữ
                 </label>
                 <Switch 
                   id="custom-label-toggle" 
                   checked={isCustomLabelMode}
                   onCheckedChange={(c) => {
                     setIsCustomLabelMode(c);
                     if (!c) setLabelOffsets({});
                   }}
                 />
               </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tải xuống hình ảnh (PNG)</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 hover:border-primary/50 hover:bg-primary/5" onClick={() => captureImage('bw')} disabled={isExporting}>
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-xs font-medium">Trắng Đen</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 hover:border-primary/50 hover:bg-primary/5" onClick={() => captureImage('color')} disabled={isExporting}>
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium">Màu 3D</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tải xuống mã nguồn (TikZ)</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 hover:border-primary/50 hover:bg-primary/5" onClick={copyLatex}>
                  <Copy className="w-5 h-5" />
                  <span className="text-xs font-medium">Sao chép Code</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 hover:border-primary/50 hover:bg-primary/5" onClick={downloadLatex}>
                  <Code className="w-5 h-5" />
                  <span className="text-xs font-medium">Tải file .tex</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
