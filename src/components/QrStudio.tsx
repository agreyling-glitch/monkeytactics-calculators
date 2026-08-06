import { useEffect, useMemo, useRef, useState } from "react";
import { PreviewCanvas } from "./PreviewCanvas";
import { BatchProgressDialog } from "./BatchProgressDialog";
import { CsvErrorDialog } from "./CsvErrorDialog";
import { SidebarContent } from "./SidebarContent";
import { SidebarExport, type BatchExportMode, type ExportFormat, type ExportProgress } from "./SidebarExport";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarStyling } from "./SidebarStyling";
import { clearStoredBatchCsv, readStoredBatchCsv, saveStoredBatchCsv, type StoredBatchCsv } from "../utils/batchCsvStorage";
import { createStoredZipAsync } from "../utils/batchZip";
import { analyzeBatchCsv, parseBatchCsv } from "../utils/csvBatch";
import { verifyRuntimeDomain } from "../utils/domainCheck";
import { errorCorrectionForStyle } from "../utils/errorCorrection";
import { normalizeFrame } from "../utils/frame";
import { buildPayload, INITIAL_VALUES } from "../utils/payloadBuilders";
import { composePdfBooklet, composePdfContactSheet, composePdfLayout, pdfLayoutFileName, type AveryTemplate, type PdfLayout, type PosterGrid } from "../utils/pdfLayout";
import { loadWasmEngine, type WasmQrEngine } from "../utils/wasmEngine";
import type { PresetLogoId } from "../utils/presetLogos";
import { addOrUpdateProject, createProjectId, deleteProjectById, loadProjectsFromStorage, projectToConfiguration, serializeCurrentConfigurationToProject as serializeProject, validateImportedProject, type QrProject } from "../utils/qrProjects";
import { renderTextLogoDataUrl, textLogoEngineShape } from "../utils/textLogo";
import { DEFAULT_STYLE, type FormValues, type LogoMode, type QrResult, type QrStyle, type QrType, type StudioTab } from "../types";

