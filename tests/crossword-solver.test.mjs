import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../tools/crossword-solver.html", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../assets/js/tools/crossword-solver.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../assets/css/tools/crossword-solver.css", import.meta.url), "utf8");

test("crossword solver cache-busts the WordNet graph release", () => {
  assert.match(html, /crossword-solver\.js\?v=20260901-plural-normalization-21/);
  assert.match(html, /crossword-solver\.css\?v=20260901-grid-positions-1/);
  assert.match(html, /crossword-pick-list-store\.js\?v=20260901-grid-positions-1/);
});

test("crossword solver publishes distinct metadata and structured application data", () => {
  assert.match(html, /<title>Crossword Solver: Clues, Patterns &amp; WordNet \| MonkeyTactics<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/crossword-solver">/);
  assert.match(html, /"@type": "SoftwareApplication"/);
  assert.match(html, /"@type": "FAQPage"/);
  assert.match(html, /"Crossword clue and answer search"/);
  assert.match(html, /<h1 id="tool-heading">Crossword Clue Solver with WordNet &amp; Letter Patterns<\/h1>/);
  assert.match(html, /Find single- and multi-word crossword answers/);
  assert.match(html, /"isAccessibleForFree": true/);
  assert.match(html, /129,000\+ clue records/);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd);
  assert.doesNotThrow(() => JSON.parse(jsonLd));
  assert.match(html, /WordNet definition and graph similarity ranking/);
  assert.match(html, /Versioned JSON Pick List export and import/);
});

