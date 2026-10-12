"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const Comparison = require("../assets/js/tools/word-unscrambler/pick-comparison.js");

class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.dataset = {};
    this.className = "";
    this.open = false;
  }
  get isConnected() { return this === this.ownerDocument.body || Boolean(this.parent?.isConnected); }
  set textContent(value) { this.children.forEach((child) => { child.parent = null; }); this.children = []; this.text = String(value); }
  get textContent() { return (this.text || "") + this.children.map((child) => child.textContent).join(""); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  prepend(...nodes) { for (const node of nodes) node.parent = this; this.children.unshift(...nodes); }
  replaceChildren(...nodes) { this.textContent = ""; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = value; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatch(type, properties = {}) { for (const handler of this.listeners[type] || []) handler({ target: this, ...properties }); }
  focus() { this.ownerDocument.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatch("close"); }
  querySelector(selector) { return all(this).find((node) => selector[0] === "." ? node.className.split(" ").includes(selector.slice(1)) : node.tagName.toLowerCase() === selector) || null; }
}

function all(node) { return node.children.flatMap((child) => [child, ...all(child)]); }
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function fixture(overrides = {}, initialEntries) {
  const document = { createElement(tag) { return new Element(tag, this); } };
  document.body = document.createElement("body");
  const panel = document.createElement("details");
  const content = document.createElement("div");
  content.className = "pick-list-panel-content";
  const list = document.createElement("div");
  content.append(list);
  panel.append(content);
  document.body.append(panel);
  let entries = initialEntries || ["CAT", "ACT", "AT", "TA", "TAC"].map((word, index) => ({
    id: String(index), word, score: 5, rack: "CAT?", boardPattern: "", scoreKind: "rack"
  }));
  const calls = { hooks: [], memberships: [], loads: [] };
  const config = {
    panel,
    getEntries: () => entries,
    analyzePlay: () => ({ valid: true, score: 5, tilesUsed: 3, leave: "?", blankPositions: [], boardPositions: [] }),
    getLeaveQuality: () => 74,
    getDictionary: () => ({ bit: 2, label: "Expanded" }),
    loadAll: async (bit) => { calls.loads.push(bit); },
    findHooks: async (word, bit) => { calls.hooks.push({ word, bit }); return { front: ["s"], back: ["s"] }; },
    loadMembership: async (word) => { calls.memberships.push(word); return word === "cat" ? 3 : 1; },
    scoringLabel: "Scrabble",
    ...overrides
  };
  const controller = Comparison.create(config);
  function render() {
    list.replaceChildren(...entries.map(controller.createSelectionControl));
    controller.sync();
  }
  render();
  const toolbar = panel.querySelector(".pick-comparison-toolbar");
  const compare = toolbar.children[0];
  const clear = toolbar.children[1];
  const status = toolbar.children[2];
  const dialog = document.body.querySelector("dialog");
  return {
    controller, calls, panel, document, compare, clear, status, dialog, list, render,
    setEntries(next) { entries = next; render(); },
    entries: () => entries,
    input(id) { return all(list).find((node) => node.tagName === "INPUT" && node.dataset.pickId === id); },
    select(id, checked = true) { const input = this.input(id); input.checked = checked; input.dispatch("change"); },
    open() { compare.focus(); compare.dispatch("click"); },
    row(label) { return all(dialog).find((node) => node.tagName === "TR" && node.children[0].textContent === label); }
  };
}

test("comparison enforces 2–4 selections without loading data, and survives rerendering", () => {
  const f = fixture();
  assert.equal(f.compare.disabled, true);
  f.select("0");
  assert.equal(f.compare.disabled, true);
  f.open();
  assert.equal(f.dialog.open, false);
  f.select("1");
  assert.equal(f.compare.disabled, false);
  f.select("2");
  f.select("3");
  assert.equal(f.input("4").disabled, true);
  f.select("4"); // Also defend the invariant if a change is dispatched directly.
  assert.equal(f.input("4").checked, false);
  assert.match(f.status.textContent, /4 of 4 selected.*Maximum/);
  f.render();
  assert.equal(f.input("0").checked, true);
  f.select("1", false);
  assert.equal(f.input("4").disabled, false);
  f.setEntries(f.entries().filter((entry) => entry.id !== "0"));
  assert.match(f.status.textContent, /^2 of 4 selected/);
  f.clear.dispatch("click");
  assert.match(f.status.textContent, /^0 of 4 selected/);
  assert.deepEqual(f.calls.loads, []);
  assert.deepEqual(f.calls.memberships, []);
});

test("saved board letters and blanks drive comparison, while legacy picks show unavailable rack context", async () => {
  const analyzed = [];
  const f = fixture({
    analyzePlay(word, rack, options) {
      analyzed.push({ word, rack, options });
      return word === "cat"
        ? { valid: true, score: 4, tilesUsed: 2, leave: "?", blankPositions: [2], boardPositions: [1] }
        : { valid: true, score: 10, tilesUsed: 3, leave: "", blankPositions: [], boardPositions: [] };
    },
    getLeaveQuality(leave) { assert.deepEqual(leave, ["?"]); return 74; }
  }, [
    { id: "0", word: "CAT", score: 4, rack: "C??", boardPattern: "?A?", scoreKind: "rack" },
    { id: "1", word: "TAX", score: 10, rack: "TAX", boardPattern: "", scoreKind: "rack" },
    { id: "2", word: "CATS", score: 6 }
  ]);
  f.select("0"); f.select("1"); f.select("2"); f.open();
  assert.match(f.dialog.textContent, /Each column uses its own saved search context/);
  assert.deepEqual(analyzed, [
    { word: "cat", rack: "c??", options: { boardPattern: "?a?" } },
    { word: "tax", rack: "tax", options: { boardPattern: "" } }
  ]);
  assert.equal(f.row("Tiles used").children[1].textContent, "2 tiles · C? (1 blank)");
  assert.equal(f.row("Remaining rack").children[1].textContent, "?");
  assert.equal(f.row("Remaining rack").children[2].textContent, "Empty — all rack tiles used");
  assert.equal(f.row("Leave estimate").children[1].textContent, "74/100 · Good");
  assert.equal(f.row("Leave estimate").children[2].textContent, "Rack cleared");
  assert.match(f.row("Leave estimate").children[3].textContent, /Unavailable/);
  assert.match(f.row("Tile score").children[3].textContent, /6 pts.*rack context unavailable/);
  assert.equal(f.dialog.attributes["aria-labelledby"], f.dialog.children[0].children[0].id);
  assert.equal(f.document.activeElement.attributes["aria-label"], "Close word comparison");
  await flush();
  assert.deepEqual(f.calls.loads, [2]);
  assert.deepEqual(f.calls.hooks, [{ word: "cat", bit: 2 }, { word: "tax", bit: 2 }, { word: "cats", bit: 2 }]);
  assert.equal(f.row("Dictionary membership").children[1].textContent, "ENABLEExpanded");
  assert.equal(f.row("Dictionary membership").children[2].textContent, "ENABLE");
  assert.match(f.row("Hooks · Expanded").children[1].textContent, /Front: SCATBack: CATS/);
  f.controller.close();
  assert.equal(f.document.activeElement, f.compare);
});

test("unrestricted and invalid saved racks do not acquire invented leave estimates", async () => {
  const f = fixture({ analyzePlay: () => ({ valid: false, score: 99, leave: "bad" }) }, [
    { id: "0", word: "CAT", score: 5, rack: "", scoreKind: "base" },
    { id: "1", word: "TAX", score: 10, rack: "ABC", scoreKind: "rack" }
  ]);
  f.select("0"); f.select("1"); f.open();
  assert.match(f.row("Saved rack").children[1].textContent, /unrestricted/);
  assert.match(f.row("Saved rack").children[2].textContent, /ABC.*unavailable/);
  assert.match(f.row("Remaining rack").children[1].textContent, /Unavailable/);
  assert.match(f.row("Remaining rack").children[2].textContent, /Unavailable/);
  await flush();
});

test("closing or removing a compared word cancels stale updates and pending hook work", async () => {
  const loading = deferred();
  const membership = deferred();
  const f = fixture({ loadAll: () => loading.promise, loadMembership: () => membership.promise });
  f.select("0"); f.select("1"); f.open();
  const oldMembership = f.row("Dictionary membership").children[1];
  f.controller.close();
  loading.resolve(); membership.resolve(3);
  await flush();
  assert.equal(oldMembership.textContent, "Checking word lists…");
  assert.equal(f.calls.hooks.length, 0);
  f.open();
  await flush();
  assert.equal(f.row("Dictionary membership").children[1].textContent, "ENABLEExpanded");
  f.setEntries(f.entries().filter((entry) => entry.id !== "0"));
  assert.equal(f.dialog.open, false);
  assert.match(f.status.textContent, /^1 of 4 selected/);
});

test("dictionary and membership errors expose retries that recover without reopening", async () => {
  let loadAttempts = 0;
  let membershipAttempts = 0;
  const f = fixture({
    loadAll: async () => { if (++loadAttempts === 1) throw new Error("Offline"); },
    loadMembership: async () => ++membershipAttempts <= 2 ? 0 : 2
  });
  f.select("0"); f.select("1"); f.open();
  await flush();
  assert.equal(loadAttempts, 1);
  const hooks = f.row("Hooks · Expanded").children[1];
  const membership = f.row("Dictionary membership").children[1];
  assert.equal(hooks.attributes["aria-busy"], undefined);
  assert.match(hooks.textContent, /Retry hooks for CAT/);
  assert.match(membership.textContent, /Retry word lists for CAT/);
  hooks.querySelector("button").dispatch("click");
  membership.querySelector("button").dispatch("click");
  await flush();
  assert.equal(loadAttempts, 2);
  assert.match(hooks.textContent, /Front: SCATBack: CATS/);
  assert.equal(membership.textContent, "Expanded");
});
