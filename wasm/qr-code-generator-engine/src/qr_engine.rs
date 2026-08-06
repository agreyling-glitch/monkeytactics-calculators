use std::fmt::Write as _;
use std::io::Cursor;

use base64::Engine as _;
use image::{DynamicImage, ImageFormat, Rgba, RgbaImage, imageops};
use qrcodegen::{QrCode, QrCodeEcc};
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsValue;

const QUIET_ZONE: i32 = 4;

#[derive(Debug, Clone, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct GenerateRequest {
    pub data: String,
    pub ecc: String,
    pub style: StyleOptions,
}

impl Default for GenerateRequest {
    fn default() -> Self {
        Self {
            data: String::new(),
            ecc: "medium".into(),
            style: StyleOptions::default(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct StyleOptions {
    pub foreground: String,
    pub background: String,
    pub gradient_type: String,
    pub gradient_start: String,
    pub gradient_end: String,
    pub gradient_colors: Vec<String>,
    pub gradient_pattern: String,
    pub gradient_target: String,
    pub eye_gradient_mode: String,
    pub module_shape: String,
    pub module_scale: f32,
    pub pattern_preset: String,
    pub eye_shape: String,
    pub eye_outer_color: String,
    pub eye_inner_color: String,
    pub logo_mode: String,
    pub logo_data_url: String,
    pub logo_size: f32,
    pub logo_padding: f32,
    pub logo_background_shape: String,
    pub logo_auto_contrast: bool,
    pub logo_white_border: bool,
    pub logo_safe_mode: bool,
    pub frame: FrameOptions,
    pub drop_shadow: bool,
    pub glow: bool,
    pub noise: bool,
    pub texture: bool,
    pub artistic: bool,
    pub transparent: bool,
}

impl Default for StyleOptions {
    fn default() -> Self {
        Self {
            foreground: "#111827".into(),
            background: "#ffffff".into(),
            gradient_type: "none".into(),
            gradient_start: "#16a34a".into(),
            gradient_end: "#0f766e".into(),
            gradient_colors: vec!["#22c55e".into(), "#0f766e".into()],
            gradient_pattern: "none".into(),
            gradient_target: "data".into(),
            eye_gradient_mode: "none".into(),
            module_shape: "square".into(),
            module_scale: 1.0,
            pattern_preset: "classic".into(),
            eye_shape: "square".into(),
            eye_outer_color: "#111827".into(),
            eye_inner_color: "#111827".into(),
            logo_mode: "none".into(),
            logo_data_url: String::new(),
            logo_size: 0.18,
            logo_padding: 0.12,
            logo_background_shape: "rounded".into(),
            logo_auto_contrast: true,
            logo_white_border: true,
            logo_safe_mode: true,
            frame: FrameOptions::default(),
            drop_shadow: false,
            glow: false,
            noise: false,
            texture: false,
            artistic: false,
            transparent: false,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct FrameGradientOptions {
    pub enabled: bool,
    pub r#type: String,
    pub direction: String,
    pub stops: Vec<String>,
}

impl Default for FrameGradientOptions {
    fn default() -> Self {
        Self {
            enabled: false,
            r#type: "linear".into(),
            direction: "top-bottom".into(),
            stops: vec!["#111827".into(), "#16a34a".into()],
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct FrameOptions {
    pub enabled: bool,
    pub style: String,
    pub thickness: f32,
    pub color: String,
    pub gradient: FrameGradientOptions,
    pub corner_radius: f32,
    pub padding: f32,
    pub text: String,
    pub text_font: String,
    pub text_weight: String,
    pub text_color: String,
    pub text_size: f32,
    pub auto_contrast: bool,
    pub pattern: String,
    pub pattern_opacity: f32,
    pub preset: Option<String>,
}

impl Default for FrameOptions {
    fn default() -> Self {
        Self {
            enabled: false,
            style: "rounded-rectangle".into(),
            thickness: 0.08,
            color: "#000000".into(),
            gradient: FrameGradientOptions::default(),
            corner_radius: 0.25,
            padding: 0.12,
            text: "SCAN ME".into(),
            text_font: "Segoe UI".into(),
            text_weight: "bold".into(),
            text_color: "#FFFFFF".into(),
            text_size: 18.0,
            auto_contrast: true,
            pattern: "none".into(),
            pattern_opacity: 0.2,
            preset: None,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QrOutput {
    pub module_count: i32,
    pub modules: Vec<u8>,
    pub svg: String,
    pub reliability_score: u8,
    pub reliability_label: String,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct BatchRequest {
    pub items: Vec<BatchItem>,
    pub ecc: String,
    pub style: StyleOptions,
}

impl Default for BatchRequest {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            ecc: "medium".into(),
            style: StyleOptions::default(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(default)]
pub struct BatchItem {
    pub name: String,
    pub data: String,
}

impl Default for BatchItem {
    fn default() -> Self {
        Self {
            name: "qrcode".into(),
            data: String::new(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchOutput {
    pub items: Vec<BatchResult>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResult {
    pub name: String,
    pub svg: String,
    pub reliability_score: u8,
}

#[derive(Debug, Serialize)]
struct ErrorOutput {
    error: String,
}

pub fn error_value(error: String) -> JsValue {
    serde_wasm_bindgen::to_value(&ErrorOutput { error }).unwrap_or(JsValue::NULL)
}

pub struct QrRender {
    size: i32,
    modules: Vec<u8>,
    style: StyleOptions,
}

impl QrRender {
    pub fn generate(request: GenerateRequest) -> Result<Self, String> {
        if request.data.trim().is_empty() {
            return Err("QR content cannot be empty".into());
        }
        let ecc = match request.ecc.as_str() {
            "low" => QrCodeEcc::Low,
            "quartile" => QrCodeEcc::Quartile,
            "high" => QrCodeEcc::High,
            _ => QrCodeEcc::Medium,
        };
        let qr = QrCode::encode_text(&request.data, ecc)
            .map_err(|_| "The content is too large for one QR code".to_string())?;
        let size = qr.size();
        let mut modules = Vec::with_capacity((size * size) as usize);
        for y in 0..size {
            for x in 0..size {
                modules.push(u8::from(qr.get_module(x, y)));
            }
        }
        Ok(Self {
            size,
            modules,
            style: request.style,
        })
    }

    pub fn apply_style(&mut self, options: StyleOptions) {
        self.style = options;
    }

    pub fn output(&self) -> QrOutput {
        let (score, label, suggestions) = self.reliability();
        QrOutput {
            module_count: self.size,
            modules: self.modules.clone(),
            svg: self.svg(),
            reliability_score: score,
            reliability_label: label,
            suggestions,
        }
    }

    pub fn svg(&self) -> String {
        let total = self.size + QUIET_ZONE * 2;
        let frame_geometry = self.frame_geometry();
        let extent = frame_geometry.map_or(0.0, |geometry| geometry.extent);
        let output_total = total as f32 + extent * 2.0;
        let mut svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="-{extent:.3} -{extent:.3} {output_total:.3} {output_total:.3}" role="img" aria-label="Styled QR code">"#
        );
        svg.push_str("<defs>");
        if self.style.drop_shadow || self.style.glow {
            svg.push_str(r#"<filter id="qr-effect" x="-30%" y="-30%" width="160%" height="160%">"#);
            if self.style.drop_shadow {
                svg.push_str(r#"<feDropShadow dx="0.35" dy="0.45" stdDeviation="0.32" flood-opacity="0.32"/>"#);
            }
            if self.style.glow {
                svg.push_str(r##"<feDropShadow dx="0" dy="0" stdDeviation="0.55" flood-color="#22c55e" flood-opacity="0.6"/>"##);
            }
            svg.push_str("</filter>");
        }
        if self.style.texture {
            svg.push_str(r#"<pattern id="qr-texture" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 2L2 0" stroke="white" stroke-opacity=".13" stroke-width=".18"/></pattern>"#);
        }
        if self.style.frame.enabled {
            svg.push_str(&svg_frame_defs(&self.style.frame));
        }
        svg.push_str("</defs>");
        if !self.style.transparent {
            let _ = write!(
                svg,
                r#"<rect x="-{extent:.3}" y="-{extent:.3}" width="{output_total:.3}" height="{output_total:.3}" fill="{}"/>"#,
                escape_xml(&self.style.background)
            );
            if self.style.gradient_type != "none" && self.style.gradient_target == "quiet-zone" {
                for y in 0..total {
                    for x in 0..total {
                        if x >= QUIET_ZONE
                            && x < QUIET_ZONE + self.size
                            && y >= QUIET_ZONE
                            && y < QUIET_ZONE + self.size
                        {
                            continue;
                        }
                        let color =
                            color_to_hex(self.gradient_color(x as f32, y as f32, total as f32));
                        let _ = write!(
                            svg,
                            r#"<rect x="{x}" y="{y}" width="1" height="1" fill="{color}"/>"#
                        );
                    }
                }
            }
        }
        let effect = if self.style.drop_shadow || self.style.glow {
            r#" filter="url(#qr-effect)""#
        } else {
            ""
        };
        let _ = write!(svg, r#"<g{effect}>"#);
        let logo_box = self.logo_box();
        for y in 0..self.size {
            for x in 0..self.size {
                if !self.module(x, y)
                    || in_finder(x, y, self.size)
                    || logo_box.is_some_and(|area| area.contains(x, y))
                {
                    continue;
                }
                let shape = self.effective_shape(x, y);
                let color = color_to_hex(self.module_color(x, y));
                let _ = write!(svg, r#"<g fill="{color}">"#);
                svg.push_str(&svg_shape(
                    shape,
                    x + QUIET_ZONE,
                    y + QUIET_ZONE,
                    self.style.module_scale,
                ));
                svg.push_str("</g>");
            }
        }
        svg.push_str("</g>");
        let (eye_outer, eye_inner) = self.eye_colors();
        let eye_outer = color_to_hex(eye_outer);
        let eye_inner = color_to_hex(eye_inner);
        for (x, y) in [(0, 0), (self.size - 7, 0), (0, self.size - 7)] {
            svg.push_str(&svg_eye(
                x + QUIET_ZONE,
                y + QUIET_ZONE,
                &self.style.eye_shape,
                &eye_outer,
                &eye_inner,
            ));
        }
        if let Some(geometry) = frame_geometry {
            svg.push_str(&svg_frame(&self.style.frame, geometry));
        }
        if self.style.texture {
            let _ = write!(
                svg,
                r#"<rect width="{total}" height="{total}" fill="url(#qr-texture)" pointer-events="none"/>"#
            );
        }
        if let Some(area) = logo_box {
            let logo_x = (area.x + QUIET_ZONE) as f32;
            let logo_y = (area.y + QUIET_ZONE) as f32;
            let logo_size = area.size as f32;
            if self.style.logo_white_border {
                svg.push_str(&svg_logo_shape(
                    logo_x - 1.0,
                    logo_y - 1.0,
                    logo_size + 2.0,
                    &self.style.logo_background_shape,
                    "#ffffff",
                ));
            }
            if self.style.logo_auto_contrast && self.style.logo_mode != "text" {
                svg.push_str(&svg_logo_shape(
                    logo_x,
                    logo_y,
                    logo_size,
                    &self.style.logo_background_shape,
                    self.logo_backdrop(),
                ));
            }
            if !self.style.logo_data_url.is_empty() {
                let padding = logo_size * self.style.logo_padding.clamp(0.0, 0.25);
                let image_size = logo_size - padding * 2.0;
                let _ = write!(
                    svg,
                    r#"<image href="{}" x="{:.3}" y="{:.3}" width="{image_size:.3}" height="{image_size:.3}" preserveAspectRatio="xMidYMid meet"/>"#,
                    escape_xml(&self.style.logo_data_url),
                    logo_x + padding,
                    logo_y + padding,
                );
            }
        }
        svg.push_str("</svg>");
        svg
    }

    pub fn png(&self, dpi: u32) -> Result<Vec<u8>, String> {
        let dpi = dpi.clamp(72, 1200);
        let total_modules = (self.size + QUIET_ZONE * 2) as u32;
        let frame_geometry = self.frame_geometry();
        let extent = frame_geometry.map_or(0, |geometry| geometry.extent as u32);
        let output_modules = total_modules + extent * 2;
        let requested = (512u64 * dpi as u64 / 72).clamp(256, 8192) as u32;
        let scale = (requested / output_modules).max(1);
        let base_pixels = total_modules * scale;
        let background = if self.style.transparent {
            Rgba([0, 0, 0, 0])
        } else {
            parse_color(&self.style.background)
        };
        let mut qr_image = RgbaImage::from_pixel(base_pixels, base_pixels, background);
        if !self.style.transparent
            && self.style.gradient_type != "none"
            && self.style.gradient_target == "quiet-zone"
        {
            for y in 0..total_modules {
                for x in 0..total_modules {
                    let data_start = QUIET_ZONE as u32;
                    let data_end = data_start + self.size as u32;
                    if x >= data_start && x < data_end && y >= data_start && y < data_end {
                        continue;
                    }
                    draw_raster_shape(
                        &mut qr_image,
                        x * scale,
                        y * scale,
                        scale,
                        "square",
                        1.0,
                        self.gradient_color(x as f32, y as f32, total_modules as f32),
                    );
                }
            }
        }
        let logo_box = self.logo_box();

        if self.style.drop_shadow {
            let shadow = Rgba([0, 0, 0, 70]);
            let shadow_offset = (scale / 5).max(1);
            self.draw_modules(
                &mut qr_image,
                scale,
                logo_box,
                Some(shadow),
                shadow_offset,
                shadow_offset,
            );
        }
        self.draw_modules(&mut qr_image, scale, logo_box, None, 0, 0);
        if let Some(area) = logo_box {
            self.draw_logo(&mut qr_image, scale, area);
        }

        let image = if let Some(geometry) = frame_geometry {
            let pixels = output_modules * scale;
            let mut framed = RgbaImage::from_pixel(pixels, pixels, background);
            draw_raster_frame(&mut framed, &self.style.frame, geometry, scale, extent);
            imageops::overlay(
                &mut framed,
                &qr_image,
                (extent * scale).into(),
                (extent * scale).into(),
            );
            framed
        } else {
            qr_image
        };

        let mut bytes = Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(image)
            .write_to(&mut bytes, ImageFormat::Png)
            .map_err(|error| format!("PNG export failed: {error}"))?;
        Ok(bytes.into_inner())
    }

    fn draw_modules(
        &self,
        image: &mut RgbaImage,
        scale: u32,
        logo_box: Option<LogoBox>,
        override_color: Option<Rgba<u8>>,
        offset_x: u32,
        offset_y: u32,
    ) {
        for y in 0..self.size {
            for x in 0..self.size {
                if !self.module(x, y)
                    || in_finder(x, y, self.size)
                    || logo_box.is_some_and(|area| area.contains(x, y))
                {
                    continue;
                }
                let color = override_color.unwrap_or_else(|| self.module_color(x, y));
                let px = ((x + QUIET_ZONE) as u32)
                    .saturating_mul(scale)
                    .saturating_add(offset_x);
                let py = ((y + QUIET_ZONE) as u32)
                    .saturating_mul(scale)
                    .saturating_add(offset_y);
                let shape = self.effective_shape(x, y);
                draw_raster_shape(image, px, py, scale, shape, self.style.module_scale, color);
            }
        }
        let (eye_outer, eye_inner) = self.eye_colors();
        for (x, y) in [(0, 0), (self.size - 7, 0), (0, self.size - 7)] {
            let px = ((x + QUIET_ZONE) as u32)
                .saturating_mul(scale)
                .saturating_add(offset_x);
            let py = ((y + QUIET_ZONE) as u32)
                .saturating_mul(scale)
                .saturating_add(offset_y);
            draw_raster_eye(
                image,
                px,
                py,
                scale,
                &self.style.eye_shape,
                override_color.unwrap_or(eye_outer),
                eye_inner,
                override_color.is_some(),
            );
        }
    }

    fn draw_logo(&self, image: &mut RgbaImage, scale: u32, area: LogoBox) {
        let x = ((area.x + QUIET_ZONE) as u32) * scale;
        let y = ((area.y + QUIET_ZONE) as u32) * scale;
        let size = area.size as u32 * scale;
        if self.style.logo_white_border {
            let border = scale.max(2);
            draw_raster_shape(
                image,
                x.saturating_sub(border),
                y.saturating_sub(border),
                size + border * 2,
                &self.style.logo_background_shape,
                1.0,
                Rgba([255, 255, 255, 255]),
            );
        }
        if self.style.logo_auto_contrast && self.style.logo_mode != "text" {
            draw_raster_shape(
                image,
                x,
                y,
                size,
                &self.style.logo_background_shape,
                1.0,
                parse_color(self.logo_backdrop()),
            );
        }
        let Some((_, encoded)) = self.style.logo_data_url.split_once(',') else {
            return;
        };
        let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(encoded) else {
            return;
        };
        let Ok(logo) = image::load_from_memory(&bytes) else {
            return;
        };
        let padding = (size as f32 * self.style.logo_padding.clamp(0.0, 0.25)).round() as u32;
        let image_size = size.saturating_sub(padding * 2).max(1);
        let resized = logo
            .resize(image_size, image_size, imageops::FilterType::Lanczos3)
            .to_rgba8();
        let offset_x = x + padding + (image_size.saturating_sub(resized.width())) / 2;
        let offset_y = y + padding + (image_size.saturating_sub(resized.height())) / 2;
        imageops::overlay(image, &resized, offset_x.into(), offset_y.into());
    }

    pub fn pdf(&self) -> Vec<u8> {
        let page = 612.0f32;
        let base_total = (self.size + QUIET_ZONE * 2) as f32;
        let frame_geometry = self.frame_geometry();
        let extent = frame_geometry.map_or(0.0, |geometry| geometry.extent);
        let output_total = base_total + extent * 2.0;
        let scale = 520.0 / output_total;
        let origin = (page - output_total * scale) / 2.0;
        let qr_origin = origin + extent * scale;
        let foreground = parse_color(&self.style.foreground);
        let background = parse_color(&self.style.background);
        let mut content = String::new();
        if !self.style.transparent {
            let _ = writeln!(
                content,
                "{} {} {} rg 0 0 {page} {page} re f",
                background[0] as f32 / 255.0,
                background[1] as f32 / 255.0,
                background[2] as f32 / 255.0
            );
            if self.style.gradient_type != "none" && self.style.gradient_target == "quiet-zone" {
                let total_modules = self.size + QUIET_ZONE * 2;
                for y in 0..total_modules {
                    for x in 0..total_modules {
                        if x >= QUIET_ZONE
                            && x < QUIET_ZONE + self.size
                            && y >= QUIET_ZONE
                            && y < QUIET_ZONE + self.size
                        {
                            continue;
                        }
                        let px = qr_origin + x as f32 * scale;
                        let py = page - qr_origin - (y + 1) as f32 * scale;
                        draw_pdf_shape(
                            &mut content,
                            px,
                            py,
                            scale,
                            "square",
                            self.gradient_color(x as f32, y as f32, total_modules as f32),
                        );
                    }
                }
            }
        }
        let _ = writeln!(
            content,
            "{} {} {} rg",
            foreground[0] as f32 / 255.0,
            foreground[1] as f32 / 255.0,
            foreground[2] as f32 / 255.0
        );
        let pdf_logo = self.pdf_logo();
        let logo_box = if pdf_logo.is_some() {
            self.logo_box()
        } else {
            None
        };
        let module_scale = self.style.module_scale.clamp(0.45, 1.0);
        let module_size = scale * module_scale;
        let module_inset = (scale - module_size) / 2.0;
        let _ = writeln!(content, "% module-shape {}", self.style.module_shape);
        for y in 0..self.size {
            for x in 0..self.size {
                if !self.module(x, y)
                    || in_finder(x, y, self.size)
                    || logo_box.is_some_and(|area| area.contains(x, y))
                {
                    continue;
                }
                let px = qr_origin + (x + QUIET_ZONE) as f32 * scale + module_inset;
                let py = page - qr_origin - (y + QUIET_ZONE + 1) as f32 * scale + module_inset;
                draw_pdf_shape(
                    &mut content,
                    px,
                    py,
                    module_size,
                    self.effective_shape(x, y),
                    self.module_color(x, y),
                );
            }
        }
        let _ = writeln!(content, "% eye-shape {}", self.style.eye_shape);
        let (eye_outer, eye_inner) = self.eye_colors();
        for (x, y) in [(0, 0), (self.size - 7, 0), (0, self.size - 7)] {
            let px = qr_origin + (x + QUIET_ZONE) as f32 * scale;
            let py = page - qr_origin - (y + QUIET_ZONE + 7) as f32 * scale;
            draw_pdf_eye(
                &mut content,
                px,
                py,
                scale,
                &self.style.eye_shape,
                eye_outer,
                eye_inner,
            );
        }
        if let Some(geometry) = frame_geometry {
            draw_pdf_frame(
                &mut content,
                &self.style.frame,
                geometry,
                qr_origin,
                scale,
                page,
            );
        }
        if let (Some(area), Some(_)) = (logo_box, pdf_logo.as_ref()) {
            let x = qr_origin + (area.x + QUIET_ZONE) as f32 * scale;
            let y = page - qr_origin - (area.y + QUIET_ZONE + area.size) as f32 * scale;
            let size = area.size as f32 * scale;
            if self.style.logo_white_border {
                let border = scale;
                draw_pdf_shape(
                    &mut content,
                    x - border,
                    y - border,
                    size + border * 2.0,
                    &self.style.logo_background_shape,
                    Rgba([255, 255, 255, 255]),
                );
            }
            if self.style.logo_auto_contrast && self.style.logo_mode != "text" {
                draw_pdf_shape(
                    &mut content,
                    x,
                    y,
                    size,
                    &self.style.logo_background_shape,
                    parse_color(self.logo_backdrop()),
                );
            }
            let padding = size * self.style.logo_padding.clamp(0.0, 0.25);
            let image_size = size - padding * 2.0;
            let image_x = x + padding;
            let image_y = y + padding;
            let _ = writeln!(
                content,
                "q {image_size:.3} 0 0 {image_size:.3} {image_x:.3} {image_y:.3} cm /Logo Do Q"
            );
        }
        make_pdf(&content, pdf_logo.as_ref(), &self.style.frame.text_font)
    }

    fn module(&self, x: i32, y: i32) -> bool {
        self.modules[(y * self.size + x) as usize] != 0
    }

    fn effective_shape(&self, x: i32, y: i32) -> &str {
        if self.style.artistic && (x + y) % 5 == 0 {
            "diamond"
        } else if self.style.pattern_preset == "soft" {
            "circle"
        } else if self.style.pattern_preset == "tech" && (x * 3 + y) % 4 == 0 {
            "diamond"
        } else {
            &self.style.module_shape
        }
    }

    fn logo_backdrop(&self) -> &str {
        if !self.style.logo_auto_contrast {
            "#ffffff"
        } else {
            let background = parse_color(&self.style.background);
            let luminance = background[0] as u32 * 299
                + background[1] as u32 * 587
                + background[2] as u32 * 114;
            if luminance > 128_000 {
                "#ffffff"
            } else {
                "#000000"
            }
        }
    }

    fn module_color(&self, x: i32, y: i32) -> Rgba<u8> {
        let mut color = if self.style.gradient_type == "none"
            || !matches!(self.style.gradient_target.as_str(), "data" | "data-eyes")
        {
            parse_color(&self.style.foreground)
        } else {
            self.gradient_color(x as f32, y as f32, self.size as f32)
        };
        if self.style.noise {
            let delta = (((x * 17 + y * 31) % 13) - 6) as i16;
            for channel in &mut color.0[..3] {
                *channel = (*channel as i16 + delta).clamp(0, 255) as u8;
            }
        }
        color
    }

    fn gradient_color(&self, x: f32, y: f32, size: f32) -> Rgba<u8> {
        let span = (size - 1.0).max(1.0);
        let nx = (x / span).clamp(0.0, 1.0);
        let ny = (y / span).clamp(0.0, 1.0);
        let center_distance =
            (((nx - 0.5).powi(2) + (ny - 0.5).powi(2)).sqrt() / 0.7071).clamp(0.0, 1.0);
        let angle = (ny - 0.5).atan2(nx - 0.5);
        let angle_ratio = ((angle + std::f32::consts::PI) / std::f32::consts::TAU).rem_euclid(1.0);
        let mut ratio = match self.style.gradient_type.as_str() {
            "linear-lr" | "module-horizontal" => nx,
            "linear-rl" => 1.0 - nx,
            "linear-tb" | "module-vertical" => ny,
            "linear-bt" => 1.0 - ny,
            "diagonal-up" => (nx + 1.0 - ny) / 2.0,
            "radial" | "radial-center" | "module-radial" => center_distance,
            "radial-offset" => {
                ((((nx - 0.35).powi(2) + (ny - 0.35).powi(2)).sqrt()) / 0.92).clamp(0.0, 1.0)
            }
            "radial-ellipse" => (((nx - 0.5).powi(2) / 0.25 + (ny - 0.5).powi(2) / 0.1225).sqrt()
                / 1.42)
                .clamp(0.0, 1.0),
            "spotlight" => 0.25 + center_distance * 0.5,
            "conic" => angle_ratio,
            "pie" => (angle_ratio * 6.0).floor() / 5.0,
            "spiral" => (angle_ratio + center_distance * 0.72).rem_euclid(1.0),
            "logo-toward" => 1.0 - center_distance,
            "logo-away" | "logo-match" => center_distance,
            _ => (nx + ny) / 2.0,
        };
        ratio = apply_gradient_pattern(ratio, nx, ny, &self.style.gradient_pattern);
        let mut colors: Vec<Rgba<u8>> = self
            .style
            .gradient_colors
            .iter()
            .take(6)
            .map(|color| parse_color(color))
            .collect();
        if colors.len() < 2 {
            colors = vec![
                parse_color(&self.style.gradient_start),
                parse_color(&self.style.gradient_end),
            ];
        }
        let scaled = ratio.clamp(0.0, 1.0) * (colors.len() - 1) as f32;
        let index = (scaled.floor() as usize).min(colors.len() - 2);
        let mut color = mix_color(colors[index], colors[index + 1], scaled - index as f32);
        if self.style.gradient_type == "auto-contrast" {
            let background = parse_color(&self.style.background);
            for _ in 0..5 {
                if contrast_ratio(color, background) >= 4.5 {
                    break;
                }
                color = mix_color(color, Rgba([0, 0, 0, 255]), 0.18);
            }
        }
        color
    }

    fn eye_colors(&self) -> (Rgba<u8>, Rgba<u8>) {
        let normal_outer = parse_color(&self.style.eye_outer_color);
        let normal_inner = parse_color(&self.style.eye_inner_color);
        let eye_target = matches!(self.style.gradient_target.as_str(), "eyes" | "data-eyes");
        if self.style.gradient_type == "none"
            || (!eye_target && self.style.eye_gradient_mode == "none")
        {
            return (normal_outer, normal_inner);
        }
        let start = self.gradient_color(0.0, 0.0, self.size as f32);
        let end = self.gradient_color(
            self.size as f32 - 1.0,
            self.size as f32 - 1.0,
            self.size as f32,
        );
        match self.style.eye_gradient_mode.as_str() {
            "ring" => (start, normal_inner),
            "pupil" => (normal_outer, end),
            _ => (start, end),
        }
    }

    fn logo_box(&self) -> Option<LogoBox> {
        if self.style.logo_data_url.is_empty() {
            return None;
        }
        let maximum = if self.style.logo_safe_mode {
            0.20
        } else {
            0.30
        };
        let size =
            ((self.size as f32 * self.style.logo_size.clamp(0.08, maximum)).round() as i32).max(3);
        Some(LogoBox {
            x: (self.size - size) / 2,
            y: (self.size - size) / 2,
            size,
        })
    }

    fn frame_geometry(&self) -> Option<FrameGeometry> {
        if !self.style.frame.enabled {
            return None;
        }
        let base = (self.size + QUIET_ZONE * 2) as f32;
        let gap = (self.size as f32 * self.style.frame.padding.clamp(0.06, 0.12))
            .round()
            .clamp(2.0, 8.0);
        let thickness = self.size as f32 * self.style.frame.thickness.clamp(0.02, 0.15);
        let text = sanitize_frame_text(&self.style.frame.text);
        let has_label = !text.is_empty() || is_icon_frame(&self.style.frame.style);
        let font_size = (self.style.frame.text_size.clamp(10.0, 40.0) / 10.0).clamp(1.0, 4.0);
        let label_height = if has_label {
            (thickness * 2.5).max(font_size / 0.4)
        } else {
            thickness
        };
        let extent = (gap + (thickness / 2.0).max(label_height / 2.0) + 1.0).ceil();
        Some(FrameGeometry {
            base,
            gap,
            thickness,
            label_height,
            font_size,
            extent,
        })
    }

    fn pdf_logo(&self) -> Option<PdfLogo> {
        let (_, encoded) = self.style.logo_data_url.split_once(',')?;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .ok()?;
        let logo = image::load_from_memory(&bytes).ok()?;
        let resized = logo.thumbnail(256, 256).to_rgba8();
        let backdrop = parse_color(self.logo_backdrop());
        let mut canvas =
            RgbaImage::from_pixel(256, 256, Rgba([backdrop[0], backdrop[1], backdrop[2], 255]));
        let offset_x = (256 - resized.width()) / 2;
        let offset_y = (256 - resized.height()) / 2;
        imageops::overlay(&mut canvas, &resized, offset_x.into(), offset_y.into());

        let mut rgb_hex = String::with_capacity(256 * 256 * 6);
        for pixel in canvas.pixels() {
            let _ = write!(rgb_hex, "{:02X}{:02X}{:02X}", pixel[0], pixel[1], pixel[2]);
        }
        Some(PdfLogo {
            width: 256,
            height: 256,
            rgb_hex,
        })
    }

    fn reliability(&self) -> (u8, String, Vec<String>) {
        let mut score = 100i32;
        let mut suggestions = Vec::new();
        let background = parse_color(&self.style.background);
        let contrast = if self.style.gradient_type != "none"
            && matches!(self.style.gradient_target.as_str(), "data" | "data-eyes")
        {
            self.style
                .gradient_colors
                .iter()
                .map(|color| contrast_ratio(parse_color(color), background))
                .fold(f32::INFINITY, f32::min)
        } else {
            contrast_ratio(parse_color(&self.style.foreground), background)
        };
        if !self.style.transparent && contrast < 4.5 {
            score -= 32;
            suggestions.push("Increase foreground/background contrast".into());
        }
        if self.style.module_scale < 0.78 {
            score -= 18;
            suggestions.push("Increase module size variation for stronger scanning".into());
        }
        if !self.style.logo_data_url.is_empty() {
            let safe_limit = if self.style.logo_safe_mode {
                0.20
            } else {
                0.25
            };
            if self.style.logo_size > safe_limit {
                score -= 24;
                suggestions.push("Reduce the logo size or enable safe mode".into());
            } else {
                score -= 7;
            }
        }
        if self.style.artistic {
            score -= 12;
            suggestions.push("Test artistic mode on several phones before printing".into());
        }
        if self.style.noise || self.style.texture {
            score -= 5;
        }
        if matches!(
            self.style.gradient_pattern.as_str(),
            "perlin" | "fractal" | "grain" | "speckle"
        ) {
            score -= 4;
            suggestions.push("Test textured gradients at the final print size".into());
        }
        if self.style.gradient_type != "none" && self.style.gradient_target == "quiet-zone" {
            score -= 35;
            suggestions.push("Keep the quiet zone plain and lighter than every QR module".into());
        }
        if self.style.frame.enabled
            && (self.style.frame.gradient.enabled
                || self.style.frame.pattern != "none"
                || matches!(
                    self.style.frame.style.as_str(),
                    "glow" | "shadow" | "pattern-border"
                ))
        {
            score -= 3;
            suggestions.push("Scan-test decorative frames at the final export size".into());
        }
        let score = score.clamp(0, 100) as u8;
        let label = if score >= 85 {
            "Excellent"
        } else if score >= 70 {
            "Good"
        } else if score >= 50 {
            "Needs testing"
        } else {
            "High risk"
        };
        (score, label.into(), suggestions)
    }
}

pub fn generate_batch(request: BatchRequest) -> Result<BatchOutput, String> {
    if request.items.is_empty() {
        return Err("Batch list is empty".into());
    }
    if request.items.len() > 250 {
        return Err("Batch export supports up to 250 rows at a time".into());
    }
    let mut items = Vec::with_capacity(request.items.len());
    for item in request.items {
        let render = QrRender::generate(GenerateRequest {
            data: item.data,
            ecc: request.ecc.clone(),
            style: request.style.clone(),
        })?;
        let (score, _, _) = render.reliability();
        items.push(BatchResult {
            name: sanitize_name(&item.name),
            svg: render.svg(),
            reliability_score: score,
        });
    }
    Ok(BatchOutput { items })
}

#[derive(Clone, Copy)]
struct LogoBox {
    x: i32,
    y: i32,
    size: i32,
}

#[derive(Debug, Clone, Copy)]
struct FrameGeometry {
    base: f32,
    gap: f32,
    thickness: f32,
    label_height: f32,
    font_size: f32,
    extent: f32,
}

struct PdfLogo {
    width: u32,
    height: u32,
    rgb_hex: String,
}

impl LogoBox {
    fn contains(self, x: i32, y: i32) -> bool {
        x >= self.x && y >= self.y && x < self.x + self.size && y < self.y + self.size
    }
}

fn in_finder(x: i32, y: i32, size: i32) -> bool {
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)
}

fn svg_shape(shape: &str, x: i32, y: i32, scale: f32) -> String {
    let scale = scale.clamp(0.45, 1.0);
    let inset = (1.0 - scale) / 2.0;
    let x = x as f32 + inset;
    let y = y as f32 + inset;
    match shape {
        "circle" => format!(
            r#"<circle cx="{:.3}" cy="{:.3}" r="{:.3}"/>"#,
            x + scale / 2.0,
            y + scale / 2.0,
            scale / 2.0
        ),
        "rounded" => format!(
            r#"<rect x="{x:.3}" y="{y:.3}" width="{scale:.3}" height="{scale:.3}" rx="{:.3}"/>"#,
            scale * 0.32
        ),
        "squircle" => format!(
            r#"<rect x="{x:.3}" y="{y:.3}" width="{scale:.3}" height="{scale:.3}" rx="{:.3}"/>"#,
            scale * 0.42
        ),
        "concentric" => {
            let center_x = x + scale / 2.0;
            let center_y = y + scale / 2.0;
            let outer = scale / 2.0;
            let middle = scale * 0.34;
            let inner = scale * 0.20;
            format!(
                r#"<path fill-rule="evenodd" d="M{:.3} {center_y:.3}A{outer:.3} {outer:.3} 0 1 0 {:.3} {center_y:.3}A{outer:.3} {outer:.3} 0 1 0 {:.3} {center_y:.3}M{:.3} {center_y:.3}A{middle:.3} {middle:.3} 0 1 0 {:.3} {center_y:.3}A{middle:.3} {middle:.3} 0 1 0 {:.3} {center_y:.3}M{:.3} {center_y:.3}A{inner:.3} {inner:.3} 0 1 0 {:.3} {center_y:.3}A{inner:.3} {inner:.3} 0 1 0 {:.3} {center_y:.3}"/>"#,
                center_x + outer,
                center_x - outer,
                center_x + outer,
                center_x + middle,
                center_x - middle,
                center_x + middle,
                center_x + inner,
                center_x - inner,
                center_x + inner,
            )
        }
        "diamond" => format!(
            r#"<path d="M{:.3} {y:.3}L{:.3} {:.3}L{:.3} {:.3}L{x:.3} {:.3}Z"/>"#,
            x + scale / 2.0,
            x + scale,
            y + scale / 2.0,
            x + scale / 2.0,
            y + scale,
            y + scale / 2.0
        ),
        "hexagon" | "soft-diamond" | "capsule" | "octagon" | "teardrop" | "triangle-up"
        | "triangle-down" | "star-four" => {
            let points = eye_polygon(shape).expect("known module polygon");
            let coordinates = points
                .iter()
                .map(|(point_x, point_y)| {
                    format!("{:.3},{:.3}", x + point_x * scale, y + point_y * scale)
                })
                .collect::<Vec<_>>()
                .join(" ");
            format!(r#"<polygon points="{coordinates}"/>"#)
        }
        _ => format!(r#"<rect x="{x:.3}" y="{y:.3}" width="{scale:.3}" height="{scale:.3}"/>"#),
    }
}

fn svg_logo_shape(x: f32, y: f32, size: f32, shape: &str, fill: &str) -> String {
    let fill = escape_xml(fill);
    match shape {
        "circle" => format!(
            r#"<circle cx="{:.3}" cy="{:.3}" r="{:.3}" fill="{fill}"/>"#,
            x + size / 2.0,
            y + size / 2.0,
            size / 2.0
        ),
        "rounded" => format!(
            r#"<rect x="{x:.3}" y="{y:.3}" width="{size:.3}" height="{size:.3}" rx="{:.3}" fill="{fill}"/>"#,
            size * 0.2
        ),
        "squircle" => format!(
            r#"<rect x="{x:.3}" y="{y:.3}" width="{size:.3}" height="{size:.3}" rx="{:.3}" fill="{fill}"/>"#,
            size * 0.38
        ),
        _ => format!(
            r#"<rect x="{x:.3}" y="{y:.3}" width="{size:.3}" height="{size:.3}" fill="{fill}"/>"#
        ),
    }
}

fn svg_frame_defs(frame: &FrameOptions) -> String {
    let mut defs = String::new();
    if frame.gradient.enabled || frame.style == "gradient-border" {
        let stops = normalized_frame_stops(frame);
        if frame.gradient.r#type == "radial" {
            defs.push_str(r#"<radialGradient id="qr-frame-gradient" cx="50%" cy="50%" r="70%">"#);
        } else {
            let (x1, y1, x2, y2) = match frame.gradient.direction.as_str() {
                "left-right" => ("0%", "0%", "100%", "0%"),
                "diagonal" => ("0%", "0%", "100%", "100%"),
                _ => ("0%", "0%", "0%", "100%"),
            };
            let _ = write!(
                defs,
                r#"<linearGradient id="qr-frame-gradient" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">"#
            );
        }
        for (index, color) in stops.iter().enumerate() {
            let offset = if stops.len() <= 1 {
                0.0
            } else {
                index as f32 * 100.0 / (stops.len() - 1) as f32
            };
            let _ = write!(
                defs,
                r#"<stop offset="{offset:.1}%" stop-color="{}"/>"#,
                escape_xml(color)
            );
        }
        defs.push_str(if frame.gradient.r#type == "radial" {
            "</radialGradient>"
        } else {
            "</linearGradient>"
        });
    }
    if frame.pattern != "none" || frame.style == "pattern-border" {
        let opacity = frame.pattern_opacity.clamp(0.10, 0.40);
        defs.push_str(
            r#"<pattern id="qr-frame-pattern" width="2" height="2" patternUnits="userSpaceOnUse">"#,
        );
        match frame.pattern.as_str() {
            "dots" => {
                let _ = write!(
                    defs,
                    r#"<circle cx=".5" cy=".5" r=".22" fill="white" fill-opacity="{opacity:.2}"/>"#
                );
            }
            "waves" => {
                let _ = write!(
                    defs,
                    r#"<path d="M0 1 Q.5 .3 1 1 T2 1" fill="none" stroke="white" stroke-width=".22" stroke-opacity="{opacity:.2}"/>"#
                );
            }
            "mesh" | "grid" => {
                let _ = write!(
                    defs,
                    r#"<path d="M0 0H2M0 0V2" stroke="white" stroke-width=".16" stroke-opacity="{opacity:.2}"/>"#
                );
            }
            _ => {
                let _ = write!(
                    defs,
                    r#"<path d="M-.5 2L2 -.5" stroke="white" stroke-width=".3" stroke-opacity="{opacity:.2}"/>"#
                );
            }
        }
        defs.push_str("</pattern>");
    }
    if matches!(frame.style.as_str(), "glow" | "shadow") {
        defs.push_str(
            r#"<filter id="qr-frame-effect" x="-30%" y="-30%" width="160%" height="160%">"#,
        );
        if frame.style == "glow" {
            defs.push_str(r##"<feDropShadow dx="0" dy="0" stdDeviation=".7" flood-color="#22c55e" flood-opacity=".75"/>"##);
        } else {
            defs.push_str(
                r#"<feDropShadow dx=".45" dy=".55" stdDeviation=".45" flood-opacity=".4"/>"#,
            );
        }
        defs.push_str("</filter>");
    }
    defs
}

fn svg_frame(frame: &FrameOptions, geometry: FrameGeometry) -> String {
    let mut svg = String::new();
    let paint = if frame.gradient.enabled || frame.style == "gradient-border" {
        "url(#qr-frame-gradient)".to_string()
    } else {
        escape_xml(&frame.color)
    };
    let x = -geometry.gap;
    let y = -geometry.gap;
    let size = geometry.base + geometry.gap * 2.0;
    let radius = frame_radius(frame, size);
    let effect = if matches!(frame.style.as_str(), "glow" | "shadow") {
        r#" filter="url(#qr-frame-effect)""#
    } else {
        ""
    };
    if frame.style == "circle" || frame.style == "capsule" {
        let _ = write!(
            svg,
            r#"<circle cx="{:.3}" cy="{:.3}" r="{:.3}" fill="none" stroke="{paint}" stroke-width="{:.3}"{effect}/>"#,
            geometry.base / 2.0,
            geometry.base / 2.0,
            size / 2.0,
            geometry.thickness
        );
    } else {
        let _ = write!(
            svg,
            r#"<rect x="{x:.3}" y="{y:.3}" width="{size:.3}" height="{size:.3}" rx="{radius:.3}" fill="none" stroke="{paint}" stroke-width="{:.3}"{effect}/>"#,
            geometry.thickness
        );
    }
    if frame.pattern != "none" || frame.style == "pattern-border" {
        if frame.style == "circle" || frame.style == "capsule" {
            let _ = write!(
                svg,
                r##"<circle cx="{:.3}" cy="{:.3}" r="{:.3}" fill="none" stroke="url(#qr-frame-pattern)" stroke-width="{:.3}"/>"##,
                geometry.base / 2.0,
                geometry.base / 2.0,
                size / 2.0,
                geometry.thickness
            );
        } else {
            let _ = write!(
                svg,
                r##"<rect x="{x:.3}" y="{y:.3}" width="{size:.3}" height="{size:.3}" rx="{radius:.3}" fill="none" stroke="url(#qr-frame-pattern)" stroke-width="{:.3}"/>"##,
                geometry.thickness
            );
        }
    }
    let text = sanitize_frame_text(&frame.text);
    if !text.is_empty() || is_icon_frame(&frame.style) {
        let text_width = (text.chars().count() as f32 * geometry.font_size * 0.68 + 2.2)
            .clamp(5.0, geometry.base * 0.82);
        let badge_width = if is_icon_frame(&frame.style) {
            (text_width + geometry.label_height).min(geometry.base * 0.88)
        } else {
            text_width
        };
        let badge_x = (geometry.base - badge_width) / 2.0;
        let badge_y = geometry.base + geometry.gap - geometry.label_height / 2.0;
        let _ = write!(
            svg,
            r#"<rect x="{badge_x:.3}" y="{badge_y:.3}" width="{badge_width:.3}" height="{:.3}" rx="{:.3}" fill="{paint}"/>"#,
            geometry.label_height,
            geometry.label_height * 0.28
        );
        if is_icon_frame(&frame.style) {
            svg.push_str(&svg_frame_icon(
                &frame.style,
                badge_x + geometry.label_height * 0.55,
                badge_y + geometry.label_height / 2.0,
                geometry.label_height * 0.38,
                frame_text_color(frame),
            ));
        }
        if !text.is_empty() {
            let text_x = if is_icon_frame(&frame.style) {
                badge_x + geometry.label_height + (badge_width - geometry.label_height) / 2.0
            } else {
                geometry.base / 2.0
            };
            let weight = frame_font_weight(&frame.text_weight);
            let family = frame_font_family(&frame.text_font);
            let _ = write!(
                svg,
                r#"<text x="{text_x:.3}" y="{:.3}" text-anchor="middle" dominant-baseline="central" font-family="{family}" font-size="{:.3}" font-weight="{weight}" fill="{}" textLength="{:.3}" lengthAdjust="spacingAndGlyphs">{}</text>"#,
                badge_y + geometry.label_height / 2.0,
                geometry.font_size,
                escape_xml(frame_text_color(frame)),
                (badge_width
                    - if is_icon_frame(&frame.style) {
                        geometry.label_height + 0.8
                    } else {
                        1.4
                    })
                .max(1.0),
                escape_xml(&text)
            );
        }
    }
    svg
}

fn svg_frame_icon(style: &str, x: f32, y: f32, size: f32, color: &str) -> String {
    let color = escape_xml(color);
    match style {
        "arrow-left" => {
            format!(
                r#"<path d="M{:.3} {:.3}L{:.3} {:.3}L{:.3} {:.3}M{:.3} {:.3}H{:.3}" fill="none" stroke="{color}" stroke-width="{:.3}" stroke-linecap="round" stroke-linejoin="round"/>"#,
                x + size * 0.2,
                y,
                x + size * 0.65,
                y - size * 0.45,
                x + size * 0.65,
                y + size * 0.45,
                x + size * 0.2,
                y,
                x + size,
                size * 0.18
            )
        }
        "arrow-down" => {
            format!(
                r#"<path d="M{:.3} {:.3}L{:.3} {:.3}L{:.3} {:.3}M{:.3} {:.3}V{:.3}" fill="none" stroke="{color}" stroke-width="{:.3}" stroke-linecap="round" stroke-linejoin="round"/>"#,
                x,
                y + size * 0.5,
                x - size * 0.45,
                y,
                x + size * 0.45,
                y,
                x,
                y - size * 0.55,
                y + size * 0.5,
                size * 0.18
            )
        }
        "camera" => {
            format!(
                r#"<rect x="{:.3}" y="{:.3}" width="{:.3}" height="{:.3}" rx="{:.3}" fill="none" stroke="{color}" stroke-width="{:.3}"/><circle cx="{x:.3}" cy="{y:.3}" r="{:.3}" fill="none" stroke="{color}" stroke-width="{:.3}"/>"#,
                x - size * 0.65,
                y - size * 0.42,
                size * 1.3,
                size * 0.84,
                size * 0.12,
                size * 0.14,
                size * 0.24,
                size * 0.12
            )
        }
        "phone" => {
            format!(
                r#"<rect x="{:.3}" y="{:.3}" width="{:.3}" height="{:.3}" rx="{:.3}" fill="none" stroke="{color}" stroke-width="{:.3}"/><circle cx="{x:.3}" cy="{:.3}" r="{:.3}" fill="{color}"/>"#,
                x - size * 0.38,
                y - size * 0.62,
                size * 0.76,
                size * 1.24,
                size * 0.16,
                size * 0.13,
                y + size * 0.42,
                size * 0.07
            )
        }
        "tap-icon" => {
            format!(
                r#"<circle cx="{x:.3}" cy="{y:.3}" r="{:.3}" fill="none" stroke="{color}" stroke-width="{:.3}"/><circle cx="{x:.3}" cy="{y:.3}" r="{:.3}" fill="{color}"/>"#,
                size * 0.62,
                size * 0.12,
                size * 0.2
            )
        }
        _ => {
            format!(
                r#"<path d="M{:.3} {:.3}L{:.3} {:.3}L{:.3} {:.3}M{:.3} {:.3}H{:.3}" fill="none" stroke="{color}" stroke-width="{:.3}" stroke-linecap="round" stroke-linejoin="round"/>"#,
                x + size * 0.8,
                y,
                x + size * 0.35,
                y - size * 0.45,
                x + size * 0.35,
                y + size * 0.45,
                x,
                y,
                x + size * 0.8,
                size * 0.18
            )
        }
    }
}

fn svg_eye(x: i32, y: i32, shape: &str, outer: &str, inner: &str) -> String {
    let outer = escape_xml(outer);
    let inner = escape_xml(inner);
    match shape {
        "circle" => format!(
            r#"<circle cx="{}" cy="{}" r="3.5" fill="{outer}"/><circle cx="{}" cy="{}" r="2.3" fill="white"/><circle cx="{}" cy="{}" r="1.5" fill="{inner}"/>"#,
            x + 3,
            y + 3,
            x + 3,
            y + 3,
            x + 3,
            y + 3
        ),
        "rounded" => format!(
            r#"<rect x="{x}" y="{y}" width="7" height="7" rx="1.7" fill="{outer}"/><rect x="{}" y="{}" width="5" height="5" rx="1.1" fill="white"/><rect x="{}" y="{}" width="3" height="3" rx=".7" fill="{inner}"/>"#,
            x + 1,
            y + 1,
            x + 2,
            y + 2
        ),
        "leaf" => format!(
            "{}{}{}",
            svg_leaf(x as f32, y as f32, 7.0, &outer),
            svg_leaf(x as f32 + 1.0, y as f32 + 1.0, 5.0, "white"),
            svg_leaf(x as f32 + 2.0, y as f32 + 2.0, 3.0, &inner)
        ),
        "concentric" => format!(
            r#"<circle cx="{}" cy="{}" r="3.5" fill="{outer}"/><circle cx="{}" cy="{}" r="2.75" fill="white"/><circle cx="{}" cy="{}" r="2.1" fill="{outer}"/><circle cx="{}" cy="{}" r="1.65" fill="white"/><circle cx="{}" cy="{}" r="1.2" fill="{inner}"/>"#,
            x + 3,
            y + 3,
            x + 3,
            y + 3,
            x + 3,
            y + 3,
            x + 3,
            y + 3,
            x + 3,
            y + 3
        ),
        "hexagon" | "diamond" | "capsule" | "teardrop" | "star-four" | "triangle-up"
        | "triangle-down" | "honeycomb" | "pebble" | "heart" => {
            format!(
                "{}{}{}",
                svg_eye_polygon(x as f32, y as f32, 7.0, &outer, shape),
                svg_eye_polygon(x as f32 + 1.0, y as f32 + 1.0, 5.0, "white", shape),
                svg_eye_polygon(x as f32 + 2.0, y as f32 + 2.0, 3.0, &inner, shape)
            )
        }
        _ => format!(
            r#"<rect x="{x}" y="{y}" width="7" height="7" fill="{outer}"/><rect x="{}" y="{}" width="5" height="5" fill="white"/><rect x="{}" y="{}" width="3" height="3" fill="{inner}"/>"#,
            x + 1,
            y + 1,
            x + 2,
            y + 2
        ),
    }
}

fn svg_leaf(x: f32, y: f32, size: f32, fill: &str) -> String {
    let curve = size * 0.32;
    let right = x + size;
    let bottom = y + size;
    let top_curve_start = right - curve;
    let right_curve_end = y + curve;
    let bottom_curve_start = x + curve;
    let left_curve_end = bottom - curve;
    format!(
        r#"<path d="M{x:.3} {y:.3}H{top_curve_start:.3}Q{right:.3} {y:.3} {right:.3} {right_curve_end:.3}V{bottom:.3}H{bottom_curve_start:.3}Q{x:.3} {bottom:.3} {x:.3} {left_curve_end:.3}Z" fill="{fill}"/>"#
    )
}

fn svg_eye_polygon(x: f32, y: f32, size: f32, fill: &str, shape: &str) -> String {
    let Some(points) = eye_polygon(shape) else {
        return format!(
            r#"<rect x="{x:.3}" y="{y:.3}" width="{size:.3}" height="{size:.3}" fill="{fill}"/>"#
        );
    };
    let coordinates = points
        .iter()
        .map(|(px, py)| format!("{:.3},{:.3}", x + px * size, y + py * size))
        .collect::<Vec<_>>()
        .join(" ");
    format!(r#"<polygon points="{coordinates}" fill="{fill}"/>"#)
}

fn eye_polygon(shape: &str) -> Option<&'static [(f32, f32)]> {
    match shape {
        "hexagon" => Some(&[
            (0.5, 0.0),
            (1.0, 0.25),
            (1.0, 0.75),
            (0.5, 1.0),
            (0.0, 0.75),
            (0.0, 0.25),
        ]),
        "diamond" => Some(&[(0.5, 0.0), (1.0, 0.5), (0.5, 1.0), (0.0, 0.5)]),
        "soft-diamond" => Some(&[
            (0.5, 0.0),
            (0.62, 0.08),
            (0.92, 0.38),
            (1.0, 0.5),
            (0.92, 0.62),
            (0.62, 0.92),
            (0.5, 1.0),
            (0.38, 0.92),
            (0.08, 0.62),
            (0.0, 0.5),
            (0.08, 0.38),
            (0.38, 0.08),
        ]),
        "capsule" => Some(&[
            (0.16, 0.14),
            (0.84, 0.14),
            (0.96, 0.26),
            (1.0, 0.5),
            (0.96, 0.74),
            (0.84, 0.86),
            (0.16, 0.86),
            (0.04, 0.74),
            (0.0, 0.5),
            (0.04, 0.26),
        ]),
        "octagon" => Some(&[
            (0.29, 0.0),
            (0.71, 0.0),
            (1.0, 0.29),
            (1.0, 0.71),
            (0.71, 1.0),
            (0.29, 1.0),
            (0.0, 0.71),
            (0.0, 0.29),
        ]),
        "teardrop" => Some(&[
            (0.5, 0.0),
            (0.72, 0.22),
            (0.9, 0.45),
            (0.95, 0.68),
            (0.82, 0.88),
            (0.62, 1.0),
            (0.38, 1.0),
            (0.18, 0.88),
            (0.05, 0.68),
            (0.1, 0.45),
            (0.28, 0.22),
        ]),
        "star-four" => Some(&[
            (0.5, 0.0),
            (0.62, 0.38),
            (1.0, 0.5),
            (0.62, 0.62),
            (0.5, 1.0),
            (0.38, 0.62),
            (0.0, 0.5),
            (0.38, 0.38),
        ]),
        "triangle-up" => Some(&[(0.5, 0.0), (1.0, 1.0), (0.0, 1.0)]),
        "triangle-down" => Some(&[(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)]),
        "honeycomb" => Some(&[
            (0.25, 0.0),
            (0.75, 0.0),
            (1.0, 0.5),
            (0.75, 1.0),
            (0.25, 1.0),
            (0.0, 0.5),
        ]),
        "pebble" => Some(&[
            (0.22, 0.03),
            (0.66, 0.0),
            (0.93, 0.18),
            (1.0, 0.55),
            (0.86, 0.88),
            (0.53, 1.0),
            (0.16, 0.91),
            (0.0, 0.62),
            (0.05, 0.25),
        ]),
        "heart" => Some(&[
            (0.5, 1.0),
            (0.08, 0.62),
            (0.0, 0.35),
            (0.08, 0.12),
            (0.28, 0.02),
            (0.5, 0.24),
            (0.72, 0.02),
            (0.92, 0.12),
            (1.0, 0.35),
            (0.92, 0.62),
        ]),
        _ => None,
    }
}

fn draw_raster_eye(
    image: &mut RgbaImage,
    x: u32,
    y: u32,
    module_scale: u32,
    shape: &str,
    outer: Rgba<u8>,
    inner: Rgba<u8>,
    shadow_only: bool,
) {
    if shape == "concentric" {
        draw_raster_shape(image, x, y, module_scale * 7, "circle", 1.0, outer);
        if shadow_only {
            return;
        }
        draw_raster_shape(
            image,
            x + module_scale,
            y + module_scale,
            module_scale * 5,
            "circle",
            1.0,
            Rgba([255, 255, 255, 255]),
        );
        let ring_inset = module_scale * 3 / 2;
        draw_raster_shape(
            image,
            x + ring_inset,
            y + ring_inset,
            module_scale * 4,
            "circle",
            1.0,
            outer,
        );
        draw_raster_shape(
            image,
            x + module_scale * 2,
            y + module_scale * 2,
            module_scale * 3,
            "circle",
            1.0,
            Rgba([255, 255, 255, 255]),
        );
        let inset = module_scale * 5 / 2;
        draw_raster_shape(
            image,
            x + inset,
            y + inset,
            module_scale * 2,
            "circle",
            1.0,
            inner,
        );
        return;
    }
    draw_raster_shape(image, x, y, module_scale * 7, shape, 1.0, outer);
    if shadow_only {
        return;
    }
    draw_raster_shape(
        image,
        x + module_scale,
        y + module_scale,
        module_scale * 5,
        shape,
        1.0,
        Rgba([255, 255, 255, 255]),
    );
    draw_raster_shape(
        image,
        x + module_scale * 2,
        y + module_scale * 2,
        module_scale * 3,
        shape,
        1.0,
        inner,
    );
}

fn draw_pdf_eye(
    content: &mut String,
    x: f32,
    y: f32,
    module_scale: f32,
    shape: &str,
    outer: Rgba<u8>,
    inner: Rgba<u8>,
) {
    if shape == "concentric" {
        draw_pdf_shape(content, x, y, module_scale * 7.0, "circle", outer);
        draw_pdf_shape(
            content,
            x + module_scale,
            y + module_scale,
            module_scale * 5.0,
            "circle",
            Rgba([255, 255, 255, 255]),
        );
        draw_pdf_shape(
            content,
            x + module_scale * 1.5,
            y + module_scale * 1.5,
            module_scale * 4.0,
            "circle",
            outer,
        );
        draw_pdf_shape(
            content,
            x + module_scale * 2.0,
            y + module_scale * 2.0,
            module_scale * 3.0,
            "circle",
            Rgba([255, 255, 255, 255]),
        );
        draw_pdf_shape(
            content,
            x + module_scale * 2.5,
            y + module_scale * 2.5,
            module_scale * 2.0,
            "circle",
            inner,
        );
        return;
    }
    draw_pdf_shape(content, x, y, module_scale * 7.0, shape, outer);
    draw_pdf_shape(
        content,
        x + module_scale,
        y + module_scale,
        module_scale * 5.0,
        shape,
        Rgba([255, 255, 255, 255]),
    );
    draw_pdf_shape(
        content,
        x + module_scale * 2.0,
        y + module_scale * 2.0,
        module_scale * 3.0,
        shape,
        inner,
    );
}

fn draw_raster_frame(
    image: &mut RgbaImage,
    frame: &FrameOptions,
    geometry: FrameGeometry,
    scale: u32,
    extent: u32,
) {
    let x = (extent as f32 - geometry.gap) * scale as f32;
    let y = x;
    let size = (geometry.base + geometry.gap * 2.0) * scale as f32;
    let thickness = (geometry.thickness * scale as f32).max(1.0);
    let radius = frame_radius(frame, geometry.base + geometry.gap * 2.0) * scale as f32;
    let circular = matches!(frame.style.as_str(), "circle" | "capsule");
    let left = x.floor().max(0.0) as u32;
    let top = y.floor().max(0.0) as u32;
    let right = (x + size).ceil().min(image.width() as f32) as u32;
    let bottom = (y + size).ceil().min(image.height() as f32) as u32;

    for py in top..bottom {
        for px in left..right {
            let nx = (px as f32 + 0.5 - x) / size;
            let ny = (py as f32 + 0.5 - y) / size;
            let inset = thickness / size;
            let outer = if circular {
                (nx - 0.5).powi(2) + (ny - 0.5).powi(2) <= 0.25
            } else {
                rounded_pixel(nx, ny, (radius / size).clamp(0.0, 0.5))
            };
            let inner = if circular {
                (nx - 0.5).powi(2) + (ny - 0.5).powi(2) <= (0.5 - inset).max(0.0).powi(2)
            } else if inset < 0.5 {
                let ix = (nx - inset) / (1.0 - inset * 2.0);
                let iy = (ny - inset) / (1.0 - inset * 2.0);
                rounded_pixel(
                    ix,
                    iy,
                    ((radius - thickness).max(0.0) / (size - thickness * 2.0).max(1.0))
                        .clamp(0.0, 0.5),
                )
            } else {
                false
            };
            if outer && !inner {
                let mut color = frame_raster_color(frame, nx, ny);
                if frame_pattern_pixel(frame, px, py, scale) {
                    color = mix_color(
                        color,
                        Rgba([255, 255, 255, 255]),
                        frame.pattern_opacity.clamp(0.10, 0.40),
                    );
                }
                image.put_pixel(px, py, color);
            }
        }
    }

    let text = sanitize_frame_text(&frame.text);
    if text.is_empty() && !is_icon_frame(&frame.style) {
        return;
    }
    let label_height = (geometry.label_height * scale as f32).max(10.0);
    let estimated_text = text.len() as f32 * label_height * 0.48 + label_height * 0.65;
    let label_width = estimated_text.clamp(label_height * 1.4, geometry.base * scale as f32 * 0.88);
    let badge_x = (extent as f32 * scale as f32 + geometry.base * scale as f32 / 2.0
        - label_width / 2.0)
        .round() as i32;
    let badge_y = ((extent as f32 + geometry.base + geometry.gap - geometry.label_height / 2.0)
        * scale as f32)
        .round() as i32;
    fill_raster_rounded_rect(
        image,
        badge_x,
        badge_y,
        label_width.round() as u32,
        label_height.round() as u32,
        (label_height * 0.28) as f32,
        frame_raster_color(frame, 0.5, 1.0),
    );
    let text_color = parse_color(frame_text_color(frame));
    let icon_space = if is_icon_frame(&frame.style) {
        label_height * 0.75
    } else {
        0.0
    };
    if is_icon_frame(&frame.style) {
        draw_raster_frame_icon(
            image,
            &frame.style,
            badge_x + (label_height * 0.42) as i32,
            badge_y + (label_height * 0.5) as i32,
            (label_height * 0.42) as i32,
            text_color,
        );
    }
    if !text.is_empty() {
        let available = (label_width - icon_space - label_height * 0.28).max(5.0);
        let pixel_scale = ((geometry.font_size * scale as f32 / 7.0).floor() as u32).max(1);
        draw_raster_text_centered(
            image,
            &text,
            badge_x as f32 + icon_space,
            badge_y as f32,
            label_width - icon_space,
            label_height,
            available,
            pixel_scale,
            text_color,
        );
    }
}

fn frame_raster_color(frame: &FrameOptions, x: f32, y: f32) -> Rgba<u8> {
    if !frame.gradient.enabled && frame.style != "gradient-border" {
        return parse_color(&frame.color);
    }
    let ratio = if frame.gradient.r#type == "radial" {
        (((x - 0.5).powi(2) + (y - 0.5).powi(2)).sqrt() * 1.414).clamp(0.0, 1.0)
    } else {
        match frame.gradient.direction.as_str() {
            "left-right" => x,
            "diagonal" => (x + y) / 2.0,
            _ => y,
        }
    };
    let stops = normalized_frame_stops(frame);
    let position = ratio.clamp(0.0, 1.0) * (stops.len() - 1) as f32;
    let index = position.floor() as usize;
    let next = (index + 1).min(stops.len() - 1);
    mix_color(
        parse_color(&stops[index]),
        parse_color(&stops[next]),
        position - index as f32,
    )
}

fn frame_pattern_pixel(frame: &FrameOptions, x: u32, y: u32, scale: u32) -> bool {
    let pattern = if frame.style == "pattern-border" && frame.pattern == "none" {
        "stripes"
    } else {
        &frame.pattern
    };
    let unit = scale.max(2);
    match pattern {
        "dots" => (x % (unit * 2)).pow(2) + (y % (unit * 2)).pow(2) < (unit / 2).max(1).pow(2),
        "grid" | "mesh" => x % (unit * 2) == 0 || y % (unit * 2) == 0,
        "waves" => ((y / unit + x / (unit * 2)) % 3) == 0,
        "stripes" => ((x + y) / unit) % 3 == 0,
        _ => false,
    }
}

fn fill_raster_rounded_rect(
    image: &mut RgbaImage,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    radius: f32,
    color: Rgba<u8>,
) {
    for py in 0..height {
        for px in 0..width {
            let nx = (px as f32 + 0.5) / width.max(1) as f32;
            let ny = (py as f32 + 0.5) / height.max(1) as f32;
            let normalized_radius = (radius / width.min(height).max(1) as f32).clamp(0.0, 0.5);
            if rounded_pixel(nx, ny, normalized_radius) {
                put_raster_pixel(image, x + px as i32, y + py as i32, color);
            }
        }
    }
}

fn draw_raster_text_centered(
    image: &mut RgbaImage,
    text: &str,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    available: f32,
    requested_scale: u32,
    color: Rgba<u8>,
) {
    let glyph_width = text.len() as u32 * 6 - 1;
    let scale = requested_scale
        .min((available / glyph_width.max(1) as f32).floor().max(1.0) as u32)
        .min((height * 0.68 / 7.0).floor().max(1.0) as u32);
    let drawn_width = glyph_width * scale;
    let start_x = (x + (width - drawn_width as f32) / 2.0).round() as i32;
    let start_y = (y + (height - 7.0 * scale as f32) / 2.0).round() as i32;
    for (index, character) in text.chars().enumerate() {
        let rows = frame_glyph(character);
        for (row, bits) in rows.iter().enumerate() {
            for column in 0..5 {
                if bits & (1 << (4 - column)) != 0 {
                    for dy in 0..scale {
                        for dx in 0..scale {
                            put_raster_pixel(
                                image,
                                start_x + (index as u32 * 6 * scale + column * scale + dx) as i32,
                                start_y + (row as u32 * scale + dy) as i32,
                                color,
                            );
                        }
                    }
                }
            }
        }
    }
}

fn put_raster_pixel(image: &mut RgbaImage, x: i32, y: i32, color: Rgba<u8>) {
    if x >= 0 && y >= 0 && (x as u32) < image.width() && (y as u32) < image.height() {
        image.put_pixel(x as u32, y as u32, color);
    }
}

fn draw_raster_frame_icon(
    image: &mut RgbaImage,
    style: &str,
    cx: i32,
    cy: i32,
    size: i32,
    color: Rgba<u8>,
) {
    let mut points = Vec::new();
    match style {
        "arrow-down" => {
            for offset in -size..=size {
                points.push((cx + offset, cy + offset.abs() / 2));
            }
        }
        "camera" => {
            for offset in -size..=size {
                points.push((cx + offset, cy - size / 2));
                points.push((cx + offset, cy + size / 2));
            }
            for offset in -size / 2..=size / 2 {
                points.push((cx - size, cy + offset));
                points.push((cx + size, cy + offset));
            }
        }
        "phone" => {
            for offset in -size..=size {
                points.push((cx - size / 2, cy + offset));
                points.push((cx + size / 2, cy + offset));
            }
        }
        "tap-icon" => {
            for offset in -size..=size {
                if offset.abs() > size / 2 {
                    points.push((cx + offset, cy));
                    points.push((cx, cy + offset));
                }
            }
            points.push((cx, cy));
        }
        "arrow-left" => {
            for offset in -size..=size {
                points.push((cx + offset.abs() / 2, cy + offset));
                points.push((cx + offset.abs() / 2, cy));
            }
        }
        _ => {
            for offset in -size..=size {
                points.push((cx - offset.abs() / 2, cy + offset));
                points.push((cx - offset.abs() / 2, cy));
            }
        }
    }
    for (x, y) in points {
        put_raster_pixel(image, x, y, color);
    }
}

fn draw_pdf_frame(
    content: &mut String,
    frame: &FrameOptions,
    geometry: FrameGeometry,
    qr_origin: f32,
    scale: f32,
    page: f32,
) {
    let x = qr_origin - geometry.gap * scale;
    let y = page - qr_origin - (geometry.base + geometry.gap) * scale;
    let size = (geometry.base + geometry.gap * 2.0) * scale;
    let thickness = (geometry.thickness * scale).max(0.75);
    let color = frame_raster_color(frame, 0.5, 0.5);
    let _ = writeln!(content, "% frame-style {}", frame.style);
    let _ = writeln!(
        content,
        "{} {} {} RG {thickness:.3} w",
        color[0] as f32 / 255.0,
        color[1] as f32 / 255.0,
        color[2] as f32 / 255.0
    );
    if frame.pattern != "none" || frame.style == "pattern-border" {
        let dash = match frame.pattern.as_str() {
            "dots" => "[1 2] 0 d",
            "waves" => "[5 2 1 2] 0 d",
            "mesh" | "grid" => "[3 1] 0 d",
            _ => "[6 3] 0 d",
        };
        let _ = writeln!(content, "{dash}");
    }
    if matches!(frame.style.as_str(), "circle" | "capsule") {
        pdf_circle_subpath(content, x + size / 2.0, y + size / 2.0, size / 2.0);
        let _ = writeln!(content, "S");
    } else {
        let radius = frame_radius(frame, geometry.base + geometry.gap * 2.0) * scale;
        if radius > 0.0 {
            pdf_rounded_rect_path(content, x, y, size, size, radius);
            let _ = writeln!(content, "S");
        } else {
            let _ = writeln!(content, "{x:.3} {y:.3} {size:.3} {size:.3} re S");
        }
    }
    let _ = writeln!(content, "[] 0 d");

    let text = sanitize_frame_text(&frame.text);
    if text.is_empty() && !is_icon_frame(&frame.style) {
        return;
    }
    let label_height = geometry.label_height * scale;
    let text_width = (text.len() as f32 * geometry.font_size * scale * 0.58 + label_height * 0.45)
        .clamp(label_height * 1.4, geometry.base * scale * 0.88);
    let badge_width = if is_icon_frame(&frame.style) {
        (text_width + label_height * 0.7).min(geometry.base * scale * 0.88)
    } else {
        text_width
    };
    let badge_x = qr_origin + geometry.base * scale / 2.0 - badge_width / 2.0;
    let badge_y =
        page - qr_origin - (geometry.base + geometry.gap + geometry.label_height / 2.0) * scale;
    let badge_color = frame_raster_color(frame, 0.5, 1.0);
    let _ = writeln!(
        content,
        "{} {} {} rg",
        badge_color[0] as f32 / 255.0,
        badge_color[1] as f32 / 255.0,
        badge_color[2] as f32 / 255.0
    );
    pdf_rounded_rect_path(
        content,
        badge_x,
        badge_y,
        badge_width,
        label_height,
        label_height * 0.28,
    );
    let _ = writeln!(content, "f");
    let text_color = parse_color(frame_text_color(frame));
    if is_icon_frame(&frame.style) {
        draw_pdf_frame_icon(
            content,
            &frame.style,
            badge_x + label_height * 0.45,
            badge_y + label_height * 0.5,
            label_height * 0.24,
            text_color,
        );
    }
    if !text.is_empty() {
        let font_size = (geometry.font_size * scale)
            .min(label_height * 0.62)
            .max(5.0);
        let icon_offset = if is_icon_frame(&frame.style) {
            label_height * 0.35
        } else {
            0.0
        };
        let estimated = text.len() as f32 * font_size * 0.55;
        let text_x = badge_x + (badge_width - estimated) / 2.0 + icon_offset;
        let text_y = badge_y + (label_height - font_size) / 2.0 + font_size * 0.22;
        let safe_text = text
            .replace('\\', "\\\\")
            .replace('(', "\\(")
            .replace(')', "\\)");
        let _ = writeln!(
            content,
            "BT /F1 {font_size:.3} Tf {} {} {} rg {text_x:.3} {text_y:.3} Td ({safe_text}) Tj ET",
            text_color[0] as f32 / 255.0,
            text_color[1] as f32 / 255.0,
            text_color[2] as f32 / 255.0
        );
    }
}

fn draw_pdf_frame_icon(
    content: &mut String,
    style: &str,
    x: f32,
    y: f32,
    size: f32,
    color: Rgba<u8>,
) {
    let _ = writeln!(
        content,
        "{} {} {} RG {:.3} w",
        color[0] as f32 / 255.0,
        color[1] as f32 / 255.0,
        color[2] as f32 / 255.0,
        (size * 0.18).max(0.7)
    );
    match style {
        "arrow-left" => {
            let _ = writeln!(
                content,
                "{:.3} {y:.3} m {:.3} {:.3} l {:.3} {:.3} l S {:.3} {y:.3} m {:.3} {y:.3} l S",
                x - size,
                x - size * 0.35,
                y + size * 0.65,
                x - size * 0.35,
                y - size * 0.65,
                x - size,
                x + size
            );
        }
        "arrow-down" => {
            let _ = writeln!(
                content,
                "{x:.3} {:.3} m {:.3} {:.3} l {:.3} {:.3} l S {x:.3} {:.3} m {x:.3} {:.3} l S",
                y - size,
                x - size * 0.65,
                y - size * 0.35,
                x + size * 0.65,
                y - size * 0.35,
                y + size,
                y - size
            );
        }
        "camera" => {
            let _ = writeln!(
                content,
                "{:.3} {:.3} {:.3} {:.3} re S",
                x - size,
                y - size * 0.7,
                size * 2.0,
                size * 1.4
            );
            pdf_circle_subpath(content, x, y, size * 0.42);
            let _ = writeln!(content, "S");
        }
        "phone" => {
            let _ = writeln!(
                content,
                "{:.3} {:.3} {:.3} {:.3} re S",
                x - size * 0.6,
                y - size,
                size * 1.2,
                size * 2.0
            );
        }
        "tap-icon" => {
            pdf_circle_subpath(content, x, y, size * 0.75);
            let _ = writeln!(content, "S");
            pdf_circle_subpath(content, x, y, size * 0.18);
            let _ = writeln!(content, "f");
        }
        _ => {
            let _ = writeln!(
                content,
                "{:.3} {y:.3} m {:.3} {:.3} l {:.3} {:.3} l S {:.3} {y:.3} m {:.3} {y:.3} l S",
                x + size,
                x + size * 0.35,
                y + size * 0.65,
                x + size * 0.35,
                y - size * 0.65,
                x - size,
                x + size
            );
        }
    }
}

fn pdf_rounded_rect_path(
    content: &mut String,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    radius: f32,
) {
    let right = x + width;
    let top = y + height;
    let radius = radius.clamp(0.0, width.min(height) / 2.0);
    let control = radius * 0.552_284_8;
    let _ = writeln!(
        content,
        "{:.3} {y:.3} m {:.3} {y:.3} l {:.3} {y:.3} {right:.3} {:.3} {right:.3} {:.3} c {right:.3} {:.3} l {right:.3} {:.3} {:.3} {top:.3} {:.3} {top:.3} c {:.3} {top:.3} l {:.3} {top:.3} {x:.3} {:.3} {x:.3} {:.3} c {x:.3} {:.3} l {x:.3} {:.3} {:.3} {y:.3} {:.3} {y:.3} c h",
        x + radius,
        right - radius,
        right - radius + control,
        y + radius - control,
        y + radius,
        top - radius,
        top - radius + control,
        right - radius + control,
        right - radius,
        x + radius,
        x + radius - control,
        top - radius + control,
        top - radius,
        y + radius,
        y + radius - control,
        x + radius - control,
        x + radius
    );
}

fn frame_glyph(character: char) -> [u8; 7] {
    match character {
        'A' => [14, 17, 17, 31, 17, 17, 17],
        'B' => [30, 17, 17, 30, 17, 17, 30],
        'C' => [14, 17, 16, 16, 16, 17, 14],
        'D' => [30, 17, 17, 17, 17, 17, 30],
        'E' => [31, 16, 16, 30, 16, 16, 31],
        'F' => [31, 16, 16, 30, 16, 16, 16],
        'G' => [14, 17, 16, 23, 17, 17, 15],
        'H' => [17, 17, 17, 31, 17, 17, 17],
        'I' => [31, 4, 4, 4, 4, 4, 31],
        'J' => [7, 2, 2, 2, 18, 18, 12],
        'K' => [17, 18, 20, 24, 20, 18, 17],
        'L' => [16, 16, 16, 16, 16, 16, 31],
        'M' => [17, 27, 21, 21, 17, 17, 17],
        'N' => [17, 25, 21, 19, 17, 17, 17],
        'O' => [14, 17, 17, 17, 17, 17, 14],
        'P' => [30, 17, 17, 30, 16, 16, 16],
        'Q' => [14, 17, 17, 17, 21, 18, 13],
        'R' => [30, 17, 17, 30, 20, 18, 17],
        'S' => [15, 16, 16, 14, 1, 1, 30],
        'T' => [31, 4, 4, 4, 4, 4, 4],
        'U' => [17, 17, 17, 17, 17, 17, 14],
        'V' => [17, 17, 17, 17, 17, 10, 4],
        'W' => [17, 17, 17, 21, 21, 21, 10],
        'X' => [17, 17, 10, 4, 10, 17, 17],
        'Y' => [17, 17, 10, 4, 4, 4, 4],
        'Z' => [31, 1, 2, 4, 8, 16, 31],
        '0' => [14, 17, 19, 21, 25, 17, 14],
        '1' => [4, 12, 4, 4, 4, 4, 14],
        '2' => [14, 17, 1, 2, 4, 8, 31],
        '3' => [30, 1, 1, 14, 1, 1, 30],
        '4' => [2, 6, 10, 18, 31, 2, 2],
        '5' => [31, 16, 16, 30, 1, 1, 30],
        '6' => [14, 16, 16, 30, 17, 17, 14],
        '7' => [31, 1, 2, 4, 8, 8, 8],
        '8' => [14, 17, 17, 14, 17, 17, 14],
        '9' => [14, 17, 17, 15, 1, 1, 14],
        '.' => [0, 0, 0, 0, 0, 6, 6],
        '-' => [0, 0, 0, 31, 0, 0, 0],
        '_' => [0, 0, 0, 0, 0, 0, 31],
        _ => [0; 7],
    }
}

fn draw_pdf_shape(content: &mut String, x: f32, y: f32, size: f32, shape: &str, color: Rgba<u8>) {
    let _ = writeln!(
        content,
        "{} {} {} rg",
        color[0] as f32 / 255.0,
        color[1] as f32 / 255.0,
        color[2] as f32 / 255.0
    );
    if shape == "circle" {
        pdf_circle_subpath(content, x + size / 2.0, y + size / 2.0, size / 2.0);
        let _ = writeln!(content, "f");
    } else if shape == "concentric" {
        let center_x = x + size / 2.0;
        let center_y = y + size / 2.0;
        pdf_circle_subpath(content, center_x, center_y, size / 2.0);
        pdf_circle_subpath(content, center_x, center_y, size * 0.34);
        pdf_circle_subpath(content, center_x, center_y, size * 0.20);
        let _ = writeln!(content, "f*");
    } else if shape == "rounded" {
        pdf_rounded_rect(content, x, y, size, size * 0.24, false);
    } else if shape == "squircle" {
        pdf_rounded_rect(content, x, y, size, size * 0.38, false);
    } else if shape == "leaf" {
        pdf_rounded_rect(content, x, y, size, size * 0.32, true);
    } else if let Some(points) = eye_polygon(shape) {
        let mut points = points.iter();
        if let Some((first_x, first_y)) = points.next() {
            let _ = write!(
                content,
                "{:.3} {:.3} m",
                x + first_x * size,
                y + (1.0 - first_y) * size
            );
            for (point_x, point_y) in points {
                let _ = write!(
                    content,
                    " {:.3} {:.3} l",
                    x + point_x * size,
                    y + (1.0 - point_y) * size
                );
            }
            let _ = writeln!(content, " h f");
        }
    } else {
        let _ = writeln!(content, "{x:.3} {y:.3} {size:.3} {size:.3} re f");
    }
}

fn pdf_circle_subpath(content: &mut String, center_x: f32, center_y: f32, radius: f32) {
    let control = radius * 0.552_284_8;
    let _ = writeln!(
        content,
        "{:.3} {:.3} m {:.3} {:.3} {:.3} {:.3} {:.3} {:.3} c {:.3} {:.3} {:.3} {:.3} {:.3} {:.3} c {:.3} {:.3} {:.3} {:.3} {:.3} {:.3} c {:.3} {:.3} {:.3} {:.3} {:.3} {:.3} c h",
        center_x + radius,
        center_y,
        center_x + radius,
        center_y + control,
        center_x + control,
        center_y + radius,
        center_x,
        center_y + radius,
        center_x - control,
        center_y + radius,
        center_x - radius,
        center_y + control,
        center_x - radius,
        center_y,
        center_x - radius,
        center_y - control,
        center_x - control,
        center_y - radius,
        center_x,
        center_y - radius,
        center_x + control,
        center_y - radius,
        center_x + radius,
        center_y - control,
        center_x + radius,
        center_y
    );
}

fn pdf_rounded_rect(content: &mut String, x: f32, y: f32, size: f32, radius: f32, leaf: bool) {
    let right = x + size;
    let top = y + size;
    let control = radius * 0.552_284_8;
    if leaf {
        let _ = writeln!(
            content,
            "{:.3} {y:.3} m {right:.3} {y:.3} l {right:.3} {:.3} l {right:.3} {:.3} {:.3} {top:.3} {:.3} {top:.3} c {x:.3} {top:.3} l {x:.3} {:.3} l {x:.3} {:.3} {:.3} {y:.3} {:.3} {y:.3} c h f",
            x + radius,
            top - radius,
            top - radius + control,
            right - radius + control,
            right - radius,
            y + radius,
            y + radius - control,
            x + radius - control,
            x + radius
        );
        return;
    }
    let _ = writeln!(
        content,
        "{:.3} {y:.3} m {:.3} {y:.3} l {:.3} {y:.3} {right:.3} {:.3} {right:.3} {:.3} c {right:.3} {:.3} l {right:.3} {:.3} {:.3} {top:.3} {:.3} {top:.3} c {:.3} {top:.3} l {:.3} {top:.3} {x:.3} {:.3} {x:.3} {:.3} c {x:.3} {:.3} l {x:.3} {:.3} {:.3} {y:.3} {:.3} {y:.3} c h f",
        x + radius,
        right - radius,
        right - radius + control,
        y + radius - control,
        y + radius,
        top - radius,
        top - radius + control,
        right - radius + control,
        right - radius,
        x + radius,
        x + radius - control,
        top - radius + control,
        top - radius,
        y + radius,
        y + radius - control,
        x + radius - control,
        x + radius
    );
}

fn draw_raster_shape(
    image: &mut RgbaImage,
    x: u32,
    y: u32,
    scale: u32,
    shape: &str,
    module_scale: f32,
    color: Rgba<u8>,
) {
    let size = ((scale as f32 * module_scale.clamp(0.45, 1.0)).round() as u32).max(1);
    let inset = (scale - size) / 2;
    let x = x + inset;
    let y = y + inset;
    for py in 0..size {
        for px in 0..size {
            let normalized_x = (px as f32 + 0.5) / size as f32;
            let normalized_y = (py as f32 + 0.5) / size as f32;
            let draw = match shape {
                "circle" => (normalized_x - 0.5).powi(2) + (normalized_y - 0.5).powi(2) <= 0.25,
                "concentric" => {
                    let distance = (normalized_x - 0.5).powi(2) + (normalized_y - 0.5).powi(2);
                    distance <= 0.25 && (distance >= 0.34f32.powi(2) || distance <= 0.20f32.powi(2))
                }
                "diamond" => (normalized_x - 0.5).abs() + (normalized_y - 0.5).abs() <= 0.5,
                "rounded" => rounded_pixel(normalized_x, normalized_y, 0.28),
                "squircle" => {
                    ((normalized_x - 0.5).abs() * 2.0).powi(4)
                        + ((normalized_y - 0.5).abs() * 2.0).powi(4)
                        <= 1.0
                }
                "leaf" => leaf_pixel(normalized_x, normalized_y, 0.32),
                _ => eye_polygon(shape)
                    .is_none_or(|points| point_in_polygon(normalized_x, normalized_y, points)),
            };
            if draw && x + px < image.width() && y + py < image.height() {
                image.put_pixel(x + px, y + py, color);
            }
        }
    }
}

fn point_in_polygon(x: f32, y: f32, points: &[(f32, f32)]) -> bool {
    let mut inside = false;
    let mut previous = points.len().saturating_sub(1);
    for current in 0..points.len() {
        let (current_x, current_y) = points[current];
        let (previous_x, previous_y) = points[previous];
        if ((current_y > y) != (previous_y > y))
            && x < (previous_x - current_x) * (y - current_y) / (previous_y - current_y) + current_x
        {
            inside = !inside;
        }
        previous = current;
    }
    inside
}

fn leaf_pixel(x: f32, y: f32, radius: f32) -> bool {
    let outside_top_right = x > 1.0 - radius
        && y < radius
        && (x - (1.0 - radius)).powi(2) + (y - radius).powi(2) > radius.powi(2);
    let outside_bottom_left = x < radius
        && y > 1.0 - radius
        && (x - radius).powi(2) + (y - (1.0 - radius)).powi(2) > radius.powi(2);
    !outside_top_right && !outside_bottom_left
}

fn rounded_pixel(x: f32, y: f32, radius: f32) -> bool {
    let dx = (x - 0.5).abs() - (0.5 - radius);
    let dy = (y - 0.5).abs() - (0.5 - radius);
    dx.max(0.0).powi(2) + dy.max(0.0).powi(2) <= radius.powi(2)
}

fn parse_color(value: &str) -> Rgba<u8> {
    let hex = value.trim().trim_start_matches('#');
    let parse = |range| u8::from_str_radix(&hex[range], 16).unwrap_or(0);
    if hex.len() >= 6 {
        Rgba([parse(0..2), parse(2..4), parse(4..6), 255])
    } else {
        Rgba([0, 0, 0, 255])
    }
}

fn mix_color(a: Rgba<u8>, b: Rgba<u8>, ratio: f32) -> Rgba<u8> {
    let mix = |index| (a[index] as f32 * (1.0 - ratio) + b[index] as f32 * ratio).round() as u8;
    Rgba([mix(0), mix(1), mix(2), 255])
}

fn color_to_hex(color: Rgba<u8>) -> String {
    format!("#{:02x}{:02x}{:02x}", color[0], color[1], color[2])
}

fn apply_gradient_pattern(ratio: f32, x: f32, y: f32, pattern: &str) -> f32 {
    let wave = |value: f32| value.sin();
    let hash = ((x * 127.1 + y * 311.7).sin() * 43_758.547).fract().abs();
    let adjustment = match pattern {
        "perlin" => (wave(x * 11.0) + wave(y * 9.0)) * 0.035,
        "fractal" => wave(x * 9.0) * 0.035 + wave(y * 17.0) * 0.022 + wave((x + y) * 31.0) * 0.012,
        "grain" => (hash - 0.5) * 0.13,
        "speckle" => {
            if hash > 0.86 {
                0.09
            } else if hash < 0.14 {
                -0.05
            } else {
                0.0
            }
        }
        "stripes" => {
            if (((x + y) * 12.0).floor() as i32) % 2 == 0 {
                0.06
            } else {
                -0.035
            }
        }
        "dots" => {
            let dx = (x * 10.0).fract() - 0.5;
            let dy = (y * 10.0).fract() - 0.5;
            if dx * dx + dy * dy < 0.08 {
                0.08
            } else {
                -0.015
            }
        }
        "mesh" => {
            wave(x * std::f32::consts::TAU * 5.0) * wave(y * std::f32::consts::TAU * 5.0) * 0.065
        }
        "waves" => {
            wave((y + wave(x * std::f32::consts::TAU * 3.0) * 0.08) * std::f32::consts::TAU * 7.0)
                * 0.055
        }
        _ => 0.0,
    };
    (ratio + adjustment).clamp(0.0, 1.0)
}

fn luminance(color: Rgba<u8>) -> f32 {
    let channel = |value: u8| {
        let value = value as f32 / 255.0;
        if value <= 0.03928 {
            value / 12.92
        } else {
            ((value + 0.055) / 1.055).powf(2.4)
        }
    };
    0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2])
}

fn contrast_ratio(a: Rgba<u8>, b: Rgba<u8>) -> f32 {
    let (light, dark) = if luminance(a) > luminance(b) {
        (luminance(a), luminance(b))
    } else {
        (luminance(b), luminance(a))
    };
    (light + 0.05) / (dark + 0.05)
}

fn escape_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn sanitize_frame_text(value: &str) -> String {
    value
        .to_ascii_uppercase()
        .chars()
        .filter(|character| {
            character.is_ascii_uppercase()
                || character.is_ascii_digit()
                || matches!(character, ' ' | '.' | '-' | '_')
        })
        .take(12)
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn is_icon_frame(style: &str) -> bool {
    matches!(
        style,
        "arrow-left" | "arrow-right" | "arrow-down" | "camera" | "phone" | "tap-icon"
    )
}

fn normalized_frame_stops(frame: &FrameOptions) -> Vec<String> {
    let mut stops: Vec<String> = frame
        .gradient
        .stops
        .iter()
        .filter(|color| valid_hex_color(color))
        .take(6)
        .cloned()
        .collect();
    if stops.is_empty() {
        stops.push(frame.color.clone());
    }
    while stops.len() < 2 {
        stops.push(stops[0].clone());
    }
    stops
}

fn frame_radius(frame: &FrameOptions, size: f32) -> f32 {
    match frame.style.as_str() {
        "rectangle" | "outline" | "thick-border" => 0.0,
        "squircle" => size * 0.38,
        "capsule" | "circle" => size * 0.5,
        _ => (size * frame.corner_radius.clamp(0.0, 0.5)).min(size / 2.0),
    }
}

fn frame_text_color(frame: &FrameOptions) -> &str {
    if !frame.auto_contrast && valid_hex_color(&frame.text_color) {
        return &frame.text_color;
    }
    let colors = if frame.gradient.enabled || frame.style == "gradient-border" {
        normalized_frame_stops(frame)
    } else {
        vec![frame.color.clone()]
    };
    let mut black_min = f32::INFINITY;
    let mut white_min = f32::INFINITY;
    for color in colors {
        let parsed = parse_color(&color);
        black_min = black_min.min(contrast_ratio(Rgba([0, 0, 0, 255]), parsed));
        white_min = white_min.min(contrast_ratio(Rgba([255, 255, 255, 255]), parsed));
    }
    if white_min >= black_min {
        "#FFFFFF"
    } else {
        "#000000"
    }
}

fn frame_font_family(value: &str) -> &'static str {
    match value {
        "Georgia" => "Georgia,serif",
        "Courier New" => "Courier New,monospace",
        "Trebuchet MS" => "Trebuchet MS,sans-serif",
        "Impact" => "Impact,sans-serif",
        _ => "Segoe UI,sans-serif",
    }
}

fn frame_font_weight(value: &str) -> u16 {
    match value {
        "regular" => 400,
        "medium" => 500,
        "semibold" => 600,
        _ => 700,
    }
}

fn valid_hex_color(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..]
            .chars()
            .all(|character| character.is_ascii_hexdigit())
}

fn sanitize_name(value: &str) -> String {
    let name: String = value
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
        .take(80)
        .collect();
    if name.is_empty() {
        "qrcode".into()
    } else {
        name
    }
}

fn make_pdf(content: &str, logo: Option<&PdfLogo>, frame_font: &str) -> Vec<u8> {
    let logo_object_number = logo.map(|_| 5usize);
    let font_object_number = if logo.is_some() { 6usize } else { 5usize };
    let info_object_number = font_object_number + 1;
    let x_objects = logo_object_number
        .map(|number| format!("/XObject << /Logo {number} 0 R >>"))
        .unwrap_or_default();
    let resources = format!("{x_objects} /Font << /F1 {font_object_number} 0 R >>");
    let mut objects = vec![
        "<< /Type /Catalog /Pages 2 0 R >>".to_string(),
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_string(),
        format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 612] /Contents 4 0 R /Resources << {resources} >> >>"
        ),
        format!(
            "<< /Length {} >>\nstream\n{}endstream",
            content.len(),
            content
        ),
    ];
    if let Some(logo) = logo {
        let stream_length = logo.rgb_hex.len() + 1;
        objects.push(format!(
            "<< /Type /XObject /Subtype /Image /Width {} /Height {} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length {} >>\nstream\n{}>\nendstream",
            logo.width, logo.height, stream_length, logo.rgb_hex
        ));
    }
    let base_font = match frame_font {
        "Georgia" => "Times-Roman",
        "Courier New" => "Courier",
        _ => "Helvetica",
    };
    objects.push(format!(
        "<< /Type /Font /Subtype /Type1 /BaseFont /{base_font} >>"
    ));
    objects.push("<< /Producer (MonkeyTactics Rust WASM QR Engine) >>".to_string());
    let mut pdf = b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n".to_vec();
    let mut offsets = Vec::new();
    for (index, object) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        pdf.extend_from_slice(format!("{} 0 obj\n{}\nendobj\n", index + 1, object).as_bytes());
    }
    let xref = pdf.len();
    pdf.extend_from_slice(
        format!("xref\n0 {}\n0000000000 65535 f \n", objects.len() + 1).as_bytes(),
    );
    for offset in offsets {
        pdf.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R /Info {} 0 R >>\nstartxref\n{xref}\n%%EOF",
            objects.len() + 1,
            info_object_number
        )
        .as_bytes(),
    );
    pdf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_qr_svg_and_pdf() {
        let render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com".into(),
            ..Default::default()
        })
        .unwrap();
        assert!(render.size >= 21);
        assert!(render.svg().contains("<svg"));
        assert!(render.pdf().starts_with(b"%PDF-1.4"));
    }

    #[test]
    fn pdf_embeds_uploaded_logo() {
        let mut logo_bytes = Cursor::new(Vec::new());
        DynamicImage::ImageRgba8(RgbaImage::from_pixel(4, 4, Rgba([30, 220, 70, 255])))
            .write_to(&mut logo_bytes, ImageFormat::Png)
            .unwrap();
        let logo_data_url = format!(
            "data:image/png;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(logo_bytes.into_inner())
        );
        let render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com".into(),
            style: StyleOptions {
                logo_data_url,
                ..Default::default()
            },
            ..Default::default()
        })
        .unwrap();

        let pdf = render.pdf();
        let pdf_text = String::from_utf8_lossy(&pdf);
        assert!(pdf_text.contains("/Subtype /Image"));
        assert!(pdf_text.contains("/Logo Do"));
        assert!(pdf_text.contains("/XObject << /Logo 5 0 R >>"));
    }

    #[test]
    fn white_logo_border_is_independent_from_auto_contrast() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com".into(),
            ..Default::default()
        })
        .unwrap();
        render.style.logo_data_url = "data:image/png;base64,AA==".into();
        render.style.logo_auto_contrast = true;
        render.style.logo_white_border = true;
        let area = render.logo_box().unwrap();
        let border_marker = svg_logo_shape(
            (area.x + QUIET_ZONE - 1) as f32,
            (area.y + QUIET_ZONE - 1) as f32,
            (area.size + 2) as f32,
            &render.style.logo_background_shape,
            "#ffffff",
        );
        assert!(render.svg().contains(&border_marker));

        render.style.logo_white_border = false;
        assert!(!render.svg().contains(&border_marker));
    }

    #[test]
    fn styling_changes_reliability() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "hello".into(),
            ..Default::default()
        })
        .unwrap();
        let baseline = render.reliability().0;
        render.style.module_scale = 0.5;
        render.style.artistic = true;
        assert!(render.reliability().0 < baseline);
    }

    #[test]
    fn png_shadow_does_not_fill_finder_separator() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com".into(),
            ..Default::default()
        })
        .unwrap();
        render.style.drop_shadow = true;

        let png = render.png(72).unwrap();
        let image = image::load_from_memory(&png).unwrap().to_rgba8();
        let total_modules = (render.size + QUIET_ZONE * 2) as u32;
        let scale = (512 / total_modules).max(1);
        let separator_x = (QUIET_ZONE as u32 + 7) * scale + scale / 2;
        let separator_y = (QUIET_ZONE as u32 + 1) * scale + scale / 2;

        assert_eq!(
            *image.get_pixel(separator_x, separator_y),
            Rgba([255, 255, 255, 255])
        );
    }

    #[test]
    fn png_and_pdf_exports_respect_eye_shape() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com".into(),
            ..Default::default()
        })
        .unwrap();
        let total_modules = (render.size + QUIET_ZONE * 2) as u32;
        let scale = (512 / total_modules).max(1);
        let corner = QUIET_ZONE as u32 * scale;

        let square_png = image::load_from_memory(&render.png(72).unwrap())
            .unwrap()
            .to_rgba8();
        assert_ne!(
            *square_png.get_pixel(corner, corner),
            Rgba([255, 255, 255, 255])
        );

        render.style.eye_shape = "circle".into();
        let circle_png = image::load_from_memory(&render.png(72).unwrap())
            .unwrap()
            .to_rgba8();
        assert_eq!(
            *circle_png.get_pixel(corner, corner),
            Rgba([255, 255, 255, 255])
        );
        assert!(String::from_utf8_lossy(&render.pdf()).contains("% eye-shape circle"));
    }

    #[test]
    fn leaf_eye_stays_inside_its_finder_box() {
        let eye = svg_eye(24, 4, "leaf", "#111827", "#111827");
        assert!(eye.contains("M24.000 4.000"));
        assert!(eye.contains("31.000"));
        assert!(!eye.contains("H3a3"));
        assert!(!eye.contains("transform="));
    }

    #[test]
    fn decorative_eye_shapes_render_in_svg_png_and_pdf() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com/eye-shapes".into(),
            ..Default::default()
        })
        .unwrap();
        for shape in [
            "hexagon",
            "diamond",
            "capsule",
            "teardrop",
            "star-four",
            "triangle-up",
            "triangle-down",
            "honeycomb",
            "pebble",
            "concentric",
            "heart",
        ] {
            render.style.eye_shape = shape.into();
            let svg = render.svg();
            let eye = svg_eye(QUIET_ZONE, QUIET_ZONE, shape, "#111827", "#111827");
            assert!(svg.contains(&eye));
            assert!(render.png(72).unwrap().starts_with(&[137, 80, 78, 71]));
            assert!(
                String::from_utf8_lossy(&render.pdf()).contains(&format!("% eye-shape {shape}"))
            );
        }
    }

    #[test]
    fn decorative_module_shapes_render_in_svg_png_and_pdf() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com/module-shapes".into(),
            ..Default::default()
        })
        .unwrap();
        for shape in [
            "hexagon",
            "diamond",
            "soft-diamond",
            "capsule",
            "squircle",
            "octagon",
            "teardrop",
            "triangle-up",
            "triangle-down",
            "star-four",
            "concentric",
        ] {
            render.style.module_shape = shape.into();
            let svg = render.svg();
            assert_ne!(svg, "");
            if shape == "concentric" {
                assert!(svg.contains("fill-rule=\"evenodd\""));
            }
            assert!(render.png(72).unwrap().starts_with(&[137, 80, 78, 71]));
            assert!(
                String::from_utf8_lossy(&render.pdf()).contains(&format!("% module-shape {shape}"))
            );
        }
    }

    #[test]
    fn advanced_gradient_modes_render_consistently() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com/gradients".into(),
            ..Default::default()
        })
        .unwrap();
        render.style.gradient_colors = vec![
            "#facc15".into(),
            "#f97316".into(),
            "#dc2626".into(),
            "#7e22ce".into(),
        ];
        for mode in [
            "linear-lr",
            "linear-rl",
            "linear-tb",
            "linear-bt",
            "diagonal-down",
            "diagonal-up",
            "radial-center",
            "radial-offset",
            "radial-ellipse",
            "spotlight",
            "conic",
            "pie",
            "spiral",
            "module-horizontal",
            "module-vertical",
            "module-radial",
            "logo-toward",
            "logo-away",
            "logo-match",
            "auto-contrast",
        ] {
            render.style.gradient_type = mode.into();
            let _ = render.gradient_color(2.0, 7.0, render.size as f32);
        }
        render.style.gradient_type = "conic".into();
        render.style.gradient_pattern = "waves".into();
        assert!(render.svg().contains("fill=\"#"));
        assert!(render.png(72).unwrap().starts_with(&[137, 80, 78, 71]));
        assert!(render.pdf().starts_with(b"%PDF-1.4"));

        let baseline = render.reliability().0;
        render.style.gradient_target = "quiet-zone".into();
        assert!(render.reliability().0 < baseline);
    }

    #[test]
    fn frames_expand_exports_without_changing_qr_modules() {
        let mut render = QrRender::generate(GenerateRequest {
            data: "https://monkeytactics.com/frames".into(),
            ..Default::default()
        })
        .unwrap();
        let modules = render.modules.clone();
        let plain_png = image::load_from_memory(&render.png(72).unwrap()).unwrap();

        render.style.frame.enabled = true;
        render.style.frame.text = "SCAN ME".into();
        render.style.frame.gradient.enabled = true;
        render.style.frame.gradient.stops = vec!["#22C55E".into(), "#0F766E".into()];
        let svg = render.svg();
        assert!(svg.contains("qr-frame-gradient"));
        assert!(svg.contains("SCAN ME</text>"));
        assert!(svg.contains("viewBox=\"-"));

        let framed_png = image::load_from_memory(&render.png(72).unwrap()).unwrap();
        assert_ne!(framed_png.as_bytes(), plain_png.as_bytes());
        assert_eq!(render.modules, modules);

        let pdf = String::from_utf8_lossy(&render.pdf()).into_owned();
        assert!(pdf.contains("% frame-style rounded-rectangle"));
        assert!(pdf.contains("(SCAN ME) Tj"));
        assert!(pdf.contains("/Font << /F1"));
    }

    #[test]
    fn batch_names_are_sanitized() {
        assert_eq!(sanitize_name("hello world?.svg"), "helloworldsvg");
    }
}
