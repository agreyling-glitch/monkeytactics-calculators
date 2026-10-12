import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import PlayRefill from "../assets/js/tools/word-unscrambler/play-refill.js";
import InputRules from "../assets/js/tools/word-unscrambler/input-rules.js";
import init, { analyze_play } from "../assets/wasm/word-unscrambler/word_unscrambler_engine.js";

await init({ module_or_path: fs.readFileSync(new URL("../assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm", import.meta.url)) });

function fixture(input = "EXAMPLE?", filters = {}) {
  const document = {
    activeElement: null,
    createElement(tag) {
      const attributes = new Map();
      const classes = new Set();
      const handlers = new Map();
      return {
        tag, ownerDocument: document, children: [], hidden: false, textContent: "", value: "",
        classList: { add: (...names) => names.forEach((name) => classes.add(name)), toggle(name, on) { on ? classes.add(name) : classes.delete(name); } },
        setAttribute: (name, value) => attributes.set(name, value), getAttribute: (name) => attributes.get(name), removeAttribute: (name) => attributes.delete(name),
        append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
        addEventListener: (type, handler) => handlers.set(type, handler),
        click() { return handlers.get("click")?.(); }, keydown(event) { return handlers.get("keydown")?.(event); },
        focus() { document.activeElement = this; }
      };
    }
  };
  const host = document.createElement("div");
  let state = { input, filters: { useBoardLetters: false, boardPattern: "", ...filters }, sort: "score-desc", dictionary: "both" };
  const applied = [];
  const restored = [];
  let closed = 0;
  const module = PlayRefill.create({
    host, getState: () => state, parseInput: InputRules.parseSmartInput,
    analyzePlay: (word, rack, options) => analyze_play(word, rack, options.boardPattern, "scrabble"),
    applyRack(rack, options) {
      applied.push({ rack, ...options });
      state = { ...state, input: rack.toUpperCase(), filters: { useBoardLetters: false, boardPattern: "" } };
    },
    restoreState(snapshot) { restored.push(snapshot); state = snapshot; },
    closeDetails() { closed += 1; }
  });
  const descendants = (element) => [element, ...element.children.flatMap(descendants)];
  const find = (predicate) => descendants(host).find(predicate);
  const button = (label) => find((element) => element.tag === "button" && element.textContent === label);
  const field = find((element) => element.tag === "input");
  const status = find((element) => element.getAttribute("role") === "status");
  return { module, host, field, status, button, document, applied, restored,
    get state() { return state; }, set state(value) { state = value; }, get closed() { return closed; } };
}

test("plays from the real WASM tile assignment and preserves the eight-tile rack's leave order", () => {
  const f = fixture("EXAMPLE? / *E");
  assert.equal(f.host.hidden, true);
  assert.equal(f.module.play("PLANE", { rack: "example?" }), true);
  assert.deepEqual(f.applied, [{ rack: "exm", search: false }]);
  assert.equal(f.document.activeElement, f.field);
  assert.equal(f.closed, 1);
  f.field.value = " t a R s ? ";
  f.button("Add tiles & search").click();
  assert.deepEqual(f.applied[1], { rack: "exmtars?", search: true });
  assert.equal(f.button("Undo play").hidden, false);
});

test("fixed board letters cost no rack tiles and a played blank does not consume the spare blank", () => {
  const f = fixture("X?C?", { useBoardLetters: true, boardPattern: "?A?" });
  assert.equal(f.module.play("CAT", { rack: "x?c?", boardPattern: "?a?" }), true);
  assert.deepEqual(f.applied[0], { rack: "x?", search: false });
  f.field.value = "T?";
  f.button("Add tiles & search").click();
  assert.equal(f.state.input, "X?T?");
});

