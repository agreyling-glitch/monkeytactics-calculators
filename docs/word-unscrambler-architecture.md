# Word Unscrambler Technical Architecture

## Overview

The Word Unscrambler is a static browser application with a Rust engine compiled to WebAssembly. HTML and CSS define the interface, JavaScript manages browser concerns, and Rust owns the dictionary indexes and computational search logic.

No word data or search input is sent to a server. The browser downloads static dictionary shards and performs all indexing, matching, filtering, scoring, sorting, hook detection, and word analysis locally.

## Component Map

```text
tools/word-unscrambler.html
  |
  +-- assets/js/tools/word-unscrambler/input-rules.js
  |     Input normalization and validation limits
  |
  +-- assets/js/tools/word-unscrambler/history-store.js
  |     localStorage-backed search history
  |
  +-- assets/js/tools/word-unscrambler/wasm-bridge.js
  |     Loads, authorizes, and wraps the generated WASM module
  |       |
  |       +-- assets/wasm/word-unscrambler/
  |             word_unscrambler_engine.js
  |             word_unscrambler_engine_bg.wasm
  |
  +-- assets/js/tools/word-unscrambler/word-unscrambler.js
        UI state, dictionary fetching, DOM rendering, and bridge calls
          |
          +-- assets/data/words/manifest.wiktionary-v1.json
          +-- assets/data/words/[a-z].wiktionary-v1.txt.gz

Rust source:
wasm/word-unscrambler-engine/src/lib.rs
```

## Runtime Initialization

The HTML loads scripts with `defer` in this order:

1. Input rules.
2. History storage.
3. WASM bridge.
4. Main Word Unscrambler UI script.

The bridge immediately creates `window.MonkeyTacticsWasm` and starts a dynamic import of the `wasm-pack` JavaScript loader. Its `ready` promise resolves only after:

1. The generated JavaScript module is imported.
2. The `.wasm` binary is fetched and instantiated.
3. Rust's `verify_domain` function authorizes `window.location.hostname`.

The main UI waits for `MonkeyTacticsWasm.ready` before fetching the dictionary manifest or enabling the Unscramble button. Every public bridge method also calls `requireEngine`, preventing calls before initialization or after failed authorization.

### Asset versioning

Cloudflare serves `/assets/*` with a one-year immutable cache policy. `wasm-bridge.js` therefore applies the same explicit version token to both generated assets:

```text
word_unscrambler_engine.js?v=<version>
word_unscrambler_engine_bg.wasm?v=<version>
```

The script references in `word-unscrambler.html` are versioned as well. When rebuilding or changing the engine, the version in the bridge and HTML must be incremented so browsers do not execute an older WASM binary.

## Host Authorization

Authorization occurs inside the Rust module through `verify_domain(host)`. The current allowlist accepts:

- `monkeytactics.com`
- `monkeytactics-calculators.pages.dev`
- Any subdomain ending in `.monkeytactics-calculators.pages.dev`
- `127.0.0.1` for local Wrangler development, regardless of port

The browser passes `window.location.hostname`, which does not include the protocol or port. Consequently, `http://127.0.0.1:8788` is checked as `127.0.0.1`.

The Pages suffix check requires a leading dot. A lookalike hostname such as `evilmonkeytactics-calculators.pages.dev` is not authorized.

This check prevents the application from enabling its engine on an unapproved host. It is a client-side distribution control, not a substitute for server-side access control or cryptographic licensing, because a downloaded WASM binary can be inspected or modified by a determined third party.

## Dictionary Storage

The Standard dictionary contains 172,820 words sourced from ENABLE. Expanded contains 854,775 normalized ASCII words derived from Wiktionary. Their 867,177-word union is split into 26 gzip-compressed shards based on the first letter of each word.

The manifest describes:

- Format version and encoding.
- Total word count.
- Dictionary source metadata.
- Filename, word count, compressed size, and SHA-256 digest for each shard.

Each decompressed shard is newline-delimited. A record has this format:

```text
word<TAB>membership
```

Membership is a bit mask:

| Value | Meaning |
| ---: | --- |
| `1` | ENABLE |
| `2` | Wiktionary (Expanded) |
| `3` | ENABLE + Wiktionary (Both) |

