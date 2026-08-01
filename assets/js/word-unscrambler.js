"use strict";

const form = document.querySelector("#unscramble-form");
const input = document.querySelector("#letters");
const dictionaryInputs = form.querySelectorAll('input[name="dictionary"]');
const wordLengthInput = document.querySelector("#word-length");
const startsWithInput = document.querySelector("#starts-with");
const endsWithInput = document.querySelector("#ends-with");
const mustIncludeInput = document.querySelector("#must-include");
const excludeLettersInput = document.querySelector("#exclude-letters");
const highValueOnlyInput = document.querySelector("#high-value-only");
const minimumVowelsInput = document.querySelector("#minimum-vowels");
const minimumConsonantsInput = document.querySelector("#minimum-consonants");
const minimumScoreInput = document.querySelector("#minimum-score");
const maximumScoreInput = document.querySelector("#maximum-score");
const hookFilterInputs = form.querySelectorAll('input[name="hook-filter"]');
const sortResultsInput = document.querySelector("#sort-results");
const sortPicker = document.querySelector("#sort-picker");
const sortPickerTrigger = document.querySelector("#sort-picker-trigger");
const sortPickerValue = document.querySelector("#sort-picker-value");
const sortPickerIcon = document.querySelector("#sort-picker-icon");
const sortPickerMenu = document.querySelector("#sort-picker-menu");
const sortPickerCompact = document.querySelector("#sort-picker-compact");
const sortPickerExpanded = document.querySelector("#sort-picker-expanded");
const sortPickerMore = document.querySelector("#sort-picker-more");
const sortOptionButtons = sortPicker.querySelectorAll("[data-sort-value]");
const resetAllFiltersButton = document.querySelector("#reset-all-filters");
const button = document.querySelector("#unscramble-button");
const buttonLabel = button.querySelector(".button-label");
const message = document.querySelector("#form-message");
const results = document.querySelector("#results");
const resultsHeading = document.querySelector("#results-heading");
const matchCount = document.querySelector("#match-count");
const emptyState = document.querySelector("#empty-state");
const wordList = document.querySelector("#word-list");
const wordBreakdown = document.querySelector("#word-breakdown");
const breakdownCharts = document.querySelector("#breakdown-charts");
const breakdownSummary = wordBreakdown.querySelector("summary");

const MANIFEST_URL =
  "../assets/data/words/manifest.enable-sowpods-v2.json?v=enable-sowpods-v2";
const CHUNK_BASE_URL = "../assets/data/words/";
const MIN_WORD_LENGTH = 2;
const VOWELS = "aeiou";
const HIGH_VALUE_LETTERS = "jqxz";
const LENGTH_GROUP_SORTS = new Set(["length-desc", "length-asc", "uses-most"]);
const DICTIONARY_LINKS = Object.freeze([
  {
    abbreviation: "MW",
    name: "Merriam-Webster",
    getUrl: (word) => `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`
  },
  {
    abbreviation: "CO",
    name: "Collins",
    getUrl: (word) =>
      `https://www.collinsdictionary.com/dictionary/english/${encodeURIComponent(word)}`
  },
  {
    abbreviation: "Wik",
    name: "Wiktionary",
    getUrl: (word) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`
  },
  {
    abbreviation: "WN",
    name: "Wordnik",
    getUrl: (word) => `https://www.wordnik.com/words/${encodeURIComponent(word)}`
  },
  {
    abbreviation: "LX",
    name: "Lexico (now Dictionary.com)",
    getUrl: (word) => `https://www.dictionary.com/browse/${encodeURIComponent(word)}`
  },
  {
    abbreviation: "Cam",
    name: "Cambridge",
    getUrl: (word) =>
      `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`
  }
]);
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
let breakdownState = null;

const getSignature = (word) => [...word].sort().join("");
const getScrabbleScore = (word) =>
  [...word].reduce((score, letter) => score + (SCRABBLE_VALUES[letter] ?? 0), 0);

function focusFilterInput(filterInput) {
  const filterPanel = filterInput.closest("details");

  if (filterPanel) {
    filterPanel.open = true;
  }

  filterInput.focus();
}

function getSortOption(value, container = sortPicker) {
  return [...container.querySelectorAll("[data-sort-value]")]
    .find((option) => option.dataset.sortValue === value);
}

function syncSortPicker() {
  const selectedOption = getSortOption(sortResultsInput.value);

  if (!selectedOption) {
    return;
  }

  sortPickerValue.textContent = selectedOption.querySelector("span").textContent;
  sortPickerIcon.textContent = selectedOption.dataset.sortIcon;
  sortOptionButtons.forEach((option) => {
    option.setAttribute(
      "aria-selected",
      String(option.dataset.sortValue === sortResultsInput.value)
    );
  });
}

function setSortPickerMode(expanded) {
  sortPickerCompact.hidden = expanded;
  sortPickerExpanded.hidden = !expanded;
}

function getVisibleSortControls() {
  const activePanel = sortPickerExpanded.hidden ? sortPickerCompact : sortPickerExpanded;
  return [...activePanel.querySelectorAll("button")];
}

function openSortPicker(focusDirection = "selected") {
  const compactHasSelection = Boolean(getSortOption(sortResultsInput.value, sortPickerCompact));
  setSortPickerMode(!compactHasSelection);
  sortPickerMenu.hidden = false;
  sortPickerTrigger.setAttribute("aria-expanded", "true");

  const controls = getVisibleSortControls();
  const selected = controls.find(
    (control) => control.dataset.sortValue === sortResultsInput.value
  );
  const focusTarget = focusDirection === "last"
    ? controls.at(-1)
    : selected ?? controls[0];
  focusTarget?.focus();
}

