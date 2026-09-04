(() => {
  "use strict";

  const svgNS = "http://www.w3.org/2000/svg";
  const points = [];
  let chart = null;

  const svgNode = (name, attributes = {}, text = "") => {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  };

  function ensureChart(kind) {
    if (chart) return chart;
    const multi = kind === "multi";
    const host = multi ? document.querySelector(".analysis-progress") : document.querySelector("#candidate-summary");
    if (!host) return null;
    const section = document.createElement("section");
    section.className = `search-progress-chart search-progress-chart--${multi ? "multi" : kind}`;
    const heading = document.createElement("div");
    heading.className = "search-progress-chart__heading";
    const title = document.createElement("h3");
    title.textContent = kind === "antiwordle" ? "Uncertainty preserved" : multi ? "Candidate pressure across boards" : "Search-space progression";
    const legend = document.createElement("span");
    legend.innerHTML = multi ? "<b>● Total</b> · <i>● Median</i> · <em>● Hardest board</em>" : "<b>● Remaining candidates</b>";
    heading.append(title, legend);
    const summary = document.createElement("p");
    summary.className = "search-progress-chart__summary";
    const svg = svgNode("svg", { viewBox: "0 0 420 190", role: "img", "aria-label": title.textContent });
    const data = document.createElement("ol");
    data.className = "visually-hidden";
    section.append(heading, summary, svg, data);
    if (multi) host.after(section); else host.after(section);
    chart = { section, summary, svg, data, kind };
    return chart;
  }

  function aggregate(counts, solved = []) {
    const active = counts.filter((_, index) => !solved[index]).sort((a, b) => a - b);
    return {
      total: active.reduce((sum, count) => sum + count, 0),
      median: active.length ? active[Math.floor((active.length - 1) / 2)] : 0,
      hardest: active.at(-1) || 0,
      active: active.length
    };
  }

  function line(svg, values, x, y, className) {
    svg.append(svgNode("polyline", { points: values.map((value, index) => `${x(index)},${y(value)}`).join(" "), class: className }));
    values.forEach((value, index) => svg.append(svgNode("circle", { cx: x(index), cy: y(value), r: 3.5, class: `${className}-point` })));
  }

  function render() {
    if (!chart) return;
    if (points.length < 2 && chart.kind !== "antiwordle") {
      chart.section.hidden = true;
      return;
    }
    const { svg, summary, data, kind } = chart;
    svg.replaceChildren();
    const series = kind === "multi"
      ? [points.map((point) => point.total), points.map((point) => point.median), points.map((point) => point.hardest)]
      : [points.map((point) => point.candidateCount)];
    const values = series.flat();
    const maximum = Math.max(1, ...values);
    const left = 46, right = 14, top = 18, bottom = 30, width = 420, height = 190;
    const x = (index) => left + (index / Math.max(1, points.length - 1)) * (width - left - right);
    const y = (value) => top + (1 - Math.log10(Math.max(1, value)) / Math.log10(Math.max(10, maximum))) * (height - top - bottom);
    [0, .5, 1].forEach((fraction) => {
      const yy = top + fraction * (height - top - bottom);
      const value = Math.max(1, Math.round(10 ** (Math.log10(Math.max(10, maximum)) * (1 - fraction))));
      svg.append(svgNode("line", { x1: left, y1: yy, x2: width - right, y2: yy, class: "search-progress-grid" }));
      svg.append(svgNode("text", { x: left - 7, y: yy + 3, class: "search-progress-axis", "text-anchor": "end" }, value.toLocaleString()));
    });
    series.forEach((valuesForLine, index) => line(svg, valuesForLine, x, y, `search-progress-line search-progress-line--${index + 1}`));
    points.forEach((point, index) => svg.append(svgNode("text", { x: x(index), y: height - 9, class: "search-progress-axis", "text-anchor": "middle" }, index ? `Guess ${index}` : "Start")));
    const latest = points.at(-1), previous = points.at(-2);
    if (kind === "multi") {
      summary.textContent = `${latest.total.toLocaleString()} candidates remain across ${latest.active} unsolved boards. Median ${latest.median.toLocaleString()}; hardest board ${latest.hardest.toLocaleString()}.`;
      data.replaceChildren(...points.map((point, index) => { const item = document.createElement("li"); item.textContent = `${index ? `After guess ${index}` : "Starting pool"}: ${point.total} total, ${point.median} median, ${point.hardest} on the hardest board`; return item; }));
    } else {
      const change = previous?.candidateCount ? ((previous.candidateCount - latest.candidateCount) / previous.candidateCount) * 100 : 0;
      summary.textContent = kind === "antiwordle"
        ? chart.detail?.completed
          ? `${latest.candidateCount.toLocaleString()} possible answer remains—the Antiwordle game is complete.`
          : previous
          ? `${latest.candidateCount.toLocaleString()} possible answers remain; the last guess preserved ${(100 - Math.max(0, change)).toFixed(1)}% of the prior uncertainty.`
          : `Start with ${latest.candidateCount.toLocaleString()} possible answers. Add feedback to chart how much uncertainty each guess preserves.`
        : `${latest.candidateCount.toLocaleString()} possible answers remain; the last guess reduced the pool by ${Math.max(0, change).toFixed(1)}%.`;
      data.replaceChildren(...points.map((point, index) => { const item = document.createElement("li"); item.textContent = `${index ? `After guess ${index}` : "Starting pool"}: ${point.candidateCount} candidates`; return item; }));
    }
    chart.section.hidden = false;
  }

  document.addEventListener("word-game-search-progress", ({ detail }) => {
    if (!detail || !ensureChart(detail.kind)) return;
    const initial = detail.kind === "multi"
      ? aggregate(Array.from({ length: detail.counts.length }, () => detail.initialCount))
      : { candidateCount: detail.initialCount };
    points[0] = initial;
    points.length = Math.max(1, detail.guessCount + 1);
    points[detail.guessCount] = detail.kind === "multi" ? aggregate(detail.counts, detail.solved) : { candidateCount: detail.candidateCount };
    chart.detail = detail;
    render();
  });
})();
