import { analyzeText, humanizeReadingTime } from "/assets/js/tools/word-character-counter/word-counter.js";
import { initWasmEngine, runWasmAnalysis } from "./wasm-engine.js";
import { createVisualizationRenderer } from "./visualizations.js?v=20260809-1";
import {
  normalizeUnscrambleTerm, unscrambleLocal
} from "../word-unscrambler/embed-client.js?v=20260809-1";

let initialized = false;
let latestAnalysis = null;

function element(tag, attributes, text) {
  const node = document.createElement(tag);
  Object.entries(attributes || {}).forEach(function ([name, value]) {
    if (name === "className") node.className = value;
    else node.setAttribute(name, value);
  });
  if (text !== undefined) node.textContent = text;
  return node;
}

function resultCard(label, id, explanation) {
  const card = element("div", {
    className: "result-card readability-card", tabindex: "0",
    "aria-label": label + ". " + explanation, title: explanation
  });
  const labelElement = element("div", { className: "result-label" }, label);
  labelElement.append(element("span", { className: "readability-help", "aria-hidden": "true" }, "?"));
  card.append(labelElement);
  card.append(element("div", { className: "result-value", id }, "0.0"));
  return card;
}

function createReadabilitySection(after) {
  const section = element("section", {
    className: "readability-section", id: "readabilitySection",
    "aria-label": "Readability scores"
  });
  const cards = element("div", { className: "stat-trio analysis-card-grid" });
  cards.style.display = "none";
  cards.append(
    resultCard("Flesch-Kincaid Grade", "readabilityFlesch", "Uses sentence length and estimated syllables per word."),
    resultCard("Gunning Fog Index", "readabilityFog", "Weights long sentences and complex words with three or more syllables."),
    resultCard("SMOG Grade", "readabilitySmog", "Focuses on words with three or more syllables; it is most stable with 30 or more sentences."),
    resultCard("Coleman-Liau Index", "readabilityColeman", "Uses letters per word and sentence length instead of estimating syllables.")
  );
  section.append(cards);
  after.insertAdjacentElement("afterend", section);
  return section;
}

function chartCard(title, id, label, explanation, hoverOnly) {
  const descriptionId = id + "Description";
  const card = element("div", { className: "result-card structure-card" });
  if (!hoverOnly) card.append(element("div", { className: "result-label" }, title));
  card.append(element("p", {
    className: hoverOnly ? "chart-hover-description" : "metric-explanation",
    id: descriptionId
  }, hoverOnly ? title + ". " + explanation : explanation));
  const canvas = element("canvas", {
    id, role: "img", "aria-label": label, "aria-describedby": descriptionId
  });
  if (hoverOnly) {
    canvas.tabIndex = 0;
    canvas.title = title + ": " + explanation;
  }
  canvas.dataset.height = hoverOnly ? "44" : "150";
  card.append(canvas);
  return { card, canvas };
}

