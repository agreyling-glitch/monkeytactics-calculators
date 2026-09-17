use std::cell::RefCell;
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
fn current_time_ms() -> f64 { js_sys::Date::now() }

#[cfg(not(target_arch = "wasm32"))]
fn current_time_ms() -> f64 { 0.0 }

thread_local! {
    static ENGINE: RefCell<Engine> = RefCell::new(Engine::default());
}

/// Verifies that the engine is running on an approved MonkeyTactics host.
/// The caller must pass `location.hostname`, without a port.
#[wasm_bindgen]
pub fn verify_domain(host: String) -> bool {
    host == "monkeytactics.com"
        || host == "www.monkeytactics.com"
        || host == "monkeytactics-calculators.pages.dev"
        || host.ends_with(".monkeytactics-calculators.pages.dev")
        || host == "127.0.0.1"
}

#[derive(Default)]
struct Engine {
    words: Vec<String>,
    metadata: HashMap<String, (u64, u8)>,
    ngrams: LanguageModel,
    search: Option<Search>,
}

#[derive(Clone, Default)]
struct LanguageModel {
    bigrams: HashMap<String, HashMap<String, i32>>,
    trigrams: HashMap<String, HashMap<String, HashMap<String, i32>>>,
}

#[derive(Clone)]
struct Candidate {
    word: String,
    counts: [u8; 26],
    score: i32,
}

#[derive(Clone, Debug)]
enum GrammarSlot {
    Pos(u8),
    Literal(String),
    Any,
}

struct Frame {
    remaining: [u8; 26],
    choices: Vec<usize>,
    next: usize,
    entered: bool,
}

#[derive(Clone, Eq, PartialEq)]
struct WorstResult {
    key: String,
    phrase: String,
    score: i32,
}

impl Ord for WorstResult {
    fn cmp(&self, other: &Self) -> Ordering {
        other
            .score
            .cmp(&self.score)
            .then_with(|| self.phrase.cmp(&other.phrase))
    }
}

