/* MonkeyTactics.com — Unit Converter: data and pure conversion helpers. */
const unit = (label, toBase, system = "other") => ({ label, toBase, system });

export const CATEGORIES = {
  length: { label: "Length", units: {
    mm: unit("Millimetre (mm)", 1e-3, "metric"), cm: unit("Centimetre (cm)", 1e-2, "metric"), m: unit("Metre (m)", 1, "metric"), km: unit("Kilometre (km)", 1e3, "metric"),
    in: unit("Inch (in)", 0.0254, "us"), ft: unit("Foot (ft)", 0.3048, "us"), yd: unit("Yard (yd)", 0.9144, "us"), mi: unit("Mile (mi)", 1609.344, "us"), nmi: unit("Nautical mile (nmi)", 1852),
  }},
  area: { label: "Area", units: {
    mm2: unit("Square millimetre (mm²)", 1e-6, "metric"), cm2: unit("Square centimetre (cm²)", 1e-4, "metric"), m2: unit("Square metre (m²)", 1, "metric"), ha: unit("Hectare (ha)", 1e4, "metric"), km2: unit("Square kilometre (km²)", 1e6, "metric"),
    in2: unit("Square inch (in²)", 0.00064516, "us"), ft2: unit("Square foot (ft²)", 0.09290304, "us"), yd2: unit("Square yard (yd²)", 0.83612736, "us"), acre: unit("Acre", 4046.8564224, "us"), mi2: unit("Square mile (mi²)", 2589988.110336, "us"),
  }},
  weight: { label: "Mass / Weight", units: {
    mg: unit("Milligram (mg)", 1e-6, "metric"), g: unit("Gram (g)", 1e-3, "metric"), kg: unit("Kilogram (kg)", 1, "metric"), t: unit("Metric tonne (t)", 1e3, "metric"),
    oz: unit("Ounce (oz)", 0.028349523125, "us"), lb: unit("Pound (lb)", 0.45359237, "us"), st: unit("Stone (st)", 6.35029318, "imperial"), ust: unit("US short ton", 907.18474, "us"),
  }},
  temperature: { label: "Temperature", units: { c: { label: "Celsius (°C)" }, f: { label: "Fahrenheit (°F)" }, k: { label: "Kelvin (K)" } } },
  volume: { label: "Volume", units: {
    ml: unit("Millilitre (mL)", 1e-3, "metric"), l: unit("Litre (L)", 1, "metric"), m3: unit("Cubic metre (m³)", 1e3, "metric"),
    ustsp: unit("US teaspoon (tsp)", 0.00492892159375, "us"), ustbsp: unit("US tablespoon (tbsp)", 0.01478676478125, "us"), uscup: unit("US cup", 0.2365882365, "us"), usfloz: unit("US fluid ounce (fl oz)", 0.0295735295625, "us"), uspt: unit("US pint (pt)", 0.473176473, "us"), usqt: unit("US quart (qt)", 0.946352946, "us"), usgal: unit("US gallon (gal)", 3.785411784, "us"),
    imptsp: unit("Imperial teaspoon", 0.00591938802083333, "imperial"), imptbsp: unit("Imperial tablespoon", 0.0177581640625, "imperial"), impfloz: unit("Imperial fluid ounce", 0.0284130625, "imperial"), imppt: unit("Imperial pint", 0.56826125, "imperial"), impgal: unit("Imperial gallon", 4.54609, "imperial"),
  }},
  speed: { label: "Speed", units: {
    mps: unit("Metres per second (m/s)", 1, "metric"), kmh: unit("Kilometres per hour (km/h)", 1 / 3.6, "metric"), mph: unit("Miles per hour (mph)", 0.44704, "us"), knot: unit("Knot (kn)", 1852 / 3600), fps: unit("Feet per second (ft/s)", 0.3048, "us"),
  }},
  pressure: { label: "Pressure", units: {
    pa: unit("Pascal (Pa)", 1, "metric"), kpa: unit("Kilopascal (kPa)", 1e3, "metric"), mpa: unit("Megapascal (MPa)", 1e6, "metric"), bar: unit("Bar", 1e5, "metric"), atm: unit("Standard atmosphere (atm)", 101325), psi: unit("Pounds per square inch (psi)", 6894.757293168, "us"), mmhg: unit("Millimetres of mercury (mmHg)", 133.322387415),
  }},
  energy: { label: "Energy", units: {
    j: unit("Joule (J)", 1, "metric"), kj: unit("Kilojoule (kJ)", 1e3, "metric"), cal: unit("Calorie (cal)", 4.184, "metric"), kcal: unit("Kilocalorie / food Calorie", 4184, "metric"), wh: unit("Watt-hour (Wh)", 3600), kwh: unit("Kilowatt-hour (kWh)", 3.6e6), btu: unit("BTU (International Table)", 1055.05585262, "us"), ftlb: unit("Foot-pound (ft⋅lb)", 1.3558179483314, "us"),
  }},
  power: { label: "Power", units: {
    w: unit("Watt (W)", 1, "metric"), kw: unit("Kilowatt (kW)", 1e3, "metric"), mw: unit("Megawatt (MW)", 1e6, "metric"), hp: unit("Mechanical horsepower (hp)", 745.6998715822702, "us"), metricHp: unit("Metric horsepower (PS)", 735.49875, "metric"), btuhr: unit("BTU per hour", 0.2930710701722222, "us"),
  }},
  data: { label: "Data Storage", units: {
    bit: unit("Bit (bit)", 0.125), B: unit("Byte (B)", 1), kB: unit("Kilobyte (kB)", 1e3), MB: unit("Megabyte (MB)", 1e6), GB: unit("Gigabyte (GB)", 1e9), TB: unit("Terabyte (TB)", 1e12), KiB: unit("Kibibyte (KiB)", 1024), MiB: unit("Mebibyte (MiB)", 1048576), GiB: unit("Gibibyte (GiB)", 1073741824), TiB: unit("Tebibyte (TiB)", 1099511627776),
  }},
  time: { label: "Time", units: {
    ms: unit("Millisecond (ms)", 0.001), s: unit("Second (s)", 1), min: unit("Minute (min)", 60), hr: unit("Hour (hr)", 3600), day: unit("Day", 86400), week: unit("Week", 604800), year: unit("Average Gregorian year", 31556952),
  }},
  angle: { label: "Angle", units: {
    deg: unit("Degree (°)", Math.PI / 180), rad: unit("Radian (rad)", 1), grad: unit("Gradian (gon)", Math.PI / 200), turn: unit("Turn", Math.PI * 2), arcmin: unit("Arcminute", Math.PI / 10800), arcsec: unit("Arcsecond", Math.PI / 648000),
  }},
  torque: { label: "Torque", units: {
    nm: unit("Newton-metre (N⋅m)", 1, "metric"), kgfm: unit("Kilogram-force metre", 9.80665, "metric"), lbfft: unit("Pound-force foot (lb⋅ft)", 1.3558179483314, "us"), lbfin: unit("Pound-force inch (lb⋅in)", 0.1129848290276167, "us"),
  }},
  density: { label: "Density", units: {
    kgm3: unit("Kilogram per cubic metre (kg/m³)", 1, "metric"), gcm3: unit("Gram per cubic centimetre (g/cm³)", 1000, "metric"),
    gml: unit("Gram per millilitre (g/mL)", 1000, "metric"), lbft3: unit("Pound per cubic foot (lb/ft³)", 16.0184633739601, "us"),
    lbin3: unit("Pound per cubic inch (lb/in³)", 27679.904710191, "us"),
  }},
  fuel: { label: "Fuel Economy", reciprocal: true, units: {
    l100km: { label: "Litres per 100 km (L/100 km)", system: "metric" }, kml: { label: "Kilometres per litre (km/L)", system: "metric" },
    mpgus: { label: "Miles per US gallon (MPG US)", system: "us" }, mpgimp: { label: "Miles per Imperial gallon (MPG UK)", system: "imperial" },
  }},
};

