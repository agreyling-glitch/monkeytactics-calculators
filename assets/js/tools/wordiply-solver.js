"use strict";

(function initializeWordiplySolver() {
  const Engine = window.MonkeyTacticsWasm;
  const form = document.querySelector("#wordiply-form");
  if (!form || !Engine) return;

  const byId = (id) => document.getElementById(id);
  const starterInput = byId("wordiply-starter");
  const minimumLengthInput = byId("minimum-length");
  const submitButton = byId("solve-button");
  const buttonLabel = byId("solve-button-label");
  const message = byId("form-message");
  const resultsRegion = byId("results");
  const resultsHeading = byId("results-heading");
  const resultsSummary = byId("results-summary");
  const resultList = byId("word-results");
  const bestLength = byId("best-length");
  const manifestUrl = "/assets/data/words/manifest.wiktionary-v1.json";
  const chunkBaseUrl = "/assets/data/words/";
  const dictionaryBits = { enable: 1, expanded: 2, both: 3 };
  let manifest;
  let searchRequest = 0;
  const loadedChunks = new Set();

  function normalizeStarter(value) {
    return value.toLowerCase().replace(/[^a-z]/g, "");
  }

  async function decodeChunk(response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
    if (!("DecompressionStream" in window)) throw new Error("Gzip decompression is unavailable.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  async function loadAllChunks() {
    const letters = Object.keys(manifest.chunks).filter((letter) => !loadedChunks.has(letter));
    await Promise.all(letters.map(async (letter) => {
      const response = await fetch(`${chunkBaseUrl}${manifest.chunks[letter].file}`);
      if (!response.ok) throw new Error(`Dictionary chunk ${letter} failed.`);
      Engine.initEngine((await decodeChunk(response)).split(/\r?\n/).filter(Boolean));
      loadedChunks.add(letter);
    }));
  }

  function setBusy(busy, label = "Find long words") {
    resultsRegion.setAttribute("aria-busy", String(busy));
    submitButton.disabled = busy;
    buttonLabel.textContent = busy ? label : "Find long words";
  }

  function showMessage(text) {
    message.textContent = text;
    message.hidden = !text;
  }

  function highlightStarter(word, starter) {
    const fragment = document.createDocumentFragment();
    const index = word.indexOf(starter);
    [[word.slice(0, index), ""], [word.slice(index, index + starter.length), "starter-match"], [word.slice(index + starter.length), ""]].forEach(([text, className]) => {
      if (!text) return;
      const span = document.createElement("span");
      span.textContent = text.toUpperCase();
      if (className) span.className = className;
      fragment.append(span);
    });
    return fragment;
  }

  async function copyWord(word, button) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(word.toUpperCase());
      else {
        const temporary = document.createElement("textarea");
        temporary.value = word.toUpperCase();
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.append(temporary);
        temporary.select();
        if (!document.execCommand("copy")) throw new Error("Copy command failed.");
        temporary.remove();
      }
      const action = button.querySelector(".copy-action");
      action.textContent = "Copied";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        if (!button.isConnected) return;
        action.textContent = "Copy";
        button.classList.remove("is-copied");
      }, 1600);
    } catch (error) {
      showMessage(`Could not copy ${word.toUpperCase()}. Select the word and copy it manually.`);
    }
  }

  function renderResults(words, starter, dictionaryName) {
    resultList.replaceChildren();
    const shown = words.slice(0, 500);
    const fragment = document.createDocumentFragment();
    shown.forEach((word, index) => {
      const item = document.createElement("li");
      const rank = document.createElement("span");
      rank.className = "result-rank";
      rank.textContent = String(index + 1);
      const wordButton = document.createElement("button");
      wordButton.type = "button";
      wordButton.className = "result-word";
      wordButton.setAttribute("aria-label", `Copy ${word.toUpperCase()} to the clipboard`);
      const wordLabel = document.createElement("span");
      wordLabel.className = "result-word-label";
      wordLabel.append(highlightStarter(word, starter));
      const copyAction = document.createElement("span");
      copyAction.className = "copy-action";
      copyAction.textContent = "Copy";
      wordButton.append(wordLabel, copyAction);
      wordButton.addEventListener("click", () => copyWord(word, wordButton));
      const length = document.createElement("span");
      length.className = "result-length";
      length.innerHTML = `<strong>${word.length}</strong><small>letters</small>`;
      item.append(rank, wordButton, length);
      fragment.append(item);
    });
    resultList.append(fragment);
    resultsHeading.textContent = words.length ? `${words.length.toLocaleString()} words contain “${starter.toUpperCase()}”` : "No matching words found";
    resultsSummary.textContent = words.length ? `${dictionaryName} · longest words first${words.length > shown.length ? ` · showing ${shown.length}` : ""}` : "Try a shorter starter, another dictionary, or a lower minimum length.";
    bestLength.hidden = !words.length;
    if (words.length) bestLength.querySelector("strong").textContent = String(words[0].length);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const request = ++searchRequest;
    const starter = normalizeStarter(starterInput.value);
    starterInput.value = starter.toUpperCase();
    if (starter.length < 2) { showMessage("Enter at least two starter letters."); starterInput.focus(); return; }
    if (starter.length > 12) { showMessage("Enter no more than 12 starter letters."); starterInput.focus(); return; }
    showMessage("");
    setBusy(true, "Loading word lists…");
    try {
      await loadAllChunks();
      if (request !== searchRequest) return;
      setBusy(true, "Finding long words…");
      const dictionary = form.querySelector('input[name="dictionary"]:checked')?.value || "expanded";
      const position = form.querySelector('input[name="position"]:checked')?.value || "anywhere";
      const pattern = position === "start" ? `${starter}*` : position === "end" ? `*${starter}` : `*${starter}*`;
      const minimumLength = Number.parseInt(minimumLengthInput.value, 10) || starter.length;
      const options = { dictionaryBit: dictionaryBits[dictionary], wordLength: 0, startsWith: "", endsWith: "", mustInclude: "", excludeLetters: "", highValueOnly: false, minimumVowels: 0, minimumConsonants: 0, minimumScore: null, maximumScore: null, hookFilter: "", sortBy: "length-desc" };
      const words = Engine.crosswordSearch(pattern, "", options).filter((word) => word.length >= minimumLength).sort((a, b) => b.length - a.length || a.localeCompare(b));
      if (request !== searchRequest) return;
      renderResults(words, starter, dictionary === "both" ? "ENABLE + EXPANDED" : dictionary.toUpperCase());
    } catch (error) {
      console.error("Wordiply search failed:", error);
      resultsHeading.textContent = "Dictionary unavailable";
      resultsSummary.textContent = "Refresh the page and try again.";
      showMessage("The word lists could not be loaded.");
    } finally {
      if (request === searchRequest) setBusy(false);
    }
  }

  form.addEventListener("submit", handleSubmit);
  byId("clear-search").addEventListener("click", () => {
    searchRequest += 1;
    form.reset();
    resultList.replaceChildren();
    resultsHeading.textContent = "Your longest words will appear here";
    resultsSummary.textContent = "The starter will be highlighted inside every match.";
    bestLength.hidden = true;
    showMessage("");
    starterInput.focus();
  });
  document.querySelectorAll("[data-starter]").forEach((button) => button.addEventListener("click", () => { starterInput.value = button.dataset.starter; form.requestSubmit(); }));
  starterInput.addEventListener("input", () => { starterInput.value = starterInput.value.replace(/[^a-z]/gi, "").toUpperCase(); });

  setBusy(true, "Loading dictionary…");
  Promise.all([Engine.ready, fetch(manifestUrl).then((response) => { if (!response.ok) throw new Error("Dictionary manifest failed."); return response.json(); })])
    .then(([, data]) => { if (!data?.chunks) throw new Error("Dictionary manifest is invalid."); manifest = data; setBusy(false); })
    .catch((error) => { console.error(error); showMessage("The Wordiply dictionary could not be initialized."); buttonLabel.textContent = "Dictionary unavailable"; });
})();
