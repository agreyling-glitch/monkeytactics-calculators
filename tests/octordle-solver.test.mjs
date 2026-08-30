import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/octordle-solver.html",import.meta.url),"utf8");
const script=fs.readFileSync(new URL("../assets/js/tools/octordle-solver.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../assets/css/tools/octordle-solver.css",import.meta.url),"utf8");

test("Octordle solver models eight boards and thirteen shared guesses",()=>{
  assert.equal((html.match(/class="board-tab"/g)||[]).length,8);
  assert.equal((html.match(/class="feedback-board"/g)||[]).length,8);
  assert.equal((html.match(/class="board-result"/g)||[]).length,8);
  assert.equal((html.match(/data-board-entropy/g)||[]).length,8);
  assert.match(script,/Array\.from\(\{length:8\}/);
  assert.match(script,/guesses\.length>=13/);
  assert.match(script,/of 13 shared/);
});

test("Octordle filters and ranks all eight boards independently",()=>{
  assert.match(script,/\[0,1,2,3,4,5,6,7\]\.map\(candidatesFor\)/);
  assert.match(script,/function boardEntropy\(word,words\)/);
  assert.match(script,/function entropyScore\(word,candidateSets\)/);
  assert.match(script,/function renderSuggestion\(candidateSets\)/);
  assert.match(script,/Eight|eight/i);
});

test("Octordle keyboard mirrors all eight boards and supports focused views",()=>{
  assert.match(script,/const statesForBoards=\[0,1,2,3,4,5,6,7\]/);
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
  assert.match(script,/manualCompletedWords=Array\(8\)\.fill\(""\)/);
  assert.match(script,/reopenedBoards=Array\(8\)\.fill\(false\)/);
  assert.match(script,/function automaticCompletedWord\(board\)/);
  assert.match(script,/function completedWord\(board\)/);
  assert.match(script,/const answer=completedWord\(board\),displayedState=answer\?"correct":feedback\[board\]\[i\]/);
  assert.match(script,/Solved · \$\{completedWord\(i\)\.toUpperCase\(\)\}/);
  assert.match(script,/function syncCompletedHistory\(\)/);
  assert.match(script,/answer\?scoreGuess\(answer,guesses\[index\]\.word\)\[i\]/);
  assert.match(script,/Array\.from\(\{length:8\},\(_,board\)=>solved\(board\)\)\.every\(Boolean\).*completionDialog\.showModal\(\)/);
});

test("Octordle page publishes distinct metadata and helpful content",()=>{
  assert.match(html,/<title>Free Octordle Solver: Solve All 8 Boards \| MonkeyTactics<\/title>/);
  assert.match(html,/canonical" href="https:\/\/monkeytactics\.com\/tools\/octordle-solver"/);
  assert.match(html,/"name":"Octordle Solver"/);
  assert.match(html,/Thirteen shared guesses/);
  assert.match(html,/Octordle is a trademark of Merriam-Webster/);
  assert.match(html,/href="\/tools\/#word-games">Word Games<\/a>/);
});
