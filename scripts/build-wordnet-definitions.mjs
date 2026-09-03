import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

const EXPECTED_SHA256 = "658b1ba191f5f98c2e9bae3e25c186013158f30ef779f191d2a44e5d25046dc8";
const DATA_FILES = { n: "noun", v: "verb", a: "adj", r: "adv" };
const POS_NAMES = { n: "noun", v: "verb", a: "adjective", s: "adjective", r: "adverb" };
const VERSION = "wordnet-3.0-definitions-v1";
const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="));

if (!sourceArgument) throw new Error("Pass the pinned WordNet archive as --source=/path/to/WNdb-3.0.tar.gz");

function readTarEntries(compressedArchive) {
  const archive = gunzipSync(compressedArchive);
  const entries = new Map();
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const size = Number.parseInt(header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim() || "0", 8);
    const start = offset + 512;
    entries.set(name, archive.subarray(start, start + size).toString("utf8"));
    offset = start + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function normalizeLemma(value) {
  const source = value.toLowerCase().replace(/\([a-z]\)$/i, "").replaceAll("_", " ");
  if (!/^[a-z]+(?:[ '-][a-z]+)*$/.test(source)) return "";
  return source.replace(/[^a-z]/g, "");
}

function definitionFromGloss(rawGloss) {
  return rawGloss.split(/;\s*"/)[0].replace(/\s+/g, " ").trim();
}

const sourcePath = resolve(sourceArgument.slice("--source=".length));
const archive = await readFile(sourcePath);
const actualSha256 = createHash("sha256").update(archive).digest("hex");
if (actualSha256 !== EXPECTED_SHA256) throw new Error(`WordNet archive checksum mismatch: ${actualSha256}`);
const entries = readTarEntries(archive);
const records = new Map();

for (const pos of ["n", "v", "a", "r"]) {
  for (const line of (entries.get(`dict/data.${DATA_FILES[pos]}`) || "").split(/\r?\n/)) {
    if (!/^\d{8} /.test(line)) continue;
    const divider = line.indexOf(" | ");
    if (divider < 0) continue;
    const fields = line.slice(0, divider).trim().split(/\s+/);
    const wordCount = Number.parseInt(fields[3], 16);
    const definition = definitionFromGloss(line.slice(divider + 3));
    for (let index = 0; index < wordCount; index += 1) {
      const word = normalizeLemma(fields[4 + index * 2]);
      if (!word || !definition) continue;
      const key = `${word}\0${POS_NAMES[pos]}\0${definition.toLowerCase()}`;
      records.set(key, [word, POS_NAMES[pos], definition]);
    }
  }
}

const output = new URL("../assets/data/word-definitions/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const shards = {};
const byLetter = Map.groupBy([...records.values()], ([word]) => /^[a-z]/.test(word) ? word[0] : "other");
for (const [letter, values] of [...byLetter].sort(([left], [right]) => left.localeCompare(right))) {
  values.sort(([leftWord, leftPos, leftDefinition], [rightWord, rightPos, rightDefinition]) =>
    leftWord.localeCompare(rightWord) || leftPos.localeCompare(rightPos) || leftDefinition.localeCompare(rightDefinition));
  const file = `${letter}.wordnet-definitions-v1.json.gz`;
  const bytes = gzipSync(`${JSON.stringify(values)}\n`, { level: 9, mtime: 0 });
  await writeFile(new URL(file, output), bytes);
  shards[letter] = { file, records: values.length, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
}

const manifest = {
  formatVersion: 1,
  schema: ["word", "partOfSpeech", "definition"],
  datasetVersion: VERSION,
  encoding: "gzip-json",
  recordCount: records.size,
  source: { name: "WordNet", version: "3.0", sha256: actualSha256, notice: "/third-party-notices#wordnet-heading" },
  shards
};
await writeFile(new URL("manifest.wordnet-definitions-v1.json", output), `${JSON.stringify(manifest)}\n`, "utf8");
console.log(`Built ${records.size} WordNet definition records in ${Object.keys(shards).length} shards.`);
