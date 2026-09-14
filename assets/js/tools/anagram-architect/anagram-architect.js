import { filterAndPageResults, formatAnagramPhrase, isExactAnagram, mergeRankedResults, normalizeLetters, rankPhrasePermutations, rankWordReplacements } from "./anagram-core.mjs";

const form = document.querySelector("#anagram-form");
const input = document.querySelector("#anagram-input");
const results = document.querySelector("#anagram-results");
const status = document.querySelector("#anagram-status");
const summary = document.querySelector("#anagram-summary");
const submit = document.querySelector("#anagram-submit");
const clear = document.querySelector("#anagram-clear");
const maxWords = document.querySelector("#anagram-max-words");
const minimumLength = document.querySelector("#anagram-min-length");
const dictionary = document.querySelector("#anagram-dictionary");
const searchMode = document.querySelector("#anagram-search-mode");
const phrasePattern = document.querySelector("#anagram-phrase-pattern");
const grammarTemplate = document.querySelector("#anagram-grammar-template");
const lockedWords = document.querySelector("#anagram-locked-words");
const preferredWords = document.querySelector("#anagram-preferred-words");
const excludedWords = document.querySelector("#anagram-excluded-words");
const excludeVulgar = document.querySelector("#anagram-exclude-vulgar");
const pickList = document.querySelector("#anagram-pick-list");
const pickCount = document.querySelector("#anagram-pick-count");
const pickClear = document.querySelector("#anagram-pick-clear");
const pickEmpty = document.querySelector("#anagram-pick-empty");
const pickEntriesElement = document.querySelector("#anagram-pick-entries");
const resultTools = document.querySelector("#anagram-result-tools");
const resultSearch = document.querySelector("#anagram-result-search");
const pageSummary = document.querySelector("#anagram-page-summary");
const previousPage = document.querySelector("#anagram-previous-page");
const nextPage = document.querySelector("#anagram-next-page");
const progressModal = document.querySelector("#anagram-progress-modal");
const progressMessage = document.querySelector("#anagram-progress-message");
const progressBar = progressModal.querySelector('[role="progressbar"]');
const progressFill = progressBar.querySelector("span");
const progressCancel = document.querySelector("#anagram-progress-cancel");
const progressBackground = document.querySelector("#anagram-progress-background");
const progressKicker = document.querySelector("#anagram-progress-kicker");
const progressDetail = document.querySelector("#anagram-progress-detail");
const progressPreview = document.querySelector("#anagram-progress-preview");
const validationModal = document.querySelector("#anagram-validation-modal");
const validationTitle = document.querySelector("#anagram-validation-title");
const validationMessage = document.querySelector("#anagram-validation-message");
const validationClose = document.querySelector("#anagram-validation-close");
const pickDrawerBackdrop = document.querySelector("#anagram-pick-drawer-backdrop");
const pickDrawer = document.querySelector("#anagram-pick-drawer");
const pickDrawerClose = document.querySelector("#anagram-pick-drawer-close");
const pickDrawerPreview = document.querySelector("#anagram-pick-drawer-preview");
const pickDrawerContext = document.querySelector("#anagram-pick-drawer-context");
const pickDrawerTabs = document.querySelector("#anagram-pick-drawer-tabs");
const pickDrawerContent = document.querySelector("#anagram-pick-drawer-content");
const analysis = document.querySelector("#anagram-analysis");
const analysisPhase = document.querySelector("#anagram-analysis-phase");
const analysisProgress = analysis.querySelector('[role="progressbar"]');
const analysisProgressFill = analysisProgress.querySelector("span");
const metricProgress = document.querySelector("#anagram-metric-progress");
const metricRate = document.querySelector("#anagram-metric-rate");
const metricMatches = document.querySelector("#anagram-metric-matches");
const metricRetained = document.querySelector("#anagram-metric-retained");
const workerLanes = document.querySelector("#anagram-worker-lanes");
const throughputChart = document.querySelector("#anagram-throughput-chart");
const throughputRate = document.querySelector("#anagram-throughput-rate");
const currentLeader = document.querySelector("#anagram-current-leader");
const analysisFoot = document.querySelector("#anagram-analysis-foot");
const analysisCancel = document.querySelector("#anagram-analysis-cancel");
const examples = document.querySelectorAll("[data-anagram-example]");
const inputClearButtons = document.querySelectorAll("[data-clear-input]");
const PAGE_SIZE = 120;
const PICK_STORAGE_KEY = "monkeytactics.anagram-architect.pick-list.v1";
let currentSource = "";
let allResults = [];
let currentPage = 1;
let activeSearch = null;
let telemetryStarted = 0;
let throughputSamples = [];
let pickEntries = readPickList();
const pickDictionaryPromises = new Map();

form.dataset.architectReady = "true";

function syncInputClearButtons() {
  inputClearButtons.forEach((button) => {
    const field = document.getElementById(button.dataset.clearInput);
    button.hidden = !field?.value;
  });
}

inputClearButtons.forEach((button) => {
  const field = document.getElementById(button.dataset.clearInput);
  field?.addEventListener("input", syncInputClearButtons);
  button.addEventListener("click", () => {
    field.value = "";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.focus();
  });
});

