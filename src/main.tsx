import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";

// Error tracking (no-op nếu chưa cấu hình VITE_SENTRY_DSN).
initSentry();

// Analytics phễu (no-op nếu chưa cấu hình VITE_GA_MEASUREMENT_ID / VITE_PLAUSIBLE_DOMAIN).
initAnalytics();

// Bọc App bằng ErrorBoundary của Sentry để bắt lỗi render toàn ứng dụng.
createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary
    fallback={
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Đã xảy ra lỗi</h1>
        <p style={{ color: "#94a3b8", maxWidth: 420 }}>
          Ứng dụng gặp sự cố ngoài dự kiến. Vui lòng tải lại trang.
        </p>
        <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "inherit", cursor: "pointer" }}>
          Tải lại
        </button>
      </div>
    }
  >
    <App />
  </Sentry.ErrorBoundary>,
);
