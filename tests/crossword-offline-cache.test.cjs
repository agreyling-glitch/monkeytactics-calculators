"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { setImmediate: tick } = require("node:timers/promises");

const source = fs.readFileSync(path.join(__dirname, "../assets/js/tools/crossword-solver.js"), "utf8");
const origin = "https://example.test";
const version = "20261012-solvers-11";
const cachePrefix = "monkeytactics-crossword-offline-";
const currentName = `${cachePrefix}${version}`;
const previousName = `${cachePrefix}20260904-wiktionary-24`;
const storageKey = "monkeytactics.crossword-solver.offline-cache";
const canonicalKey = (input) => new URL(typeof input === "string" ? input : input.url, origin).href;

function extract(name) {
  const start = source.search(new RegExp(`^  (?:async )?function ${name}\\(`, "m"));
  assert.notEqual(start, -1, `Missing production function ${name}`);
  return source.slice(start, source.indexOf("\n  }", start) + 4);
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function control() {
  return { textContent: "", hidden: false, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
}

function harness({ saved = "", network, domAssets = [] } = {}) {
  const stores = new Map();
  const storage = new Map(saved ? [[storageKey, saved]] : []);
  const events = [];
  const downloads = [];
  const caches = {
    async has(name) { return stores.has(name); },
    async keys() { return [...stores.keys()]; },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async match(request) { return entries.get(canonicalKey(request))?.clone(); },
        async put(request, response) {
          events.push(`put:${name}:${canonicalKey(request)}`);
          entries.set(canonicalKey(request), response.clone());
        }
      };
    },
    async match(request) {
      for (const name of stores.keys()) {
        const response = await (await this.open(name)).match(request);
        if (response) return response;
      }
    },
    async delete(name) { events.push(`delete:${name}`); return stores.delete(name); }
  };
  const context = {
    URL, Response, performance, console: { warn() {} },
    Request: class BrowserRequest extends Request {
      constructor(input, options) { super(typeof input === "string" ? new URL(input, origin).href : input, options); }
    },
    window: { location: new URL(`${origin}/tools/crossword-solver`), caches, setTimeout }, caches,
    document: { querySelectorAll() { return domAssets.map(([attribute, value]) => ({ getAttribute: (name) => name === attribute ? value : null })); } },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => { events.push(`storage:${value}`); storage.set(key, value); },
      removeItem: (key) => storage.delete(key)
    },
    navigator: { serviceWorker: { register: async () => {}, ready: Promise.resolve() }, storage: { persist: async () => {} } },
    fetch: async (request) => {
      const url = typeof request === "string" ? new URL(request, origin).href : request.url;
      downloads.push(url);
      return network ? network(url, request) : new Response(`fresh:${new URL(url).pathname}`);
    },
    offlineToggle: control(), offlineStatus: control(), relatedGuides: control(),
    dictionaryMerriamLink: control(), dictionaryCollinsLink: control(), dictionaryModal: { open: false }, dictionaryInputs: [],
    offlineProgress: control(), offlineProgressLabel: control(), offlineModeMessage: control()
  };
  vm.createContext(context);
  const constants = ["OFFLINE_VERSION", "OFFLINE_CACHE_PREFIX", "OFFLINE_STORAGE_KEY", "MANIFEST_URL", "CHUNK_BASE_URL", "CLUE_BASE_URL", "CLUE_MANIFEST_URL", "DEFINITION_BASE_URL", "DEFINITION_MANIFEST_URL"]
    .map((name) => source.match(new RegExp(`^  const ${name} = .+;$`, "m"))[0]).join("\n");
  const coreStart = source.indexOf("  const OFFLINE_CORE_URLS = [");
  const core = source.slice(coreStart, source.indexOf("\n  ];", coreStart) + 5);
  const stateStart = source.indexOf('  let offlineCacheName = "";');
  const state = source.slice(stateStart, source.indexOf("  let pendingOfflinePlan", stateStart));
  vm.runInContext(`${constants}\n${core}\n${state}\nconst delay = async () => {};\n${[
    "renderOfflineState", "verifyStoredOfflineCache", "fetchOfflineManifest", "buildOfflinePlan", "canReuseSharedOfflineUrl",
    "reusableOfflineResponse", "cacheOfflineUrl", "inspectOfflinePlan", "enableOfflineMode"
  ].map(extract).join("\n")}\nfunction getOfflineState() { return { offlineCacheName, offlineModeEnabled }; }`, context);
  async function seed(name, entries) {
    const cache = await caches.open(name);
    for (const [url, body] of Object.entries(entries)) await cache.put(url, new Response(body));
    events.length = 0;
  }
  return { context, caches, stores, storage, events, downloads, seed };
}

