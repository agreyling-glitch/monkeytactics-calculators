const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const siteRoot = path.resolve(__dirname, "..");

function loadPdfTextHelpers() {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");
  const start = html.indexOf("    function shouldSeparatePdfItems");
  const end = html.indexOf("    async function extractPdfText", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const context = {};
  vm.runInNewContext(
    html.slice(start, end) + "\nthis.pdfTextItemsToString = pdfTextItemsToString;",
    context
  );
  return context.pdfTextItemsToString;
}

test("PDF import preserves paragraph spacing without doubling wrapped lines", () => {
  const extract = loadPdfTextHelpers();
  const items = [
    { str: "First paragraph line one.", hasEOL: true, transform: [1, 0, 0, 10, 50, 700] },
    { str: "Wrapped line two.", hasEOL: true, transform: [1, 0, 0, 10, 50, 688] },
    { str: "Second paragraph.", hasEOL: true, transform: [1, 0, 0, 10, 50, 662] }
  ];

  assert.equal(extract(items), "First paragraph line one.\nWrapped line two.\n\nSecond paragraph.");
});

test("PDF import honors explicit blank end-of-line items", () => {
  const extract = loadPdfTextHelpers();
  const items = [
    { str: "First paragraph.", hasEOL: true, transform: [1, 0, 0, 10, 50, 700] },
    { str: "", hasEOL: true, transform: [1, 0, 0, 10, 50, 688] },
    { str: "Second paragraph.", hasEOL: true, transform: [1, 0, 0, 10, 50, 676] }
  ];

  assert.equal(extract(items), "First paragraph.\n\nSecond paragraph.");
});

test("unscramble modal pages results in groups of 15", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");
  const script = fs.readFileSync(
    path.join(siteRoot, "assets", "js", "tools", "word-character-counter", "integration.js"),
    "utf8"
  );

  assert.match(html, /id="unscramble-popup-pagination"/);
  assert.match(html, /id="unscramble-popup-previous"/);
  assert.match(html, /id="unscramble-popup-next"/);
  assert.match(html, /id="unscramble-popup-page-status"[^>]*aria-live="polite"/);
  assert.match(script, /const popupPageSize = 15;/);
  assert.match(script, /popupMatches\.slice\(start, start \+ popupPageSize\)/);
  assert.match(script, /popupPrevious\.disabled = popupPage === 0;/);
  assert.match(script, /popupNext\.disabled = popupPage === pageCount - 1;/);
});

test("word and character counter supports shared focus mode", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");

  assert.match(html, /class="tool-widget" data-focus-mode data-focus-mode-label="Word &amp; Character Counter"/);
  assert.match(html, /assets\/css\/shared\/focus-mode\.css\?v=/);
  assert.match(html, /assets\/js\/shared\/focus-mode\.js\?v=/);
  assert.match(html, /\[data-focus-mode\] \.counter-app-title \{ padding-right: 2\.75rem; \}/);
  assert.match(html, /\.tool-widget\.is-focus-mode \.calc-layout \{[^}]*flex: 1 1 auto;[^}]*min-height: 0;[^}]*align-items: stretch;/s);
  assert.match(html, /\.tool-widget\.is-focus-mode #text-input \{[^}]*flex: 1 1 auto;[^}]*min-height: 120px;/s);
  assert.match(html, /\.tool-widget\.is-focus-mode \.text-insights \{[^}]*flex: 0 1 auto;[^}]*max-height: 50%;/s);
});