Search selection uses the same bit values. A word belongs to the selected dictionary when:

```text
word_membership & selected_dictionary_bit != 0
```

Words present in both sources carry membership value `3`, so either individual dictionary and the combined option can find them without duplicate records.

## Lazy Dictionary Loading

The browser retains the existing first-letter shard strategy to reduce initial transfer and memory usage.

For an ordinary rack without wildcards, every result must begin with one of the rack's letters. JavaScript therefore loads only the unique first-letter shards represented in the rack. For example, `RETAINS` requires the `a`, `e`, `i`, `n`, `r`, `s`, and `t` shards.

All 26 shards are loaded when:

- The rack contains `?`, because a wildcard may become any first letter.
- Hook filtering or hook sorting is active, because a front hook may begin with any letter.
- A user expands Hook Lookup for a result.

Loaded shard names and in-flight promises are cached in JavaScript. This prevents repeated downloads and coalesces concurrent requests for the same shard.

### Decompression

`decodeChunk` reads the response as bytes and checks for the gzip magic bytes `1f 8b`. Some hosts transparently decompress gzip responses, so bytes without that signature are decoded directly. Otherwise, the browser's `DecompressionStream("gzip")` API decompresses the payload.

The resulting record array is passed to Rust through `init_engine`. Initialization is additive: each call indexes another shard without discarding previously loaded data.

## Rust Engine State

The engine is stored in a thread-local `RefCell<Engine>`. Browser WebAssembly currently invokes it synchronously on the main JavaScript thread, while `RefCell` provides controlled interior mutability for exported functions.

`Engine` owns these primary structures:

| Structure | Purpose |
| --- | --- |
| `HashMap<String, Vec<String>> signature_map` | Maps a canonical sorted-letter signature to all words with that signature. |
| `HashMap<usize, Vec<String>> signatures_by_length` | Limits candidate signatures to the requested word length. |
| `HashMap<String, WordInfo> metadata` | Stores dictionary membership, score, vowel count, and 26 letter counts for every word. |
| `Vec<String> enable_words` | Tracks words belonging to ENABLE. |
| `Vec<String> expanded_words` | Reserved for the future Expanded dictionary. |
| `HashMap<(String, u8), HookInfo> hook_maps` | Caches hook results by word and dictionary selection. |

### Canonical signatures

A word's signature is its ASCII letters sorted in ascending order:

```text
listen -> eilnst
silent -> eilnst
```

Words sharing a signature are grouped together. The length index avoids scanning signatures that cannot satisfy the active length range.

### Precomputed metadata

When a word is indexed, Rust computes and stores:

- Dictionary membership bit mask.
- Scrabble score.
- Vowel count.
- A fixed 26-element letter frequency array.

This avoids recounting letters and rescoring words during every filter pass.

Duplicate records do not create duplicate search entries. If a word is seen again with additional dictionary membership, its membership is merged and the appropriate dictionary list is updated.

Any newly indexed data clears the hook cache because a newly loaded shard can add a previously unknown front or back hook.

## Search Request Contract

JavaScript calls:

```js
Engine.unscramble(rack, pattern, options)
```

The bridge forwards this to Rust's `unscramble` export. `serde-wasm-bindgen` converts the JavaScript options object into `SearchOptions`.

The options include:

- Dictionary bit.
- Exact word length, or zero for any buildable length.
- Starts-with and ends-with strings.
- Required and excluded letters.
- High-value-letter requirement.
- Minimum vowel and consonant counts.
- Minimum and maximum Scrabble score.
- Hook filter.
- Sort mode.

The pattern is passed separately and also remains in the JavaScript options object for UI/history use.

## Search Pipeline

### 1. Rack preparation

Rust converts the rack into:

- A fixed `[u8; 26]` count array for known letters.
- A wildcard count for `?` tiles.

The maximum candidate length is the rack length unless an exact word length is selected. Results shorter than two letters are excluded.

### 2. Pattern feasibility

The pattern language supports:

- A literal letter for an exact position.
- `?` for exactly one letter.
- `*` for zero or more letters.

Before scanning candidates, the engine calculates the pattern's minimum possible length and whether it has variable length. Impossible exact-length and pattern combinations return immediately.

