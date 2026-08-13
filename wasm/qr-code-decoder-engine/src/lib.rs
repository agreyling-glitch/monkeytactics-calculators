use serde::Serialize;
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DecodeAttempt {
    name: String,
    width: u32,
    height: u32,
    detected_grids: usize,
    decoded: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DecodeResult {
    text: Option<String>,
    engine: Option<&'static str>,
    pass: Option<String>,
    attempts: Vec<DecodeAttempt>,
    error: Option<String>,
}

#[derive(Clone)]
struct GrayImage {
    width: u32,
    height: u32,
    pixels: Vec<u8>,
}

impl GrayImage {
    fn from_rgba(rgba: &[u8], width: u32, height: u32) -> Result<Self, String> {
        let expected = width as usize * height as usize * 4;
        if width == 0 || height == 0 || rgba.len() != expected {
            return Err("The pixel buffer dimensions are invalid.".into());
        }

        let pixels = rgba
            .chunks_exact(4)
            .map(|pixel| {
                let alpha = pixel[3] as u32;
                let red = (pixel[0] as u32 * alpha + 255 * (255 - alpha)) / 255;
                let green = (pixel[1] as u32 * alpha + 255 * (255 - alpha)) / 255;
                let blue = (pixel[2] as u32 * alpha + 255 * (255 - alpha)) / 255;
                ((red * 77 + green * 150 + blue * 29) >> 8) as u8
            })
            .collect();

        Ok(Self {
            width,
            height,
            pixels,
        })
    }

    fn padded(&self) -> Self {
        let border = (self.width.min(self.height) / 16).clamp(12, 96);
        let width = self.width + border * 2;
        let height = self.height + border * 2;
        let mut pixels = vec![255; width as usize * height as usize];
        for y in 0..self.height {
            let source = y as usize * self.width as usize;
            let target = (y + border) as usize * width as usize + border as usize;
            pixels[target..target + self.width as usize]
                .copy_from_slice(&self.pixels[source..source + self.width as usize]);
        }
        Self {
            width,
            height,
            pixels,
        }
    }

    fn stretched(&self) -> Self {
        let mut histogram = [0_u32; 256];
        for &value in &self.pixels {
            histogram[value as usize] += 1;
        }
        let cutoff = (self.pixels.len() as u32 / 100).max(1);
        let mut accumulated = 0;
        let low = histogram
            .iter()
            .position(|count| {
                accumulated += count;
                accumulated >= cutoff
            })
            .unwrap_or(0) as u8;
        accumulated = 0;
        let high = histogram
            .iter()
            .rposition(|count| {
                accumulated += count;
                accumulated >= cutoff
            })
            .unwrap_or(255) as u8;
        let range = high.saturating_sub(low).max(1) as u16;
        let pixels = self
            .pixels
            .iter()
            .map(|&value| {
                if value <= low {
                    0
                } else if value >= high {
                    255
                } else {
                    ((value - low) as u16 * 255 / range) as u8
                }
            })
            .collect();
        Self {
            width: self.width,
            height: self.height,
            pixels,
        }
    }

    fn thresholded(&self, threshold: u8) -> Self {
        let pixels = self
            .pixels
            .iter()
            .map(|&value| if value < threshold { 0 } else { 255 })
            .collect();
        Self {
            width: self.width,
            height: self.height,
            pixels,
        }
    }

    fn box_blur(&self) -> Self {
        let mut pixels = vec![255; self.pixels.len()];
        for y in 0..self.height {
            for x in 0..self.width {
                let mut total = 0_u32;
                let mut count = 0_u32;
                for offset_y in -1_i32..=1 {
                    for offset_x in -1_i32..=1 {
                        let sample_x = x as i32 + offset_x;
                        let sample_y = y as i32 + offset_y;
                        if sample_x >= 0
                            && sample_y >= 0
                            && sample_x < self.width as i32
                            && sample_y < self.height as i32
                        {
                            total += self.pixels
                                [sample_y as usize * self.width as usize + sample_x as usize]
                                as u32;
                            count += 1;
                        }
                    }
                }
                pixels[y as usize * self.width as usize + x as usize] = (total / count) as u8;
            }
        }
        Self {
            width: self.width,
            height: self.height,
            pixels,
        }
    }

    fn resized(&self, numerator: u32, denominator: u32) -> Self {
        let width = (self.width * numerator / denominator).max(1);
        let height = (self.height * numerator / denominator).max(1);
        let mut pixels = vec![255; width as usize * height as usize];
        for y in 0..height {
            let source_y = (y as u64 * self.height as u64 / height as u64) as u32;
            for x in 0..width {
                let source_x = (x as u64 * self.width as u64 / width as u64) as u32;
                pixels[y as usize * width as usize + x as usize] =
                    self.pixels[source_y as usize * self.width as usize + source_x as usize];
            }
        }
        Self {
            width,
            height,
            pixels,
        }
    }

    fn dark_bounds(&self) -> Option<(u32, u32, u32)> {
        let mut min_x = self.width;
        let mut min_y = self.height;
        let mut max_x = 0;
        let mut max_y = 0;
        let mut found = false;
        for y in 0..self.height {
            for x in 0..self.width {
                if self.pixels[y as usize * self.width as usize + x as usize] < 128 {
                    min_x = min_x.min(x);
                    min_y = min_y.min(y);
                    max_x = max_x.max(x);
                    max_y = max_y.max(y);
                    found = true;
                }
            }
        }
        found.then(|| (min_x, min_y, (max_x - min_x + 1).max(max_y - min_y + 1)))
    }

    fn normalized_grid(&self, dimension: u32, left: u32, top: u32, span: u32) -> Self {
        let quiet = 4_u32;
        let scale = 8_u32;
        let output_width = (dimension + quiet * 2) * scale;
        let mut pixels = vec![255; output_width as usize * output_width as usize];
        let module = span as f64 / dimension as f64;
        let radius = (module * 0.18).max(1.0) as i32;

        for module_y in 0..dimension {
            for module_x in 0..dimension {
                let center_x = left as f64 + (module_x as f64 + 0.5) * module;
                let center_y = top as f64 + (module_y as f64 + 0.5) * module;
                let mut total = 0_u32;
                let mut count = 0_u32;
                for y in (center_y as i32 - radius)..=(center_y as i32 + radius) {
                    for x in (center_x as i32 - radius)..=(center_x as i32 + radius) {
                        if x >= 0 && y >= 0 && x < self.width as i32 && y < self.height as i32 {
                            total +=
                                self.pixels[y as usize * self.width as usize + x as usize] as u32;
                            count += 1;
                        }
                    }
                }
                if count > 0 && total / count < 128 {
                    let start_x = (module_x + quiet) * scale;
                    let start_y = (module_y + quiet) * scale;
                    for y in start_y..start_y + scale {
                        for x in start_x..start_x + scale {
                            pixels[y as usize * output_width as usize + x as usize] = 0;
                        }
                    }
                }
            }
        }
        Self {
            width: output_width,
            height: output_width,
            pixels,
        }
    }
}

fn try_decode(image: &GrayImage) -> (usize, Option<String>) {
    let mut prepared = rqrr::PreparedImage::prepare_from_greyscale(
        image.width as usize,
        image.height as usize,
        |x, y| image.pixels[y * image.width as usize + x],
    );
    let grids = prepared.detect_grids();
    let count = grids.len();
    let decoded = grids
        .into_iter()
        .find_map(|grid| grid.decode().ok().map(|(_, text)| text));
    (count, decoded)
}

/// Runs the Rust decoder against the original image and, when requested,
/// a bounded sequence of deterministic preprocessing passes.
#[wasm_bindgen]
pub fn decode_qr(rgba: &[u8], width: u32, height: u32, enhanced: bool) -> JsValue {
    let original = match GrayImage::from_rgba(rgba, width, height) {
        Ok(image) => image,
        Err(error) => {
            return serde_wasm_bindgen::to_value(&DecodeResult {
                text: None,
                engine: None,
                pass: None,
                attempts: Vec::new(),
                error: Some(error),
            })
            .unwrap_or(JsValue::NULL);
        }
    };

    let stretched = original.stretched();
    let passes: Vec<(&'static str, GrayImage)> = if enhanced {
        vec![
            ("original", original.clone()),
            ("quiet-zone", stretched.padded()),
            ("contrast-stretch", stretched),
            ("threshold-112", original.thresholded(112)),
            ("threshold-144", original.thresholded(144)),
            ("soften", original.box_blur()),
            ("downscale-75", original.resized(3, 4)),
            ("downscale-50", original.resized(1, 2)),
        ]
    } else {
        vec![("original", original.clone())]
    };

    let mut attempts = Vec::with_capacity(passes.len());
    for (name, image) in passes {
        let (detected_grids, decoded) = try_decode(&image);
        attempts.push(DecodeAttempt {
            name: name.into(),
            width: image.width,
            height: image.height,
            detected_grids,
            decoded: decoded.is_some(),
        });
        if let Some(text) = decoded {
            return serde_wasm_bindgen::to_value(&DecodeResult {
                text: Some(text),
                engine: Some("rust-rqrr-wasm"),
                pass: Some(name.into()),
                attempts,
                error: None,
            })
            .unwrap_or(JsValue::NULL);
        }
    }

    serde_wasm_bindgen::to_value(&DecodeResult {
        text: None,
        engine: None,
        pass: None,
        attempts,
        error: None,
    })
    .unwrap_or(JsValue::NULL)
}

/// Reconstructs a conventional square QR bitmap by sampling module centers.
/// This pass is consumed by the ZXing fallback for heavily stylized QR art.
#[wasm_bindgen]
pub fn normalize_qr_candidate(
    rgba: &[u8],
    width: u32,
    height: u32,
    dimension: u32,
    shrink: u32,
) -> Vec<u8> {
    if !(21..=57).contains(&dimension) || !(dimension - 21).is_multiple_of(4) {
        return Vec::new();
    }
    let Ok(original) = GrayImage::from_rgba(rgba, width, height) else {
        return Vec::new();
    };
    let Some((min_x, min_y, dark_span)) = original.dark_bounds() else {
        return Vec::new();
    };
    let module_size = dark_span as f64 / dimension as f64;
    let origin_correction = (module_size * 0.16).ceil() as u32;
    let normalized = original.normalized_grid(
        dimension,
        min_x.saturating_sub(origin_correction),
        min_y.saturating_sub(origin_correction),
        dark_span.saturating_sub(shrink),
    );
    normalized
        .pixels
        .into_iter()
        .flat_map(|value| [value, value, value, 255])
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_mismatched_pixel_buffers() {
        assert!(GrayImage::from_rgba(&[0, 0, 0, 255], 2, 2).is_err());
    }

    #[test]
    fn preprocessing_dimensions_are_deterministic() {
        let image = GrayImage::from_rgba(&vec![255; 40 * 20 * 4], 40, 20).unwrap();
        let padded = image.padded();
        assert_eq!((padded.width, padded.height), (64, 44));
        let resized = image.resized(3, 4);
        assert_eq!((resized.width, resized.height), (30, 15));
    }

    #[test]
    fn normalizes_the_stylized_regression_fixture() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tests/fixtures/qr-code-decoder/peter-schiff-stylized.png"
        );
        let source = image::open(path).unwrap().to_rgba8();
        let original =
            GrayImage::from_rgba(source.as_raw(), source.width(), source.height()).unwrap();
        let (min_x, min_y, dark_span) = original.dark_bounds().unwrap();
        let normalized = original.normalized_grid(
            29,
            min_x.saturating_sub(3),
            min_y.saturating_sub(3),
            dark_span - 1,
        );
        assert_eq!((normalized.width, normalized.height), (296, 296));
        assert_eq!(
            normalized
                .pixels
                .iter()
                .filter(|&&value| value == 0)
                .count(),
            434 * 64
        );
    }

    #[test]
    fn scales_normalization_for_the_upscaled_jpeg_fixture() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../tests/fixtures/qr-code-decoder/peter-schiff-stylized-upscaled.jpg"
        );
        let source = image::open(path).unwrap().to_rgba8();
        let original =
            GrayImage::from_rgba(source.as_raw(), source.width(), source.height()).unwrap();
        let (min_x, min_y, dark_span) = original.dark_bounds().unwrap();
        let module_size = dark_span as f64 / 29.0;
        let origin_correction = (module_size * 0.16).ceil() as u32;
        let normalized = original.normalized_grid(
            29,
            min_x.saturating_sub(origin_correction),
            min_y.saturating_sub(origin_correction),
            dark_span - 1,
        );
        assert_eq!(origin_correction, 8);
        assert_eq!((normalized.width, normalized.height), (296, 296));
        assert_eq!(
            normalized
                .pixels
                .iter()
                .filter(|&&value| value == 0)
                .count(),
            438 * 64
        );
    }
}
