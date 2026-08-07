import { appendFile, copyFile, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const siteDir = dirname(projectDir);
const distDir = join(projectDir, "dist");
const staticDir = join(siteDir, "static", "wasm");

await rm(distDir, { recursive: true, force: true });

const result = spawnSync(
  "wasm-pack",
  ["build", ".", "--target", "web", "--release", "--out-dir", "dist", "--out-name", "menu"],
  { cwd: projectDir, stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

await appendFile(
  join(distDir, "menu.js"),
  `
// Load the navigation stylesheet and auto-start. Failures are intentionally silent.
if (typeof document !== "undefined" && !document.getElementById("mt-header-styles")) {
  const stylesheet = document.createElement("link");
  stylesheet.id = "mt-header-styles";
  stylesheet.rel = "stylesheet";
  stylesheet.href = new URL("menu.css", import.meta.url).href;
  document.head.appendChild(stylesheet);
}
__wbg_init().catch(() => {});
`,
  "utf8",
);

await mkdir(staticDir, { recursive: true });
await copyFile(join(distDir, "menu.js"), join(staticDir, "menu.js"));
await copyFile(join(distDir, "menu_bg.wasm"), join(staticDir, "menu_bg.wasm"));
await copyFile(join(projectDir, "menu.css"), join(distDir, "menu.css"));
await copyFile(join(projectDir, "menu.css"), join(staticDir, "menu.css"));
