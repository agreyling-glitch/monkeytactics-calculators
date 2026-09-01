"use strict";

(function initializeCrosswordSolver() {
  const Engine = window.MonkeyTacticsWasm;
  const form = document.querySelector("#crossword-form");
  if (!form || !Engine) return;

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
  const dictionaryModal = byId("dictionary-modal");
  const dictionaryModalTitle = byId("dictionary-modal-title");
  const dictionaryModalBody = byId("dictionary-modal-body");
  const dictionaryModalClose = byId("dictionary-modal-close");
  const dictionaryFullLink = byId("dictionary-full-link");
  const dictionaryCopyButton = byId("dictionary-copy-word");
  const dictionaryCopyLabel = byId("dictionary-copy-label");
  const sampleButtons = document.querySelectorAll("[data-pattern]");
  const dictionaryInputs = form.querySelectorAll('input[name="dictionary"]');
  const DICTIONARY_BITS = { enable: 1, sowpods: 2, both: 3 };
  const MANIFEST_URL = "/assets/data/words/manifest.enable-sowpods-v2.json";
  const CHUNK_BASE_URL = "/assets/data/words/";
  const CLUE_BASE_URL = "/assets/data/crossword-clues/";
  const CLUE_MANIFEST_URL = `${CLUE_BASE_URL}manifest.clues-v1.json?v=wordnet-3.0-filtered-v1`;
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

  async function loadClueManifest() {
    if (clueManifest) return clueManifest;
    const response = await fetch(CLUE_MANIFEST_URL);
    if (!response.ok) throw new Error("Clue manifest failed.");
    const data = await response.json();
    if (data?.formatVersion !== 1 || !data.index || !data.shards) throw new Error("Clue manifest is invalid.");
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
      }))).flat().map(([id, clue, answer, answerLength, quality, sourceBits, dictionaryBits]) =>
        ({ id, clue, answer, length: answerLength, quality, sourceBits, dictionaryBits }));
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
    dictionaryWord = word;
    window.clearTimeout(copyFeedbackTimeout);
    dictionaryCopyLabel.textContent = "Copy word";
    dictionaryCopyButton.classList.remove("is-copied");
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
    const tokens = tokenizeClue(clue);
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
        candidateScores.set(id, (candidateScores.get(id) || 0) + tokenWeight);
        candidateLengths.set(id, length);
      }
    }
    const inferredLength = fixedPatternLength(pattern) || filters.wordLength;
    const lengths = inferredLength
      ? [inferredLength]
      : [...new Set(candidateLengths.values())].sort((a, b) => a - b);
    setBusy(true, lengths.length === 1 ? `Loading ${lengths[0]}-letter clues…` : "Loading matching clue records…");
    const records = (await Promise.all(lengths.map(loadClueShard))).flat();
    const normalizedQuery = clue.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const dictionaryBit = DICTIONARY_BITS[filters.dictionary] || 1;
    const bestByAnswer = new Map();

    for (const record of records) {
      if (!candidateScores.has(record.id) || record.dictionaryBits & dictionaryBit === 0) continue;
      const answer = record.answer;
      if ((filters.wordLength && record.length !== filters.wordLength) || !globMatches(answer, pattern)) continue;
      if (filters.startsWith && !answer.startsWith(filters.startsWith)) continue;
      if (filters.endsWith && !answer.endsWith(filters.endsWith)) continue;
      if (filters.mustInclude && ![...filters.mustInclude].every((letter) => answer.includes(letter))) continue;
      if (filters.excludeLetters && [...filters.excludeLetters].some((letter) => answer.includes(letter))) continue;
      if (!canBuildFromPool(answer, filters.pool)) continue;
      const clueTokens = new Set(tokenizeClue(record.clue));
      const matchedTokens = tokens.filter((token) => clueTokens.has(token)).length;
      let relevance = candidateScores.get(record.id) * 10;
      if (record.clue.toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(normalizedQuery)) relevance += 100;
      if (matchedTokens === tokens.length) relevance += 50;
      relevance += (record.quality / 100) * 20;
      relevance += [...pattern].filter((letter) => /[a-z]/.test(letter)).length * 4;
      if (inferredLength && record.length === inferredLength) relevance += 20;
      const result = { ...record, relevance, matchedTokens };
      const prior = bestByAnswer.get(answer);
      if (!prior || result.relevance > prior.relevance) bestByAnswer.set(answer, result);
    }
    return [...bestByAnswer.values()].sort((a, b) => b.relevance - a.relevance || b.quality - a.quality || a.answer.localeCompare(b.answer)).slice(0, 100);
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
      button.setAttribute("aria-label", `Look up the definition of ${match.answer}`);
      button.append(highlightWord(match.answer.toUpperCase(), pattern.toUpperCase()));
      button.addEventListener("click", () => openDictionary(match.answer, button));
      const explanation = document.createElement("span");
      explanation.className = "clue-result-match";
      explanation.textContent = index === 0 ? "Best match" : `${match.matchedTokens} clue ${match.matchedTokens === 1 ? "word" : "words"} matched`;
      const matchedClue = document.createElement("p");
      matchedClue.className = "clue-result-clue";
      matchedClue.textContent = match.clue;
      topLine.append(button, explanation);
      item.append(topLine, matchedClue);
      fragment.append(item);
    });
    resultList.append(fragment);
    resultsHeading.textContent = matches.length ? `${matches.length} ranked ${matches.length === 1 ? "answer" : "answers"}` : "No clue matches found";
    resultsSummary.textContent = matches.length
      ? `Clue: “${clue}”${pattern ? ` · pattern ${pattern.toUpperCase()}` : ""} · WordNet 3.0 clue dataset`
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
  [lengthInput, poolInput, startsInput, endsInput, includeInput, excludeInput]
    .forEach((control) => control.addEventListener("input", updateActiveFilterCount));
  patternInput.addEventListener("input", () => {
    const normalized = normalizePattern(patternInput.value);
    const length = fixedPatternLength(normalized);
    byId("pattern-length-preview").textContent = length ? `${length}-letter pattern` : normalized ? "Flexible-length pattern" : "Use ? for one blank";
  });
  clearButton.addEventListener("click", clearSearch);
  dictionaryCopyButton.addEventListener("click", copyDictionaryWord);
  dictionaryModalClose.addEventListener("click", () => dictionaryModal.close());
  dictionaryModal.addEventListener("click", (event) => {
    if (event.target === dictionaryModal) dictionaryModal.close();
  });
  dictionaryModal.addEventListener("close", () => {
    dictionaryRequest += 1;
    dictionaryAbortController?.abort();
    dictionaryAbortController = null;
    window.clearTimeout(copyFeedbackTimeout);
    dictionaryWord = "";
    if (dictionaryReturnFocus?.isConnected) dictionaryReturnFocus.focus();
    dictionaryReturnFocus = null;
  });
  form.addEventListener("submit", handleSubmit);
  updateActiveFilterCount();

  setBusy(true, "Loading dictionary…");
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
