import { DEFAULT_STYLE, type FormValues, type FrameSettings, type LogoMode, type QrStyle, type QrType, type TextLogoBackgroundShape, type TextLogoFontWeight } from "../types";
import type { BatchExportMode, ExportFormat } from "../components/SidebarExport";
import type { AveryTemplate, PdfLayout, PosterGrid } from "./pdfLayout";
import type { PresetLogoId } from "./presetLogos";
import { normalizeTextLogo, textLogoEngineShape } from "./textLogo";
import { normalizeFrame } from "./frame";

export const PROJECT_STORAGE_KEY = "mt_qr_projects";
export const PROJECT_SCHEMA_VERSION = 1;

export interface QrProject {
  schemaVersion: number;
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  qrType: QrType;
  content: {
    single: FormValues;
    batch: { enabled: boolean; sourceType: "csv" | "manual" | "api"; csvData: string; fileName: string; mapping: Record<string, string> };
  };
  styling: {
    foregroundColor: string;
    backgroundColor: string;
    gradient: { enabled: boolean; type: string; direction: string; stops: Array<{ position: number; color: string }>; pattern: string; target: string };
    dots: { shape: string; size: number; pattern: string };
    eyes: { shapeOuter: string; shapeInner: string; useCustomColors: boolean; outerColor: string; innerColor: string; gradientMode: string };
    logo: { mode: LogoMode; preset: PresetLogoId | ""; uploadId: string | null; dataUrl: string; size: number; padding: number; backgroundShape: string; autoContrast: boolean; text: string; fontFamily: string; fontWeight: TextLogoFontWeight; fontSize: number; color: string; backgroundColor: string; centered: boolean };
    frame: FrameSettings;
    quietZone: { size: number; color: string };
    errorCorrection: "L" | "M" | "Q" | "H";
    raw: QrStyle;
  };
  export: {
    format: ExportFormat;
    dpi: number;
    batchZip: boolean;
    batchMode: BatchExportMode;
    filenamePattern: string;
    transparent: boolean;
    includeManifest: boolean;
    includeFinalCsv: boolean;
    includeContactSheet: boolean;
    pdfLayout: { enabled: boolean; mode: PdfLayout; averyTemplate: AveryTemplate; posterGrid: PosterGrid };
  };
  meta: { reliabilityScore: number; notes: string; tags: string[] };
}

export interface ProjectConfiguration {
  qrType: QrType;
  values: FormValues;
  style: QrStyle;
  batch: { enabled: boolean; fileName: string; csvData: string };
  logoSource: LogoMode;
  logoPreset: PresetLogoId | "";
  exportFormat: ExportFormat;
  dpi: number;
  batchMode: BatchExportMode;
  filenamePattern: string;
  includeManifest: boolean;
  includeFinalCsv: boolean;
  includeContactSheet: boolean;
  pdfLayout: PdfLayout;
  averyTemplate: AveryTemplate;
  posterGrid: PosterGrid;
}

export interface SerializeProjectInput extends ProjectConfiguration {
  id?: string;
  name: string;
  description: string;
  createdAt?: string;
  reliabilityScore: number;
  notes: string;
  tags: string[];
}

