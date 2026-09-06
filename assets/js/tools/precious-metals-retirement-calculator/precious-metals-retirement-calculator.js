import init, { solve_retirement_spending, verify_domain } from "/assets/wasm/precious-metals-retirement/precious_metals_retirement_engine.js?v=20260905-simplified-v6";
import { estimateHistory, historyToCsv, mergeHistory, parseHistoryCsv } from "./history-estimator.js?v=20260905-history-v1";
import { createPortfolioBackup, parsePortfolioBackup } from "./portfolio-backup.js?v=20260905-portfolio-backup-v1";

const $ = (id) => document.getElementById(id);
const allocationInputs = [...document.querySelectorAll("[data-allocation]")];
const allocationSliders = [...document.querySelectorAll("[data-allocation-slider]")];
const presetButtons = [...document.querySelectorAll("[data-preset]")];
const assumptionRows = [...document.querySelectorAll("[data-assumption]")];
const portfolioDefaults = {
  my: [30, 10, 3, 2, 20, 5, 20, 10],
  balanced: [30, 10, 3, 2, 20, 5, 20, 10],
  preservation: [55, 12, 4, 4, 5, 0, 5, 15],
  miners: [12, 4, 2, 2, 35, 20, 20, 5],
  streamers: [15, 5, 3, 2, 10, 5, 50, 10],
  barbell: [30, 8, 3, 2, 10, 10, 12, 25],
};
const portfolioNames = { my: "My Portfolio", balanced: "Balanced metals", preservation: "Bullion preservation", miners: "Miner dominant", streamers: "Streamer dominant", barbell: "Metals barbell" };
const storageKey = "monkeytactics.precious-metals-retirement.v1";
const historyStorageKey = "monkeytactics.precious-metals-retirement.history.v1";
const planDefaults = { portfolio: 1_000_000, "minimum-budget": 40_000, years: 30, simulations: 10_000, inflation: 3, "legacy-premium": 0, "survival-target": 90, "simulation-seed": 20260905, rebalancing: "annual", "withdrawal-timing": "beginning" };
let portfolios = Object.fromEntries(Object.entries(portfolioDefaults).map(([key, values]) => [key, [...values]]));
let activePortfolio = "my";
const assetLabels = ["gold", "silver", "platinum", "palladium", "seniors", "juniors", "streamers", "cash"];
const assetNames = ["Gold bullion", "Silver bullion", "Platinum bullion", "Palladium bullion", "Senior miners", "Junior miners", "Royalty & streaming", "Cash / T-bills"];
const colors = ["#f4c95d", "#cbd5df", "#86bdd2", "#df9fbd", "#d99539", "#d96b4b", "#8e77dc", "#4fc48a"];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
let engineReady = false;
let runTimer;
let histories = {};

function readNumber(id) { return Number($(id).value); }

function readAssumptions() {
  return assumptionRows.map((row) => [...row.querySelectorAll("input")].map((input) => Number(input.value)));
}

function applyAssumptions(values) {
  if (!Array.isArray(values) || values.length !== assumptionRows.length) return;
  assumptionRows.forEach((row, rowIndex) => [...row.querySelectorAll("input")].forEach((input, columnIndex) => {
    const value = values[rowIndex]?.[columnIndex];
    if (Number.isFinite(value)) input.value = value;
  }));
}

function persistSettings() {
  try {
    const plan = Object.fromEntries(Object.keys(planDefaults).map((id) => [id, $(id).value]));
    localStorage.setItem(storageKey, JSON.stringify({ activePortfolio, portfolios, plan, assumptions: readAssumptions() }));
  } catch { /* Private browsing or storage limits should not block calculations. */ }
}

function restoreHistories() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyStorageKey));
    if (saved && typeof saved === "object") histories = saved;
  } catch { histories = {}; }
}

function persistHistories() {
  try { localStorage.setItem(historyStorageKey, JSON.stringify(histories)); }
  catch { throw new Error("This browser could not save the history. Export a backup and free local storage space."); }
}

function selectedHistoryIndex() { return Number($("history-asset").value); }

function currentHistory() { return histories[selectedHistoryIndex()] || { format: $("history-format").value, rows: [] }; }

