import initBlownEngine, { calculate, load_coverage_chart } from "/assets/wasm/blown-insulation/blown_insulation_engine.js?v=20260812-chart-engine-2";

const KG_PER_LB = 0.45359237;
const BATT_PRODUCTS = {
  fiberglass: {
    13: { coverage: 40, pounds: 15 }, 15: { coverage: 40, pounds: 18 },
    19: { coverage: 48.96, pounds: 24 }, 21: { coverage: 48, pounds: 26 },
    30: { coverage: 31.25, pounds: 30 }, 38: { coverage: 32, pounds: 38 },
    49: { coverage: 24, pounds: 42 }, 60: { coverage: 20, pounds: 48 }
  },
  mineral_wool: {
    15: { coverage: 39.8, pounds: 30 }, 23: { coverage: 30.3, pounds: 30 },
    30: { coverage: 24, pounds: 30 }, 38: { coverage: 19, pounds: 30 },
    49: { coverage: 15, pounds: 30 }, 60: { coverage: 12, pounds: 30 }
  }
};
const BATT_R_VALUES = {
  fiberglass: [13, 15, 19, 21, 30, 38, 49, 60],
  mineral_wool: [15, 23, 30, 38, 49, 60]
};
const BATT_THICKNESS = {
  fiberglass: { 13: 3.5, 15: 3.5, 19: 6.25, 21: 5.5, 30: 10.25, 38: 12, 49: 15.5, 60: 20 },
  mineral_wool: { 15: 3.5, 23: 5.5, 30: 7.25, 38: 10.25, 49: 13, 60: 16 }
};
const BATT_CAVITY_MAX_R = {
  fiberglass: [{ depth: 3.5, r: 15 }, { depth: 5.5, r: 21 }, { depth: 7.25, r: 30 }, { depth: 9.25, r: 38 }, { depth: 11.25, r: 49 }],
  mineral_wool: [{ depth: 3.5, r: 15 }, { depth: 5.5, r: 23 }, { depth: 7.25, r: 30 }, { depth: 9.25, r: 38 }, { depth: 11.25, r: 49 }]
};
const CHART_URLS = [
  "/assets/data/insulation/owens-corning-propink-l77.json",
  "/assets/data/insulation/johns-manville-climate-pro.json",
  "/assets/data/insulation/certainteed-insulsafe-sp.json",
  "/assets/data/insulation/sanctuary-by-greenfiber.json",
  "/assets/data/insulation/greenfiber-loose-fill-ins515ld.json",
  "/assets/data/insulation/applegate-stabilized-cellulose.json",
  "/assets/data/insulation/applegate-dry-loose-fill-cellulose.json",
  "/assets/data/insulation/nu-wool-premium-cellulose.json",
  "/assets/data/insulation/igloo-cellulose.json",
  "/assets/data/insulation/thermo-cell-procell-blue.json",
  "/assets/data/insulation/american-rockwool-premium-plus.json"
];
const CUSTOM_PRODUCT_ID = "custom-user-entered";
const BATT_PRESETS_STORAGE_KEY = "mt_insulation_batt_presets";
const BATT_PRESET_VERSION = 1;
const BLOWN_PRESETS_STORAGE_KEY = "mt_insulation_blown_presets";
const BLOWN_PRESET_VERSION = 1;

const $ = (id) => document.getElementById(id);
const decimal = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
let coverageChart = null;
const coverageCharts = new Map();
const customProductSources = new Map();
let insightState = null;
let chartFrame = 0;
let battChartFrame = 0;
let battInsightReady = false;
let calculationFrame = 0;
let calculatedArea = 0;
let areaDestinationInput = null;
let battPresets = [];
let blownPresets = [];
const REALTIME_CONTROL_IDS = new Set(["blownArea", "targetR", "existingDepth", "existingMaterial"]);

function selectTab(nextTab) {
  const battSelected = nextTab === "batt";
  $("battTab").classList.toggle("active", battSelected);
  $("blownTab").classList.toggle("active", !battSelected);
  $("battTab").setAttribute("aria-selected", String(battSelected));
  $("blownTab").setAttribute("aria-selected", String(!battSelected));
  $("battTab").tabIndex = battSelected ? 0 : -1;
  $("blownTab").tabIndex = battSelected ? -1 : 0;
  $("battPanel").hidden = !battSelected;
  $("blownPanel").hidden = battSelected;
  $("battInsights").hidden = !battSelected || !battInsightReady;
  if (battSelected && battInsightReady) scheduleBattInsights();
  if (insightState) {
    $("blownInsights").hidden = battSelected;
    if (!battSelected) scheduleInsights();
  }
}

function bindTabs() {
  $("battTab").addEventListener("click", () => selectTab("batt"));
  $("blownTab").addEventListener("click", () => selectTab("blown"));
  document.querySelector(".insulation-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tab = event.key === "ArrowLeft" || event.key === "Home" ? $("battTab") : $("blownTab");
    selectTab(tab === $("battTab") ? "batt" : "blown");
    tab.focus();
  });
}

function battRecommendation(assembly, zone, material) {
  if (assembly === "attic") return { r: zone === 1 ? 30 : zone <= 3 ? 49 : 60, note: "2021 IECC ceiling planning target" };
  if (assembly === "floor") return { r: zone <= 2 ? 13 : zone <= 6 ? 30 : 38, note: "Floor planning target; verify the locally adopted table" };
  if (assembly === "interior_wall") return { r: material === "mineral_wool" ? 15 : 13, note: "Sound-control choice; not an exterior-envelope target" };
  if (assembly === "wall_2x4") {
    const continuous = zone === 3 ? " plus about R-5 continuous insulation" : zone >= 4 ? " plus about R-10 continuous insulation" : "";
    return { r: material === "mineral_wool" ? 15 : 13, note: `2×4 cavity${continuous}` };
  }
  const continuous = zone >= 4 ? " plus exterior continuous insulation may be required" : zone === 3 ? " or a cavity-plus-continuous assembly" : "";
  return { r: material === "mineral_wool" ? 23 : zone >= 3 ? 21 : 19, note: `2×6 cavity${continuous}` };
}

function updateBattPackageDefaults() {
  const product = BATT_PRODUCTS[$("battMaterial").value][Number($("battTargetR").value)];
  if (!product) return;
  $("battCoverage").value = product.coverage;
  $("battPackageWeight").value = product.pounds;
}

function updateBattRValues({ resetPackage = true } = {}) {
  const material = $("battMaterial").value;
  const recommendation = battRecommendation($("battAssembly").value, Number($("battClimateZone").value), material);
  const values = BATT_R_VALUES[material];
  $("battTargetR").replaceChildren(...values.map((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `R-${value}`;
    return option;
  }));
  const selected = values.reduce((nearest, value) => Math.abs(value - recommendation.r) < Math.abs(nearest - recommendation.r) ? value : nearest);
  $("battTargetR").value = String(selected);
  $("battRGuidance").textContent = `Suggested R-${recommendation.r}: ${recommendation.note}.`;
  if (resetPackage) updateBattPackageDefaults();
}

function battAreaTotals() {
  return [...document.querySelectorAll("[data-batt-section]")].reduce((totals, row) => {
    const area = Math.max(0, Number(row.querySelector(".batt-section-area").value) || 0);
    const excluded = Math.max(0, Number(row.querySelector(".batt-section-excluded").value) || 0);
    const net = Math.max(0, area - excluded);
    row.querySelector(".batt-section-net strong").textContent = `${decimal.format(net)} ft²`;
    row.classList.toggle("has-section-error", excluded >= area && excluded > 0);
    return { gross: totals.gross + area, openings: totals.openings + excluded, net: totals.net + net };
  }, { gross: 0, openings: 0, net: 0 });
}

function battVaporMessage(assembly, zone, facing) {
  if (assembly === "interior_wall") return "Interior partitions usually use unfaced batts; a vapor retarder is generally unnecessary.";
  if (!assembly.startsWith("wall")) return "Facing and vapor control depend on the full roof or floor assembly; confirm the product and local requirements.";
  if (zone <= 3) return facing === "unfaced"
    ? "Unfaced batts are commonly appropriate in warm Zones 1–3. Avoid creating a double vapor barrier."
    : "Faced exterior-wall batts can affect drying in warm climates. Confirm facing direction and the full wall assembly locally.";
  if (zone === 4) return "Zone 4 vapor-retarder requirements vary, especially in Marine 4. Confirm the locally adopted IRC and wall assembly.";
  return facing === "unfaced"
    ? "Cold-climate exterior walls commonly need an approved interior vapor-retarder strategy. Unfaced batts alone may not provide it."
    : "The selected facing may form part of the interior vapor-control strategy when installed correctly; verify the full assembly.";
}

