import { CheckCircle2, Info, Layers, type LucideIcon } from 'lucide-react';

export type SafetyLevel = 1 | 2 | 3;
export type Exactness = 'exact' | 'numeric' | null;

// Số ĐO ĐƯỢC TRÊN HÌNH đại diện (chỉ Mức 2). Bài THANG CHỮ dựng ở thang scaleSymbol = 1;
// đáp CHỮ vẫn tổng quát, còn số này CHỈ đúng ở đúng hình đang vẽ ⇒ luôn hiện kèm `note`.
export interface IllustrationMeasure {
  approxAtScale: number;
  scaleSymbol: string | null;
  note: string;
}

// Object phân loại — CÙNG shape ở geometry.classification và SolveResult.tier (một nguồn).
export interface SafetyClassification {
  level: SafetyLevel;
  exactness: Exactness;
  problemType: string;
  reason?: { kind: string; message: string } | null;
  illustration?: IllustrationMeasure | null;
}

export interface SafetyTierMeta {
  level: SafetyLevel;
  label: string;
  tone: 'ok' | 'muted' | 'info';
  icon: LucideIcon;
  badgeClass: string;   // pill cho badge học sinh
  bannerClass: string;  // nền dải banner giáo viên
  description: string;  // dòng phụ dưới đáp số
}

export function safetyTierMeta(level: SafetyLevel): SafetyTierMeta {
  switch (level) {
    case 1:
      return {
        level: 1, label: 'Đã kiểm chứng', tone: 'ok', icon: CheckCircle2,
        badgeClass: 'bg-green-500/15 text-green-600 dark:text-green-400',
        bannerClass: 'bg-green-500/5',
        description: 'Đã được ứng dụng kiểm chứng',
      };
    case 2:
      return {
        level: 2, label: 'Minh hoạ đại diện', tone: 'muted', icon: Layers,
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        bannerClass: 'bg-blue-500/5',
        description: 'Chỉ đúng ở hình minh hoạ này',
      };
    default:
      return {
        level: 3, label: 'Chưa chứng thực', tone: 'info', icon: Info,
        badgeClass: 'bg-secondary text-muted-foreground',
        bannerClass: '',
        description: 'Ứng dụng chưa kiểm chứng kết quả này',
      };
  }
}

// Khi chỉ có boolean `verified` (badge học sinh, chưa có tier server) → map về mức.
export function verifiedToLevel(verified: boolean): SafetyLevel {
  return verified ? 1 : 3;
}

export function exactnessLabel(e: Exactness): string {
  return e === 'exact' ? 'chính xác' : e === 'numeric' ? 'giá trị số' : '';
}
