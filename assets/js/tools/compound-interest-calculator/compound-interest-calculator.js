import init, {
  calculate_compound_multi_scenario,
  calculate_compound_scenario,
  verify_domain,
} from "/assets/wasm/mortgage/mortgage_engine.js?v=20260809-period-contributions-1";
import { initChart, updateChart } from "/assets/js/tools/compound-interest-calculator/compound-interest-chart.js?v=20260809-interactive-4";

const $ = (id) => document.getElementById(id);
const colors = ["#4ade80", "#fb923c", "#60a5fa", "#c084fc", "#facc15"];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const moneyExact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const elements = {
  principal: $("principal"), principalSlider: $("principalSlider"), principalVal: $("principalVal"),
  rate: $("annualRate"), rateSlider: $("annualRateSlider"), rateVal: $("annualRateVal"),
  years: $("years"), yearsSlider: $("yearsSlider"), yearsVal: $("yearsVal"),
  frequency: $("compoundFreq"), contribution: $("monthlyContrib"), contributionSlider: $("monthlyContribSlider"), contributionVal: $("monthlyContribVal"),
  tax: $("taxRate"), taxSlider: $("taxRateSlider"), taxVal: $("taxRateVal"), inflation: $("inflationRate"), inflationSlider: $("inflationRateSlider"), inflationVal: $("inflationRateVal"),
  add: $("addScenarioBtn"), error: $("calcError"), empty: $("resultsEmpty"), cards: $("resultsCards"),
  final: $("resFinal"), real: $("resReal"), contributions: $("resContribs"), interest: $("resInterest"), roi: $("resROI"), taxPaid: $("resTax"), taxSub: $("resTaxSub"),
  barPrincipal: $("barPrincipal"), barContribution: $("barContrib"), barInterest: $("barInterest"), pctPrincipal: $("pctPrincipal"), pctContribution: $("pctContrib"), pctInterest: $("pctInterest"),
  ruleRate: $("r72Rate"), ruleYears: $("r72Years"), shareLine: $("shareLine"), copy: $("copyLinkBtn"), copyConfirm: $("copyConfirm"),
  scenarioList: $("compoundScenarioList"), clearScenarios: $("clearCompoundScenarios"), comparisonWrap: $("compoundComparisonWrap"), comparisonBody: $("compoundComparisonBody"),
  chartsSection: $("compoundChartsSection"), growthChart: $("compoundGrowthChart"), endingChart: $("compoundEndingChart"), compositionChart: $("compoundCompositionChart"),
  chartStage: $("compoundChartStage"), chartControls: $("compoundChartControls"), chartScenarioToggles: $("compoundChartScenarioToggles"), chartTooltip: $("compoundChartTooltip"), chartPin: $("compoundChartPin"), chartReset: $("compoundChartReset"), yearlyGrowthChart: $("compoundYearlyGrowthChart"),
  growthSection: $("growthSection"), growthHead: $("growthHead"), growthBody: $("growthBody"), tableView: $("tableView"), printScenario: $("printScenarioSelect"), print: $("growthPrintBtn"), pdf: $("growthPdfBtn"), pdfConfirm: $("growthPdfConfirm"), csv: $("growthCsvBtn"), txt: $("growthTxtBtn"),
  printReport: $("compoundPrintReport"), printTitle: $("compoundPrintTitle"), printAssumptions: $("compoundPrintAssumptions"), printSummary: $("compoundPrintSummary"), printLegend: $("compoundPrintLegend"), printGrowthChart: $("compoundPrintGrowthChart"), printEndingChart: $("compoundPrintEndingChart"), printCompositionChart: $("compoundPrintCompositionChart"), printUrlScenario: $("compoundPrintUrlScenario"), printScenarioUrl: $("compoundPrintScenarioUrl"),
};

const state = { currentInput: null, currentResult: null, savedInputs: [], savedResults: [], selectedName: null, printScenarioName: null, yearlyData: [], prePrintYearlyData: null };

