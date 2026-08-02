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

  function normalizePattern(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z?*]/g, "")
      .replace(/\*+/g, "*");
  }

  function parseSmartInput(value) {
    const slashIndex = value.indexOf("/");
    const rackSource = slashIndex === -1 ? value : value.slice(0, slashIndex);
    const patternSource = slashIndex === -1 ? "" : value.slice(slashIndex + 1);

    return {
      rack: rackSource.toLowerCase().replace(/[^a-z?]/g, ""),
      pattern: normalizePattern(patternSource)
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
    parseSmartInput
  });
}));
