import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterAndPageResults, formatAnagramPhrase, isExactAnagram, mergeRankedResults, normalizeLetters, normalizeResultPattern, phraseMatchesPattern, rankPhrasePermutations, rankWordReplacements, resultMatchesSearch, solveAnagrams } from "../assets/js/tools/anagram-architect/anagram-core.mjs";
import { mapExactAnagramLetters } from "../assets/js/tools/anagram-architect/anagram-share-reveal.js";

test("normalizes phrase punctuation and case", () => {
  assert.equal(normalizeLetters("A damn alien S.O.B."), "adamnalien sob".replace(" ", ""));
});

test("validates exact phrase anagrams", () => {
  assert.equal(isExactAnagram("Osama Bin Laden", "Old man in a base"), true);
  assert.equal(isExactAnagram("Osama Bin Laden", "Old man near a base"), false);
  assert.equal(isExactAnagram("Acorn Computers", "Crap on customer"), true);
});

test("finds complete multi-word phrases without inventing letters", () => {
  const dictionary = ["old", "man", "in", "base", "noise", "domain", "laden", "bin", "osama"];
  const outcome = solveAnagrams("Osama Bin Laden", dictionary, { maxWords: 5, limit: 20, nodeLimit: 20000 });
  assert.ok(outcome.results.some(({ phrase }) => phrase === "old man in a base"));
  assert.ok(outcome.results.every(({ phrase }) => isExactAnagram("Osama Bin Laden", phrase)));
});

test("excludes the unchanged source phrase from results", () => {
  const outcome = solveAnagrams("Dormitory.", ["dormitory", "dirty", "room"], {
    maxWords: 2,
    minimumLength: 2,
    limit: 20,
    nodeLimit: 10_000
  });
  assert.equal(outcome.results.some(({ phrase }) => phrase === "dormitory"), false);
  assert.equal(outcome.results.some(({ phrase }) => phrase === "dirty room"), true);
});

test("formats Pick List phrases without changing their letters", () => {
  assert.equal(formatAnagramPhrase("customer crap on", { caseMode: "sentence" }), "Customer crap on");
  assert.equal(formatAnagramPhrase("customer crap on", { caseMode: "sentence", boundaryIndex: "" }), "Customer crap on");
  assert.equal(formatAnagramPhrase("customer crap on", { caseMode: "upper", ending: "!" }), "CUSTOMER CRAP ON!");
  assert.equal(formatAnagramPhrase("customer crap on", { caseMode: "lower", separator: "hyphen" }), "customer-crap-on");
  assert.equal(formatAnagramPhrase("customer crap on", { caseMode: "sentence", boundaryIndex: 0, boundaryMark: "colon" }), "Customer: crap on");
  assert.equal(formatAnagramPhrase("the lord of rings", { caseMode: "name" }), "The Lord of Rings");
  assert.ok(isExactAnagram("customer crap on", formatAnagramPhrase("customer crap on", { caseMode: "title", separator: "emDash", ending: "?" })));
});

test("ranks every distinct Pick List word-order permutation", () => {
  const ranked = rankPhrasePermutations("despised drains us the man");
  assert.equal(ranked.length, 120);
  assert.equal(new Set(ranked.map(({ phrase }) => phrase)).size, 120);
  assert.equal(ranked.find(({ phrase }) => phrase === "despised man drains the us")?.rank, 5);
  assert.ok(ranked.every(({ phrase }) => isExactAnagram("despised drains us the man", phrase)));
});

test("does not duplicate permutations when a picked word repeats", () => {
  const ranked = rankPhrasePermutations("one one two");
  assert.equal(ranked.length, 3);
});

test("keeps locked Pick List words in their original positions", () => {
  const ranked = rankPhrasePermutations("crap on customer", 720, [2]);
  assert.deepEqual(new Set(ranked.map(({ phrase }) => phrase)), new Set(["crap on customer", "on crap customer"]));
  assert.ok(ranked.every(({ phrase }) => phrase.split(" ")[2] === "customer"));
});

test("locks repeated words by position rather than spelling", () => {
  const ranked = rankPhrasePermutations("one two one", 720, [0]);
  assert.deepEqual(new Set(ranked.map(({ phrase }) => phrase)), new Set(["one two one", "one one two"]));
});

test("prefers a transitive verb before a determiner-led object", () => {
  const ranked = rankPhrasePermutations("scorn a computer");
  assert.equal(ranked[0]?.phrase, "scorn a computer");
  assert.ok(ranked.findIndex(({ phrase }) => phrase === "computer a scorn") > 0);
});

test("ranks word-order alternatives for seven-word Pro-mode results", () => {
  const ranked = rankPhrasePermutations("portrayed orphaned hit for the next hero");
  assert.equal(ranked.length, 720);
  assert.ok(ranked.some(({ phrase }) => phrase === "portrayed orphaned hero for the next hit"));
  assert.ok(ranked.every(({ phrase }) => isExactAnagram("portrayed orphaned hit for the next hero", phrase)));
});

test("enables long-phrase arranging after enough words are locked", () => {
  const phrase = "one two three four five six seven eight nine ten";
  assert.deepEqual(rankPhrasePermutations(phrase), []);
  const ranked = rankPhrasePermutations(phrase, 720, [0, 9]);
  assert.equal(ranked.length, 720);
  assert.ok(ranked.every(({ phrase: result }) => result.split(" ")[0] === "one" && result.split(" ")[9] === "ten"));
});

test("prefers an imperative nationality phrase over ambiguous reorderings", () => {
  const ranked = rankPhrasePermutations("ignore her german");
  assert.equal(ranked[0]?.phrase, "ignore her german");
  assert.ok(ranked.findIndex(({ phrase }) => phrase === "her german ignore") > 0);
});

