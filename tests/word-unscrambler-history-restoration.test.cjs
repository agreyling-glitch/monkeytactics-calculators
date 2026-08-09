"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const HistoryStore = require("../assets/js/tools/word-unscrambler/history-store.js");

test("restores rack, pattern, every filter, and sort without a dictionary", () => {
  const filters = {
    wordLength: "7",
    startsWith: "a",
    endsWith: "e",
    mustInclude: "r",
    excludeLetters: "z",
    highValueOnly: true,
    minimumVowels: "2",
    minimumConsonants: "3",
    minimumScore: "10",
    maximumScore: "40",
    hookFilter: "front"
  };
  const restored = HistoryStore.getRestoredState({
    id: "search-1",
    timestamp: 1,
    rack: "retains",
    pattern: "a*e",
    filters,
    sortMode: "score-desc",
    resultCount: 12,
    entropy: 0.8,
    leaveValue: 55,
    pinned: false,
    dictionary: "sowpods"
  });
  assert.equal(restored.inputValue, "RETAINS / A*E");
  assert.deepEqual(restored.filters, filters);
  assert.equal(restored.sortMode, "score-desc");
  assert.equal("dictionary" in restored, false);
});

test("summarizes only active filters with readable settings", () => {
  assert.deepEqual(HistoryStore.getActiveFilters({
    wordLength: "0",
    startsWith: "p",
    endsWith: "",
    mustInclude: "t",
    excludeLetters: "",
    highValueOnly: false,
    minimumVowels: "0",
    minimumConsonants: "0",
    minimumScore: "10",
    maximumScore: "",
    hookFilter: ""
  }), [
    "Starts With: P",
    "Must Include: T",
    "Score ≥ 10"
  ]);
});
