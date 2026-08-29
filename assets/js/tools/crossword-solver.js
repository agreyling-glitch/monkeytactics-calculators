"use strict";

(function initializeCrosswordSolver() {
  const Engine = window.MonkeyTacticsWasm;
  const form = document.querySelector("#crossword-form");
  if (!form || !Engine) return;

  const byId = (id) => document.getElementById(id);
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
  const dictionaryModal = byId("dictionary-modal");
  const dictionaryModalTitle = byId("dictionary-modal-title");
  const dictionaryModalBody = byId("dictionary-modal-body");
  const dictionaryModalClose = byId("dictionary-modal-close");
  const dictionaryFullLink = byId("dictionary-full-link");
  const sampleButtons = document.querySelectorAll("[data-pattern]");
  const dictionaryInputs = form.querySelectorAll('input[name="dictionary"]');
  const DICTIONARY_BITS = { enable: 1, sowpods: 2, both: 3 };
  const MANIFEST_URL = "/assets/data/words/manifest.enable-sowpods-v2.json";
  const CHUNK_BASE_URL = "/assets/data/words/";
  let manifest;
  const loadedChunks = new Set();
  const chunkPromises = new Map();
  let dictionaryRequest = 0;
  let dictionaryReturnFocus = null;
  let dictionaryAbortController = null;

  function normalizePattern(value) {
    return value.toLowerCase().replace(/[._-]/g, "?").replace(/\s+/g, "").replace(/[^a-z?*]/g, "");
  }

  function normalizeLetters(value) {
    return value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z?]/g, "");
  }

  function fixedPatternLength(pattern) {
    return pattern.includes("*") ? 0 : pattern.length;
  }

  function updateActiveFilterCount() {
    const active = [
      Number.parseInt(lengthInput.value || "0", 10) > 0,
      normalizeLetters(poolInput.value).length > 0,
      startsInput.value.trim().length > 0,
      endsInput.value.trim().length > 0,
      includeInput.value.trim().length > 0,
      excludeInput.value.trim().length > 0
    ].filter(Boolean).length;
    activeFilterCount.textContent = `(${active} active)`;
  }

  async function decodeChunk(response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
    if (!("DecompressionStream" in window)) throw new Error("Gzip decompression is unavailable.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
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
    buttonLabel.textContent = busy ? "Searching dictionary…" : label;
  }

  function highlightWord(word, pattern) {
    const fragment = document.createDocumentFragment();
    const exactPattern = !pattern.includes("*") && pattern.length === word.length;
    [...word].forEach((letter, index) => {
      const span = document.createElement("span");
      span.textContent = letter;
      span.className = exactPattern && pattern[index] !== "?" ? "known-letter" : "found-letter";
      fragment.append(span);
    });
    return fragment;
  }

  function renderDictionaryEntries(entries, requestedWord) {
    const fragment = document.createDocumentFragment();
    const entry = entries.find(({ word }) => word.toLowerCase() === requestedWord.toLowerCase()) || entries[0];
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
      partOfSpeech.textContent = partNames[part] || part;
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

  async function openDictionary(word, trigger) {
    const request = ++dictionaryRequest;
    dictionaryAbortController?.abort();
    dictionaryAbortController = new AbortController();
    const requestTimeout = window.setTimeout(() => dictionaryAbortController?.abort(), 8000);
    dictionaryReturnFocus = trigger;
    dictionaryModalTitle.textContent = word;
    dictionaryFullLink.href = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;
    const loading = document.createElement("p");
    loading.className = "dictionary-modal-status";
    loading.textContent = `Looking up ${word}…`;
    dictionaryModalBody.replaceChildren(loading);
    if (!dictionaryModal.open) dictionaryModal.showModal();
    dictionaryModalClose.focus();
    try {
      const parameters = new URLSearchParams({ sp: word, md: "d", max: "1" });
      const response = await fetch(`https://api.datamuse.com/words?${parameters}`, {
        signal: dictionaryAbortController.signal
      });
      if (!response.ok) throw new Error("Definition unavailable");
      const entries = await response.json();
      if (request !== dictionaryRequest || !dictionaryModal.open) return;
      const definitions = renderDictionaryEntries(entries, word);
      if (!definitions.childNodes.length) throw new Error("Definition unavailable");
      dictionaryModalBody.replaceChildren(definitions);
    } catch (error) {
      if (request !== dictionaryRequest || !dictionaryModal.open) return;
      const unavailable = document.createElement("p");
      unavailable.className = "dictionary-modal-status";
      unavailable.textContent = `A definition for ${word} is not available here. Use the Merriam-Webster link below to continue.`;
      dictionaryModalBody.replaceChildren(unavailable);
    } finally {
      window.clearTimeout(requestTimeout);
      if (request === dictionaryRequest) dictionaryAbortController = null;
    }
  }

  function renderResults(matches, pattern, dictionaryName) {
    resultList.replaceChildren();
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
      link.addEventListener("click", () => openDictionary(word, link));
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

  function validate(pattern, pool, wordLength, fields) {
    if (!pattern) return "Enter a pattern using letters, ? for one blank, or * for any number of letters.";
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
    const pattern = normalizePattern(patternInput.value);
    const pool = normalizeLetters(poolInput.value);
    const wordLength = Number.parseInt(lengthInput.value || "0", 10);
    const startsWith = startsInput.value.trim().toLowerCase();
    const endsWith = endsInput.value.trim().toLowerCase();
    const mustInclude = includeInput.value.trim().toLowerCase();
    const excludeLetters = excludeInput.value.trim().toLowerCase();
    patternInput.value = pattern.toUpperCase();
    poolInput.value = pool.toUpperCase();
    const error = validate(pattern, pool, wordLength, [startsWith, endsWith, mustInclude, excludeLetters]);
    if (error) { showMessage(error); patternInput.focus(); return; }
    showMessage("");
    setBusy(true);
    try {
      await loadForPattern(pattern);
      const dictionary = [...dictionaryInputs].find((input) => input.checked)?.value || "enable";
      const options = {
        dictionaryBit: DICTIONARY_BITS[dictionary], wordLength, startsWith, endsWith,
        mustInclude, excludeLetters, highValueOnly: false, minimumVowels: 0,
        minimumConsonants: 0, minimumScore: null, maximumScore: null,
        hookFilter: "", sortBy: sortInput.value
      };
      const matches = Engine.crosswordSearch(pattern, pool, options);
      renderResults(matches, pattern, dictionary === "both" ? "ENABLE + SOWPODS" : dictionary.toUpperCase());
    } catch (error) {
      console.error("Crossword search failed:", error);
      resultsHeading.textContent = "Dictionary unavailable";
      resultsSummary.textContent = "Refresh the page and try again.";
      showMessage("The dictionary could not be loaded. Please try again.");
    } finally { setBusy(false); }
  }

  function clearSearch() {
    form.reset();
    patternInput.value = "";
    poolInput.value = "";
    resultList.replaceChildren();
    resultsHeading.textContent = "Your matches will appear here";
    resultsSummary.textContent = "Known letters stay highlighted so you can scan answers quickly.";
    resultsRegion.classList.remove("has-results");
    showMessage("");
    updateActiveFilterCount();
    patternInput.focus();
  }

  sampleButtons.forEach((button) => button.addEventListener("click", () => {
    patternInput.value = button.dataset.pattern;
    lengthInput.value = button.dataset.length || "0";
    updateActiveFilterCount();
    form.requestSubmit();
  }));
  [lengthInput, poolInput, startsInput, endsInput, includeInput, excludeInput]
    .forEach((control) => control.addEventListener("input", updateActiveFilterCount));
  patternInput.addEventListener("input", () => {
    const normalized = normalizePattern(patternInput.value);
    const length = fixedPatternLength(normalized);
    byId("pattern-length-preview").textContent = length ? `${length}-letter pattern` : normalized ? "Flexible-length pattern" : "Use ? for one blank";
  });
  clearButton.addEventListener("click", clearSearch);
  dictionaryModalClose.addEventListener("click", () => dictionaryModal.close());
  dictionaryModal.addEventListener("click", (event) => {
    if (event.target === dictionaryModal) dictionaryModal.close();
  });
  dictionaryModal.addEventListener("close", () => {
    dictionaryRequest += 1;
    dictionaryAbortController?.abort();
    dictionaryAbortController = null;
    if (dictionaryReturnFocus?.isConnected) dictionaryReturnFocus.focus();
    dictionaryReturnFocus = null;
  });
  form.addEventListener("submit", handleSubmit);
  updateActiveFilterCount();

  setBusy(true);
  Promise.all([Engine.ready, fetch(MANIFEST_URL).then((response) => {
    if (!response.ok) throw new Error("Dictionary manifest failed.");
    return response.json();
  })]).then(([, data]) => {
    if (!data?.chunks) throw new Error("Dictionary manifest is invalid.");
    manifest = data;
    setBusy(false);
  }).catch((error) => {
    console.error(error);
    showMessage("The crossword dictionary could not be initialized.");
    buttonLabel.textContent = "Dictionary unavailable";
  });
})();
