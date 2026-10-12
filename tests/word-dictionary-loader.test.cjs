const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { gzipSync } = require("node:zlib");
const { setImmediate: tick } = require("node:timers/promises");

const source = fs.readFileSync(path.join(__dirname, "../assets/js/tools/word-unscrambler/dictionary-loader.js"), "utf8");

function fixture({ failChunk = false, gzip = false } = {}) {
  const calls = [];
  const records = [];
  let active = 0;
  let maxActive = 0;
  let failed = false;
  const engine = {
    async initEngine(text) {
      await tick();
      records.push(text);
      active -= 1;
    }
  };
  const window = { DecompressionStream };
  const fetch = async (url) => {
    calls.push(url);
    const version = url.includes("enable-v1") ? "enable-v1" : "wiktionary-v1";
    if (url.includes("manifest.")) {
      await tick();
      return Response.json({
        encoding: "gzip-newline-membership",
        chunks: Object.fromEntries([..."abcdef"].map((letter) => [letter, { file: `${letter}.${version}.txt.gz` }]))
      });
    }
    if (failChunk && !failed) {
      failed = true;
      return new Response("failed", { status: 503 });
    }
    active += 1;
    maxActive = Math.max(maxActive, active);
    await tick();
    const letter = url.split("/").at(-1)[0];
    const content = `${letter}at\t${version === "enable-v1" ? 1 : 3}\n${letter}expanded\t${version === "enable-v1" ? 1 : 2}\n`;
    return new Response(gzip ? gzipSync(content) : content);
  };
  vm.runInNewContext(source, { window, fetch, Response, Blob, TextDecoder, Uint8Array });
  return {
    loader: window.MonkeyTacticsWordDictionary.create(engine),
    create: window.MonkeyTacticsWordDictionary.create,
    engine, calls, records,
    get maxActive() { return maxActive; }
  };
}

test("Standard searches load only relevant ENABLE shards and deduplicate concurrent loads", async () => {
  const f = fixture();
  assert.equal(f.create(f.engine), f.loader);
  await Promise.all([f.loader.loadRelevant("ACCA", 1), f.loader.loadRelevant("ca", 1)]);
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every((url) => url.includes("enable-v1")));
  assert.equal(f.calls.filter((url) => url.endsWith("a.enable-v1.txt.gz")).length, 1);
  assert.equal(f.records.length, 2);
  assert.ok(f.records.every((text) => /\t1\n/.test(text)));
  await f.loader.loadRelevant("ac", 1);
  assert.equal(f.calls.length, 3);
});

test("switching to Expanded preserves membership records and union shards satisfy Both and Standard", async () => {
  const f = fixture({ gzip: true });
  await f.loader.loadRelevant("c", 1);
  await f.loader.loadRelevant("c", 2);
  assert.equal(f.calls.length, 4);
  assert.equal(f.records[0], "cat\t1\ncexpanded\t1\n");
  assert.equal(f.records[1], "cat\t3\ncexpanded\t2\n");
  await Promise.all([f.loader.loadRelevant("c", 3), f.loader.loadRelevant("c", 1)]);
  assert.equal(f.calls.length, 4);
});

test("a loaded union shard prevents a redundant Standard shard download", async () => {
  const f = fixture();
  await f.loader.loadRelevant("b", 2);
  await f.loader.loadRelevant("b", 1);
  assert.equal(f.calls.filter((url) => !url.includes("manifest.")).length, 1);
  assert.equal(f.records.length, 1);
});

test("blank racks load every shard with at most four fetch/decode/index operations in flight", async () => {
  const f = fixture();
  await Promise.all([f.loader.loadRelevant("a?", 1), f.loader.loadAll(1)]);
  assert.equal(f.records.length, 6);
  assert.equal(f.maxActive, 4);
  assert.equal(f.calls.length, 7);
});

test("a failed chunk can be retried and is not marked as indexed", async () => {
  const f = fixture({ failChunk: true });
  await assert.rejects(f.loader.loadRelevant("a", 1), /503/);
  assert.equal(f.records.length, 0);
  await f.loader.loadRelevant("a", 1);
  assert.equal(f.records.length, 1);
  assert.equal(f.calls.filter((url) => url.endsWith("a.enable-v1.txt.gz")).length, 2);
});

test("offline assets cover both source manifests and shards without indexing the dictionary", async () => {
  const f = fixture();
  const urls = await f.loader.offlineAssets();
  assert.equal(urls.length, 14);
  assert.ok(urls.includes("/assets/data/words/manifest.enable-v1.json?v=enable-v1"));
  assert.ok(urls.includes("/assets/data/words/manifest.wiktionary-v1.json?v=wiktionary-v1"));
  assert.ok(urls.includes("/assets/data/words/f.enable-v1.txt.gz"));
  assert.ok(urls.includes("/assets/data/words/f.wiktionary-v1.txt.gz"));
  assert.equal(f.calls.length, 2);
  assert.equal(f.records.length, 0);
  await assert.rejects(f.loader.loadRelevant("a", 4), /Invalid dictionary/);
});