test("ranks exact-letter word replacements without changing the rest of a phrase", () => {
  const ranked = rankWordReplacements("despised drains us the man", 1, ["drains", "nadirs", "dinars", "rained", "unrelated"]);
  assert.deepEqual(new Set(ranked.map(({ word }) => word)), new Set(["nadirs", "dinars"]));
  assert.ok(ranked.every(({ phrase }) => isExactAnagram("despised drains us the man", phrase)));
});

test("orders subject pronouns before verbs in the JavaScript fallback", () => {
  const outcome = solveAnagrams("George Bush", ["gore", "he", "bugs"], {
    maxWords: 3,
    minimumLength: 2,
    lockedWords: "gore",
    limit: 20,
    nodeLimit: 20000
  });
  assert.equal(outcome.results[0]?.phrase, "he bugs gore");
});

test("orders copular phrases with inferred adjectives in the JavaScript fallback", () => {
  const outcome = solveAnagrams("William Shakespeare", ["i", "am", "a", "weakish", "speller"], {
    maxWords: 5,
    minimumLength: 1,
    lockedWords: "weakish speller",
    limit: 20,
    nodeLimit: 20000
  });
  assert.equal(outcome.results[0]?.phrase, "i am a weakish speller");
});

test("filters phrases and pages results in groups of 120", () => {
  const results = Array.from({ length: 250 }, (_, index) => ({ phrase: `${index % 2 ? "blue" : "gold"} phrase ${index}` }));
  const secondPage = filterAndPageResults(results, "", 2);
  assert.equal(secondPage.items.length, 120);
  assert.equal(secondPage.start, 121);
  assert.equal(secondPage.end, 240);
  assert.equal(secondPage.totalPages, 3);
  const searched = filterAndPageResults(results, "gold", 1);
  assert.equal(searched.total, 125);
  assert.ok(searched.items.every(({ phrase }) => phrase.includes("gold")));
});

test("merges worker results with stable global ranks and a short-phrase reserve", () => {
  const noisy = Array.from({ length: 1_250 }, (_, index) => ({ phrase: `long phrase number ${index} here`, score: 10_000 - index }));
  const merged = mergeRankedResults([noisy, [{ phrase: "crap on customer", score: 1 }]], 1_200);
  assert.equal(merged.find(({ phrase }) => phrase === "crap on customer")?.rank, 1200);
  assert.deepEqual(merged.slice(0, 3).map(({ rank }) => rank), [1, 2, 3]);
});

test("limits near-duplicate phrase families during the worker merge", () => {
  const merged = mergeRankedResults([[
    { phrase: "up on a term crocs", score: 100 },
    { phrase: "up on a terms croc", score: 99 },
    { phrase: "a term crocs up on", score: 98 },
    { phrase: "crap on customer", score: 97 }
  ]], 4);
  assert.equal(merged.filter(({ phrase }) => phrase.includes("term") && phrase.includes("croc")).length, 1);
  assert.ok(merged.some(({ phrase }) => phrase === "crap on customer"));
});

test("supports Crossword-style result patterns while ignoring phrase spaces", () => {
  assert.equal(normalizeResultPattern("OLD _A.-"), "old?a??");
  assert.equal(resultMatchesSearch("Old man in a base", "old*base"), true);
  assert.equal(resultMatchesSearch("Old man in a base", "old??????????"), true);
  assert.equal(resultMatchesSearch("Old man in a base", "old????base"), false);
  assert.equal(resultMatchesSearch("Old man in a base", "man in"), true);
  const filtered = filterAndPageResults([
    { phrase: "old man in a base" },
    { phrase: "a damn alien sob" }
  ], "a*sob", 1);
  assert.deepEqual(filtered.items.map(({ phrase }) => phrase), ["a damn alien sob"]);
});

test("applies a full phrase pattern before the result limit is reached", () => {
  const dictionary = ["the", "fine", "game", "of", "nil", "life", "meaning", "men", "fig"];
  assert.equal(phraseMatchesPattern("The fine game of nil", "the fine g?me of n*"), true);
  const outcome = solveAnagrams("The meaning of life", dictionary, {
    maxWords: 5,
    pattern: "THE FINE GAME OF NIL",
    limit: 1,
    nodeLimit: 20000
  });
  assert.deepEqual(outcome.results.map(({ phrase }) => phrase), ["the fine game of nil"]);
  assert.equal(outcome.nodes, 0);
});

test("the browser entry point restores and runs phrase query links", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8"));
  assert.match(source, /URLSearchParams\(window\.location\.search\)/);
  assert.match(source, /form\.requestSubmit\(\)/);
});

test("the page prevents early native submission and exposes startup failures", async () => {
  const html = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"));
  assert.match(html, /form\.addEventListener\("submit", \(event\) => event\.preventDefault\(\)\)/);
  assert.match(html, /Anagram Architect could not start/);
  assert.match(html, /anagram-architect\.bundle\.js\?v=20260919-20/);
});

test("shows phrase validation failures in an accessible modal", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="anagram-validation-modal"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(source, /showValidationError\(message/);
  assert.match(source, /Enable experimental Pro mode to search phrases containing up to 60 letters\./);
});

