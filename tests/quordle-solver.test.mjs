import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/quordle-solver.html",import.meta.url),"utf8");
const script=fs.readFileSync(new URL("../assets/js/tools/quordle-solver.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../assets/css/tools/quordle-solver.css",import.meta.url),"utf8");

test("Quordle solver models four boards and nine shared guesses",()=>{
  assert.equal((html.match(/class="board-tab"/g)||[]).length,4);
  assert.equal((html.match(/class="feedback-board"/g)||[]).length,4);
  assert.equal((html.match(/class="board-result"/g)||[]).length,4);
  assert.match(script,/Array\.from\(\{length:4\}/);
  assert.match(script,/guesses\.length>=9/);
});

test("Quordle solver filters every board independently",()=>{
  assert.match(script,/function candidatesFor\(board\)/);
  assert.match(script,/Engine\.wordleSearch\(clues,selectedDictionary\(\)\)/);
  assert.match(script,/function entropyScore\(word,candidateSets\)/);
  assert.match(script,/scoreGuess\(answer,word\)/);
});

test("each board visualizes its entropy for the recommended shared guess",()=>{
  assert.equal((html.match(/data-board-entropy/g)||[]).length,4);
  assert.equal((html.match(/class="entropy-track"/g)||[]).length,4);
  assert.match(script,/function boardEntropy\(word,words\)/);
  assert.match(script,/function updateBoardEntropies\(word,candidateSets\)/);
  assert.match(script,/bits\/8\*100/);
  assert.match(css,/\.board-entropy\{display:grid/);
  assert.match(css,/\.entropy-fill\{display:block;width:0/);
});

test("a result board can expand while the other three are hidden",()=>{
  assert.equal((html.match(/class="board-result-toggle"/g)||[]).length,4);
  assert.match(script,/function setExpandedBoard\(index\)/);
  assert.match(script,/card\.hidden=!collapse&&i!==index/);
  assert.match(script,/aria-expanded/);
  assert.match(css,/\.boards-results\.is-board-expanded\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css,/\.boards-results\.is-board-expanded \.candidate-list\{max-height:min\(62vh,680px\)\}/);
});

test("the expanded board is highlighted in every shared guess",()=>{
  assert.match(script,/group\.dataset\.boardIndex=String\(board\)/);
  assert.match(script,/function syncHistoryBoardHighlight\(\)/);
  assert.match(script,/group\.dataset\.boardIndex===expanded/);
  assert.match(script,/syncHistoryBoardHighlight\(\)/);
  assert.match(css,/\.history-board\.is-highlighted-board\{[\s\S]*?box-shadow:0 0 0 2px #38bdf8/);
});

test("Quordle solver avoids exhaustive work before clues and bounds probe ranking",()=>{
  assert.match(script,/if\(!guesses\.length\)/);
  assert.match(script,/slice\(0,240\)/);
  assert.doesNotMatch(script,/allWords\.filter\(word=>new Set\(word\)\.size>=4\)/);
});

test("Quordle results override the shared hidden calculator panel rule",()=>{
  assert.match(css,/\.quordle-page \.results-panel\{display:block/);
  assert.doesNotMatch(css,/\.quordle-page \.tool-widget\{position:relative\}/);
});

test("Quordle workspace stacks panels and uses branded scrollbars",()=>{
  assert.match(css,/\.quordle-layout\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(css,/\.feedback-grid\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(css,/scrollbar-color:#48df82 #0a1710/);
  assert.match(css,/\.candidate-list::-webkit-scrollbar-thumb/);
  assert.match(script,/tileGroups=\[\.\.\.document\.querySelectorAll\("\.feedback-board"\)\]/);
  assert.match(css,/button\.neutral\{border-color:#4b5563;background:#111827/);
  assert.match(css,/button\.present\{background:var\(--tile-present\)/);
  assert.match(css,/button\.correct\{background:var\(--tile-correct\)/);
  assert.match(css,/@media\(max-width:430px\)\{[\s\S]*?\.feedback-grid\{grid-template-columns:1fr\}/);
  assert.match(css,/@media\(max-width:430px\)\{[\s\S]*?\.keyboard-key\{min-width:24px/);
});

test("keyboard mirrors four-board feedback with colored quadrants",()=>{
  assert.match(script,/function keyboardState\(board,letter\)/);
  assert.match(script,/statesForBoards=\[0,1,2,3\]/);
  assert.match(script,/button\.dataset\.letter=key\.toLowerCase\(\)/);
  assert.match(css,/linear-gradient\(var\(--board-1/);
  assert.match(css,/linear-gradient\(var\(--board-4/);
});

test("maximizing a board mirrors only that board across the keyboard",()=>{
  assert.match(script,/keyboard\.dataset\.focusedBoard=String\(index\)/);
  assert.match(script,/keyboard\.dataset\.focusedBoard=String\(index\);setBoard\(index,false\)/);
  assert.match(script,/delete keyboard\.dataset\.focusedBoard/);
  assert.match(script,/syncHistoryBoardHighlight\(\);updateKeyboard\(\)/);
  for(let board=0;board<4;board++){
    assert.match(css,new RegExp(`\\.wordle-keyboard\\[data-focused-board="${board}"\\] \\.keyboard-key\\[data-letter\\]\\{background:var\\(--board-${board+1}`));
  }
});

test("the selected board receives Wordle-style keyboard color cycling",()=>{
  assert.match(script,/function cycleLetter\(letter\)/);
  assert.match(script,/const pattern=feedback\[activeBoard\]/);
  assert.match(script,/positions\.forEach\(i=>pattern\[i\]=next\)/);
  assert.match(script,/else cycleLetter\(key\)/);
  assert.match(script,/clean\(input\.value\)\.length===5&&\/\^\[a-z\]\$\/i\.test\(event\.key\)&&cycleLetter\(event\.key\)/);
  assert.match(script,/document\.addEventListener\("keydown",event=>\{if\(event\.target===input\|\|event\.repeat\|\|clean\(input\.value\)\.length!==5/);
  assert.match(script,/if\(cycleLetter\(event\.key\)\)event\.preventDefault\(\)/);
});

test("boards can be completed and reopened without five green tiles",()=>{
  assert.match(script,/completedBoards=Array\(4\)\.fill\(false\)/);
  assert.match(script,/completedBoards\[board\]\|\|guesses\.some/);
  assert.match(script,/completedBoards\[board\]=!completedBoards\[board\]/);
  assert.match(script,/completeButtons\[i\]\.textContent=completedBoards\[i\]\?"Reopen board":"Mark complete"/);
  assert.match(script,/const displayedState=completedBoards\[board\]\?"correct":feedback\[board\]\[i\]/);
  assert.match(css,/\.board-complete\[aria-pressed="true"\]/);
});

test("the shared next guess uses a distinct gold highlight",()=>{
  assert.match(css,/\.next-guess-card\{[\s\S]*?rgba\(251,191,36,\.65\)/);
  assert.match(css,/\.next-guess-kicker\{[\s\S]*?color:#fcd34d/);
  assert.match(css,/\.next-guess-card strong\{color:#fbbf24/);
});

test("the shared next guess explains its recommendation in a tooltip",()=>{
  assert.match(html,/class="why-guess" id="why-guess"/);
  assert.match(html,/aria-describedby="next-guess-metrics next-guess-reason"/);
  assert.match(script,/whyGuess\.dataset\.tooltip=reason/);
  assert.match(script,/nextReason\.textContent=reason/);
  assert.match(script,/splitting the remaining candidates as evenly as possible/);
  assert.match(css,/\.why-guess::after\{content:attr\(data-tooltip\)/);
  assert.match(css,/\.next-guess-card:focus-visible \.why-guess::after/);
});

test("completing all four boards offers a full reset",()=>{
  assert.match(html,/<dialog class="completion-dialog" id="completion-dialog"/);
  assert.match(html,/<h2 id="completion-title">Congrats!<\/h2>/);
  assert.match(html,/id="keep-results"/);
  assert.match(html,/id="reset-all-boards"/);
  assert.match(script,/completedBoards\.every\(Boolean\).*completionDialog\.showModal\(\)/);
  assert.match(script,/function resetAll\(\)/);
  assert.match(script,/resetAllBoards\.addEventListener\("click"/);
  assert.match(css,/\.completion-dialog::backdrop/);
});

test("Quordle page publishes metadata and matching FAQ content",()=>{
  assert.match(html,/<title>Free Quordle Solver: Solve All 4 Boards \| MonkeyTactics<\/title>/);
  assert.match(html,/meta name="description" content="Solve all four Quordle boards with color feedback, candidate lists, per-board entropy/);
  assert.match(html,/canonical" href="https:\/\/monkeytactics\.com\/tools\/quordle-solver"/);
  const data=JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
  const app=data["@graph"].find(item=>item["@type"]==="SoftwareApplication");
  const faq=data["@graph"].find(item=>item["@type"]==="FAQPage");
  assert.ok(app.featureList.includes("Per-board entropy visualization"));
  assert.ok(app.featureList.includes("Expandable candidate boards"));
  for(const item of faq.mainEntity){
    assert.ok(html.includes(`<summary>${item.name}</summary>`));
    assert.ok(html.includes(item.acceptedAnswer.text));
  }
  assert.match(html,/<h2>How Entropy Improves a Quordle Guess<\/h2>/);
  assert.match(html,/<h2>Focus on One Quordle Board<\/h2>/);
  assert.match(html,/<h2>Choose the Right Dictionary<\/h2>/);
});