function updateHistoryStatus(message = "") {
  const index = selectedHistoryIndex();
  const history = currentHistory();
  if (history.rows.length) {
    const first = history.rows[0].date;
    const last = history.rows.at(-1).date;
    $("history-status").innerHTML = `<strong>${history.rows.length} observations saved</strong> for ${assetNames[index]} · ${first} to ${last} · ${history.format === "prices" ? "prices / levels" : history.format === "percent" ? "percent returns" : "decimal returns"}${message ? `<br>${message}` : ""}`;
  } else $("history-status").textContent = message || `No saved history for ${assetNames[index]}.`;
}

function appendHistoryText(text) {
  const index = selectedHistoryIndex();
  const incoming = parseHistoryCsv(text);
  const existing = currentHistory();
  const format = $("history-format").value;
  if (existing.rows.length && existing.format !== format) throw new Error(`Saved rows use ${existing.format}. Select that format or clear this asset's history first.`);
  const previousCount = existing.rows.length;
  const rows = mergeHistory(existing.rows, incoming);
  histories[index] = { format, rows };
  persistHistories();
  const added = rows.length - previousCount;
  const replaced = incoming.length - added;
  updateHistoryStatus(`Imported ${added} new month${added === 1 ? "" : "s"}${replaced > 0 ? ` and replaced ${replaced}` : ""}.`);
}

function applyHistoryEstimate() {
  const index = selectedHistoryIndex();
  const history = currentHistory();
  const estimate = estimateHistory(history.rows, { format: history.format, lookbackYears: Number($("history-lookback").value) });
  if (estimate.nominalReturn < -20 || estimate.nominalReturn > 30 || estimate.volatility > 100) throw new Error(`The historical estimate (${estimate.nominalReturn.toFixed(1)}% return, ${estimate.volatility.toFixed(1)}% volatility) is outside this model's supported range. Review the data and lookback window.`);
  const row = assumptionRows[index];
  row.querySelector('[data-model="return"]').value = estimate.nominalReturn.toFixed(1);
  row.querySelector('[data-model="volatility"]').value = estimate.volatility.toFixed(1);
  row.querySelector('[data-model="cost"]').value = Number($("history-cost").value).toFixed(1);
  let factorMessage = "Factor exposures were unchanged because matched reference history was not available for at least 24 months.";
  if (estimate.factors) {
    ["metals", "equity", "defensive"].forEach((key, factorIndex) => { row.querySelector(`[data-model="${key}"]`).value = estimate.factors[factorIndex].toFixed(2); });
    factorMessage = `Factor exposures used ${estimate.matchedMonths} matched months.`;
  }
  persistSettings();
  updateHistoryStatus(`<strong>${estimate.confidence.label}</strong> · ${estimate.months} returns used (${estimate.start} to ${estimate.end}). Applied ${estimate.nominalReturn.toFixed(1)}% compound return and ${estimate.volatility.toFixed(1)}% volatility. ${factorMessage}`);
  scheduleRun();
}

