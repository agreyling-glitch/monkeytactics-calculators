import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import test from "node:test";

const base = new URL("../assets/data/crossword-clues/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.clues-v1.json", base), "utf8"));

test("reviewed clue manifest and shards are internally consistent", async () => {
  assert.equal(manifest.formatVersion, 1);
  assert.ok(manifest.recordCount >= 90_000);
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
    records.forEach(([id, , answer, answerLength]) => {
      assert.equal(answerLength > 15 ? "16-plus" : String(answerLength), length);
      assert.equal(answer.length, answerLength);
      assert.ok(!ids.has(id));
      ids.add(id);
    });
    total += records.length;
  }
  assert.equal(total, manifest.recordCount);
});

test("keyword index stays within budget and references known records", async () => {
  const bytes = await readFile(new URL(manifest.index.file, base));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.index.sha256);
  assert.ok(bytes.byteLength <= 1_500_000);
  const index = JSON.parse(gunzipSync(bytes));
  assert.equal(index.formatVersion, 1);
  Object.values(index.postings).flat().forEach((id) => assert.ok(id >= 1 && id <= manifest.recordCount));
});
