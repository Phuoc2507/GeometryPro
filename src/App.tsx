import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { AnimationProvider } from "@/context/AnimationContext";
import { ToolModeProvider } from "@/context/ToolModeContext";
import { ToolSlider } from "@/components/ui/ToolSlider";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/context/AuthContext";
import React, { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const Landing = React.lazy(() => import('./pages/Landing'));
const StudentMode = React.lazy(() => import('./pages/StudentMode'));
const TeacherMode = React.lazy(() => import('./pages/TeacherMode'));
const Auth = React.lazy(() => import('./pages/Auth'));
const SavedGeometries = React.lazy(() => import('./pages/SavedGeometries'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ProblemTypeCatalog = React.lazy(() => import('./pages/ProblemTypeCatalog'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Modal nâng cấp toàn cục — mở từ bất kỳ đâu qua openUpgradeModal() (hết credit, nút Nâng cấp...).
function GlobalUpgradeModal() {
  const { isUpgradeModalOpen, closeUpgradeModal } = useAuth();
  return <UpgradeModal open={isUpgradeModalOpen} onOpenChange={(o) => { if (!o) closeUpgradeModal(); }} />;
}

// Sau khi thanh toán PayOS quay về ?payment=success: báo thành công + refresh credit (webhook cộng async).
function PaymentSuccessHandler() {
  const [params, setParams] = useSearchParams();
  const { refreshProfile } = useAuth();
  useEffect(() => {
    if (params.get('payment') !== 'success') return;
    toast.success('Thanh toán thành công!', { description: 'Credit đang được cộng vào tài khoản...', duration: 6000 });
    refreshProfile();
    const t = setTimeout(() => refreshProfile(), 4000); // chờ webhook cộng credit rồi refresh lại
    params.delete('payment');
    setParams(params, { replace: true });
    return () => clearTimeout(t);
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
                <ToolSlider />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/student" element={<StudentMode />} />
                    <Route path="/teacher" element={<TeacherMode />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/saved" element={<SavedGeometries />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/teacher/dang-bai" element={<ProblemTypeCatalog />} />
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
