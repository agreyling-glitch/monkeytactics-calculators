export type QrType = "url" | "text" | "wifi" | "vcard" | "email" | "sms" | "geo" | "calendar" | "totp" | "crypto" | "social";
export type StudioTab = "projects" | "content" | "styling" | "export";
export type GradientType = "none" | "linear-lr" | "linear-rl" | "linear-tb" | "linear-bt" | "diagonal-down" | "diagonal-up" | "radial-center" | "radial-offset" | "radial-ellipse" | "spotlight" | "conic" | "pie" | "spiral" | "module-horizontal" | "module-vertical" | "module-radial" | "logo-toward" | "logo-away" | "logo-match" | "auto-contrast";
export type GradientPattern = "none" | "perlin" | "fractal" | "grain" | "speckle" | "stripes" | "dots" | "mesh" | "waves";
export type GradientTarget = "data" | "eyes" | "data-eyes" | "quiet-zone";
export type EyeGradientMode = "none" | "whole" | "ring" | "pupil" | "dual";
export type ModuleShape = "square" | "rounded" | "circle" | "hexagon" | "diamond" | "soft-diamond" | "capsule" | "squircle" | "octagon" | "teardrop" | "triangle-up" | "triangle-down" | "star-four" | "concentric";
export type EyeShape = "square" | "rounded" | "circle" | "leaf" | "hexagon" | "diamond" | "capsule" | "teardrop" | "star-four" | "triangle-up" | "triangle-down" | "honeycomb" | "pebble" | "concentric" | "heart";
export type LogoMode = "none" | "upload" | "preset" | "text";
export type LogoBackgroundShape = "square" | "rounded" | "squircle" | "circle" | "capsule";
export type TextLogoBackgroundShape = "circle" | "rounded-square" | "squircle" | "capsule";
export type TextLogoFontWeight = "regular" | "medium" | "semibold" | "bold";
export type FrameStyle = "rectangle" | "rounded-rectangle" | "squircle" | "capsule" | "circle" | "outline" | "thick-border" | "glow" | "shadow" | "gradient-border" | "pattern-border" | "arrow-left" | "arrow-right" | "arrow-down" | "camera" | "phone" | "tap-icon";
export type FrameGradientType = "linear" | "radial" | "conic";
export type FrameGradientDirection = "top-bottom" | "left-right" | "diagonal";
export type FramePattern = "none" | "dots" | "stripes" | "waves" | "mesh" | "grid";

export interface FrameSettings {
  enabled: boolean;
  style: FrameStyle;
  thickness: number;
  color: string;
  gradient: { enabled: boolean; type: FrameGradientType; direction: FrameGradientDirection; stops: string[] };
  cornerRadius: number;
  padding: number;
  text: string;
  textFont: string;
  textWeight: TextLogoFontWeight;
  textColor: string;
  textSize: number;
  autoContrast: boolean;
  pattern: FramePattern;
  patternOpacity: number;
  preset: string | null;
}

export interface TextLogoSettings {
  text: string;
  fontFamily: string;
  fontWeight: TextLogoFontWeight;
  fontSize: number;
  color: string;
  backgroundShape: TextLogoBackgroundShape;
  backgroundColor: string;
  padding: number;
  autoContrast: boolean;
  centered: true;
}

export interface QrStyle {
  foreground: string;
  background: string;
  gradientType: GradientType;
  gradientStart: string;
  gradientEnd: string;
  gradientColors: string[];
  gradientPattern: GradientPattern;
  gradientTarget: GradientTarget;
  eyeGradientMode: EyeGradientMode;
  moduleShape: ModuleShape;
  moduleScale: number;
  patternPreset: string;
  eyeShape: EyeShape;
  eyeOuterColor: string;
  eyeInnerColor: string;
  logoMode: LogoMode;
  logoDataUrl: string;
  logoSize: number;
  logoPadding: number;
  logoBackgroundShape: LogoBackgroundShape;
  logoAutoContrast: boolean;
  logoWhiteBorder: boolean;
  logoSafeMode: boolean;
  logoAutoEcc: boolean;
  textLogo: TextLogoSettings;
  frame: FrameSettings;
  dropShadow: boolean;
  glow: boolean;
  noise: boolean;
  texture: boolean;
  artistic: boolean;
  transparent: boolean;
}

export interface QrResult {
  moduleCount: number;
  modules: number[];
  svg: string;
  reliabilityScore: number;
  reliabilityLabel: string;
  suggestions: string[];
  error?: string;
}

export type FormValues = Record<string, string | boolean>;

export const DEFAULT_STYLE: QrStyle = {
  foreground: "#111827",
  background: "#ffffff",
  gradientType: "none",
  gradientStart: "#16a34a",
  gradientEnd: "#0f766e",
  gradientColors: ["#22c55e", "#0f766e"],
  gradientPattern: "none",
  gradientTarget: "data",
  eyeGradientMode: "none",
  moduleShape: "square",
  moduleScale: 1,
  patternPreset: "classic",
  eyeShape: "square",
  eyeOuterColor: "#111827",
  eyeInnerColor: "#111827",
  logoMode: "none",
  logoDataUrl: "",
  logoSize: 0.18,
  logoPadding: 0.12,
  logoBackgroundShape: "rounded",
  logoAutoContrast: true,
  logoWhiteBorder: true,
  logoSafeMode: true,
  logoAutoEcc: true,
  textLogo: {
    text: "MENU",
    fontFamily: "Segoe UI",
    fontWeight: "bold",
    fontSize: 24,
    color: "#FFFFFF",
    backgroundShape: "rounded-square",
    backgroundColor: "#000000",
    padding: 0.15,
    autoContrast: true,
    centered: true,
  },
  frame: {
    enabled: false,
    style: "rounded-rectangle",
    thickness: 0.08,
    color: "#000000",
    gradient: { enabled: false, type: "linear", direction: "top-bottom", stops: ["#111827", "#16a34a"] },
    cornerRadius: 0.25,
    padding: 0.12,
    text: "SCAN ME",
    textFont: "Segoe UI",
    textWeight: "bold",
    textColor: "#FFFFFF",
    textSize: 18,
    autoContrast: true,
    pattern: "none",
    patternOpacity: 0.2,
    preset: null,
  },
  dropShadow: false,
  glow: false,
  noise: false,
  texture: false,
  artistic: false,
  transparent: false,
};
