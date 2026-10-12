"use strict";

(function initializeWordDictionary(global) {
  const BASE_URL = "/assets/data/words/";
  const SOURCES = Object.freeze({
    standard: { manifest: `${BASE_URL}manifest.enable-v1.json?v=enable-v1` },
    combined: { manifest: `${BASE_URL}manifest.wiktionary-v1.json?v=wiktionary-v1` }
  });
  const instances = new WeakMap();

  function sourceFor(dictionaryBit) {
    if (![1, 2, 3].includes(dictionaryBit)) throw new Error("Invalid dictionary selection.");
    return dictionaryBit === 1 ? "standard" : "combined";
  }

  async function decode(response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Servers can transparently decompress .gz files; inspect the magic bytes.
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
    if (typeof global.DecompressionStream !== "function") {
      throw new Error("This browser does not support dictionary decompression.");
    }
    return new Response(new Blob([bytes]).stream().pipeThrough(new global.DecompressionStream("gzip"))).text();
  }

  function create(engine) {
    if (instances.has(engine)) return instances.get(engine);
    if (typeof engine?.initEngine !== "function") throw new Error("A word search engine is required.");
    const manifests = new Map();
    const manifestPromises = new Map();
    const loaded = new Set();
    const chunks = new Map();
    const queue = [];
    let active = 0;

    function pump() {
      while (active < 4 && queue.length) {
        const { task, resolve, reject } = queue.shift();
        active += 1;
        Promise.resolve().then(task).then(resolve, reject).finally(() => {
          active -= 1;
          pump();
        });
      }
    }

    function schedule(task) {
      return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
        pump();
      });
    }

    async function manifestFor(source) {
      if (manifests.has(source)) return manifests.get(source);
      if (manifestPromises.has(source)) return manifestPromises.get(source);
      const promise = (async () => {
        const response = await fetch(SOURCES[source].manifest);
        if (!response.ok) throw new Error(`Dictionary manifest failed with status ${response.status}.`);
        const manifest = await response.json();
        if (manifest?.encoding !== "gzip-newline-membership" || !manifest.chunks || typeof manifest.chunks !== "object") {
          throw new Error("Dictionary manifest is invalid.");
        }
        for (const [letter, chunk] of Object.entries(manifest.chunks)) {
          if (!/^[a-z]$/.test(letter) || !/^[a-z]\.(?:enable|wiktionary)-v1\.txt\.gz$/.test(chunk?.file || "")) {
            throw new Error("Dictionary manifest contains an invalid chunk.");
          }
        }
        manifests.set(source, manifest);
        return manifest;
      })();
      manifestPromises.set(source, promise);
      try { return await promise; }
      finally { manifestPromises.delete(source); }
    }

    async function loadChunk(source, manifest, letter) {
      const chunk = manifest.chunks[letter];
      if (!chunk) return;
      const key = `${source}:${letter}`;
      const combinedKey = `combined:${letter}`;
      if (loaded.has(key) || (source === "standard" && loaded.has(combinedKey))) return;
      if (chunks.has(key)) return chunks.get(key);
      if (source === "standard" && chunks.has(combinedKey)) return chunks.get(combinedKey);
      const promise = schedule(async () => {
        // Another queued combined shard may already have supplied these words.
        if (source === "standard" && loaded.has(combinedKey)) return;
        const response = await fetch(`${BASE_URL}${chunk.file}`);
        if (!response.ok) throw new Error(`Dictionary chunk ${letter} failed with status ${response.status}.`);
        const text = await decode(response);
        // Both source formats carry explicit membership bits. Keep those bits:
        // the engine merges repeated words when a user switches dictionaries.
        await engine.initEngine(text);
        loaded.add(key);
      });
      chunks.set(key, promise);
      try { await promise; }
      finally { chunks.delete(key); }
    }

    async function loadRelevant(letters, dictionaryBit = 1) {
      const source = sourceFor(dictionaryBit);
      const manifest = await manifestFor(source);
      const input = String(letters).toLowerCase();
      const relevant = /[?*]/.test(input)
        ? Object.keys(manifest.chunks)
        : [...new Set(input.replace(/[^a-z]/g, ""))].sort();
      await Promise.all(relevant.map((letter) => loadChunk(source, manifest, letter)));
    }

    const loader = Object.freeze({
      loadManifest: (dictionaryBit = 1) => manifestFor(sourceFor(dictionaryBit)),
      loadRelevant,
      async loadAll(dictionaryBit = 1) {
        await loadRelevant("?", dictionaryBit);
      },
      async offlineAssets() {
        const entries = await Promise.all(Object.keys(SOURCES).map(async (source) => {
          const manifest = await manifestFor(source);
          return [SOURCES[source].manifest, ...Object.values(manifest.chunks).map((chunk) => `${BASE_URL}${chunk.file}`)];
        }));
        return [...new Set(entries.flat())];
      }
    });
    instances.set(engine, loader);
    return loader;
  }

  global.MonkeyTacticsWordDictionary = Object.freeze({ create });
})(window);
