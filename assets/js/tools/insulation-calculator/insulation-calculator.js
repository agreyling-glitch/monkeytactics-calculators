// Insulation calculator
(function () {
  "use strict";
  const KG_PER_LB = 0.45359237;
  const products = {
    R13: { coverage: 40, pounds: 15 },
    R19: { coverage: 48.96, pounds: 24 },
    R30: { coverage: 31.25, pounds: 30 },
    R38: { coverage: 32, pounds: 38 }
  };

  document.getElementById("calcBtn").addEventListener("click", function () {
    const area = Number.parseFloat(document.getElementById("area").value);
    const product = products[document.getElementById("rValue").value];
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

    const unitCount = Math.ceil(area / product.coverage);
    const weight = unitCount * product.pounds;
    document.getElementById("units").textContent = unitCount.toLocaleString();
    document.getElementById("coverage").textContent = product.coverage + " ft² per unit";
    document.getElementById("unitWeight").textContent = product.pounds + " lb";
    document.getElementById("weightLb").textContent = weight.toLocaleString() + " lb";
    document.getElementById("weightKg").textContent = (weight * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kg";
    empty.style.display = "none";
    results.style.display = "block";
  });
})();
