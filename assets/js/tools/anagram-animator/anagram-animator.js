import {
  ANAGRAM_ANIMATION_PAUSE,
  ANAGRAM_ANIMATION_SPEEDS,
  ANAGRAM_ANIMATION_STYLES,
  renderAnagramAnimationFrame
} from "../anagram-architect/anagram-share-reveal.js";

const form = document.querySelector("#anagram-animator-form");
const sourceInput = document.querySelector("#anagram-animator-source");
const resultInput = document.querySelector("#anagram-animator-result");
const styleSelect = document.querySelector("#anagram-animator-style");
const speedSelect = document.querySelector("#anagram-animator-speed");
const repeatInput = document.querySelector("#anagram-animator-repeat");
const canvas = document.querySelector("#anagram-animator-canvas");
const status = document.querySelector("#anagram-animator-status");
const playButton = document.querySelector("#anagram-animator-play");
const copyButton = document.querySelector("#anagram-animator-copy");
const embedButton = document.querySelector("#anagram-animator-embed");
const focusButton = document.querySelector("#anagram-animator-focus");

let animationId = 0;

function letters(value) { return [...value.toLowerCase()].filter((character) => /[a-z]/.test(character)).sort().join(""); }
function exactPair() { const source = letters(sourceInput.value); return source.length > 1 && source === letters(resultInput.value); }
function safeStyle(value) { return ANAGRAM_ANIMATION_STYLES.includes(value) ? value : "blueprint"; }
function safeSpeed(value) { return Object.hasOwn(ANAGRAM_ANIMATION_SPEEDS, value) ? value : "normal"; }
function booleanParam(value, fallback = true) { return value == null ? fallback : !["0", "false", "no"].includes(value.toLowerCase()); }

function currentSettings() {
  return { source: sourceInput.value.trim(), result: resultInput.value.trim(), style: safeStyle(styleSelect.value), speed: safeSpeed(speedSelect.value), repeat: repeatInput.checked };
}

function shareUrl({ focus = new URLSearchParams(location.search).get("focus") === "1" } = {}) {
  const values = currentSettings(); const url = new URL(location.href); url.search = "";
  url.searchParams.set("from", values.source); url.searchParams.set("to", values.result);
  url.searchParams.set("style", values.style); url.searchParams.set("speed", values.speed);
  if (!values.repeat) url.searchParams.set("repeat", "0");
  if (new URLSearchParams(location.search).get("embed") === "1") url.searchParams.set("embed", "1");
  else if (focus) url.searchParams.set("focus", "1");
  return url;
}

function embedUrl() { const url = shareUrl({ focus: false }); url.searchParams.delete("focus"); url.searchParams.set("embed", "1"); return url; }

function embedCode() {
  return `<iframe src="${embedUrl().href}" title="Animated exact anagram reveal" loading="lazy" style="width:100%;aspect-ratio:16/9;border:0" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

function updateUrl() { if (exactPair()) history.replaceState(null, "", shareUrl()); }

function stop() { cancelAnimationFrame(animationId); animationId = 0; }

function setFocusMode(enabled) {
  if (document.documentElement.classList.contains("animator-embed")) return;
  document.documentElement.classList.toggle("animator-focus", enabled); focusButton.setAttribute("aria-pressed", String(enabled));
  const url = new URL(location.href); if (enabled) url.searchParams.set("focus", "1"); else url.searchParams.delete("focus"); history.replaceState(null, "", url);
}

function play() {
  stop();
  if (!exactPair()) {
    status.textContent = "The before and after phrases must use exactly the same letters.";
    status.dataset.state = "error";
    return;
  }
  const settings = currentSettings(); const duration = ANAGRAM_ANIMATION_SPEEDS[settings.speed]; const started = performance.now();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    renderAnagramAnimationFrame(canvas, settings.source, settings.result, { ...settings, elapsed: duration });
    status.textContent = "Exact anagram ✓ · static view shown for reduced motion"; status.dataset.state = "ready"; updateUrl(); return;
  }
  status.textContent = "Exact anagram ✓ · playing locally"; status.dataset.state = "ready"; updateUrl();
  const frame = (now) => {
    const elapsed = now - started; const cycleLength = duration + ANAGRAM_ANIMATION_PAUSE;
    const cycleTime = settings.repeat ? elapsed % cycleLength : Math.min(elapsed, duration);
    renderAnagramAnimationFrame(canvas, settings.source, settings.result, { ...settings, elapsed: Math.min(cycleTime, duration) });
    if (settings.repeat || elapsed < duration) animationId = requestAnimationFrame(frame);
  };
  animationId = requestAnimationFrame(frame);
}

function loadUrl() {
  const params = new URLSearchParams(location.search);
  sourceInput.value = (params.get("from") || "The meaning of life").slice(0, 120);
  resultInput.value = (params.get("to") || "The fine game of nil").slice(0, 120);
  styleSelect.value = safeStyle(params.get("style") || "blueprint");
  speedSelect.value = safeSpeed(params.get("speed") || "normal");
  repeatInput.checked = booleanParam(params.get("repeat"));
  if (booleanParam(params.get("autoplay"))) play();
  else renderAnagramAnimationFrame(canvas, sourceInput.value, resultInput.value, { style: styleSelect.value, speed: speedSelect.value, elapsed: ANAGRAM_ANIMATION_SPEEDS[speedSelect.value] });
}

form.addEventListener("submit", (event) => { event.preventDefault(); play(); });
playButton.addEventListener("click", play);
[styleSelect, speedSelect, repeatInput].forEach((control) => control.addEventListener("change", play));
copyButton.addEventListener("click", async () => {
  if (!exactPair()) { status.textContent = "Correct the phrases before copying a link."; status.dataset.state = "error"; return; }
  await navigator.clipboard.writeText(shareUrl({ focus: true }).href); copyButton.textContent = "Link copied"; status.textContent = "Compact focus-mode animation link copied.";
  setTimeout(() => { copyButton.textContent = "Copy animation link"; }, 1400);
});
embedButton.addEventListener("click", async () => {
  if (!exactPair()) { status.textContent = "Correct the phrases before copying embed code."; status.dataset.state = "error"; return; }
  await navigator.clipboard.writeText(embedCode()); embedButton.textContent = "Embed copied"; status.textContent = "Responsive iframe embed code copied.";
  setTimeout(() => { embedButton.textContent = "Copy embed code"; }, 1400);
});
focusButton.addEventListener("click", () => setFocusMode(true));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && document.documentElement.classList.contains("animator-focus")) setFocusMode(false); });
window.addEventListener("pagehide", stop);
loadUrl();
