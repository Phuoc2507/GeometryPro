import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGeometryOptional } from '@/context/GeometryContext';
import { useAnimationOptional } from '@/context/AnimationContext';
import { cn } from '@/lib/utils';
import { lod4DemoData } from '@/lib/lod4DemoData';

export function FloatingPromptBar() {
  const context = useGeometryOptional();
  const animCtx = useAnimationOptional();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Example prompts for placeholder rotation
  const placeholders = [
    "Vẽ đường nối A và trung điểm SC...",
    "Đổi trục toạ độ tại A với Ox là AB...",
    "Vẽ đường cao từ S xuống mặt đáy...",
    "Tìm tâm của mặt đáy ABCD...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [prompt]);

  // Guard against rendering outside provider
  if (!context) return null;
  
  const { state, modifyGeometry, loadGeometry } = context;

  if (!state.geometry || state.isBuilding) {
    return null;
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;
    
    try {
      const parsed = JSON.parse(prompt.trim());
      if (parsed && typeof parsed === 'object') {
        const geo = parsed.geometry || parsed;
        if (geo.points && Array.isArray(geo.points)) {
          loadGeometry({ ...geo, name: geo.name || 'Imported JSON' });
          setPrompt('');
          return;
        }
      }
    } catch (e) {
      // Not a valid JSON, continue normal flow
    }

    setIsLoading(true);
    try {
      await modifyGeometry(prompt);
      setPrompt('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-xl animate-fade-in">
      <div 
        className={cn(
          "glass rounded-2xl p-1.5 border transition-all duration-300",
          isFocused 
            ? "border-primary/50 shadow-lg shadow-primary/10" 
            : "border-border/50"
        )}
      >
        {/* Mini progress bar when loading */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-secondary/30 rounded-t-2xl overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-progress-indeterminate" />
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* AI Icon */}
          <div className={cn(
            "p-1.5 sm:p-2.5 rounded-xl shrink-0 transition-colors self-end mb-0.5",
            isLoading ? "bg-primary/20" : "bg-primary/10"
          )}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
          </div>

          {/* Textarea Field */}
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholders[placeholderIndex]}
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 bg-transparent border-0 outline-none text-sm resize-none",
              "placeholder:text-muted-foreground/60 text-foreground min-w-0",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[36px] py-2"
            )}
          />

          {/* Send Button */}
          <Button 
            size="icon" 
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading}
            className={cn(
              "rounded-xl h-8 w-8 sm:h-10 sm:w-10 shrink-0 transition-all self-end mb-0.5",
              prompt.trim() && !isLoading
                ? "bg-primary hover:bg-primary/90 scale-100"
                : "bg-muted scale-95 opacity-50"
            )}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>

        {/* Loading status text */}
        {isLoading && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <span className="text-xs text-muted-foreground animate-pulse">
              Đang tính toán tọa độ...
            </span>
          </div>
        )}

        {/* Quick suggestions - scrollable on mobile */}
        {!prompt && !isLoading && (
          <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              "Trung điểm SC",
              "Đường cao từ S",
              "Đổi gốc O→A, Ox→AB",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  if (suggestion.includes("Đổi gốc")) {
                    setPrompt("Đổi trục toạ độ tại A với Ox là AB");
                  } else {
                    setPrompt(`Vẽ ${suggestion.toLowerCase()}`);
                  }
                }}
                className="text-xs px-2.5 py-1 rounded-full bg-secondary/50 hover:bg-secondary text-secondary-foreground whitespace-nowrap transition-colors"
              >
                {suggestion}
              </button>
            ))}
            <button
              key="demo-lod4"
              onClick={() => {
                loadGeometry(lod4DemoData);
                setTimeout(() => {
                  if (animCtx) animCtx.play();
                }, 1500); // play after building animation finishes
              }}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/20 hover:bg-primary/30 text-primary whitespace-nowrap transition-colors flex items-center gap-1 font-medium ml-2 border border-primary/30"
            >
              ✨ Xem Demo LOD 4
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
