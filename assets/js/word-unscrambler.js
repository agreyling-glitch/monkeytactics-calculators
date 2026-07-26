"use strict";

const form = document.querySelector("#unscramble-form");
const input = document.querySelector("#letters");
const button = document.querySelector("#unscramble-button");
const buttonLabel = button.querySelector(".button-label");
const message = document.querySelector("#form-message");
const results = document.querySelector("#results");
const resultsHeading = document.querySelector("#results-heading");
const matchCount = document.querySelector("#match-count");
const emptyState = document.querySelector("#empty-state");
const wordList = document.querySelector("#word-list");

const MANIFEST_URL =
  "../assets/data/words/manifest.enable-sowpods.v1.json?v=enable-sowpods-v1";
const CHUNK_BASE_URL = "../assets/data/words/";
const MIN_WORD_LENGTH = 2;
const SCRABBLE_VALUES = Object.freeze({
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1,
  j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1,
  s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
});

// Loaded chunks are indexed once and retained for subsequent searches.
const signatureMap = new Map();
const signaturesByLength = new Map();
const loadedChunks = new Set();
const chunkPromises = new Map();
let manifest = null;

const getSignature = (word) => [...word].sort().join("");
const getScrabbleScore = (word) =>
  [...word].reduce((score, letter) => score + SCRABBLE_VALUES[letter], 0);

function showMessage(text) {
  message.textContent = text;
  message.hidden = false;
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
}

function setEmptyState(title, text) {
  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "🔤";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const description = document.createElement("p");
  description.textContent = text;

  emptyState.replaceChildren(icon, heading, description);
}

function clearResults() {
  wordList.replaceChildren();
  setEmptyState("Your words will appear here", "Enter your letters and click Unscramble.");
  emptyState.hidden = false;
  matchCount.hidden = true;
}

function renderMatches(letters, matches) {
  clearResults();

  if (matches.length === 0) {
    resultsHeading.textContent = "No matches found";
    setEmptyState(
      "No dictionary matches",
      `We couldn't find a word using the letters “${letters}.” Try another jumble.`
    );
    return;
  }

  resultsHeading.textContent =
    matches.length === 1 ? "1 word found" : `${matches.length} words found`;
  matchCount.textContent = `${matches.length} ${matches.length === 1 ? "match" : "matches"}`;
  matchCount.hidden = false;
  emptyState.hidden = true;

  const wordsByLength = new Map();

  matches.forEach((word) => {
    const group = wordsByLength.get(word.length);
    if (group) {
      group.push(word);
    } else {
      wordsByLength.set(word.length, [word]);
    }
  });

  const fragment = document.createDocumentFragment();

  wordsByLength.forEach((words, length) => {
    const group = document.createElement("section");
    group.className = "word-group";

    const heading = document.createElement("h4");
    heading.textContent =
      `${length}-letter words made by unscrambling the letters ${letters.toUpperCase()}`;

    const grid = document.createElement("ul");
    grid.className = "word-grid";
    grid.setAttribute("aria-label", `${length}-letter words`);

    words.forEach((word) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const wordLabel = document.createElement("span");
      const linkMeta = document.createElement("span");
      const score = document.createElement("span");
      const dictionaryArrow = document.createElement("span");
      const points = getScrabbleScore(word);

      link.href = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute(
        "aria-label",
        `Look up the definition of ${word}; Scrabble score ${points} points`
      );

      wordLabel.className = "word-label";
      wordLabel.textContent = word;

      linkMeta.className = "word-link-meta";

      score.className = "scrabble-score";
      score.textContent = `${points} pts`;

      dictionaryArrow.className = "dictionary-arrow";
      dictionaryArrow.setAttribute("aria-hidden", "true");
      dictionaryArrow.textContent = "↗";

      linkMeta.append(score, dictionaryArrow);
      link.append(wordLabel, linkMeta);
      item.append(link);
      grid.append(item);
    });

    group.append(heading, grid);
    fragment.append(group);
  });

  wordList.append(fragment);
}

function indexWords(words) {
  words.forEach((word) => {
    if (!/^[a-z]+$/.test(word) || word.length < MIN_WORD_LENGTH) {
      return;
    }

    const signature = getSignature(word);
    const matches = signatureMap.get(signature);

    if (matches) {
      matches.push(word);
      return;
    }

    signatureMap.set(signature, [word]);

    const signatures = signaturesByLength.get(word.length);
    if (signatures) {
      signatures.push(signature);
    } else {
      signaturesByLength.set(word.length, [signature]);
    }
  });
}

