import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import * as engine from "../assets/wasm/word-unscrambler/word_unscrambler_engine.js";

const source = fs.readFileSync(new URL("../functions/tools/word-unscrambler/[word].js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?from .*?;\r?\n/gm, "")
  .replace("export async function onRequest", "async function onRequest");

function harness(real = false) {
  const calls = { fetches: [], init: 0, checks: 0, searches: 0 };
  let now = 0;
  let fail = false;
  const words = new Set();
  const sandbox = vm.createContext({
    Response, Request, URL, TextDecoder, Uint8Array, DecompressionStream,
    Date: { now: () => now },
    wasmModule: real ? fs.readFileSync(new URL("../assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm", import.meta.url)) : null,
    initSync: (options) => { calls.init++; if (real) engine.initSync({ module: options.module }); },
    init_engine: (records) => { records.forEach(record => words.add(record.split("\t")[0])); if (real) engine.init_engine(records); },
    is_valid_word: (word) => { calls.checks++; return real ? engine.is_valid_word(word) : words.has(word); },
    wasmUnscramble: (...args) => { calls.searches++; return real ? engine.unscramble(...args) : ["ate", "eat", "tea"]; },
    caches: { default: { match: async () => null, put: async () => {} } },
  });
  vm.runInContext(source, sandbox);
  async function request(word, method = "GET") {
    const pending = [];
    const response = await sandbox.onRequest({
      params: { word }, request: new Request("https://monkeytactics.com/tools/word-unscrambler/" + word, { method }),
      waitUntil: promise => pending.push(promise),
      env: { ASSETS: { fetch: async url => {
        const letter = url.pathname.split("/").at(-1)[0];
        calls.fetches.push(letter);
        if (fail) { fail = false; return new Response(null, { status: 503 }); }
        return new Response(real
          ? fs.readFileSync(new URL("../assets/data/words/" + url.pathname.split("/").at(-1), import.meta.url))
          : ({ a: "ate", e: "eat", t: "tea" }[letter] || ""));
      } } },
    });
    await Promise.all(pending);
    return response;
  }
  return { calls, request, advance: () => { now += 60001; }, failNext: () => { fail = true; } };
}

test("invalid alphabet routes load only the first shard and skip search", async () => {
  const h = harness();
  assert.equal((await h.request("abcdefghijklmnopqrstuvwxyz")).status, 404);
  assert.deepEqual(h.calls.fetches, ["a"]);
  assert.equal(h.calls.searches, 0);
  await h.request("abcdefghijklmnopqrstuvwxyz", "HEAD");
  assert.equal(h.calls.checks, 1);
  h.advance();
  await h.request("abcdefghijklmnopqrstuvwxyz");
  assert.equal(h.calls.checks, 2);
});

test("unsupported methods and malformed or oversized words do no initialization", async () => {
  const h = harness();
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    const response = await h.request("ate", method);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), "GET, HEAD");
  }
  for (const word of ["a".repeat(65), "a", "a1", "%ZZ"]) {
    assert.equal((await h.request(word)).status, 404);
  }
  assert.equal(h.calls.init, 0);
  assert.deepEqual(h.calls.fetches, []);
  await h.request("a".repeat(64));
  assert.equal(h.calls.checks, 1);
});

test("valid words load remaining shards, coalesce concurrent loads, and support HEAD", async () => {
  const h = harness();
  const responses = await Promise.all([h.request("ATE"), h.request("ate", "HEAD")]);
  assert.deepEqual(h.calls.fetches.sort(), ["a", "e", "t"]);
  assert.equal(responses[0].status, 200);
  assert.match(await responses[0].text(), /Unscramble &quot;ate&quot;/);
  assert.equal(responses[1].status, 200);
  assert.equal(await responses[1].text(), "");
});

test("failed loads can retry without poisoning membership or negative caches", async () => {
  const h = harness();
  h.failNext();
  await assert.rejects(h.request("ate"), /Unable to load dictionary shard/);
  assert.equal((await h.request("ate")).status, 200);
  assert.equal(h.calls.fetches.filter(letter => letter === "a").length, 2);
});

test("negative cache evicts old entries at its capacity", async () => {
  const h = harness();
  const word = i => "zz" + String.fromCharCode(97 + Math.floor(i / 26), 97 + i % 26);
  for (let i = 0; i <= 256; i++) await h.request(word(i));
  const checks = h.calls.checks;
  await h.request(word(256));
  assert.equal(h.calls.checks, checks);
  await h.request(word(0));
  assert.equal(h.calls.checks, checks + 1);
});

test("real compressed shards and WASM validate before fan-out and preserve valid results", async () => {
  const h = harness(true);
  assert.equal((await h.request("abcdefghijklmnopqrstuvwxyz")).status, 404);
  assert.deepEqual(h.calls.fetches, ["a"]);
  const response = await h.request("ate");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /href="\/tools\/word-unscrambler\/eat"/);
  assert.deepEqual(h.calls.fetches.sort(), ["a", "e", "t"]);
});
