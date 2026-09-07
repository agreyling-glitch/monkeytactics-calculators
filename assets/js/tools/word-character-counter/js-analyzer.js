const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot",
  "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few",
  "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll",
  "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll",
  "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most",
  "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should",
  "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
  "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
  "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
  "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);

const SENTENCE_ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "rev", "hon", "capt", "cmdr", "col", "gen", "lt",
  "sgt", "sen", "rep", "gov", "pres", "vs", "etc", "fig", "no", "dept", "est", "inc", "ltd", "co"
]);
const DOTTED_ABBREVIATIONS = new Set(["a.m", "p.m", "e.g", "i.e", "u.s", "u.k"]);
const letterPattern = /\p{L}/u;
const whitespacePattern = /\s/u;

function tokenize(text) {
  if (typeof Intl?.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "word" }).segment(text))
      .filter(entry => entry.isWordLike)
      .map(entry => ({ word: entry.segment.toLocaleLowerCase(), index: entry.index }));
  }
  return Array.from(text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu), match => ({
    word: match[0].toLocaleLowerCase(),
    index: match.index
  }));
}

function isSentenceTerminator(characters, index) {
  const character = characters[index];
  if (character !== ".") return /[!?。！？．｡؟।॥]/u.test(character);
  if (/\d/.test(characters[index - 1] || "") && /\d/.test(characters[index + 1] || "")) return false;
  if (letterPattern.test(characters[index - 1] || "") && letterPattern.test(characters[index + 1] || "") && characters[index + 2] === ".") return false;
  let start = index;
  while (start > 0 && (letterPattern.test(characters[start - 1]) || characters[start - 1] === ".")) start -= 1;
  const preceding = characters.slice(start, index).join("").toLocaleLowerCase();
  if (DOTTED_ABBREVIATIONS.has(preceding)) {
    if (preceding !== "a.m" && preceding !== "p.m") return false;
    const next = characters.slice(index + 1).find(candidate => !whitespacePattern.test(candidate));
    return Boolean(next && /[A-Z]/.test(next));
  }
  const finalWord = preceding.split(".").at(-1) || "";
  if (SENTENCE_ABBREVIATIONS.has(finalWord)) return false;
  if (Array.from(finalWord).length === 1 && /[A-Z]/.test(characters[index - 1] || "")) return false;
  return true;
}

function sentenceLengths(text) {
  const lengths = [];
  const characters = Array.from(text);
  let current = 0;
  let hasContent = false;
  characters.forEach(function (character, index) {
    if (!hasContent && whitespacePattern.test(character)) return;
    if (isSentenceTerminator(characters, index)) {
      if (hasContent) lengths.push(current + 1);
      current = 0;
      hasContent = false;
      return;
    }
    current += 1;
    if (!whitespacePattern.test(character)) hasContent = true;
  });
  if (hasContent) lengths.push(current);
  return lengths;
}

function paragraphLengths(text) {
  const lengths = [];
  let current = 0;
  let hasContent = false;
  for (const rawLine of text.split(/\n|\r(?!\n)/u)) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line.trim()) {
      if (hasContent) lengths.push(current);
      current = 0;
      hasContent = false;
    } else {
      if (hasContent) current += 1;
      current += Array.from(line).length;
      hasContent = true;
    }
  }
  if (hasContent) lengths.push(current);
  return lengths;
}

function countSyllables(word) {
  const letters = Array.from(word).filter(character => letterPattern.test(character));
  if (!letters.length) return 0;
  let groups = 0;
  let previousVowel = false;
  for (const character of letters) {
    const vowel = /[aeiouy]/.test(character.toLocaleLowerCase("en"));
    if (vowel && !previousVowel) groups += 1;
    previousVowel = vowel;
  }
  const last = letters.at(-1) || "";
  const penultimate = letters.at(-2) || "";
  if (letters.length > 2 && last.toLocaleLowerCase("en") === "e" && groups > 1 && penultimate.toLocaleLowerCase("en") !== "l") groups -= 1;
  return Math.max(1, groups);
}

