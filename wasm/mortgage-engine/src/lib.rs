use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const MAX_SCENARIOS: usize = 5;
const BALANCE_EPSILON: f64 = 0.005;

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PaymentFrequency {
    Monthly,
    #[serde(alias = "bi-weekly", alias = "bi_weekly")]
    BiWeekly,
}

impl PaymentFrequency {
    fn periods_per_year(self) -> u32 {
        match self {
            Self::Monthly => 12,
            Self::BiWeekly => 26,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioInput {
    #[serde(default)]
    pub name: String,
    pub loan_amount: f64,
    pub annual_interest_rate: f64,
    pub term_years: u32,
    #[serde(default = "default_frequency")]
    pub payment_frequency: PaymentFrequency,
    #[serde(default)]
    pub extra_payment_per_period: f64,
}

fn default_frequency() -> PaymentFrequency {
    PaymentFrequency::Monthly
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleEntry {
    pub period_index: u32,
    pub payment_amount: f64,
    pub interest_component: f64,
    pub principal_component: f64,
    pub remaining_balance: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PayoffTime {
    pub years: u32,
    pub months: u32,
    pub total_periods: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioResult {
    pub name: String,
    pub payment_frequency: PaymentFrequency,
    pub scheduled_payment: f64,
    pub payment_with_extra: f64,
    pub total_interest_paid: f64,
    pub total_principal_paid: f64,
    pub total_amount_paid: f64,
    pub payoff_time: PayoffTime,
    pub amortization_schedule: Vec<ScheduleEntry>,
}

fn round_money(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn validate(input: &ScenarioInput) -> Result<(), String> {
    if !input.loan_amount.is_finite() || input.loan_amount <= 0.0 {
        return Err("Loan amount must be greater than zero.".into());
    }
    if !input.annual_interest_rate.is_finite()
        || input.annual_interest_rate < 0.0
        || input.annual_interest_rate > 100.0
    {
        return Err("Annual interest rate must be between 0% and 100%.".into());
    }
    if input.term_years == 0 || input.term_years > 100 {
        return Err("Loan term must be between 1 and 100 years.".into());
    }
    if !input.extra_payment_per_period.is_finite() || input.extra_payment_per_period < 0.0 {
        return Err("Extra payment cannot be negative.".into());
    }
    Ok(())
}

pub fn calculate(input: &ScenarioInput) -> Result<ScenarioResult, String> {
    validate(input)?;
    let periods_per_year = input.payment_frequency.periods_per_year();
    let scheduled_periods = input.term_years * periods_per_year;
    let rate = input.annual_interest_rate / 100.0 / periods_per_year as f64;
    let scheduled_payment = if rate == 0.0 {
        input.loan_amount / scheduled_periods as f64
    } else {
        let growth = (1.0 + rate).powi(scheduled_periods as i32);
        input.loan_amount * rate * growth / (growth - 1.0)
    };
    let payment_with_extra = scheduled_payment + input.extra_payment_per_period;

    let mut balance = input.loan_amount;
    let mut total_interest = 0.0;
    let mut total_principal = 0.0;
    let mut schedule = Vec::with_capacity(scheduled_periods as usize);

    for period in 1..=scheduled_periods {
        let interest = balance * rate;
        let planned_principal = (payment_with_extra - interest).max(0.0);
        let principal = planned_principal.min(balance);
        let payment = interest + principal;
        balance = (balance - principal).max(0.0);
        total_interest += interest;
        total_principal += principal;
        schedule.push(ScheduleEntry {
            period_index: period,
            payment_amount: round_money(payment),
            interest_component: round_money(interest),
            principal_component: round_money(principal),
            remaining_balance: round_money(balance),
        });
        if balance <= BALANCE_EPSILON {
            break;
        }
    }

    let total_periods = schedule.len() as u32;
    let payoff_months = ((total_periods as f64 * 12.0) / periods_per_year as f64).round() as u32;
    Ok(ScenarioResult {
        name: if input.name.trim().is_empty() {
            "Scenario".into()
        } else {
            input.name.trim().into()
        },
        payment_frequency: input.payment_frequency,
        scheduled_payment: round_money(scheduled_payment),
        payment_with_extra: round_money(payment_with_extra),
        total_interest_paid: round_money(total_interest),
        total_principal_paid: round_money(total_principal),
        total_amount_paid: round_money(total_interest + total_principal),
        payoff_time: PayoffTime {
            years: payoff_months / 12,
            months: payoff_months % 12,
            total_periods,
        },
        amortization_schedule: schedule,
    })
}

fn error_json(message: impl AsRef<str>) -> String {
    serde_json::json!({ "error": message.as_ref() }).to_string()
}

/// Verifies that the WASM engine is running on an approved MonkeyTactics host.
#[wasm_bindgen]
pub fn verify_domain(host: String) -> bool {
    host == "monkeytactics.com"
        || host == "www.monkeytactics.com"
        || host == "monkeytactics-calculators.pages.dev"
        || host.ends_with(".monkeytactics-calculators.pages.dev")
        || host == "127.0.0.1"
}

#[wasm_bindgen]
pub fn calculate_scenario(input_json: String) -> String {
    let input: ScenarioInput = match serde_json::from_str(&input_json) {
        Ok(input) => input,
        Err(error) => return error_json(format!("Invalid scenario JSON: {error}")),
    };
    match calculate(&input) {
        Ok(result) => {
            serde_json::to_string(&result).unwrap_or_else(|error| error_json(error.to_string()))
        }
        Err(error) => error_json(error),
    }
}

#[wasm_bindgen]
pub fn calculate_multi_scenario(inputs_json: String) -> String {
    let inputs: Vec<ScenarioInput> = match serde_json::from_str(&inputs_json) {
        Ok(inputs) => inputs,
        Err(error) => return error_json(format!("Invalid scenarios JSON: {error}")),
    };
    if inputs.is_empty() {
        return error_json("Add at least one mortgage scenario.");
    }
    if inputs.len() > MAX_SCENARIOS {
        return error_json("A maximum of five scenarios can be compared at once.");
    }
    let results: Result<Vec<_>, _> = inputs.iter().map(calculate).collect();
    match results {
        Ok(results) => {
            serde_json::to_string(&results).unwrap_or_else(|error| error_json(error.to_string()))
        }
        Err(error) => error_json(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scenario(rate: f64, years: u32, extra: f64, frequency: PaymentFrequency) -> ScenarioInput {
        ScenarioInput {
            name: "Test".into(),
            loan_amount: 300_000.0,
            annual_interest_rate: rate,
            term_years: years,
            payment_frequency: frequency,
            extra_payment_per_period: extra,
        }
    }

    #[test]
    fn standard_mortgage_matches_known_payment() {
        let result = calculate(&scenario(6.5, 30, 0.0, PaymentFrequency::Monthly)).unwrap();
        assert!((result.scheduled_payment - 1_896.20).abs() < 0.01);
        assert_eq!(result.payoff_time.total_periods, 360);
        assert!((result.total_principal_paid - 300_000.0).abs() < 0.02);
    }

    #[test]
    fn zero_interest_is_supported() {
        let result = calculate(&scenario(0.0, 10, 0.0, PaymentFrequency::Monthly)).unwrap();
        assert_eq!(result.scheduled_payment, 2_500.0);
        assert_eq!(result.total_interest_paid, 0.0);
        assert_eq!(result.payoff_time.total_periods, 120);
    }

    #[test]
    fn extra_payments_reduce_time_and_interest() {
        let base = calculate(&scenario(6.5, 30, 0.0, PaymentFrequency::Monthly)).unwrap();
        let extra = calculate(&scenario(6.5, 30, 200.0, PaymentFrequency::Monthly)).unwrap();
        assert!(extra.payoff_time.total_periods < base.payoff_time.total_periods);
        assert!(extra.total_interest_paid < base.total_interest_paid);
    }

    #[test]
    fn biweekly_uses_twenty_six_periods_per_year() {
        let result = calculate(&scenario(6.5, 30, 0.0, PaymentFrequency::BiWeekly)).unwrap();
        assert_eq!(result.payoff_time.total_periods, 780);
        assert!(result.scheduled_payment < 1_000.0);
    }

    #[test]
    fn rejects_invalid_values() {
        let mut input = scenario(6.5, 30, 0.0, PaymentFrequency::Monthly);
        input.loan_amount = -1.0;
        assert!(calculate(&input).is_err());
    }

    #[test]
    fn host_allowlist_is_exact() {
        assert!(verify_domain("monkeytactics.com".into()));
        assert!(verify_domain(
            "preview.monkeytactics-calculators.pages.dev".into()
        ));
        assert!(verify_domain("127.0.0.1".into()));
        assert!(!verify_domain("localhost".into()));
        assert!(!verify_domain("evilmonkeytactics.com".into()));
    }
}