function closeSortPicker(restoreFocus = false) {
  sortPickerMenu.hidden = true;
  sortPickerTrigger.setAttribute("aria-expanded", "false");
  setSortPickerMode(false);

  if (restoreFocus) {
    sortPickerTrigger.focus();
  }
}

sortPickerTrigger.addEventListener("click", () => {
  if (sortPickerMenu.hidden) {
    openSortPicker();
  } else {
    closeSortPicker();
  }
});

sortPickerTrigger.addEventListener("keydown", (event) => {
  if (!sortPickerMenu.hidden || !["ArrowDown", "ArrowUp"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  openSortPicker(event.key === "ArrowUp" ? "last" : "selected");
});

sortOptionButtons.forEach((option) => {
  option.addEventListener("click", () => {
    sortResultsInput.value = option.dataset.sortValue;
    syncSortPicker();
    closeSortPicker(true);

    if (input.value.trim() && !button.disabled) {
      form.requestSubmit();
    }
  });
});

sortPickerMore.addEventListener("click", () => {
  setSortPickerMode(true);
  const selected = getSortOption(sortResultsInput.value, sortPickerExpanded);
  (selected ?? getVisibleSortControls()[0])?.focus();
});

sortPickerMenu.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeSortPicker(true);
    return;
  }

  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  const controls = getVisibleSortControls();
  const currentIndex = controls.indexOf(document.activeElement);
  let nextIndex;

  if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = controls.length - 1;
  } else {
    const direction = event.key === "ArrowDown" ? 1 : -1;
    nextIndex = (currentIndex + direction + controls.length) % controls.length;
  }

  controls[nextIndex]?.focus();
});

document.addEventListener("click", (event) => {
  if (!sortPickerMenu.hidden && !sortPicker.contains(event.target)) {
    closeSortPicker();
  }
});

syncSortPicker();

function parseSmartInput(value) {
  const slashIndex = value.indexOf("/");
  const rackSource = slashIndex === -1 ? value : value.slice(0, slashIndex);
  const patternSource = slashIndex === -1 ? "" : value.slice(slashIndex + 1);

  return {
    rack: rackSource.toLowerCase().replace(/[^a-z?]/g, ""),
    pattern: patternSource.toLowerCase().replace(/[^a-z?*]/g, "")
  };
}

function createPatternExpression(pattern) {
  if (!pattern) {
    return null;
  }

  const source = [...pattern]
    .map((character) => {
      if (character === "?") {
        return "[a-z]";
      }

      if (character === "*") {
        return "[a-z]*";
      }

      return character;
    })
    .join("");

  return new RegExp(`^${source}$`);
}

function getPatternMinimumLength(pattern) {
  return pattern.replaceAll("*", "").length;
}

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
  breakdownCharts.replaceChildren();
  breakdownState = null;
  wordBreakdown.hidden = true;
  setEmptyState("Your words will appear here", "Enter your letters and click Unscramble.");
  emptyState.hidden = false;
  matchCount.hidden = true;
}

