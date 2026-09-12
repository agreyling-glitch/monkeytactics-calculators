import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";

const OUTPUT = new URL("../assets/data/words/anagram-language-v1.tsv.gz", import.meta.url);
const MANIFEST = new URL("../assets/data/word-definitions/manifest.wordnet-definitions-v1.json", import.meta.url);
const FREQUENCY_URL = "https://norvig.com/ngrams/count_1w.txt";
const POS_BITS = { noun: 1, verb: 2, adjective: 4, adverb: 8 };
const frequencyResponse = await fetch(FREQUENCY_URL);
if (!frequencyResponse.ok) throw new Error(`Frequency corpus download failed: ${frequencyResponse.status}`);
const frequencies = new Map();
for (const line of (await frequencyResponse.text()).split(/\r?\n/)) {
  const [word, count] = line.split(/\s+/);
  if (/^[a-z]+$/.test(word) && frequencies.size < 100000) frequencies.set(word, Number(count) || 0);
}
const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
const pos = new Map();
for (const shard of Object.values(manifest.shards)) {
  const records = JSON.parse(gunzipSync(await readFile(new URL(`../assets/data/word-definitions/${shard.file}`, import.meta.url))));
  for (const [word, part] of records) pos.set(word, (pos.get(word) || 0) | (POS_BITS[part] || 0));
}
const words = new Set([...frequencies.keys(), ...pos.keys()]);
const lines = [...words].sort().map((word) => `${word}\t${frequencies.get(word) || 0}\t${pos.get(word) || 0}`);
const compressed = gzipSync(`${lines.join("\n")}\n`, { level: 9, mtime: 0 });
await writeFile(OUTPUT, compressed);
await writeFile(new URL("../assets/data/words/anagram-language-v1.json", import.meta.url), `${JSON.stringify({ version: 1, records: lines.length, frequencySource: FREQUENCY_URL, wordNetVersion: manifest.datasetVersion, sha256: createHash("sha256").update(compressed).digest("hex") })}\n`);
console.log(`Built ${lines.length.toLocaleString()} anagram language records (${compressed.byteLength.toLocaleString()} bytes).`);
