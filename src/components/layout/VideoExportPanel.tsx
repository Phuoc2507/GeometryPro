import { useState, useRef, useEffect } from 'react';
import { Youtube, Play, Square, Download, Video, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAnimationOptional } from '@/context/AnimationContext';
import { useCameraOptional } from '@/context/CameraContext';
import { useGeometryOptional } from '@/context/GeometryContext';

export function VideoExportPanel() {
  const animCtx = useAnimationOptional();
  const cameraCtx = useCameraOptional();
  const geoCtx = useGeometryOptional();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef<number>();

  const startRecording = () => {
    if (!cameraCtx?.canvasRef.current || !animCtx) return;

    // Clean up previous
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
      setRecordedBlobUrl(null);
    }

    const canvas = cameraCtx.canvasRef.current;
    
    // WebGL Canvas Capture (60 FPS)
    const stream = canvas.captureStream(60);
    
    const options = { mimeType: 'video/webm;codecs=vp9' };
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch (e) {
      // Fallback
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    }

    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedBlobUrl(url);
      setIsRecording(false);
      setProgress(100);
      
      // Stop checking progress
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    // Reset animation and start playing
    animCtx.seek(0);
    animCtx.play();
    
    recorder.start();
    setIsRecording(true);
    setProgress(0);

    // Track progress and auto-stop
    const checkProgress = () => {
      if (animCtx.totalDuration > 0) {
        const current = animCtx.globalTimeRef.current;
        const p = Math.min(100, Math.floor((current / animCtx.totalDuration) * 100));
        setProgress(p);

        if (current >= animCtx.totalDuration) {
          stopRecording();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(checkProgress);
    };
    rafRef.current = requestAnimationFrame(checkProgress);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
      }
    };
  }, []);

  const downloadVideo = () => {
    if (!recordedBlobUrl) return;
    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    a.download = `geometry_animation_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="w-80 border-l border-border/50 glass hidden lg:flex flex-col h-screen overflow-hidden relative z-20">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          Xuất Video
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => geoCtx?.setVideoMode(false)}
        >
          Đóng
        </Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-card border border-border/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Video className="w-4 h-4" />
              Định dạng WebM
            </div>
            <p className="text-xs text-muted-foreground">
              Video sẽ được thu hình trực tiếp từ màn hình 3D (Canvas) ở tốc độ 60 Khung hình/giây.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Auto Orbit Camera</Label>
              <p className="text-xs text-muted-foreground">Xoay camera chậm (Cinematic)</p>
            </div>
            <Switch 
              checked={geoCtx?.state.autoRotate}
              onCheckedChange={(checked) => geoCtx?.setAutoRotate(checked)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Tiến trình quay</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          {!isRecording && !recordedBlobUrl && (
            <Button 
              className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white"
              onClick={startRecording}
            >
              <Play className="w-4 h-4 fill-current" />
              Bắt đầu ghi hình
            </Button>
          )}

          {isRecording && (
            <Button 
              variant="destructive"
              className="w-full gap-2 animate-pulse"
              onClick={stopRecording}
            >
              <Square className="w-4 h-4 fill-current" />
              Dừng ghi hình
            </Button>
          )}

          {!isRecording && recordedBlobUrl && (
            <div className="space-y-2">
              <Button 
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={downloadVideo}
              >
                <Download className="w-4 h-4" />
                Tải xuống Video
              </Button>
              <Button 
                variant="outline"
                className="w-full gap-2"
                onClick={startRecording}
              >
                <RotateCcw className="w-4 h-4" />
                Quay lại
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
