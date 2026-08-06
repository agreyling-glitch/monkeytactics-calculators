import assert from "node:assert/strict";
import test from "node:test";

await import(new URL("../assets/js/calculator-pdf.js", import.meta.url));

test("creates a paginated calculator PDF report", () => {
  const rows = Array.from({ length: 140 }, (_, index) => [
    `Year ${index + 1}`,
    `$${(1000 + index * 25).toFixed(2)}`,
    `$${(5000 + index * 100).toFixed(2)}`,
  ]);
  const bytes = globalThis.MonkeyTacticsPdf.createReportBytes({
    title: "Calculator Test Report",
    summary: [{ label: "Starting value", value: "$1,000.00" }],
    table: {
      title: "Growth Schedule",
      columns: [
        { label: "Period", width: 12 },
        { label: "Interest", width: 14, align: "right" },
        { label: "Balance", width: 14, align: "right" },
      ],
      rows,
    },
  });
  const pdf = new TextDecoder("latin1").decode(bytes);
  assert.match(pdf, /^%PDF-1\.4/);
  assert.ok((pdf.match(/\/Type \/Page\b/g) ?? []).length >= 3);
  assert.match(pdf, /Calculator Test Report/);
  assert.match(pdf, /startxref\n\d+\n%%EOF$/);
});
