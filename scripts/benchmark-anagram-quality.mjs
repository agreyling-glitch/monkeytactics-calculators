import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import init, { init_engine, init_language_metadata, init_language_model, start_search, step_search } from "../assets/wasm/anagram-architect/anagram_architect_engine.js";
import { mergeRankedResults } from "../assets/js/tools/anagram-architect/anagram-core.mjs";

const root = new URL("../", import.meta.url);
await init({ module_or_path: await readFile(new URL("assets/wasm/anagram-architect/anagram_architect_engine_bg.wasm", root)) });
const dictionaryManifest = JSON.parse(await readFile(new URL("assets/data/words/manifest.enable-v1.json", root), "utf8"));
const dictionary = [];
for (const chunk of Object.values(dictionaryManifest.chunks)) {
  for (const word of gunzipSync(await readFile(new URL(`assets/data/words/${chunk.file}`, root))).toString().split(/\r?\n/)) if (word) dictionary.push(word);
}
const language = gunzipSync(await readFile(new URL("assets/data/words/anagram-language-v1.tsv.gz", root))).toString().split(/\r?\n/).filter(Boolean);
const ngrams = gunzipSync(await readFile(new URL("assets/data/words/anagram-ngrams-v1.tsv.gz", root))).toString().split(/\r?\n/).filter(Boolean);
init_engine(dictionary);
init_language_metadata(language);
init_language_model(ngrams);
const benchmark = JSON.parse(await readFile(new URL("assets/data/words/anagram-quality-benchmarks-v1.json", root), "utf8"));
let failed = false;
function runPass(testCase, overrides = {}) {
  start_search(testCase.source, { maxWords: testCase.maxWords || 5, minimumLength: testCase.minimumLength || 2, pattern: testCase.pattern, lockedWords: testCase.lockedWords, limit: 1200, nodeLimit: testCase.nodeLimit, shardIndex: 0, shardCount: 1, ...overrides });
  let step;
  do step = step_search(5000); while (!step.done);
  return step;
}
for (const testCase of benchmark.cases) {
  const started = performance.now();
  let step = runPass(testCase);
  let results = step.results;
  let nodes = step.nodes;
  let specialistRank = 0;
  if (testCase.uiWorkers) {
    const specialist = runPass(testCase, { maxWords: 3, shardIndex: 0, shardCount: 1 });
    specialistRank = specialist.results.findIndex(({ phrase }) => phrase === testCase.expected) + 1;
    const shards = [specialist.results];
    nodes = specialist.nodes;
    const specialistCount = testCase.uiWorkers > 2 ? 2 : 1;
    if (specialistCount === 2) {
      const compact = runPass(testCase, { maxWords: 4, shardIndex: 0, shardCount: 1 });
      shards.push(compact.results);
      nodes += compact.nodes;
    }
    const generalWorkers = testCase.uiWorkers - specialistCount;
    for (let shardIndex = 0; shardIndex < generalWorkers; shardIndex += 1) {
      step = runPass(testCase, { maxWords: testCase.maxWords || 5, shardIndex, shardCount: generalWorkers });
      shards.push(step.results);
      nodes += step.nodes;
    }
    results = mergeRankedResults(shards, 1200);
  }
  const rank = results.findIndex(({ phrase }) => phrase === testCase.expected) + 1;
  const noisyTop = (testCase.forbiddenTop || []).filter((phrase) => results.slice(0, testCase.forbiddenTopLimit || 20).some((result) => result.phrase === phrase));
  const specialistPassed = !testCase.specialistMaxRank || (specialistRank > 0 && specialistRank <= testCase.specialistMaxRank);
  const passed = rank > 0 && rank <= testCase.maxRank && specialistPassed && noisyTop.length === 0;
  failed ||= !passed;
  const elapsed = performance.now() - started;
  const specialistNote = testCase.uiWorkers ? `, specialist rank ${specialistRank || "not found"}/${testCase.specialistMaxRank}` : "";
  console.log(`${passed ? "PASS" : "FAIL"}  ${testCase.name}: overall rank ${rank || "not found"}/${testCase.maxRank}${specialistNote}, ${nodes.toLocaleString()} nodes, ${elapsed.toFixed(0)} ms`);
  if (!passed) console.log(`      Top results: ${results.slice(0, 5).map(({ phrase }) => phrase).join(" | ") || "none"}`);
  if (noisyTop.length) console.log(`      Noise in top results: ${noisyTop.join(" | ")}`);
}
if (failed) process.exitCode = 1;
