import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const siteRoot = path.resolve(import.meta.dirname, "..");
const modulePath = path.join(siteRoot, "assets", "js", "tools", "password-generator", "password-generator.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`;
const { generatePassword } = await import(moduleUrl);
const analyticsPath = path.join(siteRoot, "assets", "js", "tools", "password-generator", "credential-analytics.js");
const analyticsSource = fs.readFileSync(analyticsPath, "utf8");
const analyticsUrl = `data:text/javascript;base64,${Buffer.from(analyticsSource).toString("base64")}`;
const { analyzeCredential } = await import(analyticsUrl);

test("password generator supports passwords up to 2,048 characters", () => {
  const password = generatePassword({
    length: 2048,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
    minDigits: 10,
    minSymbols: 10
  });

  assert.equal(password.length, 2048);
  assert.match(password, /\d/);
  assert.match(password, /[^A-Za-z0-9]/);
});

test("password length remains capped at 2,048 characters", () => {
  const password = generatePassword({ length: 4096, uppercase: true });
  assert.equal(password.length, 2048);
});

test("password generator preserves optional prefix and suffix within the requested length", () => {
  const password = generatePassword({
    length: 64,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
    beginsWith: "START-",
    endsWith: "-END"
  });

  assert.equal(password.length, 64);
  assert.ok(password.startsWith("START-"));
  assert.ok(password.endsWith("-END"));
});

test("password generator control exposes the 2,048-character maximum", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");
  assert.match(html, /id="lengthSlider" min="4" max="2048"/);
  assert.match(html, /id="lengthInput" type="number" min="4" max="2048"/);
  assert.match(html, /lengthInput\.addEventListener\('input'/);
  assert.match(html, /lengthSlider\.value = String\(normalized\)/);
  assert.match(html, /password-generator\.js\?v=20260810-2/);
  assert.match(html, /id="passwordEndsWith"[^>]*placeholder="Optional suffix"/);
  assert.match(html, /endsWith: passwordEndsWith\.value/);
});

test("password generator publishes capability-aligned SEO metadata and content", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /<title>Secure Password Generator, Passphrases &amp; QR Codes<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/monkeytactics\.com\/tools\/password-generator"/);
  assert.match(html, /property="og:site_name"\s+content="MonkeyTactics"/);
  assert.match(html, /name="twitter:card"\s+content="summary"/);
  assert.match(html, /"@type": "WebApplication"/);
  assert.match(html, /"Batch generation of up to 100 passwords"/);
  assert.match(html, /"dateModified": "2026-08-11"/);
  assert.match(html, /aria-label="Password generator guide"/);
  assert.match(html, /aria-label="Password generator capabilities"/);
  assert.doesNotMatch(html, /up to 30 passwords/i);
});

test("credential analytics reports character distribution and Shannon entropy", () => {
  const analysis = analyzeCredential("aaBB11!!é");

  assert.equal(analysis.length, 9);
  assert.equal(analysis.uniqueCharacters, 5);
  assert.deepEqual(analysis.distribution, {
    lowercase: 2,
    uppercase: 2,
    digits: 2,
    symbols: 2,
    unicode: 1
  });
  assert.ok(analysis.observedEntropy > 2 && analysis.observedEntropy < 3);
  assert.ok(analysis.theoreticalEntropy > 6);
});

test("credential analytics includes diagnostics, attack estimates, collisions, and heatmap data", () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?";
  const analysis = analyzeCredential(alphabet.repeat(10));

  assert.equal(analysis.diagnostics.chiSquare.status, "pass");
  assert.ok(Number.isFinite(analysis.diagnostics.monobit.pValue));
  assert.ok(Number.isFinite(analysis.diagnostics.runs.pValue));
  assert.ok(analysis.diagnostics.indexOfCoincidence.value > 0);
  assert.equal(
    analysis.bruteForce.estimates[0].log10Years - analysis.bruteForce.estimates[1].log10Years,
    6
  );
  assert.equal(analysis.collision.sampleSize, 1_000_000_000);
  assert.ok(analysis.collision.log10Probability < 0);
  assert.equal(analysis.heatmap.length, 256);
  assert.deepEqual(new Set(analysis.heatmap.map((cell) => cell.type)), new Set([
    "lowercase", "uppercase", "digits", "symbols"
  ]));
});

test("analytics modal renders premium randomness and attack-resistance panels", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /credential-analytics\.js\?v=20260811-1/);
  assert.match(html, /id="chiSquareStatus"/);
  assert.match(html, /id="runsStatus"/);
  assert.match(html, /id="monobitStatus"/);
  assert.match(html, /id="coincidenceStatus"/);
  assert.match(html, /id="bruteForceTrillion"/);
  assert.match(html, /id="collisionProbability"/);
  assert.match(html, /id="characterHeatmap"/);
  for (const page of [1, 2, 3]) assert.match(html, new RegExp(`data-analytics-page="${page}"`));
  assert.match(html, /id="analyticsPagePrevious"/);
  assert.match(html, /id="analyticsPageNext"/);
  assert.match(html, /Page 1 of 3/);
  assert.match(html, /function selectAnalyticsPage\(pageNumber\)/);
  assert.match(html, /selectAnalyticsPage\(1\)/);
  assert.match(html, /one password proves its generator is random|not a certification of randomness/i);
});