function readPickList() {
  try {
    const value = JSON.parse(localStorage.getItem(PICK_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((entry) => entry && typeof entry.phrase === "string").slice(0, 100) : [];
  } catch { return []; }
}

function savePickList() {
  localStorage.setItem(PICK_STORAGE_KEY, JSON.stringify(pickEntries));
}

function isPicked(phrase) { return pickEntries.some((entry) => entry.phrase.toLowerCase() === phrase.toLowerCase()); }

const GRAMMAR_TEMPLATE_LITERALS = {
  "noun-of-noun": ["of"],
  "verb-the-noun": ["the"],
  "adjective-noun": [],
  "noun-in-the-noun": ["in", "the"]
};

function containsRequiredLetters(source, requiredWords) {
  const available = new Map();
  for (const letter of normalizeLetters(source)) available.set(letter, (available.get(letter) || 0) + 1);
  for (const letter of normalizeLetters(requiredWords.join(""))) {
    const count = available.get(letter) || 0;
    if (!count) return false;
    available.set(letter, count - 1);
  }
  return true;
}

function lockedPositionSet(entry) {
  const wordCount = (entry.phrase.match(/[a-z]+/gi) || []).length;
  return new Set((Array.isArray(entry.lockedPositions) ? entry.lockedPositions : [])
    .map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < wordCount));
}

function buildPanelCloseButton(panel, label) {
  const close = document.createElement("button"); close.type = "button"; close.className = "anagram-pick-panel-close"; close.textContent = "×"; close.setAttribute("aria-label", label);
  close.addEventListener("click", () => panel.dispatchEvent(new Event("anagramclose")));
  return close;
}

async function decodeDictionaryResponse(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
  if (!("DecompressionStream" in window)) throw new Error("This browser cannot open the compressed local dictionary.");
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

function loadPickDictionary(kind) {
  if (pickDictionaryPromises.has(kind)) return pickDictionaryPromises.get(kind);
  const promise = (async () => {
    const manifestName = kind === "expanded" ? "manifest.wiktionary-v1.json" : "manifest.enable-v1.json";
    const response = await fetch(`/assets/data/words/${manifestName}`);
    if (!response.ok) throw new Error("The local dictionary manifest could not be loaded.");
    const manifest = await response.json();
    const chunks = await Promise.all(Object.values(manifest.chunks).map(async ({ file }) => {
      const chunkResponse = await fetch(`/assets/data/words/${file}`);
      if (!chunkResponse.ok) throw new Error("A local dictionary file could not be loaded.");
      return decodeDictionaryResponse(chunkResponse);
    }));
    return chunks.flatMap((text) => text.split(/\r?\n/).map((line) => line.split("\t", 1)[0]).filter(Boolean));
  })();
  pickDictionaryPromises.set(kind, promise);
  promise.catch(() => pickDictionaryPromises.delete(kind));
  return promise;
}

function buildPermutationPanel(entry) {
  let alternatives = [];
  const locked = lockedPositionSet(entry);
  const words = entry.phrase.toLowerCase().match(/[a-z]+/g) || [];
  const panel = document.createElement("div"); panel.className = "anagram-pick-permutations"; panel.hidden = true;
  const close = buildPanelCloseButton(panel, "Close reorder mode");
  const heading = document.createElement("strong");
  const hint = document.createElement("small"); hint.textContent = "Lock words in place or choose a different ranked ordering.";
  const lockControls = document.createElement("div"); lockControls.className = "anagram-pick-locks"; lockControls.setAttribute("aria-label", "Lock words in position");
  const select = document.createElement("select"); select.size = Math.min(6, alternatives.length); select.setAttribute("aria-label", `Word-order alternatives for ${entry.phrase}`);
  const refreshAlternatives = () => {
    alternatives = rankPhrasePermutations(entry.phrase, 720, [...locked]);
    heading.textContent = `${alternatives.length} distinct word-order alternative${alternatives.length === 1 ? "" : "s"}${locked.size ? ` · ${locked.size} word${locked.size === 1 ? "" : "s"} locked` : ""}`;
    select.replaceChildren(...alternatives.map((alternative) => { const option = document.createElement("option"); option.value = alternative.phrase; option.textContent = `#${alternative.rank} ${titleCase(alternative.phrase)}`; return option; }));
    select.size = Math.min(6, alternatives.length);
    select.value = entry.phrase.toLowerCase();
  };
  words.forEach((word, index) => {
    const button = document.createElement("button"); button.type = "button";
    const refreshButton = () => { const isLocked = locked.has(index); button.setAttribute("aria-pressed", String(isLocked)); button.textContent = `${isLocked ? "🔒" : "○"} ${titleCase(word)}`; button.setAttribute("aria-label", `${isLocked ? "Unlock" : "Lock"} ${word} in position ${index + 1}`); };
    button.addEventListener("click", () => { if (locked.has(index)) locked.delete(index); else locked.add(index); entry.lockedPositions = [...locked].sort((left, right) => left - right); savePickList(); refreshButton(); refreshAlternatives(); });
    refreshButton(); lockControls.append(button);
  });
  refreshAlternatives();
  const actions = document.createElement("div"); actions.className = "anagram-pick-permutation-actions";
  const use = document.createElement("button"); use.type = "button"; use.textContent = "Use this order";
  use.addEventListener("click", () => {
    const selectedPhrase = select.value || entry.phrase;
    if (!alternatives.some(({ phrase }) => phrase === selectedPhrase)) return;
    entry.phrase = selectedPhrase;
    panel.dispatchEvent(new Event("anagramentrychange"));
    savePickList(); renderPickList(); renderResults();
  });
  actions.append(use);
  panel.append(close, heading, hint, lockControls, select, actions);
  return panel;
}

function buildFormatPanel(entry) {
  const panel = document.createElement("div"); panel.className = "anagram-pick-format"; panel.hidden = true;
  const close = buildPanelCloseButton(panel, "Close format mode");
  const heading = document.createElement("strong"); heading.textContent = "Style capitalization and punctuation";
  const hint = document.createElement("small"); hint.textContent = "Formatting never changes the letters in the underlying anagram.";
  const options = { caseMode: "title", separator: "space", ending: "", boundaryIndex: "", boundaryMark: "comma", ...(entry.formatOptions || {}) };
  const preview = document.createElement("strong"); preview.className = "anagram-pick-format-preview";
  const feedback = document.createElement("small"); feedback.className = "anagram-pick-permutation-feedback"; feedback.setAttribute("aria-live", "polite");
  const saveOptions = () => {
    entry.formatOptions = { ...options };
    savePickList();
    preview.textContent = formatAnagramPhrase(entry.phrase, options);
    panel.dispatchEvent(new CustomEvent("anagramformatchange", { detail: { formattedPhrase: preview.textContent } }));
  };
  const makeButtonGroup = (label, choices, key) => {
    const group = document.createElement("div"); group.className = "anagram-pick-format-group"; group.setAttribute("aria-label", label);
    choices.forEach(([value, text]) => { const button = document.createElement("button"); button.type = "button"; button.textContent = text; button.dataset.optionKey = key; button.dataset.optionValue = value; const refresh = () => button.setAttribute("aria-pressed", String(options[key] === value)); button.addEventListener("click", () => { options[key] = value; [...group.children].forEach((child) => child.setAttribute("aria-pressed", "false")); refresh(); saveOptions(); }); refresh(); group.append(button); });
    return group;
  };
  const caseLabel = document.createElement("small"); caseLabel.textContent = "Capitalization";
  const caseModes = makeButtonGroup("Capitalization presets", [["title", "Title Case"], ["sentence", "Sentence case"], ["upper", "ALL CAPS"], ["name", "Name Case"], ["lower", "lowercase"]], "caseMode");
  const separatorLabel = document.createElement("small"); separatorLabel.textContent = "Word separator";
  const separators = makeButtonGroup("Word separator", [["space", "Spaces"], ["hyphen", "Hyphens"], ["emDash", "Em dashes"]], "separator");
  const endingLabel = document.createElement("small"); endingLabel.textContent = "Ending";
  const endings = makeButtonGroup("Ending punctuation", [["", "None"], [".", "."], ["?", "?"], ["!", "!"]], "ending");
  const breakControls = document.createElement("div"); breakControls.className = "anagram-pick-format-selects";
  const boundary = document.createElement("select"); boundary.setAttribute("aria-label", "Insert punctuation after word");
  const noBoundary = document.createElement("option"); noBoundary.value = ""; noBoundary.textContent = "No internal break"; boundary.append(noBoundary);
  (entry.phrase.match(/[a-z]+/gi) || []).slice(0, -1).forEach((word, index) => { const option = document.createElement("option"); option.value = String(index); option.textContent = `Break after ${titleCase(word)}`; boundary.append(option); });
  boundary.value = String(options.boundaryIndex ?? "");
  const boundaryMark = document.createElement("select"); boundaryMark.setAttribute("aria-label", "Internal punctuation mark");
  [["comma", "Comma"], ["colon", "Colon"], ["emDash", "Em dash"]].forEach(([value, text]) => { const option = document.createElement("option"); option.value = value; option.textContent = text; boundaryMark.append(option); });
  boundaryMark.value = options.boundaryMark;
  boundary.addEventListener("change", () => { options.boundaryIndex = boundary.value; saveOptions(); });
  boundaryMark.addEventListener("change", () => { options.boundaryMark = boundaryMark.value; saveOptions(); });
  breakControls.append(boundary, boundaryMark);
  const actions = document.createElement("div"); actions.className = "anagram-pick-permutation-actions";
  const reset = document.createElement("button"); reset.type = "button"; reset.textContent = "Reset formatting"; reset.addEventListener("click", () => { Object.assign(options, { caseMode: "title", separator: "space", ending: "", boundaryIndex: "", boundaryMark: "comma" }); boundary.value = ""; boundaryMark.value = "comma"; panel.querySelectorAll("[data-option-key]").forEach((button) => button.setAttribute("aria-pressed", String(options[button.dataset.optionKey] === button.dataset.optionValue))); saveOptions(); renderResults(); });
  const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy formatted"; copy.addEventListener("click", async () => { const formatted = formatAnagramPhrase(entry.phrase, options); if (!isExactAnagram(entry.phrase, formatted)) return; await navigator.clipboard.writeText(formatted); feedback.textContent = "Copied formatted phrase."; });
  actions.append(reset, copy); saveOptions();
  panel.append(close, heading, hint, caseLabel, caseModes, separatorLabel, separators, endingLabel, endings, breakControls, preview, actions, feedback);
  return panel;
}

function buildWordSwapPanel(entry) {
  const panel = document.createElement("div"); panel.className = "anagram-pick-swaps"; panel.hidden = true;
  const close = buildPanelCloseButton(panel, "Close word swap mode");
  const heading = document.createElement("strong"); heading.textContent = "Choose the word that feels wrong";
  const hint = document.createElement("small"); hint.textContent = "Exact-letter replacements keep the complete phrase a valid anagram.";
  const wordButtons = document.createElement("div"); wordButtons.className = "anagram-pick-word-buttons";
  const replacement = document.createElement("select"); replacement.hidden = true; replacement.setAttribute("aria-label", "Exact-letter replacement words");
  const preview = document.createElement("strong"); preview.className = "anagram-pick-swap-preview"; preview.textContent = titleCase(entry.phrase);
  const feedback = document.createElement("small"); feedback.className = "anagram-pick-permutation-feedback"; feedback.setAttribute("aria-live", "polite");
  const use = document.createElement("button"); use.type = "button"; use.textContent = "Use replacement"; use.disabled = true;
  let alternatives = [];
  const locked = lockedPositionSet(entry);
  (entry.phrase.toLowerCase().match(/[a-z]+/g) || []).forEach((word, wordIndex) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = titleCase(word); button.setAttribute("aria-pressed", "false");
    button.disabled = locked.has(wordIndex);
    if (button.disabled) { button.textContent = `🔒 ${titleCase(word)}`; button.setAttribute("aria-label", `${word} is locked in position ${wordIndex + 1}`); }
    button.addEventListener("click", async () => {
      const wasSelected = button.getAttribute("aria-pressed") === "true";
      [...wordButtons.children].forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
      if (wasSelected) {
        button.setAttribute("aria-pressed", "false");
        replacement.hidden = true; replacement.value = ""; use.disabled = true;
        preview.textContent = titleCase(entry.phrase); feedback.textContent = "Choose a word to see exact-letter alternatives.";
        return;
      }
      replacement.hidden = true; use.disabled = true; preview.textContent = titleCase(entry.phrase); feedback.textContent = `Loading ${dictionary.value} dictionary alternatives for ${word}…`;
      try {
        alternatives = rankWordReplacements(entry.phrase, wordIndex, await loadPickDictionary(dictionary.value));
        replacement.replaceChildren();
        const prompt = document.createElement("option"); prompt.value = ""; prompt.textContent = alternatives.length ? "Select a replacement" : "No exact-letter alternatives"; prompt.selected = true; replacement.append(prompt);
        alternatives.forEach((alternative) => { const option = document.createElement("option"); option.value = alternative.phrase; option.textContent = `#${alternative.rank} ${titleCase(alternative.word)} — ${titleCase(alternative.phrase)}`; replacement.append(option); });
        replacement.hidden = false; feedback.textContent = alternatives.length ? `${alternatives.length} exact-letter alternative${alternatives.length === 1 ? "" : "s"}` : `No other ${dictionary.value} dictionary words use exactly those letters.`;
      } catch (error) { feedback.textContent = error instanceof Error ? error.message : "The local dictionary could not be loaded."; }
    });
    wordButtons.append(button);
  });
  replacement.addEventListener("change", () => { const selected = alternatives.find(({ phrase }) => phrase === replacement.value); preview.textContent = titleCase(selected?.phrase || entry.phrase); use.disabled = !selected; });
  use.addEventListener("click", () => {
    const selected = alternatives.find(({ phrase }) => phrase === replacement.value);
    if (!selected || !isExactAnagram(entry.phrase, selected.phrase)) return;
    entry.phrase = selected.phrase; panel.dispatchEvent(new Event("anagramentrychange")); savePickList(); renderPickList(); renderResults();
  });
  const actions = document.createElement("div"); actions.className = "anagram-pick-permutation-actions"; actions.append(use);
  panel.append(close, heading, hint, wordButtons, replacement, preview, actions, feedback);
  return panel;
}

function closePickDrawer() {
  if (pickDrawerBackdrop.hidden) return;
  pickDrawerBackdrop.hidden = true;
  document.body.classList.remove("anagram-pick-drawer-open");
  const returnFocus = pickDrawerBackdrop._returnFocus;
  pickDrawerBackdrop._returnFocus = null;
  returnFocus?.focus({ preventScroll: true });
}

function openPickDrawer(entry, returnFocus, rowPhrase) {
  const panels = [
    ["Arrange", buildPermutationPanel(entry)],
    ["Words", buildWordSwapPanel(entry)],
    ["Style", buildFormatPanel(entry)]
  ];
  pickDrawerPreview.textContent = formatAnagramPhrase(entry.phrase, entry.formatOptions);
  pickDrawerContext.textContent = `From ${entry.source}${entry.rank ? ` · rank #${entry.rank}` : ""}`;
  const activate = (activeIndex) => {
    [...pickDrawerTabs.children].forEach((button, index) => button.setAttribute("aria-selected", String(index === activeIndex)));
    panels.forEach(([, panel], index) => { panel.hidden = index !== activeIndex; });
  };
  const tabs = panels.map(([label], index) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.setAttribute("role", "tab");
    button.addEventListener("click", () => activate(index));
    return button;
  });
  panels.forEach(([, panel]) => {
    panel.addEventListener("anagramformatchange", ({ detail }) => { pickDrawerPreview.textContent = detail.formattedPhrase; rowPhrase.textContent = detail.formattedPhrase; });
    panel.addEventListener("anagramentrychange", closePickDrawer);
  });
  pickDrawerTabs.replaceChildren(...tabs);
  pickDrawerContent.replaceChildren(...panels.map(([, panel]) => panel));
  activate(0);
  pickDrawerBackdrop._returnFocus = returnFocus;
  pickDrawerBackdrop.hidden = false;
  document.body.classList.add("anagram-pick-drawer-open");
  pickDrawerClose.focus({ preventScroll: true });
}