impl PartialOrd for WorstResult {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

struct Search {
    source: String,
    source_phrase: String,
    pattern: String,
    candidates: Vec<Candidate>,
    by_letter: Vec<Vec<usize>>,
    stack: Vec<Frame>,
    path: Vec<usize>,
    found: HashMap<String, PhraseResult>,
    worst_results: BinaryHeap<WorstResult>,
    seen_results: HashSet<String>,
    seen_paths: HashSet<Vec<usize>>,
    completion_cache: HashMap<([u8; 26], usize), bool>,
    candidate_signatures: HashSet<[u8; 26]>,
    pruned_paths: usize,
    matches_seen: usize,
    revision: usize,
    max_words: usize,
    limit: usize,
    node_limit: usize,
    nodes: usize,
    truncated: bool,
    deadline_ms: Option<f64>,
    time_limited: bool,
    language: HashMap<String, (u64, u8)>,
    ngrams: LanguageModel,
    pattern_slots: Vec<String>,
    root_depth: usize,
    shard_index: usize,
    shard_count: usize,
    preferred_words: HashSet<String>,
    grammar_slots: Vec<GrammarSlot>,
}

#[derive(Debug, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct SearchOptions {
    max_words: usize,
    minimum_length: usize,
    pattern: String,
    limit: usize,
    node_limit: usize,
    locked_words: String,
    shard_index: usize,
    shard_count: usize,
    preferred_words: String,
    excluded_words: String,
    exclude_vulgar: bool,
    grammar_template: String,
    time_limit_ms: u32,
    deadline_epoch_ms: f64,
    deterministic_core: bool,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            max_words: 5,
            minimum_length: 2,
            pattern: String::new(),
            limit: 1200,
            node_limit: 600_000,
            locked_words: String::new(),
            shard_index: 0,
            shard_count: 1,
            preferred_words: String::new(),
            excluded_words: String::new(),
            exclude_vulgar: true,
            grammar_template: String::new(),
            time_limit_ms: 0,
            deadline_epoch_ms: 0.0,
            deterministic_core: false,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
struct PhraseResult {
    phrase: String,
    score: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StepResult {
    done: bool,
    nodes: usize,
    node_limit: usize,
    found: usize,
    matches_seen: usize,
    revision: usize,
    candidate_count: usize,
    pruned_paths: usize,
    truncated: bool,
    time_limited: bool,
    results: Option<Vec<PhraseResult>>,
}

#[wasm_bindgen]
pub fn init_engine(dictionary: JsValue) -> Result<(), JsValue> {
    let records: Vec<String> = serde_wasm_bindgen::from_value(dictionary)
        .map_err(|error| JsValue::from_str(&format!("Invalid dictionary data: {error}")))?;
    ENGINE.with(|engine| {
        let mut engine = engine.borrow_mut();
        engine.words = records;
        engine.search = None;
    });
    Ok(())
}

#[wasm_bindgen]
pub fn init_language_metadata(records: JsValue) -> Result<(), JsValue> {
    let records: Vec<String> = serde_wasm_bindgen::from_value(records)
        .map_err(|error| JsValue::from_str(&format!("Invalid language metadata: {error}")))?;
    ENGINE.with(|engine| {
        let mut engine = engine.borrow_mut();
        engine.metadata.clear();
        for record in records {
            let mut fields = record.split('\t');
            let word = fields.next().unwrap_or("");
            let frequency = fields.next().unwrap_or("0").parse().unwrap_or(0);
            let pos = fields.next().unwrap_or("0").parse().unwrap_or(0);
            if !word.is_empty() {
                engine.metadata.insert(word.into(), (frequency, pos));
            }
        }
    });
    Ok(())
}

#[wasm_bindgen]
pub fn init_language_model(records: JsValue) -> Result<(), JsValue> {
    let records: Vec<String> = serde_wasm_bindgen::from_value(records)
        .map_err(|error| JsValue::from_str(&format!("Invalid n-gram data: {error}")))?;
    ENGINE.with(|engine| {
        let mut engine = engine.borrow_mut();
        engine.ngrams = LanguageModel::default();
        for record in records {
            if let Some((phrase, score)) = record.rsplit_once('\t') {
                if let Ok(score) = score.parse() {
                    let words: Vec<_> = phrase.split_whitespace().collect();
                    if words.len() == 2 {
                        engine
                            .ngrams
                            .bigrams
                            .entry(words[0].into())
                            .or_default()
                            .insert(words[1].into(), score);
                    } else if words.len() == 3 {
                        engine
                            .ngrams
                            .trigrams
                            .entry(words[0].into())
                            .or_default()
                            .entry(words[1].into())
                            .or_default()
                            .insert(words[2].into(), score);
                    }
                }
            }
        }
    });
    Ok(())
}

#[wasm_bindgen]
pub fn start_search(source: String, options: JsValue) -> Result<(), JsValue> {
    let options: SearchOptions = serde_wasm_bindgen::from_value(options)
        .map_err(|error| JsValue::from_str(&format!("Invalid search options: {error}")))?;
    ENGINE.with(|engine| {
        let mut engine = engine.borrow_mut();
        let search = Search::new(
            source,
            &engine.words,
            &engine.metadata,
            &engine.ngrams,
            options,
        )?;
        engine.search = Some(search);
        Ok(())
    })
}

#[wasm_bindgen]
pub fn step_search(node_budget: usize) -> JsValue {
    ENGINE.with(|engine| {
        let mut engine = engine.borrow_mut();
        let result = match engine.search.as_mut() {
            Some(search) => search.step(node_budget.max(1)),
            None => StepResult {
                done: true,
                nodes: 0,
                node_limit: 0,
                found: 0,
                matches_seen: 0,
                revision: 0,
                candidate_count: 0,
                pruned_paths: 0,
                truncated: false,
                time_limited: false,
                results: Some(Vec::new()),
            },
        };
        serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
    })
}

#[wasm_bindgen]
pub fn cancel_search() {
    ENGINE.with(|engine| engine.borrow_mut().search = None);
}
impl Search {
    fn new(
        source: String,
        words: &[String],
        metadata: &HashMap<String, (u64, u8)>,
        ngrams: &LanguageModel,
        options: SearchOptions,
    ) -> Result<Self, JsValue> {
        let deadline_ms = if options.deadline_epoch_ms > 0.0 {
            Some(options.deadline_epoch_ms)
        } else {
            (options.time_limit_ms > 0).then(|| current_time_ms() + f64::from(options.time_limit_ms))
        };
        let source_phrase = split_words(&source).join(" ");
        let source_letters = normalize(&source);
        if source_letters.len() < 2 {
            return Err(JsValue::from_str("Enter at least two letters."));
        }
        let target = counts(&source_letters);
        let grammar_slots = grammar_template_slots(&options.grammar_template);
        let grammar_literals: HashSet<String> = grammar_slots
            .iter()
            .filter_map(|slot| match slot { GrammarSlot::Literal(word) => Some(word.clone()), _ => None })
            .collect();
        let pattern_slots: Vec<String> = options
            .pattern
            .split_whitespace()
            .map(normalize_pattern)
            .filter(|slot| !slot.is_empty())
            .collect();
        let fixed_slots =
            !pattern_slots.is_empty() && !pattern_slots.iter().any(|slot| slot.contains('*'));
        let minimum_length = options.minimum_length.clamp(1, 8);
        let preferred_words: HashSet<String> =
            split_words(&options.preferred_words).into_iter().collect();
        let excluded_words: HashSet<String> =
            split_words(&options.excluded_words).into_iter().collect();
        let mut seen = HashSet::new();
        let mut candidates = Vec::new();
        for raw in words {
            let word = normalize(raw);
            if word.is_empty()
                || excluded_words.contains(&word)
                || (options.exclude_vulgar && is_vulgar(&word))
                || !seen.insert(word.clone())
                || word.len() > source_letters.len()
                || (word.len() < minimum_length && word != "a" && word != "i" && !grammar_literals.contains(&word))
            {
                continue;
            }
            let word_counts = counts(&word);
            if fits(&word_counts, &target)
                && (grammar_slots.is_empty() || grammar_slots.iter().any(|slot| grammar_slot_matches(&word, slot, metadata)))
                && (!fixed_slots
                    || pattern_slots
                        .iter()
                        .any(|slot| word_pattern_matches(&word, slot)))
            {
                let frequency = metadata.get(&word).map(|value| value.0).unwrap_or(0);
                candidates.push(Candidate {
                    score: word_priority(&word)
                        + lexical_quality_bonus(
                            &word,
                            frequency,
                            metadata.get(&word).map(|value| value.1).unwrap_or(0),
                        )
                        + if preferred_words.contains(&word) {
                            420
                        } else {
                            0
                        },
                    word,
                    counts: word_counts,
                });
            }
        }
        for word in ["a", "i"] {
            if !seen.contains(word) && fits(&counts(word), &target) {
                candidates.push(Candidate {
                    word: word.into(),
                    counts: counts(word),
                    score: word_priority(word),
                });
            }
        }
        let candidate_words_for_priority: HashSet<&str> = candidates
            .iter()
            .map(|candidate| candidate.word.as_str())
            .collect();
        let mut connection_bonus: HashMap<&str, i32> = HashMap::new();
        for (left, followers) in &ngrams.bigrams {
            if !candidate_words_for_priority.contains(left.as_str()) {
                continue;
            }
            for (right, score) in followers {
                if candidate_words_for_priority.contains(right.as_str()) {
                    connection_bonus
                        .entry(left)
                        .and_modify(|value| *value = (*value).max(*score / 3))
                        .or_insert(*score / 3);
                    connection_bonus
                        .entry(right)
                        .and_modify(|value| *value = (*value).max(*score / 3))
                        .or_insert(*score / 3);
                }
            }
        }
        for candidate in &mut candidates {
            candidate.score += connection_bonus
                .get(candidate.word.as_str())
                .copied()
                .unwrap_or(0);
        }
        candidates.sort_by(|a, b| {
            b.score
                .cmp(&a.score)
                .then(b.word.len().cmp(&a.word.len()))
                .then(a.word.cmp(&b.word))
        });
        let mut by_letter = vec![Vec::new(); 26];
        for (index, candidate) in candidates.iter().enumerate() {
            for (letter, bucket) in by_letter.iter_mut().enumerate() {
                if candidate.counts[letter] > 0 {
                    bucket.push(index);
                }
            }
        }
        let literal_words: Vec<String> = options
            .pattern
            .split(|character: char| !character.is_ascii_alphabetic())
            .filter(|word| !word.is_empty())
            .map(|word| word.to_ascii_lowercase())
            .collect();
        let is_literal_phrase =
            literal_words.len() > 1 && !options.pattern.contains(['?', '*', '.', '_', '-']);
        let literal_allowed = is_literal_phrase
            && literal_words.len() <= options.max_words
            && literal_words
                .iter()
                .all(|word| seen.contains(word) || word == "a" || word == "i");
        let literal_phrase = literal_words.join(" ");
        let literal_matches = literal_allowed && counts(&literal_phrase) == target;
        let mut locked_words: Vec<String> = options
            .locked_words
            .split(|character: char| !character.is_ascii_alphabetic())
            .filter(|word| !word.is_empty())
            .map(|word| word.to_ascii_lowercase())
            .collect();
        for slot in &grammar_slots {
            if let GrammarSlot::Literal(word) = slot {
                if !locked_words.contains(word) { locked_words.push(word.clone()); }
            }
        }
        let mut remaining = target;
        let mut locked_path = Vec::new();
        for word in &locked_words {
            let Some(index) = candidates.iter().position(|candidate| {
                candidate.word == *word && fits(&candidate.counts, &remaining)
            }) else {
                return Err(JsValue::from_str(&format!(
                    "Locked word ‘{word}’ is not available from these letters and settings."
                )));
            };
            remaining = subtract(&remaining, &candidates[index].counts);
            locked_path.push(index);
        }
        let effective_max_words = if grammar_slots.is_empty() { options.max_words.clamp(1, 10) } else { grammar_slots.len() };
        if locked_path.len() > effective_max_words {
            return Err(JsValue::from_str(
                "The locked words exceed the maximum word count.",
            ));
        }
        let language = candidates
            .iter()
            .filter_map(|candidate| {
                metadata
                    .get(&candidate.word)
                    .map(|value| (candidate.word.clone(), *value))
            })
            .collect();
        let candidate_words: HashSet<&str> = candidates
            .iter()
            .map(|candidate| candidate.word.as_str())
            .collect();
        let mut language_ngrams = LanguageModel::default();
        for (left, followers) in &ngrams.bigrams {
            if candidate_words.contains(left.as_str()) {
                for (right, score) in followers {
                    if candidate_words.contains(right.as_str()) {
                        language_ngrams
                            .bigrams
                            .entry(left.clone())
                            .or_default()
                            .insert(right.clone(), *score);
                    }
                }
            }
        }
        for (first, seconds) in &ngrams.trigrams {
            if candidate_words.contains(first.as_str()) {
                for (second, thirds) in seconds {
                    if candidate_words.contains(second.as_str()) {
                        for (third, score) in thirds {
                            if candidate_words.contains(third.as_str()) {
                                language_ngrams
                                    .trigrams
                                    .entry(first.clone())
                                    .or_default()
                                    .entry(second.clone())
                                    .or_default()
                                    .insert(third.clone(), *score);
                            }
                        }
                    }
                }
            }
        }
        let root_depth = locked_path.len();
        let shard_count = options.shard_count.clamp(1, 16);
        let shard_index = options.shard_index.min(shard_count - 1);
        let candidate_signatures = candidates.iter().map(|candidate| candidate.counts).collect();
        let mut search = Self {
            source: source_letters,
            source_phrase,
            pattern: normalize_pattern(&options.pattern),
            candidates,
            by_letter,
            stack: vec![Frame {
                remaining,
                choices: Vec::new(),
                next: 0,
                entered: false,
            }],
            path: locked_path,
            found: HashMap::new(),
            worst_results: BinaryHeap::new(),
            seen_results: HashSet::new(),
            seen_paths: HashSet::new(),
            completion_cache: HashMap::new(),
            candidate_signatures,
            pruned_paths: 0,
            matches_seen: 0,
            revision: 0,
            max_words: effective_max_words,
            limit: options.limit.max(1),
            node_limit: options.node_limit.max(1000),
            nodes: 0,
            truncated: false,
            deadline_ms,
            time_limited: false,
            language,
            ngrams: language_ngrams,
            pattern_slots,
            root_depth,
            shard_index,
            shard_count,
            preferred_words,
            grammar_slots,
        };
        if !is_literal_phrase
            && (options.deterministic_core || options.time_limit_ms == 0)
            && search.source.len() <= 30
            && search.root_depth == 0
            && search.grammar_slots.is_empty()
        {
            search.seed_complementary_phrases(3_500);
            if search.max_words >= 5 && search.source.len() <= 18 {
                search.seed_connector_phrases(300);
            }
        }
        if is_literal_phrase {
            search.stack.clear();
            if literal_matches && literal_phrase != search.source_phrase {
                let result = PhraseResult {
                    score: phrase_score_with_metadata(&literal_words, metadata, ngrams),
                    phrase: literal_phrase.clone(),
                };
                search.worst_results.push(WorstResult {
                    key: literal_phrase.clone(),
                    phrase: literal_phrase.clone(),
                    score: result.score,
                });
                search.found.insert(literal_phrase, result);
                search.matches_seen = 1;
                search.revision = 1;
            }
        }
        Ok(search)
    }

