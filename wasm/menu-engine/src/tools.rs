#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ToolItem {
    pub id: &'static str,
    pub label: &'static str,
    pub url: &'static str,
    pub children: &'static [ToolItem],
}

impl ToolItem {
    pub fn leaf_count(&self) -> usize {
        if self.children.is_empty() {
            1
        } else {
            self.children.iter().map(ToolItem::leaf_count).sum()
        }
    }
}

const GENERATORS: &[ToolItem] = &[
    ToolItem {
        id: "qr-code-generator",
        label: "Advanced QR Code Generator",
        url: "/tools/qr-code-generator",
        children: &[],
    },
    ToolItem {
        id: "password-generator",
        label: "Password Generator",
        url: "/tools/password-generator",
        children: &[],
    },
];

const FINANCE_CALCULATORS: &[ToolItem] = &[
    ToolItem {
        id: "loan-mortgage-calculator",
        label: "Loan & Mortgage Calculator",
        url: "/tools/loan-mortgage-calculator",
        children: &[],
    },
    ToolItem {
        id: "compound-interest-calculator",
        label: "Compound Interest Calculator",
        url: "/tools/compound-interest-calculator",
        children: &[],
    },
    ToolItem {
        id: "percentage-calculator",
        label: "Percentage Calculator",
        url: "/tools/percentage-calculator",
        children: &[],
    },
];

const HEALTH_CALCULATORS: &[ToolItem] = &[
    ToolItem {
        id: "bmi-calculator",
        label: "BMI Calculator",
        url: "/tools/bmi-calculator",
        children: &[],
    },
    ToolItem {
        id: "calorie-calculator",
        label: "Calorie Calculator",
        url: "/tools/calorie-calculator",
        children: &[],
    },
    ToolItem {
        id: "age-calculator",
        label: "Age Calculator",
        url: "/tools/age-calculator",
        children: &[],
    },
];

const TIME_DATE_CALCULATORS: &[ToolItem] = &[
    ToolItem {
        id: "date-difference-calculator",
        label: "Date & Business Days Calculator",
        url: "/tools/date-difference-calculator",
        children: &[],
    },
    ToolItem {
        id: "time-zone-converter",
        label: "Time Zone Converter",
        url: "/tools/time-zone-converter",
        children: &[],
    },
];

const CONSTRUCTION_CALCULATORS: &[ToolItem] = &[
    ToolItem {
        id: "concrete-calculator",
        label: "Concrete Calculator",
        url: "/tools/concrete-calculator",
        children: &[],
    },
    ToolItem {
        id: "drywall-calculator",
        label: "Drywall Calculator",
        url: "/tools/drywall-calculator",
        children: &[],
    },
    ToolItem {
        id: "paint-calculator",
        label: "Paint Calculator",
        url: "/tools/paint-calculator",
        children: &[],
    },
    ToolItem {
        id: "tile-calculator",
        label: "Tile Calculator",
        url: "/tools/tile-calculator",
        children: &[],
    },
    ToolItem {
        id: "roofing-shingle-calculator",
        label: "Roofing Shingle Calculator",
        url: "/tools/roofing-shingle-calculator",
        children: &[],
    },
    ToolItem {
        id: "lumber-board-foot-calculator",
        label: "Lumber Board Foot Calculator",
        url: "/tools/lumber-board-foot-calculator",
        children: &[],
    },
    ToolItem {
        id: "insulation-calculator",
        label: "Batt & Blown Insulation Calculator",
        url: "/tools/insulation-calculator",
        children: &[],
    },
];

const CALCULATORS: &[ToolItem] = &[
    ToolItem {
        id: "finance-calculators",
        label: "Finance",
        url: "/tools/finance",
        children: FINANCE_CALCULATORS,
    },
    ToolItem {
        id: "health-calculators",
        label: "Health",
        url: "/tools/health",
        children: HEALTH_CALCULATORS,
    },
    ToolItem {
        id: "time-date-calculators",
        label: "Time & Date",
        url: "/tools",
        children: TIME_DATE_CALCULATORS,
    },
    ToolItem {
        id: "construction-calculators",
        label: "Construction",
        url: "/tools/construction",
        children: CONSTRUCTION_CALCULATORS,
    },
];

