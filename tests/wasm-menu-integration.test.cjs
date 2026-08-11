const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const siteRoot = path.resolve(__dirname, "..");
const menuAssetVersion = "20260808-menu-assets-v1";
const integrationMarkup = [
  '<div id="mt-header"></div>',
];

const pageFiles = [
  ...fs
    .readdirSync(siteRoot)
    .filter((name) => name.endsWith(".html"))
    .map((name) => path.join(siteRoot, name)),
  ...fs
    .readdirSync(path.join(siteRoot, "tools"))
    .filter((name) => name.endsWith(".html"))
    .map((name) => path.join(siteRoot, "tools", name)),
];

test("every site page loads the WASM menu exactly once", () => {
  assert.ok(pageFiles.length > 0);

  for (const file of pageFiles) {
    const html = fs.readFileSync(file, "utf8");

    for (const markup of integrationMarkup) {
      assert.equal(
        html.split(markup).length - 1,
        1,
        `${path.relative(siteRoot, file)} must contain ${markup} exactly once`,
      );
    }

    const menuScripts = html.match(
      new RegExp(`<script type="module" src="/assets/wasm/menu/menu\\.js\\?v=${menuAssetVersion}"></script>`, "g"),
    ) || [];
    assert.equal(
      menuScripts.length,
      1,
      `${path.relative(siteRoot, file)} must load the WASM menu exactly once`,
    );
  }
});

test("the old HTML site navigation is absent", () => {
  for (const file of pageFiles) {
    const html = fs.readFileSync(file, "utf8");
    const primaryNavigation = html.match(
      /<nav\b[^>]*aria-label="Primary navigation"[^>]*>[\s\S]*?<\/nav>/i,
    );

    if (primaryNavigation) {
      assert.doesNotMatch(
        primaryNavigation[0],
        />\s*(Finance|Health|Utilities|Productivity|Construction)\s*</,
        `${path.relative(siteRoot, file)} still contains the old category bar`,
      );
    }

    assert.doesNotMatch(
      html,
      /id="mt-menu"/,
      `${path.relative(siteRoot, file)} still contains the retired menu mount`,
    );
  }
});

test("compiled WASM menu artifacts exist at their deployment paths", () => {
  for (const file of ["menu.css", "menu.js", "menu_bg.wasm"]) {
    const artifact = path.join(siteRoot, "assets", "wasm", "menu", file);
    assert.ok(fs.statSync(artifact).size > 0, `${artifact} must be non-empty`);
  }
});

test("the menu loader versions its CSS and WASM dependencies", () => {
  const loader = fs.readFileSync(path.join(siteRoot, "assets", "wasm", "menu", "menu.js"), "utf8");

  assert.match(loader, /const menuAssetVersion = new URL\(import\.meta\.url\)\.search;/);
  assert.match(loader, /stylesheet\.href = menuAssetUrl\("menu\.css"\)\.href;/);
  assert.match(loader, /__wbg_init\(\{ module_or_path: menuAssetUrl\("menu_bg\.wasm"\) \}\)/);
  assert.match(loader, /Failed to initialize the MonkeyTactics navigation/);
});

test("the All Tools page mirrors the WASM menu hierarchy", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "index.html"), "utf8");

  for (const [id, label, count] of [
    ["generators", "Generators", 2],
    ["calculators", "Calculators", 15],
    ["text-data", "Text &amp; Data", 6],
    ["batch-automation", "Batch &amp; Automation", 4],
  ]) {
    assert.match(html, new RegExp(`id="${id}"[\\s\\S]*?<h2>${label} <span>${count}</span></h2>`));
  }

  for (const subgroup of ["Finance", "Health", "Time &amp; Date", "Construction"]) {
    assert.match(html, new RegExp(`<h3>${subgroup}</h3>`));
  }

  assert.equal((html.match(/class="directory-tool"/g) || []).length, 27);
  assert.doesNotMatch(html, /class="filter-tab/);
});

