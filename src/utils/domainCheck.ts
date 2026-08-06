import type { WasmQrEngine } from "./wasmEngine";

/** Delegates domain authorization to the Rust/WASM verify_domain binding. */
export function verifyRuntimeDomain(engine: WasmQrEngine, host = window.location.hostname) {
  return engine.verifyDomain(host);
}