function downloadHistory() {
  const history = currentHistory();
  if (!history.rows.length) throw new Error("There is no saved history to export.");
  const blob = new Blob([historyToCsv(history.rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${assetLabels[selectedHistoryIndex()]}-monthly-history.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function reportHistoryError(cause) {
  updateHistoryStatus(`<span class="pm-history-error">${cause instanceof Error ? cause.message : "Unable to process this history."}</span>`);
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved !== "object") return;
    for (const key of Object.keys(portfolioDefaults)) {
      const values = saved.portfolios?.[key];
      if (Array.isArray(values) && values.length === 8 && values.every(Number.isFinite) && Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) < 0.01) portfolios[key] = [...values];
    }
    if (portfolioDefaults[saved.activePortfolio]) activePortfolio = saved.activePortfolio;
    for (const id of Object.keys(planDefaults)) if (saved.plan?.[id] !== undefined) $(id).value = saved.plan[id];
    applyAssumptions(saved.assumptions);
  } catch { /* Ignore malformed local state and use documented defaults. */ }
}

function loadPortfolio(key) {
  activePortfolio = key;
  allocationInputs.forEach((input, index) => {
    input.value = portfolios[key][index];
    allocationSliders[index].value = portfolios[key][index];
  });
  presetButtons.forEach((button) => button.classList.toggle("active", button.dataset.preset === key));
  $("active-portfolio-name").textContent = portfolioNames[key];
}

function showPortfolioMessage(message, isError = false) {
  const status = $("portfolio-message");
  status.textContent = message;
  status.classList.toggle("error", isError);
  status.style.display = "block";
}

function exportPortfolios() {
  const backup = createPortfolioBackup(portfolios, activePortfolio);
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `precious-metals-portfolios-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showPortfolioMessage("Exported all six portfolio mixes. Plan and model assumptions were not included.");
}

async function importPortfolios(file) {
  const imported = parsePortfolioBackup(await file.text());
  portfolios = imported.portfolios;
  activePortfolio = imported.activePortfolio;
  loadPortfolio(activePortfolio);
  persistSettings();
  updateControls();
  showPortfolioMessage("Imported all six portfolio mixes. Plan and model assumptions were left unchanged.");
  scheduleRun();
}

function buildInput(allocations) {
  return {
    initialPortfolio: readNumber("portfolio"),
    minimumAnnualBudget: readNumber("minimum-budget"),
    years: readNumber("years"),
    simulations: readNumber("simulations"),
    // Every comparison uses the same market shocks for an apples-to-apples result.
    seed: readNumber("simulation-seed"),
    inflationRate: readNumber("inflation"),
    legacyCpiPremium: readNumber("legacy-premium"),
    allocations,
    targetSuccessRate: readNumber("survival-target"),
    rebalancing: $("rebalancing").value,
    withdrawalTiming: $("withdrawal-timing").value,
    assetAssumptions: assumptionRows.map((row) => ({
      nominalReturn: Number(row.querySelector('[data-model="return"]').value),
      volatility: Number(row.querySelector('[data-model="volatility"]').value),
      annualCost: Number(row.querySelector('[data-model="cost"]').value),
      metalsFactor: Number(row.querySelector('[data-model="metals"]').value),
      equityFactor: Number(row.querySelector('[data-model="equity"]').value),
      defensiveFactor: Number(row.querySelector('[data-model="defensive"]').value),
    })),
  };
}

function updateControls() {
  const allocations = allocationInputs.map((input) => Number(input.value) || 0);
  const total = allocations.reduce((sum, value) => sum + value, 0);
  $("allocation-total").textContent = `${total.toFixed(total % 1 ? 1 : 0)}%`;
  $("allocation-total").classList.toggle("invalid", Math.abs(total - 100) > 0.01);
  $("allocation-bar").innerHTML = allocations.map((value, index) => `<span style="width:${Math.max(0, value)}%;background:${colors[index]}"></span>`).join("");
  $("budget-summary").textContent = `${money.format(readNumber("minimum-budget") || 0)} minimum`;
  $("inflation-output").textContent = `${readNumber("inflation").toFixed(1)}%`;
  $("legacy-output").textContent = `+${readNumber("legacy-premium").toFixed(1)}%`;
  $("target-output").textContent = `${readNumber("survival-target").toFixed(0)}%`;
  return { allocations, total };
}

function drawChart(paths) {
  const canvas = $("path-chart");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(600, Math.floor(rect.width * scale));
  canvas.height = Math.floor(rect.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const width = canvas.width / scale;
  const height = canvas.height / scale;
  const pad = { left: 58, right: 14, top: 16, bottom: 30 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...paths.map((p) => p.p90), 1);
  const x = (i) => pad.left + (i / (paths.length - 1)) * plotW;
  const y = (value) => pad.top + plotH - Math.min(value / max, 1) * plotH;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.fillStyle = "#849387";
  ctx.font = "12px system-ui";
  for (let i = 0; i <= 4; i++) {
    const value = max * i / 4;
    const py = y(value);
    ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(width - pad.right, py); ctx.stroke();
    const label = value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}m` : `$${Math.round(value / 1000)}k`;
    ctx.fillText(label, 4, py + 4);
  }
  ctx.beginPath();
  paths.forEach((p, i) => i ? ctx.lineTo(x(i), y(p.p90)) : ctx.moveTo(x(i), y(p.p90)));
  for (let i = paths.length - 1; i >= 0; i--) ctx.lineTo(x(i), y(paths[i].p10));
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  gradient.addColorStop(0, "rgba(244,201,93,.22)"); gradient.addColorStop(1, "rgba(244,201,93,.02)");
  ctx.fillStyle = gradient; ctx.fill();
  ctx.beginPath();
  paths.forEach((p, i) => i ? ctx.lineTo(x(i), y(p.median)) : ctx.moveTo(x(i), y(p.median)));
  ctx.strokeStyle = "#f4c95d"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#849387";
  [0, Math.floor((paths.length - 1) / 2), paths.length - 1].forEach((i) => ctx.fillText(`Year ${paths[i].year}`, x(i) - (i ? 20 : 0), height - 8));
}