function createNgramSection(after) {
  after.insertAdjacentHTML("afterend", `
    <div id="ngram-section" class="result-card structure-card">
      <div class="btn-row" role="tablist" aria-label="N-gram categories">
        <button class="btn-ghost ngram-tab" id="ngram-unigrams-tab" type="button" role="tab" aria-selected="true" aria-controls="ngram-unigrams" tabindex="0" data-ngram-type="unigrams">Unigrams</button>
        <button class="btn-ghost ngram-tab" id="ngram-bigrams-tab" type="button" role="tab" aria-selected="false" aria-controls="ngram-bigrams" tabindex="-1" data-ngram-type="bigrams">Bigrams</button>
        <button class="btn-ghost ngram-tab" id="ngram-trigrams-tab" type="button" role="tab" aria-selected="false" aria-controls="ngram-trigrams" tabindex="-1" data-ngram-type="trigrams">Trigrams</button>
      </div>
      <div class="ngram-group" id="ngram-unigrams" role="tabpanel" aria-labelledby="ngram-unigrams-tab" data-ngram-panel="unigrams" style="padding-top:0.85rem;">
        <div class="ngram-top"></div>
        <button class="btn-ghost ngram-toggle" type="button" aria-haspopup="dialog" aria-controls="ngram-full-modal" data-ngram-type="unigrams">Show full list</button>
      </div>
      <div class="ngram-group" id="ngram-bigrams" role="tabpanel" aria-labelledby="ngram-bigrams-tab" data-ngram-panel="bigrams" style="padding-top:0.85rem;" hidden>
        <div class="ngram-top"></div>
        <button class="btn-ghost ngram-toggle" type="button" aria-haspopup="dialog" aria-controls="ngram-full-modal" data-ngram-type="bigrams">Show full list</button>
      </div>
      <div class="ngram-group" id="ngram-trigrams" role="tabpanel" aria-labelledby="ngram-trigrams-tab" data-ngram-panel="trigrams" style="padding-top:0.85rem;" hidden>
        <div class="ngram-top"></div>
        <button class="btn-ghost ngram-toggle" type="button" aria-haspopup="dialog" aria-controls="ngram-full-modal" data-ngram-type="trigrams">Show full list</button>
      </div>
      <dialog id="ngram-full-modal" class="result-card" aria-labelledby="ngram-full-modal-title" style="width:min(92vw,640px);max-height:80vh;overflow:hidden;background:var(--card-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-card);padding:1.15rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">
          <h3 id="ngram-full-modal-title" style="margin:0;">All N-grams</h3>
          <button class="btn-ghost" id="ngram-full-modal-close" type="button" style="padding:0.35rem 0.65rem;" aria-label="Close full N-gram list">&times;</button>
        </div>
        <div id="ngram-full-modal-body" style="max-height:60vh;overflow-y:auto;margin-top:0.85rem;"></div>
      </dialog>
    </div>
  `);

  const section = after.nextElementSibling;
  const tabs = [...section.querySelectorAll("[role=tab]")];

  function activateTab(type, moveFocus) {
    tabs.forEach(function (tab) {
      const selected = tab.dataset.ngramType === type;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.style.borderColor = selected ? "var(--accent)" : "";
      tab.style.color = selected ? "var(--accent)" : "";
      section.querySelector('[data-ngram-panel="' + tab.dataset.ngramType + '"]').hidden = !selected;
      if (selected && moveFocus) tab.focus();
    });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      activateTab(tab.dataset.ngramType, false);
    });
    tab.addEventListener("keydown", function (event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      activateTab(tabs[nextIndex].dataset.ngramType, true);
    });
  });
  activateTab("unigrams", false);

  const modal = section.querySelector("#ngram-full-modal");
  const modalTitle = section.querySelector("#ngram-full-modal-title");
  const modalBody = section.querySelector("#ngram-full-modal-body");
  const modalClose = section.querySelector("#ngram-full-modal-close");
  const groups = ["unigrams", "bigrams", "trigrams"].reduce(function (result, type) {
    const group = section.querySelector("#ngram-" + type);
    const toggle = group.querySelector(".ngram-toggle");
    const state = { top: group.querySelector(".ngram-top"), fullData: [] };
    toggle.addEventListener("click", function () {
      const title = type[0].toUpperCase() + type.slice(1);
      modalTitle.textContent = "All " + title;
      renderNgramTable(modalBody, "All " + title, state.fullData);
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      modalClose.focus({ preventScroll: true });
    });
    result[type] = state;
    return result;
  }, {});
  modalClose.addEventListener("click", function () {
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  });

  return { section, ...groups };
}

function sortNgrams(map) {
  return Object.entries(map || {}).sort(function (left, right) {
    return right[1] - left[1] || left[0].localeCompare(right[0]);
  });
}

function renderNgramTable(container, title, ngrams) {
  const table = element("table", {
    className: "keywords-table ngram-table",
    "aria-label": title + " and occurrence counts"
  });
  const head = element("thead");
  const headingRow = element("tr");
  headingRow.append(element("th", null, "Phrase"), element("th", null, "Count"));
  head.append(headingRow);
  const body = element("tbody");
  const rows = document.createDocumentFragment();
  ngrams.forEach(function ([phrase, count]) {
    const row = element("tr", { "data-ngram": phrase });
    row.append(element("td", null, phrase), element("td", null, String(count)));
    rows.append(row);
  });
  body.append(rows);
  table.append(head, body);
  container.replaceChildren(table);
}

