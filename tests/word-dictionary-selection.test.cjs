"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { setImmediate: tick } = require("node:timers/promises");

const mainSource = fs.readFileSync(path.join(__dirname, "../assets/js/tools/word-unscrambler/word-unscrambler.js"), "utf8");
const sharedSource = fs.readFileSync(path.join(__dirname, "../assets/js/shared/dictionary-offline-controls.js"), "utf8");

function extract(source, name, indentation = "") {
  const declaration = new RegExp(`^${indentation}(?:async )?function ${name}\\(`, "m").exec(source);
  assert.ok(declaration, `Missing production function: ${name}`);
  const end = source.indexOf(`\n${indentation}}`, declaration.index) + indentation.length + 2;
  return source.slice(declaration.index, end);
}

function selectionSession({ rack = "CAT", busy = false } = {}) {
  const submitted = [];
  let hooksRefreshed = 0;
  const dictionaryInputs = ["enable", "expanded", "both"].map((value) => ({ value, checked: value === "enable" }));
  const context = {
    queueMicrotask, dictionaryInputs,
    activeDictionarySelection: "enable", dictionarySearchQueued: false, searchRevision: 0,
    rackLeaveAnagramCountCache: new Map([["old", 1]]), pickListHookCache: new Map([["old", 1]]), pickComparison: null,
    refreshPickListHookCache() { hooksRefreshed += 1; }, syncSectionFilterResetButtons() {},
    input: { value: rack }, button: { disabled: busy }, pendingHistorySearch: false,
    form: { requestSubmit() { context.searchRevision += 1; submitted.push(context.getSelectedDictionary()); } }
  };
  vm.createContext(context);
  vm.runInContext(["getSelectedDictionary", "rerunCurrentSearch", "handleDictionaryChange", "runPendingHistorySearch"].map((name) => extract(mainSource, name)).join("\n"), context);
  return {
    context, submitted, hooksRefreshed: () => hooksRefreshed,
    choose(value) {
      dictionaryInputs.forEach((radio) => { radio.checked = radio.value === value; });
      context.handleDictionaryChange();
    }
  };
}

test("dictionary changes refresh a nonempty rack once with the selected list and clear dependent caches", async () => {
  const f = selectionSession();
  f.choose("expanded");
  f.choose("both");
  await tick();
  assert.deepEqual(f.submitted, ["both"]);
  assert.equal(f.context.rackLeaveAnagramCountCache.size, 0);
  assert.equal(f.context.pickListHookCache.size, 0);
  assert.equal(f.hooksRefreshed(), 2);
  f.choose("both");
  await tick();
  assert.deepEqual(f.submitted, ["both"]);
});

test("startup synchronization and blank racks do not trigger dictionary searches", async () => {
  const f = selectionSession({ rack: "  " });
  f.choose("enable");
  await tick();
  assert.equal(f.hooksRefreshed(), 0);
  f.choose("expanded");
  await tick();
  assert.deepEqual(f.submitted, []);
  assert.equal(f.context.pendingHistorySearch, false);
});

test("a busy search queues one refresh using the most recent dictionary", async () => {
  const f = selectionSession({ busy: true });
  f.choose("expanded");
  await tick();
  f.choose("both");
  await tick();
  assert.deepEqual(f.submitted, []);
  assert.equal(f.context.pendingHistorySearch, true);
  f.context.button.disabled = false;
  f.context.runPendingHistorySearch();
  f.context.runPendingHistorySearch();
  assert.deepEqual(f.submitted, ["both"]);
  assert.equal(f.context.pendingHistorySearch, false);
});

test("recovery and examples that submit immediately do not trigger a duplicate dictionary search", async () => {
  const f = selectionSession();
  f.choose("both");
  f.context.rerunCurrentSearch();
  await tick();
  assert.deepEqual(f.submitted, ["both"]);
  f.choose("expanded");
  f.context.form.requestSubmit();
  await tick();
  assert.deepEqual(f.submitted, ["both", "expanded"]);
});

function dictionaryDialog() {
  const focus = [];
  const events = [];
  function element(name) {
    const listeners = new Map();
    return {
      attributes: {}, dataset: {}, tabIndex: -1,
      classList: { toggle() {} },
      addEventListener(type, listener) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(listener);
      },
      dispatchEvent(event) {
        for (const listener of listeners.get(event.type) || []) listener(event);
      },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      focus() { focus.push(name); }
    };
  }
  const values = ["enable", "expanded", "both"];
  const radios = values.map((value) => ({ ...element(value), value }));
  let selected = "expanded";
  radios.forEach((radio) => {
    Object.defineProperty(radio, "checked", {
      get: () => selected === radio.value,
      set: (checked) => { if (checked) selected = radio.value; }
    });
    radio.addEventListener("change", () => events.push(radio.value));
  });
  const options = values.map((value, index) => ({ ...element(`${value} option`), dataset: { values: `${value},${index + 1}` } }));
  const close = element("close");
  const trigger = element("trigger");
  const dialog = {
    ...element("dialog"), open: false,
    querySelectorAll: () => options,
    querySelector: () => close,
    showModal() { this.open = true; },
    close() { this.open = false; this.dispatchEvent({ type: "close" }); }
  };
  const syncChoiceSource = /    const syncChoice = \(\) => \{[\s\S]*?\n    \};/.exec(sharedSource)[0];
  const context = {
    Event, dialog, trigger, radios, standard: radios[0], showLabel: false,
    choices: values.map((value, index) => ({ values: [value, String(index + 1)], name: value })),
    choiceIcon: (name) => name, sizeActiveChoiceIcon() {}
  };
  vm.createContext(context);
  vm.runInContext(`${syncChoiceSource}\n${extract(sharedSource, "bindDictionaryChoices", "  ")}\nbindDictionaryChoices(dialog, trigger, radios, syncChoice);`, context);
  return {
    dialog, trigger, close, options, radios, focus, events,
    key(index, key) {
      const event = { type: "keydown", key, prevented: false, preventDefault() { this.prevented = true; } };
      options[index].dispatchEvent(event);
      return event;
    }
  };
}