function parseEngineResponse(value) {
  const parsed = JSON.parse(value);
  if (parsed?.error) throw new Error(parsed.error);
  return parsed;
}

function readInput(name = "Current plan") {
  const input = {
    name,
    principal: Number(elements.principal.value),
    annualInterestRate: Number(elements.rate.value),
    years: Number(elements.years.value),
    compoundingPeriodsPerYear: Number(elements.frequency.value),
    monthlyContribution: Number(elements.contribution.value),
    taxRate: Number(elements.tax.value),
    inflationRate: Number(elements.inflation.value),
  };
  if (!Number.isFinite(input.principal) || input.principal < 0) throw new Error("Enter an initial investment of $0 or more.");
  if (!Number.isFinite(input.annualInterestRate) || input.annualInterestRate < 0 || input.annualInterestRate > 100) throw new Error("Enter an annual interest rate between 0% and 100%.");
  if (!Number.isInteger(input.years) || input.years < 1 || input.years > 100) throw new Error("Enter an investment period from 1 to 100 years.");
  if (!Number.isFinite(input.monthlyContribution) || input.monthlyContribution < 0) throw new Error("Monthly contribution cannot be negative.");
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 100) throw new Error("Tax rate must be between 0% and 100%.");
  if (!Number.isFinite(input.inflationRate) || input.inflationRate < 0 || input.inflationRate > 100) throw new Error("Inflation rate must be between 0% and 100%.");
  return input;
}

function scenarioSignature(input) {
  return [input.principal, input.annualInterestRate, input.years, input.compoundingPeriodsPerYear, input.monthlyContribution, input.taxRate, input.inflationRate].join("|");
}

function scenarioSubtitle(input) {
  return `${input.annualInterestRate}% · ${input.years}y · ${money.format(input.monthlyContribution)}/mo`;
}

function showError(error) {
  elements.error.textContent = error instanceof Error ? error.message : String(error);
  elements.error.style.display = "block";
}

function clearError() {
  elements.error.style.display = "none";
}

function syncPair(slider, input, display, formatter) {
  const update = (value) => { display.textContent = formatter(value); };
  slider.addEventListener("input", () => { input.value = slider.value; update(Number(slider.value)); });
  input.addEventListener("input", () => { const value = Number(input.value); if (Number.isFinite(value)) { slider.value = String(value); update(value); } });
}

function setInputs(input) {
  const set = (field, slider, display, value, formatter) => { field.value = String(value); slider.value = String(value); display.textContent = formatter(value); };
  set(elements.principal, elements.principalSlider, elements.principalVal, input.principal, (v) => money.format(v));
  set(elements.rate, elements.rateSlider, elements.rateVal, input.annualInterestRate, (v) => `${Number(v).toFixed(2)}%`);
  set(elements.years, elements.yearsSlider, elements.yearsVal, input.years, (v) => `${v} ${v === 1 ? "year" : "years"}`);
  set(elements.contribution, elements.contributionSlider, elements.contributionVal, input.monthlyContribution, (v) => money.format(v));
  set(elements.tax, elements.taxSlider, elements.taxVal, input.taxRate, (v) => `${v}%`);
  set(elements.inflation, elements.inflationSlider, elements.inflationVal, input.inflationRate, (v) => `${Number(v).toFixed(1)}%`);
  elements.frequency.value = String(input.compoundingPeriodsPerYear);
}

