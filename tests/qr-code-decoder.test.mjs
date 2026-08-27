import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const siteRoot = path.resolve(import.meta.dirname, "..");
const decoderHtml = fs.readFileSync(path.join(siteRoot, "tools", "qr-code-decoder.html"), "utf8");
const toolsSitemap = fs.readFileSync(path.join(siteRoot, "sitemap-tools.xml"), "utf8");
const rustSource = fs.readFileSync(path.join(siteRoot, "wasm", "qr-code-decoder-engine", "src", "lib.rs"), "utf8");
const fixture = path.join(siteRoot, "tests", "fixtures", "qr-code-decoder", "peter-schiff-stylized.png");
const upscaledFixture = path.join(siteRoot, "tests", "fixtures", "qr-code-decoder", "peter-schiff-stylized-upscaled.jpg");
const barcodeFixture = path.join(siteRoot, "tests", "fixtures", "qr-code-decoder", "code-128.png");

test("QR decoder ships the Rust and ZXing WASM pipeline", () => {
  assert.match(decoderHtml, /decode_qr as decodeQrWithRust/);
  assert.match(decoderHtml, /normalize_qr_candidate as normalizeQrCandidate/);
  assert.match(decoderHtml, /native-barcode-detector/);
  assert.match(decoderHtml, /zxing-cpp-wasm/);
  assert.doesNotMatch(decoderHtml, /window\.jsQR|jsQR 1\.4\.0/);
  assert.equal((decoderHtml.match(/20260813-2/g) || []).length, 4, "every decoder dependency should use the current cache version");

  for (const relative of [
    "assets/wasm/qr-code-decoder/qr_decoder_engine.js",
    "assets/wasm/qr-code-decoder/qr_decoder_engine_bg.wasm",
    "assets/wasm/qr-code-decoder/zxing/reader.js",
    "assets/wasm/qr-code-decoder/zxing/zxing_reader.wasm",
  ]) {
    assert.ok(fs.statSync(path.join(siteRoot, relative)).size > 0, `${relative} must be built`);
  }
});

test("QR decoder ships a current, self-hosted HEIC conversion fallback", () => {
  assert.match(decoderHtml, /assets\/js\/vendor\/heic-to-1\.5\.2\.js/);
  assert.match(decoderHtml, /const HeicTo = await loadHeicTo\(\)/);
  assert.match(decoderHtml, /await HeicTo\(\{ blob, type: toType, quality: 1 \}\)/);
  assert.doesNotMatch(decoderHtml, /<script src="\/assets\/js\/vendor\/heic-to-1\.5\.2\.js"><\/script>/);
  assert.doesNotMatch(decoderHtml, /heic2any/);
  assert.ok(fs.statSync(path.join(siteRoot, "assets", "js", "vendor", "heic-to-1.5.2.js")).size > 0);
});

test("QR decoder hides developer diagnostics and exposes decoded QR details", () => {
  assert.match(decoderHtml, /id="debugPanel" class="decoder-debug-panel" hidden/);
  assert.match(decoderHtml, /id="decodedDetails" class="decoded-details"/);
  assert.match(decoderHtml, /id="decodedDetailsSelector"/);
  assert.match(decoderHtml, /Decoded Details — Code/);
  assert.match(decoderHtml, /data-result-index/);
  assert.match(decoderHtml, /QR version/);
  assert.match(decoderHtml, /Encoding mode/);
  assert.match(decoderHtml, /Error correction/);
  assert.match(decoderHtml, /Finder pattern centers/);
  assert.match(decoderHtml, /Quiet zone/);
  assert.match(decoderHtml, /Module count/);
  assert.match(decoderHtml, /Symbol contrast/);
  assert.match(decoderHtml, /Payload bytes/);
  assert.match(decoderHtml, /Orientation/);
  assert.match(decoderHtml, /Mirrored \/ inverted/);
  assert.match(decoderHtml, /ECI encoding/);
  assert.match(decoderHtml, /Structured append/);
  assert.match(decoderHtml, /function assessSymbolContrast\(result, pixels, moduleCount\)/);
  assert.match(decoderHtml, /luminance separation/);
  assert.match(decoderHtml, /sourceDimensions/);
  assert.match(decoderHtml, /canvasDimensions/);
  assert.match(decoderHtml, /durationMs/);
  assert.match(decoderHtml, /passes: rustResult\.attempts/);
  assert.match(decoderHtml, /minimumMarginModules >= 3\.5/);
  assert.match(decoderHtml, /Borderline — ≈/);
  assert.doesNotMatch(decoderHtml, /Fail — less than 4 modules at image edge/);
});