pickDrawerClose.addEventListener("click", closePickDrawer);
pickDrawerBackdrop.addEventListener("click", (event) => { if (event.target === pickDrawerBackdrop) closePickDrawer(); });
pickDrawer.addEventListener("keydown", (event) => { if (event.key === "Escape") closePickDrawer(); });

function renderPickList() {
  pickCount.textContent = `${pickEntries.length} ${pickEntries.length === 1 ? "pick" : "picks"}`;
  pickClear.disabled = pickEntries.length === 0;
  pickEmpty.hidden = pickEntries.length > 0;
  const fragment = document.createDocumentFragment();
  pickEntries.forEach((entry) => {
    const row = document.createElement("div"); row.className = "anagram-pick-entry";
    const phrase = document.createElement("strong"); phrase.textContent = formatAnagramPhrase(entry.phrase, entry.formatOptions);
    const context = document.createElement("small"); context.textContent = `From ${entry.source}${entry.rank ? ` · rank #${entry.rank}` : ""}`;
    const actions = document.createElement("div"); actions.className = "anagram-pick-entry-actions";
    const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy"; copy.setAttribute("aria-label", `Copy ${entry.phrase}`);
    copy.addEventListener("click", async () => { await navigator.clipboard.writeText(formatAnagramPhrase(entry.phrase, entry.formatOptions)); copy.textContent = "Copied"; setTimeout(() => { copy.textContent = "Copy"; }, 1200); });
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Edit"; edit.setAttribute("aria-haspopup", "dialog"); edit.setAttribute("aria-label", `Edit ${entry.phrase}`);
    edit.addEventListener("click", () => openPickDrawer(entry, edit, phrase));
    const moreWrap = document.createElement("span"); moreWrap.className = "anagram-pick-more";
    const more = document.createElement("button"); more.type = "button"; more.textContent = "⋯"; more.setAttribute("aria-label", `More actions for ${entry.phrase}`); more.setAttribute("aria-expanded", "false");
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Remove"; remove.setAttribute("aria-label", `Remove ${entry.phrase} from the Pick List`);
    remove.addEventListener("click", () => { pickEntries = pickEntries.filter((candidate) => candidate.phrase.toLowerCase() !== entry.phrase.toLowerCase()); savePickList(); renderPickList(); renderResults(); });
    remove.hidden = true;
    more.addEventListener("click", () => { const opening = remove.hidden; remove.hidden = !opening; more.setAttribute("aria-expanded", String(opening)); });
    moreWrap.append(more, remove);
    actions.append(copy, edit, moreWrap);
    row.append(phrase, context, actions); fragment.append(row);
  });
  pickEntriesElement.replaceChildren(fragment);
}