function renderSummary(input, result) {
  state.currentInput = input;
  state.currentResult = result;
  state.yearlyData = result.yearly;
  elements.final.textContent = money.format(result.finalBalance);
  elements.real.textContent = money.format(result.realBalance);
  elements.contributions.textContent = money.format(result.totalContributions);
  elements.interest.textContent = money.format(result.totalNetInterest);
  const roi = result.totalContributions > 0 ? result.totalNetInterest / result.totalContributions * 100 : 0;
  elements.roi.textContent = `Net growth equals ${roi.toFixed(1)}% of contributions`;
  elements.taxPaid.textContent = money.format(result.totalTax);
  elements.taxSub.textContent = input.taxRate > 0 ? `at ${input.taxRate}% tax rate` : "tax rate set to 0%";

  const principalShare = result.finalBalance > 0 ? input.principal / result.finalBalance * 100 : 0;
  const addedContributions = Math.max(0, result.totalContributions - input.principal);
  const contributionShare = result.finalBalance > 0 ? addedContributions / result.finalBalance * 100 : 0;
  const interestShare = Math.max(0, 100 - principalShare - contributionShare);
  elements.barPrincipal.style.width = `${principalShare.toFixed(1)}%`;
  elements.barContribution.style.width = `${contributionShare.toFixed(1)}%`;
  elements.barInterest.style.width = `${interestShare.toFixed(1)}%`;
  elements.pctPrincipal.textContent = principalShare.toFixed(1);
  elements.pctContribution.textContent = contributionShare.toFixed(1);
  elements.pctInterest.textContent = interestShare.toFixed(1);
  elements.ruleRate.textContent = input.annualInterestRate.toFixed(2);
  elements.ruleYears.textContent = input.annualInterestRate > 0 ? (72 / input.annualInterestRate).toFixed(1) : "—";

  elements.empty.style.display = "none";
  elements.cards.style.display = "flex";
  elements.growthSection.style.display = "block";
  elements.shareLine.style.display = "flex";
  renderTable(elements.tableView.value);
  renderPrintScenarioOptions();
}

function renderTable(mode) {
  elements.growthHead.replaceChildren();
  elements.growthBody.replaceChildren();
  const showReal = mode === "real" || mode === "both";
  const showNominal = mode === "nominal" || mode === "both";
  const head = document.createElement("tr");
  head.innerHTML = "<th>Year</th><th>Gross Interest</th><th>Tax Paid</th><th>Net Interest</th><th>Contributions</th>";
  if (showNominal) head.innerHTML += "<th>Balance</th>";
  if (showReal) head.innerHTML += "<th>Real Balance</th>";
  elements.growthHead.appendChild(head);
  state.yearlyData.forEach((row) => {
    const tr = document.createElement("tr");
    if ([5, 10, 15, 20, 25, 30, 40, 50].includes(row.year)) tr.className = "milestone";
    tr.innerHTML = `<td>Year ${row.year}</td><td class="td-interest">${moneyExact.format(row.grossInterest)}</td><td class="td-tax">${moneyExact.format(row.taxPaid)}</td><td class="td-interest">${moneyExact.format(row.netInterest)}</td><td>${money.format(row.contributions)}</td>${showNominal ? `<td class="td-balance">${money.format(row.balance)}</td>` : ""}${showReal ? `<td class="td-real">${money.format(row.realBalance)}</td>` : ""}`;
    elements.growthBody.appendChild(tr);
  });
}

function renderScenarioList() {
  elements.scenarioList.replaceChildren();
  elements.clearScenarios.hidden = state.savedInputs.length === 0;
  elements.comparisonWrap.hidden = state.savedResults.length < 2;
  const selected = state.savedInputs.find((input) => input.name === state.selectedName);
  elements.add.textContent = selected ? `Done editing ${selected.name}` : "Add scenario";
  elements.add.classList.toggle("is-editing", Boolean(selected));
  elements.add.setAttribute("aria-pressed", String(Boolean(selected)));
  elements.add.title = selected ? `Finish editing ${selected.name}` : "Save these inputs as a scenario";
  if (!state.savedInputs.length) {
    elements.scenarioList.innerHTML = '<p class="compound-scenario-empty">No saved scenarios yet.</p>';
    return;
  }
  state.savedInputs.forEach((input, index) => {
    const item = document.createElement("div");
    item.className = `compound-scenario-chip${state.selectedName === input.name ? " is-selected" : ""}`;
    item.innerHTML = `<button type="button" data-scenario-select="${index}" aria-pressed="${state.selectedName === input.name}"><strong>${input.name}</strong><small>${scenarioSubtitle(input)}</small></button><button type="button" class="compound-scenario-remove" data-scenario-remove="${index}" aria-label="Remove ${input.name}">×</button>`;
    elements.scenarioList.appendChild(item);
  });
}

