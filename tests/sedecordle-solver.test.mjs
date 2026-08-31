import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/sedecordle-solver.html",import.meta.url),"utf8");
const config=fs.readFileSync(new URL("../assets/js/tools/sedecordle-solver.js",import.meta.url),"utf8");
const engine=fs.readFileSync(new URL("../assets/js/tools/multi-board-word-solver.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../assets/css/tools/sedecordle-solver.css",import.meta.url),"utf8");

test("Sedecordle models sixteen boards and twenty-one shared guesses",()=>{
  assert.equal((html.match(/class="board-tab"/g)||[]).length,16);
  assert.equal((html.match(/class="feedback-board"/g)||[]).length,16);
  assert.equal((html.match(/class="board-result"/g)||[]).length,16);
  assert.equal((html.match(/data-board-entropy/g)||[]).length,16);
  assert.match(config,/"boardCount":16/);
  assert.match(config,/"guessLimit":21/);
  assert.match(config,/"probePoolLimit":120/);
});

test("all variants use the configurable multi-board engine",()=>{
  assert.match(engine,/function initMultiBoardWordSolver\(config\)/);
  assert.match(engine,/boardIndices\.map\(candidatesFor\)/);
  assert.match(engine,/guesses\.length>=guessLimit/);
  assert.match(engine,/Array\(boardCount\)\.fill/);
  assert.match(engine,/function groupCandidateSets/);
  assert.match(html,/multi-board-word-solver\.js/);
});

