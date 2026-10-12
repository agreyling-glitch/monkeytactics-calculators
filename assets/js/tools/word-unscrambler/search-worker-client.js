"use strict";

(function initializeSearchWorker(global) {
  const ASSET_VERSION = "20261012-solvers-3";
  const REQUEST_TIMEOUT_MS = 60000;
  const pending = new Map();
  let nextId = 0;
  let worker = null;
  let fatalError = null;
  let readyTimer;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  function fail(error) {
    if (fatalError) return;
    fatalError = error instanceof Error ? error : new Error(String(error));
    clearTimeout(readyTimer);
    rejectReady(fatalError);
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(fatalError);
    }
    pending.clear();
    worker?.terminate();
  }

  // A rejection is still observable by all callers of ready; this handler also
  // prevents a startup failure becoming unhandled before DOMContentLoaded.
  ready.catch(() => {});
  try {
    if (typeof global.Worker !== "function") {
      throw new Error("This browser cannot run the word search worker. Use a browser with Web Worker support.");
    }
    worker = new global.Worker(new URL(
      `./search-worker.js?v=${ASSET_VERSION}`,
      document.currentScript.src
    ));
    readyTimer = setTimeout(() => fail(new Error("The word search worker took too long to start. Reload to try again.")), REQUEST_TIMEOUT_MS);
    worker.addEventListener("message", ({ data }) => {
      if (!data || fatalError) return;
      if (data.type === "ready") {
        clearTimeout(readyTimer);
        resolveReady();
        return;
      }
      if (data.type === "fatal") {
        fail(new Error(data.error || "The word search engine could not start."));
        return;
      }
      const request = pending.get(data.id);
      if (!request || !["result", "error"].includes(data.type)) return;
      clearTimeout(request.timer);
      pending.delete(data.id);
      if (data.type === "error") request.reject(new Error(data.error || "Word search failed."));
      else request.resolve(data.result);
    });
    worker.addEventListener("error", () => fail(new Error("The word search worker stopped unexpectedly. Reload to try again.")));
    worker.addEventListener("messageerror", () => fail(new Error("The word search worker returned unreadable data. Reload to try again.")));
  } catch (error) {
    fail(error);
  }

  async function request(method, args) {
    await ready;
    if (fatalError) throw fatalError;
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        fail(new Error("The word search worker took too long to respond. Reload to try again."));
      }, REQUEST_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      try {
        worker.postMessage({ id, method, args });
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  }

  global.MonkeyTacticsSearchWorker = Object.freeze({
    ready,
    initEngine: (...args) => request("initEngine", args),
    unscramble: (...args) => request("unscramble", args),
    crosswordSearch: (...args) => request("crosswordSearch", args),
    findHooks: (...args) => request("findHooks", args),
    dictionaryMembership: (...args) => request("dictionaryMembership", args),
    boardFitAnalysis: (...args) => request("boardFitAnalysis", args)
  });
})(window);
