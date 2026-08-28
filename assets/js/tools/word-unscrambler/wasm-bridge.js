"use strict";

(function initializeWordUnscramblerWasm(global) {
  const ASSET_VERSION = "20260827-wwf-1";
  const bridgeUrl = document.currentScript.src;
  const moduleUrl = new URL(
    `/assets/wasm/word-unscrambler/word_unscrambler_engine.js?v=${ASSET_VERSION}`,
    bridgeUrl
  );
  const binaryUrl = new URL(
    `/assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm?v=${ASSET_VERSION}`,
    bridgeUrl
  );
  const state = {
    module: null,
    authorized: false
  };

  const ready = import(moduleUrl.href)
    .then(async (wasm) => {
      await wasm.default({ module_or_path: binaryUrl });
      state.authorized = wasm.verify_domain(global.location.hostname);

      if (!state.authorized) {
        throw new Error("Unauthorized domain");
      }

      state.module = wasm;
      return wasm;
    });

  function requireEngine() {
    if (!state.module || !state.authorized) {
      throw new Error("Word Unscrambler WASM engine is not ready.");
    }
    return state.module;
  }

  global.MonkeyTacticsWasm = Object.freeze({
    ready,
    initEngine(records) {
      return requireEngine().init_engine(records);
    },
    unscramble(rack, pattern, options) {
      return requireEngine().unscramble(rack, pattern, options);
    },

    crosswordSearch(pattern, availableLetters, options) {
      return requireEngine().crossword_search(pattern, availableLetters, options);
    },
    wordleSearch(guesses, dictionaryBit) {
      return requireEngine().wordle_search(guesses, dictionaryBit);
    },
    scoreWord(word) {
      return requireEngine().score_word(word);
    },
    scoreWwfWord(word) {
      return requireEngine().score_wwf_word(word);
    },
    findHooks(word, dictionaryBit) {
      return requireEngine().find_hooks_for_dictionary(word, dictionaryBit);
    },
    analyzeWord(word) {
      return requireEngine().analyze_word(word);
    },
    analyzeWwfWord(word) {
      return requireEngine().analyze_wwf_word(word);
    },
    boardFitAnalysis(rack, pattern, options) {
      return requireEngine().board_fit_analysis(rack, pattern, options);
    }
  });
})(window);
