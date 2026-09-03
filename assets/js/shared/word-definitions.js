"use strict";

(function initializeWordDefinitions(global) {
  if (global.MonkeyTacticsWordDefinitions) return;

  const DEFINITION_BASE_URL = "/assets/data/word-definitions/";
  const DEFINITION_MANIFEST_URL = `${DEFINITION_BASE_URL}manifest.wordnet-definitions-v1.json?v=wordnet-3.0-definitions-v1`;
  const localDefinitions = new Map();
  const localShardPromises = new Map();
  const remoteCache = new Map();
  let manifestPromise;

  function normalizeWord(value) {
    return String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function gridLength(value) {
    return normalizeWord(value).replace(/[^a-z0-9]/g, "").length;
  }

  function lookupForms(value) {
    const word = normalizeWord(value);
    const forms = [word];
    if (!/^[a-z]+$/.test(word)) return forms;
    if (word.length > 4 && word.endsWith("ies")) forms.push(`${word.slice(0, -3)}y`);
    if (word.length > 4 && /(?:ses|xes|zes|ches|shes)$/.test(word)) forms.push(word.slice(0, -2));
    if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) forms.push(word.slice(0, -1));
    if (word.length > 5 && word.endsWith("ing")) {
      const stem = word.slice(0, -3);
      forms.push(stem);
      if (/([b-df-hj-np-tv-z])\1$/.test(stem)) forms.push(stem.slice(0, -1));
      forms.push(`${stem}e`);
    }
    if (word.length > 4 && word.endsWith("ied")) forms.push(`${word.slice(0, -3)}y`);
    if (word.length > 4 && word.endsWith("ed")) {
      const stem = word.slice(0, -2);
      forms.push(stem);
      if (/([b-df-hj-np-tv-z])\1$/.test(stem)) forms.push(stem.slice(0, -1));
      forms.push(`${stem}e`);
    }
    if (word.length > 5 && word.endsWith("iest")) forms.push(`${word.slice(0, -4)}y`);
    if (word.length > 5 && word.endsWith("est")) {
      const stem = word.slice(0, -3);
      forms.push(stem);
      if (/([b-df-hj-np-tv-z])\1$/.test(stem)) forms.push(stem.slice(0, -1));
      forms.push(`${stem}e`);
    }
    return [...new Set(forms)];
  }

  function addLocalDefinition(word, definition) {
    const key = normalizeWord(word);
    const text = String(definition || "").trim();
    if (!key || !text) return;
    if (!localDefinitions.has(key)) localDefinitions.set(key, new Set());
    localDefinitions.get(key).add(text);
  }

  function register(word, definitions) {
    const values = Array.isArray(definitions) ? definitions : [definitions];
    values.forEach((definition) => addLocalDefinition(word, definition));
  }

  function localEntries(word) {
    const key = normalizeWord(word);
    const definitions = [...(localDefinitions.get(key) || [])];
    return definitions.length ? [{ word: key, defs: definitions.map((definition) => `u\t${definition}`), source: "WordNet 3.0" }] : [];
  }

  async function decodeResponse(response) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
    if (!("DecompressionStream" in global)) throw new Error("Gzip decompression is unavailable.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  async function loadManifest() {
    if (!manifestPromise) manifestPromise = fetch(DEFINITION_MANIFEST_URL).then(async (response) => {
      if (!response.ok) throw new Error("Local definition manifest failed.");
      const manifest = await response.json();
      if (manifest?.formatVersion !== 1 || !manifest.shards) throw new Error("Local definition manifest is invalid.");
      return manifest;
    }).catch((error) => {
      manifestPromise = null;
      throw error;
    });
    return manifestPromise;
  }

  function debugEvent(debug, event, detail = {}) {
    if (typeof debug === "function") debug(event, detail);
  }

  function debugNow(debug) {
    if (typeof debug !== "function") return 0;
    return global.performance?.now?.() ?? Date.now();
  }

  async function loadLocalDefinitions(word, debug) {
    const normalized = normalizeWord(word).replace(/[^a-z]/g, "");
    if (!normalized) return [];
    const key = normalized[0];
    const fromCache = localShardPromises.has(key);
    if (!fromCache) {
      debugEvent(debug, "localShardLoad", { shard: key });
      localShardPromises.set(key, (async () => {
        const manifest = await loadManifest();
        const shard = manifest.shards[key];
        if (!shard) return;
        const parts = shard.parts || [shard];
        const payloads = await Promise.all(parts.map(async (part) => {
          const response = await fetch(`${DEFINITION_BASE_URL}${part.file}?v=${manifest.datasetVersion}`);
          if (!response.ok) throw new Error(`Local definition shard ${key} failed.`);
          return JSON.parse(await decodeResponse(response));
        }));
        payloads.flat().forEach((record) => addLocalDefinition(record[0], record[2]));
      })().catch((error) => {
        localShardPromises.delete(key);
        throw error;
      }));
    } else debugEvent(debug, "localShardCacheHit", { shard: key });
    await localShardPromises.get(key);
    debugEvent(debug, "localShardReady", { shard: key, cached: fromCache });
    return localEntries(word);
  }

  async function fetchDatamuse(word, signal, debug) {
    const requestedWord = normalizeWord(word);
    const acceptedHeadwords = new Set(lookupForms(requestedWord));
    for (const form of acceptedHeadwords) {
      const fromCache = remoteCache.has(form);
      if (!fromCache) {
        debugEvent(debug, "datamuseCall", { word: form });
        const parameters = new URLSearchParams({ sp: form, md: "d", max: "1" });
        const responseStarted = debugNow(debug);
        const response = await fetch(`https://api.datamuse.com/words?${parameters}`, { signal });
        if (!response.ok) throw new Error("Definition unavailable");
        const entries = (await response.json()).filter((entry) => acceptedHeadwords.has(normalizeWord(entry.word)) && entry.defs?.length);
        debugEvent(debug, "datamuseDuration", { milliseconds: debugNow(debug) - responseStarted, word: form });
        remoteCache.set(form, entries);
      } else debugEvent(debug, "datamuseCacheHit", { word: form });
      const entries = remoteCache.get(form);
      if (entries.length) {
        return {
          entries: entries.map((entry) => ({ ...entry, sourceWord: entry.word, word: requestedWord })),
          source: "datamuse",
          matchedWord: entries[0].word,
          cached: fromCache
        };
      }
    }
    return { entries: [], source: "datamuse", matchedWord: requestedWord, cached: false };
  }

  async function lookup(word, { local = [], signal, allowRemote = true, debug } = {}) {
    const requestedWord = normalizeWord(word);
    debugEvent(debug, "localLookupPlan", {
      shards: [...new Set(lookupForms(requestedWord).map((form) => {
        return normalizeWord(form).replace(/[^a-z]/g, "")[0] || "";
      }).filter((key) => key !== "0"))]
    });
    const localStarted = debugNow(debug);
    register(requestedWord, local);
    for (const form of lookupForms(requestedWord)) {
      debugEvent(debug, "localLookup", { word: form });
      let entries = localEntries(form);
      if (entries.length) debugEvent(debug, "localCacheHit", { word: form });
      if (!entries.length) {
        try { entries = await loadLocalDefinitions(form, debug); } catch (error) {
          debugEvent(debug, "localError", { word: form });
          if (!allowRemote) throw error;
        }
      }
      if (entries.length) {
        debugEvent(debug, "localDuration", { milliseconds: debugNow(debug) - localStarted });
        if (form !== requestedWord) debugEvent(debug, "baseFormMatch", { requestedWord, matchedWord: form });
        return {
          entries: entries.map((entry) => ({ ...entry, sourceWord: form, word: requestedWord })),
          source: "local",
          matchedWord: form,
          cached: true
        };
      }
      debugEvent(debug, "localMiss", { word: form });
    }
    debugEvent(debug, "localDuration", { milliseconds: debugNow(debug) - localStarted });
    if (!allowRemote) return { entries: [], source: "local", matchedWord: requestedWord, cached: true };
    const result = await fetchDatamuse(word, signal, debug);
    if (result.matchedWord !== requestedWord) debugEvent(debug, "baseFormMatch", { requestedWord, matchedWord: result.matchedWord });
    return result;
  }

  global.MonkeyTacticsWordDefinitions = Object.freeze({ lookup, register, getLocal: localEntries, normalizeWord });
})(window);
