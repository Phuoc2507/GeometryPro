import { useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { useGeometry } from '@/context/GeometryContext';

// View thuần — test được không cần context.
export function AdvanceAnimControlView({
  t, playing, label, onSeek, onTogglePlay,
}: {
  t: number; playing: boolean; label: string;
  onSeek: (t: number) => void; onTogglePlay: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur">
      <button aria-label={playing ? 'Tạm dừng' : 'Chạy'} onClick={onTogglePlay} className="text-white">
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <span className="text-xs text-white/80 whitespace-nowrap">{label}</span>
      <input
        type="range" role="slider" min={0} max={1} step={0.001} value={t}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        className="w-40 accent-indigo-400"
      />
    </div>
  );
}

// Wrapper nối GeometryContext + đồng hồ play nội bộ.
export default function AdvanceAnimControl({ label, autoplay }: { label: string; autoplay?: boolean }) {
  const { state, setAdvanceT } = useGeometry();
  const advanceT = state.advanceT ?? 0;
  const playingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const stop = () => {
    playingRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };
  const tick = (prev: number, last: number) => {
    const now = performance.now();
    const next = Math.min(1, prev + (now - last) / 2200); // ~2.2s trọn hành trình
    setAdvanceT(next);
    if (next < 1 && playingRef.current) rafRef.current = requestAnimationFrame(() => tick(next, now));
    else stop();
  };
  const togglePlay = () => {
    if (playingRef.current) { stop(); return; }
    playingRef.current = true;
    const start = advanceT >= 1 ? 0 : advanceT;
    setAdvanceT(start);
    rafRef.current = requestAnimationFrame(() => tick(start, performance.now()));
  };

  useEffect(() => {
    if (autoplay) { playingRef.current = true; rafRef.current = requestAnimationFrame(() => tick(0, performance.now())); }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdvanceAnimControlView
      t={advanceT} playing={playingRef.current} label={label}
      onSeek={(v) => { stop(); setAdvanceT(v); }} onTogglePlay={togglePlay}
    />
  );
}
