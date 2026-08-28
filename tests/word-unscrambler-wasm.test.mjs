import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import init, {
  analyze_word,
  analyze_wwf_word,
  board_fit_analysis,
  crossword_search,
  find_hooks_for_dictionary,
  init_engine,
  score_word,
  score_wwf_word,
  unscramble,
  verify_domain,
  wordle_search
} from "../assets/wasm/word-unscrambler/word_unscrambler_engine.js";

const wasmBytes = fs.readFileSync(new URL(
  "../assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm",
  import.meta.url
));

await init({ module_or_path: wasmBytes });
init_engine(["ate", "eat", "tea", "eats", "ample", "angle", "apple", "allee"]);

test("the browser bridge resolves engine files from the canonical WASM directory", () => {
  const bridge = fs.readFileSync(new URL(
    "../assets/js/tools/word-unscrambler/wasm-bridge.js",
    import.meta.url,
  ), "utf8");

  assert.match(bridge, /`\/assets\/wasm\/word-unscrambler\/word_unscrambler_engine\.js\?v=\$\{ASSET_VERSION\}`/);
  assert.match(bridge, /`\/assets\/wasm\/word-unscrambler\/word_unscrambler_engine_bg\.wasm\?v=\$\{ASSET_VERSION\}`/);
  assert.doesNotMatch(bridge, /`\.\.\/wasm\//);
});

test("authorizes production, Cloudflare Pages, and local Wrangler hosts", () => {
  assert.equal(verify_domain("monkeytactics.com"), true);
  assert.equal(verify_domain("monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("preview.monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("127.0.0.1"), true);
  assert.equal(verify_domain("www.monkeytactics.com"), true);
  assert.equal(verify_domain("localhost"), false);
  assert.equal(verify_domain("evilmonkeytactics-calculators.pages.dev"), false);
});

test("searches, scores, and finds dictionary hooks through WASM", () => {
  const options = { dictionaryBit: 1, sortBy: "alpha" };

  assert.deepEqual(unscramble("a?e", "?a*", options), ["eat"]);
  assert.equal(score_word("quiz"), 22);
  assert.equal(score_wwf_word("quiz"), 23);
  assert.deepEqual(find_hooks_for_dictionary("eat", 1), {
    front: [],
    back: ["s"],
    hasSHook: true,
    total: 1
  });
  assert.deepEqual(board_fit_analysis("a?e", "?a*", options), {
    candidates: 3,
    fitting: 1,
    excluded: 2
  });
});

test("searches crossword patterns without requiring rack letters", () => {
  const options = { dictionaryBit: 1, sortBy: "alpha" };
  assert.deepEqual(crossword_search("???", "", options), ["ate", "eat", "tea"]);
  assert.deepEqual(crossword_search("???", "ate", options), ["ate", "eat", "tea"]);
  assert.deepEqual(crossword_search("???", "at", options), []);
});

test("filters Wordle candidates with duplicate-aware feedback", () => {
  assert.deepEqual(wordle_search([{ word: "allee", feedback: "cpaac" }], 1), ["ample", "angle", "apple"]);
});

test("returns analysis data in the bridge's expected shape", () => {
  const analysis = analyze_word("quiz?");
  const wwfAnalysis = analyze_wwf_word("quiz?");

  assert.equal(analysis.entropyScore, 100);
  assert.equal(analysis.highValueLetters, "qz");
  assert.equal(analysis.tileDistribution.get(1), 2);
  assert.equal(wwfAnalysis.score, 23);
  assert.equal(wwfAnalysis.tileDistribution.get(2), 1);
});