function renderPrintScenarioOptions() {
  const inputs = state.savedInputs.length ? state.savedInputs : state.currentInput ? [state.currentInput] : [];
  const preferred = inputs.some((input) => input.name === state.printScenarioName)
    ? state.printScenarioName
    : state.selectedName && inputs.some((input) => input.name === state.selectedName)
      ? state.selectedName
      : inputs[0]?.name;
  elements.printScenario.replaceChildren();
  inputs.forEach((input) => {
    const option = document.createElement("option");
    option.value = input.name;
    option.textContent = input.name;
    elements.printScenario.appendChild(option);
  });
  if (preferred) elements.printScenario.value = preferred;
  state.printScenarioName = preferred || null;
}

function renderComparison() {
  elements.comparisonBody.innerHTML = state.savedResults.map((result, index) => `<tr><td><strong>${result.name}</strong><small>${scenarioSubtitle(state.savedInputs[index])}</small></td><td>${money.format(result.finalBalance)}</td><td>${money.format(result.realBalance)}</td><td>${money.format(result.totalContributions)}</td><td>${money.format(result.totalNetInterest)}</td><td>${money.format(result.totalTax)}</td></tr>`).join("");
}

function svgShell(width, height, content, label) {
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">${content}</svg>`;
}

function compactMoney(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return money.format(value);
}

function renderGrowthChart(inputs, results, target = elements.printGrowthChart, legendTarget = elements.printLegend) {
  const width = 900, height = 330, left = 72, right = 24, top = 20, bottom = 44;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const maxYears = Math.max(...inputs.map((input) => input.years), 1);
  const maxBalance = Math.max(...results.flatMap((result) => result.yearly.map((row) => row.balance)), 1);
  let content = "";
  [0, .25, .5, .75, 1].forEach((fraction) => {
    const y = top + plotHeight * (1 - fraction);
    content += `<line class="compound-chart-gridline" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/><text class="compound-chart-axis" x="${left - 8}" y="${y + 4}" text-anchor="end">${compactMoney(maxBalance * fraction)}</text>`;
  });
  [0, .25, .5, .75, 1].forEach((fraction) => {
    const x = left + plotWidth * fraction;
    content += `<text class="compound-chart-axis" x="${x}" y="${height - 12}" text-anchor="middle">${Math.round(maxYears * fraction)}y</text>`;
  });
  results.forEach((result, index) => {
    const nominal = [{ year: 0, value: inputs[index].principal }, ...result.yearly.map((row) => ({ year: row.year, value: row.balance }))];
    const real = [{ year: 0, value: inputs[index].principal }, ...result.yearly.map((row) => ({ year: row.year, value: row.realBalance }))];
    const points = (rows) => rows.map((row) => `${left + row.year / maxYears * plotWidth},${top + plotHeight * (1 - row.value / maxBalance)}`).join(" ");
    content += `<polyline class="compound-chart-line" stroke="${colors[index]}" points="${points(nominal)}"/><polyline class="compound-chart-line compound-chart-line-real" stroke="${colors[index]}" points="${points(real)}"/>`;
  });
  target.innerHTML = svgShell(width, height, content, "Nominal and real compound balance growth over time");
  legendTarget.innerHTML = results.map((result, index) => `<span><i style="background:${colors[index]}"></i>${result.name}</span>`).join("");
}