test("dictionary dialog focuses the selected radio and arrows update choice, aria state and roving tab stop", () => {
  const f = dictionaryDialog();
  f.trigger.dispatchEvent({ type: "click" });
  assert.equal(f.dialog.open, true);
  assert.equal(f.trigger.attributes["aria-expanded"], "true");
  assert.equal(f.focus.at(-1), "expanded option");
  assert.deepEqual(f.options.map((option) => option.tabIndex), [-1, 0, -1]);
  assert.equal(f.key(1, "ArrowRight").prevented, true);
  assert.equal(f.focus.at(-1), "both option");
  assert.deepEqual(f.events, ["both"]);
  assert.deepEqual(f.options.map((option) => option.attributes["aria-checked"]), ["false", "false", "true"]);
  assert.deepEqual(f.options.map((option) => option.tabIndex), [-1, -1, 0]);
  assert.equal(f.dialog.open, true);
  f.key(2, "ArrowDown");
  assert.equal(f.focus.at(-1), "enable option");
  f.key(0, "ArrowLeft");
  assert.equal(f.focus.at(-1), "both option");
  f.key(2, "Home");
  assert.equal(f.focus.at(-1), "enable option");
  f.key(0, "End");
  assert.equal(f.focus.at(-1), "both option");
  assert.equal(f.key(2, "Tab").prevented, false);
});

test("dictionary activation closes and restores trigger focus without duplicate change events", () => {
  const f = dictionaryDialog();
  f.trigger.dispatchEvent({ type: "click" });
  f.options[0].dispatchEvent({ type: "click" });
  assert.deepEqual(f.events, ["enable"]);
  assert.equal(f.dialog.open, false);
  assert.equal(f.focus.at(-1), "trigger");
  assert.equal(f.trigger.attributes["aria-expanded"], "false");
  f.trigger.dispatchEvent({ type: "click" });
  f.options[0].dispatchEvent({ type: "click" });
  assert.deepEqual(f.events, ["enable"]);
  f.trigger.dispatchEvent({ type: "click" });
  f.close.dispatchEvent({ type: "click" });
  assert.equal(f.dialog.open, false);
  assert.equal(f.focus.at(-1), "trigger");
});

test("dictionary options use native buttons in a labelled radio group and the modal keeps native Escape dismissal", () => {
  assert.match(sharedSource, /<fieldset role="radiogroup" aria-label="Dictionary options">/);
  assert.match(sharedSource, /<button type="button" role="radio" aria-checked="false" tabindex="-1" data-values=/);
  assert.doesNotMatch(sharedSource, /<label data-values=/);
  assert.match(sharedSource, /trigger\.setAttribute\("aria-haspopup", "dialog"\)/);
  assert.match(sharedSource, /trigger\.setAttribute\("aria-controls", dialog\.id\)/);
  assert.doesNotMatch(extract(sharedSource, "bindDictionaryChoices", "  "), /cancel.*preventDefault|key === "Escape"/);
});

test("generic offline upgrades refresh navigation and unversioned scripts while reusing versioned assets", async () => {
  const page = "https://monkeytactics.com/tools/wordle-helper";
  const fetched = [];
  const copied = [];
  const cache = {
    async match() { return undefined; },
    async put(request, response) { copied.push([request.url, await response.text()]); }
  };
  const context = {
    URL, Request,
    GENERIC_OFFLINE_VERSION: "20261012-solvers-11",
    location: { href: page, pathname: new URL(page).pathname },
    caches: { async match() { return new Response("previous package"); } },
    async fetch(request) {
      fetched.push(request);
      return new Response("current shell");
    }
  };
  vm.createContext(context);
  vm.runInContext(extract(sharedSource, "cacheGenericOfflineUrl", "  "), context);
  for (const url of [page, "https://monkeytactics.com/assets/js/shared/dictionary-offline-controls.js"]) {
    assert.equal(await context.cacheGenericOfflineUrl(cache, url, false), true);
  }
  const versioned = "https://monkeytactics.com/assets/js/shared/dictionary-offline-controls.js?v=20261012-solvers-11";
  assert.equal(await context.cacheGenericOfflineUrl(cache, versioned, false), false);
  assert.deepEqual(copied.map((entry) => entry[1]), ["current shell", "current shell", "previous package"]);
  assert.equal(fetched.length, 2);
  assert.ok(fetched.every((request) => request.cache === "reload" && request.credentials === "same-origin"));
  assert.ok(fetched.every((request) => new URL(request.url).searchParams.get("offline-update") === "20261012-solvers-11"));
  assert.match(sharedSource, /GENERIC_OFFLINE_VERSION = "20261012-solvers-11"/);
});