test("word and character counter groups analysis into primary and text-detail tabs", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");
  const integration = fs.readFileSync(
    path.join(siteRoot, "assets", "js", "tools", "word-character-counter", "integration.js"),
    "utf8"
  );
  const analysisWorker = fs.readFileSync(
    path.join(siteRoot, "assets", "js", "tools", "word-character-counter", "analysis-worker.js"),
    "utf8"
  );
  const visualizations = fs.readFileSync(
    path.join(siteRoot, "assets", "js", "tools", "word-character-counter", "visualizations.js"),
    "utf8"
  );

  assert.match(html, /role="tablist" aria-label="Text analysis views"/);
  for (const name of ["text", "density", "phrases"]) {
    assert.match(html, new RegExp(`id="analysis-tab-${name}"[^>]+role="tab"[^>]+aria-controls="analysis-panel-${name}"`));
    assert.match(html, new RegExp(`id="analysis-panel-${name}"[^>]+role="tabpanel"[^>]+aria-labelledby="analysis-tab-${name}"`));
  }
  assert.match(html, /role="tablist" aria-label="Text details"/);
  for (const name of ["summary", "speed", "targets", "readability", "sentence-rhythm", "paragraph-structure"]) {
    assert.match(html, new RegExp(`id="text-insight-tab-${name}"[^>]+role="tab"[^>]+aria-controls="text-insight-panel-${name}"`));
    assert.match(html, new RegExp(`id="text-insight-panel-${name}"[^>]+role="tabpanel"[^>]+aria-labelledby="text-insight-tab-${name}"`));
  }
  assert.match(html, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
  assert.match(integration, /createReadabilitySection\(readabilityPanel\)/);
  assert.match(integration, /createVisualizationSections\(sentencePanel, paragraphPanel, phrasesPanel, keywordTable\)/);
  assert.match(integration, /function sentenceRanges\(text\)/);
  assert.match(integration, /sentenceAbbreviations\.has\(finalWord\.toLocaleLowerCase\("en"\)\)/);
  assert.match(integration, /if \(\/\\d\/\.test\(text\[index - 1\]/);
  assert.match(integration, /function paragraphRanges\(text\)/);
  assert.match(integration, /textInput\.setSelectionRange\(range\.start, range\.end, "forward"\)/);
  assert.match(integration, /function centerTextareaRange\(textarea, index\)/);
  assert.match(integration, /marker\.offsetTop - textarea\.clientHeight \/ 2/);
  assert.match(integration, /if \(textarea\.value\.length > 100000\)/);
  assert.match(integration, /progress \* textarea\.scrollHeight - textarea\.clientHeight \/ 2/);
  assert.match(integration, /let structureRepositionTimer = 0;/);
  assert.match(integration, /clearTimeout\(structureRepositionTimer\)/);
  assert.match(integration, /structureRepositionTimer = setTimeout\(function \(\)/);
  assert.match(integration, /\}, 300\);/);
  assert.match(integration, /while \(precedingStart > 0/);
  assert.doesNotMatch(integration, /text\.slice\(0, index\)\.match/);
  assert.match(integration, /function scheduleStructureRangeWarmup\(text\)/);
  assert.match(integration, /requestIdleCallback\(warmRanges, \{ timeout: 750 \}\)/);
  assert.match(integration, /renderActiveViews\(\);\s*scheduleStructureRangeWarmup\(text\);/);
  assert.match(integration, /visualizationElements\.onSegmentSelect = function \(type, index\)/);
  assert.match(integration, /visualizations\.js\?v=20260906-density-width-1/);
  assert.match(integration, /className: "chart-zoom-controls"/);
  assert.match(integration, /"data-chart-zoom": "fit"/);
  assert.match(visualizations, /const zoomLevels = \[1, 2, 4, 8, 16, 32, 64\];/);
  assert.match(integration, /className: "chart-scroll-spacer"/);
  assert.match(visualizations, /const virtualWidth = Math\.max/);
  assert.match(visualizations, /canvas\.style\.left = scrollLeft \+ "px"/);
  assert.match(visualizations, /viewport\?\.addEventListener\("scroll"/);
  assert.match(visualizations, /const firstVisibleIndex = Math\.max/);
  assert.match(visualizations, /const lastVisibleIndex = Math\.min/);
  assert.match(visualizations, /const barMaximumCache = new WeakMap\(\);/);
  assert.match(visualizations, /function canvasIsVisible\(canvas\)/);
  assert.match(visualizations, /if \(canvasIsVisible\(elements\.keywordCanvas\)\)/);
  assert.match(visualizations, /canvas\.style\.width = scrollViewport[\s\S]*: "100%";/);
  assert.match(visualizations, /canvas\.parentElement\?\.clientWidth/);
  assert.match(visualizations, /if \(viewport && nextZoom === 1\) viewport\.scrollLeft = 0;/);
  assert.match(visualizations, /nextZoom === 1[\s\S]*\? 0/);
  assert.match(visualizations, /if \(!event\.ctrlKey\) return;/);
  assert.match(html, /\.chart-scroll-viewport \{[\s\S]*overflow-x: auto;/);
  assert.match(integration, /renderer\.clearBarSelection\?\.\(\)/);
  assert.match(integration, /textInput\.addEventListener\("pointerdown"[\s\S]*renderer\.clearBarSelection\?\.\(\)/);
  assert.match(html, /#sentenceRhythmCanvas,[\s\S]*#paragraphStructureCanvas \{ cursor: pointer; \}/);
  assert.match(html, /textarea::\-webkit-resizer \{[\s\S]*rgba\(245,196,81,0\.62\)/);
  assert.match(html, /id="speakingWpm"[^>]+min="80" max="200" step="5" value="130"/);
  assert.match(html, /id="speakingWpmSlider"[^>]+value="130"/);
  assert.match(html, /id="speakingWpmVal">130<\/span> <span id="speakingSpeedUnit">wpm<\/span>/);
  assert.match(html, /id="resSpeaking">less than a minute<\/span>/);
  assert.match(html, /const speakingSeconds = Math\.ceil\(speedProfile\.amount \/ speakingWpm \* 60\)/);
  assert.match(html, /id="resLines">0<\/div>/);
  assert.match(html, /id="readingSpeedPreset"[\s\S]*Technical[\s\S]*Standard[\s\S]*Skimming/);
  assert.match(html, /id="speakingSpeedPreset"[\s\S]*Slow[\s\S]*Presentation[\s\S]*Conversational[\s\S]*Fast/);
  assert.match(html, /id="text-insight-panel-targets"[\s\S]*id="target-words-min"[\s\S]*id="target-words-max"[\s\S]*id="target-characters"[\s\S]*id="target-reading-minutes"[\s\S]*id="target-speaking-minutes"/);
  assert.doesNotMatch(html, /id="writing-targets-dialog"/);
  assert.match(html, /id="text-insight-panel-speed"[\s\S]*id="wpm"[\s\S]*id="speakingWpm"/);
  assert.match(html, /availableWithoutText = new Set\([\s\S]*text-insight-tab-speed[\s\S]*text-insight-tab-targets/);
  assert.match(html, /function renderTargetProgress\(stats\)/);
  assert.match(html, /id="word-counter-related-guides"[\s\S]*data-related-guides-tool="word-character-counter"/);
  assert.match(html, /Does Your Word Counter Upload Your Text\?/);
  assert.match(html, /related-guides\.js\?v=20260903-priority-1/);
  assert.ok(html.indexOf('id="word-counter-related-guides"') < html.indexOf('aria-labelledby="related-heading"'));
  assert.match(html, /word-character-counter#related-guides/);
  assert.match(html, /panel\.id === 'analysis-panel-text'/);
  assert.match(html, /panel\.classList\.toggle\('is-retained-inactive', !selected\)/);
  assert.match(html, /panel\.toggleAttribute\('inert', !selected\)/);
  assert.match(html, /\.analysis-tab-panel--text\.is-retained-inactive \{[\s\S]*position: absolute !important;[\s\S]*visibility: hidden;/);
  assert.match(html, /function countWordsLightweight\(text, language\)/);
  assert.match(html, /requestAnimationFrame\(renderAnalysis\)/);
  assert.match(integration, /const baseAnalysisDelay = 220;/);
  assert.match(integration, /function analysisDelayFor\(text\)/);
  assert.match(integration, /veryLargeDocumentCharacterThreshold\) return 700/);
  assert.match(html, /const largeDocumentCharacterThreshold = 250_000;/);
  assert.match(html, /summaryAnalysisTimer = setTimeout\(renderAnalysis, delay\)/);
  assert.match(html, /scheduleImmediateAnalysis\(\);\s+scheduleAutosave\(\);/);
  assert.match(integration, /analysis-worker\.js\?v=20260907-debug-flag-1/);
  assert.match(integration, /get\("analyzerDebug"\) === "parity"/);
  assert.match(integration, /workerUrl\.searchParams\.set\("parity", "1"\)/);
  assert.match(integration, /id !== latestRequestId \|\| text !== pendingText \|\| text !== textInput\.value/);
  assert.match(integration, /function renderActiveViews\(\)/);
  assert.match(integration, /const renderedRevision = \{ density: -1, phrases: -1, readability: -1, sentence: -1, paragraph: -1 \}/);
  assert.match(integration, /renderedRevision\.phrases !== analysisRevision/);
  assert.match(integration, /renderedRevision\.sentence !== analysisRevision/);
  assert.match(integration, /function currentAnalysisSupport\(\)/);
  assert.match(integration, /function getStructureRanges\(type\)/);
  assert.match(integration, /const averageCharacterWidth = context\.measureText\(sample\)\.width \/ sample\.length/);
  assert.match(integration, /targetRows \/ Math\.max\(1, completedRows\)/);
  assert.doesNotMatch(integration, /index \/ Math\.max\(1, textarea\.value\.length\)/);
  assert.match(analysisWorker, /self\.addEventListener\("message", async function/);
  assert.match(analysisWorker, /analyzeTextWithJavaScript/);
  assert.match(analysisWorker, /parityDiagnostics/);
  assert.match(analysisWorker, /const parityDebug = localhost && new URLSearchParams\(self\.location\.search\)\.get\("parity"\) === "1"/);
  assert.match(analysisWorker, /if \(!parityDebug\)/);
  assert.match(analysisWorker, /wasmInitializationMs/);
  assert.match(analysisWorker, /javascriptMedianMs/);
  assert.match(integration, /\[Analyzer parity\]/);
  assert.doesNotMatch(integration, /textInput\.addEventListener\("input",[\s\S]{0,200}updateMetrics\(\)/);
  assert.match(html, /targetWordsMax\.setCustomValidity\(invalidWordRange/);
  assert.match(html, /className = 'target-range-min-marker'/);
  assert.match(html, /within ' \+ wordMinimum\.toLocaleString\(\) \+ '–' \+ wordMaximum\.toLocaleString\(\)/);
  assert.match(html, /id="writing-targets-clear" type="button" aria-label="Clear all writing targets"[^>]+hidden>&times;<\/button>/);
  assert.match(html, /targetsClear\.hidden = definitions\.length === 0/);
  assert.match(html, /#writing-targets-clear \{[\s\S]*position: absolute;[\s\S]*color: #f87171;/);
  assert.match(html, /\.writing-targets-grid input\[type="number"\] \{ color-scheme: dark; accent-color: var\(--accent\); \}/);
  assert.match(html, /\.writing-targets-grid label \{[\s\S]*justify-content: stretch;[\s\S]*align-items: stretch;[\s\S]*margin-bottom: 0;/);
  assert.match(html, /\.word-target-fields \{ display: grid; grid-template-columns: repeat\(2,minmax\(0,1fr\)\);/);
  assert.match(html, /\.target-progress-chip\.is-over \{ border-color: rgba\(248,113,113,0\.65\); color: #f87171; \}/);
  assert.match(html, /\.target-progress-chip\.is-over progress \{ accent-color: #f87171; \}/);
  assert.match(html, /grid-template-columns: minmax\(20rem,26rem\) repeat\(3,minmax\(12rem,15rem\)\);[\s\S]*justify-content: start;[\s\S]*padding-right: 2rem;/);
  assert.match(integration, /visualizationElements\.onSegmentDeselect = function/);
  assert.match(html, /grid-template-columns: 76px minmax\(120px, 1fr\) 150px;/);
  assert.match(html, /#keyword-density-table th:nth-child\(2\),[\s\S]*#keyword-density-table td:nth-child\(2\) \{[\s\S]*width: 7rem;[\s\S]*text-align: right;/);
  assert.match(integration, /className: "chart-help-button"/);
  assert.match(integration, /"aria-label": "About " \+ title/);
  assert.match(integration, /className: "chart-help-dialog result-card"/);
  assert.equal((integration.match(/false, true\s*\n\s*\);/g) || []).length, 2);
  assert.match(html, /\.chart-help-button \{[\s\S]*position: absolute;[\s\S]*color: #f5c451;/);
  assert.match(html, /\.counter-tool-page \.text-insight-surface \.chart-help-dialog \{[\s\S]*background: #08130e;/);
  assert.match(integration, /keywordTable\.closest\("\.keywords-wrap"\)\.insertAdjacentElement\("afterend", keywords\.card\)/);
  assert.doesNotMatch(integration, /createExportSection/);
  assert.match(html, /class="keywords-section" id="keywordsSection" hidden/);
  assert.match(html, /\.tool-widget\.is-focus-mode #keywordsSection,[\s\S]*#ngram-section \{[\s\S]*flex: 1 1 auto;[\s\S]*min-height: 0;/);
  assert.match(integration, /keywordSection\.hidden = false/);
  assert.match(integration, /function keywordRowLimit\(\)/);
  assert.match(integration, /return Number\.POSITIVE_INFINITY/);
  assert.match(integration, /window\.addEventListener\("resize"/);
  assert.match(integration, /getStopwords\(language\)/);
  assert.match(integration, /Object\.entries\(data\.ngram_data\.unigrams\)/);
  assert.doesNotMatch(integration, /createUnscrambleButton/);
  assert.match(integration, /row\.addEventListener\("keydown"/);
  assert.match(integration, /function phraseRowLimit\(\)/);
  assert.match(integration, /renderNgramTables\(visualizationElements\.ngrams, latestAnalysis\.ngram_data, phraseRowLimit\(\)\)/);
  assert.match(html, /\.analysis-tab\[aria-selected="true"\][\s\S]*color: #f5c451;/);
  assert.match(html, /\.analysis-tabs \{[\s\S]*display: flex;[\s\S]*width: 100%;/);
  assert.match(html, /\.analysis-tab \{[\s\S]*border: 1px solid rgba\(245,196,81,0\.28\);[\s\S]*border-radius: 0\.35rem 0\.35rem 0 0;/);
  assert.match(html, /\.counter-tool-page \.analysis-tab-panel:not\(\[hidden\]\) \{[\s\S]*border: 1px solid rgba\(245,196,81,0\.34\);/);
  assert.match(html, /id="clear-keyword-selection"[^>]*hidden>Clear selection/);
  assert.match(integration, /const selectedKeywords = new Set\(\)/);
  assert.match(integration, /selectedKeywords\.size < 8/);
  assert.match(integration, /selectedKeywordPositions\(\)/);
  assert.match(integration, /clearKeywordSelection\.addEventListener\("click"/);
  assert.doesNotMatch(integration, /id: "readability-heading"/);
  assert.match(integration, /className: "readability-section text-insight-surface"/);
  assert.match(html, /class="text-insight-panel text-insight-surface" id="text-insight-panel-summary"/);
  assert.match(html, /\.counter-tool-page \.text-insight-panel:not\(\[hidden\]\) \{[\s\S]*border: 1px solid rgba\(245,196,81,0\.34\);[\s\S]*border-radius: 0 0\.7rem 0\.7rem 0\.7rem;/);
  assert.match(html, /\.text-insight-panel > \.keywords-section \{ margin-top: 0; \}/);
  assert.doesNotMatch(integration, /visualizations-heading/);
  assert.match(integration, /id: "sentenceRhythmSection"/);
  assert.match(integration, /id: "paragraphStructureSection"/);
  assert.match(integration, /className: "keywords-section text-insight-surface", id: "sentenceRhythmSection"/);
  assert.match(integration, /className: "keywords-section text-insight-surface", id: "paragraphStructureSection"/);
  assert.match(html, /\.counter-tool-page \.text-insight-surface \.result-card,[\s\S]*border-color: transparent;[\s\S]*background: transparent;/);
  assert.match(integration, /createReadabilitySection\(readabilityPanel\)[\s\S]*createVisualizationSections\(sentencePanel, paragraphPanel/);
  assert.doesNotMatch(html, /id="analysis-tab-structure"/);
  assert.doesNotMatch(html, /id="unscramble-selected-word"/);
  assert.match(html, /class="reading-speed-summary"><span id="wpmVal">200<\/span> <span id="readingSpeedUnit">wpm<\/span> &middot; <span id="resReading">less than a minute<\/span>/);
  assert.match(html, /#wpmVal,\s*#speakingWpmVal \{ color: var\(--accent\); font-weight: 700; \}/);
  assert.match(html, /\.reading-time-number \{ color: var\(--accent\); font-weight: 700; \}/);
  assert.match(html, /\.summary-count-number \{ color: var\(--accent\); font-weight: 700; \}/);
  assert.match(html, /class="summary-count-number"/);
  assert.match(html, /\.text-insight-tab \{[\s\S]*border-radius: 0\.35rem 0\.35rem 0 0;/);
  assert.match(html, /border: 1px solid rgba\(245,196,81,0\.28\);/);
  assert.match(html, /\.text-insight-tab\[aria-selected="true"\] \{[\s\S]*border-bottom-color: #0b1711;/);
  assert.match(html, /id="analysis-tab-density"[^>]+disabled/);
  assert.match(html, /id="analysis-tab-phrases"[^>]+disabled/);
  assert.match(html, /id="text-insight-tab-readability"[^>]+disabled/);
  assert.match(html, /id="text-insight-tab-sentence-rhythm"[^>]+disabled/);
  assert.match(html, /id="text-insight-tab-paragraph-structure"[^>]+disabled/);
  assert.match(html, /window\.dispatchEvent\(new CustomEvent\('analysis-content-state'/);
  assert.match(html, /\.analysis-tab:disabled,[\s\S]*\.text-insight-tab:disabled/);
  assert.match(html, /class="reading-time-number"/);
  assert.doesNotMatch(html, /<div class="result-label">Read Time<\/div>/);
});

test("unsupported-language text disables only the readability detail tab", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");
  const integration = fs.readFileSync(
    path.join(siteRoot, "assets", "js", "tools", "word-character-counter", "integration.js"),
    "utf8"
  );
  assert.match(html, /const supportsReadability = event\.detail\.supportsReadability !== false;[\s\S]*tab\.id === 'text-insight-tab-readability' && !supportsReadability/);
  assert.match(html, /Readability scores are available for English, Spanish, French, and German text/);
  assert.match(html, /if \(disableStopwords\) excludeStop\.checked = false;/);
  assert.match(html, /Stopword filtering unavailable for this language/);
  assert.match(html, /excludeStop\.checked = preferredExcludeStopwords/);
  assert.match(html, /id="analysis-language"[\s\S]*value="english"[\s\S]*value="chinese"[\s\S]*value="other"/);
  assert.match(html, /id="writing-assistance" type="checkbox" role="switch" aria-label="Browser writing assistance" checked/);
  assert.match(html, /spellcheck="true"[\s\S]*autocorrect="on"[\s\S]*autocapitalize="sentences"/);
  assert.match(html, /textInput\.lang = languageTags\[language\] \|\| '';/);
  assert.match(html, /textInput\.spellcheck = enabled;[\s\S]*setAttribute\('spellcheck', String\(enabled\)\)/);
  assert.doesNotMatch(html, /id="writing-assistance-state"/);
  assert.match(html, /word-character-counter-writing-assistance-v2/);
  assert.match(html, /confidentlyDetected \? 'Auto \(' \+ detectedLanguage \+ '\)' : 'Auto'/);
  assert.match(html, /editor-selection-status[\s\S]*id="analysis-language-hint" hidden>English assumed—choose a language for matching analysis/);
  assert.match(html, /function updateLanguageHint\(showAutoLatinHint\)/);
  assert.match(html, /setTimeout\(function \(\) \{ languageHint\.hidden = true; \}, 4500\)/);
  assert.doesNotMatch(html, /id="analysis-language-status"/);
  assert.match(html, /id="selection-statistics" hidden/);
  assert.match(html, /id="structure-navigation-status" hidden/);
  assert.match(html, /function updateSelectionStatistics\(\)/);
  assert.match(html, /selected\.words === 1 \? ' word · ' : ' words · '/);
  assert.match(integration, /structure-selection-change/);
  assert.match(integration, /name \+ " " \+ \(index \+ 1\) \+ " of " \+ ranges\.length/);
  assert.match(html, /id="draft-autosave" type="checkbox" role="switch" aria-label="Save draft locally" checked/);
  assert.match(html, /<details class="editor-preferences">[\s\S]*<summary>Editor settings<\/summary>[\s\S]*id="analysis-language"[\s\S]*id="writing-assistance"[\s\S]*id="draft-autosave"[\s\S]*<\/details>/);
  assert.match(html, /draft-storage\.js\?v=20260907-indexeddb-autosave-1/);
  assert.doesNotMatch(html, /Draft is too large to autosave|autosaveByteLimit/);
  assert.match(html, /const autosaveIdleDelay = 3_000;/);
  assert.match(html, /clearTimeout\(autosaveTimer\);[\s\S]*autosaveTimer = 0;[\s\S]*autosaveTimer = setTimeout\(saveDraft, autosaveIdleDelay\)/);
  assert.match(html, /autosaveWriteQueue\.then\(function \(\) \{ return saveDraftToBrowser\(state\); \}\)/);
  assert.match(html, /await loadDraftFromBrowser\(\)/);
  assert.match(html, /await deleteDraftFromBrowser\(\)/);
  assert.match(html, /autosaveWriteQueue/);
  assert.match(html, /legacyAutosaveDraftKey/);
  assert.doesNotMatch(html, /showAutosaveStatus\('Saved locally'\)/);
  assert.match(html, /id="autosave-control-label" aria-live="polite">Autosave<\/span>/);
  assert.match(html, /function setAutosaveSaving\(saving\)/);
  assert.match(html, /autosaveControlLabel\.textContent = saving \? 'Saving…' : 'Autosave'/);
  assert.match(html, /setAutosaveSaving\(true\);\s+autosaveTimer = setTimeout\(saveDraft, autosaveIdleDelay\)/);
  assert.match(html, /restoreDraft\(\)\.finally\(function \(\) \{[\s\S]*autosaveReady = true;[\s\S]*renderAnalysis\(\);/);
  assert.match(html, /class="editor-toolbar" role="toolbar" aria-label="Document actions"/);
  for (const action of ['new', 'open', 'download', 'save-pdf', 'print', 'cut', 'copy', 'paste', 'find', 'text-size']) {
    assert.match(html, new RegExp(`id="editor-${action}"`));
  }
  assert.equal((html.match(/class="btn-ghost" id="editor-(?:new|open|download|save-pdf|print|cut|copy|paste|find|text-size)"[^>]+data-tooltip=/g) || []).length, 10);
  assert.match(html, /id="editor-download"[\s\S]*id="editor-save-pdf"[\s\S]*id="editor-print"[\s\S]*id="editor-cut"[\s\S]*id="editor-copy"[\s\S]*id="editor-paste"[\s\S]*id="editor-find"/);
  assert.doesNotMatch(html, /id="clear-btn"|id="copy-btn"/);
  assert.match(html, /\.editor-toolbar \.btn-ghost::after \{[\s\S]*content: attr\(data-tooltip\)/);
  assert.match(html, /id="editor-find-dialog"[\s\S]*id="editor-find-next"[\s\S]*id="editor-replace"[\s\S]*id="editor-replace-all"/);
  assert.match(html, /\.editor-find-dialog \{[\s\S]*position: fixed;[\s\S]*inset: 50% auto auto 50%;[\s\S]*transform: translate\(-50%, -50%\);/);
  assert.match(html, /width: min\(92vw, 24rem\);/);
  assert.match(html, /id="editor-whole-words" type="checkbox"> Whole words/);
  assert.match(html, /id="editor-in-selection" type="checkbox"> In selection/);
  assert.match(html, /\.editor-find-options label \{[\s\S]*user-select: none;/);
  assert.match(html, /\.editor-find-options input \{[\s\S]*width: 0\.95rem;[\s\S]*box-shadow: none;/);
  assert.match(html, /function isWholeWordMatch\(source, needle, index\)/);
  assert.match(html, /editorWholeWords\.checked && !isWholeWordMatch/);
  assert.match(html, /function updateFindCount\(prefix = ''\)/);
  assert.match(html, /function centerFindMatchInEditor\(index\)/);
  assert.match(html, /marker\.offsetTop - textInput\.clientHeight \/ 2/);
  assert.match(html, /requestAnimationFrame\(function \(\) \{ centerFindMatchInEditor\(index\); \}\)/);
  assert.match(html, /let activeFindMatch = null;/);
  assert.match(html, /event\.key === 'Enter'[\s\S]*editorFindDialog\.open[\s\S]*textInput\.selectionStart === activeFindMatch\.start[\s\S]*findNext\(\);/);
  assert.match(html, /if \(editorFindDialog\.open\) updateFindCount\(\)/);
  assert.match(html, /editorFindText\.addEventListener\('input', function \(\) \{ updateFindCount\(\); \}\)/);
  assert.match(html, /count === 1 \? ' match' : ' matches'/);
  assert.match(html, /findSelectionScope = textInput\.selectionStart !== textInput\.selectionEnd/);
  assert.match(html, /editorFindDialog\.show\(\)/);
  assert.match(html, /event\.key !== 'Escape' \|\| !editorFindDialog\.open[\s\S]*editorFindDialog\.close\(\);[\s\S]*textInput\.focus\(\{ preventScroll: true \}\)/);
  assert.match(html, /link\.download = 'draft\.txt'/);
  assert.match(html, /const editorFileByteLimit = 5_000_000;/);
  assert.match(html, /const editorPdfByteLimit = 25_000_000;/);
  assert.match(html, /accept="\.txt,\.md,\.csv,\.pdf,[^"]+application\/pdf"/);
  assert.match(html, /import\('\/assets\/js\/vendor\/pdfjs\/pdf\.min\.mjs'\)/);
  assert.match(html, /page\.getTextContent\(\)/);
  assert.match(html, /Scanned images are ignored\./);
  assert.match(html, /Choose “Save as PDF” in the print dialog\./);
  assert.match(html, /#text-input\[data-text-size="small"\][\s\S]*#text-input\[data-text-size="medium"\][\s\S]*#text-input\[data-text-size="large"\]/);
  assert.match(html, /const editorTextSizes = \['small', 'medium', 'large'\];/);
  assert.match(html, /function applyEditorTextSize\(size\)/);
  assert.match(html, /textSize: textInput\.dataset\.textSize \|\| 'medium'/);
  assert.match(html, /printWindow\.document\.body\.append\(content\)/);
});