export function QrStudio() {
  const engine = useRef<WasmQrEngine | null>(null);
  const hasGenerated = useRef(false);
  const generatedEcc = useRef("medium");
  const [activeTab, setActiveTab] = useState<StudioTab>("content");
  const [qrType, setQrType] = useState<QrType>("url");
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE);
  const [logoFileName, setLogoFileName] = useState("");
  const [logoSource, setLogoSource] = useState<LogoMode>("none");
  const [selectedLogoPreset, setSelectedLogoPreset] = useState<PresetLogoId | "">("");
  const [result, setResult] = useState<QrResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading QR engine…");
  const [authorized, setAuthorized] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [pdfLayout, setPdfLayout] = useState<PdfLayout>("standard");
  const [averyTemplate, setAveryTemplate] = useState<AveryTemplate>("5160");
  const [posterGrid, setPosterGrid] = useState<PosterGrid>("2x2");
  const [batchMode, setBatchMode] = useState<BatchExportMode>("selected");
  const [includeManifest, setIncludeManifest] = useState(true);
  const [includeFinalCsv, setIncludeFinalCsv] = useState(false);
  const [includeContactSheet, setIncludeContactSheet] = useState(false);
  const [filenamePattern, setFilenamePattern] = useState("{name}");
  const [batchCsv, setBatchCsv] = useState<StoredBatchCsv | null>(() => readStoredBatchCsv());
  const [exportStatus, setExportStatus] = useState("");
  const [csvError, setCsvError] = useState("");
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [simulation, setSimulation] = useState<"light" | "dark">("dark");
  const [projects, setProjects] = useState<QrProject[]>(() => loadProjectsFromStorage());
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectTags, setProjectTags] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [projectStatus, setProjectStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadWasmEngine().then((loaded) => {
      if (cancelled) return;
      engine.current = loaded;
      const permitted = verifyRuntimeDomain(loaded);
      setAuthorized(permitted);
      setStatus(permitted ? "QR engine ready" : "Domain verification failed");
      if (!permitted) setError("This QR engine is not authorized on the current domain.");
    }).catch((loadError) => {
      setStatus("QR engine unavailable");
      setError(loadError instanceof Error ? loadError.message : "Unable to load the QR engine");
    });
    return () => { cancelled = true; };
  }, []);

  const payloadState = useMemo(() => {
    try { return { data: buildPayload(qrType, values), error: "" }; }
    catch (payloadError) {
      return {
        data: "",
        error: payloadError instanceof Error ? payloadError.message : "Unable to generate this QR code",
      };
    }
  }, [qrType, values]);
  const payload = payloadState.data;

  const batchAnalysis = useMemo(() => {
    if (!batchCsv) return null;
    try { return analyzeBatchCsv(batchCsv.contents); }
    catch { return null; }
  }, [batchCsv]);
  const batchCount = batchAnalysis?.items.length ?? 0;

  useEffect(() => {
    if (logoSource !== "text") return;
    const rendered = renderTextLogoDataUrl(style.textLogo);
    setStyle((current) => {
      const next = rendered.settings;
      const unchanged = current.logoMode === "text"
        && current.logoDataUrl === rendered.dataUrl
        && current.logoPadding === next.padding
        && current.logoBackgroundShape === textLogoEngineShape(next.backgroundShape)
        && textLogoSettingsEqual(current.textLogo, next);
      if (unchanged) return current;
      return {
        ...current,
        logoMode: "text",
        logoDataUrl: rendered.dataUrl,
        logoSize: 0.20,
        logoPadding: next.padding,
        logoBackgroundShape: textLogoEngineShape(next.backgroundShape),
        logoAutoContrast: next.autoContrast,
        logoWhiteBorder: false,
        logoSafeMode: true,
        logoAutoEcc: true,
        textLogo: next,
      };
    });
  }, [logoSource, style.textLogo]);

  useEffect(() => {
    if (!authorized || !engine.current) return;
    const timer = window.setTimeout(() => {
      if (!payload) {
        setError(payloadState.error);
        return;
      }
      try {
        const next = engine.current!.generate(payload, style, errorCorrectionForStyle(style));
        generatedEcc.current = errorCorrectionForStyle(style);
        hasGenerated.current = true;
        setResult(next);
        setError("");
      } catch (generationError) {
        setError(generationError instanceof Error ? generationError.message : "Unable to generate this QR code");
      }
    }, 160);
    return () => window.clearTimeout(timer);
    // Style updates use the dedicated style binding below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, payloadState.error, authorized]);

  useEffect(() => {
    if (!authorized || !engine.current || !hasGenerated.current) return;
    const timer = window.setTimeout(() => {
      try {
        const nextEcc = errorCorrectionForStyle(style);
        if (nextEcc !== generatedEcc.current && payload) {
          setResult(engine.current!.generate(payload, style, nextEcc));
          generatedEcc.current = nextEcc;
        } else setResult(engine.current!.style(style));
      }
      catch (styleError) { setError(styleError instanceof Error ? styleError.message : "Unable to style this QR code"); }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [style, authorized, payload]);

  const changeStyle = (patch: Partial<QrStyle>) => setStyle((current) => ({ ...current, ...patch }));
  const changeValue = (key: string, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));

  const download = (bytes: Uint8Array | string, type: string, filename: string) => {
    const blob = new Blob([typeof bytes === "string" ? bytes : bytes.slice().buffer], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ensureResult = () => {
    if (!engine.current || !authorized) throw new Error("The QR engine is not ready");
    const data = buildPayload(qrType, values);
    const next = engine.current.generate(data, style, errorCorrectionForStyle(style));
    generatedEcc.current = errorCorrectionForStyle(style);
    hasGenerated.current = true;
    setResult(next);
    setError("");
    return engine.current;
  };

  const selectBatchCsv = async (file: File) => {
    setExportStatus("Reading CSV…");
    try {
      const contents = await file.text();
      const analysis = analyzeBatchCsv(contents);
      if (!analysis.items.length) throw new Error("No usable data rows were found after removing empty and duplicate rows.");
      if (analysis.items.length > 250) throw new Error("Batch CSV files are limited to 250 QR codes after cleanup.");
      const stored = { fileName: file.name, contents };
      saveStoredBatchCsv(stored);
      setBatchCsv(stored);
      setExportStatus("");
    } catch (csvError) {
      const message = csvError instanceof Error ? csvError.message : "Unable to read this CSV file.";
      setExportStatus("");
      setCsvError(message);
    }
  };

  const removeBatchCsv = () => {
    clearStoredBatchCsv();
    setBatchCsv(null);
    setExportStatus("");
  };

  const serializeCurrentConfigurationToProject = (options?: { id?: string; name?: string; createdAt?: string }) => serializeProject({
    id: options?.id,
    createdAt: options?.createdAt,
    name: options?.name ?? projectName,
    description: projectDescription,
    qrType,
    values,
    style,
    batch: { enabled: !!batchCsv, fileName: batchCsv?.fileName ?? "", csvData: batchCsv?.contents ?? "" },
    logoSource,
    logoPreset: selectedLogoPreset,
    exportFormat,
    dpi,
    batchMode,
    filenamePattern,
    includeManifest,
    includeFinalCsv,
    includeContactSheet,
    pdfLayout,
    averyTemplate,
    posterGrid,
    reliabilityScore: result?.reliabilityScore ?? 0,
    notes: projectNotes,
    tags: projectTags.split(","),
  });

  const applyProjectToConfiguration = (project: QrProject) => {
    const configuration = projectToConfiguration(project);
    setQrType(configuration.qrType);
    setValues(configuration.values);
    setStyle(configuration.style);
    setLogoSource(configuration.logoSource);
    setSelectedLogoPreset(configuration.logoPreset);
    setLogoFileName(configuration.logoSource === "upload" && configuration.style.logoDataUrl ? project.styling.logo.uploadId || "Embedded project logo" : "");
    setExportFormat(configuration.exportFormat);
    setDpi(configuration.dpi);
    setBatchMode(configuration.batchMode);
    setFilenamePattern(configuration.filenamePattern);
    setIncludeManifest(configuration.includeManifest);
    setIncludeFinalCsv(configuration.includeFinalCsv);
    setIncludeContactSheet(configuration.includeContactSheet);
    setPdfLayout(configuration.pdfLayout);
    setAveryTemplate(configuration.averyTemplate);
    setPosterGrid(configuration.posterGrid);
    if (configuration.batch.enabled && configuration.batch.csvData) {
      const stored = { fileName: configuration.batch.fileName || "project-batch.csv", contents: configuration.batch.csvData };
      saveStoredBatchCsv(stored);
      setBatchCsv(stored);
    } else {
      clearStoredBatchCsv();
      setBatchCsv(null);
    }
    setSelectedProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setProjectTags((project.meta.tags || []).join(", "));
    setProjectNotes(project.meta.notes || "");
    setProjectStatus(`Loaded “${project.name}”.`);
    setActiveTab("content");
  };

  const selectProject = (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    setSelectedProjectId(id);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setProjectTags((project.meta.tags || []).join(", "));
    setProjectNotes(project.meta.notes || "");
    setProjectStatus("");
  };

  const newProject = () => {
    setSelectedProjectId("");
    setProjectName("");
    setProjectDescription("");
    setProjectTags("");
    setProjectNotes("");
    setProjectStatus("New project ready. Add a name when you save it.");
    setQrType("url");
    setValues({ ...INITIAL_VALUES });
    setStyle({ ...DEFAULT_STYLE, gradientColors: [...DEFAULT_STYLE.gradientColors] });
    setLogoFileName("");
    setLogoSource("none");
    setSelectedLogoPreset("");
    clearStoredBatchCsv();
    setBatchCsv(null);
    setExportFormat("png");
    setDpi(300);
    setBatchMode("selected");
    setFilenamePattern("{name}");
    setIncludeManifest(true);
    setIncludeFinalCsv(false);
    setIncludeContactSheet(false);
    setPdfLayout("standard");
    setAveryTemplate("5160");
    setPosterGrid("2x2");
  };

  const saveProject = () => {
    const selected = projects.find((item) => item.id === selectedProjectId);
    const name = projectName.trim() || window.prompt("Project name", selected?.name || "")?.trim();
    if (!name) return;
    const project = serializeCurrentConfigurationToProject({ id: selected?.id, name, createdAt: selected?.createdAt });
    setProjects(addOrUpdateProject(project));
    setSelectedProjectId(project.id);
    setProjectName(project.name);
    setProjectStatus("Project saved.");
  };

  const saveProjectAs = () => {
    const name = window.prompt("Save project as", projectName ? `${projectName} Copy` : "New QR Project")?.trim();
    if (!name) return;
    const project = serializeCurrentConfigurationToProject({ name });
    setProjects(addOrUpdateProject(project));
    setSelectedProjectId(project.id);
    setProjectName(project.name);
    setProjectStatus("Project saved as a new copy.");
  };

  const loadProject = (id = selectedProjectId) => {
    const project = projects.find((item) => item.id === id);
    if (project) applyProjectToConfiguration(project);
  };

  const deleteProject = (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project || !window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    setProjects(deleteProjectById(id));
    if (selectedProjectId === id) {
      setSelectedProjectId("");
      setProjectName("");
      setProjectDescription("");
      setProjectTags("");
      setProjectNotes("");
    }
    setProjectStatus("Project deleted.");
  };

  const duplicateProject = (id: string) => {
    const source = projects.find((item) => item.id === id);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: QrProject = { ...structuredClone(source), id: createProjectId(), name: `${source.name} Copy`, createdAt: now, updatedAt: now };
    setProjects(addOrUpdateProject(copy));
    selectProjectAfterUpdate(copy);
  };

  const selectProjectAfterUpdate = (project: QrProject) => {
    setSelectedProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    setProjectTags((project.meta.tags || []).join(", "));
    setProjectNotes(project.meta.notes || "");
    setProjectStatus("Project duplicated.");
  };

  const exportProjectJson = () => {
    const selected = projects.find((item) => item.id === selectedProjectId);
    const name = projectName.trim() || selected?.name;
    if (!name) return;
    const project = serializeCurrentConfigurationToProject({ id: selected?.id, name, createdAt: selected?.createdAt });
    download(JSON.stringify(project, null, 2), "application/json", `${safeBatchFileName(project.name, 0)}.qr-project.json`);
    setProjectStatus("Project JSON exported.");
  };

  const importProjectJson = async (file: File) => {
    try {
      const imported = validateImportedProject(JSON.parse(await file.text()));
      const configuration = projectToConfiguration(imported);
      const id = projects.some((item) => item.id === imported.id) ? createProjectId() : imported.id;
      const project = serializeProject({ ...configuration, id, name: imported.name, description: imported.description || "", createdAt: imported.createdAt, reliabilityScore: imported.meta.reliabilityScore ?? 0, notes: imported.meta.notes || "", tags: imported.meta.tags || [] });
      setProjects(addOrUpdateProject(project));
      applyProjectToConfiguration(project);
      setProjectStatus(`Imported and loaded “${project.name}”.`);
    } catch (importError) {
      setProjectStatus(importError instanceof Error ? importError.message : "Unable to import this project JSON.");
    }
  };

  const exportQr = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(null);
    try {
      if (!engine.current || !authorized) throw new Error("The QR engine is not ready");
      const currentEngine = engine.current;

      if (!batchCsv) {
        const readyEngine = ensureResult();
        if (exportFormat === "png") download(readyEngine.exportPng(dpi), "image/png", `monkeytactics-qr-${dpi}dpi.png`);
        else if (exportFormat === "svg") download(readyEngine.exportSvg(), "image/svg+xml", "monkeytactics-qr.svg");
        else {
          const pdf = readyEngine.exportPdf();
          if (pdfLayout === "standard") download(pdf, "application/pdf", "monkeytactics-qr.pdf");
          else {
            const layoutOptions = { layout: pdfLayout, averyTemplate, posterGrid };
            download(composePdfLayout([pdf], layoutOptions), "application/pdf", pdfLayoutFileName(layoutOptions));
          }
        }
        setExportStatus(`Single ${exportFormat.toUpperCase()} exported.`);
        return;
      }

      const rows = parseBatchCsv(batchCsv.contents);
      if (!rows.length) throw new Error("The stored CSV has no data rows.");
      if (rows.length > 250) throw new Error("Batch CSV files are limited to 250 QR codes.");
      setExportStatus(`Creating ${rows.length} ${exportFormat.toUpperCase()} files…`);
      const encoder = new TextEncoder();
      const entries: Array<{ name: string; bytes: Uint8Array }> = [];
      const sourcePdfs: Uint8Array[] = [];
      const records: Array<{ name: string; data: string; textLogo?: string; frameText?: string; frameColor?: string; frameStyle?: string; filenames: string[]; reliabilityScore: number; reliabilityLabel: string }> = [];
      const textLogoStyleCache = new Map<string, QrStyle>();
      const needsPdfSources = batchMode === "pdf-booklet" || includeContactSheet || (batchMode === "selected" && exportFormat === "pdf");
      for (let index = 0; index < rows.length; index += 1) {
        const item = rows[index];
        setExportProgress({ current: index + 1, total: rows.length, label: `Processing QR ${index + 1} of ${rows.length}`, detail: item.name });
        await yieldToBrowser();
        let rowStyle = style;
        if (style.logoMode === "text" && item.textLogo) {
          const cached = textLogoStyleCache.get(item.textLogo);
          if (cached) rowStyle = cached;
          else {
            const textLogo = renderTextLogoDataUrl({ ...style.textLogo, text: item.textLogo });
            rowStyle = {
              ...style,
              logoDataUrl: textLogo.dataUrl,
              logoPadding: textLogo.settings.padding,
              logoBackgroundShape: textLogoEngineShape(textLogo.settings.backgroundShape),
              textLogo: textLogo.settings,
            };
            textLogoStyleCache.set(item.textLogo, rowStyle);
          }
        }
        if (item.frameText || item.frameColor || item.frameStyle) {
          rowStyle = { ...rowStyle, frame: normalizeFrame({
            ...rowStyle.frame,
            enabled: true,
            ...(item.frameText ? { text: item.frameText } : {}),
            ...(item.frameColor ? { color: item.frameColor, gradient: { ...rowStyle.frame.gradient, enabled: false } } : {}),
            ...(item.frameStyle ? { style: item.frameStyle } : {}),
            preset: null,
          }).settings };
        }
        const rendered = currentEngine.generate(item.data, rowStyle, errorCorrectionForStyle(rowStyle));
        const baseName = batchFileName(item, index, filenamePattern, qrType);
        const filenames: string[] = [];
        if (batchMode === "selected" && exportFormat !== "pdf") {
          const filename = `${baseName}.${exportFormat}`;
          entries.push({ name: filename, bytes: exportFormat === "png" ? currentEngine.exportPng(dpi) : encoder.encode(currentEngine.exportSvg()) });
          filenames.push(filename);
        } else if (batchMode === "svg-set") {
          const filename = `svg/${baseName}.svg`;
          entries.push({ name: filename, bytes: encoder.encode(currentEngine.exportSvg()) });
          filenames.push(filename);
        } else if (batchMode === "mixed") {
          const pngName = `png/${baseName}.png`;
          const svgName = `svg/${baseName}.svg`;
          entries.push({ name: pngName, bytes: currentEngine.exportPng(dpi) });
          entries.push({ name: svgName, bytes: encoder.encode(currentEngine.exportSvg()) });
          filenames.push(pngName, svgName);
        }
        if (needsPdfSources) sourcePdfs.push(currentEngine.exportPdf());
        if (batchMode === "selected" && exportFormat === "pdf" && pdfLayout === "standard") {
          const filename = `${baseName}.pdf`;
          entries.push({ name: filename, bytes: sourcePdfs[sourcePdfs.length - 1] });
          filenames.push(filename);
        }
        records.push({ name: item.name, data: item.data, ...(rowStyle.logoMode === "text" ? { textLogo: rowStyle.textLogo.text } : {}), ...(rowStyle.frame.enabled ? { frameText: rowStyle.frame.text, frameColor: rowStyle.frame.color, frameStyle: rowStyle.frame.style } : {}), filenames, reliabilityScore: rendered.reliabilityScore, reliabilityLabel: rendered.reliabilityLabel });
      }

      if (batchMode === "selected" && exportFormat === "pdf" && pdfLayout !== "standard") {
        const layoutOptions = { layout: pdfLayout, averyTemplate, posterGrid };
        setExportProgress({ current: rows.length, total: rows.length, label: "Building PDF layout", detail: `Arranging ${rows.length} QR codes on printable pages` });
        await yieldToBrowser();
        const filename = pdfLayoutFileName(layoutOptions);
        entries.push({ name: filename, bytes: composePdfLayout(sourcePdfs, layoutOptions) });
        records.forEach((record) => record.filenames.push(filename));
      }
      if (batchMode === "pdf-booklet") {
        setExportProgress({ current: rows.length, total: rows.length, label: "Building PDF booklet", detail: `Creating ${rows.length} labeled booklet pages` });
        await yieldToBrowser();
        const filename = "monkeytactics-qr-batch-booklet.pdf";
        entries.push({ name: filename, bytes: composePdfBooklet(sourcePdfs, rows.map((row) => row.name)) });
        records.forEach((record) => record.filenames.push(filename));
      }
      if (includeContactSheet) {
        setExportProgress({ current: rows.length, total: rows.length, label: "Building contact sheet", detail: `Creating thumbnails for ${rows.length} QR codes` });
        await yieldToBrowser();
        entries.push({ name: "thumbnail-contact-sheet.pdf", bytes: composePdfContactSheet(sourcePdfs, rows.map((row) => row.name)) });
      }
      const packageFiles = entries.map((entry) => entry.name);
      if (includeFinalCsv) {
        const csv = [["name", "data", "text_logo", "frame_text", "frame_color", "frame_style", "filenames", "reliability_score", "reliability_label"], ...records.map((record) => [record.name, record.data, record.textLogo ?? "", record.frameText ?? "", record.frameColor ?? "", record.frameStyle ?? "", record.filenames.join(" | "), String(record.reliabilityScore), record.reliabilityLabel])].map((row) => row.map(csvCell).join(",")).join("\r\n");
        entries.push({ name: "final-qr-list.csv", bytes: encoder.encode(csv) });
        packageFiles.push("final-qr-list.csv");
      }
      if (includeManifest) {
        const manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), sourceFile: batchCsv.fileName, qrCount: rows.length, outputMode: batchMode, selectedFormat: exportFormat, dpi: exportFormat === "png" || batchMode === "mixed" ? dpi : undefined, styling: { ...style, logoDataUrl: style.logoDataUrl ? "[embedded logo]" : "" }, packageFiles: [...packageFiles, "manifest.json"], items: records };
        entries.push({ name: "manifest.json", bytes: encoder.encode(JSON.stringify(manifest, null, 2)) });
      }
      setExportProgress({ current: rows.length, total: rows.length, label: "Packaging ZIP", detail: `Adding ${entries.length} files to the download` });
      await yieldToBrowser();
      const zip = await createStoredZipAsync(entries, (completed, total) => {
        setExportProgress({ current: completed, total, label: "Packaging ZIP", detail: `Added ${completed} of ${total} files` });
      });
      download(zip, "application/zip", `monkeytactics-qr-batch-${batchMode}-${Date.now()}.zip`);
      setExportStatus(`${rows.length} QR codes exported with ${entries.length} packaged files.`);
    } catch (exportError) {
      setExportStatus(exportError instanceof Error ? exportError.message : "Export failed");
    } finally {
      if (batchCsv && engine.current && payload) {
        try { setResult(engine.current.generate(payload, style, errorCorrectionForStyle(style))); }
        catch { /* Keep the existing preview if the current form is incomplete. */ }
      }
      setExportProgress(null);
      setIsExporting(false);
    }
  };

  if (!authorized && status !== "Loading QR engine…") {
    return <div className="qr-engine-blocked"><strong>QR Studio unavailable</strong><p>{error || status}</p></div>;
  }

  return <div className="qr-studio-shell">
    <aside className="qr-sidebar">
      <div className="qr-tablist" role="tablist" aria-label="QR Studio settings">
        {(["projects", "content", "styling", "export"] as StudioTab[]).map((tab) => <button key={tab} id={`qr-tab-${tab}`} type="button" role="tab" aria-controls={`qr-panel-${tab}`} aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
      <div id="qr-panel-projects" role="tabpanel" aria-labelledby="qr-tab-projects" hidden={activeTab !== "projects"}>
        <SidebarProjects projects={projects} selectedProjectId={selectedProjectId} name={projectName} description={projectDescription} tags={projectTags} notes={projectNotes} status={projectStatus} onSelect={selectProject} onNameChange={setProjectName} onDescriptionChange={setProjectDescription} onTagsChange={setProjectTags} onNotesChange={setProjectNotes} onNew={newProject} onSave={saveProject} onSaveAs={saveProjectAs} onLoad={loadProject} onDelete={deleteProject} onDuplicate={duplicateProject} onExport={exportProjectJson} onImport={importProjectJson} />
      </div>
      <div id="qr-panel-content" role="tabpanel" aria-labelledby="qr-tab-content" hidden={activeTab !== "content"}>
        <SidebarContent qrType={qrType} values={values} error={error} onTypeChange={setQrType} onValueChange={changeValue} />
      </div>
      <div id="qr-panel-styling" role="tabpanel" aria-labelledby="qr-tab-styling" hidden={activeTab !== "styling"}>
        <SidebarStyling style={style} qrType={qrType} logoFileName={logoFileName} logoSource={logoSource} selectedLogoPreset={selectedLogoPreset} onChange={changeStyle} onLogoFileNameChange={setLogoFileName} onLogoSourceChange={setLogoSource} onLogoPresetChange={setSelectedLogoPreset} />
      </div>
      <div id="qr-panel-export" role="tabpanel" aria-labelledby="qr-tab-export" hidden={activeTab !== "export"}>
        <SidebarExport dpi={dpi} transparent={style.transparent} format={exportFormat} batchFileName={batchCsv?.fileName ?? ""} batchCount={batchCount} batchAnalysis={batchAnalysis} exportStatus={exportStatus} isExporting={isExporting} pdfLayout={pdfLayout} averyTemplate={averyTemplate} posterGrid={posterGrid} batchMode={batchMode} filenamePattern={filenamePattern} includeManifest={includeManifest} includeFinalCsv={includeFinalCsv} includeContactSheet={includeContactSheet} onDpiChange={setDpi} onTransparentChange={(transparent) => changeStyle({ transparent })} onFormatChange={setExportFormat} onPdfLayoutChange={setPdfLayout} onAveryTemplateChange={setAveryTemplate} onPosterGridChange={setPosterGrid} onBatchModeChange={setBatchMode} onFilenamePatternChange={setFilenamePattern} onIncludeManifestChange={setIncludeManifest} onIncludeFinalCsvChange={setIncludeFinalCsv} onIncludeContactSheetChange={setIncludeContactSheet} onBatchCsvChange={selectBatchCsv} onBatchCsvRemove={removeBatchCsv} onExport={exportQr} />
      </div>
    </aside>
    <PreviewCanvas result={result} style={style} zoom={zoom} showGrid={showGrid} simulation={simulation} errorCorrection={errorCorrectionForStyle(style)} engineStatus={status} onZoomChange={setZoom} onGridChange={setShowGrid} onSimulationChange={setSimulation} />
    {exportProgress && <BatchProgressDialog progress={exportProgress} />}
    {csvError && <CsvErrorDialog message={csvError} onClose={() => setCsvError("")} />}
  </div>;
}

function safeBatchFileName(name: string, index: number) {
  return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/[. ]+$/g, "").slice(0, 100) || `qrcode-${index + 1}`;
}

function batchFileName(item: { name: string; data: string }, index: number, pattern: string, qrType: QrType) {
  const rendered = (pattern.trim() || "{name}")
    .replaceAll("{index}", String(index + 1).padStart(3, "0"))
    .replaceAll("{name}", item.name)
    .replaceAll("{type}", qrType)
    .replaceAll("{data_hash}", simpleHash(item.data))
    .replace(/\.(png|svg|pdf)$/i, "");
  return safeBatchFileName(rendered, index);
}

function simpleHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

function textLogoSettingsEqual(left: QrStyle["textLogo"], right: QrStyle["textLogo"]) {
  return left.text === right.text
    && left.fontFamily === right.fontFamily
    && left.fontWeight === right.fontWeight
    && left.fontSize === right.fontSize
    && left.color === right.color
    && left.backgroundShape === right.backgroundShape
    && left.backgroundColor === right.backgroundColor
    && left.padding === right.padding
    && left.autoContrast === right.autoContrast
    && left.centered === right.centered;
}
