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
const resetAllButton = document.querySelector("#reset-all-filters");
const resetBasicFiltersButton = document.querySelector("#reset-basic-filters");
const resetAdvancedFiltersButton = document.querySelector("#reset-advanced-filters");
const resetConfirmBackdrop = document.querySelector("#reset-confirm-backdrop");
const resetConfirmModal = document.querySelector("#reset-confirm-modal");
const resetConfirmCancel = document.querySelector("#reset-confirm-cancel");
const resetConfirmOk = document.querySelector("#reset-confirm-ok");
const rackTiles = document.querySelector("#rack-tiles");
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
const historyDropdown = document.querySelector("#history-dropdown");
const historyMobileTrigger = document.querySelector("#history-mobile-trigger");
const historyPanel = document.querySelector("#history-panel");
const historyPanelSummary = historyPanel.querySelector("summary");
const historyCount = document.querySelector("#history-count");
const historyPinnedOnly = document.querySelector("#history-pinned-only");
const historySort = document.querySelector("#history-sort");
const historyClear = document.querySelector("#history-clear");
const historyEmpty = document.querySelector("#history-empty");
const historyViewport = document.querySelector("#history-viewport");
const historyVirtualList = document.querySelector("#history-virtual-list");
const historyModalBackdrop = document.querySelector("#history-modal-backdrop");
const historyModal = document.querySelector("#history-modal");
const historyModalClose = document.querySelector("#history-modal-close");
const historyModalEmpty = document.querySelector("#history-modal-empty");
const historyModalList = document.querySelector("#history-modal-list");
const pickListPanel = document.querySelector("#pick-list-panel");
const pickListCount = document.querySelector("#pick-list-count");
const pickListClear = document.querySelector("#pick-list-clear");
const pickListSort = document.querySelector("#pick-list-sort");
const pickListEmpty = document.querySelector("#pick-list-empty");
const pickListViewport = document.querySelector("#pick-list-viewport");
const pickListVirtualList = document.querySelector("#pick-list-virtual-list");
const HistoryStore = window.MonkeyTacticsHistory;
const PickListStore = window.MonkeyTacticsPickList;
const InputRules = window.MonkeyTacticsWordInputRules;
const Engine = window.MonkeyTacticsWasm;
const IS_WWF = document.body.dataset.wordGame === "wwf";
const GAME_NAME = IS_WWF ? "Words With Friends Solver" : "Word Unscrambler";
const analyzeWord = (word) => IS_WWF ? Engine.analyzeWwfWord(word) : Engine.analyzeWord(word);

const MANIFEST_URL =
  "../assets/data/words/manifest.enable-sowpods-v2.json?v=enable-sowpods-v2";
const CHUNK_BASE_URL = "../assets/data/words/";
const VOWELS = "aeiou";
const HIGH_VALUE_LETTERS = "jqxz";
const SCRABBLE_TILE_VALUES = Object.freeze({
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
  n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
});
const WWF_TILE_VALUES = Object.freeze({
  a: 1, b: 4, c: 4, d: 2, e: 1, f: 4, g: 3, h: 3, i: 1, j: 10, k: 5, l: 2, m: 4,
  n: 2, o: 1, p: 4, q: 10, r: 1, s: 1, t: 1, u: 2, v: 5, w: 4, x: 8, y: 3, z: 10
});
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
  "score-desc": `Words sorted by ${IS_WWF ? "Words With Friends" : "Scrabble"} score`,
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
// Loaded chunks are indexed once and retained for subsequent searches.
const loadedChunks = new Set();
const chunkPromises = new Map();
const dictionaryPopoverPositioners = new WeakMap();
let manifest = null;
let breakdownState = null;
let historyEntries = HistoryStore.read();
let historyDropdownIndex = -1;
let historyPanelFocusIndex = -1;
let historyModalIndex = -1;
let historyModalReturnFocus = null;
let historySwipeStartY = null;
let pendingHistorySearch = false;
let pickListEntries = PickListStore.read();
let pickListHookCache = new Map();
let pickListHookRefreshQueued = false;
let resetConfirmReturnFocus = null;

input.style.zIndex = "3";
input.style.background = "transparent";
input.style.color = "transparent";
input.style.webkitTextFillColor = "transparent";
input.style.textShadow = "0 0 0 transparent";
input.style.caretColor = "#22c55e";

const getScrabbleScore = (word) => IS_WWF ? Engine.scoreWwfWord(word) : Engine.scoreWord(word);

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
  return InputRules.parseSmartInput(value);
}

function formatSmartInput(rack, pattern) {
  return pattern ? `${rack.toUpperCase()} / ${pattern.toUpperCase()}` : rack.toUpperCase();
}

function getCurrentFilters() {
  return {
    wordLength: wordLengthInput.value,
    startsWith: startsWithInput.value,
    endsWith: endsWithInput.value,
    mustInclude: mustIncludeInput.value,
    excludeLetters: excludeLettersInput.value,
    highValueOnly: highValueOnlyInput.checked,
    minimumVowels: minimumVowelsInput.value,
    minimumConsonants: minimumConsonantsInput.value,
    minimumScore: minimumScoreInput.value,
    maximumScore: maximumScoreInput.value,
    hookFilter: [...hookFilterInputs].find((option) => option.checked)?.value ?? ""
  };
}

function hasBasicFilters() {
  return (wordLengthInput.value !== "" && wordLengthInput.value !== "0")
    || startsWithInput.value.trim() !== ""
    || endsWithInput.value.trim() !== ""
    || mustIncludeInput.value.trim() !== ""
    || excludeLettersInput.value.trim() !== "";
}

function hasAdvancedFilters() {
  return highValueOnlyInput.checked
    || (minimumVowelsInput.value !== "" && minimumVowelsInput.value !== "0")
    || (minimumConsonantsInput.value !== "" && minimumConsonantsInput.value !== "0")
    || minimumScoreInput.value !== ""
    || maximumScoreInput.value !== ""
    || [...hookFilterInputs].some((option) => option.checked && option.value !== "");
}

function syncSectionFilterResetButtons() {
  resetBasicFiltersButton.hidden = !hasBasicFilters();
  resetAdvancedFiltersButton.hidden = !hasAdvancedFilters();
}

function restoreFilters(filters = {}) {
  wordLengthInput.value = filters.wordLength ?? "0";
  startsWithInput.value = filters.startsWith ?? "";
  endsWithInput.value = filters.endsWith ?? "";
  mustIncludeInput.value = filters.mustInclude ?? "";
  excludeLettersInput.value = filters.excludeLetters ?? "";
  highValueOnlyInput.checked = filters.highValueOnly === true;
  minimumVowelsInput.value = filters.minimumVowels ?? "0";
  minimumConsonantsInput.value = filters.minimumConsonants ?? "0";
  minimumScoreInput.value = filters.minimumScore ?? "";
  maximumScoreInput.value = filters.maximumScore ?? "";
  hookFilterInputs.forEach((option) => {
    option.checked = option.value === (filters.hookFilter ?? "");
  });

  if (![...hookFilterInputs].some((option) => option.checked)) {
    hookFilterInputs[0].checked = true;
  }

  syncSectionFilterResetButtons();
}

function getHistoryEntropy(letters) {
  if (letters.length < 2) {
    return 0;
  }
  const analysis = analyzeWord(letters);
  const wildcardBonus = analysis.wildcards > 0 ? 0.08 : 0;
  return Number(clamp(analysis.normalizedEntropy + wildcardBonus, 0, 1).toFixed(2));
}

