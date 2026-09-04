import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const wordsDirectory = new URL("../assets/data/words/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.wiktionary-v1.json", wordsDirectory), "utf8"));

test("Wiktionary dictionary manifest publishes all three memberships", () => {
  assert.deepEqual(manifest.membership, { standard: 1, expanded: 2, both: 3 });
  assert.equal(Object.keys(manifest.chunks).join(""), "abcdefghijklmnopqrstuvwxyz");
  assert.ok(manifest.sourceCounts.standard > 170_000);
  assert.ok(manifest.sourceCounts.expanded > 850_000);
  assert.ok(manifest.sourceCounts.overlap > 150_000);
  assert.equal(manifest.sources[1].name, "Wiktionary");
  assert.equal(manifest.sources[1].packageVersion, "1.5.0");
});

test("dictionary shards distinguish ENABLE, Wiktionary, and shared words", async () => {
  const chunk = gunzipSync(await readFile(new URL(manifest.chunks.c.file, wordsDirectory))).toString("utf8");
  assert.match(chunk, /^colourise\t2$/m);
  assert.match(chunk, /^colour\t3$/m);
  assert.match(chunk, /^cabala\t1$/m);
});

test("every solver loader uses the Wiktionary manifest", async () => {
  const loaders = [
    "../assets/js/shared/dictionary-offline-controls.js",
    "../assets/js/tools/absurdle-solver.js",
    "../assets/js/tools/antiwordle-helper.js",
    "../assets/js/tools/crossword-solver.js",
    "../assets/js/tools/multi-board-word-solver.js",
    "../assets/js/tools/wordiply-solver.js",
    "../assets/js/tools/wordle-helper.js",
    "../assets/js/tools/word-unscrambler/word-unscrambler.js"
  ];
  for (const loader of loaders) {
    assert.match(await readFile(new URL(loader, import.meta.url), "utf8"), /manifest\.wiktionary-v1\.json/);
  }
});
