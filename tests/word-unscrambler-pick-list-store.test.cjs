const test = require("node:test");
const assert = require("node:assert/strict");

const PickListStore = require("../assets/js/tools/word-unscrambler/pick-list-store.js");

function createStorage(initialValue = "[]") {
  const values = new Map([[PickListStore.STORAGE_KEY, initialValue]]);
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test("pick list stores unique words and persists removal", () => {
  const storage = createStorage();
  PickListStore.add({ word: "crate", score: 7, length: 5 }, storage);
  PickListStore.add({ word: "CRATE", score: 10, length: 5 }, storage);

  const entries = PickListStore.read(storage);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].word, "CRATE");
  assert.equal(entries[0].score, 7);
  assert.equal(entries[0].note, "");
  assert.equal(PickListStore.has("crate", storage), true);

  assert.equal(PickListStore.remove("crate", storage).length, 0);
  assert.equal(PickListStore.has("crate", storage), false);
});

test("clear empties the pick list and read tolerates invalid data", () => {
  const storage = createStorage("not-json");
  assert.deepEqual(PickListStore.read(storage), []);
  PickListStore.add({ word: "ale", score: 3, length: 3 }, storage);
  assert.deepEqual(PickListStore.clear(storage), []);
  assert.deepEqual(PickListStore.read(storage), []);
});

test("notes persist, migrate older entries, and stop at 120 characters", () => {
  const storage = createStorage();
  PickListStore.add({ word: "note", score: 4, length: 4 }, storage);

  const longNote = "x".repeat(130);
  const updated = PickListStore.updateNote("note", longNote, storage);

  assert.equal(updated[0].note.length, PickListStore.NOTE_MAX_LENGTH);
  assert.equal(PickListStore.read(storage)[0].note, "x".repeat(120));
});