function togglePick(result) {
  if (isPicked(result.phrase)) pickEntries = pickEntries.filter((entry) => entry.phrase.toLowerCase() !== result.phrase.toLowerCase());
  else pickEntries.unshift({ phrase: result.phrase, source: currentSource, rank: result.rank, lockedPositions: [], savedAt: new Date().toISOString() });
  pickEntries = pickEntries.slice(0, 100); savePickList(); renderPickList(); renderResults();
  if (isPicked(result.phrase)) pickList.open = true;
}

function drawThroughput(samples) {
  const context = throughputChart.getContext("2d");
  const width = throughputChart.width;
  const height = throughputChart.height;
  context.clearRect(0, 0, width, height);
  if (samples.length < 2) return;
  const peak = Math.max(...samples, 1);
  context.beginPath();
  samples.forEach((value, index) => { const x=(index/(samples.length-1))*width; const y=height-6-(value/peak)*(height-14); if(index===0)context.moveTo(x,y);else context.lineTo(x,y); });
  context.strokeStyle = "#2dd4bf";
  context.lineWidth = 4;
  context.stroke();
}

function beginTelemetry(workerCount) {
  telemetryStarted = performance.now();
  throughputSamples = [];
  analysis.hidden = false;
  analysis.open = true;
  analysisCancel.hidden = false;
  analysisPhase.textContent = "Loading";
  workerLanes.replaceChildren(...Array.from({ length: workerCount }, (_, index) => { const lane=document.createElement("div");lane.className="anagram-worker-lane";lane.innerHTML=`<span>Worker ${index+1}</span><div class="anagram-worker-track"><span></span></div><output>0%</output>`;return lane; }));
  updateTelemetry(Array.from({length:workerCount},()=>({nodes:0,nodeLimit:1,found:0,matchesSeen:0,candidateCount:0,prunedPaths:0})), []);
}