function createWordItem(word, options) {
  const item = document.createElement("li");
  const content = document.createElement("div");
  const wordLookup = document.createElement("div");
  const wordLabel = document.createElement("button");
  const linkMeta = document.createElement("span");
  const score = document.createElement("span");
  const dictionaryLinks = document.createElement("div");
  const dictionaryPopoverTitle = document.createElement("span");
  const points = getScrabbleScore(word);
  const highValueLetters = getHighValueLetters(word);

  item.className = "word-card";
  content.className = "word-card-content";
  wordLookup.className = "word-lookup";

  wordLabel.className = "word-label";
  wordLabel.type = "button";
  wordLabel.textContent = word;
  wordLabel.title = `Show dictionary links for ${word}`;
  wordLabel.setAttribute("aria-haspopup", "dialog");

  linkMeta.className = "word-link-meta";

  score.className = "scrabble-score";
  score.textContent = `${points} pts`;
  linkMeta.append(score);

  if (word.length === 7) {
    const bingoBadge = document.createElement("span");
    bingoBadge.className = "result-badge result-badge--bingo";
    bingoBadge.textContent = "Bingo +50";
    linkMeta.append(bingoBadge);
  }

  if (highValueLetters) {
    const highValueBadge = document.createElement("span");
    highValueBadge.className = "result-badge result-badge--high-value";
    highValueBadge.textContent = highValueLetters.toUpperCase();
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
    linkMeta.append(hookBadge);
  }

  dictionaryLinks.className = "dictionary-popover";
  dictionaryLinks.setAttribute("role", "dialog");
  dictionaryLinks.setAttribute("aria-label", `Dictionary links for ${word}`);
  dictionaryPopoverTitle.className = "dictionary-popover-title";
  dictionaryPopoverTitle.textContent = `Look up ${word}`;
  dictionaryLinks.append(dictionaryPopoverTitle);

  const dictionaryLinkRow = document.createElement("div");
  dictionaryLinkRow.className = "dictionary-links";

  DICTIONARY_LINKS.forEach((dictionary, index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.className = "dictionary-link-separator";
      separator.setAttribute("aria-hidden", "true");
      separator.textContent = "–";
      dictionaryLinkRow.append(separator);
    }

    const dictionaryLink = document.createElement("a");
    const hoverText = `Look up ${word} on ${dictionary.name}`;
    dictionaryLink.href = dictionary.getUrl(word);
    dictionaryLink.target = "_blank";
    dictionaryLink.rel = "noopener noreferrer";
    dictionaryLink.textContent = dictionary.abbreviation;
    dictionaryLink.title = hoverText;
    dictionaryLink.setAttribute("aria-label", hoverText);
    dictionaryLinkRow.append(dictionaryLink);
  });

  dictionaryLinks.append(dictionaryLinkRow);

  const hookLookup = document.createElement("details");
  const hookLookupSummary = document.createElement("summary");
  const hookLookupResult = document.createElement("div");
  let hookLookupLoaded = false;
  let hookLookupLoading = false;

  hookLookup.className = "hook-lookup";
  hookLookupSummary.className = "hook-lookup-summary";
  hookLookupSummary.textContent = "Hook Lookup";
  hookLookupResult.className = "hook-lookup-result";
  hookLookupResult.setAttribute("aria-live", "polite");
  hookLookup.append(hookLookupSummary, hookLookupResult);

  hookLookup.addEventListener("toggle", async () => {
    if (!hookLookup.open || hookLookupLoaded || hookLookupLoading) {
      return;
    }

    hookLookupLoading = true;
    hookLookupResult.className = "hook-lookup-result is-loading";
    hookLookupResult.textContent = "Loading hooks…";

    try {
      await loadAllChunks();
      const hooks = getHookInfo(word, options.dictionaryBit);
      const formatHookWord = (hookWord) =>
        `${hookWord.toUpperCase()} (+${getScrabbleScore(hookWord)})`;
      const frontHooks = hooks.front.map((letter) => formatHookWord(`${letter}${word}`));
      const backHooks = hooks.back.map((letter) => formatHookWord(`${word}${letter}`));

      hookLookupResult.className = "hook-lookup-result";
      hookLookupResult.replaceChildren();

      const frontRow = document.createElement("p");
      const frontLabel = document.createElement("strong");
      frontLabel.textContent = "Front: ";
      frontRow.append(frontLabel, frontHooks.join(", ") || "None");

      const backRow = document.createElement("p");
      const backLabel = document.createElement("strong");
      backLabel.textContent = "Back: ";
      backRow.append(backLabel, backHooks.join(", ") || "None");

      hookLookupResult.append(frontRow, backRow);
      hookLookupLoaded = true;
    } catch (error) {
      console.error(`Unable to load hooks for ${word}:`, error);
      hookLookupResult.className = "hook-lookup-result is-error";
      hookLookupResult.textContent = "Unable to load hooks. Collapse and try again.";
    } finally {
      hookLookupLoading = false;
    }
  });

  dictionaryLinks.append(hookLookup);
  wordLookup.append(wordLabel, dictionaryLinks);
  content.append(wordLookup, linkMeta);
  item.append(content);
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
  breakdownState = { letters, matches: [...matches], options };
  wordBreakdown.hidden = false;

  if (wordBreakdown.open) {
    renderWordBreakdown();
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createBreakdownCard(title, description) {
  const card = document.createElement("section");
  const heading = document.createElement("h4");
  const copy = document.createElement("p");

  card.className = "breakdown-card";
  heading.textContent = title;
  copy.className = "breakdown-card-description";
  copy.textContent = description;
  card.append(heading, copy);
  return card;
}

function createLegendRow(label, value, color) {
  const row = document.createElement("div");
  const dot = document.createElement("span");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");

  row.className = "legend-row";
  dot.className = "legend-dot";
  dot.style.setProperty("--legend-color", color);
  labelElement.textContent = label;
  valueElement.textContent = value;
  row.append(dot, labelElement, valueElement);
  return row;
}

function createMetricBarRow(label, value, maximum, displayValue, color = "#60a5fa") {
  const row = document.createElement("div");
  const labelElement = document.createElement("span");
  const track = document.createElement("div");
  const fill = document.createElement("div");
  const valueElement = document.createElement("span");
  const width = maximum > 0 ? clamp((value / maximum) * 100, value > 0 ? 2 : 0, 100) : 0;

  row.className = "metric-bar-row";
  labelElement.textContent = label;
  track.className = "metric-bar-track";
  fill.className = "metric-bar-fill";
  fill.style.width = `${width}%`;
  fill.style.setProperty("--bar-color", color);
  valueElement.className = "metric-bar-value";
  valueElement.textContent = displayValue;
  track.append(fill);
  row.append(labelElement, track, valueElement);
  return row;
}

function createMetricTile(value, label) {
  const tile = document.createElement("div");
  const valueElement = document.createElement("strong");
  const labelElement = document.createElement("span");

  tile.className = "metric-tile";
  valueElement.textContent = value;
  labelElement.textContent = label;
  tile.append(valueElement, labelElement);
  return tile;
}

function createVowelBalanceChart(letters) {
  const card = createBreakdownCard(
    "Vowel/Consonant Ratio",
    "Shows the balance of playable letters in the entered rack."
  );
  const vowels = getVowelCount(letters);
  const wildcards = [...letters].filter((letter) => letter === "?").length;
  const consonants = letters.length - vowels - wildcards;
  const vowelPercentage = Math.round((vowels / letters.length) * 100);
  const consonantPercentage = Math.round((consonants / letters.length) * 100);
  const layout = document.createElement("div");
  const donut = document.createElement("div");
  const legend = document.createElement("div");
  const ratio = document.createElement("div");

  layout.className = "donut-layout";
  donut.className = "chart-donut";
  donut.style.background =
    `conic-gradient(#38bdf8 0 ${vowelPercentage}%, ` +
    `#a78bfa ${vowelPercentage}% ${vowelPercentage + consonantPercentage}%, ` +
    `#f59e0b ${vowelPercentage + consonantPercentage}% 100%)`;
  donut.setAttribute("role", "img");
  donut.setAttribute(
    "aria-label",
    `${vowels} vowels, ${consonants} consonants, and ${wildcards} unknown positions; ` +
    `ratio ${vowels} to ${consonants}`
  );
  legend.className = "chart-legend";
  legend.append(
    createLegendRow("Vowels", String(vowels), "#38bdf8"),
    createLegendRow("Consonants", String(consonants), "#a78bfa")
  );

  if (wildcards > 0) {
    legend.append(createLegendRow("Unknown", String(wildcards), "#f59e0b"));
  }
  ratio.className = "chart-ratio";
  ratio.textContent = `Ratio ${vowels}:${consonants}`;
  legend.append(ratio);
  layout.append(donut, legend);
  card.append(layout);
  return card;
}

function createTileValueChart(letters) {
  const card = createBreakdownCard(
    "Tile Value Distribution",
    "Counts rack tiles by standard English Scrabble point value; unknown positions appear at 0."
  );
  const pointValues = [0, 1, 2, 3, 4, 5, 8, 10];
  const counts = new Map(pointValues.map((points) => [points, 0]));
  const histogram = document.createElement("div");
  const total = document.createElement("div");

  for (const letter of letters) {
    const points = SCRABBLE_VALUES[letter] ?? 0;
    counts.set(points, counts.get(points) + 1);
  }

  const maximumCount = Math.max(1, ...counts.values());
  histogram.className = "tile-histogram";
  histogram.setAttribute("role", "img");
  histogram.setAttribute(
    "aria-label",
    pointValues.map((points) => `${counts.get(points)} tiles worth ${points} points`).join(", ")
  );

  pointValues.forEach((points) => {
    const column = document.createElement("div");
    const track = document.createElement("div");
    const fill = document.createElement("div");
    const count = document.createElement("strong");
    const label = document.createElement("span");

    column.className = "tile-column";
    track.className = "tile-column-track";
    fill.className = "tile-column-fill";
    fill.style.height = `${(counts.get(points) / maximumCount) * 100}%`;
    count.textContent = String(counts.get(points));
    label.textContent = `${points} pt`;
    track.append(fill);
    column.append(track, count, label);
    histogram.append(column);
  });

  total.className = "chart-total";
  total.textContent = `Total rack value: ${getScrabbleScore(letters)} points`;
  card.append(histogram, total);
  return card;
}

function getLeaveLetters(letters, word) {
  const remaining = [...letters];

  for (const letter of word) {
    let index = remaining.indexOf(letter);

    if (index === -1) {
      index = remaining.indexOf("?");
    }

    if (index !== -1) {
      remaining.splice(index, 1);
    }
  }

  return remaining;
}

function getLeaveQuality(leave) {
  if (leave.length === 0) {
    return 50;
  }

  const counts = new Uint8Array(26);
  const vowels = leave.filter((letter) => VOWELS.includes(letter)).length;
  const wildcards = leave.filter((letter) => letter === "?").length;
  const consonants = leave.length - vowels - wildcards;
  let score = 50 - Math.abs(vowels - consonants) * 6;

  leave.forEach((letter) => {
    if (letter === "?") {
      score += 12;
      return;
    }

    counts[letter.charCodeAt(0) - 97] += 1;
    score += "aeinrstl".includes(letter) ? 3 : 0;
    score -= HIGH_VALUE_LETTERS.includes(letter) ? 5 : 0;
  });

  counts.forEach((count) => {
    score -= Math.max(0, count - 2) * 5;
  });

  if (leave.includes("q") && !leave.includes("u")) {
    score -= 20;
  }

  score += (new Set(leave).size / leave.length) * 12;
  return Math.round(clamp(score, 0, 100));
}

function createLeaveValueChart(letters, matches) {
  const card = createBreakdownCard(
    "Leave Value",
    "A 0–100 heuristic for the tiles kept after each result; balance, flexibility, duplicates, and difficult tiles affect the estimate."
  );
  const leaves = matches.map((word) => ({
    word,
    value: getLeaveQuality(getLeaveLetters(letters, word))
  }));
  const average = Math.round(
    leaves.reduce((sum, leave) => sum + leave.value, 0) / leaves.length
  );
  const best = leaves.reduce((current, leave) =>
    leave.value > current.value ? leave : current
  );
  const worst = leaves.reduce((current, leave) =>
    leave.value < current.value ? leave : current
  );
  const bars = document.createElement("div");

  bars.className = "metric-bars";
  bars.append(
    createMetricBarRow("Average leave", average, 100, `${average}/100`, "#60a5fa"),
    createMetricBarRow("Best leave", best.value, 100, `${best.value}/100`, "#22c55e"),
    createMetricBarRow("Worst leave", worst.value, 100, `${worst.value}/100`, "#f97316")
  );
  bars.setAttribute(
    "aria-label",
    `Average leave ${average}; best ${best.value} after ${best.word}; worst ${worst.value} after ${worst.word}`
  );
  card.append(bars);
  return card;
}

function createBingoChart(matches) {
  const card = createBreakdownCard(
    "Bingo Opportunity",
    "An opportunity estimate derived from matching 7- and 8-letter words; it is not a tile-bag probability."
  );
  const sevenLetterWords = matches.filter((word) => word.length === 7).length;
  const eightLetterWords = matches.filter((word) => word.length === 8).length;
  const weightedCount = sevenLetterWords + eightLetterWords * 1.5;
  const opportunityScore = Math.round(
    clamp(Math.log2(weightedCount + 1) * 18, 0, 100)
  );
  const metrics = document.createElement("div");
  const gauge = document.createElement("div");
  const gaugeFill = document.createElement("div");
  const gaugeLabel = document.createElement("div");

  metrics.className = "metric-grid";
  metrics.append(
    createMetricTile(String(sevenLetterWords), "7-letter words"),
    createMetricTile(String(eightLetterWords), "8-letter words"),
    createMetricTile(String(sevenLetterWords + eightLetterWords), "Bingo-length")
  );
  gauge.className = "chart-gauge";
  gaugeFill.className = "chart-gauge-fill";
  gaugeFill.style.width = `${opportunityScore}%`;
  gauge.append(gaugeFill);
  gaugeLabel.className = "chart-gauge-label";
  gaugeLabel.textContent = `Opportunity estimate: ${opportunityScore}/100`;
  card.append(metrics, gauge, gaugeLabel);
  return card;
}

function createPatternHeatmap(matches) {
  const card = createBreakdownCard(
    "Word Pattern Heatmap",
    "Vowel frequency by position across current matches; blue is vowel-heavy and purple is consonant-heavy."
  );
  const heatmap = document.createElement("div");

  heatmap.className = "pattern-heatmap";

  for (let index = 0; index < 7; index += 1) {
    const positionLetters = matches
      .filter((word) => word.length > index)
      .map((word) => word[index]);
    const cell = document.createElement("div");
    const position = document.createElement("strong");
    const percentage = document.createElement("span");

    cell.className = "heat-cell";
    position.textContent = `P${index + 1}`;

    if (positionLetters.length === 0) {
      percentage.textContent = "No data";
      cell.setAttribute("aria-disabled", "true");
      cell.setAttribute("aria-label", `Position ${index + 1}, no matching words`);
    } else {
      const vowelCount = positionLetters.filter((letter) => VOWELS.includes(letter)).length;
      const vowelPercentage = Math.round((vowelCount / positionLetters.length) * 100);

      percentage.textContent = `${vowelPercentage}% V`;
      cell.style.background =
        `linear-gradient(to top, rgba(56, 189, 248, 0.78) 0 ${vowelPercentage}%, ` +
        `rgba(139, 92, 246, 0.72) ${vowelPercentage}% 100%)`;
      cell.setAttribute(
        "aria-label",
        `Position ${index + 1}, ${vowelPercentage}% vowels and ${100 - vowelPercentage}% consonants`
      );
    }

    cell.append(position, percentage);
    heatmap.append(cell);
  }

  card.append(heatmap);
  return card;
}

function createDistributionChart(title, description, entries, color) {
  const card = createBreakdownCard(title, description);
  const histogram = document.createElement("div");
  const maximumCount = Math.max(1, ...entries.map((entry) => entry.count));

  histogram.className = "distribution-histogram";
  histogram.setAttribute("role", "img");
  histogram.setAttribute(
    "aria-label",
    entries.map((entry) => `${entry.ariaLabel}: ${entry.count} words`).join(", ")
  );

  entries.forEach((entry) => {
    const column = document.createElement("div");
    const track = document.createElement("div");
    const fill = document.createElement("div");
    const count = document.createElement("strong");
    const label = document.createElement("span");

    column.className = "distribution-column";
    track.className = "distribution-column-track";
    fill.className = "distribution-column-fill";
    fill.style.height = `${(entry.count / maximumCount) * 100}%`;
    fill.style.setProperty("--distribution-color", color);
    count.textContent = String(entry.count);
    label.textContent = entry.label;
    track.append(fill);
    column.append(track, count, label);
    histogram.append(column);
  });

  card.append(histogram);
  return card;
}

function createWordLengthDistributionChart(matches) {
  const counts = new Map();

  matches.forEach((word) => {
    counts.set(word.length, (counts.get(word.length) ?? 0) + 1);
  });

  const entries = [...counts.entries()]
    .sort(([firstLength], [secondLength]) => firstLength - secondLength)
    .map(([length, count]) => ({
      label: `${length}L`,
      ariaLabel: `${length}-letter words`,
      count
    }));

  return createDistributionChart(
    "Word Length Distribution",
    "Shows how current matches are distributed by number of letters.",
    entries,
    "linear-gradient(180deg, #34d399, #059669)"
  );
}

function createScoreDistributionChart(matches) {
  const scores = matches.map(getScrabbleScore);
  const minimumScore = scores.reduce((minimum, score) => Math.min(minimum, score), Infinity);
  const maximumScore = scores.reduce((maximum, score) => Math.max(maximum, score), 0);
  const bucketSize = maximumScore <= 30 ? 5 : maximumScore <= 80 ? 10 : 25;
  const firstBucket = Math.floor(minimumScore / bucketSize) * bucketSize;
  const bucketCounts = new Map();

  for (let start = firstBucket; start <= maximumScore; start += bucketSize) {
    bucketCounts.set(start, 0);
  }

  scores.forEach((score) => {
    const bucket = Math.floor(score / bucketSize) * bucketSize;
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  });

  const entries = [...bucketCounts.entries()].map(([start, count]) => {
    const end = start + bucketSize - 1;

    return {
      label: `${start}–${end}`,
      ariaLabel: `${start} through ${end} points`,
      count
    };
  });

  return createDistributionChart(
    "Score Distribution",
    "Groups current matches by standard English Scrabble tile score.",
    entries,
    "linear-gradient(180deg, #fbbf24, #d97706)"
  );
}

function createPremiumPotentialChart(letters, matches) {
  const card = createBreakdownCard(
    "Premium Square Potential",
    "Theoretical multiplier potential only; exact premium hits require board-square positions."
  );
  const highValueCandidates = matches.filter((word) => getHighValueLetters(word)).length;
  const highestTileValue = Math.max(
    ...[...letters].map((letter) => SCRABBLE_VALUES[letter] ?? 0)
  );
  const averageWordScore = Math.round(
    matches.reduce((sum, word) => sum + getScrabbleScore(word), 0) / matches.length
  );
  const highestWordScore = matches.reduce(
    (highest, word) => Math.max(highest, getScrabbleScore(word)),
    0
  );
  const bars = document.createElement("div");

  bars.className = "metric-bars";
  bars.append(
    createMetricBarRow(
      "High-value plays",
      highValueCandidates,
      matches.length,
      String(highValueCandidates),
      "#c084fc"
    ),
    createMetricBarRow(
      "Best TL boost",
      highestTileValue * 2,
      20,
      `+${highestTileValue * 2}`,
      "#f59e0b"
    ),
    createMetricBarRow(
      "Est. DW boost",
      averageWordScore,
      highestWordScore,
      `+${averageWordScore}`,
      "#ef4444"
    )
  );
  card.append(bars);
  return card;
}

function getBoardFitAnalysis(letters, options) {
  const availableCounts = new Uint8Array(26);
  const wildcardCount = [...letters].filter((letter) => letter === "?").length;
  const patternExpression = createPatternExpression(options.pattern);
  let candidates = 0;
  let fitting = 0;

  for (const letter of letters) {
    if (letter === "?") {
      continue;
    }

    availableCounts[letter.charCodeAt(0) - 97] += 1;
  }

  for (let length = MIN_WORD_LENGTH; length <= letters.length; length += 1) {
    const signatures = signaturesByLength.get(length) ?? [];

    signatures.forEach((signature) => {
      if (!canBuildFromLetters(signature, availableCounts, wildcardCount)) {
        return;
      }

      signatureMap.get(signature).forEach((word) => {
        const membership = wordMembership.get(word) ?? 0;

        if ((membership & options.dictionaryBit) === 0) {
          return;
        }

        candidates += 1;

        if (options.wordLength && word.length !== options.wordLength) {
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

        fitting += 1;
      });
    });
  }

  return { candidates, fitting, excluded: candidates - fitting };
}

function createBoardFitChart(letters, options) {
  const card = createBreakdownCard(
    "Board Fit Analysis",
    "Compares rack-buildable words with words fitting the active length, pattern, start, and end constraints."
  );
  const analysis = getBoardFitAnalysis(letters, options);
  const fitPercentage = analysis.candidates > 0
    ? Math.round((analysis.fitting / analysis.candidates) * 100)
    : 0;
  const layout = document.createElement("div");
  const donut = document.createElement("div");
  const legend = document.createElement("div");

  layout.className = "donut-layout";
  donut.className = "chart-donut";
  donut.style.background =
    `conic-gradient(#22c55e 0 ${fitPercentage}%, #ef4444 ${fitPercentage}% 100%)`;
  donut.setAttribute("role", "img");
  donut.setAttribute(
    "aria-label",
    `${analysis.fitting} words fit current board constraints and ${analysis.excluded} do not`
  );
  legend.className = "chart-legend";
  legend.append(
    createLegendRow("Fits constraints", String(analysis.fitting), "#22c55e"),
    createLegendRow("Does not fit", String(analysis.excluded), "#ef4444")
  );
  layout.append(donut, legend);
  card.append(layout);
  return card;
}

function createEntropyChart(letters) {
  const card = createBreakdownCard(
    "Rack Entropy",
    "A normalized Shannon-entropy score for letter variety; repeated letters reduce flexibility."
  );
  const counts = new Map();

  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  const entropy = [...counts.values()].reduce((sum, count) => {
    const probability = count / letters.length;
    return sum - probability * Math.log2(probability);
  }, 0);
  const maximumEntropy = letters.length > 1 ? Math.log2(Math.min(26, letters.length)) : 1;
  const wildcardBonus = letters.includes("?") ? 8 : 0;
  const entropyScore = Math.round(
    clamp((entropy / maximumEntropy) * 100 + wildcardBonus, 0, 100)
  );
  const rating = entropyScore >= 75
    ? "High flexibility"
    : entropyScore >= 45
      ? "Moderate flexibility"
      : "Low flexibility";
  const scoreRow = document.createElement("div");
  const score = document.createElement("strong");
  const ratingElement = document.createElement("span");
  const gauge = document.createElement("div");
  const gaugeFill = document.createElement("div");

  scoreRow.className = "entropy-score";
  score.textContent = `${entropyScore}/100`;
  ratingElement.textContent = rating;
  scoreRow.append(score, ratingElement);
  gauge.className = "chart-gauge";
  gaugeFill.className = "chart-gauge-fill";
  gaugeFill.style.width = `${entropyScore}%`;
  gauge.append(gaugeFill);
  card.append(scoreRow, gauge);
  return card;
}

function renderWordBreakdown() {
  breakdownCharts.replaceChildren();

  if (!wordBreakdown.open || !breakdownState || breakdownState.matches.length === 0) {
    return;
  }

  const { letters, matches, options } = breakdownState;
  const fragment = document.createDocumentFragment();
  const primaryCharts = document.createElement("div");
  const patternCharts = document.createElement("div");
  const distributionCharts = document.createElement("div");
  const estimateSeparator = document.createElement("div");
  const estimateDisclaimer = document.createElement("p");
  const estimateCharts = document.createElement("div");

  primaryCharts.className = "breakdown-grid breakdown-grid--primary";
  primaryCharts.append(
    createVowelBalanceChart(letters),
    createTileValueChart(letters),
    createEntropyChart(letters)
  );
  patternCharts.className = "breakdown-grid breakdown-grid--pattern";
  patternCharts.append(createPatternHeatmap(matches));
  distributionCharts.className = "breakdown-grid breakdown-grid--distributions";
  distributionCharts.append(
    createWordLengthDistributionChart(matches),
    createScoreDistributionChart(matches)
  );
  estimateSeparator.className = "breakdown-estimate-separator";
  estimateSeparator.setAttribute("role", "note");
  estimateDisclaimer.textContent =
    "Board-fit, premium-square, leave-value, and bingo figures are estimates because no board grid or tile-bag state is provided.";
  estimateSeparator.append(estimateDisclaimer);
  estimateCharts.className = "breakdown-grid breakdown-grid--estimates";
  estimateCharts.append(
    createBoardFitChart(letters, options),
    createPremiumPotentialChart(letters, matches),
    createLeaveValueChart(letters, matches),
    createBingoChart(matches)
  );
  fragment.append(
    primaryCharts,
    patternCharts,
    distributionCharts,
    estimateSeparator,
    estimateCharts
  );
  breakdownCharts.append(fragment);
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

function canBuildFromLetters(signature, availableCounts, wildcardCount = 0) {
  let currentIndex = -1;
  let usedCount = 0;
  let missingCount = 0;

  for (const letter of signature) {
    const index = letter.charCodeAt(0) - 97;

    if (index === currentIndex) {
      usedCount += 1;
    } else {
      currentIndex = index;
      usedCount = 1;
    }

    if (usedCount > availableCounts[index]) {
      missingCount += 1;
    }

    if (missingCount > wildcardCount) {
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
    case "none":
      return hooks.total === 0;
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
  if (!pattern || !word.length) {
    return 0;
  }

  const literalCount = [...pattern]
    .filter((character) => character !== "?" && character !== "*")
    .length;

  return literalCount / word.length;
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
  const wildcardCount = [...letters].filter((letter) => letter === "?").length;
  const patternExpression = createPatternExpression(options.pattern);
  const patternHasVariableLength = options.pattern.includes("*");
  const patternMinimumLength = getPatternMinimumLength(options.pattern);

  for (const letter of letters) {
    if (letter === "?") {
      continue;
    }

    availableCounts[letter.charCodeAt(0) - 97] += 1;
  }

  const matches = [];
  const maximumLength = options.wordLength || letters.length;
  const minimumLength = options.wordLength || MIN_WORD_LENGTH;

  if (maximumLength > letters.length) {
    return matches;
  }

  if (
    patternExpression &&
    options.wordLength &&
    (
      options.wordLength < patternMinimumLength ||
      (!patternHasVariableLength && options.pattern.length !== options.wordLength)
    )
  ) {
    return matches;
  }

  for (let length = maximumLength; length >= minimumLength; length -= 1) {
    if (
      patternExpression &&
      (length < patternMinimumLength || (!patternHasVariableLength && options.pattern.length !== length))
    ) {
      continue;
    }

    const signatures = signaturesByLength.get(length) ?? [];

    signatures.forEach((signature) => {
      if (canBuildFromLetters(signature, availableCounts, wildcardCount)) {
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

  const { rack: letters, pattern } = parseSmartInput(input.value);
  const startsWith = startsWithInput.value.trim().toLowerCase();
  const endsWith = endsWithInput.value.trim().toLowerCase();
  const mustInclude = mustIncludeInput.value.trim().toLowerCase();
  const excludeLetters = excludeLettersInput.value.trim().toLowerCase();
  const dictionary = [...dictionaryInputs].find((option) => option.checked)?.value ?? "both";
  const wordLength = Number(wordLengthInput.value);
  const minimumVowels = Number(minimumVowelsInput.value);
  const minimumConsonants = Number(minimumConsonantsInput.value);
  const minimumScore = minimumScoreInput.value === ""
    ? null
    : Number.parseInt(minimumScoreInput.value, 10);
  const maximumScore = maximumScoreInput.value === ""
    ? null
    : Number.parseInt(maximumScoreInput.value, 10);
  const hookFilter = [...hookFilterInputs].find((option) => option.checked)?.value ?? "";
  const sortBy = sortResultsInput.value;
  startsWithInput.value = startsWith;
  endsWithInput.value = endsWith;
  mustIncludeInput.value = mustInclude;
  excludeLettersInput.value = excludeLetters;

  if (!letters) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Enter some letters", "Add scrambled letters to search the dictionary.");
    showMessage("Please enter at least one letter.");
    input.focus();
    return;
  }

  if (startsWith && !/^[a-z]+$/.test(startsWith)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check starting letters", "Use letters only in Starts With.");
    showMessage("Starts With accepts letters only.");
    focusFilterInput(startsWithInput);
    return;
  }

  if (endsWith && !/^[a-z]+$/.test(endsWith)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check ending letters", "Use letters only in Ends With.");
    showMessage("Ends With accepts letters only.");
    focusFilterInput(endsWithInput);
    return;
  }

  if (mustInclude && !/^[a-z]+$/.test(mustInclude)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check required letters", "Use letters only in Must Include Letter(s).");
    showMessage("Must Include Letter(s) accepts letters only.");
    focusFilterInput(mustIncludeInput);
    return;
  }

  if (excludeLetters && !/^[a-z]+$/.test(excludeLetters)) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check excluded letters", "Use letters only in Exclude Letters.");
    showMessage("Exclude Letters accepts letters only.");
    focusFilterInput(excludeLettersInput);
    return;
  }

  if (letters.length > 30 || pattern.length > 30) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Input is too long", "Use no more than 30 rack positions and 30 pattern characters.");
    showMessage("Rack letters and the inline pattern can each contain up to 30 characters.");
    input.focus();
    return;
  }

  if (!Number.isInteger(wordLength) || wordLength < 0 || wordLength > 30) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check word length", "Use a whole number from 0 through 30.");
    showMessage("Word Length must be a whole number from 0 through 30.");
    focusFilterInput(wordLengthInput);
    return;
  }

  if (
    !Number.isInteger(minimumVowels) ||
    minimumVowels < 0 ||
    minimumVowels > 30 ||
    !Number.isInteger(minimumConsonants) ||
    minimumConsonants < 0 ||
    minimumConsonants > 30
  ) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check letter minimums", "Use whole numbers from 0 through 30.");
    showMessage("Minimum Vowels and Minimum Consonants must be whole numbers from 0 through 30.");

    if (!Number.isInteger(minimumVowels) || minimumVowels < 0 || minimumVowels > 30) {
      focusFilterInput(minimumVowelsInput);
    } else {
      focusFilterInput(minimumConsonantsInput);
    }

    return;
  }

  if (
    (minimumScore !== null && (!Number.isInteger(minimumScore) || minimumScore < 0)) ||
    (maximumScore !== null && (!Number.isInteger(maximumScore) || maximumScore < 0))
  ) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check score filters", "Enter whole-number Scrabble scores of zero or more.");
    showMessage("Score filters must be whole numbers of zero or more.");
    focusFilterInput(minimumScoreInput);
    return;
  }

  if (minimumScore !== null && maximumScore !== null && minimumScore > maximumScore) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Check score range", "Minimum Score cannot exceed Maximum Score.");
    showMessage("Minimum Score cannot be greater than Maximum Score.");
    focusFilterInput(minimumScoreInput);
    return;
  }

  if (sortBy === "pattern-strength" && !pattern) {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState("Add a pattern", "Pattern Match Strength sorting needs an inline pattern after /.");
    showMessage("Add an inline pattern after / before sorting by Pattern Match Strength.");
    input.focus();
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
    if (letters.includes("?")) {
      buttonLabel.textContent = "Loading wildcards…";
      await loadAllChunks();
    } else {
      await loadRelevantChunks(letters);
    }

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
wordBreakdown.addEventListener("toggle", () => {
  if (wordBreakdown.open) {
    renderWordBreakdown();
  } else {
    breakdownCharts.replaceChildren();
  }
});
form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey) || button.disabled) {
    return;
  }

  event.preventDefault();
  form.requestSubmit(button);
});
document.addEventListener("keydown", (event) => {
  if (
    event.repeat ||
    event.key.toLowerCase() !== "b" ||
    (!event.ctrlKey && !event.metaKey) ||
    wordBreakdown.hidden
  ) {
    return;
  }

  event.preventDefault();
  const wasOpen = wordBreakdown.open;
  wordBreakdown.open = true;

  if (wasOpen) {
    renderWordBreakdown();
  }

  requestAnimationFrame(() => {
    breakdownSummary.focus({ preventScroll: true });
    wordBreakdown.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
function resetAllFilters() {
  wordLengthInput.value = "0";
  startsWithInput.value = "";
  endsWithInput.value = "";
  mustIncludeInput.value = "";
  excludeLettersInput.value = "";
  highValueOnlyInput.checked = false;
  minimumVowelsInput.value = "0";
  minimumConsonantsInput.value = "0";
  minimumScoreInput.value = "";
  maximumScoreInput.value = "";
  hookFilterInputs.forEach((option) => {
    option.checked = option.value === "";
  });
  sortResultsInput.value = "length-desc";
  syncSortPicker();
  clearMessage();
}

document.addEventListener("keydown", (event) => {
  if (
    event.repeat ||
    event.key.toLowerCase() !== "r" ||
    !event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return;
  }

  event.preventDefault();
  resetAllFilters();
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
});
resetAllFiltersButton.addEventListener("click", resetAllFilters);
window.addEventListener("DOMContentLoaded", loadManifest, { once: true });
