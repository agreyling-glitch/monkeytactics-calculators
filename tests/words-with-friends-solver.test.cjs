const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const relatedGuidesScript = fs.readFileSync(path.join(root, "assets", "js", "shared", "related-guides.js"), "utf8");
const wordSolverCss = fs.readFileSync(path.join(root, "assets", "css", "tools", "word-unscrambler.css"), "utf8");
const wordSolverScript = fs.readFileSync(path.join(root, "assets", "js", "tools", "word-unscrambler", "word-unscrambler.js"), "utf8");
const premiumToolCss = fs.readFileSync(path.join(root, "assets", "css", "shared", "premium-tool.css"), "utf8");
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

test("word unscrambler and WWF solver publish related guide cards and structured lists", () => {
  const cases = [
    {
      file: "word-unscrambler.html",
      id: "word-unscrambler-related-guides",
      heading: "Related Word Unscrambler Guides",
      schemaId: "word-unscrambler#related-guides",
      urls: [
        "how-to-win-at-scrabble-with-a-word-unscrambler",
        "most-difficult-scrabble-words-to-unscramble",
      ],
    },
    {
      file: "words-with-friends-solver.html",
      id: "words-with-friends-related-guides",
      heading: "Related Words With Friends Guides",
      schemaId: "words-with-friends-solver#related-guides",
      urls: [
        "scrabble-vs-words-with-friends-strategy",
        "science-of-tile-tracking-predict-next-move",
      ],
    },
  ];

  for (const entry of cases) {
    const page = fs.readFileSync(path.join(root, "tools", entry.file), "utf8");
    assert.match(page, new RegExp(`id="${entry.id}"[\\s\\S]*${entry.heading}`));
    assert.ok(page.indexOf(`id="${entry.id}"`) < page.indexOf('class="related-tools"'));
    assert.match(page, new RegExp(`tools/${entry.schemaId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`));
    assert.match(page, /"@type": "ItemList"/);
    assert.match(page, new RegExp(`data-related-guides-tool="${entry.schemaId.split("#")[0]}"`));
    assert.match(page, /related-guides\.js\?v=20260903-priority-1/);
    for (const slug of entry.urls) {
      assert.equal((page.match(new RegExp(`https://blog\\.monkeytactics\\.com/posts/${slug}/`, "g")) || []).length, 3);
    }
  }
});

test("related guide metadata is selected by tool and descending priority", () => {
  assert.match(relatedGuidesScript, /post\.related_tools/);
  assert.match(relatedGuidesScript, /relation\.tool === tool/);
  assert.match(relatedGuidesScript, /b\.relation\.priority - a\.relation\.priority/);
  assert.match(relatedGuidesScript, /grid\.replaceChildren\(fragment\)/);
  assert.match(relatedGuidesScript, /Keep the crawlable, server-rendered fallback cards/);
});

test("the FAQ above related guides uses the full content width", () => {
  assert.match(wordSolverCss, /\.seo-section\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;/s);
  assert.match(wordSolverCss, /\.faq-section\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;/s);
  assert.match(wordSolverCss, /\.faq-list\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;/s);
  for (const file of ["word-unscrambler.html", "words-with-friends-solver.html"]) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    assert.match(page, /word-unscrambler\.css\?v=20260904-offline-switch-4/);
  }
});

test("word solver heading aligns with the top of the expanded dictionary controls", () => {
  assert.match(premiumToolCss, /\.word-tool-page \.tool-heading-row \{ align-items: flex-start; \}/);
  for (const file of ["word-unscrambler.html", "words-with-friends-solver.html"]) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    assert.match(page, /premium-tool\.css\?v=20260903-word-heading-align-3/);
  }
});

test("dictionary guidance appears before Offline Mode controls", () => {
  for (const file of ["word-unscrambler.html", "words-with-friends-solver.html"]) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    assert.match(page, /<div class="tool-heading-controls">[\s\S]*?<\/fieldset>\s*<div class="word-tool-offline-control">/);
    assert.doesNotMatch(page, /<fieldset class="dictionary-selector">[\s\S]*?<div class="word-tool-offline-control">[\s\S]*?<\/fieldset>/);
  }
  assert.match(wordSolverCss, /\.tool-heading-controls \.dictionary-selector::after\s*\{[^}]*height:\s*2\.6em;/s);
  assert.match(wordSolverCss, /\.word-tool-offline-control\s*\{[^}]*margin-top:\s*\.35rem;[^}]*padding-top:\s*\.45rem;/s);
});

test("word result popovers use local definitions and move external links behind a spyglass", () => {
  assert.match(wordSolverScript, /DefinitionService\.lookup\(word, \{ allowRemote: false \}\)/);
  assert.match(wordSolverScript, /className = "local-definition-lookup"/);
  assert.match(wordSolverScript, /className = "dictionary-directory-trigger"/);
  assert.match(wordSolverScript, /className = "spyglass-icon"/);
  assert.match(wordSolverScript, /dictionaryDirectoryDialog\.showModal\(\)/);
  assert.match(wordSolverScript, /for \(const dictionary of DICTIONARY_LINKS\)/);
  assert.doesNotMatch(wordSolverScript, /dictionaryLinkRow/);
  assert.match(wordSolverCss, /\.dictionary-directory-modal::backdrop/);
  for (const file of ["word-unscrambler.html", "words-with-friends-solver.html"]) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    assert.match(page, /word-definitions\.js\?v=20260903-wordnet-definitions-10/);
    assert.match(page, /word-unscrambler\.js\?v=20260904-offline-modal-9/);
    assert.match(page, /word-unscrambler\.css\?v=20260904-offline-switch-4/);
  }
});