function renderBarChart(target, results, values, label) {
  const width = 760, rowHeight = 58, left = 150, right = 100;
  const height = Math.max(150, results.length * rowHeight + 30), plotWidth = width - left - right;
  const max = Math.max(...values, 1);
  let content = "";
  results.forEach((result, index) => {
    const y = 15 + index * rowHeight;
    const barWidth = values[index] / max * plotWidth;
    content += `<text class="compound-chart-axis compound-chart-label" x="${left - 10}" y="${y + 27}" text-anchor="end">${result.name}</text><rect x="${left}" y="${y + 8}" width="${plotWidth}" height="25" rx="12.5" fill="rgba(183,247,207,.08)"/><rect x="${left}" y="${y + 8}" width="${barWidth}" height="25" rx="12.5" fill="${colors[index]}"/><text class="compound-chart-axis compound-chart-value" x="${Math.min(width - 4, left + barWidth + 8)}" y="${y + 27}">${compactMoney(values[index])}</text>`;
  });
  target.innerHTML = svgShell(width, height, content, label);
}

function renderCompositionChart(results, target = elements.compositionChart) {
  const width = 760, rowHeight = 58, left = 150, right = 24;
  const height = Math.max(150, results.length * rowHeight + 30), plotWidth = width - left - right;
  let content = "";
  results.forEach((result, index) => {
    const y = 15 + index * rowHeight;
    const total = Math.max(result.finalBalance, 1);
    const contributionWidth = Math.min(plotWidth, result.totalContributions / total * plotWidth);
    const interestWidth = Math.max(0, plotWidth - contributionWidth);
    content += `<text class="compound-chart-axis compound-chart-label" x="${left - 10}" y="${y + 27}" text-anchor="end">${result.name}</text><rect x="${left}" y="${y + 8}" width="${contributionWidth}" height="25" rx="12.5" fill="#60a5fa"/><rect x="${left + contributionWidth}" y="${y + 8}" width="${interestWidth}" height="25" rx="12.5" fill="#4ade80"/>`;
  });
  content += `<text class="compound-chart-axis" x="${left}" y="${height - 5}">Blue: contributions · Green: net interest</text>`;
  target.innerHTML = svgShell(width, height, content, "Contributions and net interest composition by scenario");
}

function renderCharts() {
  const inputs = state.savedInputs.length ? state.savedInputs : state.currentInput ? [state.currentInput] : [];
  const results = state.savedResults.length ? state.savedResults : state.currentResult ? [state.currentResult] : [];
  elements.chartsSection.hidden = results.length === 0;
  if (!results.length) return;
  updateChart(inputs, results);
  renderBarChart(elements.endingChart, results, results.map((result) => result.finalBalance), "Ending balance by compound interest scenario");
  renderCompositionChart(results);
}

function calculateSavedScenarios() {
  state.savedResults = state.savedInputs.length ? parseEngineResponse(calculate_compound_multi_scenario(JSON.stringify(state.savedInputs))) : [];
  renderScenarioList();
  renderComparison();
  renderCharts();
}

function runCalculation({ scroll = false } = {}) {
  clearError();
  try {
    const input = readInput(state.selectedName || "Current plan");
    const selectedIndex = state.savedInputs.findIndex((saved) => saved.name === state.selectedName);
    let result;
    if (selectedIndex >= 0) {
      state.savedInputs[selectedIndex] = input;
      calculateSavedScenarios();
      result = state.savedResults[selectedIndex];
    } else {
      result = parseEngineResponse(calculate_compound_scenario(JSON.stringify(input)));
      state.currentInput = input;
      state.currentResult = result;
      renderCharts();
    }
    renderSummary(input, result);
    if (scroll) elements.cards.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return { input, result };
  } catch (error) {
    showError(error);
    return null;
  }
}

