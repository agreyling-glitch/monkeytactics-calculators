import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import zlib from "node:zlib";

const html=fs.readFileSync(new URL("../tools/quordle-solver.html",import.meta.url),"utf8");
const configScript=fs.readFileSync(new URL("../assets/js/tools/quordle-solver.js",import.meta.url),"utf8");
const script=configScript+fs.readFileSync(new URL("../assets/js/tools/multi-board-word-solver.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../assets/css/tools/quordle-solver.css",import.meta.url),"utf8");

test("Quordle targets solver intent with consistent metadata and structured data",()=>{
  assert.match(html,/<title>Quordle Solver \(4, 5 &amp; 6 Letters\) \| MonkeyTactics<\/title>/);
  assert.match(html,/<h1 id="tool-heading">Quordle Solver for 4, 5 &amp; 6-Letter Games<\/h1>/);
  assert.match(html,/"@type":"WebPage"/);
  assert.match(html,/"inLanguage":"en"/);
  assert.match(html,/Related Word-Game Solvers/);
  assert.match(html,/href="\/tools\/sedecordle-solver"/);
});

test("Learn More links Quordle guides before related solvers",()=>{
  assert.match(html,/id="quordle-related-guides"/);
  assert.match(html,/Wordle vs\. Quordle Strategy: Why Four Boards Change Every Guess/);
  assert.match(html,/How to Win at Wordle: Tips, Tricks &amp; Strategy/);
  assert.ok(html.indexOf('id="quordle-related-guides"')<html.indexOf('<section class="related-tools">'));
  assert.match(css,/\.word-game-guide-grid\{display:grid/);
});

test("Quordle solver models four boards and nine shared guesses",()=>{
  assert.equal((html.match(/class="board-tab"/g)||[]).length,4);
  assert.equal((html.match(/class="feedback-board"/g)||[]).length,4);
  assert.equal((html.match(/class="board-result"/g)||[]).length,4);
  assert.match(configScript,/"boardCount":4/);
  assert.match(configScript,/"guessLimit":9/);
});

test("Quordle supports four, five, and six letter games",()=>{
  assert.match(configScript,/"wordLengths":\[4,5,6\]/);
  assert.match(configScript,/"defaultWordLength":5/);
  assert.match(html,/id="word-length"/);
  assert.match(html,/<option value="4">4 letters<\/option>/);
  assert.match(html,/<option value="6">6 letters<\/option>/);
  assert.match(html,/multi-board-word-solver\.js\?v=20260904-wiktionary-4/);
  assert.match(html,/quordle-solver\.js\?v=20260902-word-length-2/);
});

test("Quordle treats unmarked tiles as gray and skips explicit gray while cycling",()=>{
  assert.match(configScript,/"implicitAbsent":true/);
  assert.match(script,/cycleStates=config\.implicitAbsent\?\["neutral","present","correct"\]:states/);
  assert.match(script,/state==="absent"\?"neutral":state/);
  assert.match(script,/feedback\[board\]\[i\]=nextFeedbackState\(feedback\[board\]\[i\]\)/);
  assert.match(script,/state==="neutral"\?"absent":state/);
  assert.match(html,/Unmarked tiles count as gray when you add the guess/);
  assert.match(html,/mark only the yellow and green tiles\. Leave gray tiles unmarked/);
});

test("Quordle defaults to broad coverage and offers combined fallback matches",()=>{
  assert.match(html,/name="dictionary" value="3" checked/);
  assert.doesNotMatch(html,/name="dictionary" value="1" checked/);
  assert.match(script,/function dictionaryWords\(dictionaryBit=selectedDictionary\(\)\)/);
  assert.match(script,/fallbackSets=combinedWords/);
  assert.match(script,/Use Both dictionaries/);
  assert.match(script,/dictionary:\[1,2,3\]\.includes\(entry\.dictionary\)\?entry\.dictionary:3/);
  const eWords=zlib.gunzipSync(fs.readFileSync(new URL("../assets/data/words/e.enable-v1.txt.gz",import.meta.url))).toString("utf8");
  assert.match(eWords,/(?:^|\n)eager\t1(?:\n|$)/);
});

test("Quordle solver filters every board independently",()=>{
  assert.match(script,/function candidatesFor\(board,sourceWords=allWords\)/);
  assert.match(script,/scoreGuess\(answer,guess\.word\).*guess\.feedback\[board\]/);
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

test("the shared layout control preserves full-width expanded boards",()=>{
  const sharedCss=fs.readFileSync("assets/css/tools/multi-board-word-solver-enhancements.css","utf8");
  assert.match(sharedCss,/\.multi-board-layout-root \.boards-results\.is-board-expanded\{grid-template-columns:minmax\(0,1fr\)\}/);
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
  assert.match(script,/slice\(0,probePoolLimit\)/);
  assert.doesNotMatch(script,/allWords\.filter\(word=>new Set\(word\)\.size>=4\)/);
});

test("candidate boards disclose when only the first 120 matches are shown",()=>{
  assert.match(script,/candidateDisplayLimit=120/);
  assert.match(script,/words\.slice\(0,candidateDisplayLimit\)/);
  assert.match(script,/Showing \$\{candidateDisplayLimit\.toLocaleString\(\)\} of \$\{words\.length\.toLocaleString\(\)\} matching words/);
  assert.match(script,/limit\.hidden=words\.length<=candidateDisplayLimit/);
  assert.match(css,/\.candidate-limit\{/);
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
  assert.match(script,/statesForBoards=boardIndices\.map/);
  assert.match(script,/button\.dataset\.letter=key\.toLowerCase\(\)/);
  assert.match(css,/linear-gradient\(var\(--board-1/);
  assert.match(css,/linear-gradient\(var\(--board-4/);
});

test("maximizing a board mirrors only that board across the keyboard",()=>{
  assert.match(script,/keyboard\.dataset\.focusedBoard=String\(index\)/);
  assert.match(script,/keyboard\.dataset\.focusedBoard=String\(index\);setBoard\(index,false\)/);
  assert.match(script,/delete keyboard\.dataset\.focusedBoard/);
  assert.match(script,/syncHistoryBoardHighlight\(\);updateKeyboard\(\)/);
  assert.match(script,/function setBoard\(index,focus=true\).*keyboard\.dataset\.focusedBoard=String\(index\)/);
  assert.match(script,/boardCards\.forEach\(\(card,i\)=>\{card\.hidden=i!==index/);
  for(let board=0;board<4;board++){
    assert.match(css,new RegExp(`\\.wordle-keyboard\\[data-focused-board="${board}"\\] \\.keyboard-key\\[data-letter\\]\\{background:var\\(--board-${board+1}`));
  }
});

test("the selected board receives Wordle-style keyboard color cycling",()=>{
  assert.match(script,/function cycleLetter\(letter\)/);
  assert.match(script,/const pattern=feedback\[activeBoard\]/);
  assert.match(script,/positions\.forEach\(i=>pattern\[i\]=next\)/);
  assert.match(script,/else cycleLetter\(key\)/);
  assert.match(script,/clean\(input\.value\)\.length===wordLength&&\/\^\[a-z\]\$\/i\.test\(event\.key\)&&cycleLetter\(event\.key\)/);
  assert.match(script,/document\.addEventListener\("keydown",event=>\{if\(event\.target===input\|\|event\.repeat\|\|clean\(input\.value\)\.length!==wordLength/);
  assert.match(script,/if\(cycleLetter\(event\.key\)\)event\.preventDefault\(\)/);
});

test("completed boards retain and display their solved word",()=>{
  assert.match(script,/manualCompletedWords=Array\(boardCount\)\.fill\(""\)/);
  assert.match(script,/reopenedBoards=Array\(boardCount\)\.fill\(false\)/);
  assert.match(script,/function automaticCompletedWord\(board\)/);
  assert.match(script,/function completedWord\(board\)/);
  assert.match(script,/const answer=completedWord\(board\),displayedState=answer\?"correct":feedback\[board\]\[i\]/);
  assert.match(script,/Solved · \$\{completedWord\(i\)\.toUpperCase\(\)\}/);
  assert.match(script,/Enter or select the completed \$\{wordLength\}-letter word before marking this board complete\./);
  assert.match(script,/function syncCompletedHistory\(\)/);
  assert.match(script,/function completedGuessIndex\(board,answer\)/);
  assert.match(script,/index<=solvedAt\?scoreGuess\(answer,guess\.word\)\[i\]:guess\.feedback\[board\]\[i\]/);
  assert.match(css,/\.board-complete\[aria-pressed="true"\]/);
});

test("the shared next guess uses a distinct gold highlight",()=>{
  assert.match(css,/\.next-guess-card\{[\s\S]*?rgba\(251,191,36,\.65\)/);
  assert.match(css,/\.next-guess-kicker\{[\s\S]*?color:#fcd34d/);
  assert.match(css,/\.next-guess-card strong\{color:#fbbf24/);
});

test("the shared next guess includes an educational per-board explanation",()=>{
  assert.doesNotMatch(html,/id="why-guess"|id="next-guess-reason"/);
  assert.doesNotMatch(script,/whyGuess|nextReason/);
  assert.doesNotMatch(css,/\.why-guess/);
  assert.match(script,/function guessDistribution\(word,words\)/);
  assert.match(script,/expectedRemaining:weightedRemaining\/words\.length/);
  assert.match(script,/className="next-guess-explanation"/);
  assert.match(script,/if\(!guesses\.length\)guessExplanation\.hidden=true/);
  assert.match(script,/feedback patterns/);
  assert.match(script,/average expected left/);
  assert.match(fs.readFileSync("assets/css/tools/multi-board-word-solver-enhancements.css","utf8"),/\.guess-explanation-track/);
});

test("every previous guess can be edited and replaced in place",()=>{
  assert.match(script,/let activeBoard=.*editingIndex=null/);
  assert.match(script,/edit=document\.createElement\("button"\)/);
  assert.doesNotMatch(script,/if\(index===guesses\.length-1\)/);
  assert.match(script,/guesses\[editingIndex\]=savedGuess/);
  assert.match(script,/Save changes to guess \$\{editingIndex\+1\}/);
  assert.match(script,/cancelEdit\.addEventListener\("click",cancelGuessEdit\)/);
  assert.match(css,/\.guess-history li\.is-editing/);
  assert.match(html,/Use <strong>Edit<\/strong> beside any earlier guess/);
});

test("duplicate shared guesses are rejected without blocking an unchanged edit",()=>{
  assert.match(script,/guesses\.findIndex\(\(guess,index\)=>guess\.word===word&&index!==editingIndex\)/);
  assert.match(script,/is already shared guess \$\{duplicateIndex\+1\}/);
  assert.match(script,/Edit that guess to correct its colors/);
});

test("the Shared guesses menu saves and restores a local snapshot",()=>{
  assert.match(script,/sharedGuessMenuSummary\.textContent="☰"/);
  assert.match(script,/historyWrap\.querySelector\("\.history-heading"\)\.append\(sharedGuessMenu\)/);
  assert.match(script,/historyWrap\.hidden=false/);
  assert.match(script,/setAttribute\("aria-label","Save shared guesses"\)/);
  assert.match(script,/shared-guesses\.v1/);
  assert.match(script,/function saveSharedGuessSnapshot\(\)/);
  assert.match(script,/function restoreSharedGuessSnapshot\(\)/);
  assert.match(script,/guesses=snapshot\.guesses/);
  assert.match(script,/guesses,manualCompletedWords,reopenedBoards/);
  assert.match(script,/manualCompletedWords=snapshot\.manualCompletedWords/);
  assert.match(script,/reopenedBoards=snapshot\.reopenedBoards/);
  assert.match(html,/Open the Shared guesses menu to save a reusable copy/);
});

test("the Shared guesses menu closes on Escape and outside clicks",()=>{
  assert.match(script,/\.shared-guess-menu\[open\]/);
  assert.match(script,/!openMenu\.contains\(event\.target\)/);
  assert.match(script,/event\.key!=="Escape"/);
  assert.match(script,/openMenu\.querySelector\("summary"\)\?\.focus\(\)/);
});

test("analysis updates automatically and shows graphical game progress",()=>{
  assert.match(html,/multi-board-analysis-progress\.css\?v=20260902-2/);
  assert.match(html,/multi-board-analysis-progress\.js\?v=20260902-4/);
  const progressScript=fs.readFileSync(new URL("../assets/js/tools/multi-board-analysis-progress.js",import.meta.url),"utf8");
  assert.match(progressScript,/makeMeter\("Shared guesses",guessLimit\)/);
  assert.match(script,/history\.dataset\.guessCount=String\(guesses\.length\)/);
  assert.match(progressScript,/Number\(history\.dataset\.guessCount\)\|\|0/);
  assert.match(progressScript,/makeMeter\("Boards solved",boardCount\)/);
  assert.match(progressScript,/Recalculating analysis…/);
  assert.match(progressScript,/Analysis updated/);
  assert.match(progressScript,/summary\.hidden=guesses>0/);
  assert.match(progressScript,/"on-track":"On track","at-risk":"At risk","impossible":"Impossible"/);
  assert.match(progressScript,/forcedAnswers\.size>remainingGuesses/);
  assert.match(progressScript,/input\[name='dictionary'\]/);
});

test("shared guess feedback separates and numbers each board",()=>{
  assert.match(html,/shared-guess-history-menu\.css\?v=20260902-5/);
  const historyCss=fs.readFileSync(new URL("../assets/css/tools/shared-guess-history-menu.css",import.meta.url),"utf8");
  assert.match(historyCss,/counter-reset: shared-board/);
  assert.match(historyCss,/counter-increment: shared-board/);
  assert.match(historyCss,/content: counter\(shared-board\)/);
  assert.match(historyCss,/grid-template-columns: repeat\(var\(--boards-per-row, 2\), max-content\)/);
});

test("boards with no matching words are highlighted in analysis and shared guesses",()=>{
  const historyCss=fs.readFileSync(new URL("../assets/css/tools/shared-guess-history-menu.css",import.meta.url),"utf8");
  assert.match(script,/function syncNoMatchBoards\(candidateSets=latestCandidateSets\)/);
  assert.match(script,/boardCards\[board\]\.classList\.toggle\("has-no-matches",noMatches\)/);
  assert.match(script,/\.history-board\[data-board-index=/);
  assert.match(script,/\.history-board-panel\[data-board-index=/);
  assert.match(script,/syncNoMatchBoards\(sets\)/);
  assert.match(historyCss,/\.board-result\.has-no-matches/);
  assert.match(historyCss,/\.history-board-panel\.has-no-matches/);
  assert.match(historyCss,/\.history-list-view \.history-board\.has-no-matches/);
});

test("shared guesses offer a persistent Quordly-style board view",()=>{
  const historyCss=fs.readFileSync(new URL("../assets/css/tools/shared-guess-history-menu.css",import.meta.url),"utf8");
  assert.match(script,/new Option\("List view","list"\),new Option\("Board view","board"\)/);
  assert.match(script,/shared-guess-view/);
  assert.match(script,/initialSharedGuessView=savedSharedGuessView==="list"\?"list":"board"/);
  assert.match(script,/localStorage\.setItem\(sharedGuessViewKey,sharedGuessView\)/);
  assert.match(script,/className="history-board-grid"/);
  assert.match(script,/boardIndices\.forEach\(board=>/);
  assert.match(script,/className="board-view-actions"/);
  assert.match(historyCss,/\.history-board-grid/);
  assert.match(historyCss,/repeat\(var\(--boards-per-row, 2\), minmax\(0, 1fr\)\)/);
});

test("the Shared guesses menu imports and exports complete JSON snapshots",()=>{
  assert.match(html,/shared-guess-json-transfer\.js\?v=20260902-2/);
  const transferScript=fs.readFileSync(new URL("../assets/js/tools/shared-guess-json-transfer.js",import.meta.url),"utf8");
  assert.match(transferScript,/Export shared guesses \(JSON\)/);
  assert.match(transferScript,/Import shared guesses \(JSON\)/);
  assert.match(transferScript,/application\/json,\.json/);
  assert.match(transferScript,/type:"MonkeyTactics shared guesses"/);
  assert.match(transferScript,/localStorage\.setItem\(storageKey,JSON\.stringify\(snapshot\)\)/);
  assert.match(transferScript,/restoreButton\.click\(\)/);
  assert.match(transferScript,/observer\.observe\(document\.documentElement/);
});

test("completing all four boards offers a full reset",()=>{
  assert.match(html,/<dialog class="completion-dialog" id="completion-dialog"/);
  assert.match(html,/<h2 id="completion-title">Congrats!<\/h2>/);
  assert.match(html,/id="keep-results"/);
  assert.match(html,/id="reset-all-boards"/);
  assert.match(script,/boardIndices\.map\(solved\)\.every\(Boolean\).*completionDialog\.showModal\(\)/);
  assert.match(script,/function resetAll\(\)/);
  assert.match(script,/resetAllBoards\.addEventListener\("click"/);
  assert.match(css,/\.completion-dialog::backdrop/);
});

test("Quordle page publishes metadata and matching FAQ content",()=>{
  assert.match(html,/<title>Quordle Solver \(4, 5 &amp; 6 Letters\) \| MonkeyTactics<\/title>/);
  assert.match(html,/meta name="description" content="Free Quordle solver for 4, 5, and 6-letter games/);
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

test("Quordle explains the shared workspace enhancements",()=>{
  assert.match(html,/Explore Candidates Your Way/);
  assert.match(html,/Alphabetical/);
  assert.match(html,/Information/);
  assert.match(html,/Letter pattern/);
  assert.match(html,/Game history/);
  assert.match(html,/Continue marking letters/);
});
