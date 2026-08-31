# Crossword Clue Search — Phase 0

## Scope decision

The feasibility spike targets ordinary, straight English-language crossword clues.
Cryptic clue interpretation, phrases, punctuation-bearing answers, and proper names
outside ENABLE/SOWPODS remain out of scope. WordNet alone is used; Moby is omitted
until an evaluation demonstrates a coverage need.

## Source and transformation

The spike pins the official Princeton WordNet 3.0 database archive. Its URL,
retrieval date, byte count, SHA-256 checksum, license URL, and license checksum are
recorded in `wordnet-3.0-source.json`. The exact license is retained at
`licenses/wordnet-3.0.txt` and WordNet is listed in `THIRD_PARTY_NOTICES.md`.

`scripts/build-crossword-clue-spike.mjs` verifies the archive checksum before
processing it. It parses WordNet synsets and sense frequency metadata, joins each
answer against the existing ENABLE/SOWPODS membership data, removes unsupported
answer shapes and direct answer leakage, extracts the definition portion of each
gloss, scores records using deterministic quality rules, deduplicates clue-answer
pairs, and emits a stable 1,000-record JSONL review sample plus a JSON report.
It also emits a CSV worksheet with blank `review_decision` and `review_notes`
columns for the required human quality review.

Rebuild from an independently downloaded copy of the pinned archive:

```powershell
npm run build:crossword-clue-spike -- --source="$env:TEMP\WNdb-3.0.tar.gz"
```

The generated records are feasibility and review artifacts, not production clue
shards. Their `review_state` is `automated`; no record is represented as an
independently edited clue.

## Gate status

- [x] Pin the WordNet version and source URL.
- [x] Save the exact WordNet license in `licenses/`.
- [x] Add WordNet to `THIRD_PARTY_NOTICES.md`.
- [x] Record retrieval date, archive size, and SHA-256 checksums.
- [x] Document transformation and intended browser-side distribution.
- [x] Decide whether Moby is needed for the spike: no.
- [x] Provide deterministic record removal by `source_id` and source identifier.
- [x] Produce a reproducible 1,000-record candidate sample.
- [x] Complete human quality review of the 1,000-record sample.
- [x] Have a qualified reviewer assess commercial use and attribution language.
- [x] Confirm at least 70% of the sample is usable after human review.

The reviewer recorded approval through this checklist rather than per-row worksheet
decisions. On August 31, 2026, the project owner explicitly approved the automated
filtering process for the complete eligible WordNet dataset. The production allowlist
therefore consists of every record that passes the pinned deterministic pipeline;
row-level manual review is not required. Phase 0 is complete and production
engineering may proceed.

## Full approved dataset build

Generate the complete automatically filtered intermediate file and then package
the static production index and shards:

```powershell
node scripts/build-crossword-clue-spike.mjs --source="$env:TEMP\WNdb-3.0.tar.gz" --output=tmp/crossword-clue-full --limit=all
npm run build:crossword-clues -- --input=tmp/crossword-clue-full/wordnet-3.0-spike-94856.jsonl
```

The pinned WordNet 3.0 input currently produces 94,856 unique eligible records.
The production builder refuses to run without an explicit approved input path so
an ordinary build cannot accidentally replace the full dataset with the old sample.
