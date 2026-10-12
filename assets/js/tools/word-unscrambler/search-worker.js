"use strict";

// This instance owns the dictionary index. The window's WASM instance stays
// available for small, synchronous scoring and analysis calls only.
const ASSET_VERSION = "20261012-solvers-3";
const METHODS = Object.freeze({
  initEngine: "init_engine",
  unscramble: "unscramble",
  crosswordSearch: "crossword_search",
  findHooks: "find_hooks_for_dictionary",
  dictionaryMembership: "dictionary_membership",
  boardFitAnalysis: "board_fit_analysis"
});

const engineReady = (async () => {
  const wasm = await import(`/assets/wasm/word-unscrambler/word_unscrambler_engine.js?v=${ASSET_VERSION}`);
  await wasm.default({
    module_or_path: new URL(`/assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm?v=${ASSET_VERSION}`, self.location.href)
  });
  if (!wasm.verify_domain(self.location.hostname)) throw new Error("Unauthorized domain");
  for (const name of Object.values(METHODS)) {
    if (typeof wasm[name] !== "function") throw new Error(`Missing word search engine export: ${name}`);
  }
  self.postMessage({ type: "ready" });
  return wasm;
})();

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

engineReady.catch((error) => self.postMessage({ type: "fatal", error: errorMessage(error) }));

self.addEventListener("message", async (event) => {
  const { id, method, args } = event.data || {};
  if (!Number.isSafeInteger(id)) return;
  try {
    if (!Object.hasOwn(METHODS, method) || !Array.isArray(args)) {
      throw new Error("Invalid word search worker request.");
    }
    const wasm = await engineReady;
    // Decompressed text crosses the thread boundary once; record creation and
    // dictionary indexing do not block typing, scrolling, or paint in the UI.
    if (method === "initEngine" && typeof args[0] === "string") {
      args[0] = args[0].split(/\r?\n/).filter(Boolean);
    }
    const result = wasm[METHODS[method]](...args);
    self.postMessage({ type: "result", id, result });
  } catch (error) {
    self.postMessage({ type: "error", id, error: errorMessage(error) });
  }
});