### 3. Signature traversal

The engine iterates only signature groups in allowed lengths. `can_build` compares the sorted signature against rack counts and spends wildcard tiles on missing letters. A signature is rejected as soon as it requires more missing letters than available wildcards.

### 4. Word filters

Words under a buildable signature are checked in Rust for:

1. Dictionary membership.
2. Pattern match.
3. Starts-with constraint.
4. Ends-with constraint.
5. Excluded letters.
6. High-value letters (`j`, `q`, `x`, or `z`).
7. Minimum vowels.
8. Minimum consonants.
9. Score range.
10. Required letter multiplicity.
11. Hook filter.

Required letters use a copy of the precomputed frequency array, so repeated requirements are handled correctly. For example, requiring `ee` needs two occurrences rather than one.

### 5. Glob pattern matching

Pattern matching uses a custom iterative glob matcher instead of a regular-expression engine. It advances through word and pattern bytes directly and stores the latest `*` position for backtracking. This avoids regular-expression compilation and keeps the WASM dependency set small.

### 6. Sorting

Rust performs the final ordering. Supported modes include:

- Longest or shortest first.
- Alphabetical.
- Highest Scrabble score.
- High-value-tile priority.
- Seven-letter bingo priority.
- Total, S, front, or back hook priority.
- Pattern-match strength.

All non-alphabetical sorts use deterministic tie breakers, ending with length and alphabetical order. Hook sort values are computed once per matching word before sorting rather than allocating or recalculating during every comparison.

### 7. Result return

The engine returns an ordered JavaScript array of lowercase words. JavaScript does not reorder or refilter this array; it uses it for DOM rendering, result grouping, history metrics, and charts.

## Scrabble Scoring

`score_word` applies standard English Scrabble tile values in Rust. Scores are also stored in `WordInfo` for dictionary words and reused by search filters and sort modes.

The UI calls the WASM scoring export for displayed scores and score-based charts. Board multipliers and blank-tile zero scoring are not applied; rack wildcards affect buildability and highlighting, while result words display their base letter score.

## Hook Detection

For a word, hook detection checks each letter from `a` through `z`:

```text
front candidate = letter + word
back candidate  = word + letter
```

Each candidate is looked up in the metadata map and checked against the selected dictionary bit. The result contains:

```js
{
  front: ["..."],
  back: ["..."],
  hasSHook: true | false,
  total: number
}
```

`find_hooks` searches the union of both dictionaries. The UI uses the additional `find_hooks_for_dictionary` export so badges, filters, sorting, and expanded Hook Lookup respect the user's active dictionary.

Hook results are cached by `(word, dictionaryBit)` until more dictionary data is indexed.

## Word Analysis and Charts

`analyze_word` returns:

- Length.
- Vowel, consonant, and wildcard counts.
- Raw Shannon entropy.
- Normalized entropy.
- A 0-100 entropy score.
- Scrabble score.
- Sorted high-value letters.
- Tile-value distribution.
- Letter distribution.

Rust hash maps are serialized by `serde-wasm-bindgen` as JavaScript `Map` instances. Consumers therefore use calls such as `analysis.tileDistribution.get(points)` rather than object property indexing.

`board_fit_analysis` compares all rack-buildable dictionary words with the active length, pattern, start, and end constraints. It returns candidate, fitting, and excluded counts for the UI's board-fit chart.

The remaining chart code is presentation logic in JavaScript. It aggregates result arrays, creates labels and percentages, and renders DOM elements without reimplementing the core dictionary search.

## UI Responsibilities

`assets/js/tools/word-unscrambler/word-unscrambler.js` remains responsible for browser-specific behavior:

- Reading and validating controls.
- Parsing the rack/pattern smart input.
- Loading and decompressing dictionary shards.
- Waiting for WASM readiness.
- Building the Rust options object.
- Rendering result cards, badges, groups, charts, and messages.
- Managing keyboard shortcuts and focus.
- Saving and restoring local search history.
- Opening external dictionary links.

This separation keeps the existing UI independent of Rust implementation details. The bridge preserves small, stable JavaScript contracts while computational work remains inside WASM.