function getHistoryLeaveValue(letters, matches) {
  if (matches.length === 0) {
    return null;
  }

  const sample = matches.slice(0, 50);
  return Math.round(sample.reduce((sum, word) => (
    sum + getLeaveQuality(getLeaveLetters(letters, word))
  ), 0) / sample.length);
}

function getVisibleHistoryEntries() {
  const entries = historyPinnedOnly.checked
    ? historyEntries.filter((entry) => entry.pinned)
    : historyEntries;
  return HistoryStore.sort(entries, historySort.value);
}

function formatHistoryTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function formatHistoryMetrics(entry) {
  const values = [`${entry.resultCount} ${entry.resultCount === 1 ? "result" : "results"}`];
  if (entry.entropy !== null) {
    values.push(`entropy ${Math.round(entry.entropy * 100)}%`);
  }
  if (entry.leaveValue !== null) {
    values.push(`leave ${entry.leaveValue}`);
  }
  return values.join(" · ");
}

function createHistoryFilterDetails(entry) {
  const filters = HistoryStore.getActiveFilters(entry.filters);
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const content = document.createElement("div");

  details.className = "history-filter-details";
  summary.textContent = `Filters Active: ${filters.length}`;
  content.className = "history-filter-content";

  if (filters.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No filters were active for this search.";
    content.append(empty);
  } else {
    const heading = document.createElement("strong");
    const list = document.createElement("ul");
    heading.textContent = "Filters:";
    filters.forEach((filter) => {
      const item = document.createElement("li");
      item.textContent = filter;
      list.append(item);
    });
    content.append(heading, list);
  }

  details.append(summary, content);
  details.addEventListener("click", (event) => event.stopPropagation());
  return details;
}

function createHistoryDropdownOption(entry, index) {
  const option = document.createElement("button");
  const rack = document.createElement("span");
  const meta = document.createElement("span");
  const time = document.createElement("span");

  option.type = "button";
  option.id = `history-dropdown-option-${index}`;
  option.className = "history-dropdown-option";
  option.setAttribute("role", "option");
  option.setAttribute("aria-selected", String(index === historyDropdownIndex));
  option.tabIndex = -1;
  if (index === historyDropdownIndex) {
    option.classList.add("is-active");
  }
  rack.className = "history-dropdown-rack";
  rack.textContent = `${entry.pinned ? "★ " : ""}${formatSmartInput(entry.rack, entry.pattern)}`;
  meta.className = "history-dropdown-meta";
  meta.textContent = formatHistoryMetrics(entry);
  time.className = "history-dropdown-time";
  time.textContent = formatHistoryTime(entry.timestamp);
  option.append(rack, meta, time);
  option.addEventListener("pointerdown", (event) => event.preventDefault());
  option.addEventListener("click", () => loadHistoryEntry(entry));
  return option;
}

function renderHistoryDropdown() {
  const entries = HistoryStore.sort(historyEntries, "newest").slice(0, 8);
  historyDropdown.replaceChildren(...entries.map(createHistoryDropdownOption));

  const activeId = historyDropdownIndex >= 0
    ? `history-dropdown-option-${historyDropdownIndex}`
    : null;
  if (activeId) {
    input.setAttribute("aria-activedescendant", activeId);
  } else {
    input.removeAttribute("aria-activedescendant");
  }
}

function openHistoryDropdown() {
  if (!window.matchMedia("(min-width: 601px)").matches || historyEntries.length === 0) {
    return false;
  }

  historyDropdownIndex = 0;
  historyDropdown.hidden = false;
  input.setAttribute("aria-expanded", "true");
  renderHistoryDropdown();
  return true;
}

function closeHistoryDropdown() {
  historyDropdown.hidden = true;
  historyDropdownIndex = -1;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function createHistoryEntryElement(entry, index) {
  const item = document.createElement("article");
  const heading = document.createElement("div");
  const primary = document.createElement("div");
  const rackLine = document.createElement("div");
  const rack = document.createElement("strong");
  const time = document.createElement("time");
  const topActions = document.createElement("div");
  const pattern = document.createElement("p");
  const metaRow = document.createElement("div");
  const metrics = document.createElement("div");
  const filters = createHistoryFilterDetails(entry);
  const actions = document.createElement("div");
  const rerun = document.createElement("button");
  const pin = document.createElement("button");
  const remove = document.createElement("button");

  item.className = "history-entry";
  item.dataset.historyIndex = String(index);
  item.tabIndex = index === historyPanelFocusIndex ? 0 : -1;
  item.setAttribute("role", "group");
  item.setAttribute("aria-label", `Search ${formatSmartInput(entry.rack, entry.pattern)}`);
  heading.className = "history-entry-heading";
  rack.textContent = entry.rack;
  if (entry.pinned) {
    const star = document.createElement("span");
    star.className = "history-pin-mark";
    star.setAttribute("aria-label", "Pinned");
    star.textContent = "★";
    rackLine.append(star);
  }
  time.className = "history-entry-time";
  time.dateTime = new Date(entry.timestamp).toISOString();
  time.textContent = formatHistoryTime(entry.timestamp);
  primary.className = "history-entry-primary";
  rackLine.className = "history-entry-rack-line";
  topActions.className = "history-entry-top-actions";
  pattern.className = "history-entry-pattern";
  pattern.textContent = entry.pattern ? `Pattern: ${entry.pattern}` : "Pattern: none";
  metaRow.className = "history-entry-meta-row";
  metrics.className = "history-entry-metrics";
  metrics.textContent = formatHistoryMetrics(entry);
  actions.className = "history-entry-actions";
  [rerun, pin, remove].forEach((control) => {
    control.type = "button";
    control.className = "history-action";
  });
  rerun.textContent = "Re-run";
  pin.textContent = entry.pinned ? "Unpin" : "Pin";
  remove.textContent = "Delete";
  rerun.addEventListener("click", (event) => {
    event.stopPropagation();
    loadHistoryEntry(entry);
  });
  pin.addEventListener("click", (event) => {
    event.stopPropagation();
    historyEntries = HistoryStore.update(entry.id, { pinned: !entry.pinned });
    renderAllHistory();
  });
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    historyEntries = HistoryStore.remove(entry.id);
    renderAllHistory();
  });
  actions.append(rerun, pin, remove);
  rackLine.append(rack);
  primary.append(rackLine, pattern);
  topActions.append(time, actions);
  heading.append(primary, topActions);
  metaRow.append(metrics, filters);
  item.append(heading, metaRow);
  item.addEventListener("click", () => loadHistoryEntry(entry));
  item.addEventListener("keydown", handleHistoryPanelKeydown);
  return item;
}

function renderHistoryPanel() {
  const entries = getVisibleHistoryEntries();
  historyCount.textContent = `${historyEntries.length} ${historyEntries.length === 1 ? "search" : "searches"}`;
  historyClear.disabled = historyEntries.length === 0;
  historyEmpty.hidden = entries.length > 0;
  historyViewport.hidden = entries.length === 0;

  if (entries.length === 0) {
    historyPanelFocusIndex = -1;
    historyVirtualList.replaceChildren();
    return;
  }

  if (historyPanelFocusIndex < 0 || historyPanelFocusIndex >= entries.length) {
    historyPanelFocusIndex = 0;
  }

  historyVirtualList.replaceChildren(...entries.map(createHistoryEntryElement));
}

