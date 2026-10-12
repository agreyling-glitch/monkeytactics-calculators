"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { setImmediate: tick } = require("node:timers/promises");
const HistoryStore = require("../assets/js/tools/word-unscrambler/history-store.js");
const PickListStore = require("../assets/js/tools/word-unscrambler/pick-list-store.js");
const InputRules = require("../assets/js/tools/word-unscrambler/input-rules.js");

const mainSource = fs.readFileSync(path.join(__dirname, "../assets/js/tools/word-unscrambler/word-unscrambler.js"), "utf8");

// Exercise the production functions without initializing the whole page. The
// source uses column-zero closing braces for top-level function declarations.
function extract(name) {
  const declaration = new RegExp(`^(?:async )?function ${name}\\(`, "m").exec(mainSource);
  assert.ok(declaration, `Missing production function: ${name}`);
  const end = mainSource.indexOf("\n}", declaration.index) + 2;
  assert.ok(end > declaration.index);
  return mainSource.slice(declaration.index, end);
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function control(value = "") {
  return { value, checked: false, focus() { this.focused = true; } };
}

function session({ fetchWords = async () => {}, search = async () => ["cat"] } = {}) {
  const saved = storage();
  HistoryStore.add({ id: "saved-search", timestamp: 1, rack: "RETAINS", pinned: true }, saved);
  PickListStore.add({ id: "saved-pick", timestamp: 1, word: "CAT", score: 5 }, saved);
  const rendered = [];
  const messages = [];
  const queries = [];
  const context = {
    InputRules, IS_WWF: true, DICTIONARY_BITS: { enable: 1, expanded: 2, both: 3 },
    input: control("CA?"), useBoardLetters: control(), boardPatternInput: control(), boardPatternFields: { hidden: true },
    startsWithInput: control(), endsWithInput: control(), mustIncludeInput: control(), excludeLettersInput: control(),
    wordLengthInput: control("0"), minimumVowelsInput: control("0"), minimumConsonantsInput: control("0"),
    minimumScoreInput: control(), maximumScoreInput: control(), highValueOnlyInput: control(),
    sortResultsInput: control("score-desc"), dictionaryInputs: [{ value: "enable", checked: true }],
    hookFilterInputs: [{ value: "", checked: true }, { value: "s", checked: false }],
    searchRevision: 0, pendingHistorySearch: false, button: { disabled: false }, buttonLabel: { textContent: "Unscramble" },
    playRefill: null,
    results: { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } },
    resultsHeading: { textContent: "Ready when you are" },
    historyEntries: HistoryStore.read(saved), pickListEntries: PickListStore.read(saved),
    HistoryStore: { ...HistoryStore, add: (entry) => HistoryStore.add(entry, saved), clear: () => HistoryStore.clear(saved) },
    PickListStore: { ...PickListStore, clear: () => PickListStore.clear(saved) },
    clearResults() { rendered.length = 0; }, clearMessage() { messages.length = 0; },
    showMessage: (message) => messages.push(message), setEmptyState() {}, focusFilterInput(input) { input.focus(); },
    renderSearchConflict(conflict) { messages.push(conflict.message); context.resultsHeading.textContent = conflict.title; },
    renderMatches: (...args) => rendered.push(args), renderRackTiles() {}, syncSectionFilterResetButtons() {},
    closeHistoryDropdown() {}, renderAllHistory() {}, getHistoryEntropy: () => 0.5, getHistoryLeaveValue: () => 50,
    runPendingHistorySearch() {}, console: { error: (...args) => messages.push(args.join(" ")) },
    loadAllChunks: fetchWords, loadRelevantChunks: fetchWords,
    findMatches: (...args) => { queries.push(args); return search(...args); }
  };
  vm.createContext(context);
  vm.runInContext([
    "parseSmartInput", "getCurrentFilters", "restoreFilters", "saveHistoryEntry", "getSearchConflict", "getSelectedDictionary", "handleSubmit",
    "resetBasicFilters", "resetAdvancedFilters", "resetAll"
  ].map(extract).join("\n"), context);
  return { context, saved, rendered, messages, queries, submit: () => context.handleSubmit({ preventDefault() {} }) };
}

function sectionResetSession(options) {
  const fixture = session(options);
  const { context } = fixture;
  const submissions = [];
  context.form = {
    requestSubmit(button) {
      assert.equal(button, context.button);
      submissions.push(fixture.submit());
    }
  };
  for (const name of ["resetBasicFiltersButton", "resetAdvancedFiltersButton"]) {
    const listeners = new Map();
    context[name] = {
      addEventListener(type, handler) { listeners.set(type, handler); },
      click() {
        assert.ok(listeners.has("click"), `${name} must have a click listener`);
        listeners.get("click")();
      }
    };
    const registration = new RegExp(`^${name}\\.addEventListener\\("click", \\(\\) => \\{[\\s\\S]*?^\\}\\);`, "m").exec(mainSource);
    assert.ok(registration, `Missing production click listener: ${name}`);
    vm.runInContext(registration[0], context);
  }
  vm.runInContext(["rerunCurrentSearch", "runPendingHistorySearch"].map(extract).join("\n"), context);
  return { ...fixture, submissions };
}

