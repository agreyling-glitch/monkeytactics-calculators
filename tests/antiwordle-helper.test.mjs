import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/antiwordle-solver.html",import.meta.url),"utf8");
const script=fs.readFileSync(new URL("../assets/js/tools/antiwordle-helper.js",import.meta.url),"utf8");
const manifest=JSON.parse(fs.readFileSync(new URL("../assets/wasm/menu/tools-manifest.json",import.meta.url),"utf8"));

test("Antiwordle solver publishes a distinct indexed tool page",()=>{
  assert.match(html,/<title>Antiwordle Solver – Find Safe Next Guesses/);
  assert.match(html,/rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/antiwordle-solver"/);
  assert.match(html,/id="antiwordle-keyboard"/);
  assert.match(html,/Safest next guess/);
  const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(structured["@graph"][1].name,"Antiwordle Solver");
});

test("Antiwordle suggestions enforce mandatory rules and rank for avoidance",()=>{
  assert.match(script,/states=\["neutral","present","correct","absent"\]/);
  assert.match(script,/function legalWord\(word\)/);
  assert.match(script,/rules\.maximum\[letter\]===0/);
  assert.match(script,/rules\.blocked\[index\]\.has/);
  assert.match(script,/rules\.locked\[index\]/);
  assert.match(script,/a\.information-b\.information/);
  assert.match(script,/avoidanceScore/);
});

test("feedback tiles cycle yellow, red, then one gray state",()=>{
  assert.match(script,/cycleStates=\["present","correct","absent"\]/);
  assert.match(script,/const nextFeedbackState=state=>cycleStates/);
  assert.doesNotMatch(script,/states\[\(states\.indexOf\(feedback/);
});

test("Antiwordle solver is registered in the shared tools manifest",()=>{
  const wordGames=manifest.find(group=>group.id==="word-games");
  const tool=wordGames.children.find(item=>item.id==="antiwordle-solver");
  assert.equal(tool.url,"/tools/antiwordle-solver");
  assert.equal(tool.capabilities.length,3);
});

test("Antiwordle FAQ keeps every answer visible without collapsible controls",()=>{
  assert.match(html,/class="antiwordle-faq-grid"/);
  assert.match(html,/<h3>Does the solver enforce Antiwordle rules\?<\/h3>/);
  assert.doesNotMatch(html,/<details>|<summary>/);
});

test("Antiwordle games are saved locally and can be restored",()=>{
  assert.match(html,/multi-board-word-solver-enhancements\.css/);
  assert.match(script,/monkeytactics\.antiwordle\.game-history\.v1/);
  assert.match(script,/sessionHistoryLimit=25/);
  assert.match(script,/summary\.textContent="Game history"/);
  assert.match(script,/function restoreSession\(entry\)/);
  assert.match(script,/dictionary:\[1,2,3\]\.includes/);
  assert.match(script,/session-history-list/);
  assert.match(script,/Clear saved games/);
  assert.match(script,/search\(\);saveSession\(\);input\.focus/);
});

test("an all-red Antiwordle row ends the game instead of recommending the answer again",()=>{
  assert.match(script,/const gameComplete=.*feedback\.every\(state=>state==="correct"\)/);
  assert.match(script,/heading\.textContent=completed\?"Game complete"/);
  assert.match(script,/is the confirmed hidden answer/);
  assert.match(script,/const ranked=completed\?\[\]/);
  assert.match(script,/add\.disabled=completed/);
});