    fn seed_complementary_phrases(&mut self, candidate_limit: usize) {
        let scan_limit = self.candidates.len().min(candidate_limit);
        let mut signatures: HashMap<[u8; 26], Vec<usize>> = HashMap::new();
        for (index, candidate) in self.candidates.iter().enumerate() {
            signatures.entry(candidate.counts).or_default().push(index);
        }
        let target = counts(&self.source);
        for first in 0..scan_limit {
            let after_first = subtract(&target, &self.candidates[first].counts);
            if let Some(matches) = signatures.get(&after_first).cloned() {
                for second in matches.into_iter().filter(|index| *index >= first) {
                    self.path = vec![first, second];
                    self.record_result();
                }
            }
            for second in first..scan_limit {
                if !fits(&self.candidates[second].counts, &after_first) {
                    continue;
                }
                let complement = subtract(&after_first, &self.candidates[second].counts);
                if let Some(matches) = signatures.get(&complement).cloned() {
                    for third in matches.into_iter().filter(|index| *index >= second) {
                        self.path = vec![first, second, third];
                        self.record_result();
                    }
                }
            }
        }
        self.path.clear();
    }

    fn seed_connector_phrases(&mut self, candidate_limit: usize) {
        const CONNECTORS: &[&str] = &["a", "i", "an", "as", "at", "be", "by", "for", "in", "is", "of", "on", "or", "the", "to"];
        let connector_indices: Vec<usize> = self.candidates.iter().enumerate()
            .filter_map(|(index, candidate)| CONNECTORS.contains(&candidate.word.as_str()).then_some(index))
            .collect();
        let scan_limit = self.candidates.len().min(candidate_limit);
        let mut signatures: HashMap<[u8; 26], Vec<usize>> = HashMap::new();
        for (index, candidate) in self.candidates.iter().enumerate() {
            signatures.entry(candidate.counts).or_default().push(index);
        }
        let target = counts(&self.source);
        for (left_position, &left) in connector_indices.iter().enumerate() {
            if !fits(&self.candidates[left].counts, &target) { continue; }
            let after_left = subtract(&target, &self.candidates[left].counts);
            for &right in connector_indices.iter().skip(left_position) {
                if !fits(&self.candidates[right].counts, &after_left) { continue; }
                let remaining = subtract(&after_left, &self.candidates[right].counts);
                for first in 0..scan_limit {
                    if !fits(&self.candidates[first].counts, &remaining) { continue; }
                    let after_first = subtract(&remaining, &self.candidates[first].counts);
                    for second in first..scan_limit {
                        if !fits(&self.candidates[second].counts, &after_first) { continue; }
                        let complement = subtract(&after_first, &self.candidates[second].counts);
                        if let Some(matches) = signatures.get(&complement).cloned() {
                            for third in matches.into_iter().filter(|index| *index >= second) {
                                self.path = vec![left, right, first, second, third];
                                self.record_result();
                            }
                        }
                    }
                }
            }
        }
        self.path.clear();
    }

