import type { QrResult, QrStyle } from "../types";

interface WasmBindings {
  default: (input: { module_or_path: string | URL }) => Promise<unknown>;
  verify_domain: (host: string) => boolean;
  generate_qr: (request: unknown) => QrResult;
  style_qr: (style: QrStyle) => QrResult;
  export_png: (dpi: number) => Uint8Array;
  export_svg: () => string;
  export_pdf: () => Uint8Array;
  batch_generate: (request: unknown) => { items?: BatchRender[]; error?: string };
}

export interface BatchRender {
  name: string;
  svg: string;
  reliabilityScore: number;
}

export class WasmQrEngine {
  constructor(private readonly wasm: WasmBindings) {}

  verifyDomain(host: string) { return this.wasm.verify_domain(host); }

  generate(data: string, style: QrStyle, ecc = "medium") {
    const result = this.wasm.generate_qr({ data, style, ecc });
    if (result.error) throw new Error(result.error);
    return result;
  }

  style(style: QrStyle) {
    const result = this.wasm.style_qr(style);
    if (result.error) throw new Error(result.error);
    return result;
  }

  exportPng(dpi: number) { return this.wasm.export_png(dpi); }
  exportSvg() { return this.wasm.export_svg(); }
  exportPdf() { return this.wasm.export_pdf(); }

  batch(items: Array<{ name: string; data: string }>, style: QrStyle, ecc = "medium") {
    const output = this.wasm.batch_generate({ items, style, ecc });
    if (output.error) throw new Error(output.error);
    return output.items ?? [];
  }
}

let enginePromise: Promise<WasmQrEngine> | null = null;

export function loadWasmEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const moduleUrl = new URL("/assets/wasm/qr-code-generator/qr_engine.js?v=20260806-60", window.location.origin).href;
    const binaryUrl = new URL("/assets/wasm/qr-code-generator/qr_engine_bg.wasm?v=20260806-60", window.location.origin);
    const wasm = await import(/* @vite-ignore */ moduleUrl) as WasmBindings;
    await wasm.default({ module_or_path: binaryUrl });
    return new WasmQrEngine(wasm);
  })();
  return enginePromise;
}
