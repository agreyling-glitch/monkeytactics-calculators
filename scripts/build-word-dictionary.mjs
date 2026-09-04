import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { decodeTrie } from "cspell-trie-lib";

const VERSION = "wiktionary-v1";
const OUTPUT_DIRECTORY = new URL("../assets/data/words/", import.meta.url);
const MINIMUM_WORD_LENGTH = 2;
const ENABLE_SOURCE = { bit: 1, name: "ENABLE", url: "https://www.norvig.com/ngrams/enable1.txt", license: "Public Domain" };
const WIKTIONARY_SOURCE = {
  bit: 2,
  name: "Wiktionary",
  package: "@kitschpatrol/dict-en-wiktionary",
  packageVersion: "1.5.0",
  sourceDate: "2026-05",
  url: "https://en.wiktionary.org/",
  processedBy: "https://github.com/kitschpatrol/dict-en-wiktionary",
  license: "CC BY-SA 4.0 and GFDL"
};
const WIKTIONARY_TRIE = new URL("../node_modules/@kitschpatrol/dict-en-wiktionary/dict/en-wiktionary.trie", import.meta.url);

function normalizeWords(words) {
  return [...new Set([...words]
    .map((word) => word.trim().toLowerCase())
    .filter((word) => /^[a-z]+$/.test(word) && word.length >= MINIMUM_WORD_LENGTH))];
}

async function downloadEnable() {
  const response = await fetch(ENABLE_SOURCE.url);
  if (!response.ok) throw new Error(`ENABLE download failed with status ${response.status}`);
  return normalizeWords((await response.text()).split(/\r?\n/));
}

async function readWiktionary() {
  const trie = decodeTrie(await readFile(WIKTIONARY_TRIE, "utf8"));
  return normalizeWords(trie.words());
}

const [enableWords, wiktionaryWords] = await Promise.all([downloadEnable(), readWiktionary()]);
const membershipByWord = new Map();
for (const [words, bit] of [[enableWords, ENABLE_SOURCE.bit], [wiktionaryWords, WIKTIONARY_SOURCE.bit]]) {
  for (const word of words) membershipByWord.set(word, (membershipByWord.get(word) ?? 0) | bit);
}

const words = [...membershipByWord].sort(([wordA], [wordB]) => wordA.localeCompare(wordB));
const chunks = {};
await mkdir(OUTPUT_DIRECTORY, { recursive: true });

for (let code = 97; code <= 122; code += 1) {
  const letter = String.fromCharCode(code);
  const chunkWords = words.filter(([word]) => word.startsWith(letter));
  const contents = `${chunkWords.map(([word, membership]) => `${word}\t${membership}`).join("\n")}\n`;
  const compressed = gzipSync(contents, { level: 9, mtime: 0 });
  const file = `${letter}.${VERSION}.txt.gz`;
  await writeFile(new URL(file, OUTPUT_DIRECTORY), compressed);
  chunks[letter] = { file, words: chunkWords.length, bytes: compressed.byteLength, sha256: createHash("sha256").update(compressed).digest("hex") };
}

const overlapWords = enableWords.filter((word) => (membershipByWord.get(word) & 2) !== 0).length;
const manifest = {
  version: VERSION,
  encoding: "gzip-newline-membership",
  membership: { standard: 1, expanded: 2, both: 3 },
  totalWords: words.length,
  minimumWordLength: MINIMUM_WORD_LENGTH,
  sourceCounts: { standard: enableWords.length, expanded: wiktionaryWords.length, overlap: overlapWords },
  sources: [ENABLE_SOURCE, WIKTIONARY_SOURCE].map(({ bit, ...source }) => source),
  chunks
};

await writeFile(new URL(`manifest.${VERSION}.json`, OUTPUT_DIRECTORY), `${JSON.stringify(manifest)}\n`, "utf8");
console.log(
  `Built ${words.length.toLocaleString()} unique words: ${enableWords.length.toLocaleString()} ENABLE, ` +
  `${wiktionaryWords.length.toLocaleString()} Wiktionary, ${overlapWords.toLocaleString()} shared.`
);
