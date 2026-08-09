/* ========================================================================
   MonkeyTactics.com — Time Zone Converter / Meeting Planner logic
   Pure functions. No DOM access.

   All state lives in the URL (see the tool spec):
     cities    — comma-separated codes, slugs, or IANA tz names (1–20)
     time      — ISO-8601 "YYYY-MM-DDTHH:mm", interpreted in the FIRST city's tz
     format    — "24h" | "12h"           (default 24h)
     view      — "planner" | "worldclock" | "difference"  (default planner)
     highlight — "on" | "off"             (default on)

   DST, half-hour, and quarter-hour offsets are handled natively by the
   browser's Intl implementation using IANA time-zone names.
   ======================================================================== */

/**
 * Curated list of major cities. Codes are short aliases usable in the URL;
 * slugs are the dashed city name. Each maps to an IANA time-zone name.
 * Covers every edge case in the spec (half-hour: India/Adelaide;
 * quarter-hour: Kathmandu; DST anomalies; PHX which skips DST).
 */
export const CITIES = [
  { code: "NYC", slug: "new-york", name: "New York", country: "USA", tz: "America/New_York" },
  { code: "LAX", slug: "los-angeles", name: "Los Angeles", country: "USA", tz: "America/Los_Angeles" },
  { code: "CHI", slug: "chicago", name: "Chicago", country: "USA", tz: "America/Chicago" },
  { code: "DEN", slug: "denver", name: "Denver", country: "USA", tz: "America/Denver" },
  { code: "PHX", slug: "phoenix", name: "Phoenix", country: "USA", tz: "America/Phoenix" },
  { code: "ANC", slug: "anchorage", name: "Anchorage", country: "USA", tz: "America/Anchorage" },
  { code: "HNL", slug: "honolulu", name: "Honolulu", country: "USA", tz: "Pacific/Honolulu" },
  { code: "TOR", slug: "toronto", name: "Toronto", country: "Canada", tz: "America/Toronto" },
  { code: "VAN", slug: "vancouver", name: "Vancouver", country: "Canada", tz: "America/Vancouver" },
  { code: "MEX", slug: "mexico-city", name: "Mexico City", country: "Mexico", tz: "America/Mexico_City" },
  { code: "SAO", slug: "sao-paulo", name: "São Paulo", country: "Brazil", tz: "America/Sao_Paulo" },
  { code: "BUE", slug: "buenos-aires", name: "Buenos Aires", country: "Argentina", tz: "America/Argentina/Buenos_Aires" },
  { code: "LIM", slug: "lima", name: "Lima", country: "Peru", tz: "America/Lima" },
  { code: "BOG", slug: "bogota", name: "Bogotá", country: "Colombia", tz: "America/Bogota" },
  { code: "LON", slug: "london", name: "London", country: "UK", tz: "Europe/London" },
  { code: "DUB", slug: "dublin", name: "Dublin", country: "Ireland", tz: "Europe/Dublin" },
  { code: "PAR", slug: "paris", name: "Paris", country: "France", tz: "Europe/Paris" },
  { code: "BER", slug: "berlin", name: "Berlin", country: "Germany", tz: "Europe/Berlin" },
  { code: "MAD", slug: "madrid", name: "Madrid", country: "Spain", tz: "Europe/Madrid" },
  { code: "ROM", slug: "rome", name: "Rome", country: "Italy", tz: "Europe/Rome" },
  { code: "AMS", slug: "amsterdam", name: "Amsterdam", country: "Netherlands", tz: "Europe/Amsterdam" },
  { code: "STO", slug: "stockholm", name: "Stockholm", country: "Sweden", tz: "Europe/Stockholm" },
  { code: "WAW", slug: "warsaw", name: "Warsaw", country: "Poland", tz: "Europe/Warsaw" },
  { code: "IST", slug: "istanbul", name: "Istanbul", country: "Türkiye", tz: "Europe/Istanbul" },
  { code: "MOS", slug: "moscow", name: "Moscow", country: "Russia", tz: "Europe/Moscow" },
  { code: "CAI", slug: "cairo", name: "Cairo", country: "Egypt", tz: "Africa/Cairo" },
  { code: "JNB", slug: "johannesburg", name: "Johannesburg", country: "South Africa", tz: "Africa/Johannesburg" },
  { code: "LAG", slug: "lagos", name: "Lagos", country: "Nigeria", tz: "Africa/Lagos" },
  { code: "DXB", slug: "dubai", name: "Dubai", country: "UAE", tz: "Asia/Dubai" },
  { code: "THR", slug: "tehran", name: "Tehran", country: "Iran", tz: "Asia/Tehran" },
  { code: "KAR", slug: "karachi", name: "Karachi", country: "Pakistan", tz: "Asia/Karachi" },
  { code: "DEL", slug: "delhi", name: "New Delhi", country: "India", tz: "Asia/Kolkata" },
  { code: "BOM", slug: "mumbai", name: "Mumbai", country: "India", tz: "Asia/Kolkata" },
  { code: "KTM", slug: "kathmandu", name: "Kathmandu", country: "Nepal", tz: "Asia/Kathmandu" },
  { code: "DAC", slug: "dhaka", name: "Dhaka", country: "Bangladesh", tz: "Asia/Dhaka" },
  { code: "BKK", slug: "bangkok", name: "Bangkok", country: "Thailand", tz: "Asia/Bangkok" },
  { code: "JKT", slug: "jakarta", name: "Jakarta", country: "Indonesia", tz: "Asia/Jakarta" },
  { code: "SIN", slug: "singapore", name: "Singapore", country: "Singapore", tz: "Asia/Singapore" },
  { code: "HKG", slug: "hong-kong", name: "Hong Kong", country: "China", tz: "Asia/Hong_Kong" },
  { code: "PEK", slug: "beijing", name: "Beijing", country: "China", tz: "Asia/Shanghai" },
  { code: "SHA", slug: "shanghai", name: "Shanghai", country: "China", tz: "Asia/Shanghai" },
  { code: "TPE", slug: "taipei", name: "Taipei", country: "Taiwan", tz: "Asia/Taipei" },
  { code: "TYO", slug: "tokyo", name: "Tokyo", country: "Japan", tz: "Asia/Tokyo" },
  { code: "SEL", slug: "seoul", name: "Seoul", country: "South Korea", tz: "Asia/Seoul" },
  { code: "ADL", slug: "adelaide", name: "Adelaide", country: "Australia", tz: "Australia/Adelaide" },
  { code: "SYD", slug: "sydney", name: "Sydney", country: "Australia", tz: "Australia/Sydney" },
  { code: "MEL", slug: "melbourne", name: "Melbourne", country: "Australia", tz: "Australia/Melbourne" },
  { code: "PER", slug: "perth", name: "Perth", country: "Australia", tz: "Australia/Perth" },
  { code: "AKL", slug: "auckland", name: "Auckland", country: "New Zealand", tz: "Pacific/Auckland" },
];

