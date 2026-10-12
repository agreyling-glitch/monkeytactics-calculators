"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { setImmediate: tick } = require("node:timers/promises");
const InputRules = require("../assets/js/tools/word-unscrambler/input-rules.js");

const mainSource = fs.readFileSync(path.join(__dirname, "../assets/js/tools/word-unscrambler/word-unscrambler.js"), "utf8");

function extract(name) {
  const declaration = new RegExp(`^(?:async )?function ${name}\\(`, "m").exec(mainSource);
  assert.ok(declaration, `Missing production function: ${name}`);
  const end = mainSource.indexOf("\n}", declaration.index) + 2;
  return mainSource.slice(declaration.index, end);
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

function session({ load = async () => {}, search = async () => ["cat"] } = {}) {
  const rendered = [];
  const messages = [];
  const submissions = [];
  const history = [];
  const dictionaryEvents = [];
  let hookRefreshes = 0;
  const context = {
    Event, queueMicrotask, InputRules, IS_WWF: false,
    DICTIONARY_BITS: { enable: 1, expanded: 2, both: 3 },
    input: control("CA?"), useBoardLetters: control(), boardPatternInput: control(), boardPatternFields: { hidden: true },
    startsWithInput: control(), endsWithInput: control(), mustIncludeInput: control(), excludeLettersInput: control(),
    wordLengthInput: control("0"), minimumVowelsInput: control("0"), minimumConsonantsInput: control("0"),
    minimumScoreInput: control(), maximumScoreInput: control(), highValueOnlyInput: control(),
    sortResultsInput: control("score-desc"), hookFilterInputs: [{ value: "", checked: true }, { value: "s", checked: false }],
    searchRevision: 0, pendingHistorySearch: false, button: { disabled: false }, buttonLabel: { textContent: "Unscramble" },
    results: { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } },
    resultsHeading: { textContent: "Ready when you are" },
    activeDictionarySelection: "enable", dictionarySearchQueued: false, pickComparison: null,
    rackLeaveAnagramCountCache: new Map([["old", 1]]), pickListHookCache: new Map([["old", 1]]),
    refreshPickListHookCache() { hookRefreshes += 1; },
    clearResults() { rendered.length = 0; }, clearMessage() { messages.length = 0; },
    showMessage(message) { messages.push(message); }, setEmptyState() {},
    closeHistoryDropdown() {}, renderRackTiles() {}, syncSectionFilterResetButtons() {}, syncSortPicker() {},
    focusFilterInput(input) { input.focus(); }, getSortOption: (sort) => ["score-desc", "length-desc", "alpha-asc"].includes(sort),
    getCurrentFilters: null,
    renderSearchConflict(conflict) { messages.push(conflict.message); },
    renderMatches: (...args) => rendered.push(args), saveHistoryEntry: (...args) => history.push(args),
    loadAllChunks: load, loadRelevantChunks: load, findMatches: search,
    console: { error: (...args) => messages.push(args.join(" ")) }
  };
  context.dictionaryInputs = ["enable", "expanded", "both"].map((value) => ({
    value, checked: value === "enable",
    dispatchEvent(event) {
      if (event.type === "change") {
        dictionaryEvents.push(value);
        context.handleDictionaryChange();
      }
    }
  }));
  context.form = {
    requestSubmit(button) {
      assert.equal(button, context.button);
      // Like handleSubmit, advance the revision synchronously. Keep this spy
      // separate so restoration assertions can inspect the exact submitted UI.
      context.searchRevision += 1;
      submissions.push(JSON.parse(JSON.stringify(context.getRackSessionState())));
    }
  };
  vm.createContext(context);
  vm.runInContext([
    "parseSmartInput", "getCurrentFilters", "restoreFilters", "getSearchConflict", "getSelectedDictionary",
    "handleSubmit", "resetBasicFilters", "resetAdvancedFilters", "rerunCurrentSearch", "runPendingHistorySearch",
    "handleDictionaryChange", "getRackSessionState", "cancelRackSearch", "applyPlayedRack", "restorePlayedState"
  ].map(extract).join("\n"), context);
  return {
    context, rendered, messages, submissions, history, dictionaryEvents,
    hookRefreshes: () => hookRefreshes,
    submit: () => context.handleSubmit({ preventDefault() {} })
  };
}

