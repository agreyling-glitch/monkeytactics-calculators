import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../tools/crossword-solver.html", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../assets/js/tools/crossword-solver.js", import.meta.url), "utf8");
const definitionsScript = fs.readFileSync(new URL("../assets/js/shared/word-definitions.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../assets/css/tools/crossword-solver.css", import.meta.url), "utf8");
const offlineWorker = fs.readFileSync(new URL("../crossword-offline-sw.js", import.meta.url), "utf8");

test("crossword solver cache-busts the WordNet graph release", () => {
  assert.match(html, /word-definitions\.js\?v=20260903-wordnet-definitions-10/);
  assert.match(html, /crossword-solver\.js\?v=20260904-both-default-39/);
  assert.match(html, /crossword-solver\.css\?v=20260905-gold-input-labels-36/);
  assert.match(html, /crossword-pick-list-store\.js\?v=20260901-grid-positions-1/);
});

test("dictionary trigger displays the active dictionary icon", () => {
  assert.match(html, /id="dictionary-choice-trigger"[^>]*>[\s\S]*?dictionary-active-symbol/);
  assert.match(script, /class="dictionary-active-flag"/);
  assert.match(script, /dictionaryChoiceTrigger\.innerHTML = dictionaryChoiceIcon\(selected\)/);
  assert.match(script, /selected === "expanded" \? "◎" : "⊕"/);
});

