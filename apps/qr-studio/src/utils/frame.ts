import type { FrameSettings, FrameStyle } from "../types";
import { contrastTextColor } from "./textLogo.ts";

export const FRAME_STYLES: FrameStyle[] = ["rectangle", "rounded-rectangle", "squircle", "capsule", "circle", "outline", "thick-border", "glow", "shadow", "gradient-border", "pattern-border", "arrow-left", "arrow-right", "arrow-down", "camera", "phone", "tap-icon"];
const FRAME_FONTS = ["Segoe UI", "Georgia", "Courier New", "Trebuchet MS", "Impact"];
const FRAME_WEIGHTS = ["regular", "medium", "semibold", "bold"];
const FRAME_PATTERNS = ["none", "dots", "stripes", "waves", "mesh", "grid"];
const GRADIENT_TYPES = ["linear", "radial", "conic"];
const GRADIENT_DIRECTIONS = ["top-bottom", "left-right", "diagonal"];

export const FRAME_PRESETS: Array<{ id: string; label: string; patch: Partial<FrameSettings> }> = [
  { id: "scan-me", label: "SCAN ME", patch: { text: "SCAN ME", style: "rounded-rectangle", color: "#111827" } },
  { id: "open", label: "OPEN", patch: { text: "OPEN", style: "outline", color: "#166534" } },
  { id: "menu", label: "MENU", patch: { text: "MENU", style: "capsule", color: "#7c2d12" } },
  { id: "wifi", label: "WIFI", patch: { text: "WIFI", style: "gradient-border", gradient: { enabled: true, type: "linear", direction: "left-right", stops: ["#2563eb", "#06b6d4"] } } },
  { id: "pay", label: "PAY", patch: { text: "PAY", style: "thick-border", color: "#166534" } },
  { id: "join", label: "JOIN", patch: { text: "JOIN", style: "arrow-right", color: "#7c3aed" } },
];

export function normalizeFrame(input: Partial<FrameSettings>): { settings: FrameSettings; warnings: string[] } {
  const warnings: string[] = [];
  const rawText = typeof input.text === "string" ? input.text : "";
  const upper = rawText.toUpperCase();
  const filtered = [...upper]
    .filter((character) => /^[A-Z0-9 ._-]$/.test(character))
    .join("")
    .replace(/\s+/g, " ")
    .trimStart();
  if (filtered !== upper) warnings.push("Frame text allows only A-Z, 0-9, spaces, period, dash, and underscore.");
  const text = filtered.slice(0, 12);
  if (filtered.length > 12) warnings.push("Frame text was limited to 12 characters.");
  if (text.length > 8) warnings.push("Long frame text may reduce clarity.");

  const color = validHex(input.color) ? input.color! : "#000000";
  const gradientStops = (input.gradient?.stops ?? []).filter(validHex).slice(0, 6);
  while (gradientStops.length < 2) gradientStops.push(gradientStops.length ? color : "#16a34a");
  const gradient = {
    enabled: Boolean(input.gradient?.enabled),
    type: includes(GRADIENT_TYPES, input.gradient?.type) ? input.gradient!.type : "linear",
    direction: includes(GRADIENT_DIRECTIONS, input.gradient?.direction) ? input.gradient!.direction : "top-bottom",
    stops: gradientStops,
  } as FrameSettings["gradient"];
  const contrastBackground = gradient.enabled ? lowestLuminanceStop(gradient.stops) : color;
  const autoContrast = input.autoContrast !== false;
  const preferredTextColor = validHex(input.textColor) ? input.textColor! : contrastTextColor(contrastBackground);
  const textColor = autoContrast ? contrastTextColor(contrastBackground) : preferredTextColor;

  const requestedThickness = number(input.thickness, 0.08);
  const requestedPadding = number(input.padding, 0.12);
  const requestedRadius = number(input.cornerRadius, 0.25);
  const requestedTextSize = number(input.textSize, 18);
  const requestedOpacity = number(input.patternOpacity, 0.2);
  const thickness = clamp(requestedThickness, 0.02, 0.15);
  const padding = clamp(requestedPadding, 0.06, 0.12);
  const cornerRadius = clamp(requestedRadius, 0, 0.5);
  const textSize = clamp(requestedTextSize, 10, 40);
  const patternOpacity = clamp(requestedOpacity, 0.10, 0.40);
  if (thickness !== requestedThickness) warnings.push("Frame thickness was limited to 2%-15%.");
  if (padding !== requestedPadding) warnings.push("Frame padding was limited to 6%-12%.");
  if (cornerRadius !== requestedRadius) warnings.push("Frame corner radius was limited to 50%.");
  if (textSize !== requestedTextSize) warnings.push("Frame text size was limited to 10-40px.");
  if (patternOpacity !== requestedOpacity) warnings.push("Pattern opacity was limited to 10%-40%.");

  return { settings: {
    enabled: Boolean(input.enabled),
    style: FRAME_STYLES.includes(input.style as FrameStyle) ? input.style! : "rounded-rectangle",
    thickness,
    color,
    gradient,
    cornerRadius,
    padding,
    text,
    textFont: FRAME_FONTS.includes(input.textFont ?? "") ? input.textFont! : "Segoe UI",
    textWeight: includes(FRAME_WEIGHTS, input.textWeight) ? input.textWeight! : "bold",
    textColor,
    textSize,
    autoContrast,
    pattern: includes(FRAME_PATTERNS, input.pattern) ? input.pattern! : "none",
    patternOpacity,
    preset: typeof input.preset === "string" ? input.preset : null,
  }, warnings: [...new Set(warnings)] };
}

export function frameExtentModules(moduleCount: number, frame: FrameSettings) {
  if (!frame.enabled) return 0;
  const extraGap = clamp(Math.round(moduleCount * frame.padding), 2, 8);
  const thickness = moduleCount * frame.thickness;
  const fontModules = frame.text ? clamp(frame.textSize / 10, 1, 4) : 0;
  const labelHeight = frame.text || isIconFrame(frame.style) ? Math.max(thickness * 2.5, fontModules / 0.4) : thickness;
  return Math.ceil(extraGap + Math.max(thickness / 2, labelHeight / 2) + 1);
}

export function isIconFrame(style: FrameStyle) { return ["arrow-left", "arrow-right", "arrow-down", "camera", "phone", "tap-icon"].includes(style); }

function lowestLuminanceStop(stops: string[]) { return [...stops].sort((a, b) => luminance(a) - luminance(b))[0] ?? "#000000"; }
function luminance(value: string) { const hex=value.slice(1); return Number.parseInt(hex.slice(0,2),16)*299 + Number.parseInt(hex.slice(2,4),16)*587 + Number.parseInt(hex.slice(4,6),16)*114; }
function validHex(value: unknown): value is string { return typeof value === "string" && /^#[0-9A-F]{6}$/i.test(value); }
function number(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function clamp(value: number, minimum: number, maximum: number) { return Math.min(maximum, Math.max(minimum, value)); }
function includes<T extends string>(values: string[], value: unknown): value is T { return typeof value === "string" && values.includes(value); }