function createHistoryModalEntry(entry, index) {
  const wrapper = document.createElement("div");
  const item = document.createElement("button");
  const rackLine = document.createElement("span");
  const rack = document.createElement("strong");
  const pattern = document.createElement("span");
  const metaRow = document.createElement("div");
  const metrics = document.createElement("span");
  const time = document.createElement("time");
  const filters = createHistoryFilterDetails(entry);
  wrapper.setAttribute("role", "listitem");
  wrapper.className = "history-modal-listitem";
  item.type = "button";
  item.id = `history-modal-option-${index}`;
  item.className = "history-modal-entry";
  item.setAttribute("aria-current", String(index === historyModalIndex));
  item.tabIndex = index === historyModalIndex ? 0 : -1;
  if (index === historyModalIndex) {
    item.classList.add("is-active");
  }
  rack.textContent = entry.rack;
  if (entry.pinned) {
    const star = document.createElement("span");
    star.className = "history-pin-mark";
    star.setAttribute("aria-label", "Pinned");
    star.textContent = "★";
    rackLine.append(star);
  }
  rackLine.className = "history-modal-rack-line";
  pattern.className = "history-modal-pattern";
  pattern.textContent = entry.pattern ? `Pattern: ${entry.pattern}` : "Pattern: none";
  metaRow.className = "history-modal-meta-row";
  metrics.className = "history-modal-metrics";
  metrics.textContent = formatHistoryMetrics(entry);
  time.dateTime = new Date(entry.timestamp).toISOString();
  time.textContent = formatHistoryTime(entry.timestamp);
  rackLine.append(rack);
  item.append(rackLine, pattern, time);
  item.addEventListener("click", () => loadHistoryEntry(entry));
  wrapper.addEventListener("click", (event) => {
    if (!event.target.closest(".history-filter-details, .history-modal-entry")) {
      loadHistoryEntry(entry);
    }
  });
  metaRow.append(metrics, filters);
  wrapper.append(item, metaRow);
  return wrapper;
}

function renderHistoryModal() {
  const entries = HistoryStore.sort(historyEntries, "newest");
  historyModalEmpty.hidden = entries.length > 0;
  if (entries.length === 0) {
    historyModalIndex = -1;
  } else if (historyModalIndex < 0 || historyModalIndex >= entries.length) {
    historyModalIndex = 0;
  }
  historyModalList.replaceChildren(...entries.map(createHistoryModalEntry));
}

function renderAllHistory() {
  renderHistoryDropdown();
  renderHistoryPanel();
  renderHistoryModal();
}

function createRackTile(letter, index) {
  const tile = document.createElement("span");
  const face = document.createElement("span");
  const score = document.createElement("span");
  const isWildcard = letter === "?";
  const isPatternCharacter = letter === "/" || letter === "*";

  tile.className = "rack-tile";
  tile.classList.toggle("rack-tile--wildcard", isWildcard);
  tile.classList.toggle("rack-tile--pattern", isPatternCharacter);
  tile.style.display = "inline-flex";
  tile.style.width = "2rem";
  tile.style.height = "2rem";
  tile.style.flexDirection = "column";
  tile.style.alignItems = "flex-start";
  tile.style.justifyContent = "space-between";
  tile.style.padding = "0.06rem 0.08rem 0.08rem 0.12rem";
  tile.style.border = "1px solid #d4b06d";
  tile.style.borderBottomWidth = "2px";
  tile.style.borderRadius = "0.2rem";
  tile.style.background = "linear-gradient(180deg, #f8e7bf 0%, #e8c97f 100%)";
  tile.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 1px rgba(15,23,42,0.22)";
  tile.style.color = "#1f2937";
  tile.style.fontFamily = 'Georgia, "Times New Roman", serif';
  tile.style.lineHeight = "1";
  tile.style.background = isWildcard
    ? "linear-gradient(180deg, #fbf2d7 0%, #f0dfad 100%)"
    : "linear-gradient(180deg, #f8e7bf 0%, #e8c97f 100%)";
  tile.style.overflow = "visible";

  face.className = "rack-tile-letter";
  face.style.display = "block";
  face.style.marginLeft = "0.02rem";
  face.style.marginTop = "0.01rem";
  face.style.fontSize = "1.08rem";
  face.style.fontWeight = "900";
  face.style.letterSpacing = "-0.02em";
  face.style.textTransform = "uppercase";
  face.style.visibility = isWildcard ? "hidden" : "visible";

  score.className = "rack-tile-score";
  score.style.display = "block";
  score.style.alignSelf = "flex-end";
  score.style.marginRight = "0.01rem";
  score.style.marginBottom = "0.01rem";
  score.style.fontSize = "0.56rem";
  score.style.fontWeight = "900";
  score.style.lineHeight = "1";
  score.style.color = "#111827";
  score.style.background = "rgba(252, 244, 220, 0.98)";
  score.style.padding = "0.02rem 0.14rem";
  score.style.border = "1px solid rgba(31, 41, 55, 0.15)";
  score.style.borderRadius = "0.22rem";
  score.style.boxShadow = "0 1px 0 rgba(255,255,255,0.45) inset";
  score.style.visibility = isWildcard || isPatternCharacter ? "hidden" : "visible";

  face.textContent = isWildcard ? "" : letter.toUpperCase();
  score.textContent = isWildcard || isPatternCharacter ? "" : String(getScrabbleTileValue(letter));
  tile.append(face, score);
  tile.style.setProperty("--tile-index", String(index));
  return tile;
}

function createRackCaret() {
  const caret = document.createElement("span");
  caret.className = "rack-caret";
  caret.style.display = "inline-block";
  caret.style.width = "2px";
  caret.style.height = "1.65rem";
  caret.style.margin = "0 0.06rem";
  caret.style.borderRadius = "999px";
  caret.style.background = "#22c55e";
  caret.style.boxShadow = "0 0 6px rgba(34,197,94,0.8)";
  caret.style.animation = "rackCaretBlink 1s steps(2, start) infinite";
  return caret;
}

function renderRackTiles() {
  if (!rackTiles) {
    return;
  }

  const raw = input.value;
  const letters = [...raw.replace(/\s+/g, "")];
  const selectionStart = input.selectionStart ?? raw.length;
  const caretIndex = [...raw.slice(0, selectionStart).replace(/\s+/g, "")].length;
  const tiles = letters.map((letter, index) => createRackTile(letter, index));
  tiles.splice(caretIndex, 0, createRackCaret());

  rackTiles.replaceChildren(...tiles);
}

function sanitizeRackInput() {
  const currentValue = input.value;
  const currentStart = input.selectionStart ?? currentValue.length;
  const currentEnd = input.selectionEnd ?? currentStart;
  const sanitizedValue = InputRules.sanitizeSmartInput(currentValue);

  if (sanitizedValue === currentValue) {
    return;
  }

  input.value = sanitizedValue;
  input.setSelectionRange(
    InputRules.sanitizeSmartInput(currentValue.slice(0, currentStart)).length,
    InputRules.sanitizeSmartInput(currentValue.slice(0, currentEnd)).length
  );
}

function renderAllPickList() {
  renderPickList();
  renderResultsPickButtons();
  refreshPickListHookCache();
}

function focusPickListPanel() {
  if (pickListEntries.length > 0) {
    const firstEntry = pickListVirtualList.querySelector(".pick-list-entry");
    firstEntry?.scrollIntoView({ block: "nearest" });
  }

  pickListViewport.focus({ preventScroll: true });
}

