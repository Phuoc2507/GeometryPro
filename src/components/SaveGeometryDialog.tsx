import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useSavedGeometries } from '@/hooks/useSavedGeometries';
import { GeometryData } from '@/types/geometry';

interface SaveGeometryDialogProps {
  geometry: GeometryData | null;
  trigger?: React.ReactNode;
}

export function SaveGeometryDialog({ geometry, trigger }: SaveGeometryDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveGeometry } = useSavedGeometries();
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!geometry || !name.trim()) return;
    
    setIsSaving(true);
    const result = await saveGeometry(name.trim(), geometry, isPublic);
    setIsSaving(false);
    
    if (result) {
      setOpen(false);
      setName('');
      setIsPublic(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !user) {
      navigate('/auth');
      return;
    }
    setOpen(newOpen);
    if (newOpen && geometry) {
      setName(geometry.name || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2" disabled={!geometry}>
            <Save className="w-4 h-4" />
            Lưu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lưu hình học</DialogTitle>
          <DialogDescription>
            Đặt tên và chọn chế độ chia sẻ cho hình của bạn
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên hình</Label>
            <Input
              id="name"
              placeholder="Ví dụ: Hình chóp S.ABCD"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-primary" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isPublic ? 'Công khai' : 'Riêng tư'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic 
                    ? 'Mọi người có thể xem hình này' 
                    : 'Chỉ bạn mới xem được'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Lưu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
