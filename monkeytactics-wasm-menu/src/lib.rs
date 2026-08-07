mod domain;
mod menu;
mod tools;

pub use domain::verify_domain;

use leptos::*;
use menu::Header;
use wasm_bindgen::{prelude::*, JsCast};
use web_sys::{Document, HtmlElement};

fn remove_legacy_navigation(document: &Document) {
    for selector in [
        "header.site-header",
        "body > header",
        "main > header:first-child",
        ".site-shell > header:first-child",
        ".tool-categories",
    ] {
        if let Ok(Some(element)) = document.query_selector(selector) {
            element.remove();
        }
    }
}

/// Verifies the current host and mounts the navigation into `#mt-header`.
#[wasm_bindgen]
pub fn init() {
    let Some(window) = web_sys::window() else {
        return;
    };

    let Ok(host) = window.location().hostname() else {
        return;
    };

    if !verify_domain(host) {
        return;
    }

    let Some(document) = window.document() else {
        return;
    };

    remove_legacy_navigation(&document);

    let Some(mount_element) = document.get_element_by_id("mt-header") else {
        return;
    };

    let Ok(mount_element) = mount_element.dyn_into::<HtmlElement>() else {
        return;
    };

    mount_to(mount_element, || view! { <Header/> });
}

#[wasm_bindgen(start)]
pub fn start() {
    init();
}
