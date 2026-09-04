const ASSET_VERSION = "20260809-2";
const MANIFEST_URL = "/assets/data/words/manifest.wiktionary-v1.json?v=wiktionary-v1";
const CHUNK_BASE_URL = "/assets/data/words/";
const moduleUrl = new URL(
  `/assets/wasm/word-unscrambler/word_unscrambler_engine.js?v=${ASSET_VERSION}`,
  import.meta.url
);
const binaryUrl = new URL(
  `/assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm?v=${ASSET_VERSION}`,
  import.meta.url
);

let enginePromise;
let manifestPromise;
const loadedChunks = new Set();
const chunkPromises = new Map();

async function getEngine() {
  if (!enginePromise) {
    enginePromise = import(moduleUrl.href).then(async function (engine) {
      await engine.default({ module_or_path: binaryUrl });
      if (!engine.verify_domain(window.location.hostname)) {
        throw new Error("Unauthorized domain");
      }
      return engine;
    });
  }
  return enginePromise;
}

async function getManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL).then(async function (response) {
      if (!response.ok) throw new Error("Unable to load the local word index.");
      const manifest = await response.json();
      if (!manifest?.chunks || manifest.encoding !== "gzip-newline-membership") {
        throw new TypeError("The local word index is invalid.");
      }
      return manifest;
    });
  }
  return manifestPromise;
}

async function decodeChunk(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!isGzip) return new TextDecoder().decode(bytes);
  if (!("DecompressionStream" in window)) {
    throw new Error("This browser cannot open the local word index.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function loadChunk(letter) {
  if (loadedChunks.has(letter)) return;
  if (chunkPromises.has(letter)) return chunkPromises.get(letter);

  const promise = (async function () {
    const [engine, manifest] = await Promise.all([getEngine(), getManifest()]);
    const chunk = manifest.chunks[letter];
    if (!chunk) return;
    const response = await fetch(CHUNK_BASE_URL + chunk.file);
    if (!response.ok) throw new Error("Unable to load a local dictionary shard.");
    const text = await decodeChunk(response);
    engine.init_engine(text.split(/\r?\n/).filter(Boolean));
    loadedChunks.add(letter);
  })();

  chunkPromises.set(letter, promise);
  try {
    await promise;
  } finally {
    chunkPromises.delete(letter);
  }
}

export function normalizeUnscrambleTerm(value) {
  const word = String(value || "").trim().toLowerCase();
  return /^[a-z]{2,30}$/.test(word) ? word : "";
}

export async function unscrambleLocal(value) {
  const rack = normalizeUnscrambleTerm(value);
  if (!rack) throw new TypeError("Select one English word containing 2 to 30 letters.");

  await Promise.all([...new Set(rack)].map(loadChunk));
  const engine = await getEngine();
  const options = {
    dictionaryBit: 3,
    wordLength: 0,
    startsWith: "",
    endsWith: "",
    mustInclude: "",
    excludeLetters: "",
    highValueOnly: false,
    minimumVowels: 0,
    minimumConsonants: 0,
    minimumScore: null,
    maximumScore: null,
    hookFilter: "",
    sortBy: "score-desc"
  };
  const matches = engine.unscramble(rack, "", options);
  return matches.map(function (word) {
    return { word, score: engine.score_word(word) };
  });
}