function updateTelemetry(progress, ranked, complete = false) {
  const nodes = progress.reduce((sum,item)=>sum+(item.nodes||0),0);
  const budget = progress.reduce((sum,item)=>sum+(item.nodeLimit||0),0) || 1;
  const percent = complete ? 100 : Math.min(100,(nodes/budget)*100);
  const elapsed = Math.max(.001,(performance.now()-telemetryStarted)/1000);
  const rate = Math.round(nodes/elapsed);
  throughputSamples.push(rate);
  throughputSamples = throughputSamples.slice(-48);
  drawThroughput(throughputSamples);
  analysisPhase.textContent = complete ? "Complete" : "Searching";
  analysisProgress.setAttribute("aria-valuenow",String(Math.round(percent)));
  analysisProgressFill.style.width=`${percent}%`;
  metricProgress.textContent=`${Math.round(percent)}%`;
  metricRate.textContent=rate.toLocaleString();
  throughputRate.textContent=`${rate.toLocaleString()} branches/s`;
  metricMatches.textContent=progress.reduce((sum,item)=>sum+(item.matchesSeen||0),0).toLocaleString();
  metricRetained.textContent=ranked.length.toLocaleString();
  currentLeader.textContent=ranked[0] ? titleCase(ranked[0].phrase) : complete ? "No matching phrase found" : "Waiting for an exact phrase…";
  analysisFoot.textContent=`${Math.max(...progress.map(item=>item.candidateCount||0)).toLocaleString()} candidate words · ${progress.reduce((sum,item)=>sum+(item.prunedPaths||0),0).toLocaleString()} duplicate paths pruned · ${elapsed.toFixed(1)}s elapsed`;
  [...workerLanes.children].forEach((lane,index)=>{const item=progress[index];const value=item?.done?100:Math.min(100,((item?.nodes||0)/(item?.nodeLimit||1))*100);lane.querySelector(".anagram-worker-track span").style.width=`${value}%`;lane.querySelector("output").textContent=item?.done?"Done":`${Math.round(value)}%`;});
  progressDetail.textContent = `${progress.filter((item) => item.done).length} of ${progress.length} workers complete · ${elapsed.toFixed(1)}s elapsed${ranked[0] ? ` · Leader: ${titleCase(ranked[0].phrase)}` : ""}`;
}

