/* ========================================================================
   MonkeyTactics.com — Unit Converter
   Pure data + pure functions. No DOM access.
   ======================================================================== */

/**
 * Each category defines a base unit. Every unit has a `toBase` factor
 * (multiply value-in-this-unit by factor to get base) and a `fromBase`
 * (divide base by factor ... actually multiply base by fromBase).
 * For simplicity we use linear conversions: value_in_base = value * toBase.
 */
export const CATEGORIES = {
  length: {
    label: "Length",
    units: {
      mm:    { label: "Millimetre (mm)", toBase: 0.001 },
      cm:    { label: "Centimetre (cm)", toBase: 0.01 },
      m:     { label: "Metre (m)",       toBase: 1 },
      km:    { label: "Kilometre (km)",  toBase: 1000 },
      in:    { label: "Inch (in)",       toBase: 0.0254 },
      ft:    { label: "Foot (ft)",       toBase: 0.3048 },
      yd:    { label: "Yard (yd)",       toBase: 0.9144 },
      mi:    { label: "Mile (mi)",       toBase: 1609.344 },
    },
  },
  weight: {
    label: "Weight",
    units: {
      mg:    { label: "Milligram (mg)",  toBase: 0.000001 },
      g:     { label: "Gram (g)",        toBase: 0.001 },
      kg:    { label: "Kilogram (kg)",   toBase: 1 },
      t:     { label: "Tonne (t)",       toBase: 1000 },
      oz:    { label: "Ounce (oz)",      toBase: 0.0283495 },
      lb:    { label: "Pound (lb)",      toBase: 0.453592 },
      st:    { label: "Stone (st)",      toBase: 6.35029 },
    },
  },
  temperature: {
    label: "Temperature",
    units: {
      c: { label: "Celsius (°C)" },
      f: { label: "Fahrenheit (°F)" },
      k: { label: "Kelvin (K)" },
    },
  },
  volume: {
    label: "Volume",
    units: {
      ml:    { label: "Millilitre (ml)", toBase: 0.001 },
      l:     { label: "Litre (l)",       toBase: 1 },
      m3:    { label: "Cubic metre (m³)", toBase: 1000 },
      tsp:   { label: "Teaspoon (tsp)",  toBase: 0.00492892 },
      tbsp:  { label: "Tablespoon (tbsp)", toBase: 0.0147868 },
      cup:   { label: "Cup (cup)",       toBase: 0.236588 },
      floz:  { label: "Fluid ounce (fl oz)", toBase: 0.0295735 },
      pt:    { label: "Pint (pt)",       toBase: 0.473176 },
      gal:   { label: "Gallon (gal)",    toBase: 3.78541 },
    },
  },
  speed: {
    label: "Speed",
    units: {
      mps:   { label: "Metres / second (m/s)", toBase: 1 },
      kmh:   { label: "Kilometres / hour (km/h)", toBase: 0.277778 },
      mph:   { label: "Miles / hour (mph)", toBase: 0.44704 },
      knot:  { label: "Knot (kn)",       toBase: 0.514444 },
    },
  },
};

/**
 * Convert a value from one unit to another within a category.
 */
export function convert(value, categoryKey, fromUnit, toUnit) {
  validateNum(value, "value");
  const cat = CATEGORIES[categoryKey];
  if (!cat) throw new Error(`Unknown category "${categoryKey}".`);

  // Temperature needs special handling (offsets, not just factors)
  if (categoryKey === "temperature") {
    const celsius = toCelsius(value, fromUnit);
    return fromCelsius(celsius, toUnit);
  }

  const fromDef = cat.units[fromUnit];
  const toDef = cat.units[toUnit];
  if (!fromDef || !toDef) throw new Error("Unknown unit.");

  const baseValue = value * fromDef.toBase;
  return baseValue / toDef.toBase;
}

/* ---- temperature helpers ---- */
function toCelsius(v, unit) {
  switch (unit) {
    case "c": return v;
    case "f": return (v - 32) * 5 / 9;
    case "k": return v - 273.15;
    default: throw new Error("Unknown temperature unit.");
  }
}
function fromCelsius(c, unit) {
  switch (unit) {
    case "c": return c;
    case "f": return c * 9 / 5 + 32;
    case "k": return c + 273.15;
    default: throw new Error("Unknown temperature unit.");
  }
}

function validateNum(n, name) {
  if (typeof n !== "number" || isNaN(n)) {
    throw new Error(`${name} must be a valid number.`);
  }
}
