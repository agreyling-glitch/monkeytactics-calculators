import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { gunzipSync } from "node:zlib";

import init, {
  analyze_play,
  analyze_word,
  analyze_wwf_word,
  board_fit_analysis,
  crossword_search,
  dictionary_membership,
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

test("rack results use zero-value blanks for score ordering and score limits", () => {
  init_engine(["axe", "tax"]);
  for (const scoring of ["scrabble", "wwf"]) {
    const options = { dictionaryBit: 1, sortBy: "score-desc", scoring };
    assert.deepEqual(unscramble("tae?", "???", options), ["ate", "eat", "tea", "axe", "tax"]);
    assert.deepEqual(unscramble("tae?", "???", { ...options, minimumScore: 3 }), ["ate", "eat", "tea"]);
    assert.deepEqual(unscramble("tae?", "???", { ...options, maximumScore: 2 }), ["axe", "tax"]);
  }
});

test("play analysis returns the assigned blanks and preserves unplayed tiles", () => {
  assert.deepEqual(analyze_play("CAT", "CA?", "", "wwf"), {
    valid: true, score: 5, blankPositions: [2], boardPositions: [], tilesUsed: 3, leave: "", bingo: false
  });
  assert.deepEqual(analyze_play("tat", "t?xz", "?a?", "wwf"), {
    valid: true, score: 2, blankPositions: [2], boardPositions: [1], tilesUsed: 2, leave: "xz", bingo: false
  });
  assert.deepEqual(analyze_play("tat", "a?t", "t??", "wwf"), {
    valid: true, score: 3, blankPositions: [], boardPositions: [0], tilesUsed: 2, leave: "?", bingo: false
  });
  assert.equal(analyze_play("cat", "c", "?a?", "wwf").valid, false);
  assert.equal(analyze_play("cat", "cat", "c*t", "wwf").valid, false);
});

test("board searches play through fixed letters while retaining independent pattern filters", () => {
  init_engine(["cat", "act", "tat"]);
  const options = { dictionaryBit: 1, boardPattern: "?a?", sortBy: "alpha", scoring: "wwf" };
  assert.deepEqual(unscramble("ct", "", options), ["cat"]);
  assert.deepEqual(unscramble("ct", "a*", options), []);
  assert.deepEqual(unscramble("c?", "c*t", { ...options, maximumScore: 5 }), ["cat"]);
  assert.deepEqual(unscramble("c?", "c*t", { ...options, minimumScore: 6 }), []);
  assert.deepEqual(unscramble("ct", "", { ...options, wordLength: 2 }), []);
  assert.deepEqual(unscramble("ct", "", { ...options, boardPattern: "cat" }), []);
});

test("bingo eligibility counts newly placed tiles, with bonus kept separate", () => {
  const bingo = analyze_play("stainers", "tainers", "s???????", "wwf");
  assert.equal(bingo.bingo, true);
  assert.equal(bingo.tilesUsed, 7);
  assert.equal(bingo.score, 9);
  assert.equal(analyze_play("stainer", "tainer", "s??????", "wwf").bingo, false);
  assert.equal(analyze_play("stainer", "stainer", "", "wwf").bingo, true);
});

test("board fit counts words excluded by the fixed span and positions", () => {
  init_engine(["at", "cats", "cast"]);
  const options = { dictionaryBit: 1, boardPattern: "?a?" };
  assert.deepEqual(board_fit_analysis("cts", "", options), {
    candidates: 5, fitting: 1, excluded: 4
  });
  assert.deepEqual(board_fit_analysis("cts", "a*", options), {
    candidates: 5, fitting: 0, excluded: 5
  });
});

test("membership distinguishes sources, normalizes case, and merges additional shards", () => {
  init_engine(["quizzical\t1", "quizzically\t2", "quizzicality\t3"]);
  assert.equal(dictionary_membership("QUIZZICAL"), 1);
  assert.equal(dictionary_membership("quizzically"), 2);
  assert.equal(dictionary_membership("Quizzicality"), 3);
  assert.equal(dictionary_membership("notawordatall"), 0);
  assert.equal(dictionary_membership(""), 0);
  init_engine(["quizzical\t3", "quizzically\t1"]);
  assert.equal(dictionary_membership("quizzical"), 3);
  assert.equal(dictionary_membership("quizzically"), 3);
  init_engine(["quizzical\t1"]);
  assert.equal(dictionary_membership("quizzical"), 3);
});

test("real Standard records stay ENABLE-only until the combined shard supplies overlap", () => {
  const recordsFor = (name) => gunzipSync(fs.readFileSync(new URL(
    `../assets/data/words/${name}`, import.meta.url,
  ))).toString("utf8").trim().split(/\r?\n/);
  const standard = recordsFor("z.enable-v1.txt.gz");
  const combined = recordsFor("z.wiktionary-v1.txt.gz");
  const overlap = combined.find((record) => record.endsWith("\t3")).split("\t")[0];
  const expandedOnly = combined.find((record) => record.endsWith("\t2")).split("\t")[0];
  const enableOnly = combined.find((record) => record.endsWith("\t1")).split("\t")[0];
  init_engine(standard);
  assert.equal(dictionary_membership(overlap), 1);
  assert.equal(dictionary_membership(expandedOnly), 0);
  assert.equal(dictionary_membership(enableOnly), 1);
  init_engine(combined);
  assert.equal(dictionary_membership(overlap.toUpperCase()), 3);
  assert.equal(dictionary_membership(expandedOnly), 2);
  assert.equal(dictionary_membership(enableOnly), 1);
});