test("Basic Filters Reset click clears a conflicting length and reruns the board search without clearing other state", async () => {
  const f = sectionResetSession({ search: async (_rack, options) => options.wordLength === 2 ? [] : ["cat"] });
  const c = f.context;
  c.input.value = "CT";
  c.useBoardLetters.checked = true;
  c.boardPatternInput.value = "?A?";
  c.boardPatternFields.hidden = false;
  c.wordLengthInput.value = "2";
  c.startsWithInput.value = "C";
  c.endsWithInput.value = "T";
  c.mustIncludeInput.value = "A";
  c.excludeLettersInput.value = "Z";
  c.minimumScoreInput.value = "5";
  const picksBefore = f.saved.getItem(PickListStore.STORAGE_KEY);
  await f.submit();
  assert.equal(f.rendered.length, 0);
  assert.equal(f.queries.length, 0);
  assert.match(f.messages[0], /3.*2/);

  c.resetBasicFiltersButton.click();
  await Promise.all(f.submissions);

  assert.equal(c.wordLengthInput.value, "0");
  for (const name of ["startsWithInput", "endsWithInput", "mustIncludeInput", "excludeLettersInput"]) assert.equal(c[name].value, "", name);
  assert.equal(c.input.value, "CT");
  assert.equal(c.boardPatternInput.value, "?A?");
  assert.equal(c.useBoardLetters.checked, true);
  assert.equal(c.boardPatternFields.hidden, false);
  assert.equal(c.minimumScoreInput.value, "5");
  assert.equal(f.queries.length, 1);
  assert.equal(f.queries[0][1].wordLength, 0);
  assert.equal(f.queries[0][1].boardPattern, "?a?");
  assert.equal(f.queries[0][1].minimumScore, 5);
  assert.deepEqual(f.rendered[0][1], ["cat"]);
  assert.ok(HistoryStore.read(f.saved).some((entry) => entry.id === "saved-search"));
  assert.equal(f.saved.getItem(PickListStore.STORAGE_KEY), picksBefore);
});

test("Advanced Filters Reset click clears only advanced controls and reruns with basic and board filters intact", async () => {
  const f = sectionResetSession();
  const c = f.context;
  c.input.value = "CT";
  c.useBoardLetters.checked = true;
  c.boardPatternInput.value = "?A?";
  c.boardPatternFields.hidden = false;
  c.wordLengthInput.value = "3";
  c.startsWithInput.value = "C";
  c.highValueOnlyInput.checked = true;
  c.minimumVowelsInput.value = "2";
  c.minimumConsonantsInput.value = "3";
  c.minimumScoreInput.value = "10";
  c.maximumScoreInput.value = "20";
  c.hookFilterInputs[0].checked = false;
  c.hookFilterInputs[1].checked = true;

  c.resetAdvancedFiltersButton.click();
  await Promise.all(f.submissions);

  assert.equal(c.highValueOnlyInput.checked, false);
  assert.equal(c.minimumVowelsInput.value, "0");
  assert.equal(c.minimumConsonantsInput.value, "0");
  assert.equal(c.minimumScoreInput.value, "");
  assert.equal(c.maximumScoreInput.value, "");
  assert.equal(c.hookFilterInputs.find((option) => option.checked).value, "");
  assert.equal(c.input.value, "CT");
  assert.equal(c.useBoardLetters.checked, true);
  assert.equal(c.boardPatternInput.value, "?A?");
  assert.equal(c.boardPatternFields.hidden, false);
  assert.equal(c.wordLengthInput.value, "3");
  assert.equal(c.startsWithInput.value, "c");
  assert.equal(f.queries.length, 1);
  assert.equal(f.queries[0][1].boardPattern, "?a?");
  assert.equal(f.queries[0][1].wordLength, 3);
  assert.equal(f.queries[0][1].startsWith, "c");
  assert.equal(f.queries[0][1].highValueOnly, false);
  assert.equal(f.queries[0][1].minimumScore, null);
  assert.equal(f.queries[0][1].maximumScore, null);
  assert.equal(f.queries[0][1].hookFilter, "");
});

test("Basic Filters Reset during a pending search queues a rerun with the cleared controls", async () => {
  const searching = deferred();
  const f = sectionResetSession({ search: (_rack, options) => options.wordLength === 3 ? searching.promise : Promise.resolve(["cat"]) });
  const c = f.context;
  c.input.value = "CT";
  c.useBoardLetters.checked = true;
  c.boardPatternInput.value = "?A?";
  c.wordLengthInput.value = "3";
  const pending = f.submit();
  await tick();
  assert.equal(c.button.disabled, true);

  c.resetBasicFiltersButton.click();

  assert.equal(c.wordLengthInput.value, "0");
  assert.equal(c.pendingHistorySearch, true);
  assert.equal(f.queries.length, 1);
  assert.equal(f.submissions.length, 0);
  searching.resolve([]);
  await pending;
  await Promise.all(f.submissions);
  assert.equal(f.submissions.length, 1);
  assert.equal(f.queries.length, 2);
  assert.equal(f.queries[1][1].wordLength, 0);
  assert.equal(f.queries[1][1].boardPattern, "?a?");
  assert.deepEqual(f.rendered[0][1], ["cat"]);
  assert.equal(c.pendingHistorySearch, false);
  assert.equal(c.button.disabled, false);
});