function calculateBatt() {
  const { gross, openings, net } = battAreaTotals();
  const material = $("battMaterial").value;
  const assembly = $("battAssembly").value;
  const zone = Number($("battClimateZone").value);
  const targetR = Number($("battTargetR").value);
  const coverage = Number($("battCoverage").value);
  const packageWeight = Math.max(0, Number($("battPackageWeight").value) || 0);
  const waste = Number($("battWaste").value) / 100;
  const packagePrice = Math.max(0, Number($("battPackagePrice").value) || 0);
  const recommendation = battRecommendation(assembly, zone, material);
  $("calcError").style.display = "none";
  $("resultsPanel").style.display = "none";
  $("resultsEmpty").style.display = "flex";
  if (gross <= 0) {
    battInsightReady = false;
    $("battInsights").hidden = true;
    return;
  }
  if (document.querySelector("[data-batt-section].has-section-error")) {
    battInsightReady = false;
    $("battInsights").hidden = true;
    $("calcError").textContent = "Each section’s excluded area must be smaller than that section’s total area.";
    $("calcError").style.display = "block";
    return;
  }
  if (!Number.isFinite(coverage) || coverage <= 0) {
    battInsightReady = false;
    $("battInsights").hidden = true;
    $("calcError").textContent = "Enter package coverage greater than zero.";
    $("calcError").style.display = "block";
    return;
  }
  const adjustedArea = net * (1 + waste);
  const unitCount = Math.ceil(adjustedArea / coverage);
  const weight = unitCount * packageWeight;
  $("units").textContent = unitCount.toLocaleString();
  $("coverage").textContent = `${decimal.format(coverage)} ft² per package · ${(waste * 100).toFixed(0)}% waste`;
  $("weightLb").textContent = `${weight.toLocaleString()} lb`;
  $("weightKg").textContent = `${(weight * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
  $("battGrossArea").textContent = `${decimal.format(gross)} ft²`;
  $("battNetArea").textContent = `${decimal.format(net)} ft²`;
  $("battAdjustedArea").textContent = `${decimal.format(adjustedArea)} ft²`;
  $("battSuggestedR").textContent = `R-${recommendation.r}`;
  $("battAssemblySummary").textContent = recommendation.note;
  $("battCost").textContent = packagePrice ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(unitCount * packagePrice) : "Add price";
  const selectedMeets = targetR >= recommendation.r;
  $("battCodeBadge").textContent = selectedMeets ? "Target met" : "Review R-value";
  $("battCodeBadge").classList.toggle("warning", !selectedMeets);
  $("battFitGuidance").innerHTML = `<strong>Cavity fit</strong><span>${$("battAssembly").selectedOptions[0].textContent}: selected R-${targetR}. Match batt thickness to the available cavity; do not compress it.</span>`;
  $("battVaporGuidance").innerHTML = `<strong>Facing and vapor control</strong><span>${battVaporMessage(assembly, zone, $("battFacing").value)}</span>`;
  $("resultsEmpty").style.display = "none";
  $("resultsPanel").style.display = "block";
  renderBattInsights();
}

function selectedControlText(id) {
  return $(id).selectedOptions?.[0]?.textContent?.trim() || $(id).value;
}

function fillPrintGrid(containerId, entries) {
  const container = $(containerId);
  container.replaceChildren(...entries.map(([label, value]) => {
    const item = document.createElement("div");
    const term = document.createElement("span");
    const detail = document.createElement("strong");
    term.textContent = label;
    detail.textContent = value || "—";
    item.append(term, detail);
    return item;
  }));
}

function prepareInsulationPrint(mode = $("blownTab").getAttribute("aria-selected") === "true" ? "blown" : "batt") {
  if (mode === "batt") calculateBatt();
  else calculateBlown();
  const resultPanel = mode === "batt" ? $("resultsPanel") : $("blownResultsPanel");
  if (getComputedStyle(resultPanel).display === "none") return false;

  const isBatt = mode === "batt";
  const title = isBatt ? "Batt Insulation Project Report" : "Blown Insulation Project Report";
  $("insulationPrintTitle").textContent = title;
  $("insulationPrintMeta").textContent = `Prepared ${new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(new Date())}`;

  if (isBatt) {
    const totals = battAreaTotals();
    const sections = document.querySelectorAll("[data-batt-section]").length;
    fillPrintGrid("insulationPrintInputs", [
      ["Material", selectedControlText("battMaterial")],
      ["Assembly", selectedControlText("battAssembly")],
      ["Climate zone", `2021 IECC Zone ${$("battClimateZone").value}`],
      ["Selected batt", selectedControlText("battTargetR")],
      ["Facing", selectedControlText("battFacing")],
      ["Measured sections", `${sections} · ${decimal.format(totals.openings)} ft² excluded`],
      ["Package coverage", `${decimal.format(Number($("battCoverage").value))} ft²`],
      ["Package weight", `${decimal.format(Number($("battPackageWeight").value))} lb`],
      ["Waste allowance", selectedControlText("battWaste")],
      ["Package price", $("battPackagePrice").value ? `$${Number($("battPackagePrice").value).toFixed(2)}` : "Not entered"]
    ]);
    fillPrintGrid("insulationPrintResults", [
      ["Packages to purchase", $("units").textContent],
      ["Suggested R-value", $("battSuggestedR").textContent],
      ["Gross area", $("battGrossArea").textContent],
      ["Net area", $("battNetArea").textContent],
      ["Area with waste", $("battAdjustedArea").textContent],
      ["Total package weight", $("weightLb").textContent],
      ["Weight in kilograms", $("weightKg").textContent],
      ["Estimated material cost", $("battCost").textContent]
    ]);
    $("insulationPrintGuidance").replaceChildren(
      Object.assign(document.createElement("p"), { textContent: $("battFitGuidance").textContent }),
      Object.assign(document.createElement("p"), { textContent: $("battVaporGuidance").textContent }),
      Object.assign(document.createElement("p"), { textContent: "Verify the locally adopted energy code, cavity depth, vapor-control assembly, and package label. Do not compress batts." })
    );
  } else {
    const existingDepth = Number($("existingDepth").value) || 0;
    fillPrintGrid("insulationPrintInputs", [
      ["Product", selectedControlText("blownProduct")],
      ["Net area", `${decimal.format(Number($("blownArea").value))} ft²`],
      ["Target R-value", selectedControlText("targetR")],
      ["Existing insulation", existingDepth ? `${decimal.format(existingDepth)} in · ${selectedControlText("existingMaterial")}` : "None entered"],
      ["Waste allowance", `${$("wasteFactor").value}%`],
      ["Price per bag", $("bagPrice").value ? `$${Number($("bagPrice").value).toFixed(2)}` : "Not entered"],
      ["Labor cost", $("laborCost").value ? `$${Number($("laborCost").value).toFixed(2)}` : "Not entered"],
      ["Climate guidance", $("climateTargetSummary").textContent]
    ]);
    fillPrintGrid("insulationPrintResults", [
      ["Bags to purchase", $("bagsRounded").textContent],
      ["Calculated bags", $("bagsExact").textContent],
      ["Blow-to depth", $("blowDepth").textContent],
      ["Settled depth", $("settledDepth").textContent],
      ["Existing insulation", $("existingR").textContent],
      ["Additional insulation", $("neededR").textContent],
      ["Manufacturer row", $("coverageRValue").textContent],
      ["Material weight", $("blownWeight").textContent],
      ["Added ceiling load", $("ceilingLoad").textContent],
      ["Planned project cost", $("plannedCost").textContent]
    ]);
    const guidance = [$("coverageNote").textContent];
    if (!$("ceilingLoadWarning").hidden) guidance.push($("ceilingLoadWarningText").textContent);
    $("insulationPrintGuidance").replaceChildren(...guidance.map((text) => Object.assign(document.createElement("p"), { textContent: text })));
  }

  document.body.classList.add("print-insulation");
  return true;
}

function restoreAfterInsulationPrint() {
  document.body.classList.remove("print-insulation");
}

function printInsulationReport(mode) {
  if (!prepareInsulationPrint(mode)) return;
  try {
    window.print();
  } finally {
    setTimeout(restoreAfterInsulationPrint, 0);
  }
}

function renumberBattSections() {
  document.querySelectorAll("[data-batt-section]").forEach((row, index, rows) => {
    const number = index + 1;
    row.querySelector(".batt-section-number").textContent = `Section ${number}`;
    row.querySelector(".batt-section-area").setAttribute("aria-label", `Section ${number} area in square feet`);
    row.querySelector(".batt-section-excluded").setAttribute("aria-label", `Section ${number} excluded area in square feet`);
    const remove = row.querySelector(".batt-remove-section");
    remove.disabled = rows.length === 1;
    remove.setAttribute("aria-label", `Remove section ${number}`);
  });
}

function addBattSection() {
  const row = document.querySelector("[data-batt-section]").cloneNode(true);
  row.querySelectorAll("input").forEach((input) => { input.value = ""; });
  row.querySelector(".batt-section-net strong").textContent = "0 ft²";
  $("battSectionRows").append(row);
  renumberBattSections();
  row.querySelector("input").focus();
  calculateBatt();
}

function battPresetData() {
  return {
    sections: [...document.querySelectorAll("[data-batt-section]")].map((row) => ({
      area: Math.max(0, Number(row.querySelector(".batt-section-area").value) || 0),
      excluded: Math.max(0, Number(row.querySelector(".batt-section-excluded").value) || 0)
    })),
    material: $("battMaterial").value,
    assembly: $("battAssembly").value,
    climateZone: Number($("battClimateZone").value),
    targetR: Number($("battTargetR").value),
    facing: $("battFacing").value,
    coverage: Number($("battCoverage").value),
    packageWeight: Number($("battPackageWeight").value),
    waste: Number($("battWaste").value),
    packagePrice: $("battPackagePrice").value === "" ? null : Number($("battPackagePrice").value)
  };
}

function validBattPreset(preset) {
  const data = preset?.data;
  return preset?.version === BATT_PRESET_VERSION
    && typeof preset.id === "string"
    && typeof preset.name === "string"
    && Array.isArray(data?.sections)
    && data.sections.length > 0
    && data.sections.every((section) => Number.isFinite(section?.area) && section.area >= 0 && Number.isFinite(section?.excluded) && section.excluded >= 0)
    && typeof data.material === "string"
    && typeof data.assembly === "string";
}

function readBattPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BATT_PRESETS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(validBattPreset) : [];
  } catch {
    return [];
  }
}

function writeBattPresets() {
  localStorage.setItem(BATT_PRESETS_STORAGE_KEY, JSON.stringify(battPresets));
}

function setBattPresetStatus(message, isError = false) {
  $("battPresetStatus").textContent = message;
  $("battPresetStatus").classList.toggle("is-error", isError);
}

function battPresetSummary(preset) {
  const sectionCount = preset.data.sections.length;
  const totalArea = preset.data.sections.reduce((total, section) => total + Math.max(0, section.area - section.excluded), 0);
  const material = preset.data.material === "mineral_wool" ? "Mineral wool" : "Fiberglass";
  return `${sectionCount} section${sectionCount === 1 ? "" : "s"} · ${decimal.format(totalArea)} ft² · ${material} · R-${preset.data.targetR}`;
}

function renderBattPresets() {
  const list = $("battPresetList");
  list.replaceChildren();
  $("battPresetCount").textContent = `${battPresets.length} preset${battPresets.length === 1 ? "" : "s"}`;
  if (!battPresets.length) {
    const empty = document.createElement("p");
    empty.className = "batt-preset-empty";
    empty.textContent = "No Batt presets saved yet.";
    list.append(empty);
    return;
  }
  battPresets.forEach((preset) => {
    const card = document.createElement("article");
    card.className = "batt-preset-card";
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = preset.name;
    const summary = document.createElement("small");
    summary.textContent = battPresetSummary(preset);
    details.append(name, summary);
    const actions = document.createElement("div");
    actions.className = "batt-preset-actions";
    const load = document.createElement("button");
    load.className = "batt-preset-load";
    load.type = "button";
    load.dataset.presetAction = "load";
    load.dataset.presetId = preset.id;
    load.textContent = "Load";
    load.setAttribute("aria-label", `Load ${preset.name}`);
    const remove = document.createElement("button");
    remove.className = "batt-preset-delete";
    remove.type = "button";
    remove.dataset.presetAction = "delete";
    remove.dataset.presetId = preset.id;
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${preset.name}`);
    actions.append(load, remove);
    card.append(details, actions);
    list.append(card);
  });
}

