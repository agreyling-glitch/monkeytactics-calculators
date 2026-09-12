const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function normalizeLetters(value) {
  return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
}

export function letterCounts(value) {
  const counts = new Uint8Array(26);
  for (const character of normalizeLetters(value)) counts[character.charCodeAt(0) - 97] += 1;
  return counts;
}

export function isExactAnagram(source, candidate) {
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

export function normalizeResultPattern(value) {
  return String(value || "").toLowerCase().replace(/[._-]/g, "?").replace(/\s+/g, "").replace(/[^a-z?*]/g, "");
}

function globMatches(value, pattern) {
  let valueIndex = 0;
  let patternIndex = 0;
  let starIndex = -1;
  let starValueIndex = 0;
  while (valueIndex < value.length) {
    if (patternIndex < pattern.length && (pattern[patternIndex] === "?" || pattern[patternIndex] === value[valueIndex])) {
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
  }
  while (pattern[patternIndex] === "*") patternIndex += 1;
  return patternIndex === pattern.length;
}

export function resultMatchesSearch(phrase, query) {
  const search = String(query || "").trim().toLowerCase();
  if (!search) return true;
  if (!/[?*._-]/.test(search)) return phrase.toLowerCase().includes(search);
  return globMatches(normalizeLetters(phrase), normalizeResultPattern(search));
}

export function phraseMatchesPattern(phrase, pattern) {
  const normalizedPattern = normalizeResultPattern(pattern);
  return !normalizedPattern || globMatches(normalizeLetters(phrase), normalizedPattern);
}

export function filterAndPageResults(results, query = "", page = 1, pageSize = 120) {
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

export function mergeRankedResults(shards, limit = 1200, shortPhraseReserve = 240) {
  const merged = new Map();
  for (const entries of shards) for (const result of entries) {
    const previous = merged.get(result.phrase);
    if (!previous || result.score > previous.score) merged.set(result.phrase, result);
  }
  const ranked = [...merged.values()].sort((left, right) => right.score - left.score || left.phrase.localeCompare(right.phrase));
  const functionWords = new Set(["a", "an", "the", "this", "that", "of", "to", "in", "on", "at", "by", "for", "from", "with", "and", "or", "but", "is", "are", "was", "be", "up"]);
  const familyKey = ({ phrase }) => phrase.split(" ")
    .filter((word) => !functionWords.has(word))
    .map((word) => word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word)
    .sort()
    .join("|");
  const familyCounts = new Map();
  const diverse = ranked.filter((result) => {
    const family = familyKey(result);
    const count = familyCounts.get(family) || 0;
    if (family && count >= 1) return false;
    familyCounts.set(family, count + 1);
    return true;
  });
  const selected = new Map();
  for (const result of diverse) {
    if (result.phrase.split(" ").length <= 3) selected.set(result.phrase, result);
    if (selected.size >= Math.min(shortPhraseReserve, limit)) break;
  }
  for (const result of diverse) {
    if (selected.size >= limit) break;
    selected.set(result.phrase, result);
  }
  return [...selected.values()]
    .sort((left, right) => right.score - left.score || left.phrase.localeCompare(right.phrase))
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function fits(wordCounts, remaining) {
  for (let index = 0; index < 26; index += 1) if (wordCounts[index] > remaining[index]) return false;
  return true;
}

function subtract(remaining, wordCounts) {
  const next = remaining.slice();
  for (let index = 0; index < 26; index += 1) next[index] -= wordCounts[index];
  return next;
}

function remainingSize(counts) {
  let total = 0;
  for (const amount of counts) total += amount;
  return total;
}

const COMMON = new Set((
  "a i an the and or but of to in on at by for from with as is am are was be been being " +
  "old new good bad big small man woman person people base alien damn love life time world " +
  "mind heart name true real great little dark light home house day night art architect"
).split(/\s+/));

const DETERMINERS = new Set("a an the this that my your our his her their".split(" "));
const PREPOSITIONS = new Set("of to in on at by for from with as into over under".split(" "));
const CONJUNCTIONS = new Set("and or but nor yet so".split(" "));
const ADJECTIVES = new Set("old new good bad big small great little dark light true real damn".split(" "));
const NATURAL_PAIRS = new Set(["old man", "new world", "good man", "bad man", "dark night", "a base", "the world", "of life"]);

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
  if (ADJECTIVES.has(words[0])) score += 3;
  if (DETERMINERS.has(words.at(-1)) || PREPOSITIONS.has(words.at(-1)) || CONJUNCTIONS.has(words.at(-1))) score -= 18;
  for (let index = 0; index < words.length - 1; index += 1) {
    const current = words[index];
    const next = words[index + 1];
    if (NATURAL_PAIRS.has(`${current} ${next}`)) score += 14;
    if (ADJECTIVES.has(current) && !PREPOSITIONS.has(next) && !DETERMINERS.has(next)) score += 8;
    if (PREPOSITIONS.has(current) && DETERMINERS.has(next)) score += 10;
    if (DETERMINERS.has(current) && !DETERMINERS.has(next) && !PREPOSITIONS.has(next)) score += 9;
    if (current === "a" && /^[aeiou]/.test(next)) score -= 12;
    if (current === "an" && !/^[aeiou]/.test(next)) score -= 12;
    if (DETERMINERS.has(current) && DETERMINERS.has(next)) score -= 15;
    if (PREPOSITIONS.has(current) && PREPOSITIONS.has(next)) score -= 12;
  }
  return score;
}

function bestOrdering(words, pattern = "") {
  if (words.length < 2) {
    const phrase = words.join(" ");
    return phraseMatchesPattern(phrase, pattern) ? { phrase, score: phraseScore(words) } : null;
  }
  let best = null;
  const used = new Array(words.length).fill(false);
  const current = [];
  const visit = () => {
    if (current.length === words.length) {
      if (!phraseMatchesPattern(current.join(" "), pattern)) return;
      const score = phraseScore(current);
      if (!best || score > best.score) best = { phrase: current.join(" "), score };
      return;
    }
    const seen = new Set();
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
  return best;
}

export function solveAnagrams(source, words, options = {}) {
  const letters = normalizeLetters(source);
  const maxWords = Math.max(1, Math.min(6, Number(options.maxWords) || 5));
  const minimumLength = Math.max(1, Math.min(8, Number(options.minimumLength) || 2));
  const limit = Math.max(1, Number(options.limit) || 100);
  const nodeLimit = Math.max(1000, Number(options.nodeLimit) || 300000);
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const progressInterval = Math.max(1000, Number(options.progressInterval) || 5000);
  const phrasePattern = normalizeResultPattern(options.pattern || "");
  const lockedWords = String(options.lockedWords || "").toLowerCase().match(/[a-z]+/g) || [];
  const preferredWords = new Set(String(options.preferredWords || "").toLowerCase().match(/[a-z]+/g) || []);
  const excludedWords = new Set(String(options.excludedWords || "").toLowerCase().match(/[a-z]+/g) || []);
  const vulgarWords = new Set(["arse","asshole","bastard","bitch","bollocks","bullshit","cocksucker","cum","cunt","dickhead","fuck","fucker","fucking","motherfucker","piss","porn","porno","prick","shit","shitty","slut","twat","wanker","whore"]);
  if (letters.length < 2) return { results: [], nodes: 0, truncated: false };

  const target = letterCounts(letters);
  const seenWords = new Set();
  const candidates = [];
  const considerWord = (rawWord) => {
    const word = normalizeLetters(rawWord);
    if (!word || seenWords.has(word) || excludedWords.has(word) || (options.excludeVulgar !== false && vulgarWords.has(word)) || word.length > letters.length || (word.length < minimumLength && word !== "a" && word !== "i")) return;
    seenWords.add(word);
    const counts = letterCounts(word);
    if (fits(counts, target)) candidates.push({ word, counts, score: wordPriority(word) + (preferredWords.has(word) ? 420 : 0) });
  };
  considerWord("a");
  considerWord("i");
  for (const rawWord of words) considerWord(rawWord);
  candidates.sort((left, right) => right.score - left.score || right.word.length - left.word.length || left.word.localeCompare(right.word));

  const literalPatternWords = String(options.pattern || "").toLowerCase().match(/[a-z]+/g) || [];
  if (phrasePattern && !/[?*]/.test(phrasePattern) && literalPatternWords.length > 1) {
    const literalPhrase = literalPatternWords.join(" ");
    const wordsAreAllowed = literalPatternWords.every((word) =>
      (word === "a" || word === "i" || seenWords.has(word)) &&
      (word.length >= minimumLength || word === "a" || word === "i"));
    const availableLiteralWords = [...literalPatternWords];
    const containsLockedWords = lockedWords.every((word) => {
      const index = availableLiteralWords.indexOf(word);
      if (index < 0) return false;
      availableLiteralWords.splice(index, 1);
      return true;
    });
    if (literalPatternWords.length <= maxWords && wordsAreAllowed && containsLockedWords && isExactAnagram(letters, literalPhrase)) {
      return { results: [{ phrase: literalPhrase, score: phraseScore(literalPatternWords) }], nodes: 0, truncated: false };
    }
    if (!containsLockedWords) throw new Error("The phrase pattern does not contain every required word.");
    return { results: [], nodes: 0, truncated: false };
  }

  const byLetter = Array.from({ length: 26 }, () => []);
  candidates.forEach((entry, index) => {
    for (let letter = 0; letter < 26; letter += 1) if (entry.counts[letter]) byLetter[letter].push(index);
  });

  const found = new Map();
  const seenResults = new Set();
  const path = [...lockedWords];
  let initialRemaining = target;
  for (const word of lockedWords) {
    const entry = candidates.find((candidate) => candidate.word === word && fits(candidate.counts, initialRemaining));
    if (!entry) throw new Error(`Locked word “${word}” is not available from these letters and settings.`);
    initialRemaining = subtract(initialRemaining, entry.counts);
  }
  if (path.length > maxWords) throw new Error("The locked words exceed the maximum word count.");
  let nodes = 0;
  let truncated = false;

  const visit = (remaining) => {
    if (nodes >= nodeLimit) {
      truncated = true;
      return;
    }
    nodes += 1;
    if (onProgress && nodes % progressInterval === 0) onProgress({ nodes, nodeLimit, found: found.size });
    const size = remainingSize(remaining);
    if (!size) {
      const key = [...path].sort().join("|");
      if (!seenResults.has(key)) {
        seenResults.add(key);
        const ordered = bestOrdering(path, phrasePattern);
        if (ordered) ordered.score += path.filter((word) => preferredWords.has(word)).length * 520;
        if (ordered) {
          if (found.size < limit) found.set(key, ordered);
          else {
            let worstKey = null;
            let worst = null;
            for (const [candidateKey, candidate] of found) {
              if (!worst || candidate.score < worst.score || (candidate.score === worst.score && candidate.phrase.localeCompare(worst.phrase) > 0)) {
                worstKey = candidateKey;
                worst = candidate;
              }
            }
            if (ordered.score > worst.score || (ordered.score === worst.score && ordered.phrase.localeCompare(worst.phrase) < 0)) {
              found.delete(worstKey);
              found.set(key, ordered);
            }
          }
        }
      }
      return;
    }
    if (path.length >= maxWords) return;

    let pivot = -1;
    let fewest = Infinity;
    for (let letter = 0; letter < 26; letter += 1) {
      if (!remaining[letter]) continue;
      let possible = 0;
      for (const index of byLetter[letter]) if (fits(candidates[index].counts, remaining)) possible += 1;
      if (possible < fewest) { pivot = letter; fewest = possible; }
    }
    if (pivot < 0 || !fewest) return;

    for (const index of byLetter[pivot]) {
      const candidate = candidates[index];
      if (!fits(candidate.counts, remaining)) continue;
      path.push(candidate.word);
      visit(subtract(remaining, candidate.counts));
      path.pop();
      if (nodes >= nodeLimit) break;
    }
  };

  visit(initialRemaining);
  if (onProgress) onProgress({ nodes, nodeLimit, found: found.size });
  const results = [...found.values()]
    .filter((result) => result && isExactAnagram(letters, result.phrase) && phraseMatchesPattern(result.phrase, phrasePattern))
    .sort((left, right) => right.score - left.score || left.phrase.localeCompare(right.phrase));
  return { results, nodes, truncated };
}

export { LETTERS };
