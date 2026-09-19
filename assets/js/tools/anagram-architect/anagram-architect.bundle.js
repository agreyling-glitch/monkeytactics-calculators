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
	//#region assets/js/tools/anagram-architect/anagram-share-reveal.js
	var REVEAL_SIZE = Object.freeze([960, 540]);
	var DURATIONS = Object.freeze({
		calm: 8e3,
		normal: 6500,
		dramatic: 5200
	});
	var LOOP_PAUSE_MS = 1500;
	var BRAND_NAME = "Anagram Architect";
	var BRAND_URL = "https://monkeytactics.com/tools/anagram-architect";
	function lettersWithIdentity(text) {
		const counts = /* @__PURE__ */ new Map();
		return [...text].flatMap((glyph, textIndex) => {
			if (!/[a-z]/i.test(glyph)) return [];
			const key = glyph.toLowerCase();
			const occurrence = counts.get(key) || 0;
			counts.set(key, occurrence + 1);
			return [{
				key,
				occurrence,
				identity: `${key}-${occurrence}`,
				glyph,
				textIndex
			}];
		});
	}
	function mapExactAnagramLetters(source, result) {
		const destinations = /* @__PURE__ */ new Map();
		lettersWithIdentity(result).forEach((letter) => destinations.set(letter.identity, letter));
		return lettersWithIdentity(source).map((letter) => ({
			...letter,
			destination: destinations.get(letter.identity) || null
		}));
	}
	function ease(value) {
		return value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
	}
	function clamp(value, low = 0, high = 1) {
		return Math.min(high, Math.max(low, value));
	}
	function seeded(identity) {
		return [...identity].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 17) / 997;
	}
	function fitFont(context, text, width, height) {
		let size = Math.min(height * .115, width * .095);
		context.font = `800 ${size}px Inter, system-ui, sans-serif`;
		while (size > 30 && context.measureText(text).width > width * .86) {
			size -= 2;
			context.font = `800 ${size}px Inter, system-ui, sans-serif`;
		}
		return size;
	}
	function glyphLayout(context, text, width, centerY, fontSize) {
		context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
		let x = (width - context.measureText(text).width) / 2;
		const positions = /* @__PURE__ */ new Map();
		[...text].forEach((glyph, index) => {
			const glyphWidth = context.measureText(glyph).width;
			positions.set(index, {
				x: x + glyphWidth / 2,
				y: centerY,
				glyph
			});
			x += glyphWidth;
		});
		return positions;
	}
	function wrapText(context, text, maxWidth) {
		const words = text.split(/\s+/).filter(Boolean);
		const lines = [];
		let line = "";
		words.forEach((word) => {
			const candidate = line ? `${line} ${word}` : word;
			if (line && context.measureText(candidate).width > maxWidth) {
				lines.push(line);
				line = word;
			} else line = candidate;
		});
		if (line) lines.push(line);
		return lines;
	}
	function drawFinalText(context, text, width, centerY, fontSize, alpha = 1) {
		context.save();
		context.globalAlpha = alpha;
		context.fillStyle = "#f8fafc";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
		const lines = wrapText(context, text, width * .86);
		const lineHeight = fontSize * 1.14;
		lines.forEach((line, index) => context.fillText(line, width / 2, centerY + (index - (lines.length - 1) / 2) * lineHeight));
		context.restore();
	}
	function drawBackdrop(context, width, height) {
		const gradient = context.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, "#071421");
		gradient.addColorStop(.58, "#102038");
		gradient.addColorStop(1, "#0f172a");
		context.fillStyle = gradient;
		context.fillRect(0, 0, width, height);
	}
	function drawBranding(context, width, height) {
		context.save();
		context.fillStyle = "rgba(153,246,228,.78)";
		context.font = `700 ${Math.max(13, Math.round(width * .018))}px Inter, system-ui, sans-serif`;
		context.textAlign = "right";
		context.textBaseline = "bottom";
		context.fillText(BRAND_NAME, width - width * .035, height - height * .04);
		context.restore();
	}
	function drawParticles(context, x, y, identity, amount, width, height) {
		if (amount <= 0 || amount >= 1) return;
		const seed = seeded(identity);
		context.save();
		for (let index = 0; index < 6; index += 1) {
			const phase = seed * 19 + index * 1.73;
			const distance = (1 - amount) * width * (.008 + index * .003);
			const radius = Math.max(1.5, width * (.0017 + index * 25e-5)) * (1 - amount * .5);
			context.globalAlpha = .26 + (1 - Math.abs(.5 - amount) * 2) * .48;
			context.fillStyle = index % 2 ? "#f5b942" : "#5eead4";
			context.beginPath();
			context.arc(x + Math.cos(phase + amount * 7) * distance, y + Math.sin(phase + amount * 6) * distance + height * .012 * (1 - amount), radius, 0, Math.PI * 2);
			context.fill();
		}
		context.restore();
	}
	function wandPoint(progress, width, height, centerY) {
		return {
			x: width * (.08 + progress * .84),
			y: centerY - height * (.16 + Math.sin(progress * Math.PI) * .16)
		};
	}
	function drawWand(context, progress, width, height, centerY) {
		const point = wandPoint(progress, width, height, centerY);
		const trailStart = Math.max(0, progress - .28);
		context.save();
		context.lineCap = "round";
		context.beginPath();
		for (let step = 0; step <= 18; step += 1) {
			const trailPoint = wandPoint(trailStart + (progress - trailStart) * step / 18, width, height, centerY);
			if (!step) context.moveTo(trailPoint.x, trailPoint.y);
			else context.lineTo(trailPoint.x, trailPoint.y);
		}
		context.shadowColor = "#5eead4";
		context.shadowBlur = width * .025;
		context.strokeStyle = "rgba(153,246,228,.58)";
		context.lineWidth = Math.max(2, width * .004);
		context.stroke();
		context.shadowColor = "#f5b942";
		context.shadowBlur = width * .018;
		context.strokeStyle = "rgba(254,240,138,.9)";
		context.lineWidth = Math.max(1, width * .0015);
		context.stroke();
		context.shadowBlur = width * .02;
		context.fillStyle = "#fff7cc";
		context.beginPath();
		context.arc(point.x, point.y, Math.max(4, width * .006), 0, Math.PI * 2);
		context.fill();
		context.shadowBlur = width * .012;
		context.strokeStyle = "#cbd5e1";
		context.lineWidth = Math.max(4, width * .006);
		context.beginPath();
		context.moveTo(point.x - width * .055, point.y + height * .09);
		context.lineTo(point.x - width * .008, point.y + height * .014);
		context.stroke();
		context.strokeStyle = "#8b5e3c";
		context.lineWidth = Math.max(5, width * .008);
		context.beginPath();
		context.moveTo(point.x - width * .08, point.y + height * .13);
		context.lineTo(point.x - width * .054, point.y + height * .09);
		context.stroke();
		for (let spark = 0; spark < 10; spark += 1) {
			const angle = spark * 2.399 + progress * 8;
			const radius = width * (.008 + spark % 4 * .006);
			context.globalAlpha = .35 + spark % 3 * .2;
			context.fillStyle = spark % 2 ? "#f5b942" : "#99f6e4";
			context.beginPath();
			context.arc(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius, Math.max(1.5, width * .0025), 0, Math.PI * 2);
			context.fill();
		}
		context.restore();
	}
	function drawWandFlash(context, progress, width, height, centerY) {
		const strength = 1 - clamp(Math.abs(progress - .7) / .055);
		if (strength <= 0) return;
		const gradient = context.createRadialGradient(width / 2, centerY, 0, width / 2, centerY, width * .34);
		gradient.addColorStop(0, `rgba(255,247,204,${strength * .24})`);
		gradient.addColorStop(.45, `rgba(94,234,212,${strength * .1})`);
		gradient.addColorStop(1, "rgba(94,234,212,0)");
		context.fillStyle = gradient;
		context.fillRect(0, 0, width, height);
	}
	function drawBlueprintGrid(context, width, height, progress) {
		const fade = progress < .82 ? clamp(progress / .14) : 1 - clamp((progress - .82) / .12);
		if (fade <= 0) return;
		const spacing = Math.max(28, Math.round(width / 24));
		context.save();
		context.globalAlpha = fade;
		context.strokeStyle = "rgba(96,165,250,.12)";
		context.lineWidth = 1;
		for (let x = spacing; x < width; x += spacing) {
			context.beginPath();
			context.moveTo(x, 0);
			context.lineTo(x, height);
			context.stroke();
		}
		for (let y = spacing; y < height; y += spacing) {
			context.beginPath();
			context.moveTo(0, y);
			context.lineTo(width, y);
			context.stroke();
		}
		context.strokeStyle = "rgba(94,234,212,.22)";
		context.lineWidth = 1.5;
		context.beginPath();
		context.moveTo(width / 2, 0);
		context.lineTo(width / 2, height);
		context.moveTo(0, height / 2);
		context.lineTo(width, height / 2);
		context.stroke();
		context.restore();
	}
	function drawBlueprintGuides(context, mapping, sourcePositions, targetPositions, progress, width) {
		context.save();
		context.setLineDash([5, 6]);
		context.lineWidth = Math.max(1, width * .0012);
		mapping.forEach((letter, index) => {
			if (!letter.destination) return;
			const from = sourcePositions.get(letter.textIndex);
			const to = targetPositions.get(letter.destination.textIndex);
			const laneY = from.y + context.canvas.height * (index % 2 ? -.18 : .18) * (.55 + index % 4 * .12);
			context.globalAlpha = .08 + index % 3 * .035;
			context.strokeStyle = index % 2 ? "#60a5fa" : "#2dd4bf";
			context.beginPath();
			context.moveTo(from.x, from.y);
			context.lineTo(from.x, laneY);
			context.lineTo(to.x, laneY);
			context.lineTo(to.x, to.y);
			context.stroke();
		});
		context.setLineDash([]);
		context.globalAlpha = .7;
		const measureY = context.canvas.height * .24;
		context.strokeStyle = "#60a5fa";
		context.beginPath();
		context.moveTo(width * .12, measureY);
		context.lineTo(width * (.12 + .76 * progress), measureY);
		context.stroke();
		context.restore();
	}
	function drawInspectionSweep(context, progress, width, height) {
		const sweep = clamp((progress - .68) / .15);
		if (sweep <= 0 || sweep >= 1) return;
		const x = width * (.08 + sweep * .84);
		const gradient = context.createLinearGradient(x - width * .08, 0, x + width * .02, 0);
		gradient.addColorStop(0, "rgba(45,212,191,0)");
		gradient.addColorStop(.8, "rgba(45,212,191,.08)");
		gradient.addColorStop(1, "rgba(253,230,138,.38)");
		context.save();
		context.fillStyle = gradient;
		context.fillRect(x - width * .08, height * .12, width * .1, height * .7);
		context.strokeStyle = "rgba(253,230,138,.72)";
		context.lineWidth = 2;
		context.beginPath();
		context.moveTo(x, height * .12);
		context.lineTo(x, height * .82);
		context.stroke();
		context.restore();
	}
	function drawStaticComparison(context, source, result) {
		const { width, height } = context.canvas;
		drawBackdrop(context, width, height);
		const sourceSize = fitFont(context, source, width, height) * .78;
		const resultSize = fitFont(context, result, width, height) * .78;
		context.save();
		context.fillStyle = "rgba(153,246,228,.72)";
		context.font = `800 ${Math.max(12, Math.round(width * .014))}px Inter, system-ui, sans-serif`;
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText("BEFORE", width / 2, height * .14);
		drawFinalText(context, source, width, height * .29, sourceSize);
		context.strokeStyle = "rgba(45,212,191,.42)";
		context.lineWidth = Math.max(2, width * .002);
		context.beginPath();
		context.moveTo(width * .41, height * .49);
		context.lineTo(width * .59, height * .49);
		context.stroke();
		context.fillStyle = "#f5b942";
		context.font = `800 ${Math.max(22, Math.round(width * .032))}px Inter, system-ui, sans-serif`;
		context.fillText("↓", width / 2, height * .49);
		context.fillStyle = "rgba(245,185,66,.82)";
		context.font = `800 ${Math.max(12, Math.round(width * .014))}px Inter, system-ui, sans-serif`;
		context.fillText("AFTER", width / 2, height * .62);
		context.restore();
		drawFinalText(context, result, width, height * .76, resultSize);
		drawBranding(context, width, height);
	}
	function renderFrame(context, source, result, settings, elapsed, duration) {
		const { width, height } = context.canvas;
		const progress = clamp(elapsed / duration);
		drawBackdrop(context, width, height);
		if (settings.style === "blueprint") drawBlueprintGrid(context, width, height, progress);
		const centerY = height * .47;
		const fontSize = Math.min(fitFont(context, source, width, height), fitFont(context, result, width, height));
		const sourcePositions = glyphLayout(context, source, width, centerY, fontSize);
		const targetPositions = glyphLayout(context, result, width, centerY, fontSize);
		const mapping = mapExactAnagramLetters(source, result);
		const moveStart = .25;
		const moveEnd = .66;
		const restoreEnd = .74;
		if (progress < moveStart) drawFinalText(context, source, width, centerY, fontSize, progress < .16 ? 1 : 1 - (progress - .16) / .09 * .35);
		if (progress >= moveStart && progress < restoreEnd) {
			const rawMove = clamp((progress - moveStart) / .41000000000000003);
			if (settings.style === "blueprint") drawBlueprintGuides(context, mapping, sourcePositions, targetPositions, rawMove, width);
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
			mapping.forEach((letter, index) => {
				if (!letter.destination) return;
				const from = sourcePositions.get(letter.textIndex);
				const to = targetPositions.get(letter.destination.textIndex);
				const local = settings.style === "typewriter" ? clamp(rawMove * mapping.length - index) : settings.style === "wand" ? clamp(rawMove * 1.35 - index / Math.max(1, mapping.length - 1) * .35) : rawMove;
				let amount = ease(local);
				if (settings.style === "magnetic") amount = 1 + 1.65 * (local - 1) ** 3 + .65 * (local - 1) ** 2;
				let x = from.x + (to.x - from.x) * amount;
				let y = from.y + (to.y - from.y) * amount;
				const seed = seeded(letter.identity);
				if (settings.style === "fly") y += Math.sin(Math.PI * amount) * height * (.11 + seed * .08) * (seed > .5 ? 1 : -1);
				if (settings.style === "shuffle") {
					x += Math.sin(amount * Math.PI * 4 + seed * 6) * width * .035 * (1 - amount);
					y += Math.cos(amount * Math.PI * 3 + seed * 5) * height * .055 * (1 - amount);
				}
				if (settings.style === "wand") {
					x += Math.sin(amount * Math.PI * 3 + seed * 8) * width * .025 * (1 - amount);
					y -= Math.sin(Math.PI * amount) * height * (.15 + seed * .08) + Math.cos(amount * Math.PI * 4 + seed * 7) * height * .025 * (1 - amount);
				}
				if (settings.style === "blueprint") {
					const laneY = from.y + height * (index % 2 ? -.18 : .18) * (.55 + index % 4 * .12);
					if (amount < .28) {
						x = from.x;
						y = from.y + (laneY - from.y) * ease(amount / .28);
					} else if (amount < .74) {
						x = from.x + (to.x - from.x) * ease((amount - .28) / .46);
						y = laneY;
					} else {
						x = to.x;
						y = laneY + (to.y - laneY) * ease((amount - .74) / .26);
					}
				}
				drawParticles(context, x, y, letter.identity, amount, width, height);
				context.fillStyle = local < 1 ? "#99f6e4" : "#f8fafc";
				context.globalAlpha = settings.style === "typewriter" ? clamp(local * 2) : 1;
				context.fillText(letter.destination.glyph, x, y);
				if (settings.style === "blueprint" && local < .96) {
					context.globalAlpha = .72;
					context.fillStyle = "#93c5fd";
					context.font = `700 ${Math.max(9, width * .011)}px ui-monospace, monospace`;
					context.fillText(String(index + 1).padStart(2, "0"), x + fontSize * .42, y - fontSize * .42);
					context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
				}
			});
			context.globalAlpha = 1;
			if (settings.style === "wand") drawWand(context, rawMove, width, height, centerY);
		}
		if (settings.style === "wand") drawWandFlash(context, progress, width, height, centerY);
		if (progress >= moveEnd) drawFinalText(context, result, width, centerY, fontSize, clamp((progress - moveEnd) / .07999999999999996));
		if (settings.style === "blueprint") drawInspectionSweep(context, progress, width, height);
		drawBranding(context, width, height);
	}
	Object.freeze([
		"blueprint",
		"wand",
		"fly",
		"shuffle",
		"magnetic",
		"typewriter"
	]);
	Object.freeze({ ...DURATIONS });
	function downloadBlob(blob, filename) {
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1e3);
	}
	function canvasBlob(canvas, type = "image/png") {
		return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(/* @__PURE__ */ new Error("The local export could not be created.")), type));
	}
	function crc32(bytes) {
		let crc = 4294967295;
		for (const byte of bytes) {
			crc ^= byte;
			for (let bit = 0; bit < 8; bit += 1) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
		}
		return (crc ^ 4294967295) >>> 0;
	}
	function pngTextChunk(keyword, value) {
		const data = new TextEncoder().encode(`${keyword}\0${value}`);
		const type = new TextEncoder().encode("tEXt");
		const chunk = new Uint8Array(12 + data.length);
		const view = new DataView(chunk.buffer);
		view.setUint32(0, data.length);
		chunk.set(type, 4);
		chunk.set(data, 8);
		view.setUint32(8 + data.length, crc32(new Uint8Array([...type, ...data])));
		return chunk;
	}
	async function brandedPngBlob(canvas) {
		const original = new Uint8Array(await (await canvasBlob(canvas)).arrayBuffer());
		let offset = 8;
		let insertAt = original.length - 12;
		while (offset + 12 <= original.length) {
			const length = new DataView(original.buffer, original.byteOffset + offset, 4).getUint32(0);
			if (String.fromCharCode(...original.slice(offset + 4, offset + 8)) === "IEND") {
				insertAt = offset;
				break;
			}
			offset += 12 + length;
		}
		const chunks = [pngTextChunk("Software", BRAND_NAME), pngTextChunk("URL", BRAND_URL)];
		return new Blob([
			original.slice(0, insertAt),
			...chunks,
			original.slice(insertAt)
		], { type: "image/png" });
	}
	function ebmlSize(length) {
		for (let bytes = 1; bytes <= 8; bytes += 1) if (length < 2 ** (7 * bytes) - 1) {
			const result = new Uint8Array(bytes);
			let value = length;
			for (let index = bytes - 1; index >= 0; index -= 1) {
				result[index] = value & 255;
				value = Math.floor(value / 256);
			}
			result[0] |= 1 << 8 - bytes;
			return result;
		}
		throw new Error("Metadata is too large.");
	}
	function ebmlElement(id, payload) {
		const bytes = payload instanceof Uint8Array ? payload : new TextEncoder().encode(payload);
		return new Uint8Array([
			...id,
			...ebmlSize(bytes.length),
			...bytes
		]);
	}
	function webmSimpleTag(name, value) {
		const tagName = ebmlElement([69, 163], name);
		const tagValue = ebmlElement([68, 135], value);
		return ebmlElement([103, 200], new Uint8Array([...tagName, ...tagValue]));
	}
	function readEbmlSize(bytes, offset) {
		const first = bytes[offset];
		let length = 1;
		while (length <= 8 && !(first & 1 << 8 - length)) length += 1;
		if (length > 8 || offset + length > bytes.length) return null;
		const marker = 1 << 8 - length;
		let value = first & marker - 1;
		let unknown = value === marker - 1;
		for (let index = 1; index < length; index += 1) {
			value = value * 256 + bytes[offset + index];
			unknown = unknown && bytes[offset + index] === 255;
		}
		return {
			length,
			value,
			unknown
		};
	}
	function fixedEbmlSize(value, length) {
		const result = new Uint8Array(length);
		let remaining = value;
		for (let index = length - 1; index >= 0; index -= 1) {
			result[index] = remaining & 255;
			remaining = Math.floor(remaining / 256);
		}
		result[0] |= 1 << 8 - length;
		return result;
	}
	async function brandedWebmBlob(blob) {
		const tags = ebmlElement([
			18,
			84,
			195,
			103
		], new Uint8Array([...ebmlElement([115, 115], new Uint8Array([
			...webmSimpleTag("TITLE", "Exact anagram reveal"),
			...webmSimpleTag("ARTIST", BRAND_NAME),
			...webmSimpleTag("ENCODER", BRAND_NAME),
			...webmSimpleTag("URL", BRAND_URL),
			...webmSimpleTag("COPYRIGHT", `${BRAND_NAME} · ${BRAND_URL}`),
			...webmSimpleTag("COMMENT", "Every letter moves. Nothing appears. Nothing disappears.")
		]))]));
		const original = new Uint8Array(await blob.arrayBuffer());
		const segmentId = [
			24,
			83,
			128,
			103
		];
		let segmentOffset = -1;
		for (let index = 0; index <= original.length - segmentId.length; index += 1) if (segmentId.every((byte, part) => original[index + part] === byte)) {
			segmentOffset = index;
			break;
		}
		if (segmentOffset < 0) return new Blob([original, tags], { type: blob.type || "video/webm" });
		const sizeOffset = segmentOffset + segmentId.length;
		const size = readEbmlSize(original, sizeOffset);
		if (!size || size.unknown) return new Blob([original, tags], { type: blob.type || "video/webm" });
		const segmentDataStart = sizeOffset + size.length;
		const segmentEnd = Math.min(original.length, segmentDataStart + size.value);
		const updatedSize = fixedEbmlSize(size.value + tags.length, size.length);
		return new Blob([
			original.slice(0, sizeOffset),
			updatedSize,
			original.slice(segmentDataStart, segmentEnd),
			tags,
			original.slice(segmentEnd)
		], { type: blob.type || "video/webm" });
	}
	function revealFilename(result, extension) {
		return `${result.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "anagram-reveal"}.${extension}`;
	}
	function createControl(label, control) {
		const wrap = document.createElement("label");
		const text = document.createElement("span");
		text.textContent = label;
		wrap.append(text, control);
		return wrap;
	}
	function optionSelect(values) {
		const select = document.createElement("select");
		values.forEach(([value, label]) => {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = label;
			select.append(option);
		});
		return select;
	}
	function openAnagramReveal({ sourcePhrase, resultPhrase, originalRank = null }) {
		const dialog = document.createElement("dialog");
		dialog.className = "anagram-reveal-modal";
		dialog.setAttribute("aria-labelledby", "anagram-reveal-title");
		const shell = document.createElement("div");
		shell.className = "anagram-reveal-shell";
		const header = document.createElement("header");
		const headingWrap = document.createElement("span");
		const kicker = document.createElement("em");
		kicker.textContent = "SHAREABLE EXACTNESS";
		const heading = document.createElement("h2");
		heading.id = "anagram-reveal-title";
		heading.textContent = "Animated anagram reveal";
		headingWrap.append(kicker, heading);
		const close = document.createElement("button");
		close.type = "button";
		close.textContent = "×";
		close.setAttribute("aria-label", "Close animated reveal");
		header.append(headingWrap, close);
		const canvas = document.createElement("canvas");
		canvas.className = "anagram-reveal-canvas";
		canvas.setAttribute("aria-label", `${sourcePhrase} rearranging into ${resultPhrase}`);
		canvas.setAttribute("role", "img");
		const controls = document.createElement("div");
		controls.className = "anagram-reveal-controls";
		const style = optionSelect([
			["blueprint", "Blueprint"],
			["wand", "Wand"],
			["fly", "Fly"],
			["shuffle", "Shuffle"],
			["magnetic", "Magnetic"],
			["typewriter", "Typewriter"]
		]);
		const speed = optionSelect([
			["calm", "Calm · 8 seconds"],
			["normal", "Normal · 6.5 seconds"],
			["dramatic", "Dramatic · 5.2 seconds"]
		]);
		speed.value = "normal";
		controls.append(createControl("Style", style), createControl("Speed", speed));
		const reduced = document.createElement("p");
		reduced.className = "anagram-reveal-motion-note";
		reduced.hidden = !matchMedia("(prefers-reduced-motion: reduce)").matches;
		reduced.textContent = "Reduced motion is enabled. Preview shows the static final card; downloads remain available.";
		const status = document.createElement("p");
		status.className = "anagram-reveal-status";
		status.setAttribute("aria-live", "polite");
		const exportProgress = document.createElement("div");
		exportProgress.className = "anagram-reveal-export-progress";
		exportProgress.hidden = true;
		exportProgress.setAttribute("role", "progressbar");
		exportProgress.setAttribute("aria-label", "WebM export progress");
		exportProgress.setAttribute("aria-valuemin", "0");
		exportProgress.setAttribute("aria-valuemax", "100");
		const exportTrack = document.createElement("span");
		const exportFill = document.createElement("i");
		const exportValue = document.createElement("strong");
		exportValue.textContent = "0%";
		exportTrack.append(exportFill);
		exportProgress.append(exportTrack, exportValue);
		const actions = document.createElement("div");
		actions.className = "anagram-reveal-actions";
		const video = document.createElement("button");
		video.type = "button";
		video.textContent = "Download WebM";
		const image = document.createElement("button");
		image.type = "button";
		image.textContent = "Download static card";
		const copy = document.createElement("button");
		copy.type = "button";
		copy.textContent = "Copy post text";
		const copyLink = document.createElement("button");
		copyLink.type = "button";
		copyLink.textContent = "Copy animation link";
		const share = document.createElement("button");
		share.type = "button";
		share.textContent = "Share…";
		actions.append(video, image, copy, copyLink, share);
		shell.append(header, canvas, controls, reduced, status, exportProgress, actions);
		dialog.append(shell);
		document.body.append(dialog);
		let animationId = 0;
		const settings = () => ({
			style: style.value,
			speed: speed.value
		});
		const resize = () => {
			[canvas.width, canvas.height] = REVEAL_SIZE;
		};
		const draw = (elapsed) => {
			const config = settings();
			renderFrame(canvas.getContext("2d"), sourcePhrase, resultPhrase, config, elapsed, DURATIONS[config.speed]);
		};
		const finalCard = () => {
			resize();
			draw(DURATIONS[speed.value]);
		};
		const play = () => {
			cancelAnimationFrame(animationId);
			resize();
			if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
				finalCard();
				status.textContent = "Static preview shown because reduced motion is enabled.";
				return;
			}
			const started = performance.now();
			status.textContent = "Previewing locally · repeats after a 1.5-second hold.";
			const frame = (now) => {
				const cycleDuration = DURATIONS[speed.value];
				const cycleTime = (now - started) % (cycleDuration + LOOP_PAUSE_MS);
				draw(Math.min(cycleTime, cycleDuration));
				animationId = requestAnimationFrame(frame);
			};
			animationId = requestAnimationFrame(frame);
		};
		const postText = () => `${sourcePhrase} → ${resultPhrase}\n\nMade by Anagram Architect`;
		const animationUrl = () => {
			const url = new URL("/tools/anagram-animator", location.origin);
			url.searchParams.set("from", sourcePhrase);
			url.searchParams.set("to", resultPhrase);
			url.searchParams.set("style", style.value);
			url.searchParams.set("speed", speed.value);
			url.searchParams.set("focus", "1");
			return url;
		};
		[style, speed].forEach((control) => control.addEventListener("change", play));
		image.addEventListener("click", async () => {
			cancelAnimationFrame(animationId);
			resize();
			drawStaticComparison(canvas.getContext("2d"), sourcePhrase, resultPhrase);
			downloadBlob(await brandedPngBlob(canvas), revealFilename(resultPhrase, "png"));
			status.textContent = "Before-and-after PNG created locally with attribution stored in metadata.";
			play();
		});
		video.addEventListener("click", async () => {
			if (!window.MediaRecorder || !canvas.captureStream) {
				status.textContent = "WebM export is not supported by this browser. Download the static card instead.";
				return;
			}
			cancelAnimationFrame(animationId);
			resize();
			video.disabled = true;
			exportProgress.hidden = false;
			exportProgress.setAttribute("aria-valuenow", "0");
			exportFill.style.width = "0%";
			exportValue.textContent = "0%";
			status.textContent = "Rendering WebM locally…";
			const stream = canvas.captureStream(30);
			const mimeType = [
				"video/webm;codecs=vp9",
				"video/webm;codecs=vp8",
				"video/webm"
			].find((type) => MediaRecorder.isTypeSupported(type)) || "";
			const recorder = new MediaRecorder(stream, mimeType ? {
				mimeType,
				videoBitsPerSecond: 6e6
			} : void 0);
			const chunks = [];
			recorder.addEventListener("dataavailable", (event) => {
				if (event.data.size) chunks.push(event.data);
			});
			const complete = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
			recorder.start(250);
			const started = performance.now();
			const cycleDuration = DURATIONS[speed.value];
			const exportDuration = cycleDuration * 2 + LOOP_PAUSE_MS;
			await new Promise((resolve) => {
				const frame = (now) => {
					const elapsed = now - started;
					const percent = Math.min(100, Math.round(elapsed / exportDuration * 100));
					exportProgress.setAttribute("aria-valuenow", String(percent));
					exportFill.style.width = `${percent}%`;
					exportValue.textContent = `${percent}%`;
					const cycleTime = elapsed <= cycleDuration + LOOP_PAUSE_MS ? Math.min(elapsed, cycleDuration) : elapsed - cycleDuration - LOOP_PAUSE_MS;
					draw(Math.min(cycleTime, cycleDuration));
					if (elapsed < exportDuration) requestAnimationFrame(frame);
					else resolve();
				};
				requestAnimationFrame(frame);
			});
			recorder.stop();
			await complete;
			stream.getTracks().forEach((track) => track.stop());
			downloadBlob(await brandedWebmBlob(new Blob(chunks, { type: recorder.mimeType || "video/webm" })), revealFilename(resultPhrase, "webm"));
			video.disabled = false;
			exportProgress.setAttribute("aria-valuenow", "100");
			exportFill.style.width = "100%";
			exportValue.textContent = "100%";
			status.textContent = "Repeating WebM created locally with standard attribution tags.";
		});
		copy.addEventListener("click", async () => {
			await navigator.clipboard.writeText(postText());
			copy.textContent = "Copied";
			status.textContent = "Post text copied.";
			setTimeout(() => {
				copy.textContent = "Copy post text";
			}, 1200);
		});
		copyLink.addEventListener("click", async () => {
			const url = animationUrl();
			await navigator.clipboard.writeText(url.href);
			copyLink.textContent = "Link copied";
			status.textContent = "Compact animation link copied.";
			setTimeout(() => {
				copyLink.textContent = "Copy animation link";
			}, 1200);
		});
		share.addEventListener("click", async () => {
			const url = animationUrl().href;
			try {
				if (navigator.share) await navigator.share({
					title: "Exact anagram reveal",
					text: postText(),
					url
				});
				else {
					await navigator.clipboard.writeText(`${postText()}\n\n${url}`);
					status.textContent = "Sharing is unavailable, so the animation link and post text were copied.";
				}
			} catch (error) {
				if (error?.name !== "AbortError") status.textContent = "Sharing was unavailable. Use Copy animation link instead.";
			}
		});
		const dismiss = () => {
			cancelAnimationFrame(animationId);
			dialog.close();
			dialog.remove();
		};
		close.addEventListener("click", dismiss);
		dialog.addEventListener("cancel", (event) => {
			event.preventDefault();
			dismiss();
		});
		dialog.addEventListener("click", (event) => {
			if (event.target === dialog) dismiss();
		});
		dialog.showModal();
		play();
		video.focus({ preventScroll: true });
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
	var advancedOptions = document.querySelector("#anagram-advanced-options");
	var pickList = document.querySelector("#anagram-pick-list");
	var pickCount = document.querySelector("#anagram-pick-count");
	var pickImport = document.querySelector("#anagram-pick-import");
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
	var recipeImportDialog = document.querySelector("#anagram-recipe-import-modal");
	var recipeImportClose = document.querySelector("#anagram-recipe-import-close");
	var recipeImportCancel = document.querySelector("#anagram-recipe-import-cancel");
	var recipeImportFile = document.querySelector("#anagram-recipe-import-file");
	var recipeImportFileName = document.querySelector("#anagram-recipe-file-name");
	var recipeImportJson = document.querySelector("#anagram-recipe-import-json");
	var recipeImportPreview = document.querySelector("#anagram-recipe-import-preview");
	var recipeImportConfirm = document.querySelector("#anagram-recipe-import-confirm");
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
	var RECIPE_SCHEMA_VERSION = 1;
	var RECIPE_DICTIONARY_VERSIONS = Object.freeze({
		standard: "enable-v1",
		expanded: "wiktionary-v1"
	});
	var RECIPE_RANKING_VERSION = "language-v1.2+ngrams-v1.3";
	var RECIPE_ENGINE_VERSION = "anagram-architect-wasm-20260917-04";
	var DICTIONARY_LINKS = Object.freeze([
		[
			"MW",
			"Merriam-Webster",
			(word) => `https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}`
		],
		[
			"CO",
			"Collins",
			(word) => `https://www.collinsdictionary.com/dictionary/english/${encodeURIComponent(word)}`
		],
		[
			"Wik",
			"Wiktionary",
			(word) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`
		],
		[
			"WN",
			"Wordnik",
			(word) => `https://www.wordnik.com/words/${encodeURIComponent(word)}`
		],
		[
			"DC",
			"Dictionary.com",
			(word) => `https://www.dictionary.com/browse/${encodeURIComponent(word)}`
		],
		[
			"Cam",
			"Cambridge",
			(word) => `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`
		]
	]);
	var currentSource = "";
	var currentSearchRecipe = null;
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
	var dictionaryDirectoryDialog = null;
	var dictionaryDirectoryTitle = null;
	var dictionaryDirectoryLinks = null;
	var dictionaryDirectoryReturnFocus = null;
	function ensureDictionaryDirectoryDialog() {
		if (dictionaryDirectoryDialog) return;
		dictionaryDirectoryDialog = document.createElement("dialog");
		dictionaryDirectoryDialog.className = "anagram-dictionary-directory-modal";
		dictionaryDirectoryDialog.setAttribute("aria-labelledby", "anagram-dictionary-directory-title");
		const card = document.createElement("div");
		card.className = "anagram-dictionary-directory-card";
		const header = document.createElement("header");
		header.className = "anagram-dictionary-directory-header";
		dictionaryDirectoryTitle = document.createElement("h2");
		dictionaryDirectoryTitle.id = "anagram-dictionary-directory-title";
		const close = document.createElement("button");
		close.type = "button";
		close.className = "anagram-dictionary-directory-close";
		close.setAttribute("aria-label", "Close dictionary lookups");
		close.textContent = "×";
		close.addEventListener("click", () => dictionaryDirectoryDialog.close());
		header.append(dictionaryDirectoryTitle, close);
		const introduction = document.createElement("p");
		introduction.textContent = "Choose an external dictionary. The selected service opens in a new tab.";
		dictionaryDirectoryLinks = document.createElement("div");
		dictionaryDirectoryLinks.className = "anagram-dictionary-directory-links";
		card.append(header, introduction, dictionaryDirectoryLinks);
		dictionaryDirectoryDialog.append(card);
		dictionaryDirectoryDialog.addEventListener("click", (event) => {
			if (event.target === dictionaryDirectoryDialog) dictionaryDirectoryDialog.close();
		});
		dictionaryDirectoryDialog.addEventListener("close", () => {
			dictionaryDirectoryReturnFocus?.focus();
			dictionaryDirectoryReturnFocus = null;
		});
		document.body.append(dictionaryDirectoryDialog);
	}
	function openDictionaryDirectory(word, trigger) {
		ensureDictionaryDirectoryDialog();
		dictionaryDirectoryReturnFocus = trigger;
		dictionaryDirectoryTitle.textContent = `Look up ${word.toUpperCase()}`;
		dictionaryDirectoryLinks.replaceChildren(...DICTIONARY_LINKS.map(([abbreviation, name, getUrl]) => {
			const link = document.createElement("a");
			link.href = getUrl(word);
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			const shortName = document.createElement("strong");
			shortName.textContent = abbreviation;
			const fullName = document.createElement("span");
			fullName.textContent = name;
			link.append(shortName, fullName);
			return link;
		}));
		dictionaryDirectoryDialog.showModal();
	}
	function buildDictionaryLookupButton(label = "Look up") {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "anagram-dictionary-lookup";
		button.textContent = label;
		button.hidden = true;
		button.addEventListener("click", () => {
			if (button.dataset.word) openDictionaryDirectory(button.dataset.word, button);
		});
		return button;
	}
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
	function cloneRecipe(value) {
		return value ? JSON.parse(JSON.stringify(value)) : null;
	}
	function splitRecipeWords(value) {
		return String(value || "").toLowerCase().match(/[a-z]+/g) || [];
	}
	function splitRecipeList(value) {
		return [...new Set(splitRecipeWords(value))];
	}
	function syncRecipeEdits(entry) {
		if (!entry.recipe) return;
		entry.recipe.edits = {
			...entry.recipe.edits || {},
			currentPhrase: entry.phrase,
			wordOrder: splitRecipeWords(entry.phrase),
			lockedPositions: [...lockedPositionSet(entry)],
			capitalizationAndPunctuation: { ...entry.formatOptions || {} }
		};
	}
	function recipeForResult(result) {
		const recipe = cloneRecipe(currentSearchRecipe) || {
			schemaVersion: RECIPE_SCHEMA_VERSION,
			sourcePhrase: currentSource,
			search: {},
			versions: {
				ranking: RECIPE_RANKING_VERSION,
				engine: RECIPE_ENGINE_VERSION
			},
			discovery: {}
		};
		recipe.resultPhrase = result.phrase;
		recipe.originalRank = result.rank;
		recipe.edits = {
			originalResultPhrase: result.phrase,
			currentPhrase: result.phrase,
			wordOrder: splitRecipeWords(result.phrase),
			lockedPositions: [],
			replacements: [],
			capitalizationAndPunctuation: {}
		};
		return recipe;
	}
	function recipePayload(entry) {
		syncRecipeEdits(entry);
		return entry.recipe || {
			schemaVersion: 0,
			sourcePhrase: entry.source,
			resultPhrase: entry.phrase,
			originalRank: entry.rank || null,
			discovery: { legacyPick: true },
			edits: {
				originalResultPhrase: entry.phrase,
				currentPhrase: entry.phrase,
				wordOrder: splitRecipeWords(entry.phrase),
				lockedPositions: [...lockedPositionSet(entry)],
				replacements: [],
				capitalizationAndPunctuation: { ...entry.formatOptions || {} }
			}
		};
	}
	function recipeJson(entry) {
		return JSON.stringify(recipePayload(entry), null, 2);
	}
	function validateImportedRecipe(value) {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The recipe must be a JSON object.");
		if (value.schemaVersion !== RECIPE_SCHEMA_VERSION) throw new Error(`This importer supports recipe schema version ${RECIPE_SCHEMA_VERSION}.`);
		const sourcePhrase = String(value.sourcePhrase || "").trim();
		const resultPhrase = String(value.edits?.currentPhrase || value.resultPhrase || "").trim();
		const sourceLength = normalizeLetters(sourcePhrase).length;
		if (sourceLength < 2 || sourceLength > 60) throw new Error("The source phrase must contain between 2 and 60 letters.");
		if (!resultPhrase) throw new Error("The recipe does not contain a result phrase.");
		if (!isExactAnagram(sourcePhrase, resultPhrase)) throw new Error("The source and result phrases are not exact anagrams.");
		if (value.search != null && (typeof value.search !== "object" || Array.isArray(value.search))) throw new Error("The search settings are malformed.");
		if (value.edits != null && (typeof value.edits !== "object" || Array.isArray(value.edits))) throw new Error("The Phrase Studio edits are malformed.");
		const recipe = cloneRecipe(value);
		recipe.sourcePhrase = sourcePhrase;
		recipe.resultPhrase = String(recipe.resultPhrase || resultPhrase).trim();
		recipe.search ||= {};
		recipe.discovery ||= {};
		recipe.versions ||= {};
		recipe.edits ||= {};
		recipe.edits.originalResultPhrase ||= recipe.resultPhrase;
		recipe.edits.currentPhrase = resultPhrase;
		recipe.edits.wordOrder = splitRecipeWords(resultPhrase);
		recipe.edits.lockedPositions = Array.isArray(recipe.edits.lockedPositions) ? [...new Set(recipe.edits.lockedPositions.filter((position) => Number.isInteger(position) && position >= 0 && position < recipe.edits.wordOrder.length))] : [];
		recipe.edits.replacements = Array.isArray(recipe.edits.replacements) ? recipe.edits.replacements : [];
		recipe.edits.capitalizationAndPunctuation = recipe.edits.capitalizationAndPunctuation && typeof recipe.edits.capitalizationAndPunctuation === "object" && !Array.isArray(recipe.edits.capitalizationAndPunctuation) ? recipe.edits.capitalizationAndPunctuation : {};
		return recipe;
	}
	var pendingImportedRecipe = null;
	function showRecipeImportPreview(message, state = "waiting") {
		recipeImportPreview.dataset.state = state;
		recipeImportPreview.replaceChildren();
		const heading = document.createElement("strong");
		const detail = document.createElement("span");
		if (state === "ready") {
			const search = message.search || {};
			heading.textContent = `${message.sourcePhrase} → ${message.edits.currentPhrase}`;
			detail.textContent = `${search.dictionary ? titleCase(search.dictionary) : "Unspecified"} dictionary · ${search.searchDepth ? titleCase(search.searchDepth) : "Unspecified"} depth · ${search.maximumWords || "?"} maximum words${message.originalRank ? ` · original rank #${message.originalRank}` : ""}`;
		} else {
			heading.textContent = state === "error" ? "Recipe cannot be imported" : "Waiting for a recipe";
			detail.textContent = String(message);
		}
		recipeImportPreview.append(heading, detail);
	}
	function parseRecipeImport() {
		pendingImportedRecipe = null;
		recipeImportConfirm.disabled = true;
		const text = recipeImportJson.value.trim();
		if (!text) {
			showRecipeImportPreview("The source phrase, result, and search settings will be previewed here.");
			return;
		}
		try {
			if (text.length > 25e4) throw new Error("The recipe is too large to import.");
			pendingImportedRecipe = validateImportedRecipe(JSON.parse(text));
			showRecipeImportPreview(pendingImportedRecipe, "ready");
			recipeImportConfirm.disabled = false;
		} catch (error) {
			showRecipeImportPreview(error instanceof SyntaxError ? "The pasted text is not valid JSON." : error.message, "error");
		}
	}
	function openRecipeImporter() {
		pendingImportedRecipe = null;
		recipeImportJson.value = "";
		recipeImportFile.value = "";
		recipeImportFileName.textContent = "No file selected";
		recipeImportConfirm.disabled = true;
		showRecipeImportPreview("The source phrase, result, and search settings will be previewed here.");
		recipeImportDialog.showModal();
		recipeImportJson.focus();
	}
	function importPendingRecipe() {
		if (!pendingImportedRecipe) return;
		const recipe = cloneRecipe(pendingImportedRecipe);
		const phrase = recipe.edits.currentPhrase;
		const entry = {
			phrase,
			source: recipe.sourcePhrase,
			rank: Number.isInteger(recipe.originalRank) && recipe.originalRank > 0 ? recipe.originalRank : null,
			lockedPositions: [...recipe.edits.lockedPositions],
			formatOptions: { ...recipe.edits.capitalizationAndPunctuation },
			savedAt: (/* @__PURE__ */ new Date()).toISOString(),
			recipe
		};
		pickEntries = pickEntries.filter((candidate) => candidate.phrase.toLowerCase() !== phrase.toLowerCase() || String(candidate.source || "").toLowerCase() !== recipe.sourcePhrase.toLowerCase());
		pickEntries.unshift(entry);
		pickEntries = pickEntries.slice(0, 100);
		savePickList();
		renderPickList();
		renderResults();
		pickList.open = true;
		recipeImportDialog.close();
		status.textContent = `Imported “${titleCase(phrase)}” and added it to the Pick List.`;
		pickList.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	}
	function createSearchRecipe(source, options, grammarValue, personalWords, requestId) {
		return {
			schemaVersion: RECIPE_SCHEMA_VERSION,
			sourcePhrase: source,
			search: {
				dictionary: dictionary.value,
				searchDepth: searchMode.value,
				maximumWords: options.maxWords,
				shortestWordLength: options.minimumLength,
				proMode: proMode.checked,
				timeBudget: timeBudget.value,
				effectiveTimeBudgetMs: options.timeLimitMs,
				budgetReached: false,
				phrasePattern: phrasePattern.value.trim(),
				grammarTemplateSelection: grammarTemplate.value,
				grammarTemplate: grammarValue,
				customGrammarSlots: cloneRecipe(customGrammarSlots) || [],
				requiredWords: splitRecipeList(lockedWords.value),
				preferredWords: splitRecipeList(preferredWords.value),
				excludedWords: splitRecipeList(excludedWords.value),
				excludeVulgar: excludeVulgar.checked,
				relevantPersonalVocabulary: personalWords.words.filter((word) => personalWordFitsSource(word, source))
			},
			discovery: {
				requestId,
				inProgress: true,
				durationMs: null,
				engine: "pending",
				workerCount: 0,
				budgetReached: false,
				resultCount: null,
				truncated: false
			},
			versions: {
				dictionary: RECIPE_DICTIONARY_VERSIONS[dictionary.value] || dictionary.value,
				ranking: RECIPE_RANKING_VERSION,
				engine: RECIPE_ENGINE_VERSION
			}
		};
	}
	function completeSearchRecipe(requestId, outcome, durationMs, engine, workerCount) {
		if (!currentSearchRecipe || currentSearchRecipe.discovery?.requestId !== requestId) return;
		currentSearchRecipe.search.budgetReached = Boolean(outcome.timeLimited);
		currentSearchRecipe.discovery = {
			durationMs: Math.round(durationMs),
			engine,
			workerCount,
			budgetReached: Boolean(outcome.timeLimited),
			resultCount: outcome.results.length,
			truncated: Boolean(outcome.truncated)
		};
		let updatedPick = false;
		pickEntries.forEach((entry) => {
			if (entry.recipe?.discovery?.requestId !== requestId) return;
			const resultPhrase = entry.recipe.resultPhrase;
			const originalRank = entry.recipe.originalRank;
			const edits = entry.recipe.edits;
			entry.recipe = {
				...cloneRecipe(currentSearchRecipe),
				resultPhrase,
				originalRank,
				edits
			};
			updatedPick = true;
		});
		if (updatedPick) savePickList();
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
			syncRecipeEdits(entry);
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
					syncRecipeEdits(entry);
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
			syncRecipeEdits(entry);
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
			syncRecipeEdits(entry);
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
		const definitionLookup = buildDictionaryLookupButton();
		const definitionHeader = document.createElement("div");
		definitionHeader.className = "anagram-definition-header";
		definitionHeader.append(definitionHeading, definitionLookup);
		const definitionContent = document.createElement("div");
		definitionContent.textContent = "Select a word to see all of its local definitions.";
		definitionPanel.append(definitionHeader, definitionContent);
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
		let selectedOriginalWord = "";
		let definitionRequestId = 0;
		let replacementDefinitionRequestId = 0;
		const showDefinitions = async (word) => {
			const requestId = ++definitionRequestId;
			definitionHeading.textContent = `Definition: ${titleCase(word)}`;
			definitionLookup.dataset.word = word;
			definitionLookup.hidden = false;
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
				const lookup = buildDictionaryLookupButton();
				lookup.dataset.word = word;
				lookup.hidden = false;
				const header = document.createElement("div");
				header.className = "anagram-definition-header";
				header.append(heading, lookup);
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
				replacementDefinition.replaceChildren(header, content);
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
					selectedOriginalWord = "";
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
					definitionLookup.hidden = true;
					delete definitionLookup.dataset.word;
					definitionContent.textContent = "Select a word to see all of its local definitions.";
					return;
				}
				selectedOriginalWord = word;
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
			const previousPhrase = entry.phrase;
			const previousWord = selectedOriginalWord;
			entry.phrase = selected.phrase;
			panel.dispatchEvent(new Event("anagramentrychange"));
			savePickList();
			renderPickList();
			renderResults();
			if (entry.recipe) {
				entry.recipe.edits ||= {};
				entry.recipe.edits.replacements ||= [];
				entry.recipe.edits.replacements.push({
					from: previousWord,
					to: selected.word,
					previousPhrase,
					resultPhrase: selected.phrase
				});
				syncRecipeEdits(entry);
				savePickList();
			}
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
	var recipeDialog = null;
	var recipeDialogTitle = null;
	var recipeDialogOverview = null;
	var recipeDialogContent = null;
	var recipeDialogTabs = [];
	var recipeDialogReturnFocus = null;
	function recipeList(value) {
		return Array.isArray(value) && value.length ? value.join(", ") : "None";
	}
	function recipeDuration(value) {
		return Number.isFinite(value) ? `${(value / 1e3).toFixed(1)} seconds` : "Not recorded";
	}
	function addRecipeOverviewSection(parent, icon, title, rows, open = true) {
		const section = document.createElement("details");
		section.className = "anagram-recipe-section";
		section.open = open;
		const summary = document.createElement("summary");
		const symbol = document.createElement("span");
		symbol.className = "anagram-recipe-section-icon";
		symbol.textContent = icon;
		symbol.setAttribute("aria-hidden", "true");
		const heading = document.createElement("strong");
		heading.textContent = title;
		summary.append(symbol, heading);
		const list = document.createElement("dl");
		rows.forEach(([label, value]) => {
			const term = document.createElement("dt");
			term.textContent = label;
			const description = document.createElement("dd");
			description.textContent = String(value ?? "Not recorded");
			list.append(term, description);
		});
		section.append(summary, list);
		parent.append(section);
	}
	function renderRecipeOverview(recipe) {
		const search = recipe.search || {};
		const discovery = recipe.discovery || {};
		const edits = recipe.edits || {};
		const versions = recipe.versions || {};
		const slots = (search.customGrammarSlots || []).map((slot) => slot.kind === "literal" ? `“${slot.word}”` : titleCase(slot.kind));
		const replacements = (edits.replacements || []).map((replacement) => `${replacement.from || "word"} → ${replacement.to || "replacement"}`);
		const formatting = Object.entries(edits.capitalizationAndPunctuation || {}).map(([key, value]) => `${titleCase(key)}: ${value || "None"}`);
		recipeDialogOverview.replaceChildren();
		if (recipe.schemaVersion === 0) {
			const legacy = document.createElement("p");
			legacy.className = "anagram-recipe-legacy";
			legacy.textContent = "Legacy pick: its original search settings were not recorded.";
			recipeDialogOverview.append(legacy);
		}
		addRecipeOverviewSection(recipeDialogOverview, "✦", "Phrase", [
			["Source", recipe.sourcePhrase || "Not recorded"],
			["Original result", recipe.resultPhrase || edits.originalResultPhrase || "Not recorded"],
			["Current phrase", edits.currentPhrase || recipe.resultPhrase || "Not recorded"],
			["Original rank", recipe.originalRank ? `#${recipe.originalRank}` : "Not recorded"]
		]);
		addRecipeOverviewSection(recipeDialogOverview, "⚙", "Tune the search", [
			["Dictionary", search.dictionary ? titleCase(search.dictionary) : "Not recorded"],
			["Search depth", search.searchDepth ? titleCase(search.searchDepth) : "Not recorded"],
			["Maximum words", search.maximumWords ?? "Not recorded"],
			["Shortest word", search.shortestWordLength ? `${search.shortestWordLength} letters` : "Not recorded"],
			["Pro mode", search.proMode == null ? "Not recorded" : search.proMode ? "On" : "Off"],
			["Time budget", search.timeBudget === "auto" ? "Auto" : search.timeBudget ? `${search.timeBudget} seconds` : "Not recorded"],
			["Effective budget", Number.isFinite(search.effectiveTimeBudgetMs) ? `${search.effectiveTimeBudgetMs / 1e3} seconds` : "Not recorded"],
			["Budget reached", search.budgetReached == null ? "Not recorded" : search.budgetReached ? "Yes" : "No"]
		]);
		addRecipeOverviewSection(recipeDialogOverview, "⌘", "Search guidance", [
			["Phrase pattern", search.phrasePattern || "None"],
			["Grammar template", search.grammarTemplateSelection ? titleCase(search.grammarTemplateSelection.replaceAll("-", " ")) : "Free form"],
			["Custom grammar slots", recipeList(slots)],
			["Required words", recipeList(search.requiredWords)],
			["Preferred words", recipeList(search.preferredWords)],
			["Excluded words", recipeList(search.excludedWords)],
			["Vulgar-word filter", search.excludeVulgar == null ? "Not recorded" : search.excludeVulgar ? "On" : "Off"],
			["Relevant personal vocabulary", recipeList(search.relevantPersonalVocabulary)]
		], false);
		addRecipeOverviewSection(recipeDialogOverview, "▶", "Search run", [
			["Duration", recipeDuration(discovery.durationMs)],
			["Engine", discovery.engine === "wasm" ? "Rust/WebAssembly" : discovery.engine === "pending" ? "Search in progress" : discovery.engine || "Not recorded"],
			["Workers", discovery.workerCount || "Not recorded"],
			["Results retained", discovery.resultCount ?? "Not recorded"],
			["Budget reached", discovery.budgetReached == null ? "Not recorded" : discovery.budgetReached ? "Yes" : "No"],
			["Results truncated", discovery.truncated == null ? "Not recorded" : discovery.truncated ? "Yes" : "No"]
		], false);
		addRecipeOverviewSection(recipeDialogOverview, "✎", "Phrase Studio edits", [
			["Word order", recipeList(edits.wordOrder)],
			["Locked positions", (edits.lockedPositions || []).length ? edits.lockedPositions.map((position) => position + 1).join(", ") : "None"],
			["Replacements", recipeList(replacements)],
			["Capitalization and punctuation", recipeList(formatting)]
		], false);
		addRecipeOverviewSection(recipeDialogOverview, "◇", "Versions", [
			["Recipe schema", recipe.schemaVersion ?? "Not recorded"],
			["Dictionary", versions.dictionary || "Not recorded"],
			["Ranking", versions.ranking || "Not recorded"],
			["Engine", versions.engine || "Not recorded"]
		], false);
	}
	function setRecipeDialogTab(name) {
		const showOverview = name === "overview";
		recipeDialogOverview.hidden = !showOverview;
		recipeDialogContent.hidden = showOverview;
		recipeDialogTabs.forEach((button) => {
			const selected = button.dataset.recipeTab === name;
			button.setAttribute("aria-selected", String(selected));
			button.tabIndex = selected ? 0 : -1;
		});
	}
	function ensureRecipeDialog() {
		if (recipeDialog) return;
		recipeDialog = document.createElement("dialog");
		recipeDialog.className = "anagram-recipe-modal";
		recipeDialog.setAttribute("aria-labelledby", "anagram-recipe-title");
		const card = document.createElement("div");
		card.className = "anagram-recipe-card";
		const header = document.createElement("header");
		recipeDialogTitle = document.createElement("h2");
		recipeDialogTitle.id = "anagram-recipe-title";
		recipeDialogTitle.textContent = "Discovery recipe";
		const close = document.createElement("button");
		close.type = "button";
		close.textContent = "×";
		close.setAttribute("aria-label", "Close recipe");
		close.addEventListener("click", () => recipeDialog.close());
		header.append(recipeDialogTitle, close);
		const intro = document.createElement("p");
		intro.textContent = "This versioned snapshot preserves the search settings and subsequent Phrase Studio edits.";
		const tabs = document.createElement("div");
		tabs.className = "anagram-recipe-tabs";
		tabs.setAttribute("role", "tablist");
		tabs.setAttribute("aria-label", "Recipe views");
		recipeDialogTabs = ["overview", "json"].map((name) => {
			const button = document.createElement("button");
			button.type = "button";
			button.id = `anagram-recipe-tab-${name}`;
			button.dataset.recipeTab = name;
			button.setAttribute("role", "tab");
			button.setAttribute("aria-controls", `anagram-recipe-${name}`);
			button.textContent = name === "overview" ? "Overview" : "JSON";
			button.addEventListener("click", () => setRecipeDialogTab(name));
			tabs.append(button);
			return button;
		});
		tabs.addEventListener("keydown", (event) => {
			if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
			event.preventDefault();
			const nextIndex = (recipeDialogTabs.findIndex((button) => button.getAttribute("aria-selected") === "true") + (event.key === "ArrowRight" ? 1 : -1) + recipeDialogTabs.length) % recipeDialogTabs.length;
			const next = recipeDialogTabs[nextIndex];
			setRecipeDialogTab(next.dataset.recipeTab);
			next.focus();
		});
		recipeDialogOverview = document.createElement("div");
		recipeDialogOverview.className = "anagram-recipe-overview";
		recipeDialogOverview.id = "anagram-recipe-overview";
		recipeDialogOverview.setAttribute("role", "tabpanel");
		recipeDialogOverview.setAttribute("aria-labelledby", "anagram-recipe-tab-overview");
		recipeDialogContent = document.createElement("pre");
		recipeDialogContent.id = "anagram-recipe-json";
		recipeDialogContent.setAttribute("role", "tabpanel");
		recipeDialogContent.setAttribute("aria-labelledby", "anagram-recipe-tab-json");
		recipeDialogContent.tabIndex = 0;
		card.append(header, intro, tabs, recipeDialogOverview, recipeDialogContent);
		recipeDialog.append(card);
		recipeDialog.addEventListener("click", (event) => {
			if (event.target === recipeDialog) recipeDialog.close();
		});
		recipeDialog.addEventListener("close", () => {
			recipeDialogReturnFocus?.focus();
			recipeDialogReturnFocus = null;
		});
		document.body.append(recipeDialog);
	}
	function viewRecipe(entry, trigger) {
		ensureRecipeDialog();
		recipeDialogReturnFocus = trigger;
		recipeDialogTitle.textContent = `Recipe: ${titleCase(entry.phrase)}`;
		const recipe = recipePayload(entry);
		renderRecipeOverview(recipe);
		recipeDialogContent.textContent = JSON.stringify(recipe, null, 2);
		setRecipeDialogTab("overview");
		recipeDialog.showModal();
	}
	function restoreRecipe(entry, runAgain = false) {
		const recipe = recipePayload(entry);
		const search = recipe.search || {};
		input.value = recipe.sourcePhrase || entry.source || "";
		dictionary.value = search.dictionary || "standard";
		searchMode.value = search.searchDepth || "deep";
		maxWords.value = String(search.maximumWords || 5);
		minimumLength.value = String(search.shortestWordLength || 2);
		proMode.checked = Boolean(search.proMode);
		timeBudget.value = search.timeBudget || "auto";
		phrasePattern.value = search.phrasePattern || "";
		grammarTemplate.value = search.grammarTemplateSelection || "";
		customGrammarSlots = cloneRecipe(search.customGrammarSlots) || [];
		lockedWords.value = (search.requiredWords || []).join(", ");
		preferredWords.value = (search.preferredWords || []).join(", ");
		excludedWords.value = (search.excludedWords || []).join(", ");
		excludeVulgar.checked = search.excludeVulgar !== false;
		personalVocabulary.value = (search.relevantPersonalVocabulary || []).join("\n");
		advancedOptions.open = true;
		syncTemplateBuilder();
		syncProMode();
		syncInputClearButtons();
		input.dispatchEvent(new Event("input", { bubbles: true }));
		status.textContent = runAgain ? "Recipe restored. Starting the search…" : "Recipe settings restored. Review them, then architect anagrams when ready.";
		input.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
		if (runAgain) queueMicrotask(() => form.requestSubmit());
		else input.focus({ preventScroll: true });
	}
	async function copyRecipe(entry, trigger) {
		await navigator.clipboard.writeText(recipeJson(entry));
		const previous = trigger.textContent;
		trigger.textContent = "Copied";
		setTimeout(() => {
			trigger.textContent = previous;
		}, 1200);
	}
	function shareFind(entry) {
		const recipe = recipePayload(entry);
		const result = formatAnagramPhrase(entry.phrase, entry.formatOptions);
		openAnagramReveal({
			sourcePhrase: recipe.sourcePhrase || entry.source || "",
			resultPhrase: result,
			originalRank: recipe.originalRank || entry.rank || null
		});
	}
	function closePickActionMenus(except = null) {
		document.querySelectorAll(".anagram-pick-more").forEach((wrap) => {
			if (wrap === except) return;
			const menu = wrap.querySelector(".anagram-pick-more-menu");
			const toggle = wrap.querySelector("[aria-expanded]");
			if (menu) menu.hidden = true;
			if (toggle) toggle.setAttribute("aria-expanded", "false");
		});
	}
	document.addEventListener("click", (event) => {
		if (!event.target.closest?.(".anagram-pick-more")) closePickActionMenus();
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") closePickActionMenus();
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
			const menu = document.createElement("span");
			menu.className = "anagram-pick-more-menu";
			menu.hidden = true;
			const recipe = document.createElement("button");
			recipe.type = "button";
			recipe.textContent = "View recipe";
			recipe.addEventListener("click", () => viewRecipe(entry, recipe));
			const restore = document.createElement("button");
			restore.type = "button";
			restore.textContent = "Restore settings";
			restore.addEventListener("click", () => restoreRecipe(entry));
			const rerun = document.createElement("button");
			rerun.type = "button";
			rerun.textContent = "Run again";
			rerun.addEventListener("click", () => restoreRecipe(entry, true));
			const copyRecipeButton = document.createElement("button");
			copyRecipeButton.type = "button";
			copyRecipeButton.textContent = "Copy recipe";
			copyRecipeButton.addEventListener("click", () => copyRecipe(entry, copyRecipeButton));
			const share = document.createElement("button");
			share.type = "button";
			share.textContent = "Share find";
			share.addEventListener("click", () => shareFind(entry));
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
			menu.append(recipe, restore, rerun, copyRecipeButton, share, remove);
			more.addEventListener("click", () => {
				const opening = menu.hidden;
				closePickActionMenus(moreWrap);
				menu.hidden = !opening;
				more.setAttribute("aria-expanded", String(opening));
				menu.classList.remove("opens-up");
				if (opening) {
					const listBounds = pickList.getBoundingClientRect();
					const toggleBounds = more.getBoundingClientRect();
					const menuHeight = menu.getBoundingClientRect().height;
					if (listBounds.bottom - toggleBounds.bottom < menuHeight + 8) menu.classList.add("opens-up");
				}
			});
			moreWrap.append(more, menu);
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
			savedAt: (/* @__PURE__ */ new Date()).toISOString(),
			recipe: recipeForResult(result)
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
			let deadlineEpochMs = 0;
			const workerOptions = { ...options };
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
			let budgetStarted = false;
			let loadedWordCount = 0;
			beginTelemetry(workerCount, options.timeLimitMs);
			const startBudget = () => {
				if (budgetStarted || !options.timeLimitMs) return;
				budgetStarted = true;
				telemetryStarted = performance.now();
				deadlineEpochMs = Date.now() + options.timeLimitMs + 2e3;
				hardTimeout = setTimeout(finishTimedOut, options.timeLimitMs + 2e3);
			};
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
						startBudget();
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
				const worker = new Worker("/assets/js/tools/anagram-architect/anagram-worker.bundle.js?v=20260917-07", { type: "module" });
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
				workerCount: 1,
				nodeLimit: expanded ? 24e4 : 14e4
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
		currentSearchRecipe = null;
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
			currentSearchRecipe = createSearchRecipe(source, options, grammarValue, personalWords, requestId);
			const { outcome, wordCount, engine, wasmFailure, workerCount } = await solveInWorker(source, options, dictionary.value, showsProgressModal);
			status.textContent = `Architecting exact phrases from ${wordCount.toLocaleString()} words…`;
			if (showsProgressModal) updatePatternProgress("Finalizing your exact matches…", 100);
			allResults = outcome.results;
			renderResults();
			metricProgressLabel.textContent = outcome.timeLimited ? "time budget used" : "search complete";
			analysisPhase.textContent = outcome.timeLimited ? "Budget reached" : "Complete";
			const durationMs = performance.now() - started;
			const seconds = (durationMs / 1e3).toFixed(1);
			completeSearchRecipe(requestId, outcome, durationMs, engine, workerCount);
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
	pickImport.addEventListener("click", (event) => {
		event.preventDefault();
		openRecipeImporter();
	});
	recipeImportClose.addEventListener("click", () => recipeImportDialog.close());
	recipeImportCancel.addEventListener("click", () => recipeImportDialog.close());
	recipeImportDialog.addEventListener("click", (event) => {
		if (event.target === recipeImportDialog) recipeImportDialog.close();
	});
	recipeImportJson.addEventListener("input", parseRecipeImport);
	recipeImportFile.addEventListener("change", async () => {
		const file = recipeImportFile.files?.[0];
		recipeImportFileName.textContent = file?.name || "No file selected";
		if (!file) return;
		if (file.size > 25e4) {
			recipeImportJson.value = "";
			pendingImportedRecipe = null;
			recipeImportConfirm.disabled = true;
			showRecipeImportPreview("The selected recipe is too large to import.", "error");
			return;
		}
		recipeImportJson.value = await file.text();
		parseRecipeImport();
	});
	recipeImportConfirm.addEventListener("click", importPendingRecipe);
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
