import type { QrResult, QrStyle } from "../types";
import type { PerspectiveAssessment } from "./previewDiagnostics";

export type HeatmapRisk = "low" | "caution" | "critical";

export interface HeatmapCell {
  x: number;
  y: number;
  risk: HeatmapRisk;
  reason: string;
}

export function buildRiskHeatmap(result: QrResult, style: QrStyle): HeatmapCell[] {
  const size = result.moduleCount;
  const cells: HeatmapCell[] = [];
  const logo = logoBounds(size, style);
  const alignmentCenters = getAlignmentCenters(size);
  const styledDataRisk = getStyledDataRisk(style);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dark = result.modules[y * size + x] === 1;
      if (logo && x >= logo.start && x < logo.end && y >= logo.start && y < logo.end) {
        cells.push({ x, y, risk: logo.risk, reason: "Logo coverage" });
      } else if (inFinder(x, y, size)) {
        cells.push({ x, y, risk: "critical", reason: "Finder pattern" });
      } else if (inAlignmentPattern(x, y, size, alignmentCenters)) {
        cells.push({ x, y, risk: "critical", reason: "Alignment pattern" });
      } else if (inTimingOrFormatPattern(x, y, size)) {
        cells.push({ x, y, risk: "caution", reason: "Timing or format data" });
      } else if (dark) {
        cells.push({ x, y, risk: styledDataRisk, reason: styledDataRisk === "low" ? "Data module" : "Styled data module" });
      }
    }
  }
  return cells;
}

export function applyPerspectiveRisk(cells: HeatmapCell[], assessment: PerspectiveAssessment, size: number): HeatmapCell[] {
  if (assessment.angle === 0) return cells;
  const byCoordinate = new Map(cells.map((cell) => [`${cell.x}-${cell.y}`, cell]));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const perspectiveRisk = assessment.moduleRisks[y * size + x];
      if (perspectiveRisk === "low") continue;
      const key = `${x}-${y}`;
      const existing = byCoordinate.get(key);
      if (!existing) {
        byCoordinate.set(key, { x, y, risk: perspectiveRisk, reason: perspectiveReason(perspectiveRisk) });
        continue;
      }
      if (riskRank(perspectiveRisk) > riskRank(existing.risk)) existing.risk = perspectiveRisk;
      existing.reason = `${existing.reason}; ${perspectiveReason(perspectiveRisk).toLowerCase()}`;
    }
  }
  return [...byCoordinate.values()].sort((left, right) => left.y - right.y || left.x - right.x);
}

function inFinder(x: number, y: number, size: number) {
  return (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
}

function inTimingOrFormatPattern(x: number, y: number, size: number) {
  const timing = (x === 6 && y >= 8 && y < size - 8) || (y === 6 && x >= 8 && x < size - 8);
  const format = (x === 8 && (y < 9 || y >= size - 8)) || (y === 8 && (x < 9 || x >= size - 8));
  return timing || format;
}

function getAlignmentCenters(size: number) {
  const version = Math.round((size - 17) / 4);
  if (version <= 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + count * 2 + 1) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let index = count - 2; index >= 0; index -= 1) positions.push(size - 7 - index * step);
  return positions;
}

function inAlignmentPattern(x: number, y: number, size: number, centers: number[]) {
  return centers.some((centerX) => centers.some((centerY) => {
    if ((centerX === 6 && centerY === 6) || (centerX === 6 && centerY === size - 7) || (centerX === size - 7 && centerY === 6)) return false;
    return Math.abs(x - centerX) <= 2 && Math.abs(y - centerY) <= 2;
  }));
}

function logoBounds(size: number, style: QrStyle) {
  if (!style.logoDataUrl) return null;
  const maximum = style.logoSafeMode ? 0.2 : 0.3;
  const modules = Math.max(3, Math.round(size * Math.min(maximum, Math.max(0.08, style.logoSize))));
  const start = Math.floor((size - modules) / 2);
  return { start, end: start + modules, risk: (!style.logoSafeMode || style.logoSize > 0.2 ? "critical" : "caution") as HeatmapRisk };
}

function getStyledDataRisk(style: QrStyle): HeatmapRisk {
  if (style.artistic || style.moduleScale < 0.7) return "critical";
  if (style.moduleScale < 0.9 || style.noise || style.texture || style.glow || style.patternPreset === "tech") return "caution";
  return "low";
}

function perspectiveReason(risk: PerspectiveRiskForHeatmap) {
  return risk === "critical" ? "Critical camera-perspective compression" : "Camera-perspective compression";
}

type PerspectiveRiskForHeatmap = "caution" | "critical";

function riskRank(risk: HeatmapRisk) {
  return risk === "critical" ? 2 : risk === "caution" ? 1 : 0;
}