function setPatternProgress(message, percent = 0) {
  progressMessage.textContent = message;
  progressBar.setAttribute("aria-valuetext", message);
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  progressBar.setAttribute("aria-valuenow", String(value));
  progressFill.style.width = `${value}%`;
}

function showPatternProgress(message, usesPhrasePattern) {
  setPatternProgress(message, 0);
  progressKicker.textContent = usesPhrasePattern ? "Pattern search" : "Exhaustive search";
  progressBar.setAttribute("aria-label", usesPhrasePattern ? "Phrase-pattern search in progress" : "Exhaustive search in progress");
  progressDetail.textContent = "Workers are preparing the search.";
  progressModal.hidden = false;
  progressPreview.replaceChildren();
  document.body.setAttribute("aria-busy", "true");
  progressCancel.focus({ preventScroll: true });
}

function updatePatternProgress(message, percent) {
  setPatternProgress(message, percent);
}

function hidePatternProgress() {
  const restoreFocus = progressModal.contains(document.activeElement);
  progressModal.hidden = true;
  document.body.removeAttribute("aria-busy");
  if (restoreFocus) submit.focus({ preventScroll: true });
}

function showValidationError(message, title = "Adjust your phrase", focusTarget = input) {
  validationTitle.textContent = title;
  validationMessage.textContent = message;
  validationModal.hidden = false;
  validationModal._focusTarget = focusTarget;
  validationClose.focus({ preventScroll: true });
}

function hideValidationError() {
  if (validationModal.hidden) return;
  validationModal.hidden = true;
  const focusTarget = validationModal._focusTarget;
  validationModal._focusTarget = null;
  focusTarget?.focus({ preventScroll: true });
}

validationClose.addEventListener("click", hideValidationError);
validationModal.addEventListener("click", (event) => {
  if (event.target === validationModal) hideValidationError();
});
validationModal.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideValidationError();
});