export function serializeCurrentConfigurationToProject(input: SerializeProjectInput): QrProject {
  const now = new Date().toISOString();
  const colors = input.style.gradientColors.length >= 2 ? input.style.gradientColors : [input.style.gradientStart, input.style.gradientEnd];
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: input.id || createProjectId(),
    name: input.name.trim(),
    description: input.description.trim(),
    createdAt: input.createdAt || now,
    updatedAt: now,
    qrType: input.qrType,
    content: { single: { ...input.values }, batch: { enabled: input.batch.enabled, sourceType: "csv", csvData: input.batch.csvData, fileName: input.batch.fileName, mapping: {} } },
    styling: {
      foregroundColor: input.style.foreground,
      backgroundColor: input.style.background,
      gradient: { enabled: input.style.gradientType !== "none", type: input.style.gradientType, direction: input.style.gradientType, stops: colors.map((color, index) => ({ position: colors.length === 1 ? 0 : index / (colors.length - 1), color })), pattern: input.style.gradientPattern, target: input.style.gradientTarget },
      dots: { shape: input.style.moduleShape, size: input.style.moduleScale, pattern: input.style.patternPreset },
      eyes: { shapeOuter: input.style.eyeShape, shapeInner: input.style.eyeShape, useCustomColors: true, outerColor: input.style.eyeOuterColor, innerColor: input.style.eyeInnerColor, gradientMode: input.style.eyeGradientMode },
      logo: { mode: input.logoSource, preset: input.logoPreset, uploadId: input.logoSource === "upload" ? "embedded-upload" : null, dataUrl: input.style.logoDataUrl, size: input.style.logoSize, padding: input.logoSource === "text" ? input.style.textLogo.padding : input.style.logoPadding, backgroundShape: input.logoSource === "text" ? input.style.textLogo.backgroundShape : input.style.logoBackgroundShape, autoContrast: input.logoSource === "text" ? input.style.textLogo.autoContrast : input.style.logoAutoContrast, text: input.style.textLogo.text, fontFamily: input.style.textLogo.fontFamily, fontWeight: input.style.textLogo.fontWeight, fontSize: input.style.textLogo.fontSize, color: input.style.textLogo.color, backgroundColor: input.style.textLogo.backgroundColor, centered: true },
      frame: normalizeFrame(input.style.frame).settings,
      quietZone: { size: 4, color: input.style.background },
      errorCorrection: input.logoSource === "text" ? "Q" : input.style.logoDataUrl && input.style.logoAutoEcc ? "H" : "M",
      raw: { ...input.style, gradientColors: [...input.style.gradientColors] },
    },
    export: { format: input.exportFormat, dpi: input.dpi, batchZip: true, batchMode: input.batchMode, filenamePattern: input.filenamePattern, transparent: input.style.transparent, includeManifest: input.includeManifest, includeFinalCsv: input.includeFinalCsv, includeContactSheet: input.includeContactSheet, pdfLayout: { enabled: input.pdfLayout !== "standard", mode: input.pdfLayout, averyTemplate: input.averyTemplate, posterGrid: input.posterGrid } },
    meta: { reliabilityScore: input.reliabilityScore, notes: input.notes.trim(), tags: input.tags.map((tag) => tag.trim()).filter(Boolean) },
  };
}

export function projectToConfiguration(project: QrProject): ProjectConfiguration {
  const legacyStyle = project.styling.raw ?? ({} as QrStyle);
  const stops = project.styling.gradient?.stops?.map((stop) => stop.color).filter(Boolean) ?? [];
  const logoMode = (["none", "upload", "preset", "text"] as LogoMode[]).includes(project.styling.logo?.mode) ? project.styling.logo.mode : "none";
  const textLogo = normalizeTextLogo({
    ...legacyStyle.textLogo,
    text: project.styling.logo?.text ?? legacyStyle.textLogo?.text,
    fontFamily: project.styling.logo?.fontFamily ?? legacyStyle.textLogo?.fontFamily,
    fontWeight: project.styling.logo?.fontWeight ?? legacyStyle.textLogo?.fontWeight,
    fontSize: project.styling.logo?.fontSize ?? legacyStyle.textLogo?.fontSize,
    color: project.styling.logo?.color ?? legacyStyle.textLogo?.color,
    backgroundShape: (project.styling.logo?.backgroundShape as TextLogoBackgroundShape) ?? legacyStyle.textLogo?.backgroundShape,
    backgroundColor: project.styling.logo?.backgroundColor ?? legacyStyle.textLogo?.backgroundColor,
    padding: project.styling.logo?.padding ?? legacyStyle.textLogo?.padding,
    autoContrast: project.styling.logo?.autoContrast ?? legacyStyle.textLogo?.autoContrast ?? true,
    centered: true,
  }).settings;
  const style: QrStyle = {
    ...DEFAULT_STYLE,
    ...legacyStyle,
    foreground: project.styling.foregroundColor || legacyStyle.foreground || DEFAULT_STYLE.foreground,
    background: project.styling.backgroundColor || legacyStyle.background || DEFAULT_STYLE.background,
    gradientType: project.styling.gradient?.enabled ? (project.styling.gradient.type as QrStyle["gradientType"]) : "none",
    gradientColors: stops.length >= 2 ? stops : legacyStyle.gradientColors ?? DEFAULT_STYLE.gradientColors,
    moduleShape: (project.styling.dots?.shape as QrStyle["moduleShape"]) || DEFAULT_STYLE.moduleShape,
    moduleScale: project.styling.dots?.size ?? DEFAULT_STYLE.moduleScale,
    eyeShape: (project.styling.eyes?.shapeOuter as QrStyle["eyeShape"]) || DEFAULT_STYLE.eyeShape,
    eyeOuterColor: project.styling.eyes?.outerColor || DEFAULT_STYLE.eyeOuterColor,
    eyeInnerColor: project.styling.eyes?.innerColor || DEFAULT_STYLE.eyeInnerColor,
    logoMode,
    logoDataUrl: project.styling.logo?.dataUrl || "",
    logoSize: project.styling.logo?.size ?? DEFAULT_STYLE.logoSize,
    logoPadding: logoMode === "text" ? textLogo.padding : project.styling.logo?.padding ?? DEFAULT_STYLE.logoPadding,
    logoBackgroundShape: logoMode === "text" ? textLogoEngineShape(textLogo.backgroundShape) : (project.styling.logo?.backgroundShape as QrStyle["logoBackgroundShape"]) || DEFAULT_STYLE.logoBackgroundShape,
    logoAutoContrast: logoMode === "text" ? textLogo.autoContrast : project.styling.logo?.autoContrast ?? DEFAULT_STYLE.logoAutoContrast,
    textLogo,
    frame: normalizeFrame(project.styling.frame ?? legacyStyle.frame ?? DEFAULT_STYLE.frame).settings,
    transparent: project.export.transparent ?? legacyStyle.transparent ?? false,
  };
  style.gradientStart = style.gradientColors[0] ?? style.gradientStart;
  style.gradientEnd = style.gradientColors[style.gradientColors.length - 1] ?? style.gradientEnd;
  return { qrType: project.qrType, values: { ...project.content.single }, style, batch: { enabled: project.content.batch?.enabled ?? false, fileName: project.content.batch?.fileName || "project-batch.csv", csvData: project.content.batch?.csvData || "" }, logoSource: logoMode, logoPreset: project.styling.logo?.preset ?? "", exportFormat: project.export.format ?? "png", dpi: project.export.dpi ?? 300, batchMode: project.export.batchMode ?? "selected", filenamePattern: project.export.filenamePattern || "{name}", includeManifest: project.export.includeManifest ?? true, includeFinalCsv: project.export.includeFinalCsv ?? false, includeContactSheet: project.export.includeContactSheet ?? false, pdfLayout: project.export.pdfLayout?.mode ?? "standard", averyTemplate: project.export.pdfLayout?.averyTemplate ?? "5160", posterGrid: project.export.pdfLayout?.posterGrid ?? "2x2" };
}

