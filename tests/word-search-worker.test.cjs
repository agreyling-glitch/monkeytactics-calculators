const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { setImmediate: tick } = require("node:timers/promises");

const source = fs.readFileSync(path.join(__dirname, "../assets/js/tools/word-unscrambler/search-worker-client.js"), "utf8");

function client({ unavailable = false } = {}) {
  let instance;
  class Worker {
    constructor(url) {
      instance = this;
      this.url = url;
      this.listeners = new Map();
      this.requests = [];
      this.terminated = false;
    }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    postMessage(message) { this.requests.push(message); }
    terminate() { this.terminated = true; }
    emit(name, data) { this.listeners.get(name)?.({ data }); }
  }
  const window = { Worker: unavailable ? undefined : Worker };
  vm.runInNewContext(source, {
    window, URL, Error, setTimeout, clearTimeout,
    document: { currentScript: { src: "https://monkeytactics.com/assets/js/tools/word-unscrambler/search-worker-client.js" } }
  });
  return { api: window.MonkeyTacticsSearchWorker, worker: instance };
}

test("worker RPC waits for readiness and pairs out-of-order results by ID", async () => {
  const { api, worker } = client();
  const first = api.unscramble("cat", "", { dictionaryBit: 1 });
  assert.equal(worker.requests.length, 0);
  worker.emit("message", { type: "ready" });
  await api.ready;
  const second = api.findHooks("cat", 1);
  await tick();
  assert.equal(worker.requests.length, 2);
  const [search, hooks] = worker.requests;
  assert.equal(search.method, "unscramble");
  assert.equal(hooks.method, "findHooks");
  assert.notEqual(search.id, hooks.id);
  worker.emit("message", { type: "result", id: hooks.id, result: { back: ["s"] } });
  worker.emit("message", { type: "result", id: search.id, result: ["act", "cat"] });
  assert.deepEqual(await first, ["act", "cat"]);
  assert.deepEqual(await second, { back: ["s"] });
  assert.match(worker.url.href, /search-worker\.js\?v=20261012-solvers-3$/);
});

test("dictionary membership requests return the indexed source mask", async () => {
  const { api, worker } = client();
  worker.emit("message", { type: "ready" });
  const membership = api.dictionaryMembership("CAT");
  await tick();
  const request = worker.requests[0];
  assert.equal(request.method, "dictionaryMembership");
  assert.deepEqual(Array.from(request.args), ["CAT"]);
  worker.emit("message", { type: "result", id: request.id, result: 3 });
  assert.equal(await membership, 3);
});

test("an RPC error rejects just that request and the worker can serve another", async () => {
  const { api, worker } = client();
  worker.emit("message", { type: "ready" });
  const failed = api.unscramble("cat", "", {});
  const rejection = assert.rejects(failed, /Invalid pattern/);
  await tick();
  worker.emit("message", { type: "error", id: worker.requests[0].id, error: "Invalid pattern" });
  await rejection;
  const next = api.initEngine("cat\t1\n");
  await tick();
  worker.emit("message", { type: "result", id: worker.requests[1].id });
  await next;
  assert.equal(worker.terminated, false);
});

test("worker startup and runtime errors fail clearly without a main-thread fallback", async () => {
  const missing = client({ unavailable: true });
  await assert.rejects(missing.api.ready, /Web Worker support/);
  await assert.rejects(missing.api.unscramble("cat", "", {}), /Web Worker support/);

  const startup = client();
  startup.worker.emit("message", { type: "fatal", error: "Unauthorized domain" });
  await assert.rejects(startup.api.ready, /Unauthorized domain/);
  assert.equal(startup.worker.terminated, true);

  const runtime = client();
  runtime.worker.emit("message", { type: "ready" });
  const pending = runtime.api.unscramble("cat", "", {});
  const rejection = assert.rejects(pending, /stopped unexpectedly/);
  await tick();
  runtime.worker.emit("error");
  await rejection;
  await assert.rejects(runtime.api.findHooks("cat", 1), /stopped unexpectedly/);
  assert.equal(runtime.worker.terminated, true);
});

test("an unreadable worker message rejects outstanding operations", async () => {
  const { api, worker } = client();
  worker.emit("message", { type: "ready" });
  const pending = api.crosswordSearch("?a?", "ct", {});
  const rejection = assert.rejects(pending, /unreadable data/);
  await tick();
  worker.emit("messageerror");
  await rejection;
});
