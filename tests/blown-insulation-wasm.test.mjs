import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { performance } from "node:perf_hooks";

import init, {
  calculate,
  load_coverage_chart
} from "../assets/wasm/blown-insulation/blown_insulation_engine.js";

const wasmBytes = fs.readFileSync(new URL(
  "../assets/wasm/blown-insulation/blown_insulation_engine_bg.wasm",
  import.meta.url
));
const chartJson = fs.readFileSync(new URL(
  "../assets/data/insulation/sanctuary-by-greenfiber.json",
  import.meta.url
), "utf8");
const stabilizedChartJson = fs.readFileSync(new URL(
  "../assets/data/insulation/applegate-stabilized-cellulose.json",
  import.meta.url
), "utf8");
const dryLooseFillChartJson = fs.readFileSync(new URL(
  "../assets/data/insulation/applegate-dry-loose-fill-cellulose.json",
  import.meta.url
), "utf8");

await init({ module_or_path: wasmBytes });
const chart = JSON.parse(load_coverage_chart(chartJson));
const stabilizedChart = JSON.parse(load_coverage_chart(stabilizedChartJson));
const dryLooseFillChart = JSON.parse(load_coverage_chart(dryLooseFillChartJson));
const catalogCharts = fs.readdirSync(new URL("../assets/data/insulation/", import.meta.url))
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(load_coverage_chart(fs.readFileSync(new URL(`../assets/data/insulation/${name}`, import.meta.url), "utf8"))));

const baseInput = {
  area_sqft: 1000,
  target_r_value: 49,
  existing_depth_in: 6,
  existing_material: "fiberglass",
  product_id: "sanctuary-by-greenfiber",
  waste_factor: 0.10
};

test("loads and caches the complete manufacturer coverage chart", () => {
  assert.equal(chart.product_name, "SANCTUARY by Greenfiber");
  assert.equal(chart.coverage.length, 8);
  assert.deepEqual(chart.coverage.map((entry) => entry.r_value), [13, 19, 22, 30, 38, 44, 49, 60]);
});

test("loads complete Applegate stabilized and dry loose-fill charts", () => {
  assert.equal(stabilizedChart.coverage.length, 16);
  assert.deepEqual(stabilizedChart.coverage.map((entry) => entry.r_value), [11, 13, 19, 22, 24, 26, 30, 32, 38, 40, 45, 48, 49, 50, 55, 60]);
  assert.equal(dryLooseFillChart.coverage.length, 7);
  assert.deepEqual(dryLooseFillChart.coverage.map((entry) => entry.r_value), [13, 19, 22, 30, 38, 49, 60]);
});

test("supports the complete requested fiberglass, cellulose, and mineral-wool catalog", () => {
  assert.equal(catalogCharts.length, 11);
  assert.deepEqual(new Set(catalogCharts.map((item) => item.material)), new Set(["fiberglass", "cellulose", "mineral_wool"]));
  assert.deepEqual(catalogCharts.map((item) => item.product_name).sort(), [
    "American Rockwool Premium Plus",
    "Applegate Dry Loose-Fill Cellulose",
    "Applegate Stabilized Cellulose",
    "CertainTeed InsulSafe SP",
    "Greenfiber Loose-Fill INS515LD",
    "Igloo Cellulose",
    "Johns Manville Climate Pro",
    "Nu-Wool Premium Cellulose",
    "Owens Corning ProPink L77",
    "SANCTUARY by Greenfiber",
    "Thermo-Cell ProCell Blue"
  ]);
});

test("calculates independently with each cached product chart", () => {
  const sanctuary = JSON.parse(calculate(JSON.stringify({ ...baseInput, existing_depth_in: null })));
  const stabilized = JSON.parse(calculate(JSON.stringify({ ...baseInput, existing_depth_in: null, product_id: "applegate-stabilized-cellulose" })));
  const dryLooseFill = JSON.parse(calculate(JSON.stringify({ ...baseInput, existing_depth_in: null, product_id: "applegate-dry-loose-fill-cellulose" })));
  assert.equal(sanctuary.bags_required_rounded, 76);
  assert.equal(stabilized.bags_required_rounded, 62);
  assert.equal(dryLooseFill.bags_required_rounded, 60);
});

