"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { setImmediate: tick } = require("node:timers/promises");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const source = read("assets/js/shared/dictionary-offline-controls.js");
const bridgeSource = read("assets/js/tools/word-unscrambler/wasm-bridge.js");
const engineVersion = /const ASSET_VERSION = "([^"]+)"/.exec(bridgeSource)[1];
const packageVersion = /const GENERIC_OFFLINE_VERSION = "([^"]+)"/.exec(source)[1];
const origin = "https://monkeytactics.com";
const prefix = "monkeytactics-word-tool-offline-";
const genericTools = ["absurdle-solver", "antiwordle-solver", "octordle-solver", "quordle-solver", "sedecordle-solver", "wordiply-solver", "wordle-helper"];
const allTools = [...genericTools, "crossword-solver", "word-unscrambler", "words-with-friends-solver"];
const engineUrls = ["word_unscrambler_engine.js", "word_unscrambler_engine_bg.wasm"]
  .map((file) => `/assets/wasm/word-unscrambler/${file}?v=${engineVersion}`);
const wordManifest = "/assets/data/words/manifest.wiktionary-v1.json";
const manifest = { chunks: { a: { file: "a.test.json" }, z: { file: "z.test.json" } } };

function pageAssets(tool) {
  return [...read(`tools/${tool}.html`).matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi)]
    .map((match) => new URL(match[1], `${origin}/tools/${tool}`).href)
    .filter((url) => new URL(url).origin === origin);
}

function controls() {
  const handlers = new Map();
  const attributes = new Map();
  return {
    dataset: {}, disabled: false, title: "", textContent: "", value: 0, max: 1,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: (name) => attributes.get(name),
    addEventListener: (name, handler) => handlers.set(name, handler),
    click: () => handlers.get("click")?.({ preventDefault() {}, stopImmediatePropagation() {} })
  };
}

function fixture(tool = "wordle-helper", options = {}) {
  const location = new URL(`${origin}/tools/${tool}`);
  const absolute = (value) => new URL(typeof value === "string" ? value : value.url, location).href;
  const stores = new Map();
  const storage = new Map();
  const fetched = [];
  const writes = [];
  const cacheName = `${prefix}${tool}-${packageVersion}`;
  const storageKey = `monkeytactics.${tool}.offline-cache`;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async match(request) { return entries.get(absolute(request))?.clone(); },
        async put(request, response) {
          const url = absolute(request);
          if (!options.dropPut?.(url)) entries.set(url, response.clone());
        },
        async keys() { return [...entries.keys()].map((url) => ({ url })); }
      };
    },
    async match(request) {
      for (const entries of stores.values()) {
        const response = entries.get(absolute(request));
        if (response) return response.clone();
      }
    },
    async keys() { return [...stores.keys()]; },
    async has(name) { return stores.has(name); },
    async delete(name) { return stores.delete(name); }
  };
  class Request {
    constructor(url, init = {}) {
      this.url = absolute(url);
      this.method = "GET";
      this.mode = "cors";
      Object.assign(this, init);
    }
  }
  const fetch = async (request) => {
    const url = absolute(request);
    fetched.push(url);
    await options.beforeFetch?.(url);
    if (options.failFetch?.(url)) throw new Error("simulated download failure");
    return new Response(new URL(url).pathname === wordManifest ? JSON.stringify(manifest) : `fresh:${url}`);
  };
  const toggle = controls();
  const progress = controls();
  const status = controls();
  const context = vm.createContext({
    URL, Request, Response, location, caches, fetch, console: { error() {}, warn() {} },
    window: { caches },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
      setItem: (key, value) => { writes.push({ key, value }); storage.set(key, value); }
    },
    navigator: { serviceWorker: { register: async () => ({}), ready: Promise.resolve({}) }, storage: { persist: async () => true } },
    MutationObserver: options.MutationObserver,
    document: options.document || {
      addEventListener() {},
      querySelectorAll: () => pageAssets(tool).map((url) => ({ src: url }))
    }
  });
  const instrumented = source.replace(/\}\)\(\);\s*$/, "globalThis.testApi = { buildGenericOfflineUrls, cacheGenericOfflineUrl, attachGenericOfflineCapability, attachOfflineConfirmation };\n})();");
  vm.runInContext(instrumented, context, { filename: "dictionary-offline-controls.js" });
  return {
    tool, location, absolute, caches, stores, storage, fetched, writes, Request, toggle, progress, status, cacheName, storageKey,
    api: context.testApi,
    async attach() {
      context.testApi.attachGenericOfflineCapability(toggle, progress, status, tool);
      await tick();
    },
    async seed(name, urls, body = "stale") {
      const cache = await caches.open(name);
      for (const url of urls) await cache.put(url, new Response(new URL(absolute(url)).pathname === wordManifest ? JSON.stringify(manifest) : body));
      return cache;
    }
  };
}

