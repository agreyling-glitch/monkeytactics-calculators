const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const moduleSource = fs.readFileSync(
  path.join(__dirname, "../assets/js/tools/word-character-counter/js-analyzer.js"),
  "utf8"
);

async function loadFallback() {
  return import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`);
}

test("JavaScript fallback matches the Rust analyzer result contract", async () => {
  const { analyzeTextWithJavaScript } = await loadFallback();
  const result = analyzeTextWithJavaScript("Quick fox.\n\nQuick dog runs!");

  assert.deepEqual(Object.keys(result), [
    "word_count", "char_count", "char_no_spaces", "sentence_count", "paragraph_count",
    "keyword_frequency", "top_keywords", "readability_scores", "ngram_data", "visualization_data"
  ]);
  assert.equal(result.word_count, 5);
  assert.deepEqual(result.visualization_data.sentence_lengths, [10, 15]);
  assert.deepEqual(result.visualization_data.paragraph_lengths, [10, 15]);
  assert.deepEqual(result.visualization_data.keyword_positions.map(position => position.index), [0, 6, 12, 18, 22]);
});

test("JavaScript fallback mirrors stopwords, density, readability, and n-grams", async () => {
  const { analyzeTextWithJavaScript } = await loadFallback();
  const keywords = analyzeTextWithJavaScript("The quick fox and the quick dog.");
  assert.deepEqual(keywords.keyword_frequency.map(entry => entry.word), ["dog", "fox", "quick"]);
  assert.equal(keywords.top_keywords[0].count, 2);
  assert.ok(Math.abs(keywords.top_keywords[0].density - 28.57143) < 0.001);

  const result = analyzeTextWithJavaScript("Cats run quickly. Dogs play.");
  assert.ok(Math.abs(result.readability_scores.flesch_kincaid + 0.455) < 0.01);
  assert.ok(Math.abs(result.readability_scores.gunning_fog - 1) < 0.01);
  assert.ok(Math.abs(result.readability_scores.smog - 3.1291) < 0.01);
  assert.ok(Math.abs(result.readability_scores.coleman_liau + 1.768) < 0.01);
  const ngrams = analyzeTextWithJavaScript("red fox red fox jumps").ngram_data;
  assert.equal(ngrams.unigrams.red, 2);
  assert.equal(ngrams.bigrams["red fox"], 2);
  assert.equal(ngrams.trigrams["red fox red"], 1);
});

test("JavaScript fallback mirrors multilingual terminators and abbreviation rules", async () => {
  const { analyzeTextWithJavaScript } = await loadFallback();
  const chinese = analyzeTextWithJavaScript("床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。");
  assert.equal(chinese.sentence_count, 2);
  assert.deepEqual(chinese.visualization_data.sentence_lengths, [13, 13]);
  assert.equal(analyzeTextWithJavaScript("Really？ نعم؟ ठीक। Done!").sentence_count, 4);
  assert.equal(analyzeTextWithJavaScript("Mr. Darcy met Dr. Jones at 3.14 p.m. They spoke to J. Smith.").sentence_count, 2);
});

test("parity comparison tolerates f32 noise and reports real differences", async () => {
  const { compareAnalysisResults, median } = await loadFallback();
  assert.equal(compareAnalysisResults({ score: 1 }, { score: 1.000001 }).match, true);
  const comparison = compareAnalysisResults({ count: 2 }, { count: 3 });
  assert.equal(comparison.match, false);
  assert.deepEqual(comparison.differences, [{ path: "count", wasm: 2, javascript: 3 }]);
  assert.equal(median([9, 1, 5, 3]), 4);
});
