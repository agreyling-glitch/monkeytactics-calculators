// Drywall calculator
(function () {
  "use strict";
  const KG_PER_LB = 0.45359237;

  function value(id) {
    const number = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  document.getElementById("calcBtn").addEventListener("click", function () {
    const length = value("length");
    const width = value("width");
    const height = value("height");
    const error = document.getElementById("calcError");
    const results = document.getElementById("resultsPanel");
    const empty = document.getElementById("resultsEmpty");
    error.style.display = "none";
    results.style.display = "none";
    empty.style.display = "flex";
    if (length === null || width === null || height === null) {
      error.style.display = "block";
      return;
    }

    const area = 2 * (length + width) * height;
    const sheets48 = Math.ceil(area / 32);
    const sheets412 = Math.ceil(area / 48);
    const weight48 = sheets48 * 50;
    const weight412 = sheets412 * 75;

    document.getElementById("wallArea").textContent = area.toLocaleString(undefined, { maximumFractionDigits: 1 });
    document.getElementById("sheets48").textContent = sheets48.toLocaleString();
    document.getElementById("sheets412").textContent = sheets412.toLocaleString();
    document.getElementById("weight48Lb").textContent = weight48.toLocaleString() + " lb";
    document.getElementById("weight48Kg").textContent = (weight48 * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kg";
    document.getElementById("weight412Lb").textContent = weight412.toLocaleString() + " lb";
    document.getElementById("weight412Kg").textContent = (weight412 * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kg";
    empty.style.display = "none";
    results.style.display = "block";
  });
})();
