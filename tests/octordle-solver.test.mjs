import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/octordle-solver.html",import.meta.url),"utf8");
const configScript=fs.readFileSync(new URL("../assets/js/tools/octordle-solver.js",import.meta.url),"utf8");
const script=configScript+fs.readFileSync(new URL("../assets/js/tools/multi-board-word-solver.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../assets/css/tools/octordle-solver.css",import.meta.url),"utf8");

test("Octordle solver models eight boards and thirteen shared guesses",()=>{
  assert.equal((html.match(/class="board-tab"/g)||[]).length,8);
  assert.equal((html.match(/class="feedback-board"/g)||[]).length,8);
  assert.equal((html.match(/class="board-result"/g)||[]).length,8);
  assert.equal((html.match(/data-board-entropy/g)||[]).length,8);
  assert.match(configScript,/"boardCount":8/);
  assert.match(configScript,/"guessLimit":13/);
});

test("Octordle filters and ranks all eight boards independently",()=>{
  assert.match(script,/boardIndices\.map\(candidatesFor\)/);
  assert.match(script,/function boardEntropy\(word,words\)/);
  assert.match(script,/function entropyScore\(word,candidateSets\)/);
  assert.match(script,/function renderSuggestion\(candidateSets\)/);
  assert.match(script,/Eight|eight/i);
});

test("Octordle keyboard mirrors all eight boards and supports focused views",()=>{
  assert.match(script,/const statesForBoards=boardIndices\.map/);
  for(let board=1;board<=8;board++)assert.match(css,new RegExp(`var\\(--board-${board}`));
  for(let board=0;board<8;board++)assert.match(css,new RegExp(`data-focused-board="${board}"`));
  assert.match(css,/conic-gradient\(/);
});

test("Octordle candidate lists disclose the 120-word display limit",()=>{
  assert.match(script,/candidateDisplayLimit=120/);
  assert.match(script,/Showing \$\{candidateDisplayLimit\.toLocaleString\(\)\} of/);
  assert.match(css,/\.candidate-limit\{/);
});

test("Octordle completed boards retain and display their solved word",()=>{
  assert.match(script,/manualCompletedWords=Array\(boardCount\)\.fill\(""\)/);
  assert.match(script,/reopenedBoards=Array\(boardCount\)\.fill\(false\)/);
  assert.match(script,/function automaticCompletedWord\(board\)/);
  assert.match(script,/function completedWord\(board\)/);
  assert.match(script,/const answer=completedWord\(board\),displayedState=answer\?"correct":feedback\[board\]\[i\]/);
  assert.match(script,/Solved · \$\{completedWord\(i\)\.toUpperCase\(\)\}/);
  assert.match(script,/function syncCompletedHistory\(\)/);
  assert.match(script,/answer\?scoreGuess\(answer,guesses\[index\]\.word\)\[i\]/);
  assert.match(script,/boardIndices\.map\(solved\)\.every\(Boolean\).*completionDialog\.showModal\(\)/);
});

test("Octordle page publishes distinct metadata and helpful content",()=>{
  assert.match(html,/<title>Free Octordle Solver: Solve All 8 Boards \| MonkeyTactics<\/title>/);
  assert.match(html,/canonical" href="https:\/\/monkeytactics\.com\/tools\/octordle-solver"/);
  assert.match(html,/"name":"Octordle Solver"/);
  assert.match(html,/Thirteen shared guesses/);
  assert.match(html,/Octordle is a trademark of Merriam-Webster/);
  assert.match(html,/href="\/tools\/#word-games">Word Games<\/a>/);
});

test("Octordle explains the shared workspace enhancements",()=>{
  assert.match(html,/Explore Candidates Your Way/);
  assert.match(html,/Board Layout/);
  assert.match(html,/Game history/);
  assert.match(html,/Continue marking letters/);
});