function readability(tokens, sentenceCount) {
  if (!tokens.length) return { flesch_kincaid: 0, gunning_fog: 0, smog: 0, coleman_liau: 0 };
  const words = tokens.length;
  const sentences = Math.max(1, sentenceCount);
  const syllables = tokens.map(token => countSyllables(token.word));
  const syllableTotal = syllables.reduce((total, count) => total + count, 0);
  const complexWords = syllables.filter(count => count >= 3).length;
  const letters = tokens.reduce((total, token) => total + Array.from(token.word).filter(character => letterPattern.test(character)).length, 0);
  const wordsPerSentence = words / sentences;
  const l = letters / words * 100;
  const s = sentences / words * 100;
  return {
    flesch_kincaid: 0.39 * wordsPerSentence + 11.8 * (syllableTotal / words) - 15.59,
    gunning_fog: 0.4 * (wordsPerSentence + 100 * (complexWords / words)),
    smog: 1.043 * Math.sqrt(complexWords * (30 / sentences)) + 3.1291,
    coleman_liau: 0.0588 * l - 0.296 * s - 15.8
  };
}

function collectNgrams(tokens, size) {
  const frequencies = {};
  for (let index = 0; index + size <= tokens.length; index += 1) {
    const phrase = tokens.slice(index, index + size).map(token => token.word).join(" ");
    frequencies[phrase] = (frequencies[phrase] || 0) + 1;
  }
  return frequencies;
}

function compareWords(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function analyzeTextWithJavaScript(text) {
  const tokens = tokenize(text);
  const wordCount = tokens.length;
  const sentences = sentenceLengths(text);
  const paragraphs = paragraphLengths(text);
  const counts = new Map();
  const keywordPositions = [];
  for (const token of tokens) {
    if (STOPWORDS.has(token.word)) continue;
    counts.set(token.word, (counts.get(token.word) || 0) + 1);
    keywordPositions.push({ word: token.word, index: token.index });
  }
  const keywordFrequency = Array.from(counts, ([word, count]) => ({
    word,
    count,
    density: wordCount ? count / wordCount * 100 : 0
  })).sort((left, right) => compareWords(left.word, right.word));
  const topKeywords = keywordFrequency.slice()
    .sort((left, right) => right.count - left.count || compareWords(left.word, right.word))
    .slice(0, 10);
  const characters = Array.from(text);
  return {
    word_count: wordCount,
    char_count: characters.length,
    char_no_spaces: characters.filter(character => !whitespacePattern.test(character)).length,
    sentence_count: sentences.length,
    paragraph_count: paragraphs.length,
    keyword_frequency: keywordFrequency,
    top_keywords: topKeywords,
    readability_scores: readability(tokens, sentences.length),
    ngram_data: {
      unigrams: collectNgrams(tokens, 1),
      bigrams: collectNgrams(tokens, 2),
      trigrams: collectNgrams(tokens, 3)
    },
    visualization_data: {
      sentence_lengths: sentences,
      paragraph_lengths: paragraphs,
      keyword_positions: keywordPositions
    }
  };
}

function numbersMatch(left, right) {
  if (Number.isInteger(left) && Number.isInteger(right)) return left === right;
  return Math.abs(left - right) <= Math.max(0.0001, Math.max(Math.abs(left), Math.abs(right)) * 0.00001);
}

export function compareAnalysisResults(wasm, javascript, limit = 25) {
  const differences = [];
  function compare(left, right, path) {
    if (differences.length >= limit) return;
    if (typeof left === "number" && typeof right === "number") {
      if (!numbersMatch(left, right)) differences.push({ path, wasm: left, javascript: right });
      return;
    }
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right)) {
        differences.push({ path, wasm: left, javascript: right });
        return;
      }
      if (left.length !== right.length) differences.push({ path: path + ".length", wasm: left.length, javascript: right.length });
      for (let index = 0; index < Math.min(left.length, right.length); index += 1) compare(left[index], right[index], path + "[" + index + "]");
      return;
    }
    if (left && right && typeof left === "object" && typeof right === "object") {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
      for (const key of Array.from(keys).sort()) compare(left[key], right[key], path ? path + "." + key : key);
      return;
    }
    if (left !== right) differences.push({ path, wasm: left, javascript: right });
  }
  compare(wasm, javascript, "");
  return { match: differences.length === 0, differences, truncated: differences.length >= limit };
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
