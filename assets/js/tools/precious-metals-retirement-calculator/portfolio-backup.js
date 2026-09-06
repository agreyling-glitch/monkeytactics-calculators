export const portfolioKeys = ["my", "balanced", "preservation", "miners", "streamers", "barbell"];

function validAllocation(values) {
  return Array.isArray(values)
    && values.length === 8
    && values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    && Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) < 0.01;
}

export function createPortfolioBackup(portfolios, activePortfolio) {
  const checked = validatePortfolioBackup({ version: 1, portfolios, activePortfolio });
  return {
    type: "monkeytactics-precious-metals-portfolios",
    version: 1,
    exportedAt: new Date().toISOString(),
    activePortfolio: checked.activePortfolio,
    portfolios: checked.portfolios,
  };
}

export function validatePortfolioBackup(value) {
  if (!value || typeof value !== "object") throw new Error("The selected file is not a portfolio backup.");
  if (value.type !== undefined && value.type !== "monkeytactics-precious-metals-portfolios") throw new Error("This JSON file belongs to a different tool.");
  if (Number(value.version) !== 1) throw new Error("This portfolio backup version is not supported.");
  const portfolios = {};
  for (const key of portfolioKeys) {
    const allocations = value.portfolios?.[key];
    if (!validAllocation(allocations)) throw new Error(`The ${key} portfolio must contain eight allocations totaling exactly 100%.`);
    portfolios[key] = allocations.map(Number);
  }
  const activePortfolio = portfolioKeys.includes(value.activePortfolio) ? value.activePortfolio : "my";
  return { portfolios, activePortfolio };
}

export function parsePortfolioBackup(text) {
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error("The selected file is not valid JSON."); }
  return validatePortfolioBackup(value);
}
