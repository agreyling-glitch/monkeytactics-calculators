function canvasContext(canvas) {
  const height = Number(canvas.dataset.height) || 150;
  const scrollViewport = canvas.parentElement?.classList.contains("chart-scroll-viewport")
    ? canvas.parentElement : null;
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.style.display = "block";
  canvas.style.width = scrollViewport
    ? Math.max(1, Math.round(scrollViewport.clientWidth)) + "px"
    : "100%";
  canvas.style.height = height + "px";
  const width = Math.max(1, Math.round(
    scrollViewport?.clientWidth
      || canvas.parentElement?.clientWidth
      || canvas.getBoundingClientRect().width
  ));
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function palette(canvas) {
  const styles = getComputedStyle(canvas);
  return {
    accent: styles.getPropertyValue("--accent").trim() || "#22c55e",
    selected: "#f5c451",
    muted: styles.getPropertyValue("--muted").trim() || "#94a3b8",
    grid: "rgba(148, 163, 184, 0.2)"
  };
}

function drawEmpty(context, width, height, color) {
  context.fillStyle = color;
  context.font = "13px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("Add text to display this chart", width / 2, height / 2);
}

const barMaximumCache = new WeakMap();

function drawBars(canvas, values, selectedIndex = -1) {
  const viewport = canvas.closest(".chart-scroll-viewport");
  const zoom = Math.max(1, Number(canvas.dataset.zoom) || 1);
  const virtualWidth = Math.max(viewport?.clientWidth || 1, Math.round((viewport?.clientWidth || 1) * zoom));
  const scrollLeft = viewport?.scrollLeft || 0;
  const spacer = viewport?.querySelector(".chart-scroll-spacer");
  if (spacer) spacer.style.width = virtualWidth + "px";
  canvas.style.left = scrollLeft + "px";
  const { context, width, height } = canvasContext(canvas);
  const colors = palette(canvas);
  if (!values.length) {
    drawEmpty(context, width, height, colors.muted);
    return;
  }
  const padding = { top: 12, right: 10, bottom: 24, left: 36 };
  const chartWidth = virtualWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  let max = barMaximumCache.get(values);
  if (max === undefined) {
    max = values.reduce(function (highest, value) { return Math.max(highest, value); }, 1);
    barMaximumCache.set(values, max);
  }
  const segmentWidth = chartWidth / values.length;
  const gap = Math.min(5, segmentWidth * 0.2);
  const barWidth = Math.max(1, segmentWidth - gap);

  context.strokeStyle = colors.grid;
  context.beginPath();
  context.moveTo(0, padding.top + chartHeight);
  context.lineTo(width, padding.top + chartHeight);
  context.stroke();
  const firstVisibleIndex = Math.max(0, Math.floor((scrollLeft - padding.left) / segmentWidth) - 1);
  const lastVisibleIndex = Math.min(values.length - 1, Math.ceil((scrollLeft + width - padding.left) / segmentWidth) + 1);
  for (let index = firstVisibleIndex; index <= lastVisibleIndex; index += 1) {
    const value = values[index];
    const barHeight = value / max * chartHeight;
    const x = padding.left + index * segmentWidth + gap / 2 - scrollLeft;
    context.fillStyle = index === selectedIndex ? colors.selected : colors.accent;
    context.fillRect(x, padding.top + chartHeight - barHeight, barWidth, barHeight);
    if (index === selectedIndex) {
      context.strokeStyle = "rgba(255,255,255,0.75)";
      context.lineWidth = 1;
      context.strokeRect(x - 0.5, padding.top + chartHeight - barHeight - 0.5, barWidth + 1, barHeight + 1);
    }
  }
  context.fillStyle = colors.muted;
  context.font = "11px system-ui, sans-serif";
  context.textAlign = "right";
  context.fillText(String(max), 31, padding.top + 9);
  context.fillText("0", 31, padding.top + chartHeight);
  context.textAlign = "center";
  context.fillText(String(values.length) + " segments", width / 2, height - 5);
}

function barIndexAtPointer(canvas, values, event) {
  if (!values.length) return -1;
  const bounds = canvas.getBoundingClientRect();
  const viewport = canvas.closest(".chart-scroll-viewport");
  const zoom = Math.max(1, Number(canvas.dataset.zoom) || 1);
  const width = Math.max(viewport?.clientWidth || bounds.width, (viewport?.clientWidth || bounds.width) * zoom);
  const left = 36;
  const right = width - 10;
  const x = (viewport?.scrollLeft || 0) + event.clientX - bounds.left;
  if (x < left || x > right) return -1;
  return Math.min(values.length - 1, Math.floor((x - left) / (right - left) * values.length));
}

function keywordColor(word) {
  let hash = 0;
  for (let index = 0; index < word.length; index += 1) {
    hash = (hash * 31 + word.charCodeAt(index)) >>> 0;
  }
  return "hsl(" + (hash % 360) + " 70% 55%)";
}

function drawHeatmap(canvas, positions, characterCount) {
  const { context, width, height } = canvasContext(canvas);
  const colors = palette(canvas);
  if (!positions.length || characterCount < 1) {
    drawEmpty(context, width, height, colors.muted);
    return;
  }
  const left = 18;
  const right = width - 18;
  const lineY = height / 2;
  context.strokeStyle = colors.grid;
  context.lineWidth = 8;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(left, lineY);
  context.lineTo(right, lineY);
  context.stroke();
  positions.forEach(function (entry) {
    const x = left + Math.min(entry.index / characterCount, 1) * (right - left);
    context.strokeStyle = keywordColor(entry.word);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, lineY - 22);
    context.lineTo(x, lineY + 22);
    context.stroke();
  });
  context.fillStyle = colors.muted;
  context.font = "11px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText("Start", left, height - 8);
  context.textAlign = "right";
  context.fillText("End", right, height - 8);
}