test("offers an experimental hardware-aware Pro mode for long phrases", async () => {
  const [html, source, worker] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-worker.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="anagram-pro-mode"/);
  assert.match(html, /id="anagram-pro-recommendation"[^>]*aria-live="polite"/);
  assert.equal((html.match(/data-pro-option/g) || []).length, 2);
  assert.match(source, /const maximumLetters = proMode\.checked \? 60 : 30/);
  assert.match(source, /navigator\.deviceMemory/);
  assert.match(source, /usesProMode && letterCount > 30/);
  assert.match(html, /id="anagram-time-budget"/);
  assert.match(html, /<option value="120">120 seconds<\/option>/);
  assert.match(source, /mode === "exhaustive" \? 120000 : mode === "deep" \? 60000 : 15000/);
  assert.match(source, /\{ workerCount: 1, nodeLimit: expanded \? 240000 : 140000 \}/);
  assert.match(source, /deterministicCore: shortPhraseSpecialist/);
  assert.match(source, /time budget reached/);
  assert.match(source, /hardTimeout = setTimeout\(finishTimedOut, options\.timeLimitMs \+ 2000\)/);
  assert.match(source, /startBudget\(\)/);
  assert.match(source, /deadlineEpochMs = Date\.now\(\) \+ options\.timeLimitMs \+ 2000/);
  assert.match(source, /resolve\(\{ outcome: \{ results: mergedResults, nodes, truncated: true, timeLimited: true \}/);
  assert.match(source, /return \{ \.\.\.standard, timeLimitMs: baseTimeMs \}/);
  assert.match(source, /Number\(maxWords\.value\) >= 6/);
  assert.match(source, /Six-word searches create a much larger search space/);
  assert.match(worker, /deadlineEpochMs: data\.options\.timeLimitMs \? Date\.now\(\) \+ data\.options\.timeLimitMs : 0/);
  assert.match(worker, /Boolean\(step\.timeLimited\)/);
  assert.match(worker, /stepBudget = data\.options\.timeLimitMs \? 100 : 5000/);
  assert.match(worker, /now - lastProgressAt >= 200/);
  assert.match(worker, /now - lastPartialAt >= 1000/);
  assert.match(worker, /step\.revision !== lastPartialRevision/);
  assert.match(worker, /lastPartialRevision = step\.revision/);
  assert.match(source, /currentSource = source;[\s\S]*await solveInWorker/);
  assert.match(source, /requestId === searchRequestId/);
  assert.match(worker, /type: "engine", engine: "wasm"/);
  assert.match(worker, /data\.options\.customWords \|\| \[\]/);
  assert.match(worker, /searchOptions\.deadlineEpochMs - Date\.now\(\)/);
  assert.match(worker, /timeLimitMs: remainingTimeMs/);
  assert.match(worker, /downloadConcurrency = Math\.min\(8, chunks\.length\)/);
  assert.match(worker, /return chunkWords\.flat\(\)/);
});

test("the JavaScript fallback enforces the wall-clock search budget", async () => {
  const source = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-core.mjs", import.meta.url), "utf8");
  assert.match(source, /const searchStarted = performance\.now\(\)/);
  assert.match(source, /performance\.now\(\) - searchStarted >= timeLimitMs/);
  assert.match(source, /return \{ results, nodes, truncated, timeLimited \}/);
});

test("provides accessible clear buttons for every text entry field", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8")
  ]);
  assert.equal((html.match(/data-clear-input=/g) || []).length, 8);
  assert.equal((html.match(/class="anagram-input-clear"/g) || []).length, 8);
  assert.match(source, /function syncInputClearButtons/);
  assert.match(source, /field\.dispatchEvent\(new Event\("input"/);
});

test("the result toolbar loads the cache-busted responsive stylesheet", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/css/tools/anagram-architect.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /anagram-architect\.css\?v=20260919-20/);
  assert.match(css, /\.anagram-pick-drawer-content > \.anagram-pick-permutations \{[^}]*height: 100%/);
  assert.match(css, /\.anagram-pick-drawer-content > \.anagram-pick-permutations select \{[^}]*height: 100%/);
  assert.match(html, /id="anagram-result-search"/);
  assert.match(html, /id="anagram-previous-page"/);
  assert.match(html, /id="anagram-next-page"/);
});

test("shows all local definitions beneath the Words-tab chips", async () => {
  const [html, source, css] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/css/tools/anagram-architect.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /shared\/word-definitions\.js/);
  assert.match(source, /MonkeyTacticsWordDefinitions\?\.lookup\(word, \{ allowRemote: false \}\)/);
  assert.match(source, /Select a word to see all of its local definitions\./);
  assert.match(source, /flatMap\(\(\{ defs = \[\] \}\) => defs\)/);
  assert.match(source, /definitionContent\.replaceChildren\(list\)/);
  assert.equal((source.match(/Definition: \$\{titleCase\(word\)\}/g) || []).length, 2);
  assert.match(source, /showReplacementDefinitions\(selected\.word\)/);
  assert.match(source, /replacementDefinition\.replaceChildren\(header, content\)/);
  assert.match(source, /Merriam-Webster/);
  assert.match(source, /openDictionaryDirectory\(button\.dataset\.word, button\)/);
  assert.match(source, /The selected service opens in a new tab/);
  assert.match(css, /\.anagram-pick-word-buttons \{[^}]*padding-top: \.5rem/);
  assert.match(css, /\.anagram-pick-word-definitions/);
  assert.match(css, /\.anagram-pick-replacement-definition/);
});

test("uses the optimized Anagram Architect artwork as the hero badge", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const badge = await readFile(new URL("../assets/images/anagram-architect-hero-badge.png", import.meta.url));
  assert.match(html, /class="anagram-hero-badge"[^>]*anagram-architect-hero-badge\.png/);
  assert.match(html, /width="320" height="338"/);
  assert.ok(badge.length > 10000);
});

test("keeps advanced generation options collapsed by default", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  assert.match(html, /<details class="anagram-advanced-options" id="anagram-advanced-options">/);
  assert.doesNotMatch(html, /<details class="anagram-advanced-options"[^>]*\sopen(?:\s|>)/);
  assert.match(html, /<summary><span>Advanced options<\/span>/);
  assert.match(html, /id="anagram-reset-advanced"/);
  assert.ok(html.indexOf("Load an example:") < html.indexOf('id="anagram-advanced-options"'));
});

