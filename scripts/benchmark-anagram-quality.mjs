import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import init, { init_engine, init_language_metadata, init_language_model, start_search, step_search } from "../assets/wasm/anagram-architect/anagram_architect_engine.js";
import { mergeRankedResults } from "../assets/js/tools/anagram-architect/anagram-core.mjs";

const root = new URL("../", import.meta.url);
const baselineUrl = new URL("assets/data/words/anagram-quality-baseline-v1.json", root);
const updateBaseline = process.argv.includes("--update-baseline");
const reportArgument = process.argv.find((argument) => argument.startsWith("--report="));
const reportUrl = reportArgument
  ? new URL(reportArgument.slice("--report=".length), root)
  : new URL("outputs/anagram-quality-report.json", root);
await init({ module_or_path: await readFile(new URL("assets/wasm/anagram-architect/anagram_architect_engine_bg.wasm", root)) });
const dictionaryManifest = JSON.parse(await readFile(new URL("assets/data/words/manifest.enable-v1.json", root), "utf8"));
const dictionary = [];
for (const chunk of Object.values(dictionaryManifest.chunks)) {
  for (const word of gunzipSync(await readFile(new URL(`assets/data/words/${chunk.file}`, root))).toString().split(/\r?\n/)) if (word) dictionary.push(word);
}
const languageManifest = JSON.parse(await readFile(new URL("assets/data/words/anagram-language-v1.json", root)));
const language = (await Promise.all(languageManifest.shards.map(async ({ file }) =>
  gunzipSync(await readFile(new URL(`assets/data/words/${file}`, root))).toString()
))).flatMap((chunk) => chunk.split(/\r?\n/).filter(Boolean));
const ngrams = gunzipSync(await readFile(new URL("assets/data/words/anagram-ngrams-v1.txt.gz", root))).toString().split(/\r?\n/).filter(Boolean);
init_engine(dictionary);
init_language_metadata(language);
init_language_model(ngrams);
const benchmark = JSON.parse(await readFile(new URL("assets/data/words/anagram-quality-benchmarks-v1.json", root), "utf8"));
let baseline = { version: 1, cases: {} };
try {
  baseline = JSON.parse(await readFile(baselineUrl, "utf8"));
} catch (error) {
  if (!updateBaseline && error?.code !== "ENOENT") throw error;
}
let failed = false;
let warnings = 0;
const measurements = [];
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
  const elapsed = performance.now() - started;
  const prior = baseline.cases[testCase.name];
  const rankTolerance = testCase.maxRankRegression ?? 2;
  const rankRegression = prior && rank > 0 && rank > prior.rank + rankTolerance;
  const missingRegression = prior && prior.rank > 0 && rank === 0;
  const nodeRegression = prior && nodes > prior.nodes * 1.1;
  const timeRegression = prior && elapsed > prior.elapsedMs * 1.35;
  const regressionFailed = !updateBaseline && (rankRegression || missingRegression);
  failed ||= !passed || regressionFailed;
  warnings += Number(Boolean(nodeRegression)) + Number(Boolean(timeRegression));
  const specialistNote = testCase.uiWorkers ? `, specialist rank ${specialistRank || "not found"}/${testCase.specialistMaxRank}` : "";
  const status = passed && !regressionFailed ? "PASS" : "FAIL";
  console.log(`${status}  ${testCase.name}: overall rank ${rank || "not found"}/${testCase.maxRank}${specialistNote}, ${nodes.toLocaleString()} nodes, ${elapsed.toFixed(0)} ms`);
  if (!passed) console.log(`      Top results: ${results.slice(0, 5).map(({ phrase }) => phrase).join(" | ") || "none"}`);
  if (noisyTop.length) console.log(`      Noise in top results: ${noisyTop.join(" | ")}`);
  if (rankRegression) console.log(`      REGRESSION: rank ${prior.rank} → ${rank} exceeds tolerance +${rankTolerance}`);
  if (missingRegression) console.log(`      REGRESSION: previously ranked #${prior.rank}, now not found`);
  if (nodeRegression) console.log(`      WARNING: nodes increased ${prior.nodes.toLocaleString()} → ${nodes.toLocaleString()}`);
  if (timeRegression) console.log(`      WARNING: elapsed time increased ${prior.elapsedMs.toFixed(0)} → ${elapsed.toFixed(0)} ms`);
  measurements.push({
    name: testCase.name,
    rank,
    maxRank: testCase.maxRank,
    specialistRank,
    nodes,
    elapsedMs: Math.round(elapsed),
    passed: passed && !regressionFailed,
    regressions: { rank: Boolean(rankRegression || missingRegression), nodes: Boolean(nodeRegression), elapsed: Boolean(timeRegression) }
  });
}
const ranked = measurements.map(({ rank }) => rank).filter(Boolean).sort((a, b) => a - b);
const summary = {
  cases: measurements.length,
  passed: measurements.filter(({ passed }) => passed).length,
  failed: measurements.filter(({ passed }) => !passed).length,
  warnings,
  medianRank: ranked.length ? ranked[Math.floor(ranked.length / 2)] : null,
  worstRank: ranked.at(-1) ?? null,
  totalNodes: measurements.reduce((total, item) => total + item.nodes, 0),
  totalElapsedMs: measurements.reduce((total, item) => total + item.elapsedMs, 0)
};
console.log(`\nSummary: ${summary.passed}/${summary.cases} passed, median rank #${summary.medianRank}, worst rank #${summary.worstRank}, ${summary.totalNodes.toLocaleString()} nodes, ${warnings} performance warning${warnings === 1 ? "" : "s"}.`);
const report = { version: 1, generatedAt: new Date().toISOString(), benchmarkVersion: benchmark.version, summary, cases: measurements };
await mkdir(new URL("./", reportUrl), { recursive: true });
await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`);
console.log(`JSON report: ${reportUrl.pathname}`);
if (updateBaseline) {
  const nextBaseline = {
    version: 1,
    benchmarkVersion: benchmark.version,
    generatedAt: report.generatedAt,
    cases: Object.fromEntries(measurements.map(({ name, rank, specialistRank, nodes, elapsedMs }) => [name, { rank, specialistRank, nodes, elapsedMs }]))
  };
  await writeFile(baselineUrl, `${JSON.stringify(nextBaseline, null, 2)}\n`);
  console.log(`Updated baseline: ${baselineUrl.pathname}`);
}
if (failed) process.exitCode = 1;
