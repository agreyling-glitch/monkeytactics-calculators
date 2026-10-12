use std::cell::RefCell;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const ENABLE: u8 = 1;
const EXPANDED: u8 = 2;
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
    expanded_words: Vec<String>,
    hook_maps: HashMap<(String, u8), HookInfo>,
}

#[derive(Clone)]
struct WordInfo {
    membership: u8,
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
    scoring: String,
    board_pattern: String,
}

#[derive(Debug, Default, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct PlayAnalysis {
    valid: bool,
    score: i32,
    blank_positions: Vec<usize>,
    board_positions: Vec<usize>,
    tiles_used: usize,
    leave: String,
    bingo: bool,
}

struct PlayContext<'a> {
    available: [u8; 26],
    wildcards: usize,
    board: &'a str,
    value_for: fn(u8) -> i32,
}

#[derive(Clone, Copy)]
struct PlayMetrics {
    score: i32,
    high_value_score: i32,
    tiles_used: usize,
    remaining: [u8; 26],
    remaining_wildcards: usize,
}

#[derive(Debug, Deserialize)]
struct WordleGuess {
    word: String,
    feedback: String,
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
/// where N is the Standard dictionary membership bit mask used by the static shards.
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
pub fn crossword_search(pattern: String, available_letters: String, options: JsValue) -> JsValue {
    let options: SearchOptions = match serde_wasm_bindgen::from_value(options) {
        Ok(options) => options,
        Err(error) => return JsValue::from_str(&format!("Invalid search options: {error}")),
    };
    let matches = ENGINE.with(|engine| {
        engine
            .borrow_mut()
            .find_crossword_matches(&pattern, &available_letters, &options)
    });
    serde_wasm_bindgen::to_value(&matches).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn wordle_search(guesses: JsValue, dictionary_bit: u8) -> JsValue {
    let guesses: Vec<WordleGuess> = match serde_wasm_bindgen::from_value(guesses) {
        Ok(guesses) => guesses,
        Err(error) => return JsValue::from_str(&format!("Invalid Wordle guesses: {error}")),
    };
    let matches = ENGINE.with(|engine| {
        engine
            .borrow()
            .find_wordle_matches(&guesses, dictionary_bit)
    });
    serde_wasm_bindgen::to_value(&matches).unwrap_or(JsValue::NULL)
}

#[wasm_bindgen]
pub fn score_word(word: String) -> i32 {
    score(&word)
}

#[wasm_bindgen]
pub fn score_wwf_word(word: String) -> i32 {
    wwf_score(&word)
}

#[wasm_bindgen]
pub fn is_valid_word(word: String) -> bool {
    ENGINE.with(|engine| engine.borrow().has_word(&word, ENABLE | EXPANDED))
}

/// Returns indexed source membership: 1 = ENABLE, 2 = Expanded, 3 = both.
/// Callers must load the combined shard first to resolve both sources completely.
#[wasm_bindgen]
pub fn dictionary_membership(word: String) -> u8 {
    ENGINE.with(|engine| engine.borrow().dictionary_membership(&word))
}

#[wasm_bindgen]
pub fn find_hooks(word: String) -> JsValue {
    find_hooks_for_dictionary(word, ENABLE | EXPANDED)
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
pub fn analyze_wwf_word(word: String) -> JsValue {
    serde_wasm_bindgen::to_value(&analyze_with(&word, wwf_tile_value)).unwrap_or(JsValue::NULL)
}

/// Scores one rack play before square multipliers, cross words, or bingo bonus.
/// Fixed board letters do not consume tiles; blank positions are zero-based.
#[wasm_bindgen]
pub fn analyze_play(word: String, rack: String, board_pattern: String, scoring: String) -> JsValue {
    serde_wasm_bindgen::to_value(&analyze_rack_play(&word, &rack, &board_pattern, &scoring))
        .unwrap_or(JsValue::NULL)
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
                if additions & EXPANDED != 0 {
                    self.expanded_words.push(word.to_owned());
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
            if membership & EXPANDED != 0 {
                self.expanded_words.push(word.to_owned());
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
        let rack = rack.to_ascii_lowercase();
        let board = options.board_pattern.to_ascii_lowercase();
        let Some(play_context) = PlayContext::new(&rack, &board, &options.scoring) else {
            return Vec::new();
        };
        // The signature prefilter may include board letters, but the positional
        // assignment below still requires the rack to fill each empty square.
        let (available, wildcards) = play_context.signature_pool();
        let available_length = if board.is_empty() {
            rack.len()
        } else {
            board.len()
        };
        let maximum_length = if options.word_length == 0 {
            available_length
        } else {
            options.word_length
        };
        let minimum_length = if options.word_length == 0 {
            if board.is_empty() {
                MIN_WORD_LENGTH
            } else {
                board.len()
            }
        } else {
            options.word_length
        };
        let minimum_pattern_length = pattern.bytes().filter(|byte| *byte != b'*').count();
        let variable_pattern = pattern.contains('*');

        if maximum_length > available_length
            || (!board.is_empty() && maximum_length != board.len())
            || (!pattern.is_empty()
                && options.word_length > 0
                && (options.word_length < minimum_pattern_length
                    || (!variable_pattern && pattern.len() != options.word_length)))
        {
            return Vec::new();
        }

        let mut matches = Vec::new();
        let mut play_values = HashMap::new();
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
                    let Some(play) = evaluate_play(word, &play_context, |_, _, _| {}) else {
                        continue;
                    };
                    if self.word_matches(word, info, pattern, options, play.score) {
                        matches.push(word.clone());
                        play_values.insert(word.clone(), play);
                    }
                }
            }
        }

        self.sort_matches(&mut matches, pattern, options, Some(&play_values));
        matches
    }

    fn find_crossword_matches(
        &mut self,
        pattern: &str,
        available_letters: &str,
        options: &SearchOptions,
    ) -> Vec<String> {
        let minimum_pattern_length = pattern.bytes().filter(|byte| *byte != b'*').count();
        let variable_pattern = pattern.contains('*');
        if pattern.is_empty()
            || (options.word_length > 0
                && (options.word_length < minimum_pattern_length
                    || (!variable_pattern && pattern.len() != options.word_length)))
        {
            return Vec::new();
        }

        let pool = (!available_letters.is_empty()).then(|| rack_counts(available_letters));
        let mut matches = Vec::new();
        for (word, info) in &self.metadata {
            if word.len() < minimum_pattern_length
                || (options.word_length > 0 && word.len() != options.word_length)
                || (!variable_pattern && word.len() != pattern.len())
                || pool.as_ref().is_some_and(|(letters, wildcards)| {
                    !can_build(&signature(word), letters, *wildcards)
                })
            {
                continue;
            }
            if self.word_matches(
                word,
                info,
                pattern,
                options,
                score_for(word, &options.scoring),
            ) {
                matches.push(word.clone());
            }
        }
        self.sort_matches(&mut matches, pattern, options, None);
        matches
    }

    fn find_wordle_matches(&self, guesses: &[WordleGuess], dictionary_bit: u8) -> Vec<String> {
        let dictionary_bit = normalized_dictionary_bit(dictionary_bit);
        let mut matches = self
            .metadata
            .iter()
            .filter(|(word, info)| {
                word.len() == 5
                    && info.membership & dictionary_bit != 0
                    && guesses
                        .iter()
                        .all(|guess| wordle_guess_matches(word, guess))
            })
            .map(|(word, _)| word.clone())
            .collect::<Vec<_>>();
        matches.sort();
        matches
    }

    fn word_matches(
        &self,
        word: &str,
        info: &WordInfo,
        pattern: &str,
        options: &SearchOptions,
        word_score: i32,
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
                .is_some_and(|minimum| word_score < minimum)
            || options
                .maximum_score
                .is_some_and(|maximum| word_score > maximum)
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

    fn sort_matches(
        &mut self,
        matches: &mut [String],
        pattern: &str,
        options: &SearchOptions,
        play_values: Option<&HashMap<String, PlayMetrics>>,
    ) {
        let dictionary_bit = normalized_dictionary_bit(options.dictionary_bit);
        let score = |word: &str| {
            play_values.map_or_else(
                || score_for(word, &options.scoring),
                |plays| plays[word].score,
            )
        };
        let high_value_score = |word: &str| {
            play_values.map_or_else(
                || high_value_score_for(word, &options.scoring),
                |plays| plays[word].high_value_score,
            )
        };
        let bingo =
            |word: &str| play_values.map_or(word.len() == 7, |plays| plays[word].tiles_used == 7);
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
                "bingo" => bingo(b)
                    .cmp(&bingo(a))
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

    fn dictionary_membership(&self, word: &str) -> u8 {
        self.metadata
            .get(&word.to_ascii_lowercase())
            .map_or(0, |info| info.membership)
    }

    fn board_fit(&self, rack: &str, pattern: &str, options: &SearchOptions) -> BoardFitAnalysis {
        let rack = rack.to_ascii_lowercase();
        let board = options.board_pattern.to_ascii_lowercase();
        let Some(play_context) = PlayContext::new(&rack, &board, &options.scoring) else {
            return BoardFitAnalysis {
                candidates: 0,
                fitting: 0,
                excluded: 0,
            };
        };
        let (available, wildcards) = play_context.signature_pool();
        // Count combinations before imposing the board span and positions so
        // longer words appear as excluded, just like an active length filter.
        let maximum_length = rack.len() + board.bytes().filter(u8::is_ascii_lowercase).count();
        let dictionary_bit = normalized_dictionary_bit(options.dictionary_bit);
        let mut candidates = 0;
        let mut fitting = 0;

        for length in MIN_WORD_LENGTH..=maximum_length {
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
                        && evaluate_play(word, &play_context, |_, _, _| {}).is_some()
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

impl<'a> PlayContext<'a> {
    fn new(rack: &str, board: &'a str, scoring: &str) -> Option<Self> {
        if !rack
            .bytes()
            .all(|byte| byte == b'?' || byte.is_ascii_lowercase())
            || !board
                .bytes()
                .all(|byte| byte == b'?' || byte.is_ascii_lowercase())
            || (!board.is_empty() && !board.contains('?'))
            || rack.len() > u8::MAX as usize
            || board.len() > u8::MAX as usize
        {
            return None;
        }
        let (available, wildcards) = rack_counts(rack);
        Some(Self {
            available,
            wildcards,
            board,
            value_for: if scoring == "wwf" {
                wwf_tile_value
            } else {
                tile_value
            },
        })
    }

    fn signature_pool(&self) -> ([u8; 26], usize) {
        let mut available = self.available;
        for byte in self.board.bytes().filter(u8::is_ascii_lowercase) {
            let count = &mut available[(byte - b'a') as usize];
            *count = count.saturating_add(1);
        }
        (available, self.wildcards)
    }
}

// Shared assignment logic keeps search filtering, ranking, saved picks, and tile
// rendering consistent. Search callers use a no-op visitor and allocate no lists.
fn evaluate_play(
    word: &str,
    context: &PlayContext,
    mut visit: impl FnMut(usize, bool, bool),
) -> Option<PlayMetrics> {
    if word.is_empty()
        || !word.bytes().all(|byte| byte.is_ascii_lowercase())
        || (!context.board.is_empty() && word.len() != context.board.len())
    {
        return None;
    }
    let mut result = PlayMetrics {
        score: 0,
        high_value_score: 0,
        tiles_used: 0,
        remaining: context.available,
        remaining_wildcards: context.wildcards,
    };
    for (position, letter) in word.bytes().enumerate() {
        let board_letter = context
            .board
            .as_bytes()
            .get(position)
            .copied()
            .unwrap_or(b'?');
        let on_board = board_letter != b'?';
        let mut blank = false;
        if on_board {
            if board_letter != letter {
                return None;
            }
        } else {
            result.tiles_used += 1;
            let available = &mut result.remaining[(letter - b'a') as usize];
            if *available > 0 {
                *available -= 1;
            } else if result.remaining_wildcards > 0 {
                result.remaining_wildcards -= 1;
                blank = true;
            } else {
                return None;
            }
        }
        if !blank {
            let value = (context.value_for)(letter);
            result.score += value;
            if is_high_value(letter) {
                result.high_value_score += value;
            }
        }
        visit(position, blank, on_board);
    }
    (result.tiles_used > 0).then_some(result)
}

fn analyze_rack_play(word: &str, rack: &str, board: &str, scoring: &str) -> PlayAnalysis {
    let word = word.to_ascii_lowercase();
    let rack = rack.to_ascii_lowercase();
    let board = board.to_ascii_lowercase();
    let invalid = || PlayAnalysis {
        leave: rack.clone(),
        ..Default::default()
    };
    let Some(context) = PlayContext::new(&rack, &board, scoring) else {
        return invalid();
    };
    let mut blank_positions = Vec::new();
    let mut board_positions = Vec::new();
    let Some(mut play) = evaluate_play(&word, &context, |position, blank, on_board| {
        if blank {
            blank_positions.push(position);
        }
        if on_board {
            board_positions.push(position);
        }
    }) else {
        return invalid();
    };
    let leave = rack
        .bytes()
        .filter(|letter| {
            if *letter == b'?' {
                if play.remaining_wildcards == 0 {
                    return false;
                }
                play.remaining_wildcards -= 1;
            } else {
                let count = &mut play.remaining[(*letter - b'a') as usize];
                if *count == 0 {
                    return false;
                }
                *count -= 1;
            }
            true
        })
        .map(char::from)
        .collect();
    PlayAnalysis {
        valid: true,
        score: play.score,
        blank_positions,
        board_positions,
        tiles_used: play.tiles_used,
        leave,
        bingo: play.tiles_used == 7,
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

fn wordle_guess_matches(candidate: &str, guess: &WordleGuess) -> bool {
    if guess.word.len() != 5
        || guess.feedback.len() != 5
        || !guess.word.bytes().all(|byte| byte.is_ascii_lowercase())
        || !guess
            .feedback
            .bytes()
            .all(|byte| matches!(byte, b'a' | b'p' | b'c'))
    {
        return false;
    }

    let candidate_bytes = candidate.as_bytes();
    let guess_bytes = guess.word.as_bytes();
    let feedback_bytes = guess.feedback.as_bytes();
    let mut candidate_counts = [0u8; 26];
    let mut required_counts = [0u8; 26];
    let mut has_absent = [false; 26];

    for byte in candidate_bytes {
        candidate_counts[(byte - b'a') as usize] += 1;
    }
    for index in 0..5 {
        let letter = guess_bytes[index];
        let letter_index = (letter - b'a') as usize;
        match feedback_bytes[index] {
            b'c' if candidate_bytes[index] != letter => return false,
            b'p' if candidate_bytes[index] == letter => return false,
            b'a' if candidate_bytes[index] == letter => return false,
            b'c' | b'p' => required_counts[letter_index] += 1,
            b'a' => has_absent[letter_index] = true,
            _ => return false,
        }
    }

    (0..26).all(|index| {
        candidate_counts[index] >= required_counts[index]
            && (!has_absent[index] || candidate_counts[index] == required_counts[index])
    })
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

fn wwf_score(word: &str) -> i32 {
    word.bytes().map(wwf_tile_value).sum()
}

fn score_for(word: &str, scoring: &str) -> i32 {
    if scoring == "wwf" {
        wwf_score(word)
    } else {
        score(word)
    }
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

fn wwf_tile_value(byte: u8) -> i32 {
    match byte.to_ascii_lowercase() {
        b'a' | b'e' | b'i' | b'o' | b'r' | b's' | b't' => 1,
        b'd' | b'l' | b'n' | b'u' => 2,
        b'g' | b'h' | b'y' => 3,
        b'b' | b'c' | b'f' | b'm' | b'p' | b'w' => 4,
        b'k' | b'v' => 5,
        b'x' => 8,
        b'j' | b'q' | b'z' => 10,
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

fn high_value_score_for(word: &str, scoring: &str) -> i32 {
    if scoring != "wwf" {
        return high_value_score(word);
    }
    word.bytes()
        .filter(|byte| is_high_value(*byte))
        .map(wwf_tile_value)
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
    analyze_with(word, tile_value)
}

fn analyze_with(word: &str, value_for: fn(u8) -> i32) -> WordAnalysis {
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
        *tile_distribution.entry(value_for(byte)).or_insert(0) += 1;
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
        score: word.bytes().map(value_for).sum(),
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
    fn reports_dictionary_membership_and_merges_later_sources() {
        let mut engine = engine();
        assert_eq!(engine.dictionary_membership("tea"), ENABLE);
        assert_eq!(engine.dictionary_membership("EATS"), EXPANDED);
        assert_eq!(engine.dictionary_membership("AtE"), ENABLE | EXPANDED);
        assert_eq!(engine.dictionary_membership("absent"), 0);
        assert_eq!(engine.dictionary_membership(""), 0);
        engine.index_records(vec!["tea\t3".into(), "eats\t1".into()]);
        assert_eq!(engine.dictionary_membership("TEA"), ENABLE | EXPANDED);
        assert_eq!(engine.dictionary_membership("eats"), ENABLE | EXPANDED);
        engine.index_records(vec!["tea\t1".into()]);
        assert_eq!(engine.dictionary_membership("tea"), ENABLE | EXPANDED);
    }

    #[test]
    fn searches_crossword_patterns_without_a_rack() {
        let mut engine = engine();
        let options = SearchOptions {
            dictionary_bit: ENABLE,
            sort_by: "alpha".into(),
            ..Default::default()
        };
        assert_eq!(
            engine.find_crossword_matches("???", "", &options),
            vec!["ate", "eat", "tea"]
        );
        assert_eq!(
            engine.find_crossword_matches("???", "ate", &options),
            vec!["ate", "eat", "tea"]
        );
        assert!(
            engine
                .find_crossword_matches("???", "at", &options)
                .is_empty()
        );
    }

    #[test]
    fn wordle_search_handles_positions_and_duplicate_letters() {
        let mut engine = Engine::default();
        engine.index_records(vec![
            "apple\t1".into(),
            "ample\t1".into(),
            "allee\t1".into(),
            "angle\t1".into(),
        ]);
        let guesses = vec![WordleGuess {
            word: "allee".into(),
            feedback: "cpaac".into(),
        }];
        assert_eq!(
            engine.find_wordle_matches(&guesses, ENABLE),
            vec!["ample", "angle", "apple"]
        );
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
        assert_eq!(engine.hooks("eat", EXPANDED).back, vec!["s"]);
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
    fn scores_and_sorts_with_words_with_friends_values() {
        assert_eq!(wwf_score("quiz"), 23);
        assert_eq!(wwf_score("badge"), 11);

        let mut engine = engine();
        engine.index_records(vec!["badge\t3".into(), "faced\t3".into()]);
        let options = SearchOptions {
            dictionary_bit: 3,
            sort_by: "score-desc".into(),
            scoring: "wwf".into(),
            ..Default::default()
        };
        assert_eq!(
            engine.find_matches("abcdefg", "", &options),
            vec!["faced", "badge"]
        );
    }

    #[test]
    fn rack_search_scores_and_filters_blanks_as_zero() {
        let mut engine = engine();
        engine.index_records(vec!["axe\t3".into(), "tax\t3".into()]);
        for scoring in ["", "wwf"] {
            let mut options = SearchOptions {
                dictionary_bit: ENABLE,
                sort_by: "score-desc".into(),
                scoring: scoring.into(),
                ..Default::default()
            };
            assert_eq!(
                engine.find_matches("tae?", "???", &options),
                vec!["ate", "eat", "tea", "axe", "tax"]
            );
            options.minimum_score = Some(3);
            assert_eq!(
                engine.find_matches("tae?", "???", &options),
                vec!["ate", "eat", "tea"]
            );
            options.minimum_score = None;
            options.maximum_score = Some(2);
            assert_eq!(
                engine.find_matches("tae?", "???", &options),
                vec!["axe", "tax"]
            );
        }
    }

    #[test]
    fn board_letters_are_fixed_and_do_not_consume_rack_tiles() {
        let mut engine = engine();
        engine.index_records(vec!["cat\t3".into(), "act\t3".into(), "tat\t3".into()]);
        let mut options = SearchOptions {
            board_pattern: "?a?".into(),
            scoring: "wwf".into(),
            sort_by: "alpha".into(),
            ..Default::default()
        };
        assert_eq!(engine.find_matches("ct", "", &options), vec!["cat"]);
        assert!(engine.find_matches("ct", "a*", &options).is_empty());
        assert!(engine.find_matches("c", "", &options).is_empty());
        options.minimum_score = Some(6);
        assert_eq!(engine.find_matches("ct", "c*t", &options), vec!["cat"]);
        assert!(engine.find_matches("c?", "", &options).is_empty());
        options.minimum_score = None;
        options.maximum_score = Some(5);
        assert_eq!(engine.find_matches("c?", "c*t", &options), vec!["cat"]);
        options.word_length = 2;
        assert!(engine.find_matches("ct", "", &options).is_empty());
        options.word_length = 0;
        for invalid_board in ["cat", "?a*", "?é?", "????"] {
            options.board_pattern = invalid_board.into();
            assert!(engine.find_matches("ct", "", &options).is_empty());
        }
    }

    #[test]
    fn play_analysis_tracks_blank_assignment_board_letters_and_leave() {
        assert_eq!(
            analyze_rack_play("CAT", "CA?", "", "wwf"),
            PlayAnalysis {
                valid: true,
                score: 5,
                blank_positions: vec![2],
                board_positions: vec![],
                tiles_used: 3,
                leave: "".into(),
                bingo: false,
            }
        );
        assert_eq!(
            analyze_rack_play("TAT", "t?xz", "?A?", "wwf"),
            PlayAnalysis {
                valid: true,
                score: 2,
                blank_positions: vec![2],
                board_positions: vec![1],
                tiles_used: 2,
                leave: "xz".into(),
                bingo: false,
            }
        );
        assert_eq!(
            analyze_rack_play("tat", "a?t", "t??", "wwf"),
            PlayAnalysis {
                valid: true,
                score: 3,
                blank_positions: vec![],
                board_positions: vec![0],
                tiles_used: 2,
                leave: "?".into(),
                bingo: false,
            }
        );
        assert_eq!(
            analyze_rack_play("letter", "l??eer", "", "wwf").blank_positions,
            vec![2, 3]
        );
        for (word, rack, board) in [
            ("cat", "c", "?a?"),
            ("act", "ct", "?a?"),
            ("cat", "cat", "c*t"),
        ] {
            let analysis = analyze_rack_play(word, rack, board, "wwf");
            assert!(!analysis.valid);
            assert_eq!(analysis.score, 0);
            assert_eq!(analysis.leave, rack);
            assert!(analysis.blank_positions.is_empty());
        }
    }

    #[test]
    fn bingo_depends_on_new_tiles_not_final_word_length() {
        assert!(analyze_rack_play("stainer", "stainer", "", "wwf").bingo);
        let board_bingo = analyze_rack_play("stainers", "tainers", "s???????", "wwf");
        assert!(board_bingo.bingo);
        assert_eq!(board_bingo.tiles_used, 7);
        assert_eq!(board_bingo.score, 9); // Bonus is applied by the caller.
        assert!(!analyze_rack_play("stainer", "tainer", "s??????", "wwf").bingo);
    }

    #[test]
    fn board_fit_compares_combined_letters_before_positional_and_length_constraints() {
        let mut engine = Engine::default();
        engine.index_records(
            ["at", "cat", "act", "cats", "cast"]
                .map(str::to_owned)
                .to_vec(),
        );
        let options = SearchOptions {
            board_pattern: "?a?".into(),
            ..Default::default()
        };
        assert_eq!(
            engine.board_fit("cts", "", &options),
            BoardFitAnalysis {
                candidates: 5,
                fitting: 1,
                excluded: 4,
            }
        );
        assert_eq!(
            engine.board_fit("cts", "a*", &options),
            BoardFitAnalysis {
                candidates: 5,
                fitting: 0,
                excluded: 5,
            }
        );
        // Both CAT and ACT can use C, a blank and board A in any order; only
        // CAT has the board A at its required position.
        assert_eq!(
            engine.board_fit("c?", "", &options),
            BoardFitAnalysis {
                candidates: 3,
                fitting: 1,
                excluded: 2,
            }
        );
    }

    #[test]
    fn crossword_scoring_remains_independent_of_rack_blank_values_and_board_mode() {
        let mut engine = engine();
        engine.index_records(vec!["axe\t3".into()]);
        let options = SearchOptions {
            minimum_score: Some(10),
            board_pattern: "this-field-is-unused-in-crosswords".into(),
            ..Default::default()
        };
        assert_eq!(
            engine.find_crossword_matches("???", "ae?", &options),
            vec!["axe"]
        );
        assert_eq!(
            engine.find_crossword_matches("???", "", &options),
            vec!["axe"]
        );
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
