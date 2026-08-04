use std::cell::RefCell;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const ENABLE: u8 = 1;
const SOWPODS: u8 = 2;
const MIN_WORD_LENGTH: usize = 2;

thread_local! {
    static ENGINE: RefCell<Engine> = RefCell::new(Engine::default());
}

#[derive(Default)]
struct Engine {
    signature_map: HashMap<String, Vec<String>>,
    signatures_by_length: HashMap<usize, Vec<String>>,
    metadata: HashMap<String, WordInfo>,
    enable_words: Vec<String>,
    sowpods_words: Vec<String>,
    hook_maps: HashMap<(String, u8), HookInfo>,
}

#[derive(Clone)]
struct WordInfo {
    membership: u8,
    score: i32,
    vowels: usize,
    letter_counts: [u8; 26],
}

#[derive(Debug, Default, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct HookInfo {
    front: Vec<String>,
    back: Vec<String>,
    has_s_hook: bool,
    total: usize,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct SearchOptions {
    dictionary_bit: u8,
    word_length: usize,
    starts_with: String,
    ends_with: String,
    must_include: String,
    exclude_letters: String,
    high_value_only: bool,
    minimum_vowels: usize,
    minimum_consonants: usize,
    minimum_score: Option<i32>,
    maximum_score: Option<i32>,
    hook_filter: String,
    sort_by: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WordAnalysis {
    length: usize,
    vowels: usize,
    consonants: usize,
    wildcards: usize,
    entropy: f64,
    normalized_entropy: f64,
    entropy_score: i32,
    score: i32,
    high_value_letters: String,
    tile_distribution: HashMap<i32, usize>,
    letter_distribution: HashMap<String, usize>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
struct BoardFitAnalysis {
    candidates: usize,
    fitting: usize,
    excluded: usize,
}

#[wasm_bindgen]
pub fn verify_domain(host: String) -> bool {
    host == "monkeytactics.com"
        || host == "www.monkeytactics.com"
        || host == "monkeytactics-calculators.pages.dev"
        || host.ends_with(".monkeytactics-calculators.pages.dev")
        || host == "127.0.0.1"
}

/// Adds dictionary records to the engine. Records may be `word`, or `word\tN`
/// where N is the ENABLE/SOWPODS membership bit mask used by the static shards.
#[wasm_bindgen]
pub fn init_engine(dictionary_json: JsValue) -> Result<(), JsValue> {
    let records: Vec<String> = serde_wasm_bindgen::from_value(dictionary_json)
        .map_err(|error| JsValue::from_str(&format!("Invalid dictionary data: {error}")))?;

    ENGINE.with(|engine| engine.borrow_mut().index_records(records));
    Ok(())
}

#[wasm_bindgen]
pub fn unscramble(rack: String, pattern: String, options: JsValue) -> JsValue {
    let options: SearchOptions = match serde_wasm_bindgen::from_value(options) {
        Ok(options) => options,
        Err(error) => return JsValue::from_str(&format!("Invalid search options: {error}")),
    };
    let matches = ENGINE.with(|engine| engine.borrow_mut().find_matches(&rack, &pattern, &options));
    serde_wasm_bindgen::to_value(&matches).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn score_word(word: String) -> i32 {
    score(&word)
}

#[wasm_bindgen]
pub fn find_hooks(word: String) -> JsValue {
    find_hooks_for_dictionary(word, ENABLE | SOWPODS)
}

#[wasm_bindgen]
pub fn find_hooks_for_dictionary(word: String, dictionary_bit: u8) -> JsValue {
    let hooks = ENGINE.with(|engine| engine.borrow_mut().hooks(&word, dictionary_bit));
    serde_wasm_bindgen::to_value(&hooks).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn analyze_word(word: String) -> JsValue {
    serde_wasm_bindgen::to_value(&analyze(&word)).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn board_fit_analysis(rack: String, pattern: String, options: JsValue) -> JsValue {
    let options: SearchOptions = match serde_wasm_bindgen::from_value(options) {
        Ok(options) => options,
        Err(error) => return JsValue::from_str(&format!("Invalid search options: {error}")),
    };
    let analysis = ENGINE.with(|engine| engine.borrow().board_fit(&rack, &pattern, &options));
    serde_wasm_bindgen::to_value(&analysis).unwrap_or(JsValue::NULL)
}

impl Engine {
    fn index_records(&mut self, records: Vec<String>) {
        let mut changed = false;

        for record in records {
            let (word, membership) = parse_record(&record);
            if word.len() < MIN_WORD_LENGTH || !word.bytes().all(|byte| byte.is_ascii_lowercase()) {
                continue;
            }

            if let Some(info) = self.metadata.get_mut(word) {
                let additions = membership & !info.membership;
                if additions & ENABLE != 0 {
                    self.enable_words.push(word.to_owned());
                }
                if additions & SOWPODS != 0 {
                    self.sowpods_words.push(word.to_owned());
                }
                info.membership |= membership;
                changed |= additions != 0;
                continue;
            }

            let signature = signature(word);
            let is_new_signature = !self.signature_map.contains_key(&signature);
            self.signature_map
                .entry(signature.clone())
                .or_default()
                .push(word.to_owned());
            if is_new_signature {
                self.signatures_by_length
                    .entry(word.len())
                    .or_default()
                    .push(signature);
            }
            if membership & ENABLE != 0 {
                self.enable_words.push(word.to_owned());
            }
            if membership & SOWPODS != 0 {
                self.sowpods_words.push(word.to_owned());
            }
            self.metadata
                .insert(word.to_owned(), make_word_info(word, membership));
            changed = true;
        }

        if changed {
            self.hook_maps.clear();
        }
    }

    fn find_matches(&mut self, rack: &str, pattern: &str, options: &SearchOptions) -> Vec<String> {
        let (available, wildcards) = rack_counts(rack);
        let maximum_length = if options.word_length == 0 {
            rack.len()
        } else {
            options.word_length
        };
        let minimum_length = if options.word_length == 0 {
            MIN_WORD_LENGTH
        } else {
            options.word_length
        };
        let minimum_pattern_length = pattern.bytes().filter(|byte| *byte != b'*').count();
        let variable_pattern = pattern.contains('*');

        if maximum_length > rack.len()
            || (!pattern.is_empty()
                && options.word_length > 0
                && (options.word_length < minimum_pattern_length
                    || (!variable_pattern && pattern.len() != options.word_length)))
        {
            return Vec::new();
        }

        let mut matches = Vec::new();
        for length in (minimum_length..=maximum_length).rev() {
            if !pattern.is_empty()
                && (length < minimum_pattern_length
                    || (!variable_pattern && pattern.len() != length))
            {
                continue;
            }

            for signature in self.signatures_by_length.get(&length).into_iter().flatten() {
                if !can_build(signature, &available, wildcards) {
                    continue;
                }
                for word in &self.signature_map[signature] {
                    let info = &self.metadata[word];
                    if self.word_matches(word, info, pattern, options) {
                        matches.push(word.clone());
                    }
                }
            }
        }

        self.sort_matches(&mut matches, pattern, options);
        matches
    }

    fn word_matches(
        &self,
        word: &str,
        info: &WordInfo,
        pattern: &str,
        options: &SearchOptions,
    ) -> bool {
        let dictionary_bit = normalized_dictionary_bit(options.dictionary_bit);
        if info.membership & dictionary_bit == 0
            || (!pattern.is_empty() && !glob_matches(word.as_bytes(), pattern.as_bytes()))
            || (!options.starts_with.is_empty() && !word.starts_with(&options.starts_with))
            || (!options.ends_with.is_empty() && !word.ends_with(&options.ends_with))
            || options
                .exclude_letters
                .bytes()
                .any(|letter| word.as_bytes().contains(&letter))
            || (options.high_value_only && !word.bytes().any(is_high_value))
            || info.vowels < options.minimum_vowels
            || word.len() - info.vowels < options.minimum_consonants
            || options
                .minimum_score
                .is_some_and(|minimum| info.score < minimum)
            || options
                .maximum_score
                .is_some_and(|maximum| info.score > maximum)
            || !contains_required(&info.letter_counts, &options.must_include)
        {
            return false;
        }

        if options.hook_filter.is_empty() {
            return true;
        }
        let hooks = self.compute_hooks(word, dictionary_bit);
        match options.hook_filter.as_str() {
            "none" => hooks.total == 0,
            "any" => hooks.total > 0,
            "s" => hooks.has_s_hook,
            "front" => !hooks.front.is_empty(),
            "back" => !hooks.back.is_empty(),
            "multiple" => hooks.total > 1,
            _ => true,
        }
    }

    fn sort_matches(&mut self, matches: &mut [String], pattern: &str, options: &SearchOptions) {
        let dictionary_bit = normalized_dictionary_bit(options.dictionary_bit);
        let mut hook_sort_values = HashMap::new();
        if options.sort_by.starts_with("hooks-") {
            for word in matches.iter() {
                hook_sort_values.insert(word.clone(), self.hooks(word, dictionary_bit));
            }
        }
        matches.sort_by(|a, b| {
            let longest = || b.len().cmp(&a.len()).then_with(|| a.cmp(b));
            match options.sort_by.as_str() {
                "score-desc" => score(b).cmp(&score(a)).then_with(longest),
                "alpha" => a.cmp(b),
                "length-asc" => a.len().cmp(&b.len()).then_with(|| a.cmp(b)),
                "high-value" => high_value_score(b)
                    .cmp(&high_value_score(a))
                    .then_with(|| score(b).cmp(&score(a)))
                    .then_with(longest),
                "bingo" => (b.len() == 7)
                    .cmp(&(a.len() == 7))
                    .then_with(|| score(b).cmp(&score(a)))
                    .then_with(longest),
                "hooks-total" => hook_sort_values[b]
                    .total
                    .cmp(&hook_sort_values[a].total)
                    .then_with(longest),
                "hooks-s" => hook_sort_values[b]
                    .has_s_hook
                    .cmp(&hook_sort_values[a].has_s_hook)
                    .then_with(longest),
                "hooks-front" => hook_sort_values[b]
                    .front
                    .len()
                    .cmp(&hook_sort_values[a].front.len())
                    .then_with(longest),
                "hooks-back" => hook_sort_values[b]
                    .back
                    .len()
                    .cmp(&hook_sort_values[a].back.len())
                    .then_with(longest),
                "pattern-strength" => pattern_strength(b, pattern)
                    .total_cmp(&pattern_strength(a, pattern))
                    .then_with(longest),
                _ => longest(),
            }
        });
    }

    fn hooks(&mut self, word: &str, dictionary_bit: u8) -> HookInfo {
        let dictionary_bit = normalized_dictionary_bit(dictionary_bit);
        let key = (word.to_owned(), dictionary_bit);
        if let Some(hooks) = self.hook_maps.get(&key) {
            return hooks.clone();
        }
        let hooks = self.compute_hooks(word, dictionary_bit);
        self.hook_maps.insert(key, hooks.clone());
        hooks
    }

    fn compute_hooks(&self, word: &str, dictionary_bit: u8) -> HookInfo {
        let mut hooks = HookInfo::default();
        for letter in b'a'..=b'z' {
            let character = letter as char;
            let front_word = format!("{character}{word}");
            let back_word = format!("{word}{character}");
            if self.has_word(&front_word, dictionary_bit) {
                hooks.front.push(character.to_string());
            }
            if self.has_word(&back_word, dictionary_bit) {
                hooks.back.push(character.to_string());
            }
        }
        hooks.has_s_hook = hooks.back.iter().any(|letter| letter == "s");
        hooks.total = hooks.front.len() + hooks.back.len();
        hooks
    }

    fn has_word(&self, word: &str, dictionary_bit: u8) -> bool {
        self.metadata
            .get(word)
            .is_some_and(|info| info.membership & dictionary_bit != 0)
    }

    fn board_fit(&self, rack: &str, pattern: &str, options: &SearchOptions) -> BoardFitAnalysis {
        let (available, wildcards) = rack_counts(rack);
        let dictionary_bit = normalized_dictionary_bit(options.dictionary_bit);
        let mut candidates = 0;
        let mut fitting = 0;

        for length in MIN_WORD_LENGTH..=rack.len() {
            for signature in self.signatures_by_length.get(&length).into_iter().flatten() {
                if !can_build(signature, &available, wildcards) {
                    continue;
                }
                for word in &self.signature_map[signature] {
                    if self.metadata[word].membership & dictionary_bit == 0 {
                        continue;
                    }
                    candidates += 1;
                    if (options.word_length == 0 || word.len() == options.word_length)
                        && (pattern.is_empty() || glob_matches(word.as_bytes(), pattern.as_bytes()))
                        && (options.starts_with.is_empty()
                            || word.starts_with(&options.starts_with))
                        && (options.ends_with.is_empty() || word.ends_with(&options.ends_with))
                    {
                        fitting += 1;
                    }
                }
            }
        }
        BoardFitAnalysis {
            candidates,
            fitting,
            excluded: candidates - fitting,
        }
    }
}

fn parse_record(record: &str) -> (&str, u8) {
    let (word, membership) = record.split_once('\t').unwrap_or((record, "3"));
    let membership = membership
        .parse::<u8>()
        .ok()
        .filter(|value| (1..=3).contains(value))
        .unwrap_or(3);
    (word, membership)
}

fn normalized_dictionary_bit(value: u8) -> u8 {
    if (1..=3).contains(&value) {
        value
    } else {
        ENABLE
    }
}

fn signature(word: &str) -> String {
    let mut bytes = word.as_bytes().to_vec();
    bytes.sort_unstable();
    String::from_utf8(bytes).expect("validated ASCII word")
}

fn make_word_info(word: &str, membership: u8) -> WordInfo {
    let mut letter_counts = [0; 26];
    for byte in word.bytes() {
        letter_counts[(byte - b'a') as usize] += 1;
    }
    WordInfo {
        membership,
        score: score(word),
        vowels: word.bytes().filter(|byte| is_vowel(*byte)).count(),
        letter_counts,
    }
}

fn rack_counts(rack: &str) -> ([u8; 26], usize) {
    let mut counts = [0; 26];
    let mut wildcards = 0;
    for byte in rack.bytes() {
        if byte == b'?' {
            wildcards += 1;
        } else if byte.is_ascii_lowercase() {
            counts[(byte - b'a') as usize] += 1;
        }
    }
    (counts, wildcards)
}

fn can_build(signature: &str, available: &[u8; 26], wildcards: usize) -> bool {
    let mut required = [0; 26];
    let mut missing = 0;
    for byte in signature.bytes() {
        let index = (byte - b'a') as usize;
        required[index] += 1;
        if required[index] > available[index] {
            missing += 1;
            if missing > wildcards {
                return false;
            }
        }
    }
    true
}

fn contains_required(counts: &[u8; 26], required: &str) -> bool {
    let mut remaining = *counts;
    for byte in required.bytes() {
        if !byte.is_ascii_lowercase() {
            return false;
        }
        let count = &mut remaining[(byte - b'a') as usize];
        if *count == 0 {
            return false;
        }
        *count -= 1;
    }
    true
}

fn glob_matches(word: &[u8], pattern: &[u8]) -> bool {
    let mut word_index = 0;
    let mut pattern_index = 0;
    let mut star_index = None;
    let mut star_word_index = 0;

    while word_index < word.len() {
        if pattern_index < pattern.len()
            && (pattern[pattern_index] == b'?' || pattern[pattern_index] == word[word_index])
        {
            word_index += 1;
            pattern_index += 1;
        } else if pattern_index < pattern.len() && pattern[pattern_index] == b'*' {
            star_index = Some(pattern_index);
            pattern_index += 1;
            star_word_index = word_index;
        } else if let Some(star) = star_index {
            star_word_index += 1;
            word_index = star_word_index;
            pattern_index = star + 1;
        } else {
            return false;
        }
    }
    while pattern_index < pattern.len() && pattern[pattern_index] == b'*' {
        pattern_index += 1;
    }
    pattern_index == pattern.len()
}

fn score(word: &str) -> i32 {
    word.bytes().map(tile_value).sum()
}

fn tile_value(byte: u8) -> i32 {
    match byte.to_ascii_lowercase() {
        b'a' | b'e' | b'i' | b'l' | b'n' | b'o' | b'r' | b's' | b't' | b'u' => 1,
        b'd' | b'g' => 2,
        b'b' | b'c' | b'm' | b'p' => 3,
        b'f' | b'h' | b'v' | b'w' | b'y' => 4,
        b'k' => 5,
        b'j' | b'x' => 8,
        b'q' | b'z' => 10,
        _ => 0,
    }
}

fn is_vowel(byte: u8) -> bool {
    matches!(byte, b'a' | b'e' | b'i' | b'o' | b'u')
}

fn is_high_value(byte: u8) -> bool {
    matches!(byte, b'j' | b'q' | b'x' | b'z')
}

fn high_value_score(word: &str) -> i32 {
    word.bytes()
        .filter(|byte| is_high_value(*byte))
        .map(tile_value)
        .sum()
}

fn pattern_strength(word: &str, pattern: &str) -> f64 {
    if pattern.is_empty() || word.is_empty() {
        return 0.0;
    }
    pattern
        .bytes()
        .filter(|byte| !matches!(byte, b'?' | b'*'))
        .count() as f64
        / word.len() as f64
}

fn analyze(word: &str) -> WordAnalysis {
    let mut letter_distribution = HashMap::new();
    let mut tile_distribution = HashMap::new();
    let mut wildcards = 0;
    let mut vowels = 0;
    for byte in word.bytes() {
        if byte == b'?' {
            wildcards += 1;
        } else if is_vowel(byte.to_ascii_lowercase()) {
            vowels += 1;
        }
        *letter_distribution
            .entry((byte as char).to_string())
            .or_insert(0) += 1;
        *tile_distribution.entry(tile_value(byte)).or_insert(0) += 1;
    }
    let length = word.len();
    let entropy = if length == 0 {
        0.0
    } else {
        letter_distribution.values().fold(0.0, |sum, count| {
            let probability = *count as f64 / length as f64;
            sum - probability * probability.log2()
        })
    };
    let maximum_entropy = if length > 1 {
        (usize::min(26, length) as f64).log2()
    } else {
        1.0
    };
    let normalized_entropy = (entropy / maximum_entropy).clamp(0.0, 1.0);
    let entropy_score = ((normalized_entropy * 100.0) + if wildcards > 0 { 8.0 } else { 0.0 })
        .clamp(0.0, 100.0)
        .round() as i32;
    WordAnalysis {
        length,
        vowels,
        consonants: length.saturating_sub(vowels + wildcards),
        wildcards,
        entropy,
        normalized_entropy,
        entropy_score,
        score: score(word),
        high_value_letters: (b'a'..=b'z')
            .filter(|byte| is_high_value(*byte) && word.as_bytes().contains(byte))
            .map(char::from)
            .collect(),
        tile_distribution,
        letter_distribution,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn engine() -> Engine {
        let mut engine = Engine::default();
        engine.index_records(
            ["ate\t3", "eat\t3", "tea\t1", "at\t3", "ate\t3", "eats\t2"]
                .into_iter()
                .map(str::to_owned)
                .collect(),
        );
        engine
    }

    #[test]
    fn searches_with_wildcards_patterns_and_membership() {
        let mut engine = engine();
        let options = SearchOptions {
            dictionary_bit: ENABLE,
            sort_by: "alpha".into(),
            ..Default::default()
        };
        assert_eq!(engine.find_matches("a?e", "?a*", &options), vec!["eat"]);
    }

    #[test]
    fn filters_and_sorts_by_score() {
        let mut engine = engine();
        engine.index_records(vec!["axe\t3".into(), "tax\t3".into()]);
        let options = SearchOptions {
            dictionary_bit: 3,
            minimum_score: Some(5),
            sort_by: "score-desc".into(),
            ..Default::default()
        };
        assert_eq!(
            engine.find_matches("atex", "", &options),
            vec!["axe", "tax"]
        );
    }

    #[test]
    fn detects_dictionary_specific_hooks() {
        let mut engine = engine();
        assert_eq!(engine.hooks("eat", ENABLE).back, Vec::<String>::new());
        assert_eq!(engine.hooks("eat", SOWPODS).back, vec!["s"]);
    }

    #[test]
    fn analyzes_words_and_scores_tiles() {
        let analysis = analyze("quiz?");
        assert_eq!(score("quiz"), 22);
        assert_eq!(
            (analysis.vowels, analysis.consonants, analysis.wildcards),
            (2, 2, 1)
        );
        assert!(analysis.entropy_score > 90);
    }

    #[test]
    fn supports_glob_patterns() {
        assert!(glob_matches(b"crane", b"c*?e"));
        assert!(!glob_matches(b"crane", b"c??t*"));
    }

    #[test]
    fn allows_production_cloudflare_and_local_wrangler_hosts() {
        assert!(verify_domain("monkeytactics.com".into()));
        assert!(verify_domain("www.monkeytactics.com".into()));
        assert!(verify_domain("monkeytactics-calculators.pages.dev".into()));
        assert!(verify_domain(
            "preview.monkeytactics-calculators.pages.dev".into()
        ));
        assert!(verify_domain("127.0.0.1".into()));
        assert!(!verify_domain("localhost".into()));
        assert!(!verify_domain(
            "evilmonkeytactics-calculators.pages.dev".into()
        ));
    }
}