test("Clear search clears rack, board mode and filters while preserving saved history and picks", () => {
  const { context: c, saved } = session();
  c.useBoardLetters.checked = true;
  c.boardPatternInput.value = "?A?";
  c.boardPatternFields.hidden = false;
  for (const name of ["startsWithInput", "endsWithInput", "mustIncludeInput", "excludeLettersInput"]) c[name].value = "A";
  for (const name of ["wordLengthInput", "minimumVowelsInput", "minimumConsonantsInput", "minimumScoreInput", "maximumScoreInput"]) c[name].value = "3";
  c.highValueOnlyInput.checked = true;
  c.hookFilterInputs[0].checked = false;
  c.hookFilterInputs[1].checked = true;
  c.pendingHistorySearch = true;
  c.button.disabled = true;
  const historyBefore = saved.getItem(HistoryStore.STORAGE_KEY);
  const picksBefore = saved.getItem(PickListStore.STORAGE_KEY);
  const historyEntries = c.historyEntries;
  const pickListEntries = c.pickListEntries;

  c.resetAll();

  assert.equal(c.input.value, "");
  assert.equal(c.boardPatternInput.value, "");
  assert.equal(c.useBoardLetters.checked, false);
  assert.equal(c.boardPatternFields.hidden, true);
  for (const name of ["startsWithInput", "endsWithInput", "mustIncludeInput", "excludeLettersInput", "minimumScoreInput", "maximumScoreInput"]) assert.equal(c[name].value, "", name);
  for (const name of ["wordLengthInput", "minimumVowelsInput", "minimumConsonantsInput"]) assert.equal(c[name].value, "0", name);
  assert.equal(c.highValueOnlyInput.checked, false);
  assert.equal(c.hookFilterInputs.find((option) => option.checked).value, "");
  assert.equal(c.searchRevision, 1);
  assert.equal(c.pendingHistorySearch, false);
  assert.equal(c.button.disabled, false);
  assert.equal(c.results.attributes["aria-busy"], "false");
  assert.equal(c.input.focused, true);
  assert.equal(c.historyEntries, historyEntries);
  assert.equal(c.pickListEntries, pickListEntries);
  assert.equal(saved.getItem(HistoryStore.STORAGE_KEY), historyBefore);
  assert.equal(saved.getItem(PickListStore.STORAGE_KEY), picksBefore);
});

test("Clear search during dictionary loading prevents stale worker requests, results and history", async () => {
  const loading = deferred();
  const f = session({ fetchWords: () => loading.promise });
  const pending = f.submit();
  assert.equal(f.context.button.disabled, true);
  f.context.resetAll();
  loading.resolve();
  await pending;
  assert.equal(f.queries.length, 0);
  assert.equal(f.rendered.length, 0);
  assert.equal(HistoryStore.read(f.saved).length, 1);
  assert.equal(f.context.resultsHeading.textContent, "Ready when you are");
  assert.equal(f.context.button.disabled, false);
});

test("a cancelled worker result cannot render, save history or end a newer pending search", async () => {
  const older = deferred();
  const newer = deferred();
  const f = session({ search: (rack) => rack === "ca?" ? older.promise : newer.promise });
  const first = f.submit();
  await tick();
  assert.equal(f.queries.length, 1);
  f.context.resetAll();
  f.context.input.value = "DOG";
  const second = f.submit();
  await tick();
  older.resolve(["cat"]);
  await first;
  assert.equal(f.rendered.length, 0);
  assert.equal(HistoryStore.read(f.saved).length, 1);
  assert.equal(f.context.button.disabled, true);
  assert.equal(f.context.results.attributes["aria-busy"], "true");
  newer.resolve(["dog"]);
  await second;
  assert.equal(f.rendered.length, 1);
  assert.deepEqual(f.rendered[0][1], ["dog"]);
  assert.equal(HistoryStore.read(f.saved).find((entry) => entry.rack === "DOG").resultCount, 1);
  assert.equal(HistoryStore.read(f.saved).some((entry) => entry.rack === "CA?"), false);
  assert.equal(f.context.button.disabled, false);
});

test("a stale worker failure after Clear search does not replace the cleared view with an error", async () => {
  const search = deferred();
  const f = session({ search: () => search.promise });
  const pending = f.submit();
  await tick();
  f.context.resetAll();
  search.reject(new Error("Worker stopped"));
  await pending;
  assert.deepEqual(f.messages, []);
  assert.equal(f.context.resultsHeading.textContent, "Ready when you are");
  assert.equal(f.context.results.attributes["aria-busy"], "false");
});

test("an enabled but empty board field searches the rack in both solvers", async () => {
  for (const isWwf of [false, true]) {
    for (const boardInput of ["", " \t\n "]) {
      const f = session({ search: async () => ["example"] });
      const c = f.context;
      c.IS_WWF = isWwf;
      c.input.value = "EXAMPLE?";
      c.useBoardLetters.checked = true;
      c.boardPatternInput.value = boardInput;
      c.boardPatternFields.hidden = false;

      await f.submit();

      assert.equal(f.queries.length, 1, `Search should run with board input ${JSON.stringify(boardInput)}`);
      assert.equal(f.queries[0][0], "example?");
      assert.equal(f.queries[0][1].boardPattern, "");
      assert.equal(f.queries[0][1].scoring, isWwf ? "wwf" : "scrabble");
      assert.equal(f.queries[0][1].unrestricted, false);
      assert.deepEqual(f.rendered[0][1], ["example"]);
      assert.deepEqual(f.messages, []);
      assert.equal(c.useBoardLetters.checked, true, "Keep the optional board input available");
      assert.equal(c.boardPatternFields.hidden, false);
    }
  }
});

test("an empty enabled board field does not block unrestricted inline searches", async () => {
  for (const boardInput of ["", "   "]) {
    const f = session({ search: async () => ["qi"] });
    const c = f.context;
    c.input.value = "*:2 / Q*";
    c.useBoardLetters.checked = true;
    c.boardPatternInput.value = boardInput;

    await f.submit();

    assert.equal(f.queries.length, 1);
    assert.equal(f.queries[0][1].boardPattern, "");
    assert.equal(f.queries[0][1].pattern, "q*");
    assert.equal(f.queries[0][1].wordLength, 2);
    assert.equal(f.queries[0][1].unrestricted, true);
    assert.equal(f.queries[0][2], true);
    assert.deepEqual(f.rendered[0][1], ["qi"]);
    assert.deepEqual(f.messages, []);
  }
});