export function loadProjectsFromStorage(storage: Storage = localStorage): QrProject[] {
  try { const parsed = JSON.parse(storage.getItem(PROJECT_STORAGE_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed.filter(isQrProject) : []; } catch { return []; }
}
export function saveProjectsToStorage(projects: QrProject[], storage: Storage = localStorage) { storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects)); }
export function addOrUpdateProject(project: QrProject, storage: Storage = localStorage) { const projects = loadProjectsFromStorage(storage); const index = projects.findIndex((item) => item.id === project.id); if (index >= 0) projects[index] = project; else projects.unshift(project); saveProjectsToStorage(projects, storage); return projects; }
export function deleteProjectById(id: string, storage: Storage = localStorage) { const projects = loadProjectsFromStorage(storage).filter((project) => project.id !== id); saveProjectsToStorage(projects, storage); return projects; }

export function validateImportedProject(value: unknown): QrProject {
  if (!isQrProject(value)) throw new Error("This file is not a valid MonkeyTactics QR project.");
  return value;
}

export function createProjectId() { return globalThis.crypto?.randomUUID?.() ?? `qr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function isQrProject(value: unknown): value is QrProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<QrProject>;
  const qrTypes: QrType[] = ["url", "text", "wifi", "vcard", "email", "sms", "geo", "calendar", "totp", "crypto", "social"];
  const content = project.content as QrProject["content"] | undefined;
  const styling = project.styling as QrProject["styling"] | undefined;
  const exportOptions = project.export as QrProject["export"] | undefined;
  const meta = project.meta as QrProject["meta"] | undefined;
  return typeof project.id === "string" && project.id.length > 0
    && typeof project.name === "string" && project.name.trim().length > 0
    && typeof project.createdAt === "string" && typeof project.updatedAt === "string"
    && qrTypes.includes(project.qrType as QrType)
    && !!content && isRecord(content.single) && isRecord(content.batch)
    && !!styling && typeof styling.foregroundColor === "string" && typeof styling.backgroundColor === "string" && isRecord(styling.gradient) && isRecord(styling.dots) && isRecord(styling.eyes) && isRecord(styling.logo)
    && !!exportOptions && ["png", "svg", "pdf"].includes(exportOptions.format) && typeof exportOptions.dpi === "number"
    && !!meta && typeof meta.reliabilityScore === "number" && typeof meta.notes === "string" && Array.isArray(meta.tags) && meta.tags.every((tag) => typeof tag === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