function renderResult(result) {
  const simulation = result.simulation;
  $("additional-spending").textContent = result.targetAchievable ? money.format(result.additionalSpending) : "$0";
  $("rating").textContent = result.targetAchievable ? `${simulation.successRate.toFixed(1)}% survival` : "Minimum too high";
  $("success-meter").style.width = `${simulation.successRate}%`;
  $("success-detail").textContent = result.targetAchievable
    ? `${money.format(result.maximumTotalSpending)} total in year one: ${money.format(result.minimumAnnualBudget)} minimum plus ${money.format(result.additionalSpending)} additional. Both rise with inflation.`
    : `The minimum budget alone has ${result.minimumBudgetSuccessRate.toFixed(1)}% modeled survival, below the ${result.targetSuccessRate.toFixed(0)}% target. Reduce the minimum or change the plan.`;
  $("maximum-budget").textContent = money.format(result.maximumTotalSpending);
  $("implied-rate").textContent = `${result.impliedWithdrawalRate.toFixed(2)}%`;
  $("minimum-success").textContent = `${result.minimumBudgetSuccessRate.toFixed(1)}%`;
  drawChart(simulation.paths);
}

function renderComparison(rows) {
  const maximum = Math.max(...rows.map(({ result }) => result.additionalSpending), 1);
  $("comparison-list").innerHTML = rows.map(({ name, detail, result }, index) => `
    <div class="pm-comparison-row">
      <div><p>${name}</p><small>${detail}</small><div class="pm-comparison-track"><span style="width:${result.additionalSpending / maximum * 100}%;${index ? "opacity:.68" : ""}"></span></div></div>
      <strong>${result.targetAchievable ? money.format(result.additionalSpending) : "Below target"}</strong>
    </div>`).join("");
}

async function runSimulation(event) {
  event?.preventDefault();
  const { allocations, total } = updateControls();
  setFormError();
  if (!engineReady) { setFormError("The simulation engine is still loading."); return; }
  if (Math.abs(total - 100) > 0.01) { setFormError(`Allocations total ${total}%. Adjust them to exactly 100%.`); return; }
  const button = $("run-button");
  button.disabled = true; button.firstChild.textContent = "Running simulations ";
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 20)));
  try {
    // Keep every saved portfolio in a stable position, independent of the active editor tab.
    const scenarioOrder = ["my", "balanced", "preservation", "miners", "streamers", "barbell"];
    const scenarios = scenarioOrder.map((key) => ({
      key,
      name: portfolioNames[key],
      detail: portfolios[key].map((value, index) => value ? `${value}% ${assetLabels[index]}` : "").filter(Boolean).join(" · "),
      allocations: portfolios[key],
    }));
    const rows = scenarios.map((scenario) => {
      const result = JSON.parse(solve_retirement_spending(JSON.stringify(buildInput(scenario.allocations))));
      if (result.error) throw new Error(result.error);
      return { ...scenario, result };
    });
    renderResult(rows.find(({ key }) => key === activePortfolio).result);
    renderComparison(rows);
  } catch (cause) {
    setFormError(cause instanceof Error ? cause.message : "Unable to run the simulation.");
  } finally {
    button.disabled = false; button.firstChild.textContent = "Run retirement stress test ";
  }
}

function scheduleRun() { clearTimeout(runTimer); runTimer = setTimeout(() => runSimulation(), 280); }

function setFormError(message = "") {
  const error = $("form-error");
  error.textContent = message;
  error.classList.toggle("visible", Boolean(message));
}

presetButtons.forEach((button) => button.addEventListener("click", () => {
  loadPortfolio(button.dataset.preset);
  persistSettings(); updateControls(); scheduleRun();
}));

