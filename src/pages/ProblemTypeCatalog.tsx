// src/pages/ProblemTypeCatalog.tsx
// Trang GIÁO VIÊN: bảng phân loại DẠNG BÀI (/teacher/dang-bai).
// Liệt kê từng dạng + MỨC an toàn của engine; dạng hình học Mức-1 có nút "Vẽ thử"
// nạp hình ĐÃ ĐƯỢC ENGINE CHỨNG THỰC vào canvas /teacher qua navigation state
// (TeacherMode.GeometryLoader đọc location.state.loadGeometry khi mount).
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Info, Pencil, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { safetyTierMeta } from '@/lib/safetyTier';
import { problemTypeCatalog, type CatalogEntry } from '@/data/problemTypeCatalog';
import type { GeometryData } from '@/types/geometry';

function CatalogRow({ entry, onDraw }: { entry: CatalogEntry; onDraw: (g: GeometryData) => void }) {
  const meta = safetyTierMeta(entry.level);
  const Icon = meta.icon;
  const ex = entry.example;
  return (
    <Card className={`border ${meta.bannerClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">{entry.type}</CardTitle>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}>
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{entry.note}</p>
        {entry.curriculumNote && (
          <p className="text-xs italic text-muted-foreground/80">SGK: {entry.curriculumNote}</p>
        )}
        {ex && (
          <div className="space-y-1 rounded-md bg-secondary/40 p-3">
            <p><span className="font-medium">Ví dụ:</span> {ex.de}</p>
            <p>
              <span className="font-medium">Đáp án:</span> {ex.answer}{' '}
              <span className="text-xs text-muted-foreground">({ex.exactness === 'exact' ? 'chính xác' : 'giá trị số'})</span>
            </p>
            {ex.geometry && (
              <Button size="sm" variant="secondary" className="mt-1" onClick={() => onDraw(ex.geometry!)}>
                <Pencil className="mr-1 h-4 w-4" /> Vẽ thử
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProblemTypeCatalog() {
  const navigate = useNavigate();
  const { user, tier, isLoading: authLoading, openUpgradeModal } = useAuth();

  // Cổng đăng nhập (sao pattern Settings.tsx:41-45).
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="radial-gradient-bg flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  // Cổng giáo viên (nghiêm: chỉ tier 'teacher').
  if (tier !== 'teacher') {
    return (
      <div className="radial-gradient-bg flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Dành cho giáo viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bảng phân loại dạng bài chỉ có ở gói Giáo viên. Nâng cấp để xem dạng nào đã được kiểm chứng và vẽ thử ví dụ.
            </p>
            <Button onClick={() => openUpgradeModal()}>Nâng cấp gói Giáo viên</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const drawExample = (g: GeometryData) => navigate('/teacher', { state: { loadGeometry: g } });
  const certified = problemTypeCatalog.filter((e) => e.level === 1);
  const uncertified = problemTypeCatalog.filter((e) => e.level === 3);

  return (
    <div className="radial-gradient-bg min-h-screen">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')} aria-label="Quay lại">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Bảng phân loại dạng bài</h1>
            <p className="text-sm text-muted-foreground">Dạng nào ứng dụng đã kiểm chứng, dạng nào chưa — kèm ví dụ vẽ thử.</p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Đã kiểm chứng ({certified.length})
          </h2>
          {certified.map((e) => <CatalogRow key={e.type} entry={e} onDraw={drawExample} />)}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Info className="h-4 w-4" /> Chưa chứng thực ({uncertified.length})
          </h2>
          {uncertified.map((e) => <CatalogRow key={e.type} entry={e} onDraw={drawExample} />)}
        </section>
      </div>
    </div>
  );
}
