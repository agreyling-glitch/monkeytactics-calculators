import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import init, {
  analyze_word,
  board_fit_analysis,
  find_hooks_for_dictionary,
  init_engine,
  score_word,
  unscramble,
  verify_domain
} from "../assets/wasm/word-unscrambler/word_unscrambler_engine.js";

const wasmBytes = fs.readFileSync(new URL(
  "../assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm",
  import.meta.url
));

await init({ module_or_path: wasmBytes });
init_engine(["ate", "eat", "tea", "eats"]);

test("authorizes production, Cloudflare Pages, and local Wrangler hosts", () => {
  assert.equal(verify_domain("monkeytactics.com"), true);
  assert.equal(verify_domain("monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("preview.monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("127.0.0.1"), true);
  assert.equal(verify_domain("www.monkeytactics.com"), false);
  assert.equal(verify_domain("localhost"), false);
  assert.equal(verify_domain("evilmonkeytactics-calculators.pages.dev"), false);
});

test("searches, scores, and finds dictionary hooks through WASM", () => {
  const options = { dictionaryBit: 1, sortBy: "alpha" };

  assert.deepEqual(unscramble("a?e", "?a*", options), ["eat"]);
  assert.equal(score_word("quiz"), 22);
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

test("returns analysis data in the bridge's expected shape", () => {
  const analysis = analyze_word("quiz?");

  assert.equal(analysis.entropyScore, 100);
  assert.equal(analysis.highValueLetters, "qz");
  assert.equal(analysis.tileDistribution.get(1), 2);
});
