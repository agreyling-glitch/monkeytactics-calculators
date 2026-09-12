import { solveAnagrams } from "./anagram-core.mjs";
import initWasm, { init_engine as initWasmEngine, init_language_metadata as initLanguageMetadata, init_language_model as initLanguageModel, start_search as startWasmSearch, step_search as stepWasmSearch, verify_domain as verifyWasmDomain } from "../../../wasm/anagram-architect/anagram_architect_engine.js";

async function decodeResponse(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
  if (!("DecompressionStream" in self)) throw new Error("This browser cannot open the compressed local dictionary.");
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

async function loadDictionary(kind) {
  const manifestFile = kind === "expanded" ? "manifest.wiktionary-v1.json" : "manifest.enable-v1.json";
  const response = await fetch(`/assets/data/words/${manifestFile}`);
  if (!response.ok) throw new Error("The local dictionary manifest could not be loaded.");
  const manifest = await response.json();
  const chunks = Object.values(manifest.chunks);
  const words = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunkResponse = await fetch(`/assets/data/words/${chunks[index].file}`);
    if (!chunkResponse.ok) throw new Error("A local dictionary file could not be loaded.");
    const text = await decodeResponse(chunkResponse);
    for (const line of text.split(/\r?\n/)) {
      const word = line.split("\t", 1)[0];
      if (word) words.push(word);
    }
    self.postMessage({ type: "progress", phase: "dictionary", completed: index + 1, total: chunks.length });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return words;
}

async function loadLanguageData() {
  const manifestResponse = await fetch("/assets/data/words/anagram-language-v1.json?v=2");
  if (!manifestResponse.ok) throw new Error("Language ranking manifest could not be loaded.");
  const manifest = await manifestResponse.json();
  if (!Array.isArray(manifest.shards) || !manifest.shards.length) throw new Error("Language ranking manifest is invalid.");
  const chunks = await Promise.all(manifest.shards.map(async ({ file }) => {
    const response = await fetch(`/assets/data/words/${file}?v=2`);
    if (!response.ok) throw new Error("Language ranking data could not be loaded.");
    return decodeResponse(response);
  }));
  return chunks.flatMap((chunk) => chunk.split(/\r?\n/).filter(Boolean));
}

async function loadNgramData() {
  const response = await fetch("/assets/data/words/anagram-ngrams-v1.txt.gz?v=3");
  if (!response.ok) throw new Error("Phrase-ranking data could not be loaded.");
  return (await decodeResponse(response)).split(/\r?\n/).filter(Boolean);
}

self.addEventListener("message", async ({ data }) => {
  if (data?.type !== "solve") return;
  try {
    const [words, languageRecords, ngramRecords] = await Promise.all([loadDictionary(data.dictionary), loadLanguageData(), loadNgramData()]);
    self.postMessage({ type: "progress", phase: "search", nodes: 0, nodeLimit: data.options.nodeLimit, found: 0 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    let outcome;
    let engine = "javascript";
    let wasmFailure = "";
    let wasmReady = false;
    try {
      await initWasm({ module_or_path: "/assets/wasm/anagram-architect/anagram_architect_engine_bg.wasm?v=20260912-17" });
      if (!verifyWasmDomain(self.location.hostname)) throw new Error("Anagram Architect is not authorized on this host.");
      initWasmEngine(words);
      initLanguageMetadata(languageRecords);
      initLanguageModel(ngramRecords);
      wasmReady = true;
    } catch (wasmError) {
      wasmFailure = wasmError instanceof Error ? wasmError.message : String(wasmError);
    }
    if (wasmReady) {
      startWasmSearch(data.source, data.options);
      engine = "wasm";
      let step;
      let lastRevision = -1;
      do {
        step = stepWasmSearch(5000);
        self.postMessage({ type: "progress", phase: "search", nodes: step.nodes, nodeLimit: step.nodeLimit, found: step.found, matchesSeen: step.matchesSeen, candidateCount: step.candidateCount, prunedPaths: step.prunedPaths, done: step.done, engine });
        if (!step.done && step.revision !== lastRevision && step.results?.length) self.postMessage({ type: "partial", results: step.results, nodes: step.nodes });
        lastRevision = step.revision;
        if (!step.done) await new Promise((resolve) => setTimeout(resolve, 0));
      } while (!step.done);
      outcome = { results: step.results || [], nodes: step.nodes, truncated: step.truncated };
    } else {
      self.postMessage({ type: "engine", engine: "javascript" });
      outcome = solveAnagrams(data.source, words, {
        ...data.options,
        onProgress(progress) { self.postMessage({ type: "progress", phase: "search", ...progress, engine }); }
      });
    }
    self.postMessage({ type: "complete", outcome, wordCount: words.length, engine, wasmFailure });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Anagram Architect could not complete the search." });
  }
});