function offlineFetch(f) {
  const handlers = new Map();
  vm.runInNewContext(read("crossword-offline-sw.js"), {
    URL, caches: f.caches,
    fetch: async () => { throw new Error("offline"); },
    self: { location: f.location, addEventListener: (name, handler) => handlers.set(name, handler) }
  }, { filename: "crossword-offline-sw.js" });
  return (url, mode = "cors") => {
    let response;
    handlers.get("fetch")({ request: new f.Request(url, { mode }), respondWith: (result) => { response = result; } });
    return response;
  };
}

test("all ten word tools request the current bridge and shared-controls consumers use its current URL", () => {
  for (const tool of allTools) {
    const assets = pageAssets(tool);
    assert.ok(assets.includes(`${origin}/assets/js/tools/word-unscrambler/wasm-bridge.js?v=${engineVersion}`), `${tool}: stale WASM bridge`);
    if (tool !== "crossword-solver") {
      assert.ok(assets.includes(`${origin}/assets/js/shared/dictionary-offline-controls.js?v=${packageVersion}`), `${tool}: stale offline controls`);
    }
  }
});

test("each generic package contains its actual page assets, dictionary chunks, and the bridge's engine URLs", async () => {
  for (const tool of genericTools) {
    const f = fixture(tool);
    const cache = await f.caches.open(f.cacheName);
    const urls = (await f.api.buildGenericOfflineUrls(cache)).map(f.absolute);
    for (const url of [...pageAssets(tool), ...engineUrls, `${origin}/assets/data/words/a.test.json`, `${origin}/assets/data/words/z.test.json`]) {
      assert.ok(urls.includes(f.absolute(url)), `${tool}: package missing ${url}`);
    }
    assert.equal(urls.filter((url) => /word_unscrambler_engine(?:_bg\.wasm|\.js)/.test(url)).length, 2);
  }
});

test("fresh generic installations replay all HTML and WASM dependencies from exact offline cache keys", async () => {
  for (const tool of genericTools) {
    const f = fixture(tool);
    await f.attach();
    assert.equal(f.toggle.getAttribute("aria-checked"), "false");
    await f.toggle.click();
    assert.equal(f.storage.get(f.storageKey), f.cacheName, tool);
    assert.equal(f.toggle.getAttribute("aria-checked"), "true", f.status.textContent);
    assert.equal(f.progress.value, f.progress.max);
    const serve = offlineFetch(f);
    for (const url of [`/tools/${tool}`, `/tools/${tool}.html`, `/tools/${tool}/`]) {
      assert.ok((await serve(url, "navigate")).ok, `${tool}: offline page ${url}`);
    }
    for (const url of [...pageAssets(tool), ...engineUrls, `${origin}/assets/data/words/a.test.json`]) {
      assert.ok((await serve(url)).ok, `${tool}: offline asset ${url}`);
    }
    await assert.rejects(serve(`${engineUrls[1]}-wrong-version`), /offline/);
  }
});

test("upgrading refreshes the shell, reuses immutable assets, and only replaces this tool's old cache after verification", async () => {
  const f = fixture();
  const oldName = `${prefix}${f.tool}-previous-release`;
  const otherName = `${prefix}quordle-solver-previous-release`;
  const immutableAsset = pageAssets(f.tool).find((url) => url.includes("dictionary-offline-controls.js"));
  await f.seed(oldName, [f.location.pathname, "/assets/js/test-unversioned.js", immutableAsset, wordManifest]);
  await f.seed(otherName, ["/tools/quordle-solver"]);
  f.storage.set(f.storageKey, oldName);
  await f.attach();
  assert.equal(f.toggle.getAttribute("aria-checked"), "false");
  const cache = await f.caches.open(f.cacheName);
  await f.api.cacheGenericOfflineUrl(cache, "/assets/js/test-unversioned.js", false);
  assert.match(await (await cache.match("/assets/js/test-unversioned.js")).text(), /^fresh:/);
  await f.toggle.click();
  assert.equal(f.storage.get(f.storageKey), f.cacheName);
  assert.equal(f.stores.has(oldName), false);
  assert.equal(f.stores.has(otherName), true);
  assert.match(await (await cache.match(f.location.pathname)).text(), /^fresh:/);
  assert.equal(f.fetched.includes(immutableAsset), false);
  assert.equal(await (await cache.match(immutableAsset)).text(), "stale");
});