function focusHistoryPanelEntry(index) {
  const entries = getVisibleHistoryEntries();
  if (entries.length === 0) {
    historyPanelSummary.focus();
    return;
  }

  historyPanelFocusIndex = Math.max(0, Math.min(index, entries.length - 1));
  renderHistoryPanel();
  requestAnimationFrame(() => {
    const target = historyVirtualList
      .querySelector(`[data-history-index="${historyPanelFocusIndex}"]`);
    target?.scrollIntoView({ block: "nearest" });
    target?.focus({ preventScroll: true });
  });
}

function handleHistoryPanelKeydown(event) {
  if (event.target !== event.currentTarget) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.currentTarget.click();
    return;
  }

  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  const entries = getVisibleHistoryEntries();
  focusHistoryPanelEntry(HistoryStore.moveIndex(historyPanelFocusIndex, event.key, entries.length));
}

function openHistoryModal() {
  closeHistoryDropdown();
  historyModalIndex = historyEntries.length > 0 ? 0 : -1;
  renderHistoryModal();
  historyModalReturnFocus = document.activeElement;
  historyModalBackdrop.hidden = false;
  input.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => (
    historyModalList.querySelector("[aria-current=true]") ?? historyModalClose
  ).focus());
}

function closeHistoryModal() {
  if (historyModalBackdrop.hidden) {
    return;
  }

  historyModalBackdrop.hidden = true;
  historyModalIndex = -1;
  input.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  historyModalReturnFocus?.focus();
  historyModalReturnFocus = null;
}

function loadHistoryEntry(entry) {
  const restored = HistoryStore.getRestoredState(entry);
  if (!restored) {
    return;
  }

  input.value = restored.inputValue;
  renderRackTiles();
  restoreFilters(restored.filters);
  sortResultsInput.value = getSortOption(restored.sortMode) ? restored.sortMode : "length-desc";
  syncSortPicker();
  closeHistoryDropdown();
  closeHistoryModal();
  clearMessage();

  if (button.disabled) {
    pendingHistorySearch = true;
  } else {
    pendingHistorySearch = false;
    form.requestSubmit(button);
  }
}

function runPendingHistorySearch() {
  if (pendingHistorySearch && !button.disabled) {
    pendingHistorySearch = false;
    form.requestSubmit(button);
  }
}

function saveHistoryEntry(letters, pattern, matches, filters, sortMode) {
  historyEntries = HistoryStore.add({
    id: "",
    timestamp: Date.now(),
    rack: letters,
    pattern,
    filters,
    sortMode,
    resultCount: matches.length,
    entropy: getHistoryEntropy(letters),
    leaveValue: getHistoryLeaveValue(letters, matches),
    pinned: false
  });
  renderAllHistory();
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

function isWordPicked(word) {
  return pickListEntries.some((entry) => entry.word === word.toUpperCase());
}

function renderResultsPickButtons() {
  wordList.querySelectorAll("[data-pick-word]").forEach((button) => {
    const word = button.dataset.pickWord;
    const picked = isWordPicked(word);
    button.textContent = picked ? "Picked" : "Pick";
    button.setAttribute("aria-pressed", String(picked));
    button.classList.toggle("is-picked", picked);
  });
}

function getScrabbleTileValue(letter) {
  const values = IS_WWF ? WWF_TILE_VALUES : SCRABBLE_TILE_VALUES;
  return values[letter.toLowerCase()] ?? 0;
}

function getPickListSortKey(entry, mode) {
  const analysis = getPickListAnalysis(entry.word);
  const totalTileValue = [...entry.word.toLowerCase()].reduce(
    (sum, letter) => sum + getScrabbleTileValue(letter),
    0
  );
  const density = entry.word.length > 0 ? totalTileValue / entry.word.length : 0;

  if (mode === "hook-desc") {
    return [Number(analysis.hasHook), entry.score, entry.word];
  }

  if (mode === "length-desc") {
    return [entry.length, entry.score, entry.word];
  }

  if (mode === "density-desc") {
    return [density, entry.score, entry.word];
  }

  return [entry.score, entry.length, entry.word];
}

function comparePickListEntries(first, second) {
  const mode = pickListSort?.value ?? "score-desc";
  const firstKey = getPickListSortKey(first, mode);
  const secondKey = getPickListSortKey(second, mode);

  for (let index = 0; index < firstKey.length; index += 1) {
    const a = firstKey[index];
    const b = secondKey[index];
    if (a === b) {
      continue;
    }

    if (typeof a === "number" && typeof b === "number") {
      return b - a;
    }

    return String(a).localeCompare(String(b));
  }

  return 0;
}

function getPickListAnalysis(word) {
  const letters = word.toLowerCase();
  const vowels = [...letters].filter((letter) => VOWELS.includes(letter)).length;
  const consonants = [...letters].filter((letter) => /[a-z]/.test(letter) && !VOWELS.includes(letter)).length;
  const highValueLetters = [...letters].filter((letter) => HIGH_VALUE_LETTERS.includes(letter));
  const letterCounts = new Map();
  [...letters].forEach((letter) => {
    letterCounts.set(letter, (letterCounts.get(letter) ?? 0) + 1);
  });

  const factorial = (n) => {
    let result = 1;
    for (let i = 2; i <= n; i += 1) {
      result *= i;
    }
    return result;
  };

  const anagramCount = [...letterCounts.values()].reduce(
    (total, count) => total / factorial(count),
    factorial(letters.length)
  );

  return {
    hasHook: pickListHookCache.get(word.toUpperCase()) ?? !word.endsWith("s"),
    hasHighValueLetters: Boolean(highValueLetters),
    balanceLabel: vowels === consonants
      ? "Balanced"
      : vowels > consonants
        ? "Vowel-heavy"
        : "Consonant-heavy",
    isBingoFriendly: word.length === 7,
    anagramCount,
    highValueLetters
  };
}

function refreshPickListHookCache() {
  if (pickListHookRefreshQueued || !pickListEntries.length) {
    return;
  }

  pickListHookRefreshQueued = true;

  queueMicrotask(async () => {
    try {
      await Engine.ready;
      await loadAllChunks();

      const nextCache = new Map();
      pickListEntries.forEach((entry) => {
        nextCache.set(
          entry.word.toUpperCase(),
          getHookInfo(entry.word.toLowerCase(), DICTIONARY_BITS.both).hasSHook
        );
      });

      pickListHookCache = nextCache;
      renderPickList();
    } catch (error) {
      console.error("Unable to refresh pick-list hook flags:", error);
    } finally {
      pickListHookRefreshQueued = false;
    }
  });
}

function createScrabbleTile(letter) {
  const tile = document.createElement("span");
  const face = document.createElement("span");
  const score = document.createElement("span");

  tile.className = "pick-list-tile";
  tile.style.alignItems = "flex-start";
  tile.style.justifyContent = "flex-start";
  tile.style.padding = "0.08rem 0 0 0.1rem";
  tile.setAttribute("aria-hidden", "true");
  face.className = "pick-list-tile-letter";
  face.style.marginLeft = "0.18rem";
  face.style.marginTop = "0.08rem";
  face.textContent = letter.toUpperCase();
  score.className = "pick-list-tile-score";
  score.style.fontSize = "0.78rem";
  score.style.right = "0.09rem";
  score.style.bottom = "0.03rem";
  score.textContent = String(getScrabbleTileValue(letter));
  tile.append(face, score);
  return tile;
}

function renderPickListWord(word) {
  const wordRow = document.createElement("div");
  wordRow.className = "pick-list-word-tiles";

  [...word].forEach((letter) => {
    wordRow.append(createScrabbleTile(letter));
  });

  return wordRow;
}

function createPickListFlag(text, modifier = "") {
  const flag = document.createElement("span");
  flag.className = `pick-list-flag${modifier ? ` ${modifier}` : ""}`;
  flag.textContent = text;
  return flag;
}

function getPickListNotePreview(note) {
  const normalized = note.replace(/\s+/g, " ").trim();
  return normalized.length > 40 ? `${normalized.slice(0, 40)}…` : normalized;
}

function createPickListNote(entry, noteIcon) {
  const container = document.createElement("div");
  const counter = document.createElement("span");
  let currentNote = entry.note ?? "";

  container.className = "pick-list-note";
  counter.className = "pick-list-note-counter";
  counter.id = `pick-list-note-counter-${entry.id}`;
  counter.setAttribute("aria-live", "polite");

  const updateNoteState = (note) => {
    const length = note.length;
    counter.textContent = `${length}/${PickListStore.NOTE_MAX_LENGTH}`;
    counter.classList.toggle("is-warning", length > 100 && length < PickListStore.NOTE_MAX_LENGTH);
    counter.classList.toggle("is-limit", length >= PickListStore.NOTE_MAX_LENGTH);
    noteIcon.hidden = !note.trim();
  };

  const showPreview = () => {
    const preview = document.createElement("button");
    const previewText = document.createElement("span");
    const collapsedText = getPickListNotePreview(currentNote);
    const fullText = currentNote.trim() || "Add a note…";

    preview.className = "pick-list-note-preview";
    preview.type = "button";
    preview.setAttribute("aria-label", `${currentNote.trim() ? "Edit" : "Add"} note for ${entry.word}`);
    previewText.className = "pick-list-note-preview-text";
    previewText.textContent = collapsedText || "Add a note…";
    preview.classList.toggle("is-empty", !currentNote.trim());

    preview.addEventListener("mouseenter", () => {
      if (currentNote.trim()) {
        previewText.textContent = fullText;
        preview.classList.add("is-expanded");
      }
    });
    preview.addEventListener("mouseleave", () => {
      previewText.textContent = collapsedText || "Add a note…";
      preview.classList.remove("is-expanded");
    });
    preview.addEventListener("focus", () => {
      if (currentNote.trim()) {
        previewText.textContent = fullText;
        preview.classList.add("is-expanded");
      }
    });
    preview.addEventListener("blur", () => {
      previewText.textContent = collapsedText || "Add a note…";
      preview.classList.remove("is-expanded");
    });
    preview.addEventListener("click", showEditor);
    preview.append(previewText);
    container.replaceChildren(preview);
  };

  const showEditor = () => {
    const textarea = document.createElement("textarea");

    textarea.className = "pick-list-note-editor";
    textarea.value = currentNote;
    textarea.maxLength = PickListStore.NOTE_MAX_LENGTH;
    textarea.rows = 3;
    textarea.placeholder = "Add a note…";
    textarea.setAttribute("aria-label", `Note for ${entry.word}`);
    textarea.setAttribute("aria-describedby", counter.id);
    textarea.addEventListener("input", () => {
      if (textarea.value.length > PickListStore.NOTE_MAX_LENGTH) {
        textarea.value = textarea.value.slice(0, PickListStore.NOTE_MAX_LENGTH);
      }
      currentNote = textarea.value;
      pickListEntries = PickListStore.updateNote(entry.word, currentNote);
      updateNoteState(currentNote);
    });
    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        textarea.blur();
      }
    });
    textarea.addEventListener("blur", showPreview);

    updateNoteState(currentNote);
    container.replaceChildren(textarea, counter);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  };

  updateNoteState(currentNote);
  showPreview();
  return container;
}

