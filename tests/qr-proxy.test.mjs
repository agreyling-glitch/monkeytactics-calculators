import assert from "node:assert/strict";
import test from "node:test";

import worker from "../workers/qr-proxy/index.js";

const ORIGIN = "https://monkeytactics.com";

function workerRequest(target) {
  const endpoint = new URL("https://qr-proxy.example/");
  endpoint.searchParams.set("url", target);
  return new Request(endpoint, { headers: { Origin: ORIGIN } });
}

test("resolves redirects with HEAD requests and never reads page content", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });

    if (url === "https://short.example/start") {
      return {
        status: 302,
        headers: new Headers({ Location: "/middle" }),
        get body() { throw new Error("Response body must not be accessed"); },
      };
    }
    if (url === "https://short.example/middle") {
      return {
        status: 307,
        headers: new Headers({ Location: "https://final.example/destination" }),
        get body() { throw new Error("Response body must not be accessed"); },
      };
    }

    return {
      status: 200,
      headers: new Headers(),
      get body() { throw new Error("Response body must not be accessed"); },
    };
  };

  const response = await worker.fetch(workerRequest("https://short.example/start"), {});

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    finalUrl: "https://final.example/destination",
  });
  assert.deepEqual(calls.map(({ url }) => url), [
    "https://short.example/start",
    "https://short.example/middle",
    "https://final.example/destination",
  ]);
  assert.ok(calls.every(({ options }) => options.method === "HEAD"));
  assert.ok(calls.every(({ options }) => options.redirect === "manual"));
});

test("stops immediately when the HEAD response is not a redirect", async (t) => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (_url, options) => {
    fetchCount += 1;
    assert.equal(options.method, "HEAD");
    assert.equal(options.redirect, "manual");
    return { status: 405, headers: new Headers() };
  };

  const response = await worker.fetch(workerRequest("https://example.com/page"), {});

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    finalUrl: "https://example.com/page",
  });
  assert.equal(fetchCount, 1);
});

test("rejects redirect loops", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  t.after(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  console.error = () => {};
  globalThis.fetch = async (url) => ({
    status: 302,
    headers: new Headers({
      Location: url.endsWith("/one") ? "/two" : "/one",
    }),
  });

  const response = await worker.fetch(workerRequest("https://loop.example/one"), {});

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "Unable to resolve URL" });
});