test("loads and calculates a user-entered coverage chart", () => {
  const customChart = {
    product_name: "Custom / User Entered",
    material: "cellulose",
    bag_weight_lbs: 20,
    r_value_per_inch: 4,
    settling_factor: 1.1,
    coverage: [
      { r_value: 20, installed_thickness_in: 5.5, settled_thickness_in: 5, bags_per_1000_sqft: 20 },
      { r_value: 40, installed_thickness_in: 11, settled_thickness_in: 10, bags_per_1000_sqft: 42 }
    ]
  };
  const loaded = JSON.parse(load_coverage_chart(JSON.stringify(customChart)));
  assert.equal(loaded.product_name, "Custom / User Entered");

  const result = JSON.parse(calculate(JSON.stringify({
    ...baseInput,
    target_r_value: 40,
    existing_depth_in: null,
    product_id: "custom-user-entered"
  })));
  assert.equal(result.coverage_r_value, 40);
  assert.equal(result.installed_thickness_in, 11);
  assert.equal(result.settled_thickness_in, 10);
  assert.equal(result.bags_required, 46.2);
  assert.equal(result.bags_required_rounded, 47);
  assert.equal(result.ceiling_load_psf, 0.84);
});

test("returns every professional blown-insulation output", () => {
  const result = JSON.parse(calculate(JSON.stringify(baseInput)));
  assert.deepEqual(result, {
    r_existing: 15,
    r_needed: 34,
    coverage_r_value: 38,
    installed_thickness_in: 11.2,
    settled_thickness_in: 10.4,
    blow_to_thickness_in: 11.2,
    bags_required: 55.11,
    bags_required_rounded: 56,
    ceiling_load_psf: 1.25
  });
});

test("uses the exact published row when the added R-value matches", () => {
  const result = JSON.parse(calculate(JSON.stringify({
    ...baseInput,
    target_r_value: 60,
    existing_depth_in: null
  })));
  assert.equal(result.coverage_r_value, 60);
  assert.equal(result.installed_thickness_in, 17.3);
  assert.equal(result.settled_thickness_in, 16.1);
  assert.equal(result.bags_required, 91.85);
  assert.equal(result.bags_required_rounded, 92);
  assert.equal(result.ceiling_load_psf, 2.09);
});

test("steps retrofit requirements up to the next published R-value", () => {
  const result = JSON.parse(calculate(JSON.stringify(baseInput)));
  assert.equal(result.r_needed, 34);
  assert.equal(result.coverage_r_value, 38);
});

test("matches critical ProPink and Nu-Wool manufacturer rows", () => {
  const propink49 = JSON.parse(calculate(JSON.stringify({ ...baseInput, existing_depth_in: null, target_r_value: 49, product_id: "owens-corning-propink-l77" })));
  const propink60 = JSON.parse(calculate(JSON.stringify({ ...baseInput, existing_depth_in: null, target_r_value: 60, product_id: "owens-corning-propink-l77" })));
  const nuwool49 = JSON.parse(calculate(JSON.stringify({ ...baseInput, existing_depth_in: null, target_r_value: 49, product_id: "nu-wool-premium-cellulose" })));
  assert.deepEqual([propink49.bags_required_rounded, propink49.installed_thickness_in], [25, 16.75]);
  assert.deepEqual([propink60.bags_required_rounded, propink60.installed_thickness_in], [31, 20]);
  assert.deepEqual([nuwool49.bags_required_rounded, nuwool49.installed_thickness_in, nuwool49.settled_thickness_in], [83, 15.1, 12.9]);
});

test("clamps added R-value and bag count to zero when existing insulation meets target", () => {
  const result = JSON.parse(calculate(JSON.stringify({
    ...baseInput,
    target_r_value: 13,
    existing_depth_in: 6
  })));
  assert.equal(result.r_needed, 0);
  assert.equal(result.coverage_r_value, 0);
  assert.equal(result.bags_required, 0);
  assert.equal(result.bags_required_rounded, 0);
  assert.equal(result.ceiling_load_psf, 0);
});

