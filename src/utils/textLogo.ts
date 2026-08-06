import type { LogoBackgroundShape, TextLogoBackgroundShape, TextLogoSettings } from "../types";

export const TEXT_LOGO_MAX_CHARACTERS = 12;
export const TEXT_LOGO_SOFT_WARNING_CHARACTERS = 8;
export const TEXT_LOGO_MIN_FONT_SIZE = 10;
export const TEXT_LOGO_CONTAINER_SIZE = 256;
export const TEXT_LOGO_MAX_FONT_SIZE = TEXT_LOGO_CONTAINER_SIZE / 2;

const FONT_FAMILIES = ["Segoe UI", "Georgia", "Courier New", "Trebuchet MS", "Impact"] as const;
const FONT_WEIGHTS = ["regular", "medium", "semibold", "bold"] as const;
const BACKGROUND_SHAPES = ["circle", "rounded-square", "squircle", "capsule"] as const;

export interface NormalizedTextLogo {
  settings: TextLogoSettings;
  warnings: string[];
}

export function normalizeTextLogo(input: Partial<TextLogoSettings>): NormalizedTextLogo {
  const warnings: string[] = [];
  const rawText = typeof input.text === "string" ? input.text : "";
  const upperText = rawText.toUpperCase();
  const allowedText = [...upperText]
    .filter((character) => /^[A-Z0-9 ._-]$/.test(character))
    .join("")
    .replace(/\s+/g, " ")
    .trimStart();
  if (allowedText !== upperText) warnings.push("Only A-Z, 0-9, spaces, period, dash, and underscore are allowed.");
  const text = allowedText.slice(0, TEXT_LOGO_MAX_CHARACTERS);
  if (allowedText.length > TEXT_LOGO_MAX_CHARACTERS) warnings.push("Text was limited to 12 characters.");
  if (text.length > TEXT_LOGO_SOFT_WARNING_CHARACTERS) warnings.push("Long text may reduce clarity.");

  const requestedFontSize = finiteNumber(input.fontSize, 24);
  const fontSize = clamp(requestedFontSize, TEXT_LOGO_MIN_FONT_SIZE, TEXT_LOGO_MAX_FONT_SIZE);
  if (fontSize !== requestedFontSize) warnings.push(`Font size was limited to ${TEXT_LOGO_MIN_FONT_SIZE}–${TEXT_LOGO_MAX_FONT_SIZE}px.`);

  const requestedPadding = finiteNumber(input.padding, 0.15);
  const padding = clamp(requestedPadding, 0.10, 0.20);
  if (padding !== requestedPadding) warnings.push("Padding was limited to 10%–20%.");

  const backgroundColor = validHex(input.backgroundColor) ? input.backgroundColor! : "#000000";
  const fontFamily = FONT_FAMILIES.includes(input.fontFamily as typeof FONT_FAMILIES[number]) ? input.fontFamily! : "Segoe UI";
  const fontWeight = FONT_WEIGHTS.includes(input.fontWeight as typeof FONT_WEIGHTS[number]) ? input.fontWeight! : "bold";
  const backgroundShape = BACKGROUND_SHAPES.includes(input.backgroundShape as typeof BACKGROUND_SHAPES[number]) ? input.backgroundShape! : "rounded-square";
  const autoContrast = input.autoContrast !== false;
  const preferredColor = validHex(input.color) ? input.color! : contrastTextColor(backgroundColor);
  const color = autoContrast ? contrastTextColor(backgroundColor) : preferredColor;

  return {
    settings: {
      text,
      fontFamily,
      fontWeight,
      fontSize,
      color,
      backgroundShape,
      backgroundColor,
      padding,
      autoContrast,
      centered: true,
    },
    warnings: [...new Set(warnings)],
  };
}

export function renderTextLogoDataUrl(input: Partial<TextLogoSettings>): NormalizedTextLogo & { dataUrl: string } {
  const normalized = normalizeTextLogo(input);
  if (typeof document === "undefined") return { ...normalized, dataUrl: "" };

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = TEXT_LOGO_CONTAINER_SIZE * scale;
  canvas.height = TEXT_LOGO_CONTAINER_SIZE * scale;
  const context = canvas.getContext("2d");
  if (!context) return { ...normalized, dataUrl: "" };

  context.scale(scale, scale);
  drawBackground(context, normalized.settings.backgroundShape, normalized.settings.backgroundColor);

  const available = TEXT_LOGO_CONTAINER_SIZE * (1 - normalized.settings.padding * 2);
  const fontStack = fontFamilyStack(normalized.settings.fontFamily);
  const fontWeight = fontWeightValue(normalized.settings.fontWeight);
  let fittedSize = normalized.settings.fontSize;
  context.font = `${fontWeight} ${fittedSize}px ${fontStack}`;
  const measuredWidth = context.measureText(normalized.settings.text || " ").width;
  if (measuredWidth > available) fittedSize = Math.max(TEXT_LOGO_MIN_FONT_SIZE, fittedSize * available / measuredWidth);
  if (fittedSize < normalized.settings.fontSize) normalized.warnings.push("Font size was reduced so the text stays inside the safe logo zone.");

  context.font = `${fontWeight} ${fittedSize}px ${fontStack}`;
  context.fillStyle = normalized.settings.color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(normalized.settings.text, TEXT_LOGO_CONTAINER_SIZE / 2, TEXT_LOGO_CONTAINER_SIZE / 2, available);
  return { ...normalized, warnings: [...new Set(normalized.warnings)], dataUrl: canvas.toDataURL("image/png") };
}

export function textLogoEngineShape(shape: TextLogoBackgroundShape): LogoBackgroundShape {
  return shape === "rounded-square" ? "rounded" : shape;
}

export function contrastTextColor(backgroundColor: string) {
  const hex = backgroundColor.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16) || 0;
  const green = Number.parseInt(hex.slice(2, 4), 16) || 0;
  const blue = Number.parseInt(hex.slice(4, 6), 16) || 0;
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 145 ? "#000000" : "#FFFFFF";
}

function drawBackground(context: CanvasRenderingContext2D, shape: TextLogoBackgroundShape, color: string) {
  const size = TEXT_LOGO_CONTAINER_SIZE;
  context.fillStyle = color;
  context.beginPath();
  if (shape === "circle") context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  else if (shape === "capsule") {
    const height = size * 0.56;
    context.roundRect(0, (size - height) / 2, size, height, height / 2);
  }
  else {
    const radius = shape === "squircle" ? size * 0.38 : size * 0.2;
    context.roundRect(0, 0, size, size, radius);
  }
  context.fill();
}

function fontFamilyStack(fontFamily: string) {
  if (fontFamily === "Georgia") return "Georgia, serif";
  if (fontFamily === "Courier New") return '"Courier New", monospace';
  if (fontFamily === "Trebuchet MS") return '"Trebuchet MS", sans-serif';
  if (fontFamily === "Impact") return "Impact, Haettenschweiler, sans-serif";
  return '"Segoe UI", sans-serif';
}

function fontWeightValue(fontWeight: TextLogoSettings["fontWeight"]) {
  return ({ regular: 400, medium: 500, semibold: 600, bold: 700 })[fontWeight];
}

function validHex(value: unknown): value is string { return typeof value === "string" && /^#[0-9A-F]{6}$/i.test(value); }
function finiteNumber(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, value)); }