test("the homepage features only the three designated popular tools", () => {
  const html = fs.readFileSync(path.join(siteRoot, "index.html"), "utf8");
  const titles = [...html.matchAll(/<article class="featured-tool[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>/g)]
    .map((match) => match[1]);

  assert.deepEqual(titles, [
    "Word Unscrambler",
    "Loan &amp; Mortgage Calculator",
    "Advanced QR Code Generator",
  ]);
  assert.equal((html.match(/class="capability-list"/g) || []).length, 3);
  assert.equal((html.match(/<li>/g) || []).length, 12);
});

test("the flagship word and QR tools use the mortgage-inspired presentation", () => {
  for (const name of ["word-unscrambler.html", "qr-code-generator.html"]) {
    const html = fs.readFileSync(path.join(siteRoot, "tools", name), "utf8");
    assert.match(html, /class="premium-tool-page [^"]+"/);
    assert.match(html, /class="premium-tool-hero"/);
    assert.match(html, /class="premium-hero-grid"/);
    assert.match(html, /premium-tool\.css/);
  }
});

test("the Password Generator uses the premium generator presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "password-generator.html"), "utf8");
  assert.match(html, /class="premium-tool-page password-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /01 \/ Generate/);
  assert.match(html, /Web Crypto powered/);
});

test("the Tip Calculator uses the premium calculator presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "tip-calculator.html"), "utf8");
  assert.match(html, /class="premium-tool-page tip-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="tip-calculator-section"/);
  assert.match(html, /01 \/ Calculate/);
  assert.match(html, /Tax-aware tipping/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the Date Difference Calculator uses the premium planning presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "date-difference-calculator.html"), "utf8");
  assert.match(html, /class="premium-tool-page date-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="date-calculator-section"/);
  assert.match(html, /01 \/ Plan/);
  assert.match(html, /Holiday-aware counts/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the Time Zone Converter uses the premium meeting presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "time-zone-converter.html"), "utf8");
  assert.match(html, /class="premium-tool-page timezone-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="timezone-calculator-section"/);
  assert.match(html, /01 \/ Coordinate/);
  assert.match(html, /DST-aware conversion/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the BMI Calculator uses the premium health presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "bmi-calculator.html"), "utf8");
  assert.match(html, /class="premium-tool-page bmi-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="bmi-calculator-section"/);
  assert.match(html, /01 \/ Measure/);
  assert.match(html, /02 \/ Understand/);
  assert.match(html, /Instant live results/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the Daily Energy Needs Calculator uses the premium health presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "calorie-calculator.html"), "utf8");
  assert.match(html, /premium-tool-page energy-tool-page/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /energy-calculator-section/);
  assert.match(html, /01 \/ Estimate/);
  assert.match(html, /BMR &amp; TDEE estimates/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container/g) || []).length, 1);
});

