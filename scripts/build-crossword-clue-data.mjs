import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const inputArgument = process.argv.find((argument) => argument.startsWith("--input="));
if (!inputArgument) throw new Error("Pass the approved filtered JSONL as --input=/path/to/wordnet-records.jsonl");
const INPUT = pathToFileURL(resolve(inputArgument.slice("--input=".length)));
const OUTPUT = new URL("../assets/data/crossword-clues/", import.meta.url);
const VERSION = "wordnet-3.0-phrases-v4";
const GRAPH_RELATION_WEIGHTS = { "&": 90, "@": 70, "~": 70, "+": 65, "*": 55, "%m": 40, "%s": 40, "%p": 40 };
const MAX_GRAPH_CANDIDATES_PER_TERM = 64;
const STOP_WORDS = new Set(["a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it", "of", "on", "or", "that", "the", "to", "with"]);

export function tokenizeClue(value) {
  return [...new Set((value.toLowerCase().normalize("NFKD").match(/[a-z0-9]+/g) || [])
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token)))];
}

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function gzipJson(value) {
  return gzipSync(`${JSON.stringify(value)}\n`, { level: 9, mtime: 0 });
}

const sourceText = await readFile(INPUT, "utf8");
const sourceRecords = sourceText.trim().split("\n").map(JSON.parse);
const sortedSourceRecords = sourceRecords.sort((left, right) => left.length - right.length || left.answer.localeCompare(right.answer) || left.source_id.localeCompare(right.source_id) || left.clue.localeCompare(right.clue));
const records = sortedSourceRecords.map((record, index) => ({
  id: index + 1,
  sourceId: record.source_id,
  clue: record.clue,
  answer: record.answer,
  displayAnswer: record.display_answer || record.answer,
  wordCount: record.word_count || 1,
  length: record.length,
  quality: record.quality,
  sourceBits: 1,
  dictionaryBits: record.dictionary_bits,
  graphEdges: record.graph_edges || []
}));
const byLength = Map.groupBy(records, ({ length }) => length > 15 ? "16-plus" : String(length));
const postings = {};
const synonymPostings = {};
const graphPostings = {};
const graphTargetsByAnswer = new Map();
const lengthRanges = {};

for (const record of records) {
  for (const token of tokenizeClue(record.clue)) {
    (postings[token] ||= []).push(record.id);
  }
}

// Records with the same WordNet source ID are lemmas in the same synset. Map
// each single-word lemma to the eligible answer records in those synsets so a
// clue can retrieve answers through a synonym even when no gloss word overlaps.
const recordsBySource = Map.groupBy(records, ({ sourceId }) => sourceId);
for (const synsetRecords of recordsBySource.values()) {
  if (synsetRecords.length < 2) continue;
  for (const { answer, wordCount } of synsetRecords) {
    if (wordCount > 1) continue;
    const relatedIds = synsetRecords.filter((record) => record.answer !== answer).map(({ id }) => id);
    if (!relatedIds.length) continue;
    const posting = (synonymPostings[answer] ||= []);
    posting.push(...relatedIds);
  }
}
for (const [answer, ids] of Object.entries(synonymPostings)) synonymPostings[answer] = [...new Set(ids)].sort((a, b) => a - b);

// Expand eligible answer lemmas through selected WordNet pointer relations.
// Each posting is stored as a flat [recordId, weight, ...] array to keep the
// compressed browser index substantially smaller than arrays of objects.
for (const synsetRecords of recordsBySource.values()) {
  const edges = synsetRecords[0]?.graphEdges || [];
  for (const { answer, wordCount } of synsetRecords) {
    if (wordCount > 1) continue;
    const bestWeights = graphTargetsByAnswer.get(answer) || new Map();
    for (const { relation, targetSourceId } of edges) {
      const weight = GRAPH_RELATION_WEIGHTS[relation];
      if (!weight) continue;
      for (const target of recordsBySource.get(targetSourceId) || []) {
        if (target.answer === answer) continue;
        bestWeights.set(target.id, Math.max(bestWeights.get(target.id) || 0, weight));
      }
    }
    if (bestWeights.size) graphTargetsByAnswer.set(answer, bestWeights);
  }
}
for (const [answer, bestWeights] of graphTargetsByAnswer) {
  graphPostings[answer] = [...bestWeights]
    .sort(([leftId, leftWeight], [rightId, rightWeight]) => rightWeight - leftWeight || leftId - rightId)
    .slice(0, MAX_GRAPH_CANDIDATES_PER_TERM)
    .flat();
}

for (const [length, lengthRecords] of byLength) {
  lengthRanges[length] = [lengthRecords[0].id, lengthRecords.at(-1).id];
}

const index = {
  formatVersion: 4,
  datasetVersion: VERSION,
  stopWords: [...STOP_WORDS].sort(),
  lengthRanges,
  postings: Object.fromEntries(Object.entries(postings).sort(([a], [b]) => a.localeCompare(b))),
  synonymPostings: Object.fromEntries(Object.entries(synonymPostings).sort(([a], [b]) => a.localeCompare(b))),
  graphPostings: Object.fromEntries(Object.entries(graphPostings).sort(([a], [b]) => a.localeCompare(b)))
};

await rm(OUTPUT, { recursive: true, force: true });
await mkdir(OUTPUT, { recursive: true });
const indexFile = "keyword-index-v4.json.gz";
const indexBytes = gzipJson(index);
await writeFile(new URL(indexFile, OUTPUT), indexBytes);
const shards = {};

for (const [length, shardRecords] of [...byLength].sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))) {
  const parts = [];
  for (let offset = 0; offset < shardRecords.length; offset += 7000) {
    const partNumber = parts.length + 1;
    // The compact record schema is unchanged in v2, so retain stable shard URLs.
    const file = `clues-${length}-${partNumber}-v4.json.gz`;
    const compact = shardRecords.slice(offset, offset + 7000).map(({ id, clue, answer, displayAnswer, wordCount, length: answerLength, quality, sourceBits, dictionaryBits }) =>
      [id, clue, answer, displayAnswer, wordCount, answerLength, quality, sourceBits, dictionaryBits]);
    const bytes = gzipJson(compact);
    await writeFile(new URL(file, OUTPUT), bytes);
    parts.push({ file, records: compact.length, bytes: bytes.byteLength, sha256: digest(bytes) });
  }
  shards[length] = { records: shardRecords.length, parts };
}

const manifest = {
  formatVersion: 4,
  schema: ["id", "clue", "answer", "displayAnswer", "wordCount", "length", "quality", "sourceBits", "dictionaryBits"],
  datasetVersion: VERSION,
  encoding: "gzip-json",
  recordCount: records.length,
  reviewBasis: "Automated filtering approved for the full eligible WordNet set in docs/crossword-clue-search/phase-0.md",
  licenseSet: ["wordnet-3.0"],
  sources: [{ bit: 1, id: "wordnet-3.0", notice: "/third-party-notices#wordnet-heading" }],
  phraseCount: records.filter(({ wordCount }) => wordCount > 1).length,
  index: { file: indexFile, bytes: indexBytes.byteLength, sha256: digest(indexBytes), synonymTerms: Object.keys(synonymPostings).length,
    graphTerms: Object.keys(graphPostings).length, graphRelations: GRAPH_RELATION_WEIGHTS,
    maxGraphCandidatesPerTerm: MAX_GRAPH_CANDIDATES_PER_TERM },
  shards
};
await writeFile(new URL("manifest.clues-v4.json", OUTPUT), `${JSON.stringify(manifest)}\n`, "utf8");
console.log(`Built ${records.length} approved filtered clue records in ${byLength.size} length shards.`);
