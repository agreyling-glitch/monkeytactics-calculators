# Word Unscrambler Technical Architecture

## Overview

Word Unscrambler and Words With Friends Solver share a static browser application with a Rust engine compiled to WebAssembly. HTML and CSS define the interface, JavaScript manages browser concerns, and Rust owns dictionary indexing and search. The WWF page selects its tile values and 35-point bingo bonus through `data-word-game="wwf"`; Word Unscrambler uses Scrabble values and a 50-point bonus.

No word data or search input is sent to a server. The browser downloads static dictionary shards and performs all indexing, matching, filtering, scoring, sorting, hook detection, and word analysis locally.

## Component Map

```text
tools/word-unscrambler.html / tools/words-with-friends-solver.html
  |
  +-- input-rules.js, history-store.js, pick-list-store.js
  |     Input limits and local saved work
  |
  +-- wasm-bridge.js -> generated WASM
  |     Small synchronous scoring and word/play analysis, no dictionary indexing
  |
  +-- search-worker-client.js -> search-worker.js -> generated WASM
  |     Asynchronous request IDs, initialization, dictionary indexing, searches,
  |     hooks, and board-fit analysis; the worker owns the dictionary index
  |
  +-- dictionary-loader.js
  |     Selected manifest, bounded shard fetching, gzip decoding, worker initEngine
  |       +-- assets/data/words/manifest.enable-v1.json
  |       +-- assets/data/words/[a-z].enable-v1.txt.gz
  |       +-- assets/data/words/manifest.wiktionary-v1.json
  |       +-- assets/data/words/[a-z].wiktionary-v1.txt.gz
  |
  +-- word-unscrambler.js
        Form state, result rendering, lazy word details, history, picks, offline mode

JavaScript modules: assets/js/tools/word-unscrambler/
Generated WASM: assets/wasm/word-unscrambler/
Rust source: wasm/word-unscrambler-engine/src/lib.rs
```

## Runtime Initialization

Both pages load deferred scripts in dependency order: input rules, History and Pick List stores, WASM bridge, worker client, dictionary loader, shared UI services, then the main solver script.

`window.MonkeyTacticsWasm` imports and authorizes the generated WASM module for small synchronous operations such as `analyzePlay` and letter scoring. `window.MonkeyTacticsSearchWorker` starts a classic worker whose dynamic import creates a separate authorized WASM instance. This second instance owns all dictionary records and performs indexing, search, hook detection, and board-fit analysis away from the UI thread.

The main UI awaits both readiness promises and the selected dictionary manifest before enabling Unscramble. It creates one loader with `MonkeyTacticsWordDictionary.create(SearchEngine)`; decoded shard text is sent to the worker, where it is split into records and indexed. The window instance does not receive dictionary shards.

The worker client uses increasing request IDs and a pending-promise map. It propagates per-request errors, rejects pending work on fatal startup or worker errors, and uses a 60-second timeout for startup and requests. Worker support is required; there is no main-thread dictionary-search fallback. Search revisions in the UI prevent stale responses from replacing a more recent search or Clear search action.

### Asset versioning

Cloudflare serves `/assets/*` with a one-year immutable cache policy. The bridge and worker apply the same explicit version token to both generated assets:

```text
word_unscrambler_engine.js?v=<version>
word_unscrambler_engine_bg.wasm?v=<version>
```

Keep the bridge, worker, worker-client URL, and offline engine asset URLs on the same engine release token, currently `20261012-solvers-3`, across all ten consuming word-game pages. The page controller, shared dictionary/offline controls, and solver offline packages use `20261012-solvers-11`; the play/refill module uses `20261012-solvers-9`; the comparison module and comparison/play stylesheets use `20261012-solvers-7`; shared dictionary and base solver stylesheets use `20261012-solvers-5`. Offline packages include the worker script, generated WASM, both dictionary datasets, local definitions, and the comparison and play/refill assets.

Offline package upgrades refresh the page shell and unversioned scripts using an `offline-update` query parameter on the network request, while storing responses under the original URLs. This prevents older service workers from substituting stale cached shells during an upgrade. Versioned dictionary and engine assets can be reused. A new package is activated and older packages for that tool are removed only after every required file is verified; a failed download preserves the previous package.

Word Details displays ENABLE and/or Expanded badges using actual dictionary membership. On hover or keyboard focus, `createDictionarySource` loads the combined shard for the word's first letter, then calls the worker's `dictionaryMembership(word)` API. This supplies both membership bits even when the search used only Standard data; it does not infer membership from the selected dictionary. The row loads once per result and can retry after a failed lookup.

