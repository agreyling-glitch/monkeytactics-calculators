import assert from "node:assert/strict";
import test from "node:test";

import { analyzeBatchCsv, parseBatchCsv } from "../src/utils/csvBatch.ts";

test("auto-cleans empty and exact duplicate CSV rows", () => {
  const analysis = analyzeBatchCsv("name,data,notes\r\nHome,https://example.com,keep\r\n\r\nHome,https://example.com,duplicate\r\nBlank,,remove\r\nContact,mailto:test@example.com,keep");
  assert.deepEqual(analysis.items, [
    { name: "Home", data: "https://example.com" },
    { name: "Contact", data: "mailto:test@example.com" },
  ]);
  assert.equal(analysis.duplicateRowsRemoved, 1);
  assert.equal(analysis.emptyRowsRemoved, 2);
  assert.deepEqual(analysis.ignoredColumns, ["notes"]);
  assert.deepEqual(analysis.textLogoWarnings, []);
  assert.deepEqual(analysis.frameWarnings, []);
});

test("cleans optional per-row frame overrides and reports invalid values", () => {
  const analysis = analyzeBatchCsv("name,data,frame_text,frame_color,frame_style\nMenu,https://example.com,menu🔥,#00aa44,rounded-rectangle\nBad,https://example.com/bad,pay,#oops,unknown");
  assert.deepEqual(analysis.items[0], { name: "Menu", data: "https://example.com", frameText: "MENU", frameColor: "#00AA44", frameStyle: "rounded-rectangle" });
  assert.deepEqual(analysis.items[1], { name: "Bad", data: "https://example.com/bad", frameText: "PAY" });
  assert.equal(analysis.frameWarnings.length, 2);
  assert.match(analysis.frameWarnings[1].messages.join(" "), /six-digit hex/);
  assert.match(analysis.frameWarnings[1].messages.join(" "), /Unknown frame style/);
});

test("cleans optional per-row text logo overrides and reports warnings", () => {
  const analysis = analyzeBatchCsv("name,data,text_logo\nHome,https://example.com,home\nOffer,https://example.com/deal,deal🔥_special-long");
  assert.deepEqual(analysis.items, [
    { name: "Home", data: "https://example.com", textLogo: "HOME" },
    { name: "Offer", data: "https://example.com/deal", textLogo: "DEAL_SPECIAL" },
  ]);
  assert.equal(analysis.textLogoWarnings.length, 1);
  assert.match(analysis.textLogoWarnings[0].messages.join(" "), /Only A-Z/);
  assert.match(analysis.textLogoWarnings[0].messages.join(" "), /Long text may reduce clarity/);
});

test("validates required and duplicate CSV columns", () => {
  assert.throws(() => parseBatchCsv("data\nhttps://example.com"), /name column/);
  assert.throws(() => parseBatchCsv("name,data,data\nHome,a,b"), /duplicate column headers: data/);
  assert.throws(() => parseBatchCsv('name,data\nHome,"unfinished'), /unclosed quoted value/);
});
