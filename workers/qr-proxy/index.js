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
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 10;

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
      let currentUrl = targetUrl;
      const visitedUrls = new Set();

      for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        const currentUrlString = currentUrl.toString();

        if (visitedUrls.has(currentUrlString)) {
          throw new Error("Redirect loop detected");
        }
        visitedUrls.add(currentUrlString);

        const response = await fetch(currentUrlString, {
          method: "HEAD",
          redirect: "manual",
        });

        if (!REDIRECT_STATUSES.has(response.status)) {
          return jsonResponse({ finalUrl: currentUrlString }, 200, origin);
        }

        const location = response.headers.get("Location");
        if (!location) {
          throw new Error("Redirect response is missing a Location header");
        }
        if (redirectCount === MAX_REDIRECTS) {
          throw new Error("Too many redirects");
        }

        currentUrl = new URL(location, currentUrl);
        if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
          throw new Error("Redirect target must use HTTP or HTTPS");
        }
      }

      throw new Error("Too many redirects");
    } catch (error) {
      console.error("QR proxy request failed", error);
      return jsonResponse({ error: "Unable to resolve URL" }, 502, origin);
    }
  },
};