test("can reset advanced controls without clearing the source phrase", async () => {
  const source = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8");
  assert.match(source, /function resetAdvancedOptions/);
  assert.match(source, /dictionary\.value = "standard"/);
  assert.match(source, /searchMode\.value = "deep"/);
  assert.match(source, /maxWords\.value = "5"/);
  assert.match(source, /minimumLength\.value = "2"/);
  assert.match(source, /excludeVulgar\.checked = true/);
  assert.match(source, /proMode\.checked = false/);
  assert.match(source, /resetAdvanced\.addEventListener\("click"/);
});

test("offers grammatical phrase templates as search constraints", async () => {
  const [html, browser, css] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/css/tools/anagram-architect.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="anagram-grammar-template"/);
  assert.match(html, /<details class="anagram-grammar-control" id="anagram-grammar-control"><summary>/);
  assert.doesNotMatch(html, /id="anagram-grammar-control"[^>]*\sopen(?:\s|>)/);
  assert.equal((html.match(/data-grammar-template=/g) || []).length, 6);
  assert.match(html, /class="anagram-grammar-picker" role="group"/);
  assert.match(browser, /grammarTemplateButtons\.forEach/);
  assert.match(browser, /grammarControl\.open = false/);
  assert.match(css, /\.anagram-grammar-picker button\[aria-pressed="true"\]/);
  assert.match(html, /\[Noun\] of \[Noun\]/);
  assert.match(html, /\[Verb\] the \[Noun\]/);
  assert.match(html, /\[Adjective\] \[Noun\]/);
  assert.match(html, /\[Noun\] in the \[Noun\]/);
  assert.match(browser, /grammarTemplate: grammarValue/);
  assert.match(browser, /containsRequiredLetters\(source, templateLiterals\)/);
  assert.match(browser, /No exact phrases matched the selected grammar template/);
  assert.match(browser, /complete \? "No matching phrase found"/);
  assert.match(html, /value="custom">Custom template builder/);
  assert.match(html, /id="anagram-template-slots"/);
  assert.match(html, /id="anagram-custom-slot-type"/);
  assert.match(browser, /function selectedGrammarTemplate/);
  assert.match(browser, /customGrammarSlots\.length >= 10/);
  assert.match(browser, /function moveCustomTemplateSlot/);
  assert.match(browser, /addEventListener\("dragstart"/);
  assert.match(browser, /addEventListener\("pointermove"/);
  assert.match(html, /press Alt \+ Left or Right Arrow/);
  assert.match(browser, /event\.altKey/);
  assert.match(css, /\.anagram-template-add > label\[hidden\] \{ display: none; \}/);
});

test("offers Acorn Computers as a quality example", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  assert.match(html, /data-anagram-example="Acorn Computers"/);
});

test("offers parallel Quick, Deep, and Exhaustive search modes", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const browser = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8");
  assert.match(html, /id="anagram-search-mode"/);
  assert.match(html, /value="quick"/);
  assert.match(html, /value="deep" selected/);
  assert.match(html, /value="exhaustive"/);
  assert.match(browser, /hardwareConcurrency/);
  assert.match(browser, /shardIndex/);
  assert.match(browser, /shardCount/);
});

test("loads expanded dictionary chunks without an oversized argument spread", async () => {
  const worker = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-worker.js", import.meta.url), "utf8");
  assert.doesNotMatch(worker, /words\.push\(\.\.\./);
  assert.match(worker, /for \(const line of text\.split/);
});

test("renders live graphical worker and throughput telemetry", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const browser = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8");
  assert.match(html, /id="anagram-analysis"/);
  assert.match(html, /id="anagram-worker-lanes"/);
  assert.match(html, /id="anagram-throughput-chart"/);
  assert.match(html, /id="anagram-throughput-rate"[^>]*aria-live="polite"/);
  assert.match(html, /Recent search speed measured in branches explored per second/);
  assert.match(browser, /function workerRoleLabel/);
  assert.match(browser, /short-phrase/);
  assert.match(browser, /compact-phrase/);
  assert.match(browser, /core \+ general 1\/\$\{generalCount\}/);
  assert.match(html, /id="anagram-current-leader"/);
  assert.match(html, /id="anagram-analysis-cancel"/);
  assert.match(browser, /function drawThroughput/);
  assert.match(browser, /throughputRate\.textContent/);
  assert.match(browser, /until budget exhausted/);
  assert.match(html, /faster hardware may explore more combinations/);
  assert.match(browser, /matchesSeen/);
  assert.match(browser, /prunedPaths/);
});

test("keeps a humorous session tally of stopped WASM workers", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="anagram-worker-harm-count"/);
  assert.match(html, /nothing was literally harmed/);
  assert.match(source, /sessionStorage\.getItem\(WORKER_HARM_STORAGE_KEY\)/);
  assert.match(source, /No WASM workers harmed this session\. Yet\./);
  assert.match(source, /data\.outcome\.timeLimited/);
  assert.match(source, /countStoppedWorkers/);
  assert.match(source, /countedHarm\.has\(index\)/);
  assert.match(source, /completedShards\.has\(index\)/);
});