async function decodeChunk(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;

  // Some hosts transparently decode gzip; only decompress when the magic bytes remain.
  if (!isGzip) {
    return new TextDecoder().decode(bytes);
  }

  if (!("DecompressionStream" in window)) {
    throw new Error("This browser does not support gzip decompression.");
  }

  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));

  return new Response(stream).text();
}

async function loadChunk(letter) {
  if (loadedChunks.has(letter)) {
    return;
  }

  if (chunkPromises.has(letter)) {
    return chunkPromises.get(letter);
  }

  const chunk = manifest?.chunks?.[letter];
  if (!chunk) {
    return;
  }

  const promise = (async () => {
    const response = await fetch(`${CHUNK_BASE_URL}${chunk.file}`);

    if (!response.ok) {
      throw new Error(`Dictionary chunk ${letter} failed with status ${response.status}`);
    }

    const text = await decodeChunk(response);
    indexWords(text.split(/\r?\n/).filter(Boolean));
    loadedChunks.add(letter);
  })();

  chunkPromises.set(letter, promise);

  try {
    await promise;
  } finally {
    chunkPromises.delete(letter);
  }
}

async function loadRelevantChunks(letters) {
  // Every valid result starts with one of the supplied letters, so these chunks
  // contain the complete result set without downloading the whole dictionary.
  const relevantLetters = [...new Set(letters)].sort();
  await Promise.all(relevantLetters.map(loadChunk));
}

function canBuildFromLetters(signature, availableCounts) {
  let currentIndex = -1;
  let usedCount = 0;

  for (const letter of signature) {
    const index = letter.charCodeAt(0) - 97;

    if (index === currentIndex) {
      usedCount += 1;
    } else {
      currentIndex = index;
      usedCount = 1;
    }

    if (usedCount > availableCounts[index]) {
      return false;
    }
  }

  return true;
}

function findMatches(letters) {
  const availableCounts = new Uint8Array(26);

  for (const letter of letters) {
    availableCounts[letter.charCodeAt(0) - 97] += 1;
  }

  const matches = [];

  for (let length = letters.length; length >= MIN_WORD_LENGTH; length -= 1) {
    const signatures = signaturesByLength.get(length) ?? [];

    signatures.forEach((signature) => {
      if (canBuildFromLetters(signature, availableCounts)) {
        matches.push(...signatureMap.get(signature));
      }
    });
  }

  return matches.sort(
    (a, b) => b.length - a.length || a.localeCompare(b)
  );
}

async function handleSubmit(event) {
  event.preventDefault();
  clearMessage();
  clearResults();

  const letters = input.value.trim().toLowerCase();
  input.value = letters;

  if (!letters) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Enter some letters", "Add scrambled letters to search the dictionary.");
    showMessage("Please enter at least one letter.");
    input.focus();
    return;
  }

  if (!/^[a-z]+$/.test(letters)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Letters only", "Remove spaces, numbers, and punctuation, then try again.");
    showMessage("Please use letters only.");
    input.focus();
    return;
  }

  results.setAttribute("aria-busy", "true");
  button.disabled = true;
  buttonLabel.textContent = "Loading words…";

  try {
    await loadRelevantChunks(letters);
    renderMatches(letters, findMatches(letters));
  } catch (error) {
    console.error("Unable to load dictionary chunks:", error);
    resultsHeading.textContent = "Dictionary unavailable";
    setEmptyState("Unable to load words", "Please refresh the page and try again.");
    showMessage("The dictionary could not be loaded. Please refresh the page and try again.");
  } finally {
    results.setAttribute("aria-busy", "false");
    button.disabled = false;
    buttonLabel.textContent = "Unscramble";
  }
}

async function loadManifest() {
  try {
    const response = await fetch(MANIFEST_URL);

    if (!response.ok) {
      throw new Error(`Dictionary manifest failed with status ${response.status}`);
    }

    manifest = await response.json();

    if (!manifest?.chunks || manifest.encoding !== "gzip-newline") {
      throw new TypeError("Dictionary manifest is invalid.");
    }

    button.disabled = false;
    buttonLabel.textContent = "Unscramble";
    input.focus();
  } catch (error) {
    console.error("Unable to load dictionary manifest:", error);
    buttonLabel.textContent = "Dictionary unavailable";
    showMessage("The dictionary index could not be loaded. Please refresh the page.");
  }
}

form.addEventListener("submit", handleSubmit);
window.addEventListener("DOMContentLoaded", loadManifest, { once: true });
