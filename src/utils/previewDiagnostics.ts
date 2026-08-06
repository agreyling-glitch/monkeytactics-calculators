import type { QrResult, QrStyle } from "../types";
import type { QrErrorCorrection } from "./errorCorrection";

export type ErrorCorrectionCellKind = "function" | "data" | "correction";

export interface ErrorCorrectionCell {
  x: number;
  y: number;
  kind: ErrorCorrectionCellKind;
}

export interface QuietZoneDiagnostic {
  violated: boolean;
  reasons: string[];
}

export type PerspectiveRisk = "low" | "caution" | "critical";

export interface PerspectiveAssessment {
  angle: number;
  score: number;
  label: string;
  penalty: number;
  minimumScale: number;
  tenthPercentileScale: number;
  moduleRisks: PerspectiveRisk[];
  suggestions: string[];
}

interface ProjectedPoint {
  x: number;
  y: number;
}

const CAMERA_DISTANCE = 2.05;

export function buildPreviewTransform(pan: { x: number; y: number }, zoom: number, perspective: number, frameWidth = 900 / CAMERA_DISTANCE) {
  const verticalTilt = Math.round(-perspective * 18) / 100;
  const cameraDistance = Math.round(frameWidth * CAMERA_DISTANCE * 100) / 100;
  return `translate(${pan.x}px, ${pan.y}px) perspective(${cameraDistance}px) rotateX(${verticalTilt}deg) rotateY(${perspective}deg) scale(${zoom})`;
}

export function assessPerspectiveDistortion(result: QrResult, angle: number): PerspectiveAssessment {
  const normalizedAngle = clamp(angle, 0, 55);
  const size = result.moduleCount;
  const flatModuleSize = 1 / size;
  const metrics: Array<{ minimumScale: number; areaScale: number }> = [];
  const moduleRisks: PerspectiveRisk[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const corners = [
        projectCameraPoint(x / size, y / size, normalizedAngle),
        projectCameraPoint((x + 1) / size, y / size, normalizedAngle),
        projectCameraPoint((x + 1) / size, (y + 1) / size, normalizedAngle),
        projectCameraPoint(x / size, (y + 1) / size, normalizedAngle),
      ];
      const edgeScales = [
        distance(corners[0], corners[1]),
        distance(corners[1], corners[2]),
        distance(corners[2], corners[3]),
        distance(corners[3], corners[0]),
      ].map((length) => length / flatModuleSize);
      const minimumScale = Math.min(...edgeScales);
      const areaScale = polygonArea(corners) / (flatModuleSize * flatModuleSize);
      metrics.push({ minimumScale, areaScale });
      moduleRisks.push(minimumScale < 0.52 || areaScale < 0.42 ? "critical" : minimumScale < 0.76 || areaScale < 0.68 ? "caution" : "low");
    }
  }

  const scales = metrics.map((metric) => metric.minimumScale).sort((left, right) => left - right);
  const areas = metrics.map((metric) => metric.areaScale).sort((left, right) => left - right);
  const minimumScale = scales[0] ?? 1;
  const tenthPercentileScale = percentile(scales, 0.1);
  const tenthPercentileArea = percentile(areas, 0.1);
  const penalty = normalizedAngle === 0 ? 0 : Math.round(
    Math.max(0, 1 - tenthPercentileScale) * 38
    + Math.max(0, 0.76 - minimumScale) * 38
    + Math.max(0, 0.72 - tenthPercentileArea) * 22,
  );
  const score = clamp(result.reliabilityScore - penalty, 0, 100);
  const suggestions: string[] = [];
  if (normalizedAngle >= 18) suggestions.push("Move the camera closer to square-on so the far-side modules remain large enough to resolve.");
  if (moduleRisks.includes("critical")) suggestions.push("The simulated camera angle critically compresses modules along the far edge.");
  else if (moduleRisks.includes("caution")) suggestions.push("Perspective compression is reducing module separation along the far edge.");

  return {
    angle: normalizedAngle,
    score,
    label: reliabilityLabel(score),
    penalty,
    minimumScale,
    tenthPercentileScale,
    moduleRisks,
    suggestions,
  };
}

export function projectCameraPoint(x: number, y: number, angle: number): ProjectedPoint {
  const yaw = degreesToRadians(clamp(angle, 0, 55));
  const pitch = degreesToRadians(-clamp(angle, 0, 55) * 0.18);
  const centeredX = x - 0.5;
  const centeredY = y - 0.5;
  const yawX = centeredX * Math.cos(yaw);
  const yawZ = -centeredX * Math.sin(yaw);
  const pitchedY = centeredY * Math.cos(pitch) - yawZ * Math.sin(pitch);
  const pitchedZ = centeredY * Math.sin(pitch) + yawZ * Math.cos(pitch);
  const perspectiveScale = CAMERA_DISTANCE / (CAMERA_DISTANCE - pitchedZ);
  return { x: yawX * perspectiveScale + 0.5, y: pitchedY * perspectiveScale + 0.5 };
}

