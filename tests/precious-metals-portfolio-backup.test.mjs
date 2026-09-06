import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createPortfolioBackup, parsePortfolioBackup, portfolioKeys, validatePortfolioBackup } from "../assets/js/tools/precious-metals-retirement-calculator/portfolio-backup.js";

const calculatorHtml = await readFile(new URL("../tools/precious-metals-retirement-calculator.html", import.meta.url), "utf8");

const portfolios = Object.fromEntries(portfolioKeys.map((key, index) => [key, index === 0 ? [30, 10, 3, 2, 20, 5, 20, 10] : [25, 10, 5, 5, 20, 10, 15, 10]]));

test("portfolio backup contains every mix and the active portfolio", () => {
  const backup = createPortfolioBackup(portfolios, "streamers");
  assert.equal(backup.type, "monkeytactics-precious-metals-portfolios");
  assert.equal(backup.version, 1);
  assert.equal(backup.activePortfolio, "streamers");
  assert.deepEqual(Object.keys(backup.portfolios), portfolioKeys);
});

test("portfolio backup round trips through JSON", () => {
  const parsed = parsePortfolioBackup(JSON.stringify(createPortfolioBackup(portfolios, "miners")));
  assert.deepEqual(parsed.portfolios, portfolios);
  assert.equal(parsed.activePortfolio, "miners");
});

test("portfolio import rejects missing and invalid allocations", () => {
  const missing = createPortfolioBackup(portfolios, "my");
  delete missing.portfolios.barbell;
  assert.throws(() => validatePortfolioBackup(missing), /barbell portfolio/);

  const invalid = createPortfolioBackup(portfolios, "my");
  invalid.portfolios.my[0] = 29;
  assert.throws(() => validatePortfolioBackup(invalid), /totaling exactly 100%/);
});

test("portfolio import rejects unrelated and malformed JSON files", () => {
  assert.throws(() => parsePortfolioBackup("not json"), /not valid JSON/);
  assert.throws(() => validatePortfolioBackup({ type: "another-tool", version: 1, portfolios }), /different tool/);
});

test("every portfolio allocation has a synchronized slider and number field", () => {
  assert.equal((calculatorHtml.match(/data-allocation-slider/g) || []).length, 8);
  assert.equal((calculatorHtml.match(/data-allocation type="number"/g) || []).length, 8);
  assert.match(calculatorHtml, /monkeytactics-v1/);
});

test("the plan reserves error space so allocation validation does not move the next panel", async () => {
  const calculatorJs = await readFile(new URL("../assets/js/tools/precious-metals-retirement-calculator/precious-metals-retirement-calculator.js", import.meta.url), "utf8");
  const calculatorCss = await readFile(new URL("../assets/css/tools/precious-metals-retirement-calculator.css", import.meta.url), "utf8");
  assert.match(calculatorJs, /setFormError\(`Allocations total/);
  assert.doesNotMatch(calculatorJs, /error\.style\.display/);
  assert.match(calculatorCss, /\.pm-error \{[^}]*min-height:[^}]*visibility:hidden/);
  assert.match(calculatorCss, /\.pm-error\.visible \{ visibility:visible; \}/);
});

test("the calculator explains its Labs status and invites serious feedback", () => {
  assert.match(calculatorHtml, /Why this is in Labs/);
  assert.match(calculatorHtml, /A working calculator that asks more of you/);
  assert.match(calculatorHtml, /built-in assumptions are a starting point—not a promise/);
  assert.match(calculatorHtml, /href="\/contact"/);
});