function insertPickWordIntoRack(word) {
  input.value = word;
  input.setSelectionRange(word.length, word.length);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus({ preventScroll: true });
  input.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderPickList() {
  pickListEntries = [...pickListEntries].sort(comparePickListEntries);
  pickListCount.textContent = `${pickListEntries.length} ${pickListEntries.length === 1 ? "word" : "words"}`;
  pickListClear.disabled = pickListEntries.length === 0;
  pickListEmpty.hidden = pickListEntries.length > 0;
  pickListViewport.hidden = pickListEntries.length === 0;

  if (pickListEntries.length === 0) {
    pickListVirtualList.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();

  pickListEntries.forEach((entry) => {
    const item = document.createElement("article");
    const top = document.createElement("div");
    const topActions = document.createElement("div");
    const meta = document.createElement("span");
    const insert = document.createElement("button");
    const remove = document.createElement("button");
    const tileRow = renderPickListWord(entry.word);
    const wordLabel = document.createElement("strong");
    const wordHeading = document.createElement("span");
    const noteIcon = document.createElement("span");
    const flags = document.createElement("div");
    const analysis = getPickListAnalysis(entry.word);
    const note = createPickListNote(entry, noteIcon);

    item.className = "pick-list-entry";
    top.className = "pick-list-entry-top";
    topActions.className = "pick-list-entry-actions";
    meta.className = "pick-list-entry-meta";
    wordHeading.className = "pick-list-word-heading";
    noteIcon.className = "pick-list-note-icon";
    noteIcon.textContent = "📝";
    noteIcon.title = "This word has a note";
    noteIcon.setAttribute("aria-label", "Has note");
    noteIcon.hidden = !entry.note.trim();
    flags.className = "pick-list-flags";
    wordLabel.textContent = entry.word;
    meta.textContent = `${entry.score} pts · ${entry.length} letters · ${analysis.anagramCount.toLocaleString()} anagrams`;
    insert.className = "pick-list-action pick-list-insert";
    insert.type = "button";
    insert.textContent = "Insert";
    insert.title = "Insert into Rack";
    insert.setAttribute("aria-label", `Insert ${entry.word} into rack`);
    insert.addEventListener("click", () => insertPickWordIntoRack(entry.word));
    remove.className = "pick-list-action";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      pickListEntries = PickListStore.remove(entry.word);
      renderPickList();
      renderResultsPickButtons();
    });

    flags.append(
      createPickListFlag(
        analysis.hasHook ? "S-hookable" : "No S-hook",
        "pick-list-flag--hook"
      )
    );

    if (analysis.hasHighValueLetters) {
      flags.append(createPickListFlag("High-value", "pick-list-flag--high-value"));
    }

    flags.append(createPickListFlag(analysis.balanceLabel, "pick-list-flag--balance"));

    if (analysis.isBingoFriendly) {
      flags.append(createPickListFlag("Bingo-friendly", "pick-list-flag--bingo"));
    }

    wordHeading.append(wordLabel, noteIcon);
    topActions.append(insert, remove);
    top.append(wordHeading, topActions);
    item.append(top, meta, note, tileRow, flags);
    fragment.append(item);
  });

  pickListVirtualList.replaceChildren(fragment);
  refreshPickListHookCache();
}

function togglePickWord(word, score) {
  if (isWordPicked(word)) {
    pickListEntries = PickListStore.remove(word);
  } else {
    pickListEntries = PickListStore.add({ word, score, length: word.length });
  }

  pickListHookCache.delete(word.toUpperCase());
  renderPickList();
  renderResultsPickButtons();
  refreshPickListHookCache();
}

