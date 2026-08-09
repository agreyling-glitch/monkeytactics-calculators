"use strict";

(function initializeCalculatorPdf(global) {
  function ascii(value) {
    return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7e]/g, "");
  }

  function escapePdf(value) {
    return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  function wrap(value, width) {
    const words = ascii(value).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines = [];
    let line = "";
    words.forEach(function (word) {
      if (!line) line = word;
      else if ((line + " " + word).length <= width) line += " " + word;
      else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    return lines;
  }

  function cell(value, width, align) {
    const text = ascii(value).slice(0, width);
    return align === "right" ? text.padStart(width) : text.padEnd(width);
  }

  function tableLine(columns, row, header) {
    return columns.map(function (column, index) {
      const value = header ? column.label : row[index];
      return cell(value, column.width || 12, header ? "left" : column.align);
    }).join(" | ");
  }

  function buildPages(options) {
    const landscape = Boolean(options.landscape);
    const pageWidth = landscape ? 792 : 612;
    const pageHeight = landscape ? 612 : 792;
    const maxChars = landscape ? 145 : 100;
    const maxLines = landscape ? 43 : 58;
    const lines = [];
    (options.summary || []).forEach(function (item) {
      lines.push({ text: ascii(item.label) + ": " + ascii(item.value), font: "F1", size: 10 });
    });
    if (options.note) {
      lines.push({ text: "", font: "F1", size: 9 });
      wrap(options.note, maxChars).forEach(function (text) { lines.push({ text: text, font: "F1", size: 8 }); });
    }
    if (options.table && options.table.rows && options.table.rows.length) {
      lines.push({ text: "", font: "F1", size: 9 });
      lines.push({ text: options.table.title || "Details", font: "F1", size: 12 });
      const heading = tableLine(options.table.columns, [], true);
      const separator = options.table.columns.map(function (column) { return "-".repeat(column.width || 12); }).join("-+-");
      lines.push({ text: heading, font: "F2", size: 7 });
      lines.push({ text: separator, font: "F2", size: 7 });
      options.table.rows.forEach(function (row) {
        lines.push({ text: tableLine(options.table.columns, row, false), font: "F2", size: 7 });
      });
    }

    const chunks = [];
    for (let index = 0; index < lines.length || index === 0; index += maxLines) chunks.push(lines.slice(index, index + maxLines));
    return chunks.map(function (chunk, pageIndex) {
      const commands = [
        "BT /F1 18 Tf 50 " + (pageHeight - 48) + " Td (" + escapePdf(options.title || "Calculator Report") + ") Tj ET",
        "BT /F1 8 Tf 50 " + (pageHeight - 65) + " Td (Generated " + escapePdf(options.generatedAt || new Date().toLocaleString()) + ") Tj ET"
      ];
      let y = pageHeight - 88;
      chunk.forEach(function (line) {
        commands.push("BT /" + line.font + " " + line.size + " Tf 50 " + y + " Td (" + escapePdf(line.text) + ") Tj ET");
        y -= line.size + 4;
      });
      commands.push("BT /F1 8 Tf 50 24 Td (MonkeyTactics - Page " + (pageIndex + 1) + " of " + chunks.length + ") Tj ET");
      return { width: pageWidth, height: pageHeight, content: commands.join("\n") };
    });
  }

  function createReportBytes(options) {
    const pages = buildPages(options || {});
    const objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const kids = pages.map(function (_, index) { return (5 + index * 2) + " 0 R"; }).join(" ");
    objects[2] = "<< /Type /Pages /Kids [" + kids + "] /Count " + pages.length + " >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
    pages.forEach(function (page, index) {
      const pageId = 5 + index * 2;
      const contentId = pageId + 1;
      objects[pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + page.width + " " + page.height + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + contentId + " 0 R >>";
      objects[contentId] = "<< /Length " + page.content.length + " >>\nstream\n" + page.content + "\nendstream";
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = pdf.length;
      pdf += id + " 0 obj\n" + objects[id] + "\nendobj\n";
    }
    const xref = pdf.length;
    pdf += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
    for (let id = 1; id < objects.length; id += 1) pdf += String(offsets[id]).padStart(10, "0") + " 00000 n \n";
    pdf += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    return new TextEncoder().encode(pdf);
  }

  function downloadReport(options) {
    const bytes = createReportBytes(options);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = options.filename || "calculator-report.pdf";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  global.MonkeyTacticsPdf = Object.freeze({ createReportBytes: createReportBytes, downloadReport: downloadReport });
})(typeof window !== "undefined" ? window : globalThis);