## Host Authorization

Authorization occurs inside the Rust module through `verify_domain(host)`. The current allowlist accepts:

- `monkeytactics.com`
- `monkeytactics-calculators.pages.dev`
- Any subdomain ending in `.monkeytactics-calculators.pages.dev`
- `127.0.0.1` for local Wrangler development, regardless of port

The bridge passes `window.location.hostname` and the worker passes `self.location.hostname`; neither includes the protocol or port. Consequently, `http://127.0.0.1:8788` is checked as `127.0.0.1`.

The Pages suffix check requires a leading dot. A lookalike hostname such as `evilmonkeytactics-calculators.pages.dev` is not authorized.

This check prevents the application from enabling its engine on an unapproved host. It is a client-side distribution control, not a substitute for server-side access control or cryptographic licensing, because a downloaded WASM binary can be inspected or modified by a determined third party.

## Dictionary Storage

The Standard dictionary contains 172,820 words sourced from ENABLE. Expanded contains 854,775 normalized ASCII words derived from Wiktionary. Both the 172,820-word ENABLE dataset and the 867,177-word combined dataset have 26 gzip-compressed shards based on the first letter of each word. Standard selects `manifest.enable-v1.json`; Expanded and Both select `manifest.wiktionary-v1.json` and apply membership filtering in Rust. Loading all Standard shards transfers about 464 KB compressed, compared with about 2.68 MB for the combined shards.

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

`dictionary-loader.js` owns manifests, in-flight requests, and loaded-shard state. Cache keys include the source and letter. A previously loaded combined shard also satisfies a Standard request; loading combined data after Standard merges membership bits into existing word records without duplication. Failed requests are removed from the in-flight cache so a later search can retry. A shared queue limits shard fetch/decode/index operations to four at once.

An ordinary rack without blanks needs only the distinct first-letter shards represented in the rack. For example, `RETAINS` loads `a`, `e`, `i`, `n`, `r`, `s`, and `t` from the selected dataset. In board mode, a fixed first board letter can narrow the fetch to that letter; otherwise the UI includes possible rack and board starting letters.

All selected-dataset shards are loaded for unrestricted word lists, rack blanks, hook filters and sorts, or expanded front/back hook lookup. Saved-pick S-hook flags need only the first-letter shards of the saved words, because appending S preserves the first letter. They do not trigger a complete dictionary download.

### Decompression

The loader inspects response bytes for the gzip magic bytes `1f 8b`. Hosts can transparently decompress `.gz` responses, so data without that signature is decoded directly. Otherwise, `DecompressionStream("gzip")` decompresses it. Decoded text crosses the worker boundary once per shard. Record splitting, Rust metadata creation, and index construction happen inside the worker.

Initialization is additive. Loaded indexes live for the page lifetime, and switching dictionaries reuses data already present while each search still enforces its selected membership mask.

## Rust Engine State

The engine is stored in a thread-local `RefCell<Engine>`. Each WASM instance owns separate state. Export calls are synchronous within their thread, but the dictionary instance runs in the Web Worker and returns results to the UI through promises. `RefCell` provides controlled interior mutability for exported functions.

`Engine` owns these primary structures:

