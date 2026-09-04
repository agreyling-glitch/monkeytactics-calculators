import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/wordle-helper.html",import.meta.url),"utf8");
const script=fs.readFileSync(new URL("../assets/js/tools/wordle-helper.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../assets/css/tools/wordle-helper.css",import.meta.url),"utf8");
const crossword=fs.readFileSync(new URL("../tools/crossword-solver.html",import.meta.url),"utf8");
const unscrambler=fs.readFileSync(new URL("../tools/word-unscrambler.html",import.meta.url),"utf8");
const utilities=fs.readFileSync(new URL("../tools/utilities.html",import.meta.url),"utf8");

test("Wordle helper ships an accessible feedback workflow",()=>{
  assert.match(html,/Wordle Solver: Find Possible Words/);
  assert.match(html,/id="feedback-tiles"/);
  assert.match(html,/Duplicate-letter aware/);
  assert.match(script,/Engine\.wordleSearch/);
  assert.match(script,/states=\["neutral","present","correct","absent"\]/);
});

test("Wordle games are saved locally and can be restored",()=>{
  assert.match(html,/multi-board-word-solver-enhancements\.css/);
  assert.match(script,/monkeytactics\.wordle\.game-history\.v1/);
  assert.match(script,/sessionHistoryLimit=25/);
  assert.match(script,/summary\.textContent="Game history"/);
  assert.match(script,/function restoreSession\(entry\)/);
  assert.match(script,/hardMode:Boolean\(entry\.hardMode\)/);
  assert.match(script,/session-history-list/);
  assert.match(script,/Clear saved games/);
  assert.match(script,/search\(\);saveSession\(\);input\.focus/);
});

test("Wordle page publishes consistent SEO metadata and structured data",()=>{
  assert.match(html,/<meta name="description" content="Find possible Wordle answers/);
  assert.match(html,/<link rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/wordle-helper">/);
  assert.match(html,/<meta name="twitter:card" content="summary">/);
  const json=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const graph=JSON.parse(json)["@graph"];
  assert.deepEqual(graph.map(item=>item["@type"]),["BreadcrumbList","SoftwareApplication","FAQPage","ItemList"]);
  const faq=graph.find(item=>item["@type"]==="FAQPage");
  for(const item of faq.mainEntity){
    assert.match(html,new RegExp(`<summary>${item.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}<\\/summary>`));
    assert.match(html,new RegExp(item.acceptedAnswer.text.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  }
});

test("Wordle workspace aligns with the full-width page panels",()=>{
  assert.match(html,/\.wordle-page \.tool-widget:not\(\.is-focus-mode\)\{width:100%;max-width:none;box-sizing:border-box/);
});

test("candidate tiles have space beside the vertical scrollbar",()=>{
  assert.match(html,/\.wordle-page \.candidate-list\{padding-right:\.75rem;scrollbar-gutter:stable\}/);
});

test("explanatory content uses responsive cards and styled color keys",()=>{
  assert.match(html,/\.wordle-page \.content-grid\{display:grid;grid-template-columns:/);
  assert.match(html,/\.wordle-page \.wordle-explainer dt::before/);
  assert.match(html,/@media\(max-width:800px\)\{\.wordle-page \.content-grid\{grid-template-columns:1fr\}\}/);
});

test("related word tools and utilities link back to the Wordle solver",()=>{
  assert.match(crossword,/href="\/tools\/wordle-helper"/);
  assert.match(unscrambler,/href="\/tools\/wordle-helper"/);
  const json=utilities.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const items=JSON.parse(json)["@graph"][0].mainEntity.itemListElement;
  assert.ok(items.some(item=>item.name==="Wordle Solver & Helper"&&item.url.endsWith("/tools/wordle-helper")));
});

test("Wordle Learn More presents related blog guides before related tools",()=>{
  assert.match(html,/id="wordle-related-guides"/);
  assert.match(html,/How to Win at Wordle: Tips, Tricks &amp; Strategy/);
  assert.match(html,/Wordle vs\. Quordle Strategy: Why Four Boards Change Every Guess/);
  assert.ok(html.indexOf('id="wordle-related-guides"')<html.indexOf('<section class="related-tools">'));
  const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const guides=structured["@graph"].find(item=>item["@type"]==="ItemList");
  assert.equal(guides.numberOfItems,2);
  assert.match(css,/\.word-game-guide-grid/);
});
