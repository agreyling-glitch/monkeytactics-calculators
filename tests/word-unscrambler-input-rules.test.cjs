"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const InputRules = require("../assets/js/word-unscrambler-input-rules.js");

test("normalizes consecutive pattern stars before validation", () => {
  assert.deepEqual(InputRules.parseSmartInput("ABCDE / a***?**e"), {
    rack: "abcde",
    pattern: "a*?*e"
  });
  assert.equal(InputRules.getLimitViolation("abcde", "a*?*e"), null);
});

test("allows at most two rack wildcards", () => {
  assert.equal(InputRules.getLimitViolation("abcde??", ""), null);
  assert.deepEqual(InputRules.getLimitViolation("abcde???", ""), {
    type: "rack-wildcards",
    count: 3,
    maximum: 2
  });
});

test("allows at most three meaningful pattern stars", () => {
  assert.equal(InputRules.getLimitViolation("abcde", "*a*b*c"), null);
  assert.deepEqual(InputRules.getLimitViolation("abcde", "*a*b*c*"), {
    type: "pattern-stars",
    count: 4,
    maximum: 3
  });
});