const shell = "/tools/crossword-solver.html";
const worker = "/crossword-offline-sw.js";
const unversionedScript = "/assets/js/shared/ads.js";
const engine = "/assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm?v=20261012-solvers-3";
const data = "/assets/data/words/a.wiktionary-v1.bin.gz";
const planFor = (urls) => ({ urls, bytesByUrl: new Map(urls.map((url) => [url, 100])), estimatedUnknownBytes: 100, totalBytes: urls.length * 100 });

// Cache API clones retain a followed redirect's internal response state.
class FollowedRedirectResponse extends Response {
  get redirected() { return true; }
  get url() { return `${origin}/tools/crossword-solver`; }
  clone() {
    const copy = super.clone();
    return new FollowedRedirectResponse(copy.body, { status: copy.status, statusText: copy.statusText, headers: copy.headers });
  }
}

test("Crossword offline plan uses current page assets and the exact shared engine imports", async () => {
  const fixtures = {
    "/assets/data/words/manifest.wiktionary-v1.json": { chunks: { a: { file: "a.bin.gz", bytes: 20 } } },
    "/assets/data/crossword-clues/manifest.clues-v4.json": { datasetVersion: "clue-4", index: { file: "index.gz", bytes: 30 }, shards: { a: { parts: [{ file: "a.gz", bytes: 40 }] } } },
    "/assets/data/word-definitions/manifest.wordnet-definitions-v1.json": { datasetVersion: "def-1", shards: { a: { file: "a.gz", bytes: 50 } } }
  };
  const { context } = harness({
    domAssets: [
      ["src", `../assets/js/tools/crossword-solver.js?v=${version}`],
      ["href", "../assets/css/tools/crossword-solver.css?v=latest-style"],
      ["src", "/assets/js/shared/new-page-dependency.js?v=1"],
      ["href", "/favicon.svg"],
      ["src", "https://external.example/analytics.js"]
    ],
    network: async (url) => Response.json(fixtures[new URL(url).pathname])
  });
  const plan = await context.buildOfflinePlan();
  for (const url of [
    `/assets/js/tools/crossword-solver.js?v=${version}`,
    "/assets/css/tools/crossword-solver.css?v=latest-style",
    "/assets/js/shared/new-page-dependency.js?v=1", "/favicon.svg",
    "/assets/js/tools/word-unscrambler/wasm-bridge.js?v=20261012-solvers-3",
    "/assets/wasm/word-unscrambler/word_unscrambler_engine.js?v=20261012-solvers-3", engine,
    "/assets/data/crossword-clues/a.gz?v=clue-4", "/assets/data/word-definitions/a.gz?v=def-1"
  ]) assert.ok(plan.urls.includes(url), url);
  assert.equal(plan.urls.filter((url) => url.includes("crossword-solver.css")).length, 1);
  assert.equal(plan.urls.filter((url) => url.includes("crossword-solver.js")).length, 1);
  assert.ok(plan.urls.every((url) => !url.includes("external.example") && !url.includes("20260827")));
});