function solveInWorker(source, options, dictionaryKind, showProgress) {
  return new Promise((resolve, reject) => {
    const workerCount = options.workerCount;
    const workers = [];
    const shardResults = Array.from({ length: workerCount }, () => []);
    const shardProgress = Array.from({ length: workerCount }, () => ({ nodes: 0, nodeLimit: options.nodeLimit, found: 0 }));
    const completions = [];
    let settled = false;
    beginTelemetry(workerCount);
    const terminateAll = () => workers.forEach((worker) => worker.terminate());
    const mergeResults = () => {
      return mergeRankedResults(shardResults, options.limit);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true; terminateAll(); activeSearch = null; reject(error);
    };
    activeSearch = { workers, reject: fail };
    const handleMessage = (shardIndex, worker, data) => {
      if (data?.type === "progress") {
        if (data.phase === "dictionary") {
          const percent = (data.completed / data.total) * 35;
          const message = `Loading dictionaries for ${workerCount} parallel worker${workerCount === 1 ? "" : "s"}…`;
          status.textContent = message;
          if (showProgress) updatePatternProgress(message, percent);
        } else {
          shardProgress[shardIndex] = data;
          const nodes = shardProgress.reduce((sum, entry) => sum + entry.nodes, 0);
          const totalBudget = shardProgress.reduce((sum, entry) => sum + entry.nodeLimit, 0);
          const found = mergeResults().length;
          updateTelemetry(shardProgress, mergeResults());
          const percent = 35 + (nodes / totalBudget) * 64;
          const message = `Explored ${nodes.toLocaleString()} search branches across ${workerCount} worker${workerCount === 1 ? "" : "s"} · ${found.toLocaleString()} retained`;
          status.textContent = message;
          if (showProgress) updatePatternProgress(message, percent);
        }
        return;
      }
      if (data?.type === "partial") {
        shardResults[shardIndex] = data.results;
        allResults = mergeResults();
        updateTelemetry(shardProgress, allResults);
        renderResults();
        progressPreview.replaceChildren(...allResults.slice(0, 5).map(({ phrase }) => { const item=document.createElement("li"); item.textContent=titleCase(phrase); return item; }));
        return;
      }
      if (data?.type === "engine") return;
      worker.terminate();
      if (data?.type !== "complete") { fail(new Error(data?.message || "Anagram Architect could not complete the search.")); return; }
      shardResults[shardIndex] = data.outcome.results;
      completions.push(data);
      if (completions.length === workerCount && !settled) {
        settled = true; activeSearch = null;
        analysisCancel.hidden = true;
        const nodes = completions.reduce((sum, entry) => sum + entry.outcome.nodes, 0);
        const mergedResults=mergeResults();
        updateTelemetry(shardProgress.map((entry)=>({...entry,done:true})),mergedResults,true);
        resolve({ outcome: { results: mergedResults, nodes, truncated: completions.some((entry) => entry.outcome.truncated) }, wordCount: completions[0].wordCount, engine: completions.every((entry) => entry.engine === "wasm") ? "wasm" : "javascript", wasmFailure: completions.map((entry) => entry.wasmFailure).filter(Boolean).join("; "), workerCount });
      }
    };
    for (let shardIndex = 0; shardIndex < workerCount; shardIndex += 1) {
      const worker = new Worker("/assets/js/tools/anagram-architect/anagram-worker.bundle.js?v=20260914-11", { type: "module" });
      workers.push(worker);
      worker.addEventListener("message", ({ data }) => handleMessage(shardIndex, worker, data));
      worker.addEventListener("error", () => fail(new Error("A parallel anagram worker could not start. Reload the page and try again.")));
      const shortPhraseSpecialist = workerCount > 1 && shardIndex === 0;
      const compactPhraseSpecialist = workerCount > 2 && shardIndex === 1;
      const specialistCount = workerCount > 2 ? 2 : workerCount > 1 ? 1 : 0;
      const isSpecialist = shortPhraseSpecialist || compactPhraseSpecialist;
      worker.postMessage({ type: "solve", source, options: { ...options, maxWords: shortPhraseSpecialist ? Math.min(options.maxWords, 3) : compactPhraseSpecialist ? Math.min(options.maxWords, 4) : options.maxWords, shardIndex: isSpecialist ? 0 : shardIndex - specialistCount, shardCount: isSpecialist ? 1 : workerCount - specialistCount }, dictionary: dictionaryKind });
    }
  });
}

progressCancel.addEventListener("click", () => {
  if (!activeSearch) return;
  activeSearch.reject(new DOMException("Search cancelled", "AbortError"));
});

analysisCancel.addEventListener("click", () => {
  if (!activeSearch) return;
  activeSearch.reject(new DOMException("Search cancelled", "AbortError"));
});

progressBackground.addEventListener("click", () => {
  hidePatternProgress();
  analysis.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function titleCase(phrase) {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function getPage() {
  const page = filterAndPageResults(allResults, resultSearch.value, currentPage, PAGE_SIZE);
  currentPage = page.page;
  return { ...page, offset: page.start ? page.start - 1 : 0 };
}

function renderResults() {
  results.replaceChildren();
  const page = getPage();
  if (!allResults.length) {
    resultTools.hidden = true;
    results.innerHTML = `<div class="anagram-empty"><strong>No complete phrases found yet.</strong><span>Try a higher word limit, a shorter minimum word length, or the Expanded dictionary.</span></div>`;
    return;
  }
  resultTools.hidden = false;
  const first = page.total ? page.offset + 1 : 0;
  const last = Math.min(page.offset + PAGE_SIZE, page.total);
  pageSummary.textContent = page.total
    ? `Showing ${first}–${last} of ${page.total.toLocaleString()} · Page ${currentPage} of ${page.totalPages}`
    : `No phrases match “${resultSearch.value.trim()}”`;
  previousPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === page.totalPages || !page.total;
  if (!page.items.length) {
    results.innerHTML = `<div class="anagram-empty"><strong>No matching phrases.</strong><span>Try a different result search.</span></div>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  page.items.forEach(({ phrase, rank }) => {
    const article = document.createElement("article");
    article.className = "anagram-result";
    const heading = document.createElement("h3");
    heading.textContent = titleCase(phrase);
    const title = document.createElement("div");
    title.className = "anagram-result-title";
    const rankBadge = document.createElement("span");
    rankBadge.className = "anagram-result-rank";
    rankBadge.textContent = `#${rank}`;
    rankBadge.setAttribute("aria-label", `Overall rank ${rank}`);
    title.append(rankBadge, heading);
    const meta = document.createElement("span");
    meta.textContent = `${phrase.split(" ").length} words · ${normalizeLetters(phrase).length} letters · exact match`;
    const actions = document.createElement("div"); actions.className = "anagram-result-actions";
    const pick = document.createElement("button"); pick.type = "button"; pick.textContent = isPicked(phrase) ? "Picked" : "Pick"; pick.setAttribute("aria-pressed", String(isPicked(phrase))); pick.addEventListener("click", () => togglePick({ phrase, rank }));
    const button = document.createElement("button"); button.type = "button"; button.textContent = "Copy";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(titleCase(phrase));
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = "Copy"; }, 1200);
    });
    actions.append(pick, button);
    article.append(title, meta, actions);
    if (!isExactAnagram(currentSource, phrase)) article.hidden = true;
    fragment.append(article);
  });
  results.append(fragment);
}

function resetResultView() {
  currentPage = 1;
  resultSearch.value = "";
  resultTools.hidden = true;
  allResults = [];
  analysis.hidden = true;
}

