(function playRefillModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MonkeyTacticsPlayRefill = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createPlayRefillApi() {
  "use strict";

  let nextId = 0;

  function create(config) {
    const { host, getState, parseInput, analyzePlay, applyRack, restoreState } = config;
    const document = host.ownerDocument;
    const make = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text) element.textContent = text;
      return element;
    };
    const makeButton = (text, handler) => {
      const element = make("button", "play-refill-button", text);
      element.type = "button";
      element.addEventListener("click", handler);
      return element;
    };
    const copy = (state) => JSON.parse(JSON.stringify(state));
    const normalize = (value) => String(value || "").replace(/\s/g, "").toLowerCase();
    const rackSignature = (rack) => [...rack].sort().join("");
    const currentBoard = (state) => state.filters?.useBoardLetters ? String(state.filters.boardPattern || "").trim().toLowerCase() : "";
    let flow = null;

    const heading = make("h3", "play-refill-heading", "Play and refill");
    heading.id = `play-refill-heading-${++nextId}`;
    host.classList.add("play-refill");
    host.setAttribute("role", "region");
    host.setAttribute("aria-labelledby", heading.id);
    const status = make("p", "play-refill-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.tabIndex = -1;
    const remaining = make("p", "play-refill-remaining");
    const controls = make("div", "play-refill-controls");
    const label = make("label", "play-refill-label", "Replacement tiles");
    const replacement = make("input", "play-refill-input");
    replacement.id = `play-refill-tiles-${nextId}`;
    replacement.type = "text";
    replacement.autocomplete = "off";
    replacement.spellcheck = false;
    replacement.setAttribute("autocapitalize", "characters");
    replacement.setAttribute("aria-describedby", `play-refill-hint-${nextId}`);
    label.htmlFor = replacement.id;
    const hint = make("p", "play-refill-hint");
    hint.id = `play-refill-hint-${nextId}`;
    const refillActions = make("div", "play-refill-actions");
    const addButton = makeButton("Add tiles & search", addTiles);
    const skipButton = makeButton("Search remaining rack", keepRack);
    refillActions.append(addButton, skipButton);
    controls.append(label, replacement, hint, refillActions);
    const undoButton = makeButton("Undo play", undo);
    undoButton.classList.add("play-refill-undo");
    host.replaceChildren(heading, status, remaining, controls, undoButton);

    function announce(message, error = false, focus = false) {
      host.hidden = false;
      status.textContent = message;
      status.classList.toggle("is-error", error);
      if (focus) status.focus();
    }

    function showRemaining(rack) {
      remaining.hidden = false;
      remaining.textContent = rack
        ? `Remaining rack: ${rack.toUpperCase().split("").join(" ")} (${rack.length} ${rack.length === 1 ? "tile" : "tiles"}). ? is a blank tile.`
        : "Remaining rack: empty. You used every tile.";
    }

    function play(word, context = {}) {
      const snapshot = copy(getState());
      const parsed = parseInput(snapshot.input);
      const rack = normalize(parsed.rack);
      const sourceRack = normalize(context.rack);
      const boardPattern = String(context.boardPattern || "").trim().toLowerCase();
      const reject = (message) => {
        config.closeDetails?.();
        announce(message, true, true);
        return false;
      };
      if (context.unrestricted || parsed.unrestricted || !rack || !sourceRack) {
        return reject("Enter a rack and search again before playing a word. An unrestricted word list has no tiles to subtract.");
      }
      if (rackSignature(rack) !== rackSignature(sourceRack) || currentBoard(snapshot) !== boardPattern) {
        return reject("Your rack or board letters have changed. Search again before playing this word.");
      }
      const analysis = analyzePlay(String(word).toLowerCase(), rack, { boardPattern });
      if (!analysis?.valid || !Number.isInteger(analysis.tilesUsed) || analysis.tilesUsed < 1
        || typeof analysis.leave !== "string" || !/^[a-z?]*$/i.test(analysis.leave)
        || analysis.leave.length + analysis.tilesUsed !== rack.length) {
        return reject("This word cannot be played with the current rack and board letters. Search again to choose a playable word.");
      }
      const leave = analysis.leave.toLowerCase();
      config.closeDetails?.();
      applyRack(leave, { search: false });
      flow = { snapshot, leave, tilesUsed: analysis.tilesUsed, expectedState: copy(getState()), pending: true };
      controls.hidden = false;
      undoButton.hidden = false;
      replacement.value = "";
      replacement.removeAttribute("aria-invalid");
      skipButton.textContent = leave ? "Search remaining rack" : "Keep empty rack";
      hint.textContent = `Add up to ${analysis.tilesUsed} replacement ${analysis.tilesUsed === 1 ? "tile" : "tiles"}. Use letters or ? for a blank; spaces are allowed. Your rack can contain up to two blanks.`;
      showRemaining(leave);
      announce(`${String(word).toUpperCase()} played using ${analysis.tilesUsed} ${analysis.tilesUsed === 1 ? "tile" : "tiles"}. Add your replacement tiles, or keep the remaining rack.`);
      replacement.focus();
      return true;
    }

    function playCurrent(word) {
      const snapshot = copy(getState());
      const parsed = parseInput(snapshot.input);
      return play(word, {
        rack: parsed.rack,
        boardPattern: currentBoard(snapshot),
        unrestricted: parsed.unrestricted
      });
    }

    function refillIsCurrent() {
      if (!flow?.pending) return false;
      if (JSON.stringify(getState()) !== JSON.stringify(flow.expectedState)) {
        announce("Your rack or search options changed after this play. Undo the play to restore the original search, or search your current rack before playing another word.", true, true);
        return false;
      }
      return true;
    }

    function addTiles() {
      if (!refillIsCurrent()) return false;
      const tiles = normalize(replacement.value);
      let error = "";
      if (!tiles) error = `Enter replacement tiles, or choose ${flow.leave ? "Search remaining rack" : "Keep empty rack"}.`;
      else if (!/^[a-z?]+$/.test(tiles)) error = "Use only letters A–Z or ? for a blank tile. Spaces are allowed.";
      else if (tiles.length > flow.tilesUsed) error = `You played ${flow.tilesUsed} ${flow.tilesUsed === 1 ? "tile" : "tiles"}; add no more than ${flow.tilesUsed} replacement ${flow.tilesUsed === 1 ? "tile" : "tiles"}.`;
      else if ((flow.leave + tiles).replace(/[^?]/g, "").length > 2) error = "The remaining rack and replacement tiles can contain no more than two blanks in total.";
      else if (flow.leave.length + tiles.length > 30) error = "Your rack can contain no more than 30 tiles.";
      if (error) {
        replacement.setAttribute("aria-invalid", "true");
        announce(error, true);
        replacement.focus();
        return false;
      }
      replacement.removeAttribute("aria-invalid");
      const rack = flow.leave + tiles;
      applyRack(rack, { search: true });
      flow.pending = false;
      controls.hidden = true;
      remaining.textContent = `New rack: ${rack.toUpperCase().split("").join(" ")} (${rack.length} ${rack.length === 1 ? "tile" : "tiles"}).`;
      announce(`Added ${tiles.length} replacement ${tiles.length === 1 ? "tile" : "tiles"} and searched the new rack. Undo play restores the original rack and search options.`);
      return true;
    }

    function keepRack() {
      if (!refillIsCurrent()) return false;
      flow.pending = false;
      controls.hidden = true;
      applyRack(flow.leave, { search: true });
      announce(flow.leave ? "Kept and searched the remaining rack." : "Kept the empty rack. Enter tiles above when you are ready.");
      config.focusRack?.();
      return true;
    }

    function undo() {
      if (!flow) return false;
      const snapshot = flow.snapshot;
      flow = null;
      controls.hidden = true;
      undoButton.hidden = true;
      remaining.hidden = true;
      restoreState(copy(snapshot));
      announce("Play undone. Restored your original rack and search options.");
      return true;
    }

    function reset() {
      flow = null;
      host.hidden = true;
      controls.hidden = true;
      undoButton.hidden = true;
      remaining.hidden = true;
      replacement.value = "";
      replacement.removeAttribute("aria-invalid");
      status.textContent = "";
    }

    replacement.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        addTiles();
      }
    });
    reset();
    return Object.freeze({ play, playCurrent, reset });
  }

  return Object.freeze({ create });
}));