test("previous Crossword installations require an update without deleting their usable cache", async () => {
  const env = harness({ saved: previousName });
  await env.seed(previousName, { [shell]: "old page" });
  await env.context.verifyStoredOfflineCache();
  env.context.renderOfflineState();
  assert.equal(env.context.getOfflineState().offlineModeEnabled, false);
  assert.equal(env.context.offlineStatus.textContent, "Offline Mode [Update required]");
  assert.equal(env.storage.get(storageKey), previousName);
  assert.equal(await (await env.caches.match(shell)).text(), "old page");
});

test("startup clears an evicted cache marker and handles inaccessible cache storage", async () => {
  const env = harness({ saved: currentName });
  await env.context.verifyStoredOfflineCache();
  assert.equal(env.context.getOfflineState().offlineModeEnabled, false);
  assert.equal(env.storage.has(storageKey), false);
  assert.match(env.context.offlineStatus.title, /no longer available/);

  const inaccessible = harness({ saved: currentName });
  inaccessible.caches.has = async () => { throw new Error("Storage denied"); };
  await inaccessible.context.verifyStoredOfflineCache();
  assert.equal(inaccessible.context.getOfflineState().offlineModeEnabled, false);
  assert.equal(inaccessible.storage.get(storageKey), currentName);
  assert.match(inaccessible.context.offlineStatus.title, /could not be checked/);
});

test("Crossword upgrade refreshes old shells and unversioned scripts while reusing dictionary and exact engine assets", async () => {
  const env = harness({ saved: previousName });
  const plan = planFor([shell, worker, unversionedScript, engine, data]);
  await env.seed(previousName, Object.fromEntries(plan.urls.map((url) => [url, `old:${url}`])));
  const inventory = await env.context.inspectOfflinePlan(plan);
  assert.equal(inventory.cachedCount, 2);
  assert.equal(inventory.remainingCount, 3);
  assert.equal(inventory.remainingBytes, 300);
  assert.equal(await env.caches.has(currentName), false, "inspection must not create an incomplete target cache");

  await env.context.enableOfflineMode(plan);
  assert.equal(env.downloads.length, inventory.remainingCount);
  assert.ok(env.downloads.every((url) => new URL(url).searchParams.get("offline-update") === version));
  const current = await env.caches.open(currentName);
  assert.equal(await (await current.match(shell)).text(), `fresh:${shell}`);
  assert.equal(await (await current.match("/tools/crossword-solver")).text(), `fresh:${shell}`);
  assert.equal(await (await current.match(engine)).text(), `old:${engine}`);
  assert.ok([...env.stores.get(currentName).keys()].every((url) => !url.includes("offline-update")));
  assert.equal(env.storage.get(storageKey), currentName);
  assert.equal(env.context.getOfflineState().offlineModeEnabled, true);
  assert.equal(await env.caches.has(previousName), false);
  assert.ok(env.events.indexOf(`delete:${previousName}`) > env.events.indexOf(`storage:${currentName}`));
});

test("current Crossword cache can reactivate without downloads and preflight reports the same reuse", async () => {
  const env = harness();
  const plan = planFor([shell, worker, unversionedScript, engine]);
  await env.seed(currentName, Object.fromEntries(plan.urls.map((url) => [url, "current release"])));
  const inventory = await env.context.inspectOfflinePlan(plan);
  assert.equal(inventory.remainingCount, 0);
  await env.context.enableOfflineMode(plan);
  assert.equal(env.downloads.length, 0);
  assert.equal(env.context.getOfflineState().offlineModeEnabled, true);
});

