import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || "https://rgggedtyrzlmmepwreyq.supabase.co"),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZ2dlZHR5cnpsbW1lcHdyZXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMDA3NDEsImV4cCI6MjA4NDg3Njc0MX0._W3TpcwM19tjSVfsU_TjC7UybHTTxRP7VHLOfuH7gMM"),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(process.env.VITE_SUPABASE_PROJECT_ID || "rgggedtyrzlmmepwreyq"),
  },
});
