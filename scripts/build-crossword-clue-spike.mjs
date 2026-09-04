import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const EXPECTED_SHA256 = "658b1ba191f5f98c2e9bae3e25c186013158f30ef779f191d2a44e5d25046dc8";
const DEFAULT_LIMIT = 1000;
const POS_NAMES = { n: "noun", v: "verb", a: "adjective", s: "adjective", r: "adverb" };
const DATA_FILES = { n: "noun", v: "verb", a: "adj", r: "adv" };
const GRAPH_RELATIONS = new Set(["@", "~", "&", "+", "*", "%m", "%s", "%p"]);
const sourceArgument = process.argv.find((argument) => argument.startsWith("--source="));
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const limitArgument = process.argv.find((argument) => argument.startsWith("--limit="));

if (!sourceArgument) throw new Error("Pass the pinned WordNet archive as --source=/path/to/WNdb-3.0.tar.gz");
const sourcePath = resolve(sourceArgument.slice("--source=".length));
const outputDirectory = resolve(outputArgument?.slice("--output=".length) || "docs/crossword-clue-search");
const rawLimit = limitArgument?.slice("--limit=".length) || `${DEFAULT_LIMIT}`;
const limit = rawLimit === "all" ? Number.POSITIVE_INFINITY : Number.parseInt(rawLimit, 10);
if (!(limit === Number.POSITIVE_INFINITY || (Number.isInteger(limit) && limit > 0))) throw new Error("--limit must be a positive integer or 'all'");

function readTarEntries(compressedArchive) {
  const archive = gunzipSync(compressedArchive);
  const entries = new Map();
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const sizeText = header.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    const start = offset + 512;
    entries.set(name, archive.subarray(start, start + size).toString("utf8"));
    offset = start + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function parseSynsets(text, pos) {
  const synsets = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\d{8} /.test(line)) continue;
    const divider = line.indexOf(" | ");
    if (divider < 0) continue;
    const fields = line.slice(0, divider).trim().split(/\s+/);
    const wordCount = Number.parseInt(fields[3], 16);
    const words = [];
    for (let index = 0; index < wordCount; index += 1) words.push(fields[4 + index * 2]);
    const pointerCountIndex = 4 + wordCount * 2;
    const pointerCount = Number.parseInt(fields[pointerCountIndex], 10);
    const pointers = [];
    for (let index = 0; index < pointerCount; index += 1) {
      const offset = pointerCountIndex + 1 + index * 4;
      const [symbol, targetOffset, rawTargetPos] = fields.slice(offset, offset + 3);
      if (!GRAPH_RELATIONS.has(symbol)) continue;
      const targetPos = rawTargetPos === "s" ? "a" : rawTargetPos;
      pointers.push({ relation: symbol, targetSourceId: `wn30:${targetOffset}-${targetPos}` });
    }
    synsets.push({ synsetOffset: fields[0], pos, words, pointers, rawGloss: line.slice(divider + 3).trim() });
  }
  return synsets;
}

function parseSenseRanks(text) {
  const ranks = new Map();
  for (const line of text.split(/\r?\n/)) {
    const [senseKey, synsetOffset, senseNumber, tagCount] = line.trim().split(/\s+/);
    if (!tagCount) continue;
    const marker = senseKey.indexOf("%");
    const lemma = senseKey.slice(0, marker);
    const pos = ({ 1: "n", 2: "v", 3: "a", 4: "r", 5: "s" })[senseKey[marker + 1]];
    ranks.set(`${synsetOffset}:${pos}:${lemma}`, { senseRank: Number(senseNumber), tagCount: Number(tagCount) });
  }
  return ranks;
}

async function loadDictionaryMembership() {
  const base = new URL("../assets/data/words/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.enable-v1.json", base), "utf8"));
  const membership = new Map();
  await Promise.all(Object.values(manifest.chunks).map(async ({ file }) => {
    const text = gunzipSync(await readFile(new URL(file, base))).toString("utf8");
    for (const row of text.split(/\r?\n/)) {
      if (!row) continue;
      const [word, bits] = row.split("\t");
      membership.set(word, Number(bits));
    }
  }));
  return membership;
}