function renderNgramTables(containers, data) {
  const topN = 10;
  ["unigrams", "bigrams", "trigrams"].forEach(function (type) {
    const title = type[0].toUpperCase() + type.slice(1);
    const sorted = sortNgrams(data?.[type]);
    containers[type].fullData = sorted;
    renderNgramTable(containers[type].top, "Top " + title, sorted.slice(0, topN));
  });
}

function createVisualizationsSection(after, keywordTable) {
  const section = element("section", {
    className: "keywords-section", id: "visualizationsSection",
    "aria-labelledby": "visualizations-heading"
  });
  section.style.display = "none";
  section.append(element("h2", { id: "visualizations-heading" }, "Text Structure"));
  section.append(element("p", { className: "analysis-intro" },
    "Read these charts from left to right, matching the order of your text. They help you find dense or repetitive areas to review; variation is a signal, not automatically a problem."
  ));
  const sentence = chartCard(
    "Sentence Rhythm", "sentenceRhythmCanvas", "Bar chart of sentence lengths in reading order",
    "Each bar is one sentence, and its height represents the character count. Look for isolated tall bars that may be hard to follow, or a run of similarly short bars that may sound choppy."
  );
  const paragraph = chartCard(
    "Paragraph Structure", "paragraphStructureCanvas", "Bar chart of paragraph lengths in reading order",
    "Each bar is one paragraph separated by a blank line, and its height represents the character count. Use it to spot long blocks that may need a break or very short paragraphs that could be combined."
  );
  const keywords = chartCard(
    "Keyword Distribution", "keywordDistributionCanvas", "Timeline of non-common keyword occurrences from the start to the end of the text",
    "The line runs from the start to the end of your text. Each colored tick marks a non-common word, and repeated words reuse the same color. Dense clusters can reveal repetition; large gaps can reveal uneven topic coverage. Compare the pattern with the keyword table above.",
    true
  );
  keywords.card.id = "keyword-distribution-container";
  section.append(sentence.card, paragraph.card);
  keywordTable.insertAdjacentElement("afterend", keywords.card);
  const ngrams = createNgramSection(keywords.card);
  after.insertAdjacentElement("afterend", section);
  return {
    section, sentenceCanvas: sentence.canvas,
    paragraphCanvas: paragraph.canvas, keywordCanvas: keywords.canvas, ngrams
  };
}

function createExportSection(after) {
  const section = element("section", {
    className: "keywords-section", id: "exportSection",
    "aria-labelledby": "export-heading"
  });
  section.style.display = "none";
  section.append(element("h2", { id: "export-heading" }, "Export Analysis"));
  const buttons = element("div", { className: "btn-row" });
  [["Export JSON", "json"], ["Export Markdown", "markdown"], ["Export Plain Text", "text"]]
    .forEach(function ([label, format]) {
      buttons.append(element("button", {
        className: "btn-ghost", type: "button", "data-export-format": format
      }, label));
    });
  section.append(buttons);
  after.insertAdjacentElement("afterend", section);
  return section;
}

function topKeywords(data, excludeStopwords) {
  if (excludeStopwords) return data.top_keywords;
  return Object.entries(data.ngram_data.unigrams)
    .map(function ([word, count]) {
      return { word, count, density: count / Math.max(1, data.word_count) * 100 };
    })
    .sort(function (left, right) {
      return right.count - left.count || left.word.localeCompare(right.word);
    })
    .slice(0, 10);
}

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function markdownReport(data) {
  const rows = data.top_keywords.map(function (entry) {
    return "| " + entry.word.replace(/\|/g, "\\|") + " | " + entry.count + " | " + entry.density.toFixed(1) + "% |";
  });
  return [
    "# Text Analysis Report", "", "- Words: " + data.word_count,
    "- Characters: " + data.char_count,
    "- Characters without spaces: " + data.char_no_spaces,
    "- Sentences: " + data.sentence_count, "- Paragraphs: " + data.paragraph_count, "",
    "## Readability", "",
    "- Flesch-Kincaid: " + formatScore(data.readability_scores.flesch_kincaid),
    "- Gunning Fog: " + formatScore(data.readability_scores.gunning_fog),
    "- SMOG: " + formatScore(data.readability_scores.smog),
    "- Coleman-Liau: " + formatScore(data.readability_scores.coleman_liau), "",
    "## Top Keywords", "", "| Keyword | Count | Density |",
    "| --- | ---: | ---: |", ...rows, ""
  ].join("\n");
}

