import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../tools/crossword-solver.html", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../assets/js/tools/crossword-solver.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../assets/css/tools/crossword-solver.css", import.meta.url), "utf8");

test("crossword solver publishes distinct metadata and structured application data", () => {
  assert.match(html, /<title>Crossword Clue Solver &amp; Letter Pattern Finder \| MonkeyTactics<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/crossword-solver">/);
  assert.match(html, /"@type": "SoftwareApplication"/);
  assert.match(html, /"@type": "FAQPage"/);
  assert.match(html, /"Crossword clue and answer search"/);
  assert.match(html, /<h1 id="tool-heading">Crossword Clue Solver &amp; Letter Pattern Finder<\/h1>/);
  assert.match(html, /save candidates, restore searches, and share picks by URL or QR/);
  assert.match(html, /"isAccessibleForFree": true/);
  assert.match(html, /94,000\+ clue records/);
});

test("new crossword workflows are described in visible and structured content", () => {
  assert.match(html, /Build a Crossword Candidate Pick List/);
  assert.match(html, /Share Crossword Answers by Link or QR Code/);
  assert.equal((html.match(/How do I reopen a saved crossword search\?/g) || []).length, 2);
  assert.equal((html.match(/Can I reset only the crossword filters\?/g) || []).length, 2);
  assert.equal((html.match(/Can I share a crossword pick\?/g) || []).length, 2);
});

test("crossword solver currently omits advertising slots", () => {
  assert.doesNotMatch(html, /class="ad-container"/);
});

test("crossword solver exposes pattern-first controls and an optional letter pool", () => {
  assert.match(html, /id="crossword-clue"/);
  assert.match(html, /id="crossword-pattern"/);
  assert.match(html, /id="available-letters"/);
  assert.match(html, /id="word-length"/);
  assert.match(html, /name="dictionary" value="enable"[^>]* checked/);
  assert.match(html, /name="dictionary" value="sowpods"/);
  assert.match(html, /name="dictionary" value="both"/);
});

test("crossword clue search lazily loads reviewed static data and supports combined filtering", () => {
  assert.match(script, /CLUE_MANIFEST_URL/);
  assert.match(script, /data\?\.formatVersion !== 2/);
  assert.match(script, /async function loadClueIndex\(\)/);
  assert.match(script, /async function loadClueShard\(length\)/);
  assert.match(script, /async function searchClues\(clue, pattern, filters\)/);
  assert.match(script, /globMatches\(answer, pattern\)/);
  assert.match(script, /if \(clue\) \{/);
  assert.match(script, /index\.synonymPostings/);
  assert.match(script, /\* 0\.35/);
  assert.match(script, /Related meaning/);
  assert.doesNotMatch(script, /Promise\.all\(\[Engine\.ready, loadClue/);
});

test("only the latest crossword search can update the results", () => {
  assert.match(script, /const request = \+\+searchRequest;/);
  assert.match(script, /if \(request !== searchRequest\) return;\s+renderClueResults/);
  assert.match(script, /if \(request !== searchRequest\) return;\s+renderResults/);
  assert.match(script, /function clearSearch\(\) \{\s+searchRequest \+= 1;/);
});

test("crossword solver calls the shared WASM pattern search without inventing a rack", () => {
  assert.match(script, /Engine\.crosswordSearch\(pattern, pool, options\)/);
  assert.match(script, /loadForPattern\(pattern\)/);
  assert.match(script, /pattern\.includes\("\*"\)/);
});

test("crossword results override the legacy hidden calculator panel rule", () => {
  assert.match(css, /\.crossword-page \.results-panel \{ display: block;/);
});

test("pattern previews stay on one line", () => {
  assert.match(css, /\.result-word \{[^}]*display: inline-flex;[^}]*white-space: nowrap;/);
  assert.match(css, /\.pattern-table code \{[^}]*white-space: nowrap;/);
  assert.match(css, /\.sample-row button \{[^}]*white-space: nowrap;/);
});

test("fixed-length results omit redundant length labels and cannot scroll sideways", () => {
  assert.match(script, /const hasMixedLengths = new Set\(shown\.map\(\(word\) => word\.length\)\)\.size > 1;/);
  assert.match(script, /if \(hasMixedLengths\) \{/);
  assert.match(script, /meta\.textContent = `\$\{word\.length\}L`;/);
  assert.match(css, /\.word-results \{[^}]*overflow-x: hidden;[^}]*overflow-y: auto;/);
  assert.match(css, /\.word-results li \{[^}]*min-width: 0;[^}]*overflow: hidden;/);
});

test("solver inputs and results use a stacked adaptive layout", () => {
  assert.match(css, /\.crossword-layout \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /\.word-results \{[^}]*repeat\(auto-fit, minmax\(10\.5rem, 1fr\)\)/);
});

test("tool panel aligns with the full-width page panels", () => {
  assert.match(css, /\.crossword-page \.tool-widget \{ width: 100%; max-width: none; box-sizing: border-box;/);
});

test("result tiles keep breathing room beside the vertical scrollbar", () => {
  assert.match(css, /\.word-results \{[^}]*padding: 0 \.75rem 0 0;[^}]*scrollbar-gutter: stable;/);
});

test("results use a thin branded scrollbar", () => {
  assert.match(css, /\.word-results \{ scrollbar-width: thin; scrollbar-color: rgba\(74, 222, 128, \.42\)/);
  assert.match(css, /\.word-results::\-webkit-scrollbar \{ width: 7px; \}/);
  assert.match(css, /\.word-results::\-webkit-scrollbar-thumb:hover/);
});

test("secondary crossword filters live in a collapsed disclosure", () => {
  assert.match(html, /<details class="filter-disclosure" id="filter-disclosure">/);
  assert.match(html, /<strong>Filters <em id="active-filter-count">\(0 active\)<\/em><\/strong>/);
  assert.doesNotMatch(html, /<details class="filter-disclosure"[^>]* open/);
  assert.match(css, /\.filter-disclosure\[open\] summary i/);
});

test("collapsed filter summary reports the live number of narrowing criteria", () => {
  assert.match(script, /function updateActiveFilterCount\(\)/);
  assert.match(script, /activeFilterCount\.textContent = `\(\$\{active\} active\)`;/);
  assert.match(script, /\[lengthInput, sortInput, poolInput, startsInput, endsInput, includeInput, excludeInput\]/);
});

test("crossword filters can be reset independently", () => {
  assert.match(html, /id="reset-crossword-filters"/);
  assert.match(script, /function resetFilters\(\)/);
  assert.match(script, /sortInput\.value = "alpha"/);
  assert.match(script, /resetFiltersButton\.addEventListener\("click", resetFilters\)/);
  assert.match(css, /\.filter-section-reset\s*\{/);
});

test("dictionary modal can copy the selected answer", () => {
  assert.match(html, /id="dictionary-copy-word"/);
  assert.match(html, /id="dictionary-copy-label">Copy word<\/span>/);
  assert.match(script, /async function copyDictionaryWord\(\)/);
  assert.match(script, /navigator\.clipboard\?\.writeText/);
  assert.match(script, /await navigator\.clipboard\.writeText\(text\)/);
  assert.match(script, /document\.execCommand\("copy"\)/);
  assert.match(script, /dictionaryCopyLabel\.textContent = "Copied"/);
  assert.match(script, /dictionaryCopyButton\.addEventListener\("click", copyDictionaryWord\)/);
  assert.match(css, /#dictionary-copy-word\.is-copied/);
});

test("dictionary lookup links follow the selected word list", () => {
  assert.match(html, /id="dictionary-merriam-link"/);
  assert.match(html, /id="dictionary-collins-link"[^>]*scrabble\.collinsdictionary\.com\/check\//);
  assert.match(script, /dictionaryMerriamLink\.hidden = selectedDictionary === "sowpods"/);
  assert.match(script, /dictionaryCollinsLink\.hidden = selectedDictionary === "enable"/);
});

test("synonym expansion is documented in visible and structured page content", () => {
  assert.match(html, /"featureList": \[[^\]]*"WordNet synonym and query expansion"/);
  assert.equal((html.match(/Can the solver understand synonyms\?/g) || []).length, 2);
  assert.equal((html.match(/related meanings broaden the results without replacing stronger direct matches/g) || []).length, 2);
});

test("dictionary definitions open after a stationary fine-pointer hover", () => {
  assert.match(script, /const DICTIONARY_HOVER_DELAY = 650/);
  assert.match(script, /matchMedia\("\(hover: hover\) and \(pointer: fine\)"\)/);
  assert.match(script, /trigger\.addEventListener\("pointermove", schedulePreview\)/);
  assert.match(script, /trigger\.addEventListener\("pointerleave", cancelDictionaryHover\)/);
  assert.match(script, /bindDictionaryTrigger\(button, match\.answer,/);
  assert.match(script, /bindDictionaryTrigger\(link, word,/);
});

test("crossword candidates can be saved with complete solving context", () => {
  assert.match(html, /id="crossword-pick-list"/);
  assert.match(html, /id="dictionary-pick-word"/);
  assert.match(html, /crossword-pick-list-store\.js/);
  assert.match(script, /definition: match\.clue/);
  assert.match(script, /relevance: match\.relevance/);
  assert.match(script, /matchedTokens: match\.matchedTokens/);
  assert.match(script, /dictionaryMembership: dictionaryMembership\(match\.dictionaryBits\)/);
  assert.match(script, /gridPosition: gridPosition\.value, note: note\.value/);
  assert.match(script, /insert\.textContent = "Insert"/);
  assert.match(script, /insert\.addEventListener\("click", \(\) => insertPickSearch\(entry\)\)/);
  assert.match(script, /function populateSearchFromPick\(entry\)/);
  assert.equal((html.match(/What does the crossword Pick List save\?/g) || []).length, 2);
});

test("pick list shares deep links and QR codes and imports shared URL parameters", () => {
  assert.match(html, /id="crossword-share-modal"/);
  assert.match(html, /id="crossword-share-url"/);
  assert.doesNotMatch(html, /id="crossword-share-payload"/);
  assert.doesNotMatch(html, /id="crossword-share-copy-payload"/);
  assert.match(html, /id="crossword-share-qr"/);
  assert.match(html, /id="crossword-share-copy-summary"/);
  assert.match(html, /qrcode-1\.1\.0\.min\.js/);
  assert.match(script, /url\.searchParams\.set\("word", entry\.word\)/);
  assert.doesNotMatch(script, /url\.searchParams\.set\("(?:definition|strength|matched|timestamp)"/);
  assert.match(script, /window\.QRCode\.toCanvas/);
  assert.match(script, /new ClipboardItem\(\{ "image\/png": blob \}\)/);
  assert.match(script, /buildPickSummaryText\(currentShareEntry\)/);
  assert.match(script, /"🐒 MonkeyTactics\.com"/u);
  assert.match(script, /"🧩 CROSSWORD PICK"/u);
  assert.match(script, /`🔗 Try this pick: \$\{buildPickShareUrl\(entry\)\}`/u);
  assert.match(script, /function importSharedPickFromUrl\(\)/);
  assert.match(script, /populateSearchFromPick\(sharedEntry\)/);
  assert.match(script, /lengthInput\.value = String\(fixedPatternLength\(restoredPattern\) \|\| entry\.word\.length\)/);
  assert.match(script, /if \(sharedSearchPending\) form\.requestSubmit\(\)/);
  assert.match(script, /parameters\.has\("pick"\)/);
  assert.match(script, /pickListEntries = PickListStore\.add/);
  assert.equal((html.match(/Can I share a crossword pick\?/g) || []).length, 2);
});
