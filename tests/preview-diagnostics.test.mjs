import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_STYLE } from "../src/types.ts";
import { assessPerspectiveDistortion, buildErrorCorrectionMap, buildPreviewTransform, buildRawQrSvg, diagnoseQuietZone, projectCameraPoint } from "../src/utils/previewDiagnostics.ts";
import { applyPerspectiveRisk, buildRiskHeatmap } from "../src/utils/riskHeatmap.ts";

const result = {
  moduleCount: 21,
  modules: Array.from({ length: 21 * 21 }, (_, index) => index % 3 === 0 ? 1 : 0),
  svg: "<svg></svg>",
  reliabilityScore: 100,
  reliabilityLabel: "Excellent",
  suggestions: [],
};

test("reconstructs a raw QR with a four-module quiet zone", () => {
  const svg = buildRawQrSvg(result);
  assert.match(svg, /viewBox="0 0 29 29"/);
  assert.match(svg, /fill="#fff"/);
  assert.match(svg, /M4 4h1v1h-1z/);
});

test("builds a perspective transform without changing export styling", () => {
  assert.equal(buildPreviewTransform({ x: 12, y: -8 }, 1.3, 40), "translate(12px, -8px) perspective(900px) rotateX(-7.2deg) rotateY(40deg) scale(1.3)");
});

test("projects and scores the same camera distortion used by the preview", () => {
  const flat = assessPerspectiveDistortion(result, 0);
  const angled = assessPerspectiveDistortion(result, 55);
  assert.equal(flat.score, result.reliabilityScore);
  assert.equal(flat.penalty, 0);
  assert.ok(angled.score < flat.score);
  assert.ok(angled.penalty > 0);
  assert.ok(angled.moduleRisks.includes("critical"));
  assert.ok(angled.minimumScale < flat.minimumScale);
  assert.notDeepEqual(projectCameraPoint(0, 0, 55), projectCameraPoint(1, 0, 55));
});

test("promotes compressed modules in the distorted heatmap", () => {
  const flatHeatmap = buildRiskHeatmap(result, DEFAULT_STYLE);
  const assessment = assessPerspectiveDistortion(result, 55);
  const distortedHeatmap = applyPerspectiveRisk(flatHeatmap, assessment, result.moduleCount);
  assert.ok(distortedHeatmap.length > flatHeatmap.length);
  assert.ok(distortedHeatmap.some((cell) => cell.reason.includes("camera-perspective compression")));
  assert.ok(distortedHeatmap.filter((cell) => cell.risk === "critical").length > flatHeatmap.filter((cell) => cell.risk === "critical").length);
});

test("flags styling that can contaminate the quiet zone", () => {
  assert.deepEqual(diagnoseQuietZone(DEFAULT_STYLE), { violated: false, reasons: [] });
  const diagnostic = diagnoseQuietZone({ ...DEFAULT_STYLE, transparent: true, glow: true });
  assert.equal(diagnostic.violated, true);
  assert.equal(diagnostic.reasons.length, 2);
});

test("maps function, payload, and increasing error-correction regions", () => {
  const medium = buildErrorCorrectionMap(result, "medium");
  const high = buildErrorCorrectionMap(result, "high");
  assert.equal(medium.length, 21 * 21);
  assert.ok(medium.some((cell) => cell.kind === "function"));
  assert.ok(medium.some((cell) => cell.kind === "data"));
  assert.ok(medium.some((cell) => cell.kind === "correction"));
  assert.ok(high.filter((cell) => cell.kind === "correction").length > medium.filter((cell) => cell.kind === "correction").length);
});