export function convert(value, categoryKey, fromUnit, toUnit) {
  validateNum(value, "value");
  const cat = CATEGORIES[categoryKey];
  if (!cat) throw new Error(`Unknown category "${categoryKey}".`);
  if (!cat.units[fromUnit] || !cat.units[toUnit]) throw new Error("Unknown unit.");
  if (categoryKey === "temperature") {
    const celsius = toCelsius(value, fromUnit);
    if (celsius < -273.15) throw new Error("Temperature cannot be below absolute zero.");
    return fromCelsius(celsius, toUnit);
  }
  if (categoryKey === "fuel") return convertFuel(value, fromUnit, toUnit);
  return value * cat.units[fromUnit].toBase / cat.units[toUnit].toBase;
}

export function parseMeasurement(raw) {
  const text = String(raw).trim().replaceAll(",", "");
  if (!text) return NaN;
  const feetInches = text.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:'|ft)\s*(\d+(?:\.\d+)?)?\s*(?:"|in)?$/i);
  if (feetInches) return Number(feetInches[1]) + Math.sign(Number(feetInches[1]) || 1) * Number(feetInches[2] || 0) / 12;
  const mixed = text.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed && Number(mixed[3])) return Number(mixed[1]) + Math.sign(Number(mixed[1]) || 1) * Number(mixed[2]) / Number(mixed[3]);
  const fraction = text.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);
  if (fraction && Number(fraction[2])) return Number(fraction[1]) / Number(fraction[2]);
  return Number(text);
}

