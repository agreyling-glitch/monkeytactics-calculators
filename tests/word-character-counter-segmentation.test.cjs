const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const moduleSource = fs.readFileSync(
  path.join(__dirname, "../assets/js/tools/word-character-counter/word-counter.js"),
  "utf8"
);

async function loadAnalyzer() {
  return import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`);
}

test("Intl.Segmenter counts unspaced Chinese and Thai words", async () => {
  const { analyzeText } = await loadAnalyzer();
  const chinese = analyzeText("你好世界");
  const thai = analyzeText("ภาษาไทยภาษาไทย");

  assert.ok(chinese.words > 1, "Chinese text should not be treated as one word");
  assert.ok(thai.words > 1, "Thai text should not be treated as one word");
});

test("Intl.Segmenter handles punctuation, accents, and mixed scripts", async () => {
  const { analyzeText } = await loadAnalyzer();
  const result = analyzeText("Hello—café. 世界! ภาษาไทย");

  assert.ok(result.words >= 5);
  assert.ok(result.topWords.some(entry => entry.word === "café"));
});

test("Unicode regex remains available when Intl.Segmenter is unavailable", async () => {
  const { analyzeText } = await loadAnalyzer();
  const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter");
  Object.defineProperty(Intl, "Segmenter", { configurable: true, value: undefined });
  try {
    const result = analyzeText("don't l’amour 世界");
    assert.equal(result.words, 3);
  } finally {
    Object.defineProperty(Intl, "Segmenter", descriptor);
  }
});

test("language-specific analysis is gated by the detected script", async () => {
  const { detectAnalysisSupport } = await loadAnalyzer();

  assert.deepEqual(detectAnalysisSupport("Clear English prose."), {
    dominantScript: "Latin",
    mixedScripts: false,
    language: "english",
    languageAssumed: true,
    readabilitySupported: true,
    stopwordsSupported: true
  });
  assert.deepEqual(detectAnalysisSupport("床前明月光。"), {
    dominantScript: "Han",
    mixedScripts: false,
    language: "chinese",
    languageAssumed: true,
    readabilitySupported: false,
    stopwordsSupported: true
  });
  assert.equal(detectAnalysisSupport("ภาษาไทย").dominantScript, "Thai");
  const mostlyEnglish = "A clear English sentence with ordinary readable prose. ".repeat(20) + "世界";
  assert.equal(detectAnalysisSupport(mostlyEnglish).readabilitySupported, true);
  assert.equal(detectAnalysisSupport("English 世界 mixed 日本語 text").readabilitySupported, false);
});

test("manual language selection controls stopwords and language readability", async () => {
  const { analyzeText, calculateReadability, detectAnalysisSupport } = await loadAnalyzer();
  const french = analyzeText("Le chat et le chien", { language: "french" });

  assert.equal(detectAnalysisSupport("Le chat", "french").readabilitySupported, true);
  assert.deepEqual(french.topWords.map(entry => entry.word), ["chat", "chien"]);
  assert.equal(detectAnalysisSupport("Plain text", "other").stopwordsSupported, false);
  assert.deepEqual(calculateReadability("Le chat mange la souris.", 1, "french").map(metric => metric.label), ["Kandel–Moles"]);
  assert.deepEqual(calculateReadability("El gato mira la luna.", 1, "spanish").map(metric => metric.label), ["Fernández-Huerta", "Szigriszt-Pazos"]);
  assert.deepEqual(calculateReadability("Der Hund läuft durch den Garten.", 1, "german").map(metric => metric.label), ["Wiener Sachtextformel"]);
  assert.deepEqual(calculateReadability("床前明月光。", 1, "chinese"), []);
});

test("speed profiles use script-appropriate units and counting bases", async () => {
  const { getSpeedProfile, humanizeReadingTime } = await loadAnalyzer();
  const english = getSpeedProfile("Three simple words", 3);
  const chinese = getSpeedProfile("你好世界。", 2);
  const japanese = getSpeedProfile("日本語です。", 3);

  assert.equal(english.unit, "wpm");
  assert.equal(english.amount, 3);
  assert.equal(chinese.unit, "cpm");
  assert.equal(chinese.amount, 4);
  assert.equal(chinese.reading.defaultValue, 300);
  assert.equal(japanese.mode, "japanese-characters");
  assert.equal(japanese.reading.defaultValue, 1100);
  assert.equal(humanizeReadingTime(6_593 * 60 + 56), "4 days 13 hr");
  assert.equal(humanizeReadingTime(10_144 * 60 + 30), "7 days 1 hr");
});
