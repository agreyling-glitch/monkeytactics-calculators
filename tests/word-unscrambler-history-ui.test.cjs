"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const HistoryStore = require("../assets/js/tools/word-unscrambler/history-store.js");

test("arrow navigation wraps and supports Home and End", () => {
  assert.equal(HistoryStore.moveIndex(0, "ArrowDown", 3), 1);
  assert.equal(HistoryStore.moveIndex(2, "ArrowDown", 3), 0);
  assert.equal(HistoryStore.moveIndex(0, "ArrowUp", 3), 2);
  assert.equal(HistoryStore.moveIndex(1, "Home", 3), 0);
  assert.equal(HistoryStore.moveIndex(1, "End", 3), 2);
  assert.equal(HistoryStore.moveIndex(0, "ArrowDown", 0), -1);
});

test("a touch long-press opens history", async () => {
  let opened = 0;
  const controller = HistoryStore.createLongPressController({
    delay: 10,
    onLongPress: () => { opened += 1; }
  });
  controller.start({ pointerType: "touch", clientX: 10, clientY: 10 });
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(opened, 1);
});

test("movement cancels a touch long-press", async () => {
  let opened = 0;
  const controller = HistoryStore.createLongPressController({
    delay: 10,
    movement: 5,
    onLongPress: () => { opened += 1; }
  });
  controller.start({ pointerType: "touch", clientX: 10, clientY: 10 });
  controller.move({ clientX: 30, clientY: 10 });
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(opened, 0);
});

