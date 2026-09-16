import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import init, { init_engine, init_language_metadata, init_language_model, start_search, step_search } from "../assets/wasm/anagram-architect/anagram_architect_engine.js";

const root = new URL("../", import.meta.url);
const cases = [process.argv.find((value) => value.startsWith("--source="))?.slice(9) || "Harry Potter and the Order of the Phoenix"];
const nodeLimits = [1_000];
const timeLimitMs = Number(process.argv.find((value) => value.startsWith("--time-limit-ms="))?.split("=")[1]) || 10_000;
const maxWords = Number(process.argv.find((value) => value.startsWith("--max-words="))?.split("=")[1]) || 10;
const minimumLength = Number(process.argv.find((value) => value.startsWith("--minimum-length="))?.split("=")[1]) || 3;

function letterCount(value) {
  return value.toLowerCase().replace(/[^a-z]/g, "").length;
}

const loadStarted = performance.now();
await init({ module_or_path: await readFile(new URL("assets/wasm/anagram-architect/anagram_architect_engine_bg.wasm", root)) });
const manifest = JSON.parse(await readFile(new URL("assets/data/words/manifest.enable-v1.json", root), "utf8"));
const dictionary = [];
for (const chunk of Object.values(manifest.chunks)) {
  const text = gunzipSync(await readFile(new URL(`assets/data/words/${chunk.file}`, root))).toString();
  for (const line of text.split(/\r?\n/)) if (line) dictionary.push(line);
}
const languageManifest = JSON.parse(await readFile(new URL("assets/data/words/anagram-language-v1.json", root), "utf8"));
const language = (await Promise.all(languageManifest.shards.map(async ({ file }) =>
  gunzipSync(await readFile(new URL(`assets/data/words/${file}`, root))).toString()
))).flatMap((text) => text.split(/\r?\n/).filter(Boolean));
const ngrams = gunzipSync(await readFile(new URL("assets/data/words/anagram-ngrams-v1.txt.gz", root))).toString().split(/\r?\n/).filter(Boolean);
init_engine(dictionary);
init_language_metadata(language);
init_language_model(ngrams);
console.log(`Loaded ${dictionary.length.toLocaleString()} words in ${(performance.now() - loadStarted).toFixed(0)} ms.\n`);

const rows = [];
for (const source of cases) {
  for (const nodeLimit of nodeLimits) {
    const started = performance.now();
    const prepareStarted = performance.now();
    start_search(source, { maxWords, minimumLength, limit: 1200, nodeLimit, timeLimitMs, deadlineEpochMs: Date.now() + timeLimitMs, shardIndex: 0, shardCount: 1 });
    const prepareMs = performance.now() - prepareStarted;
    let step;
    do step = step_search(1); while (!step.done && performance.now() - started < timeLimitMs);
    const elapsedMs = performance.now() - started;
    rows.push({
      letters: letterCount(source),
      nodeLimit,
      nodes: step.nodes,
      elapsedMs: Math.round(elapsedMs),
      prepareMs: Math.round(prepareMs),
      nodesPerSecond: Math.round(step.nodes / Math.max(.001, elapsedMs / 1000)),
      results: step.results?.length || 0,
      truncated: step.truncated
    });
  }
}
console.table(rows);