test("repeated real tiles are consumed before blanks and unused blanks are preserved", () => {
  const f = fixture("T?AATZ?");
  f.module.play("TAT", { rack: "t?aatz?" });
  assert.equal(f.state.input, "?AZ?");
  f.field.value = "xy?";
  f.button("Add tiles & search").click();
  assert.match(f.status.textContent, /no more than two blanks/);
  assert.equal(f.field.getAttribute("aria-invalid"), "true");
  assert.equal(f.applied.length, 1);
  f.field.value = "XYZ";
  f.button("Add tiles & search").click();
  assert.equal(f.state.input, "?AZ?XYZ");
});

test("a reordered matching rack can be played, with leave in its current order", () => {
  const f = fixture("?XZCAT");
  assert.equal(f.module.play("CAT", { rack: "catxz?" }), true);
  assert.equal(f.state.input, "?XZ");
});

test("rack or board changes reject stale result actions without changing the search", () => {
  for (const [input, filters] of [["CTX", {}], ["CT", { useBoardLetters: true, boardPattern: "?O?" }]]) {
    const f = fixture(input, filters);
    assert.equal(f.module.play("CAT", { rack: "ct", boardPattern: "?a?" }), false);
    assert.equal(f.applied.length, 0);
    assert.equal(f.state.input, input);
    assert.match(f.status.textContent, /changed.*Search again/);
  }
});

test("unrestricted word lists, missing rack context, and impossible plays cannot subtract tiles", () => {
  for (const [input, context, word] of [["*:5", { rack: "", unrestricted: true }, "CAT"], ["CAT", {}, "CAT"], ["CAT", { rack: "cat" }, "ZOO"]]) {
    const f = fixture(input);
    assert.equal(f.module.play(word, context), false);
    assert.equal(f.applied.length, 0);
    assert.equal(f.button("Undo play").hidden, true);
  }
});

test("refill validates length and characters without silently removing bad input", () => {
  const f = fixture("CAT?");
  f.module.play("CAT", { rack: "cat?" });
  for (const [value, message] of [["", /Enter replacement/], ["ABCD", /no more than 3 replacement/], ["A!B", /only letters/], ["A1", /only letters/]]) {
    f.field.value = value;
    f.button("Add tiles & search").click();
    assert.equal(f.applied.length, 1);
    assert.equal(f.field.value, value);
    assert.match(f.status.textContent, message);
  }
});

test("refill refuses to overwrite subsequent rack or filter edits", () => {
  for (const change of [({ ...state }) => ({ ...state, input: "NEW" }), ({ ...state }) => ({ ...state, filters: { ...state.filters, startsWith: "C" } })]) {
    const f = fixture("CAT?");
    f.module.play("CAT", { rack: "cat?" });
    f.state = change(f.state);
    const edited = structuredClone(f.state);
    f.field.value = "DOG";
    f.button("Add tiles & search").click();
    assert.match(f.status.textContent, /changed after this play/);
    assert.equal(f.applied.length, 1);
    assert.deepEqual(f.state, edited);
  }
});

test("Undo restores the exact original rack syntax, board, filters, dictionary and sort before and after refill", () => {
  for (const refill of [false, true]) {
    const f = fixture(" CT:3 / C?? +A-Z ", { useBoardLetters: true, boardPattern: " ?A? ", wordLength: "3", minimumScore: "2" });
    const original = structuredClone(f.state);
    f.module.play("CAT", { rack: "ct", boardPattern: "?a?" });
    if (refill) { f.field.value = "XY"; f.button("Add tiles & search").click(); }
    f.button("Undo play").click();
    assert.deepEqual(f.state, original);
    assert.deepEqual(f.restored, [original]);
    assert.equal(f.button("Undo play").hidden, true);
  }
});

test("search remaining rack and keep empty rack both retain Undo", () => {
  for (const [rack, label, expected] of [["CATS", "Search remaining rack", "s"], ["CAT", "Keep empty rack", ""]]) {
    const f = fixture(rack);
    f.module.play("CAT", { rack });
    f.button(label).click();
    assert.deepEqual(f.applied[1], { rack: expected, search: true });
    f.button("Undo play").click();
    assert.equal(f.state.input, rack);
  }
});

