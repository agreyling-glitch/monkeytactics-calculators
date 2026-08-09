export type PdfLayout = "standard" | "labels" | "poster" | "business-cards";
export type AveryTemplate = "5160" | "5163" | "5164";
export type PosterGrid = "2x2" | "3x3" | "4x4";

export interface PdfLayoutOptions {
  layout: PdfLayout;
  averyTemplate: AveryTemplate;
  posterGrid: PosterGrid;
}

interface GridDefinition {
  columns: number;
  rows: number;
  marginX: number;
  marginY: number;
  gapX: number;
  gapY: number;
}

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const SOURCE_PAGE_SIZE = 612;

export function composePdfLayout(sourcePdfs: Uint8Array[], options: PdfLayoutOptions): Uint8Array {
  if (!sourcePdfs.length) throw new Error("No QR PDFs were available for layout export.");
  const grid = getGrid(options);
  const extracted = sourcePdfs.map(extractSourcePdf);
  const perPage = grid.columns * grid.rows;
  const pages: string[] = [];

  for (let pageStart = 0; pageStart < extracted.length; pageStart += perPage) {
    const pageItems = extracted.slice(pageStart, pageStart + perPage);
    const cellWidth = (PAGE_WIDTH - grid.marginX * 2 - grid.gapX * (grid.columns - 1)) / grid.columns;
    const cellHeight = (PAGE_HEIGHT - grid.marginY * 2 - grid.gapY * (grid.rows - 1)) / grid.rows;
    let content = "";
    pageItems.forEach((item, index) => {
      const column = index % grid.columns;
      const row = Math.floor(index / grid.columns);
      const cellX = grid.marginX + column * (cellWidth + grid.gapX);
      const cellY = PAGE_HEIGHT - grid.marginY - (row + 1) * cellHeight - row * grid.gapY;
      const side = Math.min(cellWidth, cellHeight);
      const scale = side / SOURCE_PAGE_SIZE;
      const x = cellX + (cellWidth - side) / 2;
      const y = cellY + (cellHeight - side) / 2;
      content += `q ${number(scale)} 0 0 ${number(scale)} ${number(x)} ${number(y)} cm\n${item.content}\nQ\n`;
    });
    pages.push(content);
  }

  return makeMultiPagePdf(pages, extracted.find((item) => item.logo)?.logo ?? null);
}

export function composePdfBooklet(sourcePdfs: Uint8Array[], names: string[]): Uint8Array {
  return composeLabeledGrid(sourcePdfs, names, 1, 1, 500, 16);
}

export function composePdfContactSheet(sourcePdfs: Uint8Array[], names: string[]): Uint8Array {
  return composeLabeledGrid(sourcePdfs, names, 3, 4, 130, 8);
}

function composeLabeledGrid(sourcePdfs: Uint8Array[], names: string[], columns: number, rows: number, qrSize: number, fontSize: number) {
  if (!sourcePdfs.length) throw new Error("No QR PDFs were available for this PDF export.");
  const extracted = sourcePdfs.map(extractSourcePdf);
  const pages: string[] = [];
  const marginX = 30;
  const marginY = 34;
  const cellWidth = (PAGE_WIDTH - marginX * 2) / columns;
  const cellHeight = (PAGE_HEIGHT - marginY * 2) / rows;
  const perPage = columns * rows;
  for (let pageStart = 0; pageStart < extracted.length; pageStart += perPage) {
    let content = "";
    extracted.slice(pageStart, pageStart + perPage).forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cellX = marginX + column * cellWidth;
      const cellTop = PAGE_HEIGHT - marginY - row * cellHeight;
      const side = Math.min(qrSize, cellWidth - 12, cellHeight - fontSize - 22);
      const x = cellX + (cellWidth - side) / 2;
      const y = cellTop - side - fontSize - 12;
      const scale = side / SOURCE_PAGE_SIZE;
      const label = escapePdfText((names[pageStart + index] ?? `QR ${pageStart + index + 1}`).slice(0, columns === 1 ? 72 : 28));
      content += `q ${number(scale)} 0 0 ${number(scale)} ${number(x)} ${number(y)} cm\n${item.content}\nQ\n`;
      content += `BT /F1 ${fontSize} Tf ${number(cellX + 6)} ${number(y - fontSize - 3)} Td (${label}) Tj ET\n`;
    });
    pages.push(content);
  }
  return makeMultiPagePdf(pages, extracted.find((item) => item.logo)?.logo ?? null);
}

export function pdfLayoutFileName(options: PdfLayoutOptions) {
  if (options.layout === "labels") return `monkeytactics-qr-avery-${options.averyTemplate}.pdf`;
  if (options.layout === "poster") return `monkeytactics-qr-poster-${options.posterGrid}.pdf`;
  return "monkeytactics-qr-business-cards.pdf";
}

function getGrid(options: PdfLayoutOptions): GridDefinition {
  if (options.layout === "labels") {
    if (options.averyTemplate === "5160") return { columns: 3, rows: 10, marginX: 13.5, marginY: 36, gapX: 9, gapY: 0 };
    if (options.averyTemplate === "5163") return { columns: 2, rows: 5, marginX: 18, marginY: 36, gapX: 0, gapY: 0 };
    return { columns: 2, rows: 3, marginX: 18, marginY: 36, gapX: 0, gapY: 0 };
  }
  if (options.layout === "business-cards") return { columns: 2, rows: 5, marginX: 54, marginY: 36, gapX: 0, gapY: 0 };
  const count = Number(options.posterGrid[0]);
  return { columns: count, rows: count, marginX: 36, marginY: 36, gapX: 18, gapY: 18 };
}

function extractSourcePdf(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  const content = text.match(/4 0 obj\s*<<[\s\S]*?>>\s*stream\r?\n([\s\S]*?)endstream/)?.[1]?.trim();
  if (!content) throw new Error("A generated QR PDF could not be added to the selected layout.");
  const logo = text.includes("/Logo 5 0 R") ? text.match(/5 0 obj\s*([\s\S]*?)\s*endobj/)?.[1]?.trim() ?? null : null;
  return { content, logo };
}

function makeMultiPagePdf(pageContents: string[], logo: string | null) {
  const pageObjectNumbers = pageContents.map((_, index) => 3 + index * 2);
  let nextObjectNumber = 3 + pageContents.length * 2;
  const logoObjectNumber = logo ? nextObjectNumber++ : null;
  const fontObjectNumber = nextObjectNumber++;
  const infoObjectNumber = nextObjectNumber;
  const resources = `${logoObjectNumber ? `/XObject << /Logo ${logoObjectNumber} 0 R >>` : ""} /Font << /F1 ${fontObjectNumber} 0 R >>`;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageContents.length} >>`,
  ];
  pageContents.forEach((content, index) => {
    const pageObjectNumber = pageObjectNumbers[index];
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${pageObjectNumber + 1} 0 R /Resources << ${resources} >> >>`);
    objects.push(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}endstream`);
  });
  if (logo) objects.push(logo);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Producer (MonkeyTactics QR Studio) >>");

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [encoder.encode("%PDF-1.4\n%MTQR\n")];
  const offsets: number[] = [];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const part = encoder.encode(`${index + 1} 0 obj\n${object}\nendobj\n`);
    parts.push(part);
    length += part.length;
  });
  const xref = length;
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => { trailer += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoObjectNumber} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  parts.push(encoder.encode(trailer));
  return concat(parts);
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach((part) => { result.set(part, offset); offset += part.length; });
  return result;
}

function number(value: number) {
  return Number(value.toFixed(5));
}

function escapePdfText(value: string) {
  return value.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
}