export function parseCompoundMeasurement(raw, categoryKey, fallbackUnit) {
  const plain = parseMeasurement(raw);
  if (Number.isFinite(plain)) return plain;
  const cat = CATEGORIES[categoryKey];
  if (!cat || cat.reciprocal || categoryKey === "temperature") return NaN;
  const aliases = new Map();
  for (const [key, def] of Object.entries(cat.units)) {
    aliases.set(key.toLowerCase(), key);
    const symbol = def.label.match(/\(([^)]+)\)/)?.[1];
    if (symbol) aliases.set(symbol.toLowerCase().replaceAll(" ", ""), key);
  }
  const terms = String(raw).trim().replaceAll(",", "").match(/[+-]?\s*\d*\.?\d+(?:e[+-]?\d+)?\s*[a-zA-Z²³⋅/]+/g);
  if (!terms || terms.join("").replaceAll(/\s/g, "") !== String(raw).trim().replaceAll(/[,\s]/g, "")) return NaN;
  let totalInFallback = 0;
  for (const term of terms) {
    const match = term.match(/^([+-]?\s*\d*\.?\d+(?:e[+-]?\d+)?)\s*([a-zA-Z²³⋅/]+)$/i);
    const unitKey = match && aliases.get(match[2].toLowerCase().replaceAll(" ", ""));
    if (!unitKey) return NaN;
    totalInFallback += convert(Number(match[1].replaceAll(" ", "")), categoryKey, unitKey, fallbackUnit);
  }
  return totalInFallback;
}

export function formatNumber(value, locale) {
  if (!Number.isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude < 1e-6 || magnitude >= 1e12)) return value.toExponential(8).replace(/\.?(0+)e/, "e");
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 12 }).format(value);
}

export function buildConversionTable(start, end, step, categoryKey, fromUnit, toUnit, maxRows = 500) {
  [start, end, step].forEach((value, index) => validateNum(value, ["start", "end", "step"][index]));
  if (step === 0) throw new Error("Step must not be zero.");
  if ((end - start) * step < 0) throw new Error("Step must move from the start value toward the end value.");
  const rowCount = Math.floor(Math.abs((end - start) / step) + 1e-10) + 1;
  if (rowCount > maxRows) throw new Error(`Limit the table to ${maxRows} rows or fewer.`);
  return Array.from({ length: rowCount }, (_, index) => {
    const source = start + step * index;
    return { source, result: convert(source, categoryKey, fromUnit, toUnit) };
  });
}

function toCelsius(v, key) {
  if (key === "c") return v;
  if (key === "f") return (v - 32) * 5 / 9;
  if (key === "k") return v - 273.15;
  throw new Error("Unknown temperature unit.");
}
function fromCelsius(c, key) {
  if (key === "c") return c;
  if (key === "f") return c * 9 / 5 + 32;
  if (key === "k") return c + 273.15;
  throw new Error("Unknown temperature unit.");
}
function validateNum(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
}

function convertFuel(value, fromUnit, toUnit) {
  if (value <= 0) throw new Error("Fuel-economy values must be greater than zero.");
  const toLitresPer100km = {
    l100km: v => v,
    kml: v => 100 / v,
    mpgus: v => 235.214583 / v,
    mpgimp: v => 282.480936 / v,
  };
  const fromLitresPer100km = {
    l100km: v => v,
    kml: v => 100 / v,
    mpgus: v => 235.214583 / v,
    mpgimp: v => 282.480936 / v,
  };
  return fromLitresPer100km[toUnit](toLitresPer100km[fromUnit](value));
}