test("nonempty invalid board patterns and unrestricted racks with board letters still fail validation", async () => {
  for (const [rack, boardInput] of [
    ["CT", "???"], ["CT", "CAT"], ["CT", "?A*"], ["CT", "?A1"], ["*:3", "?A?"]
  ]) {
    const f = session();
    const c = f.context;
    c.input.value = rack;
    c.useBoardLetters.checked = true;
    c.boardPatternInput.value = boardInput;

    await f.submit();

    assert.equal(f.queries.length, 0, `${rack} with ${boardInput} must not reach the search engine`);
    assert.equal(f.rendered.length, 0);
    assert.match(f.messages[0], /Board mode needs/);
    assert.equal(c.boardPatternInput.focused, true);
  }
});

test("active filters omit empty board input while retaining actual board patterns", () => {
  const { context: c } = session();
  const dom = fakeDocument();
  c.document = dom.document;
  c.document.querySelectorAll = () => [];
  c.activeFilters = new dom.Element("div");
  Object.defineProperty(c.activeFilters, "childElementCount", { get() { return this.children.length; } });
  c.useBoardLetters.checked = true;
  vm.runInContext(extract("renderActiveFilters"), c);

  for (const boardInput of ["", " \t "]) {
    c.boardPatternInput.value = boardInput;
    c.renderActiveFilters();
    assert.deepEqual(c.activeFilters.children.map((chip) => chip.textContent), []);
    assert.equal(c.activeFilters.hidden, true);
  }

  c.boardPatternInput.value = " ?a? ";
  c.renderActiveFilters();
  assert.deepEqual(c.activeFilters.children.map((chip) => chip.textContent), ["Board: ?A? ×"]);
  assert.equal(c.activeFilters.hidden, false);

  c.useBoardLetters.checked = false;
  c.renderActiveFilters();
  assert.equal(c.activeFilters.hidden, true);
});

test("board searches preserve board filters through search history and form restoration", async () => {
  const f = session();
  f.context.input.value = "CT";
  f.context.useBoardLetters.checked = true;
  f.context.boardPatternInput.value = "?A?";
  await f.submit();
  assert.equal(f.queries[0][0], "ct");
  assert.equal(f.queries[0][1].boardPattern, "?a?");
  const entry = HistoryStore.read(f.saved).find((entry) => entry.rack === "CT");
  const restored = HistoryStore.getRestoredState(entry);
  assert.equal(restored.inputValue, "CT");
  assert.equal(restored.filters.useBoardLetters, true);
  assert.equal(restored.filters.boardPattern, "?A?");
  assert.ok(HistoryStore.getActiveFilters(restored.filters).includes("Board: ?A?"));
  f.context.resetAll();
  f.context.restoreFilters(restored.filters);
  assert.equal(f.context.boardPatternInput.value, "?A?");
  assert.equal(f.context.useBoardLetters.checked, true);
  assert.equal(f.context.boardPatternFields.hidden, false);
});

test("saved picks retain blank-adjusted score and rack/board context after read and note updates", () => {
  const saved = storage();
  const context = { rack: "c?", boardPattern: "?a?", blankPositions: [2], boardPositions: [1], bingo: false, scoreKind: "rack" };
  PickListStore.add({ id: "board-pick", timestamp: 1, word: "cat", score: 5, ...context }, saved);
  let pick = PickListStore.read(saved)[0];
  assert.equal(pick.word, "CAT");
  assert.equal(pick.score, 5);
  assert.equal(pick.rack, "C?");
  assert.equal(pick.boardPattern, "?A?");
  assert.deepEqual(pick.blankPositions, [2]);
  assert.deepEqual(pick.boardPositions, [1]);
  assert.equal(pick.scoreKind, "rack");
  PickListStore.updateNote("cat", "Blank T; play through A", saved);
  pick = PickListStore.read(saved)[0];
  assert.equal(pick.note, "Blank T; play through A");
  assert.equal(pick.score, 5);
  assert.equal(pick.rack, "C?");
  assert.deepEqual(pick.blankPositions, [2]);
  assert.deepEqual(pick.boardPositions, [1]);
});

function fakeDocument() {
  const nodes = [];
  const listeners = new Map();
  const registrations = new Map();
  class Element {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.attributes = {};
      this.dataset = {};
      this.listeners = new Map();
      this.style = { setProperty() {} };
      this.isConnected = true;
      const updateClasses = (add, remove) => {
        const classes = new Set((this.className || "").split(" ").filter(Boolean));
        for (const name of remove) classes.delete(name);
        for (const name of add) classes.add(name);
        this.className = [...classes].join(" ");
      };
      this.classList = {
        add: (...names) => updateClasses(names, []),
        remove: (...names) => updateClasses([], names),
        toggle: (name, enabled) => updateClasses(enabled ? [name] : [], enabled ? [] : [name]),
        contains: (name) => (this.className || "").split(" ").includes(name)
      };
      nodes.push(this);
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(...children) { for (const child of children) { this.children.push(child); if (typeof child === "object") child.parent = this; } }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    getBoundingClientRect() { return { left: 20, top: 20, bottom: 40, width: 200, height: 120 }; }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    replaceWith(node) { this.parent.children.splice(this.parent.children.indexOf(this), 1, node); }
    contains(node) { for (let cursor = node; cursor; cursor = cursor.parent) if (cursor === this) return true; return false; }
    closest(selector) { for (let cursor = this; cursor; cursor = cursor.parent) if (selector === "dialog[open]" && cursor.tagName === "dialog" && cursor.open) return cursor; return null; }
    focus() {
      const previous = document.activeElement;
      document.activeElement = this;
      if (previous === this) return;
      for (let cursor = previous; cursor; cursor = cursor.parent) cursor.listeners.get("focusout")?.({ target: previous, relatedTarget: this });
      for (let cursor = this; cursor; cursor = cursor.parent) cursor.listeners.get("focusin")?.({ target: this, relatedTarget: previous });
    }
  }
  const document = {
    createElement: (name) => new Element(name),
    listeners, registrations, activeElement: null,
    addEventListener(type, handler) { listeners.set(type, handler); registrations.set(type, (registrations.get(type) || 0) + 1); }
  };
  return { nodes, Element, document };
}