export function createVisualizationRenderer(elements) {
  let latest;
  let selectedBar = null;
  let resizeTimer;
  const canvases = [elements.sentenceCanvas, elements.paragraphCanvas, elements.keywordCanvas];
  const barCanvases = [
    [elements.sentenceCanvas, "sentence_lengths", "sentence"],
    [elements.paragraphCanvas, "paragraph_lengths", "paragraph"]
  ];
  const zoomLevels = [1, 2, 4, 8, 16, 32, 64];
  function canvasIsVisible(canvas) {
    const panel = canvas.closest('[role="tabpanel"]');
    return !panel || !panel.hidden;
  }
  barCanvases.forEach(function ([canvas, dataKey, type]) {
    const viewport = canvas.closest(".chart-scroll-viewport");
    const controls = canvas.closest(".structure-card")?.querySelector(".chart-zoom-controls");
    canvas.dataset.zoom = "1";
    function redrawCurrentBars() {
      if (!latest) return;
      const values = latest.data[dataKey] || [];
      const selectedIndex = selectedBar?.type === type ? selectedBar.index : -1;
      drawBars(canvas, values, selectedIndex);
    }
    function setZoom(nextZoom) {
      const oldZoom = Number(canvas.dataset.zoom) || 1;
      const centerRatio = viewport && viewport.scrollWidth > viewport.clientWidth
        ? (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth : 0.5;
      canvas.dataset.zoom = String(nextZoom);
      if (viewport && nextZoom === 1) viewport.scrollLeft = 0;
      controls?.querySelector('[data-chart-zoom="out"]')?.toggleAttribute("disabled", nextZoom === zoomLevels[0]);
      controls?.querySelector('[data-chart-zoom="in"]')?.toggleAttribute("disabled", nextZoom === zoomLevels.at(-1));
      controls?.querySelector('[data-chart-zoom="fit"]')?.setAttribute("aria-pressed", String(nextZoom === 1));
      redrawCurrentBars();
      if (viewport && nextZoom !== oldZoom) {
        requestAnimationFrame(function () {
          viewport.scrollLeft = nextZoom === 1
            ? 0
            : Math.max(0, centerRatio * viewport.scrollWidth - viewport.clientWidth / 2);
          redrawCurrentBars();
        });
      }
    }
    controls?.addEventListener("click", function (event) {
      const action = event.target.closest("[data-chart-zoom]")?.dataset.chartZoom;
      if (!action) return;
      const currentIndex = zoomLevels.indexOf(Number(canvas.dataset.zoom) || 1);
      if (action === "fit") setZoom(1);
      if (action === "out") setZoom(zoomLevels[Math.max(0, currentIndex - 1)]);
      if (action === "in") setZoom(zoomLevels[Math.min(zoomLevels.length - 1, currentIndex + 1)]);
    });
    viewport?.addEventListener("wheel", function (event) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const currentIndex = zoomLevels.indexOf(Number(canvas.dataset.zoom) || 1);
      setZoom(zoomLevels[Math.max(0, Math.min(zoomLevels.length - 1, currentIndex + (event.deltaY < 0 ? 1 : -1)))]);
    }, { passive: false });
    let scrollFrame = 0;
    viewport?.addEventListener("scroll", function () {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(function () {
        scrollFrame = 0;
        if (!latest) return;
        const values = latest.data[dataKey] || [];
        const selectedIndex = selectedBar?.type === type ? selectedBar.index : -1;
        drawBars(canvas, values, selectedIndex);
      });
    });
    setZoom(1);
    canvas.tabIndex = 0;
    canvas.style.cursor = "pointer";
    canvas.addEventListener("click", function (event) {
      const values = latest?.data?.[dataKey] || [];
      const index = barIndexAtPointer(canvas, values, event);
      if (index >= 0) selectBar(type, index);
    });
    canvas.addEventListener("keydown", function (event) {
      const values = latest?.data?.[dataKey] || [];
      if (!values.length || !["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      let index = Number(canvas.dataset.activeBar || 0);
      if (event.key === "ArrowLeft") index = Math.max(0, index - 1);
      if (event.key === "ArrowRight") index = Math.min(values.length - 1, index + 1);
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = values.length - 1;
      canvas.dataset.activeBar = String(index);
      if (event.key === "Enter" || event.key === " ") selectBar(type, index);
      canvas.setAttribute("aria-label", (type === "sentence" ? "Sentence" : "Paragraph") + " bar " + (index + 1) + " of " + values.length + ". Press Enter to select its text.");
    });
  });
  function selectBar(type, index) {
    if (selectedBar?.type === type && selectedBar.index === index) {
      clearBarSelection();
      elements.onSegmentDeselect?.();
      return;
    }
    selectedBar = { type, index };
    if (latest) {
      drawBars(elements.sentenceCanvas, latest.data.sentence_lengths || [], type === "sentence" ? index : -1);
      drawBars(elements.paragraphCanvas, latest.data.paragraph_lengths || [], type === "paragraph" ? index : -1);
    }
    elements.onSegmentSelect?.(type, index);
  }
  function clearBarSelection() {
    selectedBar = null;
    if (latest) {
      drawBars(elements.sentenceCanvas, latest.data.sentence_lengths || []);
      drawBars(elements.paragraphCanvas, latest.data.paragraph_lengths || []);
    }
  }
  function render(data, characterCount) {
    latest = { data, characterCount };
    const sentenceSelection = selectedBar?.type === "sentence" && selectedBar.index < (data.sentence_lengths || []).length
      ? selectedBar.index : -1;
    const paragraphSelection = selectedBar?.type === "paragraph" && selectedBar.index < (data.paragraph_lengths || []).length
      ? selectedBar.index : -1;
    if (canvasIsVisible(elements.sentenceCanvas)) {
      drawBars(elements.sentenceCanvas, data.sentence_lengths || [], sentenceSelection);
    }
    if (canvasIsVisible(elements.paragraphCanvas)) {
      drawBars(elements.paragraphCanvas, data.paragraph_lengths || [], paragraphSelection);
    }
    if (canvasIsVisible(elements.keywordCanvas)) {
      drawHeatmap(elements.keywordCanvas, data.keyword_positions || [], characterCount);
    }
  }
  function drawKeywordDistribution(positions, characterCount) {
    const data = latest ? latest.data : {};
    latest = {
      data: { ...data, keyword_positions: positions },
      characterCount
    };
    drawHeatmap(elements.keywordCanvas, positions, characterCount);
  }
  function scheduleRender() {
    if (!latest) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { render(latest.data, latest.characterCount); }, 100);
  }

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleRender);
    canvases.forEach(function (canvas) { observer.observe(canvas.closest(".chart-scroll-viewport") || canvas); });
  } else {
    window.addEventListener("resize", scheduleRender);
  }
  return { render, drawKeywordDistribution, clearBarSelection };
}