test("decoder defers optional work and exposes consistent technical SEO metadata", () => {
  assert.doesNotMatch(decoderHtml, /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/jszip/);
  assert.match(decoderHtml, /if \(tab\.id === 'examples-tab'\) ensureExampleGallery\(\)/);
  assert.doesNotMatch(decoderHtml, /updateScanModeUi\(\);\s*initializeExampleGallery\(\);/);
  assert.match(decoderHtml, /property="og:image"/);
  assert.match(decoderHtml, /name="twitter:card" content="summary"/);
  assert.match(decoderHtml, /https:\/\/monkeytactics\.com\/tools\/#utilities/);
  assert.match(toolsSitemap, /<loc>https:\/\/monkeytactics\.com\/tools\/qr-code-decoder<\/loc>\s*<lastmod>2026-08-27<\/lastmod>/);
});

test("decoder exposes automatic, QR-only, and barcode-only modes with camera guides", () => {
  assert.match(decoderHtml, /name="scanMode" value="qr" checked/);
  assert.match(decoderHtml, /name="scanMode" value="qr"/);
  assert.match(decoderHtml, /name="scanMode" value="barcode"/);
  assert.match(decoderHtml, /camera-guide-square/);
  assert.match(decoderHtml, /camera-guide-bar/);
  assert.match(decoderHtml, /Keep up to 10 QR codes visible inside the square/);
  assert.match(decoderHtml, /Align up to 10 barcodes across the horizontal guide/);
  assert.ok(fs.statSync(barcodeFixture).size > 0);
});

test("decoder presents visible code-type radios and a two-column supported-formats table", () => {
  assert.match(decoderHtml, /\.scan-mode-option input \{ width:1rem; height:1rem;/);
  assert.doesNotMatch(decoderHtml, /\.scan-mode-option input \{ position:absolute;/);
  assert.match(decoderHtml, /id="supported-formats-heading">What QR and barcode formats are supported\?/);
  assert.match(decoderHtml, /<th scope="col">QR Codes<\/th><th scope="col">Barcodes<\/th>/);
  assert.match(decoderHtml, /Rectangular Micro QR Code \(rMQR\)/);
  assert.match(decoderHtml, /<span>Code 128<\/span>/);
  assert.match(decoderHtml, /<span>Data Matrix<\/span>/);
});

test("decoder includes a comprehensive QR scan troubleshooting guide", () => {
  assert.match(decoderHtml, /id="qr-troubleshooting-heading">Why your QR code won’t scan/);
  for (const topic of [
    'Low contrast',
    'Missing quiet zone',
    'Blurry or low-resolution image',
    'Overly large logo',
    'Damaged finder patterns',
    'Excessive rotation or perspective',
  ]) {
    assert.match(decoderHtml, new RegExp(topic));
  }
  assert.equal((decoderHtml.match(/class="troubleshooting-card"/g) || []).length, 6);
});

test("decoder presents structured fields for common QR content types", () => {
  assert.match(decoderHtml, /id="structuredResults"/);
  assert.match(decoderHtml, /function parseQrContent\(rawValue\)/);
  assert.match(decoderHtml, /type: 'WiFi'/);
  assert.match(decoderHtml, /type: 'vCard'/);
  assert.match(decoderHtml, /type: 'MeCard'/);
  assert.match(decoderHtml, /type: 'Calendar event'/);
  assert.match(decoderHtml, /type: 'Email'/);
  assert.match(decoderHtml, /type: 'Phone'/);
  assert.match(decoderHtml, /type: 'SMS'/);
  assert.match(decoderHtml, /renderStructuredResults\(normalized\)/);
});

test("decoder lists supported QR content for visitors and search engines", () => {
  assert.match(decoderHtml, /id="supported-content-heading">What QR code content can this decoder read\?/);
  for (const type of ['URL', 'Text', 'Email', 'Phone', 'SMS', 'WiFi', 'vCard', 'MeCard', 'Calendar events', 'Other formats']) {
    assert.match(decoderHtml, new RegExp(`<strong>${type}<\\/strong>`));
  }
});

test("decoder explains its five-stage local decoding pipeline", () => {
  assert.match(decoderHtml, /id="how-decoder-works-heading">How QR code decoding works/);
  for (const stage of ['Canvas extraction', 'Finder pattern detection', 'Module grid reconstruction', 'Error-correction decoding', 'Data segment parsing']) {
    assert.match(decoderHtml, new RegExp(`<h3>${stage}<\\/h3>`));
  }
  assert.equal((decoderHtml.match(/class="decoder-pipeline-step"/g) || []).length, 5);
  assert.match(decoderHtml, /MonkeyTactics uses its own Rust and ZXing WebAssembly pipeline/);
});

test("decoder clearly exposes camera scanning and every input method to search engines", () => {
  assert.match(decoderHtml, /id="camera-scanner-heading">Scan QR codes using your camera/);
  assert.match(decoderHtml, /webcam QR code scanner/);
  assert.match(decoderHtml, /browser-based QR scanner/);
  assert.match(decoderHtml, /id="input-methods-heading">Supported input methods/);
  for (const method of ['Upload an image', 'Drag and drop', 'Paste an image', 'Image URL', 'Camera or webcam']) {
    assert.match(decoderHtml, new RegExp(`<strong>${method}<\\/strong>`));
  }
  assert.match(decoderHtml, /aria-label="Scan QR codes and barcodes using your camera"/);
});

test("mobile and camera privacy FAQs match visible content and FAQ schema", () => {
  for (const question of ['Does the QR scanner work on mobile devices?', 'Is browser camera scanning private?']) {
    assert.equal((decoderHtml.match(new RegExp(question.replace(/[?]/g, '\\\?'), 'g')) || []).length, 2);
  }
});

test("decoder exposes examples as a fifth input mode", () => {
  assert.match(decoderHtml, /id="examples-tab"[\s\S]*aria-controls="examples-panel"/);
  assert.match(decoderHtml, /id="examples-panel" class="method-panel" role="tabpanel"/);
  assert.equal((decoderHtml.match(/class="method-tab"/g) || []).length, 5);
  for (const example of ['url', 'text', 'wifi', 'vcard', 'calendar', 'multi', 'damaged', 'low-contrast']) {
    assert.match(decoderHtml, new RegExp(`data-example="${example}"`));
  }
  assert.equal((decoderHtml.match(/class="example-card"/g) || []).length, 8);
  assert.match(decoderHtml, /function buildMultiQrExample\(\)/);
  assert.match(decoderHtml, /function buildDamagedExample\(\)/);
});

test("example QR destinations are stable first-party pages", () => {
  for (const slug of ['url', 'text', 'wifi', 'vcard', 'calendar', 'multi', 'damaged', 'low-contrast']) {
    const examplePage = path.join(siteRoot, 'examples', 'qr', slug, 'index.html');
    assert.ok(fs.statSync(examplePage).size > 0, `${slug} example page should exist`);
    assert.match(fs.readFileSync(examplePage, 'utf8'), /Return to the QR Code Decoder/);
  }
});

test("supported-format table includes a generated sample for every decoder format", () => {
  const sampleReferences = [...decoderHtml.matchAll(/src="(\/assets\/images\/qr-code-decoder\/samples\/[^"]+\.svg)"/g)];
  assert.equal(sampleReferences.length, 20);
  for (const [, webPath] of sampleReferences) {
    const filePath = path.join(siteRoot, ...webPath.slice(1).split("/"));
    assert.ok(fs.statSync(filePath).size > 0, `${webPath} should be a non-empty sample image`);
  }
  assert.equal((decoderHtml.match(/loading="lazy" decoding="async"/g) || []).length, 20);
});

test("decoded type precedes the preview and another image can replace the result", () => {
  const resultTypePosition = decoderHtml.indexOf('id="resultType"');
  const resultPreviewPosition = decoderHtml.indexOf('id="resultPreview"');
  assert.ok(resultTypePosition > 0 && resultTypePosition < resultPreviewPosition);
  assert.match(decoderHtml, /<span class="result-label">Type<\/span><strong id="resultFormat"/);
  assert.match(decoderHtml, /id="uploadAnotherButton"[^>]*>Upload another image<\/button>/);
  assert.match(decoderHtml, /function openFilePicker\(\) \{\s*elements\.file\.value = '';\s*elements\.file\.click\(\);/);
  assert.match(decoderHtml, /const selectedFile = elements\.file\.files\[0\];\s*elements\.file\.value = '';\s*decodeBlob\(selectedFile\);/);
});

test("history groups up to ten decoded codes into one scan entry", () => {
  assert.match(decoderHtml, /const MAX_DECODED_RESULTS = 10;/);
  assert.match(decoderHtml, /function recordDecodedBatchForHistory\(results, sourceImageUrl\)[\s\S]*codes: normalized\.map/);
  assert.match(decoderHtml, /type\.textContent = `\$\{codeCount\} code/);
  assert.match(decoderHtml, /record\.codes\.forEach\(\(code, codeIndex\) =>/);
  assert.match(decoderHtml, /dataset\.codeIndex = String\(codeIndex\)/);
  assert.match(decoderHtml, /HISTORY_EXPORT_JSON_VERSION = '2'/);
  assert.doesNotMatch(decoderHtml, /const historyIds = recordDecodedBatchForHistory/);
  assert.match(decoderHtml, /elements\.historyList\.hidden = !hasItems;\s*elements\.historyList\.replaceChildren\(\);\s*if \(!hasItems\)/);
});

test("decoder merges equivalent native and ZXing format names so rich metadata survives", () => {
  assert.match(decoderHtml, /const key = `\$\{formatLabel\(format\)\}::\$\{text\}`/);
  assert.match(decoderHtml, /formatLabel\(result\.format\)/);
});

test("multi-code history bypasses proxy checks and exposes per-code URL menus", () => {
  const batchHistorySource = decoderHtml.match(/function recordDecodedBatchForHistory\(results, sourceImageUrl\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.match(batchHistorySource, /Final destination not checked/);
  assert.doesNotMatch(batchHistorySource, /resolveFinalUrl/);
  assert.match(decoderHtml, /dataset\.action = 'history-url-menu'/);
  assert.match(decoderHtml, /aria-label', `URL actions for code \$\{codeIndex \+ 1\}`/);
  assert.match(decoderHtml, /if \(action === 'history-url-menu'\)/);
  assert.match(decoderHtml, /showUrlActions\(code\.payload\)/);
  assert.match(decoderHtml, /urlMenuButton\.title = isSafeWebUrl\(code\.payload\) \? code\.payload/);
  assert.match(decoderHtml, /elements\.urlActionsHeading\.textContent = url/);
});

test("history migrates legacy single-code records to the grouped code model", () => {
  assert.match(decoderHtml, /const rawCodes = Array\.isArray\(raw\.codes\) && raw\.codes\.length \? raw\.codes : \[legacyCode\]/);
  assert.match(decoderHtml, /updateHistoryCode\(target\.id, target\.codeIndex/);
  assert.match(decoderHtml, /ensureQrCodeImage\(entry, codeIndex\)/);
});

test("image uploads display a modal decode progress bar", () => {
  assert.match(decoderHtml, /id="decodeProgressDialog" class="decode-progress-dialog"/);
  assert.match(decoderHtml, /<progress id="decodeProgressBar"[^>]*max="100" value="0"/);
  assert.match(decoderHtml, /async function openDecodeProgress\(\)/);
  assert.match(decoderHtml, /await openDecodeProgress\(\);[\s\S]*finally \{\s*closeDecodeProgress\(\);/);
  assert.match(decoderHtml, /Scanning for QR codes and barcodes/);
  assert.match(decoderHtml, /decodeProgressDialog\.addEventListener\('cancel', \(event\) => event\.preventDefault\(\)\)/);
});

test("clipboard paste accepts Windows Photos HEIC file entries", () => {
  assert.match(decoderHtml, /function imageBlobFromClipboard\(clipboardData\)/);
  assert.match(decoderHtml, /Array\.from\(clipboardData\.files \|\| \[\]\)/);
  assert.match(decoderHtml, /item\.kind !== 'file'/);
  assert.match(decoderHtml, /if \(isLikelyImageBlob\(file\)\) return file/);
  assert.match(decoderHtml, /const clipboardImage = imageBlobFromClipboard\(event\.clipboardData\)/);
  assert.match(decoderHtml, /decodeBlob\(clipboardImage\)/);
});

test("decoded web links display a safe header-only redirect trace", () => {
  assert.match(decoderHtml, /id="redirectTrace" class="redirect-trace" hidden/);
  assert.match(decoderHtml, /id="redirectTraceSummary"/);
  assert.match(decoderHtml, /id="redirectTraceList"/);
  assert.match(decoderHtml, /function renderRedirectTrace\(payload\)/);
  assert.match(decoderHtml, /redirects.*requests.*total/);
  assert.match(decoderHtml, /show each redirect hop, HTTP status, timing, and final destination/);
  assert.match(decoderHtml, /does not send the QR image, read page content, or automatically open/);
});

test("URL results use a text-only action table with per-row menus", () => {
  assert.match(decoderHtml, /\.url-result-text \{[^}]*text-align:left;/);
  assert.match(decoderHtml, /<th scope="row">Decoded URL<\/th><td id="decodedUrlText"/);
  assert.match(decoderHtml, /<th scope="row">Final URL<\/th><td id="finalUrlText"/);
  assert.equal((decoderHtml.match(/class="url-menu-button"/g) || []).length, 2);
  assert.match(decoderHtml, /title="Copy URL 2 Clipboard">Copy<\/button>/);
  assert.match(decoderHtml, /title="Open URL in default browser">Open<\/button>/);
  assert.match(decoderHtml, /title="Check Link Safely via VirusTotal Website">Check Link<\/button>/);
  assert.doesNotMatch(decoderHtml, /elements\.decodedUrlText\.appendChild/);
  assert.doesNotMatch(decoderHtml, /elements\.finalUrlText\.appendChild/);
});

test("decoded image opens copy and download actions and bottom buttons have the requested order", () => {
  assert.match(decoderHtml, /id="resultPreview"[^>]*role="button"[^>]*aria-label="Open image actions"/);
  assert.match(decoderHtml, /id="imageCopyButton"[^>]*>Copy<\/button>/);
  assert.match(decoderHtml, /id="imagePngButton"[^>]*>Save PNG<\/button>/);
  assert.match(decoderHtml, /id="imageSvgButton"[^>]*>Save SVG<\/button>/);
  assert.match(decoderHtml, /new ClipboardItem\(\{ 'image\/png': blob \}\)/);
  assert.match(decoderHtml, /embeddedImageSvg\(resultImageUrl\)/);
  assert.match(decoderHtml, /function dataUrlToBlob\(dataUrl\)/);
  assert.match(decoderHtml, /function savePngImage\(\)/);
  assert.match(decoderHtml, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(decoderHtml, /navigator\.share\(\{ files: \[file\], title: 'Decoded QR or barcode image' \}\)/);
  assert.match(decoderHtml, /URL\.createObjectURL\(blob\)/);
  assert.match(decoderHtml, /imagePngButton\.addEventListener\('click', savePngImage\)/);
  assert.match(decoderHtml, /id="uploadAnotherButton"[\s\S]*id="clearButton"[\s\S]*id="copyButton"/);
});

test("action dialogs use compact option pills and top-right close controls", () => {
  assert.match(decoderHtml, /\.action-dialog-options button \{ width:auto; min-width:0;/);
  assert.match(decoderHtml, /\.action-dialog-close \{ position:absolute; top:\.7rem; right:\.7rem;/);
  assert.match(decoderHtml, /id="urlActionsCloseButton"[^>]*aria-label="Close URL actions"[^>]*>×<\/button>/);
  assert.match(decoderHtml, /id="imageActionsCloseButton"[^>]*aria-label="Close image actions"[^>]*>×<\/button>/);
  assert.doesNotMatch(decoderHtml, /id="(?:url|image)ActionsCloseButton"[^>]*>Cancel<\/button>/);
});

test("bottom Copy is hidden for URL results and restored for other decoded content", () => {
  assert.match(decoderHtml, /\.result-actions button\[hidden\] \{ display:none; \}/);
  assert.match(decoderHtml, /if \(containsUrl\) \{[\s\S]*elements\.copyButton\.hidden = true;/);
  assert.match(decoderHtml, /\} else \{[\s\S]*elements\.copyButton\.hidden = false;/);
  assert.match(decoderHtml, /function clearAll\(\)[\s\S]*elements\.copyButton\.hidden = false;/);
});

test("stylized QR regression fixture is wired into module-grid normalization", () => {
  assert.ok(fs.statSync(fixture).size > 0);
  assert.ok(fs.statSync(upscaledFixture).size > 0);
  assert.match(rustSource, /normalizes_the_stylized_regression_fixture/);
  assert.match(rustSource, /scales_normalization_for_the_upscaled_jpeg_fixture/);
  assert.match(rustSource, /peter-schiff-stylized\.png/);
  assert.match(rustSource, /normalize_qr_candidate/);
});
