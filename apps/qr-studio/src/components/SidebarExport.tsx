import type { ChangeEvent } from "react";
import type { AveryTemplate, PdfLayout, PosterGrid } from "../utils/pdfLayout";
import type { BatchCsvAnalysis } from "../utils/csvBatch";

const csvCell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
const CSV_TEMPLATE = [
  ["name", "data", "text_logo", "frame_text", "frame_color", "frame_style"],
  ["url-homepage", "https://monkeytactics.com", "HOME", "SCAN ME", "#111827", "rounded-rectangle"],
  ["plain-text", "Welcome to MonkeyTactics QR Studio"],
  ["wifi-guest", "WIFI:T:WPA;S:MonkeyTactics Guest;P:ExamplePassword123;H:false;;"],
  ["vcard-contact", "BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Jane Doe\r\nORG:MonkeyTactics\r\nTEL;TYPE=cell;VALUE=uri:tel:+15551234567\r\nEMAIL:jane@example.com\r\nADR;TYPE=work:;;123 Main Street;Minneapolis;MN;55401;USA\r\nURL:https://monkeytactics.com\r\nEND:VCARD"],
  ["email-prefilled", "mailto:hello@example.com?subject=Hello&body=Thanks%20for%20connecting"],
  ["sms-prefilled", "sms:+15551234567?body=Hello%20from%20MonkeyTactics"],
  ["phone-call", "tel:+15551234567"],
  ["geo-location", "geo:44.9537,-93.0900"],
  ["calendar-event", "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MonkeyTactics//QR Studio//EN\r\nBEGIN:VEVENT\r\nSUMMARY:MonkeyTactics Demo\r\nDTSTART:20260810T140000\r\nDTEND:20260810T150000\r\nLOCATION:123 Main Street\, Minneapolis\r\nDESCRIPTION:QR Studio demonstration\r\nEND:VEVENT\r\nEND:VCALENDAR"],
  ["totp-authenticator", "otpauth://totp/MonkeyTactics:demo@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MonkeyTactics&algorithm=SHA1&digits=6&period=30"],
  ["crypto-bitcoin", "bitcoin:bc1qexampleaddress?amount=0.001&label=MonkeyTactics"],
  ["social-whatsapp", "https://wa.me/15551234567"],
  ["social-telegram", "https://t.me/monkeytactics"],
  ["social-messenger", "https://m.me/monkeytactics"],
  ["social-instagram", "https://instagram.com/monkeytactics"],
  ["social-x", "https://x.com/monkeytactics"],
  ["social-linkedin", "https://linkedin.com/in/monkeytactics"],
].map((row) => row.map(csvCell).join(",")).join("\r\n");
const CSV_TEMPLATE_URL = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`;

export type ExportFormat = "png" | "svg" | "pdf";
export type BatchExportMode = "selected" | "pdf-booklet" | "svg-set" | "mixed";
export interface ExportProgress {
  current: number;
  total: number;
  label: string;
  detail: string;
}

interface Props {
  dpi: number;
  transparent: boolean;
  format: ExportFormat;
  batchFileName: string;
  batchCount: number;
  batchAnalysis: BatchCsvAnalysis | null;
  exportStatus: string;
  isExporting: boolean;
  pdfLayout: PdfLayout;
  averyTemplate: AveryTemplate;
  posterGrid: PosterGrid;
  batchMode: BatchExportMode;
  includeManifest: boolean;
  includeFinalCsv: boolean;
  includeContactSheet: boolean;
  filenamePattern: string;
  onDpiChange: (dpi: number) => void;
  onTransparentChange: (transparent: boolean) => void;
  onFormatChange: (format: ExportFormat) => void;
  onPdfLayoutChange: (layout: PdfLayout) => void;
  onAveryTemplateChange: (template: AveryTemplate) => void;
  onPosterGridChange: (grid: PosterGrid) => void;
  onBatchModeChange: (mode: BatchExportMode) => void;
  onIncludeManifestChange: (include: boolean) => void;
  onIncludeFinalCsvChange: (include: boolean) => void;
  onIncludeContactSheetChange: (include: boolean) => void;
  onFilenamePatternChange: (pattern: string) => void;
  onBatchCsvChange: (file: File) => void;
  onBatchCsvRemove: () => void;
  onExport: () => void | Promise<void>;
}

export function SidebarExport(props: Props) {
  const chooseCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) props.onBatchCsvChange(file);
    event.target.value = "";
  };
  return <div className="qr-panel-content qr-export-panel">
    <section className="qr-style-section">
      <h3>Export format</h3>
      <div className="qr-export-formats" role="group" aria-label="Export format">
        {(["png", "svg", "pdf"] as ExportFormat[]).map((format) => <button key={format} type="button" disabled={props.isExporting} className={props.format === format ? "active" : ""} aria-pressed={props.format === format} onClick={() => props.onFormatChange(format)}><strong>{format.toUpperCase()}</strong><small>{format === "png" ? "Raster image" : format === "svg" ? "Scalable vector" : "Print-ready"}</small></button>)}
      </div>
      {props.format === "png" && <label className="qr-field"><span>PNG resolution</span><select disabled={props.isExporting} value={props.dpi} onChange={(event) => props.onDpiChange(Number(event.target.value))}><option value={72}>72 DPI · web</option><option value={300}>300 DPI · print</option><option value={600}>600 DPI · high detail</option><option value={1200}>1200 DPI · production</option></select></label>}
      {props.format === "pdf" && <div className="qr-pdf-options">
        <label className="qr-field"><span>PDF layout</span><select disabled={props.isExporting} value={props.pdfLayout} onChange={(event) => props.onPdfLayoutChange(event.target.value as PdfLayout)}><option value="standard">Standard · one QR per file</option><option value="labels">Label sheet · Avery templates</option><option value="poster">Poster · multiple QR codes per page</option><option value="business-cards">Business cards · 10 per sheet</option></select></label>
        {props.pdfLayout === "labels" && <label className="qr-field"><span>Avery template</span><select disabled={props.isExporting} value={props.averyTemplate} onChange={(event) => props.onAveryTemplateChange(event.target.value as AveryTemplate)}><option value="5160">5160 / 8160 · 30 labels</option><option value="5163">5163 / 8163 · 10 labels</option><option value="5164">5164 / 8164 · 6 labels</option></select></label>}
        {props.pdfLayout === "poster" && <label className="qr-field"><span>QR codes per page</span><select disabled={props.isExporting} value={props.posterGrid} onChange={(event) => props.onPosterGridChange(event.target.value as PosterGrid)}><option value="2x2">2 × 2 · 4 per page</option><option value="3x3">3 × 3 · 9 per page</option><option value="4x4">4 × 4 · 16 per page</option></select></label>}
        {props.pdfLayout === "business-cards" && <p className="qr-help">Letter-size sheet compatible with Avery 5371 / 8371 business cards.</p>}
      </div>}
      <label className="qr-switch"><input type="checkbox" disabled={props.isExporting} checked={props.transparent} onChange={(event) => props.onTransparentChange(event.target.checked)} /><span aria-hidden="true" />Transparent background</label>
    </section>

    <section className="qr-style-section">
      <h3>Optional batch CSV</h3>
      <p className="qr-help">Upload a CSV with <code>name,data</code> columns to switch Export into batch mode. Optional <code>text_logo</code>, <code>frame_text</code>, <code>frame_color</code>, and <code>frame_style</code> columns can override styling per row. The file stays in this browser so you can change styling before exporting. Batch files can contain up to 250 QR codes. <a className="qr-template-link" download="qr-batch-template.csv" href={CSV_TEMPLATE_URL}>Download CSV template</a></p>
      {!props.batchFileName ? <label className="qr-field"><span>Choose CSV file</span><input type="file" disabled={props.isExporting} accept=".csv,text/csv" onChange={chooseCsv} /></label> : <div className="qr-selected-upload" aria-live="polite">
        <button type="button" disabled={props.isExporting} onClick={props.onBatchCsvRemove}>Remove file</button>
        <p>Selected: <strong>{props.batchFileName}</strong> · {props.batchCount} QR {props.batchCount === 1 ? "code" : "codes"}</p>
      </div>}
      {props.batchAnalysis && <BatchCsvPreview analysis={props.batchAnalysis} />}
      {props.batchFileName && <div className="qr-batch-package-options">
        <label className="qr-field"><span>Batch output</span><select disabled={props.isExporting} value={props.batchMode} onChange={(event) => props.onBatchModeChange(event.target.value as BatchExportMode)}><option value="selected">Selected format files ({props.format.toUpperCase()})</option><option value="pdf-booklet">PDF booklet · one QR per page</option><option value="svg-set">SVG set</option><option value="mixed">Mixed formats · PNG + SVG</option></select></label>
        <label className="qr-field"><span>Filename pattern</span><input disabled={props.isExporting} value={props.filenamePattern} onChange={(event) => props.onFilenamePatternChange(event.target.value)} placeholder="{name}" /><small>Available tokens: <code>{"{index}"}</code>, <code>{"{name}"}</code>, <code>{"{type}"}</code>, and <code>{"{data_hash}"}</code>.</small></label>
        <h4>Package metadata</h4>
        <Toggle label="Include manifest.json" checked={props.includeManifest} disabled={props.isExporting} onChange={props.onIncludeManifestChange} />
        <Toggle label="Include final QR list CSV" checked={props.includeFinalCsv} disabled={props.isExporting} onChange={props.onIncludeFinalCsvChange} />
        <Toggle label="Include thumbnail contact sheet PDF" checked={props.includeContactSheet} disabled={props.isExporting} onChange={props.onIncludeContactSheetChange} />
        <p className="qr-help">The manifest records source data, styling, reliability score, and every generated filename.</p>
      </div>}
    </section>

    <section className="qr-style-section qr-export-final">
      <button type="button" className="qr-primary-action" disabled={props.isExporting} onClick={props.onExport}>{props.isExporting ? "Exporting…" : props.batchCount > 1 ? `Export Batch (${props.batchCount})` : "Export"}</button>
      {props.exportStatus && <p className="qr-batch-status" role="status">{props.exportStatus}</p>}
    </section>
  </div>;
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return <label className="qr-switch"><input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" />{label}</label>;
}

function BatchCsvPreview({ analysis }: { analysis: BatchCsvAnalysis }) {
  const preview = analysis.items.slice(0, 8);
  const cleaned = analysis.emptyRowsRemoved + analysis.duplicateRowsRemoved;
  const hasTextLogos = analysis.items.some((item) => item.textLogo);
  const hasFrames = analysis.items.some((item) => item.frameText || item.frameColor || item.frameStyle);
  return <div className="qr-csv-preview">
    <div className="qr-csv-preview-heading"><strong>Cleaned CSV preview</strong><span>{analysis.items.length} valid {analysis.items.length === 1 ? "row" : "rows"}</span></div>
    {cleaned > 0 && <p className="qr-csv-cleanup" role="status">Removed {analysis.duplicateRowsRemoved} duplicate {analysis.duplicateRowsRemoved === 1 ? "row" : "rows"} and {analysis.emptyRowsRemoved} empty {analysis.emptyRowsRemoved === 1 ? "row" : "rows"}.</p>}
    {analysis.ignoredColumns.length > 0 && <p className="qr-csv-columns">Ignored extra {analysis.ignoredColumns.length === 1 ? "column" : "columns"}: {analysis.ignoredColumns.join(", ")}</p>}
    {analysis.textLogoWarnings.length > 0 && <div className="qr-csv-text-logo-warnings" role="status"><strong>Text logo adjustments</strong>{analysis.textLogoWarnings.slice(0, 4).map((warning) => <p key={`${warning.row}-${warning.name}`}>Row {warning.row} ({warning.name}): {warning.messages.join(" ")}</p>)}{analysis.textLogoWarnings.length > 4 && <p>+ {analysis.textLogoWarnings.length - 4} more adjusted rows</p>}</div>}
    {analysis.frameWarnings.length > 0 && <div className="qr-csv-text-logo-warnings" role="status"><strong>Frame adjustments</strong>{analysis.frameWarnings.slice(0, 4).map((warning) => <p key={`${warning.row}-${warning.name}`}>Row {warning.row} ({warning.name}): {warning.messages.join(" ")}</p>)}{analysis.frameWarnings.length > 4 && <p>+ {analysis.frameWarnings.length - 4} more adjusted rows</p>}</div>}
    <div className="qr-csv-table-wrap"><table><caption>First {preview.length} of {analysis.items.length} cleaned QR rows</caption><thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Data</th>{hasTextLogos && <th scope="col">Text logo</th>}{hasFrames && <><th scope="col">Frame text</th><th scope="col">Frame color</th><th scope="col">Frame style</th></>}</tr></thead><tbody>{preview.map((item, index) => <tr key={`${item.name}-${index}`}><td>{index + 1}</td><td>{item.name}</td><td title={item.data}>{item.data}</td>{hasTextLogos && <td>{item.textLogo || "—"}</td>}{hasFrames && <><td>{item.frameText || "—"}</td><td>{item.frameColor || "—"}</td><td>{item.frameStyle || "—"}</td></>}</tr>)}</tbody></table></div>
    {analysis.items.length > preview.length && <p className="qr-csv-more">+ {analysis.items.length - preview.length} more rows included in export</p>}
  </div>;
}