function saveBattPreset() {
  const name = $("battPresetName").value.trim();
  if (!name) {
    setBattPresetStatus("Enter a name before saving this preset.", true);
    $("battPresetName").focus();
    return;
  }
  const now = new Date().toISOString();
  const existingIndex = battPresets.findIndex((preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  const existing = existingIndex >= 0 ? battPresets[existingIndex] : null;
  const preset = {
    id: existing?.id || globalThis.crypto?.randomUUID?.() || `batt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    version: BATT_PRESET_VERSION,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    data: battPresetData()
  };
  if (existingIndex >= 0) battPresets.splice(existingIndex, 1);
  battPresets.unshift(preset);
  try {
    writeBattPresets();
    renderBattPresets();
    setBattPresetStatus(existing ? `Updated “${name}”.` : `Saved “${name}” on this device.`);
  } catch {
    if (existing) battPresets.splice(0, 1, existing);
    else battPresets.shift();
    renderBattPresets();
    setBattPresetStatus("This browser could not save the preset. Check local-storage permissions.", true);
  }
}

function setSelectValue(id, value) {
  const select = $(id);
  if ([...select.options].some((option) => option.value === String(value))) select.value = String(value);
}

function applyBattPreset(preset) {
  const data = preset.data;
  setSelectValue("battMaterial", data.material);
  setSelectValue("battAssembly", data.assembly);
  setSelectValue("battClimateZone", data.climateZone);
  updateBattRValues({ resetPackage: false });
  setSelectValue("battTargetR", data.targetR);
  setSelectValue("battFacing", data.facing);
  $("battCoverage").value = String(data.coverage);
  $("battPackageWeight").value = String(data.packageWeight);
  setSelectValue("battWaste", data.waste);
  $("battPackagePrice").value = data.packagePrice === null ? "" : String(data.packagePrice);

  const template = document.querySelector("[data-batt-section]");
  const rows = data.sections.map((section) => {
    const row = template.cloneNode(true);
    row.querySelector(".batt-section-area").value = String(section.area);
    row.querySelector(".batt-section-excluded").value = String(section.excluded);
    row.classList.remove("has-section-error");
    return row;
  });
  $("battSectionRows").replaceChildren(...rows);
  renumberBattSections();
  calculateBatt();
  $("battPresetName").value = preset.name;
  $("battPresetsDialog").close();
}

function deleteBattPreset(id) {
  const index = battPresets.findIndex((preset) => preset.id === id);
  if (index < 0) return;
  const [removed] = battPresets.splice(index, 1);
  try {
    writeBattPresets();
    renderBattPresets();
    setBattPresetStatus(`Deleted “${removed.name}”.`);
  } catch {
    battPresets.splice(index, 0, removed);
    renderBattPresets();
    setBattPresetStatus("This browser could not update local storage.", true);
  }
}

function openBattPresets() {
  battPresets = readBattPresets().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  renderBattPresets();
  setBattPresetStatus("Presets are saved as JSON in this browser’s local storage.");
  $("battPresetsDialog").showModal();
  $("battPresetName").focus();
}

function blownPresetData() {
  const productId = $("blownProduct").value;
  const customSelected = productId === CUSTOM_PRODUCT_ID || customProductSources.has(productId);
  return {
    productId,
    productName: coverageChart?.product_name || $("blownProduct").selectedOptions[0]?.textContent || "Blown insulation",
    area: Number($("blownArea").value),
    targetR: Number($("targetR").value),
    existingDepth: $("existingDepth").value === "" ? null : Number($("existingDepth").value),
    existingMaterial: $("existingMaterial").value,
    waste: Number($("wasteFactor").value),
    bagPrice: $("bagPrice").value === "" ? null : Number($("bagPrice").value),
    laborCost: $("laborCost").value === "" ? null : Number($("laborCost").value),
    climateZone: Number($("climateZone").value),
    customChart: customSelected && coverageChart ? coverageChart : null
  };
}

function validBlownPreset(preset) {
  const data = preset?.data;
  return preset?.version === BLOWN_PRESET_VERSION
    && typeof preset.id === "string"
    && typeof preset.name === "string"
    && typeof data?.productId === "string"
    && Number.isFinite(data.area)
    && data.area >= 0
    && Number.isFinite(data.targetR)
    && data.targetR >= 0
    && (data.existingDepth === null || (Number.isFinite(data.existingDepth) && data.existingDepth >= 0));
}

function readBlownPresets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BLOWN_PRESETS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(validBlownPreset) : [];
  } catch {
    return [];
  }
}

function writeBlownPresets() {
  localStorage.setItem(BLOWN_PRESETS_STORAGE_KEY, JSON.stringify(blownPresets));
}

function setBlownPresetStatus(message, isError = false) {
  $("blownPresetStatus").textContent = message;
  $("blownPresetStatus").classList.toggle("is-error", isError);
}

function blownPresetSummary(preset) {
  const product = preset.data.productName.replace(/^Custom\s+/, "Custom · ");
  return `${decimal.format(preset.data.area)} ft² · R-${preset.data.targetR} · ${product}`;
}

function renderBlownPresets() {
  const list = $("blownPresetList");
  list.replaceChildren();
  $("blownPresetCount").textContent = `${blownPresets.length} preset${blownPresets.length === 1 ? "" : "s"}`;
  if (!blownPresets.length) {
    const empty = document.createElement("p");
    empty.className = "batt-preset-empty";
    empty.textContent = "No Blown presets saved yet.";
    list.append(empty);
    return;
  }
  blownPresets.forEach((preset) => {
    const card = document.createElement("article");
    card.className = "batt-preset-card";
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = preset.name;
    const summary = document.createElement("small");
    summary.textContent = blownPresetSummary(preset);
    details.append(name, summary);
    const actions = document.createElement("div");
    actions.className = "batt-preset-actions";
    const load = document.createElement("button");
    load.className = "batt-preset-load";
    load.type = "button";
    load.dataset.presetAction = "load";
    load.dataset.presetId = preset.id;
    load.textContent = "Load";
    load.setAttribute("aria-label", `Load ${preset.name}`);
    const remove = document.createElement("button");
    remove.className = "batt-preset-delete";
    remove.type = "button";
    remove.dataset.presetAction = "delete";
    remove.dataset.presetId = preset.id;
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${preset.name}`);
    actions.append(load, remove);
    card.append(details, actions);
    list.append(card);
  });
}

