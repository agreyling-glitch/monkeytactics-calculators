import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  publicDir: false,
  build: {
    outDir: "assets",
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: "src/main.tsx",
      formats: ["es"],
      fileName: () => "js/qr-studio.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "css/qr-code-generator.[ext]",
      },
    },
  },
});
