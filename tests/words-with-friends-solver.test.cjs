const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "tools", "words-with-friends-solver.html"), "utf8");
const script = fs.readFileSync(path.join(root, "assets", "js", "tools", "word-unscrambler", "word-unscrambler.js"), "utf8");

test("Words With Friends solver publishes a distinct canonical page", () => {
  assert.match(html, /<title>Free Words With Friends Solver &amp; Word Finder \| MonkeyTactics<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/words-with-friends-solver"/);
  assert.match(html, /data-word-game="wwf"/);
  assert.doesNotMatch(html, /tools\/word-unscrambler#(?:app|webpage|breadcrumb)/);
});

test("WWF mode uses its tile table, engine scoring, and 35-point bingo", () => {
  assert.match(script, /const WWF_TILE_VALUES = Object\.freeze/);
  assert.match(script, /Engine\.scoreWwfWord\(word\)/);
  assert.match(script, /IS_WWF \? "Bingo \+35" : "Bingo \+50"/);
  assert.match(script, /scoring: IS_WWF \? "wwf" : "scrabble"/);
});

test("all four word solvers cross-link in Related Word Tools", () => {
  const tools = [
    ["word-unscrambler.html", "/tools/word-unscrambler"],
    ["words-with-friends-solver.html", "/tools/words-with-friends-solver"],
    ["crossword-solver.html", "/tools/crossword-solver"],
    ["wordle-helper.html", "/tools/wordle-helper"],
  ];

  for (const [file, ownUrl] of tools) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    const section = page.match(/<section[^>]*class="related-tools"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section, `${file} should have a Related Word Tools section`);
    assert.match(section, /<h2[^>]*>Related Word Tools<\/h2>/);

    for (const [, url] of tools) {
      if (url !== ownUrl) {
        assert.match(section, new RegExp(`href="${url}"`), `${file} should link to ${url}`);
      }
    }
    assert.doesNotMatch(section, new RegExp(`href="${ownUrl}"`), `${file} should not link to itself`);
    assert.equal((section.match(/class="related-card"/g) || []).length, 3);
  }
});
