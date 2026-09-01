const assert = require("node:assert/strict");
const test = require("node:test");
const Store = require("../assets/js/tools/crossword-pick-list-store.js");

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

const candidate = {
  word: "chagrin", clue: "abase", pattern: "?H?????", definition: "cause to feel shame; hurt the pride of",
  relevance: 88.7, matchedTokens: 0, dictionaryBits: 3, dictionaryMembership: "ENABLE + SOWPODS", timestamp: 1234
};

test("crossword picks preserve solving context and use isolated storage", () => {
  const storage = memoryStorage();
  const entries = Store.add(candidate, storage);
  assert.equal(Store.STORAGE_KEY, "monkeytactics.crossword-solver.pick-list.v1");
  assert.deepEqual(entries[0], {
    id: entries[0].id, timestamp: 1234, word: "CHAGRIN", clue: "abase", pattern: "?H?????",
    definition: "cause to feel shame; hurt the pride of", relevance: 88.7, matchedTokens: 0,
    matchExplanation: "", scoreBreakdown: null, dictionaryBits: 3,
    dictionaryMembership: "ENABLE + SOWPODS", gridPosition: "", note: ""
  });
});

test("crossword picks preserve a bounded semantic score explanation", () => {
  const storage = memoryStorage();
  const [entry] = Store.add({ ...candidate, matchExplanation: "Strong match · Exact phrase + pattern", scoreBreakdown: {
    directClue: 42.5, synonym: 0, graph: 0, exactPhrase: 100, allClueTerms: 50,
    sourceQuality: 17.4, knownLetters: 12, lengthFit: 20, ignored: 9999
  } }, storage);
  assert.equal(entry.matchExplanation, "Strong match · Exact phrase + pattern");
  assert.equal(entry.scoreBreakdown.exactPhrase, 100);
  assert.equal(entry.scoreBreakdown.total, 241.9);
  assert.equal(entry.scoreBreakdown.ignored, undefined);
});

test("crossword picks deduplicate only the same word, clue, and pattern", () => {
  const storage = memoryStorage();
  Store.add(candidate, storage);
  Store.add(candidate, storage);
  Store.add({ ...candidate, clue: "embarrass", timestamp: 2345 }, storage);
  assert.equal(Store.read(storage).length, 2);
});

test("crossword pick notes and grid positions persist within limits", () => {
  const storage = memoryStorage();
  const [entry] = Store.add(candidate, storage);
  const [updated] = Store.update(entry.id, { gridPosition: "14-Down", note: "Check crossings with 9-Across" }, storage);
  assert.equal(updated.gridPosition, "14-Down");
  assert.equal(updated.note, "Check crossings with 9-Across");
  assert.equal(Store.clear(storage).length, 0);
  assert.equal(Store.read(storage).length, 0);
});

test("crossword Pick Lists export and merge as versioned JSON data", () => {
  const storage = memoryStorage();
  const first = Store.add({ ...candidate, gridPosition: "14-Down" }, storage);
  const exported = Store.exportData(first);
  assert.equal(exported.format, Store.EXPORT_FORMAT);
  assert.equal(exported.version, 1);
  assert.equal(exported.entries[0].gridPosition, "14-Down");

  const result = Store.importData({ ...exported, entries: [
    exported.entries[0],
    { ...candidate, id: "second", gridPosition: "9-Across" }
  ] }, "merge", storage);
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.entries.length, 2);
});

test("crossword Pick List import rejects unsupported files", () => {
  assert.throws(() => Store.importData({ entries: [] }, "merge", memoryStorage()), /not a supported/);
});
