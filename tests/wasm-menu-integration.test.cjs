const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const siteRoot = path.resolve(__dirname, "..");
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
      /<script type="module" src="\/static\/wasm\/menu\.js(?:\?v=[^"]+)?"><\/script>/g,
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
    const artifact = path.join(siteRoot, "static", "wasm", file);
    assert.ok(fs.statSync(artifact).size > 0, `${artifact} must be non-empty`);
  }
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
  assert.match(html, /class="premium-tool-page compound-tool-page"/);
  assert.match(html, /class="premium-tool-hero"/);
  assert.match(html, /class="compound-workspace-section"/);
  assert.match(html, /01 \/ Project/);
  assert.match(html, /Tax &amp; inflation aware/);
  assert.doesNotMatch(html, /AdSense: Top/);
  assert.equal((html.match(/class="ad-container"/g) || []).length, 1);
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
