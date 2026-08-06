import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import init, {
  batch_generate,
  export_pdf,
  export_png,
  export_svg,
  generate_qr,
  style_qr,
  verify_domain,
} from "../assets/wasm/qr-code-generator/qr_engine.js";
import { composePdfBooklet, composePdfContactSheet } from "../src/utils/pdfLayout.ts";

const wasmBytes = fs.readFileSync(new URL("../assets/wasm/qr-code-generator/qr_engine_bg.wasm", import.meta.url));
await init({ module_or_path: wasmBytes });

test("authorizes production, Pages previews, and local Wrangler", () => {
  assert.equal(verify_domain("monkeytactics.com"), true);
  assert.equal(verify_domain("www.monkeytactics.com"), true);
  assert.equal(verify_domain("monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("feature.monkeytactics-calculators.pages.dev"), true);
  assert.equal(verify_domain("127.0.0.1"), true);
  assert.equal(verify_domain("localhost"), false);
  assert.equal(verify_domain("evilmonkeytactics-calculators.pages.dev"), false);
});

test("generates, restyles, and exports an active QR code", () => {
  const generated = generate_qr({ data: "https://monkeytactics.com", ecc: "high" });
  assert.match(generated.svg, /^<svg/);
  assert.ok(generated.moduleCount >= 21);
  assert.ok(generated.reliabilityScore > 0);

  const styled = style_qr({ moduleShape: "circle", foreground: "#0f172a" });
  assert.match(styled.svg, /<circle/);
  assert.match(export_svg(), /^<svg/);

  const png = export_png(72);
  assert.deepEqual(Array.from(png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(new TextDecoder().decode(export_pdf().slice(0, 8)), "%PDF-1.4");
});

test("batch generation returns one styled SVG per item", () => {
  const output = batch_generate({
    items: [{ name: "Home", data: "https://monkeytactics.com" }, { name: "Call", data: "tel:+15551234567" }],
    style: { gradientType: "linear", gradientStart: "#111827", gradientEnd: "#22c55e" },
  });
  assert.equal(output.items.length, 2);
  assert.equal(output.items[0].name, "Home");
  assert.match(output.items[0].svg, /fill="#[0-9a-f]{6}"/);
});

test("builds labeled batch booklet and thumbnail contact sheet PDFs", () => {
  const sourcePdfs = ["https://monkeytactics.com/one", "https://monkeytactics.com/two"].map((data) => {
    generate_qr({ data, ecc: "medium" });
    return export_pdf();
  });
  const booklet = new TextDecoder("latin1").decode(composePdfBooklet(sourcePdfs, ["First QR", "Second QR"]));
  const contactSheet = new TextDecoder("latin1").decode(composePdfContactSheet(sourcePdfs, ["First QR", "Second QR"]));
  assert.match(booklet, /^%PDF-1\.4/);
  assert.equal((booklet.match(/\/Type \/Page\b/g) ?? []).length, 2);
  assert.match(booklet, /\(First QR\) Tj/);
  assert.match(contactSheet, /^%PDF-1\.4/);
  assert.equal((contactSheet.match(/\/Type \/Page\b/g) ?? []).length, 1);
  assert.match(contactSheet, /\(Second QR\) Tj/);
});
