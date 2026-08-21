import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Cho phép "thoát" khỏi lỗi bằng cách xoá hình đang gây crash (tránh bấm Thử lại là lỗi lại). */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    captureException(error);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50 p-4 rounded-2xl border border-destructive/20 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Đã xảy ra lỗi khi vẽ 3D</h2>
          <p className="text-muted-foreground text-sm max-w-[300px] mb-6">
            Dữ liệu hình học phức tạp hoặc không hợp lệ đã gây ra lỗi render.
            {this.props.onReset ? ' Bạn có thể xoá hình này và vẽ lại.' : ' Vui lòng thử lại.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {this.props.onReset && (
              <Button
                onClick={() => { this.props.onReset?.(); this.setState({ hasError: false, error: null }); }}
                className="gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Xoá hình & vẽ mới
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Thử lại
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