test("playing a word cancels a loading search without allowing its results or history to overwrite the remaining rack", async () => {
  const loading = deferred();
  let searches = 0;
  const f = session({ load: () => loading.promise, search: async () => { searches += 1; return ["cat"]; } });
  const pending = f.submit();
  assert.equal(f.context.button.disabled, true);
  f.context.pendingHistorySearch = true;
  f.context.applyPlayedRack("?E");
  assert.equal(f.context.input.value, "?E");
  assert.equal(f.context.button.disabled, false);
  assert.equal(f.context.buttonLabel.textContent, "Unscramble");
  assert.equal(f.context.results.attributes["aria-busy"], "false");
  assert.equal(f.context.pendingHistorySearch, false);
  loading.resolve();
  await pending;
  assert.equal(searches, 0);
  assert.deepEqual(f.rendered, []);
  assert.deepEqual(f.history, []);
  assert.deepEqual(f.submissions, []);
  assert.equal(f.context.input.value, "?E");
});

test("a search already running in the worker cannot restore old results after playing or report a stale failure", async () => {
  for (const reject of [false, true]) {
    const searching = deferred();
    const f = session({ search: () => searching.promise });
    const pending = f.submit();
    await tick();
    f.context.applyPlayedRack("E?");
    if (reject) searching.reject(new Error("old worker failure"));
    else searching.resolve(["cat"]);
    await pending;
    assert.deepEqual(f.rendered, []);
    assert.deepEqual(f.messages, []);
    assert.deepEqual(f.history, []);
    assert.equal(f.context.input.value, "E?");
    assert.equal(f.context.button.disabled, false);
  }
});

test("playing and refilling clears obsolete board/filter constraints and submits only when requested with a nonempty rack", () => {
  const f = session();
  const c = f.context;
  c.input.value = "CT:3 / C*T +A-Z";
  c.useBoardLetters.checked = true;
  c.boardPatternInput.value = "?A?";
  c.boardPatternFields.hidden = false;
  c.wordLengthInput.value = "3";
  c.startsWithInput.value = "C";
  c.endsWithInput.value = "T";
  c.mustIncludeInput.value = "A";
  c.excludeLettersInput.value = "Z";
  c.highValueOnlyInput.checked = true;
  c.minimumVowelsInput.value = "1";
  c.minimumConsonantsInput.value = "1";
  c.minimumScoreInput.value = "5";
  c.maximumScoreInput.value = "20";
  c.hookFilterInputs[0].checked = false;
  c.hookFilterInputs[1].checked = true;

  c.applyPlayedRack("");
  assert.equal(c.input.value, "");
  assert.equal(c.useBoardLetters.checked, false);
  assert.equal(c.boardPatternFields.hidden, true);
  assert.equal(c.boardPatternInput.value, "");
  assert.equal(c.wordLengthInput.value, "0");
  for (const name of ["startsWithInput", "endsWithInput", "mustIncludeInput", "excludeLettersInput", "minimumScoreInput", "maximumScoreInput"]) assert.equal(c[name].value, "", name);
  assert.equal(c.highValueOnlyInput.checked, false);
  assert.equal(c.minimumVowelsInput.value, "0");
  assert.equal(c.minimumConsonantsInput.value, "0");
  assert.equal(c.hookFilterInputs[0].checked, true);
  assert.equal(c.sortResultsInput.value, "score-desc");
  assert.equal(c.getSelectedDictionary(), "enable");
  assert.equal(f.submissions.length, 0);

  c.applyPlayedRack("", { search: true });
  assert.equal(f.submissions.length, 0);
  c.applyPlayedRack("retain?", { search: true });
  assert.equal(f.submissions.length, 1);
  assert.equal(f.submissions[0].input, "RETAIN?");
  assert.equal(f.submissions[0].filters.useBoardLetters, false);
});