test("the Age Calculator uses the premium milestone presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "age-calculator.html"), "utf8");
  assert.match(html, /class="premium-tool-page age-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="age-calculator-section"/);
  assert.match(html, /01 \/ Calculate/);
  assert.match(html, /Exact years, months &amp; days/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the QR Code Decoder uses the premium private scanning presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "qr-code-decoder.html"), "utf8");
  assert.match(html, /class="premium-tool-page qr-decoder-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="qr-decoder-section"/);
  assert.match(html, /01 \/ Decode/);
  assert.match(html, /Four scanning methods/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the OCR Utility uses the premium private recognition presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "ocr-utility.html"), "utf8");
  assert.match(html, /class="premium-tool-page ocr-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="ocr-workspace-intro"/);
  assert.match(html, /01 \/ Extract/);
  assert.match(html, /Local WASM recognition/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("all construction calculators use the premium estimating presentation", () => {
  const constructionPages = [
    "concrete-calculator.html",
    "drywall-calculator.html",
    "paint-calculator.html",
    "tile-calculator.html",
    "roofing-shingle-calculator.html",
    "lumber-board-foot-calculator.html",
    "insulation-calculator.html",
  ];

  for (const name of constructionPages) {
    const html = fs.readFileSync(path.join(siteRoot, "tools", name), "utf8");
    assert.match(html, /construction-calculator-page premium-tool-page construction-premium-page/);
    assert.match(html, /class="premium-tool-hero"/);
    assert.match(html, /construction-calculator-section/);
    assert.match(html, /01 \/ Estimate/);
    assert.doesNotMatch(html, /Top Display Ad/);
    assert.equal((html.match(/class="ad-container"/g) || []).length, 1, `${name} should keep only its lower ad slot`);
  }
});

test("the Word and Character Counter uses the premium text analysis presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");
  assert.match(html, /class="premium-tool-page counter-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="counter-workspace-section"/);
  assert.match(html, /01 \/ Analyze/);
  assert.match(html, /Instant live counts/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the Word and Character Counter keeps analysis controls inside mobile viewports", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "word-character-counter.html"), "utf8");
  assert.match(html, /\.calc-layout > \*,[\s\S]*?\.results-col \{ min-width: 0; \}/);
  assert.match(html, /\.textarea-actions \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(html, /#resultsCards \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*?overflow-x: visible;/);
  assert.match(html, /\.analysis-card-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*?overflow-x: visible;/);
  assert.match(html, /\.keywords-heading-row \{ align-items: flex-start; flex-direction: column; \}/);
});

test("the Unit Converter uses the premium measurement presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "unit-converter.html"), "utf8");
  assert.match(html, /class="premium-tool-page unit-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="unit-workspace-section"/);
  assert.match(html, /01 \/ Convert/);
  assert.match(html, /Metric &amp; imperial/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the Percentage Calculator uses the premium percentage presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "percentage-calculator.html"), "utf8");
  assert.match(html, /class="premium-tool-page percentage-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="percentage-workspace-section"/);
  assert.match(html, /01 \/ Calculate/);
  assert.match(html, /Three calculation modes/);
  assert.doesNotMatch(html, /Top Display Ad/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the Compound Interest Calculator uses the premium growth presentation", () => {
  const html = fs.readFileSync(path.join(siteRoot, "tools", "compound-interest-calculator.html"), "utf8");
  const script = fs.readFileSync(path.join(siteRoot, "assets", "js", "tools", "compound-interest-calculator", "compound-interest-calculator.js"), "utf8");
  const chartScript = fs.readFileSync(path.join(siteRoot, "assets", "js", "tools", "compound-interest-calculator", "compound-interest-chart.js"), "utf8");
  assert.match(html, /class="premium-tool-page compound-tool-page"/);
  assert.match(html, /<title>Compound Interest Calculator with Contributions<\/title>/);
  assert.match(html, /Calculate compound interest with monthly contributions, five compounding frequencies/);
  assert.match(html, /"url": "https:\/\/monkeytactics\.com\/tools\/compound-interest-calculator"/);
  assert.doesNotMatch(html, /compound-interest-calculator\.html#app/);
  assert.match(html, /How are monthly contributions calculated\?/);
  assert.match(html, /Why might another compound interest calculator show a different result\?/);
  assert.match(html, /Methodology and limitations/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="compound-workspace-section"/);
  assert.match(html, /01 \/ Project/);
  assert.match(html, /Tax &amp; inflation aware/);
  assert.match(html, /id="compoundChartsSection"/);
  assert.match(html, /id="printScenarioSelect"/);
  assert.match(html, /id="compoundPrintReport"/);
  assert.match(html, /<span>MonkeyTactics<\/span><h1 id="compoundPrintTitle">/);
  assert.doesNotMatch(html, /MonkeyTactics Finance/);
  assert.match(html, /id="compoundPrintScenarioUrl"/);
  assert.match(html, /body\.print-growth > footer,/);
  assert.match(html, /body\.print-growth \.compound-print-url \{[\s\S]*display: block !important;/);
  assert.doesNotMatch(html, /body\.print-growth footer,/);
  assert.match(html, /id="compoundChartControls"/);
  assert.match(html, /data-chart-layer="nominal"/);
  assert.match(html, /data-chart-layer="real"/);
  assert.match(html, /data-chart-layer="composition"/);
  assert.match(html, /data-chart-layer="tax"/);
  assert.match(html, /id="compoundChartTooltip"/);
  assert.match(html, /id="compoundChartPin"/);
  assert.match(html, /id="compoundYearlyGrowthChart"/);
  assert.match(html, /body\.print-growth \.trustpilot-review-link \{ display: none !important; \}/);
  assert.match(html, /body\.print-growth #growthSection \{[\s\S]*break-before: page;[\s\S]*page-break-before: always;/);
  assert.doesNotMatch(html, /id="calcBtn"/);
  assert.match(script, /calculate_compound_scenario/);
  assert.match(script, /control\.addEventListener\("input", \(\) => runCalculation\(\)\)/);
  assert.match(script, /Done editing/);
  assert.match(script, /renderGrowthChart\(\[input\], \[result\], elements\.printGrowthChart/);
  assert.match(script, /input\.name === "Current plan" \? "Compound Interest Report"/);
  assert.match(script, /function publicScenarioUrl\(input\)/);
  assert.match(script, /elements\.printScenarioUrl\.textContent = publicScenarioUrl\(input\)/);
  assert.match(script, /initChart\(\{/);
  assert.match(script, /updateChart\(inputs, results\)/);
  assert.match(chartScript, /export function initChart/);
  assert.match(chartScript, /export function updateChart/);
  assert.match(chartScript, /export function addInteractions/);
  assert.match(chartScript, /Crossover: Interest exceeds contributions/);
  assert.match(chartScript, /addEventListener\("wheel"/);
  assert.match(chartScript, /addEventListener\("pointerdown"/);
  assert.match(chartScript, /const nominalDelta = rows\[1\]\.row\.nominal - rows\[0\]\.row\.nominal/);
  assert.match(chartScript, /const hidden = !layerVisible \|\| !scenarioVisible/);
  assert.doesNotMatch(html, /AdSense: Top/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
});

test("the About page lists the Compound Interest Calculator as a Rust WebAssembly app", () => {
  const html = fs.readFileSync(path.join(siteRoot, "about.html"), "utf8");
  assert.match(html, /Five MonkeyTactics systems use <code>Rust<\/code> compiled to <code>WebAssembly<\/code>/);
  assert.match(html, /href="\/tools\/compound-interest-calculator">Compound Interest Calculator<\/a>/);
  assert.match(html, /Projects compound growth, regular contributions, tax drag, inflation, and up to five scenarios/);
});

test("featured pages keep only the lower ad and top tools invite Trustpilot reviews", () => {
  for (const name of ["index.html", "tools/word-unscrambler.html", "tools/qr-code-generator.html"]) {
    const html = fs.readFileSync(path.join(siteRoot, name), "utf8");
    assert.equal((html.match(/class="ad-container"/g) || []).length, 1, `${name} should contain only its lower ad slot`);
    assert.doesNotMatch(html, /Top Display Ad/);
  }

  const reviewPages = fs.readdirSync(path.join(siteRoot, "tools"))
    .filter((name) => name.endsWith(".html"))
    .map((name) => `tools/${name}`)
    .filter((name) => fs.readFileSync(path.join(siteRoot, name), "utf8").includes('class="review-collector"'));

  assert.equal(reviewPages.length, 23, "all review prompts should be covered");

  for (const name of reviewPages) {
    const html = fs.readFileSync(path.join(siteRoot, name), "utf8");
    assert.equal((html.match(/class="review-collector"/g) || []).length, 1, `${name} should contain one review prompt`);
    assert.match(html, /https:\/\/www\.trustpilot\.com\/evaluate\/monkeytactics\.com/);
    assert.match(html, /assets\/images\/trustpilot-review\.svg/);
    assert.doesNotMatch(html, /tp\.widget\.bootstrap\.min\.js/);
    assert.doesNotMatch(html, /class="trustpilot-widget"/);
  }
});
