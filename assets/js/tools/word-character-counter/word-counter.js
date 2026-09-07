// Lightweight text analysis utilities for Word / Character Counter
const STOPWORDS = {
  english: ['the','and','a','an','of','to','in','for','on','with','is','it','that','this','as','are','was','were','by','be','or','at','from','but','not','you','your'],
  chinese: ['的','了','是','在','和','有','我','你','他','她','它','们','这','那','与','及','就','不','也','都','而','被','把'],
  japanese: ['の','に','は','を','が','と','で','も','です','ます','する','した','ある','いる'],
  thai: ['และ','ของ','ที่','เป็น','ใน','มี','ไม่','ได้','ให้','กับ','ก็','จาก'],
  french: ['le','la','les','un','une','des','de','du','et','à','en','est','que','qui','pour','dans','sur','pas'],
  spanish: ['el','la','los','las','un','una','de','del','y','a','en','es','que','por','para','con','no'],
  german: ['der','die','das','ein','eine','und','oder','ist','sind','zu','von','mit','für','auf','in','nicht']
};

function inferredLanguage(dominantScript) {
  if (dominantScript === 'Han') return 'chinese';
  if (dominantScript === 'Japanese') return 'japanese';
  if (dominantScript === 'Thai') return 'thai';
  if (dominantScript === 'Latin') return 'english';
  return 'other';
}

export function getStopwords(language) {
  return new Set(STOPWORDS[language] || []);
}

export function detectAnalysisSupport(text, languageSelection = 'auto') {
  const scriptCounts = { Latin: 0, Han: 0, Japanese: 0, Thai: 0, Arabic: 0, Indic: 0, Other: 0 };
  for (const character of text || '') {
    if (!/\p{L}/u.test(character)) continue;
    if (/\p{Script=Latin}/u.test(character)) scriptCounts.Latin += 1;
    else if (/\p{Script=Han}/u.test(character)) scriptCounts.Han += 1;
    else if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(character)) scriptCounts.Japanese += 1;
    else if (/\p{Script=Thai}/u.test(character)) scriptCounts.Thai += 1;
    else if (/\p{Script=Arabic}/u.test(character)) scriptCounts.Arabic += 1;
    else if (/[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}]/u.test(character)) scriptCounts.Indic += 1;
    else scriptCounts.Other += 1;
  }
  const ranked = Object.entries(scriptCounts).sort((left, right) => right[1] - left[1]);
  const letterCount = ranked.reduce((total, entry) => total + entry[1], 0);
  const dominantScript = scriptCounts.Japanese > 0 && scriptCounts.Japanese + scriptCounts.Han >= ranked[0][1]
    ? 'Japanese'
    : (letterCount ? ranked[0][0] : 'Unknown');
  // A long Latin-script document may legitimately contain a few names, quotations,
  // or symbols from another script. Do not disable all readability analysis for
  // those isolated characters; require the document to be overwhelmingly Latin.
  const latinRatio = letterCount > 0 ? scriptCounts.Latin / letterCount : 0;
  const englishCompatible = dominantScript === 'Latin' && latinRatio >= 0.98;
  const activeScripts = Object.values(scriptCounts).filter(count => count > 0).length;
  const language = languageSelection === 'auto' ? inferredLanguage(dominantScript) : languageSelection;
  return {
    dominantScript,
    mixedScripts: activeScripts > 1 && dominantScript !== 'Japanese',
    language,
    languageAssumed: languageSelection === 'auto',
    readabilitySupported: ['english', 'french', 'spanish', 'german'].includes(language) && englishCompatible,
    stopwordsSupported: Boolean(STOPWORDS[language])
  };
}