function popoverSession({ hover = true } = {}) {
  const fixture = fakeDocument();
  const timers = new Map();
  let nextTimer = 0;
  const context = {
    document: fixture.document, queueMicrotask,
    window: { matchMedia: () => ({ matches: hover }), addEventListener() {} },
    setTimeout(callback) { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    dictionaryPopoverState: { active: null, nextId: 0, listening: false }
  };
  vm.createContext(context);
  vm.runInContext(extract("createWordPopoverController"), context);
  const create = () => {
    const lookup = new fixture.Element("div");
    const trigger = new fixture.Element("button");
    const popover = new fixture.Element("div");
    const close = new fixture.Element("button");
    let opens = 0;
    popover.append(close);
    lookup.append(trigger, popover);
    context.createWordPopoverController(trigger, popover, lookup, close, () => { opens += 1; }, () => {});
    return { lookup, trigger, popover, close, get opens() { return opens; } };
  };
  return { ...fixture, context, create, flushTimers() { for (const callback of timers.values()) callback(); timers.clear(); } };
}

test("word details stay pinned after click and dismiss with Close or Escape without immediately reopening", async () => {
  const f = popoverSession();
  const card = f.create();
  assert.equal(card.popover.hidden, true);
  assert.equal(card.trigger.attributes["aria-expanded"], "false");
  assert.equal(card.trigger.attributes["aria-controls"], card.popover.id);
  card.trigger.listeners.get("mouseenter")();
  assert.equal(card.popover.hidden, false);
  card.trigger.listeners.get("click")();
  assert.equal(f.document.activeElement, card.popover);
  card.lookup.listeners.get("mouseleave")();
  f.flushTimers();
  assert.equal(card.popover.hidden, false);
  card.close.listeners.get("click")();
  assert.equal(card.popover.hidden, true);
  assert.equal(card.trigger.attributes["aria-expanded"], "false");
  assert.equal(f.document.activeElement, card.trigger);
  card.lookup.listeners.get("focusin")({ relatedTarget: card.popover });
  assert.equal(card.popover.hidden, true, "focus restored to the trigger must not reopen dismissed content");
  card.trigger.listeners.get("click")();
  let prevented = false;
  f.document.listeners.get("keydown")({ key: "Escape", target: card.popover, preventDefault() { prevented = true; } });
  await tick();
  assert.equal(prevented, true);
  assert.equal(card.popover.hidden, true);
  assert.equal(f.document.activeElement, card.trigger);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "../assets/css/tools/word-unscrambler.css"), "utf8"), /\.word-label:hover\s*\+\s*\.dictionary-popover|\.word-lookup:focus-within\s+\.dictionary-popover/);
});

test("only one word detail opens; pinned content ignores incidental hover and outside clicks dismiss it", () => {
  const f = popoverSession();
  const first = f.create();
  const second = f.create();
  first.trigger.listeners.get("click")();
  second.trigger.listeners.get("mouseenter")();
  assert.equal(first.popover.hidden, false);
  assert.equal(second.popover.hidden, true);
  second.trigger.listeners.get("click")();
  assert.equal(first.popover.hidden, true);
  assert.equal(second.popover.hidden, false);
  f.document.listeners.get("pointerdown")({ target: new f.Element("button") });
  assert.equal(second.popover.hidden, true);
  assert.equal(f.document.registrations.get("pointerdown"), 1);
  assert.equal(f.document.registrations.get("keydown"), 1);
  assert.notEqual(first.popover.id, second.popover.id);
});

test("hover details close after leaving, stay open while moving into content, and keyboard focus can reopen them", async () => {
  const f = popoverSession();
  const card = f.create();
  card.trigger.listeners.get("mouseenter")();
  card.lookup.listeners.get("mouseleave")();
  card.popover.listeners.get("mouseenter")();
  f.flushTimers();
  assert.equal(card.popover.hidden, false);
  card.lookup.listeners.get("mouseleave")();
  f.flushTimers();
  assert.equal(card.popover.hidden, true);
  new f.Element("button").focus();
  card.trigger.focus();
  // A fresh focus entry after a hover dismissal should expose the dialog.
  assert.equal(card.popover.hidden, false);
  new f.Element("button").focus();
  await tick();
  assert.equal(card.popover.hidden, true);
});

test("touch devices open word details on tap instead of synthetic hover", () => {
  const f = popoverSession({ hover: false });
  const card = f.create();
  card.trigger.listeners.get("mouseenter")();
  assert.equal(card.popover.hidden, true);
  card.trigger.listeners.get("click")();
  assert.equal(card.popover.hidden, false);
  assert.equal(f.document.activeElement, card.popover);
});