test("the enabled flag and previous package remain untouched while a new download is still pending", async () => {
  let release;
  let reached;
  const blocked = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { reached = resolve; });
  const f = fixture("wordle-helper", {
    beforeFetch: async (url) => {
      if (url === `${origin}${engineUrls[1]}`) { reached(); await blocked; }
    }
  });
  const oldName = `${prefix}${f.tool}-previous-release`;
  await f.seed(oldName, [f.location.pathname]);
  f.storage.set(f.storageKey, oldName);
  await f.attach();
  const installation = f.toggle.click();
  await started;
  assert.equal(f.toggle.disabled, true);
  assert.equal(f.toggle.getAttribute("aria-checked"), "false");
  assert.equal(f.storage.get(f.storageKey), oldName);
  assert.equal(f.stores.has(oldName), true);
  release();
  await installation;
  assert.equal(f.storage.get(f.storageKey), f.cacheName);
  assert.equal(f.stores.has(oldName), false);
  assert.equal(f.toggle.disabled, false);
});

test("an old-cache cleanup failure cannot undo an already verified and activated package", async () => {
  const f = fixture();
  const oldName = `${prefix}${f.tool}-previous-release`;
  await f.seed(oldName, [f.location.pathname]);
  f.storage.set(f.storageKey, oldName);
  const deleteCache = f.caches.delete;
  f.caches.delete = async (name) => {
    if (name === oldName) throw new Error("simulated old-cache deletion failure");
    return deleteCache(name);
  };
  await f.attach();
  await f.toggle.click();
  assert.equal(f.storage.get(f.storageKey), f.cacheName);
  assert.equal(f.stores.has(f.cacheName), true);
  assert.equal(f.stores.has(oldName), true);
  assert.equal(f.toggle.getAttribute("aria-checked"), "true");
  assert.equal(f.toggle.disabled, false);
  assert.match(f.status.textContent, /Enabled/);
  const serve = offlineFetch(f);
  assert.ok((await serve(engineUrls[1])).ok);
});

test("failed downloads retain the previous installed package and remove the incomplete new cache", async () => {
  const f = fixture("wordle-helper", { failFetch: (url) => url === `${origin}${engineUrls[1]}` });
  const oldName = `${prefix}${f.tool}-previous-release`;
  await f.seed(oldName, [f.location.pathname]);
  f.storage.set(f.storageKey, oldName);
  await f.attach();
  await f.toggle.click();
  assert.equal(f.storage.get(f.storageKey), oldName);
  assert.equal(f.stores.has(oldName), true);
  assert.equal(f.stores.has(f.cacheName), false, "Partial packages must not be served offline");
  assert.equal(f.toggle.getAttribute("aria-checked"), "false");
  assert.equal(f.toggle.disabled, false);
  assert.match(f.status.textContent, /could not|failed|unable/i);
});

test("an old service worker cannot silently supply an outdated shell when an upgrade starts offline", async () => {
  let f;
  f = fixture("wordle-helper", {
    // A previously active network-first worker can only fall back to exact cached URLs.
    beforeFetch: async (url) => {
      if (!await f.caches.match(url)) throw new Error("offline with no exact cached response");
    }
  });
  const oldName = `${prefix}${f.tool}-previous-release`;
  const oldCache = await f.seed(oldName, [wordManifest]);
  const urls = await f.api.buildGenericOfflineUrls(oldCache);
  await f.seed(oldName, urls, "old page and assets");
  f.storage.set(f.storageKey, oldName);
  await f.attach();
  await f.toggle.click();
  assert.equal(f.storage.get(f.storageKey), oldName);
  assert.equal(f.stores.has(oldName), true);
  assert.equal(f.stores.has(f.cacheName), false);
  assert.equal(f.toggle.getAttribute("aria-checked"), "false");
  assert.ok(f.fetched.some((url) => new URL(url).pathname === f.location.pathname && new URL(url).search), "The shell refresh must bypass old worker cache keys");
});

