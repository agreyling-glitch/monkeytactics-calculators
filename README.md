# 🐒 MonkeyTactics.com — Free Online Calculators & Utility Tools

> Fast, privacy-friendly calculators and utilities for everyday math, finance, health, productivity, construction, and web tasks.

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fmonkeytactics.com&label=monkeytactics.com&style=flat-square&color=4CAF50)](https://monkeytactics.com)
[![GitHub Stars](https://img.shields.io/github/stars/agreyling-glitch/monkeytactics-calculators?style=flat-square&color=FFD700)](https://github.com/agreyling-glitch/monkeytactics-calculators/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/agreyling-glitch/monkeytactics-calculators?style=flat-square&color=blue)](https://github.com/agreyling-glitch/monkeytactics-calculators/network/members)
[![Last Commit](https://img.shields.io/github/last-commit/agreyling-glitch/monkeytactics-calculators?style=flat-square)](https://github.com/agreyling-glitch/monkeytactics-calculators/commits/main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

---

## 🔍 What Is MonkeyTactics?

MonkeyTactics.com is a growing collection of free online calculators, converters, generators, and utility tools. The site combines lightweight HTML, CSS, and JavaScript with focused Rust/WebAssembly engines and a Leptos-powered universal navigation system. It is designed for people who want quick answers without sign-ups, account creation, or unnecessary clutter.

Whether you need a percentage calculator, BMI calculator, unit converter, loan calculator, date difference and business days calculator, password generator, browser-based OCR, QR code generator, QR code decoder, word counter, or word unscrambler, MonkeyTactics helps users solve everyday problems in seconds directly from the browser.

This project is especially useful for students, professionals, developers, small business owners, and anyone searching for simple, ad-light tools that work well on desktop and mobile.

---

## ✨ Why This Project Is Useful

- ⚡ Fast-loading static pages with focused Rust/WASM components where they add value
- 🧮 Accurate calculators for finance, health, dates, and everyday math
- 📱 Mobile-friendly and responsive across phones, tablets, and desktops
- 🔒 Privacy-first experience with no account requirements and no tracking overload
- 🔎 Search-friendly pages built around clear content, semantic HTML, and fast performance
- ♿ Accessible and easy to use for a broad audience
- 🧭 A universal hamburger menu and searchable tool hierarchy on every page
- ⌨️ Keyboard navigation for search results with Arrow Up, Arrow Down, and Enter

---

## 🧰 Tools

The site currently features 23 tools organized around the hierarchy used by the universal menu and All Tools directory:

- Finance: [Loan & Mortgage Calculator](https://monkeytactics.com/tools/loan-mortgage-calculator), [Compound Interest Calculator](https://monkeytactics.com/tools/compound-interest-calculator), [Percentage Calculator](https://monkeytactics.com/tools/percentage-calculator)
- Health & Body: [BMI Calculator](https://monkeytactics.com/tools/bmi-calculator), [Daily Energy Needs Calculator](https://monkeytactics.com/tools/calorie-calculator), [Age Calculator](https://monkeytactics.com/tools/age-calculator)
- Utilities: [Date Difference & Business Days Calculator](https://monkeytactics.com/tools/date-difference-calculator), [Unit Converter](https://monkeytactics.com/tools/unit-converter), [Tip Calculator](https://monkeytactics.com/tools/tip-calculator), [Time Zone Converter](https://monkeytactics.com/tools/time-zone-converter), [QR Code Generator](https://monkeytactics.com/tools/qr-code-generator), [QR Code Decoder](https://monkeytactics.com/tools/qr-code-decoder), [Word Unscrambler](https://monkeytactics.com/tools/word-unscrambler)
- Productivity: [Password Generator](https://monkeytactics.com/tools/password-generator), [Word & Character Counter](https://monkeytactics.com/tools/word-character-counter), [OCR Utility](https://monkeytactics.com/tools/ocr-utility)
- Construction: [Concrete Calculator](https://monkeytactics.com/tools/concrete-calculator), [Drywall Calculator](https://monkeytactics.com/tools/drywall-calculator), [Paint Calculator](https://monkeytactics.com/tools/paint-calculator), [Tile Calculator](https://monkeytactics.com/tools/tile-calculator), [Roofing Shingle Calculator](https://monkeytactics.com/tools/roofing-shingle-calculator), [Lumber Board Foot Calculator](https://monkeytactics.com/tools/lumber-board-foot-calculator), [Insulation Calculator](https://monkeytactics.com/tools/insulation-calculator)

---

## 🗂️ Tool Hierarchy

| Menu group | Subgroup | Tools |
|---|---|---|
| **Generators** | — | Advanced QR Code Generator, Password Generator |
| **Calculators** | Finance | Loan & Mortgage, Compound Interest, Percentage |
| **Calculators** | Health | BMI, Daily Energy Needs, Age |
| **Calculators** | Time & Date | Date & Business Days, Time Zone Converter |
| **Calculators** | Construction | Concrete, Drywall, Paint, Tile, Roofing Shingles, Lumber Board Feet, Insulation |
| **Text & Data** | — | Unit Converter, Tip Calculator, QR Code Decoder, Word Unscrambler, Word & Character Counter, OCR Utility |
| **Batch & Automation** | — | Batch QR Generator, Mortgage Scenario Comparison, Business Day Planner, Image Text Extraction |

The All Tools page mirrors this hierarchy. The same structure is rendered by the Rust/WASM hamburger menu on every page, while global search supports pointer and keyboard selection. The homepage highlights Word Unscrambler, Loan & Mortgage Calculator, and Advanced QR Code Generator as the three featured tools.

## 🎨 Interface

The homepage, All Tools directory, and flagship tool pages share a responsive premium visual system with editorial hero panels, clearer workspace separation, consistent green-accented controls, and focused result surfaces. Updated tools include Word Unscrambler, Advanced QR Code Generator, Password Generator, Tip Calculator, Date & Business Days Calculator, Time Zone Converter, BMI Calculator, Daily Energy Needs Calculator, Age Calculator, QR Code Decoder, and OCR Utility.

Top advertising blocks have been removed from the redesigned experiences so the primary workspace follows the page introduction directly. Lower-page advertising placements remain available. Featured tools also include a Trustpilot review invitation near the page footer.

---

## 🏗️ Architecture Overview

MonkeyTactics is primarily a static site built from lightweight HTML, CSS, and JavaScript, with a narrowly scoped Cloudflare Pages Function for dynamic Word Unscrambler routes. Five first-party Rust components compile to WebAssembly. Every generated browser package is committed under `assets/wasm/`, so production hosting does not require a Rust toolchain.

The Word Unscrambler uses ENABLE and SOWPODS word lists with per-word source membership, allowing searches against either dictionary or their deduplicated union. Its static dictionary is split into 26 versioned gzip chunks with a small manifest. The browser loads only the chunks relevant to the submitted letters, decompresses them with the native `DecompressionStream` API, and caches the indexed words for later searches. Exact word length, starting and ending letters, wildcard patterns, required/excluded letters, vowel and consonant minimums, score ranges, sorting, and dictionary-aware hooks are applied in the browser. Hook searches load the complete index on demand.

### Rust/WASM calculators and tools

| Tool | Rust crate | Browser package | Engine responsibilities |
|---|---|---|---|
| [Loan & Mortgage Calculator](https://monkeytactics.com/tools/loan-mortgage-calculator) | `wasm/mortgage-engine` | `assets/wasm/mortgage` | Fixed-rate amortization, monthly and bi-weekly payments, extra payments, and multi-scenario calculations |
| [QR Code Generator](https://monkeytactics.com/tools/qr-code-generator) | `wasm/qr-code-generator-engine` | `assets/wasm/qr-code-generator` | QR encoding, styling, image export, and batch generation |
| [Word Unscrambler](https://monkeytactics.com/tools/word-unscrambler) | `wasm/word-unscrambler-engine` | `assets/wasm/word-unscrambler` | Dictionary indexing, searching, filtering, sorting, scoring, hooks, and word analysis |
| [Word & Character Counter](https://monkeytactics.com/tools/word-character-counter) | `wasm/text-analyzer-engine` | `assets/wasm/text-analyzer` | Local text metrics and structural analysis with a JavaScript fallback |
| Hierarchical site navigation | `wasm/menu-engine` | `assets/wasm/menu` | Domain-verified Leptos header, global search with keyboard navigation, and a hamburger-driven hierarchy drawer rendered on every page |

All five components run locally in the browser. Their Rust source lives under `wasm/`; generated JavaScript bindings and `.wasm` binaries live under `assets/wasm/`.

### Repository ownership

- `tools/` contains production HTML routes only.
- `assets/css/{shared,pages,tools}` and `assets/js/{shared,pages,tools}` contain authored browser assets.
- `assets/generated/qr-studio` and `assets/wasm` contain generated browser output.
- `apps/qr-studio` contains the React/TypeScript QR Studio source.
- `dev/templates` and `dev/archive` contain non-production reference files.
- `functions/` contains the Cloudflare Pages Function used by dynamic word routes.

#### Word Unscrambler integration

The checked-in bridge initializes the generated module before enabling the form:

```html
<script src="../assets/js/tools/word-unscrambler/wasm-bridge.js" defer></script>
<script src="../assets/js/tools/word-unscrambler/word-unscrambler.js" defer></script>
```

Dictionary shards remain lazy-loaded by the existing UI and are passed to `init_engine` as arrays of `word\\tmembership` records. The WASM module authorizes `monkeytactics.com`, the Cloudflare Pages production and preview hosts under `monkeytactics-calculators.pages.dev`, and the local Wrangler host `127.0.0.1`.

The OCR Utility uses Tesseract.js v5 and WebAssembly to recognize English text entirely in the browser. Uploaded PNG and JPG images are preprocessed with canvas grayscale and contrast enhancement, then passed to a dedicated OCR worker. Images and extracted text are never uploaded to MonkeyTactics.


---

## Licensing

MonkeyTactics source code is licensed under the [MIT License](LICENSE). Third-party libraries
and dictionary data remain subject to their respective licenses, including the Apache License
2.0 used by Tesseract.js. See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for sources,
licensing, attribution, and trademark information.

