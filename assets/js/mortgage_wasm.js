import init, { calculate_multi_scenario, calculate_scenario, verify_domain } from "/assets/wasm/mortgage-engine/mortgage_engine.js";

const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const moneyExact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const colors = ["#4ade80", "#fb923c", "#60a5fa", "#c084fc", "#facc15"];
const state = { currentInput: null, currentResult: null, baselineResult: null, saved: [], comparisonInputs: [], comparisonResults: [], summaryScenarioName: null, reportScenarioName: null, compositionScenarioName: null, amortScenarioName: null, printCompositionScenarioName: null, page: 1, pageSize: 15 };

const elements = {
  status: $("engineStatus"), error: $("calcError"), form: $("mortgageForm"), amount: $("loanAmount"), amountRange: $("loanAmountRange"), amountOutput: $("loanAmountOutput"),
  rate: $("interestRate"), term: $("loanTerm"), frequency: $("paymentFrequency"), extra: $("extraPayment"), add: $("addScenarioButton"), clear: $("clearScenariosButton"), downPaymentButton: $("downPaymentButton"), downPaymentDialog: $("downPaymentDialog"), downPaymentForm: $("downPaymentForm"), homePrice: $("homePrice"), downPaymentPercent: $("downPaymentPercent"), downPaymentAmount: $("downPaymentAmount"), calculatedLoanAmount: $("calculatedLoanAmount"), downPaymentError: $("downPaymentError"),
  empty: $("resultEmpty"), content: $("resultContent"), summaryScenario: $("summaryScenario"), summaryScenarioControl: $("summaryScenarioControl"), resultFrequency: $("resultFrequency"), periodicPayment: $("periodicPayment"), paymentCaption: $("paymentCaption"), totalInterest: $("totalInterest"), totalPaid: $("totalPaid"), payoffTime: $("payoffTime"), interestShare: $("interestShare"), principalBar: $("principalBar"), interestBar: $("interestBar"), principalPercent: $("principalPercent"), interestPercent: $("interestPercent"), extraImpact: $("extraImpact"),
  reportSection: $("reportSection"), scenarioReport: $("scenarioReport"), reportScenario: $("reportScenario"), reportScenarioControl: $("reportScenarioControl"), chartsSection: $("chartsSection"), balanceChart: $("balanceChart"), compositionChart: $("compositionChart"), compositionScenario: $("compositionScenario"), compositionScenarioControl: $("compositionScenarioControl"), compositionScenarioLabel: $("compositionScenarioLabel"), interestChart: $("interestChart"), payoffChart: $("payoffChart"), balanceLegend: $("balanceLegend"), balanceDescription: $("balanceDescription"), compositionDescription: $("compositionDescription"), interestDescription: $("interestDescription"), payoffDescription: $("payoffDescription"),
  chips: $("scenarioChips"), inputScenarioList: $("inputScenarioList"), inputChips: $("inputScenarioChips"), scenarioLimitDialog: $("scenarioLimitDialog"), comparisonSection: $("comparisonSection"), comparisonOutput: $("comparisonOutput"), comparisonBody: $("comparisonBody"), comparisonReport: $("comparisonReport"), amortSection: $("amortizationSection"), amortScenario: $("amortScenario"), amortScenarioControl: $("amortScenarioControl"), amortScenarioLabel: $("amortScenarioLabel"), amortView: $("amortView"), amortBody: $("amortBody"), previous: $("previousPage"), next: $("nextPage"), pageStatus: $("pageStatus"), copyStatus: $("copyStatus"), downloadStatus: $("downloadStatus")
};

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function clearError() {
  elements.error.hidden = true;
  elements.error.textContent = "";
}

function parseEngineResponse(value) {
  const parsed = JSON.parse(value);
  if (parsed && parsed.error) throw new Error(parsed.error);
  return parsed;
}

function nextScenarioName() {
  return `Scenario ${String.fromCharCode(65 + Math.min(state.saved.length, 4))}`;
}

function readInput(name = nextScenarioName()) {
  const input = {
    name,
    loanAmount: Number(elements.amount.value),
    annualInterestRate: Number(elements.rate.value),
    termYears: Number(elements.term.value),
    paymentFrequency: elements.frequency.value,
    extraPaymentPerPeriod: Number(elements.extra.value || 0)
  };
  if (!Number.isFinite(input.loanAmount) || input.loanAmount <= 0) throw new Error("Enter a loan amount greater than zero.");
  if (!Number.isFinite(input.annualInterestRate) || input.annualInterestRate < 0 || input.annualInterestRate > 100) throw new Error("Enter an interest rate between 0% and 100%.");
  if (!Number.isInteger(input.termYears) || input.termYears < 1 || input.termYears > 100) throw new Error("Enter a whole-number loan term between 1 and 100 years.");
  if (!Number.isFinite(input.extraPaymentPerPeriod) || input.extraPaymentPerPeriod < 0) throw new Error("Extra payment cannot be negative.");
  return input;
}

function frequencyLabel(frequency) {
  return frequency === "biweekly" ? "Bi-weekly" : "Monthly";
}

function payoffLabel(payoff) {
  const parts = [];
  if (payoff.years) parts.push(`${payoff.years} ${payoff.years === 1 ? "year" : "years"}`);
  if (payoff.months) parts.push(`${payoff.months} ${payoff.months === 1 ? "month" : "months"}`);
  return parts.join(", ") || "Less than one month";
}

function totalMonths(result) {
  return result.payoffTime.years * 12 + result.payoffTime.months;
}

