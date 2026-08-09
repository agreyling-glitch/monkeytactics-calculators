import {
  initializeTextAnalyzer,
  runAnalysis,
  verify_domain,
} from "./text-analyzer-wrapper.js";

let initializationPromise;
let wasmReady = false;

export function initWasmEngine() {
  if (!initializationPromise) {
    initializationPromise = initializeTextAnalyzer()
      .then(function () {
        const host = window.location.hostname;
        if (!verify_domain(host)) {
          console.warn("WASM engine disabled: unapproved domain");
          return false;
        }
        wasmReady = true;
        return true;
      })
      .catch(function (error) {
        console.warn("WASM engine unavailable; using JavaScript fallback", error);
        return false;
      });
  }
  return initializationPromise;
}

export function runWasmAnalysis(text) {
  return wasmReady ? runAnalysis(text) : null;
}

export function isWasmEngineReady() {
  return wasmReady;
}
