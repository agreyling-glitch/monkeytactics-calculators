import { resolve } from "node:path";
import { build } from "vite";

const projectRoot = resolve(import.meta.dirname, "..");
const input = resolve(projectRoot, "assets/js/tools/anagram-architect/anagram-architect.js");
const outputDirectory = resolve(projectRoot, "assets/js/tools/anagram-architect");
await build({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    minify: false,
    outDir: outputDirectory,
    lib: { entry: input, formats: ["iife"], name: "AnagramArchitect", fileName: () => "anagram-architect.bundle.js" }
  }
});
await build({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    minify: false,
    outDir: resolve(projectRoot, "assets/js/tools/anagram-animator"),
    lib: { entry: resolve(projectRoot, "assets/js/tools/anagram-animator/anagram-animator.js"), formats: ["iife"], name: "AnagramAnimator", fileName: () => "anagram-animator.bundle.js" }
  }
});
await build({
  configFile: false,
  publicDir: false,
  build: {
    emptyOutDir: false,
    minify: false,
    outDir: outputDirectory,
    lib: { entry: resolve(outputDirectory, "anagram-worker.js"), formats: ["es"], fileName: () => "anagram-worker.bundle.js" }
  }
});
