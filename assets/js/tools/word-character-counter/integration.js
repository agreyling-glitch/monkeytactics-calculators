import { analyzeText, calculateReadability, detectAnalysisSupport, getSpeedProfile, getStopwords, humanizeReadingTime } from "/assets/js/tools/word-character-counter/word-counter.js?v=20260907-long-duration-1";
import { initWasmEngine, runWasmAnalysis } from "./wasm-engine.js?v=20260907-js-fallback-1";
import { analyzeTextWithJavaScript } from "./js-analyzer.js?v=20260907-js-fallback-1";
import { createVisualizationRenderer } from "./visualizations.js?v=20260906-density-width-1";
import {
  normalizeUnscrambleTerm, unscrambleLocal
} from "../word-unscrambler/embed-client.js?v=20260809-1";

let initialized = false;
let latestAnalysis = null;
const analyzerParityDebug = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]).has(window.location.hostname)
  && new URLSearchParams(window.location.search).get("analyzerDebug") === "parity";

function formatTiming(value) {
  return Number.isFinite(value) ? value.toFixed(2) + " ms" : "n/a";
}

function logAnalyzerDiagnostics(diagnostics) {
  if (!diagnostics) return;
  const timing = diagnostics.timings || {};
  const differenceCount = diagnostics.differences?.length || 0;
  console.groupCollapsed("[Analyzer parity] " + (diagnostics.match ? "Match" : "Mismatch — " + differenceCount + (diagnostics.truncated ? "+" : "") + " differences"));
  console.table({
    "WASM initialization": formatTiming(timing.wasmInitializationMs),
    "WASM analysis": formatTiming(timing.wasmMs),
    "JavaScript analysis": formatTiming(timing.javascriptMs),
    "JS − WASM": formatTiming(timing.deltaMs),
    "JS / WASM": Number.isFinite(timing.ratio) ? timing.ratio.toFixed(2) + "×" : "n/a"
  });
  console.log("Rolling median (" + timing.runs + " run" + (timing.runs === 1 ? "" : "s") + "): WASM "
    + formatTiming(timing.wasmMedianMs) + ", JavaScript " + formatTiming(timing.javascriptMedianMs));
  if (!diagnostics.match) console.table(diagnostics.differences);
  console.groupEnd();
}

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