function getWildcardLetterIndexes(word, letters) {
  const availableCounts = new Uint8Array(26);
  let wildcardCount = 0;

  for (const letter of letters) {
    if (letter === "?") {
      wildcardCount += 1;
    } else {
      availableCounts[letter.charCodeAt(0) - 97] += 1;
    }
  }

  const wildcardIndexes = new Set();

  for (let index = 0; index < word.length && wildcardCount > 0; index += 1) {
    const letterIndex = word.charCodeAt(index) - 97;

    if (availableCounts[letterIndex] > 0) {
      availableCounts[letterIndex] -= 1;
    } else {
      wildcardIndexes.add(index);
      wildcardCount -= 1;
    }
  }

  return wildcardIndexes;
}

function appendHighlightedWord(wordLabel, word, letters) {
  const wildcardIndexes = getWildcardLetterIndexes(word, letters);

  if (wildcardIndexes.size === 0) {
    wordLabel.textContent = word.toUpperCase();
    return;
  }

  for (let index = 0; index < word.length; index += 1) {
    if (wildcardIndexes.has(index)) {
      const wildcardLetter = document.createElement("span");
      wildcardLetter.className = "wildcard-letter";
      wildcardLetter.title = "Letter supplied by a wildcard tile";
      wildcardLetter.textContent = word[index].toUpperCase();
      wordLabel.append(wildcardLetter);
    } else {
      wordLabel.append(word[index].toUpperCase());
    }
  }
}

function createWordItem(word, letters, options) {
  const item = document.createElement("li");
  const content = document.createElement("div");
  const wordLookup = document.createElement("div");
  const wordLabel = document.createElement("button");
  const linkMeta = document.createElement("span");
  const score = document.createElement("span");
  const insertButton = document.createElement("button");
  const pickButton = document.createElement("button");
  const dictionaryLinks = document.createElement("div");
  const dictionaryPopoverHeader = document.createElement("div");
  const dictionaryPopoverActions = document.createElement("div");
  const dictionaryPopoverTitle = document.createElement("span");
  const points = getScrabbleScore(word);
  const highValueLetters = getHighValueLetters(word);

  item.className = "word-card";
  content.className = "word-card-content";
  wordLookup.className = "word-lookup";

  wordLabel.className = "word-label";
  wordLabel.type = "button";
  appendHighlightedWord(wordLabel, word, letters);
  wordLabel.title = `Show dictionary links for ${word}`;
  wordLabel.setAttribute("aria-haspopup", "dialog");

  linkMeta.className = "word-link-meta";

  score.className = "scrabble-score";
  score.textContent = `${points} pts`;
  linkMeta.append(score);

  pickButton.className = "word-pick-button";
  pickButton.type = "button";
  pickButton.dataset.pickWord = word;
  pickButton.textContent = isWordPicked(word) ? "Picked" : "Pick";
  pickButton.setAttribute("aria-pressed", String(isWordPicked(word)));
  pickButton.title = `Add ${word} to the pick list`;
  pickButton.addEventListener("click", () => togglePickWord(word, points));

  insertButton.className = "word-insert-button";
  insertButton.type = "button";
  insertButton.textContent = "Insert";
  insertButton.title = "Insert into Rack";
  insertButton.setAttribute("aria-label", `Insert ${word} into rack`);
  insertButton.addEventListener("click", () => insertPickWordIntoRack(word));

  if (word.length === 7) {
    const bingoBadge = document.createElement("span");
    bingoBadge.className = "result-badge result-badge--bingo";
    bingoBadge.textContent = IS_WWF ? "Bingo +35" : "Bingo +50";
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
  dictionaryPopoverHeader.className = "dictionary-popover-header";
  dictionaryPopoverActions.className = "dictionary-popover-actions";
  dictionaryPopoverTitle.className = "dictionary-popover-title";
  dictionaryPopoverTitle.textContent = word.toUpperCase();
  dictionaryPopoverActions.append(insertButton, pickButton);
  dictionaryPopoverHeader.append(dictionaryPopoverActions, dictionaryPopoverTitle);
  dictionaryLinks.append(dictionaryPopoverHeader);

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

  const hookLookup = document.createElement("section");
  const hookLookupLabel = document.createElement("span");
  const hookLookupResult = document.createElement("div");
  let hookLookupLoaded = false;
  let hookLookupLoading = false;

  hookLookup.className = "hook-lookup";
  hookLookup.setAttribute("aria-label", `Available hooks for ${word}`);
  hookLookupLabel.className = "hook-lookup-label";
  hookLookupLabel.textContent = "Available Hooks:";
  hookLookupResult.className = "hook-lookup-result";
  hookLookupResult.setAttribute("aria-live", "polite");
  hookLookupResult.textContent = "Open this word to load hooks.";
  hookLookup.append(hookLookupLabel, hookLookupResult);

  const positionDictionaryPopover = () => {
    if (!window.matchMedia("(max-width: 900px), (max-height: 600px)").matches) {
      return;
    }

    const viewportPadding = 12;
    const triggerRect = wordLabel.getBoundingClientRect();
    const popoverRect = dictionaryLinks.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - viewportPadding - popoverRect.width);
    const left = Math.min(Math.max(triggerRect.left, viewportPadding), maxLeft);
    const belowTop = triggerRect.bottom;
    const aboveTop = triggerRect.top - popoverRect.height;
    const preferredTop = belowTop + popoverRect.height <= window.innerHeight - viewportPadding
      ? belowTop
      : aboveTop;
    const maxTop = Math.max(viewportPadding, window.innerHeight - viewportPadding - popoverRect.height);
    const top = Math.min(Math.max(preferredTop, viewportPadding), maxTop);

    dictionaryLinks.style.setProperty("--dictionary-popover-left", `${left}px`);
    dictionaryLinks.style.setProperty("--dictionary-popover-top", `${top}px`);
  };
  dictionaryPopoverPositioners.set(dictionaryLinks, positionDictionaryPopover);

  const loadHookLookup = async () => {
    if (hookLookupLoaded || hookLookupLoading) {
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
      positionDictionaryPopover();
    } catch (error) {
      console.error(`Unable to load hooks for ${word}:`, error);
      hookLookupResult.className = "hook-lookup-result is-error";
      hookLookupResult.textContent = "Unable to load hooks. Close this window and try again.";
      positionDictionaryPopover();
    } finally {
      hookLookupLoading = false;
    }
  };

  const openDictionaryPopover = () => {
    positionDictionaryPopover();
    loadHookLookup();
  };

  wordLookup.addEventListener("mouseenter", openDictionaryPopover);
  wordLookup.addEventListener("focusin", openDictionaryPopover);

  dictionaryLinks.append(hookLookup);
  wordLookup.append(wordLabel, dictionaryLinks);
  content.append(wordLookup, linkMeta);
  item.append(content);
  return item;
}