test("new crossword workflows are described in visible and structured content", () => {
  assert.match(html, /Build a Crossword Candidate Pick List/);
  assert.match(html, /Share Crossword Answers by Link or QR Code/);
  assert.equal((html.match(/How do I reopen a saved crossword search\?/g) || []).length, 2);
  assert.equal((html.match(/Can I reset only the crossword filters\?/g) || []).length, 2);
  assert.equal((html.match(/Can I share a crossword pick\?/g) || []).length, 2);
  assert.equal((html.match(/Does the crossword solver support multi-word answers\?/g) || []).length, 2);
  assert.equal((html.match(/How does WordNet graph similarity rank crossword answers\?/g) || []).length, 2);
  assert.equal((html.match(/Can I export or import a crossword Pick List\?/g) || []).length, 2);
  assert.equal((html.match(/What does Cached this session mean\?/g) || []).length, 2);
  assert.match(html, /Export and Import a Crossword Pick List/);
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
  assert.match(script, /data\?\.formatVersion !== 4/);
  assert.match(script, /async function loadClueIndex\(\)/);
  assert.match(script, /async function loadClueShard\(length\)/);
  assert.match(script, /async function searchClues\(clue, pattern, filters\)/);
  assert.match(script, /globMatches\(answer, pattern\)/);
  assert.match(script, /if \(clue\) \{/);
  assert.match(script, /index\.synonymPostings/);
  assert.match(script, /\* 0\.35/);
  assert.match(script, /index\.graphPostings/);
  assert.match(script, /\* 0\.20/);
  assert.match(script, /WordNet graph match/);
  assert.match(script, /Related meaning/);
  assert.doesNotMatch(script, /Promise\.all\(\[Engine\.ready, loadClue/);
});

test("multi-word answers keep phrase boundaries while matching grid letters", () => {
  assert.match(script, /displayAnswer, wordCount, answerLength/);
  assert.match(script, /word\.replace\(\/\[\^A-Z\]\/g, ""\)/);
  assert.match(script, /span\.className = "phrase-separator"/);
  assert.match(script, /entry\.word\.replace\(\/\[\^A-Z\]\/gi, ""\)\.length/);
  assert.match(css, /\.result-word \.phrase-separator/);
  assert.match(css, /\.clue-result-topline \{[^}]*grid-template-columns: minmax\(0, 1fr\) max-content;/);
  assert.match(css, /\.clue-result-topline \.result-word \{ overflow: hidden; \}/);
  assert.match(css, /\.clue-result-match \{[^}]*text-align: right;[^}]*overflow-wrap: anywhere;/);
});

test("plural clues can project singular WordNet lemmas into fixed-length answers", () => {
  assert.match(script, /function hasPluralClueTerm\(value\)/);
  assert.match(script, /function pluralizeAnswer\(record\)/);
  assert.match(script, /pluralProjectionEnabled/);
  assert.match(script, /projection\.length !== inferredLength/);
  assert.match(script, /match\.inflected \? "Plural answer"/);
});

test("fixed-length clues can project plural WordNet lemmas into singular answers", () => {
  assert.match(script, /function singularizeAnswer\(record\)/);
  assert.match(script, /singularProjectionEnabled/);
  assert.match(script, /candidateRecord\.singularInflected \? 20/);
  assert.match(script, /match\.singularInflected \? "Singular answer"/);
});

test("past-tense clues can project matching WordNet verb lemmas", () => {
  assert.match(script, /\["showed irritation", \["offended"\]\]/);
  assert.match(script, /\["expunged", \["remove"\]\]/);
  assert.match(script, /function pastTenseAnswer\(record\)/);
  assert.match(script, /pastProjectionEnabled/);
  assert.match(script, /match\.pastInflected \? "Past-tense answer"/);
});

test("again clues can project matching base verbs into re- forms", () => {
  assert.match(script, /\["claim again", \["state"\]\]/);
  assert.match(script, /function repeatedActionAnswer\(record\)/);
  assert.match(script, /const repeatedActionEnabled = tokens\.includes\("again"\)/);
  assert.match(script, /derivationFit: candidateRecord\.repeatedAction \|\| candidateRecord\.superlative \? 35 : 0/);
  assert.match(script, /match\.repeatedAction \? "Re- form"/);
});

test("most clues can project matching adjectives into superlatives", () => {
  assert.match(script, /\["most unruly", \["wild"\]\]/);
  assert.match(script, /answer: "wildest", definition: "most unruly or uncontrolled"/);
  assert.match(script, /candidates\.some\(\(result\) => result\.localSupplement\)/);
  assert.match(script, /rawTokens\.filter\(\(token\) => token !== "most"\)/);
  assert.match(script, /function superlativeAnswer\(record\)/);
  assert.match(script, /const superlativeEnabled = rawTokens\.includes\("most"\)/);
  assert.match(script, /match\.superlative \? "Superlative answer"/);
});

test("compound crossword clues can bridge locally to WordNet definition concepts", () => {
  assert.match(script, /\["garden area", \["plot"\]\]/);
  assert.match(script, /\["thrift store", \["selling"\]\]/);
  assert.match(script, /function phraseConceptTerms\(value\)/);
  assert.match(script, /for \(const term of phraseConceptTerms\(clue\)\)/);
  assert.match(script, /const expansionIds = index\.postings\[term\] \|\| \[\]/);
  assert.match(script, /phraseConcept: \(candidateScore\.phrase \|\| 0\) \* 10/);
  assert.match(script, /match\.phraseMatch \? "Clue phrase match"/);
});

test("derivational clue terms expand to equivalent WordNet vocabulary", () => {
  assert.match(script, /\["pigmented", \["colored"\]\]/);
  assert.match(script, /CLUE_TERM_EXPANSIONS\.get\(token\)/);
  assert.match(script, /tokens\.some\(\(token\) => token\.endsWith\("ed"\)\) && answer\.endsWith\("ed"\) \? 30 : 0/);
});

test("local crossword phrases cover valid answers outside WordNet parts of speech", () => {
  assert.match(script, /\["heading for", \[\{ answer: "toward", definition: "in the direction of", dictionaryBits: 3 \}\]\]/);
  assert.match(script, /\["before in poems", \[\{ answer: "ere", definition: "before; archaic or poetic", dictionaryBits: 3 \}\]\]/);
  assert.match(script, /\{ answer: "nodes", definition: "lymph nodes", dictionaryBits: 3 \}/);
  assert.match(script, /\["press", \[\{ answer: "iron", definition: "press and smooth clothes", dictionaryBits: 3 \}\]\]/);
  assert.match(script, /function supplementalClueAnswers\(value\)/);
  assert.match(script, /Strong match · Local crossword phrase \+ pattern/);
  assert.match(script, /local crossword phrases \+ WordNet 3\.0/);
});

test("an empty semantic search can offer clearly labeled near-spelling pattern matches", () => {
  assert.match(script, /function isOneEditAway\(left, right\)/);
  assert.match(script, /\.filter\(\(word\) => isOneEditAway\(tokens\[0\], word\)\)/);
  assert.match(script, /match\.spellingMatch \? "Near spelling"/);
  assert.match(script, /dictionary spelling fallback/);
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

test("pattern examples do not interrupt keyboard navigation to Filters", () => {
  assert.equal((html.match(/<button type="button" tabindex="-1" data-pattern=/g) || []).length, 3);
  assert.match(html, /id="crossword-pattern"[\s\S]*?<details class="filter-disclosure"/);
});

test("clue and pattern fields share a restrained input treatment", () => {
  assert.match(css, /\.clue-field input,\.pattern-input \{[^}]*border: 1px solid var\(--premium-line\);[^}]*background: #111e17;/);
  assert.match(css, /\.pattern-input \{[^}]*font-size: 1rem|\.clue-field input,\.pattern-input \{[^}]*font-size: 1rem/);
  assert.doesNotMatch(css, /\.pattern-input \{[^}]*border: 2px solid/);
  assert.match(css, /\.pattern-label-row label \{[^}]*color: var\(--premium-muted\)/);
});

test("Datamuse definitions are cached for the current page session", () => {
  assert.match(script, /const dictionaryDefinitionCache = new Map\(\)/);
  assert.match(script, /const cacheKey = word\.toLowerCase\(\)\.normalize\("NFKD"\)/);
  assert.match(script, /let entries = dictionaryDefinitionCache\.get\(cacheKey\)/);
  assert.match(script, /const fromCache = dictionaryDefinitionCache\.has\(cacheKey\)/);
  assert.match(script, /if \(!entries\) \{/);
  assert.match(script, /dictionaryDefinitionCache\.set\(cacheKey, entries\)/);
  assert.match(script, /cacheStatus\.textContent = "Cached this session"/);
  assert.match(css, /\.dictionary-cache-status \{/);
  assert.match(css, /\.dictionary-cache-block \+ \.dictionary-entry \{[^}]*border-top:/);
  assert.doesNotMatch(script, /dictionaryDefinitionCache\.set\([^\n]+catch/);
});

test("phrase lookups keep the matched WordNet definition and reject partial remote headwords", () => {
  assert.match(script, /const normalizeHeadword = \(value\) => value\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\/g, ""\)/);
  assert.match(script, /entries\.find\(\(\{ word \}\) => normalizeHeadword\(word\) === requestedHeadword\)/);
  assert.doesNotMatch(script, /\|\| entries\[0\]/);
  assert.match(script, /function renderMatchedDefinition\(definition\)/);
  assert.match(script, /source\.textContent = "Matched WordNet definition"/);
  assert.match(script, /if \(matchedDefinition && \/\[\\s'-\]\/\.test\(word\)\) \{/);
  assert.match(script, /dictionaryModalBody\.replaceChildren\(\.\.\.localContent\);\s+window\.clearTimeout\(requestTimeout\);\s+dictionaryAbortController = null;\s+return;/);
  assert.match(script, /if \(!definitions\.childNodes\.length\) \{\s+if \(!matchedDefinition\) throw new Error/);
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
  assert.match(script, /bindDictionaryTrigger\(button, displayAnswer,/);
  assert.match(script, /bindDictionaryTrigger\(link, word,/);
});

test("crossword candidates can be saved with complete solving context", () => {
  assert.match(html, /id="crossword-pick-list"/);
  assert.match(html, /id="dictionary-pick-word"/);
  assert.match(html, /crossword-pick-list-store\.js/);
  assert.match(script, /definition: match\.clue/);
  assert.match(script, /relevance: match\.relevance/);
  assert.match(script, /matchedTokens: match\.matchedTokens/);
  assert.match(script, /scoreBreakdown: match\.scoreBreakdown/);
  assert.match(script, /matchExplanation: match\.matchExplanation/);
  assert.match(script, /dictionaryMembership: dictionaryMembership\(match\.dictionaryBits\)/);
  assert.match(script, /gridPosition: gridPosition\.value, note: note\.value/);
  assert.match(script, /insert\.textContent = "Insert"/);
  assert.match(script, /insert\.addEventListener\("click", \(\) => insertPickSearch\(entry\)\)/);
  assert.match(script, /function populateSearchFromPick\(entry\)/);
  assert.equal((html.match(/What does the crossword Pick List save\?/g) || []).length, 2);
});

test("semantic score explanations render in the lookup modal and Pick List", () => {
  assert.match(script, /function renderScoreBreakdown\(scoreBreakdown, matchExplanation\)/);
  assert.match(script, /title\.textContent = "Why this result\?"/);
  assert.match(script, /directClue: candidateScore\.direct \* 10/);
  assert.match(script, /graph: candidateScore\.graph \* 10/);
  assert.match(script, /exactPhrase: exactPhrase \? 100 : 0/);
  assert.match(script, /scoreDetails\.className = "crossword-pick-score-details"/);
  assert.match(script, /scoreSummary\.textContent = "Score details"/);
  assert.match(css, /\.crossword-score-row \{/);
  assert.match(css, /\.crossword-score-breakdown \+ \.dictionary-entry \{[^}]*border-top: 1px solid var\(--premium-line\);/);
  assert.match(css, /\.crossword-pick-score-details \{/);
});

test("Pick List groups Grid Positions and supports JSON export and import", () => {
  assert.match(html, /id="crossword-pick-menu-toggle"[^>]*aria-label="Pick List actions"[^>]*aria-expanded="false"/);
  assert.match(html, /id="crossword-pick-clear" type="button" title="Clear Pick List" aria-label="Clear Pick List">Clear/);
  assert.equal((html.match(/id="crossword-pick-clear"/g) || []).length, 1);
  assert.match(script, /pickListClear\.addEventListener\("click", \(event\) => \{\s+event\.stopPropagation\(\)/);
  assert.match(script, /pickListMenuToggle\.addEventListener\("click", \(event\) =>/);
  assert.match(script, /event\.key !== "Escape" \|\| pickListMenu\.hidden/);
  assert.match(html, /id="crossword-pick-export"/);
  assert.match(html, /id="crossword-pick-import"/);
  assert.match(html, /id="crossword-pick-import-mode"/);
  assert.match(html, /id="crossword-pick-import-file"[^>]*accept="application\/json,\.json"/);
  assert.match(script, /group\.className = "crossword-pick-group"/);
  assert.match(script, /group\.open = storedState !== "closed"/);
  assert.match(script, /PickListStore\.exportData\(pickListEntries\)/);
  assert.match(script, /PickListStore\.importData\(payload, mode\)/);
  assert.match(script, /window\.confirm\("Replace the current Pick List with the imported file\?"\)/);
  assert.match(css, /\.crossword-pick-group > summary \{/);
  assert.match(css, /\.crossword-pick-summary-actions \{/);
  assert.match(css, /\.crossword-pick-menu \{/);
});

test("Grid Position fields suggest unique positions already in the Pick List", () => {
  assert.match(html, /<datalist id="crossword-grid-positions"><\/datalist>/);
  assert.match(script, /function renderGridPositionOptions\(entries\)/);
  assert.match(script, /positions\.has\(position\.toLowerCase\(\)\)/);
  assert.match(script, /gridPosition\.setAttribute\("list", "crossword-grid-positions"\)/);
  assert.match(script, /renderGridPositionOptions\(entries\)/);
  assert.match(html, /"Reusable Grid Position suggestions"/);
  assert.match(html, /select it from the suggestions on another candidate instead of retyping it/);
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
  assert.match(script, /lengthInput\.value = String\(fixedPatternLength\(restoredPattern\) \|\| entry\.word\.replace/);
  assert.match(script, /if \(sharedSearchPending\) form\.requestSubmit\(\)/);
  assert.match(script, /parameters\.has\("pick"\)/);
  assert.match(script, /pickListEntries = PickListStore\.add/);
  assert.equal((html.match(/Can I share a crossword pick\?/g) || []).length, 2);
});