test("Undo restores the complete original smart input, filters, sort, and dictionary with exactly one search", async () => {
  const f = session();
  const c = f.context;
  c.input.value = " cT?:3 / C*T +A-Z ";
  c.restoreFilters({ useBoardLetters: true, boardPattern: "?a?", wordLength: "3", startsWith: "C", endsWith: "T", mustInclude: "A", excludeLetters: "Z", highValueOnly: true, minimumVowels: "1", minimumConsonants: "2", minimumScore: "5", maximumScore: "30", hookFilter: "s" });
  c.sortResultsInput.value = "alpha-asc";
  c.dictionaryInputs.forEach((choice) => { choice.checked = choice.value === "both"; });
  c.activeDictionarySelection = "both";
  const snapshot = c.getRackSessionState();
  const expected = JSON.parse(JSON.stringify(snapshot));

  c.applyPlayedRack("?E");
  c.sortResultsInput.value = "score-desc";
  c.dictionaryInputs.forEach((choice) => { choice.checked = choice.value === "enable"; });
  c.activeDictionarySelection = "enable";
  c.pendingHistorySearch = true;
  c.restorePlayedState(snapshot);
  await tick();

  assert.deepEqual(JSON.parse(JSON.stringify(c.getRackSessionState())), expected);
  assert.deepEqual(f.submissions, [expected]);
  assert.deepEqual(f.dictionaryEvents, ["both"]);
  assert.equal(c.activeDictionarySelection, "both");
  assert.equal(c.boardPatternFields.hidden, false);
  assert.equal(c.rackLeaveAnagramCountCache.size, 0);
  assert.equal(c.pickListHookCache.size, 0);
  assert.equal(f.hookRefreshes(), 1);
  assert.equal(c.pendingHistorySearch, false);
  assert.equal(c.input.focused, true);
});

test("Undo of an empty rack restores settings without submitting an empty search", async () => {
  const f = session();
  f.context.input.value = "  ";
  const snapshot = f.context.getRackSessionState();
  f.context.applyPlayedRack("RETAINS");
  f.context.restorePlayedState(snapshot);
  await tick();
  assert.equal(f.context.input.value, "  ");
  assert.equal(f.submissions.length, 0);
});

test("playing from pattern-strength results allows the next rack search and Undo restores the original pattern sort", async () => {
  const f = session();
  const c = f.context;
  c.input.value = "CATS? / C*T";
  c.sortResultsInput.value = "pattern-strength";
  const snapshot = c.getRackSessionState();
  let displayedSort;
  c.syncSortPicker = () => { displayedSort = c.sortResultsInput.value; };

  c.applyPlayedRack("S?");
  assert.equal(c.sortResultsInput.value, "length-desc");
  assert.equal(displayedSort, "length-desc");
  await f.submit();
  assert.equal(f.rendered.length, 1);
  assert.equal(f.rendered[0][2].sortBy, "length-desc");
  assert.equal(f.rendered[0][2].pattern, "");
  assert.deepEqual(f.messages, []);

  c.restorePlayedState(snapshot);
  await tick();
  assert.equal(c.input.value, "CATS? / C*T");
  assert.equal(c.sortResultsInput.value, "pattern-strength");
  assert.equal(displayedSort, "pattern-strength");
  assert.equal(f.submissions.length, 1);
  assert.equal(f.submissions[0].sort, "pattern-strength");
});

test("rendering refreshed Pick List hooks cannot start the same refresh recursively", () => {
  assert.doesNotMatch(extract("renderPickList"), /refreshPickListHookCache\s*\(/);
});