function saveBlownPreset() {
  const name = $("blownPresetName").value.trim();
  if (!name) {
    setBlownPresetStatus("Enter a name before saving this preset.", true);
    $("blownPresetName").focus();
    return;
  }
  if (!coverageChart) {
    setBlownPresetStatus("Apply or select a valid product chart before saving.", true);
    return;
  }
  const now = new Date().toISOString();
  const existingIndex = blownPresets.findIndex((preset) => preset.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  const existing = existingIndex >= 0 ? blownPresets[existingIndex] : null;
  const preset = {
    id: existing?.id || globalThis.crypto?.randomUUID?.() || `blown-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    version: BLOWN_PRESET_VERSION,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    data: blownPresetData()
  };
  const previousPresets = [...blownPresets];
  if (existingIndex >= 0) blownPresets.splice(existingIndex, 1);
  blownPresets.unshift(preset);
  try {
    writeBlownPresets();
    renderBlownPresets();
    setBlownPresetStatus(existing ? `Updated “${name}”.` : `Saved “${name}” on this device.`);
  } catch {
    blownPresets = previousPresets;
    renderBlownPresets();
    setBlownPresetStatus("This browser could not save the preset. Check local-storage permissions.", true);
  }
}

function applyBlownPreset(preset) {
  const data = preset.data;
  if (![...$("blownProduct").options].some((option) => option.value === data.productId)) {
    setBlownPresetStatus("That preset’s product is no longer available.", true);
    return;
  }
  $("blownProduct").value = data.productId;
  try {
    if (data.customChart) {
      populateCustomFields(data.customChart);
      loadCustomChart(data.productId, data.customChart);
      $("customProductStatus").textContent = `${data.customChart.coverage.length} saved custom coverage rows loaded.`;
      $("customProductStatus").classList.add("ready");
    }
    if (!selectCoverageChart({ preserveTarget: false })) throw new Error("The saved coverage chart is unavailable.");
    setSelectValue("targetR", data.targetR);
    $("blownArea").value = String(data.area);
    $("existingDepth").value = data.existingDepth === null ? "" : String(data.existingDepth);
    setSelectValue("existingMaterial", data.existingMaterial);
    $("wasteFactor").value = String(data.waste);
    $("wasteOutput").textContent = `${data.waste}%`;
    $("bagPrice").value = data.bagPrice === null ? "" : String(data.bagPrice);
    $("laborCost").value = data.laborCost === null ? "" : String(data.laborCost);
    setSelectValue("climateZone", data.climateZone);
    updateClimateTargetControl();
    calculateBlown();
    $("blownPresetName").value = preset.name;
    $("blownPresetsDialog").close();
  } catch (error) {
    setBlownPresetStatus(error instanceof Error ? error.message : "The preset could not be loaded.", true);
  }
}

function deleteBlownPreset(id) {
  const index = blownPresets.findIndex((preset) => preset.id === id);
  if (index < 0) return;
  const [removed] = blownPresets.splice(index, 1);
  try {
    writeBlownPresets();
    renderBlownPresets();
    setBlownPresetStatus(`Deleted “${removed.name}”.`);
  } catch {
    blownPresets.splice(index, 0, removed);
    renderBlownPresets();
    setBlownPresetStatus("This browser could not update local storage.", true);
  }
}

function openBlownPresets() {
  blownPresets = readBlownPresets().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  renderBlownPresets();
  setBlownPresetStatus("Presets are saved as JSON in this browser’s local storage.");
  $("blownPresetsDialog").showModal();
  $("blownPresetName").focus();
}

function parseEngineResponse(value) {
  const result = JSON.parse(value);
  if (result.error) throw new Error(result.error);
  return result;
}

function blownInput() {
  const rawDepth = $("existingDepth").value.trim();
  return {
    area_sqft: Number($("blownArea").value),
    target_r_value: Number($("targetR").value),
    existing_depth_in: rawDepth === "" ? null : Number(rawDepth),
    existing_material: $("existingMaterial").value,
    product_id: $("blownProduct").value,
    waste_factor: Number($("wasteFactor").value) / 100
  };
}

function selectCoverageChart({ preserveTarget = true } = {}) {
  const selectedProductId = $("blownProduct").value;
  const customSelected = selectedProductId === CUSTOM_PRODUCT_ID || customProductSources.has(selectedProductId);
  $("customProductPanel").hidden = !customSelected;
  coverageChart = coverageCharts.get(selectedProductId);
  if (!coverageChart) {
    $("blownCoveragePanel").hidden = true;
    return false;
  }
  const previousTarget = preserveTarget ? Number($("targetR").value) : 49;
  $("targetR").replaceChildren(...coverageChart.coverage.map((entry) => {
    const option = document.createElement("option");
    option.value = String(entry.r_value);
    option.textContent = `R-${entry.r_value}`;
    return option;
  }));
  const availableTargets = coverageChart.coverage.map((entry) => entry.r_value);
  const selectedTarget = availableTargets.includes(previousTarget)
    ? previousTarget
    : availableTargets.reduce((nearest, value) => Math.abs(value - previousTarget) < Math.abs(nearest - previousTarget) ? value : nearest);
  $("targetR").value = String(selectedTarget);
  renderCoverageTable();
  updateClimateTargetControl();
  return true;
}

function renderCoverageTable() {
  if (!coverageChart) return;
  $("coverageTableProduct").textContent = coverageChart.product_name;
  $("coverageTableBody").replaceChildren(...coverageChart.coverage.map((entry) => {
    const row = document.createElement("tr");
    row.dataset.coverageR = String(entry.r_value);
    [
      `R-${entry.r_value}`,
      `${decimal.format(entry.installed_thickness_in)} in`,
      `${decimal.format(entry.settled_thickness_in)} in`,
      decimal.format(entry.bags_per_1000_sqft),
      `${decimal.format(1000 / entry.bags_per_1000_sqft)} ft²`
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    return row;
  }));
  $("blownCoveragePanel").hidden = false;
}

function updateClimateTargetControl() {
  const zone = Number($("climateZone").value);
  const recommended = climateTarget(zone);
  const available = coverageChart?.coverage.map((entry) => entry.r_value) || [];
  const selected = available.find((value) => value >= recommended) || available.at(-1) || recommended;
  $("climateTargetSummary").textContent = `Zone ${zone} suggests R-${recommended}`;
  $("applyClimateTarget").textContent = selected === recommended ? `Use R-${recommended}` : `Use nearest R-${selected}`;
  $("applyClimateTarget").dataset.targetR = String(selected);
  $("applyClimateTarget").disabled = !available.length;
}

function applyClimateTarget() {
  const target = $("applyClimateTarget").dataset.targetR;
  if (!target) return;
  setSelectValue("targetR", target);
  calculateBlown();
}

function customProductName(productId) {
  const sourceId = customProductSources.get(productId);
  return sourceId ? `Custom ${coverageCharts.get(sourceId).product_name}` : "Custom / User Entered";
}

function coverageRowsText(rows) {
  return rows.map((row) => [
    row.r_value,
    row.installed_thickness_in,
    row.settled_thickness_in,
    row.bags_per_1000_sqft
  ].join(", ")).join("\n");
}

function populateCustomFields(chart) {
  $("customMaterial").value = chart.material;
  $("customBagWeight").value = chart.bag_weight_lbs;
  $("customRPerInch").value = chart.r_value_per_inch;
  $("customSettlingFactor").value = chart.settling_factor;
  $("customCoverage").value = coverageRowsText(chart.coverage);
}

function loadCustomChart(productId, chart) {
  const customChart = { ...chart, product_name: customProductName(productId) };
  const loadedChart = parseEngineResponse(load_coverage_chart(JSON.stringify(customChart)));
  coverageCharts.set(productId, loadedChart);
  return loadedChart;
}

function prefillCustomProduct(productId) {
  const sourceChart = coverageCharts.get(customProductSources.get(productId));
  if (!sourceChart) return false;
  populateCustomFields(sourceChart);
  const loadedChart = loadCustomChart(productId, sourceChart);
  $("customProductStatus").textContent = `Prefilled from ${sourceChart.product_name}. Edit any value, then apply.`;
  $("customProductStatus").classList.add("ready");
  return Boolean(loadedChart);
}

function installProductCustomizers() {
  $("blownProduct").querySelectorAll('optgroup:not([label="Custom"]) option').forEach((productOption) => {
    const customId = `custom-${productOption.value}`;
    customProductSources.set(customId, productOption.value);
    const customOption = document.createElement("option");
    customOption.value = customId;
    customOption.textContent = `↳ Customize ${productOption.textContent.split(" — ")[0]}`;
    customOption.className = "customize-product-option";
    productOption.after(customOption);
  });
}

function numberFromField(id, label) {
  const value = Number($(id).value);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}

function customCoverageRows() {
  const lines = $("customCoverage").value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Enter at least one custom coverage row.");
  return lines.map((line, index) => {
    const values = line.split(",").map((value) => Number(value.trim()));
    if (values.length !== 4 || values.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error(`Coverage row ${index + 1} must contain four positive numbers separated by commas.`);
    }
    return {
      r_value: values[0],
      installed_thickness_in: values[1],
      settled_thickness_in: values[2],
      bags_per_1000_sqft: values[3]
    };
  }).sort((left, right) => left.r_value - right.r_value);
}

function applyCustomProduct() {
  $("blownError").style.display = "none";
  try {
    const productId = $("blownProduct").value;
    const chart = {
      product_name: customProductName(productId),
      material: $("customMaterial").value,
      bag_weight_lbs: numberFromField("customBagWeight", "Bag weight"),
      r_value_per_inch: numberFromField("customRPerInch", "R-value per inch"),
      settling_factor: numberFromField("customSettlingFactor", "Settling factor"),
      coverage: customCoverageRows()
    };
    const loadedChart = parseEngineResponse(load_coverage_chart(JSON.stringify(chart)));
    coverageCharts.set(productId, loadedChart);
    selectCoverageChart({ preserveTarget: false });
    $("customProductStatus").textContent = `${loadedChart.coverage.length} custom coverage row${loadedChart.coverage.length === 1 ? "" : "s"} loaded.`;
    $("customProductStatus").classList.add("ready");
    calculateBlown();
  } catch (error) {
    coverageCharts.delete($("blownProduct").value);
    coverageChart = null;
    $("customProductStatus").classList.remove("ready");
    showBlownError(error instanceof Error ? error.message : "The custom product values could not be loaded.");
  }
}

function invalidateCustomProduct() {
  const selectedProductId = $("blownProduct").value;
  coverageCharts.delete(selectedProductId);
  $("customProductStatus").textContent = "Values changed. Apply them before calculating.";
  $("customProductStatus").classList.remove("ready");
  if (selectedProductId === CUSTOM_PRODUCT_ID || customProductSources.has(selectedProductId)) {
    coverageChart = null;
    $("blownCoveragePanel").hidden = true;
    insightState = null;
    $("blownInsights").hidden = true;
  }
}

function showBlownError(message) {
  $("blownError").textContent = message;
  $("blownError").style.display = "block";
}

function prepareCanvas(id) {
  const canvas = $(id);
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(280, bounds.width);
  const height = Math.max(180, bounds.height);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { canvas, context, width, height };
}

function compactNumber(value) {
  if (value >= 1000) return `${decimal.format(value / 1000)}k`;
  return decimal.format(value);
}

function drawLineChart(id, series, { xLabel, yLabel, xFormat = compactNumber, yFormat = compactNumber } = {}) {
  const { context, width, height } = prepareCanvas(id);
  const padding = { top: 16, right: 14, bottom: 38, left: 46 };
  const points = series.flatMap((item) => item.points);
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1) * 1.08;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xAt = (value) => padding.left + value / maxX * plotWidth;
  const yAt = (value) => padding.top + plotHeight - value / maxY * plotHeight;

  context.font = "10px system-ui, sans-serif";
  context.textBaseline = "middle";
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + plotHeight * index / 4;
    const value = maxY * (1 - index / 4);
    context.strokeStyle = "rgba(183, 247, 207, 0.09)";
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillStyle = "#789085";
    context.textAlign = "right";
    context.fillText(yFormat(value), padding.left - 7, y);
  }
  for (let index = 0; index <= 4; index += 1) {
    const x = padding.left + plotWidth * index / 4;
    context.fillStyle = "#789085";
    context.textAlign = "center";
    context.fillText(xFormat(maxX * index / 4), x, height - 22);
  }

  series.forEach((item) => {
    context.strokeStyle = item.color;
    context.lineWidth = 2.5;
    context.lineJoin = "round";
    context.beginPath();
    item.points.forEach((point, index) => {
      if (index === 0) context.moveTo(xAt(point.x), yAt(point.y));
      else context.lineTo(xAt(point.x), yAt(point.y));
    });
    context.stroke();
    item.points.forEach((point) => {
      context.fillStyle = item.color;
      context.beginPath();
      context.arc(xAt(point.x), yAt(point.y), 3, 0, Math.PI * 2);
      context.fill();
    });
  });
  context.fillStyle = "#91a79c";
  context.font = "10px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(xLabel || "", padding.left + plotWidth / 2, height - 5);
  context.save();
  context.translate(9, padding.top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(yLabel || "", 0, 0);
  context.restore();
}

function drawBarChart(id, labels, values, { color = "#4ade80", yLabel = "" } = {}) {
  const { context, width, height } = prepareCanvas(id);
  const padding = { top: 19, right: 12, bottom: 34, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...values, 1) * 1.14;
  const slot = plotWidth / values.length;
  const barWidth = Math.min(46, slot * 0.58);
  context.font = "10px system-ui, sans-serif";
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + plotHeight * index / 4;
    context.strokeStyle = "rgba(183, 247, 207, 0.09)";
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillStyle = "#789085";
    context.textAlign = "right";
    context.fillText(compactNumber(maxValue * (1 - index / 4)), padding.left - 6, y + 3);
  }
  values.forEach((value, index) => {
    const barHeight = value / maxValue * plotHeight;
    const x = padding.left + slot * index + (slot - barWidth) / 2;
    const gradient = context.createLinearGradient(0, padding.top + plotHeight - barHeight, 0, padding.top + plotHeight);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(34, 197, 94, 0.25)");
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(x, padding.top + plotHeight - barHeight, barWidth, barHeight, 4);
    context.fill();
    context.fillStyle = "#c7d7ce";
    context.textAlign = "center";
    context.fillText(compactNumber(value), x + barWidth / 2, Math.max(9, padding.top + plotHeight - barHeight - 7));
    context.fillStyle = "#82988d";
    context.fillText(labels[index], x + barWidth / 2, height - 16);
  });
  if (yLabel) {
    context.save();
    context.translate(9, padding.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillStyle = "#91a79c";
    context.textAlign = "center";
    context.fillText(yLabel, 0, 0);
    context.restore();
  }
}

function drawBattInsights() {
  if (!battInsightReady || $("battInsights").hidden) return;
  const material = $("battMaterial").value;
  const targetR = Number($("battTargetR").value);
  const zone = Number($("battClimateZone").value);
  const recommendation = battRecommendation($("battAssembly").value, zone, material);
  const thicknessRows = Object.entries(BATT_THICKNESS[material]).map(([rValue, thickness]) => ({ rValue: Number(rValue), thickness }));
  drawLineChart("battThicknessChart", [{
    color: "#4ade80",
    points: thicknessRows.map((row) => ({ x: row.thickness, y: row.rValue }))
  }], { xLabel: "Batt thickness (in)", yLabel: "R-value" });

  const cavityRows = BATT_CAVITY_MAX_R[material];
  drawBarChart(
    "battCavityChart",
    cavityRows.map((row) => `${row.depth} in`),
    cavityRows.map((row) => row.r),
    { color: "#60a5fa", yLabel: "Max standard R" }
  );

  const packagePrice = Math.max(0, Number($("battPackagePrice").value) || 0);
  const costValues = BATT_R_VALUES[material].map((rValue) => {
    const product = BATT_PRODUCTS[material][rValue];
    return packagePrice ? 1000 / product.coverage * packagePrice : 0;
  });
  drawBarChart(
    "battCostStepChart",
    BATT_R_VALUES[material].map((rValue) => `R-${rValue}`),
    costValues,
    { color: "#fbbf24", yLabel: "Cost / 1,000 ft²" }
  );
  const selectedThickness = BATT_THICKNESS[material][targetR];
  $("battThicknessSummary").textContent = selectedThickness ? `R-${targetR} · ${selectedThickness} in` : `R-${targetR}`;
  const selectedCavity = cavityRows.find((row) => row.r >= targetR) || cavityRows.at(-1);
  $("battCavitySummary").textContent = `${selectedCavity.depth} in cavity · R-${selectedCavity.r}`;
  $("battInsightsMaterial").textContent = material === "mineral_wool" ? "Mineral-wool batts" : "Fiberglass batts";
  $("battClimateRecommendation").textContent = `Zone ${zone} · R-${recommendation.r}`;
  $("battClimateNote").textContent = `${recommendation.note}. The map is a planning reference; verify the locally adopted code.`;
  if (packagePrice) {
    const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    const selectedCost = costValues[BATT_R_VALUES[material].indexOf(targetR)];
    $("battCostStepSummary").textContent = `${money.format(selectedCost)} / 1,000 ft²`;
    $("battCostStepNote").textContent = `Comparison assumes the entered ${money.format(packagePrice)} price for every package; replace it with product-specific prices before purchasing.`;
  } else {
    $("battCostStepSummary").textContent = "Add price";
    $("battCostStepNote").textContent = "Enter a package price to compare cost per 1,000 ft² at the same price per package.";
  }
}

function scheduleBattInsights() {
  cancelAnimationFrame(battChartFrame);
  battChartFrame = requestAnimationFrame(drawBattInsights);
}

function renderBattInsights() {
  battInsightReady = true;
  $("battInsights").hidden = $("battTab").getAttribute("aria-selected") !== "true";
  scheduleBattInsights();
}

function drawCostChart(result) {
  const bagPrice = Math.max(0, Number($("bagPrice").value) || 0);
  const labor = Math.max(0, Number($("laborCost").value) || 0);
  const divisor = 1 + insightState.input.waste_factor;
  const baseBags = Math.ceil(result.bags_required / divisor);
  const wasteBags = Math.max(0, result.bags_required_rounded - baseBags);
  const values = [baseBags * bagPrice, labor, wasteBags * bagPrice];
  const total = values.reduce((sum, value) => sum + value, 0);
  const { context, width, height } = prepareCanvas("costChart");
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.34;
  context.lineWidth = Math.max(18, radius * 0.36);
  context.strokeStyle = "rgba(183, 247, 207, 0.08)";
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  if (total > 0) {
    let angle = -Math.PI / 2;
    ["#4ade80", "#60a5fa", "#fbbf24"].forEach((color, index) => {
      const sweep = values[index] / total * Math.PI * 2;
      context.strokeStyle = color;
      context.beginPath();
      context.arc(centerX, centerY, radius, angle, angle + sweep);
      context.stroke();
      angle += sweep;
    });
  }
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  $("costChartTotal").textContent = total ? money.format(total) : "Add price";
  $("plannedCost").textContent = total ? money.format(total) : "Add pricing";
  $("plannedCostNote").textContent = bagPrice
    ? `${result.bags_required_rounded} whole bags${labor ? " plus labor" : ""}.`
    : "Uses whole bags plus optional labor.";
}

function nearestCoverageEntry(chart, targetR) {
  return chart.coverage.reduce((nearest, entry) => Math.abs(entry.r_value - targetR) < Math.abs(nearest.r_value - targetR) ? entry : nearest);
}

function materialSummaries(targetR) {
  const groups = ["fiberglass", "cellulose", "mineral_wool"];
  return groups.map((material) => {
    const charts = [...coverageCharts.values()].filter((chart) => chart.material === material && chart.product_name !== "Custom / User Entered");
    const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      name: material === "mineral_wool" ? "Mineral" : material[0].toUpperCase() + material.slice(1),
      values: [
        average(charts.map((chart) => chart.r_value_per_inch)),
        average(charts.map((chart) => (1 - 1 / chart.settling_factor) * 100)),
        average(charts.map((chart) => chart.bag_weight_lbs)),
        average(charts.map((chart) => 1000 / nearestCoverageEntry(chart, targetR).bags_per_1000_sqft))
      ]
    };
  });
}

function drawMaterialChart(targetR) {
  const { context, width, height } = prepareCanvas("materialChart");
  const summaries = materialSummaries(targetR);
  const colors = ["#4ade80", "#60a5fa", "#fbbf24", "#c084fc"];
  const metricMax = [0, 1, 2, 3].map((metric) => Math.max(...summaries.map((item) => item.values[metric]), 1));
  const padding = { top: 24, right: 12, bottom: 35, left: 32 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  for (let index = 0; index <= 4; index += 1) {
    const y = padding.top + plotHeight * index / 4;
    context.strokeStyle = "rgba(183, 247, 207, 0.09)";
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }
  const groupWidth = plotWidth / summaries.length;
  const barWidth = Math.min(17, groupWidth / 5.2);
  summaries.forEach((summary, groupIndex) => {
    const startX = padding.left + groupIndex * groupWidth + (groupWidth - barWidth * 4 - 9) / 2;
    summary.values.forEach((value, metricIndex) => {
      const normalized = value / metricMax[metricIndex];
      const barHeight = normalized * plotHeight * 0.82;
      const x = startX + metricIndex * (barWidth + 3);
      context.fillStyle = colors[metricIndex];
      context.fillRect(x, padding.top + plotHeight - barHeight, barWidth, barHeight);
      context.fillStyle = "#c7d7ce";
      context.font = "9px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(decimal.format(value), x + barWidth / 2, padding.top + plotHeight - barHeight - 5);
    });
    context.fillStyle = "#82988d";
    context.font = "10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(summary.name, padding.left + groupWidth * (groupIndex + 0.5), height - 15);
  });
}

function climateTarget(zone) {
  if (zone === 1) return 30;
  if (zone === 2 || zone === 3) return 49;
  return 60;
}

function drawGauge(input, result) {
  const zone = Number($("climateZone").value);
  const codeR = climateTarget(zone);
  const existingDepth = input.existing_depth_in || 0;
  const finalDepth = existingDepth + result.installed_thickness_in;
  const codeEntry = coverageChart.coverage.find((entry) => entry.r_value >= codeR) || coverageChart.coverage.at(-1);
  const codeDepth = codeEntry.installed_thickness_in;
  const maxDepth = Math.max(finalDepth, codeDepth, 1) * 1.12;
  $("gaugeExisting").style.height = `${existingDepth / maxDepth * 100}%`;
  $("gaugeAdded").style.height = `${result.installed_thickness_in / maxDepth * 100}%`;
  $("gaugeCodeMarker").style.bottom = `${Math.min(96, codeDepth / maxDepth * 100)}%`;
  $("gaugeCodeLabel").textContent = `Zone ${zone}: ${decimal.format(codeDepth)} in (R-${codeR})`;
  $("gaugeTotal").textContent = `${decimal.format(finalDepth)} in final`;
  $("gaugeScale").textContent = `${decimal.format(maxDepth)} in\n\n\n\n0 in`;
  $("gaugeScale").style.whiteSpace = "pre";
  $("climateRecommendation").textContent = `Zone ${zone} · R-${codeR}`;
}

function drawInsights() {
  if (!insightState || !coverageChart || $("blownInsights").hidden) return;
  const { input, result } = insightState;
  const rows = coverageChart.coverage;
  drawLineChart("depthRChart", [{ color: "#4ade80", points: rows.map((row) => ({ x: row.installed_thickness_in, y: row.r_value })) }], { xLabel: "Installed depth (in)", yLabel: "R-value" });
  drawLineChart("settlingChart", [
    { color: "#4ade80", points: rows.map((row) => ({ x: row.r_value, y: row.installed_thickness_in })) },
    { color: "#60a5fa", points: rows.map((row) => ({ x: row.r_value, y: row.settled_thickness_in })) }
  ], { xLabel: "R-value", yLabel: "Depth (in)" });
  const matchedEntry = rows.find((row) => Math.abs(row.r_value - result.coverage_r_value) < 0.01) || rows.at(-1);
  const areaStep = Math.max(250, Math.ceil(Math.max(input.area_sqft, 1000) / 4 / 250) * 250);
  const areas = [1, 2, 3, 4].map((step) => areaStep * step);
  const bagValues = areas.map((area) => Math.ceil(area / 1000 * matchedEntry.bags_per_1000_sqft * (1 + input.waste_factor)));
  drawBarChart("bagAreaChart", areas.map((area) => compactNumber(area)), bagValues, { yLabel: "Bags" });
  drawCostChart(result);
  drawLineChart("coverageChartCanvas", [{ color: "#c084fc", points: rows.map((row) => ({ x: row.r_value, y: row.bags_per_1000_sqft })) }], { xLabel: "R-value", yLabel: "Bags / 1,000 ft²" });
  drawMaterialChart(input.target_r_value);
  const currentR = Math.max(result.r_existing, 1);
  const targetHeat = Math.min(100, currentR / Math.max(input.target_r_value, 1) * 100);
  $("currentHeatBar").style.width = "100%";
  $("targetHeatBar").style.width = `${Math.max(2, targetHeat)}%`;
  $("currentHeatValue").textContent = "100%";
  $("targetHeatValue").textContent = `${decimal.format(targetHeat)}%`;
  drawGauge(input, result);
  const baseBags = result.bags_required / (1 + input.waste_factor);
  const wasteValues = [0, 5, 10].map((waste) => Math.ceil(baseBags * (1 + waste / 100)));
  drawBarChart("wasteChart", ["0%", "5%", "10%"], wasteValues, { color: "#fbbf24", yLabel: "Whole bags" });
  $("depthCurveSummary").textContent = `R-${input.target_r_value}: ${decimal.format(result.installed_thickness_in)} in added`;
  $("bagAreaSummary").textContent = `${decimal.format(matchedEntry.bags_per_1000_sqft)} bags per 1,000 ft² before waste.`;
  $("wasteSummary").textContent = `${wasteValues[0]}–${wasteValues[2]} bags`;
}

function scheduleInsights() {
  cancelAnimationFrame(chartFrame);
  chartFrame = requestAnimationFrame(drawInsights);
}

function renderInsights(input, result) {
  insightState = { input, result };
  $("blownInsights").hidden = $("blownTab").getAttribute("aria-selected") !== "true";
  $("insightsProduct").textContent = coverageChart.product_name;
  scheduleInsights();
}

function renderBlownResult(input, result) {
  const totalWeight = result.bags_required_rounded * coverageChart.bag_weight_lbs;
  const finalR = result.r_existing + result.r_needed;
  $("bagsRounded").textContent = result.bags_required_rounded.toLocaleString();
  $("bagsExact").textContent = `${decimal.format(result.bags_required)} calculated bags with waste`;
  $("blowDepth").textContent = `${decimal.format(result.blow_to_thickness_in)} in`;
  $("settledDepth").textContent = `${decimal.format(result.settled_thickness_in)} in after settling`;
  $("installedDepth").textContent = `${decimal.format(result.installed_thickness_in)} in`;
  $("existingR").textContent = `R-${decimal.format(result.r_existing)}`;
  $("neededR").textContent = `R-${decimal.format(result.r_needed)}`;
  $("coverageRValue").textContent = result.coverage_r_value ? `R-${decimal.format(result.coverage_r_value)}` : "Not needed";
  $("blownWeight").textContent = `${totalWeight.toLocaleString()} lb`;
  $("ceilingLoad").textContent = `${decimal.format(result.ceiling_load_psf)} lb/ft²`;
  $("depthFill").style.width = `${Math.min(100, result.blow_to_thickness_in / 20 * 100)}%`;
  $("complianceBadge").textContent = finalR + 0.01 >= input.target_r_value ? "Target R-value met" : "Review target";
  $("complianceBadge").classList.toggle("warning", finalR + 0.01 < input.target_r_value);
  const steppedUp = result.coverage_r_value > result.r_needed + 0.01;
  $("coverageNote").textContent = result.r_needed === 0
    ? "The entered existing insulation already meets or exceeds the selected target."
    : `${coverageChart.product_name} · ${steppedUp ? `R-${decimal.format(result.r_needed)} needed, so the next published R-${decimal.format(result.coverage_r_value)} row controls bags and depth` : `published R-${decimal.format(result.coverage_r_value)} row controls bags and depth`} · ${(input.waste_factor * 100).toFixed(0)}% waste allowance.`;
  const reviewCeilingLoad = result.ceiling_load_psf > 1.3;
  $("ceilingLoadWarning").hidden = !reviewCeilingLoad;
  $("ceilingLoadWarningText").textContent = reviewCeilingLoad
    ? `${decimal.format(result.ceiling_load_psf)} lb/ft² exceeds USG's 1.3 lb/ft² sag-prevention recommendation for unsupported insulation over standard 1/2-inch gypsum panels on framing 24 inches on center. This is not a universal code or structural limit. Verify the ceiling-board product, thickness, orientation, framing spacing, fasteners, finish, manufacturer instructions, and locally adopted code before installation.`
    : "";
  document.querySelectorAll("#coverageTableBody tr").forEach((row) => {
    row.classList.toggle("is-active", Math.abs(Number(row.dataset.coverageR) - result.coverage_r_value) < 0.01);
  });
  $("blownResultsEmpty").style.display = "none";
  $("blownResultsPanel").style.display = "block";
  renderInsights(input, result);
}

function normalizeChartDrivenResult(input, result) {
  if (Number.isFinite(result.coverage_r_value) && Number.isFinite(result.ceiling_load_psf)) return result;
  const entry = result.r_needed > 0
    ? coverageChart.coverage.find((row) => row.r_value + 0.001 >= result.r_needed)
    : null;
  if (result.r_needed > 0 && !entry) throw new Error(`${coverageChart.product_name} does not include the required R-value range.`);
  const bags = entry
    ? input.area_sqft / 1000 * entry.bags_per_1000_sqft * (1 + input.waste_factor)
    : 0;
  return {
    ...result,
    coverage_r_value: entry?.r_value || 0,
    installed_thickness_in: entry?.installed_thickness_in || 0,
    settled_thickness_in: entry?.settled_thickness_in || 0,
    blow_to_thickness_in: entry?.installed_thickness_in || 0,
    bags_required: Math.round(bags * 100) / 100,
    bags_required_rounded: Math.ceil(bags),
    ceiling_load_psf: entry ? Math.round(entry.bags_per_1000_sqft * coverageChart.bag_weight_lbs / 10) / 100 : 0
  };
}

function calculateBlown(event) {
  event?.preventDefault();
  $("blownError").style.display = "none";
  try {
    const input = blownInput();
    const result = normalizeChartDrivenResult(input, parseEngineResponse(calculate(JSON.stringify(input))));
    renderBlownResult(input, result);
  } catch (error) {
    insightState = null;
    $("blownResultsPanel").style.display = "none";
    $("blownResultsEmpty").style.display = "flex";
    $("blownInsights").hidden = true;
    showBlownError(error instanceof Error ? error.message : "The blown-insulation calculation could not be completed.");
  }
}

function scheduleBlownCalculation() {
  if (!coverageChart) return;
  cancelAnimationFrame(calculationFrame);
  calculationFrame = requestAnimationFrame(() => calculateBlown());
}

function positiveAreaField(id, fallback = 0) {
  const value = Number($(id).value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function updateAreaCalculator() {
  const length = positiveAreaField("areaLength");
  const width = positiveAreaField("areaWidth");
  const quantity = Math.max(1, Math.floor(positiveAreaField("areaQuantity", 1)));
  const battSectionMode = areaDestinationInput?.classList.contains("batt-section-area");
  const exclusions = battSectionMode ? 0 : Math.max(0, Number($("areaExclusions").value) || 0);
  const grossArea = length * width * quantity;
  calculatedArea = Math.max(0, grossArea - exclusions);
  $("areaCalculatorTotal").textContent = `${decimal.format(calculatedArea)} ft²`;
  $("useCalculatedArea").disabled = calculatedArea <= 0;
  if (!length || !width) {
    $("areaCalculatorBreakdown").textContent = "Enter a length and width to calculate area.";
  } else if (exclusions >= grossArea) {
    $("areaCalculatorBreakdown").textContent = "Openings must be smaller than the gross section area.";
  } else {
    $("areaCalculatorBreakdown").textContent = `${decimal.format(length)} × ${decimal.format(width)} × ${quantity}${exclusions ? ` − ${decimal.format(exclusions)}` : ""} = ${decimal.format(calculatedArea)} ft²`;
  }
}

function openAreaCalculator(destinationInput = $("blownArea")) {
  areaDestinationInput = destinationInput;
  const battSectionMode = destinationInput.classList.contains("batt-section-area");
  $("areaExclusionsGroup").hidden = battSectionMode;
  $("areaDialogDescription").textContent = battSectionMode
    ? "Calculate this section’s gross area. Enter exclusions in the section after applying."
    : "Enter one rectangular section and the number of matching sections.";
  $("areaCalculatorFormula").textContent = battSectionMode
    ? "Length × width × matching sections"
    : "Length × width × sections − openings";
  updateAreaCalculator();
  $("areaCalculatorDialog").showModal();
  $("areaLength").focus();
}

function closeAreaCalculator() {
  $("areaCalculatorDialog").close();
}

function useCalculatedArea() {
  if (calculatedArea <= 0 || !areaDestinationInput) return;
  areaDestinationInput.value = String(Number(calculatedArea.toFixed(2)));
  const battSectionMode = areaDestinationInput.classList.contains("batt-section-area");
  closeAreaCalculator();
  if (battSectionMode) calculateBatt();
  else scheduleBlownCalculation();
}

async function startBlownEngine() {
  try {
    await initBlownEngine({ module_or_path: "/assets/wasm/blown-insulation/blown_insulation_engine_bg.wasm?v=20260812-chart-engine-2" });
    const charts = await Promise.all(CHART_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw new Error("A manufacturer coverage chart could not be loaded.");
      return parseEngineResponse(load_coverage_chart(await response.text()));
    }));
    charts.forEach((chart) => coverageCharts.set(chart.product_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), chart));
    installProductCustomizers();
    selectCoverageChart({ preserveTarget: false });
    const publishedRValues = charts.flatMap((chart) => chart.coverage.map((entry) => entry.r_value));
    $("engineStatus").textContent = `${charts.length} manufacturer charts loaded · R-${Math.min(...publishedRValues)} to R-${Math.max(...publishedRValues)}`;
    $("engineStatus").classList.add("ready");
    $("blownProduct").disabled = false;
    calculateBlown();
  } catch (error) {
    $("engineStatus").textContent = error instanceof Error ? error.message : "The blown-insulation engine is unavailable.";
    $("engineStatus").classList.add("failed");
    showBlownError("Blown-insulation calculations are temporarily unavailable.");
  }
}

bindTabs();
updateBattRValues();
calculateBatt();
$("battForm").addEventListener("submit", (event) => event.preventDefault());
$("battForm").addEventListener("input", calculateBatt);
$("battForm").addEventListener("change", calculateBatt);
$("addBattSection").addEventListener("click", addBattSection);
$("battSectionRows").addEventListener("click", (event) => {
  const areaHelper = event.target.closest(".batt-area-helper");
  if (areaHelper) {
    openAreaCalculator(areaHelper.closest("[data-batt-section]").querySelector(".batt-section-area"));
    return;
  }
  const removeButton = event.target.closest(".batt-remove-section");
  if (!removeButton || removeButton.disabled) return;
  removeButton.closest("[data-batt-section]").remove();
  renumberBattSections();
  calculateBatt();
});
[$("battMaterial"), $("battAssembly"), $("battClimateZone")].forEach((control) => {
  control.addEventListener("change", () => {
    updateBattRValues();
    calculateBatt();
  });
});
$("battTargetR").addEventListener("change", () => {
  updateBattPackageDefaults();
  calculateBatt();
});
$("manageBattPresets").addEventListener("click", openBattPresets);
$("printBattResults").addEventListener("click", () => printInsulationReport("batt"));
$("closeBattPresets").addEventListener("click", () => $("battPresetsDialog").close());
$("saveBattPreset").addEventListener("click", saveBattPreset);
$("battPresetName").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveBattPreset();
  }
});
$("battPresetList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-preset-action]");
  if (!button) return;
  const preset = battPresets.find((item) => item.id === button.dataset.presetId);
  if (button.dataset.presetAction === "load" && preset) applyBattPreset(preset);
  if (button.dataset.presetAction === "delete") deleteBattPreset(button.dataset.presetId);
});
$("battPresetsDialog").addEventListener("click", (event) => {
  if (event.target === $("battPresetsDialog")) $("battPresetsDialog").close();
});
$("manageBlownPresets").addEventListener("click", openBlownPresets);
$("printBlownResults").addEventListener("click", () => printInsulationReport("blown"));
$("closeBlownPresets").addEventListener("click", () => $("blownPresetsDialog").close());
$("saveBlownPreset").addEventListener("click", saveBlownPreset);
$("blownPresetName").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveBlownPreset();
  }
});
$("blownPresetList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-preset-action]");
  if (!button) return;
  const preset = blownPresets.find((item) => item.id === button.dataset.presetId);
  if (button.dataset.presetAction === "load" && preset) applyBlownPreset(preset);
  if (button.dataset.presetAction === "delete") deleteBlownPreset(button.dataset.presetId);
});
$("blownPresetsDialog").addEventListener("click", (event) => {
  if (event.target === $("blownPresetsDialog")) $("blownPresetsDialog").close();
});
$("blownForm").addEventListener("submit", (event) => {
  event.preventDefault();
  scheduleBlownCalculation();
});
$("blownForm").addEventListener("input", (event) => {
  if (REALTIME_CONTROL_IDS.has(event.target.id)) scheduleBlownCalculation();
});
$("blownForm").addEventListener("change", (event) => {
  if (REALTIME_CONTROL_IDS.has(event.target.id)) scheduleBlownCalculation();
});
$("blownProduct").addEventListener("change", () => {
  if (customProductSources.has($("blownProduct").value)) prefillCustomProduct($("blownProduct").value);
  if (selectCoverageChart()) calculateBlown();
  else {
    insightState = null;
    $("blownResultsPanel").style.display = "none";
    $("blownResultsEmpty").style.display = "flex";
    $("blownInsights").hidden = true;
  }
});
$("customApplyButton").addEventListener("click", applyCustomProduct);
$("customProductPanel").addEventListener("input", invalidateCustomProduct);
$("wasteFactor").addEventListener("input", () => {
  $("wasteOutput").textContent = `${$("wasteFactor").value}%`;
  scheduleBlownCalculation();
});
$("bagPrice").addEventListener("input", scheduleInsights);
$("laborCost").addEventListener("input", scheduleInsights);
$("climateZone").addEventListener("change", () => {
  updateClimateTargetControl();
  scheduleInsights();
});
$("applyClimateTarget").addEventListener("click", applyClimateTarget);
window.addEventListener("resize", () => {
  scheduleInsights();
  scheduleBattInsights();
}, { passive: true });
window.addEventListener("beforeprint", () => {
  if (!document.body.classList.contains("print-insulation")) prepareInsulationPrint();
});
window.addEventListener("afterprint", restoreAfterInsulationPrint);
$("openAreaCalculator").addEventListener("click", () => openAreaCalculator($("blownArea")));
$("closeAreaCalculator").addEventListener("click", closeAreaCalculator);
$("cancelAreaCalculator").addEventListener("click", closeAreaCalculator);
$("useCalculatedArea").addEventListener("click", useCalculatedArea);
$("areaCalculatorDialog").addEventListener("input", updateAreaCalculator);
$("areaCalculatorDialog").addEventListener("click", (event) => {
  if (event.target === $("areaCalculatorDialog")) closeAreaCalculator();
});
startBlownEngine();
