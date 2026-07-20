import { useRef, useCallback, useState, useEffect } from 'react';
import { Hexagon, Sparkles, Camera, Upload, Clipboard, Send, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGeometryOptional } from '@/context/GeometryContext';
import { DrawModeSelector, DrawMode } from '@/components/DrawModeSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { demoQuestions } from '@/data/demoQuestions';
import { demoResults } from '@/data/demoResults';

export function DropZone() {
  const context = useGeometryOptional();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');
  const [drawMode, setDrawMode] = useState<DrawMode>('quick');

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') || !context) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_dim = 1200;
        
        if (width > max_dim || height > max_dim) {
          if (width > height) {
            height = Math.round((height * max_dim) / width);
            width = max_dim;
          } else {
            width = Math.round((width * max_dim) / height);
            height = max_dim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          context.queueAnalyzeImage(compressedBase64, drawMode);
        } else {
          context.queueAnalyzeImage(base64, drawMode);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }, [context, drawMode]);

  // Handle paste event (Ctrl+V)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file);
        }
        break;
      }
    }
  }, [handleFileSelect]);

  // Add global paste listener
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (!textPrompt.trim() || !context) return;
    
    try {
      const parsed = JSON.parse(textPrompt.trim());
      if (parsed && typeof parsed === 'object') {
        const geo = parsed.geometry || parsed;
        if (geo.points && Array.isArray(geo.points)) {
          context.loadGeometry({ ...geo, name: geo.name || 'Imported JSON' });
          setTextPrompt('');
          return;
        }
      }
    } catch (e) {
      // Not a valid JSON, continue normal flow
    }

    // Instead of opening modal, directly call context
    if (drawMode === 'advance') {
      context.analyzeAdvance(textPrompt.trim());
    } else {
      context.queueAnalyzeText(textPrompt.trim(), drawMode);
    }
    setTextPrompt('');
  }, [textPrompt, context, drawMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  }, [handleTextSubmit]);

  // Guard against rendering outside provider
  if (!context) return null;
  
  const { state, startDemo } = context;

  if (state.geometry || state.isScanning) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none px-4 pb-4 pt-20">
      <div
        className={`glass rounded-2xl p-4 sm:p-6 border-2 border-dashed max-w-md w-full pointer-events-auto transition-all duration-300 max-h-[calc(100dvh-6rem)] overflow-y-auto scrollbar-hide ${
          isDragging
            ? 'border-primary bg-primary/10 scale-105'
            : 'border-border/50 animate-pulse-border'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
          {/* Abstract Geometric Icon */}
          <div className="relative">
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 glow-primary">
              <Hexagon className="w-10 h-10 sm:w-14 sm:h-14 text-primary" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 p-1.5 sm:p-2 rounded-full bg-accent/20">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold gradient-text">
              Visualize Any Geometry
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-sm">
              Chụp hình, tải ảnh hoặc nhập đề bằng chữ để AI xử lý và hiển thị mô hình 3D
            </p>
          </div>

          {/* Text Input Section */}
          {showTextInput ? (
            <div className="w-full space-y-3">
              <div className="relative">
                <Textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ví dụ: Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy và SA = 2a..."
                  className="min-h-[100px] resize-none pr-12"
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleTextSubmit}
                  disabled={!textPrompt.trim()}
                  className="absolute bottom-2 right-2"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Drawing Mode Selector */}
              <DrawModeSelector value={drawMode} onChange={setDrawMode} />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTextInput(false)}
                className="w-full text-muted-foreground"
              >
                ← Quay lại
              </Button>
            </div>
          ) : (
            <>
              {/* Drawing Mode Selector - always visible */}
              <DrawModeSelector value={drawMode} onChange={setDrawMode} />

              {/* Action Buttons */}
              <div className="w-full space-y-3">
                {/* Text Input Button */}
                <Button
                  size="lg"
                  onClick={() => setShowTextInput(true)}
                  className="w-full gap-2 glow-primary"
                >
                  <Type className="w-5 h-5" />
                  Nhập đề bằng chữ
                </Button>

                {/* Camera Button - Mobile Friendly */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Chụp hình
                </Button>

                {/* Upload Button */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Tải ảnh lên
                </Button>

                {/* Demo Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full gap-2 pointer-events-auto cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Xem Demo
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 pointer-events-auto max-h-[60vh] overflow-y-auto">
                    {demoResults.map((demo, idx) => (
                      <DropdownMenuItem 
                        key={idx} 
                        className="cursor-pointer" 
                        onClick={() => {
                          if (demo.geometry && demo.geometry.points && demo.geometry.points.length > 0) {
                            if (context.startDemo) {
                              context.startDemo({ ...demo.geometry, name: demo.title });
                            }
                          } else {
                            setShowTextInput(true);
                          }
                        }}
                      >
                        <span className="truncate">{demo.title}</span>
                      </DropdownMenuItem>
                    ))}
                    <div className="border-t my-1"></div>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => startDemo('pyramid')}>
                      <span>(Cũ) Hình chóp đều S.ABCD</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => startDemo('satellite')}>
                      <span>(Cũ) Quỹ đạo Vệ tinh quanh Trái Đất</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => startDemo('lod4')}>
                      <span>✨ Tối ưu quỹ đạo nhảy (LOD 4)</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Drop Zone Hint - Desktop */}
              <div className="hidden sm:block w-full p-3 rounded-xl border border-dashed border-border/30 bg-secondary/10">
                <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-2">
                  <Clipboard className="w-4 h-4" />
                  Ctrl+V để dán ảnh hoặc kéo thả vào đây
                </p>
              </div>
            </>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}