function currentUrl(input = state.currentInput || readInput()) {
  const url = new URL(window.location.href);
  url.pathname = "/tools/loan-mortgage-calculator";
  url.search = new URLSearchParams({ amount: String(input.loanAmount), rate: String(input.annualInterestRate), term: String(input.termYears), extra: String(input.extraPaymentPerPeriod), freq: input.paymentFrequency }).toString();
  url.hash = "";
  return url;
}

function syncUrl() {
  try { history.replaceState(null, "", currentUrl()); } catch (_) { /* URL state is an enhancement. */ }
}

function updateAmountOutput() {
  elements.amountOutput.value = money.format(Number(elements.amount.value) || 0);
  elements.amountOutput.textContent = elements.amountOutput.value;
}

function roundedCurrency(value) {
  return Math.round(value * 100) / 100;
}

function updateDownPaymentCalculation(source = "percent") {
  const price = Number(elements.homePrice.value);
  let percent = Number(elements.downPaymentPercent.value);
  let amount = Number(elements.downPaymentAmount.value);
  if (!Number.isFinite(price) || price < 0) return;
  if (source === "amount") {
    amount = Number.isFinite(amount) ? amount : 0;
    percent = price > 0 ? amount / price * 100 : 0;
    elements.downPaymentPercent.value = String(Math.round(percent * 10000) / 10000);
  } else {
    percent = Number.isFinite(percent) ? percent : 0;
    amount = roundedCurrency(price * percent / 100);
    elements.downPaymentAmount.value = String(amount);
  }
  const loanAmount = roundedCurrency(price - amount);
  elements.calculatedLoanAmount.textContent = moneyExact.format(Math.max(0, Number.isFinite(loanAmount) ? loanAmount : 0));
  elements.downPaymentError.hidden = true;
}

function openDownPaymentDialog() {
  const loanAmount = Number(elements.amount.value) || 300000;
  const percent = Math.min(99.99, Math.max(0, Number(elements.downPaymentPercent.value) || 20));
  const price = roundedCurrency(loanAmount / (1 - percent / 100));
  elements.homePrice.value = String(price);
  elements.downPaymentPercent.value = String(percent);
  updateDownPaymentCalculation("percent");
  elements.downPaymentError.hidden = true;
  if (typeof elements.downPaymentDialog.showModal === "function") elements.downPaymentDialog.showModal();
}

function applyDownPayment(event) {
  event.preventDefault();
  const price = Number(elements.homePrice.value);
  const amount = Number(elements.downPaymentAmount.value);
  const percent = Number(elements.downPaymentPercent.value);
  const loanAmount = roundedCurrency(price - amount);
  let message = "";
  if (!Number.isFinite(price) || price < 1000) message = "Enter a home price of at least $1,000.";
  else if (!Number.isFinite(percent) || percent < 0 || percent >= 100) message = "Enter a down payment percentage from 0% up to, but not including, 100%.";
  else if (!Number.isFinite(amount) || amount < 0 || amount >= price) message = "The down payment amount must be at least $0 and less than the home price.";
  else if (loanAmount < 1000 || loanAmount > 100000000) message = "The calculated loan amount must be between $1,000 and $100,000,000.";
  if (message) {
    elements.downPaymentError.textContent = message;
    elements.downPaymentError.hidden = false;
    return;
  }
  elements.amount.value = String(loanAmount);
  elements.amountRange.value = String(Math.min(Number(elements.amountRange.max), Math.max(Number(elements.amountRange.min), loanAmount)));
  updateAmountOutput();
  elements.downPaymentDialog.close();
  calculateAll();
}

function renderSummaryMetrics(input, result, baseline) {
  const interestPercent = result.totalAmountPaid ? (result.totalInterestPaid / result.totalAmountPaid) * 100 : 0;
  const principalPercent = 100 - interestPercent;
  elements.empty.hidden = true;
  elements.content.hidden = false;
  elements.resultFrequency.textContent = frequencyLabel(result.paymentFrequency);
  elements.periodicPayment.textContent = moneyExact.format(result.paymentWithExtra);
  elements.paymentCaption.textContent = input.extraPaymentPerPeriod > 0 ? `${moneyExact.format(result.scheduledPayment)} scheduled + ${moneyExact.format(input.extraPaymentPerPeriod)} extra` : "principal and interest only";
  elements.totalInterest.textContent = money.format(result.totalInterestPaid);
  elements.totalPaid.textContent = money.format(result.totalAmountPaid);
  elements.payoffTime.textContent = payoffLabel(result.payoffTime);
  elements.interestShare.textContent = `${interestPercent.toFixed(1)}%`;
  elements.principalBar.style.width = `${principalPercent}%`;
  elements.interestBar.style.width = `${interestPercent}%`;
  elements.principalPercent.textContent = `${principalPercent.toFixed(1)}%`;
  elements.interestPercent.textContent = `${interestPercent.toFixed(1)}%`;

  if (baseline && input.extraPaymentPerPeriod > 0) {
    const savedInterest = Math.max(0, baseline.totalInterestPaid - result.totalInterestPaid);
    const monthsSaved = Math.max(0, totalMonths(baseline) - totalMonths(result));
    elements.extraImpact.hidden = false;
    elements.extraImpact.innerHTML = `<strong>Extra payment impact:</strong> adding ${moneyExact.format(input.extraPaymentPerPeriod)} per ${input.paymentFrequency === "biweekly" ? "two-week period" : "month"} saves an estimated <strong>${money.format(savedInterest)}</strong> in interest and reaches payoff about <strong>${formatMonths(monthsSaved)} sooner</strong>.`;
  } else {
    elements.extraImpact.hidden = true;
    elements.extraImpact.textContent = "";
  }
}

