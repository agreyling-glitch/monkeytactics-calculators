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
  const resetFiltersButton = byId("reset-crossword-filters");
  const dictionaryModal = byId("dictionary-modal");
  const dictionaryModalTitle = byId("dictionary-modal-title");
  const dictionaryModalBody = byId("dictionary-modal-body");
  const dictionaryModalClose = byId("dictionary-modal-close");
  const dictionaryMerriamLink = byId("dictionary-merriam-link");
  const dictionaryCollinsLink = byId("dictionary-collins-link");
  const dictionaryCopyButton = byId("dictionary-copy-word");
  const dictionaryCopyLabel = byId("dictionary-copy-label");
  const dictionaryPickButton = byId("dictionary-pick-word");
  const dictionaryPickLabel = byId("dictionary-pick-label");
  const pickListPanel = byId("crossword-pick-list");
  const pickListCount = byId("crossword-pick-count");
  const pickListSort = byId("crossword-pick-sort");
  const pickListClear = byId("crossword-pick-clear");
  const pickListEmpty = byId("crossword-pick-empty");
  const pickListEntriesElement = byId("crossword-pick-entries");
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
  const DICTIONARY_BITS = { enable: 1, sowpods: 2, both: 3 };
  const PickListStore = window.MonkeyTacticsCrosswordPickList;
  const MANIFEST_URL = "/assets/data/words/manifest.enable-sowpods-v2.json";
  const CHUNK_BASE_URL = "/assets/data/words/";
  const CLUE_BASE_URL = "/assets/data/crossword-clues/";
  const CLUE_MANIFEST_URL = `${CLUE_BASE_URL}manifest.clues-v2.json?v=wordnet-3.0-filtered-v2`;
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
  const DICTIONARY_HOVER_DELAY = 650;
  let pickListEntries = PickListStore?.read() || [];
  let currentPickContext = null;
  let currentShareEntry = null;
  let shareReturnFocus = null;

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
    return [...forms];
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
    if (data?.formatVersion !== 2 || !data.index || !data.shards) throw new Error("Clue manifest is invalid.");
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
    dictionaryMerriamLink.hidden = selectedDictionary === "sowpods";
    dictionaryCollinsLink.hidden = selectedDictionary === "enable";
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
      unavailable.textContent = `A definition for ${word} is not available here. Use the dictionary links below to continue.`;
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
    lengthInput.value = String(fixedPatternLength(restoredPattern) || entry.word.length);
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
    if (!/^[A-Z]{2,30}$/.test(word)) return false;
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
    pickListCount.textContent = `${entries.length} ${entries.length === 1 ? "pick" : "picks"}`;
    pickListClear.disabled = entries.length === 0;
    pickListEmpty.hidden = entries.length > 0;
    const fragment = document.createDocumentFragment();

    entries.forEach((entry) => {
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
      const gridPosition = document.createElement("input");
      const note = document.createElement("textarea");

      item.className = "crossword-pick-entry";
      header.className = "crossword-pick-entry-header";
      actions.className = "crossword-pick-entry-actions";
      meta.className = "crossword-pick-meta";
      context.className = "crossword-pick-context";
      fields.className = "crossword-pick-fields";
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
      const matchLabel = `${Math.round(entry.relevance)} strength · ${entry.matchedTokens} clue ${entry.matchedTokens === 1 ? "word" : "words"} · ${entry.dictionaryMembership}`;
      meta.textContent = `${matchLabel} · ${new Date(entry.timestamp).toLocaleString()}`;
      gridPosition.type = "text";
      gridPosition.maxLength = PickListStore.GRID_POSITION_MAX_LENGTH;
      gridPosition.value = entry.gridPosition;
      gridPosition.placeholder = "e.g. 14-Down";
      note.rows = 3;
      note.maxLength = PickListStore.NOTE_MAX_LENGTH;
      note.value = entry.note;
      note.placeholder = "Why this fits or crossings to check…";
      const saveFields = () => { pickListEntries = PickListStore.update(entry.id, { gridPosition: gridPosition.value, note: note.value }); };
      gridPosition.addEventListener("input", saveFields);
      note.addEventListener("input", saveFields);
      actions.append(insert, share, remove);
      header.append(word, actions);
      context.append(
        createPickContextRow("Clue", entry.clue || "Pattern-only search"),
        createPickContextRow("Pattern", entry.pattern || "None"),
        createPickContextRow("Matched definition", entry.definition || "No WordNet definition for this pattern-only result")
      );
      fields.append(createPickField("Grid position", gridPosition), createPickField("Notes", note));
      item.append(header, meta, context, fields);
      fragment.append(item);
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
        const score = candidateScores.get(id) || { direct: 0, expanded: 0 };
        score.direct += tokenWeight;
        candidateScores.set(id, score);
        candidateLengths.set(id, length);
      }
      const synonymIds = [...new Set(queryForms(token).flatMap((form) => index.synonymPostings?.[form] || []))];
      const synonymWeight = Math.max(1, Math.log2((clueManifest.recordCount + 1) / (synonymIds.length + 1))) * 0.35;
      for (const id of synonymIds) {
        const lengthKey = lengthRanges.find(([, [firstId, lastId]]) => id >= firstId && id <= lastId)?.[0];
        const length = lengthKey === "16-plus" ? 16 : Number.parseInt(lengthKey || "0", 10);
        const score = candidateScores.get(id) || { direct: 0, expanded: 0 };
        score.expanded = Math.max(score.expanded, synonymWeight);
        candidateScores.set(id, score);
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
      const candidateScore = candidateScores.get(record.id);
      let relevance = (candidateScore.direct + candidateScore.expanded) * 10;
      if (record.clue.toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(normalizedQuery)) relevance += 100;
      if (matchedTokens === tokens.length) relevance += 50;
      relevance += (record.quality / 100) * 20;
      relevance += [...pattern].filter((letter) => /[a-z]/.test(letter)).length * 4;
      if (inferredLength && record.length === inferredLength) relevance += 20;
      const result = { ...record, relevance, matchedTokens, synonymMatch: candidateScore.direct === 0 && candidateScore.expanded > 0 };
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
      bindDictionaryTrigger(button, match.answer, {
        clue,
        pattern,
        definition: match.clue,
        relevance: match.relevance,
        matchedTokens: match.matchedTokens,
        dictionaryBits: match.dictionaryBits,
        dictionaryMembership: dictionaryMembership(match.dictionaryBits)
      });
      const explanation = document.createElement("span");
      explanation.className = "clue-result-match";
      explanation.textContent = index === 0 ? "Best match" : match.synonymMatch ? "Related meaning" : `${match.matchedTokens} clue ${match.matchedTokens === 1 ? "word" : "words"} matched`;
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
  pickListClear.addEventListener("click", () => {
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
  updateActiveFilterCount();
  const sharedSearchPending = importSharedPickFromUrl();
  renderPickList();

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