| Structure | Purpose |
| --- | --- |
| `HashMap<String, Vec<String>> signature_map` | Maps a canonical sorted-letter signature to all words with that signature. |
| `HashMap<usize, Vec<String>> signatures_by_length` | Limits candidate signatures to the requested word length. |
| `HashMap<String, WordInfo> metadata` | Stores dictionary membership, score, vowel count, and 26 letter counts for every word. |
| `Vec<String> enable_words` | Tracks words belonging to ENABLE. |
| `Vec<String> expanded_words` | Tracks words belonging to Wiktionary. |
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
await SearchEngine.unscramble(rack, pattern, options)
```

The worker forwards this to Rust's `unscramble` export. `serde-wasm-bindgen` converts the JavaScript options object into `SearchOptions`.

The options include:

- Dictionary bit.
- Exact word length, or zero for any buildable length.
- Starts-with and ends-with strings.
- Required and excluded letters.
- High-value-letter requirement.
- Minimum vowel and consonant counts.
- Minimum and maximum play score.
- Scoring scheme: `scrabble` or `wwf`.
- Optional `boardPattern`: fixed board letters and `?` spaces to fill.
- Hook filter.
- Sort mode.

The ordinary rack pattern is passed separately and also remains in the JavaScript options object for UI/history use. It filters words buildable from the rack. `boardPattern` is a distinct option: its literal letters do not consume rack tiles, and each `?` must consume a matching rack tile or a blank. Rack `CT` with board `?A?` can form CAT. A checked board toggle with an empty or whitespace-only field runs a normal rack search and shows no board filter chip. A nonempty board pattern requires fixed letters and at least one space, rejects stars and unrestricted rack searches, and makes word length equal to the board pattern. History stores the toggle and pattern; saved picks store the play context.

## Search Pipeline

### 1. Rack preparation

Rust converts the rack into:

- A fixed `[u8; 26]` count array for known letters.
- A wildcard count for `?` tiles.

The maximum candidate length is the rack length unless an exact word length is selected. Board mode instead fixes candidate length to the board pattern and adds its fixed letters to the signature prefilter pool. A positional play check then verifies that only the open spaces consume rack tiles. Results shorter than two letters are excluded.

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
- Highest play score using the selected game values and zero-point rack blanks.
- High-value-tile priority.
- Bingo priority for plays using seven rack tiles; board letters do not count as played tiles.
- Total, S, front, or back hook priority.
- Pattern-match strength.

All non-alphabetical sorts use deterministic tie breakers, ending with length and alphabetical order. Hook sort values are computed once per matching word before sorting rather than allocating or recalculating during every comparison.

### 7. Result return

The engine returns an ordered JavaScript array of lowercase words. JavaScript does not reorder or refilter this array; it uses it for DOM rendering, result grouping, history metrics, and charts.

## Play Scoring

`score_word` and `score_wwf_word` return base English Scrabble and WWF letter scores. Search uses the selected `scoring` scheme and evaluates actual tile assignment for each rack play. Known rack tiles are used before blanks; blanks contribute zero. Fixed board letters contribute their normal value without consuming rack tiles. Min/max score filters and score sorting use this same adjusted play score.

`analyze_play(word, rack, boardPattern, scoring)` exposes the assignment to the UI:

```js
{
  valid: true,
  score: 5,
  blankPositions: [2],
  boardPositions: [],
  tilesUsed: 3,
  leave: "",
  bingo: false
}
```

The example is WWF CAT from rack `CA?`: C is 4, A is 1, and blank T is 0. Positions are zero-based word offsets. In board mode, `CT` + `?A?` produces CAT with board position `[1]`, two rack tiles used, and score 6.

Displayed result scores, score distributions, saved picks, blank/board highlighting, and rack leave share this analysis. The bingo flag depends on using seven rack tiles, so a board extension can be longer than seven letters and still qualify. The +35 WWF or +50 Scrabble bonus is shown separately. Premium squares, cross-word scores, and pre-existing blank board tiles are not modeled. Unrestricted list searches have no rack assignment and display base letter values.

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

`find_hooks` searches the union of both dictionaries. The worker uses the additional `find_hooks_for_dictionary` export so badges, filters, sorting, and expanded Hook Lookup respect the user's active dictionary.

Hook results are cached by `(word, dictionaryBit)` until more dictionary data is indexed.

## Lazy Word Details

Rendering a result creates a rack-leave placeholder. Hovering, focusing, or opening that result starts `loadRackLeave`, which calls play analysis and only then asks the worker for words buildable from the remaining rack. Results are cached by dictionary and sorted leave. Initial rendering no longer runs a leave-word search for each of the up to 250 visible results. Local definitions load when details open; full hook lookups start only when the user expands Available hooks, with a retry button after failure.

Word Details uses one shared controller state so only one popup stays open. Clicking a word pins its details; Close, Escape, clicking outside, or tabbing away dismisses them. Visibility is explicit rather than tied to CSS hover, so dismissal does not reopen the popup while the trigger still has focus. On small screens, details become a scrolling bottom sheet.

`getSearchConflict` catches incompatible board length, insufficient rack tiles, excluded required/board letters, and impossible letter minimums before loading dictionary shards. The result panel explains the conflict and offers a targeted repair. Shared dictionary controls use keyboard-operable radio buttons; changes refresh active rack searches, coalesce duplicate submissions, and suppress responses for the previous dictionary.

`pick-comparison.js` owns a page-local selection of two to four saved picks and a native dialog with a comparison table. Rack-dependent values use each pick's saved rack and board, while hooks use the current dictionary and membership uses the combined first-letter shard. Legacy and unrestricted picks without rack context do not invent tiles-used or leave values. Comparison work starts only on explicit request. The Pick List hook refresh updates rendering without recursively starting another refresh.

`play-refill.js` uses `analyzePlay` to preserve remaining tiles and unused blanks in rack order. Result-card Play validates the current rack and board against the result's search context to reject stale actions. Pick List Play instead uses the current rack and active board at click time, independently of the pick's saved comparison context; older picks without saved rack data can also be played. Invalid or unrestricted current racks are rejected without changing the input. The controller cancels pending searches and clears board/basic/advanced filters for the new turn. Replacement tiles are limited to the number spent, and completing refill searches the new rack. A single Undo snapshot includes the raw smart input, filters, board toggle/pattern, sort, and dictionary. Restoring it cancels stale work and submits exactly once; History and Pick List are retained. Clear search dismisses the refill/Undo controls.

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
- Requesting the necessary dictionary shards through the dedicated loader.
- Waiting for both WASM instances and worker requests.
- Building the Rust options object.
- Rendering result cards, badges, groups, charts, messages, removable filter chips, and recovery actions.
- Keeping sort and quick-length controls beside the results.
- Clearing search state while preserving History and Pick List; browser refresh retains its shortcut.
- Managing keyboard shortcuts and focus.
- Saving and restoring local search history.
- Opening external dictionary links.

This separation keeps the existing UI independent of Rust implementation details. The bridge and worker client preserve small, stable JavaScript contracts while dictionary computation remains inside WASM in the worker.

## WASM Exports

| Rust export | JavaScript bridge method | Purpose |
| --- | --- | --- |
| `verify_domain` | Used during `ready` | Authorize the browser hostname. |
| `init_engine` | `initEngine` | Add decompressed dictionary records to indexes. |
| `unscramble` | `unscramble` | Search, filter, and sort words. |
| `crossword_search` | `crosswordSearch` | Search pattern-first without a rack constraint, or optionally enforce an available-letter pool. |
| `score_word` | `scoreWord` | Return a word's base Scrabble score. |
| `score_wwf_word` | `scoreWwfWord` | Return a word's base WWF score. |
| `analyze_play` | `analyzePlay` | Return rack-aware score, blank and board positions, leave, tile use, and bingo eligibility. |
| `find_hooks` | Direct generated API | Find hooks against the dictionary union. |
| `find_hooks_for_dictionary` | `findHooks` | Find hooks for the selected dictionary bit. |
| `analyze_word` / `analyze_wwf_word` | `analyzeWord` / `analyzeWwfWord` | Return letter, score, and entropy metrics for the game. |
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
2. Increment `ASSET_VERSION` in the bridge, worker, and worker client.
3. Update modified asset query versions in both solver pages and the offline asset list.
4. Run the Rust and Node test suites.
5. Commit the updated generated JavaScript and `.wasm` binary with the Rust source.

## Testing

Rust unit tests in `src/lib.rs` cover:

- Wildcard and pattern matching.
- Dictionary membership.
- Blank-adjusted score filtering and sorting in both games.
- Board-position assignment, repeated letters, rack leaves, and seven-tile bingo eligibility.
- Dictionary-specific hooks.
- Word analysis and scoring.
- Glob matching.
- Host authorization and lookalike rejection.

The Node integration test `tests/word-unscrambler-wasm.test.mjs` loads the actual generated `.wasm` binary and verifies the JavaScript-facing serialization contract for authorization, initialization, search results, scoring, hooks, board-fit analysis, entropy, and tile distributions.

Worker-client tests cover request ordering, errors, and timeouts; worker tests exercise indexed searches through the message protocol. Dictionary-loader tests verify selected-source fetching, concurrency, membership upgrades, retries, and offline asset coverage.

Run the relevant suites from the repository root:

```powershell
cargo test --manifest-path wasm/word-unscrambler-engine/Cargo.toml
cargo clippy --manifest-path wasm/word-unscrambler-engine/Cargo.toml --all-targets -- -D warnings
node --test tests/*.test.cjs tests/*.test.mjs
```

## Performance Characteristics

The architecture reduces routine work through:

- The smaller ENABLE dataset for Standard searches.
- First-letter shard loading for ordinary racks and saved-pick S-hook checks.
- Worker-owned indexing and searches to keep typing and scrolling responsive.
- Rack-leave searches deferred until a result is opened.
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

- Engine calls are synchronous within the worker. Large searches can delay later worker requests, while the UI remains responsive; revisions prevent stale rendering.
- Dictionary indexes live for the page lifetime and grow as more shards are loaded.
- Hook cache entries are cleared whenever a new shard is indexed.
- The current data model assumes lowercase ASCII dictionary words.
- The UI limits rack and pattern size before calling Rust.
- Browser support requires WebAssembly, Web Workers, dynamic modules, and `DecompressionStream` when the host does not transparently decode gzip.
- Any engine or generated-package update requires an asset-version bump because of immutable caching.
