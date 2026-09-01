import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import test from "node:test";

const base = new URL("../assets/data/crossword-clues/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.clues-v4.json", base), "utf8"));

test("reviewed clue manifest and shards are internally consistent", async () => {
  assert.equal(manifest.formatVersion, 4);
  assert.ok(manifest.recordCount >= 125_000);
  assert.ok(manifest.phraseCount >= 30_000);
  assert.deepEqual(manifest.licenseSet, ["wordnet-3.0"]);
  let total = 0;
  const ids = new Set();
  for (const [length, shard] of Object.entries(manifest.shards)) {
    const records = [];
    for (const part of shard.parts) {
      const bytes = await readFile(new URL(part.file, base));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), part.sha256);
      assert.ok(bytes.byteLength <= 250_000);
      const partRecords = JSON.parse(gunzipSync(bytes));
      assert.equal(partRecords.length, part.records);
      records.push(...partRecords);
    }
    assert.equal(records.length, shard.records);
    records.forEach(([id, , answer, displayAnswer, wordCount, answerLength]) => {
      assert.equal(answerLength > 15 ? "16-plus" : String(answerLength), length);
      assert.equal(answer.length, answerLength);
      assert.equal(displayAnswer.replace(/[^a-z]/g, ""), answer);
      assert.equal(displayAnswer.split(/[ '-]+/).length, wordCount);
      assert.ok(!ids.has(id));
      ids.add(id);
    });
    total += records.length;
  }
  assert.equal(total, manifest.recordCount);
});

test("keyword and WordNet graph index stays within budget and references known records", async () => {
  const bytes = await readFile(new URL(manifest.index.file, base));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.index.sha256);
  assert.ok(bytes.byteLength <= 4_300_000);
  const index = JSON.parse(gunzipSync(bytes));
  assert.equal(index.formatVersion, 4);
  Object.values(index.postings).flat().forEach((id) => assert.ok(id >= 1 && id <= manifest.recordCount));
  assert.ok(manifest.index.synonymTerms > 1_000);
  Object.values(index.synonymPostings).flat().forEach((id) => assert.ok(id >= 1 && id <= manifest.recordCount));
  assert.ok(manifest.index.graphTerms > 10_000);
  assert.equal(manifest.index.maxGraphCandidatesPerTerm, 64);
  assert.deepEqual(manifest.index.graphRelations, { "&": 90, "@": 70, "~": 70, "+": 65, "*": 55, "%m": 40, "%s": 40, "%p": 40 });
  for (const entries of Object.values(index.graphPostings)) {
    assert.equal(entries.length % 2, 0);
    assert.ok(entries.length <= manifest.index.maxGraphCandidatesPerTerm * 2);
    for (let offset = 0; offset < entries.length; offset += 2) {
      assert.ok(entries[offset] >= 1 && entries[offset] <= manifest.recordCount);
      assert.ok(entries[offset + 1] >= 40 && entries[offset + 1] <= 90);
    }
  }
  assert.ok(index.graphPostings.bird.length >= 2);

  const rapidMatches = new Set(index.synonymPostings.rapid);
  const sixLetterRecords = [];
  for (const part of manifest.shards["6"].parts) {
    sixLetterRecords.push(...JSON.parse(gunzipSync(await readFile(new URL(part.file, base)))));
  }
  assert.ok(sixLetterRecords.some(([id, , answer]) => rapidMatches.has(id) && answer === "speedy"));
});

test("multi-word answers preserve display boundaries while using grid length", async () => {
  const eightLetterRecords = [];
  for (const part of manifest.shards["8"].parts) {
    eightLetterRecords.push(...JSON.parse(gunzipSync(await readFile(new URL(part.file, base)))));
  }
  assert.ok(eightLetterRecords.some(([, , answer, displayAnswer, wordCount, length, , , dictionaryBits]) =>
    answer === "icecream" && displayAnswer === "ice cream" && wordCount === 2 && length === 8 && dictionaryBits === 3));
});
