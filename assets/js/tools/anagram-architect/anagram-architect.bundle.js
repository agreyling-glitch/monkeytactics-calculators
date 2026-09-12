(function() {
	//#region assets/js/tools/anagram-architect/anagram-core.mjs
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
	new Set("a i an the and or but of to in on at by for from with as is am are was be been being old new good bad big small man woman person people base alien damn love life time world mind heart name true real great little dark light home house day night art architect".split(/\s+/));
	new Set("a an the this that my your our his her their".split(" "));
	new Set("of to in on at by for from with as into over under".split(" "));
	new Set("and or but nor yet so".split(" "));
	new Set("old new good bad big small great little dark light true real damn".split(" "));
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
	var phrasePattern = document.querySelector("#anagram-phrase-pattern");
	var lockedWords = document.querySelector("#anagram-locked-words");
	var preferredWords = document.querySelector("#anagram-preferred-words");
	var excludedWords = document.querySelector("#anagram-excluded-words");
	var excludeVulgar = document.querySelector("#anagram-exclude-vulgar");
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
	var analysis = document.querySelector("#anagram-analysis");
	var analysisPhase = document.querySelector("#anagram-analysis-phase");
	var analysisProgress = analysis.querySelector("[role=\"progressbar\"]");
	var analysisProgressFill = analysisProgress.querySelector("span");
	var metricProgress = document.querySelector("#anagram-metric-progress");
	var metricRate = document.querySelector("#anagram-metric-rate");
	var metricMatches = document.querySelector("#anagram-metric-matches");
	var metricRetained = document.querySelector("#anagram-metric-retained");
	var workerLanes = document.querySelector("#anagram-worker-lanes");
	var throughputChart = document.querySelector("#anagram-throughput-chart");
	var currentLeader = document.querySelector("#anagram-current-leader");
	var analysisFoot = document.querySelector("#anagram-analysis-foot");
	var analysisCancel = document.querySelector("#anagram-analysis-cancel");
	var examples = document.querySelectorAll("[data-anagram-example]");
	var PAGE_SIZE = 120;
	var PICK_STORAGE_KEY = "monkeytactics.anagram-architect.pick-list.v1";
	var currentSource = "";
	var allResults = [];
	var currentPage = 1;
	var activeSearch = null;
	var telemetryStarted = 0;
	var throughputSamples = [];
	var pickEntries = readPickList();
	form.dataset.architectReady = "true";
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
	function renderPickList() {
		pickCount.textContent = `${pickEntries.length} ${pickEntries.length === 1 ? "pick" : "picks"}`;
		pickClear.disabled = pickEntries.length === 0;
		pickEmpty.hidden = pickEntries.length > 0;
		const fragment = document.createDocumentFragment();
		pickEntries.forEach((entry) => {
			const row = document.createElement("div");
			row.className = "anagram-pick-entry";
			const phrase = document.createElement("strong");
			phrase.textContent = titleCase(entry.phrase);
			const context = document.createElement("small");
			context.textContent = `From ${entry.source}${entry.rank ? ` · rank #${entry.rank}` : ""}`;
			const actions = document.createElement("div");
			actions.className = "anagram-pick-entry-actions";
			const copy = document.createElement("button");
			copy.type = "button";
			copy.textContent = "Copy";
			copy.setAttribute("aria-label", `Copy ${entry.phrase}`);
			copy.addEventListener("click", async () => {
				await navigator.clipboard.writeText(titleCase(entry.phrase));
				copy.textContent = "Copied";
				setTimeout(() => {
					copy.textContent = "Copy";
				}, 1200);
			});
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
			actions.append(copy, remove);
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
	function beginTelemetry(workerCount) {
		telemetryStarted = performance.now();
		throughputSamples = [];
		analysis.hidden = false;
		analysis.open = true;
		analysisCancel.hidden = false;
		analysisPhase.textContent = "Loading";
		workerLanes.replaceChildren(...Array.from({ length: workerCount }, (_, index) => {
			const lane = document.createElement("div");
			lane.className = "anagram-worker-lane";
			lane.innerHTML = `<span>Worker ${index + 1}</span><div class="anagram-worker-track"><span></span></div><output>0%</output>`;
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
	function updateTelemetry(progress, ranked, complete = false) {
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
		metricMatches.textContent = progress.reduce((sum, item) => sum + (item.matchesSeen || 0), 0).toLocaleString();
		metricRetained.textContent = ranked.length.toLocaleString();
		currentLeader.textContent = ranked[0] ? titleCase(ranked[0].phrase) : "Waiting for an exact phrase…";
		analysisFoot.textContent = `${Math.max(...progress.map((item) => item.candidateCount || 0)).toLocaleString()} candidate words · ${progress.reduce((sum, item) => sum + (item.prunedPaths || 0), 0).toLocaleString()} duplicate paths pruned · ${elapsed.toFixed(1)}s elapsed`;
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
	function solveInWorker(source, options, dictionaryKind, showProgress) {
		return new Promise((resolve, reject) => {
			const workerCount = options.workerCount;
			const workers = [];
			const shardResults = Array.from({ length: workerCount }, () => []);
			const shardProgress = Array.from({ length: workerCount }, () => ({
				nodes: 0,
				nodeLimit: options.nodeLimit,
				found: 0
			}));
			const completions = [];
			let settled = false;
			beginTelemetry(workerCount);
			const terminateAll = () => workers.forEach((worker) => worker.terminate());
			const mergeResults = () => {
				return mergeRankedResults(shardResults, options.limit);
			};
			const fail = (error) => {
				if (settled) return;
				settled = true;
				terminateAll();
				activeSearch = null;
				reject(error);
			};
			activeSearch = {
				workers,
				reject: fail
			};
			const handleMessage = (shardIndex, worker, data) => {
				if (data?.type === "progress") {
					if (data.phase === "dictionary") {
						const percent = data.completed / data.total * 35;
						const message = `Loading dictionaries for ${workerCount} parallel worker${workerCount === 1 ? "" : "s"}…`;
						status.textContent = message;
						if (showProgress) updatePatternProgress(message, percent);
					} else {
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
				if (data?.type === "engine") return;
				worker.terminate();
				if (data?.type !== "complete") {
					fail(new Error(data?.message || "Anagram Architect could not complete the search."));
					return;
				}
				shardResults[shardIndex] = data.outcome.results;
				completions.push(data);
				if (completions.length === workerCount && !settled) {
					settled = true;
					activeSearch = null;
					analysisCancel.hidden = true;
					const nodes = completions.reduce((sum, entry) => sum + entry.outcome.nodes, 0);
					const mergedResults = mergeResults();
					updateTelemetry(shardProgress.map((entry) => ({
						...entry,
						done: true
					})), mergedResults, true);
					resolve({
						outcome: {
							results: mergedResults,
							nodes,
							truncated: completions.some((entry) => entry.outcome.truncated)
						},
						wordCount: completions[0].wordCount,
						engine: completions.every((entry) => entry.engine === "wasm") ? "wasm" : "javascript",
						wasmFailure: completions.map((entry) => entry.wasmFailure).filter(Boolean).join("; "),
						workerCount
					});
				}
			};
			for (let shardIndex = 0; shardIndex < workerCount; shardIndex += 1) {
				const worker = new Worker("/assets/js/tools/anagram-architect/anagram-worker.bundle.js?v=20260912-26", { type: "module" });
				workers.push(worker);
				worker.addEventListener("message", ({ data }) => handleMessage(shardIndex, worker, data));
				worker.addEventListener("error", () => fail(/* @__PURE__ */ new Error("A parallel anagram worker could not start. Reload the page and try again.")));
				const shortPhraseSpecialist = workerCount > 1 && shardIndex === 0;
				const compactPhraseSpecialist = workerCount > 2 && shardIndex === 1;
				const specialistCount = workerCount > 2 ? 2 : workerCount > 1 ? 1 : 0;
				const isSpecialist = shortPhraseSpecialist || compactPhraseSpecialist;
				worker.postMessage({
					type: "solve",
					source,
					options: {
						...options,
						maxWords: shortPhraseSpecialist ? Math.min(options.maxWords, 3) : compactPhraseSpecialist ? Math.min(options.maxWords, 4) : options.maxWords,
						shardIndex: isSpecialist ? 0 : shardIndex - specialistCount,
						shardCount: isSpecialist ? 1 : workerCount - specialistCount
					},
					dictionary: dictionaryKind
				});
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
			meta.textContent = `${phrase.split(" ").length} words · ${normalizeLetters(phrase).length} letters · exact match`;
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
	function searchConfiguration(mode, dictionaryKind) {
		const available = Math.max(1, Math.min(8, navigator.hardwareConcurrency || 2));
		const expanded = dictionaryKind === "expanded";
		if (mode === "exhaustive") return {
			workerCount: Math.min(available, 6),
			nodeLimit: expanded ? 12e5 : 9e5
		};
		if (mode === "deep") return {
			workerCount: Math.min(available, 4),
			nodeLimit: expanded ? 5e5 : 3e5
		};
		return {
			workerCount: Math.min(available, 2),
			nodeLimit: expanded ? 18e4 : 1e5
		};
	}
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const source = input.value.trim();
		const letters = normalizeLetters(source);
		if (letters.length < 2 || letters.length > 30) {
			status.textContent = "Enter a name or phrase containing 2 to 30 letters.";
			input.focus();
			return;
		}
		submit.disabled = true;
		const usesPhrasePattern = Boolean(phrasePattern.value.trim());
		const showsProgressModal = usesPhrasePattern || searchMode.value === "exhaustive";
		if (showsProgressModal) showPatternProgress("Loading the local dictionary…", usesPhrasePattern);
		resetResultView();
		results.replaceChildren();
		summary.textContent = `${letters.length} letters available`;
		const started = performance.now();
		try {
			status.textContent = "Loading the local dictionary…";
			const { outcome, wordCount, engine, wasmFailure, workerCount } = await solveInWorker(source, {
				maxWords: Number(maxWords.value),
				minimumLength: Number(minimumLength.value),
				pattern: phrasePattern.value,
				lockedWords: lockedWords.value,
				preferredWords: preferredWords.value,
				excludedWords: excludedWords.value,
				excludeVulgar: excludeVulgar.checked,
				limit: 1200,
				...searchConfiguration(searchMode.value, dictionary.value)
			}, dictionary.value, showsProgressModal);
			status.textContent = `Architecting exact phrases from ${wordCount.toLocaleString()} words…`;
			if (showsProgressModal) updatePatternProgress("Finalizing your exact matches…", 100);
			currentSource = source;
			allResults = outcome.results;
			renderResults();
			const seconds = ((performance.now() - started) / 1e3).toFixed(1);
			status.textContent = `${outcome.results.length} exact phrase${outcome.results.length === 1 ? "" : "s"} found in ${seconds}s${outcome.truncated ? " · ranked search pass" : ""} · ${workerCount} ${engine === "wasm" ? "Rust/WASM" : "JavaScript"} worker${workerCount === 1 ? "" : "s"}.`;
			if (wasmFailure) console.warn("Rust/WASM fallback:", wasmFailure);
		} catch (error) {
			status.textContent = error?.name === "AbortError" ? "Anagram search cancelled." : error instanceof Error ? error.message : "Anagram Architect could not complete the search.";
		} finally {
			submit.disabled = false;
			analysisCancel.hidden = true;
			if (showsProgressModal) hidePatternProgress();
		}
	});
	clear.addEventListener("click", () => {
		input.value = "";
		phrasePattern.value = "";
		lockedWords.value = "";
		preferredWords.value = "";
		excludedWords.value = "";
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
	});
	var initialPhrase = new URLSearchParams(window.location.search).get("phrase")?.trim();
	if (initialPhrase) {
		input.value = initialPhrase;
		input.dispatchEvent(new Event("input"));
		window.history.replaceState(null, "", window.location.pathname);
		queueMicrotask(() => form.requestSubmit());
	}
	//#endregion
})();