function renderScenarioReport(input, result, baseline) {
  const periodWord = input.paymentFrequency === "biweekly" ? "bi-weekly" : "monthly";
  let report = `<p>For a <strong>${money.format(input.loanAmount)} mortgage</strong> at <strong>${input.annualInterestRate}%</strong> over <strong>${input.termYears} years</strong> with ${periodWord} payments, the estimated principal-and-interest payment is <strong>${moneyExact.format(result.paymentWithExtra)} per period</strong>. Over the modeled life of the loan, you pay approximately <strong>${money.format(result.totalInterestPaid)} in interest</strong> and ${money.format(result.totalPrincipalPaid)} in principal, for a total of ${money.format(result.totalAmountPaid)}.</p>`;
  report += `<p>The amortization schedule reaches a zero balance in <strong>${payoffLabel(result.payoffTime)}</strong>. This estimate does not include property taxes, insurance, mortgage insurance, HOA dues, closing costs, or lender fees.</p>`;
  if (baseline && input.extraPaymentPerPeriod > 0) report += `<p><strong>Impact of extra payments:</strong> compared with making only the scheduled payment, this plan saves ${money.format(Math.max(0, baseline.totalInterestPaid - result.totalInterestPaid))} in interest and shortens repayment by about ${formatMonths(Math.max(0, totalMonths(baseline) - totalMonths(result)))}.</p>`;
  elements.scenarioReport.innerHTML = report;
}

function renderPrimary(input, result, baseline) {
  renderSummaryMetrics(input, result, baseline);
  renderScenarioReport(input, result, baseline);
  renderPrintSummary(input, result, baseline);
  elements.reportSection.hidden = false;
  elements.chartsSection.hidden = false;
  elements.amortSection.hidden = false;
}

function formatMonths(months) {
  if (months <= 0) return "no time";
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return [years ? `${years} ${years === 1 ? "year" : "years"}` : "", remainder ? `${remainder} ${remainder === 1 ? "month" : "months"}` : ""].filter(Boolean).join(" and ");
}

function estimatedPayoffDate(result) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + totalMonths(result));
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function generatedTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function publicScenarioUrl(input) {
  const url = new URL("https://monkeytactics.com/tools/loan-mortgage-calculator");
  url.search = new URLSearchParams({ amount: String(input.loanAmount), rate: String(input.annualInterestRate), term: String(input.termYears), extra: String(input.extraPaymentPerPeriod), freq: input.paymentFrequency }).toString();
  return url.toString();
}

function renderPrintScenarioUrls(inputs) {
  const container = $("printScenarioUrls");
  container.replaceChildren();
  inputs.forEach((input, index) => {
    const item = document.createElement("div");
    item.className = "print-scenario-url";
    const name = document.createElement("b");
    name.textContent = input.name || `Scenario ${String.fromCharCode(65 + index)}`;
    const url = document.createElement("span");
    url.textContent = publicScenarioUrl(input);
    item.append(name, url);
    container.appendChild(item);
  });
}

function renderPrintSummary(input, result, baseline) {
  const monthlyEquivalent = result.paymentFrequency === "biweekly" ? result.paymentWithExtra * 26 / 12 : result.paymentWithExtra;
  $("printReportTitle").textContent = `${result.name} Mortgage Summary`;
  $("printGeneratedDate").textContent = `Generated on: ${generatedTimestamp()}`;
  $("printLoanAmount").textContent = money.format(input.loanAmount);
  $("printInterestRate").textContent = `${input.annualInterestRate}% fixed`;
  $("printLoanTerm").textContent = `${input.termYears} years`;
  $("printFrequency").textContent = frequencyLabel(input.paymentFrequency);
  $("printExtraRow").hidden = input.extraPaymentPerPeriod <= 0;
  $("printExtraPayment").textContent = `${moneyExact.format(input.extraPaymentPerPeriod)} per period`;
  $("printPaymentLabel").textContent = result.paymentFrequency === "biweekly" ? "Monthly payment equivalent" : "Monthly payment";
  $("printPayment").textContent = moneyExact.format(monthlyEquivalent);
  $("printTotalInterest").textContent = money.format(result.totalInterestPaid);
  $("printTotalCost").textContent = money.format(result.totalAmountPaid);
  $("printPayoffDate").textContent = estimatedPayoffDate(result);
  renderPrintScenarioUrls([input]);
  let narrative = `<p>The modeled mortgage is paid off in <strong>${payoffLabel(result.payoffTime)}</strong>. The estimate covers principal and interest only and excludes taxes, insurance, escrow, and lender fees.</p>`;
  if (baseline && input.extraPaymentPerPeriod > 0) {
    narrative += `<p><strong>Extra-payment impact:</strong> ${moneyExact.format(input.extraPaymentPerPeriod)} per period saves approximately ${money.format(Math.max(0, baseline.totalInterestPaid - result.totalInterestPaid))} in interest and shortens payoff by ${formatMonths(Math.max(0, totalMonths(baseline) - totalMonths(result)))}.</p>`;
  }
  $("printNarrative").innerHTML = narrative;
}

function scenarioSignature(input) {
  return [input.loanAmount, input.annualInterestRate, input.termYears, input.paymentFrequency, input.extraPaymentPerPeriod].join("|");
}

function scenarioSubtitle(input) {
  return `${input.annualInterestRate}% · ${input.termYears}y · ${frequencyLabel(input.paymentFrequency)}${input.extraPaymentPerPeriod ? ` · +${money.format(input.extraPaymentPerPeriod)}` : ""}`;
}

