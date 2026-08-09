/* Interactive compound-growth visualization.
   The WASM result remains the source of every financial value; this module only
   normalizes those yearly rows and renders/controls the SVG presentation. */

const SVG_WIDTH = 900;
const SVG_HEIGHT = 390;
const MARGIN = { top: 26, right: 28, bottom: 46, left: 78 };
const BAR_HEIGHT = 145;
const COLORS = ["#4ade80", "#fb923c", "#60a5fa", "#c084fc", "#facc15"];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const state = {
  elements: null,
  series: [],
  scenarioVisibility: new Map(),
  layers: { nominal: true, real: true, composition: true, tax: true },
  fullMaxYear: 1,
  viewStart: 0,
  viewEnd: 1,
  dragging: null,
  pinnedYear: null,
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function compactMoney(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return money.format(value);
}

function normalizeSeries(inputs, results) {
  return results.map((result, index) => {
    let cumulativeTax = 0;
    const rows = [{ year: 0, nominal: inputs[index].principal, real: inputs[index].principal, contributions: inputs[index].principal, netInterest: 0, taxPaid: 0, grossInterest: 0, yearlyNetInterest: 0 }];
    result.yearly.forEach((row) => {
      cumulativeTax += row.taxPaid;
      rows.push({
        year: row.year,
        nominal: row.balance,
        real: row.realBalance,
        contributions: row.contributions,
        netInterest: row.totalNetInterest,
        taxPaid: cumulativeTax,
        grossInterest: row.totalNetInterest + cumulativeTax,
        yearlyNetInterest: row.netInterest,
      });
    });
    return { name: result.name, color: COLORS[index % COLORS.length], rows };
  });
}

function visibleSeries() {
  return state.series.filter((series) => state.scenarioVisibility.get(series.name) !== false);
}

function plotWidth() { return SVG_WIDTH - MARGIN.left - MARGIN.right; }
function plotHeight() { return SVG_HEIGHT - MARGIN.top - MARGIN.bottom; }
function xFor(year) { return MARGIN.left + (year - state.viewStart) / Math.max(1, state.viewEnd - state.viewStart) * plotWidth(); }

function rowsInView(rows) {
  return rows.filter((row) => row.year >= Math.floor(state.viewStart) - 1 && row.year <= Math.ceil(state.viewEnd) + 1);
}

function maxVisibleValue() {
  return Math.max(1, ...visibleSeries().flatMap((series) => rowsInView(series.rows).flatMap((row) => [row.nominal, row.real, row.contributions + row.grossInterest])));
}

function yFor(value, maxValue) { return MARGIN.top + plotHeight() * (1 - value / maxValue); }

function linePath(rows, key, maxValue) {
  return rowsInView(rows).map((row, index) => `${index ? "L" : "M"}${xFor(row.year).toFixed(2)},${yFor(row[key], maxValue).toFixed(2)}`).join(" ");
}

function areaPath(rows, lower, upper, maxValue) {
  const visible = rowsInView(rows);
  if (!visible.length) return "";
  const top = visible.map((row, index) => `${index ? "L" : "M"}${xFor(row.year).toFixed(2)},${yFor(upper(row), maxValue).toFixed(2)}`).join(" ");
  const bottom = [...visible].reverse().map((row) => `L${xFor(row.year).toFixed(2)},${yFor(lower(row), maxValue).toFixed(2)}`).join(" ");
  return `${top}${bottom}Z`;
}

function renderScenarioControls() {
  const target = state.elements.scenarioToggles;
  target.replaceChildren();
  state.series.forEach((series) => {
    if (!state.scenarioVisibility.has(series.name)) state.scenarioVisibility.set(series.name, true);
    const label = document.createElement("label");
    label.className = "compound-chart-toggle compound-chart-scenario-toggle";
    label.innerHTML = `<input type="checkbox" data-chart-scenario="${escapeHtml(series.name)}" ${state.scenarioVisibility.get(series.name) !== false ? "checked" : ""}><i style="background:${series.color}"></i>${escapeHtml(series.name)}`;
    target.appendChild(label);
  });
}

function renderMainChart() {
  const maxValue = maxVisibleValue();
  let svg = `<svg viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" aria-label="Interactive compound interest growth chart"><defs><clipPath id="compound-growth-clip"><rect x="${MARGIN.left}" y="${MARGIN.top}" width="${plotWidth()}" height="${plotHeight()}"/></clipPath></defs>`;

  [0, .25, .5, .75, 1].forEach((fraction) => {
    const y = MARGIN.top + plotHeight() * (1 - fraction);
    svg += `<line class="compound-chart-gridline" x1="${MARGIN.left}" y1="${y}" x2="${SVG_WIDTH - MARGIN.right}" y2="${y}"/><text class="compound-chart-axis" x="${MARGIN.left - 9}" y="${y + 4}" text-anchor="end">${compactMoney(maxValue * fraction)}</text>`;
  });
  [0, .25, .5, .75, 1].forEach((fraction) => {
    const year = state.viewStart + (state.viewEnd - state.viewStart) * fraction;
    svg += `<text class="compound-chart-axis" x="${MARGIN.left + plotWidth() * fraction}" y="${SVG_HEIGHT - 13}" text-anchor="middle">${Math.round(year)}y</text>`;
  });

  svg += `<g clip-path="url(#compound-growth-clip)">`;
  state.series.forEach((series, index) => {
    const scenarioClass = `scenario-layer-${index}`;
    // Contributions and cumulative net interest are stacked to reconstruct the nominal total.
    svg += `<g class="compound-interactive-layer layer-composition ${scenarioClass}" data-scenario-name="${escapeHtml(series.name)}"><path class="compound-area-contributions" d="${areaPath(series.rows, () => 0, (row) => row.contributions, maxValue)}"/><path class="compound-area-interest" d="${areaPath(series.rows, (row) => row.contributions, (row) => row.contributions + row.netInterest, maxValue)}"/></g>`;
    // Inflation erosion is the purchasing-power gap between nominal and real balances.
    svg += `<path class="compound-interactive-layer compound-area-erosion layer-real ${scenarioClass}" data-scenario-name="${escapeHtml(series.name)}" d="${areaPath(series.rows, (row) => row.real, (row) => row.nominal, maxValue)}"/>`;
    // Tax drag is the gap between the actual post-tax balance and its pre-tax equivalent.
    svg += `<path class="compound-interactive-layer compound-area-tax layer-tax ${scenarioClass}" data-scenario-name="${escapeHtml(series.name)}" d="${areaPath(series.rows, (row) => row.nominal, (row) => row.contributions + row.grossInterest, maxValue)}"/>`;
    svg += `<path class="compound-interactive-layer compound-chart-line layer-nominal ${scenarioClass}" data-scenario-name="${escapeHtml(series.name)}" stroke="${series.color}" d="${linePath(series.rows, "nominal", maxValue)}"/>`;
    svg += `<path class="compound-interactive-layer compound-chart-line compound-chart-line-real layer-real ${scenarioClass}" data-scenario-name="${escapeHtml(series.name)}" stroke="${series.color}" d="${linePath(series.rows, "real", maxValue)}"/>`;
  });

  const primary = visibleSeries()[0] || state.series[0];
  const crossover = primary?.rows.find((row) => row.netInterest > row.contributions && row.year >= state.viewStart && row.year <= state.viewEnd);
  if (crossover) {
    const x = xFor(crossover.year);
    svg += `<g class="compound-crossover"><line x1="${x}" y1="${MARGIN.top}" x2="${x}" y2="${SVG_HEIGHT - MARGIN.bottom}"/><text x="${Math.min(x + 7, SVG_WIDTH - 270)}" y="${MARGIN.top + 15}">Crossover: Interest exceeds contributions</text></g>`;
  }
  svg += `<line id="compoundHoverLine" class="compound-hover-line" x1="0" y1="${MARGIN.top}" x2="0" y2="${SVG_HEIGHT - MARGIN.bottom}" hidden/><g id="compoundHoverPoints"></g></g></svg>`;
  state.elements.container.innerHTML = svg;
  applyVisibility();
}

function renderYearlyBars() {
  const primary = visibleSeries()[0] || state.series[0];
  if (!primary) { state.elements.bars.innerHTML = ""; return; }
  const rows = rowsInView(primary.rows).filter((row) => row.year > 0);
  const max = Math.max(1, ...rows.map((row) => row.yearlyNetInterest));
  const left = MARGIN.left, right = MARGIN.right, top = 12, bottom = 30, height = BAR_HEIGHT - top - bottom;
  const yearSpan = Math.max(1, state.viewEnd - state.viewStart);
  const barWidth = Math.max(2, plotWidth() / yearSpan * .7);
  let content = `<svg viewBox="0 0 ${SVG_WIDTH} ${BAR_HEIGHT}" aria-label="Net interest earned per year for ${escapeHtml(primary.name)}"><line class="compound-chart-gridline" x1="${left}" y1="${top + height}" x2="${SVG_WIDTH - right}" y2="${top + height}"/>`;
  rows.forEach((row) => {
    const barHeight = row.yearlyNetInterest / max * height;
    content += `<rect class="compound-year-bar" x="${xFor(row.year) - barWidth / 2}" y="${top + height - barHeight}" width="${barWidth}" height="${barHeight}" rx="2" fill="${primary.color}" data-bar-year="${row.year}"/>`;
  });
  content += `<text class="compound-chart-axis" x="${left}" y="${BAR_HEIGHT - 8}">Yearly net interest · ${escapeHtml(primary.name)}</text><text class="compound-chart-axis" x="${SVG_WIDTH - right}" y="${BAR_HEIGHT - 8}" text-anchor="end">Peak ${compactMoney(max)}</text></svg>`;
  state.elements.bars.innerHTML = content;
}

function applyVisibility() {
  if (!state.elements?.container) return;
  state.elements.container.querySelectorAll("[data-scenario-name]").forEach((element) => {
    const layerName = Object.keys(state.layers).find((name) => element.classList.contains(`layer-${name}`));
    const layerVisible = layerName ? state.layers[layerName] : true;
    const scenarioVisible = state.scenarioVisibility.get(element.dataset.scenarioName) !== false;
    const hidden = !layerVisible || !scenarioVisible;
    element.classList.toggle("is-hidden", hidden);
    element.setAttribute("aria-hidden", String(hidden));
  });
}

function eventYear(event) {
  const svg = state.elements.container.querySelector("svg");
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  const svgX = (event.clientX - rect.left) / rect.width * SVG_WIDTH;
  const fraction = (svgX - MARGIN.left) / plotWidth();
  return Math.round(state.viewStart + Math.max(0, Math.min(1, fraction)) * (state.viewEnd - state.viewStart));
}

function rowAt(series, year) { return series.rows.find((row) => row.year === year); }

// Multi-series hover tooltip and synchronized crosshair/point markers.
function showTooltip(event, year) {
  const seriesRows = visibleSeries().map((series) => ({ series, row: rowAt(series, year) })).filter((item) => item.row);
  if (!seriesRows.length) return;
  const tooltip = state.elements.tooltip;
  tooltip.innerHTML = `<strong>Year ${year}</strong>${seriesRows.map(({ series, row }) => `<div class="compound-tooltip-series"><b><i style="background:${series.color}"></i>${escapeHtml(series.name)}</b><span>Nominal: ${money.format(row.nominal)}</span><span>Real: ${money.format(row.real)}</span><span>Contributions: ${money.format(row.contributions)}</span><span>Net Interest: ${money.format(row.netInterest)}</span><span>Tax Paid: ${money.format(row.taxPaid)}</span></div>`).join("")}`;
  tooltip.hidden = false;
  const stageRect = state.elements.stage.getBoundingClientRect();
  const left = Math.min(event.clientX - stageRect.left + 14, stageRect.width - tooltip.offsetWidth - 8);
  const top = Math.max(8, event.clientY - stageRect.top - tooltip.offsetHeight - 14);
  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${top}px`;

  const maxValue = maxVisibleValue();
  const hoverLine = state.elements.container.querySelector("#compoundHoverLine");
  hoverLine.hidden = false;
  hoverLine.setAttribute("x1", xFor(year)); hoverLine.setAttribute("x2", xFor(year));
  state.elements.container.querySelector("#compoundHoverPoints").innerHTML = seriesRows.map(({ series, row }) => `<circle cx="${xFor(year)}" cy="${yFor(row.nominal, maxValue)}" r="5" fill="${series.color}"/><circle cx="${xFor(year)}" cy="${yFor(row.real, maxValue)}" r="4" fill="#0c1712" stroke="${series.color}" stroke-width="2"/>`).join("");
}

function hideTooltip() {
  state.elements.tooltip.hidden = true;
  const line = state.elements.container.querySelector("#compoundHoverLine");
  if (line) line.hidden = true;
  const points = state.elements.container.querySelector("#compoundHoverPoints");
  if (points) points.replaceChildren();
}

// Click-to-pin comparison values, including Scenario B minus Scenario A deltas.
function pinYear(year) {
  state.pinnedYear = year;
  const rows = visibleSeries().map((series) => ({ series, row: rowAt(series, year) })).filter((item) => item.row);
  if (!rows.length) return;
  let delta = "";
  if (rows.length >= 2) {
    const nominalDelta = rows[1].row.nominal - rows[0].row.nominal;
    const realDelta = rows[1].row.real - rows[0].row.real;
    delta = `<div class="compound-pin-delta"><strong>${escapeHtml(rows[1].series.name)} − ${escapeHtml(rows[0].series.name)}</strong><span>Nominal Δ: ${nominalDelta >= 0 ? "+" : "−"}${money.format(Math.abs(nominalDelta))}</span><span>Real Δ: ${realDelta >= 0 ? "+" : "−"}${money.format(Math.abs(realDelta))}</span></div>`;
  }
  state.elements.pinned.innerHTML = `<button type="button" data-close-chart-pin aria-label="Close pinned comparison">×</button><strong>Pinned · Year ${year}</strong>${rows.map(({ series, row }) => `<div><b><i style="background:${series.color}"></i>${escapeHtml(series.name)}</b><span>Nominal ${money.format(row.nominal)}</span><span>Real ${money.format(row.real)}</span></div>`).join("")}${delta}`;
  state.elements.pinned.hidden = false;
}

function rerenderViewport() {
  renderMainChart();
  renderYearlyBars();
  hideTooltip();
}

// Wheel zoom and pointer-drag panning share the same year viewport.
export function addInteractions() {
  const { container, controls, scenarioToggles, reset, pinned } = state.elements;
  controls.addEventListener("change", (event) => {
    const input = event.target.closest("[data-chart-layer]");
    if (!input) return;
    state.layers[input.dataset.chartLayer] = input.checked;
    applyVisibility();
  });
  scenarioToggles.addEventListener("change", (event) => {
    const input = event.target.closest("[data-chart-scenario]");
    if (!input) return;
    state.scenarioVisibility.set(input.dataset.chartScenario, input.checked);
    renderMainChart();
    renderYearlyBars();
  });
  reset.addEventListener("click", () => { state.viewStart = 0; state.viewEnd = state.fullMaxYear; rerenderViewport(); });
  pinned.addEventListener("click", (event) => { if (event.target.closest("[data-close-chart-pin]")) { pinned.hidden = true; state.pinnedYear = null; } });
  container.addEventListener("pointermove", (event) => {
    if (state.dragging) {
      const rect = container.getBoundingClientRect();
      const deltaYears = (event.clientX - state.dragging.startX) / rect.width * (state.dragging.end - state.dragging.start);
      if (Math.abs(event.clientX - state.dragging.startX) > 3) state.dragging.moved = true;
      const width = state.dragging.end - state.dragging.start;
      let start = state.dragging.start - deltaYears;
      start = Math.max(0, Math.min(state.fullMaxYear - width, start));
      state.viewStart = start; state.viewEnd = start + width;
      rerenderViewport();
      return;
    }
    const year = eventYear(event);
    if (year != null) showTooltip(event, year);
  });
  container.addEventListener("pointerleave", () => { if (!state.dragging) hideTooltip(); });
  container.addEventListener("pointerdown", (event) => { state.dragging = { startX: event.clientX, start: state.viewStart, end: state.viewEnd, moved: false }; container.setPointerCapture?.(event.pointerId); });
  container.addEventListener("pointerup", (event) => {
    if (state.dragging && !state.dragging.moved) { const year = eventYear(event); if (year != null) pinYear(year); }
    state.dragging = null;
  });
  container.addEventListener("pointercancel", () => { state.dragging = null; });
  container.addEventListener("wheel", (event) => {
    event.preventDefault();
    const currentWidth = state.viewEnd - state.viewStart;
    const nextWidth = Math.max(2, Math.min(state.fullMaxYear, currentWidth * (event.deltaY > 0 ? 1.18 : .82)));
    const center = eventYear(event) ?? (state.viewStart + state.viewEnd) / 2;
    const ratio = (center - state.viewStart) / currentWidth;
    let start = center - nextWidth * ratio;
    start = Math.max(0, Math.min(state.fullMaxYear - nextWidth, start));
    state.viewStart = start; state.viewEnd = start + nextWidth;
    rerenderViewport();
  }, { passive: false });
}

export function initChart(elements) {
  state.elements = elements;
  addInteractions();
}

export function updateChart(inputs, results) {
  if (!state.elements) return;
  state.series = normalizeSeries(inputs, results);
  state.fullMaxYear = Math.max(1, ...state.series.map((series) => series.rows.at(-1)?.year || 1));
  if (state.viewEnd <= 1 || state.viewEnd > state.fullMaxYear) { state.viewStart = 0; state.viewEnd = state.fullMaxYear; }
  renderScenarioControls();
  renderMainChart();
  renderYearlyBars();
  if (state.pinnedYear != null && state.pinnedYear <= state.fullMaxYear) pinYear(state.pinnedYear);
}