function plainTextReport(data) {
  const keywords = data.top_keywords.map(function (entry) {
    return "  " + entry.word + ": " + entry.count + " (" + entry.density.toFixed(1) + "%)";
  }).join("\n");
  return [
    "TEXT ANALYSIS REPORT", "", "Words: " + data.word_count,
    "Characters: " + data.char_count,
    "Characters without spaces: " + data.char_no_spaces,
    "Sentences: " + data.sentence_count, "Paragraphs: " + data.paragraph_count, "",
    "READABILITY", "Flesch-Kincaid: " + formatScore(data.readability_scores.flesch_kincaid),
    "Gunning Fog: " + formatScore(data.readability_scores.gunning_fog),
    "SMOG: " + formatScore(data.readability_scores.smog),
    "Coleman-Liau: " + formatScore(data.readability_scores.coleman_liau), "",
    "TOP KEYWORDS", keywords, ""
  ].join("\n");
}

function downloadReport(format, data) {
  const definitions = {
    json: [JSON.stringify(data, null, 2), "application/json", "json"],
    markdown: [markdownReport(data), "text/markdown", "md"],
    text: [plainTextReport(data), "text/plain", "txt"]
  };
  const [content, type, extension] = definitions[format];
  const url = URL.createObjectURL(new Blob([content], { type: type + ";charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "monkeytactics-text-analysis." + extension;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}

export async function initializeWordCounter() {
  if (initialized) return;
  initialized = true;
  const textInput = document.getElementById("text-input");
  const resultsPanel = document.getElementById("resultsCol");
  const keywordSection = document.getElementById("keywordsSection");
  const keywordTable = document.getElementById("keyword-density-table");
  const selectedWordButton = document.getElementById("unscramble-selected-word");
  const unscramblePopup = document.getElementById("unscramble-popup");
  const popupClose = document.getElementById("unscramble-popup-close");
  const popupWord = document.getElementById("unscramble-popup-word");
  const popupStatus = document.getElementById("unscramble-popup-status");
  const popupResults = document.getElementById("unscramble-popup-results");
  const popupBody = document.getElementById("unscramble-popup-body");
  const popupPagination = document.getElementById("unscramble-popup-pagination");
  const popupPrevious = document.getElementById("unscramble-popup-previous");
  const popupNext = document.getElementById("unscramble-popup-next");
  const popupPageStatus = document.getElementById("unscramble-popup-page-status");
  if (
    !textInput || !resultsPanel || !keywordSection || !keywordTable || !selectedWordButton
    || !unscramblePopup || !popupClose || !popupWord
    || !popupStatus || !popupResults || !popupBody || !popupPagination
    || !popupPrevious || !popupNext || !popupPageStatus
  ) return;

  const readabilitySection = createReadabilitySection(resultsPanel);
  const visualizationElements = createVisualizationsSection(keywordSection, keywordTable);
  const exportSection = createExportSection(visualizationElements.section);
  const renderer = createVisualizationRenderer(visualizationElements);
  let lockedKeyword = null;
  let popupRequestId = 0;
  let popupReturnFocus = null;
  const popupPageSize = 15;
  let popupMatches = [];
  let popupPage = 0;
  if (!await initWasmEngine()) return;

  function closeUnscramblePopup() {
    popupRequestId += 1;
    unscramblePopup.style.display = "none";
    popupMatches = [];
    popupPage = 0;
    popupReturnFocus?.focus?.({ preventScroll: true });
    popupReturnFocus = null;
  }

  function renderPopupPage() {
    popupBody.replaceChildren();
    popupResults.style.display = popupMatches.length ? "block" : "none";
    if (!popupMatches.length) {
      popupPagination.hidden = true;
      return;
    }

    const pageCount = Math.ceil(popupMatches.length / popupPageSize);
    popupPage = Math.max(0, Math.min(popupPage, pageCount - 1));
    const start = popupPage * popupPageSize;
    const fragment = document.createDocumentFragment();
    popupMatches.slice(start, start + popupPageSize).forEach(function (match) {
      const row = document.createElement("tr");
      row.append(
        element("td", null, match.word),
        element("td", null, String(match.score))
      );
      fragment.append(row);
    });
    popupBody.append(fragment);
    popupPagination.hidden = pageCount <= 1;
    popupPrevious.disabled = popupPage === 0;
    popupNext.disabled = popupPage === pageCount - 1;
    popupPageStatus.textContent = "Page " + (popupPage + 1) + " of " + pageCount;
  }

  async function openUnscramblePopup(value, trigger) {
    const word = normalizeUnscrambleTerm(value);
    const requestId = ++popupRequestId;
    popupReturnFocus = trigger || document.activeElement;
    unscramblePopup.style.display = "block";
    popupResults.style.display = "none";
    popupBody.replaceChildren();
    popupMatches = [];
    popupPage = 0;
    popupPagination.hidden = true;
    popupWord.textContent = word ? "Selected word: " + word : "No valid word selected";
    popupStatus.textContent = word
      ? "Finding matches in the local dictionaryâ€¦"
      : "Select one English word containing 2 to 30 letters.";
    popupClose.focus({ preventScroll: true });
    if (!word) return;

    try {
      const matches = await unscrambleLocal(word);
      if (requestId !== popupRequestId) return;
      popupStatus.textContent = matches.length === 1
        ? "1 valid word found locally."
        : matches.length + " valid words found locally.";
      popupMatches = matches;
      renderPopupPage();
    } catch (error) {
      if (requestId !== popupRequestId) return;
      popupStatus.textContent = error instanceof TypeError
        ? error.message
        : "The local dictionary could not be opened. Refresh and try again.";
    }
  }

  function createUnscrambleButton(word) {
    const button = element("button", {
      className: "btn-ghost unscramble-btn", type: "button",
      style: "padding:0.25rem 0.55rem;font-size:0.7rem;margin-left:0.5rem;",
      "aria-label": "Unscramble " + word
    }, "Unscramble");
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      openUnscramblePopup(word, button);
    });
    return button;
  }

  popupClose.addEventListener("click", closeUnscramblePopup);
  popupPrevious.addEventListener("click", function () {
    if (popupPage === 0) return;
    popupPage -= 1;
    renderPopupPage();
  });
  popupNext.addEventListener("click", function () {
    const pageCount = Math.ceil(popupMatches.length / popupPageSize);
    if (popupPage >= pageCount - 1) return;
    popupPage += 1;
    renderPopupPage();
  });
  unscramblePopup.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeUnscramblePopup();
  });
  selectedWordButton.addEventListener("click", function () {
    const selected = textInput.value.slice(textInput.selectionStart, textInput.selectionEnd);
    openUnscramblePopup(selected, selectedWordButton);
  });

  function getPositionsFor(word) {
    if (!latestAnalysis) return [];
    const wasmPositions = latestAnalysis.visualization_data.keyword_positions.filter(function (position) {
      return position.word === word;
    });
    if (wasmPositions.length) return wasmPositions;

    const normalizedWord = word.replace(/\u2019/g, "'").toLocaleLowerCase();
    return [...textInput.value.matchAll(/[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)*/gu)]
      .filter(function (match) {
        return match[0].replace(/\u2019/g, "'").toLocaleLowerCase() === normalizedWord;
      })
      .map(function (match) {
        return { word, index: match.index };
      });
  }

  function drawFullDistribution() {
    if (!latestAnalysis) return;
    renderer.drawKeywordDistribution(
      latestAnalysis.visualization_data.keyword_positions,
      latestAnalysis.char_count
    );
  }

  function drawFilteredDistribution(word) {
    if (!latestAnalysis) return;
    renderer.drawKeywordDistribution(getPositionsFor(word), latestAnalysis.char_count);
  }

  function restoreFullGraph() {
    if (lockedKeyword) drawFilteredDistribution(lockedKeyword);
    else drawFullDistribution();
  }

  function lockKeyword(word) {
    lockedKeyword = word;
    drawFilteredDistribution(word);
  }

  function bindKeywordRow(row, word) {
    row.dataset.keyword = word;
    row.addEventListener("mouseenter", function () {
      if (!lockedKeyword) drawFilteredDistribution(word);
    });
    row.addEventListener("mouseleave", restoreFullGraph);
    row.addEventListener("click", function () {
      if (lockedKeyword === word) {
        lockedKeyword = null;
        drawFullDistribution();
      } else {
        lockKeyword(word);
      }
    });
  }

  visualizationElements.keywordCanvas.addEventListener("click", function () {
    if (!lockedKeyword) return;
    lockedKeyword = null;
    drawFullDistribution();
  });

  function updateMetrics() {
    const text = textInput.value;
    if (!text.trim()) {
      latestAnalysis = null;
      readabilitySection.style.display = "block";
      readabilitySection.querySelector(".analysis-card-grid").style.display = "none";
      visualizationElements.section.style.display = "none";
      exportSection.style.display = "none";
      lockedKeyword = null;
      renderNgramTables(visualizationElements.ngrams, {});
      renderer.render({
        sentence_lengths: [], paragraph_lengths: [], keyword_positions: []
      }, 0);
      return;
    }
    const result = runWasmAnalysis(text);
    if (!result) return;
    const data = result.toJSON();
    result.free();
    latestAnalysis = data;

    const wpm = parseInt(document.getElementById("wpm").value, 10) || 200;
    const seconds = Math.ceil(data.word_count / wpm * 60);
    document.getElementById("resWords").textContent = data.word_count.toLocaleString();
    document.getElementById("resWordsSub").textContent = data.sentence_count + (data.sentence_count === 1 ? " sentence" : " sentences") + " · " + data.paragraph_count + (data.paragraph_count === 1 ? " paragraph" : " paragraphs");
    document.getElementById("resChars").textContent = data.char_count.toLocaleString();
    document.getElementById("resCharsNoSpaces").textContent = data.char_no_spaces.toLocaleString();
    document.getElementById("resReading").textContent = humanizeReadingTime(seconds);

    const excludeStopwords = document.getElementById("exclude-stopwords").checked;
    const keywords = topKeywords(data, excludeStopwords);
    renderNgramTables(visualizationElements.ngrams, data.ngram_data);
    document.getElementById("kwInfo").textContent = "Top " + keywords.length + " keywords (" + (excludeStopwords ? "excluding" : "including") + " stopwords)";
    const keywordRows = keywords.map(function (entry) {
      const row = document.createElement("tr");
      const wordCell = element("td", null, entry.word);
      wordCell.append(createUnscrambleButton(entry.word));
      row.append(wordCell, element("td", null, String(entry.count)), element("td", null, entry.density.toFixed(1) + "%"));
      bindKeywordRow(row, entry.word);
      return row;
    });
    document.getElementById("kwBody").replaceChildren(...keywordRows);
    if (lockedKeyword && !keywords.some(function (entry) { return entry.word === lockedKeyword; })) {
      lockedKeyword = null;
    }

    document.getElementById("readabilityFlesch").textContent = formatScore(data.readability_scores.flesch_kincaid);
    document.getElementById("readabilityFog").textContent = formatScore(data.readability_scores.gunning_fog);
    document.getElementById("readabilitySmog").textContent = formatScore(data.readability_scores.smog);
    document.getElementById("readabilityColeman").textContent = formatScore(data.readability_scores.coleman_liau);
    readabilitySection.style.display = "block";
    readabilitySection.querySelector(".analysis-card-grid").style.display = "grid";
    visualizationElements.section.style.display = data.word_count > 0 ? "block" : "none";
    exportSection.style.display = "block";
    renderer.render(data.visualization_data, data.char_count);
    if (lockedKeyword) drawFilteredDistribution(lockedKeyword);
  }

  textInput.addEventListener("input", updateMetrics);
  document.getElementById("wpm").addEventListener("input", updateMetrics);
  document.getElementById("wpmSlider").addEventListener("input", updateMetrics);
  document.getElementById("exclude-stopwords").addEventListener("change", updateMetrics);
  document.getElementById("clear-btn").addEventListener("click", updateMetrics);
  exportSection.addEventListener("click", function (event) {
    const button = event.target.closest("[data-export-format]");
    if (button && latestAnalysis) downloadReport(button.dataset.exportFormat, latestAnalysis);
  });
  updateMetrics();
}

export function runJavaScriptFallback(text, wpm, excludeStopwords) {
  return analyzeText(text, { wpm, excludeStopwords });
}