function searchConfiguration(mode, dictionaryKind) {
  const available = Math.max(1, Math.min(8, navigator.hardwareConcurrency || 2));
  const expanded = dictionaryKind === "expanded";
  if (mode === "exhaustive") return { workerCount: Math.min(available, 6), nodeLimit: expanded ? 1200000 : 900000 };
  if (mode === "deep") return { workerCount: Math.min(available, 4), nodeLimit: expanded ? 500000 : 300000 };
  return { workerCount: Math.min(available, 2), nodeLimit: expanded ? 180000 : 100000 };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const source = input.value.trim();
  const letters = normalizeLetters(source);
  if (letters.length < 2 || letters.length > 30) {
    const message = letters.length > 30
      ? "Enter a name or phrase containing 2 to 30 letters. Support for longer phrases is planned for a future upgrade."
      : "Enter a name or phrase containing at least 2 letters.";
    status.textContent = message;
    showValidationError(message);
    return;
  }
  const templateLiterals = GRAMMAR_TEMPLATE_LITERALS[grammarTemplate.value] || [];
  if (!containsRequiredLetters(source, templateLiterals)) {
    const message = `This grammar template requires the word${templateLiterals.length === 1 ? "" : "s"} ${templateLiterals.map((word) => `“${word}”`).join(" and ")}, but those letters are not available.`;
    status.textContent = message;
    showValidationError(message, "Template cannot fit", grammarTemplate);
    return;
  }
  submit.disabled = true;
  const usesPhrasePattern = Boolean(phrasePattern.value.trim() || grammarTemplate.value);
  const showsProgressModal = usesPhrasePattern || searchMode.value === "exhaustive";
  if (showsProgressModal) showPatternProgress("Loading the local dictionary…", usesPhrasePattern);
  resetResultView();
  results.replaceChildren();
  summary.textContent = `${letters.length} letters available`;
  const started = performance.now();
  try {
    status.textContent = "Loading the local dictionary…";
    const options = {
      maxWords: Number(maxWords.value),
      minimumLength: Number(minimumLength.value),
      pattern: phrasePattern.value,
      grammarTemplate: grammarTemplate.value,
      lockedWords: lockedWords.value,
      preferredWords: preferredWords.value,
      excludedWords: excludedWords.value,
      excludeVulgar: excludeVulgar.checked,
      limit: 1200,
      ...searchConfiguration(searchMode.value, dictionary.value)
    };
    const { outcome, wordCount, engine, wasmFailure, workerCount } = await solveInWorker(source, options, dictionary.value, showsProgressModal);
    status.textContent = `Architecting exact phrases from ${wordCount.toLocaleString()} words…`;
    if (showsProgressModal) updatePatternProgress("Finalizing your exact matches…", 100);
    currentSource = source;
    allResults = outcome.results;
    renderResults();
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    status.textContent = outcome.results.length === 0 && grammarTemplate.value
      ? `No exact phrases matched the selected grammar template in ${seconds}s. Try another template, Expanded dictionary, or a different source phrase.`
      : `${outcome.results.length} exact phrase${outcome.results.length === 1 ? "" : "s"} found in ${seconds}s${outcome.truncated ? " · ranked search pass" : ""} · ${workerCount} ${engine === "wasm" ? "Rust/WASM" : "JavaScript"} worker${workerCount === 1 ? "" : "s"}.`;
    if (wasmFailure) console.warn("Rust/WASM fallback:", wasmFailure);
  } catch (error) {
    status.textContent = error?.name === "AbortError"
      ? "Anagram search cancelled."
      : error instanceof Error ? error.message : "Anagram Architect could not complete the search.";
  } finally {
    submit.disabled = false;
    analysisCancel.hidden = true;
    if (showsProgressModal) hidePatternProgress();
  }
});

clear.addEventListener("click", () => {
  input.value = "";
  phrasePattern.value = "";
  grammarTemplate.value = "";
  lockedWords.value = "";
  preferredWords.value = "";
  excludedWords.value = "";
  resetResultView();
  results.replaceChildren();
  summary.textContent = "Letters, spaces, and punctuation are accepted";
  status.textContent = "Ready to architect a phrase.";
  syncInputClearButtons();
  input.focus();
});

resultSearch.addEventListener("input", () => {
  currentPage = 1;
  renderResults();
});

previousPage.addEventListener("click", () => {
  currentPage -= 1;
  renderResults();
  resultTools.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

nextPage.addEventListener("click", () => {
  currentPage += 1;
  renderResults();
  resultTools.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

examples.forEach((button) => button.addEventListener("click", () => {
  input.value = button.dataset.anagramExample;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}));

pickClear.addEventListener("click", (event) => {
  event.preventDefault();
  if (!pickEntries.length) return;
  pickEntries = []; savePickList(); renderPickList(); renderResults();
});

renderPickList();

input.addEventListener("input", () => {
  const letters = normalizeLetters(input.value);
  summary.textContent = letters ? `${letters.length} letter${letters.length === 1 ? "" : "s"} available` : "Letters, spaces, and punctuation are accepted";
});

const initialPhrase = new URLSearchParams(window.location.search).get("phrase")?.trim();
if (initialPhrase) {
  input.value = initialPhrase;
  input.dispatchEvent(new Event("input"));
  window.history.replaceState(null, "", window.location.pathname);
  queueMicrotask(() => form.requestSubmit());
}
syncInputClearButtons();
