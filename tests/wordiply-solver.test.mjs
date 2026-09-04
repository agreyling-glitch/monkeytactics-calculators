import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../tools/wordiply-solver.html", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../assets/js/tools/wordiply-solver.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../assets/css/tools/wordiply-solver.css", import.meta.url), "utf8");

test("Wordiply solver has distinct metadata and structured data", () => {
  assert.match(html, /<title>Wordiply Solver: Find the Longest Words \| MonkeyTactics<\/title>/);
  assert.match(html, /canonical" href="https:\/\/monkeytactics\.com\/tools\/wordiply-solver"/);
  assert.match(html, /<meta name="author" content="MonkeyTactics">/);
  assert.match(html, /"@type":"SoftwareApplication"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"dateModified":"2026-08-31"/);
  assert.match(html, /"isAccessibleForFree":true/);
});

test("Wordiply SEO copy is descriptive, useful, and transparent", () => {
  assert.match(html, /<h1 id="tool-heading">Wordiply Solver: Find the Longest Words<\/h1>/);
  assert.match(html, /<h2>What Is Wordiply\?<\/h2>/);
  assert.match(html, /<h2>How to Improve Your Wordiply Score<\/h2>/);
  assert.match(html, /<h2>Standard Dictionary and Wordiply Answers<\/h2>/);
  assert.match(html, /<h2>How the Solver Finds Matches<\/h2>/);
  assert.match(html, /href="https:\/\/www\.wordiply\.com\/"/);
  assert.match(html, /href="\/third-party-notices">dictionary sources and licenses<\/a>/);
  assert.match(html, /not affiliated with or endorsed by Wordiply/);
});

test("FAQ structured data mirrors the visible FAQ questions", () => {
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
  const faq = json["@graph"].find((item) => item["@type"] === "FAQPage");
  const schemaQuestions = faq.mainEntity.map((item) => item.name);
  const visibleQuestions = [...html.matchAll(/<article><h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
  assert.deepEqual(schemaQuestions, visibleQuestions);
});

test("Wordiply interface prioritizes starter, position, and longest result", () => {
  assert.match(html, /id="wordiply-starter"/);
  assert.match(html, /name="position" value="anywhere" checked/);
  assert.match(html, /name="position" value="start"/);
  assert.match(html, /name="position" value="end"/);
  assert.match(html, /id="best-length"/);
});

test("Wordiply search keeps starter contiguous and sorts longest first", () => {
  assert.match(script, /`\*\$\{starter\}\*`/);
  assert.match(script, /sortBy: "length-desc"/);
  assert.match(script, /b\.length - a\.length \|\| a\.localeCompare\(b\)/);
  assert.match(script, /highlightStarter\(word, starter\)/);
});

test("Wordiply defaults to the Standard ENABLE dictionary", () => {
  assert.match(html, /name="dictionary" value="enable" checked/);
  assert.match(script, /dictionaryBits = \{ enable: 1, expanded: 2, both: 3 \}/);
});

test("each Wordiply result can be copied with visible feedback", () => {
  assert.match(script, /async function copyWord\(word, button\)/);
  assert.match(script, /navigator\.clipboard\?\.writeText/);
  assert.match(script, /Copy \$\{word\.toUpperCase\(\)\} to the clipboard/);
  assert.match(script, /action\.textContent = "Copied"/);
  assert.match(css, /\.result-word\.is-copied \.copy-action/);
});

test("Wordiply uses the site gold accent instead of coral red", () => {
  assert.match(css, /--wordiply-gold: #f4c95d/);
  assert.doesNotMatch(css, /wordiply-coral|#ff725e|255,114,94/);
});

test("Wordiply layout adapts to smaller screens", () => {
  assert.match(css, /\.wordiply-layout \{ display: grid;/);
  assert.match(css, /\.wordiply-page \.results-panel \{ display: block;/);
  assert.match(css, /@media \(max-width: 850px\) \{ \.wordiply-layout,\.content-grid \{ grid-template-columns: 1fr;/);
});

test("Wordiply FAQ uses compact always-visible cards", () => {
  assert.match(html, /<div class="faq-grid">/);
  assert.match(html, /<article><h3>Does the starter have to stay together\?<\/h3>/);
  assert.doesNotMatch(html, /<details>|<summary>/);
  assert.match(css, /\.faq-grid \{ display: grid; grid-template-columns: repeat\(3,minmax\(0,1fr\)\);/);
});

test("the hero example fits inside its card", () => {
  assert.match(css, /\.wordiply-demo \{ container-type: inline-size;[^}]*overflow: hidden;/);
  assert.match(css, /\.wordiply-demo > strong \{[^}]*clamp\(1\.15rem,9cqw,3rem\)[^}]*white-space: nowrap;/);
});
