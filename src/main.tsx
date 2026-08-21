import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Error tracking (no-op nếu chưa cấu hình VITE_SENTRY_DSN).
initSentry();

// Bọc App bằng ErrorBoundary của Sentry để bắt lỗi render toàn ứng dụng.
createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary
    fallback={
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif", background: "hsl(var(--background, 0 0% 100%))", color: "hsl(var(--foreground, 222 47% 11%))" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Đã xảy ra lỗi</h1>
        <p style={{ color: "hsl(var(--muted-foreground, 215 16% 47%))", maxWidth: 420 }}>
          Ứng dụng gặp sự cố ngoài dự kiến. Vui lòng tải lại trang.
        </p>
        <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid hsl(var(--border, 214 32% 91%))", background: "transparent", color: "inherit", cursor: "pointer" }}>
          Tải lại
        </button>
      </div>
    }
  >
    <App />
  </Sentry.ErrorBoundary>,
);
