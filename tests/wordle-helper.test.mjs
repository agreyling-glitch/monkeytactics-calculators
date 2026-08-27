import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../tools/wordle-helper.html",import.meta.url),"utf8");
const script=fs.readFileSync(new URL("../assets/js/tools/wordle-helper.js",import.meta.url),"utf8");
const crossword=fs.readFileSync(new URL("../tools/crossword-solver.html",import.meta.url),"utf8");
const unscrambler=fs.readFileSync(new URL("../tools/word-unscrambler.html",import.meta.url),"utf8");
const utilities=fs.readFileSync(new URL("../tools/utilities.html",import.meta.url),"utf8");

test("Wordle helper ships an accessible feedback workflow",()=>{
  assert.match(html,/Wordle Solver: Find Possible Words/);
  assert.match(html,/id="feedback-tiles"/);
  assert.match(html,/Duplicate-letter aware/);
  assert.match(script,/Engine\.wordleSearch/);
  assert.match(script,/states=\["absent","present","correct"\]/);
});

test("Wordle page publishes consistent SEO metadata and structured data",()=>{
  assert.match(html,/<meta name="description" content="Find possible Wordle answers/);
  assert.match(html,/<link rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/wordle-helper">/);
  assert.match(html,/<meta name="twitter:card" content="summary">/);
  const json=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const graph=JSON.parse(json)["@graph"];
  assert.deepEqual(graph.map(item=>item["@type"]),["BreadcrumbList","SoftwareApplication","FAQPage"]);
  const faq=graph.find(item=>item["@type"]==="FAQPage");
  for(const item of faq.mainEntity){
    assert.match(html,new RegExp(`<summary>${item.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}<\\/summary>`));
    assert.match(html,new RegExp(item.acceptedAnswer.text.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  }
});

test("Wordle workspace aligns with the full-width page panels",()=>{
  assert.match(html,/\.wordle-page \.tool-widget\{width:100%;max-width:none;box-sizing:border-box/);
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