test("crossword offline preflight can recover from transient manifest failures", () => {
  assert.match(script, /const cachedResponse = await caches\.match\(url\)/);
  assert.match(script, /if \(!offlineModal\.open\) offlineModal\.showModal\(\)/);
  assert.match(script, /offlinePackageSummary\.textContent = "Unavailable"/);
  assert.match(script, /offlineModalConfirm\.textContent = "Retry"/);
  assert.match(script, /if \(!pendingOfflinePlan\) \{\s*await openOfflineDialog\(\)/);
});

test("crossword offline activation closes quietly when every file can be reused", () => {
  assert.match(script, /const reuseOnly = !forceDownload && pendingOfflineInventory\?\.remainingCount === 0/);
  assert.match(script, /offlineDownloadProgress\.hidden = reuseOnly/);
  assert.match(script, /if \(reuseOnly\) \{\s*offlineModal\.close\(\)/);
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
  assert.match(html, /meta name="description" content="[^"]*offline searches with local definitions and no API calls/);
  assert.match(html, /"dateModified": "2026-09-04"/);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(jsonLd);
  assert.doesNotThrow(() => JSON.parse(jsonLd));
  assert.match(html, /WordNet definition and graph similarity ranking/);
  assert.match(html, /Versioned JSON Pick List export and import/);
  assert.match(html, /"Opt-in downloadable offline crossword solver"/);
  assert.match(html, /"Local-only offline definition lookup with no API calls"/);
});

test("new crossword workflows are described in visible and structured content", () => {
  assert.match(html, /Build, Export, and Import a Crossword Pick List/);
  assert.match(html, /Share Crossword Answers by Link or QR Code/);
  assert.equal((html.match(/How do I reopen a saved crossword search\?/g) || []).length, 2);
  assert.equal((html.match(/Can I reset only the crossword filters\?/g) || []).length, 2);
  assert.equal((html.match(/Can I share a crossword pick\?/g) || []).length, 2);
  assert.equal((html.match(/Does the crossword solver support multi-word answers\?/g) || []).length, 2);
  assert.equal((html.match(/How does WordNet graph similarity rank crossword answers\?/g) || []).length, 2);
  assert.equal((html.match(/Can I export or import a crossword Pick List\?/g) || []).length, 2);
  assert.equal((html.match(/Can I use the crossword solver offline\?/g) || []).length, 2);
  assert.equal((html.match(/What does API cache mean in debug mode\?/g) || []).length, 0);
  assert.match(html, /Optional offline mode/);
  assert.match(html, /install the complete crossword solver for offline searches/);
  assert.equal((html.match(/Build, Export, and Import a Crossword Pick List/g) || []).length, 1);
});

test("crossword solver currently omits advertising slots", () => {
  assert.doesNotMatch(html, /class="ad-container"/);
});

test("crossword solver exposes pattern-first controls and an optional letter pool", () => {
  assert.match(html, /id="crossword-clue"/);
  assert.match(html, /id="crossword-pattern"/);
  assert.match(html, /id="crossword-pattern"[^>]*type="search"/);
  assert.match(html, /id="available-letters"/);
  assert.match(html, /id="word-length"/);
  assert.match(html, /name="dictionary" value="both"[^>]* checked/);
  assert.match(html, /name="dictionary" value="expanded">/);
  assert.match(html, /id="dictionary-choice-trigger"[^>]*aria-label="Choose dictionary\. Current: Both \(ENABLE \+ Wiktionary\)"/);
  assert.match(html, /id="dictionary-choice-trigger"[^>]*title="Dictionary selected: Both \(ENABLE \+ Wiktionary\)"/);
  assert.match(html, /id="dictionary-choice-modal"[^>]*aria-labelledby="dictionary-choice-title"/);
  assert.match(html, /href="#flag-us"[\s\S]*Standard[\s\S]*Expanded[\s\S]*Wiktionary/);
  assert.doesNotMatch(html, /Expanded <em>Coming soon<\/em>/);
  assert.doesNotMatch(html, /class="dictionary-selector"/);
  assert.match(script, /const dictionaryInputs = document\.querySelectorAll/);
  assert.match(script, /both: "Both \(ENABLE \+ Wiktionary\)"/);
  assert.match(script, /dictionaryChoiceModal\.showModal\(\)/);
  assert.match(script, /dictionaryChoiceModal\.close\(\)/);
  assert.match(script, /renderDictionaryChoice\(\)/);
  assert.match(script, /dictionaryChoiceTrigger\.title = `Dictionary selected: \$\{label\}`/);
  assert.match(css, /\.crossword-page section\[data-focus-mode\] form > \.solver-heading\s*\{[^}]*padding-right:\s*0;/s);
  assert.match(css, /@media \(max-width:\s*430px\)\s*\{[^}]*\.crossword-page section\[data-focus-mode\] form > \.solver-heading\s*\{[^}]*padding-right:\s*0;/s);
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
  assert.match(script, /dictionaryMerriamLink\.hidden = selectedDictionary === "expanded"/);
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
  assert.match(css, /\.crossword-page \.clue-field > label,\.pattern-label-row label \{[^}]*color: var\(--crossword-gold\)/);
});

test("shared definitions use local WordNet before a cached Datamuse fallback", () => {
  assert.match(definitionsScript, /global\.MonkeyTacticsWordDefinitions/);
  assert.match(definitionsScript, /async function loadLocalDefinitions\(word, debug\)/);
  assert.match(definitionsScript, /function lookupForms\(value\)/);
  assert.match(definitionsScript, /word\.endsWith\("s"\).*forms\.push\(word\.slice\(0, -1\)\)/);
  assert.match(definitionsScript, /for \(const form of lookupForms\(requestedWord\)\)/);
  assert.match(definitionsScript, /const remoteCache = new Map\(\)/);
  assert.match(definitionsScript, /remoteCache\.set\(form, entries\)/);
  assert.match(definitionsScript, /https:\/\/api\.datamuse\.com\/words/);
  assert.match(script, /WordDefinitions\.lookup\(word/);
  assert.match(script, /if \(matchedDefinition\) \{/);
  assert.doesNotMatch(script, /Cached this session/);
});

test("crossword search examples cover flexible patterns and narrowing filters", () => {
  assert.match(html, /<code>S\*<\/code>/);
  assert.match(html, /<code>\*ING<\/code>/);
  assert.match(html, /“Feline” \+ <code>\?A\?\?<\/code>/);
  assert.match(html, /Multi-word answer/);
  assert.match(html, /Exclude Letters: <code>RST<\/code>/);
});

test("related crossword guides are crawlable, structured, and hidden in Offline Mode", () => {
  assert.match(html, /id="crossword-related-guides"[\s\S]*Related Crossword Guides/);
  assert.ok(html.indexOf('id="crossword-related-guides"') < html.indexOf('class="related-tools"'));
  assert.equal((html.match(/https:\/\/blog\.monkeytactics\.com\/posts\/why-monkeytactics-crossword-solver-is-different\//g) || []).length, 3);
  assert.equal((html.match(/https:\/\/blog\.monkeytactics\.com\/posts\/when-does-a-crossword-solver-become-a-spoiler\//g) || []).length, 3);
  assert.match(html, /"@type": "ItemList"/);
  assert.match(html, /"@id": "https:\/\/monkeytactics\.com\/tools\/crossword-solver#related-guides"/);
  assert.match(script, /relatedGuides\.hidden = offlineModeEnabled/);
  assert.match(css, /\.crossword-related-guides\[hidden\] \{ display: none; \}/);
});

test("crossword FAQ matches the collapsible word-solver FAQ treatment", () => {
  assert.match(html, /<section class="faq-section"[^>]*>[\s\S]*?<details open>/);
  assert.match(html, /<span class="faq-info-icon"[^>]*>\?<\/span>/);
  assert.match(html, /<div class="faq-content">[\s\S]*class="faq-list"/);
  assert.equal((html.match(/class="faq-item"/g) || []).length, 15);
  assert.match(css, /\.crossword-page \.faq-section summary::after[^}]*content: "\+"/);
  assert.match(css, /\.crossword-page \.faq-section details\[open\] summary::after[^}]*content: "−"/);
});

test("supporting guide cards use the quiet FAQ background", () => {
  assert.match(css, /\.content-card\s*\{[^}]*background:\s*rgba\(255,255,255,\.02\)/);
  assert.match(css, /\.crossword-page \.tool-widget\s*\{[^}]*background:\s*#101b16/);
});

test("dictionary icon and Offline Mode share one control row", () => {
  assert.match(css, /\.crossword-dictionary-controls\s*\{[^}]*align-self:\s*flex-end;[^}]*justify-content:\s*flex-end;[^}]*margin-left:\s*auto/);
  assert.match(css, /\.dictionary-choice-trigger\s*\{[^}]*width:\s*2\.75rem;[^}]*height:\s*2\.75rem/);
  assert.doesNotMatch(css, /\.crossword-offline-control\s*\{[^}]*(?:border-top|padding-top|margin-top):/);
});

test("Crossword alone previews the green Offline Mode control treatment", () => {
  assert.match(css, /\.offline-switch-track \{[^}]*border: 1px solid #22c55e;[^}]*background: rgba\(34,197,94,\.15\)/);
  assert.match(css, /\.offline-switch-thumb \{[^}]*background: #4ade80/);
  assert.match(css, /\.crossword-offline-control > strong \{ color: #4ade80/);
});

test("opt-in Offline Mode downloads the complete solver and disables Datamuse", () => {
  assert.match(html, /id="crossword-offline-toggle"[^>]*role="switch"[^>]*aria-checked="false"/);
  assert.match(html, /class="offline-switch-track"[^>]*>[\s\S]*?class="offline-switch-thumb"/);
  assert.match(html, /id="crossword-offline-status" role="status"/);
  assert.match(html, /Offline Mode \[Disabled\]/);
  assert.match(html, /id="offline-mode-modal"[^>]*aria-labelledby="offline-mode-modal-title"/);
  assert.match(html, /id="offline-package-summary"/);
  assert.match(html, /id="offline-cached-summary"/);
  assert.match(html, /id="offline-required-summary"/);
  assert.match(html, /External word-definition lookups are disabled/);
  assert.match(html, /id="offline-modal-confirm"[^>]*>OK<\/button>/);
  assert.match(html, /id="offline-modal-cancel"[^>]*>Cancel<\/button>/);
  assert.match(html, /id="offline-simulate-download" type="checkbox"/);
  assert.match(html, /id="offline-simulation-controls"[^>]*hidden/);
  assert.match(html, /id="offline-force-download" type="checkbox" role="switch"/);
  assert.match(html, /id="offline-speed-options"[^>]*disabled[\s\S]*name="offline-simulate-speed" value="50"[\s\S]*name="offline-simulate-speed" value="10"[\s\S]*name="offline-simulate-speed" value="2"/);
  assert.match(html, /id="crossword-offline-progress"/);
  assert.match(script, /navigator\.serviceWorker\.register\("\/crossword-offline-sw\.js", \{ scope: "\/" \}\)/);
  assert.match(script, /Object\.values\(wordData\.chunks/);
  assert.match(script, /Object\.values\(clueData\.shards/);
  assert.match(script, /Object\.values\(definitionData\.shards/);
  assert.match(script, /offlineToggle\.setAttribute\("aria-checked", String\(offlineModeEnabled\)\)/);
  assert.match(script, /Offline Mode \[\$\{offlineModeEnabled \? "Enabled" : "Disabled"\}\]/);
  assert.match(script, /const workers = Array\.from\(\{ length: simulate \? 1 : Math\.min\(4, urls\.length\) \}/);
  assert.match(script, /cacheOfflineUrl\(cache, url, forceDownload\)/);
  assert.match(script, /offlineSimulationControls\.hidden = !localSimulationEnabled/);
  assert.match(script, /const SHOW_LOCAL_DOWNLOAD_SIMULATION = false/);
  assert.match(script, /const forceDownload = offlineForceDownload\.checked \|\| offlineSimulateDownload\.checked/);
  assert.match(script, /forceDownload,\s*speedMbps:/);
  assert.match(script, /offlineForceDownload\?\.addEventListener\("change", renderOfflineRequirement\)/);
  assert.match(script, /const targetMilliseconds = \(estimatedBytes \* 8 \* 1000\) \/ \(speedMbps \* 1000000\)/);
  assert.match(script, /allowRemote: !offlineModeEnabled/);
  assert.match(script, /dictionaryMerriamLink\.hidden = offlineModeEnabled \|\| selectedDictionary === "expanded"/);
  assert.match(script, /dictionaryCollinsLink\.hidden = offlineModeEnabled \|\| selectedDictionary === "enable"/);
  assert.match(script, /A local definition for \$\{word\} is not available in Offline Mode/);
  assert.match(script, /navigator\.storage\?\.persist\?\.\(\)/);
  assert.match(script, /const nextCacheName = `\$\{OFFLINE_CACHE_PREFIX\}\$\{OFFLINE_VERSION\}`/);
  assert.doesNotMatch(script, /OFFLINE_VERSION\}-\$\{Date\.now\(\)\}/);
  assert.match(script, /if \(await cache\.match\(request\)\) return false/);
  assert.match(script, /const sharedResponse = await caches\.match\(request\)/);
  assert.match(script, /Promise\.all\(urls\.map\(\(url\) => cache\.match\(url\)\)\)/);
  assert.match(script, /inspectOfflinePlan\(plan\)/);
  assert.match(offlineWorker, /request\.mode === "navigate"/);
  assert.match(offlineWorker, /matchCrosswordCache/);
  assert.doesNotMatch(offlineWorker, /caches\.match/);
});

test("URL debug mode exposes opt-in in-memory definition counters below the Pick List", () => {
  assert.match(html, /id="crossword-pick-list"[\s\S]*id="crossword-debug-panel"[^>]* hidden/);
  assert.match(html, /data-debug-counter="datamuseCalls"/);
  assert.match(html, /data-debug-counter="datamuseCacheHits"/);
  assert.match(html, /data-debug-counter="localLookups"/);
  assert.match(html, /data-debug-timing="localAverage"/);
  assert.match(html, /data-debug-timing="apiAverage"/);
  assert.match(html, /data-debug-timing="pipelineTotal"/);
  assert.match(html, /id="crossword-debug-cache-state"[^>]*>Cold</);
  assert.match(html, /id="crossword-debug-last-shards"/);
  assert.match(html, /id="crossword-debug-loaded-shards"/);
  assert.match(html, /id="crossword-debug-pie"/);
  assert.match(html, /data-debug-share="local"/);
  assert.match(html, /data-debug-share="apiCache"/);
  assert.match(script, /searchParams\.get\("DEBUG"\)\?\.toUpperCase\(\) === "YES"/);
  assert.match(script, /DEBUG_HOSTS\.has\(window\.location\.hostname\)/);
  assert.match(script, /const debugCounters = debugEnabled \? Object\.create\(null\) : null/);
  assert.match(script, /debug: debugEnabled \? updateDebug : undefined/);
  assert.match(script, /event === "resolution"/);
  assert.match(script, /conic-gradient/);
  assert.match(definitionsScript, /typeof debug === "function"/);
  assert.match(definitionsScript, /"datamuseDuration"/);
  assert.match(definitionsScript, /"localDuration"/);
  assert.match(definitionsScript, /"localLookupPlan"/);
  assert.match(definitionsScript, /"localShardReady"/);
  assert.match(script, /setDebugCacheState\("Warming"\)/);
  assert.match(script, /setDebugCacheState\("Partial"\)/);
  assert.match(script, /setDebugCacheState\("Warm"\)/);
});

test("base-form definitions preserve the selected Pick List answer", () => {
  assert.match(definitionsScript, /sourceWord: form, word: requestedWord/);
  assert.match(definitionsScript, /sourceWord: entry\.word, word: requestedWord/);
  assert.match(script, /currentPickContext = \{ word, \.\.\.context \}/);
  assert.match(script, /for \$\{matchedWord\} \(base form\)/);
});

test("ALE resolves from the dedicated local WordNet definition shard without Datamuse", async () => {
  const window = { Blob, DecompressionStream, Response, TextDecoder, performance };
  let datamuseCalls = 0;
  const fetch = async (url) => {
    const value = String(url);
    if (value.includes("api.datamuse.com")) {
      datamuseCalls += 1;
      return new Response("[]", { headers: { "content-type": "application/json" } });
    }
    const pathname = new URL(value, "https://example.test").pathname;
    return new Response(await fs.promises.readFile(new URL(`..${pathname}`, import.meta.url)));
  };
  vm.runInNewContext(definitionsScript, { window, fetch, URLSearchParams, Blob, DecompressionStream, Response, TextDecoder });
  const result = await window.MonkeyTacticsWordDefinitions.lookup("ale");
  assert.equal(result.source, "local");
  assert.equal(result.matchedWord, "ale");
  assert.ok(result.entries[0].defs.some((definition) => /beer/i.test(definition)));
  assert.equal(datamuseCalls, 0);
});

test("iceboatings can use the iceboating definition without changing its answer", async () => {
  const window = {};
  const fetch = async (url) => ({
    ok: true,
    json: async () => String(url).includes("api.datamuse.com")
      ? [{ word: "iceboating", defs: ["n\tThe act of travelling in an iceboat."] }]
      : { formatVersion: 4, shards: {} }
  });
  vm.runInNewContext(definitionsScript, { window, fetch, URLSearchParams });
  const result = await window.MonkeyTacticsWordDefinitions.lookup("iceboatings");
  assert.equal(result.matchedWord, "iceboating");
  assert.equal(result.entries[0].word, "iceboatings");
  assert.equal(result.entries[0].sourceWord, "iceboating");
});

test("derived forms recover dogeys and dogsledding definitions without changing either answer", async () => {
  const window = {};
  const calls = [];
  const fetch = async (url) => {
    const value = String(url);
    if (!value.includes("api.datamuse.com")) return { ok: true, json: async () => ({ formatVersion: 4, shards: {} }) };
    calls.push(value);
    const spelling = new URL(value).searchParams.get("sp");
    const entries = {
      dogeys: [{ word: "bogeys", defs: ["n\tunrelated"] }],
      dogey: [{ word: "dogey", defs: ["n\tAlternative spelling of dogie."] }],
      dogsledding: [{ word: "dogsledding" }],
      dogsledd: [],
      dogsled: [{ word: "dogsled", defs: ["n\tA sled pulled by dogs."] }]
    };
    return { ok: true, json: async () => entries[spelling] || [] };
  };
  vm.runInNewContext(definitionsScript, { window, fetch, URLSearchParams });
  const dogeys = await window.MonkeyTacticsWordDefinitions.lookup("dogeys");
  const dogsledding = await window.MonkeyTacticsWordDefinitions.lookup("dogsledding");
  assert.equal(dogeys.matchedWord, "dogey");
  assert.equal(dogeys.entries[0].word, "dogeys");
  assert.equal(dogsledding.matchedWord, "dogsled");
  assert.equal(dogsledding.entries[0].word, "dogsledding");
  assert.ok(calls.some((url) => new URL(url).searchParams.get("sp") === "dogey"));
  assert.ok(calls.some((url) => new URL(url).searchParams.get("sp") === "dogsled"));
});

test("superlative forms recover doggonedest without changing the selected answer", async () => {
  const window = {};
  const calls = [];
  const fetch = async (url) => {
    const value = String(url);
    if (!value.includes("api.datamuse.com")) return { ok: true, json: async () => ({ formatVersion: 4, shards: {} }) };
    calls.push(value);
    const spelling = new URL(value).searchParams.get("sp");
    return {
      ok: true,
      json: async () => spelling === "doggoned"
        ? [{ word: "doggoned", defs: ["adj\tAlternative form of doggone."] }]
        : []
    };
  };
  vm.runInNewContext(definitionsScript, { window, fetch, URLSearchParams });
  const result = await window.MonkeyTacticsWordDefinitions.lookup("doggonedest");
  assert.equal(result.matchedWord, "doggoned");
  assert.equal(result.entries[0].word, "doggonedest");
  assert.equal(result.entries[0].sourceWord, "doggoned");
  assert.ok(calls.some((url) => new URL(url).searchParams.get("sp") === "doggoned"));
});

test("successful empty Datamuse lookups are cached but request failures are retryable", async () => {
  const window = {};
  const calls = [];
  const fetch = async (url) => {
    const value = String(url);
    if (!value.includes("api.datamuse.com")) return { ok: true, json: async () => ({ formatVersion: 4, shards: {} }) };
    calls.push(value);
    return { ok: true, json: async () => [] };
  };
  vm.runInNewContext(definitionsScript, { window, fetch, URLSearchParams });
  await window.MonkeyTacticsWordDefinitions.lookup("zzqxjkv");
  const firstLookupCalls = calls.length;
  await window.MonkeyTacticsWordDefinitions.lookup("zzqxjkv");
  assert.equal(calls.length, firstLookupCalls);

  const retryWindow = {};
  let apiAttempts = 0;
  const retryFetch = async (url) => {
    if (!String(url).includes("api.datamuse.com")) return { ok: true, json: async () => ({ formatVersion: 4, shards: {} }) };
    apiAttempts += 1;
    if (apiAttempts === 1) throw new Error("Temporary network failure");
    return { ok: true, json: async () => [] };
  };
  vm.runInNewContext(definitionsScript, { window: retryWindow, fetch: retryFetch, URLSearchParams });
  await assert.rejects(retryWindow.MonkeyTacticsWordDefinitions.lookup("retryword"));
  await retryWindow.MonkeyTacticsWordDefinitions.lookup("retryword");
  assert.equal(apiAttempts, 2);
});

test("matched WordNet definitions avoid remote lookup", () => {
  assert.match(script, /const normalizeHeadword = \(value\) => value\.toLowerCase\(\)\.replace\(\/\[\^a-z0-9\]\/g, ""\)/);
  assert.match(script, /entries\.find\(\(\{ word \}\) => normalizeHeadword\(word\) === requestedHeadword\)/);
  assert.doesNotMatch(script, /\|\| entries\[0\]/);
  assert.match(script, /function renderMatchedDefinition\(definition\)/);
  assert.match(script, /source\.textContent = "Matched WordNet definition"/);
  assert.match(script, /if \(matchedDefinition\) \{/);
  assert.match(script, /dictionaryModalBody\.replaceChildren\(\.\.\.localContent\);\s+window\.clearTimeout\(requestTimeout\);\s+dictionaryAbortController = null;\s+return;/);
  assert.match(script, /if \(!definitions\.childNodes\.length\) \{\s+throw new Error/);
});

test("synonym expansion is documented in visible and structured page content", () => {
  assert.match(html, /"featureList": \[[^\]]*"WordNet synonym and query expansion"/);
  assert.equal((html.match(/Can the solver understand synonyms\?/g) || []).length, 2);
  assert.equal((html.match(/related meanings broaden the results without replacing stronger direct matches/g) || []).length, 2);
});

test("dictionary definitions open after a stationary fine-pointer hover", () => {
  assert.match(script, /const DICTIONARY_HOVER_DELAY = 550/);
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

test("ranking guidance explains signals and how to verify candidates", () => {
  assert.match(html, /Open a candidate to see which signals contributed to its position/);
  assert.match(html, /Crossing letters are usually the strongest way to confirm a result/);
  assert.match(html, /tense, plurality, abbreviation, or theme/);
  assert.match(html, /plausible alternatives instead of treating the first result as certain/);
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

test("the sharing guide explains practical QR handoff benefits", () => {
  assert.match(html, /moving a candidate from a laptop to a phone or tablet/);
  assert.match(html, /without copying a URL, sending yourself a message, signing in/);
});
