import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, AlertTriangle, MessageSquare, BarChart3, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

// Trạng thái "chưa có dữ liệu / sắp có" — dùng chung cho các tab đang chờ backend.
function EmptyState({ icon: Icon, title, hint }: { icon: typeof Inbox; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  // Chặn truy cập: chưa đăng nhập hoặc không phải admin → về trang chủ.
  // Bảo mật thật nằm ở RLS phía Supabase; đây chỉ là lớp điều hướng cho UI.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) navigate('/', { replace: true });
  }, [user, isAdmin, authLoading, navigate]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen radial-gradient-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen radial-gradient-bg p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Trang quản trị</h1>
              <p className="text-muted-foreground">Theo dõi bài lỗi, feedback và chất lượng hệ thống</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="failures" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="failures" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Bài lỗi
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5">
              <MessageSquare className="h-4 w-4" /> Feedback
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Thống kê
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 — Bài máy vẽ sai / không vẽ được */}
          <TabsContent value="failures">
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Bài lỗi — máy vẽ sai / không vẽ được</CardTitle>
                <CardDescription>
                  Đề bài, JSON prompt, thông báo lỗi và model đã dùng của những lần vẽ thất bại.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Inbox}
                  title="Chưa có dữ liệu bài lỗi"
                  hint="Cần bước tiếp theo: tạo bảng lưu lỗi và ghi log từ các endpoint phân tích (analyze-geometry, analyze-advance, solve). Sau đó danh sách bài lỗi sẽ hiện ở đây."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2 — Feedback người dùng */}
          <TabsContent value="feedback">
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Feedback người dùng</CardTitle>
                <CardDescription>
                  Góp ý và báo lỗi người dùng gửi, kèm bản vẽ liên quan và trạng thái xử lý.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Inbox}
                  title="Chưa có feedback"
                  hint="Cần bước tiếp theo: tạo bảng feedback và thêm nút “Báo lỗi / Góp ý” cho người dùng. Sau đó feedback sẽ đổ về đây."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3 — Thống kê chất lượng */}
          <TabsContent value="stats">
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Thống kê chất lượng</CardTitle>
                <CardDescription>
                  Tỉ lệ vẽ thành công / thất bại, các dạng bài hay hỏng, thời gian xử lý.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={BarChart3}
                  title="Chưa có thống kê"
                  hint="Sẽ dựng sau khi có dữ liệu bài lỗi và feedback để tổng hợp thành biểu đồ."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
