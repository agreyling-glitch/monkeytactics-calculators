"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const InputRules = require("../assets/js/tools/word-unscrambler/input-rules.js");
const source = fs.readFileSync(path.join(__dirname, "../assets/js/tools/word-unscrambler/word-unscrambler.js"), "utf8");

function extract(name) {
  const start = new RegExp(`^(?:async )?function ${name}\\(`, "m").exec(source);
  assert.ok(start, `Missing function ${name}`);
  return source.slice(start.index, source.indexOf("\n}", start.index) + 2);
}

function fixture() {
  const control = (value = "") => ({ value, focus() { this.focused = true; } });
  const messages = [];
  const context = {
    input: control("CT"), boardPatternInput: control("?A?"), useBoardLetters: { checked: true },
    wordLengthInput: control("2"), startsWithInput: control(), endsWithInput: control(),
    mustIncludeInput: control(), excludeLettersInput: control(), highValueOnlyInput: { checked: false },
    minimumVowelsInput: control("0"), minimumConsonantsInput: control("0"), minimumScoreInput: control(), maximumScoreInput: control(),
    sortResultsInput: control("length-desc"), dictionaryInputs: [{ checked: true, value: "enable" }], hookFilterInputs: [{ checked: true, value: "" }],
    IS_WWF: true, DICTIONARY_BITS: { enable: 1 }, InputRules,
    searchRevision: 0, parseSmartInput: InputRules.parseSmartInput, clearMessage() {}, clearResults() {}, getCurrentFilters: () => ({}),
    resultsHeading: {}, showMessage: (message) => messages.push(message), setEmptyState(title, text) { context.empty = { title, text }; },
    emptyRecovery: { hidden: true, replaceChildren(...children) { this.children = children; } },
    document: { createElement: () => ({ addEventListener(_type, listener) { this.click = listener; } }) },
    renderRackTiles() {}, rerunCurrentSearch() { context.reruns += 1; }, reruns: 0,
    loadAllChunks() { throw new Error("Conflict must stop before dictionary loading"); },
    loadRelevantChunks() { throw new Error("Conflict must stop before dictionary loading"); }
  };
  vm.createContext(context);
  vm.runInContext(["getSearchConflict", "renderSearchConflict", "removeInlineConstraint", "handleSubmit"].map(extract).join("\n"), context);
  return { context, messages };
}

test("board/length conflict stops the search and offers a repair without changing rack or board", async () => {
  const { context: c, messages } = fixture();
  await c.handleSubmit({ preventDefault() {} });
  assert.match(messages[0], /3 positions.*Word Length is 2/);
  assert.equal(c.emptyRecovery.hidden, false);
  const repair = c.emptyRecovery.children[0];
  assert.equal(repair.textContent, "Use length 3");
  repair.click();
  assert.equal(c.wordLengthInput.value, "3");
  assert.equal(c.input.value, "CT");
  assert.equal(c.boardPatternInput.value, "?A?");
  assert.equal(c.useBoardLetters.checked, true);
  assert.equal(c.reruns, 1);
  assert.equal(c.getSearchConflict("ct", { boardPattern: "?a?", wordLength: 3 }), null);
});

test("length repair updates inline length while preserving the inline pattern and other filters", () => {
  const { context: c } = fixture();
  c.input.value = "CT:2 / C?? +A-Z";
  c.minimumScoreInput.value = "5";
  c.renderSearchConflict(c.getSearchConflict("ct", { boardPattern: "?a?", wordLength: 2 }));
  c.emptyRecovery.children[0].click();
  assert.equal(c.input.value, "CT:3 / C?? +A-Z");
  assert.equal(c.wordLengthInput.value, "3");
  assert.equal(c.minimumScoreInput.value, "5");
});

test("board tile shortages count only empty positions and accept rack blanks", () => {
  const { context: c } = fixture();
  assert.equal(c.getSearchConflict("ct", { boardPattern: "?a?" }), null);
  assert.equal(c.getSearchConflict("c?", { boardPattern: "?a?" }), null);
  const conflict = c.getSearchConflict("c", { boardPattern: "?a?" });
  assert.equal(conflict.action, "edit-rack");
  assert.match(conflict.message, /needs 2 new tiles.*contains 1/);
  c.renderSearchConflict(conflict);
  c.emptyRecovery.children[0].click();
  assert.equal(c.input.focused, true);
  assert.equal(c.reruns, 0);
});

test("rack length conflict offers any length but does not reject unrestricted word lists", () => {
  const { context: c } = fixture();
  const conflict = c.getSearchConflict("ca?", { wordLength: 4 });
  assert.equal(conflict.action, "any-length");
  c.input.value = "CA?:4 / C*";
  c.renderSearchConflict(conflict);
  c.emptyRecovery.children[0].click();
  assert.equal(c.wordLengthInput.value, "0");
  assert.equal(c.input.value, "CA? / C*");
  assert.equal(c.getSearchConflict("", { wordLength: 4, unrestricted: true }), null);
});

test("excluded required or fixed board letters get an actionable explanation", () => {
  const { context: c } = fixture();
  const required = c.getSearchConflict("cat", { mustInclude: "a", excludeLetters: "az" });
  const fixed = c.getSearchConflict("ct", { boardPattern: "?a?", excludeLetters: "a" });
  assert.equal(required.action, "clear-excluded");
  assert.match(required.message, /A cannot be both required and excluded/);
  assert.match(fixed.message, /A is fixed in your board pattern/);
  c.input.value = "CAT +A-AZ";
  c.excludeLettersInput.value = "AZ";
  c.renderSearchConflict(required);
  c.emptyRecovery.children[0].click();
  assert.equal(c.input.value, "CAT +A");
  assert.equal(c.excludeLettersInput.value, "");
});

test("impossible letter minimums use total word length including fixed board letters", () => {
  const { context: c } = fixture();
  assert.equal(c.getSearchConflict("ct", { boardPattern: "?a?", minimumVowels: 1, minimumConsonants: 2 }), null);
  const conflict = c.getSearchConflict("ct", { boardPattern: "?a?", minimumVowels: 2, minimumConsonants: 2 });
  assert.equal(conflict.action, "clear-minimums");
  c.minimumVowelsInput.value = "2";
  c.minimumConsonantsInput.value = "2";
  c.renderSearchConflict(conflict);
  c.emptyRecovery.children[0].click();
  assert.equal(c.minimumVowelsInput.value, "0");
  assert.equal(c.minimumConsonantsInput.value, "0");
  assert.equal(c.reruns, 1);
});
