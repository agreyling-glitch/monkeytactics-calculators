import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const base = new URL("../assets/data/word-definitions/", import.meta.url);

test("dedicated WordNet definition shards are complete and include ALE", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.wordnet-definitions-v1.json", base), "utf8"));
  assert.equal(manifest.formatVersion, 1);
  assert.equal(manifest.datasetVersion, "wordnet-3.0-definitions-v1");
  assert.equal(Object.keys(manifest.shards).length, 26);

  let recordCount = 0;
  let aleDefinitions = [];
  for (const [letter, shard] of Object.entries(manifest.shards)) {
    const bytes = await readFile(new URL(shard.file, base));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), shard.sha256, `${letter} shard checksum`);
    const records = JSON.parse(gunzipSync(bytes));
    assert.equal(records.length, shard.records);
    recordCount += records.length;
    if (letter === "a") aleDefinitions = records.filter(([word]) => word === "ale");
  }

  assert.equal(recordCount, manifest.recordCount);
  assert.ok(aleDefinitions.some(([, partOfSpeech, definition]) => partOfSpeech === "noun" && /beer/i.test(definition)));
});