function appendWordGroup(fragment, headingText, words, ariaLabel, letters, options) {
  const group = document.createElement("section");
  group.className = "word-group";

  const heading = document.createElement("h4");
  heading.textContent = headingText;

  const grid = document.createElement("ul");
  grid.className = "word-grid";
  grid.setAttribute("aria-label", ariaLabel);

  words.forEach((word) => grid.append(createWordItem(word, letters, options)));
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
        letters,
        options
      );
    });
  } else {
    const heading = SORT_LABELS[options.sortBy] ?? "Matching words";
    appendWordGroup(fragment, heading, matches, heading, letters, options);
  }

  wordList.append(fragment);
  breakdownState = { letters, matches: [...matches], options };
  wordBreakdown.hidden = false;
  renderResultsPickButtons();

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
  const analysis = analyzeWord(letters);
  const vowels = analysis.vowels;
  const wildcards = analysis.wildcards;
  const consonants = analysis.consonants;
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
    `Counts rack tiles by standard English ${IS_WWF ? "Words With Friends" : "Scrabble"} point value; unknown positions appear at 0.`
  );
  const pointValues = [0, 1, 2, 3, 4, 5, 8, 10];
  const analysis = analyzeWord(letters);
  const counts = new Map(
    pointValues.map((points) => [points, analysis.tileDistribution.get(points) ?? 0])
  );
  const histogram = document.createElement("div");
  const total = document.createElement("div");

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
    `Groups current matches by standard English ${IS_WWF ? "Words With Friends" : "Scrabble"} tile score.`,
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
  const highestTileValue = Math.max(...analyzeWord(letters).tileDistribution.keys());
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
  return Engine.boardFitAnalysis(letters, options.pattern, options);
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
  const entropyScore = analyzeWord(letters).entropyScore;
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
    Engine.initEngine(text.split(/\r?\n/).filter(Boolean));
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

function getHighValueLetters(word) {
  return analyzeWord(word).highValueLetters;
}

function getHookInfo(word, dictionaryBit) {
  return Engine.findHooks(word, dictionaryBit);
}

function findMatches(letters, options) {
  return Engine.unscramble(letters, options.pattern, options);
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
  const dictionary = [...dictionaryInputs].find((option) => option.checked)?.value ?? "enable";
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

  const limitViolation = InputRules.getLimitViolation(letters, pattern);
  if (limitViolation?.type === "rack-wildcards") {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState(
      "Too many rack wildcards",
      `Use no more than ${InputRules.MAX_RACK_WILDCARDS} question-mark wildcard tiles.`
    );
    showMessage(
      `Rack searches accept up to ${InputRules.MAX_RACK_WILDCARDS} wildcard tiles (?).`
    );
    input.focus();
    return;
  }

  if (limitViolation?.type === "pattern-stars") {
    resultsHeading.textContent = "Ready when you are";
    setEmptyState(
      "Too many pattern stars",
      `Use no more than ${InputRules.MAX_PATTERN_STARS} variable-length wildcards after the slash.`
    );
    showMessage(
      `Inline patterns accept up to ${InputRules.MAX_PATTERN_STARS} variable-length wildcards (*).`
    );
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
    setEmptyState("Check score filters", `Enter whole-number ${IS_WWF ? "Words With Friends" : "Scrabble"} scores of zero or more.`);
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
    scoring: IS_WWF ? "wwf" : "scrabble",
    showHooks: Boolean(hookFilter || sortBy.startsWith("hooks-"))
  };
  const historyFilters = getCurrentFilters();

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

    const matches = findMatches(letters, options);
    renderMatches(letters, matches, options);
    saveHistoryEntry(letters, pattern, matches, historyFilters, sortBy);
  } catch (error) {
    console.error("Unable to load dictionary chunks:", error);
    resultsHeading.textContent = "Dictionary unavailable";
    setEmptyState("Unable to load words", "Please refresh the page and try again.");
    showMessage("The dictionary could not be loaded. Please refresh the page and try again.");
  } finally {
    results.setAttribute("aria-busy", "false");
    button.disabled = false;
    buttonLabel.textContent = "Unscramble";
    runPendingHistorySearch();
  }
}

async function loadManifest() {
  try {
    await Engine.ready;
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
    renderRackTiles();
    refreshPickListHookCache();
    input.focus();
    runPendingHistorySearch();
  } catch (error) {
    console.error("Unable to initialize the word engine:", error);
    if (error.message === "Unauthorized domain") {
      alert("Unauthorized domain");
      buttonLabel.textContent = "Unauthorized domain";
      showMessage(`The ${GAME_NAME} is not authorized on this host.`);
    } else {
      buttonLabel.textContent = "Dictionary unavailable";
      showMessage("The dictionary index could not be loaded. Please refresh the page.");
    }
  }
}