function createScenarioChip(input, index) {
  const chip = document.createElement("div");
  chip.className = "scenario-chip";
  chip.innerHTML = `<span>${input.name}</span><small>${scenarioSubtitle(input)}</small><button type="button" aria-label="Remove ${input.name}" data-remove="${index}">×</button>`;
  return chip;
}

function updateScenarioLimitControls() {
  const atLimit = state.saved.length >= 5;
  [elements.add, ...document.querySelectorAll("[data-preset]")].forEach((button) => {
    button.setAttribute("aria-disabled", String(atLimit));
    button.classList.toggle("is-limit-reached", atLimit);
    button.title = atLimit ? "Remove a saved scenario before adding another." : "";
  });
}

function showScenarioLimitDialog() {
  if (typeof elements.scenarioLimitDialog.showModal === "function") elements.scenarioLimitDialog.showModal();
  else showError("You can compare up to five scenarios. Remove one before adding another.");
}

function renderChips() {
  elements.chips.replaceChildren();
  elements.inputChips.replaceChildren();
  elements.inputScenarioList.hidden = !state.saved.length;
  updateScenarioLimitControls();
  if (!state.saved.length) {
    elements.chips.innerHTML = '<p class="comparison-empty">No saved scenarios yet. Add your current plan or try a preset.</p>';
    return;
  }
  state.saved.forEach((input, index) => {
    elements.chips.appendChild(createScenarioChip(input, index));
    elements.inputChips.appendChild(createScenarioChip(input, index));
  });
}

function removeSavedScenario(event) {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  state.saved.splice(Number(button.dataset.remove), 1);
  state.saved.forEach((item, index) => { item.name = `Scenario ${String.fromCharCode(65 + index)}`; });
  renderChips();
  calculateAll();
}

function activeComparisonInputs() {
  if (state.saved.length) return [...state.saved];
  return state.currentInput ? [{ ...state.currentInput, name: "Scenario A" }] : [];
}

function renderComparison(inputs, results) {
  state.comparisonInputs = inputs;
  state.comparisonResults = results;
  syncSummaryScenario(inputs, results);
  syncReportScenario(inputs, results);
  syncAmortizationScenario(results);
  renderPrintScenarioUrls(inputs);
  elements.comparisonOutput.hidden = results.length < 2;
  elements.comparisonSection.classList.toggle("has-comparison", results.length >= 2);
  if (results.length < 2) return;
  const base = results[0];
  const lowest = results.reduce((best, item) => item.totalInterestPaid < best.totalInterestPaid ? item : best, results[0]);
  const fastest = results.reduce((best, item) => totalMonths(item) < totalMonths(best) ? item : best, results[0]);
  elements.comparisonBody.innerHTML = results.map((result, index) => {
    const deltaPayment = result.paymentWithExtra - base.paymentWithExtra;
    const deltaInterest = result.totalInterestPaid - base.totalInterestPaid;
    const deltaMonths = totalMonths(result) - totalMonths(base);
    const payoffDifference = deltaMonths === 0 ? "Same payoff time" : `${deltaMonths > 0 ? "+" : "−"}${formatMonths(Math.abs(deltaMonths))} payoff`;
    const difference = index === 0 ? "Baseline" : `<span>${deltaPayment >= 0 ? "+" : "−"}${money.format(Math.abs(deltaPayment))}/period</span><span>${deltaInterest >= 0 ? "+" : "−"}${money.format(Math.abs(deltaInterest))} interest</span><span>${payoffDifference}</span>`;
    return `<tr class="${result === lowest ? "best" : ""}"><td>${result.name}<small>(${scenarioSubtitle(inputs[index])})</small></td><td>${moneyExact.format(result.paymentWithExtra)}</td><td>${money.format(result.totalInterestPaid)}</td><td>${payoffLabel(result.payoffTime)}</td><td>${difference}</td></tr>`;
  }).join("");
  let comparisonText = results.map((result, index) => `<p><strong>${result.name}</strong> (${inputs[index].annualInterestRate}%, ${inputs[index].termYears} years): payment ${moneyExact.format(result.paymentWithExtra)} per period, total interest ${money.format(result.totalInterestPaid)}, payoff in ${payoffLabel(result.payoffTime)}.</p>`).join("");
  comparisonText += `<p><strong>${lowest.name}</strong> has the lowest modeled total interest at ${money.format(lowest.totalInterestPaid)}. <strong>${fastest.name}</strong> has the fastest payoff at ${payoffLabel(fastest.payoffTime)}.</p>`;
  const lowestIndex = results.indexOf(lowest);
  const lowestInput = inputs[lowestIndex];
  const baseInput = inputs[0];
  const reasons = [];
  if (lowestInput.annualInterestRate < baseInput.annualInterestRate) reasons.push("a lower interest rate");
  if (lowestInput.termYears < baseInput.termYears) reasons.push("a shorter loan term");
  if (lowestInput.extraPaymentPerPeriod > baseInput.extraPaymentPerPeriod) reasons.push("more principal paid early through extra payments");
  if (lowestInput.paymentFrequency === "biweekly" && baseInput.paymentFrequency === "monthly") reasons.push("more frequent principal reduction");
  comparisonText += `<p>${lowest.name} is the cheaper interest-cost scenario in this comparison${reasons.length ? ` because it combines ${reasons.join(", ")}` : " based on its rate, term, payment frequency, and extra-payment assumptions"}.</p>`;
  results.slice(1).forEach((result) => {
    const interestSavings = base.totalInterestPaid - result.totalInterestPaid;
    const paymentChange = result.paymentWithExtra - base.paymentWithExtra;
    comparisonText += `<p>Compared with ${base.name}, ${result.name} ${interestSavings >= 0 ? `saves ${money.format(interestSavings)} in interest` : `adds ${money.format(Math.abs(interestSavings))} in interest`} and ${paymentChange >= 0 ? `increases` : `reduces`} the payment by ${money.format(Math.abs(paymentChange))} per period.</p>`;
  });
  elements.comparisonReport.innerHTML = comparisonText;
}

