const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const siteRoot = path.resolve(__dirname, "..");
const sharedCss = fs.readFileSync(path.join(siteRoot, "assets", "css", "shared", "dictionary-selector.css"), "utf8");
const unscramblerCss = fs.readFileSync(path.join(siteRoot, "assets", "css", "tools", "word-unscrambler.css"), "utf8");

test("dictionary selectors use reserved help text instead of floating panels", () => {
  for (const css of [sharedCss, unscramblerCss]) {
    assert.doesNotMatch(css, /\.segmented-control label::after/);
    assert.doesNotMatch(css, /content:\s*attr\(data-tooltip\)/);
    assert.match(css, /\.dictionary-selector::after/);
    assert.match(css, /\.dictionary-selector\s*\{[^}]*width:\s*min\(100%, 27rem\)/s);
    assert.match(css, /\.dictionary-selector\s*\{[^}]*flex:\s*0 1 auto/s);
    assert.doesNotMatch(css, /flex:\s*0 1 27rem/);
    assert.match(css, /\.segmented-control\s*\{[^}]*width:\s*100%/s);
    assert.match(css, /height:\s*4\.1em/);
    assert.match(css, /overflow:\s*hidden/);
    assert.match(css, /ENABLE — a broad, public-domain English list/);
    assert.match(css, /SOWPODS — an international word-game list/);
    assert.match(css, /Both — combines ENABLE and SOWPODS/);
  }
});

test("every page using the shared dictionary selector loads the fixed version", () => {
  const pages = fs.readdirSync(path.join(siteRoot, "tools"))
    .filter((name) => name.endsWith(".html"))
    .map((name) => path.join(siteRoot, "tools", name))
    .filter((file) => fs.readFileSync(file, "utf8").includes("dictionary-selector.css"));

  assert.equal(pages.length, 8);
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /dictionary-selector\.css\?v=20260831-stable-mobile-7/);
  }
});

test("every dictionary solver explains the word-list choice in its usage guide", () => {
  const pages = [
    "antiwordle-helper.html", "crossword-solver.html", "octordle-solver.html",
    "quordle-solver.html", "sedecordle-solver.html", "word-unscrambler.html",
    "wordiply-solver.html", "wordle-helper.html", "words-with-friends-solver.html",
  ];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(siteRoot, "tools", page), "utf8");
    assert.match(html, /<li><strong>Choose a dictionary:<\/strong>/, `${page} needs a dictionary step`);
    assert.match(html, /ENABLE[^<]*(?:North American|public-domain)/, `${page} needs ENABLE guidance`);
    assert.match(html, /SOWPODS[^<]*British and North American/, `${page} needs SOWPODS guidance`);
    assert.match(html, /Hover over or focus/, `${page} needs interaction guidance`);
  }
});
