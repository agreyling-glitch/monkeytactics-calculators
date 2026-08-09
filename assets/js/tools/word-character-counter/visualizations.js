function canvasContext(canvas) {
  const height = Number(canvas.dataset.height) || 150;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = height + "px";
  const width = Math.max(1, Math.round(canvas.getBoundingClientRect().width));
  const ratio = Math.max(1, window.devicePixelRatio || 1);
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

function drawBars(canvas, values) {
  const { context, width, height } = canvasContext(canvas);
  const colors = palette(canvas);
  if (!values.length) {
    drawEmpty(context, width, height, colors.muted);
    return;
  }
  const padding = { top: 12, right: 10, bottom: 24, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...values, 1);
  const gap = Math.min(5, chartWidth / values.length * 0.2);
  const barWidth = Math.max(1, chartWidth / values.length - gap);

  context.strokeStyle = colors.grid;
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, padding.top + chartHeight);
  context.lineTo(width - padding.right, padding.top + chartHeight);
  context.stroke();
  context.fillStyle = colors.accent;
  values.forEach(function (value, index) {
    const barHeight = value / max * chartHeight;
    const x = padding.left + index * (chartWidth / values.length) + gap / 2;
    context.fillRect(x, padding.top + chartHeight - barHeight, barWidth, barHeight);
  });
  context.fillStyle = colors.muted;
  context.font = "11px system-ui, sans-serif";
  context.textAlign = "right";
  context.fillText(String(max), padding.left - 5, padding.top + 9);
  context.fillText("0", padding.left - 5, padding.top + chartHeight);
  context.textAlign = "center";
  context.fillText(String(values.length) + " segments", padding.left + chartWidth / 2, height - 5);
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
  let resizeTimer;
  const canvases = [elements.sentenceCanvas, elements.paragraphCanvas, elements.keywordCanvas];
  function render(data, characterCount) {
    latest = { data, characterCount };
    drawBars(elements.sentenceCanvas, data.sentence_lengths || []);
    drawBars(elements.paragraphCanvas, data.paragraph_lengths || []);
    drawHeatmap(elements.keywordCanvas, data.keyword_positions || [], characterCount);
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
    canvases.forEach(function (canvas) { observer.observe(canvas); });
  } else {
    window.addEventListener("resize", scheduleRender);
  }
  return { render, drawKeywordDistribution };
}