function baselineFor(input) {
  if (!input || input.extraPaymentPerPeriod <= 0) return null;
  return parseEngineResponse(calculate_scenario(JSON.stringify({ ...input, name: "Without extra payments", extraPaymentPerPeriod: 0 })));
}

function syncSummaryScenario(inputs, results) {
  const preferredIndex = Math.max(0, results.findIndex((result) => result.name === state.summaryScenarioName));
  elements.summaryScenario.replaceChildren();
  results.forEach((result, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = result.name;
    elements.summaryScenario.appendChild(option);
  });
  elements.summaryScenario.value = String(preferredIndex);
  elements.summaryScenarioControl.hidden = results.length <= 1;
  state.summaryScenarioName = results[preferredIndex].name;
  renderSummaryMetrics(inputs[preferredIndex], results[preferredIndex], baselineFor(inputs[preferredIndex]));
}

function syncReportScenario(inputs, results) {
  const preferredIndex = Math.max(0, results.findIndex((result) => result.name === state.reportScenarioName));
  elements.reportScenario.replaceChildren();
  results.forEach((result, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = result.name;
    elements.reportScenario.appendChild(option);
  });
  elements.reportScenario.value = String(preferredIndex);
  elements.reportScenarioControl.hidden = results.length <= 1;
  state.reportScenarioName = results[preferredIndex].name;
  renderScenarioReport(inputs[preferredIndex], results[preferredIndex], baselineFor(inputs[preferredIndex]));
}

function annualize(result) {
  const periodsPerYear = result.paymentFrequency === "biweekly" ? 26 : 12;
  const years = [];
  result.amortizationSchedule.forEach((entry) => {
    const year = Math.ceil(entry.periodIndex / periodsPerYear);
    if (!years[year - 1]) years[year - 1] = { period: `Year ${year}`, payment: 0, principal: 0, interest: 0, balance: entry.remainingBalance };
    years[year - 1].payment += entry.paymentAmount;
    years[year - 1].principal += entry.principalComponent;
    years[year - 1].interest += entry.interestComponent;
    years[year - 1].balance = entry.remainingBalance;
  });
  return years;
}

function svgShell(width, height, content, label) {
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}

function renderBalanceChart(results) {
  const width = 900, height = 260, left = 62, right = 18, top = 15, bottom = 34;
  const plotW = width - left - right, plotH = height - top - bottom;
  const yearsFor = (result, period) => period / (result.paymentFrequency === "biweekly" ? 26 : 12);
  const maxYears = Math.max(...results.map((r) => yearsFor(r, r.amortizationSchedule.length)));
  const maxBalance = Math.max(...results.map((r) => r.totalPrincipalPaid));
  let content = "";
  for (let i = 0; i <= 4; i++) {
    const y = top + (plotH * i / 4);
    const value = maxBalance * (1 - i / 4);
    content += `<line class="chart-gridline" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/><text class="chart-axis" x="${left - 8}" y="${y + 3}" text-anchor="end">${compactMoney(value)}</text>`;
  }
  results.forEach((result, index) => {
    const points = [{ periodIndex: 0, remainingBalance: result.totalPrincipalPaid }, ...result.amortizationSchedule].filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % Math.max(1, Math.floor(arr.length / 120)) === 0).map((entry) => `${left + (yearsFor(result, entry.periodIndex) / maxYears) * plotW},${top + (1 - entry.remainingBalance / maxBalance) * plotH}`).join(" ");
    content += `<polyline class="chart-line" stroke="${colors[index]}" points="${points}"/>`;
  });
  for (let i = 0; i <= 4; i++) {
    const x = left + plotW * i / 4;
    content += `<text class="chart-axis" x="${x}" y="${height - 10}" text-anchor="middle">${Math.round(maxYears * i / 4)}y</text>`;
  }
  elements.balanceChart.innerHTML = svgShell(width, height, content, "Remaining mortgage balance decreases over time");
  elements.balanceLegend.innerHTML = results.map((result, i) => `<span><svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="${colors[i]}"/></svg>${result.name}</span>`).join("");
  const first = results[0];
  const yearTen = annualize(first)[9];
  const percentagePaid = yearTen ? (1 - yearTen.balance / first.totalPrincipalPaid) * 100 : 100;
  elements.balanceDescription.textContent = `This mortgage balance chart follows ${results.length} scenario${results.length === 1 ? "" : "s"} toward payoff. In ${first.name}, about ${percentagePaid.toFixed(0)}% of principal is repaid after the first 10 years; principal reduction accelerates as interest charges decline.`;
}

