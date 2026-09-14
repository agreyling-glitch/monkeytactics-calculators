import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterAndPageResults, formatAnagramPhrase, isExactAnagram, mergeRankedResults, normalizeLetters, normalizeResultPattern, phraseMatchesPattern, rankPhrasePermutations, rankWordReplacements, resultMatchesSearch, solveAnagrams } from "../assets/js/tools/anagram-architect/anagram-core.mjs";

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
  assert.match(html, /anagram-architect\.bundle\.js\?v=20260914-17/);
});

test("shows phrase validation failures in an accessible modal", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="anagram-validation-modal"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(source, /showValidationError\(message/);
  assert.match(source, /Support for longer phrases is planned for a future upgrade\./);
});

test("provides accessible clear buttons for every text entry field", async () => {
  const [html, source] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8")
  ]);
  assert.equal((html.match(/data-clear-input=/g) || []).length, 6);
  assert.equal((html.match(/class="anagram-input-clear"/g) || []).length, 6);
  assert.match(source, /function syncInputClearButtons/);
  assert.match(source, /field\.dispatchEvent\(new Event\("input"/);
});

test("the result toolbar loads the cache-busted responsive stylesheet", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/css/tools/anagram-architect.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /anagram-architect\.css\?v=20260914-16/);
  assert.match(css, /\.anagram-pick-drawer-content > \.anagram-pick-permutations \{[^}]*height: 100%/);
  assert.match(css, /\.anagram-pick-drawer-content > \.anagram-pick-permutations select \{[^}]*height: 100%/);
  assert.match(html, /id="anagram-result-search"/);
  assert.match(html, /id="anagram-previous-page"/);
  assert.match(html, /id="anagram-next-page"/);
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
});

test("offers grammatical phrase templates as search constraints", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  const browser = await readFile(new URL("../assets/js/tools/anagram-architect/anagram-architect.js", import.meta.url), "utf8");
  assert.match(html, /id="anagram-grammar-template"/);
  assert.match(html, /\[Noun\] of \[Noun\]/);
  assert.match(html, /\[Verb\] the \[Noun\]/);
  assert.match(html, /\[Adjective\] \[Noun\]/);
  assert.match(html, /\[Noun\] in the \[Noun\]/);
  assert.match(browser, /grammarTemplate: grammarTemplate\.value/);
  assert.match(browser, /containsRequiredLetters\(source, templateLiterals\)/);
  assert.match(browser, /No exact phrases matched the selected grammar template/);
  assert.match(browser, /complete \? "No matching phrase found"/);
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
  assert.match(html, /id="anagram-current-leader"/);
  assert.match(html, /id="anagram-analysis-cancel"/);
  assert.match(browser, /function drawThroughput/);
  assert.match(browser, /throughputRate\.textContent/);
  assert.match(browser, /matchesSeen/);
  assert.match(browser, /prunedPaths/);
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
  assert.match(source, /Boolean\(phrasePattern\.value\.trim\(\) \|\| grammarTemplate\.value\)/);
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
  assert.match(html, /<strong>Pick List<\/strong>/);
  assert.match(browser, /monkeytactics\.anagram-architect\.pick-list\.v1/);
  assert.match(browser, /localStorage\.setItem/);
  assert.match(browser, /Copy \$\{entry\.phrase\}/);
  assert.match(browser, /navigator\.clipboard\.writeText\(formatAnagramPhrase\(entry\.phrase, entry\.formatOptions\)\)/);
  assert.match(browser, /rankPhrasePermutations\(entry\.phrase, 720, \[\.\.\.locked\]\)/);
  assert.match(browser, /select\.value = entry\.phrase\.toLowerCase\(\)/);
  assert.match(browser, /const selectedPhrase = select\.value \|\| entry\.phrase/);
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
  assert.match(browser, /formatAnagramPhrase/);
  assert.match(browser, /Style capitalization and punctuation/);
  assert.match(browser, /Reset formatting/);
  assert.match(browser, /anagramformatchange/);
  assert.match(browser, /rowPhrase\.textContent = detail\.formattedPhrase/);
  assert.match(browser, /const wasSelected = button\.getAttribute\("aria-pressed"\) === "true"/);
  assert.match(browser, /Choose a word to see exact-letter alternatives/);
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
  assert.match(html, /<title>Anagram Solver &amp; Phrase Generator/);
  assert.match(html, /<meta name="description" content="Find and refine exact name and phrase anagrams/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /class="breadcrumb anagram-breadcrumb"/);
  assert.match(html, /<h1 id="anagram-title">Anagram Solver for Names and Phrases<\/h1>/);
  assert.match(html, /Build exact phrase anagrams, not approximate matches/);
  assert.match(html, /Language-aware search/);
  assert.match(html, /estimates readability and naturalness using word frequency, grammar, local phrase evidence, word order, and phrase shape/i);
  assert.match(html, /Exactness is guaranteed, but ranking is an estimate/);
  assert.match(html, /Anagram solver FAQ/);
  assert.match(html, /Related word tools/);
  const structured = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  const data = JSON.parse(structured);
  const application = data["@graph"].find((entry) => entry["@type"] === "WebApplication");
  assert.ok(application);
  assert.ok(application.featureList.includes("Language-aware multi-word ranking"));
  assert.ok(application.featureList.includes("Grammar pattern templates"));
  assert.ok(application.featureList.includes("Word-order permutations and position locks"));
  assert.ok(application.featureList.includes("Capitalization and punctuation formatting"));
  assert.ok(data["@graph"].some((entry) => entry["@type"] === "BreadcrumbList"));
  const faq = data["@graph"].find((entry) => entry["@type"] === "FAQPage");
  assert.ok(faq);
  assert.ok(faq.mainEntity.some((entry) => entry.name === "How are anagram results ranked?"));
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