function createReadabilitySection(container) {
  const section = element("section", {
    className: "readability-section text-insight-surface", id: "readabilitySection",
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
  container.append(section);
  return section;
}

function chartCard(title, id, label, explanation, hoverOnly, helpModal) {
  const descriptionId = id + "Description";
  const card = element("div", { className: "result-card structure-card" });
  if (helpModal) {
    const dialogId = id + "HelpDialog";
    const titleId = id + "HelpTitle";
    const helpButton = element("button", {
      className: "chart-help-button", type: "button", "aria-label": "About " + title,
      "aria-haspopup": "dialog", "aria-controls": dialogId
    }, "?");
    const dialog = element("dialog", {
      className: "chart-help-dialog result-card", id: dialogId, "aria-labelledby": titleId,
      "aria-describedby": descriptionId
    });
    const header = element("div", { className: "chart-help-dialog-header" });
    const close = element("button", {
      className: "btn-ghost chart-help-close", type: "button", "aria-label": "Close " + title + " help"
    }, "×");
    header.append(element("h3", { id: titleId }, title), close);
    dialog.append(header, element("p", { className: "metric-explanation", id: descriptionId }, explanation));
    helpButton.addEventListener("click", function () {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      close.focus({ preventScroll: true });
    });
    close.addEventListener("click", function () {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      helpButton.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) close.click();
    });
    card.append(helpButton, dialog);
  } else {
    if (!hoverOnly) card.append(element("div", { className: "result-label" }, title));
    card.append(element("p", {
      className: hoverOnly ? "chart-hover-description" : "metric-explanation",
      id: descriptionId
    }, hoverOnly ? title + ". " + explanation : explanation));
  }
  const canvas = element("canvas", {
    id, role: "img", "aria-label": label, "aria-describedby": descriptionId
  });
  if (hoverOnly) {
    canvas.tabIndex = 0;
    canvas.title = title + ": " + explanation;
  }
  canvas.dataset.height = hoverOnly ? "44" : "150";
  if (helpModal) {
    const zoomControls = element("div", { className: "chart-zoom-controls", role: "group", "aria-label": title + " zoom controls" });
    zoomControls.append(
      element("button", { className: "chart-zoom-button", type: "button", "data-chart-zoom": "out", "aria-label": "Zoom out " + title }, "−"),
      element("button", { className: "chart-zoom-fit", type: "button", "data-chart-zoom": "fit", "aria-label": "Fit all " + title }, "Fit"),
      element("button", { className: "chart-zoom-button", type: "button", "data-chart-zoom": "in", "aria-label": "Zoom in " + title }, "+")
    );
    const viewport = element("div", { className: "chart-scroll-viewport", tabindex: "0", "aria-label": title + " scroll area" });
    const spacer = element("div", { className: "chart-scroll-spacer", "aria-hidden": "true" });
    viewport.append(spacer, canvas);
    card.append(zoomControls, viewport);
  } else {
    card.append(canvas);
  }
  return { card, canvas };
}

function createNgramSection(container) {
  container.insertAdjacentHTML("beforeend", `
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

  const section = container.lastElementChild;
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

function renderNgramTables(containers, data, rowLimit = 10) {
  ["unigrams", "bigrams", "trigrams"].forEach(function (type) {
    const title = type[0].toUpperCase() + type.slice(1);
    const sorted = sortNgrams(data?.[type]);
    containers[type].fullData = sorted;
    renderNgramTable(containers[type].top, "Top " + title, sorted.slice(0, rowLimit));
  });
}

function createVisualizationSections(sentenceContainer, paragraphContainer, phrasesContainer, keywordTable) {
  const sentenceSection = element("section", {
    className: "keywords-section text-insight-surface", id: "sentenceRhythmSection",
    "aria-label": "Sentence rhythm analysis"
  });
  const paragraphSection = element("section", {
    className: "keywords-section text-insight-surface", id: "paragraphStructureSection",
    "aria-label": "Paragraph structure analysis"
  });
  sentenceSection.style.display = "none";
  paragraphSection.style.display = "none";
  const sentence = chartCard(
    "Sentence Rhythm", "sentenceRhythmCanvas", "Bar chart of sentence lengths in reading order",
    "Each bar is one sentence, and its height represents the character count. Look for isolated tall bars that may be hard to follow, or a run of similarly short bars that may sound choppy.",
    false, true
  );
  const paragraph = chartCard(
    "Paragraph Structure", "paragraphStructureCanvas", "Bar chart of paragraph lengths in reading order",
    "Each bar is one paragraph separated by a blank line, and its height represents the character count. Use it to spot long blocks that may need a break or very short paragraphs that could be combined.",
    false, true
  );
  const keywords = chartCard(
    "Keyword Distribution", "keywordDistributionCanvas", "Timeline of non-common keyword occurrences from the start to the end of the text",
    "The line runs from the start to the end of your text. Each colored tick marks a non-common word, and repeated words reuse the same color. Dense clusters can reveal repetition; large gaps can reveal uneven topic coverage. Compare the pattern with the keyword table above.",
    true
  );
  keywords.card.id = "keyword-distribution-container";
  sentenceSection.append(sentence.card);
  paragraphSection.append(paragraph.card);
  keywordTable.closest(".keywords-wrap").insertAdjacentElement("afterend", keywords.card);
  const ngrams = createNgramSection(phrasesContainer);
  sentenceContainer.append(sentenceSection);
  paragraphContainer.append(paragraphSection);
  return {
    sections: [sentenceSection, paragraphSection], sentenceCanvas: sentence.canvas,
    paragraphCanvas: paragraph.canvas, keywordCanvas: keywords.canvas, ngrams
  };
}

function renderReadability(section, data, text, support, languageSelection) {
  const cards = section.querySelector('.analysis-card-grid');
  const englishMetrics = support.language === 'english' ? [
    ['Flesch-Kincaid Grade', data.readability_scores.flesch_kincaid, 'Uses sentence length and estimated syllables per word.'],
    ['Gunning Fog Index', data.readability_scores.gunning_fog, 'Weights long sentences and complex words with three or more syllables.'],
    ['SMOG Grade', data.readability_scores.smog, 'Focuses on words with three or more syllables; it is most stable with 30 or more sentences.'],
    ['Coleman-Liau Index', data.readability_scores.coleman_liau, 'Uses letters per word and sentence length instead of estimating syllables.']
  ] : [];
  const metrics = englishMetrics.length ? englishMetrics : calculateReadability(text, data.sentence_count, languageSelection)
    .map(metric => [metric.label, metric.value, metric.explanation]);
  cards.replaceChildren(...metrics.map(function ([label, value, explanation], index) {
    return resultCard(label, 'readabilityMetric' + index, explanation);
  }));
  metrics.forEach(function (metric, index) {
    document.getElementById('readabilityMetric' + index).textContent = formatScore(metric[1]);
  });
  cards.style.display = metrics.length ? 'grid' : 'none';
}

function allKeywords(data, excludeStopwords, language) {
  const stopwords = getStopwords(language);
  const entries = Object.entries(data.ngram_data.unigrams)
    .map(function ([word, count]) {
      return { word, count, density: count / Math.max(1, data.word_count) * 100 };
    })
    .filter(function (entry) { return !excludeStopwords || !stopwords.has(entry.word); });
  return [...entries].sort(function (left, right) {
    return right.count - left.count || left.word.localeCompare(right.word);
  });
}

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

const sentenceAbbreviations = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "rev", "hon",
  "capt", "cmdr", "col", "gen", "lt", "sgt", "sen", "rep", "gov", "pres",
  "vs", "etc", "fig", "no", "dept", "est", "inc", "ltd", "co"
]);
const dottedSentenceAbbreviations = new Set(["a.m", "p.m", "e.g", "i.e", "u.s", "u.k"]);

function isSentenceTerminator(text, index) {
  const character = text[index];
  if (character !== ".") return /[!?。！？．｡؟।॥]/.test(character);
  if (/\d/.test(text[index - 1] || "") && /\d/.test(text[index + 1] || "")) return false;
  if (/\p{L}/u.test(text[index - 1] || "") && /\p{L}/u.test(text[index + 1] || "") && text[index + 2] === ".") return false;
  let precedingStart = index;
  while (precedingStart > 0 && /[\p{L}.]/u.test(text[precedingStart - 1])) precedingStart -= 1;
  const preceding = text.slice(precedingStart, index);
  const dottedAbbreviation = preceding.toLocaleLowerCase("en");
  if (dottedSentenceAbbreviations.has(dottedAbbreviation)) {
    if (dottedAbbreviation !== "a.m" && dottedAbbreviation !== "p.m") return false;
    let nextIndex = index + 1;
    while (nextIndex < text.length && /\s/u.test(text[nextIndex])) nextIndex += 1;
    const nextNonSpace = text[nextIndex] || "";
    return /[A-Z]/.test(nextNonSpace);
  }
  const finalWord = preceding.split(".").at(-1) || "";
  if (sentenceAbbreviations.has(finalWord.toLocaleLowerCase("en"))) return false;
  if (finalWord.length === 1 && /[A-Z]/.test(finalWord)) return false;
  return true;
}

function sentenceRanges(text) {
  const ranges = [];
  let start = -1;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (start < 0 && !/\s/.test(character)) start = index;
    if (start >= 0 && isSentenceTerminator(text, index)) {
      ranges.push({ start, end: index + 1 });
      start = -1;
    }
  }
  if (start >= 0) {
    let end = text.length;
    while (end > start && /\s/.test(text[end - 1])) end -= 1;
    if (end > start) ranges.push({ start, end });
  }
  return ranges;
}

function paragraphRanges(text) {
  const ranges = [];
  const linePattern = /[^\r\n]*(?:\r\n|\r|\n|$)/g;
  let paragraphStart = -1;
  let paragraphEnd = -1;
  for (const match of text.matchAll(linePattern)) {
    if (!match[0]) continue;
    const content = match[0].replace(/[\r\n]+$/, "");
    if (content.trim()) {
      if (paragraphStart < 0) paragraphStart = match.index + content.search(/\S/);
      paragraphEnd = match.index + content.trimEnd().length;
    } else if (paragraphStart >= 0) {
      ranges.push({ start: paragraphStart, end: paragraphEnd });
      paragraphStart = -1;
      paragraphEnd = -1;
    }
  }
  if (paragraphStart >= 0) ranges.push({ start: paragraphStart, end: paragraphEnd });
  return ranges;
}

function centerTextareaRange(textarea, index) {
  if (textarea.value.length > 100000) {
    const styles = getComputedStyle(textarea);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = styles.font;
    const sample = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const averageCharacterWidth = context.measureText(sample).width / sample.length || parseFloat(styles.fontSize) * 0.55;
    const contentWidth = textarea.clientWidth
      - (parseFloat(styles.paddingLeft) || 0)
      - (parseFloat(styles.paddingRight) || 0);
    const columns = Math.max(1, Math.floor(contentWidth / averageCharacterWidth));
    let completedRows = 0;
    let targetRows = 0;
    let lineLength = 0;
    const text = textarea.value;
    for (let offset = 0; offset <= text.length; offset += 1) {
      if (offset === index) {
        targetRows = completedRows + Math.floor(lineLength / columns);
      }
      const character = text[offset];
      if (offset === text.length || character === "\n") {
        completedRows += Math.max(1, Math.ceil(lineLength / columns));
        lineLength = 0;
      } else if (character !== "\r") {
        lineLength += character === "\t" ? 4 : 1;
      }
    }
    const progress = targetRows / Math.max(1, completedRows);
    textarea.scrollTop = Math.max(0, progress * textarea.scrollHeight - textarea.clientHeight / 2);
    return;
  }
  const styles = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  Object.assign(mirror.style, {
    position: "fixed", left: "-10000px", top: "0", visibility: "hidden",
    boxSizing: styles.boxSizing, width: textarea.getBoundingClientRect().width + "px",
    padding: styles.padding, border: styles.border, font: styles.font,
    letterSpacing: styles.letterSpacing, lineHeight: styles.lineHeight,
    whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: styles.wordBreak
  });
  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = textarea.value.slice(index, index + 1) || "\u200b";
  mirror.append(marker);
  document.body.append(mirror);
  const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2;
  textarea.scrollTop = Math.max(0, marker.offsetTop - textarea.clientHeight / 2 + lineHeight / 2);
  mirror.remove();
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
  const densityPanel = document.getElementById("analysis-panel-density");
  const keywordTable = document.getElementById("keyword-density-table");
  const clearKeywordSelection = document.getElementById("clear-keyword-selection");
  const phrasesPanel = document.getElementById("analysis-panel-phrases");
  const readabilityPanel = document.getElementById("text-insight-panel-readability");
  const sentencePanel = document.getElementById("text-insight-panel-sentence-rhythm");
  const paragraphPanel = document.getElementById("text-insight-panel-paragraph-structure");
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
    !textInput || !resultsPanel || !keywordSection || !keywordTable || !clearKeywordSelection || !phrasesPanel
    || !readabilityPanel || !sentencePanel || !paragraphPanel
    || !unscramblePopup || !popupClose || !popupWord
    || !popupStatus || !popupResults || !popupBody || !popupPagination
    || !popupPrevious || !popupNext || !popupPageStatus
  ) return;

  const readabilitySection = createReadabilitySection(readabilityPanel);
  const visualizationElements = createVisualizationSections(sentencePanel, paragraphPanel, phrasesPanel, keywordTable);
  let structureRepositionTimer = 0;
  visualizationElements.onSegmentSelect = function (type, index) {
    clearTimeout(structureRepositionTimer);
    const ranges = getStructureRanges(type);
    const range = ranges[index];
    if (!range) return;
    const selectedText = textInput.value.slice(range.start, range.end);
    const amount = type === "sentence"
      ? Array.from(selectedText).length
      : analyzeText(selectedText, { language: document.getElementById("analysis-language").value }).words;
    const unit = type === "sentence" ? (amount === 1 ? "character" : "characters") : (amount === 1 ? "word" : "words");
    const name = type === "sentence" ? "Sentence" : "Paragraph";
    textInput.focus({ preventScroll: true });
    textInput.setSelectionRange(range.start, range.end, "forward");
    window.dispatchEvent(new CustomEvent("structure-selection-change", {
      detail: { label: name + " " + (index + 1) + " of " + ranges.length + " · " + amount + " " + unit }
    }));
    window.dispatchEvent(new Event("text-editor-selection-change"));
    structureRepositionTimer = setTimeout(function () {
      structureRepositionTimer = 0;
      const bounds = textInput.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) {
        textInput.scrollIntoView({
          behavior: textInput.value.length > 100000 ? "auto" : "smooth",
          block: "center"
        });
      }
      centerTextareaRange(textInput, range.start);
    }, 300);
  };
  visualizationElements.onSegmentDeselect = function () {
    clearTimeout(structureRepositionTimer);
    structureRepositionTimer = 0;
    const caret = textInput.selectionEnd;
    textInput.setSelectionRange(caret, caret);
    window.dispatchEvent(new CustomEvent("structure-selection-change"));
    window.dispatchEvent(new Event("text-editor-selection-change"));
  };
  const renderer = createVisualizationRenderer(visualizationElements);
  const selectedKeywords = new Set();
  let analysisRevision = 0;
  const renderedRevision = { density: -1, phrases: -1, readability: -1, sentence: -1, paragraph: -1 };
  let supportCache = { text: null, languageSelection: null, value: null };

  function currentAnalysisSupport() {
    const text = textInput.value;
    const languageSelection = document.getElementById("analysis-language").value;
    if (supportCache.text !== text || supportCache.languageSelection !== languageSelection) {
      supportCache = { text, languageSelection, value: detectAnalysisSupport(text, languageSelection) };
    }
    return supportCache.value;
  }

  function invalidateRenderedViews(...views) {
    (views.length ? views : Object.keys(renderedRevision)).forEach(function (view) {
      renderedRevision[view] = -1;
    });
  }
  const structureRangeCache = { text: null, sentence: null, paragraph: null };
  let structureRangeWarmup = 0;
  function getStructureRanges(type) {
    const text = textInput.value;
    if (structureRangeCache.text !== text) {
      structureRangeCache.text = text;
      structureRangeCache.sentence = null;
      structureRangeCache.paragraph = null;
    }
    if (!structureRangeCache[type]) {
      structureRangeCache[type] = type === "sentence" ? sentenceRanges(text) : paragraphRanges(text);
    }
    return structureRangeCache[type];
  }
  function scheduleStructureRangeWarmup(text) {
    if (structureRangeWarmup) {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(structureRangeWarmup);
      else clearTimeout(structureRangeWarmup);
    }
    const warmRanges = function () {
      structureRangeWarmup = 0;
      if (text !== textInput.value) return;
      getStructureRanges("sentence");
      getStructureRanges("paragraph");
    };
    structureRangeWarmup = typeof requestIdleCallback === "function"
      ? requestIdleCallback(warmRanges, { timeout: 750 })
      : setTimeout(warmRanges, 0);
  }
  let keywordResizeTimer = null;
  let popupRequestId = 0;
  let popupReturnFocus = null;
  const popupPageSize = 15;
  let popupMatches = [];
  let popupPage = 0;

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
  if (selectedWordButton) {
    selectedWordButton.addEventListener("click", function () {
      const selected = textInput.value.slice(textInput.selectionStart, textInput.selectionEnd);
      openUnscramblePopup(selected, selectedWordButton);
    });
  }

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

  function selectedKeywordPositions() {
    return [...selectedKeywords].flatMap(getPositionsFor);
  }

  function restoreFullGraph() {
    if (!latestAnalysis) return;
    if (selectedKeywords.size) {
      renderer.drawKeywordDistribution(selectedKeywordPositions(), latestAnalysis.char_count);
    } else {
      drawFullDistribution();
    }
  }

  function keywordMarkerColor(word) {
    let hash = 0;
    for (let index = 0; index < word.length; index += 1) {
      hash = (hash * 31 + word.charCodeAt(index)) >>> 0;
    }
    return "hsl(" + (hash % 360) + " 70% 55%)";
  }

  function updateKeywordSelection() {
    document.querySelectorAll("#kwBody tr[data-keyword]").forEach(function (row) {
      const selected = selectedKeywords.has(row.dataset.keyword);
      row.classList.toggle("is-keyword-filtered", selected);
      row.setAttribute("aria-selected", String(selected));
      row.style.setProperty("--keyword-color", keywordMarkerColor(row.dataset.keyword));
    });
    clearKeywordSelection.hidden = selectedKeywords.size === 0;
  }

  function bindKeywordRow(row, word) {
    row.dataset.keyword = word;
    row.tabIndex = 0;
    row.setAttribute("aria-selected", "false");
    row.addEventListener("mouseenter", function () {
      if (!selectedKeywords.size) {
        renderer.drawKeywordDistribution(getPositionsFor(word), latestAnalysis.char_count);
      }
    });
    row.addEventListener("mouseleave", restoreFullGraph);
    row.addEventListener("click", function () {
      if (selectedKeywords.has(word)) selectedKeywords.delete(word);
      else if (selectedKeywords.size < 8) selectedKeywords.add(word);
      restoreFullGraph();
      updateKeywordSelection();
    });
    row.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      row.click();
    });
  }

  clearKeywordSelection.addEventListener("click", function () {
    selectedKeywords.clear();
    drawFullDistribution();
    updateKeywordSelection();
  });

  function keywordRowLimit() {
    const widget = keywordSection.closest(".tool-widget");
    if (!widget.classList.contains("is-focus-mode")) return 10;
    return Number.POSITIVE_INFINITY;
  }

  function phraseRowLimit() {
    const panel = document.getElementById("analysis-panel-phrases");
    if (!panel.closest(".tool-widget").classList.contains("is-focus-mode") || panel.hidden) return 10;
    const top = panel.querySelector(".ngram-group:not([hidden]) .ngram-top");
    if (!top || top.clientHeight < 1) return 10;
    const table = top.querySelector("table");
    const headerHeight = table?.tHead?.getBoundingClientRect().height || 36;
    const rowHeight = table?.tBodies[0]?.rows[0]?.getBoundingClientRect().height || 38;
    return Math.max(10, Math.floor((top.clientHeight - headerHeight) / rowHeight));
  }

  function renderPhraseRows() {
    if (!latestAnalysis) return;
    renderNgramTables(visualizationElements.ngrams, latestAnalysis.ngram_data, phraseRowLimit());
  }

  function renderKeywordRows() {
    if (!latestAnalysis) return;
    const stopwordControl = document.getElementById("exclude-stopwords");
    const excludeStopwords = stopwordControl.checked && !stopwordControl.disabled;
    const language = currentAnalysisSupport().language;
    const available = allKeywords(latestAnalysis, excludeStopwords, language);
    const keywords = available.slice(0, keywordRowLimit());
    document.getElementById("kwInfo").textContent = "Top " + keywords.length + " keywords (" + (excludeStopwords ? "excluding" : "including") + " stopwords)";
    const keywordRows = keywords.map(function (entry) {
      const row = document.createElement("tr");
      const wordCell = element("td", null, entry.word);
      row.append(wordCell, element("td", null, String(entry.count)), element("td", null, entry.density.toFixed(1) + "%"));
      bindKeywordRow(row, entry.word);
      return row;
    });
    document.getElementById("kwBody").replaceChildren(...keywordRows);
    const availableWords = new Set(available.map(function (entry) { return entry.word; }));
    selectedKeywords.forEach(function (word) {
      if (!availableWords.has(word)) selectedKeywords.delete(word);
    });
    updateKeywordSelection();
  }

  window.addEventListener("resize", function () {
    if (!latestAnalysis) return;
    clearTimeout(keywordResizeTimer);
    keywordResizeTimer = setTimeout(function () {
      if (!document.getElementById("analysis-panel-density").hidden) renderKeywordRows();
      if (!document.getElementById("analysis-panel-phrases").hidden) renderPhraseRows();
    }, 120);
  });

  visualizationElements.keywordCanvas.addEventListener("click", function () {
    if (!selectedKeywords.size) return;
    selectedKeywords.clear();
    drawFullDistribution();
    updateKeywordSelection();
  });

  let analysisWorker = null;
  let workerUnavailable = false;
  let analysisTimer = 0;
  let latestRequestId = 0;
  let pendingText = "";
  const baseAnalysisDelay = 220;
  const largeDocumentCharacterThreshold = 250_000;
  const veryLargeDocumentCharacterThreshold = 1_000_000;

  function analysisDelayFor(text) {
    if (text.length >= veryLargeDocumentCharacterThreshold) return 700;
    if (text.length >= largeDocumentCharacterThreshold) return 450;
    return baseAnalysisDelay;
  }

  function renderActiveViews() {
    if (!latestAnalysis) return;
    const readabilityNotice = document.getElementById("readability-language-notice");
    let renderVisualization = false;
    if (!phrasesPanel.hidden && renderedRevision.phrases !== analysisRevision) {
      renderPhraseRows();
      renderedRevision.phrases = analysisRevision;
    }
    if (!densityPanel.hidden && renderedRevision.density !== analysisRevision) {
      keywordSection.hidden = false;
      renderKeywordRows();
      renderedRevision.density = analysisRevision;
      renderVisualization = true;
    }
    if (!readabilityPanel.hidden && renderedRevision.readability !== analysisRevision) {
      const text = textInput.value;
      const languageSelection = document.getElementById("analysis-language").value;
      const support = currentAnalysisSupport();
      renderReadability(readabilitySection, latestAnalysis, text, support, languageSelection);
      if (readabilityNotice) readabilityNotice.hidden = !text.trim() || support.readabilitySupported;
      readabilitySection.style.display = "block";
      readabilitySection.querySelector(".analysis-card-grid").style.display = "grid";
      renderedRevision.readability = analysisRevision;
    }
    visualizationElements.sections.forEach(function (section) {
      section.style.display = latestAnalysis.word_count > 0 ? "block" : "none";
    });
    if (!sentencePanel.hidden && renderedRevision.sentence !== analysisRevision) {
      renderedRevision.sentence = analysisRevision;
      renderVisualization = true;
    }
    if (!paragraphPanel.hidden && renderedRevision.paragraph !== analysisRevision) {
      renderedRevision.paragraph = analysisRevision;
      renderVisualization = true;
    }
    if (renderVisualization) {
      renderer.render(latestAnalysis.visualization_data, latestAnalysis.char_count);
      if (!densityPanel.hidden && selectedKeywords.size) restoreFullGraph();
    }
  }

  function applyAnalysisResult(id, text, data) {
    if (id !== latestRequestId || text !== pendingText || text !== textInput.value) return;
    latestAnalysis = data;
    analysisRevision += 1;
    invalidateRenderedViews();
    supportCache.text = null;
    renderActiveViews();
    scheduleStructureRangeWarmup(text);
  }

  async function runFallbackAnalysis(id, text) {
    const wasmReady = await initWasmEngine();
    if (id !== latestRequestId || text !== textInput.value) return;
    let data;
    if (wasmReady) {
      const result = runWasmAnalysis(text);
      if (result) {
        data = result.toJSON();
        result.free();
      }
    }
    if (!data) {
      data = analyzeTextWithJavaScript(text);
      console.warn("WASM analyzer unavailable; using the JavaScript analyzer on the main thread.");
    }
    applyAnalysisResult(id, text, data);
  }

  function useFallback(id, text) {
    if (analysisWorker) analysisWorker.terminate();
    analysisWorker = null;
    workerUnavailable = true;
    runFallbackAnalysis(id, text);
  }

  function ensureAnalysisWorker() {
    if (analysisWorker || workerUnavailable) return analysisWorker;
    try {
      const workerUrl = new URL("./analysis-worker.js?v=20260907-debug-flag-1", import.meta.url);
      if (analyzerParityDebug) workerUrl.searchParams.set("parity", "1");
      analysisWorker = new Worker(
        workerUrl,
        { type: "module" },
      );
      analysisWorker.addEventListener("message", function (event) {
        const { id, data, error, diagnostics, engine, fallbackReason, timings } = event.data || {};
        if (id !== latestRequestId) return;
        if (error) {
          useFallback(id, pendingText);
          return;
        }
        logAnalyzerDiagnostics(diagnostics);
        if (engine === "javascript" && fallbackReason) {
          console.warn("WASM analyzer unavailable; Worker used the JavaScript fallback.", {
            reason: fallbackReason,
            wasmInitialization: formatTiming(timings?.wasmInitializationMs),
            javascriptAnalysis: formatTiming(timings?.javascriptMs)
          });
        }
        applyAnalysisResult(id, pendingText, data);
      });
      analysisWorker.addEventListener("error", function () {
        useFallback(latestRequestId, pendingText);
      }, { once: true });
    } catch (_) {
      workerUnavailable = true;
    }
    return analysisWorker;
  }

  function clearHeavyAnalysis() {
    latestAnalysis = null;
    invalidateRenderedViews();
    supportCache.text = null;
    keywordSection.hidden = true;
    structureRangeCache.text = null;
    structureRangeCache.sentence = null;
    structureRangeCache.paragraph = null;
    const readabilityNotice = document.getElementById("readability-language-notice");
    if (readabilityNotice) readabilityNotice.hidden = true;
    readabilitySection.querySelector(".analysis-card-grid").style.display = "none";
    visualizationElements.sections.forEach(function (section) { section.style.display = "none"; });
    selectedKeywords.clear();
    updateKeywordSelection();
  }

  function scheduleHeavyAnalysis() {
    clearTimeout(analysisTimer);
    const text = textInput.value;
    pendingText = text;
    const id = ++latestRequestId;
    if (!text.trim()) {
      clearHeavyAnalysis();
      return;
    }
    analysisTimer = setTimeout(function () {
      const worker = ensureAnalysisWorker();
      if (worker) worker.postMessage({ id, text });
      else runFallbackAnalysis(id, text);
    }, analysisDelayFor(text));
  }

  textInput.addEventListener("input", function () {
    clearTimeout(structureRepositionTimer);
    structureRepositionTimer = 0;
    renderer.clearBarSelection?.();
    window.dispatchEvent(new CustomEvent("structure-selection-change"));
    scheduleHeavyAnalysis();
  });
  textInput.addEventListener("pointerdown", function () {
    clearTimeout(structureRepositionTimer);
    structureRepositionTimer = 0;
    renderer.clearBarSelection?.();
    window.dispatchEvent(new CustomEvent("structure-selection-change"));
  });
  document.getElementById("exclude-stopwords").addEventListener("change", function () {
    invalidateRenderedViews("density");
    renderActiveViews();
  });
  document.getElementById("analysis-language").addEventListener("change", function () {
    supportCache.text = null;
    invalidateRenderedViews("density", "readability");
    scheduleHeavyAnalysis();
    renderActiveViews();
  });
  document.querySelectorAll(".analysis-tab, .text-insight-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { requestAnimationFrame(renderActiveViews); });
  });
  scheduleHeavyAnalysis();
}

export function runJavaScriptFallback(text, wpm, excludeStopwords) {
  return analyzeText(text, { wpm, excludeStopwords });
}