function renderCompositionChart(result) {
  const rows = annualize(result), width = 430, height = 260, left = 42, right = 10, top = 12, bottom = 34, plotH = height - top - bottom, plotW = width - left - right;
  const max = Math.max(...rows.map((row) => row.principal + row.interest));
  const gap = 2, barW = Math.max(2, plotW / rows.length - gap);
  let content = "";
  [0, .5, 1].forEach((fraction) => { const y = top + plotH * (1 - fraction); content += `<line class="chart-gridline" x1="${left}" y1="${y}" x2="${width-right}" y2="${y}"/><text class="chart-axis" x="${left-6}" y="${y+3}" text-anchor="end">${compactMoney(max*fraction)}</text>`; });
  rows.forEach((row, i) => {
    const x = left + i * plotW / rows.length;
    const interestH = row.interest / max * plotH, principalH = row.principal / max * plotH;
    content += `<rect x="${x}" y="${top + plotH - interestH}" width="${barW}" height="${interestH}" fill="#fb923c"/><rect x="${x}" y="${top + plotH - interestH - principalH}" width="${barW}" height="${principalH}" fill="#4ade80"/>`;
  });
  content += `<text class="chart-axis" x="${left}" y="${height-10}">Year 1</text><text class="chart-axis" x="${width-right}" y="${height-10}" text-anchor="end">Year ${rows.length}</text>`;
  elements.compositionChart.innerHTML = svgShell(width, height, content, "Annual interest and principal payment composition");
  const first = rows[0], last = rows[rows.length - 1];
  elements.compositionDescription.textContent = `For ${result.name}, the stacked mortgage amortization bars show interest in orange and principal in green. In year one, about ${percent(first.interest, first.interest + first.principal)} of payments go to interest; in the final year, that falls to about ${percent(last.interest, last.interest + last.principal)}.`;
}

function selectCompositionScenario(results) {
  const preferredIndex = Math.max(0, results.findIndex((result) => result.name === state.compositionScenarioName));
  elements.compositionScenario.replaceChildren();
  results.forEach((result, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = result.name;
    elements.compositionScenario.appendChild(option);
  });
  elements.compositionScenario.value = String(preferredIndex);
  elements.compositionScenarioControl.hidden = results.length <= 1;
  state.compositionScenarioName = results[preferredIndex].name;
  elements.compositionScenarioLabel.textContent = results[preferredIndex].name;
  elements.compositionScenarioLabel.classList.toggle("is-screen-hidden", results.length > 1);
  return results[preferredIndex];
}

function syncAmortizationScenario(results) {
  const preferredIndex = Math.max(0, results.findIndex((result) => result.name === state.amortScenarioName));
  elements.amortScenario.replaceChildren();
  results.forEach((result, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = result.name;
    elements.amortScenario.appendChild(option);
  });
  elements.amortScenario.value = String(preferredIndex);
  elements.amortScenarioControl.hidden = results.length <= 1;
  state.amortScenarioName = results[preferredIndex].name;
  elements.amortScenarioLabel.textContent = results[preferredIndex].name;
  elements.amortScenarioLabel.classList.toggle("is-screen-hidden", results.length > 1);
}

function renderHorizontalChart(target, results, valueOf, formatter, label) {
  const width = 900, rowH = 46, left = 190, right = 130;
  const height = Math.max(150, results.length * rowH + 34);
  const top = (height - results.length * rowH) / 2;
  const plotW = width - left - right;
  const max = Math.max(...results.map(valueOf), 1);
  let content = "";
  results.forEach((result, index) => {
    const y = top + index * rowH;
    const bar = valueOf(result) / max * plotW;
    const valueInside = bar > plotW * .72;
    const valueX = valueInside ? left + bar - 12 : left + bar + 10;
    content += `<text class="chart-axis chart-axis-strong" x="${left-12}" y="${y+29}" text-anchor="end">${result.name}</text><rect x="${left}" y="${y+10}" width="${plotW}" height="26" rx="13" fill="rgba(183,247,207,.08)"/><rect x="${left}" y="${y+10}" width="${bar}" height="26" rx="13" fill="${colors[index]}"/><text class="chart-axis chart-axis-value${valueInside ? " chart-axis-value-inside" : ""}" x="${valueX}" y="${y+29}" text-anchor="${valueInside ? "end" : "start"}">${formatter(valueOf(result))}</text>`;
  });
  target.innerHTML = svgShell(width, height, content, label);
}

function renderCharts(results) {
  const chartResults = results.length ? results : [state.currentResult];
  const isComparison = chartResults.length > 1;
  renderBalanceChart(chartResults);
  renderCompositionChart(selectCompositionScenario(chartResults));
  renderHorizontalChart(elements.interestChart, chartResults, (r) => r.totalInterestPaid, compactMoney, "Total interest paid by mortgage scenario");
  renderHorizontalChart(elements.payoffChart, chartResults, totalMonths, (value) => formatMonths(Math.round(value)), "Mortgage payoff time by scenario");
  const lowest = chartResults.reduce((best, item) => item.totalInterestPaid < best.totalInterestPaid ? item : best, chartResults[0]);
  const fastest = chartResults.reduce((best, item) => totalMonths(item) < totalMonths(best) ? item : best, chartResults[0]);
  $("payoffChartTitle").textContent = isComparison ? "Payoff time comparison" : "Payoff time";
  elements.interestDescription.textContent = isComparison
    ? `${lowest.name} has the lowest estimated lifetime mortgage interest at ${money.format(lowest.totalInterestPaid)}.`
    : `${lowest.name} has an estimated lifetime mortgage interest cost of ${money.format(lowest.totalInterestPaid)}.`;
  elements.payoffDescription.textContent = isComparison
    ? `This payoff comparison shows the modeled time until the remaining balance reaches zero. ${fastest.name} finishes first in ${payoffLabel(fastest.payoffTime)}.`
    : `${fastest.name} reaches a modeled zero remaining balance in ${payoffLabel(fastest.payoffTime)}.`;
}

function compactMoney(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return money.format(value);
}

function percent(value, total) {
  return `${(total ? value / total * 100 : 0).toFixed(0)}%`;
}

