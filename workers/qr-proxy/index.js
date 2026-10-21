const ALLOWED_ORIGINS = new Set([
  "https://monkeytactics.com",
  "https://www.monkeytactics.com",
  "https://monkeytactics-calculators.pages.dev",
  "https://preview.monkeytactics-calculators.pages.dev",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "http://127.0.0.1:8788",
  "http://localhost:8788",
]);
function jsonResponse(body, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return new Response(JSON.stringify(body), { status, headers });
}

// Retain a tombstone endpoint for older clients. Never fetch caller-selected URLs.
export default {
  async fetch(request) {
    const origin = request.headers.get("Origin");
    return jsonResponse(
      { error: "Server-side redirect resolution is disabled" },
      410,
      origin,
    );
  },
};
