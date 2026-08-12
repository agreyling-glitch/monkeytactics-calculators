use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

thread_local! {
    static COVERAGE_CHARTS: RefCell<HashMap<String, CoverageChart>> = RefCell::new(HashMap::new());
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct CoverageEntry {
    pub r_value: f32,
    pub installed_thickness_in: f32,
    pub settled_thickness_in: f32,
    pub bags_per_1000_sqft: f32,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct CoverageChart {
    pub product_name: String,
    pub material: String,
    pub bag_weight_lbs: f32,
    pub r_value_per_inch: f32,
    pub settling_factor: f32,
    pub coverage: Vec<CoverageEntry>,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
pub struct CalculatorInput {
    pub area_sqft: f32,
    pub target_r_value: f32,
    pub existing_depth_in: Option<f32>,
    pub existing_material: Option<String>,
    pub product_id: String,
    #[serde(default = "default_waste_factor")]
    pub waste_factor: f32,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct CalculatorOutput {
    pub r_existing: f32,
    pub r_needed: f32,
    pub coverage_r_value: f32,
    pub installed_thickness_in: f32,
    pub settled_thickness_in: f32,
    pub blow_to_thickness_in: f32,
    pub bags_required: f32,
    pub bags_required_rounded: u32,
    pub ceiling_load_psf: f32,
}

fn default_waste_factor() -> f32 {
    0.10
}

fn round_hundredth(value: f32) -> f32 {
    (value * 100.0).round() / 100.0
}

fn product_id(product_name: &str) -> String {
    let mut id = String::new();
    let mut previous_dash = false;
    for character in product_name.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            id.push(character);
            previous_dash = false;
        } else if !id.is_empty() && !previous_dash {
            id.push('-');
            previous_dash = true;
        }
    }
    id.trim_end_matches('-').to_string()
}

fn positive_finite(value: f32) -> bool {
    value.is_finite() && value > 0.0
}

fn validate_chart(chart: &CoverageChart) -> Result<(), String> {
    if chart.product_name.trim().is_empty() {
        return Err("Coverage chart product_name is required.".into());
    }
    if chart.material.trim().is_empty() {
        return Err("Coverage chart material is required.".into());
    }
    if !positive_finite(chart.bag_weight_lbs)
        || !positive_finite(chart.r_value_per_inch)
        || !positive_finite(chart.settling_factor)
        || chart.settling_factor < 1.0
    {
        return Err("Coverage chart product values must be positive and the settling factor must be at least 1.".into());
    }
    if chart.coverage.is_empty() {
        return Err("Coverage chart must include at least one published entry.".into());
    }

    let mut previous_r = 0.0;
    let mut previous_settled = 0.0;
    for entry in &chart.coverage {
        if !positive_finite(entry.r_value)
            || !positive_finite(entry.installed_thickness_in)
            || !positive_finite(entry.settled_thickness_in)
            || !positive_finite(entry.bags_per_1000_sqft)
        {
            return Err("Every coverage chart entry must contain positive finite values.".into());
        }
        if entry.installed_thickness_in < entry.settled_thickness_in {
            return Err("Installed thickness cannot be less than settled thickness.".into());
        }
        if entry.r_value <= previous_r || entry.settled_thickness_in <= previous_settled {
            return Err(
                "Coverage entries must be ordered by increasing R-value and settled thickness."
                    .into(),
            );
        }
        previous_r = entry.r_value;
        previous_settled = entry.settled_thickness_in;
    }
    Ok(())
}

pub fn parse_coverage_chart(json_string: &str) -> Result<CoverageChart, String> {
    let chart: CoverageChart = serde_json::from_str(json_string)
        .map_err(|error| format!("Invalid coverage chart JSON: {error}"))?;
    validate_chart(&chart)?;
    Ok(chart)
}

pub fn calculate_with_chart(
    input: &CalculatorInput,
    chart: &CoverageChart,
) -> Result<CalculatorOutput, String> {
    if !input.area_sqft.is_finite() || input.area_sqft < 0.0 {
        return Err("Area cannot be negative.".into());
    }
    if !input.target_r_value.is_finite() || input.target_r_value < 0.0 {
        return Err("Target R-value cannot be negative.".into());
    }
    if !input.waste_factor.is_finite() || !(0.0..=1.0).contains(&input.waste_factor) {
        return Err("Waste factor must be between 0 and 1.".into());
    }
    let existing_depth = input.existing_depth_in.unwrap_or(0.0);
    if !existing_depth.is_finite() || existing_depth < 0.0 {
        return Err("Existing insulation depth cannot be negative.".into());
    }

    let existing_r_per_inch = match input.existing_material.as_deref() {
        Some("cellulose") => 3.7,
        Some("mineral_wool") | Some("mineral-wool") => 3.3,
        Some("fiberglass") | Some("unknown") | None => 2.5,
        Some(_) => {
            return Err(
                "Existing material must be fiberglass, cellulose, mineral_wool, or unknown.".into(),
            );
        }
    };
    let r_existing = existing_depth * existing_r_per_inch;
    let r_needed = (input.target_r_value - r_existing).max(0.0);
    let coverage = if r_needed == 0.0 {
        None
    } else {
        Some(
            chart
                .coverage
                .iter()
                .find(|entry| entry.r_value + f32::EPSILON >= r_needed)
                .ok_or_else(|| {
                    format!(
                        "{} does not include the required R-value range.",
                        chart.product_name
                    )
                })?,
        )
    };
    let coverage_r_value = coverage.map_or(0.0, |entry| entry.r_value);
    let installed_thickness = coverage.map_or(0.0, |entry| entry.installed_thickness_in);
    let settled_thickness = coverage.map_or(0.0, |entry| entry.settled_thickness_in);
    let bags = coverage.map_or(0.0, |entry| {
        (input.area_sqft / 1000.0) * entry.bags_per_1000_sqft * (1.0 + input.waste_factor)
    });
    let ceiling_load = coverage.map_or(0.0, |entry| {
        entry.bags_per_1000_sqft * chart.bag_weight_lbs / 1000.0
    });

    Ok(CalculatorOutput {
        r_existing: round_hundredth(r_existing),
        r_needed: round_hundredth(r_needed),
        coverage_r_value: round_hundredth(coverage_r_value),
        installed_thickness_in: round_hundredth(installed_thickness),
        settled_thickness_in: round_hundredth(settled_thickness),
        blow_to_thickness_in: round_hundredth(installed_thickness),
        bags_required: round_hundredth(bags),
        bags_required_rounded: bags.ceil() as u32,
        ceiling_load_psf: round_hundredth(ceiling_load),
    })
}

fn error_json(message: impl AsRef<str>) -> String {
    serde_json::json!({ "error": message.as_ref() }).to_string()
}

/// Loads, validates, and caches a manufacturer chart under a normalized product-name key.
#[wasm_bindgen]
pub fn load_coverage_chart(json_string: &str) -> String {
    match parse_coverage_chart(json_string) {
        Ok(chart) => {
            let id = product_id(&chart.product_name);
            COVERAGE_CHARTS.with(|charts| charts.borrow_mut().insert(id, chart.clone()));
            serde_json::to_string(&chart).unwrap_or_else(|error| error_json(error.to_string()))
        }
        Err(error) => error_json(error),
    }
}

/// Calculates blown-insulation requirements using a chart already loaded in memory.
#[wasm_bindgen]
pub fn calculate(input_json: &str) -> String {
    let input: CalculatorInput = match serde_json::from_str(input_json) {
        Ok(input) => input,
        Err(error) => return error_json(format!("Invalid calculator input JSON: {error}")),
    };
    let chart = COVERAGE_CHARTS.with(|charts| charts.borrow().get(&input.product_id).cloned());
    let Some(chart) = chart else {
        return error_json(format!(
            "Coverage chart '{}' has not been loaded.",
            input.product_id
        ));
    };
    match calculate_with_chart(&input, &chart) {
        Ok(output) => {
            serde_json::to_string(&output).unwrap_or_else(|error| error_json(error.to_string()))
        }
        Err(error) => error_json(error),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chart() -> CoverageChart {
        CoverageChart {
            product_name: "Test Cellulose".into(),
            material: "cellulose".into(),
            bag_weight_lbs: 25.0,
            r_value_per_inch: 3.7,
            settling_factor: 1.1,
            coverage: vec![
                CoverageEntry {
                    r_value: 13.0,
                    installed_thickness_in: 4.0,
                    settled_thickness_in: 3.6,
                    bags_per_1000_sqft: 13.8,
                },
                CoverageEntry {
                    r_value: 30.0,
                    installed_thickness_in: 8.9,
                    settled_thickness_in: 8.3,
                    bags_per_1000_sqft: 36.5,
                },
                CoverageEntry {
                    r_value: 60.0,
                    installed_thickness_in: 17.3,
                    settled_thickness_in: 16.1,
                    bags_per_1000_sqft: 83.5,
                },
            ],
        }
    }

    fn input() -> CalculatorInput {
        CalculatorInput {
            area_sqft: 1000.0,
            target_r_value: 49.0,
            existing_depth_in: Some(6.0),
            existing_material: Some("fiberglass".into()),
            product_id: "test-cellulose".into(),
            waste_factor: 0.10,
        }
    }

    #[test]
    fn calculates_existing_r_depth_and_bags() {
        let output = calculate_with_chart(&input(), &chart()).unwrap();
        assert_eq!(output.r_existing, 15.0);
        assert_eq!(output.r_needed, 34.0);
        assert_eq!(output.coverage_r_value, 60.0);
        assert_eq!(output.installed_thickness_in, 17.3);
        assert_eq!(output.settled_thickness_in, 16.1);
        assert_eq!(output.bags_required, 91.85);
        assert_eq!(output.bags_required_rounded, 92);
        assert_eq!(output.ceiling_load_psf, 2.09);
    }

    #[test]
    fn supports_all_existing_material_rules() {
        let mut value = input();
        value.existing_depth_in = Some(2.0);
        for (material, expected) in [
            ("fiberglass", 5.0),
            ("cellulose", 7.4),
            ("mineral_wool", 6.6),
            ("unknown", 5.0),
        ] {
            value.existing_material = Some(material.into());
            assert_eq!(
                calculate_with_chart(&value, &chart()).unwrap().r_existing,
                expected
            );
        }
    }

    #[test]
    fn returns_zero_bags_when_target_is_already_met() {
        let mut value = input();
        value.target_r_value = 10.0;
        assert_eq!(
            calculate_with_chart(&value, &chart())
                .unwrap()
                .bags_required_rounded,
            0
        );
    }

    #[test]
    fn rejects_negative_and_out_of_range_inputs() {
        let mut value = input();
        value.area_sqft = -1.0;
        assert!(calculate_with_chart(&value, &chart()).is_err());
        value.area_sqft = 1000.0;
        value.target_r_value = 100.0;
        assert!(calculate_with_chart(&value, &chart()).is_err());
    }

    #[test]
    fn rejects_missing_or_invalid_coverage_entries() {
        let mut value = chart();
        value.coverage.clear();
        assert!(validate_chart(&value).is_err());
    }

    #[test]
    fn product_names_normalize_to_cache_keys() {
        assert_eq!(
            product_id("SANCTUARY by Greenfiber"),
            "sanctuary-by-greenfiber"
        );
    }
}
