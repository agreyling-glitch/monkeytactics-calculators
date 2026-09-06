import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import init, { simulate_retirement, solve_retirement_spending, verify_domain } from "../assets/wasm/precious-metals-retirement/precious_metals_retirement_engine.js";

const wasmBytes = await readFile(new URL("../assets/wasm/precious-metals-retirement/precious_metals_retirement_engine_bg.wasm", import.meta.url));
await init({ module_or_path: wasmBytes });

const input = {
  initialPortfolio: 1_000_000,
  withdrawalRate: 4,
  years: 30,
  simulations: 1_000,
  seed: 42,
  inflationRate: 3,
  legacyCpiPremium: 0,
  allocations: [30, 10, 3, 2, 20, 5, 20, 10],
};

test("retirement engine returns deterministic percentile results", () => {
  const first = JSON.parse(simulate_retirement(JSON.stringify(input)));
  const second = JSON.parse(simulate_retirement(JSON.stringify(input)));
  assert.deepEqual(first, second);
  assert.equal(first.paths.length, 31);
  assert.ok(first.successRate >= 0 && first.successRate <= 100);
});

test("retirement engine validates allocation totals", () => {
  const result = JSON.parse(simulate_retirement(JSON.stringify({ ...input, allocations: [29, 10, 3, 2, 20, 5, 20, 10] })));
  assert.match(result.error, /total 100%/);
});

test("retirement engine solves for spending above a minimum budget", () => {
  const result = JSON.parse(solve_retirement_spending(JSON.stringify({
    ...input,
    minimumAnnualBudget: 10_000,
    targetSuccessRate: 90,
  })));
  assert.equal(result.targetAchievable, true);
  assert.ok(result.additionalSpending > 0);
  assert.ok(result.maximumTotalSpending > result.minimumAnnualBudget);
  assert.ok(result.simulation.successRate >= 89.8);
});

test("editable asset assumptions change the spending result", () => {
  const spendingInput = { ...input, minimumAnnualBudget: 10_000, targetSuccessRate: 90 };
  const baseline = JSON.parse(solve_retirement_spending(JSON.stringify(spendingInput)));
  const pessimistic = JSON.parse(solve_retirement_spending(JSON.stringify({
    ...spendingInput,
    assetAssumptions: Array.from({ length: 8 }, () => ({
      nominalReturn: 1,
      volatility: 20,
      annualCost: 1,
      metalsFactor: 0.5,
      equityFactor: 0.3,
      defensiveFactor: 0.1,
    })),
  })));
  assert.ok(pessimistic.maximumTotalSpending < baseline.maximumTotalSpending);
});

test("a higher survival target cannot increase sustainable spending", () => {
  const base = { ...input, minimumAnnualBudget: 10_000 };
  const target90 = JSON.parse(solve_retirement_spending(JSON.stringify({ ...base, targetSuccessRate: 90 })));
  const target95 = JSON.parse(solve_retirement_spending(JSON.stringify({ ...base, targetSuccessRate: 95 })));
  assert.ok(target95.maximumTotalSpending <= target90.maximumTotalSpending);
});

test("withdrawal timing and rebalancing are active model assumptions", () => {
  const base = { ...input, minimumAnnualBudget: 10_000, targetSuccessRate: 90 };
  const annualBeginning = JSON.parse(solve_retirement_spending(JSON.stringify({ ...base, rebalancing: "annual", withdrawalTiming: "beginning" })));
  const noRebalanceEnd = JSON.parse(solve_retirement_spending(JSON.stringify({ ...base, rebalancing: "none", withdrawalTiming: "end" })));
  assert.notEqual(noRebalanceEnd.maximumTotalSpending, annualBeginning.maximumTotalSpending);
});

test("invalid factor combinations are rejected", () => {
  const result = JSON.parse(solve_retirement_spending(JSON.stringify({
    ...input,
    minimumAnnualBudget: 10_000,
    targetSuccessRate: 90,
    assetAssumptions: Array.from({ length: 8 }, () => ({ nominalReturn: 5, volatility: 20, annualCost: 0.5, metalsFactor: 1, equityFactor: 1, defensiveFactor: 1 })),
  })));
  assert.match(result.error, /squared factor exposures/);
});

test("retirement engine exposes only approved hosts", () => {
  assert.equal(verify_domain("monkeytactics.com"), true);
  assert.equal(verify_domain("127.0.0.1"), true);
  assert.equal(verify_domain("example.com"), false);
});
