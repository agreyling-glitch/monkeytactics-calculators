import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { QrResult, QrStyle } from "../types";
import { applyPerspectiveRisk, buildRiskHeatmap } from "../utils/riskHeatmap";
import { frameExtentModules } from "../utils/frame";
import type { QrErrorCorrection } from "../utils/errorCorrection";
import { assessPerspectiveDistortion, buildErrorCorrectionMap, buildPreviewTransform, buildRawQrSvg, diagnoseQuietZone } from "../utils/previewDiagnostics";
import { clampPreviewPan, MAX_PREVIEW_ZOOM, MIN_PREVIEW_ZOOM, stepPreviewZoom, togglePreviewZoom, type PreviewPan } from "../utils/previewPan";

interface Props {
  result: QrResult | null;
  style: QrStyle;
  zoom: number;
  showGrid: boolean;
  simulation: "light" | "dark";
  errorCorrection: QrErrorCorrection;
  engineStatus: string;
  onZoomChange: (zoom: number) => void;
  onGridChange: (show: boolean) => void;
  onSimulationChange: (simulation: "light" | "dark") => void;
}

export function PreviewCanvas(props: Props) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showQuietZone, setShowQuietZone] = useState(false);
  const [showErrorCorrection, setShowErrorCorrection] = useState(false);
  const [previewMode, setPreviewMode] = useState<"raw" | "styled">("styled");
  const [perspective, setPerspective] = useState(0);
  const [frameWidth, setFrameWidth] = useState(900 / 2.05);
  const [pan, setPan] = useState<PreviewPan>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 });
  const pointerGesture = useRef({ pointerId: -1, startedAt: 0, startX: 0, startY: 0, moved: false });
  const previousClick = useRef({ occurredAt: 0, x: 0, y: 0 });
  const zoomRef = useRef(props.zoom);
  const resultSvgRef = useRef(props.result?.svg);
  const onZoomChangeRef = useRef(props.onZoomChange);
  const moduleCount = props.result?.moduleCount ?? 21;
  const gridCount = moduleCount + 8;
  const frameExtent = previewMode === "styled" ? frameExtentModules(moduleCount, props.style.frame) : 0;
  const outputCount = gridCount + frameExtent * 2;
  const perspectiveAssessment = useMemo(() => props.result ? assessPerspectiveDistortion(props.result, perspective) : null, [props.result, perspective]);
  const heatmap = useMemo(() => {
    if (!props.result) return [];
    const flatHeatmap = buildRiskHeatmap(props.result, props.style);
    return perspectiveAssessment ? applyPerspectiveRisk(flatHeatmap, perspectiveAssessment, props.result.moduleCount) : flatHeatmap;
  }, [props.result, props.style, perspectiveAssessment]);
  const rawSvg = useMemo(() => props.result ? buildRawQrSvg(props.result) : "", [props.result]);
  const correctionMap = useMemo(() => props.result ? buildErrorCorrectionMap(props.result, props.errorCorrection) : [], [props.result, props.errorCorrection]);
  const quietZone = useMemo(() => diagnoseQuietZone(props.style), [props.style]);
  const displayedSvg = previewMode === "raw" ? rawSvg : props.result?.svg ?? "";
  const correctionLabel = props.errorCorrection === "high" ? "H · about 30% recovery" : props.errorCorrection === "quartile" ? "Q · about 25% recovery" : "M · about 15% recovery";
  const score = perspectiveAssessment?.score ?? 0;
  const ratingClass = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "warning" : "risk";
  const canPan = props.zoom > 1 && Boolean(props.result?.svg);
  resultSvgRef.current = props.result?.svg;
  onZoomChangeRef.current = props.onZoomChange;

  const constrainPan = (next: PreviewPan) => {
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!stage || !frame) return props.zoom <= 1 ? { x: 0, y: 0 } : next;
    return clampPreviewPan(next, {
      zoom: props.zoom,
      stageWidth: stage.clientWidth,
      stageHeight: stage.clientHeight,
      frameWidth: frame.offsetWidth,
      frameHeight: frame.offsetHeight,
    });
  };

  useEffect(() => {
    zoomRef.current = props.zoom;
    setPan((current) => constrainPan(current));
    if (props.zoom <= 1) setIsDragging(false);
  }, [props.zoom, props.result?.svg]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const zoomWithWheel = (event: WheelEvent) => {
      if (!resultSvgRef.current || event.deltaY === 0) return;
      event.preventDefault();
      const nextZoom = stepPreviewZoom(zoomRef.current, event.deltaY < 0 ? 1 : -1);
      if (nextZoom === zoomRef.current) return;
      zoomRef.current = nextZoom;
      onZoomChangeRef.current(nextZoom);
    };
    stage.addEventListener("wheel", zoomWithWheel, { passive: false });
    return () => stage.removeEventListener("wheel", zoomWithWheel);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const updateWidth = () => setFrameWidth(frame.offsetWidth || 900 / 2.05);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [props.result?.svg]);

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!props.result?.svg || event.button !== 0) return;
    event.preventDefault();
    pointerGesture.current = { pointerId: event.pointerId, startedAt: event.timeStamp, startX: event.clientX, startY: event.clientY, moved: false };
    if (!canPan) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerGesture.current.pointerId !== event.pointerId) return;
    const movement = Math.hypot(event.clientX - pointerGesture.current.startX, event.clientY - pointerGesture.current.startY);
    if (movement <= 4) return;
    pointerGesture.current.moved = true;
    if (!canPan) return;
    event.preventDefault();
    setPan(constrainPan({
      x: dragStart.current.panX + event.clientX - dragStart.current.pointerX,
      y: dragStart.current.panY + event.clientY - dragStart.current.pointerY,
    }));
  };

  const stopPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerGesture.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    const gesture = pointerGesture.current;
    pointerGesture.current.pointerId = -1;
    if (gesture.moved || event.timeStamp - gesture.startedAt > 500) {
      previousClick.current.occurredAt = 0;
      return;
    }
    const prior = previousClick.current;
    const separation = Math.hypot(event.clientX - prior.x, event.clientY - prior.y);
    if (prior.occurredAt && event.timeStamp - prior.occurredAt <= 450 && separation <= 28) {
      previousClick.current.occurredAt = 0;
      setPan({ x: 0, y: 0 });
      props.onZoomChange(togglePreviewZoom(props.zoom));
      return;
    }
    previousClick.current = { occurredAt: event.timeStamp, x: event.clientX, y: event.clientY };
  };

  const cancelPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerGesture.current.pointerId = -1;
    previousClick.current.occurredAt = 0;
    setIsDragging(false);
  };
  return <section className={`qr-preview-pane simulation-${props.simulation}`} aria-label="Live QR preview">
    <header className="qr-preview-toolbar">
      <div><strong>Live preview</strong><span>{props.engineStatus}</span></div>
      <div className="qr-preview-controls">
        <button type="button" aria-label="Zoom out" disabled={props.zoom <= MIN_PREVIEW_ZOOM} onClick={() => props.onZoomChange(stepPreviewZoom(props.zoom, -1))}>−</button>
        <output>{Math.round(props.zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" disabled={props.zoom >= MAX_PREVIEW_ZOOM} onClick={() => props.onZoomChange(stepPreviewZoom(props.zoom, 1))}>+</button>
        <button type="button" className={props.showGrid ? "active" : ""} aria-pressed={props.showGrid} title="Overlay QR module boundaries" onClick={() => props.onGridChange(!props.showGrid)}>Grid</button>
        <button type="button" onClick={() => props.onSimulationChange(props.simulation === "light" ? "dark" : "light")}>{props.simulation === "light" ? "Dark scene" : "Light scene"}</button>
      </div>
    </header>

    <div className="qr-preview-analysis-controls" aria-label="Preview inspection controls">
      <div className="qr-preview-mode" role="group" aria-label="QR rendering mode">
        <button type="button" className={previewMode === "raw" ? "active" : ""} aria-pressed={previewMode === "raw"} disabled={!props.result} onClick={() => setPreviewMode("raw")}>Raw</button>
        <button type="button" className={previewMode === "styled" ? "active" : ""} aria-pressed={previewMode === "styled"} disabled={!props.result} onClick={() => setPreviewMode("styled")}>Styled</button>
      </div>
      <label className="qr-perspective-control"><span>Camera perspective <output>{perspective}°</output></span><input type="range" min="0" max="55" step="1" value={perspective} aria-label="Camera perspective distortion" disabled={!props.result} onInput={(event) => setPerspective(Number(event.currentTarget.value))} /></label>
      <button type="button" className={`${showQuietZone ? "active" : ""} ${showQuietZone && quietZone.violated ? "violation" : ""}`} aria-pressed={showQuietZone} disabled={!props.result} onClick={() => setShowQuietZone(!showQuietZone)}>Quiet zone</button>
      <button type="button" className={showErrorCorrection ? "active correction-active" : ""} aria-pressed={showErrorCorrection} disabled={!props.result} onClick={() => { setShowErrorCorrection(!showErrorCorrection); if (!showErrorCorrection) setShowHeatmap(false); }}>Error correction</button>
      <button type="button" className={showHeatmap ? "active heatmap-active" : ""} aria-pressed={showHeatmap} disabled={!props.result} title="Show scan-sensitive and risky QR areas" onClick={() => { setShowHeatmap(!showHeatmap); if (!showHeatmap) setShowErrorCorrection(false); }}>Heatmap</button>
    </div>

    <div ref={stageRef} className={`qr-preview-stage ${props.showGrid ? "show-grid" : ""} ${canPan ? "pannable" : ""} ${isDragging ? "dragging" : ""}`} title={canPan ? "Use the mouse wheel to zoom. Click and drag to pan. Double-click to zoom all the way out." : "Use the mouse wheel to zoom. Double-click to zoom all the way in."} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={cancelPan}>
      {props.result?.svg ? <div ref={frameRef} className="qr-svg-frame" style={{ transform: buildPreviewTransform(pan, props.zoom, perspective, frameWidth), "--qr-grid-count": gridCount, "--qr-module-count": props.result.moduleCount, "--qr-grid-inset": `${frameExtent * 100 / outputCount}%`, "--qr-quiet-inset": `${(frameExtent + 4) * 100 / outputCount}%`, "--qr-quiet-size": `${4 * 100 / gridCount}%` } as CSSProperties}>
        <div className="qr-svg-content" dangerouslySetInnerHTML={{ __html: displayedSvg }} />
        {props.showGrid && <div className="qr-module-grid" aria-hidden="true" />}
        {showHeatmap && <div className="qr-risk-heatmap" aria-hidden="true">{heatmap.map((cell) => <i key={`${cell.x}-${cell.y}`} className={cell.risk} style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }} title={cell.reason} />)}</div>}
        {showQuietZone && <div className={`qr-quiet-zone-overlay ${quietZone.violated ? "violation" : "safe"}`} aria-hidden="true"><span>{quietZone.violated ? "Potential violation" : "Clear 4-module margin"}</span></div>}
        {showErrorCorrection && <div className="qr-error-correction-overlay" aria-hidden="true">{correctionMap.map((cell) => <i key={`${cell.x}-${cell.y}`} className={cell.kind} style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }} />)}</div>}
      </div> : <div className="qr-preview-empty"><div className="qr-empty-mark">QR</div><strong>Build your code</strong><p>Complete the Content tab to start the live preview.</p></div>}
    </div>

    {canPan && <p className="qr-pan-hint">Use the mouse wheel to zoom. Click and drag the preview to move around.</p>}

    {showHeatmap && props.result && <div className="qr-heatmap-legend" role="status"><strong>Risk heatmap</strong><span><i className="critical" />Critical scan structures</span><span><i className="caution" />Caution / logo coverage</span><span><i className="low" />Normal data modules</span></div>}

    {showQuietZone && props.result && <div className={`qr-diagnostic-message ${quietZone.violated ? "violation" : "safe"}`} role="status"><strong>{quietZone.violated ? "Quiet-zone warning" : "Quiet zone is clear"}</strong><span>{quietZone.violated ? quietZone.reasons.join(" ") : "The required four-module margin is clear in the current design."}</span></div>}

    {showErrorCorrection && props.result && <div className="qr-heatmap-legend qr-correction-legend" role="status"><strong>{correctionLabel}</strong><span><i className="function" />Function patterns</span><span><i className="data" />Payload data</span><span><i className="correction" />Recovery parity</span></div>}

    <div className="qr-reliability-card">
      <div className="qr-reliability-heading"><span>Scan reliability{perspective > 0 ? " · camera-adjusted" : ""}</span><strong className={ratingClass}>{perspectiveAssessment?.label ?? "Waiting"} · {score}%</strong></div>
      <div className="qr-score-track"><i className={ratingClass} style={{ width: `${score}%` }} /></div>
      {perspectiveAssessment && perspective > 0 && <p className="qr-perspective-result">{perspectiveAssessment.penalty} point camera-perspective penalty · weakest modules retain {Math.round(perspectiveAssessment.minimumScale * 100)}% of their flat edge size.</p>}
      {[...(props.result?.suggestions ?? []), ...(perspectiveAssessment?.suggestions ?? [])].length ? <ul>{[...(props.result?.suggestions ?? []), ...(perspectiveAssessment?.suggestions ?? [])].map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul> : null}
    </div>
  </section>;
}
