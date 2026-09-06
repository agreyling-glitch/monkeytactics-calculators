import assert from "node:assert/strict";
import test from "node:test";
import { estimateHistory, historyToCsv, mergeHistory, parseHistoryCsv } from "../assets/js/tools/precious-metals-retirement-calculator/history-estimator.js";

test("history CSV accepts simple and advanced monthly rows", () => {
  const rows = parseHistoryCsv("date,asset,metals,equity,defensive\n2024-01,100,90,80,70\n2024-02,102,91,82,70.2\n");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[1], { date: "2024-02", asset: 102, metals: 91, equity: 82, defensive: 70.2 });
});

test("history CSV accepts common brokerage dates and quoted thousands", () => {
  const rows = parseHistoryCsv('date,adjusted close\n01/31/2024,"1,234.50"');
  assert.equal(rows[0].date, "2024-01");
  assert.equal(rows[0].asset, 1234.5);
});

test("new imports append months and replace duplicate dates", () => {
  const existing = parseHistoryCsv("date,asset\n2024-01,100\n2024-02,101");
  const incoming = parseHistoryCsv("month,close\n2024-02,102\n2024-03,103");
  const merged = mergeHistory(existing, incoming);
  assert.equal(merged.length, 3);
  assert.equal(merged[1].asset, 102);
});

test("a simple update preserves previously saved reference values", () => {
  const existing = parseHistoryCsv("date,asset,metals,equity,defensive\n2024-01,100,90,80,70");
  const incoming = parseHistoryCsv("date,asset\n2024-01,101");
  assert.deepEqual(mergeHistory(existing, incoming)[0], { date: "2024-01", asset: 101, metals: 90, equity: 80, defensive: 70 });
});

test("price history estimates annualized compound return and volatility", () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({
    date: `${2022 + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`,
    asset: 100 * 1.01 ** index,
    metals: null,
    equity: null,
    defensive: null,
  }));
  const estimate = estimateHistory(rows, { format: "prices" });
  assert.equal(estimate.months, 24);
  assert.ok(Math.abs(estimate.nominalReturn - 12.6825) < 0.01);
  assert.ok(estimate.volatility < 0.001);
  assert.equal(estimate.factors, null);
});

test("price estimation does not treat gaps as single-month returns", () => {
  const rows = Array.from({ length: 13 }, (_, index) => ({ date: `${2024 + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`, asset: 100 + index, metals: null, equity: null, defensive: null }));
  rows.splice(5, 1);
  assert.throws(() => estimateHistory(rows, { format: "prices" }), /At least 12 valid monthly returns/);
});

test("matched reference history produces bounded factor exposures", () => {
  const rows = Array.from({ length: 60 }, (_, index) => {
    const metals = Math.sin(index) * 2;
    const equity = Math.cos(index * 0.7) * 1.5;
    const defensive = Math.sin(index * 0.2) * 0.3;
    return { date: `${2020 + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`, asset: metals * 0.7 + equity * 0.2, metals, equity, defensive };
  });
  const estimate = estimateHistory(rows, { format: "percent" });
  assert.equal(estimate.matchedMonths, 60);
  assert.equal(estimate.factors.length, 3);
  assert.ok(Math.sqrt(estimate.factors.reduce((sum, factor) => sum + factor ** 2, 0)) <= 0.9800001);
});

test("saved history exports in its reusable canonical format", () => {
  const csv = historyToCsv([{ date: "2024-01", asset: 100, metals: null, equity: 90, defensive: 80 }]);
  assert.equal(csv, "date,asset,metals,equity,defensive\n2024-01,100,,90,80\n");
});