test("failed Crossword upgrades drain in-flight workers before cleanup and preserve the previous installation", async () => {
  const waiting = deferred();
  const started = deferred();
  const env = harness({
    saved: previousName,
    network: async (url) => {
      if (new URL(url).pathname === shell) throw new Error("Offline shell refresh");
      started.resolve();
      await waiting.promise;
      return new Response("late download");
    }
  });
  await env.seed(previousName, { [shell]: "old page" });
  const enabling = env.context.enableOfflineMode(planFor([shell, unversionedScript, worker]));
  const rejected = assert.rejects(enabling, /Offline shell refresh/);
  await started.promise;
  await tick();
  assert.equal(await env.caches.has(currentName), true, "cleanup waits for outstanding writes");
  assert.equal(env.storage.get(storageKey), previousName);
  waiting.resolve();
  await rejected;
  assert.equal(await env.caches.has(currentName), false);
  assert.equal(await (await env.caches.match(shell)).text(), "old page");
  assert.equal(env.storage.get(storageKey), previousName);
  assert.equal(env.events.at(-1), `delete:${currentName}`);
  assert.ok(env.downloads.every((url) => new URL(url).searchParams.get("offline-update") === version));
});

test("storage failure after download preserves the previous Crossword cache and marker", async () => {
  const env = harness({ saved: previousName });
  await env.seed(previousName, { [shell]: "old page" });
  env.context.localStorage.setItem = () => { throw new Error("Storage full"); };
  await assert.rejects(env.context.enableOfflineMode(planFor([shell])), /Storage full/);
  assert.equal(env.storage.get(storageKey), previousName);
  assert.equal(await env.caches.has(previousName), true);
  assert.equal(await env.caches.has(currentName), false);
});

test("forced Crossword downloads bypass old service-worker fallback for every URL and store canonical keys", async () => {
  const env = harness();
  const plan = planFor([shell, engine]);
  await env.seed(currentName, { [shell]: "current page", [engine]: "current engine" });
  await env.context.enableOfflineMode(plan, { forceDownload: true });
  assert.equal(env.downloads.length, 2);
  assert.ok(env.downloads.every((url) => new URL(url).searchParams.get("offline-update") === version));
  assert.equal(new URL(env.downloads.find((url) => url.includes(".wasm"))).searchParams.get("v"), "20261012-solvers-3");
  assert.ok([...env.stores.get(currentName).keys()].every((url) => !url.includes("offline-update")));
});

test("failure to remove an older cache does not discard an activated Crossword package", async () => {
  const env = harness({ saved: previousName });
  await env.seed(previousName, { [shell]: "old page" });
  env.caches.delete = async () => { throw new Error("Cache cleanup unavailable"); };
  await env.context.enableOfflineMode(planFor([shell]));
  assert.equal(env.storage.get(storageKey), currentName);
  assert.equal(env.context.getOfflineState().offlineModeEnabled, true);
  assert.equal(await (await (await env.caches.open(currentName)).match(shell)).text(), `fresh:${shell}`);
});

test("Crossword stores both navigation keys as non-redirected responses after a Pages clean-route redirect", async () => {
  const env = harness({ network: async () => new FollowedRedirectResponse("<html>Current solver</html>", {
    headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'" }
  }) });
  await env.context.enableOfflineMode(planFor([shell]));
  const cache = await env.caches.open(currentName);
  for (const route of [shell, "/tools/crossword-solver"]) {
    const response = await cache.match(route);
    assert.equal(response.redirected, false, `${route} must work with navigation redirect mode manual`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(response.headers.get("content-security-policy"), "default-src 'self'");
    assert.equal(await response.text(), "<html>Current solver</html>");
  }
});

test("re-enabling Crossword repairs previously cached redirected pages without redownloading data", async () => {
  const env = harness();
  const cache = await env.caches.open(currentName);
  await cache.put(shell, new FollowedRedirectResponse("<html>Current solver</html>"));
  await cache.put(engine, new Response("cached engine"));
  assert.equal((await cache.match(shell)).redirected, true);
  await env.context.enableOfflineMode(planFor([shell, engine]));
  assert.equal(env.downloads.length, 0);
  assert.equal((await cache.match(shell)).redirected, false);
  assert.equal((await cache.match("/tools/crossword-solver")).redirected, false);
  assert.equal(await (await cache.match(engine)).text(), "cached engine");
});
