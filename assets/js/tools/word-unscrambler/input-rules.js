(function wordUnscramblerInputRulesModule(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.MonkeyTacticsWordInputRules = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createInputRulesApi() {
  "use strict";

  const MAX_RACK_WILDCARDS = 2;
  const MAX_PATTERN_STARS = 3;
  function sanitizeSmartInput(value) {
    let slashFound = false;
    let colonFound = false;
    let afterColon = false;

    return [...String(value ?? "")].filter((character) => {
      if (character === "/") {
        if (slashFound) {
          return false;
        }

        slashFound = true;
        afterColon = false;
        return true;
      }

      if (character === ":") {
        if (slashFound || colonFound) {
          return false;
        }

        colonFound = true;
        afterColon = true;
        return true;
      }

      if (character === "+" || character === "-") {
        afterColon = false;
        return true;
      }

      if (/\d/.test(character)) {
        return afterColon;
      }

      return /^[a-z?*\s]$/i.test(character);
    }).join("").replace(/\s+/g, " ");
  }

  function normalizePattern(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z?*]/g, "")
      .replace(/\*+/g, "*");
  }

  function parseSmartInput(value) {
    const rawValue = String(value ?? "");
    const clauseIndex = rawValue.search(/[+-]/);
    const coreSource = clauseIndex < 0 ? rawValue : rawValue.slice(0, clauseIndex);
    const clauseSource = clauseIndex < 0 ? "" : rawValue.slice(clauseIndex);
    const slashIndex = coreSource.indexOf("/");
    const rackAndLengthSource = slashIndex === -1 ? coreSource : coreSource.slice(0, slashIndex);
    const patternSource = slashIndex === -1 ? "" : coreSource.slice(slashIndex + 1);
    const colonIndex = rackAndLengthSource.indexOf(":");
    const rackSource = colonIndex === -1
      ? rackAndLengthSource
      : rackAndLengthSource.slice(0, colonIndex);
    const lengthSource = colonIndex === -1
      ? ""
      : rackAndLengthSource.slice(colonIndex + 1).trim();
    const unrestrictedCount = countCharacter(rackSource, "*");
    const includeClauses = [...clauseSource.matchAll(/\+\s*([a-z]+)/gi)];
    const excludeClauses = [...clauseSource.matchAll(/-\s*([a-z]+)/gi)];
    const operatorCount = countCharacter(clauseSource, "+") + countCharacter(clauseSource, "-");
    const parsedClauseCount = includeClauses.length + excludeClauses.length;

    return {
      rack: rackSource.toLowerCase().replace(/[^a-z?]/g, ""),
      pattern: normalizePattern(patternSource),
      unrestricted: unrestrictedCount === 1,
      unrestrictedCount,
      inlineLength: colonIndex === -1 || !/^\d+$/.test(lengthSource)
        ? null
        : Number.parseInt(lengthSource, 10),
      hasLengthSeparator: colonIndex !== -1,
      hasValidLength: colonIndex !== -1 && /^\d+$/.test(lengthSource),
      inlineMustInclude: includeClauses[0]?.[1]?.toLowerCase() ?? "",
      inlineExcludeLetters: excludeClauses[0]?.[1]?.toLowerCase() ?? "",
      includeClauseCount: countCharacter(clauseSource, "+"),
      excludeClauseCount: countCharacter(clauseSource, "-"),
      hasInvalidClauses: operatorCount !== parsedClauseCount
        || clauseSource.replace(/[+-]\s*[a-z]+/gi, "").trim() !== ""
    };
  }

  function countCharacter(value, character) {
    return [...value].filter((candidate) => candidate === character).length;
  }

  function getLimitViolation(rack, pattern) {
    const rackWildcards = countCharacter(rack, "?");
    if (rackWildcards > MAX_RACK_WILDCARDS) {
      return {
        type: "rack-wildcards",
        count: rackWildcards,
        maximum: MAX_RACK_WILDCARDS
      };
    }

    const patternStars = countCharacter(pattern, "*");
    if (patternStars > MAX_PATTERN_STARS) {
      return {
        type: "pattern-stars",
        count: patternStars,
        maximum: MAX_PATTERN_STARS
      };
    }

    return null;
  }

  return Object.freeze({
    MAX_PATTERN_STARS,
    MAX_RACK_WILDCARDS,
    getLimitViolation,
    normalizePattern,
    parseSmartInput,
    sanitizeSmartInput
  });
}));
