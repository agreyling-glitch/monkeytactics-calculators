use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
use unicode_segmentation::UnicodeSegmentation;
use wasm_bindgen::prelude::*;

#[cfg(feature = "parallel")]
use rayon::prelude::*;

#[cfg(all(feature = "parallel", target_arch = "wasm32"))]
pub use wasm_bindgen_rayon::init_thread_pool;

#[derive(Debug, Clone, PartialEq)]
struct Token {
    word: String,
    char_index: usize,
}

#[derive(Debug, Deserialize)]
struct BrowserToken {
    word: String,
    index: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct KeywordEntry {
    pub word: String,
    pub count: u32,
    pub density: f32,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ReadabilityScores {
    pub flesch_kincaid: f32,
    pub gunning_fog: f32,
    pub smog: f32,
    pub coleman_liau: f32,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct NgramResult {
    pub unigrams: HashMap<String, u32>,
    pub bigrams: HashMap<String, u32>,
    pub trigrams: HashMap<String, u32>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct KeywordPosition {
    pub word: String,
    pub index: usize,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct VisualizationData {
    pub sentence_lengths: Vec<u32>,
    pub paragraph_lengths: Vec<u32>,
    pub keyword_positions: Vec<KeywordPosition>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
struct AnalysisData {
    word_count: u32,
    char_count: u32,
    char_no_spaces: u32,
    sentence_count: u32,
    paragraph_count: u32,
    keyword_frequency: Vec<KeywordEntry>,
    top_keywords: Vec<KeywordEntry>,
    readability_scores: ReadabilityScores,
    ngram_data: NgramResult,
    visualization_data: VisualizationData,
}

/// JavaScript-facing analysis result. Complex values are exposed as native JS
/// arrays and objects, while `toJSON()` makes the full result directly exportable.
#[wasm_bindgen]
pub struct AnalysisResult {
    data: AnalysisData,
}

fn as_js<T: Serialize>(value: &T) -> JsValue {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .expect("analysis values are serializable")
}

#[wasm_bindgen]
impl AnalysisResult {
    #[wasm_bindgen(getter)]
    pub fn word_count(&self) -> u32 {
        self.data.word_count
    }

    #[wasm_bindgen(getter)]
    pub fn char_count(&self) -> u32 {
        self.data.char_count
    }

    #[wasm_bindgen(getter)]
    pub fn char_no_spaces(&self) -> u32 {
        self.data.char_no_spaces
    }

    #[wasm_bindgen(getter)]
    pub fn sentence_count(&self) -> u32 {
        self.data.sentence_count
    }

    #[wasm_bindgen(getter)]
    pub fn paragraph_count(&self) -> u32 {
        self.data.paragraph_count
    }

    #[wasm_bindgen(getter)]
    pub fn keyword_frequency(&self) -> JsValue {
        as_js(&self.data.keyword_frequency)
    }

    #[wasm_bindgen(getter)]
    pub fn top_keywords(&self) -> JsValue {
        as_js(&self.data.top_keywords)
    }

    #[wasm_bindgen(getter)]
    pub fn readability_scores(&self) -> JsValue {
        as_js(&self.data.readability_scores)
    }

    #[wasm_bindgen(getter)]
    pub fn ngram_data(&self) -> JsValue {
        as_js(&self.data.ngram_data)
    }

    #[wasm_bindgen(getter)]
    pub fn visualization_data(&self) -> JsValue {
        as_js(&self.data.visualization_data)
    }

    #[wasm_bindgen(js_name = toJSON)]
    pub fn to_json(&self) -> JsValue {
        as_js(&self.data)
    }
}

fn stopwords() -> &'static HashSet<&'static str> {
    static STOPWORDS: OnceLock<HashSet<&'static str>> = OnceLock::new();
    STOPWORDS.get_or_init(|| {
        [
            "a",
            "about",
            "above",
            "after",
            "again",
            "against",
            "all",
            "am",
            "an",
            "and",
            "any",
            "are",
            "aren't",
            "as",
            "at",
            "be",
            "because",
            "been",
            "before",
            "being",
            "below",
            "between",
            "both",
            "but",
            "by",
            "can",
            "can't",
            "cannot",
            "could",
            "couldn't",
            "did",
            "didn't",
            "do",
            "does",
            "doesn't",
            "doing",
            "don't",
            "down",
            "during",
            "each",
            "few",
            "for",
            "from",
            "further",
            "had",
            "hadn't",
            "has",
            "hasn't",
            "have",
            "haven't",
            "having",
            "he",
            "he'd",
            "he'll",
            "he's",
            "her",
            "here",
            "here's",
            "hers",
            "herself",
            "him",
            "himself",
            "his",
            "how",
            "how's",
            "i",
            "i'd",
            "i'll",
            "i'm",
            "i've",
            "if",
            "in",
            "into",
            "is",
            "isn't",
            "it",
            "it's",
            "its",
            "itself",
            "let's",
            "me",
            "more",
            "most",
            "mustn't",
            "my",
            "myself",
            "no",
            "nor",
            "not",
            "of",
            "off",
            "on",
            "once",
            "only",
            "or",
            "other",
            "ought",
            "our",
            "ours",
            "ourselves",
            "out",
            "over",
            "own",
            "same",
            "shan't",
            "she",
            "she'd",
            "she'll",
            "she's",
            "should",
            "shouldn't",
            "so",
            "some",
            "such",
            "than",
            "that",
            "that's",
            "the",
            "their",
            "theirs",
            "them",
            "themselves",
            "then",
            "there",
            "there's",
            "these",
            "they",
            "they'd",
            "they'll",
            "they're",
            "they've",
            "this",
            "those",
            "through",
            "to",
            "too",
            "under",
            "until",
            "up",
            "very",
            "was",
            "wasn't",
            "we",
            "we'd",
            "we'll",
            "we're",
            "we've",
            "were",
            "weren't",
            "what",
            "what's",
            "when",
            "when's",
            "where",
            "where's",
            "which",
            "while",
            "who",
            "who's",
            "whom",
            "why",
            "why's",
            "with",
            "won't",
            "would",
            "wouldn't",
            "you",
            "you'd",
            "you'll",
            "you're",
            "you've",
            "your",
            "yours",
            "yourself",
            "yourselves",
        ]
        .into_iter()
        .collect()
    })
}

fn tokenize(input: &str) -> Vec<Token> {
    input
        .unicode_word_indices()
        .map(|(byte_index, word)| Token {
            word: word.to_lowercase(),
            char_index: input[..byte_index].chars().count(),
        })
        .collect()
}

fn is_sentence_terminator(chars: &[char], index: usize) -> bool {
    let ch = chars[index];
    if ch != '.' {
        return matches!(ch, '!' | '?' | '。' | '！' | '？' | '．' | '｡' | '؟' | '।' | '॥');
    }
    if index > 0
        && index + 1 < chars.len()
        && chars[index - 1].is_ascii_digit()
        && chars[index + 1].is_ascii_digit()
    {
        return false;
    }
    if index > 0
        && index + 2 < chars.len()
        && chars[index - 1].is_alphabetic()
        && chars[index + 1].is_alphabetic()
        && chars[index + 2] == '.'
    {
        return false;
    }
    let mut start = index;
    while start > 0 && (chars[start - 1].is_alphabetic() || chars[start - 1] == '.') {
        start -= 1;
    }
    let preceding: String = chars[start..index].iter().collect::<String>().to_lowercase();
    const DOTTED_ABBREVIATIONS: &[&str] = &["a.m", "p.m", "e.g", "i.e", "u.s", "u.k"];
    if DOTTED_ABBREVIATIONS.contains(&preceding.as_str()) {
        if preceding != "a.m" && preceding != "p.m" {
            return false;
        }
        return chars[index + 1..]
            .iter()
            .find(|ch| !ch.is_whitespace())
            .is_some_and(|ch| ch.is_ascii_uppercase());
    }
    let final_word = preceding.rsplit('.').next().unwrap_or("");
    const ABBREVIATIONS: &[&str] = &[
        "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "rev", "hon",
        "capt", "cmdr", "col", "gen", "lt", "sgt", "sen", "rep", "gov", "pres",
        "vs", "etc", "fig", "no", "dept", "est", "inc", "ltd", "co",
    ];
    if ABBREVIATIONS.contains(&final_word) {
        return false;
    }
    if final_word.chars().count() == 1
        && input_final_word_is_uppercase(chars, index)
    {
        return false;
    }
    true
}

fn input_final_word_is_uppercase(chars: &[char], index: usize) -> bool {
    index > 0 && chars[index - 1].is_ascii_uppercase()
}

fn sentence_lengths(input: &str) -> Vec<u32> {
    let mut result = Vec::new();
    let mut current = 0u32;
    let mut has_content = false;
    let chars: Vec<char> = input.chars().collect();
    for (index, &ch) in chars.iter().enumerate() {
        if !has_content && ch.is_whitespace() {
            continue;
        }
        if is_sentence_terminator(&chars, index) {
            if has_content {
                result.push(current + 1);
                current = 0;
                has_content = false;
            }
        } else {
            current += 1;
            has_content |= !ch.is_whitespace();
        }
    }
    if has_content {
        result.push(current);
    }
    result
}

fn paragraph_lengths(input: &str) -> Vec<u32> {
    let mut result = Vec::new();
    let mut current = 0u32;
    let mut has_content = false;
    for line in input.lines() {
        let line = line.trim_end_matches('\r');
        if line.trim().is_empty() {
            if has_content {
                result.push(current);
                current = 0;
                has_content = false;
            }
        } else {
            if has_content {
                current += 1;
            }
            current += line.chars().count() as u32;
            has_content = true;
        }
    }
    if has_content {
        result.push(current);
    }
    result
}

fn count_syllables(word: &str) -> u32 {
    let letters: Vec<char> = word.chars().filter(|c| c.is_alphabetic()).collect();
    if letters.is_empty() {
        return 0;
    }
    let mut groups = 0u32;
    let mut previous_vowel = false;
    for ch in &letters {
        let vowel = matches!(ch.to_ascii_lowercase(), 'a' | 'e' | 'i' | 'o' | 'u' | 'y');
        if vowel && !previous_vowel {
            groups += 1;
        }
        previous_vowel = vowel;
    }
    if letters.len() > 2
        && letters.last().is_some_and(|c| c.eq_ignore_ascii_case(&'e'))
        && groups > 1
        && !letters
            .get(letters.len() - 2)
            .is_some_and(|c| c.eq_ignore_ascii_case(&'l'))
    {
        groups -= 1;
    }
    groups.max(1)
}

fn syllable_counts(tokens: &[Token]) -> Vec<u32> {
    #[cfg(feature = "parallel")]
    {
        tokens
            .par_iter()
            .map(|token| count_syllables(&token.word))
            .collect()
    }
    #[cfg(not(feature = "parallel"))]
    {
        tokens
            .iter()
            .map(|token| count_syllables(&token.word))
            .collect()
    }
}

fn readability(tokens: &[Token], sentences: u32) -> ReadabilityScores {
    if tokens.is_empty() {
        return ReadabilityScores {
            flesch_kincaid: 0.0,
            gunning_fog: 0.0,
            smog: 0.0,
            coleman_liau: 0.0,
        };
    }
    let words = tokens.len() as f32;
    let sentences = sentences.max(1) as f32;
    let syllables = syllable_counts(tokens);
    let syllable_total = syllables.iter().sum::<u32>() as f32;
    let complex_words = syllables.iter().filter(|&&count| count >= 3).count() as f32;
    let letters = tokens
        .iter()
        .map(|t| t.word.chars().filter(|c| c.is_alphabetic()).count())
        .sum::<usize>() as f32;
    let words_per_sentence = words / sentences;
    let l = letters / words * 100.0;
    let s = sentences / words * 100.0;
    ReadabilityScores {
        flesch_kincaid: 0.39 * words_per_sentence + 11.8 * (syllable_total / words) - 15.59,
        gunning_fog: 0.4 * (words_per_sentence + 100.0 * (complex_words / words)),
        smog: 1.043 * (complex_words * (30.0 / sentences)).sqrt() + 3.1291,
        coleman_liau: 0.0588 * l - 0.296 * s - 15.8,
    }
}

fn ngrams(tokens: &[Token]) -> NgramResult {
    fn collect(tokens: &[Token], size: usize) -> HashMap<String, u32> {
        let mut frequencies = HashMap::new();
        for window in tokens.windows(size) {
            let phrase = window
                .iter()
                .map(|token| token.word.as_str())
                .collect::<Vec<_>>()
                .join(" ");
            *frequencies.entry(phrase).or_insert(0) += 1;
        }
        frequencies
    }
    NgramResult {
        unigrams: collect(tokens, 1),
        bigrams: collect(tokens, 2),
        trigrams: collect(tokens, 3),
    }
}

fn analyze_tokens(input: &str, tokens: Vec<Token>) -> AnalysisData {
    let word_count = tokens.len() as u32;
    let sentence_lengths = sentence_lengths(input);
    let paragraph_lengths = paragraph_lengths(input);
    let mut keyword_counts: HashMap<String, u32> = HashMap::new();
    let mut keyword_positions = Vec::new();

    for token in &tokens {
        if !stopwords().contains(token.word.as_str()) {
            *keyword_counts.entry(token.word.clone()).or_insert(0) += 1;
            keyword_positions.push(KeywordPosition {
                word: token.word.clone(),
                index: token.char_index,
            });
        }
    }

    let mut keyword_frequency: Vec<_> = keyword_counts
        .into_iter()
        .map(|(word, count)| KeywordEntry {
            word,
            count,
            density: if word_count == 0 {
                0.0
            } else {
                count as f32 / word_count as f32 * 100.0
            },
        })
        .collect();
    keyword_frequency.sort_unstable_by(|a, b| a.word.cmp(&b.word));
    let mut top_keywords = keyword_frequency.clone();
    top_keywords.sort_unstable_by(|a, b| b.count.cmp(&a.count).then_with(|| a.word.cmp(&b.word)));
    top_keywords.truncate(10);

    let sentence_count = sentence_lengths.len() as u32;
    let paragraph_count = paragraph_lengths.len() as u32;
    AnalysisData {
        word_count,
        char_count: input.chars().count() as u32,
        char_no_spaces: input.chars().filter(|ch| !ch.is_whitespace()).count() as u32,
        sentence_count,
        paragraph_count,
        keyword_frequency,
        top_keywords,
        readability_scores: readability(&tokens, sentence_count),
        ngram_data: ngrams(&tokens),
        visualization_data: VisualizationData {
            sentence_lengths,
            paragraph_lengths,
            keyword_positions,
        },
    }
}

fn analyze(input: &str) -> AnalysisData {
    analyze_tokens(input, tokenize(input))
}

#[wasm_bindgen]
pub fn analyze_text(input: &str) -> AnalysisResult {
    AnalysisResult {
        data: analyze(input),
    }
}

/// Analyze using the browser's locale-aware `Intl.Segmenter` word boundaries.
/// Browser indices are UTF-16 offsets, matching textarea selection APIs.
#[wasm_bindgen]
pub fn analyze_text_with_segments(input: &str, segments: JsValue) -> Result<AnalysisResult, JsValue> {
    let browser_tokens: Vec<BrowserToken> = serde_wasm_bindgen::from_value(segments)
        .map_err(|error| JsValue::from_str(&error.to_string()))?;
    let tokens = browser_tokens
        .into_iter()
        .filter(|token| !token.word.is_empty())
        .map(|token| Token {
            word: token.word.to_lowercase(),
            char_index: token.index,
        })
        .collect();
    Ok(AnalysisResult {
        data: analyze_tokens(input, tokens),
    })
}

/// Verifies that the WASM engine is running on an approved MonkeyTactics host.
#[wasm_bindgen]
pub fn verify_domain(host: String) -> bool {
    host == "monkeytactics.com"
        || host == "www.monkeytactics.com"
        || host == "monkeytactics-calculators.pages.dev"
        || host.ends_with(".monkeytactics-calculators.pages.dev")
        || host == "127.0.0.1"
        || host == "localhost"
        || host == "::1"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tokenization_tracks_unicode_character_positions() {
        let tokens = tokenize("Hello, café world!");
        assert_eq!(
            tokens.iter().map(|t| t.word.as_str()).collect::<Vec<_>>(),
            ["hello", "café", "world"]
        );
        assert_eq!(
            tokens.iter().map(|t| t.char_index).collect::<Vec<_>>(),
            [0, 7, 12]
        );
    }

    #[test]
    fn tokenization_handles_mixed_scripts_and_punctuation() {
        let tokens = tokenize("Hello—世界! café");
        assert_eq!(
            tokens.iter().map(|t| t.word.as_str()).collect::<Vec<_>>(),
            ["hello", "世", "界", "café"]
        );
    }

    #[test]
    fn tokenization_keeps_unicode_apostrophe_words_together() {
        let tokens = tokenize("don't l’amour");
        assert_eq!(
            tokens.iter().map(|t| t.word.as_str()).collect::<Vec<_>>(),
            ["don't", "l’amour"]
        );
    }

    #[test]
    fn stopword_filtering_excludes_common_words() {
        let result = analyze("The quick fox and the quick dog.");
        assert_eq!(
            result
                .keyword_frequency
                .iter()
                .map(|e| e.word.as_str())
                .collect::<Vec<_>>(),
            ["dog", "fox", "quick"]
        );
        assert_eq!(result.top_keywords[0].count, 2);
        assert!((result.top_keywords[0].density - 28.57143).abs() < 0.001);
    }

    #[test]
    fn readability_formulas_match_expected_values() {
        let tokens = tokenize("Cats run quickly. Dogs play.");
        let scores = readability(&tokens, 2);
        assert!((scores.flesch_kincaid + 0.455).abs() < 0.01);
        assert!((scores.gunning_fog - 1.0).abs() < 0.01);
        assert!((scores.smog - 3.1291).abs() < 0.01);
        assert!((scores.coleman_liau + 1.768).abs() < 0.01);
    }

    #[test]
    fn ngram_generation_counts_one_to_three_word_phrases() {
        let result = ngrams(&tokenize("red fox red fox jumps"));
        assert_eq!(result.unigrams["red"], 2);
        assert_eq!(result.bigrams["red fox"], 2);
        assert_eq!(result.trigrams["red fox red"], 1);
    }

    #[test]
    fn visualization_extracts_lengths_and_keyword_positions() {
        let result = analyze("Quick fox.\n\nQuick dog runs!");
        assert_eq!(result.visualization_data.sentence_lengths, [10, 15]);
        assert_eq!(result.visualization_data.paragraph_lengths, [10, 15]);
        assert_eq!(
            result
                .visualization_data
                .keyword_positions
                .iter()
                .map(|p| p.index)
                .collect::<Vec<_>>(),
            [0, 6, 12, 18, 22]
        );
    }

    #[test]
    fn sentence_detection_supports_common_unicode_terminators() {
        let result = analyze("床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。");
        assert_eq!(result.sentence_count, 2);
        assert_eq!(result.visualization_data.sentence_lengths, [13, 13]);

        let mixed = analyze("Really？ نعم؟ ठीक। Done!");
        assert_eq!(mixed.sentence_count, 4);
    }

    #[test]
    fn sentence_detection_does_not_split_titles_initials_or_decimals() {
        let result = analyze("Mr. Darcy met Dr. Jones at 3.14 p.m. They spoke to J. Smith.");
        assert_eq!(result.sentence_count, 2);
        assert_eq!(result.visualization_data.sentence_lengths.len(), 2);
    }

    #[test]
    fn empty_text_has_zero_counts_and_finite_scores() {
        let result = analyze("");
        assert_eq!(result.word_count, 0);
        assert_eq!(result.sentence_count, 0);
        assert_eq!(result.paragraph_count, 0);
        assert_eq!(result.readability_scores.flesch_kincaid, 0.0);
    }

    #[test]
    fn host_allowlist_is_exact() {
        assert!(verify_domain("monkeytactics.com".into()));
        assert!(verify_domain("www.monkeytactics.com".into()));
        assert!(verify_domain("monkeytactics-calculators.pages.dev".into()));
        assert!(verify_domain(
            "preview.monkeytactics-calculators.pages.dev".into()
        ));
        assert!(verify_domain("127.0.0.1".into()));
        assert!(verify_domain("localhost".into()));
        assert!(verify_domain("::1".into()));
        assert!(!verify_domain("evilmonkeytactics.com".into()));
    }
}