form.addEventListener("submit", handleSubmit);
form.addEventListener("input", syncSectionFilterResetButtons);
form.addEventListener("change", syncSectionFilterResetButtons);
input.addEventListener("input", () => {
  sanitizeRackInput();
  closeHistoryDropdown();
  renderRackTiles();
});
input.addEventListener("beforeinput", (event) => {
  if (
    event.inputType === "insertText"
    && event.data
    && InputRules.sanitizeSmartInput(event.data) !== event.data
  ) {
    event.preventDefault();
  }
});
input.addEventListener("keyup", renderRackTiles);
input.addEventListener("click", renderRackTiles);
input.addEventListener("focus", renderRackTiles);
input.addEventListener("keydown", (event) => {
  if (!historyModalBackdrop.hidden) {
    return;
  }

  const isDesktop = window.matchMedia("(min-width: 601px)").matches;
  if (!isDesktop && event.key === "ArrowDown") {
    event.preventDefault();
    openHistoryModal();
    return;
  }

  if (!isDesktop) {
    return;
  }

  const entries = HistoryStore.sort(historyEntries, "newest").slice(0, 8);
  if (event.key === "Escape" && !historyDropdown.hidden) {
    event.preventDefault();
    closeHistoryDropdown();
    return;
  }

  if (event.key === "Enter" && !historyDropdown.hidden && historyDropdownIndex >= 0) {
    event.preventDefault();
    loadHistoryEntry(entries[historyDropdownIndex]);
    return;
  }

  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  if (historyDropdown.hidden) {
    openHistoryDropdown();
    return;
  }

  historyDropdownIndex = HistoryStore.moveIndex(
    historyDropdownIndex,
    event.key,
    entries.length
  );
  renderHistoryDropdown();
  historyDropdown.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
});
document.addEventListener("pointerdown", (event) => {
  if (!historyDropdown.hidden && !event.target.closest(".primary-search-input")) {
    closeHistoryDropdown();
  }
});
historyPinnedOnly.addEventListener("change", () => {
  historyPanelFocusIndex = -1;
  historyViewport.scrollTop = 0;
  renderHistoryPanel();
});
historySort.addEventListener("change", () => {
  historyPanelFocusIndex = -1;
  historyViewport.scrollTop = 0;
  renderHistoryPanel();
});
historyClear.addEventListener("click", () => {
  if (historyEntries.length === 0 || !window.confirm(`Clear all ${GAME_NAME} history?`)) {
    return;
  }

  historyEntries = HistoryStore.clear();
  historyPanelFocusIndex = -1;
  renderAllHistory();
});
pickListClear.addEventListener("click", () => {
  if (pickListEntries.length === 0 || !window.confirm("Clear the pick list?")) {
    return;
  }

  pickListEntries = PickListStore.clear();
  renderAllPickList();
});
pickListSort.addEventListener("change", () => {
  renderPickList();
});
historyPanel.addEventListener("toggle", () => {
  if (historyPanel.open) {
    renderHistoryPanel();
  }
});
historyMobileTrigger.addEventListener("click", openHistoryModal);
historyModalClose.addEventListener("click", closeHistoryModal);
historyModalBackdrop.addEventListener("click", (event) => {
  if (event.target === historyModalBackdrop) {
    closeHistoryModal();
  }
});
historyModal.addEventListener("pointerdown", (event) => {
  historySwipeStartY = event.clientY;
});
historyModal.addEventListener("pointerup", (event) => {
  if (historySwipeStartY !== null && event.clientY - historySwipeStartY > 80) {
    closeHistoryModal();
  }
  historySwipeStartY = null;
});
historyModal.addEventListener("pointercancel", () => {
  historySwipeStartY = null;
});
historyModal.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeHistoryModal();
    return;
  }

  if (event.target.closest(".history-filter-details")) {
    return;
  }

  const entries = HistoryStore.sort(historyEntries, "newest");

  if (event.key === "Enter" && historyModalIndex >= 0) {
    event.preventDefault();
    event.stopPropagation();
    loadHistoryEntry(entries[historyModalIndex]);
    return;
  }

  if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    historyModalIndex = HistoryStore.moveIndex(
      historyModalIndex,
      event.key,
      entries.length
    );
    renderHistoryModal();
    historyModalList.querySelector("[aria-current=true]")?.focus();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const controls = [...historyModal.querySelectorAll("button:not([disabled])")];
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});
const historyLongPress = HistoryStore.createLongPressController({
  onLongPress: () => {
    if (window.matchMedia("(max-width: 600px)").matches) {
      openHistoryModal();
    }
  }
});
input.addEventListener("pointerdown", (event) => historyLongPress.start(event));
input.addEventListener("pointermove", (event) => historyLongPress.move(event));
input.addEventListener("pointerup", historyLongPress.cancel);
input.addEventListener("pointercancel", historyLongPress.cancel);
window.addEventListener("storage", (event) => {
  if (event.key === HistoryStore.STORAGE_KEY) {
    historyEntries = HistoryStore.read();
    renderAllHistory();
  } else if (event.key === PickListStore.STORAGE_KEY) {
    pickListEntries = PickListStore.read();
    renderAllPickList();
  }
});
window.addEventListener("resize", () => {
  wordList.querySelectorAll(".dictionary-popover").forEach((popover) => {
    if (window.getComputedStyle(popover).display !== "none") {
      dictionaryPopoverPositioners.get(popover)?.();
    }
  });
});
document.addEventListener("selectionchange", () => {
  if (document.activeElement === input) {
    renderRackTiles();
  }
});
wordBreakdown.addEventListener("toggle", () => {
  if (wordBreakdown.open) {
    renderWordBreakdown();
  } else {
    breakdownCharts.replaceChildren();
  }
});
function focusRackInput() {
  window.scrollTo({ top: 0, behavior: "auto" });
  const focusModePanel = input.closest("[data-focus-mode].is-focus-mode");
  if (focusModePanel) {
    focusModePanel.scrollTo({ top: 0, behavior: "auto" });
  }
  input.focus({ preventScroll: true });
  const cursorPosition = input.value.length;
  input.setSelectionRange(cursorPosition, cursorPosition);
}
form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey) || button.disabled) {
    return;
  }

  event.preventDefault();
  form.requestSubmit(button);
  requestAnimationFrame(focusRackInput);
});
document.addEventListener("keydown", (event) => {
  if (event.repeat || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.key.toLowerCase() !== "l") {
    return;
  }

  event.preventDefault();
  const shouldOpen = !pickListPanel.open;
  pickListPanel.open = shouldOpen;

  if (!shouldOpen) {
    pickListPanel.querySelector("summary")?.focus({ preventScroll: true });
    return;
  }

  renderPickList();
  requestAnimationFrame(() => {
    pickListPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    focusPickListPanel();
  });
}, { capture: true });
document.addEventListener("keydown", (event) => {
  if (
    event.repeat ||
    event.key.toLowerCase() !== "i" ||
    (!event.ctrlKey && !event.metaKey) ||
    event.altKey ||
    event.shiftKey
  ) {
    return;
  }

  event.preventDefault();
  focusRackInput();
});
document.addEventListener("keydown", (event) => {
  const keyMatches = event.key.toLowerCase() === "h";
  const windowsShortcut = keyMatches && event.ctrlKey && !event.metaKey && !event.shiftKey;
  const macShortcut = keyMatches && event.metaKey && event.shiftKey && !event.ctrlKey;

  if (event.repeat || event.altKey || (!windowsShortcut && !macShortcut)) {
    return;
  }

  event.preventDefault();
  const shouldOpen = !historyPanel.open;
  historyPanel.open = shouldOpen;

  if (!shouldOpen) {
    historyPanelSummary.focus({ preventScroll: true });
    return;
  }

  renderHistoryPanel();
  requestAnimationFrame(() => {
    historyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    focusHistoryPanelEntry(0);
  });
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
  const shouldOpen = !wordBreakdown.open;
  wordBreakdown.open = shouldOpen;

  if (!shouldOpen) {
    breakdownSummary.focus({ preventScroll: true });
    return;
  }

  renderWordBreakdown();
  requestAnimationFrame(() => {
    breakdownSummary.focus({ preventScroll: true });
    wordBreakdown.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
function resetBasicFilters() {
  wordLengthInput.value = "0";
  startsWithInput.value = "";
  endsWithInput.value = "";
  mustIncludeInput.value = "";
  excludeLettersInput.value = "";
  syncSectionFilterResetButtons();
  clearMessage();
}

function resetAdvancedFilters() {
  highValueOnlyInput.checked = false;
  minimumVowelsInput.value = "0";
  minimumConsonantsInput.value = "0";
  minimumScoreInput.value = "";
  maximumScoreInput.value = "";
  hookFilterInputs.forEach((option) => {
    option.checked = option.value === "";
  });
  syncSectionFilterResetButtons();
  clearMessage();
}

function resetAll() {
  input.value = "";
  renderRackTiles();
  resetBasicFilters();
  resetAdvancedFilters();
  historyEntries = HistoryStore.clear();
  historyPanelFocusIndex = -1;
  pickListEntries = PickListStore.clear();
  pickListHookCache.clear();
  renderAllHistory();
  renderAllPickList();
  clearResults();
  resultsHeading.textContent = "Ready when you are";
}

function openResetConfirmation() {
  resetConfirmReturnFocus = document.activeElement;
  resetConfirmBackdrop.hidden = false;
  resetConfirmCancel.focus({ preventScroll: true });
}

function closeResetConfirmation({ focusInput = false } = {}) {
  resetConfirmBackdrop.hidden = true;

  if (focusInput) {
    input.focus({ preventScroll: true });
  } else {
    resetConfirmReturnFocus?.focus?.({ preventScroll: true });
  }

  resetConfirmReturnFocus = null;
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
  openResetConfirmation();
});
resetAllButton.addEventListener("click", openResetConfirmation);
resetConfirmCancel.addEventListener("click", () => closeResetConfirmation());
resetConfirmOk.addEventListener("click", () => {
  resetAll();
  closeResetConfirmation({ focusInput: true });
});
resetConfirmBackdrop.addEventListener("click", (event) => {
  if (event.target === resetConfirmBackdrop) {
    closeResetConfirmation();
  }
});
resetConfirmModal.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeResetConfirmation();
  } else if (event.key === "Tab") {
    event.preventDefault();
    const focusCancel = event.shiftKey
      ? document.activeElement !== resetConfirmCancel
      : document.activeElement === resetConfirmOk;
    (focusCancel ? resetConfirmCancel : resetConfirmOk).focus();
  }
});
resetBasicFiltersButton.addEventListener("click", resetBasicFilters);
resetAdvancedFiltersButton.addEventListener("click", resetAdvancedFilters);
syncSectionFilterResetButtons();
renderAllHistory();
renderAllPickList();
renderRackTiles();
window.addEventListener("DOMContentLoaded", loadManifest, { once: true });
