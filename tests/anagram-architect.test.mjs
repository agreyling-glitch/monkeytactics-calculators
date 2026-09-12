import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterAndPageResults, isExactAnagram, mergeRankedResults, normalizeLetters, normalizeResultPattern, phraseMatchesPattern, resultMatchesSearch, solveAnagrams } from "../assets/js/tools/anagram-architect/anagram-core.mjs";

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
  assert.match(html, /anagram-architect\.bundle\.js\?v=20260912-46/);
});

test("the result toolbar loads the cache-busted responsive stylesheet", async () => {
  const html = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8"));
  assert.match(html, /anagram-architect\.css\?v=20260912-19/);
  assert.match(html, /id="anagram-result-search"/);
  assert.match(html, /id="anagram-previous-page"/);
  assert.match(html, /id="anagram-next-page"/);
});

test("keeps advanced generation options collapsed by default", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  assert.match(html, /<details class="anagram-advanced-options" id="anagram-advanced-options">/);
  assert.doesNotMatch(html, /<details class="anagram-advanced-options"[^>]*\sopen(?:\s|>)/);
  assert.match(html, /<summary><span>Advanced options<\/span>/);
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
  assert.match(html, /id="anagram-current-leader"/);
  assert.match(html, /id="anagram-analysis-cancel"/);
  assert.match(browser, /function drawThroughput/);
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
  assert.match(source, /Boolean\(phrasePattern\.value\.trim\(\)\)/);
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
  const filtered = solveAnagrams("shit", ["shit"], { maxWords: 1, minimumLength: 2 });
  const allowed = solveAnagrams("shit", ["shit"], { maxWords: 1, minimumLength: 2, excludeVulgar: false });
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
  assert.match(browser, /navigator\.clipboard\.writeText\(titleCase\(entry\.phrase\)\)/);
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
  assert.match(html, /<title>Anagram Solver for Names &amp; Phrases/);
  assert.match(html, /<meta name="description" content="Find exact anagrams/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /class="breadcrumb anagram-breadcrumb"/);
  assert.match(html, /<h1 id="anagram-title">Anagram Solver for Names and Phrases<\/h1>/);
  assert.match(html, /Build exact phrase anagrams, not approximate matches/);
  assert.match(html, /Anagram solver FAQ/);
  assert.match(html, /Related word tools/);
  const structured = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  const data = JSON.parse(structured);
  assert.ok(data["@graph"].some((entry) => entry["@type"] === "WebApplication"));
  assert.ok(data["@graph"].some((entry) => entry["@type"] === "BreadcrumbList"));
  assert.ok(data["@graph"].some((entry) => entry["@type"] === "FAQPage"));
});

test("presents Learn More guides before related solvers", async () => {
  const html = await readFile(new URL("../tools/anagram-architect.html", import.meta.url), "utf8");
  assert.match(html, /id="anagram-architect-related-guides"/);
  assert.match(html, /data-related-guides-tool="anagram-architect"/);
  assert.match(html, /Related Anagram and Word-Finder Guides/);
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
