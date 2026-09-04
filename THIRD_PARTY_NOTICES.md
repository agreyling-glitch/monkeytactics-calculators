# Third-Party Notices

MonkeyTactics application source code is licensed separately under the repository's
MIT License. The Standard dictionary used by the word tools is a transformed copy
of the following third-party word list.

## ENABLE

- Source: <https://www.norvig.com/ngrams/enable1.txt>
- Name: Enhanced North American Benchmark LExicon (ENABLE)
- Authors and compilers include Alan Beale and M. Cooper
- License status: Public Domain

The ENABLE master word list was formally released into the public domain for anyone
to use, modify, and distribute.

## Princeton WordNet 3.0

- Source: <https://wordnetcode.princeton.edu/3.0/WNdb-3.0.tar.gz>
- Version: `3.0`
- Purpose: Source glosses and lexical metadata for Crossword Clue Search feasibility work
- License: Princeton WordNet 3.0 License
- Full license: [WordNet 3.0 license](licenses/wordnet-3.0.txt)
- Provenance and checksum: [WordNet source record](docs/crossword-clue-search/wordnet-3.0-source.json)

WordNet permits use, copying, modification, and distribution without fee or royalty
when its copyright notice, statements, and disclaimer are retained on all copies.
The generated feasibility records retain per-record WordNet source identifiers.

## JavaScript libraries

### rqrr

- Version: `0.10.1`
- Purpose: Primary QR detection and decoding in the Rust/WebAssembly decoder
- Source: <https://github.com/WanzenBug/rqrr>
- License: `(MIT OR Apache-2.0) AND ISC`
- Full Apache license: [Apache License 2.0](licenses/apache-2.0.txt)
- MIT and ISC notices: [rqrr notices](licenses/rqrr-MIT-ISC.txt)

### zxing-wasm and ZXing-C++

- zxing-wasm version: `2.2.2`
- Purpose: Cross-browser local QR decoding fallback
- Distribution: Self-hosted JavaScript and WebAssembly reader assets
- Sources: <https://github.com/Sec-ant/zxing-wasm>, <https://github.com/zxing-cpp/zxing-cpp>
- Licenses: zxing-wasm is MIT; ZXing-C++ is Apache License 2.0
- Full Apache license: [Apache License 2.0](licenses/apache-2.0.txt)
- zxing-wasm MIT notice: [zxing-wasm MIT notice](licenses/zxing-wasm-MIT.txt)

### Tesseract.js

- Major version: `5`
- Purpose: Client-side optical character recognition in the OCR Utility
- Distribution: Loaded from jsDelivr by `tools/ocr-utility.html`
- Source: <https://github.com/naptha/tesseract.js>
- License: Apache License 2.0
- Full license: [Apache License 2.0](licenses/apache-2.0.txt)

### heic-to

- Version: `1.5.2`
- Purpose: Browser-local HEIC/HEIF conversion for the QR Code Decoder
- Distribution: Self-hosted JavaScript bundle
- Source: <https://github.com/hoppergee/heic-to>
- License: GNU Lesser General Public License 3.0 or later
- Full license: [heic-to LGPL notice](licenses/heic-to-LGPL-3.0.txt)

### node-qrcode

- npm package: `qrcode`
- Version: `1.1.0`
- Purpose: Client-side QR code generation
- Distribution: Loaded from jsDelivr by the QR Code Generator and QR Code Decoder
- Source: <https://github.com/soldair/node-qrcode>
- License: MIT
- Copyright: Copyright (c) 2012 Ryan Day
- Full license: [node-qrcode MIT notice](licenses/node-qrcode-MIT.txt)

node-qrcode credits “QRCode for JavaScript” by Kazuhiko Arase, which is also
MIT licensed.

The node-qrcode browser bundle contains the following declared dependencies:

- `dijkstrajs` (`^1.0.1`), Copyright (C) 2008 Wyatt Baldwin,
  [MIT notice](licenses/dijkstrajs-MIT.txt)
- `isarray` (`^2.0.1`), Copyright (c) 2013 Julian Gruber,
  [MIT notice](licenses/isarray-MIT.txt)

“QR Code” is a registered trademark of DENSO WAVE INCORPORATED.

## Word-list and trademark notice

The merged list is provided for word-finding and word-game reference. It may contain
uncommon, historical, regional, offensive, or general-dictionary-absent terms.
Inclusion does not guarantee acceptance by any particular dictionary, edition,
region, tournament, or ruleset.

MonkeyTactics is not affiliated with or endorsed by Hasbro, Mattel, Collins, or
Merriam-Webster. SCRABBLE and related marks belong to their respective owners.