## WASM Exports

| Rust export | JavaScript bridge method | Purpose |
| --- | --- | --- |
| `verify_domain` | Used during `ready` | Authorize the browser hostname. |
| `init_engine` | `initEngine` | Add decompressed dictionary records to indexes. |
| `unscramble` | `unscramble` | Search, filter, and sort words. |
| `crossword_search` | `crosswordSearch` | Search pattern-first without a rack constraint, or optionally enforce an available-letter pool. |
| `score_word` | `scoreWord` | Return a word's base Scrabble score. |
| `find_hooks` | Direct generated API | Find hooks against the dictionary union. |
| `find_hooks_for_dictionary` | `findHooks` | Find hooks for the selected dictionary bit. |
| `analyze_word` | `analyzeWord` | Return letter, score, and entropy metrics. |
| `board_fit_analysis` | `boardFitAnalysis` | Return buildable versus board-filtered counts. |

## Build and Generated Artifacts

The Rust crate is built with `wasm-pack` for the web target:

```powershell
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
wasm-pack build wasm/word-unscrambler-engine `
  --target web `
  --release `
  --out-dir ../../assets/wasm/word-unscrambler `
  --out-name word_unscrambler_engine
```

Release settings enable link-time optimization, one code-generation unit, size optimization, panic aborts, and symbol stripping. `wasm-opt` is disabled in `Cargo.toml` because the optimizer bundled with the installed `wasm-pack` version does not understand the bulk-memory instructions emitted by the current Rust compiler.

Generated browser artifacts under `assets/wasm/word-unscrambler/` are committed because the static Cloudflare Pages deployment does not run a Rust build. Cargo's `target/` directory is disposable compiler output and is excluded by `.gitignore`.

After rebuilding:

1. Remove the generated nested `.gitignore` if `wasm-pack` creates one, otherwise it hides the generated package from the repository.
2. Increment `ASSET_VERSION` in `assets/js/tools/word-unscrambler/wasm-bridge.js`.
3. Increment the bridge and main-script query versions in `tools/word-unscrambler.html`.
4. Run the Rust and Node test suites.
5. Commit the updated generated JavaScript and `.wasm` binary with the Rust source.

## Testing

Rust unit tests in `src/lib.rs` cover:

- Wildcard and pattern matching.
- Dictionary membership.
- Score filtering and sorting.
- Dictionary-specific hooks.
- Word analysis and scoring.
- Glob matching.
- Host authorization and lookalike rejection.

The Node integration test `tests/word-unscrambler-wasm.test.mjs` loads the actual generated `.wasm` binary and verifies the JavaScript-facing serialization contract for authorization, initialization, search results, scoring, hooks, board-fit analysis, entropy, and tile distributions.

Run the relevant suites from the repository root:

```powershell
cargo test --manifest-path wasm/word-unscrambler-engine/Cargo.toml
cargo clippy --manifest-path wasm/word-unscrambler-engine/Cargo.toml --all-targets -- -D warnings
node --test tests/*.test.cjs tests/*.test.mjs
```

## Performance Characteristics

The architecture reduces routine work through:

- First-letter shard loading for ordinary racks.
- Gzip-compressed static word data.
- Length-indexed canonical signatures.
- Fixed-size letter count arrays.
- Precomputed membership, vowel count, and score metadata.
- Early rejection of impossible lengths and patterns.
- Early exit during wildcard buildability checks.
- Cached shard requests and hook results.
- Rust-side sorting with deterministic tie breakers.

The worst-case path is intentionally deferred. Wildcard and hook operations may load and index the complete dictionary, but normal rack searches usually transfer and index only a subset of shards.

## Operational Constraints

- The engine is synchronous after initialization. Very broad searches execute on the browser's main thread.
- Dictionary indexes live for the page lifetime and grow as more shards are loaded.
- Hook cache entries are cleared whenever a new shard is indexed.
- The current data model assumes lowercase ASCII dictionary words.
- The UI limits rack and pattern size before calling Rust.
- Browser support requires WebAssembly, dynamic modules, and `DecompressionStream` when the host does not transparently decode gzip.
- Any engine or generated-package update requires an asset-version bump because of immutable caching.
