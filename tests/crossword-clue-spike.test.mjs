import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const recordsUrl = new URL("../docs/crossword-clue-search/wordnet-3.0-spike-1000.jsonl", import.meta.url);
const reportUrl = new URL("../docs/crossword-clue-search/wordnet-3.0-spike-1000.report.json", import.meta.url);

test("WordNet feasibility spike contains 1,000 valid, attributed candidates", async () => {
  const records = (await readFile(recordsUrl, "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(records.length, 1000);
  assert.equal(new Set(records.map(({ answer, clue }) => `${answer}\0${clue.toLowerCase()}`)).size, 1000);
  records.forEach((record) => {
    assert.match(record.source_id, /^wn30:\d{8}-[nvar]$/);
    assert.match(record.answer, /^[a-z]{3,15}$/);
    assert.equal(record.length, record.answer.length);
    assert.equal(record.display_answer.replace(/[^a-z]/g, ""), record.answer);
    assert.equal(record.word_count, record.display_answer.split(/[ '-]+/).length);
    assert.equal(record.source, "wordnet-3.0");
    assert.ok(record.dictionary_bits >= 1 && record.dictionary_bits <= 3);
    assert.ok(record.quality >= 70 && record.quality <= 100);
    assert.ok(Array.isArray(record.graph_edges));
    record.graph_edges.forEach(({ relation, targetSourceId }) => {
      assert.match(relation, /^(?:@|~|&|\+|\*|%[msp])$/);
      assert.match(targetSourceId, /^wn30:\d{8}-[nvar]$/);
    });
    assert.ok(!(record.clue.toLowerCase().match(/[a-z]+/g) || []).includes(record.answer));
  });
});

test("full production data includes eligible multi-word WordNet answers", async () => {
  const manifest = JSON.parse(await readFile(new URL("../assets/data/crossword-clues/manifest.clues-v4.json", import.meta.url), "utf8"));
  assert.ok(manifest.phraseCount >= 30_000);
});

test("WordNet feasibility report records reproducibility and open review status", async () => {
  const report = JSON.parse(await readFile(reportUrl, "utf8"));
  assert.equal(report.source.sha256, "658b1ba191f5f98c2e9bae3e25c186013158f30ef779f191d2a44e5d25046dc8");
  assert.equal(report.emittedRecords, 1000);
  assert.ok(report.eligibleUniqueRecords >= 1000);
  assert.equal(report.automatedUsabilityRate, 1);
  assert.equal(report.manualReviewCompleted, true);
  assert.equal(report.rowLevelDecisionsRecorded, false);
  assert.match(report.recordsSha256, /^[a-f0-9]{64}$/);
});
