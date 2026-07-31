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

MonkeyTactics.com is a growing collection of free online calculators, converters, and utility tools built with lightweight HTML, CSS, and JavaScript. The site is designed for people who want quick answers without sign-ups, account creation, or unnecessary clutter.

Whether you need a percentage calculator, BMI calculator, unit converter, loan calculator, date difference and business days calculator, password generator, browser-based OCR, QR code generator, QR code decoder, word counter, or word unscrambler, MonkeyTactics helps users solve everyday problems in seconds directly from the browser.

This project is especially useful for students, professionals, developers, small business owners, and anyone searching for simple, ad-light tools that work well on desktop and mobile.

---

## ✨ Why This Project Is Useful

- ⚡ Fast-loading, lightweight tools with no build step or framework overhead
- 🧮 Accurate calculators for finance, health, dates, and everyday math
- 📱 Mobile-friendly and responsive across phones, tablets, and desktops
- 🔒 Privacy-first experience with no account requirements and no tracking overload
- 🔎 Search-friendly pages built around clear content, semantic HTML, and fast performance
- ♿ Accessible and easy to use for a broad audience

---

## 🧰 Tools

The site currently features 23 tools across five main categories:

- Finance: [Loan & Mortgage Calculator](https://monkeytactics.com/tools/loan-mortgage-calculator), [Compound Interest Calculator](https://monkeytactics.com/tools/compound-interest-calculator), [Percentage Calculator](https://monkeytactics.com/tools/percentage-calculator)
- Health & Body: [BMI Calculator](https://monkeytactics.com/tools/bmi-calculator), [Calorie Calculator](https://monkeytactics.com/tools/calorie-calculator), [Age Calculator](https://monkeytactics.com/tools/age-calculator)
- Utilities: [Date Difference & Business Days Calculator](https://monkeytactics.com/tools/date-difference-calculator), [Unit Converter](https://monkeytactics.com/tools/unit-converter), [Tip Calculator](https://monkeytactics.com/tools/tip-calculator), [Time Zone Converter](https://monkeytactics.com/tools/time-zone-converter), [QR Code Generator](https://monkeytactics.com/tools/qr-code-generator), [QR Code Decoder](https://monkeytactics.com/tools/qr-code-decoder), [Word Unscrambler](https://monkeytactics.com/tools/word-unscrambler)
- Productivity: [Password Generator](https://monkeytactics.com/tools/password-generator), [Word & Character Counter](https://monkeytactics.com/tools/word-character-counter), [OCR Utility](https://monkeytactics.com/tools/ocr-utility)
- Construction: [Concrete Calculator](https://monkeytactics.com/tools/concrete-calculator), [Drywall Calculator](https://monkeytactics.com/tools/drywall-calculator), [Paint Calculator](https://monkeytactics.com/tools/paint-calculator), [Tile Calculator](https://monkeytactics.com/tools/tile-calculator), [Roofing Shingle Calculator](https://monkeytactics.com/tools/roofing-shingle-calculator), [Lumber Board Foot Calculator](https://monkeytactics.com/tools/lumber-board-foot-calculator), [Insulation Calculator](https://monkeytactics.com/tools/insulation-calculator)

---

## 🗂️ Tool Categories

| Category | Tools | Count |
|---|---|---:|
| **Finance** | Loan & Mortgage, Compound Interest, Percentage | 3 |
| **Health & Body** | BMI, Calorie, Age | 3 |
| **Everyday Utilities** | Date Difference & Business Days, Unit Converter, Tip, Time Zone, QR Generator, QR Decoder, Word Unscrambler | 7 |
| **Productivity** | Password Generator, Word & Character Counter, OCR Utility | 3 |
| **Construction** | Concrete, Drywall, Paint, Tile, Roofing Shingles, Lumber Board Feet, Insulation | 7 |

---

## 🏗️ Architecture Overview

MonkeyTactics is a static, front-end-only site with no server-side application or build step. Each tool uses lightweight HTML, CSS, and JavaScript, with selected browser libraries loaded from a CDN or embedded directly when a specialized capability is required.

The Word Unscrambler uses ENABLE and SOWPODS word lists with per-word source membership, allowing searches against either dictionary or their deduplicated union. Its static dictionary is split into 26 versioned gzip chunks with a small manifest. The browser loads only the chunks relevant to the submitted letters, decompresses them with the native `DecompressionStream` API, and caches the indexed words for later searches. Exact word length, starting and ending letters, wildcard patterns, required/excluded letters, vowel and consonant minimums, score ranges, sorting, and dictionary-aware hooks are applied in the browser. Hook searches load the complete index on demand.

The OCR Utility uses Tesseract.js v5 and WebAssembly to recognize English text entirely in the browser. Uploaded PNG and JPG images are preprocessed with canvas grayscale and contrast enhancement, then passed to a dedicated OCR worker. Images and extracted text are never uploaded to MonkeyTactics.

---

## 🔑 SEO Keywords Covered

This project is built around terms such as:

- free online calculators
- percentage calculator
- BMI calculator
- loan calculator
- mortgage calculator
- unit converter
- date difference calculator business days
- password generator
- OCR utility
- image to text
- extract text from image
- QR code generator
- QR code decoder
- word counter
- word unscrambler
- anagram solver
- Scrabble word finder

These phrases are reflected in the site content, page titles, and tool structure to help users discover the right calculator quickly.

---

## Licensing

MonkeyTactics source code is licensed under the [MIT License](LICENSE). Third-party libraries
and dictionary data remain subject to their respective licenses, including the Apache License
2.0 used by Tesseract.js. See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for sources,
licensing, attribution, and trademark information.

