import { normalizeTextLogo } from "./textLogo.ts";
import { FRAME_STYLES, normalizeFrame } from "./frame.ts";
import type { FrameStyle } from "../types.ts";

export interface BatchCsvItem {
  name: string;
  data: string;
  textLogo?: string;
  frameText?: string;
  frameColor?: string;
  frameStyle?: FrameStyle;
}

export interface BatchTextLogoWarning {
  row: number;
  name: string;
  messages: string[];
}

export interface BatchFrameWarning extends BatchTextLogoWarning {}

export interface BatchCsvAnalysis {
  items: BatchCsvItem[];
  originalDataRows: number;
  emptyRowsRemoved: number;
  duplicateRowsRemoved: number;
  ignoredColumns: string[];
  textLogoWarnings: BatchTextLogoWarning[];
  frameWarnings: BatchFrameWarning[];
}

export function parseBatchCsv(csv: string): BatchCsvItem[] {
  return analyzeBatchCsv(csv).items;
}

export function analyzeBatchCsv(csv: string): BatchCsvAnalysis {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (!rows.length) throw new Error("CSV file is empty. Add name,data headers and at least one row.");
  const header = rows[0].map((value) => value.trim().toLowerCase());
  const duplicateHeaders = header.filter((value, index) => value && header.indexOf(value) !== index);
  if (duplicateHeaders.length) throw new Error(`CSV contains duplicate column headers: ${[...new Set(duplicateHeaders)].join(", ")}.`);
  const nameIndex = header.indexOf("name");
  const dataIndex = header.indexOf("data");
  const textLogoIndex = header.indexOf("text_logo");
  const frameTextIndex = header.indexOf("frame_text");
  const frameColorIndex = header.indexOf("frame_color");
  const frameStyleIndex = header.indexOf("frame_style");
  const missing = [nameIndex < 0 ? "name" : "", dataIndex < 0 ? "data" : ""].filter(Boolean);
  if (missing.length) throw new Error(`CSV must include ${missing.join(" and ")} ${missing.length === 1 ? "column" : "columns"}. Required headers are name,data.`);

  const supportedColumns = new Set(["name", "data", "text_logo", "frame_text", "frame_color", "frame_style"]);
  const ignoredColumns = header.filter((value) => value && !supportedColumns.has(value));
  const items: BatchCsvItem[] = [];
  const textLogoWarnings: BatchTextLogoWarning[] = [];
  const frameWarnings: BatchFrameWarning[] = [];
  const seen = new Set<string>();
  let emptyRowsRemoved = 0;
  let duplicateRowsRemoved = 0;

  rows.slice(1).forEach((cells, index) => {
    const name = cells[nameIndex]?.trim() || `qrcode-${index + 1}`;
    const data = cells[dataIndex]?.trim() ?? "";
    if (!data) {
      emptyRowsRemoved += 1;
      return;
    }
    const rawTextLogo = textLogoIndex >= 0 ? cells[textLogoIndex]?.trim() ?? "" : "";
    let textLogo: string | undefined;
    if (rawTextLogo) {
      const normalized = normalizeTextLogo({ text: rawTextLogo });
      textLogo = normalized.settings.text || undefined;
      if (normalized.warnings.length || !textLogo) {
        textLogoWarnings.push({
          row: index + 2,
          name,
          messages: [...normalized.warnings, ...(!textLogo ? ["The text logo override was ignored because no valid characters remained."] : [])],
        });
      }
    }
    const rawFrameText = frameTextIndex >= 0 ? cells[frameTextIndex]?.trim() ?? "" : "";
    const rawFrameColor = frameColorIndex >= 0 ? cells[frameColorIndex]?.trim() ?? "" : "";
    const rawFrameStyle = frameStyleIndex >= 0 ? cells[frameStyleIndex]?.trim().toLowerCase() ?? "" : "";
    let frameText: string | undefined;
    let frameColor: string | undefined;
    let frameStyle: FrameStyle | undefined;
    const rowFrameWarnings: string[] = [];
    if (rawFrameText) {
      const normalized = normalizeFrame({ text: rawFrameText });
      frameText = normalized.settings.text || undefined;
      rowFrameWarnings.push(...normalized.warnings);
      if (!frameText) rowFrameWarnings.push("The frame text override was ignored because no valid characters remained.");
    }
    if (rawFrameColor) {
      if (/^#[0-9A-F]{6}$/i.test(rawFrameColor)) frameColor = rawFrameColor.toUpperCase();
      else rowFrameWarnings.push("Frame color must use six-digit hex notation, such as #000000; the override was ignored.");
    }
    if (rawFrameStyle) {
      if (FRAME_STYLES.includes(rawFrameStyle as FrameStyle)) frameStyle = rawFrameStyle as FrameStyle;
      else rowFrameWarnings.push(`Unknown frame style “${rawFrameStyle}”; the override was ignored.`);
    }
    if (rowFrameWarnings.length) frameWarnings.push({ row: index + 2, name, messages: [...new Set(rowFrameWarnings)] });
    const duplicateKey = `${name.toLocaleLowerCase()}\u0000${data}\u0000${textLogo ?? ""}\u0000${frameText ?? ""}\u0000${frameColor ?? ""}\u0000${frameStyle ?? ""}`;
    if (seen.has(duplicateKey)) {
      duplicateRowsRemoved += 1;
      return;
    }
    seen.add(duplicateKey);
    items.push({ name, data, ...(textLogo ? { textLogo } : {}), ...(frameText ? { frameText } : {}), ...(frameColor ? { frameColor } : {}), ...(frameStyle ? { frameStyle } : {}) });
  });

  return { items, originalDataRows: rows.length - 1, emptyRowsRemoved, duplicateRowsRemoved, ignoredColumns, textLogoWarnings, frameWarnings };
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"' && quoted && csv[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted value.");
  row.push(cell);
  if (row.length > 1 || row.some((value) => value.length)) rows.push(row);
  return rows;
}
