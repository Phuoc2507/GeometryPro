import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AnimationProvider } from "@/context/AnimationContext";
import { ToolModeProvider } from "@/context/ToolModeContext";
import { ToolSlider } from "@/components/ui/ToolSlider";
import Landing from "./pages/Landing";
import StudentMode from "./pages/StudentMode";
import TeacherMode from "./pages/TeacherMode";
import Auth from "./pages/Auth";
import SavedGeometries from "./pages/SavedGeometries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AnimationProvider>
          <ToolModeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ToolSlider />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/student" element={<StudentMode />} />
                <Route path="/teacher" element={<TeacherMode />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/saved" element={<SavedGeometries />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </ToolModeProvider>
        </AnimationProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
