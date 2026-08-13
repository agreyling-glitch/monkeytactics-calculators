import { copyFile, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const siteDir = dirname(dirname(projectDir));
const outputDir = join(siteDir, "assets", "wasm", "qr-code-decoder");
const zxingDir = join(siteDir, "node_modules", "zxing-wasm", "dist");

await rm(outputDir, { recursive: true, force: true });
await mkdir(join(outputDir, "zxing"), { recursive: true });

const result = spawnSync(
  "wasm-pack",
  ["build", ".", "--target", "web", "--release", "--out-dir", outputDir, "--out-name", "qr_decoder_engine"],
  { cwd: projectDir, stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);

await rm(join(outputDir, ".gitignore"), { force: true });
await copyFile(join(zxingDir, "iife", "reader", "index.js"), join(outputDir, "zxing", "reader.js"));
await copyFile(join(zxingDir, "reader", "zxing_reader.wasm"), join(outputDir, "zxing", "zxing_reader.wasm"));
