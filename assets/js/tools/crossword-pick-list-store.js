(function crosswordPickListStoreModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MonkeyTacticsCrosswordPickList = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createCrosswordPickListApi() {
  "use strict";

  const STORAGE_KEY = "monkeytactics.crossword-solver.pick-list.v1";
  const EXPORT_FORMAT = "monkeytactics-crossword-pick-list";
  const EXPORT_VERSION = 1;
  const NOTE_MAX_LENGTH = 240;
  const GRID_POSITION_MAX_LENGTH = 40;
  const SCORE_COMPONENTS = ["directClue", "synonym", "graph", "exactPhrase", "allClueTerms", "sourceQuality", "knownLetters", "lengthFit"];

  function normalizeScoreBreakdown(value) {
    if (!value || typeof value !== "object") return null;
    const breakdown = Object.fromEntries(SCORE_COMPONENTS.map((key) => [key,
      Number.isFinite(value[key]) ? Math.max(0, Math.min(1000, value[key])) : 0]));
    breakdown.total = SCORE_COMPONENTS.reduce((total, key) => total + breakdown[key], 0);
    return breakdown;
  }

  function createId(now = Date.now()) {
    return globalThis.crypto?.randomUUID?.() || `crossword-pick-${now}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object" || typeof entry.word !== "string") return null;
    const word = entry.word.trim().toUpperCase();
    if (!word) return null;
    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : createId(entry.timestamp),
      timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
      word,
      clue: typeof entry.clue === "string" ? entry.clue.trim().slice(0, 140) : "",
      pattern: typeof entry.pattern === "string" ? entry.pattern.trim().toUpperCase().slice(0, 30) : "",
      definition: typeof entry.definition === "string" ? entry.definition.trim().slice(0, 500) : "",
      relevance: Number.isFinite(entry.relevance) ? Math.max(0, entry.relevance) : 0,
      matchedTokens: Number.isFinite(entry.matchedTokens) ? Math.max(0, Math.trunc(entry.matchedTokens)) : 0,
      matchExplanation: typeof entry.matchExplanation === "string" ? entry.matchExplanation.trim().slice(0, 120) : "",
      scoreBreakdown: normalizeScoreBreakdown(entry.scoreBreakdown),
      dictionaryBits: [1, 2, 3].includes(entry.dictionaryBits) ? entry.dictionaryBits : 0,
      dictionaryMembership: typeof entry.dictionaryMembership === "string" ? entry.dictionaryMembership.slice(0, 30) : "Unknown",
      gridPosition: typeof entry.gridPosition === "string" ? entry.gridPosition.slice(0, GRID_POSITION_MAX_LENGTH) : "",
      note: typeof entry.note === "string" ? entry.note.slice(0, NOTE_MAX_LENGTH) : ""
    };
  }

  function read(storage = globalThis.localStorage) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.map(normalizeEntry).filter(Boolean) : [];
    } catch (_error) { return []; }
  }

  function write(entries, storage = globalThis.localStorage) {
    const normalized = entries.map(normalizeEntry).filter(Boolean);
    try { storage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch (_error) { /* Private storage may be unavailable. */ }
    return normalized;
  }

  function sameCandidate(left, right) {
    return left.word === right.word && left.clue === right.clue && left.pattern === right.pattern;
  }

  function samePositionedCandidate(left, right) {
    return sameCandidate(left, right)
      && left.gridPosition.trim().toLowerCase() === right.gridPosition.trim().toLowerCase();
  }

  function add(entry, storage = globalThis.localStorage) {
    const next = normalizeEntry(entry);
    if (!next) return read(storage);
    const entries = read(storage);
    if (entries.some((candidate) => sameCandidate(candidate, next))) return entries;
    return write([next, ...entries], storage);
  }

  function remove(id, storage = globalThis.localStorage) {
    return write(read(storage).filter((entry) => entry.id !== id), storage);
  }

  function update(id, changes, storage = globalThis.localStorage) {
    return write(read(storage).map((entry) => entry.id === id ? {
      ...entry,
      gridPosition: typeof changes.gridPosition === "string" ? changes.gridPosition.slice(0, GRID_POSITION_MAX_LENGTH) : entry.gridPosition,
      note: typeof changes.note === "string" ? changes.note.slice(0, NOTE_MAX_LENGTH) : entry.note
    } : entry), storage);
  }

  function clear(storage = globalThis.localStorage) {
    try { storage.removeItem(STORAGE_KEY); } catch (_error) { /* Keep the interface responsive. */ }
    return [];
  }

  function find(entry, storage = globalThis.localStorage) {
    const target = normalizeEntry(entry);
    return target ? read(storage).find((candidate) => sameCandidate(candidate, target)) || null : null;
  }

  function exportData(entries) {
    return {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      entries: entries.map(normalizeEntry).filter(Boolean)
    };
  }

  function importData(payload, mode = "merge", storage = globalThis.localStorage) {
    if (!payload || typeof payload !== "object" || payload.format !== EXPORT_FORMAT
      || payload.version !== EXPORT_VERSION || !Array.isArray(payload.entries)) {
      throw new TypeError("This is not a supported MonkeyTactics Crossword Pick List file.");
    }
    const imported = payload.entries.map(normalizeEntry).filter(Boolean);
    if (payload.entries.length && !imported.length) throw new TypeError("The Pick List file contains no valid candidates.");
    const merged = mode === "replace" ? [] : read(storage);
    let added = 0;
    imported.forEach((entry) => {
      if (merged.some((candidate) => samePositionedCandidate(candidate, entry))) return;
      merged.push(entry);
      added += 1;
    });
    return { entries: write(merged, storage), added, skipped: imported.length - added };
  }

  return Object.freeze({ STORAGE_KEY, EXPORT_FORMAT, EXPORT_VERSION, NOTE_MAX_LENGTH, GRID_POSITION_MAX_LENGTH, add, clear, exportData, find, importData, read, remove, update });
}));
