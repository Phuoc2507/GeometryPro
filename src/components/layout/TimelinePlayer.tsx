import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAnimationOptional } from '@/context/AnimationContext';

export function TimelinePlayer() {
  const animCtx = useAnimationOptional();
  
  const [localTime, setLocalTime] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!animCtx) return;
    const updateTime = () => {
      setLocalTime(animCtx.globalTimeRef.current);
      rafRef.current = requestAnimationFrame(updateTime);
    };
    rafRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animCtx]);

  if (!animCtx) return null;

  const {
    isPlaying,
    totalDuration,
    play,
    pause,
    seek,
  } = animCtx;

  // Render format mm:ss.ms
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (values: number[]) => {
    seek(values[0]);
    setLocalTime(values[0]);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 glass rounded-xl px-4 py-3 border border-border/50 w-[90%] max-w-2xl shadow-lg">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-primary hover:text-primary hover:bg-primary/10 rounded-full"
          onClick={isPlaying ? pause : play}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
          onClick={() => {
            seek(0);
            play();
          }}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 flex items-center gap-4">
        <span className="text-xs font-medium text-muted-foreground tabular-nums w-10 text-right">
          {formatTime(localTime)}
        </span>
        <div className="flex-1">
          <Slider
            value={[localTime]}
            max={Math.max(totalDuration, 1000)}
            step={16} // ~60fps step
            onValueChange={handleSliderChange}
            className="cursor-grab active:cursor-grabbing"
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground tabular-nums w-10">
          {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
}