test("verification failures never activate or retain incomplete packages", async () => {
  const f = fixture("wordle-helper", { dropPut: (url) => url === `${origin}${engineUrls[1]}` });
  await f.attach();
  await f.toggle.click();
  assert.equal(f.storage.has(f.storageKey), false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.stores.has(f.cacheName), false);
  assert.equal(f.toggle.getAttribute("aria-checked"), "false");
});

test("startup recognizes an existing current package and clears a missing-cache preference", async () => {
  const existing = fixture();
  await existing.seed(existing.cacheName, [existing.location.pathname]);
  existing.storage.set(existing.storageKey, existing.cacheName);
  await existing.attach();
  assert.equal(existing.toggle.getAttribute("aria-checked"), "true");
  const missing = fixture();
  missing.storage.set(missing.storageKey, missing.cacheName);
  await missing.attach();
  assert.equal(missing.toggle.getAttribute("aria-checked"), "false");
  assert.equal(missing.storage.has(missing.storageKey), false);
});

function confirmationFixture() {
  const cancel = controls();
  const ok = controls();
  const force = controls();
  const message = controls();
  const progress = controls();
  const progressHeading = controls();
  const progressText = controls();
  const progressWrap = { ...controls(), querySelector: (selector) => ({ strong: progressHeading, progress, span: progressText })[selector] };
  const dialog = {
    ...controls(), open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
    querySelector: (selector) => ({
      '[value="cancel"]': cancel, '[value="ok"]': ok, 'input[type="checkbox"]': force,
      ".reference-download-progress": progressWrap, ".reference-offline-message": message
    })[selector]
  };
  const observers = [];
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe(target, options) { observers.push({ target, options, callback: this.callback }); }
  }
  const f = fixture("wordle-helper", {
    MutationObserver,
    document: { addEventListener() {}, body: { append() {} }, createElement: () => dialog }
  });
  f.toggle.setAttribute("aria-checked", "false");
  f.api.attachOfflineConfirmation(f.toggle, f.progress, "Wordle Helper", f.status);
  return {
    ...f, dialog, cancel, ok, force, message, displayedProgress: progress, progressText,
    notify(target, attribute) {
      for (const observer of observers) {
        if (observer.target === target && observer.options.attributeFilter.includes(attribute)) observer.callback();
      }
    }
  };
}

test("failed confirmation downloads display the error and allow Retry or Cancel", () => {
  const f = confirmationFixture();
  f.toggle.click();
  assert.equal(f.dialog.open, true);
  f.ok.click();
  assert.equal(f.cancel.disabled, true);
  assert.equal(f.ok.disabled, true);
  assert.equal(f.force.disabled, true);
  f.toggle.disabled = true;
  f.notify(f.toggle, "disabled");
  assert.equal(f.ok.disabled, true);
  f.status.textContent = "Offline Mode could not be changed. Check your connection and available storage.";
  f.toggle.disabled = false;
  f.notify(f.toggle, "disabled");
  assert.equal(f.dialog.open, true);
  assert.equal(f.message.textContent, f.status.textContent);
  assert.equal(f.ok.disabled, false);
  assert.equal(f.ok.textContent, "Retry");
  assert.equal(f.cancel.disabled, false);
  assert.equal(f.force.disabled, false);

  // A successful retry that downloaded files remains open with a completion message.
  f.ok.click();
  f.toggle.disabled = true;
  f.progress.max = 2;
  f.progress.value = 2;
  f.progress.dataset.downloaded = "2";
  f.notify(f.progress, "value");
  f.toggle.setAttribute("aria-checked", "true");
  f.notify(f.toggle, "aria-checked");
  assert.equal(f.ok.hidden, false);
  f.toggle.disabled = false;
  f.notify(f.toggle, "disabled");
  assert.equal(f.dialog.open, true);
  assert.equal(f.progressText.textContent, "Download complete");
  assert.equal(f.displayedProgress.value, 2);
  assert.equal(f.ok.hidden, true);
  assert.equal(f.cancel.disabled, false);
  assert.equal(f.cancel.textContent, "Close");
  f.cancel.click();
  assert.equal(f.dialog.open, false);
});

test("confirmation closes after a successful package activation that reused all files", () => {
  const f = confirmationFixture();
  f.toggle.click();
  f.ok.click();
  f.progress.dataset.downloaded = "0";
  f.toggle.setAttribute("aria-checked", "true");
  f.notify(f.toggle, "aria-checked");
  assert.equal(f.dialog.open, false);
});
