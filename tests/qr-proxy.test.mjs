import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import worker from "../workers/qr-proxy/index.js";

test("retired resolver never makes outbound requests", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("Unexpected outbound request"); };
  for (const target of [
    "https://example.com/", "http://localhost/", "http://127.0.0.1/",
    "http://10.0.0.1/", "http://169.254.169.254/", "http://[::1]/",
    "http://[::ffff:127.0.0.1]/", "https://rebinding.example/",
    "https://redirector.example/", "https://user:pass@example.com:8443/",
  ]) {
    for (const key of [null, "", "wrong", "secret"]) {
      const endpoint = new URL("https://qr-proxy.example/");
      endpoint.searchParams.set("url", target);
      if (key !== null) endpoint.searchParams.set("key", key);
      const response = await worker.fetch(new Request(endpoint, {
        headers: { Origin: "https://monkeytactics.com" },
      }), { QR_PROXY_KEY: "secret" });
      assert.equal(response.status, 410);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal((await response.json()).error, "Server-side redirect resolution is disabled");
    }
  }
  assert.equal(calls, 0);
});

test("retired endpoint is safe without an origin or environment", async () => {
  for (const method of ["GET", "POST", "OPTIONS"]) {
    assert.equal((await worker.fetch(new Request("https://qr-proxy.example/", { method }))).status, 410);
  }
});

test("decoder no longer invokes the proxy", () => {
  const html = fs.readFileSync(new URL("../tools/qr-code-decoder.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /qrProxyUrl|qr-proxy\.monkeytactics\.com/);
  const resolver = html.slice(html.indexOf("    function resolveFinalUrl("), html.indexOf("    function recordDecodedResultForHistory"));
  assert.doesNotMatch(resolver, /fetch\(/);
  assert.match(resolver, /resolution is disabled/);
});
