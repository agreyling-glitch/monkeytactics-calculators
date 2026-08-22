import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const siteRoot = path.resolve(import.meta.dirname, "..");
const decoderHtml = fs.readFileSync(path.join(siteRoot, "tools", "qr-code-decoder.html"), "utf8");
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
  assert.match(decoderHtml, /window\.HeicTo\(\{ blob, type: toType, quality: 1 \}\)/);
  assert.doesNotMatch(decoderHtml, /heic2any/);
  assert.ok(fs.statSync(path.join(siteRoot, "assets", "js", "vendor", "heic-to-1.5.2.js")).size > 0);
});

test("QR decoder exposes optional local diagnostics", () => {
  assert.match(decoderHtml, /id="debugToggle"/);
  assert.match(decoderHtml, /sourceDimensions/);
  assert.match(decoderHtml, /canvasDimensions/);
  assert.match(decoderHtml, /durationMs/);
  assert.match(decoderHtml, /passes: rustResult\.attempts/);
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
