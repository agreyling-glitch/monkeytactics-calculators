import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chartScript = read("assets/js/tools/word-game-search-progress.js");
const chartCss = read("assets/css/tools/word-game-search-progress.css");

test("Wordle and Antiwordle publish exact candidate progression", () => {
  const wordle = read("assets/js/tools/wordle-helper.js");
  const antiwordle = read("assets/js/tools/antiwordle-helper.js");
  assert.match(wordle, /kind:"wordle",guessCount:guesses\.length,initialCount:Engine\.wordleSearch/);
  assert.match(wordle, /candidateCount:words\.length/);
  assert.match(antiwordle, /kind:"antiwordle",guessCount:guesses\.length,initialCount:words\.length,candidateCount:answers\.length/);
  assert.match(chartScript, /points\.length < 2 && chart\.kind !== "antiwordle"/);
  assert.match(chartScript, /Start with.*Add feedback to chart how much uncertainty/);
  assert.match(chartScript, /chart\.detail\?\.completed/);
  const wordleHtml = read("tools/wordle-helper.html");
  const antiwordleHtml = read("tools/antiwordle-solver.html");
  assert.match(wordleHtml, /word-game-search-progress\.css\?v=20260904-1/);
  assert.match(wordleHtml, /word-game-search-progress\.js\?v=20260904-2/);
  assert.match(antiwordleHtml, /word-game-search-progress\.css\?v=20260904-1/);
  assert.match(antiwordleHtml, /word-game-search-progress\.js\?v=20260904-4/);
});

test("multi-board solvers publish readable aggregate progression", () => {
  const engine = read("assets/js/tools/multi-board-word-solver.js");
  assert.match(engine, /kind:"multi",guessCount:guesses\.length,initialCount:dictionaryWords\(dictionaryBit\)\.length,counts:sets\.map/);
  assert.match(engine, /solved:boardIndices\.map\(solved\)/);
  for (const page of ["quordle-solver.html", "octordle-solver.html", "sedecordle-solver.html"]) {
    const html = read(`tools/${page}`);
    assert.match(html, /multi-board-word-solver\.js\?v=20260904-wiktionary-4/);
    assert.match(html, /word-game-search-progress\.css\?v=20260904-1/);
    assert.match(html, /word-game-search-progress\.js\?v=20260904-2/);
  }
  assert.match(chartScript, /filter\(\(_, index\) => !solved\[index\]\)/);
  assert.match(chartScript, /total: active\.reduce/);
  assert.match(chartScript, /median:/);
  assert.match(chartScript, /hardest:/);
});

test("progress charts redraw accessibly when guesses change", () => {
  assert.match(chartScript, /points\.length = Math\.max\(1, detail\.guessCount \+ 1\)/);
  assert.match(chartScript, /viewBox: "0 0 420 190"/);
  assert.match(chartScript, /role: "img"/);
  assert.match(chartScript, /data\.replaceChildren/);
  assert.match(chartCss, /\.search-progress-chart svg\{[^}]*width:100%/);
  assert.match(chartCss, /@media\(max-width:520px\)/);
});