test("a pointer focus transition through BODY does not dismiss pinned details before Hooks receives its click", async () => {
  const f = popoverSession();
  const card = f.create();
  const hooks = new f.Element("summary");
  card.popover.append(hooks);
  card.trigger.listeners.get("click")();
  card.popover.listeners.get("pointerdown")();
  f.document.listeners.get("pointerdown")({ target: hooks });
  f.document.activeElement = new f.Element("body");
  card.lookup.listeners.get("focusout")({ target: card.popover, relatedTarget: null });
  await tick();
  assert.equal(card.popover.hidden, false);
  hooks.focus();
  assert.equal(card.popover.hidden, false);
  assert.equal(card.trigger.attributes["aria-expanded"], "true");
});

test("Escape restores focus without reopening when hiding the dialog synchronously blurs it to BODY", () => {
  const f = popoverSession();
  const card = f.create();
  const body = new f.Element("body");
  let hidden = card.popover.hidden;
  Object.defineProperty(card.popover, "hidden", {
    get: () => hidden,
    set(value) {
      hidden = value;
      if (value && card.popover.contains(f.document.activeElement)) f.document.activeElement = body;
    }
  });
  card.trigger.listeners.get("click")();
  f.document.listeners.get("keydown")({ key: "Escape", target: card.popover, preventDefault() {} });
  assert.equal(card.popover.hidden, true);
  assert.equal(card.trigger.attributes["aria-expanded"], "false");
  assert.equal(f.document.activeElement, card.trigger);
});

for (const opener of ["mouseenter", "focusin"]) {
test(`ordinary result cards defer source membership and rack-leave analysis until ${opener} and load each once`, async () => {
  const { nodes, Element, document } = fakeDocument();
  let leavesRequested = 0;
  let hooksRequested = 0;
  let definitionsRequested = 0;
  let fullDictionariesRequested = 0;
  const sourceLoads = [];
  const sourceLookups = [];
  const sourceLoading = deferred();
  const leave = deferred();
  const context = {
    document, window: { innerWidth: 1000, innerHeight: 800, matchMedia: () => ({ matches: true }), addEventListener() {} },
    queueMicrotask, setTimeout, clearTimeout, dictionaryPopoverState: { active: null, nextId: 0, listening: false },
    IS_WWF: true, offlineModeEnabled: false, dictionaryPopoverPositioners: new WeakMap(),
    DICTIONARY_BITS: { enable: 1, expanded: 2, both: 3 },
    Dictionary: { loadRelevant(letter, bit) { sourceLoads.push({ letter, bit }); return sourceLoading.promise; } },
    SearchEngine: { async dictionaryMembership(word) { sourceLookups.push(word); return 3; } },
    getPlayAnalysis: () => ({ score: 5, blankPositions: [2], boardPositions: [], bingo: false }),
    getHighValueLetters: () => "", isWordPicked: () => false, appendHighlightedWord: (node) => { node.textContent = "CAT"; },
    createRackLeave: () => { leavesRequested += 1; return leave.promise; },
    loadAllChunks: async () => { fullDictionariesRequested += 1; }, getHookInfo: async () => { hooksRequested += 1; return { front: [], back: [] }; },
    DefinitionService: { lookup: async () => { definitionsRequested += 1; return { entries: [] }; } },
    console
  };
  vm.createContext(context);
  vm.runInContext(["createDictionarySource", "createWordPopoverController", "createWordItem"].map(extract).join("\n"), context);
  const card = context.createWordItem("cat", "ca?", { dictionaryBit: 1, showHooks: false });
  assert.equal(card.className, "word-card");
  assert.equal(leavesRequested, 0);
  assert.equal(hooksRequested, 0);
  assert.equal(definitionsRequested, 0);
  assert.equal(sourceLoads.length, 0);
  assert.equal(sourceLookups.length, 0);
  const popover = nodes.find((node) => node.className === "dictionary-popover");
  assert.equal(popover.children[1].className, "dictionary-source");
  const label = nodes.find((node) => node.className === "word-label");
  const wordLookup = nodes.find((node) => node.className === "word-lookup");
  (opener === "mouseenter" ? label : wordLookup).listeners.get(opener)();
  assert.equal(leavesRequested, 1);
  assert.deepEqual(sourceLoads, [{ letter: "c", bit: 3 }]);
  label.listeners.get("mouseenter")();
  label.listeners.get("mouseenter")();
  wordLookup.listeners.get("focusin")();
  assert.equal(leavesRequested, 1);
  assert.deepEqual(sourceLoads, [{ letter: "c", bit: 3 }]);
  assert.equal(sourceLookups.length, 0);
  sourceLoading.resolve();
  leave.resolve(new Element("div"));
  await tick();
  label.listeners.get("mouseenter")();
  wordLookup.listeners.get("focusin")();
  await tick();
  assert.equal(leavesRequested, 1);
  assert.equal(hooksRequested, 0);
  assert.equal(fullDictionariesRequested, 0);
  assert.equal(definitionsRequested, 1);
  assert.equal(sourceLoads.length, 1);
  assert.deepEqual(sourceLookups, ["cat"]);
  const hookLookup = nodes.find((node) => node.className === "hook-lookup");
  assert.equal(hookLookup.tagName, "details");
  hookLookup.open = true;
  hookLookup.listeners.get("toggle")();
  hookLookup.listeners.get("toggle")();
  await tick();
  assert.equal(hooksRequested, 1);
  assert.equal(fullDictionariesRequested, 1);
  hookLookup.open = false;
  hookLookup.listeners.get("toggle")();
  hookLookup.open = true;
  hookLookup.listeners.get("toggle")();
  await tick();
  assert.equal(hooksRequested, 1);
  assert.equal(fullDictionariesRequested, 1);
});
}