test("rejects invalid values, unloaded products, and uncovered R-value ranges", () => {
  assert.match(JSON.parse(calculate(JSON.stringify({ ...baseInput, area_sqft: -1 }))).error, /Area cannot be negative/);
  assert.match(JSON.parse(calculate(JSON.stringify({ ...baseInput, product_id: "missing" }))).error, /has not been loaded/);
  assert.match(JSON.parse(calculate(JSON.stringify({ ...baseInput, target_r_value: 100, existing_depth_in: null }))).error, /required R-value range/);
  assert.match(JSON.parse(load_coverage_chart("{}")).error, /Invalid coverage chart JSON/);
});

test("typical cached calculations average less than 2 ms", () => {
  const inputJson = JSON.stringify(baseInput);
  calculate(inputJson);
  const iterations = 1000;
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) calculate(inputJson);
  const averageMilliseconds = (performance.now() - start) / iterations;
  assert.ok(averageMilliseconds < 2, `average calculation took ${averageMilliseconds.toFixed(3)} ms`);
});

test("enables the product selector after its coverage chart loads", () => {
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  assert.match(integrationScript, /\$\("blownProduct"\)\.disabled = false;/);
  assert.match(integrationScript, /const CUSTOM_PRODUCT_ID = "custom-user-entered";/);
  assert.match(integrationScript, /load_coverage_chart\(JSON\.stringify\(chart\)\)/);
  for (const chart of catalogCharts) {
    const productId = chart.product_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    assert.match(integrationScript, new RegExp(`${productId}\\.json`));
  }
});