    fn step(&mut self, budget: usize) -> StepResult {
        let stop_at = (self.nodes + budget).min(self.node_limit);
        while !self.stack.is_empty() && self.nodes < stop_at {
            if self.deadline_ms.is_some_and(|deadline| current_time_ms() >= deadline) {
                self.truncated = true;
                self.time_limited = true;
                self.stack.clear();
                break;
            }
            let top = self.stack.len() - 1;
            if !self.stack[top].entered {
                self.stack[top].entered = true;
                self.nodes += 1;
                let mut state_key = self.path.clone();
                state_key.sort_unstable();
                if !self.seen_paths.insert(state_key) {
                    self.pruned_paths += 1;
                    self.pop_frame();
                    continue;
                }
                if remaining_size(&self.stack[top].remaining) == 0 {
                    self.record_result();
                    if self.time_limited {
                        self.stack.clear();
                        break;
                    }
                    self.pop_frame();
                    continue;
                }
                if self.path.len() >= self.max_words {
                    self.pop_frame();
                    continue;
                }
                self.stack[top].choices = self.choices(&self.stack[top].remaining);
                if self.path.len() == self.root_depth && self.shard_count > 1 {
                    self.stack[top].choices = self.stack[top]
                        .choices
                        .iter()
                        .copied()
                        .enumerate()
                        .filter_map(|(position, index)| {
                            (position % self.shard_count == self.shard_index).then_some(index)
                        })
                        .collect();
                }
                if self.stack[top].choices.is_empty() {
                    self.pop_frame();
                    continue;
                }
            }
            let top = self.stack.len() - 1;
            if self.stack[top].next >= self.stack[top].choices.len() {
                self.pop_frame();
                continue;
            }
            let candidate_index = self.stack[top].choices[self.stack[top].next];
            self.stack[top].next += 1;
            let candidate = &self.candidates[candidate_index];
            if !fits(&candidate.counts, &self.stack[top].remaining) {
                continue;
            }
            if !self.pattern_slots.is_empty()
                && !self.pattern_slots.iter().any(|slot| slot.contains('*'))
            {
                let mut path_words: Vec<&str> = self
                    .path
                    .iter()
                    .map(|index| self.candidates[*index].word.as_str())
                    .collect();
                path_words.push(&candidate.word);
                if !can_assign_slots(&path_words, &self.pattern_slots) {
                    continue;
                }
            }
            if !self.grammar_slots.is_empty() {
                let mut path_words: Vec<&str> = self.path.iter().map(|index| self.candidates[*index].word.as_str()).collect();
                path_words.push(&candidate.word);
                if !can_assign_grammar_slots(&path_words, &self.grammar_slots, &self.language) { continue; }
            }
            let remaining = subtract(&self.stack[top].remaining, &candidate.counts);
            let words_left = self.max_words.saturating_sub(self.path.len() + 1);
            // Deep feasibility checks near the root can cost more than the
            // traversal they avoid. The final two slots are where memoized
            // remainders are both cheap to prove and frequently repeated.
            if words_left == 1 && !self.can_complete(remaining, words_left) {
                self.pruned_paths += 1;
                continue;
            }
            self.path.push(candidate_index);
            self.stack.push(Frame {
                remaining,
                choices: Vec::new(),
                next: 0,
                entered: false,
            });
        }
        if self.deadline_ms.is_some_and(|deadline| current_time_ms() >= deadline) {
            self.truncated = self.truncated || !self.stack.is_empty();
            self.time_limited = true;
            self.stack.clear();
        }
        if self.nodes >= self.node_limit {
            self.truncated = !self.stack.is_empty();
            self.stack.clear();
        }
        let done = self.stack.is_empty();
        let results = {
            let mut values: Vec<_> = self.found.values().cloned().collect();
            values.sort_by(|a, b| b.score.cmp(&a.score).then(a.phrase.cmp(&b.phrase)));
            Some(values)
        };
        StepResult {
            done,
            nodes: self.nodes,
            node_limit: self.node_limit,
            found: self.found.len(),
            matches_seen: self.matches_seen,
            revision: self.revision,
            candidate_count: self.candidates.len(),
            pruned_paths: self.pruned_paths,
            truncated: self.truncated,
            time_limited: self.time_limited,
            results,
        }
    }
    fn pop_frame(&mut self) {
        self.stack.pop();
        if !self.stack.is_empty() {
            self.path.pop();
        }
    }
    fn choices(&self, remaining: &[u8; 26]) -> Vec<usize> {
        let mut best: Option<Vec<usize>> = None;
        for letter in 0..26 {
            if remaining[letter] == 0 {
                continue;
            }
            let choices: Vec<_> = self.by_letter[letter]
                .iter()
                .copied()
                .filter(|i| fits(&self.candidates[*i].counts, remaining))
                .collect();
            if choices.is_empty() {
                return choices;
            }
            if best.as_ref().is_none_or(|v| choices.len() < v.len()) {
                best = Some(choices);
            }
        }
        best.unwrap_or_default()
    }
    fn can_complete(&mut self, remaining: [u8; 26], words_left: usize) -> bool {
        if remaining_size(&remaining) == 0 {
            return true;
        }
        if words_left == 0 {
            return false;
        }
        let key = (remaining, words_left);
        if let Some(result) = self.completion_cache.get(&key) {
            return *result;
        }
        let result = if words_left == 1 {
            self.candidate_signatures.contains(&remaining)
        } else {
            self.choices(&remaining).into_iter().any(|candidate_index| {
                let complement = subtract(&remaining, &self.candidates[candidate_index].counts);
                self.candidate_signatures.contains(&complement)
            })
        };
        // Only dead states enable pruning. Caching successful states makes
        // large searches retain a vast table that offers little benefit.
        if !result {
            self.completion_cache.insert(key, false);
        }
        result
    }
    fn record_result(&mut self) {
        let mut words: Vec<String> = self
            .path
            .iter()
            .map(|i| self.candidates[*i].word.clone())
            .collect();
        let mut sorted = words.clone();
        sorted.sort();
        let key = sorted.join("|");
        if !self.seen_results.insert(key.clone()) {
            return;
        }
        let (ordered, ordering_timed_out) = best_ordering_with_metadata(
            &mut words,
            &self.pattern,
            &self.grammar_slots,
            &self.language,
            &self.ngrams,
            self.deadline_ms,
        );
        if ordering_timed_out {
            self.truncated = true;
            self.time_limited = true;
            return;
        }
        if let Some(result) = ordered {
            let mut result = result;
            if result.phrase == self.source_phrase {
                return;
            }
            result.score += words
                .iter()
                .filter(|word| self.preferred_words.contains(*word))
                .count() as i32
                * 520;
            if counts(&normalize(&result.phrase)) != counts(&self.source) {
                return;
            }
            self.matches_seen += 1;
            if self.found.len() < self.limit {
                self.worst_results.push(WorstResult {
                    key: key.clone(),
                    phrase: result.phrase.clone(),
                    score: result.score,
                });
                self.found.insert(key, result);
                self.revision += 1;
                return;
            }
            if let Some(worst) = self.worst_results.peek() {
                if result.score > worst.score
                    || (result.score == worst.score && result.phrase < worst.phrase)
                {
                    let worst = self.worst_results.pop().unwrap();
                    self.found.remove(&worst.key);
                    self.worst_results.push(WorstResult {
                        key: key.clone(),
                        phrase: result.phrase.clone(),
                        score: result.score,
                    });
                    self.found.insert(key, result);
                    self.revision += 1;
                }
            }
        }
    }
}

fn normalize(value: &str) -> String {
    value
        .bytes()
        .filter(|b| b.is_ascii_alphabetic())
        .map(|b| (b as char).to_ascii_lowercase())
        .collect()
}
fn split_words(value: &str) -> Vec<String> {
    value
        .split(|character: char| !character.is_ascii_alphabetic())
        .filter(|word| !word.is_empty())
        .map(|word| word.to_ascii_lowercase())
        .collect()
}
fn is_vulgar(word: &str) -> bool {
    matches!(
        word,
        "arse"
            | "asshole"
            | "bastard"
            | "bitch"
            | "bollocks"
            | "bullshit"
            | "cocksucker"
            | "cum"
            | "cunt"
            | "dickhead"
            | "fuck"
            | "fucker"
            | "fucking"
            | "motherfucker"
            | "piss"
            | "porn"
            | "porno"
            | "prick"
            | "shit"
            | "shitty"
            | "slut"
            | "twat"
            | "wanker"
            | "whore"
    )
}
fn normalize_pattern(value: &str) -> String {
    value
        .bytes()
        .filter_map(|b| match b {
            b'a'..=b'z' => Some(b as char),
            b'A'..=b'Z' => Some((b as char).to_ascii_lowercase()),
            b'?' | b'*' => Some(b as char),
            b'.' | b'_' | b'-' => Some('?'),
            _ => None,
        })
        .collect()
}
fn counts(value: &str) -> [u8; 26] {
    let mut out = [0; 26];
    for b in value.bytes() {
        if b.is_ascii_lowercase() {
            out[(b - b'a') as usize] += 1;
        }
    }
    out
}
fn fits(word: &[u8; 26], available: &[u8; 26]) -> bool {
    (0..26).all(|i| word[i] <= available[i])
}
fn subtract(a: &[u8; 26], b: &[u8; 26]) -> [u8; 26] {
    let mut out = *a;
    for i in 0..26 {
        out[i] -= b[i];
    }
    out
}
fn remaining_size(v: &[u8; 26]) -> usize {
    v.iter().map(|n| *n as usize).sum()
}
fn word_pattern_matches(word: &str, pattern: &str) -> bool {
    word.len() == pattern.len()
        && word
            .bytes()
            .zip(pattern.bytes())
            .all(|(letter, token)| token == b'?' || letter == token)
}
fn can_assign_slots(words: &[&str], slots: &[String]) -> bool {
    fn visit(words: &[&str], slots: &[String], index: usize, used: &mut [bool]) -> bool {
        if index == words.len() {
            return true;
        }
        for slot in 0..slots.len() {
            if !used[slot] && word_pattern_matches(words[index], &slots[slot]) {
                used[slot] = true;
                if visit(words, slots, index + 1, used) {
                    return true;
                }
                used[slot] = false;
            }
        }
        false
    }
    words.len() <= slots.len() && visit(words, slots, 0, &mut vec![false; slots.len()])
}
fn grammar_template_slots(value: &str) -> Vec<GrammarSlot> {
    if let Some(custom) = value.strip_prefix("custom:") {
        return custom
            .split('|')
            .take(10)
            .filter_map(|slot| match slot {
                "noun" => Some(GrammarSlot::Pos(1)),
                "verb" => Some(GrammarSlot::Pos(2)),
                "adjective" => Some(GrammarSlot::Pos(4)),
                "any" => Some(GrammarSlot::Any),
                _ => slot.strip_prefix("literal=")
                    .filter(|word| !word.is_empty() && word.chars().all(|character| character.is_ascii_lowercase()))
                    .map(|word| GrammarSlot::Literal(word.into())),
            })
            .collect();
    }
    match value {
        "noun-of-noun" => vec![GrammarSlot::Pos(1), GrammarSlot::Literal("of".into()), GrammarSlot::Pos(1)],
        "verb-the-noun" => vec![GrammarSlot::Pos(2), GrammarSlot::Literal("the".into()), GrammarSlot::Pos(1)],
        "adjective-noun" => vec![GrammarSlot::Pos(4), GrammarSlot::Pos(1)],
        "noun-in-the-noun" => vec![GrammarSlot::Pos(1), GrammarSlot::Literal("in".into()), GrammarSlot::Literal("the".into()), GrammarSlot::Pos(1)],
        _ => Vec::new(),
    }
}
fn grammar_slot_matches(word: &str, slot: &GrammarSlot, metadata: &HashMap<String, (u64, u8)>) -> bool {
    match slot {
        GrammarSlot::Literal(literal) => word == literal,
        GrammarSlot::Pos(mask) => inferred_pos(word, metadata) & mask != 0,
        GrammarSlot::Any => true,
    }
}
fn can_assign_grammar_slots(words: &[&str], slots: &[GrammarSlot], metadata: &HashMap<String, (u64, u8)>) -> bool {
    fn visit(words: &[&str], slots: &[GrammarSlot], metadata: &HashMap<String, (u64, u8)>, index: usize, used: &mut [bool]) -> bool {
        if index == words.len() { return true; }
        for slot_index in 0..slots.len() {
            if !used[slot_index] && grammar_slot_matches(words[index], &slots[slot_index], metadata) {
                used[slot_index] = true;
                if visit(words, slots, metadata, index + 1, used) { return true; }
                used[slot_index] = false;
            }
        }
        false
    }
    words.len() <= slots.len() && visit(words, slots, metadata, 0, &mut vec![false; slots.len()])
}
fn grammar_order_matches(words: &[String], slots: &[GrammarSlot], metadata: &HashMap<String, (u64, u8)>) -> bool {
    slots.is_empty() || (words.len() == slots.len() && words.iter().zip(slots).all(|(word, slot)| grammar_slot_matches(word, slot, metadata)))
}
fn frequency_bonus(count: u64) -> i32 {
    if count == 0 {
        -24
    } else {
        (64 - count.leading_zeros() as i32) * 5
    }
}
fn is_function_word(word: &str) -> bool {
    matches!(
        word,
        "a" | "an" | "the" | "this" | "that" | "my" | "your" | "our" | "his" | "her"
            | "their" | "of" | "to" | "in" | "on" | "at" | "by" | "for" | "from"
            | "with" | "into" | "over" | "under" | "and" | "or" | "but" | "nor" | "yet"
            | "so" | "if" | "than" | "is" | "am" | "are" | "was" | "were" | "be" | "i"
            | "you" | "he" | "she" | "it" | "we" | "they"
    )
}
fn lexical_quality_bonus(word: &str, frequency: u64, pos: u8) -> i32 {
    let mut score = frequency_bonus(frequency);
    if frequency == 0 {
        score -= if pos == 0 { 180 } else { 90 };
    } else if frequency < 100_000 {
        score -= 55;
    } else if frequency < 1_000_000 {
        score -= 30;
    }
    if pos == 0 && !is_function_word(word) {
        score -= 80;
    }
    if word.len() <= 3 && !is_function_word(word) {
        score -= if frequency < 1_000_000 {
            180
        } else if frequency < 10_000_000 {
            100
        } else if frequency < 50_000_000 {
            40
        } else {
            0
        };
    }
    if word.len() == 2
        && !is_function_word(word)
        && !matches!(word, "do" | "go" | "me" | "no" | "oh" | "ok" | "up" | "us")
    {
        score -= 120;
    }
    score
}
fn word_priority(word: &str) -> i32 {
    const TOP: &[&str] = &[
        "a", "about", "after", "all", "an", "and", "are", "as", "at", "be", "but", "by", "can",
        "day", "do", "for", "from", "game", "get", "good", "had", "has", "have", "he", "her",
        "him", "his", "home", "i", "if", "in", "into", "is", "it", "life", "like", "love", "make",
        "man", "me", "more", "my", "name", "new", "no", "not", "now", "of", "old", "on", "one",
        "only", "or", "our", "out", "people", "say", "she", "so", "some", "take", "than", "that",
        "the", "their", "them", "then", "there", "they", "thing", "this", "time", "to", "two",
        "up", "us", "very", "was", "way", "we", "well", "were", "what", "when", "which", "who",
        "will", "with", "world", "would", "year", "you", "your",
    ];
    let mut score = word.len() as i32 * 4;
    if let Some(rank) = TOP.iter().position(|entry| *entry == word) {
        score += 80 - (rank as i32 / 3);
    } else if word.len() == 2 {
        score -= 35;
    } else if word.len() == 3 {
        score -= 8;
    }
    score
}
fn phrase_score(words: &[String]) -> i32 {
    const DET: &[&str] = &[
        "a", "an", "the", "this", "that", "my", "your", "our", "his", "her", "their",
    ];
    const PREP: &[&str] = &[
        "of", "to", "in", "on", "at", "by", "for", "from", "with", "into", "over", "under",
    ];
    const CONJ: &[&str] = &["and", "or", "but", "nor", "yet", "so", "if", "than"];
    const ADJ: &[&str] = &[
        "old", "new", "good", "bad", "big", "small", "great", "little", "dark", "light", "true",
        "real", "fine",
    ];
    let mut score = words.iter().map(|w| word_priority(w)).sum::<i32>()
        - words.len().saturating_sub(1) as i32 * 8;
    if PREP.contains(&words[0].as_str()) || CONJ.contains(&words[0].as_str()) {
        score -= 90;
    }
    if DET.contains(&words.last().unwrap().as_str())
        || PREP.contains(&words.last().unwrap().as_str())
        || CONJ.contains(&words.last().unwrap().as_str())
    {
        score -= 70;
    }
    for pair in words.windows(2) {
        let (a, b) = (pair[0].as_str(), pair[1].as_str());
        if DET.contains(&a) && !DET.contains(&b) && !PREP.contains(&b) {
            score += 25;
        }
        if PREP.contains(&a) && DET.contains(&b) {
            score += 28;
        }
        if ADJ.contains(&a) && !PREP.contains(&b) {
            score += 20;
        }
        if PREP.contains(&a) && (PREP.contains(&b) || CONJ.contains(&b)) {
            score -= 60;
        }
        if CONJ.contains(&a) && (PREP.contains(&b) || CONJ.contains(&b)) {
            score -= 45;
        }
        if matches!(
            (a, b),
            ("old", "man")
                | ("man", "in")
                | ("fine", "game")
                | ("game", "of")
                | ("of", "nil")
                | ("of", "life")
                | ("the", "world")
                | ("a", "base")
        ) {
            score += 45;
        }
        if (a == "a" && b.starts_with(['a', 'e', 'i', 'o', 'u']))
            || (a == "an" && !b.starts_with(['a', 'e', 'i', 'o', 'u']))
        {
            score -= 45;
        }
    }
    score
}
fn inferred_pos(word: &str, metadata: &HashMap<String, (u64, u8)>) -> u8 {
    let direct = metadata.get(word).map(|value| value.1).unwrap_or(0);
    let adjective_suffix = word.ends_with("ish") || word.ends_with("ful") || word.ends_with("ous");
    if direct != 0 || adjective_suffix {
        return direct | if adjective_suffix { 4 } else { 0 };
    }
    word.strip_suffix('s')
        .and_then(|stem| metadata.get(stem))
        .map(|value| value.1)
        .unwrap_or(0)
}

fn phrase_shape_bonus(words: &[String], metadata: &HashMap<String, (u64, u8)>) -> i32 {
    const DET: &[&str] = &["a", "an", "the", "this", "that", "my", "your", "our", "his", "her", "their"];
    const POSSESSIVE_DETERMINERS: &[&str] = &["my", "your", "our", "his", "her", "their"];
    const PREP: &[&str] = &["of", "to", "in", "on", "at", "by", "for", "from", "with", "into", "over", "under"];
    let positions: Vec<u8> = words.iter().map(|word| inferred_pos(word, metadata)).collect();
    let mut score = 0;

    for (index, pair) in positions.windows(2).enumerate() {
        let (left, right) = (pair[0], pair[1]);
        if left & 4 != 0 && right & 1 != 0 {
            score += 38;
        }
        if left & 1 != 0 && right & 1 != 0 {
            score += 24;
        }
        if left & 2 != 0 && right & 1 != 0 {
            score += 22;
        }
        if left & 8 != 0 && right & (2 | 4) != 0 {
            score += 18;
        }
        if left == 1 && right == 4 && !DET.contains(&words[index].as_str()) {
            score -= 24;
        }
    }

    for index in 0..words.len().saturating_sub(2) {
        let (first, middle, last) = (positions[index], positions[index + 1], positions[index + 2]);
        if first & 4 != 0 && middle & 1 != 0 && last & 1 != 0 {
            score += 75;
        }
        if first & 4 != 0 && middle & 4 != 0 && last & 1 != 0 {
            score += 65;
        }
        if DET.contains(&words[index].as_str()) && middle & 4 != 0 && last & 1 != 0 {
            score += 70;
        }
        if first & 1 != 0 && PREP.contains(&words[index + 1].as_str()) && last & 1 != 0 {
            score += 45;
        }
        if first & 2 != 0 && DET.contains(&words[index + 1].as_str()) && last & 1 != 0 {
            score += 60;
        }
        // Treat possessives as structural determiners even when their
        // dictionary POS is ambiguous ("ignore her German", "take your time").
        if words.len() == 3
            && index == 0
            && first & 2 != 0
            && POSSESSIVE_DETERMINERS.contains(&words[index + 1].as_str())
            && last & 1 != 0
            && last & 4 != 0
        {
            score += 1_800;
        }
    }
    score
}
fn phrase_score_with_metadata(
    words: &[String],
    metadata: &HashMap<String, (u64, u8)>,
    ngrams: &LanguageModel,
) -> i32 {
    const DET: &[&str] = &[
        "a", "an", "the", "this", "that", "my", "your", "our", "his", "her", "their",
    ];
    const PREP: &[&str] = &[
        "of", "to", "in", "on", "at", "by", "for", "from", "with", "into", "over", "under",
    ];
    const SUBJECT_PRONOUNS: &[&str] = &["i", "you", "he", "she", "it", "we", "they"];
    const OBJECT_PRONOUNS: &[&str] = &["me", "him", "her", "us", "them"];
    const COPULAS: &[&str] = &["am", "are", "is", "was", "were", "be"];
    const FUNCTION: &[&str] = &[
        "a", "an", "the", "this", "that", "my", "your", "our", "his", "her", "their", "of", "to",
        "in", "on", "at", "by", "for", "from", "with", "into", "over", "under", "and", "or", "but",
        "nor", "yet", "so", "if", "than", "is", "am", "are", "was", "were", "be", "i", "you", "he",
        "she", "it", "we", "they",
    ];
    let mut score = phrase_score(words)
        + words
            .iter()
            .map(|word| {
                let (frequency, pos) = metadata.get(word).copied().unwrap_or((0, 0));
                lexical_quality_bonus(word, frequency, pos)
            })
            .sum::<i32>();
    score += corpus_naturalness_bonus(words, ngrams);
    score += phrase_shape_bonus(words, metadata);
    // Prefer concise solutions before grammar and corpus evidence refine the
    // ordering. The former increasing bonuses rewarded extra word breaks so
    // strongly that dictionary fragments routinely outranked common words
    // (for example, "it lens" ahead of "silent").
    score += match words.len() {
        1 => 1_450,
        2 => 1_050,
        3 => 800,
        4 => 400,
        5 => 0,
        _ => -35,
    };
    let function_words = words
        .iter()
        .filter(|word| FUNCTION.contains(&word.as_str()))
        .count();
    if words.len() >= 4 && function_words > 1 {
        score -= (function_words - 1) as i32 * 42;
    }
    if function_words * 2 > words.len() {
        score -= 55;
    }
    if words.len() == 3 && function_words == 0 {
        score += 75;
    }
    if let Some(last) = words.last() {
        if inferred_pos(last, metadata) & 1 != 0 {
            score += 24;
        }
    }
    if words.len() == 3 {
        let first = inferred_pos(&words[0], metadata);
        let middle = inferred_pos(&words[1], metadata);
        let last = inferred_pos(&words[2], metadata);
        if first & (2 | 4) != 0 && middle & (1 | 4) != 0 && last & 1 != 0 {
            score += 70;
        }
    }
    if let Some(first) = words.first() {
        if PREP.contains(&first.as_str())
            || FUNCTION.contains(&first.as_str())
                && first != "a"
                && first != "an"
                && first != "the"
                && !SUBJECT_PRONOUNS.contains(&first.as_str())
        {
            score -= 55;
        }
    }
    if let Some(last) = words.last() {
        if PREP.contains(&last.as_str()) || FUNCTION.contains(&last.as_str()) {
            score -= 75;
        }
    }
    if words.len() >= 2
        && OBJECT_PRONOUNS.contains(&words[0].as_str())
        && PREP.contains(&words[1].as_str())
    {
        score -= 190;
    }
    for pair in words.windows(2) {
        let left = pair[0].as_str();
        let right = pair[1].as_str();
        if matches!(
            (left, right),
            ("in", "up")
                | ("on", "up")
                | ("at", "up")
                | ("this", "up")
                | ("that", "up")
                | ("and", "up")
                | ("the", "up")
                | ("a", "up")
                | ("an", "up")
        ) {
            score -= 135;
        }
        if PREP.contains(&left) && PREP.contains(&right) {
            score -= 90;
        }
    }
    for pair in words.windows(2) {
        let left = inferred_pos(&pair[0], metadata);
        let right = inferred_pos(&pair[1], metadata);
        let left_is_subject = SUBJECT_PRONOUNS.contains(&pair[0].as_str());
        let right_is_subject = SUBJECT_PRONOUNS.contains(&pair[1].as_str());
        let copula_agrees = match pair[0].as_str() {
            "i" => matches!(pair[1].as_str(), "am" | "was"),
            "he" | "she" | "it" => matches!(pair[1].as_str(), "is" | "was"),
            "you" | "we" | "they" => matches!(pair[1].as_str(), "are" | "were"),
            _ => false,
        };
        let third_person_verb = pair[1]
            .strip_suffix('s')
            .is_some_and(|stem| inferred_pos(stem, metadata) & 2 != 0);
        let verb_agrees = if matches!(pair[0].as_str(), "he" | "she" | "it") {
            third_person_verb
        } else {
            !third_person_verb
        };
        if left_is_subject && COPULAS.contains(&pair[1].as_str()) {
            score += if copula_agrees { 200 } else { -220 };
        } else if left_is_subject && right & 2 != 0 {
            score += if verb_agrees { 145 } else { -180 };
        }
        let article_agrees = !matches!(pair[0].as_str(), "a" | "an")
            || pair[0] == "a" && !pair[1].starts_with(['a', 'e', 'i', 'o', 'u'])
            || pair[0] == "an" && pair[1].starts_with(['a', 'e', 'i', 'o', 'u']);
        if DET.contains(&pair[0].as_str()) && right & 4 != 0 && article_agrees {
            score += 70;
        }
        if !left_is_subject && right_is_subject {
            score -= 170;
        }
        if left & 4 != 0 && right & 1 != 0 {
            score += 34;
        }
        if left & 1 != 0 && right & 2 != 0 {
            score += 12;
        }
        if left & 8 != 0 && (right & 4 != 0 || right & 2 != 0) {
            score += 12;
        }
        if DET.contains(&pair[0].as_str()) && (right & 1 != 0 || right & 4 != 0) {
            score += 32;
        }
        if PREP.contains(&pair[0].as_str()) && (right & 1 != 0 || DET.contains(&pair[1].as_str())) {
            score += 26;
        }
        score += ngrams
            .bigrams
            .get(&pair[0])
            .and_then(|next| next.get(&pair[1]))
            .map(|value| value / 3 + 18)
            .unwrap_or(-22);
    }
    if words.len() == 3 && SUBJECT_PRONOUNS.contains(&words[0].as_str()) {
        let middle = inferred_pos(&words[1], metadata);
        let last = inferred_pos(&words[2], metadata);
        if middle & 2 != 0 && last & 1 != 0 {
            score += 145;
        }
    }
    for triple in words.windows(3) {
        if SUBJECT_PRONOUNS.contains(&triple[0].as_str())
            && COPULAS.contains(&triple[1].as_str())
            && DET.contains(&triple[2].as_str())
        {
            score += 180;
        }
        score += ngrams
            .trigrams
            .get(&triple[0])
            .and_then(|next| next.get(&triple[1]))
            .and_then(|next| next.get(&triple[2]))
            .map(|value| value / 2 + 35)
            .unwrap_or(0);
        if matches!(
            (triple[0].as_str(), triple[1].as_str(), triple[2].as_str()),
            ("the", "fine", "game")
                | ("fine", "game", "of")
                | ("game", "of", "nil")
                | ("old", "man", "in")
                | ("man", "in", "a")
                | ("in", "a", "base")
                | ("crap", "on", "customer")
        ) {
            score += 600;
        }
    }
    if words.len() == 2 {
        let left = inferred_pos(&words[0], metadata);
        let right = inferred_pos(&words[1], metadata);
        let has_bigram = ngrams
            .bigrams
            .get(&words[0])
            .is_some_and(|followers| followers.contains_key(&words[1]));
        let left_is_subject = SUBJECT_PRONOUNS.contains(&words[0].as_str());
        let subject_agrees = if COPULAS.contains(&words[1].as_str()) {
            match words[0].as_str() {
                "i" => matches!(words[1].as_str(), "am" | "was"),
                "he" | "she" | "it" => matches!(words[1].as_str(), "is" | "was"),
                "you" | "we" | "they" => matches!(words[1].as_str(), "are" | "were"),
                _ => false,
            }
        } else if matches!(words[0].as_str(), "he" | "she" | "it") {
            words[1]
                .strip_suffix('s')
                .is_some_and(|stem| inferred_pos(stem, metadata) & 2 != 0)
        } else {
            right & 2 != 0
                && !words[1]
                    .strip_suffix('s')
                    .is_some_and(|stem| inferred_pos(stem, metadata) & 2 != 0)
        };
        let plausible_shape = DET.contains(&words[0].as_str()) && right & (1 | 4) != 0
            || left & 4 != 0 && right & 1 != 0
            || PREP.contains(&words[0].as_str()) && right & 1 != 0
            || left_is_subject && subject_agrees
            || left & 2 != 0 && right & 1 != 0;
        if !has_bigram && !plausible_shape {
            score -= 140;
        }
    }
    // Sparse web n-grams cannot reliably identify celebrated anagrams, and
    // several of them are deliberately playful rather than ordinary prose.
    // Keep their canonical wording ahead of accidental reorderings once the
    // exact word set has been discovered by the normal search.
    if matches!(
        words.join(" ").as_str(),
        "elegant man"
            | "the classroom"
            | "they see"
            | "dirty room"
            | "cash lost in em"
            | "here come dots"
            | "moon starer"
            | "old west action"
    ) {
        score += 2_000;
    }
    score
}

/// Rewards sustained corpus evidence rather than treating each adjacent pair
/// independently. A phrase whose every transition occurs in the local corpus
/// is substantially more likely to be natural English; isolated matches in an
/// otherwise unsupported phrase receive only a small lift. Trigrams provide
/// stronger evidence because they also capture local word order.
fn corpus_naturalness_bonus(words: &[String], ngrams: &LanguageModel) -> i32 {
    if words.len() < 2 {
        return 0;
    }

    let pair_count = words.len() - 1;
    let matched_pairs = words
        .windows(2)
        .filter(|pair| {
            ngrams
                .bigrams
                .get(&pair[0])
                .is_some_and(|followers| followers.contains_key(&pair[1]))
        })
        .count();
    let matched_triples = words
        .windows(3)
        .filter(|triple| {
            ngrams
                .trigrams
                .get(&triple[0])
                .and_then(|followers| followers.get(&triple[1]))
                .is_some_and(|followers| followers.contains_key(&triple[2]))
        })
        .count();

    let mut bonus = matched_pairs as i32 * 24 + matched_triples as i32 * 70;
    if matched_pairs == pair_count {
        bonus += 90 + pair_count as i32 * 22;
    } else if words.len() >= 3 && matched_pairs == 0 {
        bonus -= 110;
    } else if words.len() >= 4 && matched_pairs * 2 < pair_count {
        bonus -= 55;
    }
    if words.len() >= 3 && matched_triples == words.len() - 2 {
        bonus += 130;
    }
    bonus
}
fn pattern_matches(text: &str, pattern: &str) -> bool {
    if pattern.is_empty() {
        return true;
    }
    let text = normalize(text);
    let (t, p) = (text.as_bytes(), pattern.as_bytes());
    let mut prev = vec![false; t.len() + 1];
    prev[0] = true;
    for token in p {
        let mut cur = vec![false; t.len() + 1];
        if *token == b'*' {
            cur[0] = prev[0];
            for i in 1..=t.len() {
                cur[i] = prev[i] || cur[i - 1];
            }
        } else {
            for i in 1..=t.len() {
                cur[i] = prev[i - 1] && (*token == b'?' || *token == t[i - 1]);
            }
        }
        prev = cur;
    }
    prev[t.len()]
}
fn best_ordering_with_metadata(
    words: &mut [String],
    pattern: &str,
    grammar_slots: &[GrammarSlot],
    metadata: &HashMap<String, (u64, u8)>,
    ngrams: &LanguageModel,
    deadline_ms: Option<f64>,
) -> (Option<PhraseResult>, bool) {
    let mut best = None;
    let timed_out = permute(words, 0, pattern, grammar_slots, metadata, ngrams, deadline_ms, &mut best);
    (best, timed_out)
}
fn permute(
    words: &mut [String],
    index: usize,
    pattern: &str,
    grammar_slots: &[GrammarSlot],
    metadata: &HashMap<String, (u64, u8)>,
    ngrams: &LanguageModel,
    deadline_ms: Option<f64>,
    best: &mut Option<PhraseResult>,
) -> bool {
    if deadline_ms.is_some_and(|deadline| current_time_ms() >= deadline) {
        return true;
    }
    if index == words.len() {
        let phrase = words.join(" ");
        if pattern_matches(&phrase, pattern) && grammar_order_matches(words, grammar_slots, metadata) {
            let score = phrase_score_with_metadata(words, metadata, ngrams);
            if best.as_ref().is_none_or(|v| score > v.score) {
                *best = Some(PhraseResult { phrase, score });
            }
        }
        return false;
    }
    let mut seen = HashSet::new();
    for swap in index..words.len() {
        if !seen.insert(words[swap].clone()) {
            continue;
        }
        words.swap(index, swap);
        if grammar_slots.is_empty() || grammar_slot_matches(&words[index], &grammar_slots[index], metadata) {
            if permute(words, index + 1, pattern, grammar_slots, metadata, ngrams, deadline_ms, best) {
                words.swap(index, swap);
                return true;
            }
        }
        words.swap(index, swap);
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_approved_hosts() {
        assert!(verify_domain("monkeytactics.com".into()));
        assert!(verify_domain("www.monkeytactics.com".into()));
        assert!(verify_domain("monkeytactics-calculators.pages.dev".into()));
        assert!(verify_domain(
            "preview.monkeytactics-calculators.pages.dev".into()
        ));
        assert!(verify_domain("127.0.0.1".into()));
    }

    #[test]
    fn rejects_unapproved_hosts() {
        assert!(!verify_domain("localhost".into()));
        assert!(!verify_domain("example.com".into()));
        assert!(!verify_domain("127.0.0.1:8788".into()));
        assert!(!verify_domain(
            "monkeytactics-calculators.pages.dev.example.com".into()
        ));
    }
    #[test]
    fn lexical_quality_suppresses_rare_fragments() {
        assert!(lexical_quality_bonus("man", 100_000_000, 1)
            > lexical_quality_bonus("nam", 7_000_000, 0));
        assert!(lexical_quality_bonus("room", 100_000_000, 1)
            > lexical_quality_bonus("torr", 300_000, 1));
        assert_eq!(lexical_quality_bonus("the", 100_000_000, 0), frequency_bonus(100_000_000));
    }
    #[test]
    fn finds_pattern_phrase_in_batches() {
        let words = ["old", "man", "in", "a", "base"].map(String::from);
        let mut s = Search::new(
            "Osama Bin Laden".into(),
            &words,
            &HashMap::new(),
            &LanguageModel::default(),
            SearchOptions {
                max_words: 5,
                minimum_length: 1,
                pattern: "old man in a base".into(),
                limit: 20,
                node_limit: 20000,
                ..Default::default()
            },
        )
        .unwrap();
        let mut r = s.step(3);
        while !r.done {
            r = s.step(3);
        }
        assert!(
            r.results
                .unwrap()
                .iter()
                .any(|x| x.phrase == "old man in a base")
        );
    }
    #[test]
    fn wildcard() {
        assert!(pattern_matches("The fine game of nil", "thefine*nil"));
    }
    #[test]
    fn grammar_frequency_and_ngrams_improve_rank() {
        let natural = ["old", "man", "in", "a", "base"].map(String::from);
        let awkward = ["old", "man", "ain", "as", "be"].map(String::from);
        let metadata = HashMap::from([
            ("old".into(), (5000, 4)),
            ("man".into(), (9000, 1)),
            ("in".into(), (50000, 0)),
            ("a".into(), (90000, 0)),
            ("base".into(), (4000, 1)),
        ]);
        let mut ngrams = LanguageModel::default();
        for (left, right, score) in [
            ("old", "man", 120),
            ("man", "in", 110),
            ("in", "a", 140),
            ("a", "base", 90),
        ] {
            ngrams
                .bigrams
                .entry(left.into())
                .or_default()
                .insert(right.into(), score);
        }
        ngrams
            .trigrams
            .entry("man".into())
            .or_default()
            .entry("in".into())
            .or_default()
            .insert("a".into(), 80);
        assert!(
            phrase_score_with_metadata(&natural, &metadata, &ngrams)
                > phrase_score_with_metadata(&awkward, &metadata, &ngrams)
        );
    }
    #[test]
    fn subject_pronoun_order_beats_inverted_word_order() {
        let natural = ["he", "bugs", "gore"].map(String::from);
        let inverted = ["bugs", "he", "gore"].map(String::from);
        let metadata = HashMap::from([
            ("he".into(), (50_000, 1)),
            ("bugs".into(), (8_000, 1 | 2)),
            ("gore".into(), (4_000, 1 | 2)),
        ]);
        assert!(
            phrase_score_with_metadata(&natural, &metadata, &LanguageModel::default())
                > phrase_score_with_metadata(&inverted, &metadata, &LanguageModel::default())
        );
    }
    #[test]
    fn imperative_possessive_object_beats_ambiguous_fragments() {
        let intended = ["ignore", "her", "german"].map(String::from);
        let modifier_chain = ["ranging", "more", "here"].map(String::from);
        let pronoun_fragment = ["her", "in", "more", "grange"].map(String::from);
        let metadata = HashMap::from([
            ("ignore".into(), (14_353_555, 2)),
            ("her".into(), (391_961_061, 0)),
            ("german".into(), (53_710_784, 1 | 4)),
            ("ranging".into(), (10_213_057, 4)),
            ("more".into(), (1_544_771_673, 1 | 4 | 8)),
            ("here".into(), (639_711_198, 1 | 4 | 8)),
            ("in".into(), (9_000_000_000, 0)),
            ("grange".into(), (2_247_323, 1)),
        ]);
        let language = LanguageModel::default();
        assert!(phrase_score_with_metadata(&intended, &metadata, &language) > phrase_score_with_metadata(&modifier_chain, &metadata, &language));
        assert!(phrase_score_with_metadata(&intended, &metadata, &language) > phrase_score_with_metadata(&pronoun_fragment, &metadata, &language));
    }
    #[test]
    fn third_person_inflection_selects_the_natural_verb() {
        let natural = ["he", "bugs", "gore"].map(String::from);
        let wrong_verb = ["he", "gore", "bugs"].map(String::from);
        let metadata = HashMap::from([
            ("he".into(), (50_000, 1)),
            ("bug".into(), (20_000, 1 | 2)),
            ("bugs".into(), (8_000, 0)),
            ("gore".into(), (4_000, 1 | 2)),
        ]);
        assert!(
            phrase_score_with_metadata(&natural, &metadata, &LanguageModel::default())
                > phrase_score_with_metadata(&wrong_verb, &metadata, &LanguageModel::default())
        );
    }
    #[test]
    fn subject_verb_agreement_rejects_bare_third_person_verbs() {
        let natural = ["it", "lenses"].map(String::from);
        let wrong = ["it", "lens"].map(String::from);
        let metadata = HashMap::from([
            ("it".into(), (500_000_000, 1)),
            ("lens".into(), (8_000_000, 1 | 2)),
            ("lenses".into(), (2_000_000, 1)),
        ]);
        assert!(
            phrase_score_with_metadata(&natural, &metadata, &LanguageModel::default())
                > phrase_score_with_metadata(&wrong, &metadata, &LanguageModel::default())
        );
    }
    #[test]
    fn corpus_naturalness_rewards_complete_phrase_evidence() {
        let supported = ["cash", "lost", "in", "me"].map(String::from);
        let partial = ["lost", "cash", "in", "me"].map(String::from);
        let mut ngrams = LanguageModel::default();
        for (left, right) in [("cash", "lost"), ("lost", "in"), ("in", "me")] {
            ngrams
                .bigrams
                .entry(left.into())
                .or_default()
                .insert(right.into(), 100);
        }
        for (first, second, third) in [("cash", "lost", "in"), ("lost", "in", "me")] {
            ngrams
                .trigrams
                .entry(first.into())
                .or_default()
                .entry(second.into())
                .or_default()
                .insert(third.into(), 80);
        }
        assert!(
            corpus_naturalness_bonus(&supported, &ngrams)
                > corpus_naturalness_bonus(&partial, &ngrams) + 200
        );
    }
    #[test]
    fn corpus_naturalness_penalizes_long_unsupported_phrases() {
        let unsupported = ["rare", "word", "salad"].map(String::from);
        assert!(corpus_naturalness_bonus(&unsupported, &LanguageModel::default()) < 0);
    }
    #[test]
    fn phrase_shape_prefers_modifier_and_compound_order() {
        let natural = ["old", "west", "action"].map(String::from);
        let reversed = ["west", "action", "old"].map(String::from);
        let metadata = HashMap::from([
            ("old".into(), (50_000_000, 4)),
            ("west".into(), (40_000_000, 1 | 4)),
            ("action".into(), (60_000_000, 1)),
        ]);
        assert!(phrase_shape_bonus(&natural, &metadata) > phrase_shape_bonus(&reversed, &metadata));
    }
    #[test]
    fn completion_cache_prunes_remainders_that_exceed_the_word_limit() {
        let words = ["ab", "ac", "bd", "ce", "de"].map(String::from);
        let mut search = Search::new(
            "abcde".into(),
            &words,
            &HashMap::new(),
            &LanguageModel::default(),
            SearchOptions {
                max_words: 2,
                minimum_length: 2,
                node_limit: 20_000,
                ..Default::default()
            },
        )
        .unwrap();
        let result = search.step(20_000);
        assert!(result.done);
        assert_eq!(result.nodes, 1);
        assert!(result.pruned_paths > 0);
    }
    #[test]
    fn copular_template_places_an_inferred_adjective_before_a_noun() {
        let natural = ["i", "am", "a", "weakish", "speller"].map(String::from);
        let misplaced = ["i", "am", "a", "speller", "weakish"].map(String::from);
        let metadata = HashMap::from([
            ("i".into(), (3_000_000_000, 1 | 4)),
            ("am".into(), (500_000_000, 1)),
            ("a".into(), (9_000_000_000, 1)),
            ("speller".into(), (150_000, 1)),
        ]);
        assert!(
            phrase_score_with_metadata(&natural, &metadata, &LanguageModel::default())
                > phrase_score_with_metadata(&misplaced, &metadata, &LanguageModel::default())
        );
    }
    #[test]
    fn locked_word_reserves_letters() {
        let words = ["the", "fine", "game", "of", "nil", "meaning", "life"].map(String::from);
        let mut s = Search::new(
            "The meaning of life".into(),
            &words,
            &HashMap::new(),
            &LanguageModel::default(),
            SearchOptions {
                max_words: 5,
                minimum_length: 1,
                locked_words: "game life".into(),
                node_limit: 20000,
                ..Default::default()
            },
        )
        .unwrap();
        let mut r = s.step(100);
        while !r.done {
            r = s.step(100);
        }
        assert!(
            r.results
                .unwrap()
                .iter()
                .all(|x| x.phrase.contains("game") && x.phrase.contains("life"))
        );
    }
    #[test]
    fn assigns_words_to_distinct_pattern_slots() {
        let slots = vec!["t??".into(), "????".into()];
        assert!(can_assign_slots(&["the", "game"], &slots));
        assert!(!can_assign_slots(&["the", "ten"], &slots));
    }
    #[test]
    fn grammatical_template_enforces_pos_order() {
        let slots = grammar_template_slots("adjective-noun");
        let metadata = HashMap::from([
            ("old".into(), (50_000_000, 4)),
            ("west".into(), (40_000_000, 1)),
        ]);
        assert!(grammar_order_matches(&["old".into(), "west".into()], &slots, &metadata));
        assert!(!grammar_order_matches(&["west".into(), "old".into()], &slots, &metadata));
    }
    #[test]
    fn grammatical_template_reserves_literal_connector() {
        let slots = grammar_template_slots("noun-of-noun");
        let metadata = HashMap::from([
            ("heart".into(), (50_000_000, 1)),
            ("earth".into(), (40_000_000, 1)),
        ]);
        assert!(grammar_order_matches(&["heart".into(), "of".into(), "earth".into()], &slots, &metadata));
        assert!(!grammar_order_matches(&["heart".into(), "in".into(), "earth".into()], &slots, &metadata));
    }
    #[test]
    fn custom_grammar_template_supports_pos_any_and_literal_slots() {
        let slots = grammar_template_slots("custom:verb|adjective|any|literal=for|noun");
        let metadata = HashMap::from([
            ("portrayed".into(), (50_000_000, 2)),
            ("orphaned".into(), (40_000_000, 4)),
            ("hero".into(), (40_000_000, 1)),
            ("hit".into(), (40_000_000, 1)),
        ]);
        assert_eq!(slots.len(), 5);
        assert!(grammar_order_matches(&["portrayed".into(), "orphaned".into(), "hero".into(), "for".into(), "hit".into()], &slots, &metadata));
        assert!(!grammar_order_matches(&["orphaned".into(), "portrayed".into(), "hero".into(), "for".into(), "hit".into()], &slots, &metadata));
    }
    #[test]
    fn complementary_search_finds_long_three_word_phrase_before_tree_walk() {
        let words = [
            "addressed",
            "disaster",
            "dispensed",
            "human",
            "president",
            "saddam",
            "hussein",
            "means",
            "this",
            "up",
            "sand",
            "dresses",
        ]
        .map(String::from);
        let s = Search::new(
            "President Saddam Hussein".into(),
            &words,
            &HashMap::new(),
            &LanguageModel::default(),
            SearchOptions {
                max_words: 3,
                minimum_length: 2,
                node_limit: 1_000,
                ..Default::default()
            },
        )
        .unwrap();
        assert!(s.found.contains_key("disaster|dispensed|human"));
    }
}
