import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  publicDir: false,
  build: {
    outDir: "assets/generated/qr-studio",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: "apps/qr-studio/src/main.tsx",
      formats: ["es"],
      fileName: () => "qr-studio.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "qr-studio.[ext]",
      },
    },
  },
});
