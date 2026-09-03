"use strict";

const CROSSWORD_CACHE_PREFIX = "monkeytactics-crossword-offline-";
const WORD_TOOL_CACHE_PREFIX = "monkeytactics-word-tool-offline-";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function matchCrosswordCache(request) {
  const names = (await caches.keys()).filter((name) =>
    name.startsWith(CROSSWORD_CACHE_PREFIX) || name.startsWith(WORD_TOOL_CACHE_PREFIX));
  for (const name of names) {
    const response = await (await caches.open(name)).match(request);
    if (response) return response;
  }
  return undefined;
}

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch (error) {
      const cached = await matchCrosswordCache(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate" && requestUrl.pathname.startsWith("/tools/crossword-solver")) {
        const fallback = await matchCrosswordCache("/tools/crossword-solver.html");
        if (fallback) return fallback;
      }
      if (event.request.mode === "navigate" && /^\/tools\/(word-unscrambler|words-with-friends-solver)\/?(?:\.html)?$/.test(requestUrl.pathname)) {
        const pagePath = requestUrl.pathname.replace(/\/$/, "").replace(/\.html$/, "") + ".html";
        const fallback = await matchCrosswordCache(pagePath);
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