function readabilityWords(text, language) {
  const locale = { english: 'en', french: 'fr', spanish: 'es', german: 'de' }[language];
  const normalized = (text || '').replace(/\u2019/g, "'").toLocaleLowerCase(locale);
  if (typeof Intl?.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(locale, { granularity: 'word' }).segment(normalized))
      .filter(entry => entry.isWordLike && /\p{L}/u.test(entry.segment))
      .map(entry => entry.segment);
  }
  return normalized.match(/[\p{L}]+(?:['’][\p{L}]+)*/gu) || [];
}

function countSyllables(word, language) {
  const letters = word.normalize('NFC').replace(/[^\p{L}]/gu, '');
  if (!letters) return 0;
  if (language === 'spanish') {
    const groups = letters.match(/[aeiouáéíóúü]+/giu) || [];
    return Math.max(1, groups.reduce((count, group) => {
      const strong = group.match(/[aáeéoóíú]/giu)?.length || 0;
      return count + Math.max(1, strong);
    }, 0));
  }
  if (language === 'french') {
    let candidate = letters.toLocaleLowerCase('fr');
    candidate = candidate.replace(/(?:es|e|ent)$/u, '');
    const groups = candidate.match(/[aeiouyàâäéèêëîïôöùûüÿœæ]+/giu) || [];
    return Math.max(1, groups.length);
  }
  if (language === 'german') {
    const groups = letters.match(/[aeiouyäöü]+/giu) || [];
    return Math.max(1, groups.length);
  }
  let candidate = letters.toLocaleLowerCase('en').replace(/e$/u, '');
  const groups = candidate.match(/[aeiouy]+/giu) || [];
  return Math.max(1, groups.length);
}

export function calculateReadability(text, sentenceCount, languageSelection = 'auto') {
  const support = detectAnalysisSupport(text, languageSelection);
  if (!support.readabilitySupported) return [];
  const words = readabilityWords(text, support.language);
  if (!words.length) return [];
  const sentences = Math.max(1, sentenceCount || 0);
  const syllables = words.map(word => countSyllables(word, support.language));
  const syllableTotal = syllables.reduce((total, count) => total + count, 0);
  const wordsPerSentence = words.length / sentences;
  const syllablesPerWord = syllableTotal / words.length;

  if (support.language === 'spanish') {
    return [
      { id: 'spanishFernandez', label: 'Fernández-Huerta', value: 206.84 - (60 * syllablesPerWord) - (1.02 * wordsPerSentence), explanation: 'Spanish reading-ease estimate; higher scores indicate easier text.' },
      { id: 'spanishSzigriszt', label: 'Szigriszt-Pazos', value: 206.835 - (62.3 * syllablesPerWord) - wordsPerSentence, explanation: 'Spanish perspicuity estimate; higher scores indicate easier text.' }
    ];
  }
  if (support.language === 'french') {
    return [
      { id: 'frenchKandel', label: 'Kandel–Moles', value: 207 - (1.015 * wordsPerSentence) - (73.6 * syllablesPerWord), explanation: 'French reading-ease estimate; higher scores indicate easier text.' }
    ];
  }
  if (support.language === 'german') {
    const complexPercent = syllables.filter(count => count >= 3).length / words.length * 100;
    const longPercent = words.filter(word => Array.from(word).filter(character => /\p{L}/u.test(character)).length > 6).length / words.length * 100;
    const monosyllablePercent = syllables.filter(count => count === 1).length / words.length * 100;
    return [
      { id: 'germanWiener', label: 'Wiener Sachtextformel', value: 0.1935 * complexPercent + 0.1672 * wordsPerSentence + 0.1297 * longPercent - 0.0327 * monosyllablePercent - 0.875, explanation: 'Estimated German school or difficulty level; lower scores indicate easier text.' }
    ];
  }
  return [];
}

export function getSpeedProfile(text, wordCount = 0, languageSelection = 'auto') {
  const support = detectAnalysisSupport(text, languageSelection);
  const characterBased = support.language === 'chinese' || support.language === 'japanese';
  const characterCount = Array.from(text || '').filter(character => /[\p{L}\p{N}]/u.test(character)).length;
  const japanese = support.language === 'japanese';
  return {
    mode: characterBased ? (japanese ? 'japanese-characters' : 'han-characters') : 'words',
    unit: characterBased ? 'cpm' : 'wpm',
    amount: characterBased ? characterCount : wordCount,
    approximate: !support.readabilitySupported,
    reading: characterBased
      ? (japanese
          ? { min: 300, max: 2000, step: 50, defaultValue: 1100, presets: [['Careful', 700], ['Standard', 1100], ['Fast', 1500]] }
          : { min: 100, max: 700, step: 10, defaultValue: 300, presets: [['Careful', 220], ['Standard', 300], ['Fast', 450]] })
      : { min: 50, max: 1000, step: 10, defaultValue: 200, presets: [['Technical', 130], ['Standard', 240], ['Skimming', 300]] },
    speaking: characterBased
      ? (japanese
          ? { min: 150, max: 800, step: 10, defaultValue: 400, presets: [['Slow', 300], ['Standard', 400], ['Fast', 550]] }
          : { min: 100, max: 600, step: 10, defaultValue: 300, presets: [['Slow', 220], ['Standard', 300], ['Fast', 380]] })
      : { min: 80, max: 200, step: 5, defaultValue: 130, presets: [['Slow', 100], ['Presentation', 130], ['Conversational', 150], ['Fast', 180]] }
  };
}

export function analyzeText(text, options = {}) {
  const wpm = options.wpm || 200;
  // When false, stopwords are kept in the top-words list.
  const excludeStopwords = options.excludeStopwords !== false;
  const support = detectAnalysisSupport(text, options.language || 'auto');

  if (!text) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      readingTimeMinutes: 0,
      readingTimeSeconds: 0,
      topWords: [],
      analysisSupport: support
    };
  }

  const normalized = text.replace(/\u2019/g, "'");
  const characters = normalized.length;
  const charactersNoSpaces = normalized.replace(/\s+/g, '').length;

  // Prefer locale-aware word boundaries; retain a Unicode-aware compatibility path.
  const rawTokens = typeof Intl?.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'word' }).segment(normalized))
        .filter(entry => entry.isWordLike)
        .map(entry => entry.segment.toLocaleLowerCase())
    : normalized
        .toLocaleLowerCase()
        .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];

  const words = rawTokens.length;

  const stopwords = getStopwords(support.language);

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
    topWords,
    analysisSupport: support
  };
}

export function humanizeReadingTime(seconds) {
  if (!seconds) return 'less than a minute';
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs === 0 ? `${mins} min` : `${mins} min ${secs} sec`;
  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;
  if (hours < 24) return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days} days` : `${days} days ${remainingHours} hr`;
}
