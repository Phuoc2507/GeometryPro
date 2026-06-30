import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { DynamicPoint, GeometryData } from '@/types/geometry';
import { fmt } from '@/lib/geometry/calculations';

interface DynamicPointControlsProps {
  geometry: GeometryData;
  onUpdateDynamicPoint: (id: string, k: number) => void;
}

export function DynamicPointControls({ geometry, onUpdateDynamicPoint }: DynamicPointControlsProps) {
  const dynamicPoints = geometry.dynamicPoints || [];

  if (dynamicPoints.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        Điểm di động
      </h3>
      {dynamicPoints.map(dp => (
        <DynamicPointSlider
          key={dp.id}
          dp={dp}
          geometry={geometry}
          onUpdate={onUpdateDynamicPoint}
        />
      ))}
    </div>
  );
}

function DynamicPointSlider({
  dp,
  geometry,
  onUpdate,
}: {
  dp: DynamicPoint;
  geometry: GeometryData;
  onUpdate: (id: string, k: number) => void;
}) {
  const [k, setK] = useState(dp.k);
  const fromPt = geometry.points.find(p => p.id === dp.from);
  const toPt = geometry.points.find(p => p.id === dp.to);

  const handleChange = useCallback((values: number[]) => {
    const newK = values[0];
    setK(newK);
    onUpdate(dp.id, newK);
  }, [dp.id, onUpdate]);

  // Calculate current position
  const currentPos = fromPt && toPt ? {
    x: fromPt.x + k * (toPt.x - fromPt.x),
    y: fromPt.y + k * (toPt.y - fromPt.y),
    z: fromPt.z + k * (toPt.z - fromPt.z),
  } : null;

  return (
    <div className="p-2.5 rounded-lg bg-secondary/30 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-primary font-bold">{dp.label}</span>
        <span className="text-muted-foreground font-mono">
          {fromPt?.label}{toPt?.label}: k = {fmt(k, 3)}
        </span>
      </div>
      <Slider
        value={[k]}
        onValueChange={handleChange}
        min={0}
        max={1}
        step={0.01}
        className="w-full"
      />
      {currentPos && (
        <div className="text-[10px] text-muted-foreground font-mono text-right">
          ({fmt(currentPos.x)}, {fmt(currentPos.y)}, {fmt(currentPos.z)})
        </div>
      )}
    </div>
  );
}
