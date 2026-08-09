import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import init, {
  calculate_compound_multi_scenario,
  calculate_compound_scenario,
  calculate_multi_scenario,
  calculate_scenario,
  verify_domain
} from "../assets/wasm/mortgage-engine/mortgage_engine.js";

const wasmBytes = fs.readFileSync(new URL(
  "../assets/wasm/mortgage-engine/mortgage_engine_bg.wasm",
  import.meta.url
));

await init({ module_or_path: wasmBytes });

const base = {
  name: "Scenario A",
  loanAmount: 300000,
  annualInterestRate: 6.5,
  termYears: 30,
  paymentFrequency: "monthly",
  extraPaymentPerPeriod: 0
};

const compoundBase = {
  name: "Scenario A",
  principal: 10000,
  annualInterestRate: 7,
  years: 20,
  compoundingPeriodsPerYear: 12,
  monthlyContribution: 200,
  taxRate: 25,
  inflationRate: 3
};

test("authorizes only approved mortgage engine hosts", () => {
  assert.equal(verify_domain("monkeytactics.com"), true);
  assert.equal(verify_domain("www.monkeytactics.com"), true);
  assert.equal(verify_domain("monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("preview.monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("127.0.0.1"), true);
  assert.equal(verify_domain("localhost"), false);
});

test("calculates a complete fixed-rate mortgage schedule", () => {
  const result = JSON.parse(calculate_scenario(JSON.stringify(base)));
  assert.equal(result.scheduledPayment, 1896.2);
  assert.equal(result.payoffTime.totalPeriods, 360);
  assert.equal(result.amortizationSchedule.length, 360);
  assert.equal(result.amortizationSchedule.at(-1).remainingBalance, 0);
  assert.equal(result.totalPrincipalPaid, 300000);
});

test("calculates multiple scenarios and shows extra-payment savings", () => {
  const inputs = [base, { ...base, name: "Scenario B", extraPaymentPerPeriod: 200 }];
  const results = JSON.parse(calculate_multi_scenario(JSON.stringify(inputs)));
  assert.equal(results.length, 2);
  assert.ok(results[1].totalInterestPaid < results[0].totalInterestPaid);
  assert.ok(results[1].payoffTime.totalPeriods < results[0].payoffTime.totalPeriods);
});

test("uses the shared WASM for compound-interest growth", () => {
  const result = JSON.parse(calculate_compound_scenario(JSON.stringify(compoundBase)));
  assert.equal(result.finalBalance, 113773.38);
  assert.equal(result.realBalance, 62993.56);
  assert.equal(result.totalContributions, 58000);
  assert.equal(result.yearly.length, 20);
});

test("matches the Investor.gov monthly-contribution reference case", () => {
  const result = JSON.parse(calculate_compound_scenario(JSON.stringify({
    ...compoundBase,
    monthlyContribution: 600,
    taxRate: 0,
    inflationRate: 0
  })));
  assert.equal(result.finalBalance, 352943.38);
});

test("matches the Investor.gov daily-compounding reference case", () => {
  const result = JSON.parse(calculate_compound_scenario(JSON.stringify({
    ...compoundBase,
    compoundingPeriodsPerYear: 365,
    monthlyContribution: 600,
    taxRate: 0,
    inflationRate: 0
  })));
  assert.equal(result.finalBalance, 354739.71);
});

test("compares up to five compound-interest scenarios", () => {
  const inputs = Array.from({ length: 5 }, (_, index) => ({
    ...compoundBase,
    name: `Scenario ${String.fromCharCode(65 + index)}`,
    annualInterestRate: 5 + index
  }));
  const results = JSON.parse(calculate_compound_multi_scenario(JSON.stringify(inputs)));
  assert.equal(results.length, 5);
  assert.ok(results[4].finalBalance > results[0].finalBalance);
  const error = JSON.parse(calculate_compound_multi_scenario(JSON.stringify([...inputs, compoundBase])));
  assert.match(error.error, /maximum of five/i);
});

test("returns structured errors without trapping", () => {
  assert.match(JSON.parse(calculate_scenario("not json")).error, /Invalid scenario JSON/);
  assert.match(JSON.parse(calculate_multi_scenario("[]")).error, /at least one/);
  assert.match(JSON.parse(calculate_compound_scenario("not json")).error, /Invalid compound scenario JSON/);
  assert.match(JSON.parse(calculate_compound_multi_scenario("[]")).error, /at least one/);
});