function amortizationRows() {
  const result = state.comparisonResults.find((item) => item.name === state.amortScenarioName) || state.currentResult;
  if (!result) return [];
  if (elements.amortView.value === "annual") return annualize(result);
  return result.amortizationSchedule.map((entry) => ({ period: `${result.paymentFrequency === "biweekly" ? "Payment" : "Month"} ${entry.periodIndex}`, payment: entry.paymentAmount, principal: entry.principalComponent, interest: entry.interestComponent, balance: entry.remainingBalance }));
}

function renderAmortization(showAll = false) {
  const rows = amortizationRows();
  const annual = elements.amortView.value === "annual";
  const pageSize = showAll ? Math.max(rows.length, 1) : state.pageSize;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.page = Math.min(state.page, pages);
  const visible = rows.slice((state.page - 1) * pageSize, state.page * pageSize);
  elements.amortBody.innerHTML = visible.map((row) => `<tr><td>${row.period}</td><td>${moneyExact.format(row.payment)}</td><td class="principal">${moneyExact.format(row.principal)}</td><td class="interest">${moneyExact.format(row.interest)}</td><td>${moneyExact.format(row.balance)}</td></tr>`).join("");
  elements.previous.disabled = state.page <= 1;
  elements.next.disabled = state.page >= pages;
  elements.pageStatus.textContent = `Page ${state.page} of ${pages} · ${rows.length} ${annual ? "annual rows" : "payments"}`;
}

async function calculateAll({ scroll = false } = {}) {
  clearError();
  try {
    const input = readInput();
    const result = parseEngineResponse(calculate_scenario(JSON.stringify(input)));
    let baseline = null;
    if (input.extraPaymentPerPeriod > 0) baseline = parseEngineResponse(calculate_scenario(JSON.stringify({ ...input, name: "Without extra payments", extraPaymentPerPeriod: 0 })));
    state.currentInput = input;
    state.currentResult = result;
    state.baselineResult = baseline;
    state.page = 1;
    renderPrimary(input, result, baseline);
    const compareInputs = activeComparisonInputs();
    const compareResults = compareInputs.length > 1
      ? parseEngineResponse(calculate_multi_scenario(JSON.stringify(compareInputs)))
      : [parseEngineResponse(calculate_scenario(JSON.stringify(compareInputs[0])))];
    renderComparison(compareInputs, compareResults);
    renderCharts(compareResults);
    renderAmortization();
    syncUrl();
    if (scroll) elements.content.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    showError(error instanceof Error ? error.message : "The mortgage calculation could not be completed.");
  }
}

function addCurrentScenario(inputOverride = null) {
  try {
    if (state.saved.length >= 5) {
      showScenarioLimitDialog();
      return;
    }
    const input = inputOverride || readInput();
    if (state.saved.some((item) => scenarioSignature(item) === scenarioSignature(input))) throw new Error("That mortgage scenario is already saved.");
    state.saved.push({ ...input, name: `Scenario ${String.fromCharCode(65 + state.saved.length)}` });
    renderChips();
    calculateAll();
  } catch (error) { showError(error.message); }
}

function applyPreset(type) {
  try {
    const input = readInput();
    if (type === "rate") input.annualInterestRate = Math.round((input.annualInterestRate + .5) * 100) / 100;
    if (type === "term") input.termYears = 15;
    if (type === "extra") input.extraPaymentPerPeriod = 200;
    if (type === "biweekly") input.paymentFrequency = "biweekly";
    addCurrentScenario(input);
  } catch (error) { showError(error.message); }
}

function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportRows() {
  return amortizationRows();
}

function exportCsv() {
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const data = [["Period", "Payment", "Principal", "Interest", "Balance"], ...exportRows().map((row) => [row.period, row.payment.toFixed(2), row.principal.toFixed(2), row.interest.toFixed(2), row.balance.toFixed(2)])];
  download(data.map((row) => row.map(quote).join(",")).join("\r\n"), `mortgage-amortization-${elements.amortView.value}.csv`, "text/csv");
}

function exportText() {
  const data = [["Period", "Payment", "Principal", "Interest", "Balance"], ...exportRows().map((row) => [row.period, moneyExact.format(row.payment), moneyExact.format(row.principal), moneyExact.format(row.interest), moneyExact.format(row.balance)])];
  const widths = data[0].map((_, column) => Math.max(...data.map((row) => row[column].length)));
  download(data.map((row) => row.map((value, i) => i ? value.padStart(widths[i]) : value.padEnd(widths[i])).join("  ")).join("\r\n"), `mortgage-amortization-${elements.amortView.value}.txt`, "text/plain");
}

function preparePrintReport() {
  if (!state.currentResult) return;
  if (!document.body.classList.contains("print-report")) state.printCompositionScenarioName = state.compositionScenarioName;
  const selectedIndex = Math.max(0, state.comparisonResults.findIndex((result) => result.name === state.amortScenarioName));
  const selectedResult = state.comparisonResults[selectedIndex] || state.currentResult;
  const selectedInput = state.comparisonInputs[selectedIndex] || state.currentInput;
  let baseline = null;
  if (selectedInput.extraPaymentPerPeriod > 0) {
    baseline = parseEngineResponse(calculate_scenario(JSON.stringify({ ...selectedInput, name: "Without extra payments", extraPaymentPerPeriod: 0 })));
  }
  renderPrintSummary(selectedInput, selectedResult, baseline);
  renderCharts([selectedResult]);
  renderAmortization(true);
  document.body.classList.add("print-report");
}

function restoreAfterPrint() {
  if (!document.body.classList.contains("print-report")) return;
  document.body.classList.remove("print-report");
  state.compositionScenarioName = state.printCompositionScenarioName;
  state.printCompositionScenarioName = null;
  renderCharts(state.comparisonResults);
  renderAmortization();
}

