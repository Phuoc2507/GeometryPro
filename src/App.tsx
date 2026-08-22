import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { AnimationProvider } from "@/context/AnimationContext";
import { ToolModeProvider } from "@/context/ToolModeContext";
import { ToolSlider } from "@/components/ui/ToolSlider";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ReferralAnnouncement } from "@/components/ReferralAnnouncement";
import { useAuth } from "@/context/AuthContext";
import React, { Suspense, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const Landing = React.lazy(() => import('./pages/Landing'));
const StudentMode = React.lazy(() => import('./pages/StudentMode'));
const TeacherMode = React.lazy(() => import('./pages/TeacherMode'));
const Auth = React.lazy(() => import('./pages/Auth'));
const SavedGeometries = React.lazy(() => import('./pages/SavedGeometries'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Admin = React.lazy(() => import('./pages/Admin'));
const AdminFeedbackView = React.lazy(() => import('./pages/AdminFeedbackView'));
const TestResultView = React.lazy(() => import('./pages/TestResultView'));
const ProblemTypeCatalog = React.lazy(() => import('./pages/ProblemTypeCatalog'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Referral = React.lazy(() => import('./pages/Referral'));
const TeamManage = React.lazy(() => import('./pages/TeamManage'));
const Terms = React.lazy(() => import('./pages/Terms'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const SharedView = React.lazy(() => import('./pages/SharedView'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Khoá vai trò (Pha 2): người đang có gói chỉ vào đúng vai trò của gói.
// Free/hết hạn (lockedRole=null) → vào cả hai bình thường. Khoá vai trò khác → chuyển hướng.
function RoleGuard({ role, children }: { role: 'student' | 'teacher'; children: React.ReactNode }) {
  const { isRoleLocked, lockedRole } = useAuth();
  if (isRoleLocked && lockedRole && lockedRole !== role) {
    return <Navigate to={`/${lockedRole}`} replace />;
  }
  return <>{children}</>;
}

// Modal nâng cấp toàn cục — mở từ bất kỳ đâu qua openUpgradeModal() (hết credit, nút Nâng cấp...).
function GlobalUpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal } = useAuth();
  return <UpgradeModal open={isUpgradeModalOpen} onOpenChange={(o) => { if (!o) closeUpgradeModal(); }} />;
}

// Sau khi thanh toán PayOS quay về ?payment=success: webhook cộng credit/gói KHÔNG tức thì,
// nên ta POLL hồ sơ tới khi credit/gói thực sự đổi rồi mới báo "thành công". Tránh cảnh
// "đã trả tiền mà chưa thấy gì" khi webhook về trễ.
function PaymentSuccessHandler() {
  const [params, setParams] = useSearchParams();
  const { refreshProfile, credits, tier, profile, isLoading } = useAuth();
  // Ref soi giá trị mới nhất trong vòng lặp async (state không cập nhật giữa các lần lặp).
  const sigRef = useRef({ credits, tier, exp: profile?.plan_expires_at ?? null });
  useEffect(() => {
    sigRef.current = { credits, tier, exp: profile?.plan_expires_at ?? null };
  }, [credits, tier, profile?.plan_expires_at]);

  // Nhớ "đây là lượt quay về sau thanh toán" NGAY lúc mount rồi dọn param, để refresh không kích lại.
  const isPaymentReturn = useRef(params.get('payment') === 'success');
  const startedRef = useRef(false);
  useEffect(() => {
    if (!isPaymentReturn.current) return;
    try { localStorage.removeItem('geo3d:ref'); } catch { /* bỏ qua */ }
    if (params.get('payment')) { params.delete('payment'); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CHỜ hồ sơ tải xong rồi mới chốt mốc so sánh. Nếu chốt lúc profile còn null (credits=0, tier=free),
  // khi hồ sơ trước-thanh-toán tải lên (vd đã có 20 credit) sẽ bị hiểu nhầm là "đã cộng" → báo nhầm.
  const profileLoaded = !isLoading && !!profile;
  useEffect(() => {
    if (!isPaymentReturn.current || startedRef.current || !profileLoaded) return;
    startedRef.current = true;

    const before = { ...sigRef.current };  // mốc = trạng thái TRƯỚC khi webhook cộng
    const changed = () => {
      const s = sigRef.current;
      return s.credits > before.credits || s.tier !== before.tier || s.exp !== before.exp;
    };

    const toastId = 'pay-confirm';
    toast.loading('Đang xác nhận thanh toán…', { id: toastId, description: 'Đang cộng credit/gói vào tài khoản.' });

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Backoff ~ tổng 60s: webhook thường về trong vài giây, nhưng có thể trễ.
    const delays = [1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 10000, 10000];
    const poll = async (i: number) => {
      if (cancelled) return;
      await refreshProfile();
      if (cancelled) return;
      if (changed()) {
        toast.success('Thanh toán thành công!', { id: toastId, description: 'Đã cộng vào tài khoản.', duration: 6000 });
        return;
      }
      if (i >= delays.length) {
        toast.info('Đã nhận thanh toán', {
          id: toastId,
          description: 'Hệ thống đang xử lý — credit/gói sẽ tự cập nhật trong ít phút. Tải lại trang nếu cần.',
          duration: 8000,
        });
        return;
      }
      timers.push(setTimeout(() => poll(i + 1), delays[i]));
    };
    poll(0);

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [profileLoaded, refreshProfile]);
  return null;
}

// Bắt mã mời từ link chia sẻ (?ref=CODE): lưu vào localStorage để dùng ở màn thanh toán,
// rồi dọn tham số khỏi URL cho gọn.
function ReferralCapture() {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const ref = params.get('ref');
    if (!ref) return;
    try { localStorage.setItem('geo3d:ref', ref.trim().toUpperCase()); } catch { /* bỏ qua */ }
    params.delete('ref');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AnimationProvider>
            <ToolModeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <AuthModal />
                <GlobalUpgradeModal />
                <PaymentSuccessHandler />
                <ReferralCapture />
                <ReferralAnnouncement />
                <ToolSlider />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/student" element={<RoleGuard role="student"><StudentMode /></RoleGuard>} />
                    <Route path="/teacher" element={<RoleGuard role="teacher"><TeacherMode /></RoleGuard>} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/saved" element={<SavedGeometries />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/bang-gia" element={<Pricing />} />
                    <Route path="/gioi-thieu" element={<Referral />} />
                    <Route path="/quan-ly-to" element={<TeamManage />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/feedback/:id" element={<AdminFeedbackView />} />
                    <Route path="/admin/test-view/:id" element={<TestResultView />} />
                    <Route path="/teacher/dang-bai" element={<RoleGuard role="teacher"><ProblemTypeCatalog /></RoleGuard>} />
                    <Route path="/dieu-khoan" element={<Terms />} />
                    <Route path="/quyen-rieng-tu" element={<Privacy />} />
                    <Route path="/s/:id" element={<SharedView />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </ToolModeProvider>
          </AnimationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
