(function pickComparisonModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MonkeyTacticsPickComparison = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createPickComparisonApi() {
  "use strict";

  let nextId = 0;

  function create(config) {
    const document = config.panel.ownerDocument;
    const selected = new Set();
    const controls = new Set();
    const id = `pick-comparison-${++nextId}`;
    let revision = 0;
    let returnFocus = null;
    let comparedIds = [];

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function button(text, action, className = "pick-comparison-button") {
      const node = element("button", className, text);
      node.type = "button";
      node.addEventListener("click", action);
      return node;
    }

    const toolbar = element("div", "pick-comparison-toolbar");
    const selectionStatus = element("p", "pick-comparison-selection-status");
    selectionStatus.id = `${id}-selection`;
    selectionStatus.setAttribute("role", "status");
    selectionStatus.setAttribute("aria-live", "polite");
    const compareButton = button("Compare selected (0)", open);
    compareButton.setAttribute("aria-haspopup", "dialog");
    compareButton.setAttribute("aria-controls", id);
    compareButton.setAttribute("aria-describedby", selectionStatus.id);
    const clearButton = button("Clear selection", () => {
      selected.clear();
      sync();
    }, "pick-comparison-button pick-comparison-button--secondary");
    toolbar.append(compareButton, clearButton, selectionStatus);
    (config.panel.querySelector(".pick-list-panel-content") || config.panel).prepend(toolbar);

    const dialog = element("dialog", "pick-comparison-dialog");
    dialog.id = id;
    dialog.setAttribute("aria-labelledby", `${id}-title`);
    dialog.setAttribute("aria-describedby", `${id}-note`);
    const header = element("div", "pick-comparison-header");
    const title = element("h2", "pick-comparison-title", "Compare picked words");
    title.id = `${id}-title`;
    const closeButton = button("Close", close);
    closeButton.setAttribute("aria-label", "Close word comparison");
    header.append(title, closeButton);
    const note = element("p", "pick-comparison-note");
    note.id = `${id}-note`;
    const scroller = element("div", "pick-comparison-scroll");
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-label", "Candidate comparison table; scroll horizontally for more words");
    const footnote = element("p", "pick-comparison-footnote", "Scores exclude premium squares and cross-words. Leave quality is an estimate out of 100. ? represents a blank tile. Word-list membership does not guarantee acceptance by your game.");
    dialog.append(header, note, scroller, footnote);
    document.body.append(dialog);

    dialog.addEventListener("close", () => {
      revision += 1;
      comparedIds = [];
      if (returnFocus?.isConnected) returnFocus.focus();
      returnFocus = null;
    });
    dialog.addEventListener("cancel", () => { revision += 1; });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });

    function close() {
      revision += 1;
      if (dialog.open) dialog.close();
    }

    function sync() {
      const entries = config.getEntries();
      const available = new Set(entries.map((entry) => entry.id));
      for (const entryId of selected) {
        if (!available.has(entryId)) selected.delete(entryId);
      }
      for (const control of controls) {
        if (!control.isConnected) {
          controls.delete(control);
          continue;
        }
        control.checked = selected.has(control.dataset.pickId);
        control.disabled = !control.checked && selected.size >= 4;
      }
      compareButton.textContent = `Compare selected (${selected.size})`;
      compareButton.disabled = selected.size < 2;
      clearButton.disabled = selected.size === 0;
      selectionStatus.textContent = `${selected.size} of 4 selected. ${selected.size < 2 ? "Choose 2–4 picked words to compare." : selected.size === 4 ? "Maximum selected; clear a word to choose another." : "Ready to compare; you can choose up to 4."}`;
      toolbar.hidden = entries.length === 0;
      if (dialog.open && comparedIds.some((entryId) => !available.has(entryId))) close();
    }

    function createSelectionControl(entry) {
      const label = element("label", "pick-comparison-choice");
      const input = element("input");
      input.type = "checkbox";
      input.dataset.pickId = entry.id;
      input.checked = selected.has(entry.id);
      input.disabled = !input.checked && selected.size >= 4;
      input.setAttribute("aria-label", `Compare ${entry.word}`);
      input.setAttribute("aria-describedby", selectionStatus.id);
      input.addEventListener("change", () => {
        if (input.checked && selected.size < 4) selected.add(entry.id);
        else if (!input.checked) selected.delete(entry.id);
        else input.checked = false;
        sync();
      });
      controls.add(input);
      label.append(input, element("span", "", "Compare"));
      return label;
    }

    function analyze(entry) {
      const rack = typeof entry.rack === "string" ? entry.rack.trim().toLowerCase() : "";
      const boardPattern = typeof entry.boardPattern === "string" ? entry.boardPattern.trim().toLowerCase() : "";
      let play = null;
      if (entry.scoreKind === "rack" && /^[a-z?]+$/.test(rack)) {
        try {
          const result = config.analyzePlay(entry.word.toLowerCase(), rack, { boardPattern });
          if (result?.valid) play = result;
        } catch (_error) {
          // A legacy or incompatible saved entry still has a useful base score.
        }
      }
      return { entry, rack, boardPattern, play };
    }

    function tileUsage(candidate) {
      if (!candidate.play) return "Unavailable — no playable saved rack";
      const { play, entry } = candidate;
      const boardPositions = new Set(play.boardPositions || []);
      const blankPositions = new Set(play.blankPositions || []);
      const tiles = [...entry.word].filter((_letter, index) => !boardPositions.has(index));
      const used = [...entry.word].map((letter, index) => boardPositions.has(index) ? "" : blankPositions.has(index) ? "?" : letter).join("");
      const blanks = blankPositions.size;
      return `${play.tilesUsed ?? tiles.length} tiles · ${used.toUpperCase()}${blanks ? ` (${blanks} blank${blanks === 1 ? "" : "s"})` : ""}`;
    }

    function leaveEstimate(candidate) {
      if (!candidate.play) return "Unavailable — no playable saved rack";
      if (!candidate.play.leave) return "Rack cleared";
      const value = config.getLeaveQuality([...candidate.play.leave.toLowerCase()]);
      const label = value >= 75 ? "Excellent" : value >= 60 ? "Good" : value >= 40 ? "Fair" : "Tough";
      return `${value}/100 · ${label}`;
    }

    function open() {
      sync();
      const entries = config.getEntries().filter((entry) => selected.has(entry.id)).map((entry) => ({ ...entry }));
      if (entries.length < 2 || entries.length > 4) return;
      const token = ++revision;
      comparedIds = entries.map((entry) => entry.id);
      const dictionary = { ...config.getDictionary() };
      const candidates = entries.map(analyze);
      const contexts = new Set(candidates.map(({ rack, boardPattern }) => `${rack}/${boardPattern}`));
      note.textContent = `${candidates.every((candidate) => candidate.play) && contexts.size === 1 ? "These candidates use the same saved rack and board pattern." : "Each column uses its own saved search context; racks and board patterns may differ."} Hooks use ${dictionary.label}.`;
      const table = element("table", "pick-comparison-table");
      table.append(element("caption", "", `${config.scoringLabel} candidate comparison`));
      const head = element("thead");
      const headingRow = element("tr");
      const metricHeading = element("th", "", "Metric");
      metricHeading.scope = "col";
      headingRow.append(metricHeading);
      for (const entry of entries) {
        const cell = element("th", "", entry.word.toUpperCase());
        cell.scope = "col";
        headingRow.append(cell);
      }
      head.append(headingRow);
      const body = element("tbody");
      table.append(head, body);
      function row(label, values) {
        const line = element("tr");
        const heading = element("th", "", label);
        heading.scope = "row";
        line.append(heading);
        const cells = values.map((value) => element("td", "", value));
        line.append(...cells);
        body.append(line);
        return cells;
      }
      row("Saved rack", candidates.map(({ rack, play }) => play ? rack.toUpperCase() : rack ? `${rack.toUpperCase()} · rack analysis unavailable` : "Not saved / unrestricted search"));
      row("Board pattern", candidates.map(({ boardPattern }) => boardPattern.toUpperCase() || "None"));
      row("Tile score", candidates.map(({ entry, play }) => play ? `${play.score} pts${play.bingo ? " · Bingo +" + (config.scoringLabel === "Words With Friends" ? "35" : "50") + " candidate" : ""}` : `${entry.score} pts · saved score; rack context unavailable`));
      row("Tiles used", candidates.map(tileUsage));
      row("Remaining rack", candidates.map(({ play }) => play ? play.leave.toUpperCase() || "Empty — all rack tiles used" : "Unavailable — no playable saved rack"));
      row("Leave estimate", candidates.map(leaveEstimate));
      const hookCells = row(`Hooks · ${dictionary.label}`, entries.map(() => "Loading hooks…"));
      const membershipCells = row("Dictionary membership", entries.map(() => "Checking word lists…"));
      scroller.replaceChildren(table);
      returnFocus = document.activeElement || compareButton;
      if (!dialog.open) dialog.showModal();
      closeButton.focus();

      const current = () => dialog.open && token === revision;
      let dictionaryLoad;
      function loadHookDictionary() {
        if (!dictionaryLoad) dictionaryLoad = Promise.resolve().then(() => config.loadAll(dictionary.bit)).catch((error) => {
          dictionaryLoad = null;
          throw error;
        });
        return dictionaryLoad;
      }
      async function fillCell(cell, pending, work, render, retryLabel) {
        if (!current()) return;
        cell.textContent = pending;
        cell.setAttribute("aria-busy", "true");
        try {
          const value = await work();
          if (current()) render(cell, value);
        } catch (_error) {
          if (!current()) return;
          cell.replaceChildren(element("span", "", "Unavailable. "), button(retryLabel, () => fillCell(cell, pending, work, render, retryLabel), "pick-comparison-retry"));
        } finally {
          if (current()) cell.removeAttribute("aria-busy");
        }
      }
      entries.forEach((entry, index) => {
        const word = entry.word.toLowerCase();
        fillCell(hookCells[index], "Loading hooks…", async () => {
          await loadHookDictionary();
          if (!current()) return null;
          return config.findHooks(word, dictionary.bit);
        }, (cell, hooks) => {
          if (!hooks || !Array.isArray(hooks.front) || !Array.isArray(hooks.back)) throw new Error("Hooks unavailable");
          cell.replaceChildren(
            element("p", "pick-comparison-hooks", `Front: ${hooks.front.map((letter) => `${letter}${word}`.toUpperCase()).join(", ") || "None"}`),
            element("p", "pick-comparison-hooks", `Back: ${hooks.back.map((letter) => `${word}${letter}`.toUpperCase()).join(", ") || "None"}`)
          );
        }, `Retry hooks for ${entry.word}`);
        fillCell(membershipCells[index], "Checking word lists…", () => config.loadMembership(word), (cell, membership) => {
          if (![1, 2, 3].includes(membership)) throw new Error("Word sources unavailable");
          cell.replaceChildren();
          if (membership & 1) cell.append(element("span", "pick-comparison-source pick-comparison-source--enable", "ENABLE"));
          if (membership & 2) cell.append(element("span", "pick-comparison-source pick-comparison-source--expanded", "Expanded"));
        }, `Retry word lists for ${entry.word}`);
      });
    }

    sync();
    return Object.freeze({ createSelectionControl, sync, close });
  }

  return Object.freeze({ create });
}));