test("phrase-pattern searches expose an accessible progress modal", async () => {
  const [{ readFile }, html] = await Promise.all([
    import("node:fs/promises"),
    import("node:fs/promises").then(({ readFile }) => readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"))
  ]);
  const source = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8");
  assert.match(html, /id="anagram-progress-modal"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /id="anagram-progress-cancel"/);
  assert.match(html, /id="anagram-progress-background"/);
  assert.match(source, /Boolean\(phrasePattern\.value\.trim\(\) \|\| grammarValue\)/);
  assert.match(source, /if \(showsProgressModal\) hidePatternProgress\(\)/);
  assert.match(source, /new Worker\("\/assets\/js\/tools\/anagram-architect\/anagram-worker\.bundle\.js/);
  assert.match(source, /worker\.terminate\(\)/);
  assert.match(source, /progressBackground\.addEventListener\("click"/);
});

test("the solver emits bounded search progress", () => {
  const updates = [];
  solveAnagrams("Osama Bin Laden", ["old", "man", "in", "a", "base"], {
    maxWords: 5,
    nodeLimit: 20000,
    progressInterval: 1,
    onProgress: (progress) => updates.push(progress)
  });
  assert.ok(updates.length > 0);
  assert.ok(updates.every(({ nodes, nodeLimit }) => nodes <= nodeLimit));
});

test("required words are reserved before remaining letters are solved", () => {
  const dictionary = ["old", "man", "in", "a", "base", "domain", "laden"];
  const outcome = solveAnagrams("Osama Bin Laden", dictionary, { maxWords: 5, minimumLength: 1, lockedWords: "old, base", limit: 20, nodeLimit: 20000 });
  assert.ok(outcome.results.length > 0);
  assert.ok(outcome.results.every(({ phrase }) => phrase.includes("old") && phrase.includes("base")));
});

test("a literal phrase pattern cannot bypass required words", () => {
  assert.throws(() => solveAnagrams("The meaning of life", ["the", "fine", "game", "of", "nil", "life"], {
    maxWords: 5, minimumLength: 1, pattern: "The fine game of nil", lockedWords: "life"
  }), /does not contain every required word/);
});

test("preferred and excluded words steer generation", () => {
  const dictionary = ["old", "man", "in", "a", "base", "domain", "laden", "bin", "osama"];
  const baseline = solveAnagrams("Osama Bin Laden", dictionary, { maxWords: 5, minimumLength: 1, limit: 20, nodeLimit: 20000 });
  const preferred = solveAnagrams("Osama Bin Laden", dictionary, { maxWords: 5, minimumLength: 1, preferredWords: "base", limit: 20, nodeLimit: 20000 });
  assert.ok(preferred.results.find(({ phrase }) => phrase.includes("base")).score > baseline.results.find(({ phrase }) => phrase.includes("base")).score);
  const excluded = solveAnagrams("Osama Bin Laden", dictionary, { maxWords: 5, minimumLength: 1, excludedWords: "base", limit: 20, nodeLimit: 20000 });
  assert.ok(excluded.results.every(({ phrase }) => !phrase.split(" ").includes("base")));
});

test("vulgar filtering is enabled by default and can be disabled", () => {
  const filtered = solveAnagrams("hits", ["shit"], { maxWords: 1, minimumLength: 2 });
  const allowed = solveAnagrams("hits", ["shit"], { maxWords: 1, minimumLength: 2, excludeVulgar: false });
  assert.equal(filtered.results.length, 0);
  assert.equal(allowed.results[0]?.phrase, "shit");
});

test("offers word steering, vulgar filtering, and a persistent Pick List", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const browser = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8");
  assert.match(html, /id="anagram-preferred-words"/);
  assert.match(html, /id="anagram-excluded-words"/);
  assert.match(html, /id="anagram-exclude-vulgar"[^>]*checked/);
  assert.match(html, /id="anagram-personal-vocabulary"[^>]*maxlength="15000"/);
  assert.match(html, /id="anagram-personal-vocabulary-count"/);
  assert.match(browser, /PERSONAL_VOCABULARY_STORAGE_KEY/);
  assert.match(browser, /unique\.slice\(0, 500\)/);
  assert.match(browser, /customWords: personalWords\.words/);
  assert.match(browser, /personal vocabulary/);
  assert.match(html, /<strong>Pick List<\/strong>/);
  assert.match(browser, /monkeytactics\.anagram-architect\.pick-list\.v1/);
  assert.match(browser, /localStorage\.setItem/);
  assert.match(browser, /Copy \$\{entry\.phrase\}/);
  assert.match(browser, /navigator\.clipboard\.writeText\(formatAnagramPhrase\(entry\.phrase, entry\.formatOptions\)\)/);
  assert.match(browser, /rankPhrasePermutations\(entry\.phrase, 720, \[\.\.\.locked\]\)/);
  assert.match(browser, /select\.value = entry\.phrase\.toLowerCase\(\)/);
  assert.match(browser, /const selectedPhrase = select\.value \|\| entry\.phrase/);
  assert.match(browser, /select\.addEventListener\("dblclick", applySelectedOrder\)/);
  assert.match(browser, /Copy formatted/);
  assert.match(browser, /Use this order/);
  assert.match(browser, /rankWordReplacements\(entry\.phrase, wordIndex/);
  assert.match(browser, /openPickDrawer/);
  assert.match(browser, /Use replacement/);
  assert.match(html, /id="anagram-pick-drawer"[^>]*role="dialog"/);
  assert.match(browser, /\["Arrange", buildPermutationPanel\(entry\)\]/);
  assert.match(browser, /\["Words", buildWordSwapPanel\(entry\)\]/);
  assert.match(browser, /\["Style", buildFormatPanel\(entry\)\]/);
  assert.match(browser, /Close reorder mode/);
  assert.match(browser, /Close word swap mode/);
  assert.match(browser, /lockedPositions/);
  assert.match(browser, /Lock words in position/);
  assert.match(browser, /const moveLockedWord = \(fromIndex, targetIndex, before = true\)/);
  assert.match(browser, /button\.draggable = isLocked/);
  assert.match(browser, /pointerLockedDrag/);
  assert.match(browser, /markLockedDrop/);
  assert.match(browser, /anagramphrasechange/);
  assert.match(browser, /\[\[1, buildWordSwapPanel\], \[2, buildFormatPanel\]\]/);
  assert.match(browser, /previous\.replaceWith\(replacement\)/);
  assert.match(browser, /drag a locked word between the other words/);
  assert.match(browser, /Word-order alternatives unavailable/);
  assert.match(browser, /Lock at least \$\{locksNeeded\} more word/);
  assert.doesNotMatch(browser, /Locked \$\{word\}.*press Left or Right Arrow/);
  assert.match(browser, /formatAnagramPhrase/);
  assert.match(browser, /Style capitalization and punctuation/);
  assert.match(browser, /Reset formatting/);
  assert.match(browser, /anagramformatchange/);
  assert.match(browser, /rowPhrase\.textContent = detail\.formattedPhrase/);
  assert.match(browser, /const wasSelected = button\.getAttribute\("aria-pressed"\) === "true"/);
  assert.match(browser, /Choose a word to see exact-letter alternatives/);
  assert.doesNotMatch(browser, /button\.disabled = locked\.has\(wordIndex\)/);
});

test("maps repeated reveal letters deterministically by occurrence", () => {
  const mapping = mapExactAnagramLetters("A sea", "Aase");
  assert.deepEqual(mapping.map(({ identity }) => identity), ["a-0", "s-0", "e-0", "a-1"]);
  assert.deepEqual(mapping.map(({ destination }) => destination?.identity), ["a-0", "s-0", "e-0", "a-1"]);
  assert.deepEqual(mapping.filter(({ key }) => key === "a").map(({ destination }) => destination.textIndex), [0, 1]);
});

test("stores reproducible versioned Pick List recipes", async () => {
  const [html, browser] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8")
  ]);
  assert.match(browser, /RECIPE_SCHEMA_VERSION = 1/);
  assert.match(browser, /RECIPE_DICTIONARY_VERSIONS/);
  assert.match(browser, /RECIPE_RANKING_VERSION/);
  assert.match(browser, /relevantPersonalVocabulary: personalWords\.words\.filter/);
  assert.match(browser, /grammarTemplateSelection: grammarTemplate\.value/);
  assert.match(browser, /customGrammarSlots: cloneRecipe\(customGrammarSlots\)/);
  assert.match(browser, /budgetReached: Boolean\(outcome\.timeLimited\)/);
  assert.match(browser, /currentSearchRecipe = createSearchRecipe\(source, options, grammarValue, personalWords, requestId\)/);
  assert.match(browser, /entry\.recipe\?\.discovery\?\.requestId !== requestId/);
  assert.match(browser, /completeSearchRecipe\(requestId, outcome, durationMs, engine, workerCount\)/);
  assert.match(browser, /recipe: recipeForResult\(result\)/);
  assert.match(browser, /currentPhrase: entry\.phrase/);
  assert.match(browser, /replacements\.push/);
  for (const action of ["View recipe", "Restore settings", "Run again", "Copy recipe", "Share find"]) assert.match(browser, new RegExp(action));
  assert.match(browser, /openAnagramReveal/);
  assert.match(browser, /form\.requestSubmit\(\)/);
  assert.match(browser, /setRecipeDialogTab\("overview"\)/);
  assert.match(browser, /button\.textContent = name === "overview" \? "Overview" : "JSON"/);
  for (const section of ["Phrase", "Tune the search", "Search guidance", "Search run", "Phrase Studio edits", "Versions"]) assert.match(browser, new RegExp(section));
  assert.match(browser, /Legacy pick: its original search settings were not recorded/);
  assert.match(html, /reproducible search recipes|versioned discovery recipe/);
});

test("imports and validates shared Pick List recipes", async () => {
  const [html, browser, css] = await Promise.all([
    readFile("tools/anagram-architect.html", "utf8"),
    readFile("assets/js/tools/anagram-architect/anagram-architect.js", "utf8"),
    readFile("assets/css/tools/anagram-architect.css", "utf8")
  ]);
  assert.match(html, /id="anagram-pick-import"[^>]*>Import recipe/);
  assert.match(html, /anagram-recipe-file-button">Choose recipe file/);
  assert.match(html, /id="anagram-recipe-file-name">No file selected/);
  assert.match(html, /id="anagram-recipe-import-file"[^>]*accept="application\/json,.json"/);
  assert.match(html, /id="anagram-recipe-import-json"/);
  assert.match(html, /id="anagram-recipe-import-confirm"[^>]*disabled>Add to Pick List/);
  assert.match(browser, /function validateImportedRecipe/);
  assert.match(browser, /value\.schemaVersion !== RECIPE_SCHEMA_VERSION/);
  assert.match(browser, /!isExactAnagram\(sourcePhrase, resultPhrase\)/);
  assert.match(browser, /text\.length > 250000/);
  assert.match(browser, /function importPendingRecipe/);
  assert.match(browser, /recipeImportFileName\.textContent = file\?\.name \|\| "No file selected"/);
  assert.match(browser, /pickEntries\.unshift\(entry\)/);
  assert.match(css, /\.anagram-recipe-import-preview\[data-state="ready"\]/);
  assert.match(css, /\.anagram-recipe-file-button/);
  assert.match(html, /Import a copied recipe or JSON file/);
});

test("dismisses Pick List recipe menus outside the action control", async () => {
  const [source, css] = await Promise.all([
    readFile("assets/js/tools/anagram-architect/anagram-architect.js", "utf8"),
    readFile("assets/css/tools/anagram-architect.css", "utf8")
  ]);
  assert.match(source, /function closePickActionMenus/);
  assert.match(source, /if \(!event\.target\.closest\?\.\("\.anagram-pick-more"\)\) closePickActionMenus\(\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /listBounds\.bottom - toggleBounds\.bottom < menuHeight \+ 8/);
  assert.match(css, /\.anagram-pick-more-menu\.opens-up \{[^}]*bottom: calc\(100% \+ \.35rem\)/);
  assert.match(css, /\.anagram-recipe-modal \{[^}]*overflow: hidden/);
  assert.match(css, /\.anagram-recipe-card \{[^}]*grid-template-rows: auto auto auto minmax\(0,1fr\)/);
  assert.match(css, /\.anagram-recipe-card pre \{[^}]*min-height: 0;[^}]*overflow: auto/);
});

test("offers a local animated exact-anagram sharing studio", async () => {
  const [browser, reveal, css] = await Promise.all([
    readFile("assets/js/tools/anagram-architect/anagram-architect.js", "utf8"),
    readFile("assets/js/tools/anagram-architect/anagram-share-reveal.js", "utf8"),
    readFile("assets/css/tools/anagram-architect.css", "utf8")
  ]);
  assert.match(browser, /openAnagramReveal/);
  for (const label of ["Fly", "Blueprint", "Wand", "Shuffle", "Magnetic", "Typewriter", "Calm", "Normal", "Dramatic", "Download WebM", "Download static card", "Copy post text", "Copy animation link", "Share…"]) assert.match(reveal, new RegExp(label));
  assert.match(reveal, /optionSelect\(\[\["blueprint", "Blueprint"\], \["wand", "Wand"\], \["fly", "Fly"\]/);
  assert.match(reveal, /Every letter moves\. Nothing appears\. Nothing disappears\./);
  assert.match(reveal, /canvas\.captureStream\(30\)/);
  assert.match(reveal, /new MediaRecorder/);
  assert.match(reveal, /prefers-reduced-motion: reduce/);
  assert.match(reveal, /REVEAL_SIZE = Object\.freeze\(\[960, 540\]\)/);
  assert.match(reveal, /LOOP_PAUSE_MS = 1500/);
  assert.match(reveal, /brandedPngBlob/);
  assert.match(reveal, /brandedWebmBlob/);
  assert.doesNotMatch(reveal, /Square · 1:1|Portrait · 4:5|Landscape · 16:9|preview\.textContent = "Preview"/);
  assert.doesNotMatch(reveal, /pngTextChunk\("Comment"/);
  assert.match(reveal, /drawBranding/);
  assert.match(reveal, /drawParticles/);
  assert.match(reveal, /drawWand/);
  assert.match(reveal, /drawWandFlash/);
  assert.match(reveal, /drawBlueprintGrid/);
  assert.match(reveal, /drawBlueprintGuides/);
  assert.match(reveal, /drawInspectionSweep/);
  assert.match(reveal, /drawStaticComparison/);
  assert.match(reveal, /fillText\("BEFORE"/);
  assert.match(reveal, /fillText\("AFTER"/);
  assert.match(reveal, /const postText = \(\) => `\$\{sourcePhrase\} → \$\{resultPhrase\}\\n\\nMade by Anagram Architect`/);
  assert.match(reveal, /navigator\.share\(\{ title: "Exact anagram reveal", text: postText\(\), url \}\)/);
  assert.match(reveal, /url\.searchParams\.set\("focus", "1"\)/);
  assert.doesNotMatch(reveal, /navigator\.canShare\?\.\(\{ files:/);
  assert.match(reveal, /WebM export progress/);
  assert.match(reveal, /readEbmlSize/);
  assert.match(reveal, /webmSimpleTag\("ARTIST", BRAND_NAME\)/);
  assert.match(reveal, /https:\/\/monkeytactics\.com\/tools\/anagram-architect/);
  assert.doesNotMatch(reveal, /Show in reveal|Exact-match badge|Recipe summary/);
  assert.match(css, /\.anagram-reveal-modal/);
});

test("offers a standalone exact-anagram animator with compact URL recipes", async () => {
  const [html, browser, css, buildScript, sitemap, headers] = await Promise.all([
    readFile("tools/anagram-animator.html", "utf8"),
    readFile("assets/js/tools/anagram-animator/anagram-animator.js", "utf8"),
    readFile("assets/css/tools/anagram-animator.css", "utf8"),
    readFile("scripts/build-anagram-architect.mjs", "utf8"),
    readFile("sitemap-tools.xml", "utf8"),
    readFile("_headers", "utf8")
  ]);
  assert.match(html, /Animate an exact anagram/);
  assert.match(html, /anagram-animator\.bundle\.js\?v=20260919-03/);
  assert.match(html, /anagram-animator\.css\?v=20260919-04/);
  assert.match(html, /id="anagram-animator-embed"[^>]*>Copy embed code/);
  assert.match(html, /id="anagram-animator-focus"[^>]*>Focus mode/);
  assert.match(html, /classList\.add\("animator-embed"\)/);
  assert.match(html, /classList\.add\("animator-focus"\)/);
  assert.match(browser, /url\.searchParams\.set\("from", values\.source\)/);
  assert.match(browser, /url\.searchParams\.set\("to", values\.result\)/);
  assert.match(browser, /source === letters\(resultInput\.value\)/);
  assert.match(browser, /prefers-reduced-motion: reduce/);
  assert.match(browser, /renderAnagramAnimationFrame/);
  assert.match(browser, /url\.searchParams\.set\("embed", "1"\)/);
  assert.match(browser, /shareUrl\(\{ focus: true \}\)/);
  assert.match(browser, /event\.key === "Escape"/);
  assert.match(browser, /<iframe src=/);
  assert.match(css, /aspect-ratio: 16\/9/);
  assert.match(css, /html\.animator-embed \.animator-form/);
  assert.match(css, /html\.animator-focus \.animator-form/);
  assert.match(buildScript, /anagram-animator\.bundle\.js/);
  assert.match(sitemap, /https:\/\/monkeytactics\.com\/tools\/anagram-animator/);
  assert.match(headers, /\/tools\/anagram-animator\*[\s\S]*?! X-Frame-Options[\s\S]*?frame-ancestors \*/);
});

test("provides a working responsive iframe embed demonstration", async () => {
  const html = await readFile("tools/anagram-animator-embed-demo.html", "utf8");
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /<iframe[\s\S]*?anagram-animator\?from=Osama%20Bin%20Laden/);
  assert.match(html, /embed=1/);
  assert.match(html, /aspect-ratio: 16\/9/);
  assert.match(html, /Open the full interactive animator/);
});

test("groups advanced controls and supports shared Focus Mode", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../assets/css/tools/anagram-architect.css", import.meta.url), "utf8");
  assert.match(html, /data-focus-mode data-focus-mode-label="Anagram Architect"/);
  assert.match(html, /assets\/css\/shared\/focus-mode\.css\?v=/);
  assert.match(html, /assets\/js\/shared\/focus-mode\.js\?v=/);
  assert.match(html, /id="anagram-pattern-heading">Shape the phrase/);
  assert.match(html, /id="anagram-words-heading">Guide the vocabulary/);
  assert.match(html, /id="anagram-search-heading">Tune the search/);
  assert.match(css, /\.anagram-advanced-body \{[^}]*gap: 1rem;[^}]*padding: 1\.15rem;/s);
  assert.match(css, /\.anagram-workbench\.is-focus-mode/);
});

test("uses the full page content rail without an advertisement", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../assets/css/tools/anagram-architect.css", import.meta.url), "utf8");
  assert.doesNotMatch(html, /class="ad-container"/);
  assert.doesNotMatch(html, /assets\/js\/shared\/ads\.js/);
  assert.match(css, /\.anagram-shell \{[^}]*width: 100%;[^}]*max-width: none;/s);
  assert.match(css, /\.anagram-explainer \{[^}]*width: 100%;[^}]*max-width: none;/s);
  assert.match(css, /\.anagram-workbench > header \{[^}]*margin: 0;/s);
});

test("publishes useful SEO metadata, structured data, and supporting content", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../sitemap-tools.xml", import.meta.url), "utf8");
  assert.match(html, /<title>Anagram Solver &amp; Phrase Generator/);
  assert.match(html, /<meta name="description" content="Find exact name and phrase anagrams/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /class="breadcrumb anagram-breadcrumb"/);
  assert.match(html, /<h1 id="anagram-title">Anagram Solver for Names and Phrases<\/h1>/);
  assert.match(html, /Build exact phrase anagrams, not approximate matches/);
  assert.match(html, /Language-aware search/);
  assert.match(html, /estimates readability and naturalness using word frequency, grammar, local phrase evidence, word order, and phrase shape/i);
  assert.match(html, /Exactness is guaranteed, but ranking is an estimate/);
  assert.match(html, /Search long anagrams up to 60 letters/);
  assert.match(html, /Guided search:<\/strong> enable Pro mode, set Maximum words to 8/);
  assert.match(html, /portrayed, orphaned, hero/);
  assert.match(html, /Add names and specialist vocabulary/);
  assert.match(html, /Reproduce, refine, and share anagram finds/);
  assert.match(html, /compare local WordNet definitions for original and replacement words/);
  assert.match(html, /Why did my search return no results\?/);
  assert.match(html, /Anagram solver FAQ/);
  assert.match(html, /Related word tools/);
  assert.match(sitemap, /<loc>https:\/\/monkeytactics\.com\/tools\/anagram-architect<\/loc>\s*<lastmod>2026-09-19<\/lastmod>/);
  assert.match(html, /Standard contains 172,820 words/);
  assert.match(html, /Expanded contains 867,177 Wiktionary-derived words/);
  const structured = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  const data = JSON.parse(structured);
  const application = data["@graph"].find((entry) => entry["@type"] === "WebApplication");
  assert.ok(application);
  assert.ok(application.featureList.includes("Language-aware multi-word ranking"));
  assert.ok(application.featureList.includes("Visual and custom grammar templates"));
  assert.ok(application.featureList.includes("Experimental 31–60 letter Pro mode"));
  assert.ok(application.featureList.includes("Personal vocabulary with up to 500 words or names"));
  assert.ok(application.featureList.includes("Word-order permutations with movable position locks"));
  assert.ok(application.featureList.includes("Local WordNet definitions for original and replacement words"));
  assert.ok(application.featureList.includes("Standard 172,820-word and expanded 867,177-word dictionaries"));
  assert.ok(application.featureList.includes("Capitalization and punctuation formatting"));
  assert.ok(application.featureList.includes("Validated JSON recipe import and export"));
  assert.ok(application.featureList.includes("Restore and rerun shared search settings"));
  assert.ok(application.featureList.includes("Focused share links with locally rendered exact-letter animation"));
  assert.ok(data["@graph"].some((entry) => entry["@type"] === "BreadcrumbList"));
  const faq = data["@graph"].find((entry) => entry["@type"] === "FAQPage");
  assert.ok(faq);
  assert.ok(faq.mainEntity.some((entry) => entry.name === "How are anagram results ranked?"));
  assert.match(faq.mainEntity.find((entry) => entry.name === "What can I do with the Pick List phrase editor?")?.acceptedAnswer?.text || "", /WordNet definitions/);
  assert.match(faq.mainEntity.find((entry) => entry.name === "Can I import an Anagram Architect recipe?")?.acceptedAnswer?.text || "", /validates the schema and exact letter match locally/);
  assert.match(faq.mainEntity.find((entry) => entry.name === "How do animated anagram links work?")?.acceptedAnswer?.text || "", /focused 16:9 reveal/);
  assert.match(html, /Can I import and rerun someone else’s recipe\?/);
  assert.match(html, /It opens in a focused 16:9 view/);
  assert.ok(faq.mainEntity.some((entry) => entry.name === "Can I add names or specialist words to the anagram dictionary?"));
  assert.ok(faq.mainEntity.some((entry) => entry.name === "Why did my anagram search return no results?"));
});

test("presents Learn More guides before related solvers", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  assert.match(html, /id="anagram-architect-related-guides"/);
  assert.match(html, /data-related-guides-tool="anagram-architect"/);
  assert.match(html, /Related Anagram and Word-Finder Guides/);
  assert.match(html, /How We Built Anagram Architect: Meaningful Anagrams with Rust and WebAssembly/);
  assert.match(html, /https:\/\/blog\.monkeytactics\.com\/posts\/how-we-built-anagram-architect-rust-wasm\//);
  assert.match(html, /assets\/js\/shared\/related-guides\.js\?v=/);
  assert.ok(html.indexOf('id="anagram-architect-related-guides"') < html.indexOf('class="anagram-related"'));
});

test("includes the shared Trustpilot review collector", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  assert.match(html, /assets\/css\/shared\/trustpilot-review-collector\.css\?v=/);
  assert.match(html, /class="review-collector" aria-label="Review MonkeyTactics on Trustpilot"/);
  assert.match(html, /Was this tool helpful\?/);
  assert.match(html, /https:\/\/www\.trustpilot\.com\/evaluate\/monkeytactics\.com/);
  assert.match(html, /src="\/assets\/images\/trustpilot-review\.svg"/);
});
