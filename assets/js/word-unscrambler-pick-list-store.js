(function pickListStoreModule(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.MonkeyTacticsPickList = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createPickListApi() {
  "use strict";

  const STORAGE_KEY = "monkeytactics.word-unscrambler.pick-list.v1";
  const NOTE_MAX_LENGTH = 120;

  function createId(now = Date.now()) {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `pick-${now}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object" || typeof entry.word !== "string") {
      return null;
    }

    const word = entry.word.trim().toUpperCase();
    if (!word) {
      return null;
    }

    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : createId(entry.timestamp),
      timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
      word,
      score: Number.isFinite(entry.score) ? Math.max(0, entry.score) : 0,
      length: Number.isFinite(entry.length) ? Math.max(0, entry.length) : word.length,
      note: typeof entry.note === "string" ? entry.note.slice(0, NOTE_MAX_LENGTH) : ""
    };
  }

  function read(storage = globalThis.localStorage) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.map(normalizeEntry).filter(Boolean) : [];
    } catch (_error) {
      return [];
    }
  }

  function write(entries, storage = globalThis.localStorage) {
    const normalized = entries.map(normalizeEntry).filter(Boolean);

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (_error) {
      // Storage may be unavailable in some privacy modes.
    }

    return normalized;
  }

  function add(entry, storage = globalThis.localStorage) {
    const next = normalizeEntry(entry);

    if (!next) {
      return read(storage);
    }

    const entries = read(storage);
    const duplicate = entries.find((candidate) => candidate.word === next.word);

    if (duplicate) {
      return entries;
    }

    return write([next, ...entries], storage);
  }

  function remove(word, storage = globalThis.localStorage) {
    const target = String(word || "").trim().toUpperCase();
    return write(read(storage).filter((entry) => entry.word !== target), storage);
  }

  function updateNote(word, note, storage = globalThis.localStorage) {
    const target = String(word || "").trim().toUpperCase();
    const nextNote = String(note ?? "").slice(0, NOTE_MAX_LENGTH);

    return write(read(storage).map((entry) => (
      entry.word === target ? { ...entry, note: nextNote } : entry
    )), storage);
  }

  function clear(storage = globalThis.localStorage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Keep the UI responsive if storage is unavailable.
    }

    return [];
  }

  function has(word, storage = globalThis.localStorage) {
    const target = String(word || "").trim().toUpperCase();
    return read(storage).some((entry) => entry.word === target);
  }

  function sort(entries) {
    return [...entries].sort((first, second) => (
      second.timestamp - first.timestamp || first.word.localeCompare(second.word)
    ));
  }

  return Object.freeze({
    STORAGE_KEY,
    NOTE_MAX_LENGTH,
    add,
    clear,
    has,
    read,
    remove,
    sort,
    updateNote
  });
}));