test("Enter adds tiles once without submitting the parent search form and reset discards the old Undo", () => {
  const f = fixture("CATS");
  f.module.play("CAT", { rack: "cats" });
  f.field.value = "DOG";
  let prevented = false;
  let stopped = false;
  f.field.keydown({ key: "Enter", preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.equal(f.applied.length, 2);
  assert.equal(f.state.input, "SDOG");
  f.module.reset();
  assert.equal(f.host.hidden, true);
  f.button("Undo play").click();
  assert.equal(f.restored.length, 0);
});

test("a later play replaces Undo with its own complete search snapshot", () => {
  const f = fixture("CATS");
  f.module.play("CAT", { rack: "cats" });
  f.field.value = "DOG";
  f.button("Add tiles & search").click();
  const second = structuredClone(f.state);
  f.module.play("DOG", { rack: "sdog" });
  assert.equal(f.state.input, "S");
  f.button("Undo play").click();
  assert.deepEqual(f.state, second);
});

test("playing a picked word uses the current rack without requiring its saved search context", () => {
  const f = fixture("CAT");
  f.state = { ...f.state, input: "CATS?:3 / C*T" };
  assert.equal(f.module.playCurrent("CAT"), true);
  assert.deepEqual(f.applied, [{ rack: "s?", search: false }]);
  assert.equal(f.state.input, "S?");
});

test("playing a picked word uses only the active current board letters", () => {
  const board = fixture("CT?", { useBoardLetters: true, boardPattern: " ?a? " });
  assert.equal(board.module.playCurrent("CAT"), true);
  assert.deepEqual(board.applied, [{ rack: "?", search: false }]);

  const inactiveBoard = fixture("CATS?", { useBoardLetters: false, boardPattern: "?O?" });
  assert.equal(inactiveBoard.module.playCurrent("CAT"), true);
  assert.equal(inactiveBoard.state.input, "S?");

  const emptyBoard = fixture("CATS?", { useBoardLetters: true, boardPattern: " " });
  assert.equal(emptyBoard.module.playCurrent("CAT"), true);
  assert.equal(emptyBoard.state.input, "S?");
});

test("playing a picked word rejects a missing, unrestricted, or unplayable current rack", () => {
  for (const [input, filters] of [["", {}], ["*:3", {}], ["CT", {}], ["CT", { useBoardLetters: true, boardPattern: "?O?" }]]) {
    const f = fixture(input, filters);
    const original = structuredClone(f.state);
    assert.equal(f.module.playCurrent("CAT"), false);
    assert.deepEqual(f.applied, []);
    assert.deepEqual(f.state, original);
    assert.equal(f.button("Undo play").hidden, true);
  }
});

test("playing a picked word preserves the order of repeated tiles and unused blanks", () => {
  const f = fixture("T?AATZ?");
  assert.equal(f.module.playCurrent("TAT"), true);
  assert.equal(f.state.input, "?AZ?");
});

test("Undo of a picked word restores the current search rather than the word's old search", () => {
  for (const refill of [false, true]) {
    const f = fixture(" CT?:3 / C*T +A-Z ", {
      useBoardLetters: true, boardPattern: " ?A? ", wordLength: "3", minimumScore: "2"
    });
    const original = structuredClone(f.state);
    assert.equal(f.module.playCurrent("CAT"), true);
    assert.equal(f.state.input, "?");
    if (refill) {
      f.field.value = "ES";
      f.button("Add tiles & search").click();
      assert.equal(f.state.input, "?ES");
    }
    f.button("Undo play").click();
    assert.deepEqual(f.state, original);
    assert.deepEqual(f.restored, [original]);
  }
});

test("result actions retain their stale-context guard while picked words can use the current rack", () => {
  const f = fixture("CATS?");
  assert.equal(f.module.play("CAT", { rack: "cats" }), false);
  assert.deepEqual(f.applied, []);
  assert.match(f.status.textContent, /changed.*Search again/);
  assert.equal(f.module.playCurrent("CAT"), true);
  assert.equal(f.state.input, "S?");
});