test("renders the custom product inputs in the blown-insulation form", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  assert.match(page, /<option value="custom-user-entered">Custom \/ User Entered<\/option>/);
  for (const id of ["customMaterial", "customBagWeight", "customRPerInch", "customSettlingFactor", "customCoverage", "customApplyButton"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
});

test("renders all ten responsive blown-insulation insight visualizations", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  for (const id of ["depthRChart", "settlingChart", "bagAreaChart", "costChart", "coverageChartCanvas", "materialChart", "wasteChart", "currentHeatBar", "gaugeAdded", "climateRecommendation"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /insulation-climate-zones-2021-iecc\.jpg/);
  assert.match(integrationScript, /function renderInsights\(input, result\)/);
  assert.match(integrationScript, /function climateTarget\(zone\)/);
});

test("shows chart-driven coverage, climate targeting, and ceiling-load guidance", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  for (const id of ["climateTargetSummary", "applyClimateTarget", "coverageRValue", "ceilingLoad", "ceilingLoadWarning", "blownCoveragePanel", "coverageTableBody"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /Active manufacturer coverage chart/);
  assert.match(integrationScript, /function renderCoverageTable\(\)/);
  assert.match(integrationScript, /function applyClimateTarget\(\)/);
  assert.match(integrationScript, /result\.ceiling_load_psf > 1\.3/);
  assert.match(integrationScript, /USG's 1\.3 lb\/ft² sag-prevention recommendation/);
  assert.match(integrationScript, /not a universal code or structural limit/);
  assert.match(integrationScript, /result\.coverage_r_value > result\.r_needed/);
  assert.match(integrationScript, /function normalizeChartDrivenResult\(input, result\)/);
  assert.match(integrationScript, /Number\.isFinite\(result\.ceiling_load_psf\)/);
  assert.match(integrationScript, /blown_insulation_engine\.js\?v=20260812-chart-engine-2/);
  assert.match(integrationScript, /blown_insulation_engine_bg\.wasm\?v=20260812-chart-engine-2/);
});

test("prints dedicated Batt and Blown project reports", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const styles = fs.readFileSync(new URL("../assets/css/tools/insulation-calculator.css", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  assert.match(page, /id="printBattResults"/);
  assert.match(page, /id="printBlownResults"/);
  assert.match(page, /id="insulationPrintReport"/);
  assert.match(integrationScript, /function prepareInsulationPrint\(mode/);
  assert.match(integrationScript, /printInsulationReport\("batt"\)/);
  assert.match(integrationScript, /printInsulationReport\("blown"\)/);
  assert.match(integrationScript, /window\.print\(\)/);
  assert.match(styles, /@media print/);
  assert.match(styles, /body\.print-insulation main > #insulationPrintReport/);
});

test("publishes capability-aligned insulation SEO metadata and helpful content", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  assert.match(page, /<title>Batt &amp; Blown Insulation Calculator: Bags, Depth &amp; Cost<\/title>/);
  assert.match(page, /name="description" content="Estimate batt packages or blown-in insulation bags/);
  assert.match(page, /<h1>Batt &amp; Blown Insulation Calculator<\/h1>/);
  assert.match(page, /id="batt-formula-heading"/);
  assert.match(page, /id="blown-formula-heading"/);
  assert.match(page, /id="products-heading"/);
  assert.match(page, /id="guidance-heading"/);
  assert.match(page, /FTC R-Value Rule/);
  assert.match(page, /How many bags of blown-in insulation do I need\?/);
  const schemas = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  const appSchema = schemas.find((schema) => schema["@type"] === "WebApplication");
  assert.equal(appSchema?.offers?.price, "0");
  assert.ok(appSchema?.featureList?.includes("Printable project reports"));
  const breadcrumbs = schemas.find((schema) => schema["@type"] === "BreadcrumbList");
  assert.equal(breadcrumbs?.itemListElement?.[1]?.item, "https://monkeytactics.com/tools/");
});

test("recalculates blown insulation in real time without a calculate button", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  assert.doesNotMatch(page, /id="blownCalcBtn"/);
  assert.doesNotMatch(page, />Calculate Blown Insulation</);
  assert.match(page, /Results update automatically/);
  assert.match(integrationScript, /function scheduleBlownCalculation\(\)/);
  assert.match(integrationScript, /REALTIME_CONTROL_IDS/);
  assert.match(integrationScript, /scheduleBlownCalculation\(\);\s*\n\}\);/);
});

test("adds a prefilled customizer beside every manufacturer product", () => {
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  assert.match(integrationScript, /function installProductCustomizers\(\)/);
  assert.match(integrationScript, /customOption\.textContent = `↳ Customize/);
  assert.match(integrationScript, /function prefillCustomProduct\(productId\)/);
  assert.match(integrationScript, /populateCustomFields\(sourceChart\)/);
  assert.match(integrationScript, /Prefilled from \$\{sourceChart\.product_name\}/);
  const stylesheet = fs.readFileSync(new URL(
    "../assets/css/tools/insulation-calculator.css",
    import.meta.url
  ), "utf8");
  assert.match(stylesheet, /#blownProduct option\.customize-product-option/);
  assert.match(stylesheet, /color: #789087/);
});

test("provides a live square-footage modal for the blown area", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  assert.match(page, /<dialog class="area-calculator-dialog" id="areaCalculatorDialog"/);
  for (const id of ["openAreaCalculator", "areaLength", "areaWidth", "areaQuantity", "areaExclusions", "areaCalculatorTotal", "useCalculatedArea"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(integrationScript, /function updateAreaCalculator\(\)/);
  assert.match(integrationScript, /calculatedArea = Math\.max\(0, grossArea - exclusions\)/);
  assert.match(integrationScript, /areaDestinationInput\.value = String\(Number\(calculatedArea\.toFixed\(2\)\)\)/);
  assert.match(integrationScript, /scheduleBlownCalculation\(\)/);
});

test("provides a full-featured realtime batt takeoff", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  for (const id of ["battSectionRows", "addBattSection", "battMaterial", "battAssembly", "battClimateZone", "battTargetR", "battFacing", "battCoverage", "battPackageWeight", "battWaste", "battPackagePrice"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /class="batt-section-area"/);
  assert.match(page, /class="batt-section-excluded"/);
  assert.match(page, /class="area-helper-button batt-area-helper"/);
  assert.doesNotMatch(page, /id="battOpenings"/);
  assert.doesNotMatch(page, /id="calcBtn"/);
  assert.match(integrationScript, /function battRecommendation\(assembly, zone, material\)/);
  assert.match(integrationScript, /function battAreaTotals\(\)/);
  assert.match(integrationScript, /function battVaporMessage\(assembly, zone, facing\)/);
  assert.match(integrationScript, /function addBattSection\(\)/);
  assert.match(integrationScript, /adjustedArea = net \* \(1 \+ waste\)/);
  assert.match(integrationScript, /Math\.ceil\(adjustedArea \/ coverage\)/);
  assert.match(integrationScript, /areaHelper\.closest\("\[data-batt-section\]"\)\.querySelector\("\.batt-section-area"\)/);
});

test("renders the three batt-specific material insight charts", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  for (const id of ["battInsights", "battThicknessChart", "battCavityChart", "battCostStepChart", "battThicknessSummary", "battCavitySummary", "battCostStepSummary", "battClimateRecommendation", "battClimateNote"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /Batt thickness vs R-value/);
  assert.match(page, /Cavity depth vs max R-value/);
  assert.match(page, /Cost per R-value step/);
  assert.match(page, /Location guidance/);
  assert.match(page, /insulation-climate-zones-2021-iecc\.jpg/);
  assert.match(integrationScript, /const BATT_THICKNESS =/);
  assert.match(integrationScript, /const BATT_CAVITY_MAX_R =/);
  assert.match(integrationScript, /function drawBattInsights\(\)/);
  assert.match(integrationScript, /1000 \/ product\.coverage \* packagePrice/);
  assert.match(integrationScript, /battClimateRecommendation/);
});

test("saves and loads named Batt presets from local storage JSON", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  for (const id of ["manageBattPresets", "battPresetsDialog", "battPresetName", "saveBattPreset", "battPresetList", "battPresetCount"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(page, /Save Current Preset/);
  assert.match(integrationScript, /const BATT_PRESETS_STORAGE_KEY = "mt_insulation_batt_presets"/);
  assert.match(integrationScript, /JSON\.parse\(localStorage\.getItem\(BATT_PRESETS_STORAGE_KEY\)/);
  assert.match(integrationScript, /localStorage\.setItem\(BATT_PRESETS_STORAGE_KEY, JSON\.stringify\(battPresets\)\)/);
  assert.match(integrationScript, /function battPresetData\(\)/);
  assert.match(integrationScript, /function applyBattPreset\(preset\)/);
  assert.match(integrationScript, /\$\("battSectionRows"\)\.replaceChildren\(\.\.\.rows\)/);
});

test("saves and loads complete Blown presets from local storage JSON", () => {
  const page = fs.readFileSync(new URL("../tools/insulation-calculator.html", import.meta.url), "utf8");
  const integrationScript = fs.readFileSync(new URL(
    "../assets/js/tools/insulation-calculator/insulation-calculator.js",
    import.meta.url
  ), "utf8");
  for (const id of ["manageBlownPresets", "blownPresetsDialog", "blownPresetName", "saveBlownPreset", "blownPresetList", "blownPresetCount"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(integrationScript, /const BLOWN_PRESETS_STORAGE_KEY = "mt_insulation_blown_presets"/);
  assert.match(integrationScript, /JSON\.parse\(localStorage\.getItem\(BLOWN_PRESETS_STORAGE_KEY\)/);
  assert.match(integrationScript, /localStorage\.setItem\(BLOWN_PRESETS_STORAGE_KEY, JSON\.stringify\(blownPresets\)\)/);
  assert.match(integrationScript, /function blownPresetData\(\)/);
  assert.match(integrationScript, /customChart: customSelected && coverageChart \? coverageChart : null/);
  assert.match(integrationScript, /function applyBlownPreset\(preset\)/);
  assert.match(integrationScript, /loadCustomChart\(data\.productId, data\.customChart\)/);
  assert.match(integrationScript, /\$\("wasteOutput"\)\.textContent = `\$\{data\.waste\}%`/);
});
