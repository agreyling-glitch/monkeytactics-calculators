import {
  initializeTextAnalyzer,
  runAnalysis,
  verify_domain,
} from "./text-analyzer-wrapper.js?v=20260907-js-fallback-1";
import {
  analyzeTextWithJavaScript,
  compareAnalysisResults,
  median,
} from "./js-analyzer.js?v=20260907-js-fallback-1";

const localhost = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]).has(self.location.hostname);
const parityDebug = localhost && new URLSearchParams(self.location.search).get("parity") === "1";
const timingHistory = { wasm: [], javascript: [] };
let readyPromise;
let wasmInitializationMs = null;
let wasmError = null;

function initializeWasm() {
  if (!readyPromise) {
    const started = performance.now();
    readyPromise = initializeTextAnalyzer()
      .then(function () {
        if (!verify_domain(self.location.hostname)) throw new Error("Unapproved domain");
        wasmInitializationMs = performance.now() - started;
        return true;
      })
      .catch(function (error) {
        wasmInitializationMs = performance.now() - started;
        wasmError = error instanceof Error ? error.message : String(error);
        return false;
      });
  }
  return readyPromise;
}

function timedJavaScriptAnalysis(text) {
  const started = performance.now();
  const data = analyzeTextWithJavaScript(text);
  return { data, durationMs: performance.now() - started };
}

function rememberTiming(engine, durationMs) {
  timingHistory[engine].push(durationMs);
  if (timingHistory[engine].length > 20) timingHistory[engine].shift();
}

function parityDiagnostics(wasmData, javascriptData, wasmMs, javascriptMs) {
  rememberTiming("wasm", wasmMs);
  rememberTiming("javascript", javascriptMs);
  return {
    ...compareAnalysisResults(wasmData, javascriptData),
    timings: {
      wasmInitializationMs,
      wasmMs,
      javascriptMs,
      deltaMs: javascriptMs - wasmMs,
      ratio: wasmMs > 0 ? javascriptMs / wasmMs : null,
      runs: Math.min(timingHistory.wasm.length, timingHistory.javascript.length),
      wasmMedianMs: median(timingHistory.wasm),
      javascriptMedianMs: median(timingHistory.javascript)
    }
  };
}

self.addEventListener("message", async function (event) {
  const { id, text } = event.data || {};
  if (!Number.isInteger(id) || typeof text !== "string") return;

  const wasmReady = await initializeWasm();
  if (!wasmReady) {
    try {
      const javascript = timedJavaScriptAnalysis(text);
      self.postMessage({
        id, data: javascript.data, engine: "javascript", fallbackReason: wasmError,
        timings: { wasmInitializationMs, javascriptMs: javascript.durationMs }
      });
    } catch (error) {
      self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  try {
    const wasmStarted = performance.now();
    const result = runAnalysis(text);
    const data = result.toJSON();
    result.free();
    const wasmMs = performance.now() - wasmStarted;
    if (!parityDebug) {
      self.postMessage({ id, data, engine: "wasm" });
      return;
    }
    const javascript = timedJavaScriptAnalysis(text);
    self.postMessage({
      id, data, engine: "wasm",
      diagnostics: parityDiagnostics(data, javascript.data, wasmMs, javascript.durationMs)
    });
  } catch (error) {
    try {
      const javascript = timedJavaScriptAnalysis(text);
      self.postMessage({
        id, data: javascript.data, engine: "javascript",
        fallbackReason: error instanceof Error ? error.message : String(error),
        timings: { wasmInitializationMs, javascriptMs: javascript.durationMs }
      });
    } catch (fallbackError) {
      self.postMessage({ id, error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) });
    }
  }
});
