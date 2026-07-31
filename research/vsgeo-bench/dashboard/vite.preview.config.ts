// vite.preview.config.ts — server xem trước tách biệt, KHÔNG đụng web app chính.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname), // thư mục dashboard làm gốc phục vụ
  plugins: [react()],
  server: { port: 5199, open: true },
});
