import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

interface AnimationContextState {
  isPlaying: boolean;
  globalTimeRef: React.MutableRefObject<number>;
  totalDuration: number;
  play: () => void;
  pause: () => void;
  seek: (timeMs: number) => void;
  setTotalDuration: (duration: number) => void;
}

const AnimationContext = createContext<AnimationContextState | null>(null);

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

export const useAnimationOptional = () => {
  return useContext(AnimationContext);
};

export const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(5000);

  const globalTimeRef = useRef(999999);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      const nextTime = globalTimeRef.current + deltaTime;
      
      if (nextTime >= totalDuration) {
        setIsPlaying(false);
        globalTimeRef.current = totalDuration;
      } else {
        globalTimeRef.current = nextTime;
        requestRef.current = requestAnimationFrame(animate);
      }
    } else {
      requestRef.current = requestAnimationFrame(animate);
    }
    previousTimeRef.current = time;
  }, [totalDuration]);

  useEffect(() => {
    if (isPlaying) {
      previousTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate]);

  const play = useCallback(() => {
    if (globalTimeRef.current >= totalDuration) {
      globalTimeRef.current = 0;
    }
    setIsPlaying(true);
  }, [totalDuration]);
  
  const pause = useCallback(() => setIsPlaying(false), []);
  
  useEffect(() => {
    const handlePlay = () => play();
    window.addEventListener('playAnimation', handlePlay);
    return () => window.removeEventListener('playAnimation', handlePlay);
  }, [play]);
  
  const seek = (timeMs: number) => {
    globalTimeRef.current = Math.max(0, Math.min(timeMs, totalDuration));
  };

  // Memoize value to avoid unnecessary re-renders of consumers
  const value = React.useMemo(() => ({
    isPlaying,
    globalTimeRef,
    totalDuration,
    play,
    pause,
    seek,
    setTotalDuration,
  }), [isPlaying, totalDuration]);

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};
