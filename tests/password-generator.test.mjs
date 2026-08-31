import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { webcrypto } from "node:crypto";

const siteRoot = path.resolve(import.meta.dirname, "..");
const modulePath = path.join(siteRoot, "assets", "js", "tools", "password-generator", "password-generator.js");
const moduleSource = fs.readFileSync(modulePath, "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`;
const { generatePassword } = await import(moduleUrl);
const analyticsPath = path.join(siteRoot, "assets", "js", "tools", "password-generator", "credential-analytics.js");
const analyticsSource = fs.readFileSync(analyticsPath, "utf8");
const analyticsUrl = `data:text/javascript;base64,${Buffer.from(analyticsSource).toString("base64")}`;
const {
  analyzeCredential,
  sha1Hex,
  checkPwnedPassword,
  PWNED_RANGE_CACHE_TTL_MS,
  PWNED_RANGE_CACHE_MAX_ENTRIES
} = await import(analyticsUrl);

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
  assert.match(html, /"dateModified": "2026-08-28"/);
  assert.match(html, /aria-label="Password generator guide"/);
  assert.match(html, /aria-label="Password generator capabilities"/);
  assert.match(html, /Password Generator, Analyzer &amp; Breach Checker/);
  assert.match(html, /id="check-passwords"/);
  assert.match(html, /Check password strength and known breach exposure/);
  assert.match(html, /only the 100 most recently used replies are kept/i);
  assert.match(html, /How does the password breach check protect my password\?/);
  assert.match(html, /What password information is cached\?/);
  assert.doesNotMatch(html, /up to 30 passwords/i);

  const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  assert.ok(structuredData.length >= 3);
});

test("site directories and privacy disclosures describe password checks and QR link resolution", () => {
  const privacy = fs.readFileSync(path.join(siteRoot, "privacy.html"), "utf8");
  const productivity = fs.readFileSync(path.join(siteRoot, "tools", "productivity.html"), "utf8");
  const directory = fs.readFileSync(path.join(siteRoot, "tools", "index.html"), "utf8");
  const decoder = fs.readFileSync(path.join(siteRoot, "tools", "qr-code-decoder.html"), "utf8");

  assert.match(privacy, /Last updated: August 29, 2026/);
  assert.match(privacy, /Only the first five characters[\s\S]*Pwned Passwords range API/);
  assert.match(privacy, /IndexedDB cache for up to 24 hours/);
  assert.match(privacy, /MonkeyTactics privacy proxy[\s\S]*resolve its final destination for your review/);
  assert.match(privacy, /header-only requests/);

  assert.match(productivity, /passwords up to 2,048 characters/);
  assert.match(productivity, /privately check known breach exposure/);
  assert.doesNotMatch(productivity, /supports passwords up to 128 characters/);
  assert.match(directory, /password generator analyzer checker breach pwned entropy/);
  assert.match(directory, /Generate, analyze, and check breach exposure/);

  assert.match(decoder, /A single decoded web link is sent to the MonkeyTactics privacy proxy/);
  assert.match(decoder, /Links in multi-code results remain unchecked until you choose an action/);
  assert.match(decoder, /The proxy uses header-only requests/);
  const decoderStructuredData = JSON.parse(decoder.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.match(JSON.stringify(decoderStructuredData), /MonkeyTactics privacy proxy/);
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

test("password breach lookup hashes locally and sends only the five-character prefix", async () => {
  const password = "password";
  const hash = await sha1Hex(password, webcrypto);
  assert.equal(hash, "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");

  let requestedUrl = "";
  const fakeFetch = async (url, options) => {
    requestedUrl = url;
    assert.equal(options.method, "GET");
    assert.equal(options.headers["Add-Padding"], "true");
    assert.doesNotMatch(url, /1E4C9B93F3F0682250B6CF8331B7EE68FD8/i);
    assert.equal("body" in options, false);
    return {
      ok: true,
      text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3303003\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0"
    };
  };
  const result = await checkPwnedPassword(password, fakeFetch, webcrypto);

  assert.equal(requestedUrl, "https://api.pwnedpasswords.com/range/5BAA6");
  assert.deepEqual(result.matches, [{ suffix: "1E4C9B93F3F0682250B6CF8331B7EE68FD8", count: 3303003 }]);
});

test("password breach lookup discards zero-count padding records", async () => {
  const fakeFetch = async () => ({
    ok: true,
    text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:0"
  });
  const result = await checkPwnedPassword("password", fakeFetch, webcrypto);
  assert.deepEqual(result.matches, []);
});

test("password breach lookup reuses a local range cache", async () => {
  const records = new Map();
  const cache = {
    get: async (prefix) => records.get(prefix) || null,
    set: async (prefix, responseText) => records.set(prefix, { responseText, fetchedAt: 123 })
  };
  let requestCount = 0;
  const fakeFetch = async () => {
    requestCount += 1;
    return {
      ok: true,
      text: async () => "1E4C9B93F3F0682250B6CF8331B7EE68FD8:42"
    };
  };

  const first = await checkPwnedPassword("password", fakeFetch, webcrypto, cache);
  const second = await checkPwnedPassword("password", fakeFetch, webcrypto, cache);

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(requestCount, 1);
  assert.deepEqual(second.matches, [{ suffix: "1E4C9B93F3F0682250B6CF8331B7EE68FD8", count: 42 }]);
  assert.equal(PWNED_RANGE_CACHE_TTL_MS, 86_400_000);
  assert.equal(PWNED_RANGE_CACHE_MAX_ENTRIES, 100);
});

test("check-my-password tab exposes strength, analytics, and breach controls", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");
  assert.match(html, /data-mode="check"[^>]*[\s\S]*?Check my Password/);
  assert.match(html, /id="panel-check"/);
  assert.match(html, /id="passwordToCheck" type="password"/);
  assert.match(html, /id="checkBreachBtn"/);
  assert.match(html, /class="btn-calculate breach-check-button"/);
  assert.match(html, /What happens when you check\?/);
  assert.match(html, /Your full password and full fingerprint are never sent/);
  assert.match(html, /cached on this device for up to 24 hours/);
  assert.match(html, /only the 100 most recently used replies are kept/);
  assert.match(html, /className = 'breach-warning-icon'/);
  assert.doesNotMatch(html, /suffixLabel\.textContent/);
  assert.match(html, /Character Distribution/);
  assert.match(html, /Shannon Entropy per Character/);
  assert.match(html, /Randomness Diagnostics/);
  assert.match(html, /Brute-Force Time Estimator/);
  assert.match(html, /Collision Probability/);
  assert.match(html, /Character Heatmap/);
  assert.match(html, /checkPwnedPassword\(password\)/);
  assert.match(html, /credential-analytics\.js\?v=20260811-3/);
});

test("analytics modal renders premium randomness and attack-resistance panels", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /credential-analytics\.js\?v=20260811-3/);
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

test("batch password deep link opens and reveals the quantity workflow", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");

  assert.match(html, /id="batch-passwords"/);
  assert.match(html, /window\.location\.hash !== '#batch-passwords'/);
  assert.match(html, /byId\('passwordAdvanced'\)\.open = true/);
  assert.match(html, /window\.addEventListener\('hashchange', restorePasswordHashState\)/);
});
