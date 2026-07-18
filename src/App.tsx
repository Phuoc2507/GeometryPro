import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AnimationProvider } from "@/context/AnimationContext";
import { ToolModeProvider } from "@/context/ToolModeContext";
import { ToolSlider } from "@/components/ui/ToolSlider";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/context/AuthContext";
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const Landing = React.lazy(() => import('./pages/Landing'));
const StudentMode = React.lazy(() => import('./pages/StudentMode'));
const TeacherMode = React.lazy(() => import('./pages/TeacherMode'));
const Auth = React.lazy(() => import('./pages/Auth'));
const SavedGeometries = React.lazy(() => import('./pages/SavedGeometries'));
const Settings = React.lazy(() => import('./pages/Settings'));
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
                <ToolSlider />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/student" element={<StudentMode />} />
                    <Route path="/teacher" element={<TeacherMode />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/saved" element={<SavedGeometries />} />
                    <Route path="/settings" element={<Settings />} />
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
