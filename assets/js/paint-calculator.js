// Paint calculator
(function () {
  "use strict";
  const KG_PER_LB = 0.45359237;
  const COVERAGE_PER_GALLON = 350;
  const POUNDS_PER_GALLON = 11.5;

  function positive(id) {
    const number = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  document.getElementById("calcBtn").addEventListener("click", function () {
    const length = positive("length");
    const height = positive("height");
    const coats = positive("coats");
    const error = document.getElementById("calcError");
    const results = document.getElementById("resultsPanel");
    const empty = document.getElementById("resultsEmpty");
    error.style.display = "none";
    results.style.display = "none";
    empty.style.display = "flex";
    if (length === null || height === null || coats === null || !Number.isInteger(coats)) {
      error.style.display = "block";
      return;
    }

    const area = length * height * coats;
    const exactGallons = area / COVERAGE_PER_GALLON;
    const buyGallons = Math.ceil(exactGallons);
    const weight = buyGallons * POUNDS_PER_GALLON;
    document.getElementById("area").textContent = area.toLocaleString(undefined, { maximumFractionDigits: 1 });
    document.getElementById("gallonsExact").textContent = exactGallons.toFixed(2);
    document.getElementById("gallonsBuy").textContent = buyGallons.toLocaleString();
    document.getElementById("weightLb").textContent = weight.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " lb";
    document.getElementById("weightKg").textContent = (weight * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kg";
    empty.style.display = "none";
    results.style.display = "block";
  });
})();