test("hooks show a retry action after a failed explicit expansion and cache a successful retry", async () => {
  const { nodes, document } = fakeDocument();
  const requestedBits = [];
  let hookLookups = 0;
  const context = {
    document, console: { error() {} },
    window: { innerWidth: 1000, innerHeight: 800, addEventListener() {} },
    dictionaryPopoverState: { active: null, nextId: 0, listening: false },
    dictionaryPopoverPositioners: new WeakMap(),
    IS_WWF: true, offlineModeEnabled: false,
    createDictionarySource: () => ({ element: document.createElement("div"), async load() {} }),
    getPlayAnalysis: () => ({ score: 5, blankPositions: [], boardPositions: [], bingo: false }),
    getHighValueLetters: () => "", isWordPicked: () => false, appendHighlightedWord() {},
    getScrabbleScore: () => 6,
    async loadAllChunks(bit) {
      requestedBits.push(bit);
      if (requestedBits.length === 1) throw new Error("Connection interrupted");
    },
    async getHookInfo(word, bit) {
      assert.equal(word, "cat");
      assert.equal(bit, 2);
      hookLookups += 1;
      return { front: ["s"], back: ["s"] };
    }
  };
  vm.createContext(context);
  vm.runInContext(["createWordPopoverController", "createWordItem"].map(extract).join("\n"), context);
  context.createWordItem("cat", "cat", { dictionaryBit: 2, showHooks: false });
  const hooks = nodes.find((node) => node.className === "hook-lookup");
  const result = nodes.find((node) => node.className === "hook-lookup-result");
  assert.deepEqual(requestedBits, []);
  hooks.open = true;
  hooks.listeners.get("toggle")();
  assert.match(result.textContent, /Loading hooks/);
  await tick();
  assert.match(result.className, /is-error/);
  const retry = nodes.find((node) => node.className === "hook-lookup-retry");
  assert.equal(retry.textContent, "Retry hooks");
  await retry.listeners.get("click")();
  assert.deepEqual(requestedBits, [2, 2]);
  assert.equal(hookLookups, 1);
  assert.equal(result.className, "hook-lookup-result");
  assert.equal(result.children.length, 2);
  assert.equal(result.children[0].children[1], "SCAT (+6)");
  assert.equal(result.children[1].children[1], "CATS (+6)");
  hooks.listeners.get("toggle")();
  await tick();
  assert.deepEqual(requestedBits, [2, 2]);
});

for (const { mask, expected } of [
  { mask: 1, expected: [["enable", "ENABLE"]] },
  { mask: 2, expected: [["expanded", "Expanded"]] },
  { mask: 3, expected: [["enable", "ENABLE"], ["expanded", "Expanded"]] }
]) {
  test(`word source displays actual membership ${mask} after loading both lists regardless of the active dictionary`, async () => {
    for (const selected of ["enable", "expanded", "both"]) {
      const { nodes, document } = fakeDocument();
      const loading = deferred();
      const calls = [];
      const context = {
        document, console,
        DICTIONARY_BITS: { enable: 1, expanded: 2, both: 3 },
        getSelectedDictionary: () => selected,
        Dictionary: { loadRelevant(letter, bit) { calls.push(["load", letter, bit]); return loading.promise; } },
        SearchEngine: { async dictionaryMembership(word) { calls.push(["lookup", word]); return mask; } }
      };
      vm.createContext(context);
      vm.runInContext(extract("createDictionarySource"), context);
      const source = context.createDictionarySource("cat");
      const result = nodes.find((node) => node.className === "dictionary-source-result");
      assert.equal(source.element.className, "dictionary-source");
      assert.ok(source.element.children.some((node) => node.textContent === "Word lists:"));
      assert.equal(result.attributes["aria-live"], "polite");
      assert.deepEqual(calls, []);
      const pending = source.load();
      const duplicate = source.load();
      assert.deepEqual(calls, [["load", "c", 3]]);
      loading.resolve();
      await Promise.all([pending, duplicate]);
      assert.deepEqual(calls, [["load", "c", 3], ["lookup", "cat"]]);
      assert.deepEqual(result.children.map((badge) => [badge.className.split("--").at(-1), badge.textContent]), expected);
      await source.load();
      assert.equal(calls.length, 2);
    }
  });
}