const ECC_SHARE: Record<QrErrorCorrection, number> = {
  medium: 0.15,
  quartile: 0.25,
  high: 0.30,
};

export function buildRawQrSvg(result: QrResult) {
  const quietZone = 4;
  const size = result.moduleCount;
  const outputSize = size + quietZone * 2;
  const modules: string[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (result.modules[y * size + x] === 1) modules.push(`M${x + quietZone} ${y + quietZone}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outputSize} ${outputSize}" role="img" aria-label="Raw unstyled QR code"><rect width="${outputSize}" height="${outputSize}" fill="#fff"/><path d="${modules.join("")}" fill="#000" shape-rendering="crispEdges"/></svg>`;
}

export function diagnoseQuietZone(style: QrStyle): QuietZoneDiagnostic {
  const reasons: string[] = [];
  if (style.transparent) reasons.push("The transparent background can reveal artwork behind the quiet zone.");
  if (style.gradientType !== "none" && style.gradientTarget === "quiet-zone") reasons.push("A gradient is applied inside the quiet zone.");
  if (style.noise || style.texture) reasons.push("Texture or noise can add marks inside the quiet zone.");
  if (style.artistic) reasons.push("Artistic masking can reduce quiet-zone separation.");
  if (style.glow || style.dropShadow) reasons.push("Glow or shadow may spill into the quiet zone.");
  return { violated: reasons.length > 0, reasons };
}

export function buildErrorCorrectionMap(result: QrResult, level: QrErrorCorrection): ErrorCorrectionCell[] {
  const size = result.moduleCount;
  const reserved = buildFunctionMask(size);
  const dataOrder = qrDataTraversal(size, reserved);
  const correctionCount = Math.round(dataOrder.length * ECC_SHARE[level]);
  const correctionStart = Math.max(0, dataOrder.length - correctionCount);
  const correctionKeys = new Set(dataOrder.slice(correctionStart).map(({ x, y }) => `${x}-${y}`));
  const cells: ErrorCorrectionCell[] = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      cells.push({
        x,
        y,
        kind: reserved[index] ? "function" : correctionKeys.has(`${x}-${y}`) ? "correction" : "data",
      });
    }
  }
  return cells;
}

function buildFunctionMask(size: number) {
  const reserved = new Array<boolean>(size * size).fill(false);
  const mark = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < size && y < size) reserved[y * size + x] = true;
  };
  const markRect = (startX: number, startY: number, width: number, height: number) => {
    for (let y = startY; y < startY + height; y += 1) {
      for (let x = startX; x < startX + width; x += 1) mark(x, y);
    }
  };

  markRect(0, 0, 9, 9);
  markRect(size - 8, 0, 8, 9);
  markRect(0, size - 8, 9, 8);
  for (let index = 0; index < size; index += 1) {
    mark(6, index);
    mark(index, 6);
  }

  for (const centerY of alignmentCenters(size)) {
    for (const centerX of alignmentCenters(size)) {
      const overlapsFinder = (centerX <= 8 && centerY <= 8)
        || (centerX >= size - 8 && centerY <= 8)
        || (centerX <= 8 && centerY >= size - 8);
      if (!overlapsFinder) markRect(centerX - 2, centerY - 2, 5, 5);
    }
  }

  for (let index = 0; index <= 8; index += 1) {
    mark(8, index);
    mark(index, 8);
  }
  for (let index = size - 8; index < size; index += 1) mark(index, 8);
  for (let index = size - 7; index < size; index += 1) mark(8, index);
  mark(8, size - 8);

  const version = Math.round((size - 17) / 4);
  if (version >= 7) {
    markRect(size - 11, 0, 3, 6);
    markRect(0, size - 11, 6, 3);
  }
  return reserved;
}

function qrDataTraversal(size: number, reserved: boolean[]) {
  const coordinates: Array<{ x: number; y: number }> = [];
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right -= 1;
    for (let offset = 0; offset < size; offset += 1) {
      const y = upward ? size - 1 - offset : offset;
      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (!reserved[y * size + x]) coordinates.push({ x, y });
      }
    }
    upward = !upward;
  }
  return coordinates;
}

function alignmentCenters(size: number) {
  const version = Math.round((size - 17) / 4);
  if (version <= 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + count * 2 + 1) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let index = count - 2; index >= 0; index -= 1) positions.push(size - 7 - index * step);
  return positions;
}

function distance(left: ProjectedPoint, right: ProjectedPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function polygonArea(points: ProjectedPoint[]) {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

function percentile(sorted: number[], ratio: number) {
  if (!sorted.length) return 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)))];
}

function reliabilityLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "At risk";
}

function degreesToRadians(value: number) {
  return value * Math.PI / 180;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
