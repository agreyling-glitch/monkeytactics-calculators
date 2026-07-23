/* ========================================================================
   MonkeyTactics.com — Compound Interest Calculator logic
   Supports fixed and variable rates, contributions, withdrawals,
   inflation adjustment, tax impact and scenario comparisons.
   ======================================================================== */

export function calculateCompoundGrowth(input) {
  const {
    principal,
    annualRatePct,
    years,
    compoundingFrequency,
    monthlyContribution,
    contributionFrequency,
    withdrawals,
    variableRates,
    inflationRatePct,
    taxRatePct,
  } = input;

  validatePositive(principal, 'principal');
  validateNonNeg(annualRatePct, 'interest rate');
  validatePositive(years, 'years');
  validateNonNeg(monthlyContribution, 'monthly contribution');
  validateNonNeg(withdrawals.amount, 'withdrawal amount');
  validateNonNeg(inflationRatePct, 'inflation rate');
  validateNonNeg(taxRatePct, 'tax rate');

  const periodsPerYear = getPeriodsPerYear(compoundingFrequency);
  const totalPeriods = Math.max(1, Math.round(years * periodsPerYear));
  const contributionsPerYear = getContributionsPerYear(contributionFrequency);
  const contributionAmount = monthlyContribution; // monthly contribution input is normalized below

  const yearly = [];
  let balance = principal;
  let totalContributions = 0;
  let totalWithdrawals = 0;
  let totalInterest = 0;
  let totalTax = 0;

  for (let year = 1; year <= years; year++) {
    const startBalance = balance;
    const annualContrib = contributionFrequency === 'monthly' ? monthlyContribution * 12 : monthlyContribution * 1;
    const annualWithdrawal = withdrawals.type === 'fixed-monthly' ? withdrawals.amount * 12 : withdrawals.type === 'percentage' ? balance * (withdrawals.amount / 100) : 0;

    for (let period = 1; period <= periodsPerYear; period++) {
      const currentRate = getRateForPeriod(year, period, variableRates, annualRatePct);
      const rateDecimal = currentRate / 100;
      const periodRate = compoundingFrequency === 'continuous'
        ? rateDecimal
        : rateDecimal / periodsPerYear;

      if (compoundingFrequency === 'continuous') {
        balance = balance * Math.exp(periodRate * 1);
      } else {
        balance = balance * (1 + periodRate);
      }

      const contributionAtPeriod = shouldAddContribution(period, periodsPerYear, contributionFrequency, monthlyContribution, annualContrib);
      if (contributionAtPeriod > 0) {
        balance += contributionAtPeriod;
        totalContributions += contributionAtPeriod;
      }

      if (withdrawals.type === 'fixed-monthly' && period % 1 === 0) {
        balance -= withdrawals.amount;
        totalWithdrawals += withdrawals.amount;
      }
      if (withdrawals.type === 'percentage' && period === periodsPerYear) {
        const pctWithdrawal = balance * (withdrawals.amount / 100);
        balance -= pctWithdrawal;
        totalWithdrawals += pctWithdrawal;
      }

      const interestEarnedThisPeriod = balance - startBalance - (contributionAtPeriod > 0 ? contributionAtPeriod : 0);
      totalInterest += Math.max(0, interestEarnedThisPeriod);
    }

    const interestEarnedYear = balance - startBalance - annualContrib + annualWithdrawal;
    const taxOnInterest = Math.max(0, interestEarnedYear) * (taxRatePct / 100);
    totalTax += taxOnInterest;
    balance -= taxOnInterest;

    yearly.push({
      year,
      startBalance: round2(startBalance),
      contributions: round2(annualContrib),
      interestEarned: round2(Math.max(0, interestEarnedYear)),
      withdrawals: round2(annualWithdrawal),
      endingBalance: round2(balance),
    });
  }

  const finalNominalBalance = round2(balance);
  const realBalance = inflationRatePct > 0 ? round2(balance / Math.pow(1 + inflationRatePct / 100, years)) : finalNominalBalance;

  return {
    summary: {
      principal: round2(principal),
      finalNominalBalance,
      finalRealBalance: realBalance,
      totalContributions: round2(totalContributions),
      totalWithdrawals: round2(totalWithdrawals),
      totalInterest: round2(totalInterest),
      totalTaxPaid: round2(totalTax),
      totalGrowth: round2(finalNominalBalance - principal - totalContributions + totalWithdrawals),
    },
    yearly,
  };
}

export function parseRateSchedule(text) {
  if (!text || !text.trim()) return [];
  return text.split(',').map((item) => {
    const [yearsText, rateText] = item.trim().split(':');
    return { years: Number(yearsText), ratePct: Number(rateText) };
  }).filter((entry) => Number.isFinite(entry.years) && Number.isFinite(entry.ratePct));
}

function getPeriodsPerYear(compoundingFrequency) {
  switch (compoundingFrequency) {
    case 'daily': return 365;
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'annually': return 1;
    case 'continuous': return 1;
    default: return 1;
  }
}

function getContributionsPerYear(contributionFrequency) {
  switch (contributionFrequency) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'annually': return 1;
    default: return 1;
  }
}

function shouldAddContribution(period, periodsPerYear, contributionFrequency, monthlyContribution, annualContrib) {
  if (contributionFrequency === 'monthly') {
    return monthlyContribution;
  }
  if (contributionFrequency === 'quarterly' && period % (periodsPerYear / 4) === 0) {
    return annualContrib / 4;
  }
  if (contributionFrequency === 'annually' && period === periodsPerYear) {
    return annualContrib;
  }
  return 0;
}

function getRateForPeriod(year, period, variableRates, defaultRate) {
  const schedule = variableRates || [];
  const yearIndex = year - 1;
  if (schedule.length === 0) return defaultRate;
  let cumulative = 0;
  for (const entry of schedule) {
    if (yearIndex < cumulative + entry.years) {
      return entry.ratePct;
    }
    cumulative += entry.years;
  }
  return schedule[schedule.length - 1].ratePct;
}

function validatePositive(n, name) {
  if (typeof n !== 'number' || Number.isNaN(n)) throw new Error(`${name} must be a number.`);
  if (n <= 0) throw new Error(`${name} must be greater than zero.`);
}

function validateNonNeg(n, name) {
  if (typeof n !== 'number' || Number.isNaN(n)) throw new Error(`${name} must be a number.`);
  if (n < 0) throw new Error(`${name} cannot be negative.`);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
