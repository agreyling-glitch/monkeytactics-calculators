"use strict";

const form = document.querySelector("#unscramble-form");
const input = document.querySelector("#letters");
const dictionaryInputs = form.querySelectorAll('input[name="dictionary"]');
const wordLengthInput = document.querySelector("#word-length");
const startsWithInput = document.querySelector("#starts-with");
const endsWithInput = document.querySelector("#ends-with");
const patternInput = document.querySelector("#pattern");
const resetPatternButton = document.querySelector("#reset-pattern");
const mustIncludeInput = document.querySelector("#must-include");
const excludeLettersInput = document.querySelector("#exclude-letters");
const highValueOnlyInput = document.querySelector("#high-value-only");
const minimumVowelsInput = document.querySelector("#minimum-vowels");
const minimumConsonantsInput = document.querySelector("#minimum-consonants");
const minimumScoreInput = document.querySelector("#minimum-score");
const maximumScoreInput = document.querySelector("#maximum-score");
const hookFilterInput = document.querySelector("#hook-filter");
const sortResultsInput = document.querySelector("#sort-results");
const resetAllFiltersButton = document.querySelector("#reset-all-filters");
const button = document.querySelector("#unscramble-button");
const buttonLabel = button.querySelector(".button-label");
const message = document.querySelector("#form-message");
const results = document.querySelector("#results");
const resultsHeading = document.querySelector("#results-heading");
const matchCount = document.querySelector("#match-count");
const emptyState = document.querySelector("#empty-state");
const wordList = document.querySelector("#word-list");

const MANIFEST_URL =
  "../assets/data/words/manifest.enable-sowpods-v2.json?v=enable-sowpods-v2";
const CHUNK_BASE_URL = "../assets/data/words/";
const MIN_WORD_LENGTH = 2;
const VOWELS = "aeiou";
const HIGH_VALUE_LETTERS = "jqxz";
const LENGTH_GROUP_SORTS = new Set(["length-desc", "length-asc", "uses-most"]);
const SORT_LABELS = Object.freeze({
  "score-desc": "Words sorted by Scrabble score",
  alpha: "Words sorted alphabetically",
  "high-value": "Words with high-value letters first",
  bingo: "Bingo candidates first",
  "hooks-total": "Words with the most hooks first",
  "hooks-s": "Words with S-hooks first",
  "hooks-front": "Words with front hooks first",
  "hooks-back": "Words with back hooks first",
  "pattern-strength": "Strongest pattern matches first"
});
const DICTIONARY_BITS = Object.freeze({
  enable: 1,
  sowpods: 2,
  both: 3
});
const SCRABBLE_VALUES = Object.freeze({
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1,
  j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1,
  s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
});

// Loaded chunks are indexed once and retained for subsequent searches.
const signatureMap = new Map();
const signaturesByLength = new Map();
const wordMembership = new Map();
const hookCache = new Map();
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

