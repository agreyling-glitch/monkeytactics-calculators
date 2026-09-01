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
    dictionaryBits: 3, dictionaryMembership: "ENABLE + SOWPODS", gridPosition: "", note: ""
  });
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
