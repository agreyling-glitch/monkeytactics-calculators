# Third-Party Notices

MonkeyTactics application source code is licensed separately under the repository's
MIT License. The Word Unscrambler includes a deduplicated, transformed merge of the
following third-party word lists.

## ENABLE

- Source: <https://www.norvig.com/ngrams/enable1.txt>
- Name: Enhanced North American Benchmark LExicon (ENABLE)
- Authors and compilers include Alan Beale and M. Cooper
- License status: Public Domain

The ENABLE master word list was formally released into the public domain for anyone
to use, modify, and distribute.

## potch/sowpods

- Source: <https://github.com/potch/sowpods>
- npm package: `sowpods`
- Version: `1.1.0`
- Upstream package author: `potch`
- License declared in the upstream `package.json`: ISC

The published npm artifact contains `SOWPODS.txt`, `index.js`, and `package.json`.
It declares the ISC license in its package metadata but does not include a separate
license file. The following ISC notice is retained with the redistributed and
transformed word data:

### ISC License

Copyright (c) potch

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT,
OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS
SOFTWARE.

## JavaScript libraries

### jsQR

- Version: `1.4.0`
- Purpose: Client-side QR code decoding
- Distribution: Embedded in `tools/qr-code-decoder.html`
- Source: <https://github.com/cozmo/jsQR>
- License: Apache License 2.0
- Full license: [Apache License 2.0](licenses/apache-2.0.txt)

### Tesseract.js

- Major version: `5`
- Purpose: Client-side optical character recognition in the OCR Utility
- Distribution: Loaded from jsDelivr by `tools/ocr-utility.html`
- Source: <https://github.com/naptha/tesseract.js>
- License: Apache License 2.0
- Full license: [Apache License 2.0](licenses/apache-2.0.txt)

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
