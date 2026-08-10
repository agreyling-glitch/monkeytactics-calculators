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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        },
      });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, origin);
    }

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      return jsonResponse({ error: 'Missing required query parameter: "url"' }, 400, origin);
    }

    const providedKey = requestUrl.searchParams.get("key");
    if (providedKey !== null && providedKey !== env.QR_PROXY_KEY) {
      return jsonResponse({ error: "Invalid API key" }, 401, origin);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return jsonResponse({ error: 'Invalid "url" query parameter' }, 400, origin);
    }

    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      return jsonResponse({ error: 'The "url" parameter must use HTTP or HTTPS' }, 400, origin);
    }

    try {
      const response = await fetch(targetUrl.toString(), {
        method: "GET",
        redirect: "follow",
      });

      if (response.body) {
        await response.body.cancel();
      }

      return jsonResponse({ finalUrl: response.url }, 200, origin);
    } catch (error) {
      console.error("QR proxy request failed", error);
      return jsonResponse({ error: "Unable to resolve URL" }, 502, origin);
    }
  },
};
