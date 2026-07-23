// Lightweight text analysis utilities for Word / Character Counter
export function analyzeText(text, options = {}) {
  const wpm = options.wpm || 200;
  // When false, stopwords are kept in the top-words list.
  const excludeStopwords = options.excludeStopwords !== false;

  if (!text) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      readingTimeMinutes: 0,
      readingTimeSeconds: 0,
      topWords: []
    };
  }

  const normalized = text.replace(/\u2019/g, "'");
  const characters = normalized.length;
  const charactersNoSpaces = normalized.replace(/\s+/g, '').length;

  // Tokenize words: split on whitespace and remove punctuation edges
  const rawTokens = normalized
    .toLowerCase()
    .replace(/[“”«»„“”]/g, '"')
    .replace(/[–—‑]/g, '-')
    .split(/\s+/)
    .map(t => t.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ''))
    .filter(Boolean);

  const words = rawTokens.length;

  // Small stopword set to avoid trivial top results
  const stopwords = new Set([
    'the','and','a','an','of','to','in','for','on','with','is','it','that','this','as','are','was','were','by','be','or','at','from','but','not','you','your'
  ]);

  const counts = Object.create(null);
  for (const w of rawTokens) {
    const clean = w.replace(/^'+|'+$/g, '');
    if (!clean) continue;
    counts[clean] = (counts[clean] || 0) + 1;
  }

  const topWords = Object.keys(counts)
    .map(word => ({ word, count: counts[word], density: (counts[word] / Math.max(1, words)) * 100 }))
    .filter(entry => excludeStopwords ? !stopwords.has(entry.word) : true)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const readingTimeMinutes = words / wpm;
  const readingTimeSeconds = Math.round(readingTimeMinutes * 60);

  return {
    words,
    characters,
    charactersNoSpaces,
    readingTimeMinutes,
    readingTimeSeconds,
    topWords
  };
}

export function humanizeReadingTime(seconds) {
  if (!seconds) return 'less than a minute';
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs === 0 ? `${mins} min` : `${mins} min ${secs} sec`;
}
