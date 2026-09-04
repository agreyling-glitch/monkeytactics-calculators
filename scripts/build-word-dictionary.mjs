import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const VERSION = "enable-v1";
const OUTPUT_DIRECTORY = new URL("../assets/data/words/", import.meta.url);
const MINIMUM_WORD_LENGTH = 2;
const SOURCES = [
  {
    bit: 1,
    name: "ENABLE",
    url: "https://www.norvig.com/ngrams/enable1.txt",
    license: "Public Domain"
  }
];

function normalizeWords(text) {
  return text
    .split(/\r?\n/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => /^[a-z]+$/.test(word) && word.length >= MINIMUM_WORD_LENGTH);
}

async function downloadSource(source) {
  const response = await fetch(source.url);

  if (!response.ok) {
    throw new Error(`${source.name} download failed with status ${response.status}`);
  }

  return normalizeWords(await response.text());
}

const sourceWordLists = await Promise.all(SOURCES.map(downloadSource));
const membershipByWord = new Map();

sourceWordLists.forEach((words, index) => {
  const sourceBit = SOURCES[index].bit;

  words.forEach((word) => {
    membershipByWord.set(word, (membershipByWord.get(word) ?? 0) | sourceBit);
  });
});

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
  chunks[letter] = {
    file,
    words: chunkWords.length,
    bytes: compressed.byteLength,
    sha256: createHash("sha256").update(compressed).digest("hex")
  };
}

const sourceCounts = {
  standard: sourceWordLists[0].length
};

const manifest = {
  version: VERSION,
  encoding: "gzip-newline-membership",
  membership: {
    standard: 1
  },
  totalWords: words.length,
  minimumWordLength: MINIMUM_WORD_LENGTH,
  sourceCounts,
  sources: SOURCES.map(({ bit, ...source }) => source),
  chunks
};

await writeFile(
  new URL(`manifest.${VERSION}.json`, OUTPUT_DIRECTORY),
  `${JSON.stringify(manifest)}\n`,
  "utf8"
);

console.log(
  `Built ${words.length.toLocaleString()} Standard words from ENABLE.`
);