function createWordItem(word, options) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  const wordLabel = document.createElement("span");
  const linkMeta = document.createElement("span");
  const score = document.createElement("span");
  const dictionaryArrow = document.createElement("span");
  const points = getScrabbleScore(word);
  const highValueLetters = getHighValueLetters(word);
  const ariaDetails = [`Scrabble score ${points} points`];

  link.href = `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  wordLabel.className = "word-label";
  wordLabel.textContent = word;

  linkMeta.className = "word-link-meta";

  score.className = "scrabble-score";
  score.textContent = `${points} pts`;
  linkMeta.append(score);

  if (word.length === 7) {
    const bingoBadge = document.createElement("span");
    bingoBadge.className = "result-badge result-badge--bingo";
    bingoBadge.textContent = "Bingo +50";
    ariaDetails.push("seven-letter bingo candidate");
    linkMeta.append(bingoBadge);
  }

  if (highValueLetters) {
    const highValueBadge = document.createElement("span");
    highValueBadge.className = "result-badge result-badge--high-value";
    highValueBadge.textContent = highValueLetters.toUpperCase();
    ariaDetails.push(`contains high-value ${highValueLetters.toUpperCase()}`);
    linkMeta.append(highValueBadge);
  }

  if (options.showHooks) {
    const hooks = getHookInfo(word, options.dictionaryBit);
    const hookBadge = document.createElement("span");
    hookBadge.className = "result-badge";
    hookBadge.textContent =
      `F${hooks.front.length} · B${hooks.back.length}${hooks.hasSHook ? " · S" : ""}`;
    hookBadge.title =
      `Front hooks: ${hooks.front.join(", ").toUpperCase() || "none"}; ` +
      `back hooks: ${hooks.back.join(", ").toUpperCase() || "none"}`;
    ariaDetails.push(
      `${hooks.front.length} front hooks; ${hooks.back.length} back hooks` +
      (hooks.hasSHook ? "; includes an S-hook" : "")
    );
    linkMeta.append(hookBadge);
  }

  dictionaryArrow.className = "dictionary-arrow";
  dictionaryArrow.setAttribute("aria-hidden", "true");
  dictionaryArrow.textContent = "↗";

  link.setAttribute(
    "aria-label",
    `Look up the definition of ${word}; ${ariaDetails.join("; ")}`
  );

  linkMeta.append(dictionaryArrow);
  link.append(wordLabel, linkMeta);
  item.append(link);
  return item;
}

function appendWordGroup(fragment, headingText, words, ariaLabel, options) {
  const group = document.createElement("section");
  group.className = "word-group";

  const heading = document.createElement("h4");
  heading.textContent = headingText;

  const grid = document.createElement("ul");
  grid.className = "word-grid";
  grid.setAttribute("aria-label", ariaLabel);

  words.forEach((word) => grid.append(createWordItem(word, options)));
  group.append(heading, grid);
  fragment.append(group);
}

function renderMatches(letters, matches, options) {
  clearResults();

  if (matches.length === 0) {
    resultsHeading.textContent = "No matches found";
    setEmptyState(
      "No words match these options",
      `Try changing the dictionary, basic or advanced filters, sorting, or “${letters}.”`
    );
    return;
  }

  resultsHeading.textContent =
    matches.length === 1 ? "1 word found" : `${matches.length} words found`;
  matchCount.textContent = `${matches.length} ${matches.length === 1 ? "match" : "matches"}`;
  matchCount.hidden = false;
  emptyState.hidden = true;

  const fragment = document.createDocumentFragment();

  if (LENGTH_GROUP_SORTS.has(options.sortBy)) {
    const wordsByLength = new Map();

    matches.forEach((word) => {
      const group = wordsByLength.get(word.length);
      if (group) {
        group.push(word);
      } else {
        wordsByLength.set(word.length, [word]);
      }
    });

    wordsByLength.forEach((words, length) => {
      appendWordGroup(
        fragment,
        `${length}-letter words made by unscrambling the letters ${letters.toUpperCase()}`,
        words,
        `${length}-letter words`,
        options
      );
    });
  } else {
    const heading = SORT_LABELS[options.sortBy] ?? "Matching words";
    appendWordGroup(fragment, heading, matches, heading, options);
  }

  wordList.append(fragment);
}

function indexWords(records) {
  records.forEach((record) => {
    const [word, membershipValue] = record.split("\t");
    const membership = Number.parseInt(membershipValue, 10);

    if (!/^[a-z]+$/.test(word) || word.length < MIN_WORD_LENGTH) {
      return;
    }

    if (!Number.isInteger(membership) || membership < 1 || membership > 3) {
      return;
    }

    wordMembership.set(word, membership);

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

async function loadAllChunks() {
  await Promise.all(Object.keys(manifest.chunks).map(loadChunk));
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

function containsRequiredLetters(word, requiredLetters) {
  if (!requiredLetters) {
    return true;
  }

  const wordCounts = new Uint8Array(26);

  for (const letter of word) {
    wordCounts[letter.charCodeAt(0) - 97] += 1;
  }

  for (const letter of requiredLetters) {
    const index = letter.charCodeAt(0) - 97;

    if (wordCounts[index] === 0) {
      return false;
    }

    wordCounts[index] -= 1;
  }

  return true;
}

function getHighValueLetters(word) {
  return [...new Set([...word].filter((letter) => HIGH_VALUE_LETTERS.includes(letter)))]
    .sort()
    .join("");
}

function getHighValueScore(word) {
  return [...word].reduce(
    (score, letter) =>
      score + (HIGH_VALUE_LETTERS.includes(letter) ? SCRABBLE_VALUES[letter] : 0),
    0
  );
}

function getVowelCount(word) {
  return [...word].filter((letter) => VOWELS.includes(letter)).length;
}

function hasDictionaryWord(word, dictionaryBit) {
  return ((wordMembership.get(word) ?? 0) & dictionaryBit) !== 0;
}

function getHookInfo(word, dictionaryBit) {
  const cacheKey = `${dictionaryBit}:${word}`;

  if (hookCache.has(cacheKey)) {
    return hookCache.get(cacheKey);
  }

  const front = [];
  const back = [];

  for (let code = 97; code <= 122; code += 1) {
    const letter = String.fromCharCode(code);

    if (hasDictionaryWord(`${letter}${word}`, dictionaryBit)) {
      front.push(letter);
    }

    if (hasDictionaryWord(`${word}${letter}`, dictionaryBit)) {
      back.push(letter);
    }
  }

  const hooks = {
    front,
    back,
    hasSHook: back.includes("s"),
    total: front.length + back.length
  };

  hookCache.set(cacheKey, hooks);
  return hooks;
}

function matchesHookFilter(word, hookFilter, dictionaryBit) {
  if (!hookFilter) {
    return true;
  }

  const hooks = getHookInfo(word, dictionaryBit);

  switch (hookFilter) {
    case "any":
      return hooks.total > 0;
    case "s":
      return hooks.hasSHook;
    case "front":
      return hooks.front.length > 0;
    case "back":
      return hooks.back.length > 0;
    case "multiple":
      return hooks.total > 1;
    default:
      return true;
  }
}

function getPatternStrength(word, pattern) {
  if (!pattern || word.length !== pattern.length) {
    return 0;
  }

  return [...pattern].reduce(
    (strength, character, index) =>
      strength + (character !== "?" && word[index] === character ? 1 : 0),
    0
  );
}

function sortMatches(matches, options) {
  const alphabetical = (a, b) => a.localeCompare(b);
  const longestFirst = (a, b) => b.length - a.length || alphabetical(a, b);
  let compare = longestFirst;

  switch (options.sortBy) {
    case "score-desc":
      compare = (a, b) =>
        getScrabbleScore(b) - getScrabbleScore(a) || longestFirst(a, b);
      break;
    case "alpha":
      compare = alphabetical;
      break;
    case "length-asc":
      compare = (a, b) => a.length - b.length || alphabetical(a, b);
      break;
    case "high-value":
      compare = (a, b) =>
        getHighValueScore(b) - getHighValueScore(a) ||
        getScrabbleScore(b) - getScrabbleScore(a) ||
        longestFirst(a, b);
      break;
    case "bingo":
      compare = (a, b) =>
        Number(b.length === 7) - Number(a.length === 7) ||
        getScrabbleScore(b) - getScrabbleScore(a) ||
        longestFirst(a, b);
      break;
    case "hooks-total":
      compare = (a, b) =>
        getHookInfo(b, options.dictionaryBit).total -
          getHookInfo(a, options.dictionaryBit).total ||
        longestFirst(a, b);
      break;
    case "hooks-s":
      compare = (a, b) =>
        Number(getHookInfo(b, options.dictionaryBit).hasSHook) -
          Number(getHookInfo(a, options.dictionaryBit).hasSHook) ||
        longestFirst(a, b);
      break;
    case "hooks-front":
      compare = (a, b) =>
        getHookInfo(b, options.dictionaryBit).front.length -
          getHookInfo(a, options.dictionaryBit).front.length ||
        longestFirst(a, b);
      break;
    case "hooks-back":
      compare = (a, b) =>
        getHookInfo(b, options.dictionaryBit).back.length -
          getHookInfo(a, options.dictionaryBit).back.length ||
        longestFirst(a, b);
      break;
    case "pattern-strength":
      compare = (a, b) =>
        getPatternStrength(b, options.pattern) - getPatternStrength(a, options.pattern) ||
        longestFirst(a, b);
      break;
    default:
      compare = longestFirst;
  }

  return matches.sort(compare);
}

function findMatches(letters, options) {
  const availableCounts = new Uint8Array(26);
  const patternExpression = options.pattern
    ? new RegExp(`^${options.pattern.replaceAll("?", "[a-z]")}$`)
    : null;

  for (const letter of letters) {
    availableCounts[letter.charCodeAt(0) - 97] += 1;
  }

  const matches = [];
  const maximumLength = options.wordLength || letters.length;
  const minimumLength = options.wordLength || MIN_WORD_LENGTH;

  if (maximumLength > letters.length) {
    return matches;
  }

  if (patternExpression && options.pattern.length !== maximumLength && options.wordLength) {
    return matches;
  }

  for (let length = maximumLength; length >= minimumLength; length -= 1) {
    if (patternExpression && options.pattern.length !== length) {
      continue;
    }

    const signatures = signaturesByLength.get(length) ?? [];

    signatures.forEach((signature) => {
      if (canBuildFromLetters(signature, availableCounts)) {
        signatureMap.get(signature).forEach((word) => {
          const membership = wordMembership.get(word) ?? 0;

          if ((membership & options.dictionaryBit) === 0) {
            return;
          }

          if (patternExpression && !patternExpression.test(word)) {
            return;
          }

          if (options.startsWith && !word.startsWith(options.startsWith)) {
            return;
          }

          if (options.endsWith && !word.endsWith(options.endsWith)) {
            return;
          }

          if ([...options.excludeLetters].some((letter) => word.includes(letter))) {
            return;
          }

          if (options.highValueOnly && !getHighValueLetters(word)) {
            return;
          }

          const vowelCount = getVowelCount(word);

          if (
            vowelCount < options.minimumVowels ||
            word.length - vowelCount < options.minimumConsonants
          ) {
            return;
          }

          const score = getScrabbleScore(word);

          if (
            (options.minimumScore !== null && score < options.minimumScore) ||
            (options.maximumScore !== null && score > options.maximumScore)
          ) {
            return;
          }

          if (!containsRequiredLetters(word, options.mustInclude)) {
            return;
          }

          if (!matchesHookFilter(word, options.hookFilter, options.dictionaryBit)) {
            return;
          }

          matches.push(word);
        });
      }
    });
  }

  return sortMatches(matches, options);
}

async function handleSubmit(event) {
  event.preventDefault();
  clearMessage();
  clearResults();

  const letters = input.value.trim().toLowerCase();
  const startsWith = startsWithInput.value.trim().toLowerCase();
  const endsWith = endsWithInput.value.trim().toLowerCase();
  const pattern = patternInput.value.trim().toLowerCase();
  const mustInclude = mustIncludeInput.value.trim().toLowerCase();
  const excludeLetters = excludeLettersInput.value.trim().toLowerCase();
  const dictionary = [...dictionaryInputs].find((option) => option.checked)?.value ?? "both";
  const wordLength = Number.parseInt(wordLengthInput.value, 10) || 0;
  const minimumVowels = Number.parseInt(minimumVowelsInput.value, 10) || 0;
  const minimumConsonants = Number.parseInt(minimumConsonantsInput.value, 10) || 0;
  const minimumScore = minimumScoreInput.value === ""
    ? null
    : Number.parseInt(minimumScoreInput.value, 10);
  const maximumScore = maximumScoreInput.value === ""
    ? null
    : Number.parseInt(maximumScoreInput.value, 10);
  const hookFilter = hookFilterInput.value;
  const sortBy = sortResultsInput.value;
  input.value = letters;
  startsWithInput.value = startsWith;
  endsWithInput.value = endsWith;
  patternInput.value = pattern.toUpperCase();
  mustIncludeInput.value = mustInclude;
  excludeLettersInput.value = excludeLetters;

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

  if (pattern && !/^[a-z?]+$/.test(pattern)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check the pattern", "Use letters and ? wildcard characters only.");
    showMessage("Pattern Search accepts letters and ? wildcard characters only.");
    patternInput.focus();
    return;
  }

  if (startsWith && !/^[a-z]+$/.test(startsWith)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check starting letters", "Use letters only in Starts With.");
    showMessage("Starts With accepts letters only.");
    startsWithInput.focus();
    return;
  }

  if (endsWith && !/^[a-z]+$/.test(endsWith)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check ending letters", "Use letters only in Ends With.");
    showMessage("Ends With accepts letters only.");
    endsWithInput.focus();
    return;
  }

  if (mustInclude && !/^[a-z]+$/.test(mustInclude)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check required letters", "Use letters only in Must Include Letter(s).");
    showMessage("Must Include Letter(s) accepts letters only.");
    mustIncludeInput.focus();
    return;
  }

  if (excludeLetters && !/^[a-z]+$/.test(excludeLetters)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check excluded letters", "Use letters only in Exclude Letters.");
    showMessage("Exclude Letters accepts letters only.");
    excludeLettersInput.focus();
    return;
  }

  if (
    (minimumScore !== null && (!Number.isInteger(minimumScore) || minimumScore < 0)) ||
    (maximumScore !== null && (!Number.isInteger(maximumScore) || maximumScore < 0))
  ) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check score filters", "Enter whole-number Scrabble scores of zero or more.");
    showMessage("Score filters must be whole numbers of zero or more.");
    minimumScoreInput.focus();
    return;
  }

  if (minimumScore !== null && maximumScore !== null && minimumScore > maximumScore) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check score range", "Minimum Score cannot exceed Maximum Score.");
    showMessage("Minimum Score cannot be greater than Maximum Score.");
    minimumScoreInput.focus();
    return;
  }

  if (sortBy === "pattern-strength" && !pattern) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Add a pattern", "Pattern Match Strength sorting needs a wildcard pattern.");
    showMessage("Enter a Pattern Search before sorting by Pattern Match Strength.");
    patternInput.focus();
    return;
  }

  const options = {
    dictionaryBit: DICTIONARY_BITS[dictionary],
    wordLength,
    startsWith,
    endsWith,
    pattern,
    mustInclude,
    excludeLetters,
    highValueOnly: highValueOnlyInput.checked,
    minimumVowels,
    minimumConsonants,
    minimumScore,
    maximumScore,
    hookFilter,
    sortBy,
    showHooks: Boolean(hookFilter || sortBy.startsWith("hooks-"))
  };

  results.setAttribute("aria-busy", "true");
  button.disabled = true;
  buttonLabel.textContent = "Loading words…";

  try {
    await loadRelevantChunks(letters);

    if (options.showHooks) {
      buttonLabel.textContent = "Loading hooks…";
      await loadAllChunks();
    }

    renderMatches(letters, findMatches(letters, options), options);
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

    if (!manifest?.chunks || manifest.encoding !== "gzip-newline-membership") {
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
resetPatternButton.addEventListener("click", () => {
  patternInput.value = "";
  patternInput.focus();
});
resetAllFiltersButton.addEventListener("click", () => {
  wordLengthInput.value = "";
  startsWithInput.value = "";
  endsWithInput.value = "";
  patternInput.value = "";
  mustIncludeInput.value = "";
  excludeLettersInput.value = "";
  highValueOnlyInput.checked = false;
  minimumVowelsInput.value = "0";
  minimumConsonantsInput.value = "0";
  minimumScoreInput.value = "";
  maximumScoreInput.value = "";
  hookFilterInput.value = "";
  sortResultsInput.value = "length-desc";
  clearMessage();
});
window.addEventListener("DOMContentLoaded", loadManifest, { once: true });
