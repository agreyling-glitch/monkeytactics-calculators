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
const proMode = document.querySelector("#anagram-pro-mode");
const proRecommendation = document.querySelector("#anagram-pro-recommendation");
const proWordOptions = document.querySelectorAll("[data-pro-option]");
const phrasePattern = document.querySelector("#anagram-phrase-pattern");
const grammarTemplate = document.querySelector("#anagram-grammar-template");
const grammarControl = document.querySelector("#anagram-grammar-control");
const grammarTemplateButtons = document.querySelectorAll("[data-grammar-template]");
const templateBuilder = document.querySelector("#anagram-template-builder");
const templateSlots = document.querySelector("#anagram-template-slots");
const templateSlotType = document.querySelector("#anagram-custom-slot-type");
const templateLiteralWrap = document.querySelector("#anagram-custom-literal-wrap");
const templateLiteral = document.querySelector("#anagram-custom-literal");
const templateAddSlot = document.querySelector("#anagram-add-template-slot");
const templatePreview = document.querySelector("#anagram-template-preview");
const lockedWords = document.querySelector("#anagram-locked-words");
const preferredWords = document.querySelector("#anagram-preferred-words");
const excludedWords = document.querySelector("#anagram-excluded-words");
const personalVocabulary = document.querySelector("#anagram-personal-vocabulary");
const personalVocabularyCount = document.querySelector("#anagram-personal-vocabulary-count");
const personalVocabularySummary = document.querySelector("#anagram-personal-vocabulary-summary");
const excludeVulgar = document.querySelector("#anagram-exclude-vulgar");
const resetAdvanced = document.querySelector("#anagram-reset-advanced");
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
const workerHarmCount = document.querySelector("#anagram-worker-harm-count");
const analysisCancel = document.querySelector("#anagram-analysis-cancel");
const examples = document.querySelectorAll("[data-anagram-example]");
const inputClearButtons = document.querySelectorAll("[data-clear-input]");
const PAGE_SIZE = 120;
const PICK_STORAGE_KEY = "monkeytactics.anagram-architect.pick-list.v1";
const WORKER_HARM_STORAGE_KEY = "monkeytactics.anagram-architect.workers-harmed.v1";
const PERSONAL_VOCABULARY_STORAGE_KEY = "monkeytactics.anagram-architect.personal-vocabulary.v1";
let currentSource = "";
let allResults = [];
let currentPage = 1;
let activeSearch = null;
let telemetryStarted = 0;
let throughputSamples = [];
let pickEntries = readPickList();
let customGrammarSlots = [];
let harmedWorkers = readHarmedWorkers();
let draggedTemplateIndex = null;
let pointerTemplateDrag = null;
const pickDictionaryPromises = new Map();

form.dataset.architectReady = "true";

function readHarmedWorkers() {
  try { return Math.max(0, Number(sessionStorage.getItem(WORKER_HARM_STORAGE_KEY)) || 0); }
  catch { return 0; }
}

function harmWorkers(count) {
  if (!count) return;
  harmedWorkers += count;
  try { sessionStorage.setItem(WORKER_HARM_STORAGE_KEY, String(harmedWorkers)); } catch {}
  renderWorkerHarm();
}

function renderWorkerHarm() {
  workerHarmCount.textContent = harmedWorkers === 0
    ? "No WASM workers harmed this session. Yet."
    : harmedWorkers === 1
      ? "1 WASM worker harmed this session. It knew the risks."
      : `${harmedWorkers.toLocaleString()} WASM workers harmed this session. They knew the risks.`;
}

renderWorkerHarm();

function parsePersonalVocabulary() {
  const tokens = personalVocabulary.value.toLowerCase().match(/[a-z]+/g) || [];
  const unique = [...new Set(tokens.filter((word) => word.length >= 2 && word.length <= 30))];
  return { words: unique.slice(0, 500), total: unique.length, invalid: tokens.length - unique.length };
}

function personalWordFitsSource(word, source) {
  const available = new Map();
  for (const letter of normalizeLetters(source)) available.set(letter, (available.get(letter) || 0) + 1);
  for (const letter of word) {
    const remaining = available.get(letter) || 0;
    if (!remaining) return false;
    available.set(letter, remaining - 1);
  }
  return true;
}