for (const failingStage of ["load", "lookup"]) {
test(`word source ${failingStage} failure shows unavailable and retries when reopened`, async () => {
  const { nodes, document } = fakeDocument();
  let attempts = 0;
  const calls = [];
  const context = {
    document, console: { error() {} },
    DICTIONARY_BITS: { enable: 1, expanded: 2, both: 3 },
    Dictionary: {
      async loadRelevant(letter, bit) {
        calls.push(["load", letter, bit]);
        if (++attempts === 1 && failingStage === "load") throw new Error("Connection interrupted");
      }
    },
    SearchEngine: {
      async dictionaryMembership(word) {
        calls.push(["lookup", word]);
        if (attempts === 1 && failingStage === "lookup") throw new Error("Worker stopped");
        return 2;
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(extract("createDictionarySource"), context);
  const source = context.createDictionarySource("qat");
  const result = nodes.find((node) => node.className === "dictionary-source-result");
  await source.load();
  assert.match(result.textContent, /unavailable/i);
  const failedCalls = failingStage === "load" ? [["load", "q", 3]] : [["load", "q", 3], ["lookup", "qat"]];
  assert.deepEqual(calls, failedCalls);
  await source.load();
  assert.deepEqual(calls, [...failedCalls, ["load", "q", 3], ["lookup", "qat"]]);
  assert.deepEqual(result.children.map((badge) => badge.textContent), ["Expanded"]);
  await source.load();
  assert.equal(attempts, 2);
});
}

test("offline upgrades fetch current navigation HTML and unversioned scripts instead of copying an old shell", async () => {
  const page = "https://monkeytactics.com/tools/words-with-friends-solver";
  const writes = [];
  const downloads = [];
  let cacheReads = 0;
  const stale = new Response("old shell with previous script versions");
  const cache = {
    async match() { cacheReads += 1; return stale; },
    async put(request, response) { writes.push({ url: request.url, text: await response.text() }); }
  };
  const context = {
    URL, Request,
    OFFLINE_VERSION: "20261012-solvers-11",
    location: { href: page, pathname: new URL(page).pathname },
    caches: { async match() { cacheReads += 1; return stale; } },
    async fetch(request) {
      downloads.push(request);
      return new Response(`current contents: ${request.url}`);
    }
  };
  vm.createContext(context);
  vm.runInContext(extract("cacheOfflineUrl"), context);

  for (const url of [page, "https://monkeytactics.com/assets/js/shared/dictionary-offline-controls.js"]) {
    assert.equal(await context.cacheOfflineUrl(cache, url), true);
  }

  assert.equal(cacheReads, 0);
  assert.equal(downloads.length, 2);
  assert.ok(downloads.every((request) => request.cache === "reload" && request.credentials === "same-origin"));
  assert.equal(writes[0].url, page);
  assert.equal(writes[0].text, `current contents: ${page}?offline-update=20261012-solvers-11`);
  assert.ok(downloads.every((request) => new URL(request.url).searchParams.get("offline-update") === "20261012-solvers-11"));
  assert.ok(writes.every((entry) => !entry.text.includes("old shell")));
});

test("offline upgrades reuse versioned dictionary assets from shared or current caches", async () => {
  const page = "https://monkeytactics.com/tools/words-with-friends-solver";
  const writes = [];
  let sharedReads = 0;
  let downloads = 0;
  let currentResponse;
  const cache = {
    async match() { return currentResponse; },
    async put(request, response) { writes.push({ url: request.url, text: await response.text() }); }
  };
  const context = {
    URL, Request,
    location: { href: page, pathname: new URL(page).pathname },
    caches: { async match() { sharedReads += 1; return new Response("verified dictionary asset"); } },
    async fetch() { downloads += 1; return new Response("downloaded dictionary asset"); }
  };
  vm.createContext(context);
  vm.runInContext(extract("cacheOfflineUrl"), context);

  const manifest = "https://monkeytactics.com/assets/data/words/manifest.enable-v1.json?v=enable-v1";
  assert.equal(await context.cacheOfflineUrl(cache, manifest), false);
  assert.equal(sharedReads, 1);
  assert.equal(writes[0].url, manifest);
  assert.equal(writes[0].text, "verified dictionary asset");

  currentResponse = new Response("already cached shard");
  assert.equal(await context.cacheOfflineUrl(cache, "https://monkeytactics.com/assets/data/words/c.enable-v1.txt.gz"), false);
  assert.equal(sharedReads, 1);
  assert.equal(writes.length, 1);
  assert.equal(downloads, 0);
});

test("pick-list hook refresh reruns for dictionary and pick changes instead of publishing stale flags", async () => {
  const batches = [];
  const hooks = [];
  const rendered = [];
  let selectedDictionary = "enable";
  const originalCache = new Map([["SAVED", true]]);
  const context = {
    queueMicrotask, console,
    pickListHookRefreshRevision: 0,
    pickListHookRefreshQueued: false,
    pickListEntries: [{ word: "CAT" }],
    pickListHookCache: originalCache,
    DICTIONARY_BITS: { enable: 1, expanded: 2, both: 3 },
    getSelectedDictionary: () => selectedDictionary,
    SearchEngine: { ready: Promise.resolve() },
    Dictionary: {
      loadRelevant(letters, dictionaryBit) {
        const pending = deferred();
        batches.push({ letters, dictionaryBit, ...pending });
        return pending.promise;
      }
    },
    async getHookInfo(word, dictionaryBit) {
      hooks.push({ word, dictionaryBit });
      return { hasSHook: dictionaryBit === 2 };
    },
    renderPickList() { rendered.push([...context.pickListHookCache.entries()]); }
  };
  vm.createContext(context);
  vm.runInContext(extract("refreshPickListHookCache"), context);

  context.refreshPickListHookCache();
  await tick();
  assert.equal(batches.length, 1);
  assert.equal(batches[0].dictionaryBit, 1);
  selectedDictionary = "expanded";
  context.pickListEntries = [{ word: "CAT" }, { word: "DOG" }];
  context.refreshPickListHookCache();
  batches[0].resolve();
  await tick();

  assert.equal(context.pickListHookCache, originalCache);
  assert.equal(rendered.length, 0);
  assert.equal(batches.length, 2);
  assert.equal(batches[1].dictionaryBit, 2);
  assert.equal(batches[1].letters, "cd");
  batches[1].resolve();
  await tick();

  assert.deepEqual(hooks, [
    { word: "cat", dictionaryBit: 1 },
    { word: "cat", dictionaryBit: 2 },
    { word: "dog", dictionaryBit: 2 }
  ]);
  assert.equal(rendered.length, 1);
  assert.equal(context.pickListHookCache.get("CAT"), true);
  assert.equal(context.pickListHookCache.get("DOG"), true);
  assert.equal(context.pickListHookCache.size, 2);
  assert.equal(context.pickListHookRefreshQueued, false);
});
