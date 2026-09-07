import init, { analyze_text, analyze_text_with_segments, verify_domain } from "/assets/wasm/text-analyzer/text_analyzer.js?v=20260907-js-fallback-1";

let initialization;

export async function initializeTextAnalyzer() {
  initialization ??= init({
    module_or_path: "/assets/wasm/text-analyzer/text_analyzer_bg.wasm?v=20260907-js-fallback-1",
  });
  await initialization;
}

export function runAnalysis(text) {
  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    const segments = Array.from(segmenter.segment(text))
      .filter(entry => entry.isWordLike)
      .map(entry => ({ word: entry.segment, index: entry.index }));
    return analyze_text_with_segments(text, segments);
  }
  return analyze_text(text);
}

export { verify_domain };