function updatePersonalVocabulary() {
  const { words, total, invalid } = parsePersonalVocabulary();
  try { localStorage.setItem(PERSONAL_VOCABULARY_STORAGE_KEY, personalVocabulary.value); } catch {}
  personalVocabularyCount.textContent = `${Math.min(total, 500)} of 500 words`;
  const relevant = words.filter((word) => personalWordFitsSource(word, input.value)).length;
  personalVocabularySummary.textContent = total > 500
    ? `Limit exceeded: remove ${total - 500} word${total - 500 === 1 ? "" : "s"} before searching.`
    : `${relevant} relevant to this phrase${invalid ? ` · ${invalid} duplicate or invalid entr${invalid === 1 ? "y" : "ies"} ignored` : ""}. Saved in this browser; words are allowed, not required.`;
  personalVocabularySummary.classList.toggle("is-warning", total > 500);
}

try { personalVocabulary.value = localStorage.getItem(PERSONAL_VOCABULARY_STORAGE_KEY) || ""; } catch {}
personalVocabulary.addEventListener("input", updatePersonalVocabulary);

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

const CUSTOM_SLOT_LABELS = { noun: "Noun", verb: "Verb", adjective: "Adjective", any: "Any word" };

function selectedGrammarTemplate() {
  if (grammarTemplate.value !== "custom") return grammarTemplate.value;
  return `custom:${customGrammarSlots.map((slot) => slot.kind === "literal" ? `literal=${slot.word}` : slot.kind).join("|")}`;
}

function grammarLiteralWords(value) {
  if (!value.startsWith("custom:")) return GRAMMAR_TEMPLATE_LITERALS[value] || [];
  return value.slice(7).split("|").filter((slot) => slot.startsWith("literal=")).map((slot) => slot.slice(8));
}

function clearTemplateDropState() {
  templateSlots.querySelectorAll(".is-dragging,.drop-before,.drop-after").forEach((item) => item.classList.remove("is-dragging", "drop-before", "drop-after"));
}

function markTemplateDrop(item, before) {
  templateSlots.querySelectorAll(".drop-before,.drop-after").forEach((slot) => slot.classList.remove("drop-before", "drop-after"));
  item?.classList.add(before ? "drop-before" : "drop-after");
}

function moveCustomTemplateSlot(from, target, before) {
  if (from === null || target === null || from === target && before) return;
  const [slot] = customGrammarSlots.splice(from, 1);
  let insertion = target + (before ? 0 : 1);
  if (from < insertion) insertion -= 1;
  customGrammarSlots.splice(Math.max(0, Math.min(insertion, customGrammarSlots.length)), 0, slot);
  renderCustomTemplate();
}

function templateDropPosition(item, clientX, clientY) {
  const bounds = item.getBoundingClientRect();
  return clientY < bounds.top + bounds.height / 2 || (Math.abs(clientY - (bounds.top + bounds.height / 2)) < bounds.height / 3 && clientX < bounds.left + bounds.width / 2);
}

function renderCustomTemplate() {
  const fragment = document.createDocumentFragment();
  customGrammarSlots.forEach((slot, index) => {
    const item = document.createElement("li"); item.className = "anagram-template-slot";
    item.dataset.index = String(index); item.draggable = true; item.tabIndex = 0;
    const label = document.createElement("span"); label.textContent = slot.kind === "literal" ? `“${slot.word}”` : `[${CUSTOM_SLOT_LABELS[slot.kind]}]`;
    item.setAttribute("aria-label", `${label.textContent}. Drag to reorder or press Alt plus Left or Right Arrow.`);
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", `Remove ${label.textContent}`);
    remove.addEventListener("click", () => { customGrammarSlots.splice(index, 1); renderCustomTemplate(); });
    item.addEventListener("keydown", (event) => {
      if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const target = event.key === "ArrowLeft" ? index - 1 : index + 1;
      if (target < 0 || target >= customGrammarSlots.length) return;
      event.preventDefault();
      [customGrammarSlots[index], customGrammarSlots[target]] = [customGrammarSlots[target], customGrammarSlots[index]];
      renderCustomTemplate(); templateSlots.children[target]?.focus();
    });
    item.addEventListener("dragstart", (event) => { draggedTemplateIndex = index; item.classList.add("is-dragging"); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); });
    item.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; markTemplateDrop(item, templateDropPosition(item, event.clientX, event.clientY)); });
    item.addEventListener("drop", (event) => { event.preventDefault(); const from = draggedTemplateIndex ?? Number(event.dataTransfer.getData("text/plain")); moveCustomTemplateSlot(from, index, item.classList.contains("drop-before")); draggedTemplateIndex = null; clearTemplateDropState(); });
    item.addEventListener("dragend", () => { draggedTemplateIndex = null; clearTemplateDropState(); });
    item.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || event.target.closest("button")) return;
      pointerTemplateDrag = { pointerId: event.pointerId, from: index, target: index, before: true };
      item.setPointerCapture(event.pointerId); item.classList.add("is-dragging");
    });
    item.addEventListener("pointermove", (event) => {
      if (!pointerTemplateDrag || pointerTemplateDrag.pointerId !== event.pointerId) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".anagram-template-slot");
      if (!target || !templateSlots.contains(target)) return;
      const before = templateDropPosition(target, event.clientX, event.clientY);
      pointerTemplateDrag.target = Number(target.dataset.index); pointerTemplateDrag.before = before;
      markTemplateDrop(target, before);
    });
    const finishPointerDrag = (event) => {
      if (!pointerTemplateDrag || pointerTemplateDrag.pointerId !== event.pointerId) return;
      const { from, target, before } = pointerTemplateDrag; pointerTemplateDrag = null;
      clearTemplateDropState(); moveCustomTemplateSlot(from, target, before);
    };
    item.addEventListener("pointerup", finishPointerDrag);
    item.addEventListener("pointercancel", () => { pointerTemplateDrag = null; clearTemplateDropState(); });
    item.append(label, remove); fragment.append(item);
  });
  templateSlots.replaceChildren(fragment);
  templatePreview.textContent = customGrammarSlots.length
    ? `Template: ${customGrammarSlots.map((slot) => slot.kind === "literal" ? slot.word : `[${CUSTOM_SLOT_LABELS[slot.kind]}]`).join(" ")}`
    : "Add at least one slot to build your template.";
}

