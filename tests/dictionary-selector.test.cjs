const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const siteRoot = path.resolve(__dirname, "..");
const sharedCss = fs.readFileSync(path.join(siteRoot, "assets", "css", "shared", "dictionary-selector.css"), "utf8");
const sharedControls = fs.readFileSync(path.join(siteRoot, "assets", "js", "shared", "dictionary-offline-controls.js"), "utf8");
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
    assert.match(css, /EXPANDED — an international word-game list/);
    assert.match(css, /Both — combines ENABLE and EXPANDED/);
  }
});

test("every page using the shared dictionary selector loads the fixed version", () => {
  const pages = fs.readdirSync(path.join(siteRoot, "tools"))
    .filter((name) => name.endsWith(".html"))
    .map((name) => path.join(siteRoot, "tools", name))
    .filter((file) => fs.readFileSync(file, "utf8").includes("dictionary-selector.css"));

  assert.equal(pages.length, 9);
  for (const page of pages) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /dictionary-selector\.css\?v=20260904-wiktionary-check-14/);
    assert.match(html, /dictionary-offline-controls\.js\?v=20260904-active-dictionary-icon-10/);
  }
});

test("shared dictionary choices use the Crossword icon set", () => {
  assert.match(sharedControls, /<path fill="#fff" d="m2 2/);
  assert.match(sharedControls, /choice\.icon === "reference-globe" \? "◎" : "⊕"/);
  assert.doesNotMatch(sharedControls, /choice\.icon === "reference-globe" \? "◎" : "\+"/);
  assert.match(sharedControls, /trigger\.innerHTML = choiceIcon\(choice\.name\)/);
  assert.match(sharedControls, /name === "Expanded" \? "◎" : "⊕"/);
});

test("shared offline confirmation matches the Crossword modal format", () => {
  assert.match(sharedControls, /<dl aria-live="polite">/);
  assert.match(sharedControls, /<section class="reference-offline-warning"><h3>While Offline Mode is enabled<\/h3><ul>/);
  assert.match(sharedControls, /class="reference-force-track"/);
  assert.match(sharedControls, /Ignore saved copies and replace every Offline Mode file/);
  assert.match(sharedCss, /\.reference-offline-modal\{width:min\(38rem/);
  assert.match(sharedCss, /\.reference-offline-body dl\{[^}]*border:/);
  assert.match(sharedCss, /\.reference-offline-warning\{[^}]*border-left:3px solid #facc15/);
  assert.match(sharedCss, /\.reference-force-download\{[^}]*grid-template-columns:auto auto minmax\(0,1fr\)/);
});

test("offline confirmation resets after a completed download", () => {
  assert.match(sharedControls, /const resetDialog = \(\) =>/);
  assert.match(sharedControls, /progressWrap\.hidden = true/);
  assert.match(sharedControls, /progress\.value = 0/);
  assert.match(sharedControls, /cancel\.textContent = "Cancel"/);
  assert.match(sharedControls, /ok\.hidden = false/);
  assert.match(sharedControls, /resetDialog\(\);\s*dialog\.showModal\(\)/);
  assert.match(sharedControls, /downloaded \? "Downloading files…" : "Checking saved files…"/);
  assert.match(sharedControls, /`\$\{downloaded\} downloaded · \$\{reused\} reused`/);
});

test("shared offline confirmation shows progress only for actual downloads", () => {
  assert.doesNotMatch(sharedControls, /ok\.addEventListener\("click", \(\) => \{[\s\S]*?progressWrap\.hidden = false/);
  assert.match(sharedControls, /progressWrap\.hidden = downloaded === 0/);
  assert.match(sharedControls, /if \(downloaded\) message\.textContent = ""/);
  assert.match(sharedControls, /if \(\(Number\(progress\.dataset\.downloaded\) \|\| 0\) === 0\) \{\s*dialog\.close\(\)/);
});

test("every remaining word-game utility receives the shared Offline Mode capability", () => {
  const newlyOffline = [
    "absurdle-solver.html", "antiwordle-solver.html", "octordle-solver.html", "quordle-solver.html",
    "sedecordle-solver.html", "wordiply-solver.html", "wordle-helper.html",
  ];
  assert.match(sharedControls, /function attachGenericOfflineCapability\(/);
  assert.match(sharedControls, /buildGenericOfflineUrls\(cache\)/);
  assert.match(sharedControls, /navigator\.serviceWorker\.register\("\/crossword-offline-sw\.js", \{ scope: "\/" \}\)/);
  assert.match(sharedControls, /The offline package could not be verified/);
  assert.match(sharedControls, /offline\.className = "reference-generic-offline"/);
  assert.doesNotMatch(sharedControls, /Offline Mode \[Future\]/);
  for (const page of newlyOffline) {
    const html = fs.readFileSync(path.join(siteRoot, "tools", page), "utf8");
    assert.match(html, /dictionary-offline-controls\.js\?v=20260904-active-dictionary-icon-10/);
  }
});

test("every dictionary solver explains the word-list choice in its usage guide", () => {
  const pages = [
    "absurdle-solver.html", "antiwordle-solver.html", "crossword-solver.html", "octordle-solver.html",
    "quordle-solver.html", "sedecordle-solver.html", "word-unscrambler.html",
    "wordiply-solver.html", "wordle-helper.html", "words-with-friends-solver.html",
  ];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(siteRoot, "tools", page), "utf8");
    assert.match(html, /<li><strong>Choose a dictionary:<\/strong>/, `${page} needs a dictionary step`);
    assert.match(html, /ENABLE[^<]*(?:North American|public-domain)/, `${page} needs ENABLE guidance`);
    assert.match(html, /(?:EXPANDED|Expanded)[^<]*(?:Wiktionary|British and North American)/, `${page} needs Expanded guidance`);
    assert.match(html, /Hover over or focus/, `${page} needs interaction guidance`);
  }
});