test("Sedecordle supports sixteen-way keyboard feedback and focused boards",()=>{
  assert.match(css,/var\(--board-16/);
  assert.match(css,/data-focused-board="15"/);
  assert.match(css,/\.sedecordle-page/);
});

test("one layout control changes both sixteen-board grids",()=>{
  assert.match(html,/id="boards-per-row"/);
  assert.match(html,/for="boards-per-row">Board Layout<\/label>/);
  assert.match(html,/type="range" min="1" max="4" step="1" value="4"/);
  assert.ok(html.indexOf('id="boards-per-row"')>html.indexOf('id="guess-input"'));
  assert.ok(html.indexOf('id="boards-per-row"')<html.indexOf('class="feedback-grid"'));
  assert.match(engine,/monkeytactics\.\$\{gameName\.toLowerCase\(\)\}\.boards-per-row/);
  assert.match(engine,/allowed=\[1,2,3,4\]/);
  assert.match(engine,/addEventListener\("input",saveBoardLayout\)/);
  assert.match(engine,/--boards-per-row/);
  assert.match(css,/\.feedback-grid\{display:grid;grid-template-columns:repeat\(var\(--boards-per-row,4\)/);
  assert.match(css,/\.boards-results\{display:grid;grid-template-columns:repeat\(var\(--boards-per-row,4\)/);
  assert.match(css,/\.sedecordle-page \.guess-input\{border-color:#d6aa3e/);
  assert.match(css,/\.board-layout-control\{[^}]*padding:\.2rem \.1rem/);
});

test("Sedecordle publishes distinct metadata",()=>{
  assert.match(html,/<title>Free Sedecordle Solver: Solve All 16 Boards \| MonkeyTactics<\/title>/);
  assert.match(html,/canonical" href="https:\/\/monkeytactics\.com\/tools\/sedecordle-solver"/);
  assert.match(html,/"name":"Sedecordle Solver"/);
  assert.match(html,/Twenty-one shared guesses/);
});

test("Sedecordle hero previews all sixteen CRANE boards",()=>{
  const hero=html.match(/<div class="hero-quad">([\s\S]*?)<\/div><small>/)?.[1]||"";
  assert.equal((hero.match(/<span>/g)||[]).length,16);
  assert.equal((hero.match(/>C<\/b>/g)||[]).length,16);
  assert.match(css,/\.board-layout-control\{[^}]*justify-content:start/);
  assert.match(css,/\.board-layout-control output\{[^}]*text-align:left/);
  assert.match(css,/\.sedecordle-page \.premium-hero-grid\{align-items:start\}/);
  assert.match(css,/\.sedecordle-page \.premium-hero-grid>div:first-child\{padding-top:1\.35rem\}/);
});

test("maximized boards can group candidates by information or letter structure",()=>{
  assert.match(engine,/candidate-group-tabs/);
  assert.match(engine,/role","tablist/);
  assert.match(engine,/role","tab/);
  assert.match(engine,/aria-selected/);
  assert.match(engine,/High information/);
  assert.match(engine,/ranked\.slice\(0,20\)/);
  assert.match(engine,/ranked\.slice\(20,60\)/);
  assert.match(engine,/ranked\.slice\(60,120\)/);
  assert.match(engine,/function structurePattern/);
  assert.match(engine,/"aeiou"\.includes\(letter\)\?"V":"C"/);
  assert.match(engine,/Math\.min\(patternWords\.length,20,candidateDisplayLimit-shown\)/);
  assert.match(css,/\.boards-results\.is-board-expanded \.candidate-group-control\{display:block\}/);
  assert.match(css,/\.candidate-group-tabs button\[aria-selected="true"\]/);
});

test("Sedecordle stores one restorable history item per game session",()=>{
  assert.match(config,/"historyEnabled":true/);
  assert.match(engine,/game-history\.v1/);
  assert.match(engine,/function sessionSnapshot/);
  assert.match(engine,/guesses,manualCompletedWords,reopenedBoards/);
  assert.match(engine,/function restoreSession/);
  assert.match(engine,/Game history/);
  assert.match(engine,/\(layoutControl\|\|historyWrap\)\.after\(details\)/);
  assert.match(engine,/sessionHistoryLimit=25/);
  assert.match(css,/\.session-history-list\{/);
});

test("maximized candidate words and entropy scores align in a grid",()=>{
  assert.match(css,/\.boards-results\.is-board-expanded \.candidate-list\{display:grid/);
  assert.match(css,/grid-template-columns:repeat\(auto-fill,minmax\(155px,1fr\)\)/);
  assert.match(css,/\.candidate-group-heading\{grid-column:1\/-1/);
  assert.match(css,/grid-template-columns:max-content max-content;justify-content:start/);
  assert.match(css,/\.candidate-list li small\{justify-self:start;width:auto;white-space:nowrap;text-align:left\}/);
});

test("maximized alphabetical candidates can page through every match",()=>{
  assert.match(engine,/className="candidate-pagination"/);
  assert.match(engine,/previous\.textContent="Previous"/);
  assert.match(engine,/next\.textContent="Next"/);
  assert.match(engine,/Math\.ceil\(words\.length\/candidateDisplayLimit\)/);
  assert.match(engine,/words\.slice\(start,end\)/);
  assert.match(engine,/Page \$\{control\.page\+1\} of \$\{pageCount\}/);
  assert.match(css,/\.boards-results\.is-board-expanded \.candidate-pagination:not\(\[hidden\]\)\{display:flex\}/);
});

test("adding a guess focuses the best shared next guess",()=>{
  assert.match(engine,/\(nextCard\.hidden\?input:nextCard\)\.focus\(\)/);
  assert.match(engine,/if\(!completionDialog\.open&&!singletonDialog\?\.open\)/);
});

test("one remaining candidate per unfinished board opens a dismissible answer modal",()=>{
  assert.match(config,/"singletonCandidatesModal":true/);
  assert.match(engine,/One candidate per board/);
  assert.match(engine,/function showSingletonCandidates/);
  assert.match(engine,/entries\.length!==unfinished\.length/);
  assert.match(engine,/singletonDialog\.showModal\(\)/);
  assert.match(engine,/Continue marking letters/);
  assert.match(engine,/singletonDialog\.addEventListener\("cancel"/);
  assert.match(engine,/dismissedSingletonSignature=shownSingletonSignature/);
  assert.match(css,/\.singleton-candidate-list\{display:grid/);
});

test("the restored game history item receives an accessible gold selection",()=>{
  assert.match(engine,/classList\.toggle\("is-selected",entry\.id===currentSessionId\)/);
  assert.match(engine,/aria-pressed/);
  assert.match(engine,/renderHistory\(\);renderSessionHistory\(\)/);
  assert.match(css,/\.session-history-list li\.is-selected\{border-color:#d6aa3e/);
});

test("Sedecordle explains the shared workspace enhancements",()=>{
  assert.match(html,/Explore Candidates Your Way/);
  assert.match(html,/Board Layout/);
  assert.match(html,/Game history/);
  assert.match(html,/Continue marking letters/);
});