function addScenario() {
  clearError();
  try {
    if (state.savedInputs.some((input) => input.name === state.selectedName)) {
      state.selectedName = null;
      renderScenarioList();
      return;
    }
    if (state.savedInputs.length >= 5) throw new Error("You can compare up to five scenarios. Remove one before adding another.");
    const input = readInput(`Scenario ${String.fromCharCode(65 + state.savedInputs.length)}`);
    if (state.savedInputs.some((saved) => scenarioSignature(saved) === scenarioSignature(input))) throw new Error("That growth scenario is already saved.");
    state.savedInputs.push(input);
    state.selectedName = input.name;
    state.printScenarioName = input.name;
    calculateSavedScenarios();
    const result = state.savedResults[state.savedResults.length - 1];
    renderSummary(input, result);
  } catch (error) {
    showError(error);
  }
}

function handleScenarioClick(event) {
  const remove = event.target.closest("[data-scenario-remove]");
  if (remove) {
    const index = Number(remove.dataset.scenarioRemove);
    state.savedInputs.splice(index, 1);
    state.savedInputs.forEach((input, nextIndex) => { input.name = `Scenario ${String.fromCharCode(65 + nextIndex)}`; });
    state.selectedName = state.savedInputs[0]?.name || null;
    state.printScenarioName = state.selectedName;
    calculateSavedScenarios();
    if (state.savedResults.length) { setInputs(state.savedInputs[0]); renderSummary(state.savedInputs[0], state.savedResults[0]); }
    else { renderScenarioList(); renderPrintScenarioOptions(); }
    return;
  }
  const select = event.target.closest("[data-scenario-select]");
  if (!select) return;
  const index = Number(select.dataset.scenarioSelect);
  const input = state.savedInputs[index], result = state.savedResults[index];
  if (!input || !result) return;
  state.selectedName = input.name;
  state.printScenarioName = input.name;
  setInputs(input);
  renderSummary(input, result);
  renderScenarioList();
}

function buildBookmarkableUrl() {
  const input = state.currentInput || readInput();
  const url = new URL(window.location.href);
  url.search = new URLSearchParams({ principal: String(input.principal), rate: String(input.annualInterestRate), years: String(input.years), compound: String(input.compoundingPeriodsPerYear), contrib: String(input.monthlyContribution), tax: String(input.taxRate), inflation: String(input.inflationRate) }).toString();
  url.hash = "";
  return url.toString();
}

function publicScenarioUrl(input) {
  const url = new URL("https://monkeytactics.com/tools/compound-interest-calculator");
  url.search = new URLSearchParams({ principal: String(input.principal), rate: String(input.annualInterestRate), years: String(input.years), compound: String(input.compoundingPeriodsPerYear), contrib: String(input.monthlyContribution), tax: String(input.taxRate), inflation: String(input.inflationRate) }).toString();
  return url.toString();
}

function exportColumns() {
  const columns = [{ key: "year", label: "Year" }, { key: "grossInterest", label: "Gross Interest" }, { key: "taxPaid", label: "Tax Paid" }, { key: "netInterest", label: "Net Interest" }, { key: "contributions", label: "Contributions" }];
  if (["nominal", "both"].includes(elements.tableView.value)) columns.push({ key: "balance", label: "Balance" });
  if (["real", "both"].includes(elements.tableView.value)) columns.push({ key: "realBalance", label: "Real Balance" });
  return columns;
}

