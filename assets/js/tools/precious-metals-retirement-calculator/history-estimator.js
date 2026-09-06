const numeric = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function normalizeMonth(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})[-\/]?(\d{1,2})(?:[-\/]\d{1,2})?/);
  const us = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  const year = iso?.[1] || us?.[3];
  const month = Number(iso?.[2] || us?.[1]);
  return year && month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}` : null;
}

const monthSerial = (date) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;

export function parseHistoryCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV needs a header and at least one monthly row.");
  const aliases = { date: ["date", "month"], asset: ["asset", "asset_return", "asset_price", "adjusted_close", "adj_close", "close"], metals: ["metals", "metals_return", "metals_price"], equity: ["equity", "equity_return", "equity_price"], defensive: ["defensive", "defensive_return", "defensive_price", "tbills", "bonds"] };
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  const positions = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, headers.findIndex((header) => names.includes(header))]));
  if (positions.date < 0 || positions.asset < 0) throw new Error('CSV headers must include "date" and "asset".');
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = normalizeMonth(cells[positions.date]);
    const asset = numeric(cells[positions.asset]);
    if (!date || asset === null) continue;
    rows.push({ date, asset, metals: positions.metals >= 0 ? numeric(cells[positions.metals]) : null, equity: positions.equity >= 0 ? numeric(cells[positions.equity]) : null, defensive: positions.defensive >= 0 ? numeric(cells[positions.defensive]) : null });
  }
  if (!rows.length) throw new Error("No valid monthly rows were found. Use dates such as 2024-01.");
  return rows;
}

export function mergeHistory(existing, incoming) {
  const months = new Map((existing || []).map((row) => [row.date, row]));
  for (const row of incoming) {
    const prior = months.get(row.date);
    months.set(row.date, prior ? { ...prior, ...row, metals: row.metals ?? prior.metals, equity: row.equity ?? prior.equity, defensive: row.defensive ?? prior.defensive } : row);
  }
  return [...months.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function sampleDeviation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

function correlation(left, right) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  const leftSd = sampleDeviation(left);
  const rightSd = sampleDeviation(right);
  if (!leftSd || !rightSd) return 0;
  return left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0) / ((left.length - 1) * leftSd * rightSd);
}

function confidenceFor(months) {
  if (months < 36) return { label: "Experimental", level: 1 };
  if (months < 60) return { label: "Low confidence", level: 2 };
  if (months < 120) return { label: "Usable with caution", level: 3 };
  if (months < 240) return { label: "Reasonably stable", level: 4 };
  return { label: "Strong sample; check old regimes", level: 5 };
}

export function estimateHistory(rows, { format = "prices", lookbackYears = 0 } = {}) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("Import monthly history before estimating.");
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const lastMonth = monthSerial(sorted.at(-1).date);
  const filtered = Number(lookbackYears) > 0 ? sorted.filter((row) => monthSerial(row.date) > lastMonth - Number(lookbackYears) * 12) : sorted;
  const returns = [];
  if (format === "prices") {
    for (let index = 1; index < filtered.length; index += 1) {
      const previous = filtered[index - 1];
      const current = filtered[index];
      if (monthSerial(current.date) - monthSerial(previous.date) !== 1 || previous.asset <= 0 || current.asset <= 0) continue;
      const result = { date: current.date, asset: current.asset / previous.asset - 1 };
      for (const factor of ["metals", "equity", "defensive"]) result[factor] = previous[factor] > 0 && current[factor] > 0 ? current[factor] / previous[factor] - 1 : null;
      returns.push(result);
    }
  } else {
    const divisor = format === "percent" ? 100 : 1;
    for (const row of filtered) returns.push({ ...row, asset: row.asset / divisor, metals: row.metals === null ? null : row.metals / divisor, equity: row.equity === null ? null : row.equity / divisor, defensive: row.defensive === null ? null : row.defensive / divisor });
  }
  const valid = returns.filter((row) => row.asset > -1 && Number.isFinite(row.asset));
  if (valid.length < 12) throw new Error("At least 12 valid monthly returns are required (13 monthly prices).");
  const logMean = valid.reduce((sum, row) => sum + Math.log1p(row.asset), 0) / valid.length;
  const nominalReturn = (Math.exp(logMean * 12) - 1) * 100;
  const volatility = sampleDeviation(valid.map((row) => row.asset)) * Math.sqrt(12) * 100;
  const matched = valid.filter((row) => [row.metals, row.equity, row.defensive].every(Number.isFinite));
  let factors = null;
  if (matched.length >= 24) {
    const asset = matched.map((row) => row.asset);
    factors = ["metals", "equity", "defensive"].map((key) => Math.max(0, correlation(asset, matched.map((row) => row[key]))));
    const norm = Math.sqrt(factors.reduce((sum, value) => sum + value ** 2, 0));
    if (norm > 0.98) factors = factors.map((value) => value * 0.98 / norm);
  }
  return { nominalReturn, volatility, factors, months: valid.length, matchedMonths: matched.length, start: valid[0].date, end: valid.at(-1).date, confidence: confidenceFor(valid.length) };
}

export function historyToCsv(rows) {
  const value = (item) => item === null || item === undefined ? "" : item;
  return `date,asset,metals,equity,defensive\n${(rows || []).map((row) => [row.date, value(row.asset), value(row.metals), value(row.equity), value(row.defensive)].join(",")).join("\n")}\n`;
}
