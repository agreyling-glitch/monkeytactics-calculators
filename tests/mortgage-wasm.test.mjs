import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import init, {
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

test("returns structured errors without trapping", () => {
  assert.match(JSON.parse(calculate_scenario("not json")).error, /Invalid scenario JSON/);
  assert.match(JSON.parse(calculate_multi_scenario("[]")).error, /at least one/);
});
