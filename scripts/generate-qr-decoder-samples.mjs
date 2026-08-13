import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareZXingModule, writeBarcode } from "zxing-wasm/writer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "assets", "images", "qr-code-decoder", "samples");
const writerWasm = await fs.readFile(path.join(root, "node_modules", "zxing-wasm", "dist", "writer", "zxing_writer.wasm"));

prepareZXingModule({ overrides: { wasmBinary: writerWasm } });

const samples = [
  ["qr-code", "QRCode", "https://example.com/qr"],
  ["micro-qr-code", "MicroQRCode", "12345"],
  ["rmqr", "rMQRCode", "RMQR SAMPLE"],
  ["aztec", "Aztec", "AZTEC SAMPLE"],
  ["codabar", "Codabar", "A123456B"],
  ["code-39", "Code39", "SAMPLE39"],
  ["code-93", "Code93", "SAMPLE93"],
  ["code-128", "Code128", "SAMPLE-128"],
  ["databar", "DataBar", "09506000134352"],
  ["databar-expanded", "DataBarExpanded", "(01)09506000134352(10)ABC123", "gs1"],
  ["databar-limited", "DataBarLimited", "09506000134352"],
  ["data-matrix", "DataMatrix", "https://example.com/01/09506000134352"],
  ["dx-film-edge", "DXFilmEdge", "012345"],
  ["ean-8", "EAN-8", "96385074"],
  ["ean-13", "EAN-13", "5901234123457"],
  ["itf", "ITF", "1234567890"],
  ["maxicode", "MaxiCode", "MAXICODE SAMPLE"],
  ["pdf417", "PDF417", "PDF417 SAMPLE"],
  ["upc-a", "UPC-A", "036000291452"],
  ["upc-e", "UPC-E", "04210007"],
];

await fs.mkdir(outputDirectory, { recursive: true });

for (const [slug, format, content, options = ""] of samples) {
  const result = await writeBarcode(content, {
    format,
    options,
    scale: 2,
    withHRT: false,
    withQuietZones: true,
  });
  if (result.error || !result.svg) {
    throw new Error(`${format}: ${result.error || "no SVG returned"}`);
  }
  await fs.writeFile(path.join(outputDirectory, `${slug}.svg`), result.svg, "utf8");
}

console.log(`Generated ${samples.length} sample symbols in ${outputDirectory}`);