test("password QR previews use the Rust WASM engine and responsive DPI modal", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /assets\/wasm\/qr-code-generator\/qr_engine\.js/);
  assert.match(html, /assets\/wasm\/qr-code-generator\/qr_engine_bg\.wasm/);
  assert.match(html, /wasm\.generate_qr/);
  assert.match(html, /activeQrEngine\.export_png\(dpi\)/);
  assert.match(html, /activeQrEngine\.export_svg\(\)/);
  assert.doesNotMatch(html, /qrcode-1\.1\.0\.min\.js|window\.QRCode/);
  assert.match(html, /<dialog class="qr-preview-dialog" id="qrPreviewDialog" data-dpi="300"/);
  for (const dpi of [72, 300, 600, 1200]) {
    assert.match(html, new RegExp(`data-qr-dpi="${dpi}"`));
    assert.match(html, new RegExp(`qr-preview-dialog\\[data-dpi="${dpi}"\\]`));
  }
  assert.match(html, /id="qrPreviewDownloadSvg"/);
  assert.match(html, /id="qrPreviewPrint"/);
  assert.match(html, /document\.body\.classList\.add\('print-qr-code'\)/);
});

test("password TXT and print output omit unnecessary content", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /`\$\{'-'\.repeat\(numberWidth\)\}  \$\{'-'\.repeat\('Password'\.length\)\}`/);
  assert.match(html, /body\.print-passwords \.review-collector/);
  assert.match(html, /body\.print-passwords \.password-app-title/);
});

test("multi-password printing provides pagination and QR layout options", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /id="passwordPrintDialog"/);
  assert.match(html, /id="passwordsPerPage" type="number" min="1" max="30"/);
  assert.match(html, /id="passwordsPerPageSlider" type="range" min="1" max="30"/);
  assert.match(html, /id="printPasswordQrCodes" type="checkbox"/);
  assert.match(html, /id="printQrSeparatePages" type="checkbox"/);
  assert.match(html, /id="printQrDpi"/);
  for (const dpi of [72, 300, 600, 1200]) assert.match(html, new RegExp(`<option value="${dpi}"`));
  assert.match(html, /entries\.length > 1/);
  assert.match(html, /entries\.slice\(offset, offset \+ perPage\)/);
  assert.match(html, /generateQrWithWasm\(wasm, entry\.password\)/);
  assert.match(html, /wasm\.export_png\(dpi\)/);
  assert.match(html, /includeQr && separateQrPages/);
  assert.match(html, /className = 'password-print-page qr-only-page'/);
  assert.match(html, /body\.print-passwords #passwordPrintLayout/);
  assert.doesNotMatch(html, /Rust\/WASM/);
});

test("multi-password actions support checkbox selection and Select All", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /selector\.name = 'passwordSelection'/);
  assert.match(html, /id="passwordQuantity" min="1" max="100"/);
  assert.match(html, /Generate between 1 and 100 passwords at once\./);
  assert.match(html, /id="passwordSelectAll" type="checkbox"/);
  assert.match(html, /const PASSWORDS_PER_TABLE_PAGE = 10/);
  assert.match(html, /id="passwordTablePagination"[^>]*aria-label="Generated password pages"/);
  assert.match(html, /id="passwordPagePrevious"/);
  assert.match(html, /id="passwordPageNext"/);
  assert.match(html, /generatedPasswords\.length \/ PASSWORDS_PER_TABLE_PAGE/);
  assert.match(html, /renderPasswordTablePage\(\)/);
  assert.match(html, /selectedPasswordIndexes = multiple \? new Set\(\) : new Set\(\[0\]\)/);
  assert.match(html, /selectedCount === generatedPasswords\.length/);
  assert.match(html, /qrPasswordBtn\.disabled = multiple/);
  assert.match(html, /qrPasswordBtn\.disabled = selectedCount !== 1/);
  assert.match(html, /viewPasswordsBtn\.disabled = selectedCount !== 1/);
  assert.match(html, /#viewPasswordsBtn:disabled,[\s\S]*#qrPasswordBtn:disabled \{ cursor: not-allowed; \}/);
  assert.match(html, /getText: selectedPasswordsForQr/);
  assert.match(html, /passwordEntriesForActions\(\)/);
  assert.match(html, /openPasswordPrintOptions\(entries\)/);
  assert.match(html, /id="credentialViewTab"[^>]*role="tab"/);
  assert.match(html, /id="credentialQrTab"[^>]*role="tab"/);
  assert.match(html, /id="credentialAnalyticsTab"[^>]*role="tab"/);
  assert.match(html, /id="credentialViewPanel" role="tabpanel"/);
  assert.match(html, /id="credentialQrPanel" role="tabpanel"/);
  assert.match(html, /id="credentialAnalyticsPanel" role="tabpanel"/);
  assert.match(html, /renderCredentialAnalytics\(text\)/);
  assert.match(html, /single sample cannot prove randomness/);
  assert.match(html, /id="credentialViewCopy"/);
  assert.match(html, /wireCopyButton\(credentialViewCopy, passwordViewContent\)/);
  assert.doesNotMatch(html, /id="passwordViewDialog"/);
});

test("password table truncates only its screen value after 16 characters", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /password\.slice\(0, 16\)/);
  assert.match(html, /className = 'password-screen-value'/);
  assert.match(html, /className = 'password-print-value'/);
  assert.match(html, /body\.print-passwords \.password-screen-value \{ display: none; \}/);
  assert.match(html, /body\.print-passwords \.password-print-value \{ display: inline; \}/);
});
