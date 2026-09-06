use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const ASSET_COUNT: usize = 8;
const MAX_SIMULATIONS: u32 = 100_000;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationInput {
    pub initial_portfolio: f64,
    pub withdrawal_rate: f64,
    pub years: u32,
    pub simulations: u32,
    pub seed: u64,
    pub inflation_rate: f64,
    #[serde(default)]
    pub legacy_cpi_premium: f64,
    pub allocations: Vec<f64>,
    #[serde(default)]
    pub asset_assumptions: Option<Vec<AssetAssumption>>,
    #[serde(default)]
    pub rebalancing: Rebalancing,
    #[serde(default)]
    pub withdrawal_timing: WithdrawalTiming,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathPoint {
    pub year: u32,
    pub p10: f64,
    pub median: f64,
    pub p90: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationResult {
    pub success_rate: f64,
    pub successful_runs: u32,
    pub simulations: u32,
    pub initial_withdrawal: f64,
    pub median_ending_balance: f64,
    pub p10_ending_balance: f64,
    pub p90_ending_balance: f64,
    pub median_failure_year: Option<u32>,
    pub paths: Vec<PathPoint>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpendingInput {
    pub initial_portfolio: f64,
    pub minimum_annual_budget: f64,
    pub years: u32,
    pub simulations: u32,
    pub seed: u64,
    pub inflation_rate: f64,
    #[serde(default)]
    pub legacy_cpi_premium: f64,
    pub allocations: Vec<f64>,
    #[serde(default)]
    pub asset_assumptions: Option<Vec<AssetAssumption>>,
    #[serde(default)]
    pub rebalancing: Rebalancing,
    #[serde(default)]
    pub withdrawal_timing: WithdrawalTiming,
    #[serde(default = "default_target_success_rate")]
    pub target_success_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpendingResult {
    pub minimum_annual_budget: f64,
    pub maximum_total_spending: f64,
    pub additional_spending: f64,
    pub implied_withdrawal_rate: f64,
    pub target_success_rate: f64,
    pub minimum_budget_success_rate: f64,
    pub target_achievable: bool,
    pub simulation: SimulationResult,
}

fn default_target_success_rate() -> f64 {
    90.0
}

#[derive(Clone, Copy)]
struct AssetModel {
    nominal_mean: f64,
    volatility: f64,
    metal_loading: f64,
    equity_loading: f64,
    defensive_loading: f64,
    annual_fee: f64,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetAssumption {
    pub nominal_return: f64,
    pub volatility: f64,
    pub annual_cost: f64,
    pub metals_factor: f64,
    pub equity_factor: f64,
    pub defensive_factor: f64,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Rebalancing {
    #[default]
    Annual,
    None,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WithdrawalTiming {
    #[default]
    Beginning,
    End,
}

// Gold, silver, platinum, and palladium bullion; senior and junior miners;
// royalty/streaming companies; and cash/T-bills. These are editable model
// assumptions, not forecasts. Loadings create shared sector shocks.
const MODELS: [AssetModel; ASSET_COUNT] = [
    AssetModel {
        nominal_mean: 0.065,
        volatility: 0.155,
        metal_loading: 0.82,
        equity_loading: 0.05,
        defensive_loading: 0.20,
        annual_fee: 0.004,
    },
    AssetModel {
        nominal_mean: 0.070,
        volatility: 0.280,
        metal_loading: 0.78,
        equity_loading: 0.14,
        defensive_loading: 0.05,
        annual_fee: 0.006,
    },
    AssetModel {
        nominal_mean: 0.060,
        volatility: 0.245,
        metal_loading: 0.62,
        equity_loading: 0.28,
        defensive_loading: 0.00,
        annual_fee: 0.006,
    },
    AssetModel {
        nominal_mean: 0.055,
        volatility: 0.310,
        metal_loading: 0.58,
        equity_loading: 0.35,
        defensive_loading: 0.00,
        annual_fee: 0.007,
    },
    AssetModel {
        nominal_mean: 0.085,
        volatility: 0.340,
        metal_loading: 0.58,
        equity_loading: 0.50,
        defensive_loading: 0.00,
        annual_fee: 0.006,
    },
    AssetModel {
        nominal_mean: 0.095,
        volatility: 0.480,
        metal_loading: 0.55,
        equity_loading: 0.58,
        defensive_loading: 0.00,
        annual_fee: 0.009,
    },
    AssetModel {
        nominal_mean: 0.090,
        volatility: 0.290,
        metal_loading: 0.48,
        equity_loading: 0.48,
        defensive_loading: 0.08,
        annual_fee: 0.006,
    },
    AssetModel {
        nominal_mean: 0.040,
        volatility: 0.025,
        metal_loading: 0.00,
        equity_loading: 0.00,
        defensive_loading: 0.65,
        annual_fee: 0.001,
    },
];

fn resolve_models(
    assumptions: &Option<Vec<AssetAssumption>>,
) -> Result<[AssetModel; ASSET_COUNT], String> {
    let Some(assumptions) = assumptions else {
        return Ok(MODELS);
    };
    if assumptions.len() != ASSET_COUNT {
        return Err("Exactly eight asset assumption rows are required.".into());
    }
    let mut models = MODELS;
    for (index, assumption) in assumptions.iter().enumerate() {
        if !assumption.nominal_return.is_finite()
            || assumption.nominal_return < -20.0
            || assumption.nominal_return > 30.0
        {
            return Err("Nominal returns must be between -20% and 30%.".into());
        }
        if !assumption.volatility.is_finite()
            || assumption.volatility < 0.0
            || assumption.volatility > 100.0
        {
            return Err("Volatility must be between 0% and 100%.".into());
        }
        if !assumption.annual_cost.is_finite()
            || assumption.annual_cost < 0.0
            || assumption.annual_cost > 10.0
        {
            return Err("Annual costs must be between 0% and 10%.".into());
        }
        for factor in [
            assumption.metals_factor,
            assumption.equity_factor,
            assumption.defensive_factor,
        ] {
            if !factor.is_finite() || !(0.0..=1.0).contains(&factor) {
                return Err("Factor exposures must be between 0.00 and 1.00.".into());
            }
        }
        let explained = assumption.metals_factor.powi(2)
            + assumption.equity_factor.powi(2)
            + assumption.defensive_factor.powi(2);
        if explained > 1.0 {
            return Err("Each asset's squared factor exposures must total 1.00 or less.".into());
        }
        models[index].nominal_mean = assumption.nominal_return / 100.0;
        models[index].volatility = assumption.volatility / 100.0;
        models[index].annual_fee = assumption.annual_cost / 100.0;
        models[index].metal_loading = assumption.metals_factor;
        models[index].equity_loading = assumption.equity_factor;
        models[index].defensive_loading = assumption.defensive_factor;
    }
    Ok(models)
}

struct Rng {
    state: u64,
    spare: Option<f64>,
}

impl Rng {
    fn new(seed: u64) -> Self {
        Self {
            state: if seed == 0 { 0x9e3779b97f4a7c15 } else { seed },
            spare: None,
        }
    }

    fn uniform(&mut self) -> f64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        ((x >> 11) as f64 + 1.0) / ((1_u64 << 53) as f64 + 2.0)
    }

    fn normal(&mut self) -> f64 {
        if let Some(value) = self.spare.take() {
            return value;
        }
        let radius = (-2.0 * self.uniform().ln()).sqrt();
        let theta = std::f64::consts::TAU * self.uniform();
        self.spare = Some(radius * theta.sin());
        radius * theta.cos()
    }
}

fn validate(input: &SimulationInput) -> Result<[f64; ASSET_COUNT], String> {
    if !input.initial_portfolio.is_finite()
        || input.initial_portfolio < 10_000.0
        || input.initial_portfolio > 1_000_000_000.0
    {
        return Err("Portfolio must be between $10,000 and $1 billion.".into());
    }
    if !input.withdrawal_rate.is_finite()
        || input.withdrawal_rate < 0.0
        || input.withdrawal_rate > 100.0
    {
        return Err("Withdrawal rate must be between 0% and 100%.".into());
    }
    if !(5..=70).contains(&input.years) {
        return Err("Retirement length must be between 5 and 70 years.".into());
    }
    if input.simulations < 100 || input.simulations > MAX_SIMULATIONS {
        return Err("Simulations must be between 100 and 100,000.".into());
    }
    if !input.inflation_rate.is_finite()
        || input.inflation_rate < -2.0
        || input.inflation_rate > 15.0
    {
        return Err("Inflation must be between -2% and 15%.".into());
    }
    if !input.legacy_cpi_premium.is_finite()
        || input.legacy_cpi_premium < 0.0
        || input.legacy_cpi_premium > 8.0
    {
        return Err("Alternative CPI premium must be between 0% and 8%.".into());
    }
    if input.allocations.len() != ASSET_COUNT {
        return Err("Exactly eight portfolio allocations are required.".into());
    }
    let mut weights = [0.0; ASSET_COUNT];
    let mut total = 0.0;
    for (index, value) in input.allocations.iter().copied().enumerate() {
        if !value.is_finite() || value < 0.0 || value > 100.0 {
            return Err("Every allocation must be between 0% and 100%.".into());
        }
        weights[index] = value / 100.0;
        total += value;
    }
    if (total - 100.0).abs() > 0.01 {
        return Err("Portfolio allocations must total 100%.".into());
    }
    Ok(weights)
}

fn percentile(sorted: &[f64], probability: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let index = ((sorted.len() - 1) as f64 * probability).round() as usize;
    sorted[index]
}

fn rounded(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

pub fn simulate(input: &SimulationInput) -> Result<SimulationResult, String> {
    let weights = validate(input)?;
    let models = resolve_models(&input.asset_assumptions)?;
    let count = input.simulations as usize;
    let inflation = (input.inflation_rate + input.legacy_cpi_premium) / 100.0;
    let initial_withdrawal = input.initial_portfolio * input.withdrawal_rate / 100.0;
    let mut rng = Rng::new(input.seed);
    let mut endings = Vec::with_capacity(count);
    let mut failures = Vec::new();
    let mut yearly = vec![Vec::with_capacity(count); input.years as usize + 1];

    for _ in 0..count {
        let mut holdings = [0.0; ASSET_COUNT];
        for index in 0..ASSET_COUNT {
            holdings[index] = input.initial_portfolio * weights[index];
        }
        let mut withdrawal = initial_withdrawal;
        let mut failed = None;
        yearly[0].push(input.initial_portfolio);

        for year in 1..=input.years {
            let metal = rng.normal();
            let equity = rng.normal();
            let defensive = rng.normal();
            let mut gross_returns = [1.0; ASSET_COUNT];
            for index in 0..ASSET_COUNT {
                let model = models[index];
                let explained = model.metal_loading.powi(2)
                    + model.equity_loading.powi(2)
                    + model.defensive_loading.powi(2);
                let idiosyncratic = (1.0 - explained).sqrt() * rng.normal();
                let shock = model.metal_loading * metal
                    + model.equity_loading * equity
                    + model.defensive_loading * defensive
                    + idiosyncratic;
                let expected = model.nominal_mean - model.annual_fee;
                gross_returns[index] =
                    (expected - 0.5 * model.volatility.powi(2) + model.volatility * shock).exp();
            }
            if failed.is_none() {
                let total: f64 = holdings.iter().sum();
                if input.withdrawal_timing == WithdrawalTiming::Beginning {
                    if !withdraw(&mut holdings, withdrawal) {
                        failed = Some(year);
                    } else {
                        if input.rebalancing == Rebalancing::Annual {
                            rebalance(&mut holdings, &weights);
                        }
                        apply_returns(&mut holdings, &gross_returns);
                    }
                } else {
                    if input.rebalancing == Rebalancing::Annual {
                        rebalance(&mut holdings, &weights);
                    }
                    apply_returns(&mut holdings, &gross_returns);
                    if !withdraw(&mut holdings, withdrawal) {
                        failed = Some(year);
                    }
                }
                if total <= 0.0 {
                    failed = Some(year);
                }
            }
            let nominal: f64 = holdings.iter().sum();
            let real = nominal / (1.0 + inflation).powi(year as i32);
            yearly[year as usize].push(real.max(0.0));
            withdrawal *= 1.0 + inflation;
        }
        let nominal: f64 = holdings.iter().sum();
        endings.push(nominal / (1.0 + inflation).powi(input.years as i32));
        if let Some(year) = failed {
            failures.push(year);
        }
    }

    endings.sort_by(f64::total_cmp);
    failures.sort_unstable();
    let successful_runs = input.simulations - failures.len() as u32;
    let mut paths = Vec::with_capacity(yearly.len());
    for (year, balances) in yearly.iter_mut().enumerate() {
        balances.sort_by(f64::total_cmp);
        paths.push(PathPoint {
            year: year as u32,
            p10: rounded(percentile(balances, 0.10)),
            median: rounded(percentile(balances, 0.50)),
            p90: rounded(percentile(balances, 0.90)),
        });
    }
    Ok(SimulationResult {
        success_rate: rounded(successful_runs as f64 / input.simulations as f64 * 100.0),
        successful_runs,
        simulations: input.simulations,
        initial_withdrawal: rounded(initial_withdrawal),
        median_ending_balance: rounded(percentile(&endings, 0.50)),
        p10_ending_balance: rounded(percentile(&endings, 0.10)),
        p90_ending_balance: rounded(percentile(&endings, 0.90)),
        median_failure_year: if failures.is_empty() {
            None
        } else {
            Some(failures[failures.len() / 2])
        },
        paths,
    })
}

fn rebalance(holdings: &mut [f64; ASSET_COUNT], weights: &[f64; ASSET_COUNT]) {
    let total: f64 = holdings.iter().sum();
    for index in 0..ASSET_COUNT {
        holdings[index] = total * weights[index];
    }
}

fn apply_returns(holdings: &mut [f64; ASSET_COUNT], returns: &[f64; ASSET_COUNT]) {
    for index in 0..ASSET_COUNT {
        holdings[index] *= returns[index];
    }
}

fn withdraw(holdings: &mut [f64; ASSET_COUNT], amount: f64) -> bool {
    let total: f64 = holdings.iter().sum();
    if total < amount || total <= 0.0 {
        *holdings = [0.0; ASSET_COUNT];
        return false;
    }
    let remaining_fraction = (total - amount) / total;
    for holding in holdings.iter_mut() {
        *holding *= remaining_fraction;
    }
    true
}

fn market_return_paths(
    input: &SimulationInput,
    models: &[AssetModel; ASSET_COUNT],
) -> Vec<[f64; ASSET_COUNT]> {
    let mut rng = Rng::new(input.seed);
    let mut paths = Vec::with_capacity(input.simulations as usize * input.years as usize);
    for _ in 0..input.simulations {
        for _year in 1..=input.years {
            let metal = rng.normal();
            let equity = rng.normal();
            let defensive = rng.normal();
            let mut returns = [1.0; ASSET_COUNT];
            for index in 0..ASSET_COUNT {
                let model = models[index];
                let explained = model.metal_loading.powi(2)
                    + model.equity_loading.powi(2)
                    + model.defensive_loading.powi(2);
                let idiosyncratic = (1.0 - explained).sqrt() * rng.normal();
                let shock = model.metal_loading * metal
                    + model.equity_loading * equity
                    + model.defensive_loading * defensive
                    + idiosyncratic;
                let expected = model.nominal_mean - model.annual_fee;
                let gross_return =
                    (expected - 0.5 * model.volatility.powi(2) + model.volatility * shock).exp();
                returns[index] = gross_return;
            }
            paths.push(returns);
        }
    }
    paths
}

fn survival_rate_from_paths(
    input: &SimulationInput,
    paths: &[[f64; ASSET_COUNT]],
    initial_withdrawal: f64,
) -> f64 {
    let inflation = (input.inflation_rate + input.legacy_cpi_premium) / 100.0;
    let mut successful = 0_u32;
    for simulation in 0..input.simulations as usize {
        let mut holdings = [0.0; ASSET_COUNT];
        for index in 0..ASSET_COUNT {
            holdings[index] = input.initial_portfolio * input.allocations[index] / 100.0;
        }
        let mut withdrawal = initial_withdrawal;
        let mut failed = false;
        for year in 0..input.years as usize {
            let returns = &paths[simulation * input.years as usize + year];
            if input.withdrawal_timing == WithdrawalTiming::Beginning {
                if !withdraw(&mut holdings, withdrawal) {
                    failed = true;
                    break;
                }
                if input.rebalancing == Rebalancing::Annual {
                    let mut weights = [0.0; ASSET_COUNT];
                    for index in 0..ASSET_COUNT {
                        weights[index] = input.allocations[index] / 100.0;
                    }
                    rebalance(&mut holdings, &weights);
                }
                apply_returns(&mut holdings, returns);
            } else {
                if input.rebalancing == Rebalancing::Annual {
                    let mut weights = [0.0; ASSET_COUNT];
                    for index in 0..ASSET_COUNT {
                        weights[index] = input.allocations[index] / 100.0;
                    }
                    rebalance(&mut holdings, &weights);
                }
                apply_returns(&mut holdings, returns);
                if !withdraw(&mut holdings, withdrawal) {
                    failed = true;
                    break;
                }
            }
            withdrawal *= 1.0 + inflation;
        }
        if !failed {
            successful += 1;
        }
    }
    successful as f64 / input.simulations as f64 * 100.0
}

pub fn solve_spending(input: &SpendingInput) -> Result<SpendingResult, String> {
    if !input.minimum_annual_budget.is_finite()
        || input.minimum_annual_budget < 0.0
        || input.minimum_annual_budget > input.initial_portfolio
    {
        return Err("Minimum annual budget must be between $0 and the initial portfolio.".into());
    }
    if !input.target_success_rate.is_finite()
        || input.target_success_rate < 50.0
        || input.target_success_rate > 99.9
    {
        return Err("Target survival rate must be between 50% and 99.9%.".into());
    }
    let mut simulation_input = SimulationInput {
        initial_portfolio: input.initial_portfolio,
        withdrawal_rate: input.minimum_annual_budget / input.initial_portfolio * 100.0,
        years: input.years,
        simulations: input.simulations,
        seed: input.seed,
        inflation_rate: input.inflation_rate,
        legacy_cpi_premium: input.legacy_cpi_premium,
        allocations: input.allocations.clone(),
        asset_assumptions: input.asset_assumptions.clone(),
        rebalancing: input.rebalancing,
        withdrawal_timing: input.withdrawal_timing,
    };
    validate(&simulation_input)?;
    let models = resolve_models(&simulation_input.asset_assumptions)?;
    let return_paths = market_return_paths(&simulation_input, &models);
    let minimum_success = survival_rate_from_paths(
        &simulation_input,
        &return_paths,
        input.minimum_annual_budget,
    );
    let target_achievable = minimum_success >= input.target_success_rate;
    let maximum_total_spending = if target_achievable {
        let mut low = input.minimum_annual_budget;
        let mut high = input.initial_portfolio;
        for _ in 0..24 {
            let midpoint = (low + high) / 2.0;
            if survival_rate_from_paths(&simulation_input, &return_paths, midpoint)
                >= input.target_success_rate
            {
                low = midpoint;
            } else {
                high = midpoint;
            }
        }
        low
    } else {
        input.minimum_annual_budget
    };
    simulation_input.withdrawal_rate = maximum_total_spending / input.initial_portfolio * 100.0;
    let simulation = simulate(&simulation_input)?;
    Ok(SpendingResult {
        minimum_annual_budget: rounded(input.minimum_annual_budget),
        maximum_total_spending: rounded(maximum_total_spending),
        additional_spending: rounded(
            (maximum_total_spending - input.minimum_annual_budget).max(0.0),
        ),
        implied_withdrawal_rate: rounded(
            maximum_total_spending / input.initial_portfolio * 10_000.0,
        ) / 100.0,
        target_success_rate: input.target_success_rate,
        minimum_budget_success_rate: rounded(minimum_success),
        target_achievable,
        simulation,
    })
}

fn error_json(message: impl AsRef<str>) -> String {
    serde_json::json!({ "error": message.as_ref() }).to_string()
}

#[wasm_bindgen]
pub fn verify_domain(host: String) -> bool {
    host == "monkeytactics.com"
        || host == "www.monkeytactics.com"
        || host == "monkeytactics-calculators.pages.dev"
        || host.ends_with(".monkeytactics-calculators.pages.dev")
        || host == "127.0.0.1"
}

#[wasm_bindgen]
pub fn simulate_retirement(input_json: String) -> String {
    let input: SimulationInput = match serde_json::from_str(&input_json) {
        Ok(input) => input,
        Err(error) => return error_json(format!("Invalid retirement simulation JSON: {error}")),
    };
    match simulate(&input) {
        Ok(result) => {
            serde_json::to_string(&result).unwrap_or_else(|error| error_json(error.to_string()))
        }
        Err(error) => error_json(error),
    }
}

#[wasm_bindgen]
pub fn solve_retirement_spending(input_json: String) -> String {
    let input: SpendingInput = match serde_json::from_str(&input_json) {
        Ok(input) => input,
        Err(error) => return error_json(format!("Invalid spending-plan JSON: {error}")),
    };
    match solve_spending(&input) {
        Ok(result) => {
            serde_json::to_string(&result).unwrap_or_else(|error| error_json(error.to_string()))
        }
        Err(error) => error_json(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> SimulationInput {
        SimulationInput {
            initial_portfolio: 1_000_000.0,
            withdrawal_rate: 4.0,
            years: 30,
            simulations: 1_000,
            seed: 42,
            inflation_rate: 3.0,
            legacy_cpi_premium: 0.0,
            allocations: vec![35.0, 10.0, 3.0, 2.0, 20.0, 5.0, 15.0, 10.0],
            asset_assumptions: None,
            rebalancing: Rebalancing::Annual,
            withdrawal_timing: WithdrawalTiming::Beginning,
        }
    }

    #[test]
    fn deterministic_for_same_seed() {
        let a = simulate(&sample()).unwrap();
        let b = simulate(&sample()).unwrap();
        assert_eq!(a.success_rate, b.success_rate);
        assert_eq!(a.median_ending_balance, b.median_ending_balance);
        assert_eq!(a.paths.len(), 31);
    }

    #[test]
    fn allocations_must_total_one_hundred() {
        let mut input = sample();
        input.allocations[0] = 39.0;
        assert!(simulate(&input).is_err());
    }

    #[test]
    fn higher_alternative_inflation_reduces_success() {
        let base = simulate(&sample()).unwrap();
        let mut stressed_input = sample();
        stressed_input.legacy_cpi_premium = 4.0;
        let stressed = simulate(&stressed_input).unwrap();
        assert!(stressed.success_rate < base.success_rate);
    }

    #[test]
    fn spending_solver_finds_extra_above_a_sustainable_minimum() {
        let base = sample();
        let input = SpendingInput {
            initial_portfolio: base.initial_portfolio,
            minimum_annual_budget: 10_000.0,
            years: base.years,
            simulations: base.simulations,
            seed: base.seed,
            inflation_rate: base.inflation_rate,
            legacy_cpi_premium: base.legacy_cpi_premium,
            allocations: base.allocations,
            asset_assumptions: None,
            rebalancing: base.rebalancing,
            withdrawal_timing: base.withdrawal_timing,
            target_success_rate: 90.0,
        };
        let result = solve_spending(&input).unwrap();
        assert!(result.target_achievable);
        assert!(result.maximum_total_spending > result.minimum_annual_budget);
        assert!(result.simulation.success_rate >= 89.8);
    }
}
