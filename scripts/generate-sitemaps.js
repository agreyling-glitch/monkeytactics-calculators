import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import {
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import initWasmModule, {
  init_engine,
  is_valid_word,
} from "../assets/wasm/word-unscrambler/word_unscrambler_engine.js";

const gunzipAsync = promisify(gunzip);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const DICTIONARY_DIR = path.join(PROJECT_ROOT, "assets", "data", "words");
const DICTIONARY_MANIFEST = path.join(
  DICTIONARY_DIR,
  "manifest.enable-sowpods-v2.json",
);
const WASM_FILE = path.join(
  PROJECT_ROOT,
  "assets",
  "wasm",
  "word-unscrambler",
  "word_unscrambler_engine_bg.wasm",
);
const OUTPUT_DIR = path.resolve(
  PROJECT_ROOT,
  process.env.SITEMAP_OUTPUT_DIR || "public",
);
const SITE_URL = "https://monkeytactics.com";
const WORD_URL = `${SITE_URL}/tools/word-unscrambler`;
const MAX_URLS_PER_SITEMAP = 50_000;
const MIN_WORD_LENGTH = 4;

let dictionaryRecords = [];

function escapeXML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function initWasm() {
  const wasmBytes = await readFile(WASM_FILE);
  await initWasmModule({ module_or_path: wasmBytes });
  init_engine(dictionaryRecords);
}

export async function loadDictionaryFiles() {
  const manifest = JSON.parse(await readFile(DICTIONARY_MANIFEST, "utf8"));

  if (manifest.encoding !== "gzip-newline-membership" || !manifest.chunks) {
    throw new Error("The ENABLE/SOWPODS dictionary manifest is invalid.");
  }

  const chunkFiles = Object.values(manifest.chunks)
    .map((chunk) => chunk.file)
    .sort();
  const chunks = await Promise.all(
    chunkFiles.map(async (filename) => {
      const compressed = await readFile(path.join(DICTIONARY_DIR, filename));
      return gunzipAsync(compressed);
    }),
  );

  const records = chunks.flatMap((chunk) =>
    chunk.toString("utf8").split(/\r?\n/).filter(Boolean),
  );
  dictionaryRecords = records;

  return [...new Set(records.map((record) => record.split("\t", 1)[0]))].sort();
}

export function generateSitemapChunk(words, index) {
  if (!Number.isInteger(index) || index < 1) {
    throw new TypeError("Sitemap chunk index must be a positive integer.");
  }
  if (words.length > MAX_URLS_PER_SITEMAP) {
    throw new RangeError("A sitemap cannot contain more than 50,000 URLs.");
  }

  const urls = words
    .map((word) => {
      const location = `${WORD_URL}/${encodeURIComponent(word)}`;
      return `  <url>
    <loc>${escapeXML(location)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function generateSitemapIndex(files) {
  const sitemaps = files
    .map(
      (file) => `  <sitemap>
    <loc>${escapeXML(`${SITE_URL}/${file}`)}</loc>
  </sitemap>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>
`;
}

export async function writeFile(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await fsWriteFile(filePath, content, "utf8");
}

async function removeOldSitemapChunks() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() && /^sitemap-words-[1-9]\d*\.xml$/.test(entry.name),
      )
      .map((entry) => unlink(path.join(OUTPUT_DIR, entry.name))),
  );
}

async function main() {
  const dictionaryWords = await loadDictionaryFiles();

  await initWasm();

  const validWords = [];
  for (const word of dictionaryWords) {
    if (
      word.length >= MIN_WORD_LENGTH &&
      /^[a-z]+$/.test(word) &&
      is_valid_word(word)
    ) {
      validWords.push(word);
    }
  }

  await removeOldSitemapChunks();

  const sitemapFiles = [];
  for (let offset = 0; offset < validWords.length; offset += MAX_URLS_PER_SITEMAP) {
    const index = sitemapFiles.length + 1;
    const filename = `sitemap-words-${index}.xml`;
    const words = validWords.slice(offset, offset + MAX_URLS_PER_SITEMAP);
    await writeFile(
      path.join(OUTPUT_DIR, filename),
      generateSitemapChunk(words, index),
    );
    sitemapFiles.push(filename);
  }

  await writeFile(
    path.join(OUTPUT_DIR, "sitemap.xml"),
    generateSitemapIndex(sitemapFiles),
  );
}

const invokedScript = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (invokedScript) {
  await main();
}