function download(content, extension, type) {
  if (!state.yearlyData.length) return;
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url; link.download = `compound-interest-growth-${elements.tableView.value}.${extension}`; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportCsv() {
  const columns = exportColumns();
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return [columns.map((column) => column.label), ...state.yearlyData.map((row) => columns.map((column) => column.key === "year" ? row.year : row[column.key].toFixed(2)))].map((row) => row.map(quote).join(",")).join("\r\n");
}

function exportText() {
  const columns = exportColumns();
  const rows = [columns.map((column) => column.label), ...state.yearlyData.map((row) => columns.map((column) => column.key === "year" ? `Year ${row.year}` : moneyExact.format(row[column.key])))];
  const widths = columns.map((_, index) => Math.max(...rows.map((row) => row[index].length)));
  return rows.map((row) => row.map((value, index) => index === 0 ? value.padEnd(widths[index]) : value.padStart(widths[index])).join("  ")).join("\r\n");
}

function printSelection() {
  if (state.savedInputs.length) {
    const index = Math.max(0, state.savedInputs.findIndex((input) => input.name === elements.printScenario.value));
    return { input: state.savedInputs[index], result: state.savedResults[index] };
  }
  return state.currentInput && state.currentResult ? { input: state.currentInput, result: state.currentResult } : null;
}

function preparePrintReport() {
  const selected = printSelection();
  if (!selected) return false;
  const { input, result } = selected;
  if (!state.prePrintYearlyData) state.prePrintYearlyData = state.yearlyData;
  state.yearlyData = result.yearly;
  renderTable(elements.tableView.value);
  elements.printTitle.textContent = input.name === "Current plan" ? "Compound Interest Report" : `${input.name} Compound Interest Report`;
  elements.printAssumptions.textContent = `${moneyExact.format(input.principal)} initial investment · ${input.annualInterestRate}% annual return · ${input.years} years · ${moneyExact.format(input.monthlyContribution)} monthly contribution · ${input.taxRate}% tax · ${input.inflationRate}% inflation`;
  elements.printSummary.innerHTML = [
    ["Scenario", input.name],
    ["Final balance", moneyExact.format(result.finalBalance)],
    ["Real balance", moneyExact.format(result.realBalance)],
    ["Total contributions", moneyExact.format(result.totalContributions)],
    ["Net interest", moneyExact.format(result.totalNetInterest)],
    ["Tax paid", moneyExact.format(result.totalTax)],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  elements.printUrlScenario.textContent = input.name;
  elements.printScenarioUrl.textContent = publicScenarioUrl(input);
  renderGrowthChart([input], [result], elements.printGrowthChart, elements.printLegend);
  renderBarChart(elements.printEndingChart, [result], [result.finalBalance], `Ending balance for ${input.name}`);
  renderCompositionChart([result], elements.printCompositionChart);
  return true;
}

function restoreAfterPrint() {
  document.body.classList.remove("print-growth");
  if (state.prePrintYearlyData) {
    state.yearlyData = state.prePrintYearlyData;
    state.prePrintYearlyData = null;
    renderTable(elements.tableView.value);
  }
}

function printSchedule() {
  if (!preparePrintReport()) return;
  document.body.classList.add("print-growth");
  window.print();
  setTimeout(restoreAfterPrint, 0);
}

function downloadPdf() {
  const selected = printSelection();
  if (!selected || !window.MonkeyTacticsPdf) return;
  const { input, result } = selected;
  const columns = exportColumns();
  window.MonkeyTacticsPdf.downloadReport({
    title: `${input.name} Compound Interest Report`, filename: `compound-interest-${input.name.toLowerCase().replaceAll(" ", "-")}-${elements.tableView.value}.pdf`, landscape: columns.length > 6,
    summary: [{ label: "Scenario", value: input.name }, { label: "Initial investment", value: moneyExact.format(input.principal) }, { label: "Annual interest rate", value: `${input.annualInterestRate.toFixed(2)}%` }, { label: "Investment period", value: `${input.years} years` }, { label: "Monthly contribution", value: moneyExact.format(input.monthlyContribution) }, { label: "Final balance", value: moneyExact.format(result.finalBalance) }, { label: "Real balance", value: moneyExact.format(result.realBalance) }],
    note: "Illustrative estimate only. Actual returns, taxes, fees, and inflation may differ.",
    table: { title: `${input.name} Year-by-Year Growth — ${elements.tableView.options[elements.tableView.selectedIndex].textContent}`, columns: columns.map((column) => ({ label: column.label, width: column.key === "year" ? 8 : 16, align: column.key === "year" ? "left" : "right" })), rows: result.yearly.map((row) => columns.map((column) => column.key === "year" ? `Year ${row.year}` : moneyExact.format(row[column.key]))) },
  });
  elements.pdfConfirm.style.display = "inline";
  setTimeout(() => { elements.pdfConfirm.style.display = "none"; }, 2500);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const input = {
    name: "Current plan",
    principal: Number(params.get("principal") ?? elements.principal.value), annualInterestRate: Number(params.get("rate") ?? elements.rate.value), years: Number(params.get("years") ?? elements.years.value), compoundingPeriodsPerYear: Number(params.get("compound") ?? elements.frequency.value), monthlyContribution: Number(params.get("contrib") ?? elements.contribution.value), taxRate: Number(params.get("tax") ?? elements.tax.value), inflationRate: Number(params.get("inflation") ?? elements.inflation.value),
  };
  setInputs(input);
  runCalculation();
}

function bindEvents() {
  syncPair(elements.principalSlider, elements.principal, elements.principalVal, (value) => money.format(value));
  syncPair(elements.rateSlider, elements.rate, elements.rateVal, (value) => `${value.toFixed(2)}%`);
  syncPair(elements.yearsSlider, elements.years, elements.yearsVal, (value) => `${Math.round(value)} ${Math.round(value) === 1 ? "year" : "years"}`);
  syncPair(elements.contributionSlider, elements.contribution, elements.contributionVal, (value) => money.format(value));
  syncPair(elements.taxSlider, elements.tax, elements.taxVal, (value) => `${Math.round(value)}%`);
  syncPair(elements.inflationSlider, elements.inflation, elements.inflationVal, (value) => `${value.toFixed(1)}%`);
  [elements.principal, elements.principalSlider, elements.rate, elements.rateSlider, elements.years, elements.yearsSlider, elements.contribution, elements.contributionSlider, elements.tax, elements.taxSlider, elements.inflation, elements.inflationSlider].forEach((control) => control.addEventListener("input", () => runCalculation()));
  elements.frequency.addEventListener("change", () => runCalculation());
  elements.add.addEventListener("click", addScenario);
  elements.scenarioList.addEventListener("click", handleScenarioClick);
  elements.clearScenarios.addEventListener("click", () => { state.savedInputs = []; state.savedResults = []; state.selectedName = null; state.printScenarioName = null; renderScenarioList(); renderComparison(); runCalculation(); });
  elements.tableView.addEventListener("change", () => renderTable(elements.tableView.value));
  elements.printScenario.addEventListener("change", () => { state.printScenarioName = elements.printScenario.value; });
  elements.print.addEventListener("click", printSchedule);
  elements.pdf.addEventListener("click", downloadPdf);
  elements.csv.addEventListener("click", () => download(exportCsv(), "csv", "text/csv"));
  elements.txt.addEventListener("click", () => download(exportText(), "txt", "text/plain"));
  elements.copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(buildBookmarkableUrl()); elements.copyConfirm.style.display = "inline"; setTimeout(() => { elements.copyConfirm.style.display = "none"; }, 2500); } catch (_) { showError("Copy the URL from your address bar."); } });
  window.addEventListener("afterprint", restoreAfterPrint);
}

async function start() {
  initChart({
    container: elements.growthChart,
    bars: elements.yearlyGrowthChart,
    stage: elements.chartStage,
    controls: elements.chartControls,
    scenarioToggles: elements.chartScenarioToggles,
    tooltip: elements.chartTooltip,
    pinned: elements.chartPin,
    reset: elements.chartReset,
  });
  bindEvents();
  try {
    await init({ module_or_path: "/assets/wasm/mortgage/mortgage_engine_bg.wasm?v=20260809-period-contributions-1" });
    const approvedHost = verify_domain(window.location.host) || (window.location.hostname === "127.0.0.1" && verify_domain(window.location.hostname));
    if (!approvedHost) throw new Error("The shared finance engine is not available on this host.");
    readUrl();
  } catch (error) {
    showError(error);
    elements.add.disabled = true;
  }
}

start();
