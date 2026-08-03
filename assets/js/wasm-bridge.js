"use strict";

(function initializeWordUnscramblerWasm(global) {
  const ASSET_VERSION = "20260803-2";
  const bridgeUrl = document.currentScript.src;
  const moduleUrl = new URL(
    `../wasm/word-unscrambler/word_unscrambler_engine.js?v=${ASSET_VERSION}`,
    bridgeUrl
  );
  const binaryUrl = new URL(
    `../wasm/word-unscrambler/word_unscrambler_engine_bg.wasm?v=${ASSET_VERSION}`,
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
    scoreWord(word) {
      return requireEngine().score_word(word);
    },
    findHooks(word, dictionaryBit) {
      return requireEngine().find_hooks_for_dictionary(word, dictionaryBit);
    },
    analyzeWord(word) {
      return requireEngine().analyze_word(word);
    },
    boardFitAnalysis(rack, pattern, options) {
      return requireEngine().board_fit_analysis(rack, pattern, options);
    }
  });
})(window);