const TEXT_DATA: &[ToolItem] = &[
    ToolItem {
        id: "unit-converter",
        label: "Unit Converter",
        url: "/tools/unit-converter",
        children: &[],
    },
    ToolItem {
        id: "tip-calculator",
        label: "Tip Calculator",
        url: "/tools/tip-calculator",
        children: &[],
    },
    ToolItem {
        id: "qr-code-decoder",
        label: "QR Code Decoder",
        url: "/tools/qr-code-decoder",
        children: &[],
    },
    ToolItem {
        id: "word-unscrambler",
        label: "Word Unscrambler",
        url: "/tools/word-unscrambler",
        children: &[],
    },
    ToolItem {
        id: "crossword-solver",
        label: "Crossword Solver",
        url: "/tools/crossword-solver",
        children: &[],
    },
    ToolItem {
        id: "wordle-helper",
        label: "Wordle Solver",
        url: "/tools/wordle-helper",
        children: &[],
    },
    ToolItem {
        id: "word-character-counter",
        label: "Word & Character Counter",
        url: "/tools/word-character-counter",
        children: &[],
    },
    ToolItem {
        id: "ocr-utility",
        label: "OCR Utility",
        url: "/tools/ocr-utility",
        children: &[],
    },
];

const BATCH_AUTOMATION: &[ToolItem] = &[
    ToolItem {
        id: "batch-qr-generator",
        label: "Batch QR Generator",
        url: "/tools/qr-code-generator#batch",
        children: &[],
    },
    ToolItem {
        id: "mortgage-comparison",
        label: "Mortgage Scenario Comparison",
        url: "/tools/loan-mortgage-calculator#scenarios",
        children: &[],
    },
    ToolItem {
        id: "business-day-planner",
        label: "Business Day Planner",
        url: "/tools/date-difference-calculator",
        children: &[],
    },
    ToolItem {
        id: "image-text-extraction",
        label: "Image Text Extraction",
        url: "/tools/ocr-utility",
        children: &[],
    },
];

pub const TOOLS_TREE: &[ToolItem] = &[
    ToolItem {
        id: "generators",
        label: "Generators",
        url: "/tools",
        children: GENERATORS,
    },
    ToolItem {
        id: "calculators",
        label: "Calculators",
        url: "/tools",
        children: CALCULATORS,
    },
    ToolItem {
        id: "text-data",
        label: "Text & Data",
        url: "/tools",
        children: TEXT_DATA,
    },
    ToolItem {
        id: "batch-automation",
        label: "Batch & Automation",
        url: "/tools",
        children: BATCH_AUTOMATION,
    },
];

pub fn searchable_tools() -> impl Iterator<Item = &'static ToolItem> {
    fn collect_leaves(items: &'static [ToolItem], leaves: &mut Vec<&'static ToolItem>) {
        for item in items {
            if item.children.is_empty() {
                leaves.push(item);
            } else {
                collect_leaves(item.children, leaves);
            }
        }
    }

    let mut leaves = Vec::new();
    collect_leaves(TOOLS_TREE, &mut leaves);
    leaves.into_iter()
}

#[cfg(test)]
mod tests {
    use super::{searchable_tools, TOOLS_TREE};
    use std::collections::HashSet;

    #[test]
    fn hierarchy_has_four_populated_groups() {
        assert_eq!(TOOLS_TREE.len(), 4);
        assert!(TOOLS_TREE.iter().all(|group| !group.children.is_empty()));
    }

    #[test]
    fn calculators_have_the_requested_subgroups_and_leaf_count() {
        let calculators = TOOLS_TREE
            .iter()
            .find(|group| group.id == "calculators")
            .expect("calculators group");
        let labels = calculators
            .children
            .iter()
            .map(|group| group.label)
            .collect::<Vec<_>>();

        assert_eq!(labels, ["Finance", "Health", "Time & Date", "Construction"]);
        assert_eq!(calculators.leaf_count(), 15);
    }

    #[test]
    fn searchable_items_have_unique_ids_and_real_tool_urls() {
        let tools = searchable_tools().collect::<Vec<_>>();
        let ids = tools.iter().map(|tool| tool.id).collect::<HashSet<_>>();

        assert_eq!(ids.len(), tools.len());
        assert!(tools.iter().all(|tool| tool.url.starts_with("/tools/")));
    }
}
