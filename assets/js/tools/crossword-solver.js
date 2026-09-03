"use strict";

(function initializeCrosswordSolver() {
  const Engine = window.MonkeyTacticsWasm;
  const WordDefinitions = window.MonkeyTacticsWordDefinitions;
  const form = document.querySelector("#crossword-form");
  if (!form || !Engine || !WordDefinitions) return;

  const byId = (id) => document.getElementById(id);
  const clueInput = byId("crossword-clue");
  const patternInput = byId("crossword-pattern");
  const poolInput = byId("available-letters");
  const lengthInput = byId("word-length");
  const startsInput = byId("starts-with");
  const endsInput = byId("ends-with");
  const includeInput = byId("must-include");
  const excludeInput = byId("exclude-letters");
  const sortInput = byId("sort-results");
  const submitButton = byId("solve-button");
  const buttonLabel = byId("solve-button-label");
  const message = byId("form-message");
  const resultsHeading = byId("results-heading");
  const resultsSummary = byId("results-summary");
  const resultList = byId("word-results");
  const resultsRegion = byId("results");
  const clearButton = byId("clear-search");
  const activeFilterCount = byId("active-filter-count");
  const resetFiltersButton = byId("reset-crossword-filters");
  const dictionaryModal = byId("dictionary-modal");
  const dictionaryModalTitle = byId("dictionary-modal-title");
  const dictionaryModalBody = byId("dictionary-modal-body");
  const dictionaryModalClose = byId("dictionary-modal-close");
  const debugPanel = byId("crossword-debug-panel");
  const debugLast = byId("crossword-debug-last");
  const debugPie = byId("crossword-debug-pie");
  const debugCacheState = byId("crossword-debug-cache-state");
  const debugLastShards = byId("crossword-debug-last-shards");
  const debugLoadedShards = byId("crossword-debug-loaded-shards");
  const dictionaryMerriamLink = byId("dictionary-merriam-link");
  const dictionaryCollinsLink = byId("dictionary-collins-link");
  const dictionaryCopyButton = byId("dictionary-copy-word");
  const dictionaryCopyLabel = byId("dictionary-copy-label");
  const dictionaryPickButton = byId("dictionary-pick-word");
  const dictionaryPickLabel = byId("dictionary-pick-label");
  const pickListPanel = byId("crossword-pick-list");
  const pickListCount = byId("crossword-pick-count");
  const pickListMenuToggle = byId("crossword-pick-menu-toggle");
  const pickListMenu = byId("crossword-pick-menu");
  const pickListSort = byId("crossword-pick-sort");
  const pickListExport = byId("crossword-pick-export");
  const pickListImport = byId("crossword-pick-import");
  const pickListImportMode = byId("crossword-pick-import-mode");
  const pickListImportFile = byId("crossword-pick-import-file");
  const pickListImportStatus = byId("crossword-pick-import-status");
  const pickListClear = byId("crossword-pick-clear");
  const pickListEmpty = byId("crossword-pick-empty");
  const pickListEntriesElement = byId("crossword-pick-entries");
  const gridPositionOptions = byId("crossword-grid-positions");
  const shareModal = byId("crossword-share-modal");
  const shareModalTitle = byId("crossword-share-title");
  const shareModalClose = byId("crossword-share-close");
  const shareWord = byId("crossword-share-word");
  const shareMeta = byId("crossword-share-meta");
  const shareClue = byId("crossword-share-clue");
  const sharePattern = byId("crossword-share-pattern");
  const shareDefinition = byId("crossword-share-definition");
  const shareCopySummary = byId("crossword-share-copy-summary");
  const shareUrl = byId("crossword-share-url");
  const shareQrCanvas = byId("crossword-share-qr");
  const shareCopyQr = byId("crossword-share-copy-qr");
  const sampleButtons = document.querySelectorAll("[data-pattern]");
  const dictionaryInputs = form.querySelectorAll('input[name="dictionary"]');
  const offlineToggle = byId("crossword-offline-toggle");
  const offlineStatus = byId("crossword-offline-status");
  const offlineProgress = byId("crossword-offline-progress");
  const relatedGuides = byId("crossword-related-guides");
  const DICTIONARY_BITS = { enable: 1, sowpods: 2, both: 3 };
  const OFFLINE_VERSION = "20260903-wordnet-definitions-18";
  const OFFLINE_CACHE_PREFIX = "monkeytactics-crossword-offline-";
  const OFFLINE_STORAGE_KEY = "monkeytactics.crossword-solver.offline-cache";
  const DEBUG_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  const debugEnabled = DEBUG_HOSTS.has(window.location.hostname)
    && new URL(window.location.href).searchParams.get("DEBUG")?.toUpperCase() === "YES";
  const debugCounters = debugEnabled ? Object.create(null) : null;
  const debugResolutionCounts = debugEnabled ? { local: 0, api: 0, apiCache: 0 } : null;
  const debugTimings = debugEnabled ? { localTotal: 0, localCount: 0, apiTotal: 0, apiCount: 0, pipelineTotal: 0 } : null;
  const debugShardState = debugEnabled ? { loaded: new Set(), current: [], required: [] } : null;
  const DEBUG_COUNTER_EVENTS = {
    localLookup: "localLookups", localCacheHit: "localCacheHits", localShardLoad: "localShardLoads",
    localShardCacheHit: "localShardCacheHits", localMiss: "localMisses", datamuseCall: "datamuseCalls",
    datamuseCacheHit: "datamuseCacheHits", baseFormMatch: "baseFormMatches", localError: "lookupFailures"
  };

  function updateDebug(event, detail = {}) {
    if (!debugCounters) return;
    if (event === "lookupStart") {
      debugShardState.current = [];
      debugShardState.required = [];
      debugLastShards.textContent = "None";
      return;
    }
    if (event === "localLookupPlan") {
      debugShardState.required = detail.shards || [];
      updateDebugCacheState();
      return;
    }
    if (event === "localShardLoad" || event === "localShardCacheHit" || event === "localShardReady") {
      const shard = String(detail.shard);
      if (!debugShardState.current.includes(shard)) debugShardState.current.push(shard);
      debugLastShards.textContent = debugShardState.current.join(" → ");
      if (event === "localShardLoad") setDebugCacheState("Warming");
      if (event === "localShardReady") {
        debugShardState.loaded.add(shard);
        debugLoadedShards.textContent = [...debugShardState.loaded]
          .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10)).join(", ");
        updateDebugCacheState();
        return;
      }
    }
    if (event === "localDuration" || event === "datamuseDuration" || event === "pipelineDuration") {
      const milliseconds = Math.max(0, Number(detail.milliseconds) || 0);
      if (event === "localDuration") {
        debugTimings.localTotal += milliseconds;
        debugTimings.localCount += 1;
        debugPanel.querySelector('[data-debug-timing="localAverage"]').textContent = `${Math.round(debugTimings.localTotal / debugTimings.localCount)} ms`;
      } else if (event === "datamuseDuration") {
        debugTimings.apiTotal += milliseconds;
        debugTimings.apiCount += 1;
        debugPanel.querySelector('[data-debug-timing="apiAverage"]').textContent = `${Math.round(debugTimings.apiTotal / debugTimings.apiCount)} ms`;
      } else {
        debugTimings.pipelineTotal += milliseconds;
        debugPanel.querySelector('[data-debug-timing="pipelineTotal"]').textContent = `${Math.round(debugTimings.pipelineTotal)} ms`;
      }
      return;
    }
    if (event === "resolution") {
      const key = detail.source === "local" ? "local" : detail.cached ? "apiCache" : "api";
      if (key === "local") setDebugCacheState("Warm");
      debugResolutionCounts[key] += 1;
      const total = Object.values(debugResolutionCounts).reduce((sum, count) => sum + count, 0);
      const localPercent = (debugResolutionCounts.local / total) * 100;
      const apiPercent = (debugResolutionCounts.api / total) * 100;
      const apiCachePercent = (debugResolutionCounts.apiCache / total) * 100;
      debugPie.style.background = `conic-gradient(#4ade80 0 ${localPercent}%, #facc15 ${localPercent}% ${localPercent + apiPercent}%, #60a5fa ${localPercent + apiPercent}% 100%)`;
      debugPie.setAttribute("aria-label", `Definition sources: Local ${Math.round(localPercent)}%, API ${Math.round(apiPercent)}%, API cache ${Math.round(apiCachePercent)}%`);
      [["local", localPercent], ["api", apiPercent], ["apiCache", apiCachePercent]].forEach(([name, percent]) => {
        debugPanel.querySelector(`[data-debug-share="${name}"]`).textContent = `${Math.round(percent)}%`;
      });
      if (detail.outcome) debugLast.textContent = detail.outcome;
      return;
    }
    const counter = DEBUG_COUNTER_EVENTS[event] || event;
    debugCounters[counter] = (debugCounters[counter] || 0) + 1;
    const output = debugPanel.querySelector(`[data-debug-counter="${counter}"]`);
    if (output) output.textContent = String(debugCounters[counter]);
    if (detail.outcome) debugLast.textContent = detail.outcome;
  }

  if (debugEnabled) debugPanel.hidden = false;

  function setDebugCacheState(state) {
    if (!debugEnabled) return;
    debugCacheState.textContent = state;
    debugCacheState.dataset.state = state.toLowerCase();
  }

  function updateDebugCacheState() {
    if (!debugEnabled) return;
    const loadedRequired = debugShardState.required.filter((shard) => debugShardState.loaded.has(shard)).length;
    if (!debugShardState.loaded.size) setDebugCacheState("Cold");
    else if (debugShardState.required.length && loadedRequired === debugShardState.required.length) setDebugCacheState("Warm");
    else setDebugCacheState("Partial");
  }

  function recordPipelineDuration(started) {
    if (!debugEnabled) return;
    updateDebug("pipelineDuration", { milliseconds: performance.now() - started });
  }
  const CLUE_PHRASE_EXPANSIONS = new Map([
    ["garden area", ["plot"]],
    ["thrift store", ["selling"]],
    ["showed irritation", ["offended"]],
    ["expunged", ["remove"]],
    ["claim again", ["state"]],
    ["most unruly", ["wild"]]
  ]);
  const CLUE_TERM_EXPANSIONS = new Map([
    ["pigmented", ["colored"]]
  ]);
  const CLUE_ANSWER_EXPANSIONS = new Map([
    ["heading for", [{ answer: "toward", definition: "in the direction of", dictionaryBits: 3 }]],
    ["before in poems", [{ answer: "ere", definition: "before; archaic or poetic", dictionaryBits: 3 }]],
    ["before in poetry", [{ answer: "ere", definition: "before; archaic or poetic", dictionaryBits: 3 }]],
    ["lymph", [
      { answer: "node", definition: "lymph node", dictionaryBits: 3 },
      { answer: "nodes", definition: "lymph nodes", dictionaryBits: 3 }
    ]],
    ["press", [{ answer: "iron", definition: "press and smooth clothes", dictionaryBits: 3 }]],
    ["most unruly", [{ answer: "wildest", definition: "most unruly or uncontrolled", dictionaryBits: 3 }]]
  ]);
  const PickListStore = window.MonkeyTacticsCrosswordPickList;
  const PICK_GROUP_STATE_PREFIX = "monkeytactics.crossword-solver.pick-group.";
  const MANIFEST_URL = "/assets/data/words/manifest.enable-sowpods-v2.json";
  const CHUNK_BASE_URL = "/assets/data/words/";
  const CLUE_BASE_URL = "/assets/data/crossword-clues/";
  const CLUE_MANIFEST_URL = `${CLUE_BASE_URL}manifest.clues-v4.json?v=wordnet-3.0-phrases-v4`;
  const DEFINITION_BASE_URL = "/assets/data/word-definitions/";
  const DEFINITION_MANIFEST_URL = `${DEFINITION_BASE_URL}manifest.wordnet-definitions-v1.json?v=wordnet-3.0-definitions-v1`;
  const OFFLINE_CORE_URLS = [
    "/tools/crossword-solver.html",
    "/crossword-offline-sw.js",
    "/assets/css/shared/style.css?v=20260903-branded-scrollbars",
    "/assets/css/shared/premium-tool.css?v=20260807-2",
    "/assets/css/tools/crossword-solver.css?v=20260903-tight-offline-17",
    "/assets/css/shared/dictionary-selector.css?v=20260831-stable-mobile-7",
    "/assets/css/shared/focus-mode.css?v=20260829-2",
    "/assets/css/shared/trustpilot-review-collector.css?v=20260731-2",
    "/assets/js/shared/ads.js",
    "/assets/wasm/menu/menu.js?v=20260828-menu-manifest-v1",
    "/assets/wasm/menu/menu.css?v=20260828-menu-manifest-v1",
    "/assets/wasm/menu/menu_bg.wasm?v=20260828-menu-manifest-v1",
    "/assets/wasm/menu/tools-manifest.json",
    "/assets/js/tools/word-unscrambler/wasm-bridge.js?v=20260827-crossword-1",
    "/assets/wasm/word-unscrambler/word_unscrambler_engine.js?v=20260827-wwf-1",
    "/assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm?v=20260827-wwf-1",
    "/assets/js/vendor/qrcode-1.1.0.min.js",
    "/assets/js/tools/crossword-pick-list-store.js?v=20260901-grid-positions-1",
    "/assets/js/shared/focus-mode.js?v=20260829-2",
    "/assets/js/shared/word-definitions.js?v=20260903-wordnet-definitions-10",
    "/assets/js/shared/related-guides.js?v=20260903-priority-1",
    "/assets/js/tools/crossword-solver.js?v=20260903-wordnet-definitions-18",
    "/assets/images/trustpilot-review.svg",
    MANIFEST_URL,
    CLUE_MANIFEST_URL
  ];
  let manifest;
  let clueManifest;
  let clueIndex;
  let searchRequest = 0;
  const loadedChunks = new Set();
  const chunkPromises = new Map();
  const clueShards = new Map();
  const clueShardPromises = new Map();
  let dictionaryRequest = 0;
  let dictionaryReturnFocus = null;
  let dictionaryAbortController = null;
  let dictionaryWord = "";
  let copyFeedbackTimeout = 0;
  let dictionaryHoverTimeout = 0;
  const DICTIONARY_HOVER_DELAY = 550;
  let pickListEntries = PickListStore?.read() || [];
  let currentPickContext = null;
  let currentShareEntry = null;
  let shareReturnFocus = null;
  let offlineCacheName = "";
  try { offlineCacheName = localStorage.getItem(OFFLINE_STORAGE_KEY) || ""; } catch (_error) { /* Storage may be unavailable. */ }
  let offlineModeEnabled = Boolean(offlineCacheName);

  function renderOfflineState(message = "") {
    if (!offlineToggle || !offlineStatus) return;
    offlineToggle.textContent = offlineModeEnabled ? "Disable Offline Mode" : "Enable Offline Mode";
    offlineStatus.textContent = message || (offlineModeEnabled
      ? "Ready offline. Definition lookups use local WordNet only; Datamuse is disabled."
      : "Download the complete solver for use without an internet connection (about 15 MB).");
    if (relatedGuides) relatedGuides.hidden = offlineModeEnabled;
    if (offlineModeEnabled) {
      dictionaryMerriamLink.hidden = true;
      dictionaryCollinsLink.hidden = true;
    } else if (dictionaryModal.open) {
      const selectedDictionary = [...dictionaryInputs].find((input) => input.checked)?.value || "enable";
      dictionaryMerriamLink.hidden = selectedDictionary === "sowpods";
      dictionaryCollinsLink.hidden = selectedDictionary === "enable";
    }
  }

  async function buildOfflineUrls() {
    const [wordResponse, clueResponse, definitionResponse] = await Promise.all([
      fetch(MANIFEST_URL, { cache: "no-store" }),
      fetch(CLUE_MANIFEST_URL, { cache: "no-store" }),
      fetch(DEFINITION_MANIFEST_URL, { cache: "no-store" })
    ]);
    if (!wordResponse.ok || !clueResponse.ok || !definitionResponse.ok) throw new Error("Offline data manifests could not be loaded.");
    const [wordData, clueData, definitionData] = await Promise.all([wordResponse.json(), clueResponse.json(), definitionResponse.json()]);
    const wordUrls = Object.values(wordData.chunks || {}).map(({ file }) => `${CHUNK_BASE_URL}${file}`);
    const clueUrls = [
      `${CLUE_BASE_URL}${clueData.index.file}?v=${clueData.datasetVersion}`,
      ...Object.values(clueData.shards || {}).flatMap((shard) => (shard.parts || [shard])
        .map(({ file }) => `${CLUE_BASE_URL}${file}?v=${clueData.datasetVersion}`))
    ];
    const definitionUrls = [
      DEFINITION_MANIFEST_URL,
      ...Object.values(definitionData.shards || {}).map(({ file }) => `${DEFINITION_BASE_URL}${file}?v=${definitionData.datasetVersion}`)
    ];
    return [...new Set([...OFFLINE_CORE_URLS, ...wordUrls, ...clueUrls, ...definitionUrls])];
  }

  async function cacheOfflineUrl(cache, url) {
    const request = new Request(url, { cache: "reload", credentials: "same-origin" });
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Offline download failed for ${url}.`);
    await cache.put(request, response);
  }

  async function enableOfflineMode() {
    if (!("serviceWorker" in navigator) || !("caches" in window)) throw new Error("Offline Mode is not supported by this browser.");
    await navigator.serviceWorker.register("/crossword-offline-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const urls = await buildOfflineUrls();
    const nextCacheName = `${OFFLINE_CACHE_PREFIX}${OFFLINE_VERSION}-${Date.now()}`;
    const cache = await caches.open(nextCacheName);
    offlineProgress.hidden = false;
    offlineProgress.max = urls.length;
    offlineProgress.value = 0;
    let completed = 0;
    let cursor = 0;
    try {
      const workers = Array.from({ length: Math.min(4, urls.length) }, async () => {
        while (cursor < urls.length) {
          const url = urls[cursor++];
          await cacheOfflineUrl(cache, url);
          completed += 1;
          offlineProgress.value = completed;
          offlineStatus.textContent = `Downloading offline data: ${completed} of ${urls.length} files…`;
        }
      });
      await Promise.all(workers);
      const page = await cache.match("/tools/crossword-solver.html");
      if (!page) throw new Error("The offline page could not be verified.");
      await cache.put("/tools/crossword-solver", page.clone());
      localStorage.setItem(OFFLINE_STORAGE_KEY, nextCacheName);
      for (const name of await caches.keys()) {
        if (name.startsWith(OFFLINE_CACHE_PREFIX) && name !== nextCacheName) await caches.delete(name);
      }
      offlineCacheName = nextCacheName;
      offlineModeEnabled = true;
      try { await navigator.storage?.persist?.(); } catch (_error) { /* Persistence is optional. */ }
      renderOfflineState(`Ready offline. ${urls.length} files downloaded; Datamuse is disabled.`);
    } catch (error) {
      await caches.delete(nextCacheName);
      throw error;
    } finally {
      offlineProgress.hidden = true;
    }
  }

  async function disableOfflineMode() {
    if (offlineCacheName) await caches.delete(offlineCacheName);
    try { localStorage.removeItem(OFFLINE_STORAGE_KEY); } catch (_error) { /* Storage may be unavailable. */ }
    offlineCacheName = "";
    offlineModeEnabled = false;
    renderOfflineState("Offline data removed. Datamuse fallback is available again when online.");
  }

  async function toggleOfflineMode() {
    offlineToggle.disabled = true;
    try {
      if (offlineModeEnabled) await disableOfflineMode();
      else await enableOfflineMode();
    } catch (error) {
      console.error("Offline Mode failed:", error);
      renderOfflineState("Offline Mode could not be enabled. Check your connection and available browser storage, then try again.");
    } finally {
      offlineToggle.disabled = false;
    }
  }

  function normalizePattern(value) {
    return value.toLowerCase().replace(/[._-]/g, "?").replace(/\s+/g, "").replace(/[^a-z?*]/g, "");
  }

  function normalizeLetters(value) {
    return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z?]/g, "");
  }

  function fixedPatternLength(pattern) {
    return pattern.includes("*") ? 0 : pattern.length;
  }

  function tokenizeClue(value) {
    const stopWords = new Set(clueIndex?.stopWords || []);
    return [...new Set((value.toLowerCase().normalize("NFKD").match(/[a-z0-9]+/g) || [])
      .filter((token) => token.length > 1 && !stopWords.has(token)))];
  }

  function queryForms(token) {
    const forms = new Set([token]);
    if (token.length > 4 && token.endsWith("ies")) forms.add(`${token.slice(0, -3)}y`);
    if (token.length > 4 && token.endsWith("es")) forms.add(token.slice(0, -2));
    if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) forms.add(token.slice(0, -1));
    if (token.length > 5 && token.endsWith("ing")) {
      forms.add(token.slice(0, -3));
      forms.add(`${token.slice(0, -3)}e`);
    }
    if (token.length > 4 && token.endsWith("ed")) {
      forms.add(token.slice(0, -2));
      forms.add(`${token.slice(0, -1)}`);
    }
    for (const expansion of CLUE_TERM_EXPANSIONS.get(token) || []) forms.add(expansion);
    return [...forms];
  }

  function hasPluralClueTerm(value) {
    const withoutPossessives = value.toLowerCase().replace(/\b([a-z]+)['’]s\b/g, "$1");
    return (withoutPossessives.match(/[a-z]+/g) || []).some((token) => {
      if (token.length > 4 && token.endsWith("ies")) return true;
      if (token.length > 4 && token.endsWith("es")) return true;
      return token.length > 3 && token.endsWith("s") && !token.endsWith("ss");
    });
  }

  function pluralizeAnswer(record) {
    if (record.wordCount !== 1 || !/^[a-z]+$/.test(record.answer)) return null;
    const answer = record.answer;
    let plural;
    if (/[^aeiou]y$/.test(answer)) plural = `${answer.slice(0, -1)}ies`;
    else if (/(?:s|x|z|ch|sh)$/.test(answer)) plural = `${answer}es`;
    else plural = `${answer}s`;
    return { answer: plural, displayAnswer: plural, length: plural.length, inflected: true };
  }

  function singularizeAnswer(record) {
    if (record.wordCount !== 1 || !/^[a-z]+$/.test(record.answer)) return null;
    const answer = record.answer;
    let singular;
    if (answer.length > 4 && answer.endsWith("ies")) singular = `${answer.slice(0, -3)}y`;
    else if (answer.length > 4 && /(?:ses|xes|zes|ches|shes)$/.test(answer)) singular = answer.slice(0, -2);
    else if (answer.length > 3 && answer.endsWith("s") && !answer.endsWith("ss")) singular = answer.slice(0, -1);
    else return null;
    return { answer: singular, displayAnswer: singular, length: singular.length, inflected: true, singularInflected: true };
  }

  function pastTenseAnswer(record) {
    if (record.wordCount !== 1 || !/^[a-z]+$/.test(record.answer)) return null;
    const answer = record.answer;
    if (answer.endsWith("ed")) return null;
    let past;
    if (answer.endsWith("e")) past = `${answer}d`;
    else if (/[^aeiou]y$/.test(answer)) past = `${answer.slice(0, -1)}ied`;
    else past = `${answer}ed`;
    return { answer: past, displayAnswer: past, length: past.length, inflected: true, pastInflected: true };
  }

  function repeatedActionAnswer(record) {
    if (record.wordCount !== 1 || !/^[a-z]+$/.test(record.answer) || record.answer.startsWith("re")) return null;
    const answer = `re${record.answer}`;
    return { answer, displayAnswer: answer, length: answer.length, repeatedAction: true };
  }

  function superlativeAnswer(record) {
    if (record.wordCount !== 1 || !/^[a-z]+$/.test(record.answer)) return null;
    const answer = record.answer;
    let superlative;
    if (/[^aeiou]y$/.test(answer)) superlative = `${answer.slice(0, -1)}iest`;
    else if (answer.endsWith("e")) superlative = `${answer}st`;
    else if (/[^aeiou][aeiou][^aeiouwxy]$/.test(answer)) superlative = `${answer}${answer.at(-1)}est`;
    else superlative = `${answer}est`;
    return { answer: superlative, displayAnswer: superlative, length: superlative.length, superlative: true };
  }

  function phraseConceptTerms(value) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return [...new Set([...CLUE_PHRASE_EXPANSIONS]
      .filter(([phrase]) => ` ${normalized} `.includes(` ${phrase} `))
      .flatMap(([, terms]) => terms))];
  }

  function supplementalClueAnswers(value) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return [...CLUE_ANSWER_EXPANSIONS]
      .filter(([phrase]) => ` ${normalized} `.includes(` ${phrase} `))
      .flatMap(([, answers]) => answers);
  }

  function isOneEditAway(left, right) {
    if (Math.abs(left.length - right.length) > 1 || left === right) return false;
    let leftIndex = 0;
    let rightIndex = 0;
    let edits = 0;
    while (leftIndex < left.length && rightIndex < right.length) {
      if (left[leftIndex] === right[rightIndex]) {
        leftIndex += 1;
        rightIndex += 1;
        continue;
      }
      edits += 1;
      if (edits > 1) return false;
      if (left.length > right.length) leftIndex += 1;
      else if (right.length > left.length) rightIndex += 1;
      else {
        leftIndex += 1;
        rightIndex += 1;
      }
    }
    return edits + Number(leftIndex < left.length || rightIndex < right.length) === 1;
  }

  function globMatches(word, pattern) {
    if (!pattern) return true;
    let wordIndex = 0;
    let patternIndex = 0;
    let starIndex = -1;
    let starWordIndex = 0;
    while (wordIndex < word.length) {
      if (patternIndex < pattern.length && (pattern[patternIndex] === "?" || pattern[patternIndex] === word[wordIndex])) {
        wordIndex += 1;
        patternIndex += 1;
      } else if (pattern[patternIndex] === "*") {
        starIndex = patternIndex;
        patternIndex += 1;
        starWordIndex = wordIndex;
      } else if (starIndex >= 0) {
        starWordIndex += 1;
        wordIndex = starWordIndex;
        patternIndex = starIndex + 1;
      } else return false;
    }
    while (pattern[patternIndex] === "*") patternIndex += 1;
    return patternIndex === pattern.length;
  }

  function updateActiveFilterCount() {
    const active = [
      Number.parseInt(lengthInput.value || "0", 10) > 0,
      sortInput.value !== "alpha",
      normalizeLetters(poolInput.value).length > 0,
      startsInput.value.trim().length > 0,
      endsInput.value.trim().length > 0,
      includeInput.value.trim().length > 0,
      excludeInput.value.trim().length > 0
    ].filter(Boolean).length;
    activeFilterCount.textContent = `(${active} active)`;
    resetFiltersButton.hidden = active === 0;
  }

  function resetFilters() {
    lengthInput.value = "0";
    sortInput.value = "alpha";
    poolInput.value = "";
    startsInput.value = "";
    endsInput.value = "";
    includeInput.value = "";
    excludeInput.value = "";
    showMessage("");
    updateActiveFilterCount();
  }

  async function decodeChunk(response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
    if (!("DecompressionStream" in window)) throw new Error("Gzip decompression is unavailable.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  async function loadClueManifest() {
    if (clueManifest) return clueManifest;
    const response = await fetch(CLUE_MANIFEST_URL);
    if (!response.ok) throw new Error("Clue manifest failed.");
    const data = await response.json();
    if (data?.formatVersion !== 4 || !data.index || !data.shards) throw new Error("Clue manifest is invalid.");
    clueManifest = data;
    return data;
  }

  async function loadClueIndex() {
    if (clueIndex) return clueIndex;
    const data = await loadClueManifest();
    const response = await fetch(`${CLUE_BASE_URL}${data.index.file}?v=${data.datasetVersion}`);
    if (!response.ok) throw new Error("Clue index failed.");
    clueIndex = JSON.parse(await decodeChunk(response));
    return clueIndex;
  }

  async function loadClueShard(length) {
    const key = length > 15 ? "16-plus" : String(length);
    if (clueShards.has(key)) return clueShards.get(key);
    if (clueShardPromises.has(key)) return clueShardPromises.get(key);
    const promise = (async () => {
      const data = await loadClueManifest();
      const shard = data.shards[key];
      if (!shard) return [];
      const parts = shard.parts || [shard];
      const records = (await Promise.all(parts.map(async (part) => {
        const response = await fetch(`${CLUE_BASE_URL}${part.file}?v=${data.datasetVersion}`);
        if (!response.ok) throw new Error(`Clue shard ${key} failed.`);
        return JSON.parse(await decodeChunk(response));
      }))).flat().map(([id, clue, answer, displayAnswer, wordCount, answerLength, quality, sourceBits, dictionaryBits]) =>
        ({ id, clue, answer, displayAnswer, wordCount, length: answerLength, quality, sourceBits, dictionaryBits }));
      records.forEach((record) => WordDefinitions.register(record.answer, record.clue));
      clueShards.set(key, records);
      return records;
    })();
    clueShardPromises.set(key, promise);
    try { return await promise; } finally { clueShardPromises.delete(key); }
  }

  async function loadChunk(letter) {
    if (loadedChunks.has(letter)) return;
    if (chunkPromises.has(letter)) return chunkPromises.get(letter);
    const chunk = manifest?.chunks?.[letter];
    if (!chunk) return;
    const promise = (async () => {
      const response = await fetch(`${CHUNK_BASE_URL}${chunk.file}`);
      if (!response.ok) throw new Error(`Dictionary chunk ${letter} failed.`);
      const text = await decodeChunk(response);
      Engine.initEngine(text.split(/\r?\n/).filter(Boolean));
      loadedChunks.add(letter);
    })();
    chunkPromises.set(letter, promise);
    try { await promise; } finally { chunkPromises.delete(letter); }
  }

  async function loadForPattern(pattern) {
    const first = pattern[0];
    if (first && /^[a-z]$/.test(first)) {
      await loadChunk(first);
      return;
    }
    await Promise.all(Object.keys(manifest.chunks).map(loadChunk));
  }

  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  function setBusy(busy, label = "Find matching words") {
    resultsRegion.setAttribute("aria-busy", String(busy));
    submitButton.disabled = busy;
    buttonLabel.textContent = busy ? label : "Find matching words";
  }

  function highlightWord(word, pattern) {
    const fragment = document.createDocumentFragment();
    const gridWord = word.replace(/[^A-Z]/g, "");
    const exactPattern = !pattern.includes("*") && pattern.length === gridWord.length;
    let gridIndex = 0;
    [...word].forEach((letter) => {
      const span = document.createElement("span");
      span.textContent = letter;
      if (!/[A-Z]/.test(letter)) span.className = "phrase-separator";
      else {
        span.className = exactPattern && pattern[gridIndex] !== "?" ? "known-letter" : "found-letter";
        gridIndex += 1;
      }
      fragment.append(span);
    });
    return fragment;
  }

  function renderDictionaryEntries(entries, requestedWord, sourceName = "Datamuse", matchedWord = requestedWord) {
    const fragment = document.createDocumentFragment();
    const normalizeHeadword = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const requestedHeadword = normalizeHeadword(requestedWord);
    const entry = entries.find(({ word }) => normalizeHeadword(word) === requestedHeadword);
    const partNames = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", u: "definition" };
    const groupedDefinitions = new Map();
    (entry?.defs || []).forEach((rawDefinition) => {
      const separator = rawDefinition.indexOf("\t");
      const part = separator >= 0 ? rawDefinition.slice(0, separator) : "u";
      const definition = separator >= 0 ? rawDefinition.slice(separator + 1) : rawDefinition;
      if (!groupedDefinitions.has(part)) groupedDefinitions.set(part, []);
      groupedDefinitions.get(part).push(definition.trim());
    });
    groupedDefinitions.forEach((definitions, part) => {
      const section = document.createElement("section");
      section.className = "dictionary-entry";
      const heading = document.createElement("div");
      heading.className = "dictionary-entry-heading";
      const partOfSpeech = document.createElement("strong");
      const baseFormLabel = normalizeHeadword(matchedWord) !== requestedHeadword ? ` for ${matchedWord} (base form)` : "";
      partOfSpeech.textContent = sourceName === "WordNet 3.0"
        ? `Local WordNet ${partNames[part] || part}${baseFormLabel}`
        : `${partNames[part] || part}${baseFormLabel}`;
      heading.append(partOfSpeech);
      const list = document.createElement("ol");
      list.className = "dictionary-definitions";
      definitions.slice(0, 5).forEach((definition) => {
        const item = document.createElement("li");
        item.textContent = definition;
        list.append(item);
      });
      section.append(heading, list);
      fragment.append(section);
    });
    return fragment;
  }

  function renderMatchedDefinition(definition) {
    if (!definition) return null;
    const section = document.createElement("section");
    section.className = "dictionary-entry dictionary-entry-local";
    const heading = document.createElement("div");
    heading.className = "dictionary-entry-heading";
    const source = document.createElement("strong");
    source.textContent = "Matched WordNet definition";
    heading.append(source);
    const list = document.createElement("ol");
    list.className = "dictionary-definitions";
    const item = document.createElement("li");
    item.textContent = definition;
    list.append(item);
    section.append(heading, list);
    return section;
  }

  const SCORE_LABELS = {
    directClue: "Direct clue meaning", synonym: "Same-synset meaning", graph: "WordNet graph relation",
    phraseConcept: "Clue phrase concept", exactPhrase: "Exact clue phrase", allClueTerms: "All clue terms", sourceQuality: "Source quality",
    inflectionFit: "Clue grammar", derivationFit: "Again / re- form", spellingFit: "Near spelling", knownLetters: "Known pattern letters", lengthFit: "Answer length"
  };

  function renderScoreBreakdown(scoreBreakdown, matchExplanation) {
    if (!scoreBreakdown) return null;
    const section = document.createElement("section");
    section.className = "crossword-score-breakdown";
    const heading = document.createElement("div");
    heading.className = "crossword-score-heading";
    const title = document.createElement("strong");
    title.textContent = "Why this result?";
    const total = document.createElement("span");
    total.textContent = `${Math.round(scoreBreakdown.total)} strength`;
    heading.append(title, total);
    const summary = document.createElement("p");
    summary.className = "crossword-score-summary";
    summary.textContent = matchExplanation || "Ranked from clue meaning and crossword constraints";
    const rows = document.createElement("div");
    rows.className = "crossword-score-rows";
    const active = Object.entries(SCORE_LABELS).filter(([key]) => scoreBreakdown[key] > 0);
    const maximum = Math.max(...active.map(([key]) => scoreBreakdown[key]), 1);
    active.forEach(([key, label]) => {
      const row = document.createElement("div");
      row.className = "crossword-score-row";
      const name = document.createElement("span");
      name.textContent = label;
      const track = document.createElement("i");
      const bar = document.createElement("b");
      bar.style.width = `${Math.max(4, (scoreBreakdown[key] / maximum) * 100)}%`;
      track.append(bar);
      const value = document.createElement("em");
      value.textContent = `+${Math.round(scoreBreakdown[key])}`;
      row.append(name, track, value);
      rows.append(row);
    });
    section.append(heading, summary, rows);
    return section;
  }

  function cancelDictionaryHover() {
    window.clearTimeout(dictionaryHoverTimeout);
    dictionaryHoverTimeout = 0;
  }

  function bindDictionaryTrigger(trigger, word, context) {
    trigger.addEventListener("click", () => {
      cancelDictionaryHover();
      openDictionary(word, trigger, true, context);
    });
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const schedulePreview = () => {
      cancelDictionaryHover();
      dictionaryHoverTimeout = window.setTimeout(() => {
        dictionaryHoverTimeout = 0;
        if (trigger.matches(":hover") && !dictionaryModal.open) openDictionary(word, trigger, false, context);
      }, DICTIONARY_HOVER_DELAY);
    };
    trigger.addEventListener("pointerenter", schedulePreview);
    trigger.addEventListener("pointermove", schedulePreview);
    trigger.addEventListener("pointerleave", cancelDictionaryHover);
  }

  async function openDictionary(word, trigger, returnFocus, context) {
    const pipelineStarted = debugEnabled ? performance.now() : 0;
    updateDebug("lookupStart");
    updateDebug("definitionOpens");
    const request = ++dictionaryRequest;
    dictionaryAbortController?.abort();
    dictionaryAbortController = new AbortController();
    const requestTimeout = window.setTimeout(() => dictionaryAbortController?.abort(), 8000);
    dictionaryReturnFocus = returnFocus ? trigger : null;
    dictionaryWord = word;
    currentPickContext = { word, ...context };
    updateDictionaryPickButton();
    window.clearTimeout(copyFeedbackTimeout);
    dictionaryCopyLabel.textContent = "Copy word";
    dictionaryCopyButton.classList.remove("is-copied");
    dictionaryModalTitle.textContent = word;
    const selectedDictionary = [...dictionaryInputs].find((input) => input.checked)?.value || "enable";
    dictionaryMerriamLink.href = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;
    dictionaryMerriamLink.hidden = offlineModeEnabled || selectedDictionary === "sowpods";
    dictionaryCollinsLink.hidden = offlineModeEnabled || selectedDictionary === "enable";
    const matchedDefinition = renderMatchedDefinition(context?.definition);
    const additionalLocalEntries = WordDefinitions.getLocal(word).map((entry) => ({
      ...entry,
      defs: entry.defs.filter((rawDefinition) => rawDefinition.slice(rawDefinition.indexOf("\t") + 1).trim() !== context?.definition)
    }));
    const additionalLocalDefinitions = renderDictionaryEntries(additionalLocalEntries, word, "WordNet 3.0");
    const scoreBreakdown = renderScoreBreakdown(context?.scoreBreakdown, context?.matchExplanation);
    const localContent = [matchedDefinition, ...(additionalLocalDefinitions.childNodes.length ? [additionalLocalDefinitions] : []), scoreBreakdown].filter(Boolean);
    const loading = document.createElement("p");
    loading.className = "dictionary-modal-status";
    loading.textContent = matchedDefinition ? "Using the matched local definition…" : `Checking local definitions for ${word}…`;
    dictionaryModalBody.replaceChildren(...localContent, loading);
    if (!dictionaryModal.open) dictionaryModal.showModal();
    dictionaryModalClose.focus();
    if (matchedDefinition) {
      updateDebug("matchedDefinitionHits", { outcome: `${word}: matched WordNet definition` });
      updateDebug("resolution", { source: "local", cached: true, outcome: `${word}: matched WordNet definition` });
      if (debugEnabled) updateDebug("localDuration", { milliseconds: performance.now() - pipelineStarted });
      recordPipelineDuration(pipelineStarted);
      dictionaryModalBody.replaceChildren(...localContent);
      window.clearTimeout(requestTimeout);
      dictionaryAbortController = null;
      return;
    }
    try {
      const result = await WordDefinitions.lookup(word, {
        signal: dictionaryAbortController.signal,
        allowRemote: !offlineModeEnabled,
        debug: debugEnabled ? updateDebug : undefined
      });
      if (request !== dictionaryRequest || !dictionaryModal.open) return;
      const definitions = renderDictionaryEntries(result.entries, word, result.source === "local" ? "WordNet 3.0" : "Datamuse", result.matchedWord);
      if (!definitions.childNodes.length) {
        throw new Error("Definition unavailable");
      } else {
        dictionaryModalBody.replaceChildren(...localContent, definitions);
        updateDebug("resolution", { source: result.source, cached: result.cached, outcome: `${word}: ${result.source}${result.matchedWord !== WordDefinitions.normalizeWord(word) ? ` via ${result.matchedWord}` : ""}` });
      }
    } catch (error) {
      if (request !== dictionaryRequest || !dictionaryModal.open) return;
      updateDebug("lookupFailures", { outcome: `${word}: definition unavailable` });
      const unavailable = document.createElement("p");
      unavailable.className = "dictionary-modal-status";
      unavailable.textContent = offlineModeEnabled
        ? `A local definition for ${word} is not available in Offline Mode.`
        : `A definition for ${word} is not available here. Use the dictionary links below to continue.`;
      dictionaryModalBody.replaceChildren(unavailable);
    } finally {
      recordPipelineDuration(pipelineStarted);
      window.clearTimeout(requestTimeout);
      if (request === dictionaryRequest) dictionaryAbortController = null;
    }
  }

  async function copyDictionaryWord() {
    if (!dictionaryWord) return;
    const text = dictionaryWord.toUpperCase();
    let temporary;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        temporary = document.createElement("textarea");
        temporary.value = text;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.append(temporary);
        temporary.select();
        if (!document.execCommand("copy")) throw new Error("Copy command failed.");
      }
      dictionaryCopyLabel.textContent = "Copied";
      dictionaryCopyButton.classList.add("is-copied");
      window.clearTimeout(copyFeedbackTimeout);
      copyFeedbackTimeout = window.setTimeout(() => {
        if (!dictionaryCopyButton.isConnected) return;
        dictionaryCopyLabel.textContent = "Copy word";
        dictionaryCopyButton.classList.remove("is-copied");
      }, 1600);
    } catch (error) {
      dictionaryCopyLabel.textContent = "Copy failed";
    } finally {
      temporary?.remove();
    }
  }

  function dictionaryMembership(bits) {
    return ({ 1: "ENABLE", 2: "SOWPODS", 3: "ENABLE + SOWPODS" })[bits] || "Selected dictionary";
  }

  function updateDictionaryPickButton() {
    const picked = Boolean(currentPickContext && PickListStore?.find(currentPickContext));
    dictionaryPickButton.classList.toggle("is-picked", picked);
    dictionaryPickButton.setAttribute("aria-pressed", String(picked));
    dictionaryPickLabel.textContent = picked ? "Picked" : "Add to Pick List";
  }

  function sortPickList(entries) {
    const mode = pickListSort.value;
    return [...entries].sort((left, right) => {
      if (mode === "strength") return right.relevance - left.relevance || right.timestamp - left.timestamp;
      if (mode === "answer") return left.word.localeCompare(right.word) || right.timestamp - left.timestamp;
      return right.timestamp - left.timestamp || left.word.localeCompare(right.word);
    });
  }

  function showPickImportStatus(text, isError = false) {
    pickListImportStatus.hidden = !text;
    pickListImportStatus.textContent = text;
    pickListImportStatus.classList.toggle("is-error", isError);
  }

  function closePickListMenu(restoreFocus = false) {
    pickListMenu.hidden = true;
    pickListMenuToggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) pickListMenuToggle.focus();
  }

  function exportPickList() {
    closePickListMenu();
    const payload = PickListStore.exportData(pickListEntries);
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crossword-picks-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showPickImportStatus(`Exported ${pickListEntries.length} ${pickListEntries.length === 1 ? "pick" : "picks"}.`);
  }

  async function importPickListFile(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const mode = pickListImportMode.value === "replace" ? "replace" : "merge";
      if (mode === "replace" && pickListEntries.length && !window.confirm("Replace the current Pick List with the imported file?")) {
        showPickImportStatus("Import cancelled.");
        return;
      }
      const result = PickListStore.importData(payload, mode);
      pickListEntries = result.entries;
      renderPickList();
      updateDictionaryPickButton();
      pickListPanel.open = true;
      showPickImportStatus(`${mode === "replace" ? "Replaced the Pick List with" : "Imported"} ${result.added} ${result.added === 1 ? "pick" : "picks"}${result.skipped ? `; skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}` : ""}.`);
    } catch (error) {
      showPickImportStatus(error instanceof Error ? error.message : "The Pick List file could not be imported.", true);
    } finally {
      pickListImportFile.value = "";
    }
  }

  function pickGroupLabel(entry) {
    return entry.gridPosition.trim() || "Unassigned";
  }

  function pickGroupStorageKey(label) {
    return `${PICK_GROUP_STATE_PREFIX}${label.toLowerCase()}`;
  }

  function renderGridPositionOptions(entries) {
    const positions = new Map();
    entries.forEach((entry) => {
      const position = entry.gridPosition.trim();
      if (position && !positions.has(position.toLowerCase())) positions.set(position.toLowerCase(), position);
    });
    const options = [...positions.values()]
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }))
      .map((position) => {
        const option = document.createElement("option");
        option.value = position;
        return option;
      });
    gridPositionOptions.replaceChildren(...options);
  }

  function createPickField(labelText, control) {
    const label = document.createElement("label");
    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(text, control);
    return label;
  }

  function createPickContextRow(labelText, value) {
    const row = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent = `${labelText}: `;
    row.append(label, document.createTextNode(value));
    return row;
  }

  function buildPickShareUrl(entry) {
    const url = new URL("https://monkeytactics.com/tools/crossword-solver");
    url.searchParams.set("pick", "1");
    url.searchParams.set("word", entry.word);
    url.searchParams.set("clue", entry.clue);
    url.searchParams.set("pattern", entry.pattern || "None");
    url.searchParams.set("dictionary", entry.dictionaryMembership.replace(" + ", " "));
    return url.toString();
  }

  function pickShareMeta(entry) {
    return `${Math.round(entry.relevance)} strength · ${entry.matchedTokens} clue ${entry.matchedTokens === 1 ? "word" : "words"} · ${entry.dictionaryMembership} · ${new Date(entry.timestamp).toLocaleString()}`;
  }

  function buildPickSummaryText(entry) {
    return [
      "🐒 MonkeyTactics.com",
      "🧩 CROSSWORD PICK",
      `🔤 Answer: ${entry.word}`,
      `💡 Clue: ${entry.clue || "None"}`,
      `🧱 Pattern: ${entry.pattern || "None"}`,
      `📖 Matched definition: ${entry.definition || "None"}`,
      `🎯 Match strength: ${Math.round(entry.relevance)}`,
      `🔎 Clue words matched: ${entry.matchedTokens}`,
      `📚 Dictionary: ${entry.dictionaryMembership}`,
      `🕒 Saved: ${new Date(entry.timestamp).toLocaleString()}`,
      `🔗 Try this pick: ${buildPickShareUrl(entry)}`
    ].join("\n");
  }

  function renderShareQr(payload) {
    const context = shareQrCanvas.getContext("2d");
    context.clearRect(0, 0, shareQrCanvas.width, shareQrCanvas.height);
    if (!window.QRCode?.toCanvas) return;
    window.QRCode.toCanvas(shareQrCanvas, payload, {
      errorCorrectionLevel: "M", margin: 2, width: 280,
      color: { dark: "#07150d", light: "#ffffff" }
    }, (error) => {
      if (error) console.error("Pick share QR generation failed:", error);
    });
  }

  function openPickShare(entry, trigger) {
    currentShareEntry = entry;
    shareReturnFocus = trigger;
    shareModalTitle.textContent = `Share ${entry.word}`;
    shareWord.textContent = entry.word;
    shareMeta.textContent = pickShareMeta(entry);
    shareClue.textContent = entry.clue || "None";
    sharePattern.textContent = entry.pattern || "None";
    shareDefinition.textContent = entry.definition || "None";
    shareCopySummary.textContent = "Copy to clipboard";
    const payload = buildPickShareUrl(entry);
    shareUrl.href = payload;
    shareUrl.textContent = payload;
    shareCopyQr.textContent = "Copy QR code";
    if (!shareModal.open) shareModal.showModal();
    renderShareQr(payload);
    shareModalClose.focus();
  }

  async function copyShareSummary() {
    if (!currentShareEntry) return;
    try {
      await navigator.clipboard.writeText(buildPickSummaryText(currentShareEntry));
      shareCopySummary.textContent = "Copied to clipboard";
    } catch (_error) { shareCopySummary.textContent = "Copy failed"; }
  }

  async function copyShareQrCode() {
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Image clipboard unavailable.");
      const blob = await new Promise((resolve, reject) => shareQrCanvas.toBlob((value) => value ? resolve(value) : reject(new Error("QR export failed.")), "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      shareCopyQr.textContent = "QR code copied";
    } catch (_error) { shareCopyQr.textContent = "Copy unavailable"; }
  }

  function populateSearchFromPick(entry) {
    const restoredPattern = normalizePattern(entry.pattern || "");
    const selectedDictionary = entry.dictionaryBits === 3 ? "both" : entry.dictionaryBits === 2 ? "sowpods" : "enable";
    clueInput.value = (entry.clue || "").trim().replace(/\s+/g, " ");
    patternInput.value = restoredPattern.toUpperCase();
    lengthInput.value = String(fixedPatternLength(restoredPattern) || entry.word.replace(/[^A-Z]/gi, "").length);
    poolInput.value = "";
    startsInput.value = "";
    endsInput.value = "";
    includeInput.value = "";
    excludeInput.value = "";
    dictionaryInputs.forEach((input) => { input.checked = input.value === selectedDictionary; });
    const patternLength = fixedPatternLength(restoredPattern);
    byId("pattern-length-preview").textContent = patternLength
      ? `${patternLength}-letter pattern`
      : restoredPattern ? "Flexible-length pattern" : "Use ? for one blank";
    updateActiveFilterCount();
  }

  function insertPickSearch(entry) {
    populateSearchFromPick(entry);
    form.requestSubmit();
  }

  function importSharedPickFromUrl() {
    const parameters = new URLSearchParams(window.location.search);
    if (!parameters.has("pick")) return false;
    const word = (parameters.get("word") || "").trim().toUpperCase();
    if (!/^[A-Z]+(?:[ '-][A-Z]+)*$/.test(word) || word.replace(/[^A-Z]/g, "").length > 30) return false;
    const rawDictionary = (parameters.get("dictionary") || "").trim();
    const hasEnable = /ENABLE/i.test(rawDictionary);
    const hasSowpods = /SOWPODS/i.test(rawDictionary);
    const dictionaryBits = hasEnable && hasSowpods ? 3 : hasSowpods ? 2 : hasEnable ? 1 : 0;
    const timestampValue = Number.parseInt(parameters.get("timestamp") || "", 10);
    const strengthValue = Number.parseFloat(parameters.get("strength") || "0");
    const matchedValue = Number.parseInt(parameters.get("matched") || "0", 10);
    const patternValue = parameters.get("pattern") || "";
    const sharedPattern = patternValue.toLowerCase() === "none" ? "" : normalizePattern(patternValue);
    const sharedClue = (parameters.get("clue") || "").trim().replace(/\s+/g, " ");
    const sharedEntry = {
      word,
      clue: sharedClue,
      pattern: sharedPattern,
      definition: parameters.get("definition") || "",
      relevance: Number.isFinite(strengthValue) ? Math.max(0, Math.min(strengthValue, 10000)) : 0,
      matchedTokens: Number.isFinite(matchedValue) ? Math.max(0, Math.min(matchedValue, 50)) : 0,
      dictionaryBits,
      dictionaryMembership: dictionaryMembership(dictionaryBits),
      timestamp: Number.isSafeInteger(timestampValue) && timestampValue > 0 ? timestampValue : Date.now()
    };
    pickListEntries = PickListStore.add(sharedEntry);
    populateSearchFromPick(sharedEntry);
    pickListPanel.open = true;
    return true;
  }

  function renderPickList() {
    const entries = sortPickList(pickListEntries);
    renderGridPositionOptions(entries);
    pickListCount.textContent = `${entries.length} ${entries.length === 1 ? "pick" : "picks"}`;
    pickListClear.disabled = entries.length === 0;
    pickListExport.disabled = entries.length === 0;
    pickListEmpty.hidden = entries.length > 0;
    const fragment = document.createDocumentFragment();
    const groupedEntries = new Map();
    entries.forEach((entry) => {
      const label = pickGroupLabel(entry);
      if (!groupedEntries.has(label)) groupedEntries.set(label, []);
      groupedEntries.get(label).push(entry);
    });
    const groups = [...groupedEntries].sort(([left], [right]) => {
      if (left === "Unassigned") return 1;
      if (right === "Unassigned") return -1;
      return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
    });

    groups.forEach(([groupLabel, groupEntries]) => {
      const group = document.createElement("details");
      const groupSummary = document.createElement("summary");
      const groupTitle = document.createElement("strong");
      const groupCount = document.createElement("span");
      const groupItems = document.createElement("div");
      let storedState = null;
      try { storedState = sessionStorage.getItem(pickGroupStorageKey(groupLabel)); } catch (_error) { /* Open groups by default. */ }
      group.className = "crossword-pick-group";
      group.open = storedState !== "closed";
      groupTitle.textContent = groupLabel;
      groupCount.textContent = `${groupEntries.length} ${groupEntries.length === 1 ? "candidate" : "candidates"}`;
      groupItems.className = "crossword-pick-group-entries";
      groupSummary.append(groupTitle, groupCount);
      group.append(groupSummary, groupItems);
      group.addEventListener("toggle", () => {
        try { sessionStorage.setItem(pickGroupStorageKey(groupLabel), group.open ? "open" : "closed"); } catch (_error) { /* Session storage may be unavailable. */ }
      });

      groupEntries.forEach((entry) => {
      const item = document.createElement("article");
      const header = document.createElement("div");
      const word = document.createElement("strong");
      const actions = document.createElement("div");
      const insert = document.createElement("button");
      const share = document.createElement("button");
      const remove = document.createElement("button");
      const meta = document.createElement("p");
      const context = document.createElement("div");
      const fields = document.createElement("div");
      const scoreDetails = document.createElement("details");
      const gridPosition = document.createElement("input");
      const note = document.createElement("textarea");

      item.className = "crossword-pick-entry";
      header.className = "crossword-pick-entry-header";
      actions.className = "crossword-pick-entry-actions";
      meta.className = "crossword-pick-meta";
      context.className = "crossword-pick-context";
      fields.className = "crossword-pick-fields";
      scoreDetails.className = "crossword-pick-score-details";
      word.textContent = entry.word;
      insert.className = "crossword-pick-insert";
      insert.type = "button";
      insert.textContent = "Insert";
      insert.setAttribute("aria-label", `Insert ${entry.word} search filters`);
      insert.addEventListener("click", () => insertPickSearch(entry));
      share.className = "crossword-pick-share";
      share.type = "button";
      share.textContent = "Share";
      share.setAttribute("aria-label", `Share ${entry.word}`);
      share.addEventListener("click", () => openPickShare(entry, share));
      remove.className = "crossword-pick-remove";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${entry.word} from the pick list`);
      remove.addEventListener("click", () => {
        pickListEntries = PickListStore.remove(entry.id);
        renderPickList();
        updateDictionaryPickButton();
      });
      const matchLabel = entry.matchExplanation
        ? `${entry.matchExplanation} · ${entry.dictionaryMembership}`
        : `${Math.round(entry.relevance)} strength · ${entry.matchedTokens} clue ${entry.matchedTokens === 1 ? "word" : "words"} · ${entry.dictionaryMembership}`;
      meta.textContent = `${matchLabel} · ${new Date(entry.timestamp).toLocaleString()}`;
      gridPosition.type = "text";
      gridPosition.setAttribute("list", "crossword-grid-positions");
      gridPosition.maxLength = PickListStore.GRID_POSITION_MAX_LENGTH;
      gridPosition.value = entry.gridPosition;
      gridPosition.placeholder = "e.g. 14-Down";
      note.rows = 3;
      note.maxLength = PickListStore.NOTE_MAX_LENGTH;
      note.value = entry.note;
      note.placeholder = "Why this fits or crossings to check…";
      const saveFields = () => { pickListEntries = PickListStore.update(entry.id, { gridPosition: gridPosition.value, note: note.value }); };
      gridPosition.addEventListener("input", saveFields);
      gridPosition.addEventListener("change", renderPickList);
      note.addEventListener("input", saveFields);
      actions.append(insert, share, remove);
      header.append(word, actions);
      context.append(
        createPickContextRow("Clue", entry.clue || "Pattern-only search"),
        createPickContextRow("Pattern", entry.pattern || "None"),
        createPickContextRow("Matched definition", entry.definition || "No WordNet definition for this pattern-only result")
      );
      if (entry.scoreBreakdown) {
        const scoreSummary = document.createElement("summary");
        scoreSummary.textContent = "Score details";
        scoreDetails.append(scoreSummary, renderScoreBreakdown(entry.scoreBreakdown, entry.matchExplanation));
      }
      fields.append(createPickField("Grid position", gridPosition), createPickField("Notes", note));
      item.append(header, meta, context, ...(entry.scoreBreakdown ? [scoreDetails] : []), fields);
      groupItems.append(item);
      });
      fragment.append(group);
    });
    pickListEntriesElement.replaceChildren(fragment);
  }

  function toggleCurrentPick() {
    if (!currentPickContext || !PickListStore) return;
    const existing = PickListStore.find(currentPickContext);
    pickListEntries = existing ? PickListStore.remove(existing.id) : PickListStore.add(currentPickContext);
    renderPickList();
    updateDictionaryPickButton();
    if (!existing) pickListPanel.open = true;
  }

  function canBuildFromPool(answer, pool) {
    if (!pool) return true;
    const counts = new Map();
    let wildcards = 0;
    for (const letter of pool) {
      if (letter === "?") wildcards += 1;
      else counts.set(letter, (counts.get(letter) || 0) + 1);
    }
    for (const letter of answer) {
      const available = counts.get(letter) || 0;
      if (available) counts.set(letter, available - 1);
      else if (wildcards) wildcards -= 1;
      else return false;
    }
    return true;
  }

  async function searchClues(clue, pattern, filters) {
    setBusy(true, "Loading clue index…");
    const index = await loadClueIndex();
    const rawTokens = tokenizeClue(clue);
    const superlativeEnabled = rawTokens.includes("most");
    const tokens = superlativeEnabled && rawTokens.length > 1
      ? rawTokens.filter((token) => token !== "most")
      : rawTokens;
    if (!tokens.length) return [];
    const candidateScores = new Map();
    const candidateLengths = new Map();
    const lengthRanges = Object.entries(index.lengthRanges);
    for (const token of tokens) {
      const posting = index.postings[token] || [];
      const tokenWeight = Math.max(1, Math.log2((clueManifest.recordCount + 1) / (posting.length + 1)));
      for (const id of posting) {
        const lengthKey = lengthRanges.find(([, [firstId, lastId]]) => id >= firstId && id <= lastId)?.[0];
        const length = lengthKey === "16-plus" ? 16 : Number.parseInt(lengthKey || "0", 10);
        const score = candidateScores.get(id) || { direct: 0, expanded: 0, graph: 0 };
        score.direct += tokenWeight;
        candidateScores.set(id, score);
        candidateLengths.set(id, length);
      }
      const synonymIds = [...new Set(queryForms(token).flatMap((form) => index.synonymPostings?.[form] || []))];
      const synonymWeight = Math.max(1, Math.log2((clueManifest.recordCount + 1) / (synonymIds.length + 1))) * 0.35;
      for (const id of synonymIds) {
        const lengthKey = lengthRanges.find(([, [firstId, lastId]]) => id >= firstId && id <= lastId)?.[0];
        const length = lengthKey === "16-plus" ? 16 : Number.parseInt(lengthKey || "0", 10);
        const score = candidateScores.get(id) || { direct: 0, expanded: 0, graph: 0 };
        score.expanded = Math.max(score.expanded, synonymWeight);
        candidateScores.set(id, score);
        candidateLengths.set(id, length);
      }
      const graphEntries = queryForms(token).flatMap((form) => index.graphPostings?.[form] || []);
      const graphCandidateCount = Math.max(1, graphEntries.length / 2);
      const graphBaseWeight = Math.max(1, Math.log2((clueManifest.recordCount + 1) / (graphCandidateCount + 1))) * 0.20;
      for (let entry = 0; entry < graphEntries.length; entry += 2) {
        const id = graphEntries[entry];
        const relationWeight = graphEntries[entry + 1] / 100;
        const lengthKey = lengthRanges.find(([, [firstId, lastId]]) => id >= firstId && id <= lastId)?.[0];
        const length = lengthKey === "16-plus" ? 16 : Number.parseInt(lengthKey || "0", 10);
        const score = candidateScores.get(id) || { direct: 0, expanded: 0, graph: 0 };
        score.graph = Math.max(score.graph, graphBaseWeight * relationWeight);
        candidateScores.set(id, score);
        candidateLengths.set(id, length);
      }
    }
    for (const term of phraseConceptTerms(clue)) {
      const expansionIds = index.postings[term] || [];
      const expansionWeight = Math.max(1, Math.log2((clueManifest.recordCount + 1) / (expansionIds.length + 1))) * 0.80;
      for (const id of expansionIds) {
        const lengthKey = lengthRanges.find(([, [firstId, lastId]]) => id >= firstId && id <= lastId)?.[0];
        const length = lengthKey === "16-plus" ? 16 : Number.parseInt(lengthKey || "0", 10);
        const score = candidateScores.get(id) || { direct: 0, expanded: 0, graph: 0 };
        score.phrase = Math.max(score.phrase || 0, expansionWeight);
        candidateScores.set(id, score);
        candidateLengths.set(id, length);
      }
    }
    const inferredLength = fixedPatternLength(pattern) || filters.wordLength;
    const pluralProjectionEnabled = Boolean(inferredLength && hasPluralClueTerm(clue));
    const pastProjectionEnabled = tokens.some((token) => token.endsWith("ed"));
    const singularProjectionEnabled = Boolean(inferredLength);
    const repeatedActionEnabled = tokens.includes("again");
    const lengths = inferredLength
      ? [...new Set([inferredLength, ...((pluralProjectionEnabled || pastProjectionEnabled || repeatedActionEnabled || superlativeEnabled)
        ? [...candidateLengths.values()].filter((length) => length < inferredLength && inferredLength - length <= 4)
        : []), ...(singularProjectionEnabled
        ? [...candidateLengths.values()].filter((length) => length > inferredLength && length - inferredLength <= 2)
        : [])])]
      : [...new Set(candidateLengths.values())].sort((a, b) => a - b);
    setBusy(true, lengths.length === 1 ? `Loading ${lengths[0]}-letter clues…` : "Loading matching clue records…");
    const records = (await Promise.all(lengths.map(loadClueShard))).flat();
    const normalizedQuery = clue.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const dictionaryBit = DICTIONARY_BITS[filters.dictionary] || 1;
    const bestByAnswer = new Map();

    const searchableRecords = records.flatMap((record) => {
      const variants = [record];
      const pastProjection = pastProjectionEnabled ? pastTenseAnswer(record) : null;
      const singularProjection = singularProjectionEnabled ? singularizeAnswer(record) : null;
      const repeatedProjection = repeatedActionEnabled ? repeatedActionAnswer(record) : null;
      const superlativeProjection = superlativeEnabled ? superlativeAnswer(record) : null;
      if (pastProjection) variants.push({ ...record, ...pastProjection });
      if (singularProjection) variants.push({ ...record, ...singularProjection });
      if (repeatedProjection) variants.push({ ...record, ...repeatedProjection });
      if (superlativeProjection) variants.push({ ...record, ...superlativeProjection });
      return variants;
    });
    for (const record of searchableRecords) {
      if (!candidateScores.has(record.id) || (record.dictionaryBits & dictionaryBit) === 0) continue;
      let candidateRecord = record;
      if (inferredLength && record.length !== inferredLength) {
        const projection = pluralProjectionEnabled ? pluralizeAnswer(record) : null;
        if (!projection || projection.length !== inferredLength) continue;
        candidateRecord = { ...record, ...projection };
      }
      const answer = candidateRecord.answer;
      const displayAnswer = candidateRecord.displayAnswer || answer;
      if ((filters.wordLength && candidateRecord.length !== filters.wordLength) || !globMatches(answer, pattern)) continue;
      if (filters.startsWith && !answer.startsWith(filters.startsWith)) continue;
      if (filters.endsWith && !answer.endsWith(filters.endsWith)) continue;
      if (filters.mustInclude && ![...filters.mustInclude].every((letter) => answer.includes(letter))) continue;
      if (filters.excludeLetters && [...filters.excludeLetters].some((letter) => answer.includes(letter))) continue;
      if (!canBuildFromPool(answer, filters.pool)) continue;
      const clueTokens = new Set(tokenizeClue(record.clue));
      const matchedTokens = tokens.filter((token) => clueTokens.has(token)).length;
      const candidateScore = candidateScores.get(record.id);
      const exactPhrase = record.clue.toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(normalizedQuery);
      const scoreBreakdown = {
        directClue: candidateScore.direct * 10,
        synonym: candidateScore.expanded * 10,
        graph: candidateScore.graph * 10,
        phraseConcept: (candidateScore.phrase || 0) * 10,
        exactPhrase: exactPhrase ? 100 : 0,
        allClueTerms: matchedTokens === tokens.length ? 50 : 0,
        sourceQuality: (record.quality / 100) * 20,
        inflectionFit: candidateRecord.singularInflected ? 20 : tokens.some((token) => token.endsWith("ed")) && answer.endsWith("ed") ? 30 : 0,
        derivationFit: candidateRecord.repeatedAction || candidateRecord.superlative ? 35 : 0,
        knownLetters: [...pattern].filter((letter) => /[a-z]/.test(letter)).length * 4,
        lengthFit: inferredLength && candidateRecord.length === inferredLength ? 20 : 0
      };
      const relevance = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
      scoreBreakdown.total = relevance;
      const matchSignals = [];
      if (exactPhrase) matchSignals.push("Exact phrase");
      else if (candidateScore.phrase > 0) matchSignals.push("Clue phrase concept");
      else if (candidateScore.direct > 0) matchSignals.push("Direct clue meaning");
      else if (candidateScore.expanded > 0) matchSignals.push("Same-synset meaning");
      else if (candidateScore.graph > 0) matchSignals.push("WordNet graph relation");
      if (scoreBreakdown.knownLetters > 0) matchSignals.push("pattern");
      else if (scoreBreakdown.lengthFit > 0) matchSignals.push("length");
      const strengthLabel = relevance >= 120 ? "Strong match" : relevance >= 70 ? "Good match" : "Possible match";
      const matchExplanation = `${strengthLabel} · ${matchSignals.join(" + ") || "Source quality"}`;
      const result = { ...candidateRecord, relevance, matchedTokens,
        scoreBreakdown, matchExplanation,
        phraseMatch: candidateScore.phrase > 0,
        synonymMatch: candidateScore.direct === 0 && candidateScore.expanded > 0,
        graphMatch: candidateScore.direct === 0 && candidateScore.expanded === 0 && candidateScore.graph > 0 };
      const answerKey = `${answer}\0${displayAnswer}`;
      const prior = bestByAnswer.get(answerKey);
      if (!prior || result.relevance > prior.relevance) bestByAnswer.set(answerKey, result);
    }
    for (const supplemental of supplementalClueAnswers(clue)) {
      const answer = supplemental.answer;
      if ((supplemental.dictionaryBits & dictionaryBit) === 0) continue;
      if ((filters.wordLength && answer.length !== filters.wordLength) || (inferredLength && answer.length !== inferredLength)) continue;
      if (!globMatches(answer, pattern) || (filters.startsWith && !answer.startsWith(filters.startsWith))) continue;
      if (filters.endsWith && !answer.endsWith(filters.endsWith)) continue;
      if (filters.mustInclude && ![...filters.mustInclude].every((letter) => answer.includes(letter))) continue;
      if (filters.excludeLetters && [...filters.excludeLetters].some((letter) => answer.includes(letter))) continue;
      if (!canBuildFromPool(answer, filters.pool)) continue;
      const scoreBreakdown = {
        directClue: 0, synonym: 0, graph: 0, phraseConcept: 120, exactPhrase: 100,
        allClueTerms: 50, sourceQuality: 18, inflectionFit: 0,
        knownLetters: [...pattern].filter((letter) => /[a-z]/.test(letter)).length * 4,
        lengthFit: inferredLength ? 20 : 0
      };
      scoreBreakdown.total = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
      bestByAnswer.set(`${answer}\0${answer}`, {
        id: `local:${answer}`, clue: supplemental.definition, answer, displayAnswer: answer,
        wordCount: 1, length: answer.length, quality: 90, dictionaryBits: supplemental.dictionaryBits,
        relevance: scoreBreakdown.total, matchedTokens: tokens.length, scoreBreakdown,
        matchExplanation: "Strong match · Local crossword phrase + pattern", phraseMatch: true,
        localSupplement: true
      });
    }
    const candidates = [...bestByAnswer.values()];
    const ranked = (candidates.some((result) => result.localSupplement)
      ? candidates.filter((result) => result.localSupplement)
      : candidates)
      .sort((a, b) => b.relevance - a.relevance || b.quality - a.quality || a.answer.localeCompare(b.answer)).slice(0, 100);
    if (ranked.length || tokens.length !== 1 || !inferredLength || !pattern) return ranked;
    await loadForPattern(pattern);
    return Engine.crosswordSearch(pattern, filters.pool, filters)
      .filter((word) => isOneEditAway(tokens[0], word))
      .slice(0, 12)
      .map((answer) => {
        const scoreBreakdown = {
          directClue: 0, synonym: 0, graph: 0, phraseConcept: 0, exactPhrase: 0,
          allClueTerms: 0, sourceQuality: 0, inflectionFit: 0, spellingFit: 40,
          knownLetters: [...pattern].filter((letter) => /[a-z]/.test(letter)).length * 4,
          lengthFit: 20
        };
        scoreBreakdown.total = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
        return {
          id: `spelling:${answer}`, clue: "Near-spelling dictionary candidate; confirm the clue text and crossings",
          answer, displayAnswer: answer, wordCount: 1, length: answer.length, quality: 0,
          dictionaryBits: filters.dictionaryBit, relevance: scoreBreakdown.total, matchedTokens: 0,
          scoreBreakdown, matchExplanation: "Possible match · Near spelling + pattern", spellingMatch: true
        };
      });
  }

  function renderClueResults(matches, clue, pattern) {
    resultList.replaceChildren();
    resultList.classList.add("clue-results");
    const fragment = document.createDocumentFragment();
    matches.forEach((match, index) => {
      const item = document.createElement("li");
      const topLine = document.createElement("div");
      topLine.className = "clue-result-topline";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-word";
      const displayAnswer = match.displayAnswer || match.answer;
      button.setAttribute("aria-label", `Look up the definition of ${displayAnswer}`);
      button.append(highlightWord(displayAnswer.toUpperCase(), pattern.toUpperCase()));
      bindDictionaryTrigger(button, displayAnswer, {
        clue,
        pattern,
        definition: match.clue,
        relevance: match.relevance,
        matchedTokens: match.matchedTokens,
        scoreBreakdown: match.scoreBreakdown,
        matchExplanation: match.matchExplanation,
        dictionaryBits: match.dictionaryBits,
        dictionaryMembership: dictionaryMembership(match.dictionaryBits)
      });
      const explanation = document.createElement("span");
      explanation.className = "clue-result-match";
      explanation.textContent = match.spellingMatch ? "Near spelling" : index === 0 ? "Best match" : match.superlative ? "Superlative answer" : match.repeatedAction ? "Re- form" : match.pastInflected ? "Past-tense answer" : match.singularInflected ? "Singular answer" : match.inflected ? "Plural answer" : match.phraseMatch ? "Clue phrase match" : match.graphMatch ? "WordNet graph match" : match.synonymMatch ? "Related meaning" : `${match.matchedTokens} clue ${match.matchedTokens === 1 ? "word" : "words"} matched`;
      const matchedClue = document.createElement("p");
      matchedClue.className = "clue-result-clue";
      matchedClue.textContent = match.clue;
      topLine.append(button, explanation);
      item.append(topLine, matchedClue);
      fragment.append(item);
    });
    resultList.append(fragment);
    resultsHeading.textContent = matches.length ? `${matches.length} ranked ${matches.length === 1 ? "answer" : "answers"}` : "No clue matches found";
    const resultSource = matches.some((match) => match.spellingMatch)
      ? "dictionary spelling fallback"
      : matches.some((match) => String(match.id).startsWith("local:"))
        ? "local crossword phrases + WordNet 3.0"
        : "WordNet 3.0 clue dataset";
    resultsSummary.textContent = matches.length
      ? `Clue: “${clue}”${pattern ? ` · pattern ${pattern.toUpperCase()}` : ""} · ${resultSource}`
      : "Try fewer clue words, a different answer length, or a less restrictive pattern.";
    resultsRegion.classList.toggle("has-results", matches.length > 0);
  }

  function renderResults(matches, pattern, dictionaryName) {
    resultList.replaceChildren();
    resultList.classList.remove("clue-results");
    const shown = matches.slice(0, 500);
    const hasMixedLengths = new Set(shown.map((word) => word.length)).size > 1;
    const fragment = document.createDocumentFragment();
    shown.forEach((word) => {
      const item = document.createElement("li");
      const link = document.createElement("button");
      link.type = "button";
      link.className = "result-word";
      link.setAttribute("aria-label", `Look up the definition of ${word}`);
      link.append(highlightWord(word.toUpperCase(), pattern.toUpperCase()));
      const selectedDictionary = [...dictionaryInputs].find((input) => input.checked)?.value || "enable";
      const dictionaryBits = DICTIONARY_BITS[selectedDictionary];
      bindDictionaryTrigger(link, word, {
        clue: clueInput.value.trim(),
        pattern,
        definition: "",
        relevance: 0,
        matchedTokens: 0,
        dictionaryBits,
        dictionaryMembership: dictionaryName
      });
      item.setAttribute("aria-label", `${word}, ${word.length} letters`);
      item.append(link);
      if (hasMixedLengths) {
        const meta = document.createElement("span");
        meta.className = "result-meta";
        meta.textContent = `${word.length}L`;
        meta.title = `${word.length} letters`;
        meta.setAttribute("aria-hidden", "true");
        item.append(meta);
      }
      fragment.append(item);
    });
    resultList.append(fragment);
    resultsHeading.textContent = matches.length ? `${matches.length.toLocaleString()} matching ${matches.length === 1 ? "word" : "words"}` : "No matches found";
    resultsSummary.textContent = matches.length
      ? `Pattern ${pattern.toUpperCase()} · ${dictionaryName}${matches.length > shown.length ? ` · showing first ${shown.length}` : ""}`
      : "Try replacing a known letter with ?, using * for a flexible length, or removing a filter.";
    resultsRegion.classList.toggle("has-results", matches.length > 0);
  }

  function validate(clue, pattern, pool, wordLength, fields) {
    if (!clue && !pattern) return "Enter a crossword clue, an answer pattern, or both.";
    if (clue.length > 140) return "Clues can contain up to 140 characters.";
    if (pattern.length > 30) return "Patterns can contain up to 30 characters.";
    if ((pattern.match(/\*/g) || []).length > 3) return "Use no more than three * wildcards.";
    if (pool.length > 30) return "Available letters can contain up to 30 letters and ? wildcards.";
    if (!Number.isInteger(wordLength) || wordLength < 0 || wordLength > 30) return "Word length must be a whole number from 0 through 30.";
    if (fixedPatternLength(pattern) && wordLength && pattern.length !== wordLength) return `This pattern is ${pattern.length} letters long. Set Word Length to ${pattern.length} or leave it automatic.`;
    if (fields.some((value) => value && !/^[a-z]+$/.test(value))) return "Starts With, Ends With, Must Include, and Exclude Letters accept letters only.";
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const request = ++searchRequest;
    const clue = clueInput.value.trim().replace(/\s+/g, " ");
    const pattern = normalizePattern(patternInput.value);
    const pool = normalizeLetters(poolInput.value);
    const wordLength = Number.parseInt(lengthInput.value || "0", 10);
    const startsWith = startsInput.value.trim().toLowerCase();
    const endsWith = endsInput.value.trim().toLowerCase();
    const mustInclude = includeInput.value.trim().toLowerCase();
    const excludeLetters = excludeInput.value.trim().toLowerCase();
    patternInput.value = pattern.toUpperCase();
    poolInput.value = pool.toUpperCase();
    clueInput.value = clue;
    const error = validate(clue, pattern, pool, wordLength, [startsWith, endsWith, mustInclude, excludeLetters]);
    if (error) { showMessage(error); (clue ? patternInput : clueInput).focus(); return; }
    showMessage("");
    setBusy(true);
    try {
      const dictionary = [...dictionaryInputs].find((input) => input.checked)?.value || "enable";
      const options = {
        dictionaryBit: DICTIONARY_BITS[dictionary], wordLength, startsWith, endsWith,
        mustInclude, excludeLetters, highValueOnly: false, minimumVowels: 0,
        minimumConsonants: 0, minimumScore: null, maximumScore: null,
        hookFilter: "", sortBy: sortInput.value
      };
      if (clue) {
        const matches = await searchClues(clue, pattern, { ...options, dictionary, pool });
        if (request !== searchRequest) return;
        renderClueResults(matches, clue, pattern);
      } else {
        setBusy(true, "Searching dictionary…");
        await loadForPattern(pattern);
        const matches = Engine.crosswordSearch(pattern, pool, options);
        if (request !== searchRequest) return;
        renderResults(matches, pattern, dictionary === "both" ? "ENABLE + SOWPODS" : dictionary.toUpperCase());
      }
    } catch (error) {
      if (request !== searchRequest) return;
      console.error("Crossword search failed:", error);
      resultsHeading.textContent = "Dictionary unavailable";
      resultsSummary.textContent = "Refresh the page and try again.";
      showMessage("The dictionary could not be loaded. Please try again.");
    } finally {
      if (request === searchRequest) setBusy(false);
    }
  }

  function clearSearch() {
    searchRequest += 1;
    cancelDictionaryHover();
    form.reset();
    patternInput.value = "";
    poolInput.value = "";
    resultList.replaceChildren();
    resultList.classList.remove("clue-results");
    resultsHeading.textContent = "Your matches will appear here";
    resultsSummary.textContent = "Known letters stay highlighted so you can scan answers quickly.";
    resultsRegion.classList.remove("has-results");
    showMessage("");
    updateActiveFilterCount();
    clueInput.focus();
  }

  sampleButtons.forEach((button) => button.addEventListener("click", () => {
    clueInput.value = "";
    patternInput.value = button.dataset.pattern;
    lengthInput.value = button.dataset.length || "0";
    updateActiveFilterCount();
    form.requestSubmit();
  }));
  [lengthInput, sortInput, poolInput, startsInput, endsInput, includeInput, excludeInput]
    .forEach((control) => control.addEventListener("input", updateActiveFilterCount));
  patternInput.addEventListener("input", () => {
    const normalized = normalizePattern(patternInput.value);
    const length = fixedPatternLength(normalized);
    byId("pattern-length-preview").textContent = length ? `${length}-letter pattern` : normalized ? "Flexible-length pattern" : "Use ? for one blank";
  });
  clearButton.addEventListener("click", clearSearch);
  resetFiltersButton.addEventListener("click", resetFilters);
  dictionaryPickButton.addEventListener("click", toggleCurrentPick);
  dictionaryCopyButton.addEventListener("click", copyDictionaryWord);
  shareCopyQr.addEventListener("click", copyShareQrCode);
  shareCopySummary.addEventListener("click", copyShareSummary);
  shareModalClose.addEventListener("click", () => shareModal.close());
  shareModal.addEventListener("click", (event) => { if (event.target === shareModal) shareModal.close(); });
  shareModal.addEventListener("close", () => {
    currentShareEntry = null;
    if (shareReturnFocus?.isConnected) shareReturnFocus.focus();
    shareReturnFocus = null;
  });
  pickListSort.addEventListener("change", renderPickList);
  pickListMenuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!pickListPanel.open) pickListPanel.open = true;
    const open = pickListMenu.hidden;
    pickListMenu.hidden = !open;
    pickListMenuToggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (pickListMenu.hidden || pickListMenu.contains(event.target) || event.target === pickListMenuToggle) return;
    closePickListMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || pickListMenu.hidden) return;
    closePickListMenu(true);
  });
  pickListExport.addEventListener("click", exportPickList);
  pickListImport.addEventListener("click", () => {
    closePickListMenu();
    pickListImportFile.click();
  });
  pickListImportFile.addEventListener("change", () => importPickListFile(pickListImportFile.files?.[0]));
  pickListClear.addEventListener("click", (event) => {
    event.stopPropagation();
    pickListEntries = PickListStore.clear();
    renderPickList();
    updateDictionaryPickButton();
  });
  dictionaryModalClose.addEventListener("click", () => dictionaryModal.close());
  dictionaryModal.addEventListener("click", (event) => {
    if (event.target === dictionaryModal) dictionaryModal.close();
  });
  dictionaryModal.addEventListener("close", () => {
    cancelDictionaryHover();
    dictionaryRequest += 1;
    dictionaryAbortController?.abort();
    dictionaryAbortController = null;
    window.clearTimeout(copyFeedbackTimeout);
    dictionaryWord = "";
    currentPickContext = null;
    if (dictionaryReturnFocus?.isConnected) dictionaryReturnFocus.focus();
    dictionaryReturnFocus = null;
  });
  form.addEventListener("submit", handleSubmit);
  offlineToggle?.addEventListener("click", toggleOfflineMode);
  updateActiveFilterCount();
  const sharedSearchPending = importSharedPickFromUrl();
  renderPickList();
  renderOfflineState();
  if (offlineModeEnabled && "caches" in window) {
    caches.has(offlineCacheName).then((available) => {
      if (available) return;
      try { localStorage.removeItem(OFFLINE_STORAGE_KEY); } catch (_error) { /* Storage may be unavailable. */ }
      offlineCacheName = "";
      offlineModeEnabled = false;
      renderOfflineState("Offline data is no longer available in browser storage. Enable it again to redownload.");
    });
  }

  setBusy(true, "Loading dictionary…");
  Promise.all([Engine.ready, fetch(MANIFEST_URL).then((response) => {
    if (!response.ok) throw new Error("Dictionary manifest failed.");
    return response.json();
  })]).then(([, data]) => {
    if (!data?.chunks) throw new Error("Dictionary manifest is invalid.");
    manifest = data;
    setBusy(false);
    if (sharedSearchPending) form.requestSubmit();
  }).catch((error) => {
    console.error(error);
    showMessage("The crossword dictionary could not be initialized.");
    buttonLabel.textContent = "Dictionary unavailable";
  });
})();
