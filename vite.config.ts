import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // @convex-dev/auth and the app must share one convex/react instance,
    // or the auth context is invisible to Authenticated/AuthLoading.
    dedupe: ["convex", "react", "react-dom"],
  },
  optimizeDeps: {
    include: ["convex/react", "@convex-dev/auth/react"],
  },
});
