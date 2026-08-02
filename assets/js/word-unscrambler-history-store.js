(function historyStoreModule(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.MonkeyTacticsHistory = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createHistoryApi() {
  "use strict";

  const STORAGE_KEY = "monkeytactics.word-unscrambler.history.v1";
  const MAX_UNPINNED_ENTRIES = 50;

  function createId(now = Date.now()) {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `history-${now}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object" || typeof entry.rack !== "string") {
      return null;
    }

    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : createId(entry.timestamp),
      timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
      rack: entry.rack.toUpperCase(),
      pattern: typeof entry.pattern === "string" ? entry.pattern.toUpperCase() : "",
      filters: entry.filters && typeof entry.filters === "object" ? { ...entry.filters } : {},
      sortMode: typeof entry.sortMode === "string" ? entry.sortMode : "length-desc",
      resultCount: Number.isFinite(entry.resultCount) ? Math.max(0, entry.resultCount) : 0,
      entropy: Number.isFinite(entry.entropy) ? entry.entropy : null,
      leaveValue: Number.isFinite(entry.leaveValue) ? entry.leaveValue : null,
      pinned: entry.pinned === true
    };
  }

  function stateKey(entry) {
    return JSON.stringify([
      entry.rack,
      entry.pattern,
      entry.filters,
      entry.sortMode
    ]);
  }

  function getRestoredState(entry) {
    const normalized = normalizeEntry(entry);
    if (!normalized) {
      return null;
    }

    return {
      inputValue: normalized.pattern
        ? `${normalized.rack} / ${normalized.pattern}`
        : normalized.rack,
      filters: { ...normalized.filters },
      sortMode: normalized.sortMode
    };
  }

  function getActiveFilters(filters = {}) {
    const active = [];
    const addTextFilter = (key, label) => {
      const value = String(filters[key] ?? "").trim();
      if (value) {
        active.push(`${label}: ${value.toUpperCase()}`);
      }
    };
    const addMinimumFilter = (key, label) => {
      const value = String(filters[key] ?? "").trim();
      if (value && value !== "0") {
        active.push(`${label} ≥ ${value}`);
      }
    };

    if (String(filters.wordLength ?? "0") !== "0") {
      active.push(`Word Length: ${filters.wordLength}`);
    }
    addTextFilter("startsWith", "Starts With");
    addTextFilter("endsWith", "Ends With");
    addTextFilter("mustInclude", "Must Include");
    addTextFilter("excludeLetters", "Exclude Letters");
    if (filters.highValueOnly === true) {
      active.push("High-Value Letters: J, Q, X, or Z");
    }
    addMinimumFilter("minimumVowels", "Vowels");
    addMinimumFilter("minimumConsonants", "Consonants");

    const minimumScore = String(filters.minimumScore ?? "").trim();
    const maximumScore = String(filters.maximumScore ?? "").trim();
    if (minimumScore) {
      active.push(`Score ≥ ${minimumScore}`);
    }
    if (maximumScore) {
      active.push(`Score ≤ ${maximumScore}`);
    }

    const hookLabels = {
      none: "No Hooks",
      s: "S-Hooks",
      front: "Front Hooks",
      back: "Back Hooks",
      multiple: "Multiple Hooks"
    };
    if (hookLabels[filters.hookFilter]) {
      active.push(`Hooks: ${hookLabels[filters.hookFilter]}`);
    }

    return active;
  }

  function rotateEntries(entries, maximum = MAX_UNPINNED_ENTRIES) {
    const normalized = entries.map(normalizeEntry).filter(Boolean);
    const pinned = normalized.filter((entry) => entry.pinned);
    const unpinned = normalized
      .filter((entry) => !entry.pinned)
      .sort((first, second) => second.timestamp - first.timestamp)
      .slice(0, maximum);

    return [...pinned, ...unpinned];
  }

  function read(storage = globalThis.localStorage) {
    try {
      const value = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? rotateEntries(value) : [];
    } catch (_error) {
      return [];
    }
  }

  function write(entries, storage = globalThis.localStorage) {
    const rotated = rotateEntries(entries);

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(rotated));
    } catch (_error) {
      // Storage can be unavailable in private browsing or locked-down contexts.
    }

    return rotated;
  }

  function add(entry, storage = globalThis.localStorage) {
    const next = normalizeEntry(entry);

    if (!next) {
      return read(storage);
    }

    const entries = read(storage);
    const duplicate = entries.find((candidate) => stateKey(candidate) === stateKey(next));

    if (duplicate) {
      next.id = duplicate.id;
      next.pinned = duplicate.pinned;
    }

    return write([
      next,
      ...entries.filter((candidate) => candidate.id !== next.id)
    ], storage);
  }

  function update(id, changes, storage = globalThis.localStorage) {
    return write(read(storage).map((entry) => (
      entry.id === id ? normalizeEntry({ ...entry, ...changes, id }) : entry
    )), storage);
  }

  function remove(id, storage = globalThis.localStorage) {
    return write(read(storage).filter((entry) => entry.id !== id), storage);
  }

  function clear(storage = globalThis.localStorage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Keep the in-memory UI responsive when storage is unavailable.
    }

    return [];
  }

  function sort(entries, mode = "newest") {
    const compare = mode === "oldest"
      ? (first, second) => first.timestamp - second.timestamp
      : mode === "rack"
        ? (first, second) => first.rack.localeCompare(second.rack) || second.timestamp - first.timestamp
        : (first, second) => second.timestamp - first.timestamp;

    return [...entries].sort((first, second) => (
      Number(second.pinned) - Number(first.pinned) || compare(first, second)
    ));
  }

  function moveIndex(index, key, length) {
    if (length <= 0) {
      return -1;
    }

    if (key === "Home") {
      return 0;
    }

    if (key === "End") {
      return length - 1;
    }

    const direction = key === "ArrowUp" ? -1 : 1;
    return (Math.max(0, index) + direction + length) % length;
  }

  function createLongPressController({ delay = 550, movement = 12, onLongPress }) {
    let timer = null;
    let startX = 0;
    let startY = 0;

    const cancel = () => {
      clearTimeout(timer);
      timer = null;
    };

    return {
      start(event) {
        if (event.pointerType === "mouse") {
          return;
        }

        startX = event.clientX;
        startY = event.clientY;
        cancel();
        timer = setTimeout(() => {
          timer = null;
          onLongPress(event);
        }, delay);
      },
      move(event) {
        if (Math.hypot(event.clientX - startX, event.clientY - startY) > movement) {
          cancel();
        }
      },
      cancel
    };
  }

  return Object.freeze({
    STORAGE_KEY,
    MAX_UNPINNED_ENTRIES,
    add,
    clear,
    createLongPressController,
    getActiveFilters,
    getRestoredState,
    moveIndex,
    normalizeEntry,
    read,
    remove,
    rotateEntries,
    sort,
    stateKey,
    update,
    write
  });
}));
