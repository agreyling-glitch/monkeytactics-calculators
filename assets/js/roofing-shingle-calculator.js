// Roofing shingle calculator
(function () {
  "use strict";
  const KG_PER_LB = 0.45359237;

  document.getElementById("calcBtn").addEventListener("click", function () {
    const area = Number.parseFloat(document.getElementById("area").value);
    const pitch = Number.parseFloat(document.getElementById("pitch").value);
    const error = document.getElementById("calcError");
    const results = document.getElementById("resultsPanel");
    const empty = document.getElementById("resultsEmpty");
    error.style.display = "none";
    results.style.display = "none";
    empty.style.display = "flex";
    if (!Number.isFinite(area) || area <= 0) {
      error.style.display = "block";
      return;
    }

    const pitchFactor = Math.sqrt(144 + pitch * pitch) / 12;
    const roofArea = area * pitchFactor * 1.10;
    const exactSquares = roofArea / 100;
    const bundleCount = Math.ceil(exactSquares * 3);
    const weight = bundleCount * 70;
    document.getElementById("adjustedArea").textContent = roofArea.toLocaleString(undefined, { maximumFractionDigits: 1 });
    document.getElementById("squares").textContent = exactSquares.toFixed(2);
    document.getElementById("bundles").textContent = bundleCount.toLocaleString();
    document.getElementById("weightLb").textContent = weight.toLocaleString() + " lb";
    document.getElementById("weightKg").textContent = (weight * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kg";
    empty.style.display = "none";
    results.style.display = "block";
  });
})();
