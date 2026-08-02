"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const HistoryStore = require("../assets/js/word-unscrambler-history-store.js");

function createStorage(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) {
    values.set(HistoryStore.STORAGE_KEY, initialValue);
  }
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

function entry(index, changes = {}) {
  return {
    id: `entry-${index}`,
    timestamp: index,
    rack: `rack${index}`,
    pattern: "A*E",
    filters: { wordLength: String(index % 8) },
    sortMode: "score-desc",
    resultCount: index,
    entropy: 0.72,
    leaveValue: 63,
    pinned: false,
    ...changes
  };
}

test("keeps only the newest 50 unpinned entries", () => {
  const rotated = HistoryStore.rotateEntries(
    Array.from({ length: 55 }, (_, index) => entry(index))
  );
  assert.equal(rotated.length, 50);
  assert.equal(Math.min(...rotated.map(({ timestamp }) => timestamp)), 5);
});

test("never removes pinned entries during rotation", () => {
  const rotated = HistoryStore.rotateEntries([
    entry(0, { pinned: true }),
    ...Array.from({ length: 55 }, (_, index) => entry(index + 1))
  ]);
  assert.equal(rotated.length, 51);
  assert.equal(rotated.find(({ id }) => id === "entry-0").pinned, true);
});

test("deduplicates the same search state and preserves its pin", () => {
  const storage = createStorage();
  const filters = { wordLength: "7" };
  HistoryStore.add(entry(1, { rack: "retains", filters, pinned: true }), storage);
  const result = HistoryStore.add(entry(2, { rack: "retains", filters, resultCount: 99 }), storage);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "entry-1");
  assert.equal(result[0].pinned, true);
  assert.equal(result[0].resultCount, 99);
});

test("recovers safely from corrupt local storage", () => {
  assert.deepEqual(HistoryStore.read(createStorage("not-json")), []);
});

test("pin, delete, and clear update persisted history", () => {
  const storage = createStorage();
  HistoryStore.add(entry(1), storage);
  assert.equal(HistoryStore.update("entry-1", { pinned: true }, storage)[0].pinned, true);
  assert.deepEqual(HistoryStore.remove("entry-1", storage), []);
  HistoryStore.add(entry(2), storage);
  assert.deepEqual(HistoryStore.clear(storage), []);
  assert.deepEqual(HistoryStore.read(storage), []);
});