function openPrintReport(saveAsPdf) {
  if (saveAsPdf) elements.downloadStatus.textContent = "In the print dialog, choose Save as PDF.";
  preparePrintReport();
  try { window.print(); }
  finally { restoreAfterPrint(); }
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const setNumber = (key, element, min, max) => { if (!params.has(key)) return; const value = Number(params.get(key)); if (Number.isFinite(value) && value >= min && value <= max) element.value = String(value); };
  setNumber("amount", elements.amount, 1000, 100000000);
  setNumber("rate", elements.rate, 0, 100);
  setNumber("term", elements.term, 1, 100);
  setNumber("extra", elements.extra, 0, 1000000);
  if (["monthly", "biweekly"].includes(params.get("freq"))) elements.frequency.value = params.get("freq");
  const amount = Number(elements.amount.value);
  elements.amountRange.value = String(Math.min(Number(elements.amountRange.max), Math.max(Number(elements.amountRange.min), amount)));
  updateAmountOutput();
}

function bindEvents() {
  elements.form.addEventListener("submit", (event) => { event.preventDefault(); calculateAll({ scroll: true }); });
  elements.downPaymentButton.addEventListener("click", openDownPaymentDialog);
  elements.homePrice.addEventListener("input", () => updateDownPaymentCalculation("percent"));
  elements.downPaymentPercent.addEventListener("input", () => updateDownPaymentCalculation("percent"));
  elements.downPaymentAmount.addEventListener("input", () => updateDownPaymentCalculation("amount"));
  elements.downPaymentForm.addEventListener("submit", applyDownPayment);
  elements.downPaymentDialog.querySelector("[data-close-down-payment]").addEventListener("click", () => elements.downPaymentDialog.close());
  elements.amount.addEventListener("input", () => { elements.amountRange.value = String(Math.min(Number(elements.amountRange.max), Math.max(Number(elements.amountRange.min), Number(elements.amount.value) || 0))); updateAmountOutput(); });
  elements.amountRange.addEventListener("input", () => { elements.amount.value = elements.amountRange.value; updateAmountOutput(); });
  elements.add.addEventListener("click", () => addCurrentScenario());
  elements.clear.addEventListener("click", () => { state.saved = []; renderChips(); calculateAll(); });
  elements.chips.addEventListener("click", removeSavedScenario);
  elements.inputChips.addEventListener("click", removeSavedScenario);
  document.querySelector(".preset-row").addEventListener("click", (event) => { const button = event.target.closest("[data-preset]"); if (button) applyPreset(button.dataset.preset); });
  elements.amortView.addEventListener("change", () => { state.page = 1; renderAmortization(); });
  elements.summaryScenario.addEventListener("change", () => {
    const index = Number(elements.summaryScenario.value);
    const input = state.comparisonInputs[index];
    const result = state.comparisonResults[index];
    if (!input || !result) return;
    state.summaryScenarioName = result.name;
    renderSummaryMetrics(input, result, baselineFor(input));
  });
  elements.reportScenario.addEventListener("change", () => {
    const index = Number(elements.reportScenario.value);
    const input = state.comparisonInputs[index];
    const result = state.comparisonResults[index];
    if (!input || !result) return;
    state.reportScenarioName = result.name;
    renderScenarioReport(input, result, baselineFor(input));
  });
  elements.amortScenario.addEventListener("change", () => {
    const result = state.comparisonResults[Number(elements.amortScenario.value)];
    if (!result) return;
    state.amortScenarioName = result.name;
    elements.amortScenarioLabel.textContent = result.name;
    state.page = 1;
    renderAmortization();
  });
  elements.compositionScenario.addEventListener("change", () => {
    const result = state.comparisonResults[Number(elements.compositionScenario.value)];
    if (!result) return;
    state.compositionScenarioName = result.name;
    elements.compositionScenarioLabel.textContent = result.name;
    renderCompositionChart(result);
  });
  elements.previous.addEventListener("click", () => { if (state.page > 1) { state.page--; renderAmortization(); } });
  elements.next.addEventListener("click", () => { state.page++; renderAmortization(); });
  $("copyLinkButton").addEventListener("click", async () => { const selected = state.comparisonInputs.find((input) => input.name === state.summaryScenarioName) || state.currentInput; try { await navigator.clipboard.writeText(currentUrl(selected).toString()); elements.copyStatus.textContent = "Link copied."; } catch (_) { elements.copyStatus.textContent = "Copy the URL from your address bar."; } setTimeout(() => { elements.copyStatus.textContent = ""; }, 2500); });
  $("csvButton").addEventListener("click", exportCsv); $("txtButton").addEventListener("click", exportText);
  $("pdfButton").addEventListener("click", () => openPrintReport(true));
  $("printButton").addEventListener("click", () => openPrintReport(false));
  window.addEventListener("beforeprint", preparePrintReport);
  window.addEventListener("afterprint", restoreAfterPrint);
}

async function start() {
  bindEvents();
  readUrl();
  try {
    await init();
    const approvedHost = verify_domain(window.location.host)
      || (window.location.hostname === "127.0.0.1" && verify_domain(window.location.hostname));
    if (!approvedHost) throw new Error("Mortgage engine is not available on this host.");
    elements.status.classList.add("ready");
    await calculateAll();
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : "Mortgage engine is not available on this host.";
    elements.status.classList.remove("ready");
    elements.status.classList.add("failed");
    $("calculateButton").disabled = true;
    elements.add.disabled = true;
  }
}

start();
