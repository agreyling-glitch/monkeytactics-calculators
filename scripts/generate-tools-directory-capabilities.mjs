import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(siteRoot, "assets", "wasm", "menu", "tools-manifest.json");
const directoryPath = join(siteRoot, "tools", "index.html");
const checkOnly = process.argv.includes("--check");

const groups = JSON.parse(await readFile(manifestPath, "utf8"));
const leaves = [];
const collectLeaves = (items) => items.forEach((item) => {
  if (item.children?.length) collectLeaves(item.children);
  else leaves.push(item);
});
collectLeaves(groups);

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const original = await readFile(directoryPath, "utf8");
let tileIndex = 0;
let generated = original.replace(/<a class="directory-tool"[^>]*>[\s\S]*?<\/a>/g, (tile) => {
  const tool = leaves[tileIndex++];
  if (!tool) throw new Error("The tools directory contains more tiles than the manifest.");

  const href = tile.match(/href="([^"]+)"/)?.[1];
  if (href !== tool.url) {
    throw new Error(`Directory tile ${tileIndex} uses ${href}; expected ${tool.url} for ${tool.id}.`);
  }
  if (!Array.isArray(tool.capabilities) || tool.capabilities.length !== 3) {
    throw new Error(`${tool.id} must provide exactly three capabilities.`);
  }

  const capabilities = `<ul class="directory-tool__capabilities" aria-label="Capabilities">${tool.capabilities
    .map((capability) => `<li>${escapeHtml(capability)}</li>`)
    .join("")}</ul>`;
  let updated = tile
    .replace(/ data-tool-id="[^"]*"/, "")
    .replace(/<ul class="directory-tool__capabilities"[\s\S]*?<\/ul>/, "")
    .replace('class="directory-tool"', `class="directory-tool" data-tool-id="${escapeHtml(tool.id)}"`);
  updated = updated.replace("</small>", `</small>${capabilities}`);
  return updated;
});

if (tileIndex !== leaves.length) {
  throw new Error(`The manifest contains ${leaves.length} leaves but the directory contains ${tileIndex} tiles.`);
}

generated = generated.replace(
  /(<strong id="visibleCount">)\d+(<\/strong> menu entries)/,
  `$1${leaves.length}$2`,
);

if (checkOnly) {
  if (generated !== original) {
    throw new Error("tools/index.html capability markup is stale; run npm run build:tools-directory.");
  }
} else if (generated !== original) {
  await writeFile(directoryPath, generated, "utf8");
}
