(function() {
	//#region assets/js/tools/anagram-architect/anagram-core.mjs
	var NAME_CASE_MINOR_WORDS = new Set("a an and as at but by for from in nor of on or over the to with yet".split(" "));
	function normalizeLetters(value) {
		return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
	}
	function letterCounts(value) {
		const counts = /* @__PURE__ */ new Uint8Array(26);
		for (const character of normalizeLetters(value)) counts[character.charCodeAt(0) - 97] += 1;
		return counts;
	}
	function isExactAnagram(source, candidate) {
		const left = normalizeLetters(source);
		const right = normalizeLetters(candidate);
		if (!left || left.length !== right.length) return false;
		const balance = letterCounts(left);
		for (const character of right) {
			const index = character.charCodeAt(0) - 97;
			if (!balance[index]) return false;
			balance[index] -= 1;
		}
		return balance.every((amount) => amount === 0);
	}
	function normalizeResultPattern(value) {
		return String(value || "").toLowerCase().replace(/[._-]/g, "?").replace(/\s+/g, "").replace(/[^a-z?*]/g, "");
	}
	function globMatches(value, pattern) {
		let valueIndex = 0;
		let patternIndex = 0;
		let starIndex = -1;
		let starValueIndex = 0;
		while (valueIndex < value.length) if (patternIndex < pattern.length && (pattern[patternIndex] === "?" || pattern[patternIndex] === value[valueIndex])) {
			valueIndex += 1;
			patternIndex += 1;
		} else if (pattern[patternIndex] === "*") {
			starIndex = patternIndex;
			patternIndex += 1;
			starValueIndex = valueIndex;
		} else if (starIndex >= 0) {
			starValueIndex += 1;
			valueIndex = starValueIndex;
			patternIndex = starIndex + 1;
		} else return false;
		while (pattern[patternIndex] === "*") patternIndex += 1;
		return patternIndex === pattern.length;
	}
	function resultMatchesSearch(phrase, query) {
		const search = String(query || "").trim().toLowerCase();
		if (!search) return true;
		if (!/[?*._-]/.test(search)) return phrase.toLowerCase().includes(search);
		return globMatches(normalizeLetters(phrase), normalizeResultPattern(search));
	}
	function filterAndPageResults(results, query = "", page = 1, pageSize = 120) {
		const filtered = results.filter(({ phrase }) => resultMatchesSearch(phrase, query));
		const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
		const currentPage = Math.max(1, Math.min(Number(page) || 1, totalPages));
		const start = (currentPage - 1) * pageSize;
		return {
			items: filtered.slice(start, start + pageSize),
			total: filtered.length,
			totalPages,
			page: currentPage,
			start: filtered.length ? start + 1 : 0,
			end: Math.min(start + pageSize, filtered.length)
		};
	}
	function mergeRankedResults(shards, limit = 1200, shortPhraseReserve = 240) {
		const merged = /* @__PURE__ */ new Map();
		for (const entries of shards) for (const result of entries) {
			const previous = merged.get(result.phrase);
			if (!previous || result.score > previous.score) merged.set(result.phrase, result);
		}
		const ranked = [...merged.values()].sort((left, right) => right.score - left.score || left.phrase.localeCompare(right.phrase));
		const functionWords = /* @__PURE__ */ new Set([
			"a",
			"an",
			"the",
			"this",
			"that",
			"of",
			"to",
			"in",
			"on",
			"at",
			"by",
			"for",
			"from",
			"with",
			"and",
			"or",
			"but",
			"is",
			"are",
			"was",
			"be",
			"up"
		]);
		const familyKey = ({ phrase }) => phrase.split(" ").filter((word) => !functionWords.has(word)).map((word) => word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word).sort().join("|");
		const familyCounts = /* @__PURE__ */ new Map();
		const diverse = ranked.filter((result) => {
			const family = familyKey(result);
			const count = familyCounts.get(family) || 0;
			if (family && count >= 1) return false;
			familyCounts.set(family, count + 1);
			return true;
		});
		const selected = /* @__PURE__ */ new Map();
		for (const result of diverse) {
			if (result.phrase.split(" ").length <= 3) selected.set(result.phrase, result);
			if (selected.size >= Math.min(shortPhraseReserve, limit)) break;
		}
		for (const result of diverse) {
			if (selected.size >= limit) break;
			selected.set(result.phrase, result);
		}
		return [...selected.values()].sort((left, right) => right.score - left.score || left.phrase.localeCompare(right.phrase)).map((result, index) => ({
			...result,
			rank: index + 1
		}));
	}
	var COMMON = new Set("a i an the and or but of to in on at by for from with as is am are was be been being old new good bad big small man woman person people base alien damn love life time world mind heart name true real great little dark light home house day night art architect".split(/\s+/));
	var DETERMINERS = new Set("a an the this that my your our his her their".split(" "));
	var PREPOSITIONS = new Set("of to in on at by for from with as into over under".split(" "));
	var CONJUNCTIONS = new Set("and or but nor yet so".split(" "));
	var ADJECTIVES = new Set("old new good bad big small great little dark light true real damn".split(" "));
	var SUBJECT_PRONOUNS = new Set("i you he she it we they".split(" "));
	var OBJECT_PRONOUNS = new Set("me him her us them".split(" "));
	var POSSESSIVE_DETERMINERS = new Set("my your our his her their".split(" "));
	var NATIONALITY_NOUNS = new Set("american australian british canadian chinese dutch english french german greek indian irish italian japanese scottish spanish welsh".split(" "));
	var COMMON_VERBS = new Set("am are be been being bug bugs can could did do does get gets got had has have is make makes may might must see sees should was were will would".split(" "));
	var TRANSITIVE_VERBS = new Set("admire avoid build call catch choose create despise drain find give hate help hit hold ignore keep kill know leave like love make meet move need open praise read save scorn see take tell use want watch".split(" "));
	var COPULAS = new Set("am are is was were be".split(" "));
	var NATURAL_PAIRS = /* @__PURE__ */ new Set([
		"old man",
		"new world",
		"good man",
		"bad man",
		"dark night",
		"a base",
		"the world",
		"of life"
	]);
	function isAdjective(word) {
		return ADJECTIVES.has(word) || /(?:ish|ful|ous)$/.test(word);
	}
	function formatAnagramPhrase(phrase, options = {}) {
		const sourceWords = String(phrase || "").match(/[a-z]+/gi) || [];
		const caseMode = [
			"title",
			"sentence",
			"upper",
			"lower",
			"name"
		].includes(options.caseMode) ? options.caseMode : "title";
		const words = sourceWords.map((sourceWord, index) => {
			const word = sourceWord.toLowerCase();
			if (caseMode === "upper") return word.toUpperCase();
			if (caseMode === "lower") return word;
			if (caseMode === "sentence") return index === 0 ? word[0].toUpperCase() + word.slice(1) : word;
			if (caseMode === "name" && index > 0 && NAME_CASE_MINOR_WORDS.has(word)) return word;
			return word[0].toUpperCase() + word.slice(1);
		});
		const separator = options.separator === "hyphen" ? "-" : options.separator === "emDash" ? " — " : " ";
		const boundaryIndex = options.boundaryIndex === "" || options.boundaryIndex == null ? NaN : Number(options.boundaryIndex);
		const boundaryMark = [
			"comma",
			"colon",
			"emDash"
		].includes(options.boundaryMark) ? options.boundaryMark : "comma";
		let formatted = words.map((word, index) => {
			if (index >= words.length - 1) return word;
			if (Number.isInteger(boundaryIndex) && boundaryIndex === index) {
				if (boundaryMark === "emDash") return `${word} — `;
				return `${word}${boundaryMark === "colon" ? ":" : ","} `;
			}
			return word + separator;
		}).join("");
		const ending = [
			".",
			"?",
			"!"
		].includes(options.ending) ? options.ending : "";
		if (ending) formatted += ending;
		return formatted;
	}
	function isTransitiveVerb(word) {
		if (TRANSITIVE_VERBS.has(word)) return true;
		if (word.endsWith("s") && TRANSITIVE_VERBS.has(word.slice(0, -1))) return true;
		if (word.endsWith("ed") && TRANSITIVE_VERBS.has(word.slice(0, -2))) return true;
		if (word.endsWith("ing") && TRANSITIVE_VERBS.has(word.slice(0, -3))) return true;
		return false;
	}
	function wordPriority(word) {
		let score = Math.min(word.length, 8) * 2;
		if (COMMON.has(word)) score += 24;
		if (DETERMINERS.has(word) || PREPOSITIONS.has(word) || CONJUNCTIONS.has(word)) score += 14;
		if (word.length === 2) score -= COMMON.has(word) ? 0 : 12;
		return score;
	}
	function phraseScore(words) {
		let score = words.reduce((total, word) => total + wordPriority(word), 0);
		if (DETERMINERS.has(words[0]) || PREPOSITIONS.has(words[0])) score -= 5;
		if (isAdjective(words[0])) score += 3;
		if (SUBJECT_PRONOUNS.has(words[0])) score += 30;
		if (DETERMINERS.has(words.at(-1)) || PREPOSITIONS.has(words.at(-1)) || CONJUNCTIONS.has(words.at(-1))) score -= 18;
		for (let index = 0; index < words.length - 1; index += 1) {
			const current = words[index];
			const next = words[index + 1];
			if (NATURAL_PAIRS.has(`${current} ${next}`)) score += 14;
			if (isAdjective(current) && !PREPOSITIONS.has(next) && !DETERMINERS.has(next)) score += 8;
			if (PREPOSITIONS.has(current) && DETERMINERS.has(next)) score += 10;
			if (DETERMINERS.has(current) && !DETERMINERS.has(next) && !PREPOSITIONS.has(next)) score += 9;
			if (current === "a" && /^[aeiou]/.test(next)) score -= 12;
			if (current === "an" && !/^[aeiou]/.test(next)) score -= 12;
			if (DETERMINERS.has(current) && DETERMINERS.has(next)) score -= 15;
			if (PREPOSITIONS.has(current) && PREPOSITIONS.has(next)) score -= 12;
			if (SUBJECT_PRONOUNS.has(current) && COMMON_VERBS.has(next)) score += 55;
			if (SUBJECT_PRONOUNS.has(current) && COPULAS.has(next)) score += 70;
			if (DETERMINERS.has(current) && isAdjective(next) && !(current === "a" && /^[aeiou]/.test(next)) && !(current === "an" && !/^[aeiou]/.test(next))) score += 35;
			if ([
				"he",
				"she",
				"it"
			].includes(current) && COMMON_VERBS.has(next)) {
				if (next.endsWith("s") && COMMON_VERBS.has(next.slice(0, -1))) score += 45;
				else if (![
					"is",
					"was",
					"has",
					"does"
				].includes(next)) score -= 30;
			}
			if (!SUBJECT_PRONOUNS.has(current) && SUBJECT_PRONOUNS.has(next)) score -= 75;
		}
		if (words.length === 3 && DETERMINERS.has(words[1])) score += isTransitiveVerb(words[0]) ? 22 : -22;
		if (words.length === 3 && isTransitiveVerb(words[0]) && POSSESSIVE_DETERMINERS.has(words[1]) && NATIONALITY_NOUNS.has(words[2])) score += 700;
		if (words.length >= 2 && OBJECT_PRONOUNS.has(words[0]) && PREPOSITIONS.has(words[1])) score -= 120;
		for (let index = 0; index < words.length - 2; index += 1) if (SUBJECT_PRONOUNS.has(words[index]) && COPULAS.has(words[index + 1]) && DETERMINERS.has(words[index + 2])) score += 90;
		return score;
	}
	function rankPhrasePermutations(phrase, limit = 720, lockedPositions = []) {
		const words = String(phrase || "").toLowerCase().match(/[a-z]+/g) || [];
		if (!words.length) return [];
		const locked = new Set((Array.isArray(lockedPositions) ? lockedPositions : []).map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < words.length));
		if (words.length - locked.size > 8) return [];
		const ranked = [];
		const used = words.map((_, index) => locked.has(index));
		const current = [];
		const visit = () => {
			if (current.length === words.length) {
				ranked.push({
					phrase: current.join(" "),
					score: phraseScore(current)
				});
				return;
			}
			if (locked.has(current.length)) {
				current.push(words[current.length]);
				visit();
				current.pop();
				return;
			}
			const seen = /* @__PURE__ */ new Set();
			for (let index = 0; index < words.length; index += 1) {
				if (used[index] || seen.has(words[index])) continue;
				seen.add(words[index]);
				used[index] = true;
				current.push(words[index]);
				visit();
				current.pop();
				used[index] = false;
			}
		};
		visit();
		return ranked.sort((left, right) => right.score - left.score || left.phrase.localeCompare(right.phrase)).slice(0, Math.max(1, Math.min(720, Number(limit) || 720))).map((result, index) => ({
			...result,
			rank: index + 1
		}));
	}
	function rankWordReplacements(phrase, wordIndex, dictionary, limit = 120) {
		const words = String(phrase || "").toLowerCase().match(/[a-z]+/g) || [];
		const index = Number(wordIndex);
		if (!Number.isInteger(index) || index < 0 || index >= words.length || !Array.isArray(dictionary)) return [];
		const original = words[index];
		const signature = [...original].sort().join("");
		const replacements = /* @__PURE__ */ new Map();
		for (const value of dictionary) {
			const word = String(value || "").toLowerCase();
			if (word === original || !/^[a-z]+$/.test(word) || word.length !== original.length) continue;
			if ([...word].sort().join("") !== signature || replacements.has(word)) continue;
			const candidateWords = words.slice();
			candidateWords[index] = word;
			replacements.set(word, {
				word,
				phrase: candidateWords.join(" "),
				score: phraseScore(candidateWords)
			});
		}
		return [...replacements.values()].sort((left, right) => right.score - left.score || left.word.localeCompare(right.word)).slice(0, Math.max(1, Math.min(500, Number(limit) || 120))).map((result, rankIndex) => ({
			...result,
			rank: rankIndex + 1
		}));
	}
	//#endregion
	//#region assets/js/tools/anagram-architect/anagram-architect.js
	var form = document.querySelector("#anagram-form");
	var input = document.querySelector("#anagram-input");
	var results = document.querySelector("#anagram-results");
	var status = document.querySelector("#anagram-status");
	var summary = document.querySelector("#anagram-summary");
	var submit = document.querySelector("#anagram-submit");
	var clear = document.querySelector("#anagram-clear");
	var maxWords = document.querySelector("#anagram-max-words");
	var minimumLength = document.querySelector("#anagram-min-length");
	var dictionary = document.querySelector("#anagram-dictionary");
	var searchMode = document.querySelector("#anagram-search-mode");
	var timeBudget = document.querySelector("#anagram-time-budget");
	var proMode = document.querySelector("#anagram-pro-mode");
	var proRecommendation = document.querySelector("#anagram-pro-recommendation");
	var proWordOptions = document.querySelectorAll("[data-pro-option]");
	var phrasePattern = document.querySelector("#anagram-phrase-pattern");
	var grammarTemplate = document.querySelector("#anagram-grammar-template");
	var grammarControl = document.querySelector("#anagram-grammar-control");
	var grammarTemplateButtons = document.querySelectorAll("[data-grammar-template]");
	var templateBuilder = document.querySelector("#anagram-template-builder");
	var templateSlots = document.querySelector("#anagram-template-slots");
	var templateSlotType = document.querySelector("#anagram-custom-slot-type");
	var templateLiteralWrap = document.querySelector("#anagram-custom-literal-wrap");
	var templateLiteral = document.querySelector("#anagram-custom-literal");
	var templateAddSlot = document.querySelector("#anagram-add-template-slot");
	var templatePreview = document.querySelector("#anagram-template-preview");
	var lockedWords = document.querySelector("#anagram-locked-words");
	var preferredWords = document.querySelector("#anagram-preferred-words");
	var excludedWords = document.querySelector("#anagram-excluded-words");
	var personalVocabulary = document.querySelector("#anagram-personal-vocabulary");
	var personalVocabularyCount = document.querySelector("#anagram-personal-vocabulary-count");
	var personalVocabularySummary = document.querySelector("#anagram-personal-vocabulary-summary");
	var excludeVulgar = document.querySelector("#anagram-exclude-vulgar");
	var resetAdvanced = document.querySelector("#anagram-reset-advanced");
	var pickList = document.querySelector("#anagram-pick-list");
	var pickCount = document.querySelector("#anagram-pick-count");
	var pickClear = document.querySelector("#anagram-pick-clear");
	var pickEmpty = document.querySelector("#anagram-pick-empty");
	var pickEntriesElement = document.querySelector("#anagram-pick-entries");
	var resultTools = document.querySelector("#anagram-result-tools");
	var resultSearch = document.querySelector("#anagram-result-search");
	var pageSummary = document.querySelector("#anagram-page-summary");
	var previousPage = document.querySelector("#anagram-previous-page");
	var nextPage = document.querySelector("#anagram-next-page");
	var progressModal = document.querySelector("#anagram-progress-modal");
	var progressMessage = document.querySelector("#anagram-progress-message");
	var progressBar = progressModal.querySelector("[role=\"progressbar\"]");
	var progressFill = progressBar.querySelector("span");
	var progressCancel = document.querySelector("#anagram-progress-cancel");
	var progressBackground = document.querySelector("#anagram-progress-background");
	var progressKicker = document.querySelector("#anagram-progress-kicker");
	var progressDetail = document.querySelector("#anagram-progress-detail");
	var progressPreview = document.querySelector("#anagram-progress-preview");
	var validationModal = document.querySelector("#anagram-validation-modal");
	var validationTitle = document.querySelector("#anagram-validation-title");
	var validationMessage = document.querySelector("#anagram-validation-message");
	var validationClose = document.querySelector("#anagram-validation-close");
	var pickDrawerBackdrop = document.querySelector("#anagram-pick-drawer-backdrop");
	var pickDrawer = document.querySelector("#anagram-pick-drawer");
	var pickDrawerClose = document.querySelector("#anagram-pick-drawer-close");
	var pickDrawerPreview = document.querySelector("#anagram-pick-drawer-preview");
	var pickDrawerContext = document.querySelector("#anagram-pick-drawer-context");
	var pickDrawerTabs = document.querySelector("#anagram-pick-drawer-tabs");
	var pickDrawerContent = document.querySelector("#anagram-pick-drawer-content");
	var analysis = document.querySelector("#anagram-analysis");
	var analysisPhase = document.querySelector("#anagram-analysis-phase");
	var analysisProgress = analysis.querySelector("[role=\"progressbar\"]");
	var analysisProgressFill = analysisProgress.querySelector("span");
	var metricProgress = document.querySelector("#anagram-metric-progress");
	var metricProgressLabel = document.querySelector("#anagram-metric-progress-label");
	var metricRate = document.querySelector("#anagram-metric-rate");
	var metricMatches = document.querySelector("#anagram-metric-matches");
	var metricRetained = document.querySelector("#anagram-metric-retained");
	var workerLanes = document.querySelector("#anagram-worker-lanes");
	var throughputChart = document.querySelector("#anagram-throughput-chart");
	var throughputRate = document.querySelector("#anagram-throughput-rate");
	var currentLeader = document.querySelector("#anagram-current-leader");
	var analysisFoot = document.querySelector("#anagram-analysis-foot");
	var workerHarmCount = document.querySelector("#anagram-worker-harm-count");
	var analysisCancel = document.querySelector("#anagram-analysis-cancel");
	var examples = document.querySelectorAll("[data-anagram-example]");
	var inputClearButtons = document.querySelectorAll("[data-clear-input]");
	var PAGE_SIZE = 120;
	var PICK_STORAGE_KEY = "monkeytactics.anagram-architect.pick-list.v1";
	var WORKER_HARM_STORAGE_KEY = "monkeytactics.anagram-architect.workers-harmed.v1";
	var PERSONAL_VOCABULARY_STORAGE_KEY = "monkeytactics.anagram-architect.personal-vocabulary.v1";
	var currentSource = "";
	var searchRequestId = 0;
	var allResults = [];
	var currentPage = 1;
	var activeSearch = null;
	var telemetryStarted = 0;
	var telemetryTimeLimitMs = 0;
	var throughputSamples = [];
	var pickEntries = readPickList();
	var customGrammarSlots = [];
	var harmedWorkers = readHarmedWorkers();
	var draggedTemplateIndex = null;
	var pointerTemplateDrag = null;
	var pickDictionaryPromises = /* @__PURE__ */ new Map();
	form.dataset.architectReady = "true";
	function readHarmedWorkers() {
		try {
			return Math.max(0, Number(sessionStorage.getItem(WORKER_HARM_STORAGE_KEY)) || 0);
		} catch {
			return 0;
		}
	}
	function harmWorkers(count) {
		if (!count) return;
		harmedWorkers += count;
		try {
			sessionStorage.setItem(WORKER_HARM_STORAGE_KEY, String(harmedWorkers));
		} catch {}
		renderWorkerHarm();
	}
	function renderWorkerHarm() {
		workerHarmCount.textContent = harmedWorkers === 0 ? "No WASM workers harmed this session. Yet." : harmedWorkers === 1 ? "1 WASM worker harmed this session. It knew the risks." : `${harmedWorkers.toLocaleString()} WASM workers harmed this session. They knew the risks.`;
	}
	renderWorkerHarm();
	function parsePersonalVocabulary() {
		const tokens = personalVocabulary.value.toLowerCase().match(/[a-z]+/g) || [];
		const unique = [...new Set(tokens.filter((word) => word.length >= 2 && word.length <= 30))];
		return {
			words: unique.slice(0, 500),
			total: unique.length,
			invalid: tokens.length - unique.length
		};
	}
	function personalWordFitsSource(word, source) {
		const available = /* @__PURE__ */ new Map();
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
		try {
			localStorage.setItem(PERSONAL_VOCABULARY_STORAGE_KEY, personalVocabulary.value);
		} catch {}
		personalVocabularyCount.textContent = `${Math.min(total, 500)} of 500 words`;
		const relevant = words.filter((word) => personalWordFitsSource(word, input.value)).length;
		personalVocabularySummary.textContent = total > 500 ? `Limit exceeded: remove ${total - 500} word${total - 500 === 1 ? "" : "s"} before searching.` : `${relevant} relevant to this phrase${invalid ? ` · ${invalid} duplicate or invalid entr${invalid === 1 ? "y" : "ies"} ignored` : ""}. Saved in this browser; words are allowed, not required.`;
		personalVocabularySummary.classList.toggle("is-warning", total > 500);
	}
	try {
		personalVocabulary.value = localStorage.getItem(PERSONAL_VOCABULARY_STORAGE_KEY) || "";
	} catch {}
	personalVocabulary.addEventListener("input", updatePersonalVocabulary);
	function syncInputClearButtons() {
		inputClearButtons.forEach((button) => {
			button.hidden = !document.getElementById(button.dataset.clearInput)?.value;
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
		} catch {
			return [];
		}
	}
	function savePickList() {
		localStorage.setItem(PICK_STORAGE_KEY, JSON.stringify(pickEntries));
	}
	function isPicked(phrase) {
		return pickEntries.some((entry) => entry.phrase.toLowerCase() === phrase.toLowerCase());
	}
	var GRAMMAR_TEMPLATE_LITERALS = {
		"noun-of-noun": ["of"],
		"verb-the-noun": ["the"],
		"adjective-noun": [],
		"noun-in-the-noun": ["in", "the"]
	};
	var CUSTOM_SLOT_LABELS = {
		noun: "Noun",
		verb: "Verb",
		adjective: "Adjective",
		any: "Any word"
	};
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
		return clientY < bounds.top + bounds.height / 2 || Math.abs(clientY - (bounds.top + bounds.height / 2)) < bounds.height / 3 && clientX < bounds.left + bounds.width / 2;
	}
	function renderCustomTemplate() {
		const fragment = document.createDocumentFragment();
		customGrammarSlots.forEach((slot, index) => {
			const item = document.createElement("li");
			item.className = "anagram-template-slot";
			item.dataset.index = String(index);
			item.draggable = true;
			item.tabIndex = 0;
			const label = document.createElement("span");
			label.textContent = slot.kind === "literal" ? `“${slot.word}”` : `[${CUSTOM_SLOT_LABELS[slot.kind]}]`;
			item.setAttribute("aria-label", `${label.textContent}. Drag to reorder or press Alt plus Left or Right Arrow.`);
			const remove = document.createElement("button");
			remove.type = "button";
			remove.textContent = "×";
			remove.setAttribute("aria-label", `Remove ${label.textContent}`);
			remove.addEventListener("click", () => {
				customGrammarSlots.splice(index, 1);
				renderCustomTemplate();
			});
			item.addEventListener("keydown", (event) => {
				if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
				const target = event.key === "ArrowLeft" ? index - 1 : index + 1;
				if (target < 0 || target >= customGrammarSlots.length) return;
				event.preventDefault();
				[customGrammarSlots[index], customGrammarSlots[target]] = [customGrammarSlots[target], customGrammarSlots[index]];
				renderCustomTemplate();
				templateSlots.children[target]?.focus();
			});
			item.addEventListener("dragstart", (event) => {
				draggedTemplateIndex = index;
				item.classList.add("is-dragging");
				event.dataTransfer.effectAllowed = "move";
				event.dataTransfer.setData("text/plain", String(index));
			});
			item.addEventListener("dragover", (event) => {
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				markTemplateDrop(item, templateDropPosition(item, event.clientX, event.clientY));
			});
			item.addEventListener("drop", (event) => {
				event.preventDefault();
				moveCustomTemplateSlot(draggedTemplateIndex ?? Number(event.dataTransfer.getData("text/plain")), index, item.classList.contains("drop-before"));
				draggedTemplateIndex = null;
				clearTemplateDropState();
			});
			item.addEventListener("dragend", () => {
				draggedTemplateIndex = null;
				clearTemplateDropState();
			});
			item.addEventListener("pointerdown", (event) => {
				if (event.pointerType === "mouse" || event.target.closest("button")) return;
				pointerTemplateDrag = {
					pointerId: event.pointerId,
					from: index,
					target: index,
					before: true
				};
				item.setPointerCapture(event.pointerId);
				item.classList.add("is-dragging");
			});
			item.addEventListener("pointermove", (event) => {
				if (!pointerTemplateDrag || pointerTemplateDrag.pointerId !== event.pointerId) return;
				const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".anagram-template-slot");
				if (!target || !templateSlots.contains(target)) return;
				const before = templateDropPosition(target, event.clientX, event.clientY);
				pointerTemplateDrag.target = Number(target.dataset.index);
				pointerTemplateDrag.before = before;
				markTemplateDrop(target, before);
			});
			const finishPointerDrag = (event) => {
				if (!pointerTemplateDrag || pointerTemplateDrag.pointerId !== event.pointerId) return;
				const { from, target, before } = pointerTemplateDrag;
				pointerTemplateDrag = null;
				clearTemplateDropState();
				moveCustomTemplateSlot(from, target, before);
			};
			item.addEventListener("pointerup", finishPointerDrag);
			item.addEventListener("pointercancel", () => {
				pointerTemplateDrag = null;
				clearTemplateDropState();
			});
			item.append(label, remove);
			fragment.append(item);
		});
		templateSlots.replaceChildren(fragment);
		templatePreview.textContent = customGrammarSlots.length ? `Template: ${customGrammarSlots.map((slot) => slot.kind === "literal" ? slot.word : `[${CUSTOM_SLOT_LABELS[slot.kind]}]`).join(" ")}` : "Add at least one slot to build your template.";
	}
	function syncTemplateBuilder() {
		grammarTemplateButtons.forEach((button) => {
			const selected = button.dataset.grammarTemplate === grammarTemplate.value;
			button.setAttribute("aria-pressed", String(selected));
		});
		templateBuilder.hidden = grammarTemplate.value !== "custom";
		if (!templateBuilder.hidden) renderCustomTemplate();
	}
	templateSlotType.addEventListener("change", () => {
		templateLiteralWrap.hidden = templateSlotType.value !== "literal";
	});
	templateAddSlot.addEventListener("click", () => {
		if (customGrammarSlots.length >= 10) {
			showValidationError("Custom templates support up to 10 slots.", "Template is full", templateAddSlot);
			return;
		}
		const kind = templateSlotType.value;
		if (kind === "literal") {
			const word = templateLiteral.value.trim().toLowerCase();
			if (!/^[a-z]+$/.test(word)) {
				showValidationError("Enter one exact word using letters only.", "Add an exact word", templateLiteral);
				return;
			}
			customGrammarSlots.push({
				kind,
				word
			});
			templateLiteral.value = "";
			syncInputClearButtons();
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
		const available = /* @__PURE__ */ new Map();
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
		return new Set((Array.isArray(entry.lockedPositions) ? entry.lockedPositions : []).map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < wordCount));
	}
	function buildPanelCloseButton(panel, label) {
		const close = document.createElement("button");
		close.type = "button";
		close.className = "anagram-pick-panel-close";
		close.textContent = "×";
		close.setAttribute("aria-label", label);
		close.addEventListener("click", () => panel.dispatchEvent(new Event("anagramclose")));
		return close;
	}
	async function decodeDictionaryResponse(response) {
		const bytes = new Uint8Array(await response.arrayBuffer());
		if (bytes[0] !== 31 || bytes[1] !== 139) return new TextDecoder().decode(bytes);
		if (!("DecompressionStream" in window)) throw new Error("This browser cannot open the compressed local dictionary.");
		return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
	}
	function loadPickDictionary(kind) {
		if (pickDictionaryPromises.has(kind)) return pickDictionaryPromises.get(kind);
		const promise = (async () => {
			const response = await fetch(`/assets/data/words/${kind === "expanded" ? "manifest.wiktionary-v1.json" : "manifest.enable-v1.json"}`);
			if (!response.ok) throw new Error("The local dictionary manifest could not be loaded.");
			const manifest = await response.json();
			return (await Promise.all(Object.values(manifest.chunks).map(async ({ file }) => {
				const chunkResponse = await fetch(`/assets/data/words/${file}`);
				if (!chunkResponse.ok) throw new Error("A local dictionary file could not be loaded.");
				return decodeDictionaryResponse(chunkResponse);
			}))).flatMap((text) => text.split(/\r?\n/).map((line) => line.split("	", 1)[0]).filter(Boolean));
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
		const panel = document.createElement("div");
		panel.className = "anagram-pick-permutations";
		panel.hidden = true;
		const close = buildPanelCloseButton(panel, "Close reorder mode");
		const heading = document.createElement("strong");
		const hint = document.createElement("small");
		hint.textContent = "Lock words in place, then drag a locked word between the other words to move its fixed position. Select an ordering or double-click one to use it immediately.";
		const lockControls = document.createElement("div");
		lockControls.className = "anagram-pick-locks";
		lockControls.setAttribute("aria-label", "Lock words in position");
		const select = document.createElement("select");
		select.size = Math.min(6, alternatives.length);
		select.setAttribute("aria-label", `Word-order alternatives for ${entry.phrase}`);
		const refreshAlternatives = () => {
			alternatives = rankPhrasePermutations(entry.phrase, 720, [...locked]);
			const movableWords = words.length - locked.size;
			const locksNeeded = Math.max(0, movableWords - 8);
			heading.textContent = alternatives.length ? `${alternatives.length} distinct word-order alternative${alternatives.length === 1 ? "" : "s"}${locked.size ? ` · ${locked.size} word${locked.size === 1 ? "" : "s"} locked` : ""}` : movableWords > 8 ? "Word-order alternatives unavailable" : "No distinct word-order alternatives";
			hint.textContent = movableWords > 8 ? `This phrase has ${movableWords} movable words. Arrange can rank up to 8 movable words because possible orders grow rapidly. Lock at least ${locksNeeded} more word${locksNeeded === 1 ? "" : "s"} to enable alternatives.` : "Lock words in place, then drag a locked word between the other words to move its fixed position. Select an ordering or double-click one to use it immediately.";
			select.replaceChildren(...alternatives.map((alternative) => {
				const option = document.createElement("option");
				option.value = alternative.phrase;
				option.textContent = `#${alternative.rank} ${titleCase(alternative.phrase)}`;
				return option;
			}));
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
			const tokens = words.map((word, originalIndex) => ({
				word,
				originalIndex
			}));
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
				const button = document.createElement("button");
				button.type = "button";
				const isLocked = locked.has(index);
				button.dataset.lockIndex = String(index);
				button.setAttribute("aria-pressed", String(isLocked));
				button.textContent = `${isLocked ? "↔ 🔒" : "○"} ${titleCase(word)}`;
				button.draggable = isLocked;
				button.setAttribute("aria-label", `${isLocked ? `Locked ${word} in position ${index + 1}. Drag to move or click to unlock` : `Lock ${word} in position ${index + 1}`}`);
				button.addEventListener("click", () => {
					if (suppressLockedClick) {
						suppressLockedClick = false;
						return;
					}
					if (locked.has(index)) locked.delete(index);
					else locked.add(index);
					entry.lockedPositions = [...locked].sort((left, right) => left - right);
					savePickList();
					renderLockControls();
					refreshAlternatives();
				});
				button.addEventListener("dragstart", (event) => {
					if (!locked.has(index)) {
						event.preventDefault();
						return;
					}
					draggedLockedIndex = index;
					button.classList.add("is-dragging");
					event.dataTransfer.effectAllowed = "move";
					event.dataTransfer.setData("text/plain", String(index));
				});
				button.addEventListener("dragover", (event) => {
					if (draggedLockedIndex === null || draggedLockedIndex === index) return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
					markLockedDrop(button, templateDropPosition(button, event.clientX, event.clientY));
				});
				button.addEventListener("drop", (event) => {
					event.preventDefault();
					const fromIndex = draggedLockedIndex ?? Number(event.dataTransfer.getData("text/plain"));
					const before = button.classList.contains("drop-before");
					draggedLockedIndex = null;
					clearLockedDropState();
					moveLockedWord(fromIndex, index, before);
				});
				button.addEventListener("dragend", () => {
					draggedLockedIndex = null;
					clearLockedDropState();
				});
				button.addEventListener("pointerdown", (event) => {
					if (event.pointerType === "mouse" || !locked.has(index)) return;
					pointerLockedDrag = {
						pointerId: event.pointerId,
						from: index,
						target: index,
						before: true
					};
					button.setPointerCapture(event.pointerId);
					button.classList.add("is-dragging");
				});
				button.addEventListener("pointermove", (event) => {
					if (!pointerLockedDrag || pointerLockedDrag.pointerId !== event.pointerId) return;
					const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-lock-index]");
					if (!target || !lockControls.contains(target)) return;
					const before = templateDropPosition(target, event.clientX, event.clientY);
					pointerLockedDrag.target = Number(target.dataset.lockIndex);
					pointerLockedDrag.before = before;
					markLockedDrop(target, before);
				});
				const finishPointerDrag = (event) => {
					if (!pointerLockedDrag || pointerLockedDrag.pointerId !== event.pointerId) return;
					const { from, target, before } = pointerLockedDrag;
					pointerLockedDrag = null;
					suppressLockedClick = from !== target || !before;
					clearLockedDropState();
					moveLockedWord(from, target, before);
				};
				button.addEventListener("pointerup", finishPointerDrag);
				button.addEventListener("pointercancel", () => {
					pointerLockedDrag = null;
					clearLockedDropState();
				});
				return button;
			}));
		};
		renderLockControls();
		refreshAlternatives();
		const actions = document.createElement("div");
		actions.className = "anagram-pick-permutation-actions";
		const use = document.createElement("button");
		use.type = "button";
		use.textContent = "Use this order";
		const applySelectedOrder = () => {
			const selectedPhrase = select.value || entry.phrase;
			if (!alternatives.some(({ phrase }) => phrase === selectedPhrase)) return;
			entry.phrase = selectedPhrase;
			panel.dispatchEvent(new Event("anagramentrychange"));
			savePickList();
			renderPickList();
			renderResults();
		};
		use.addEventListener("click", applySelectedOrder);
		select.addEventListener("dblclick", applySelectedOrder);
		actions.append(use);
		panel.append(close, heading, hint, lockControls, select, actions);
		return panel;
	}
	function buildFormatPanel(entry) {
		const panel = document.createElement("div");
		panel.className = "anagram-pick-format";
		panel.hidden = true;
		const close = buildPanelCloseButton(panel, "Close format mode");
		const heading = document.createElement("strong");
		heading.textContent = "Style capitalization and punctuation";
		const hint = document.createElement("small");
		hint.textContent = "Formatting never changes the letters in the underlying anagram.";
		const options = {
			caseMode: "title",
			separator: "space",
			ending: "",
			boundaryIndex: "",
			boundaryMark: "comma",
			...entry.formatOptions || {}
		};
		const preview = document.createElement("strong");
		preview.className = "anagram-pick-format-preview";
		const feedback = document.createElement("small");
		feedback.className = "anagram-pick-permutation-feedback";
		feedback.setAttribute("aria-live", "polite");
		const saveOptions = () => {
			entry.formatOptions = { ...options };
			savePickList();
			preview.textContent = formatAnagramPhrase(entry.phrase, options);
			panel.dispatchEvent(new CustomEvent("anagramformatchange", { detail: { formattedPhrase: preview.textContent } }));
		};
		const makeButtonGroup = (label, choices, key) => {
			const group = document.createElement("div");
			group.className = "anagram-pick-format-group";
			group.setAttribute("aria-label", label);
			choices.forEach(([value, text]) => {
				const button = document.createElement("button");
				button.type = "button";
				button.textContent = text;
				button.dataset.optionKey = key;
				button.dataset.optionValue = value;
				const refresh = () => button.setAttribute("aria-pressed", String(options[key] === value));
				button.addEventListener("click", () => {
					options[key] = value;
					[...group.children].forEach((child) => child.setAttribute("aria-pressed", "false"));
					refresh();
					saveOptions();
				});
				refresh();
				group.append(button);
			});
			return group;
		};
		const caseLabel = document.createElement("small");
		caseLabel.textContent = "Capitalization";
		const caseModes = makeButtonGroup("Capitalization presets", [
			["title", "Title Case"],
			["sentence", "Sentence case"],
			["upper", "ALL CAPS"],
			["name", "Name Case"],
			["lower", "lowercase"]
		], "caseMode");
		const separatorLabel = document.createElement("small");
		separatorLabel.textContent = "Word separator";
		const separators = makeButtonGroup("Word separator", [
			["space", "Spaces"],
			["hyphen", "Hyphens"],
			["emDash", "Em dashes"]
		], "separator");
		const endingLabel = document.createElement("small");
		endingLabel.textContent = "Ending";
		const endings = makeButtonGroup("Ending punctuation", [
			["", "None"],
			[".", "."],
			["?", "?"],
			["!", "!"]
		], "ending");
		const breakControls = document.createElement("div");
		breakControls.className = "anagram-pick-format-selects";
		const boundary = document.createElement("select");
		boundary.setAttribute("aria-label", "Insert punctuation after word");
		const noBoundary = document.createElement("option");
		noBoundary.value = "";
		noBoundary.textContent = "No internal break";
		boundary.append(noBoundary);
		(entry.phrase.match(/[a-z]+/gi) || []).slice(0, -1).forEach((word, index) => {
			const option = document.createElement("option");
			option.value = String(index);
			option.textContent = `Break after ${titleCase(word)}`;
			boundary.append(option);
		});
		boundary.value = String(options.boundaryIndex ?? "");
		const boundaryMark = document.createElement("select");
		boundaryMark.setAttribute("aria-label", "Internal punctuation mark");
		[
			["comma", "Comma"],
			["colon", "Colon"],
			["emDash", "Em dash"]
		].forEach(([value, text]) => {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = text;
			boundaryMark.append(option);
		});
		boundaryMark.value = options.boundaryMark;
		boundary.addEventListener("change", () => {
			options.boundaryIndex = boundary.value;
			saveOptions();
		});
		boundaryMark.addEventListener("change", () => {
			options.boundaryMark = boundaryMark.value;
			saveOptions();
		});
		breakControls.append(boundary, boundaryMark);
		const actions = document.createElement("div");
		actions.className = "anagram-pick-permutation-actions";
		const reset = document.createElement("button");
		reset.type = "button";
		reset.textContent = "Reset formatting";
		reset.addEventListener("click", () => {
			Object.assign(options, {
				caseMode: "title",
				separator: "space",
				ending: "",
				boundaryIndex: "",
				boundaryMark: "comma"
			});
			boundary.value = "";
			boundaryMark.value = "comma";
			panel.querySelectorAll("[data-option-key]").forEach((button) => button.setAttribute("aria-pressed", String(options[button.dataset.optionKey] === button.dataset.optionValue)));
			saveOptions();
			renderResults();
		});
		const copy = document.createElement("button");
		copy.type = "button";
		copy.textContent = "Copy formatted";
		copy.addEventListener("click", async () => {
			const formatted = formatAnagramPhrase(entry.phrase, options);
			if (!isExactAnagram(entry.phrase, formatted)) return;
			await navigator.clipboard.writeText(formatted);
			feedback.textContent = "Copied formatted phrase.";
		});
		actions.append(reset, copy);
		saveOptions();
		panel.append(close, heading, hint, caseLabel, caseModes, separatorLabel, separators, endingLabel, endings, breakControls, preview, actions, feedback);
		return panel;
	}
	function buildWordSwapPanel(entry) {
		const panel = document.createElement("div");
		panel.className = "anagram-pick-swaps";
		panel.hidden = true;
		const close = buildPanelCloseButton(panel, "Close word swap mode");
		const heading = document.createElement("strong");
		heading.textContent = "Choose the word that feels wrong";
		const hint = document.createElement("small");
		hint.textContent = "Exact-letter replacements keep the complete phrase a valid anagram.";
		const wordButtons = document.createElement("div");
		wordButtons.className = "anagram-pick-word-buttons";
		const definitionPanel = document.createElement("section");
		definitionPanel.className = "anagram-pick-word-definitions";
		definitionPanel.setAttribute("aria-live", "polite");
		const definitionHeading = document.createElement("strong");
		definitionHeading.textContent = "Word definitions";
		const definitionContent = document.createElement("div");
		definitionContent.textContent = "Select a word to see all of its local definitions.";
		definitionPanel.append(definitionHeading, definitionContent);
		const replacement = document.createElement("select");
		replacement.hidden = true;
		replacement.setAttribute("aria-label", "Exact-letter replacement words");
		const preview = document.createElement("strong");
		preview.className = "anagram-pick-swap-preview";
		preview.textContent = titleCase(entry.phrase);
		const replacementDefinition = document.createElement("section");
		replacementDefinition.className = "anagram-pick-replacement-definition";
		replacementDefinition.setAttribute("aria-live", "polite");
		replacementDefinition.hidden = true;
		const feedback = document.createElement("small");
		feedback.className = "anagram-pick-permutation-feedback";
		feedback.setAttribute("aria-live", "polite");
		const use = document.createElement("button");
		use.type = "button";
		use.textContent = "Use replacement";
		use.disabled = true;
		let alternatives = [];
		let definitionRequestId = 0;
		let replacementDefinitionRequestId = 0;
		const showDefinitions = async (word) => {
			const requestId = ++definitionRequestId;
			definitionHeading.textContent = `Definition: ${titleCase(word)}`;
			definitionContent.textContent = "Loading definitions…";
			try {
				const result = await globalThis.MonkeyTacticsWordDefinitions?.lookup(word, { allowRemote: false });
				if (requestId !== definitionRequestId) return;
				const definitions = [...new Set((result?.entries || []).flatMap(({ defs = [] }) => defs).map((value) => String(value).replace(/^[a-z]+\t/i, "").trim()).filter(Boolean))];
				if (!definitions.length) {
					definitionContent.textContent = "No local definition is available for this word.";
					return;
				}
				const list = document.createElement("ol");
				definitions.forEach((text) => {
					const item = document.createElement("li");
					item.textContent = text;
					list.append(item);
				});
				definitionContent.replaceChildren(list);
			} catch {
				if (requestId === definitionRequestId) definitionContent.textContent = "Definitions could not be loaded.";
			}
		};
		const showReplacementDefinitions = async (word) => {
			const requestId = ++replacementDefinitionRequestId;
			replacementDefinition.hidden = false;
			replacementDefinition.textContent = `Loading definitions for ${titleCase(word)}…`;
			try {
				const result = await globalThis.MonkeyTacticsWordDefinitions?.lookup(word, { allowRemote: false });
				if (requestId !== replacementDefinitionRequestId) return;
				const definitions = [...new Set((result?.entries || []).flatMap(({ defs = [] }) => defs).map((value) => String(value).replace(/^[a-z]+\t/i, "").trim()).filter(Boolean))];
				const heading = document.createElement("strong");
				heading.textContent = `Definition: ${titleCase(word)}`;
				const content = document.createElement("div");
				if (definitions.length) {
					const list = document.createElement("ol");
					definitions.forEach((text) => {
						const item = document.createElement("li");
						item.textContent = text;
						list.append(item);
					});
					content.append(list);
				} else content.textContent = "No local definition is available for this replacement.";
				replacementDefinition.replaceChildren(heading, content);
			} catch {
				if (requestId === replacementDefinitionRequestId) replacementDefinition.textContent = "Replacement definitions could not be loaded.";
			}
		};
		(entry.phrase.toLowerCase().match(/[a-z]+/g) || []).forEach((word, wordIndex) => {
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = titleCase(word);
			button.setAttribute("aria-pressed", "false");
			button.addEventListener("click", async () => {
				const wasSelected = button.getAttribute("aria-pressed") === "true";
				wordButtons.querySelectorAll("button").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
				if (wasSelected) {
					button.setAttribute("aria-pressed", "false");
					replacement.hidden = true;
					replacement.value = "";
					use.disabled = true;
					replacementDefinitionRequestId += 1;
					replacementDefinition.hidden = true;
					replacementDefinition.replaceChildren();
					preview.textContent = titleCase(entry.phrase);
					feedback.textContent = "Choose a word to see exact-letter alternatives.";
					definitionRequestId += 1;
					definitionHeading.textContent = "Word definitions";
					definitionContent.textContent = "Select a word to see all of its local definitions.";
					return;
				}
				showDefinitions(word);
				replacementDefinitionRequestId += 1;
				replacementDefinition.hidden = true;
				replacementDefinition.replaceChildren();
				replacement.hidden = true;
				use.disabled = true;
				preview.textContent = titleCase(entry.phrase);
				feedback.textContent = `Loading ${dictionary.value} dictionary alternatives for ${word}…`;
				try {
					alternatives = rankWordReplacements(entry.phrase, wordIndex, await loadPickDictionary(dictionary.value));
					replacement.replaceChildren();
					const prompt = document.createElement("option");
					prompt.value = "";
					prompt.textContent = alternatives.length ? "Select a replacement" : "No exact-letter alternatives";
					prompt.selected = true;
					replacement.append(prompt);
					alternatives.forEach((alternative) => {
						const option = document.createElement("option");
						option.value = alternative.phrase;
						option.textContent = `#${alternative.rank} ${titleCase(alternative.word)} — ${titleCase(alternative.phrase)}`;
						replacement.append(option);
					});
					replacement.hidden = false;
					feedback.textContent = alternatives.length ? `${alternatives.length} exact-letter alternative${alternatives.length === 1 ? "" : "s"}` : `No other ${dictionary.value} dictionary words use exactly those letters.`;
				} catch (error) {
					feedback.textContent = error instanceof Error ? error.message : "The local dictionary could not be loaded.";
				}
			});
			wordButtons.append(button);
		});
		replacement.addEventListener("change", () => {
			const selected = alternatives.find(({ phrase }) => phrase === replacement.value);
			preview.textContent = titleCase(selected?.phrase || entry.phrase);
			use.disabled = !selected;
			if (selected) showReplacementDefinitions(selected.word);
			else {
				replacementDefinitionRequestId += 1;
				replacementDefinition.hidden = true;
				replacementDefinition.replaceChildren();
			}
		});
		use.addEventListener("click", () => {
			const selected = alternatives.find(({ phrase }) => phrase === replacement.value);
			if (!selected || !isExactAnagram(entry.phrase, selected.phrase)) return;
			entry.phrase = selected.phrase;
			panel.dispatchEvent(new Event("anagramentrychange"));
			savePickList();
			renderPickList();
			renderResults();
		});
		const actions = document.createElement("div");
		actions.className = "anagram-pick-permutation-actions";
		actions.append(use);
		panel.append(close, heading, hint, wordButtons, definitionPanel, replacement, preview, replacementDefinition, actions, feedback);
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
			panels.forEach(([, panel], index) => {
				panel.hidden = index !== activeIndex;
			});
		};
		const tabs = panels.map(([label], index) => {
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = label;
			button.setAttribute("role", "tab");
			button.addEventListener("click", () => activate(index));
			return button;
		});
		const wirePanel = (panel) => {
			panel.addEventListener("anagramformatchange", ({ detail }) => {
				pickDrawerPreview.textContent = detail.formattedPhrase;
				rowPhrase.textContent = detail.formattedPhrase;
			});
			panel.addEventListener("anagramphrasechange", ({ detail }) => {
				const formatted = formatAnagramPhrase(detail.phrase, entry.formatOptions);
				pickDrawerPreview.textContent = formatted;
				rowPhrase.textContent = formatted;
				[[1, buildWordSwapPanel], [2, buildFormatPanel]].forEach(([index, buildPanel]) => {
					const previous = panels[index][1];
					const replacement = buildPanel(entry);
					replacement.hidden = previous.hidden;
					wirePanel(replacement);
					previous.replaceWith(replacement);
					panels[index][1] = replacement;
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
	pickDrawerBackdrop.addEventListener("click", (event) => {
		if (event.target === pickDrawerBackdrop) closePickDrawer();
	});
	pickDrawer.addEventListener("keydown", (event) => {
		if (event.key === "Escape") closePickDrawer();
	});
	function renderPickList() {
		pickCount.textContent = `${pickEntries.length} ${pickEntries.length === 1 ? "pick" : "picks"}`;
		pickClear.disabled = pickEntries.length === 0;
		pickEmpty.hidden = pickEntries.length > 0;
		const fragment = document.createDocumentFragment();
		pickEntries.forEach((entry) => {
			const row = document.createElement("div");
			row.className = "anagram-pick-entry";
			const phrase = document.createElement("strong");
			phrase.textContent = formatAnagramPhrase(entry.phrase, entry.formatOptions);
			const context = document.createElement("small");
			context.textContent = `From ${entry.source}${entry.rank ? ` · rank #${entry.rank}` : ""}`;
			const actions = document.createElement("div");
			actions.className = "anagram-pick-entry-actions";
			const copy = document.createElement("button");
			copy.type = "button";
			copy.textContent = "Copy";
			copy.setAttribute("aria-label", `Copy ${entry.phrase}`);
			copy.addEventListener("click", async () => {
				await navigator.clipboard.writeText(formatAnagramPhrase(entry.phrase, entry.formatOptions));
				copy.textContent = "Copied";
				setTimeout(() => {
					copy.textContent = "Copy";
				}, 1200);
			});
			const edit = document.createElement("button");
			edit.type = "button";
			edit.textContent = "Edit";
			edit.setAttribute("aria-haspopup", "dialog");
			edit.setAttribute("aria-label", `Edit ${entry.phrase}`);
			edit.addEventListener("click", () => openPickDrawer(entry, edit, phrase));
			const moreWrap = document.createElement("span");
			moreWrap.className = "anagram-pick-more";
			const more = document.createElement("button");
			more.type = "button";
			more.textContent = "⋯";
			more.setAttribute("aria-label", `More actions for ${entry.phrase}`);
			more.setAttribute("aria-expanded", "false");
			const remove = document.createElement("button");
			remove.type = "button";
			remove.textContent = "Remove";
			remove.setAttribute("aria-label", `Remove ${entry.phrase} from the Pick List`);
			remove.addEventListener("click", () => {
				pickEntries = pickEntries.filter((candidate) => candidate.phrase.toLowerCase() !== entry.phrase.toLowerCase());
				savePickList();
				renderPickList();
				renderResults();
			});
			remove.hidden = true;
			more.addEventListener("click", () => {
				const opening = remove.hidden;
				remove.hidden = !opening;
				more.setAttribute("aria-expanded", String(opening));
			});
			moreWrap.append(more, remove);
			actions.append(copy, edit, moreWrap);
			row.append(phrase, context, actions);
			fragment.append(row);
		});
		pickEntriesElement.replaceChildren(fragment);
	}
	function togglePick(result) {
		if (isPicked(result.phrase)) pickEntries = pickEntries.filter((entry) => entry.phrase.toLowerCase() !== result.phrase.toLowerCase());
		else pickEntries.unshift({
			phrase: result.phrase,
			source: currentSource,
			rank: result.rank,
			lockedPositions: [],
			savedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
		pickEntries = pickEntries.slice(0, 100);
		savePickList();
		renderPickList();
		renderResults();
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
		samples.forEach((value, index) => {
			const x = index / (samples.length - 1) * width;
			const y = height - 6 - value / peak * (height - 14);
			if (index === 0) context.moveTo(x, y);
			else context.lineTo(x, y);
		});
		context.strokeStyle = "#2dd4bf";
		context.lineWidth = 4;
		context.stroke();
	}
	function workerRoleLabel(index, workerCount) {
		if (workerCount > 1 && index === 0) return "short-phrase";
		if (workerCount > 2 && index === 1) return "compact-phrase";
		const specialistCount = workerCount > 2 ? 2 : workerCount > 1 ? 1 : 0;
		const generalCount = workerCount - specialistCount;
		const generalIndex = index - specialistCount;
		if (generalIndex === 0) return generalCount > 1 ? `core + general 1/${generalCount}` : "core + general";
		return `general ${generalIndex + 1}/${generalCount}`;
	}
	function beginTelemetry(workerCount, timeLimitMs = 0) {
		telemetryStarted = performance.now();
		telemetryTimeLimitMs = Math.max(0, Number(timeLimitMs) || 0);
		throughputSamples = [];
		analysis.hidden = false;
		analysis.open = true;
		metricProgressLabel.textContent = "search progress";
		analysisCancel.hidden = false;
		analysisPhase.textContent = "Loading";
		workerLanes.replaceChildren(...Array.from({ length: workerCount }, (_, index) => {
			const lane = document.createElement("div");
			lane.className = "anagram-worker-lane";
			lane.innerHTML = `<span>Worker ${index + 1} <small>(${workerRoleLabel(index, workerCount)})</small></span><div class="anagram-worker-track"><span></span></div><output>0%</output>`;
			return lane;
		}));
		updateTelemetry(Array.from({ length: workerCount }, () => ({
			nodes: 0,
			nodeLimit: 1,
			found: 0,
			matchesSeen: 0,
			candidateCount: 0,
			prunedPaths: 0
		})), []);
	}
	function updateTelemetry(progress, ranked, complete = false, budgetExhausted = false) {
		const nodes = progress.reduce((sum, item) => sum + (item.nodes || 0), 0);
		const budget = progress.reduce((sum, item) => sum + (item.nodeLimit || 0), 0) || 1;
		const percent = complete ? 100 : Math.min(100, nodes / budget * 100);
		const elapsed = Math.max(.001, (performance.now() - telemetryStarted) / 1e3);
		const rate = Math.round(nodes / elapsed);
		throughputSamples.push(rate);
		throughputSamples = throughputSamples.slice(-48);
		drawThroughput(throughputSamples);
		analysisPhase.textContent = complete ? "Complete" : "Searching";
		analysisProgress.setAttribute("aria-valuenow", String(Math.round(percent)));
		analysisProgressFill.style.width = `${percent}%`;
		metricProgress.textContent = `${Math.round(percent)}%`;
		metricRate.textContent = rate.toLocaleString();
		throughputRate.textContent = `${rate.toLocaleString()} branches/s`;
		metricMatches.textContent = progress.reduce((sum, item) => sum + (item.matchesSeen || 0), 0).toLocaleString();
		metricRetained.textContent = ranked.length.toLocaleString();
		currentLeader.textContent = ranked[0] ? titleCase(ranked[0].phrase) : complete ? "No matching phrase found" : "Waiting for an exact phrase…";
		const remainingSeconds = telemetryTimeLimitMs ? Math.max(0, telemetryTimeLimitMs / 1e3 - elapsed) : 0;
		const budgetStatus = telemetryTimeLimitMs ? budgetExhausted || remainingSeconds <= 0 ? " · budget exhausted" : complete ? ` · ${Math.ceil(remainingSeconds)}s budget remaining` : ` · ${Math.ceil(remainingSeconds)}s until budget exhausted` : "";
		analysisFoot.textContent = `${Math.max(...progress.map((item) => item.candidateCount || 0)).toLocaleString()} candidate words · ${progress.reduce((sum, item) => sum + (item.prunedPaths || 0), 0).toLocaleString()} duplicate paths pruned · ${elapsed.toFixed(1)}s elapsed${budgetStatus}`;
		[...workerLanes.children].forEach((lane, index) => {
			const item = progress[index];
			const value = item?.done ? 100 : Math.min(100, (item?.nodes || 0) / (item?.nodeLimit || 1) * 100);
			lane.querySelector(".anagram-worker-track span").style.width = `${value}%`;
			lane.querySelector("output").textContent = item?.done ? "Done" : `${Math.round(value)}%`;
		});
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
			const workerOptions = {
				...options,
				deadlineEpochMs
			};
			const workerCount = options.workerCount;
			const workers = [];
			const shardResults = Array.from({ length: workerCount }, () => []);
			const shardProgress = Array.from({ length: workerCount }, () => ({
				nodes: 0,
				nodeLimit: options.nodeLimit,
				found: 0
			}));
			const shardEngines = Array.from({ length: workerCount }, () => "");
			const countedHarm = /* @__PURE__ */ new Set();
			const completedShards = /* @__PURE__ */ new Set();
			const completions = [];
			let settled = false;
			let hardTimeout = null;
			let loadedWordCount = 0;
			beginTelemetry(workerCount, options.timeLimitMs);
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
				settled = true;
				clearTimeout(hardTimeout);
				terminateAll();
				activeSearch = null;
				reject(error);
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
				updateTelemetry(shardProgress.map((entry) => ({
					...entry,
					done: true
				})), mergedResults, true, true);
				resolve({
					outcome: {
						results: mergedResults,
						nodes,
						truncated: true,
						timeLimited: true
					},
					wordCount: loadedWordCount,
					engine: shardEngines.every((engine) => engine === "wasm") ? "wasm" : "javascript",
					wasmFailure: "",
					workerCount
				});
			};
			activeSearch = {
				workers,
				reject: fail,
				countStoppedWorkers: () => countHarmedShards(shardEngines.map((_, index) => index))
			};
			const handleMessage = (shardIndex, worker, data) => {
				if (!settled && deadlineEpochMs && Date.now() >= deadlineEpochMs && data?.type !== "complete") {
					finishTimedOut();
					return;
				}
				if (data?.type === "progress") {
					if (data.wordCount) loadedWordCount = data.wordCount;
					if (data.phase === "dictionary") {
						const percent = data.completed / data.total * 35;
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
						const percent = 35 + nodes / totalBudget * 64;
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
					progressPreview.replaceChildren(...allResults.slice(0, 5).map(({ phrase }) => {
						const item = document.createElement("li");
						item.textContent = titleCase(phrase);
						return item;
					}));
					return;
				}
				if (data?.type === "engine") {
					shardEngines[shardIndex] = data.engine;
					return;
				}
				worker.terminate();
				if (data?.type !== "complete") {
					fail(new Error(data?.message || "Anagram Architect could not complete the search."));
					return;
				}
				shardEngines[shardIndex] = data.engine || shardEngines[shardIndex];
				if (data.outcome.timeLimited) countHarmedShards([shardIndex]);
				completedShards.add(shardIndex);
				shardResults[shardIndex] = data.outcome.results;
				completions.push(data);
				if (completions.length === workerCount && !settled) {
					settled = true;
					clearTimeout(hardTimeout);
					activeSearch = null;
					analysisCancel.hidden = true;
					const nodes = completions.reduce((sum, entry) => sum + entry.outcome.nodes, 0);
					const mergedResults = mergeResults();
					const budgetExhausted = completions.some((entry) => entry.outcome.timeLimited);
					updateTelemetry(shardProgress.map((entry) => ({
						...entry,
						done: true
					})), mergedResults, true, budgetExhausted);
					resolve({
						outcome: {
							results: mergedResults,
							nodes,
							truncated: completions.some((entry) => entry.outcome.truncated),
							timeLimited: completions.some((entry) => entry.outcome.timeLimited)
						},
						wordCount: completions[0].wordCount,
						engine: completions.every((entry) => entry.engine === "wasm") ? "wasm" : "javascript",
						wasmFailure: completions.map((entry) => entry.wasmFailure).filter(Boolean).join("; "),
						workerCount
					});
				}
			};
			for (let shardIndex = 0; shardIndex < workerCount; shardIndex += 1) {
				const worker = new Worker("/assets/js/tools/anagram-architect/anagram-worker.bundle.js?v=20260917-05", { type: "module" });
				workers.push(worker);
				worker.addEventListener("message", ({ data }) => handleMessage(shardIndex, worker, data));
				worker.addEventListener("error", () => fail(/* @__PURE__ */ new Error("A parallel anagram worker could not start. Reload the page and try again.")));
				const shortPhraseSpecialist = workerCount > 1 && shardIndex === 0;
				const compactPhraseSpecialist = workerCount > 2 && shardIndex === 1;
				const specialistCount = workerCount > 2 ? 2 : workerCount > 1 ? 1 : 0;
				const isSpecialist = shortPhraseSpecialist || compactPhraseSpecialist;
				const generalShardIndex = shardIndex - specialistCount;
				worker.postMessage({
					type: "solve",
					source,
					options: {
						...workerOptions,
						maxWords: shortPhraseSpecialist ? Math.min(options.maxWords, 3) : compactPhraseSpecialist ? Math.min(options.maxWords, 4) : options.maxWords,
						shardIndex: isSpecialist ? 0 : generalShardIndex,
						shardCount: isSpecialist ? 1 : workerCount - specialistCount,
						deterministicCore: shortPhraseSpecialist || !isSpecialist && generalShardIndex === 0
					},
					dictionary: dictionaryKind
				});
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
		analysis.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	});
	function titleCase(phrase) {
		return phrase.charAt(0).toUpperCase() + phrase.slice(1);
	}
	function getPage() {
		const page = filterAndPageResults(allResults, resultSearch.value, currentPage, PAGE_SIZE);
		currentPage = page.page;
		return {
			...page,
			offset: page.start ? page.start - 1 : 0
		};
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
		pageSummary.textContent = page.total ? `Showing ${first}–${last} of ${page.total.toLocaleString()} · Page ${currentPage} of ${page.totalPages}` : `No phrases match “${resultSearch.value.trim()}”`;
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
			const actions = document.createElement("div");
			actions.className = "anagram-result-actions";
			const pick = document.createElement("button");
			pick.type = "button";
			pick.textContent = isPicked(phrase) ? "Picked" : "Pick";
			pick.setAttribute("aria-pressed", String(isPicked(phrase)));
			pick.addEventListener("click", () => togglePick({
				phrase,
				rank
			}));
			const button = document.createElement("button");
			button.type = "button";
			button.textContent = "Copy";
			button.addEventListener("click", async () => {
				await navigator.clipboard.writeText(titleCase(phrase));
				button.textContent = "Copied";
				setTimeout(() => {
					button.textContent = "Copy";
				}, 1200);
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
		return {
			available,
			memory,
			tier: available >= 8 && (!memory || memory >= 8) ? "high" : available >= 4 && (!memory || memory >= 4) ? "medium" : "low"
		};
	}
	function selectedTimeBudgetMs(mode = searchMode.value) {
		if (timeBudget.value !== "auto") return Number(timeBudget.value) * 1e3;
		return mode === "exhaustive" ? 12e4 : mode === "deep" ? 6e4 : 15e3;
	}
	function updateProRecommendation() {
		const letterCount = normalizeLetters(input.value).length;
		const { available, memory, tier } = deviceProfile();
		const hardware = `${available} logical processor${available === 1 ? "" : "s"}${memory ? ` and about ${memory} GB device memory` : ""}`;
		const seconds = Math.round(selectedTimeBudgetMs() / 1e3);
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
		proWordOptions.forEach((option) => {
			option.hidden = !proMode.checked;
		});
		if (!proMode.checked && Number(maxWords.value) > 6) maxWords.value = "6";
		updateProRecommendation();
	}
	function searchConfiguration(mode, dictionaryKind, letterCount, usesProMode, maximumWords, shortestWord) {
		const { available, tier } = deviceProfile();
		const expanded = dictionaryKind === "expanded";
		const tierFactor = tier === "high" ? 1 : tier === "medium" ? .85 : .67;
		const baseTimeMs = selectedTimeBudgetMs(mode);
		if (usesProMode && letterCount > 30) {
			const baseNodes = mode === "exhaustive" ? 15e4 : mode === "deep" ? 75e3 : 25e3;
			const cap = mode === "exhaustive" ? 8 : mode === "deep" ? 6 : 3;
			const dictionaryFactor = expanded ? .85 : 1;
			return {
				workerCount: Math.min(available, cap),
				nodeLimit: Math.round(baseNodes * tierFactor * dictionaryFactor),
				timeLimitMs: timeBudget.value === "auto" && letterCount > 30 ? Math.round(baseTimeMs * tierFactor) : baseTimeMs
			};
		}
		return {
			...mode === "exhaustive" ? {
				workerCount: Math.min(available, 6),
				nodeLimit: expanded ? 12e5 : 9e5
			} : mode === "deep" ? {
				workerCount: Math.min(available, 4),
				nodeLimit: expanded ? 5e5 : 3e5
			} : {
				workerCount: Math.min(available, 2),
				nodeLimit: expanded ? 18e4 : 1e5
			},
			timeLimitMs: baseTimeMs
		};
	}
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const requestId = ++searchRequestId;
		const source = input.value.trim();
		const letters = normalizeLetters(source);
		const maximumLetters = proMode.checked ? 60 : 30;
		if (letters.length < 2 || letters.length > maximumLetters) {
			const message = letters.length > maximumLetters ? proMode.checked ? "Pro mode currently supports source phrases containing up to 60 letters. Shorten the phrase or divide it into smaller searches." : "This phrase contains more than 30 letters. Enable experimental Pro mode to search phrases containing up to 60 letters." : "Enter a name or phrase containing at least 2 letters.";
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
		const showsProgressModal = usesPhrasePattern || searchMode.value === "exhaustive" || proMode.checked && letters.length > 30 || hasExpensiveShape;
		if (showsProgressModal) showPatternProgress("Loading the local dictionary…", usesPhrasePattern);
		resetResultView();
		results.replaceChildren();
		currentSource = source;
		summary.textContent = `${letters.length} letters available`;
		const started = performance.now();
		try {
			status.textContent = "Loading the local dictionary…";
			const { outcome, wordCount, engine, wasmFailure, workerCount } = await solveInWorker(source, {
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
			}, dictionary.value, showsProgressModal);
			status.textContent = `Architecting exact phrases from ${wordCount.toLocaleString()} words…`;
			if (showsProgressModal) updatePatternProgress("Finalizing your exact matches…", 100);
			allResults = outcome.results;
			renderResults();
			metricProgressLabel.textContent = outcome.timeLimited ? "time budget used" : "search complete";
			analysisPhase.textContent = outcome.timeLimited ? "Budget reached" : "Complete";
			const seconds = ((performance.now() - started) / 1e3).toFixed(1);
			status.textContent = outcome.results.length === 0 && grammarTemplate.value ? `No exact phrases matched the selected grammar template in ${seconds}s. Try another template, Expanded dictionary, or a different source phrase.` : `${outcome.results.length} exact phrase${outcome.results.length === 1 ? "" : "s"} found in ${seconds}s${outcome.timeLimited ? " · time budget reached" : outcome.truncated ? " · ranked search pass" : ""} · ${workerCount} ${engine === "wasm" ? "Rust/WASM" : "JavaScript"} worker${workerCount === 1 ? "" : "s"}.`;
			if (wasmFailure) console.warn("Rust/WASM fallback:", wasmFailure);
		} catch (error) {
			if (requestId === searchRequestId) status.textContent = error?.name === "AbortError" ? "Anagram search cancelled." : error instanceof Error ? error.message : "Anagram Architect could not complete the search.";
		} finally {
			if (requestId === searchRequestId) {
				submit.disabled = false;
				analysisCancel.hidden = true;
				if (showsProgressModal) hidePatternProgress();
			}
		}
	});
	function resetAdvancedOptions(announce = false) {
		phrasePattern.value = "";
		grammarTemplate.value = "";
		grammarControl.open = false;
		dictionary.value = "standard";
		searchMode.value = "deep";
		timeBudget.value = "auto";
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
		resultTools.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	});
	nextPage.addEventListener("click", () => {
		currentPage += 1;
		renderResults();
		resultTools.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	});
	examples.forEach((button) => button.addEventListener("click", () => {
		input.value = button.dataset.anagramExample;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.focus();
	}));
	pickClear.addEventListener("click", (event) => {
		event.preventDefault();
		if (!pickEntries.length) return;
		pickEntries = [];
		savePickList();
		renderPickList();
		renderResults();
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
	timeBudget.addEventListener("change", updateProRecommendation);
	maxWords.addEventListener("change", updateProRecommendation);
	minimumLength.addEventListener("change", updateProRecommendation);
	syncProMode();
	var initialPhrase = new URLSearchParams(window.location.search).get("phrase")?.trim();
	if (initialPhrase) {
		input.value = initialPhrase;
		input.dispatchEvent(new Event("input"));
		window.history.replaceState(null, "", window.location.pathname);
		queueMicrotask(() => form.requestSubmit());
	}
	syncInputClearButtons();
	updatePersonalVocabulary();
	//#endregion
})();
