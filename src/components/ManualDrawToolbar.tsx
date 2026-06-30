import { MapPin, Minus, CircleDot, Square, Trash2, FunctionSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGeometry } from '@/context/GeometryContext';
import { AddPointTool } from '@/components/manual-tools/AddPointTool';
import { AddLineTool } from '@/components/manual-tools/AddLineTool';
import { MidpointTool } from '@/components/manual-tools/MidpointTool';
import { AddPlaneTool } from '@/components/manual-tools/AddPlaneTool';
import { DeleteTool } from '@/components/manual-tools/DeleteTool';
import { EquationTool } from '@/components/manual-tools/EquationTool';
import { ManualTool } from '@/types/geometry';

const tools: { id: ManualTool; icon: React.ElementType; label: string }[] = [
  { id: 'addPoint', icon: MapPin, label: 'Thêm điểm' },
  { id: 'addLine', icon: Minus, label: 'Nối đường' },
  { id: 'midpoint', icon: CircleDot, label: 'Trung điểm' },
  { id: 'addPlane', icon: Square, label: 'Mặt phẳng' },
  { id: 'equation', icon: FunctionSquare, label: 'Phương trình' },
  { id: 'delete', icon: Trash2, label: 'Xóa' },
];

export function ManualDrawToolbar() {
  const { state, setManualTool, addPoint, addLine, addPlane, removeElement, addMidpoint, addPlaneFromEquation } = useGeometry();

  const activeTool = state.manualTool;
  const geometry = state.geometry;
  const points = geometry?.points || [];

  const toggleTool = (tool: ManualTool) => {
    setManualTool(activeTool === tool ? null : tool);
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 glass rounded-xl border border-border/50 overflow-hidden">
      {/* Tool buttons row */}
      <div className="flex items-center gap-0.5 px-1.5 py-1">
        {tools.map(({ id, icon: Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === id ? 'default' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleTool(id)}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Hint for click-to-place */}
      {activeTool === 'addPoint' && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground text-center border-t border-border/30">
          💡 Click lên mặt phẳng 3D để đặt điểm, hoặc nhập tọa độ bên dưới
        </div>
      )}

      {/* Active tool form */}
      {activeTool && (
        <div className="px-3 pb-3 pt-1 border-t border-border/30 min-w-[260px]">
          {activeTool === 'addPoint' && (
            <AddPointTool
              existingLabels={points.map(p => p.label)}
              onAdd={(label, x, y, z) => addPoint(label, x, y, z)}
            />
          )}
          {activeTool === 'addLine' && (
            <AddLineTool
              points={points}
              onAdd={(from, to, style) => addLine(from, to, style)}
            />
          )}
          {activeTool === 'midpoint' && (
            <MidpointTool
              points={points}
              onAdd={(p1, p2) => addMidpoint(p1, p2)}
            />
          )}
          {activeTool === 'addPlane' && (
            <AddPlaneTool
              points={points}
              onAdd={(pointIds) => addPlane(pointIds)}
            />
          )}
          {activeTool === 'equation' && (
            <EquationTool
              onAdd={(a, b, c, d) => addPlaneFromEquation(a, b, c, d)}
            />
          )}
          {activeTool === 'delete' && (
            <DeleteTool
              geometry={geometry}
              onDelete={(type, id) => removeElement(type, id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
