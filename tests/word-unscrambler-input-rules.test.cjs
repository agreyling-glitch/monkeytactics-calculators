"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const InputRules = require("../assets/js/tools/word-unscrambler/input-rules.js");

test("normalizes consecutive pattern stars before validation", () => {
  assert.deepEqual(InputRules.parseSmartInput("ABCDE / a***?**e"), {
    rack: "abcde",
    pattern: "a*?*e",
    unrestricted: false,
    unrestrictedCount: 0,
    inlineLength: null,
    hasLengthSeparator: false,
    hasValidLength: false,
    inlineMustInclude: "",
    inlineExcludeLetters: "",
    includeClauseCount: 0,
    excludeClauseCount: 0,
    hasInvalidClauses: false
  });
  assert.equal(InputRules.getLimitViolation("abcde", "a*?*e"), null);
});

test("keeps only Scrabble and smart-pattern input characters", () => {
  assert.equal(
    InputRules.sanitizeSmartInput("Abc123!? / a*e + 😀 / z"),
    "Abc? / a*e + z"
  );
});

test("accepts digits only after a single length colon", () => {
  assert.equal(InputRules.sanitizeSmartInput("a1*:27 / q2* :9"), "a*:27 / q* ");
  assert.deepEqual(InputRules.parseSmartInput("Z*:7 / *z*"), {
    rack: "z",
    pattern: "*z*",
    unrestricted: true,
    unrestrictedCount: 1,
    inlineLength: 7,
    hasLengthSeparator: true,
    hasValidLength: true,
    inlineMustInclude: "",
    inlineExcludeLetters: "",
    includeClauseCount: 0,
    excludeClauseCount: 0,
    hasInvalidClauses: false
  });
});

test("parses compact must-include and exclude clauses after the pattern", () => {
  const parsed = InputRules.parseSmartInput("*:7 / q* +u-xz");
  assert.equal(parsed.pattern, "q*");
  assert.equal(parsed.inlineMustInclude, "u");
  assert.equal(parsed.inlineExcludeLetters, "xz");
  assert.equal(parsed.includeClauseCount, 1);
  assert.equal(parsed.excludeClauseCount, 1);
  assert.equal(parsed.hasInvalidClauses, false);
});

test("flags duplicate, empty, and misplaced inline clauses", () => {
  assert.equal(InputRules.parseSmartInput("*:7 +a +b").includeClauseCount, 2);
  assert.equal(InputRules.parseSmartInput("*:7 +").hasInvalidClauses, true);
  assert.equal(InputRules.parseSmartInput("*:7 +a / q*").hasInvalidClauses, true);
});

test("reports incomplete inline lengths without interpreting them as zero", () => {
  const parsed = InputRules.parseSmartInput("*: / q*");
  assert.equal(parsed.hasLengthSeparator, true);
  assert.equal(parsed.hasValidLength, false);
  assert.equal(parsed.inlineLength, null);
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