document.querySelectorAll("input, select").forEach((control) => control.addEventListener("input", () => {
  if (control.matches("[data-allocation-slider]")) control.closest("label").querySelector("[data-allocation]").value = control.value;
  if (control.matches("[data-allocation]")) control.closest("label").querySelector("[data-allocation-slider]").value = Math.max(0, Math.min(100, Number(control.value) || 0));
  if (control.matches("[data-allocation]")) portfolios[activePortfolio] = allocationInputs.map((input) => Number(input.value) || 0);
  if (control.matches("[data-allocation-slider]")) portfolios[activePortfolio] = allocationInputs.map((input) => Number(input.value) || 0);
  persistSettings(); updateControls();
}));
document.querySelectorAll("input[type=range]").forEach((control) => control.addEventListener("change", scheduleRun));
$("calculator-form").addEventListener("submit", runSimulation);
$("reset-button").addEventListener("click", () => {
  for (const [id, value] of Object.entries(planDefaults)) $(id).value = value;
  persistSettings(); updateControls(); scheduleRun();
});
$("reset-portfolio").addEventListener("click", () => {
  portfolios[activePortfolio] = [...portfolioDefaults[activePortfolio]];
  loadPortfolio(activePortfolio);
  persistSettings(); updateControls(); scheduleRun();
});
$("export-portfolios").addEventListener("click", () => {
  try { exportPortfolios(); }
  catch (cause) { showPortfolioMessage(cause instanceof Error ? cause.message : "Unable to export portfolios.", true); }
});
$("import-portfolios").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try { await importPortfolios(file); }
  catch (cause) { showPortfolioMessage(cause instanceof Error ? cause.message : "Unable to import portfolios.", true); }
  finally { event.target.value = ""; }
});
$("reset-assumptions").addEventListener("click", () => {
  assumptionRows.forEach((row) => row.querySelectorAll("input").forEach((input) => { input.value = input.defaultValue; }));
  persistSettings(); scheduleRun();
});
$("history-asset").addEventListener("change", () => {
  const index = selectedHistoryIndex();
  const history = histories[index];
  if (history?.format) $("history-format").value = history.format;
  $("history-cost").value = assumptionRows[index].querySelector('[data-model="cost"]').value;
  updateHistoryStatus();
});
$("history-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try { appendHistoryText(await file.text()); }
  catch (cause) { reportHistoryError(cause); }
  finally { event.target.value = ""; }
});
$("history-import").addEventListener("click", () => {
  try { appendHistoryText($("history-paste").value); $("history-paste").value = ""; }
  catch (cause) { reportHistoryError(cause); }
});
$("history-estimate").addEventListener("click", () => {
  try { applyHistoryEstimate(); }
  catch (cause) { reportHistoryError(cause); }
});
$("history-export").addEventListener("click", () => {
  try { downloadHistory(); }
  catch (cause) { reportHistoryError(cause); }
});
$("history-clear").addEventListener("click", () => {
  const index = selectedHistoryIndex();
  if (!currentHistory().rows.length || window.confirm(`Clear the locally saved history for ${assetNames[index]}?`)) {
    delete histories[index];
    try { persistHistories(); updateHistoryStatus("History cleared. The applied model assumptions were not changed."); }
    catch (cause) { reportHistoryError(cause); }
  }
});
window.addEventListener("resize", () => { if ($("additional-spending").textContent !== "—") scheduleRun(); });

restoreSettings();
restoreHistories();
loadPortfolio(activePortfolio);
updateControls();
updateHistoryStatus();
try {
  await init({
    module_or_path: "/assets/wasm/precious-metals-retirement/precious_metals_retirement_engine_bg.wasm?v=20260905-simplified-v6",
  });
  if (!verify_domain(window.location.hostname)) throw new Error("This calculator is not available on this host.");
  engineReady = true;
  $("engine-status").classList.add("ready");
  $("engine-status").innerHTML = "<span></span> Rust/WASM engine ready · calculations stay here";
  runSimulation();
} catch (cause) {
  $("engine-status").textContent = cause instanceof Error ? cause.message : "Simulation engine unavailable";
  setFormError("The private simulation engine could not be loaded.");
}
