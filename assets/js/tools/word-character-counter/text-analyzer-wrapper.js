import init, { analyze_text, verify_domain } from "/assets/wasm/text-analyzer/text_analyzer.js";

let initialization;

export async function initializeTextAnalyzer() {
  initialization ??= init({
    module_or_path: "/assets/wasm/text-analyzer/text_analyzer_bg.wasm",
  });
  await initialization;
}

export function runAnalysis(text) {
  return analyze_text(text);
}

export { verify_domain };
