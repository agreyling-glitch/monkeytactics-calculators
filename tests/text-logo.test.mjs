import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_STYLE } from "../apps/qr-studio/src/types.ts";
import { errorCorrectionForStyle } from "../apps/qr-studio/src/utils/errorCorrection.ts";
import { normalizeFrame } from "../apps/qr-studio/src/utils/frame.ts";
import { normalizeTextLogo } from "../apps/qr-studio/src/utils/textLogo.ts";

test("normalizes text logos to the mandatory character and layout limits", () => {
  const normalized = normalizeTextLogo({
    text: "menu🔥_special-long",
    fontSize: 999,
    fontWeight: "thin",
    padding: 0.4,
    backgroundShape: "floating",
    backgroundColor: "#FFFFFF",
    autoContrast: false,
    centered: false,
  });

  assert.equal(normalized.settings.text, "MENU_SPECIAL");
  assert.equal(normalized.settings.text.length, 12);
  assert.equal(normalized.settings.fontSize, 128);
  assert.equal(normalized.settings.fontWeight, "bold");
  assert.equal(normalized.settings.padding, 0.2);
  assert.equal(normalized.settings.backgroundShape, "rounded-square");
  assert.equal(normalized.settings.color, "#000000");
  assert.equal(normalized.settings.autoContrast, false);
  assert.equal(normalized.settings.centered, true);
  assert.match(normalized.warnings.join(" "), /Long text may reduce clarity/);
});

test("keeps a selected foreground color when auto contrast is off", () => {
  const custom = normalizeTextLogo({ text: "SALE", color: "#FFCC00", backgroundColor: "#111827", autoContrast: false });
  assert.equal(custom.settings.color, "#FFCC00");
  assert.equal(custom.settings.autoContrast, false);
  const automatic = normalizeTextLogo({ ...custom.settings, autoContrast: true });
  assert.equal(automatic.settings.color, "#FFFFFF");
});

test("allows spaces while a text logo is being typed", () => {
  const normalized = normalizeTextLogo({ text: "SCAN " });
  assert.equal(normalized.settings.text, "SCAN ");
});

test("text logos boost medium error correction to quartile", () => {
  assert.equal(errorCorrectionForStyle(DEFAULT_STYLE), "medium");
  assert.equal(errorCorrectionForStyle({ ...DEFAULT_STYLE, logoMode: "text" }), "quartile");
  assert.equal(errorCorrectionForStyle({ ...DEFAULT_STYLE, logoMode: "upload", logoDataUrl: "data:image/png;base64,AA==" }), "high");
});

test("frames boost medium error correction to quartile", () => {
  assert.equal(errorCorrectionForStyle({ ...DEFAULT_STYLE, frame: { ...DEFAULT_STYLE.frame, enabled: true } }), "quartile");
});

test("normalizes frames without removing preset label spaces", () => {
  const normalized = normalizeFrame({
    enabled: true,
    text: "scan me!",
    thickness: 0.9,
    padding: 0,
    textSize: 99,
    textColor: "#FACC15",
    autoContrast: false,
  });
  assert.equal(normalized.settings.text, "SCAN ME");
  assert.equal(normalized.settings.thickness, 0.15);
  assert.equal(normalized.settings.padding, 0.06);
  assert.equal(normalized.settings.textSize, 40);
  assert.equal(normalized.settings.textColor, "#FACC15");
  assert.equal(normalized.settings.autoContrast, false);
  assert.match(normalized.warnings.join(" "), /Frame text allows only/);
});

test("allows spaces while frame text is being typed", () => {
  const normalized = normalizeFrame({ text: "SCAN " });
  assert.equal(normalized.settings.text, "SCAN ");
});
