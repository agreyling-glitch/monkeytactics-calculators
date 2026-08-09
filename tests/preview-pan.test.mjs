import assert from "node:assert/strict";
import test from "node:test";

import { clampPreviewPan, MAX_PREVIEW_ZOOM, MIN_PREVIEW_ZOOM, stepPreviewZoom, togglePreviewZoom } from "../apps/qr-studio/src/utils/previewPan.ts";

test("doubles the live-preview maximum zoom", () => {
  assert.equal(MAX_PREVIEW_ZOOM, 3.4);
  let zoom = 1;
  for (let index = 0; index < 16; index += 1) zoom = stepPreviewZoom(zoom, 1);
  assert.equal(zoom, 3.4);
  for (let index = 0; index < 16; index += 1) zoom = stepPreviewZoom(zoom, -1);
  assert.equal(zoom, 1);
});

test("resets panning at normal zoom and constrains it while zoomed", () => {
  const dimensions = { stageWidth: 600, stageHeight: 500, frameWidth: 440, frameHeight: 440 };
  assert.deepEqual(clampPreviewPan({ x: 80, y: -60 }, { ...dimensions, zoom: 1 }), { x: 0, y: 0 });
  assert.deepEqual(clampPreviewPan({ x: 999, y: -999 }, { ...dimensions, zoom: 2 }), { x: 164, y: -214 });
});

test("double-click zoom toggles between both extremes", () => {
  assert.equal(togglePreviewZoom(1), MAX_PREVIEW_ZOOM);
  assert.equal(togglePreviewZoom(MAX_PREVIEW_ZOOM), MIN_PREVIEW_ZOOM);
  assert.equal(togglePreviewZoom(MIN_PREVIEW_ZOOM), MAX_PREVIEW_ZOOM);
});
