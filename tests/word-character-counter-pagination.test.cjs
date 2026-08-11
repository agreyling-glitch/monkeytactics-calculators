const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const siteRoot = path.resolve(__dirname, "..");

test("unscramble modal pages results in groups of 15", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");
  const script = fs.readFileSync(
    path.join(siteRoot, "assets", "js", "tools", "word-character-counter", "integration.js"),
    "utf8"
  );

  assert.match(html, /id="unscramble-popup-pagination"/);
  assert.match(html, /id="unscramble-popup-previous"/);
  assert.match(html, /id="unscramble-popup-next"/);
  assert.match(html, /id="unscramble-popup-page-status"[^>]*aria-live="polite"/);
  assert.match(script, /const popupPageSize = 15;/);
  assert.match(script, /popupMatches\.slice\(start, start \+ popupPageSize\)/);
  assert.match(script, /popupPrevious\.disabled = popupPage === 0;/);
  assert.match(script, /popupNext\.disabled = popupPage === pageCount - 1;/);
});
