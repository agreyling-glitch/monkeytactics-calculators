use std::cell::RefCell;

use wasm_bindgen::prelude::*;

mod qr_engine;

use qr_engine::{BatchRequest, GenerateRequest, QrRender, StyleOptions};

thread_local! {
    static LAST_RENDER: RefCell<Option<QrRender>> = const { RefCell::new(None) };
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

/// Encodes content into a QR matrix, applies styling, and returns preview data.
#[wasm_bindgen]
pub fn generate_qr(data: JsValue) -> JsValue {
    let request: GenerateRequest = match serde_wasm_bindgen::from_value(data) {
        Ok(request) => request,
        Err(error) => return qr_engine::error_value(format!("Invalid QR request: {error}")),
    };
    match QrRender::generate(request) {
        Ok(render) => {
            let output = render.output();
            LAST_RENDER.with(|state| *state.borrow_mut() = Some(render));
            serde_wasm_bindgen::to_value(&output).unwrap_or(JsValue::NULL)
        }
        Err(error) => qr_engine::error_value(error),
    }
}

/// Re-applies colors, module shapes, eyes, logo rules, and effects to the active QR.
#[wasm_bindgen]
pub fn style_qr(options: JsValue) -> JsValue {
    let options: StyleOptions = match serde_wasm_bindgen::from_value(options) {
        Ok(options) => options,
        Err(error) => return qr_engine::error_value(format!("Invalid style options: {error}")),
    };
    LAST_RENDER.with(|state| {
        let mut state = state.borrow_mut();
        let Some(render) = state.as_mut() else {
            return qr_engine::error_value("Generate a QR code before styling it".into());
        };
        render.apply_style(options);
        serde_wasm_bindgen::to_value(&render.output()).unwrap_or(JsValue::NULL)
    })
}

/// Renders the active QR as a high-DPI PNG and returns its bytes.
#[wasm_bindgen]
pub fn export_png(dpi: u32) -> Vec<u8> {
    LAST_RENDER.with(|state| {
        state
            .borrow()
            .as_ref()
            .and_then(|render| render.png(dpi).ok())
            .unwrap_or_default()
    })
}

/// Returns the active styled QR as scalable SVG markup.
#[wasm_bindgen]
pub fn export_svg() -> String {
    LAST_RENDER.with(|state| {
        state
            .borrow()
            .as_ref()
            .map(QrRender::svg)
            .unwrap_or_default()
    })
}

/// Returns a vector PDF containing the active QR code.
#[wasm_bindgen]
pub fn export_pdf() -> Vec<u8> {
    LAST_RENDER.with(|state| {
        state
            .borrow()
            .as_ref()
            .map(QrRender::pdf)
            .unwrap_or_default()
    })
}

/// Generates multiple QR codes in one WASM call for CSV-driven batch export.
#[wasm_bindgen]
pub fn batch_generate(list: JsValue) -> JsValue {
    let request: BatchRequest = match serde_wasm_bindgen::from_value(list) {
        Ok(request) => request,
        Err(error) => return qr_engine::error_value(format!("Invalid batch request: {error}")),
    };
    match qr_engine::generate_batch(request) {
        Ok(output) => serde_wasm_bindgen::to_value(&output).unwrap_or(JsValue::NULL),
        Err(error) => qr_engine::error_value(error),
    }
}