/* --------------------------- City resolution --------------------------- */

const _byCode = new Map(CITIES.map((c) => [c.code.toUpperCase(), c]));
const _bySlug = new Map(CITIES.map((c) => [c.slug.toLowerCase(), c]));

/** True when the browser recognises `tz` as a valid IANA time-zone name. */
function isValidTimeZone(tz) {
  try {
    // Intl throws a RangeError for unknown tz names.
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve any single token — a short code, a city slug, or an IANA tz name —
 * to a normalised { name, tz }. Returns null for unknown tokens (the caller
 * should skip them per spec §5.1).
 */
export function resolveCity(token) {
  if (!token || typeof token !== "string") return null;
  const trimmed = token.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (_byCode.has(upper)) {
    const c = _byCode.get(upper);
    return { name: c.name, tz: c.tz };
  }

  const lower = trimmed.toLowerCase();
  if (_bySlug.has(lower)) {
    const c = _bySlug.get(lower);
    return { name: c.name, tz: c.tz };
  }

  // IANA tz passthrough — accept "Europe/London", "America/Argentina/Buenos_Aires", etc.
  if (isValidTimeZone(trimmed)) {
    // Friendlier display name from the last segment (e.g. "London", "Buenos_Aires").
    const niceName = trimmed.split("/").pop().replace(/_/g, " ");
    return { name: niceName, tz: trimmed };
  }

  return null;
}

/* ---------------------------- URL parameters --------------------------- */

/**
 * Parse the `cities` parameter: split on commas, resolve each token, drop
 * invalid entries, cap at 20, preserve order.
 */
export function parseCitiesParam(raw) {
  if (!raw) return [];
  const tokens = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
  const resolved = [];
  for (const t of tokens) {
    if (resolved.length >= 20) break;
    const city = resolveCity(t);
    if (city) {
      // Avoid exact-duplicate tz+name entries from the same token list.
      if (!resolved.some((r) => r.tz === city.tz && r.name === city.name)) {
        resolved.push(city);
      }
    }
  }
  return resolved;
}

/** Validate ISO "YYYY-MM-DDTHH:mm". Returns true on exact match. */
export function isValidTimeISO(value) {
  if (!value || typeof value !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

/**
 * Parse the full URL state from a URLSearchParams (or string) with the
 * spec's defaults and safe fallbacks for bad values.
 */
export function parseUrlState(input) {
  const sp = input instanceof URLSearchParams ? input : new URLSearchParams(input);

  const cities = parseCitiesParam(sp.get("cities"));

  let timeISO = sp.get("time");
  if (!isValidTimeISO(timeISO)) timeISO = null;

  const format = sp.get("format") === "12h" ? "12h" : "24h";

  const rawView = sp.get("view");
  const view = ["planner", "worldclock", "difference"].includes(rawView) ? rawView : "planner";

  const rawHighlight = sp.get("highlight");
  const highlight = rawHighlight === "off" ? false : true; // default on

  return { cities, timeISO, format, view, highlight };
}

/**
 * Inverse of parseUrlState — build a URLSearchParams suitable for
 * history.replaceState. Omits defaults so URLs stay tidy.
 */
export function buildUrlState(state) {
  const sp = new URLSearchParams();
  const codes = state.cities.map((c) => cityToToken(c));
  if (codes.length) sp.set("cities", codes.join(","));
  if (isValidTimeISO(state.timeISO)) sp.set("time", state.timeISO);
  if (state.format === "12h") sp.set("format", "12h");
  if (state.view && state.view !== "planner") sp.set("view", state.view);
  if (state.highlight === false) sp.set("highlight", "off");
  return sp;
}

/**
 * Pick the most compact token for a resolved city when serialising back to
 * the URL: prefer a curated code, then slug, else the raw tz.
 */
export function cityToToken(city) {
  if (!city || !city.tz) return "";
  const curated = CITIES.find((c) => c.tz === city.tz && c.name === city.name);
  if (curated) return curated.code;
  return city.tz;
}

/* ------------------------------ Time math ------------------------------ */

/**
 * Signed UTC offset (in minutes) for `tz` at the given instant.
 * Positive = ahead of UTC (e.g. Kolkata → +330, Kathmandu → +345).
 */
export function getOffsetMinutes(tz, date) {
  // Use the long-form GMT offset which includes the ±HH:MM sign and minutes.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  });
  const parts = dtf.formatToParts(date instanceof Date ? date : new Date(date));
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  if (!tzPart) return 0;
  const match = tzPart.value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/i);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2], 10) || 0;
  const minutes = parseInt(match[3] || "0", 10);
  return sign * (hours * 60 + minutes);
}

/** Format an offset like +05:30 / -04:00 / +00:00. */
export function formatOffset(minutes) {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Interpret a "YYYY-MM-DDTHH:mm" string as wall-clock time in `referenceTz`
 * and return the corresponding UTC instant (a Date).
 *
 * Strategy: compute the reference zone's offset at a naive guess, adjust,
 * then re-read the offset at the corrected instant (the offset can differ
 * across a DST boundary). Two passes are enough.
 */
export function wallClockToUTC(timeISO, referenceTz) {
  if (!isValidTimeISO(timeISO)) return null;
  const [datePart, timePart] = timeISO.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);

  // Naive guess: pretend the wall time was UTC.
  const naive = Date.UTC(y, mo - 1, d, h, mi, 0);
  // First offset read at the naive instant.
  const off1 = getOffsetMinutes(referenceTz, new Date(naive));
  // Shift to true UTC by subtracting the offset.
  const adjusted = naive - off1 * 60000;
  // Re-read at the corrected instant (handles DST flips between guess and truth).
  const off2 = getOffsetMinutes(referenceTz, new Date(adjusted));
  return new Date(adjusted - (off2 - off1) * 60000);
}

/**
 * Convert a wall-clock time in `referenceTz` into the UTC instant. For
 * spring-forward gaps (missing hour) the earlier minute is shifted forward
 * to the next valid time; for fall-back duplicates the first occurrence
 * (standard time) is returned. (Spec §8.4–8.5.)
 */
export function convertTime(timeISO, referenceTz, _targetTz) {
  const utc = wallClockToUTC(timeISO, referenceTz);
  if (!utc || isNaN(utc.getTime())) return null;
  return utc;
}

/**
 * Format a UTC instant as wall-clock time in `tz`.
 * Returns { time, date, weekday, offsetMinutes, offsetLabel, dateLabel }.
 */
export function formatInZone(utcDate, tz, { hour12 = false } = {}) {
  if (!utcDate || isNaN(utcDate.getTime())) return null;

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(utcDate);

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(utcDate);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).format(utcDate);

  const offsetMinutes = getOffsetMinutes(tz, utcDate);
  const offsetLabel = formatOffset(offsetMinutes);

  return { time, weekday, dateLabel, offsetMinutes, offsetLabel };
}

/**
 * True if the instant falls within standard business hours (Mon–Fri,
 * 09:00–17:59 local) in `tz`. Drives the highlight band.
 */
export function isBusinessHour(utcDate, tz) {
  if (!utcDate || isNaN(utcDate.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const wd = get("weekday");
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  if (wd === "Sat" || wd === "Sun") return false;
  const minutesOfDay = hour * 60 + minute;
  return minutesOfDay >= 9 * 60 && minutesOfDay < 18 * 60;
}

/**
 * Given an array of per-city working-hour windows (each { tz, startUTC,
 * endUTC }), return the overlap interval where every city is within its
 * business hours. Returns null if there is no overlap.
 *
 * Used by the planner view to suggest a good meeting slot.
 */
export function findOverlap(ranges) {
  if (!Array.isArray(ranges) || ranges.length === 0) return null;
  let start = -Infinity;
  let end = Infinity;
  for (const r of ranges) {
    if (!r || typeof r.startUTC !== "number" || typeof r.endUTC !== "number") return null;
    if (r.startUTC > start) start = r.startUTC;
    if (r.endUTC < end) end = r.endUTC;
  }
  if (start >= end) return null;
  return { startUTC: start, endUTC: end };
}
