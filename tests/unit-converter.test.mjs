import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const source = fs.readFileSync(new URL("../assets/js/tools/unit-converter/unit-converter.js", import.meta.url), "utf8");
const { CATEGORIES, buildConversionTable, convert, formatNumber, parseMeasurement, parseCompoundMeasurement } = await import(`data:text/javascript,${encodeURIComponent(source)}`);

test("uses exact defined conversions", () => {
  assert.equal(convert(1, "length", "in", "cm"), 2.54);
  assert.equal(convert(1, "weight", "lb", "kg"), 0.45359237);
  assert.equal(convert(1, "volume", "usgal", "l"), 3.785411784);
  assert.equal(convert(1, "volume", "impgal", "l"), 4.54609);
  assert.equal(convert(36, "speed", "kmh", "mps"), 10);
});

test("supports all enhanced categories", () => {
  for (const key of ["area", "pressure", "energy", "power", "data", "time", "angle", "torque", "density"]) {
    assert.ok(CATEGORIES[key]);
    const [from, to] = Object.keys(CATEGORIES[key].units);
    assert.ok(Number.isFinite(convert(1, key, from, to)));
  }
});

test("every category initializes with a finite default conversion", () => {
  for (const [category, definition] of Object.entries(CATEGORIES)) {
    const [from, to] = Object.keys(definition.units);
    assert.ok(Number.isFinite(convert(1, category, from, to)), `${category} should initialize`);
  }
});

test("converts reciprocal fuel economy units", () => {
  assert.ok(Math.abs(convert(30, "fuel", "mpgus", "l100km") - 7.8404861) < 1e-7);
  assert.ok(Math.abs(convert(7.8404861, "fuel", "l100km", "mpgus") - 30) < 1e-6);
  assert.throws(() => convert(0, "fuel", "mpgus", "l100km"), /greater than zero/);
});

test("parses compatible compound measurements", () => {
  assert.equal(parseCompoundMeasurement("2 km + 350 m", "length", "m"), 2350);
  assert.equal(parseCompoundMeasurement("3 ft + 6 in", "length", "ft"), 3.5);
  assert.ok(Number.isNaN(parseCompoundMeasurement("2 kg + 3 m", "length", "m")));
});

test("page exposes searchable and saved-pair controls through the self-contained module", () => {
  const html = fs.readFileSync(new URL("../tools/unit-converter.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /id="category-search"/);
  assert.match(html, /id="categoryQuick"/);
  assert.match(html, /id="category" hidden/);
  assert.match(html, /id="from-unit-search"/);
  assert.match(html, /list="from-unit-options"/);
  assert.match(html, /id="favoriteBtn"/);
  assert.match(html, /unit-converter\.js\?v=20260916-aligned-table-copy/);
  assert.doesNotMatch(source, /function commitCategoryPicker\(\)/);
  assert.match(source, /function renderCategoryQuick\(\)/);
  assert.match(source, /Object\.keys\(CATEGORIES\)\.sort/);
  assert.match(html, /unit-converter\.css\?v=20260916-category-grid-order/);
  const css = fs.readFileSync(new URL("../assets/css/tools/unit-converter.css", import.meta.url), "utf8");
  assert.match(css, /\.category-chip:hover, \.category-chip:focus-visible \{ border-color: #f5b942 !important/);
});

test("page loads namespaced styles after shared styles and supports Focus Mode", () => {
  const html = fs.readFileSync(new URL("../tools/unit-converter.html", import.meta.url), "utf8");
  assert.ok(html.indexOf("premium-tool.css") < html.indexOf("tools/unit-converter.css"));
  assert.match(html, /data-focus-mode data-focus-mode-label="Unit Converter"/);
  assert.match(html, /assets\/css\/shared\/focus-mode\.css/);
  assert.match(html, /assets\/js\/shared\/focus-mode\.js/);
  const css = fs.readFileSync(new URL("../assets/css/tools/unit-converter.css", import.meta.url), "utf8");
  assert.match(css, /\.unit-tool-page \.tool-widget\.is-focus-mode/);
});

test("page exposes precision controls and private conversion history", () => {
  const html = fs.readFileSync(new URL("../tools/unit-converter.html", import.meta.url), "utf8");
  assert.match(html, /id="precisionSelect"/);
  assert.match(html, /id="notationSelect"/);
  assert.match(html, /id="copyRawBtn"/);
  assert.match(html, /id="historyPanel"/);
  assert.match(html, /id="historyConfirm"/);
  assert.match(source, /function renderHistory\(\)/);
  assert.match(source, /function rememberConversion\(/);
  assert.match(source, /readablePenalty/);
});

test("builds bounded ascending and descending conversion tables", () => {
  const ascending = buildConversionTable(1, 3, 1, "length", "in", "cm");
  assert.deepEqual(ascending.map(row => row.source), [1, 2, 3]);
  assert.deepEqual(ascending.map(row => Number(row.result.toPrecision(12))), [2.54, 5.08, 7.62]);
  assert.deepEqual(buildConversionTable(3, 1, -1, "length", "m", "ft").map(row => row.source), [3, 2, 1]);
  assert.throws(() => buildConversionTable(1, 10, 0, "length", "m", "ft"), /must not be zero/);
  assert.throws(() => buildConversionTable(1, 10, -1, "length", "m", "ft"), /toward the end/);
  assert.throws(() => buildConversionTable(1, 1000, 1, "length", "m", "ft"), /500 rows/);
});

test("page exposes copyable and downloadable conversion tables", () => {
  const html = fs.readFileSync(new URL("../tools/unit-converter.html", import.meta.url), "utf8");
  for (const id of ["conversionTablePanel", "tableStart", "tableEnd", "tableStep", "generateTableBtn", "copyTableBtn", "downloadTableBtn"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(source, /function generateConversionTable\(\)/);
  assert.match(source, /value\.padEnd\(columnWidths\[index\]\)/);
  assert.match(source, /function updateConversionTableHint\(\)/);
  assert.match(source, /updateConversionTableHint\(\);\s*if \(tableSignature/);
  assert.match(source, /text\/csv/);
});

test("rejects impossible temperatures and non-finite values", () => {
  assert.throws(() => convert(-1, "temperature", "k", "c"), /absolute zero/);
  assert.throws(() => convert(Infinity, "length", "m", "ft"), /finite/);
});

test("parses friendly numeric input", () => {
  assert.equal(parseMeasurement("1,250"), 1250);
  assert.equal(parseMeasurement("3 1/2"), 3.5);
  assert.equal(parseMeasurement("1/4"), 0.25);
  assert.equal(parseMeasurement("5' 11\""), 5 + 11 / 12);
  assert.ok(Number.isNaN(parseMeasurement("2 km + 4 m")));
});

test("does not round tiny valid results to zero", () => {
  assert.match(formatNumber(1e-9), /e-9$/);
  assert.notEqual(formatNumber(1e-9), "0");
});