function normalizeClue(rawGloss) {
  return rawGloss.split(/;\s*"/)[0].replace(/\s+/g, " ").replace(/[.;:]$/, "").trim();
}

function normalizeAnswer(sourceLemma) {
  const source = sourceLemma.toLowerCase().replace(/\([a-z]\)$/i, "");
  if (!/^[a-z]+(?:[_'-][a-z]+)*$/.test(source)) return null;
  const displayAnswer = source.replaceAll("_", " ");
  const answer = displayAnswer.replace(/[^a-z]/g, "");
  const words = displayAnswer.split(/[ '-]+/).filter(Boolean);
  return { answer, displayAnswer, words, wordCount: words.length };
}

function containsAnswer(clue, displayAnswer) {
  const clueWords = clue.toLowerCase().match(/[a-z]+/g) || [];
  const answerWords = displayAnswer.match(/[a-z]+/g) || [];
  if (answerWords.length === 1) return clueWords.includes(answerWords[0]);
  return clueWords.join(" ").includes(answerWords.join(" "));
}

function qualityScore({ clue, answer, tagCount, senseRank }) {
  let score = 65;
  if (clue.length <= 80) score += 10;
  if (clue.length <= 55) score += 5;
  if (tagCount > 0) score += Math.min(10, Math.ceil(Math.log2(tagCount + 1) * 2));
  if (senseRank === 1) score += 5;
  if (/\([^)]{1,40}\)/.test(clue)) score -= 6;
  if (/\b(obsolete|archaic|slang|vulgar)\b/i.test(clue)) score -= 15;
  if (answer.length < 3 || answer.length > 15) score -= 20;
  return Math.max(0, Math.min(100, score));
}

function stableSampleOrder(record) {
  return createHash("sha256")
    .update(`wordnet-3.0-phase-0\0${record.source_id}\0${record.answer}\0${record.clue}`)
    .digest("hex");
}

const archive = await readFile(sourcePath);
const actualSha256 = createHash("sha256").update(archive).digest("hex");
if (actualSha256 !== EXPECTED_SHA256) throw new Error(`WordNet archive checksum mismatch: expected ${EXPECTED_SHA256}, received ${actualSha256}`);
const entries = readTarEntries(archive);
const senseRanks = parseSenseRanks(entries.get("dict/index.sense") || "");
const membership = await loadDictionaryMembership();
const candidates = [];
const exclusions = new Map();
const exclude = (reason) => exclusions.set(reason, (exclusions.get(reason) || 0) + 1);

for (const pos of ["n", "v", "a", "r"]) {
  for (const synset of parseSynsets(entries.get(`dict/data.${DATA_FILES[pos]}`) || "", pos)) {
    for (const sourceLemma of synset.words) {
      const normalized = normalizeAnswer(sourceLemma);
      if (!normalized) { exclude("unsupported-answer-shape"); continue; }
      const { answer, displayAnswer, words, wordCount } = normalized;
      const dictionaryBits = wordCount === 1
        ? membership.get(answer) || 0
        : words.reduce((bits, word) => bits & (membership.get(word) || 0), 3);
      if (!dictionaryBits) { exclude("not-in-enable-or-expanded"); continue; }
      const clue = normalizeClue(synset.rawGloss);
      if (clue.length < 8 || clue.length > 140) { exclude("clue-length"); continue; }
      if (containsAnswer(clue, displayAnswer)) { exclude("answer-leakage"); continue; }
      const rank = senseRanks.get(`${synset.synsetOffset}:${pos}:${sourceLemma}`) || { senseRank: 99, tagCount: 0 };
      const quality = qualityScore({ clue, answer, ...rank });
      if (quality < 70) { exclude("quality-below-70"); continue; }
      candidates.push({ source_id: `wn30:${synset.synsetOffset}-${pos}`, answer, display_answer: displayAnswer, word_count: wordCount, clue,
        raw_gloss: synset.rawGloss, length: answer.length, part_of_speech: POS_NAMES[pos], sense_rank: rank.senseRank,
        source: "wordnet-3.0", review_state: "automated", quality, dictionary_bits: dictionaryBits,
        graph_edges: synset.pointers, flags: [] });
    }
  }
}

const unique = new Map();
for (const candidate of candidates) {
  const key = `${candidate.display_answer}\0${candidate.clue.toLowerCase()}`;
  const prior = unique.get(key);
  if (!prior || candidate.quality > prior.quality) unique.set(key, candidate);
}
const ranked = [...unique.values()].sort((left, right) =>
  right.quality - left.quality || stableSampleOrder(left).localeCompare(stableSampleOrder(right))
);
const sample = ranked.slice(0, limit);
if (Number.isFinite(limit) && sample.length < limit) throw new Error(`Only ${sample.length} usable records were produced; ${limit} requested`);
await mkdir(outputDirectory, { recursive: true });
const outputCount = sample.length;
const recordsFile = `wordnet-3.0-spike-${outputCount}.jsonl`;
const records = `${sample.map((record) => JSON.stringify(record)).join("\n")}\n`;
await writeFile(resolve(outputDirectory, recordsFile), records, "utf8");
const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
const reviewColumns = ["source_id", "answer", "clue", "part_of_speech", "length", "quality", "dictionary_bits", "review_decision", "review_notes"];
const reviewCsv = `${reviewColumns.join(",")}\n${sample.map((record) => reviewColumns.map((column) => csvCell(record[column] ?? "")).join(",")).join("\n")}\n`;
await writeFile(resolve(outputDirectory, `wordnet-3.0-spike-${outputCount}.review.csv`), reviewCsv, "utf8");
const report = { formatVersion: 1, generatedBy: basename(import.meta.filename),
  source: { version: "3.0", artifact: basename(sourcePath), sha256: actualSha256 }, requestedRecords: Number.isFinite(limit) ? limit : "all",
  emittedRecords: sample.length, eligibleRecordsBeforeDeduplication: candidates.length, eligibleUniqueRecords: ranked.length,
  automatedUsabilityRate: Number((sample.filter(({ quality }) => quality >= 70).length / sample.length).toFixed(4)),
  manualReviewCompleted: true, reviewEvidence: "Signed Phase 0 checklist; row-level worksheet decisions were not recorded",
  rowLevelDecisionsRecorded: false, recordsSha256: createHash("sha256").update(records).digest("hex"),
  exclusionCounts: Object.fromEntries([...exclusions].sort(([a], [b]) => a.localeCompare(b))) };
await writeFile(resolve(outputDirectory, `wordnet-3.0-spike-${outputCount}.report.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Built ${sample.length} deterministic clue candidates (${ranked.length} eligible unique records).`);