/* Browser controller. Kept with the conversion core so one established asset boots the tool. */
if (typeof document !== "undefined") {

  const STORAGE_KEY = "mt-unit-converter-pairs-v1";
  const SYSTEM_LABELS = { metric: "Metric", us: "US customary", imperial: "Imperial", other: "Other / scientific" };
  const CATEGORY_ICONS = { length: "📏", area: "◻️", weight: "⚖️", temperature: "🌡️", volume: "🧪", speed: "🏎️", pressure: "🧭", energy: "⚡", power: "💡", data: "💾", time: "⏱️", angle: "📐", torque: "🔧", density: "🧱", fuel: "⛽" };
  const $ = id => document.getElementById(id);
  const els = {
    category: $("category"), categoryQuick: $("categoryQuick"), fromValue: $("from-value"), fromUnit: $("from-unit"), toValue: $("to-value"), toUnit: $("to-unit"),
    fromSearch: $("from-unit-search"), toSearch: $("to-unit-search"), fromOptions: $("from-unit-options"), toOptions: $("to-unit-options"), swap: $("swapBtn"), error: $("calcError"), result: $("resValue"),
    formula: $("resFormula"), equivalents: $("equivalentsList"), share: $("shareLine"), copyLink: $("copyLinkBtn"), copyConfirm: $("copyConfirm"),
    copyResult: $("copyResultBtn"), copyRaw: $("copyRawBtn"), clear: $("clearBtn"), favorite: $("favoriteBtn"), savedPairs: $("savedPairs"), pairChips: $("pairChips"),
    precision: $("precisionSelect"), notation: $("notationSelect"), historyList: $("historyList"), historyCount: $("historyCount"),
    clearHistory: $("clearHistoryBtn"), historyConfirm: $("historyConfirm"), confirmClearHistory: $("confirmClearHistoryBtn"),
    tablePanel: $("conversionTablePanel"), tableStart: $("tableStart"), tableEnd: $("tableEnd"), tableStep: $("tableStep"),
    generateTable: $("generateTableBtn"), copyTable: $("copyTableBtn"), downloadTable: $("downloadTableBtn"), tableHint: $("tableHint"),
    tableWrap: $("conversionTableWrap"), tableBody: $("conversionTableBody"), tableFromHeading: $("tableFromHeading"), tableToHeading: $("tableToHeading"), tableStatus: $("tableStatus"),
  };
  let lastEdited = "from";
  let currentEquation = "";
  let currentRawResult = NaN;
  let suppressHistory = false;
  let tableText = "";
  let tableCsv = "";
  let tableSignature = "";
  let state = loadPairState();

  function loadPairState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return {
        favorites: Array.isArray(saved?.favorites) ? saved.favorites.slice(0, 12) : [],
        recent: Array.isArray(saved?.recent) ? saved.recent.slice(0, 6) : [],
        history: Array.isArray(saved?.history) ? saved.history.slice(0, 25) : [],
        precision: saved?.precision || "auto", notation: saved?.notation || "auto",
      };
    } catch { return { favorites: [], recent: [], history: [], precision: "auto", notation: "auto" }; }
  }
  function savePairState() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
  function pair() { return { category: els.category.value, from: els.fromUnit.value, to: els.toUnit.value }; }
  function pairId(item) { return `${item.category}:${item.from}:${item.to}`; }
  function unitLabel(category, key) { return CATEGORIES[category]?.units[key]?.label || key; }
  function compactLabel(category, key) { return unitLabel(category, key).match(/\(([^)]+)\)/)?.[1] || unitLabel(category, key); }

  function groupedOptions(category) {
    const groups = new Map();
    for (const [key, def] of Object.entries(CATEGORIES[category].units)) {
      const system = def.system || "other";
      if (!groups.has(system)) groups.set(system, []);
      groups.get(system).push({ key, label: def.label });
    }
    return [...groups].map(([system, units]) => `<optgroup label="${SYSTEM_LABELS[system]}">${units.map(({ key, label }) => `<option value="${key}">${label}</option>`).join("")}</optgroup>`).join("");
  }

  function fillSelect(select, search, optionsList, preferred) {
    select.innerHTML = groupedOptions(els.category.value);
    if (preferred && [...select.options].some(option => option.value === preferred)) select.value = preferred;
    if (!select.value && select.options.length) select.selectedIndex = 0;
    optionsList.innerHTML = Object.entries(CATEGORIES[els.category.value].units).map(([key, def]) => `<option value="${def.label}">${SYSTEM_LABELS[def.system || "other"]} · ${key}</option>`).join("");
    search.value = unitLabel(els.category.value, select.value);
  }
  function commitCombobox(select, search) {
    const needle = search.value.trim().toLowerCase();
    const match = Object.entries(CATEGORIES[els.category.value].units).find(([key, def]) => key.toLowerCase() === needle || def.label.toLowerCase() === needle);
    search.setCustomValidity(match || !needle ? "" : "Choose a unit from the suggestions.");
    if (!match) return false;
    select.value = match[0];
    search.value = match[1].label;
    lastEdited = "from";
    runConversion();
    return true;
  }
  function populateUnits(preferredFrom, preferredTo) {
    fillSelect(els.fromUnit, els.fromSearch, els.fromOptions, preferredFrom);
    fillSelect(els.toUnit, els.toSearch, els.toOptions, preferredTo);
    if (!preferredTo && els.toUnit.options.length > 1) els.toUnit.selectedIndex = 1;
    els.toSearch.value = unitLabel(els.category.value, els.toUnit.value);
    updateSavedPairs();
    renderCategoryQuick();
    runConversion();
  }

  function renderCategoryQuick() {
    const keys = Object.keys(CATEGORIES).sort((a, b) => CATEGORIES[a].label.localeCompare(CATEGORIES[b].label));
    els.categoryQuick.innerHTML = keys.map(key => `<button type="button" class="category-chip" data-category="${key}" aria-pressed="${key === els.category.value}">${CATEGORY_ICONS[key]} ${CATEGORIES[key].label}</button>`).join("");
  }

  function inputNumber(value) {
    return Number.isFinite(value) ? value.toPrecision(12).replace(/(?:\.0+|(?:(\.\d*?)0+))(?=e|$)/, "$1") : "";
  }
  function displayNumber(value) {
    if (!Number.isFinite(value)) return "—";
    const digits = state.precision === "auto" ? 12 : Number(state.precision);
    if (state.notation === "scientific") return value.toExponential(Math.max(1, digits - 1));
    if (state.notation === "engineering") {
      if (value === 0) return "0";
      const exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
      return `${(value / 10 ** exponent).toPrecision(digits)}e${exponent >= 0 ? "+" : ""}${exponent}`;
    }
    if (state.notation === "decimal") return new Intl.NumberFormat(undefined, { maximumSignificantDigits: digits, useGrouping: true }).format(value);
    return state.precision === "auto" ? formatNumber(value) : new Intl.NumberFormat(undefined, { maximumSignificantDigits: digits }).format(value);
  }
  function readSource() {
    const from = lastEdited === "from";
    const input = from ? els.fromValue : els.toValue;
    const sourceUnit = from ? els.fromUnit.value : els.toUnit.value;
    return { input, sourceUnit, targetUnit: from ? els.toUnit.value : els.fromUnit.value, targetInput: from ? els.toValue : els.fromValue };
  }
  function renderEquivalents(value, sourceUnit, targetUnit) {
    const sourceSystem = CATEGORIES[els.category.value].units[sourceUnit].system || "other";
    const rows = Object.entries(CATEGORIES[els.category.value].units)
      .filter(([key]) => key !== sourceUnit && key !== targetUnit)
      .map(([key, def]) => {
        const converted = convert(value, els.category.value, sourceUnit, key);
        const magnitude = Math.abs(converted);
        const readablePenalty = magnitude === 0 ? 0 : Math.abs(Math.log10(magnitude) - 1.5);
        const awkwardPenalty = magnitude && (magnitude < .01 || magnitude >= 1e6) ? 4 : 0;
        const systemBonus = (def.system || "other") !== sourceSystem ? -1.25 : 0;
        return { key, def, converted, score: readablePenalty + awkwardPenalty + systemBonus };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map(({ def, converted }) => `<li><span>${def.label}</span><strong>${displayNumber(converted)}</strong></li>`);
    els.equivalents.innerHTML = rows.length ? rows.join("") : "<li><span>No additional units in this category.</span></li>";
  }
  function showError(message) {
    currentEquation = "";
    currentRawResult = NaN;
    els.error.style.display = "block";
    els.error.textContent = `⚠️ ${message}`;
    els.result.textContent = "—";
    els.formula.textContent = message;
    els.equivalents.innerHTML = "<li><span>Correct the input to see equivalents.</span></li>";
    els.share.style.display = "none";
  }
  function runConversion() {
    updateConversionTableHint();
    if (tableSignature && tableSignature !== pairId(pair())) clearConversionTable("Unit pair changed. Generate a new table for this selection.");
    els.error.style.display = "none";
    const { input, sourceUnit, targetUnit, targetInput } = readSource();
    if (!sourceUnit || !targetUnit) return;
    const value = parseCompoundMeasurement(input.value, els.category.value, sourceUnit);
    if (!Number.isFinite(value)) {
      currentEquation = "";
      currentRawResult = NaN;
      targetInput.value = "";
      els.result.textContent = "—";
      els.formula.textContent = input.value.trim() ? "Use a number, fraction, or compatible unit expression." : "Enter a value to see the conversion.";
      els.equivalents.innerHTML = "<li><span>Waiting for input.</span></li>";
      els.share.style.display = "none";
      return;
    }
    try {
      const result = convert(value, els.category.value, sourceUnit, targetUnit);
      currentRawResult = result;
      targetInput.value = inputNumber(result);
      currentEquation = `${displayNumber(value)} ${unitLabel(els.category.value, sourceUnit)} = ${displayNumber(result)} ${unitLabel(els.category.value, targetUnit)}`;
      els.result.textContent = displayNumber(result);
      els.formula.textContent = currentEquation;
      renderEquivalents(value, sourceUnit, targetUnit);
      els.share.style.display = "flex";
      rememberRecent();
      rememberConversion(value, sourceUnit, targetUnit, result);
    } catch (error) { targetInput.value = ""; showError(error.message); }
    updateFavoriteButton();
  }

  function updateConversionTableHint() {
    if (!els.fromUnit.value || !els.toUnit.value) return;
    els.tableHint.textContent = `${unitLabel(els.category.value, els.fromUnit.value)} to ${unitLabel(els.category.value, els.toUnit.value)}. Maximum 500 rows.`;
  }

  function clearConversionTable(message = "") {
    tableText = "";
    tableCsv = "";
    tableSignature = "";
    els.tableBody.innerHTML = "";
    els.tableWrap.hidden = true;
    els.copyTable.disabled = true;
    els.downloadTable.disabled = true;
    els.tableStatus.textContent = message;
  }
  function generateConversionTable() {
    updateConversionTableHint();
    if ([els.tableStart, els.tableEnd, els.tableStep].some(input => input.value.trim() === "")) {
      clearConversionTable("Enter a start, end, and step value.");
      return;
    }
    const start = Number(els.tableStart.value);
    const end = Number(els.tableEnd.value);
    const step = Number(els.tableStep.value);
    const category = els.category.value;
    const from = els.fromUnit.value;
    const to = els.toUnit.value;
    try {
      const rows = buildConversionTable(start, end, step, category, from, to);
      const fromLabel = unitLabel(category, from);
      const toLabel = unitLabel(category, to);
      els.tableFromHeading.textContent = fromLabel;
      els.tableToHeading.textContent = toLabel;
      els.tableBody.innerHTML = rows.map(row => `<tr><td>${displayNumber(row.source)}</td><td>${displayNumber(row.result)}</td></tr>`).join("");
      const textRows = [[fromLabel, toLabel], ...rows.map(row => [displayNumber(row.source), displayNumber(row.result)])];
      const columnWidths = [0, 1].map(index => Math.max(...textRows.map(row => row[index].length)));
      const divider = columnWidths.map(width => "-".repeat(width)).join("  ");
      tableText = [
        textRows[0].map((value, index) => value.padEnd(columnWidths[index])).join("  "),
        divider,
        ...textRows.slice(1).map(row => row.map((value, index) => value.padEnd(columnWidths[index])).join("  ")),
      ].join("\n");
      tableCsv = [[fromLabel, toLabel], ...rows.map(row => [row.source, row.result])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
      tableSignature = pairId(pair());
      els.tableWrap.hidden = false;
      els.copyTable.disabled = false;
      els.downloadTable.disabled = false;
      els.tableStatus.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"} generated.`;
    } catch (error) { clearConversionTable(error.message); }
  }
  function downloadConversionTable() {
    if (!tableCsv) return;
    const blobUrl = URL.createObjectURL(new Blob([tableCsv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${els.category.value}-${els.fromUnit.value}-to-${els.toUnit.value}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    els.tableStatus.textContent = "CSV downloaded.";
  }

  function rememberRecent() {
    const current = pair();
    state.recent = [current, ...state.recent.filter(item => pairId(item) !== pairId(current))].slice(0, 6);
    savePairState();
    updateSavedPairs();
  }
  function historyId(item) { return `${item.category}:${item.from}:${item.to}:${item.value}`; }
  function rememberConversion(value, from, to, result) {
    if (suppressHistory) return;
    const item = { category: els.category.value, from, to, value: String(value), result, equation: currentEquation, timestamp: Date.now(), favorite: false };
    const existing = state.history.find(entry => historyId(entry) === historyId(item));
    if (existing) item.favorite = Boolean(existing.favorite);
    state.history = [item, ...state.history.filter(entry => historyId(entry) !== historyId(item))].slice(0, 25);
    savePairState();
    renderHistory();
  }
  function renderHistory() {
    els.historyCount.textContent = String(state.history.length);
    if (!state.history.length) {
      els.historyList.innerHTML = '<li class="history-empty">No conversions saved yet.</li>';
      return;
    }
    els.historyList.innerHTML = state.history.map((item, index) => `<li class="history-entry">
      <button class="history-equation" type="button" data-history-action="reuse" data-history-index="${index}">${item.equation}</button>
      <span class="history-actions">
        <button type="button" data-history-action="favorite" data-history-index="${index}" aria-label="${item.favorite ? "Unfavorite" : "Favorite"} conversion" aria-pressed="${Boolean(item.favorite)}">★</button>
        <button type="button" data-history-action="copy" data-history-index="${index}" aria-label="Copy conversion">⧉</button>
        <button type="button" data-history-action="delete" data-history-index="${index}" aria-label="Delete conversion">×</button>
      </span></li>`).join("");
  }
  function reuseHistory(item) {
    suppressHistory = true;
    els.category.value = item.category;
    populateUnits(item.from, item.to);
    els.fromValue.value = item.value;
    lastEdited = "from";
    runConversion();
    suppressHistory = false;
  }
  function handleHistoryAction(event) {
    const button = event.target.closest("[data-history-action]");
    if (!button) return;
    const index = Number(button.dataset.historyIndex);
    const item = state.history[index];
    if (!item) return;
    if (button.dataset.historyAction === "reuse") reuseHistory(item);
    if (button.dataset.historyAction === "copy") copy(item.equation, "✅ History entry copied!", "Copy failed.");
    if (button.dataset.historyAction === "favorite") { item.favorite = !item.favorite; savePairState(); renderHistory(); }
    if (button.dataset.historyAction === "delete") { state.history.splice(index, 1); savePairState(); renderHistory(); }
  }
  function toggleFavorite() {
    const current = pair();
    const id = pairId(current);
    const exists = state.favorites.some(item => pairId(item) === id);
    state.favorites = exists ? state.favorites.filter(item => pairId(item) !== id) : [current, ...state.favorites].slice(0, 12);
    savePairState();
    updateSavedPairs();
  }
  function updateFavoriteButton() {
    const selected = state.favorites.some(item => pairId(item) === pairId(pair()));
    els.favorite.setAttribute("aria-pressed", String(selected));
    els.favorite.textContent = selected ? "★ Favorited pair" : "☆ Favorite pair";
  }
  function updateSavedPairs() {
    const all = [...state.favorites.map(item => ({ ...item, favorite: true })), ...state.recent.filter(recent => !state.favorites.some(favorite => pairId(favorite) === pairId(recent)))].filter(item => CATEGORIES[item.category]?.units[item.from] && CATEGORIES[item.category]?.units[item.to]).slice(0, 10);
    els.savedPairs.hidden = !all.length;
    els.pairChips.innerHTML = all.map(item => `<button type="button" class="pair-chip${item.favorite ? " is-favorite" : ""}" data-pair="${pairId(item)}">${CATEGORIES[item.category].label}: ${compactLabel(item.category, item.from)} → ${compactLabel(item.category, item.to)}</button>`).join("");
    updateFavoriteButton();
    renderCategoryQuick();
  }
  function applyPair(item) {
    els.category.value = item.category;
    lastEdited = "from";
    populateUnits(item.from, item.to);
  }
  function swapUnits() {
    const from = els.fromUnit.value;
    els.fromUnit.value = els.toUnit.value;
    els.toUnit.value = from;
    els.fromSearch.value = unitLabel(els.category.value, els.fromUnit.value);
    els.toSearch.value = unitLabel(els.category.value, els.toUnit.value);
    lastEdited = "from";
    runConversion();
  }
  function buildURL() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ cat: els.category.value, from: els.fromUnit.value, to: els.toUnit.value, value: els.fromValue.value }).toString();
    url.hash = "";
    return url.toString();
  }
  async function copy(text, success, failure) {
    try {
      await navigator.clipboard.writeText(text);
      els.copyConfirm.textContent = success;
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = text;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      els.copyConfirm.textContent = copied ? success : failure;
    }
    els.copyConfirm.style.display = "inline";
    setTimeout(() => { els.copyConfirm.style.display = "none"; }, 2500);
  }
  function readURL() {
    const params = new URLSearchParams(location.search);
    if (CATEGORIES[params.get("cat")]) els.category.value = params.get("cat");
    const legacy = { tsp: "ustsp", tbsp: "ustbsp", cup: "uscup", floz: "usfloz", pt: "uspt", gal: "usgal" };
    const from = els.category.value === "volume" ? legacy[params.get("from")] || params.get("from") : params.get("from");
    const to = els.category.value === "volume" ? legacy[params.get("to")] || params.get("to") : params.get("to");
    populateUnits(from, to);
    if (params.has("value")) els.fromValue.value = params.get("value");
  }

  function applyDisplayPreferences() {
    state.precision = els.precision.value;
    state.notation = els.notation.value;
    savePairState();
    suppressHistory = true;
    runConversion();
    suppressHistory = false;
  }

  els.categoryQuick.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button || !CATEGORIES[button.dataset.category]) return;
    els.category.value = button.dataset.category;
    lastEdited = "from";
    populateUnits();
  });
  els.fromSearch.addEventListener("change", () => commitCombobox(els.fromUnit, els.fromSearch));
  els.toSearch.addEventListener("change", () => commitCombobox(els.toUnit, els.toSearch));
  els.fromSearch.addEventListener("blur", () => { if (!commitCombobox(els.fromUnit, els.fromSearch)) els.fromSearch.value = unitLabel(els.category.value, els.fromUnit.value); });
  els.toSearch.addEventListener("blur", () => { if (!commitCombobox(els.toUnit, els.toSearch)) els.toSearch.value = unitLabel(els.category.value, els.toUnit.value); });
  els.fromSearch.addEventListener("focus", event => event.target.select());
  els.toSearch.addEventListener("focus", event => event.target.select());
  els.fromUnit.addEventListener("change", () => { lastEdited = "from"; runConversion(); });
  els.toUnit.addEventListener("change", () => { lastEdited = "from"; runConversion(); });
  els.fromValue.addEventListener("input", () => { lastEdited = "from"; runConversion(); });
  els.toValue.addEventListener("input", () => { lastEdited = "to"; runConversion(); });
  els.swap.addEventListener("click", swapUnits);
  els.favorite.addEventListener("click", toggleFavorite);
  els.clear.addEventListener("click", () => { els.fromValue.value = ""; els.toValue.value = ""; lastEdited = "from"; runConversion(); els.fromValue.focus(); });
  els.copyResult.addEventListener("click", () => currentEquation && copy(currentEquation, "✅ Result copied!", "Copy failed — select the result manually."));
  els.copyRaw.addEventListener("click", () => Number.isFinite(currentRawResult) && copy(String(currentRawResult), "✅ Unrounded value copied!", "Copy failed."));
  els.copyLink.addEventListener("click", () => copy(buildURL(), "✅ Link copied!", "Copy failed — copy the address bar instead."));
  els.pairChips.addEventListener("click", event => {
    const button = event.target.closest("[data-pair]");
    if (!button) return;
    const item = [...state.favorites, ...state.recent].find(candidate => pairId(candidate) === button.dataset.pair);
    if (item) applyPair(item);
  });
  els.precision.addEventListener("change", applyDisplayPreferences);
  els.notation.addEventListener("change", applyDisplayPreferences);
  els.historyList.addEventListener("click", handleHistoryAction);
  els.clearHistory.addEventListener("click", () => els.historyConfirm.showModal());
  els.confirmClearHistory.addEventListener("click", () => { state.history = []; savePairState(); renderHistory(); });
  els.tablePanel.addEventListener("toggle", () => {
    if (!els.tablePanel.open) return;
    updateConversionTableHint();
  });
  els.generateTable.addEventListener("click", generateConversionTable);
  els.copyTable.addEventListener("click", () => tableText && copy(tableText, "✅ Table copied!", "Copy failed."));
  els.downloadTable.addEventListener("click", downloadConversionTable);
  document.addEventListener("keydown", event => { if (event.altKey && event.key.toLowerCase() === "s") { event.preventDefault(); swapUnits(); } });

  suppressHistory = true;
  readURL();
  els.precision.value = state.precision;
  els.notation.value = state.notation;
  renderHistory();
  suppressHistory = false;
  runConversion();


}
