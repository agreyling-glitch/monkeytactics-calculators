use serde::Deserialize;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub struct ToolItem {
    pub id: String,
    pub label: String,
    pub url: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub children: Vec<ToolItem>,
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

pub fn searchable_tools(items: &[ToolItem]) -> Vec<&ToolItem> {
    fn collect_leaves<'a>(items: &'a [ToolItem], leaves: &mut Vec<&'a ToolItem>) {
        for item in items {
            if item.children.is_empty() {
                leaves.push(item);
            } else {
                collect_leaves(&item.children, leaves);
            }
        }
    }
    let mut leaves = Vec::new();
    collect_leaves(items, &mut leaves);
    leaves
}

#[cfg(test)]
mod tests {
    use super::{searchable_tools, ToolItem};
    use std::collections::HashSet;

    fn manifest() -> Vec<ToolItem> {
        serde_json::from_str(include_str!(
            "../../../assets/wasm/menu/tools-manifest.json"
        ))
        .expect("valid tools manifest")
    }

    #[test]
    fn manifest_has_five_populated_groups() {
        let tree = manifest();
        assert_eq!(tree.len(), 5);
        assert!(tree.iter().all(|group| !group.children.is_empty()));
    }

    #[test]
    fn calculators_have_the_requested_subgroups_and_leaf_count() {
        let tree = manifest();
        let calculators = tree
            .iter()
            .find(|group| group.id == "calculators")
            .expect("calculators group");
        let labels = calculators
            .children
            .iter()
            .map(|group| group.label.as_str())
            .collect::<Vec<_>>();
        assert_eq!(labels, ["Finance", "Health", "Time & Date", "Construction"]);
        assert_eq!(calculators.leaf_count(), 15);
    }

    #[test]
    fn searchable_items_have_unique_ids_and_real_tool_urls() {
        let tree = manifest();
        let tools = searchable_tools(&tree);
        let ids = tools.iter().map(|tool| &tool.id).collect::<HashSet<_>>();
        assert_eq!(ids.len(), tools.len());
        assert!(tools.iter().all(|tool| tool.url.starts_with("/tools/")));
        assert!(tools.iter().all(|tool| tool.capabilities.len() == 3));
    }
}
