import { appendFile, copyFile, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(fileURLToPath(import.meta.url));
const siteDir = dirname(dirname(projectDir));
const distDir = join(projectDir, "dist");
const browserDir = join(siteDir, "assets", "wasm", "menu");

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
// Keep every menu artifact on the same deployment version as the module URL.
const menuAssetVersion = new URL(import.meta.url).search;
const menuAssetUrl = (name) => {
  const url = new URL(name, import.meta.url);
  url.search = menuAssetVersion;
  return url;
};

// Load the navigation stylesheet and auto-start.
if (typeof document !== "undefined" && !document.getElementById("mt-header-styles")) {
  const stylesheet = document.createElement("link");
  stylesheet.id = "mt-header-styles";
  stylesheet.rel = "stylesheet";
  stylesheet.href = menuAssetUrl("menu.css").href;
  document.head.appendChild(stylesheet);
}
__wbg_init({ module_or_path: menuAssetUrl("menu_bg.wasm") }).catch((error) => {
  console.error("Failed to initialize the MonkeyTactics navigation.", error);
});
`,
  "utf8",
);

await mkdir(browserDir, { recursive: true });
await copyFile(join(distDir, "menu.js"), join(browserDir, "menu.js"));
await copyFile(join(distDir, "menu_bg.wasm"), join(browserDir, "menu_bg.wasm"));
await copyFile(join(projectDir, "menu.css"), join(distDir, "menu.css"));
await copyFile(join(projectDir, "menu.css"), join(browserDir, "menu.css"));