function syncTemplateBuilder() {
  grammarTemplateButtons.forEach((button) => {
    const selected = button.dataset.grammarTemplate === grammarTemplate.value;
    button.setAttribute("aria-pressed", String(selected));
  });
  templateBuilder.hidden = grammarTemplate.value !== "custom";
  if (!templateBuilder.hidden) renderCustomTemplate();
}

templateSlotType.addEventListener("change", () => { templateLiteralWrap.hidden = templateSlotType.value !== "literal"; });
templateAddSlot.addEventListener("click", () => {
  if (customGrammarSlots.length >= 10) { showValidationError("Custom templates support up to 10 slots.", "Template is full", templateAddSlot); return; }
  const kind = templateSlotType.value;
  if (kind === "literal") {
    const word = templateLiteral.value.trim().toLowerCase();
    if (!/^[a-z]+$/.test(word)) { showValidationError("Enter one exact word using letters only.", "Add an exact word", templateLiteral); return; }
    customGrammarSlots.push({ kind, word });
    templateLiteral.value = ""; syncInputClearButtons();
  } else customGrammarSlots.push({ kind });
  renderCustomTemplate();
});
grammarTemplate.addEventListener("change", syncTemplateBuilder);
grammarTemplateButtons.forEach((button) => button.addEventListener("click", () => {
  grammarTemplate.value = button.dataset.grammarTemplate;
  grammarTemplate.dispatchEvent(new Event("change", { bubbles: true }));
}));
syncTemplateBuilder();

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
  let locked = lockedPositionSet(entry);
  let words = entry.phrase.toLowerCase().match(/[a-z]+/g) || [];
  let draggedLockedIndex = null;
  let pointerLockedDrag = null;
  let suppressLockedClick = false;
  const panel = document.createElement("div"); panel.className = "anagram-pick-permutations"; panel.hidden = true;
  const close = buildPanelCloseButton(panel, "Close reorder mode");
  const heading = document.createElement("strong");
  const hint = document.createElement("small"); hint.textContent = "Lock words in place, then drag a locked word between the other words to move its fixed position. Select an ordering or double-click one to use it immediately.";
  const lockControls = document.createElement("div"); lockControls.className = "anagram-pick-locks"; lockControls.setAttribute("aria-label", "Lock words in position");
  const select = document.createElement("select"); select.size = Math.min(6, alternatives.length); select.setAttribute("aria-label", `Word-order alternatives for ${entry.phrase}`);
  const refreshAlternatives = () => {
    alternatives = rankPhrasePermutations(entry.phrase, 720, [...locked]);
    heading.textContent = `${alternatives.length} distinct word-order alternative${alternatives.length === 1 ? "" : "s"}${locked.size ? ` · ${locked.size} word${locked.size === 1 ? "" : "s"} locked` : ""}`;
    select.replaceChildren(...alternatives.map((alternative) => { const option = document.createElement("option"); option.value = alternative.phrase; option.textContent = `#${alternative.rank} ${titleCase(alternative.phrase)}`; return option; }));
    select.size = Math.min(6, alternatives.length);
    select.value = entry.phrase.toLowerCase();
  };
  const clearLockedDropState = () => lockControls.querySelectorAll(".is-dragging,.drop-before,.drop-after").forEach((item) => item.classList.remove("is-dragging", "drop-before", "drop-after"));
  const markLockedDrop = (item, before) => {
    lockControls.querySelectorAll(".drop-before,.drop-after").forEach((word) => word.classList.remove("drop-before", "drop-after"));
    item?.classList.add(before ? "drop-before" : "drop-after");
  };
  const moveLockedWord = (fromIndex, targetIndex, before = true) => {
    if (!locked.has(fromIndex) || targetIndex < 0 || targetIndex >= words.length || fromIndex === targetIndex && before) return;
    const tokens = words.map((word, originalIndex) => ({ word, originalIndex }));
    const [moved] = tokens.splice(fromIndex, 1);
    let insertion = targetIndex + (before ? 0 : 1);
    if (fromIndex < insertion) insertion -= 1;
    tokens.splice(Math.max(0, Math.min(insertion, tokens.length)), 0, moved);
    const previouslyLocked = new Set(locked);
    words = tokens.map(({ word }) => word);
    locked = new Set(tokens.flatMap(({ originalIndex }, index) => previouslyLocked.has(originalIndex) ? [index] : []));
    entry.phrase = words.join(" ");
    entry.lockedPositions = [...locked].sort((left, right) => left - right);
    savePickList();
    renderLockControls();
    refreshAlternatives();
    panel.dispatchEvent(new CustomEvent("anagramphrasechange", { detail: { phrase: entry.phrase } }));
  };
  const renderLockControls = () => {
    lockControls.replaceChildren(...words.map((word, index) => {
      const button = document.createElement("button"); button.type = "button";
      const isLocked = locked.has(index);
      button.dataset.lockIndex = String(index);
      button.setAttribute("aria-pressed", String(isLocked));
      button.textContent = `${isLocked ? "↔ 🔒" : "○"} ${titleCase(word)}`;
      button.draggable = isLocked;
      button.setAttribute("aria-label", `${isLocked ? `Locked ${word} in position ${index + 1}. Drag to move or click to unlock` : `Lock ${word} in position ${index + 1}`}`);
      button.addEventListener("click", () => {
        if (suppressLockedClick) { suppressLockedClick = false; return; }
        if (locked.has(index)) locked.delete(index); else locked.add(index);
        entry.lockedPositions = [...locked].sort((left, right) => left - right);
        savePickList(); renderLockControls(); refreshAlternatives();
      });
      button.addEventListener("dragstart", (event) => {
        if (!locked.has(index)) { event.preventDefault(); return; }
        draggedLockedIndex = index; button.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index));
      });
      button.addEventListener("dragover", (event) => {
        if (draggedLockedIndex === null || draggedLockedIndex === index) return;
        event.preventDefault(); event.dataTransfer.dropEffect = "move"; markLockedDrop(button, templateDropPosition(button, event.clientX, event.clientY));
      });
      button.addEventListener("drop", (event) => {
        event.preventDefault();
        const fromIndex = draggedLockedIndex ?? Number(event.dataTransfer.getData("text/plain"));
        const before = button.classList.contains("drop-before");
        draggedLockedIndex = null; clearLockedDropState(); moveLockedWord(fromIndex, index, before);
      });
      button.addEventListener("dragend", () => {
        draggedLockedIndex = null; clearLockedDropState();
      });
      button.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" || !locked.has(index)) return;
        pointerLockedDrag = { pointerId: event.pointerId, from: index, target: index, before: true };
        button.setPointerCapture(event.pointerId); button.classList.add("is-dragging");
      });
      button.addEventListener("pointermove", (event) => {
        if (!pointerLockedDrag || pointerLockedDrag.pointerId !== event.pointerId) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-lock-index]");
        if (!target || !lockControls.contains(target)) return;
        const before = templateDropPosition(target, event.clientX, event.clientY);
        pointerLockedDrag.target = Number(target.dataset.lockIndex); pointerLockedDrag.before = before;
        markLockedDrop(target, before);
      });
      const finishPointerDrag = (event) => {
        if (!pointerLockedDrag || pointerLockedDrag.pointerId !== event.pointerId) return;
        const { from, target, before } = pointerLockedDrag; pointerLockedDrag = null;
        suppressLockedClick = from !== target || !before;
        clearLockedDropState(); moveLockedWord(from, target, before);
      };
      button.addEventListener("pointerup", finishPointerDrag);
      button.addEventListener("pointercancel", () => { pointerLockedDrag = null; clearLockedDropState(); });
      return button;
    }));
  };
  renderLockControls();
  refreshAlternatives();
  const actions = document.createElement("div"); actions.className = "anagram-pick-permutation-actions";
  const use = document.createElement("button"); use.type = "button"; use.textContent = "Use this order";
  const applySelectedOrder = () => {
    const selectedPhrase = select.value || entry.phrase;
    if (!alternatives.some(({ phrase }) => phrase === selectedPhrase)) return;
    entry.phrase = selectedPhrase;
    panel.dispatchEvent(new Event("anagramentrychange"));
    savePickList(); renderPickList(); renderResults();
  };
  use.addEventListener("click", applySelectedOrder);
  select.addEventListener("dblclick", applySelectedOrder);
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
  (entry.phrase.toLowerCase().match(/[a-z]+/g) || []).forEach((word, wordIndex) => {
    const button = document.createElement("button"); button.type = "button"; button.textContent = titleCase(word); button.setAttribute("aria-pressed", "false");
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
  const wirePanel = (panel) => {
    panel.addEventListener("anagramformatchange", ({ detail }) => { pickDrawerPreview.textContent = detail.formattedPhrase; rowPhrase.textContent = detail.formattedPhrase; });
    panel.addEventListener("anagramphrasechange", ({ detail }) => {
      const formatted = formatAnagramPhrase(detail.phrase, entry.formatOptions); pickDrawerPreview.textContent = formatted; rowPhrase.textContent = formatted;
      [[1, buildWordSwapPanel], [2, buildFormatPanel]].forEach(([index, buildPanel]) => {
        const previous = panels[index][1];
        const replacement = buildPanel(entry); replacement.hidden = previous.hidden; wirePanel(replacement);
        previous.replaceWith(replacement); panels[index][1] = replacement;
      });
    });
    panel.addEventListener("anagramentrychange", closePickDrawer);
  };
  panels.forEach(([, panel]) => wirePanel(panel));
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

function workerRoleLabel(index, workerCount) {
  if (workerCount > 1 && index === 0) return "short-phrase";
  if (workerCount > 2 && index === 1) return "compact-phrase";
  const specialistCount = workerCount > 2 ? 2 : workerCount > 1 ? 1 : 0;
  const generalCount = workerCount - specialistCount;
  return generalCount > 1 ? `general ${index - specialistCount + 1}/${generalCount}` : "general";
}

function beginTelemetry(workerCount) {
  telemetryStarted = performance.now();
  throughputSamples = [];
  analysis.hidden = false;
  analysis.open = true;
  analysisCancel.hidden = false;
  analysisPhase.textContent = "Loading";
  workerLanes.replaceChildren(...Array.from({ length: workerCount }, (_, index) => { const lane=document.createElement("div");lane.className="anagram-worker-lane";lane.innerHTML=`<span>Worker ${index+1} <small>(${workerRoleLabel(index, workerCount)})</small></span><div class="anagram-worker-track"><span></span></div><output>0%</output>`;return lane; }));
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
    const deadlineEpochMs = options.timeLimitMs ? Date.now() + options.timeLimitMs : 0;
    const workerOptions = { ...options, deadlineEpochMs };
    const workerCount = options.workerCount;
    const workers = [];
    const shardResults = Array.from({ length: workerCount }, () => []);
    const shardProgress = Array.from({ length: workerCount }, () => ({ nodes: 0, nodeLimit: options.nodeLimit, found: 0 }));
    const shardEngines = Array.from({ length: workerCount }, () => "");
    const countedHarm = new Set();
    const completedShards = new Set();
    const completions = [];
    let settled = false;
    let hardTimeout = null;
    let loadedWordCount = 0;
    beginTelemetry(workerCount);
    const terminateAll = () => workers.forEach((worker) => worker.terminate());
    const mergeResults = () => {
      return mergeRankedResults(shardResults, options.limit);
    };
    const countHarmedShards = (indexes) => {
      const newlyHarmed = indexes.filter((index) => shardEngines[index] === "wasm" && !countedHarm.has(index) && !completedShards.has(index));
      newlyHarmed.forEach((index) => countedHarm.add(index));
      harmWorkers(newlyHarmed.length);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true; clearTimeout(hardTimeout); terminateAll(); activeSearch = null; reject(error);
    };
    const finishTimedOut = () => {
      if (settled) return;
      settled = true;
      countHarmedShards(shardEngines.map((_, index) => index));
      terminateAll();
      activeSearch = null;
      analysisCancel.hidden = true;
      const mergedResults = mergeResults();
      const nodes = shardProgress.reduce((sum, entry) => sum + (entry.nodes || 0), 0);
      updateTelemetry(shardProgress.map((entry) => ({ ...entry, done: true })), mergedResults, true);
      resolve({ outcome: { results: mergedResults, nodes, truncated: true, timeLimited: true }, wordCount: loadedWordCount, engine: shardEngines.every((engine) => engine === "wasm") ? "wasm" : "javascript", wasmFailure: "", workerCount });
    };
    activeSearch = { workers, reject: fail, countStoppedWorkers: () => countHarmedShards(shardEngines.map((_, index) => index)) };
    const handleMessage = (shardIndex, worker, data) => {
      if (!settled && deadlineEpochMs && Date.now() >= deadlineEpochMs && data?.type !== "complete") {
        finishTimedOut();
        return;
      }
      if (data?.type === "progress") {
        if (data.wordCount) loadedWordCount = data.wordCount;
        if (data.phase === "dictionary") {
          const percent = (data.completed / data.total) * 35;
          const message = `Loading dictionaries for ${workerCount} parallel worker${workerCount === 1 ? "" : "s"}…`;
          status.textContent = message;
          if (showProgress) updatePatternProgress(message, percent);
        } else {
          if (data.engine) shardEngines[shardIndex] = data.engine;
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
      if (data?.type === "engine") { shardEngines[shardIndex] = data.engine; return; }
      worker.terminate();
      if (data?.type !== "complete") { fail(new Error(data?.message || "Anagram Architect could not complete the search.")); return; }
      shardEngines[shardIndex] = data.engine || shardEngines[shardIndex];
      if (data.outcome.timeLimited) countHarmedShards([shardIndex]);
      completedShards.add(shardIndex);
      shardResults[shardIndex] = data.outcome.results;
      completions.push(data);
      if (completions.length === workerCount && !settled) {
        settled = true; clearTimeout(hardTimeout); activeSearch = null;
        analysisCancel.hidden = true;
        const nodes = completions.reduce((sum, entry) => sum + entry.outcome.nodes, 0);
        const mergedResults=mergeResults();
        updateTelemetry(shardProgress.map((entry)=>({...entry,done:true})),mergedResults,true);
        resolve({ outcome: { results: mergedResults, nodes, truncated: completions.some((entry) => entry.outcome.truncated), timeLimited: completions.some((entry) => entry.outcome.timeLimited) }, wordCount: completions[0].wordCount, engine: completions.every((entry) => entry.engine === "wasm") ? "wasm" : "javascript", wasmFailure: completions.map((entry) => entry.wasmFailure).filter(Boolean).join("; "), workerCount });
      }
    };
    for (let shardIndex = 0; shardIndex < workerCount; shardIndex += 1) {
      const worker = new Worker("/assets/js/tools/anagram-architect/anagram-worker.bundle.js?v=20260917-01", { type: "module" });
      workers.push(worker);
      worker.addEventListener("message", ({ data }) => handleMessage(shardIndex, worker, data));
      worker.addEventListener("error", () => fail(new Error("A parallel anagram worker could not start. Reload the page and try again.")));
      const shortPhraseSpecialist = workerCount > 1 && shardIndex === 0;
      const compactPhraseSpecialist = workerCount > 2 && shardIndex === 1;
      const specialistCount = workerCount > 2 ? 2 : workerCount > 1 ? 1 : 0;
      const isSpecialist = shortPhraseSpecialist || compactPhraseSpecialist;
      worker.postMessage({ type: "solve", source, options: { ...workerOptions, maxWords: shortPhraseSpecialist ? Math.min(options.maxWords, 3) : compactPhraseSpecialist ? Math.min(options.maxWords, 4) : options.maxWords, shardIndex: isSpecialist ? 0 : shardIndex - specialistCount, shardCount: isSpecialist ? 1 : workerCount - specialistCount }, dictionary: dictionaryKind });
    }
    if (options.timeLimitMs) hardTimeout = setTimeout(finishTimedOut, options.timeLimitMs);
  });
}

progressCancel.addEventListener("click", () => {
  if (!activeSearch) return;
  activeSearch.countStoppedWorkers();
  activeSearch.reject(new DOMException("Search cancelled", "AbortError"));
});

analysisCancel.addEventListener("click", () => {
  if (!activeSearch) return;
  activeSearch.countStoppedWorkers();
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
  const personalWords = new Set(parsePersonalVocabulary().words);
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
    const usesPersonalWord = phrase.toLowerCase().split(" ").some((word) => personalWords.has(word));
    meta.textContent = `${phrase.split(" ").length} words · ${normalizeLetters(phrase).length} letters · exact match${usesPersonalWord ? " · personal vocabulary" : ""}`;
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

function deviceProfile() {
  const available = Math.max(1, Math.min(8, navigator.hardwareConcurrency || 2));
  const memory = Number(navigator.deviceMemory) || 0;
  const tier = available >= 8 && (!memory || memory >= 8) ? "high" : available >= 4 && (!memory || memory >= 4) ? "medium" : "low";
  return { available, memory, tier };
}

function updateProRecommendation() {
  const letterCount = normalizeLetters(input.value).length;
  const { available, memory, tier } = deviceProfile();
  const hardware = `${available} logical processor${available === 1 ? "" : "s"}${memory ? ` and about ${memory} GB device memory` : ""}`;
  const baseSeconds = searchMode.value === "exhaustive" ? 60 : searchMode.value === "deep" ? 30 : 15;
  const tierFactor = tier === "high" ? 1 : tier === "medium" ? .85 : .67;
  const seconds = Math.round(baseSeconds * tierFactor);
  if (!proMode.checked) {
    if (letterCount > 30) proRecommendation.textContent = `This ${letterCount}-letter phrase requires Pro mode. This device reports ${hardware}.`;
    else if (Number(maxWords.value) >= 6) proRecommendation.textContent = `Six-word searches create a much larger search space${Number(minimumLength.value) <= 2 ? ", especially with a 2-letter minimum" : ""}. This search will stop after about ${seconds} seconds and keep its best results.`;
    else proRecommendation.textContent = `Standard mode is recommended for this ${letterCount || "short"}-letter phrase.`;
    return;
  }
  const advice = tier === "high" ? "Deep search should be a good starting point." : tier === "medium" ? "Start with Quick or Deep search." : "Start with Quick search and use required words or a template.";
  proRecommendation.textContent = `${tier[0].toUpperCase()}${tier.slice(1)}-capacity device detected (${hardware}). ${advice} Long searches stop after about ${seconds} seconds and keep their best results.`;
}

function syncProMode() {
  proWordOptions.forEach((option) => { option.hidden = !proMode.checked; });
  if (!proMode.checked && Number(maxWords.value) > 6) maxWords.value = "6";
  updateProRecommendation();
}

function searchConfiguration(mode, dictionaryKind, letterCount, usesProMode, maximumWords, shortestWord) {
  const { available, tier } = deviceProfile();
  const expanded = dictionaryKind === "expanded";
  const tierFactor = tier === "high" ? 1 : tier === "medium" ? .85 : .67;
  const baseTimeMs = mode === "exhaustive" ? 60000 : mode === "deep" ? 30000 : 15000;
  if (usesProMode && letterCount > 30) {
    const baseNodes = mode === "exhaustive" ? 150000 : mode === "deep" ? 75000 : 25000;
    const cap = mode === "exhaustive" ? 8 : mode === "deep" ? 6 : 3;
    const dictionaryFactor = expanded ? .85 : 1;
    return {
      workerCount: Math.min(available, cap),
      nodeLimit: Math.round(baseNodes * tierFactor * dictionaryFactor),
      timeLimitMs: Math.round(baseTimeMs * tierFactor)
    };
  }
  const standard = mode === "exhaustive"
    ? { workerCount: Math.min(available, 6), nodeLimit: expanded ? 1200000 : 900000 }
    : mode === "deep"
      ? { workerCount: Math.min(available, 4), nodeLimit: expanded ? 500000 : 300000 }
      : { workerCount: Math.min(available, 2), nodeLimit: expanded ? 180000 : 100000 };
  return { ...standard, timeLimitMs: Math.round(baseTimeMs * tierFactor) };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const source = input.value.trim();
  const letters = normalizeLetters(source);
  const maximumLetters = proMode.checked ? 60 : 30;
  if (letters.length < 2 || letters.length > maximumLetters) {
    const message = letters.length > maximumLetters
      ? proMode.checked
        ? "Pro mode currently supports source phrases containing up to 60 letters. Shorten the phrase or divide it into smaller searches."
        : "This phrase contains more than 30 letters. Enable experimental Pro mode to search phrases containing up to 60 letters."
      : "Enter a name or phrase containing at least 2 letters.";
    status.textContent = message;
    showValidationError(message);
    return;
  }
  const grammarValue = selectedGrammarTemplate();
  const personalWords = parsePersonalVocabulary();
  if (personalWords.total > 500) {
    showValidationError("Personal vocabulary supports up to 500 unique words. Remove some entries before searching.", "Personal vocabulary is too large", personalVocabulary);
    return;
  }
  if (grammarTemplate.value === "custom" && customGrammarSlots.length === 0) {
    const message = "Add at least one noun, verb, adjective, unrestricted, or exact-word slot to the custom template.";
    status.textContent = message;
    showValidationError(message, "Build your template", templateAddSlot);
    return;
  }
  const templateLiterals = grammarLiteralWords(grammarValue);
  if (!containsRequiredLetters(source, templateLiterals)) {
    const message = `This grammar template requires the word${templateLiterals.length === 1 ? "" : "s"} ${templateLiterals.map((word) => `“${word}”`).join(" and ")}, but those letters are not available.`;
    status.textContent = message;
    showValidationError(message, "Template cannot fit", grammarTemplate);
    return;
  }
  submit.disabled = true;
  const usesPhrasePattern = Boolean(phrasePattern.value.trim() || grammarValue);
  const hasExpensiveShape = Number(maxWords.value) >= 6;
  const showsProgressModal = usesPhrasePattern || searchMode.value === "exhaustive" || (proMode.checked && letters.length > 30) || hasExpensiveShape;
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
      grammarTemplate: grammarValue,
      lockedWords: lockedWords.value,
      preferredWords: preferredWords.value,
      excludedWords: excludedWords.value,
      excludeVulgar: excludeVulgar.checked,
      customWords: personalWords.words,
      limit: 1200,
      ...searchConfiguration(searchMode.value, dictionary.value, letters.length, proMode.checked, Number(maxWords.value), Number(minimumLength.value))
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
      : `${outcome.results.length} exact phrase${outcome.results.length === 1 ? "" : "s"} found in ${seconds}s${outcome.timeLimited ? " · time budget reached" : outcome.truncated ? " · ranked search pass" : ""} · ${workerCount} ${engine === "wasm" ? "Rust/WASM" : "JavaScript"} worker${workerCount === 1 ? "" : "s"}.`;
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

function resetAdvancedOptions(announce = false) {
  phrasePattern.value = "";
  grammarTemplate.value = "";
  grammarControl.open = false;
  dictionary.value = "standard";
  searchMode.value = "deep";
  maxWords.value = "5";
  minimumLength.value = "2";
  customGrammarSlots = [];
  templateSlotType.value = "noun";
  templateLiteral.value = "";
  templateLiteralWrap.hidden = true;
  syncTemplateBuilder();
  lockedWords.value = "";
  preferredWords.value = "";
  excludedWords.value = "";
  excludeVulgar.checked = true;
  proMode.checked = false;
  syncProMode();
  syncInputClearButtons();
  if (announce) status.textContent = "Advanced options reset to defaults.";
}

resetAdvanced.addEventListener("click", () => resetAdvancedOptions(true));

clear.addEventListener("click", () => {
  input.value = "";
  resetAdvancedOptions();
  resetResultView();
  results.replaceChildren();
  summary.textContent = "Letters, spaces, and punctuation are accepted";
  status.textContent = "Ready to architect a phrase.";
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
  updateProRecommendation();
  updatePersonalVocabulary();
});

proMode.addEventListener("change", syncProMode);
searchMode.addEventListener("change", updateProRecommendation);
maxWords.addEventListener("change", updateProRecommendation);
minimumLength.addEventListener("change", updateProRecommendation);
syncProMode();

const initialPhrase = new URLSearchParams(window.location.search).get("phrase")?.trim();
if (initialPhrase) {
  input.value = initialPhrase;
  input.dispatchEvent(new Event("input"));
  window.history.replaceState(null, "", window.location.pathname);
  queueMicrotask(() => form.requestSubmit());
}
syncInputClearButtons();
updatePersonalVocabulary();
