import {
  init_engine,
  initSync,
  is_valid_word,
  unscramble as wasmUnscramble,
} from "../../../assets/wasm/word-unscrambler/word_unscrambler_engine.js";
import wasmModule from "../../../assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm";

const SITE_URL = "https://monkeytactics.com";
const TOOL_PATH = "/tools/word-unscrambler";
const WORD_DATA_PATH = "/assets/data/words";
const WORD_DATA_VERSION = "enable-v1";
const DICTIONARY_BIT = 3;

let wasmInitialized = false;
const dictionaryInitializations = new Map();

async function initWasm() {
  if (!wasmInitialized) {
    initSync({ module: wasmModule });
    wasmInitialized = true;
  }
}

async function readDictionaryShard(response) {
  const bytes = await response.arrayBuffer();
  const view = new Uint8Array(bytes);

  if (view[0] !== 0x1f || view[1] !== 0x8b) {
    return new TextDecoder().decode(view);
  }

  const decompressed = new Response(bytes).body.pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Response(decompressed).text();
}

async function loadDictionaryShard(context, letter) {
  if (!dictionaryInitializations.has(letter)) {
    const initialization = (async () => {
      const filename = `${letter}.${WORD_DATA_VERSION}.txt.gz`;
      const shardURL = new URL(`${WORD_DATA_PATH}/${filename}`, context.request.url);
      const response = await context.env.ASSETS.fetch(shardURL);

      if (!response.ok) {
        throw new Error(`Unable to load dictionary shard (${response.status})`);
      }

      const text = await readDictionaryShard(response);
      const records = text.split(/\r?\n/).filter(Boolean);
      init_engine(records);
    })().catch((error) => {
      dictionaryInitializations.delete(letter);
      throw error;
    });

    dictionaryInitializations.set(letter, initialization);
  }

  await dictionaryInitializations.get(letter);
}

async function loadRequiredDictionaryShards(context, word) {
  const letters = [...new Set(word)];
  await Promise.all(letters.map((letter) => loadDictionaryShard(context, letter)));
}

function unscramble(word) {
  return wasmUnscramble(word, "", {
    dictionaryBit: DICTIONARY_BIT,
    sortBy: "length-desc",
  });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeWord(value) {
  try {
    return decodeURIComponent(String(value ?? "")).trim().toLowerCase();
  } catch {
    return "";
  }
}

function renderResultsHTML(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return "<p>No words can be made from these letters.</p>";
  }

  const uniqueResults = [...new Set(results)]
    .filter((result) => typeof result === "string" && /^[a-z]+$/i.test(result));

  if (uniqueResults.length === 0) {
    return "<p>No words can be made from these letters.</p>";
  }

  const items = uniqueResults
    .map((result) => {
      const normalizedResult = result.toLowerCase();
      const label = escapeHTML(normalizedResult);
      const href = `${TOOL_PATH}/${encodeURIComponent(normalizedResult)}`;
      return `<li><a href="${href}">${label}</a></li>`;
    })
    .join("");

  return `<ul>${items}</ul>`;
}

function renderPageHTML({ word = "", results = [], valid = false }) {
  const safeWord = escapeHTML(word);
  const canonical = valid
    ? `${SITE_URL}${TOOL_PATH}/${encodeURIComponent(word)}`
    : `${SITE_URL}${TOOL_PATH}`;
  const title = valid
    ? `Unscramble ${safeWord} | MonkeyTactics`
    : "Free Word Unscrambler | MonkeyTactics";
  const description = valid
    ? `Unscramble ${safeWord} using the Standard (ENABLE) dictionary.`
    : "Unscramble letters into words using the Standard (ENABLE) dictionary.";
  const content = valid
    ? `<h1>Unscramble &quot;${safeWord}&quot;</h1>
       <p>Words you can make from <strong>${safeWord}</strong>:</p>
       ${renderResultsHTML(results)}`
    : `<h1>Word Unscrambler</h1>
       <p>Enter a valid dictionary word in the main unscrambler to find words from its letters.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
</head>
<body>
  <main>
    ${content}
    <p><a href="${TOOL_PATH}">Open the main Word Unscrambler</a></p>
  </main>
</body>
</html>`;
}

export async function onRequest(context) {
  const word = normalizeWord(context.params.word);

  if (!/^[a-z]+$/.test(word)) {
    return new Response(renderPageHTML({ valid: false }), {
      status: 200,
      headers: { "content-type": "text/html; charset=UTF-8" },
    });
  }

  await initWasm();
  await loadRequiredDictionaryShards(context, word);

  const results = unscramble(word);
  const valid = is_valid_word(word);

  return new Response(renderPageHTML({ word, results, valid }), {
    status: 200,
    headers: { "content-type": "text/html; charset=UTF-8" },
  });
}
