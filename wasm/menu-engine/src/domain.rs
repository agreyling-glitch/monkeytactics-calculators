use wasm_bindgen::prelude::*;

/// Verifies that the WASM engine is running on an approved MonkeyTactics host.
#[wasm_bindgen]
pub fn verify_domain(host: String) -> bool {
    host == "monkeytactics.com"
        || host == "www.monkeytactics.com"
        || host == "monkeytactics-calculators.pages.dev"
        || host.ends_with(".monkeytactics-calculators.pages.dev")
        || host == "127.0.0.1"
}

#[cfg(test)]
mod tests {
    use super::verify_domain;

    #[test]
    fn accepts_approved_hosts() {
        assert!(verify_domain("monkeytactics.com".into()));
        assert!(verify_domain("www.monkeytactics.com".into()));
        assert!(verify_domain("monkeytactics-calculators.pages.dev".into()));
        assert!(verify_domain(
            "preview.monkeytactics-calculators.pages.dev".into()
        ));
        assert!(verify_domain("127.0.0.1".into()));
    }

    #[test]
    fn rejects_unapproved_hosts() {
        assert!(!verify_domain("example.com".into()));
        assert!(!verify_domain("localhost".into()));
        assert!(!verify_domain("127.0.0.1:8080".into()));
        assert!(!verify_domain(
            "monkeytactics-calculators.pages.dev.example.com".into()
        ));
    }
}
