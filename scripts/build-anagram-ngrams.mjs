import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const BIGRAM_URL = "https://norvig.com/ngrams/count_2w.txt";
const TEXT_URL = "https://norvig.com/big.txt";
const [bigramResponse, textResponse] = await Promise.all([fetch(BIGRAM_URL), fetch(TEXT_URL)]);
if (!bigramResponse.ok || !textResponse.ok) throw new Error("English n-gram corpus download failed.");

const records = [];
const bigrams = [];
for (const line of (await bigramResponse.text()).split(/\r?\n/)) {
  const match = line.match(/^([a-z]+)\s+([a-z]+)\s+(\d+)$/);
  if (match) bigrams.push([`${match[1]} ${match[2]}`, Number(match[3])]);
}
for (const [phrase, count] of bigrams.sort((a, b) => b[1] - a[1]).slice(0, 75000)) {
  records.push(`${phrase}\t${Math.max(1, Math.round(Math.log2(count) * 8))}`);
}

const tokens = (await textResponse.text()).toLowerCase().match(/[a-z]+/g) || [];
const trigrams = new Map();
for (let index = 0; index + 2 < tokens.length; index += 1) {
  const phrase = `${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`;
  trigrams.set(phrase, (trigrams.get(phrase) || 0) + 1);
}
for (const [phrase, count] of [...trigrams].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 30000)) {
  records.push(`${phrase}\t${Math.max(1, Math.round(Math.log2(count) * 12))}`);
}

const compressed = gzipSync(`${records.join("\n")}\n`, { level: 9, mtime: 0 });
await writeFile(new URL("../assets/data/words/anagram-ngrams-v1.tsv.gz", import.meta.url), compressed);
await writeFile(new URL("../assets/data/words/anagram-ngrams-v1.json", import.meta.url), `${JSON.stringify({ version: 1, records: records.length, bigramSource: BIGRAM_URL, trigramSource: TEXT_URL, sha256: createHash("sha256").update(compressed).digest("hex") })}\n`);
console.log(`Built ${records.length.toLocaleString()} anagram n-gram records (${compressed.byteLength.toLocaleString()} bytes).`);
