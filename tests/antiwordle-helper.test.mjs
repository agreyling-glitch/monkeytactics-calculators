import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/antiwordle-helper.html",import.meta.url),"utf8");
const script=fs.readFileSync(new URL("../assets/js/tools/antiwordle-helper.js",import.meta.url),"utf8");
const manifest=JSON.parse(fs.readFileSync(new URL("../assets/wasm/menu/tools-manifest.json",import.meta.url),"utf8"));

test("Antiwordle helper publishes a distinct indexed tool page",()=>{
  assert.match(html,/<title>Antiwordle Helper: Find Safe Next Guesses/);
  assert.match(html,/rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/antiwordle-helper"/);
  assert.match(html,/id="antiwordle-keyboard"/);
  assert.match(html,/Safest next guess/);
  const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(structured["@graph"][1].name,"Antiwordle Helper");
});

test("Antiwordle suggestions enforce mandatory rules and rank for avoidance",()=>{
  assert.match(script,/function legalWord\(word\)/);
  assert.match(script,/rules\.maximum\[letter\]===0/);
  assert.match(script,/rules\.blocked\[index\]\.has/);
  assert.match(script,/rules\.locked\[index\]/);
  assert.match(script,/a\.information-b\.information/);
  assert.match(script,/avoidanceScore/);
});

test("Antiwordle helper is registered in the shared tools manifest",()=>{
  const wordGames=manifest.find(group=>group.id==="word-games");
  const tool=wordGames.children.find(item=>item.id==="antiwordle-helper");
  assert.equal(tool.url,"/tools/antiwordle-helper");
  assert.equal(tool.capabilities.length,3);
});

test("Antiwordle FAQ keeps every answer visible without collapsible controls",()=>{
  assert.match(html,/class="antiwordle-faq-grid"/);
  assert.match(html,/<h3>Does the helper enforce Antiwordle rules\?<\/h3>/);
  assert.doesNotMatch(html,/<details>|<summary>/);
});