test("definition popovers are roomier while remaining bounded on mobile", () => {
  assert.match(wordSolverCss, /\.dictionary-popover\s*\{[^}]*position:\s*fixed;[^}]*width:\s*min\(30rem, calc\(100vw - 2rem\)\);/s);
  assert.match(wordSolverCss, /\.local-definition-lookup\s*\{[^}]*font-size:\s*\.9rem;/s);
  assert.match(wordSolverCss, /@media \(max-width: 480px\)[\s\S]*?\.dictionary-popover\s*\{[^}]*width:\s*calc\(100vw - 1rem\);[^}]*max-height:\s*calc\(100dvh - 1rem\);/s);
  assert.doesNotMatch(wordSolverScript, /if \(!window\.matchMedia\("\(max-width: 900px\), \(max-height: 600px\)"\)\.matches\)/);
  assert.match(wordSolverScript, /const maxLeft = Math\.max\(viewportPadding, window\.innerWidth - viewportPadding - popoverRect\.width\)/);
  assert.match(wordSolverScript, /const maxTop = Math\.max\(viewportPadding, window\.innerHeight - viewportPadding - popoverRect\.height\)/);
});

test("word solvers offer opt-in offline downloads with local definitions", () => {
  for (const file of ["word-unscrambler.html", "words-with-friends-solver.html"]) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    assert.match(page, /id="word-tool-offline-toggle"[^>]*role="switch"[^>]*aria-checked="false"/);
    assert.match(page, /class="offline-switch-track"[^>]*>[\s\S]*?class="offline-switch-thumb"/);
    assert.match(page, /id="word-tool-offline-progress"/);
  }
  assert.match(wordSolverScript, /navigator\.serviceWorker\.register\("\/crossword-offline-sw\.js", \{ scope: "\/" \}\)/);
  assert.match(wordSolverScript, /Object\.values\(wordData\.chunks/);
  assert.match(wordSolverScript, /Object\.values\(definitionData\.shards/);
  assert.match(wordSolverScript, /offlineToggle\.setAttribute\("aria-checked", String\(offlineModeEnabled\)\)/);
  assert.match(wordSolverScript, /dictionaryDirectoryButton\.hidden = offlineModeEnabled/);
  assert.match(wordSolverScript, /section\.hidden = offlineModeEnabled/);
  assert.match(wordSolverScript, /const nextCacheName = `\$\{OFFLINE_CACHE_PREFIX\}\$\{OFFLINE_TOOL_ID\}-\$\{OFFLINE_VERSION\}`/);
  assert.doesNotMatch(wordSolverScript, /OFFLINE_VERSION\}-\$\{Date\.now\(\)\}/);
  assert.match(wordSolverScript, /if \(await cache\.match\(request\)\) return false/);
  assert.match(wordSolverScript, /const sharedResponse = await caches\.match\(request\)/);
  assert.match(wordSolverScript, /Promise\.all\(urls\.map\(\(url\) => cache\.match\(url\)\)\)/);
  assert.match(wordSolverScript, /Downloaded files are retained for fast re-enabling/);
});

test("word solvers provide common and strategic rack sorting", () => {
  for (const file of ["word-unscrambler.html", "words-with-friends-solver.html"]) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    assert.match(page, /id="rack-sort-trigger"[^>]*aria-haspopup="menu"/);
    assert.match(page, /id="rack-sort-menu"[^>]*role="menu"/);
  }
  for (const method of ["vowels-first", "alphabetical", "grouped-alphabetical", "blanks-left", "blanks-right", "s-right", "tile-function", "duplicates", "stem-retina", "stem-satine", "stem-tisane", "stem-senior", "stem-latrine", "frequency"]) {
    assert.match(wordSolverScript, new RegExp(`\\["${method}"`));
  }
  assert.match(wordSolverScript, /const pattern = slashIndex < 0 \? "" : input\.value\.slice\(slashIndex \+ 1\)\.trim\(\)/);
  assert.match(wordSolverScript, /renderRackTiles\(\);/);
  assert.match(wordSolverCss, /\.rack-sort-menu\s*\{[^}]*max-height:[^;}]*100dvh[^;}]*;[^}]*overflow-y:\s*auto;/s);
});

test("word solver SEO documents rack sorting, local definitions, and offline use", () => {
  const cases = [
    ["word-unscrambler.html", "word unscrambler", "Can I use the Word Unscrambler offline?"],
    ["words-with-friends-solver.html", "Words With Friends solver", "Can I use the Words With Friends Solver offline?"],
  ];
  for (const [file, searchTerm, offlineQuestion] of cases) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    const description = page.match(/<meta name="description" content="([^"]+)"/)?.[1] || "";
    assert.match(description, new RegExp(searchTerm, "i"));
    assert.match(description, /rack sorting/i);
    assert.match(description, /local definitions/i);
    assert.match(description, /offline/i);
    assert.match(page, /id="rack-sorting-and-offline-use"/);
    assert.match(page, /Rearrange rack tiles with vowel, alphabetical, blank, S, duplicate, digraph, frequency, and stem-based sorting/);
    assert.equal((page.match(new RegExp(offlineQuestion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 2);
  }
});

test("word solver pages explain Focus Mode in visible and structured content", () => {
  const cases = [
    ["word-unscrambler.html", "Does the Word Unscrambler have a Focus Mode?"],
    ["words-with-friends-solver.html", "Does the Words With Friends Solver have a Focus Mode?"],
  ];
  for (const [file, question] of cases) {
    const page = fs.readFileSync(path.join(root, "tools", file), "utf8");
    assert.match(page, /"Expand the solver into a distraction-free Focus Mode"/);
    assert.match(page, /<li><strong>Focus Mode:<\/strong>/);
    assert.equal((page.match(new RegExp(question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 2);
  }
});
