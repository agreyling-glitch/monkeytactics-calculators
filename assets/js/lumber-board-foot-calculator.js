// Lumber board foot calculator
(function () {
  "use strict";
  const KG_PER_LB = 0.45359237;
  const POUNDS_PER_BOARD_FOOT = 3;

  function positive(id) {
    const number = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  document.getElementById("calcBtn").addEventListener("click", function () {
    const thickness = positive("thickness");
    const width = positive("width");
    const length = positive("length");
    const error = document.getElementById("calcError");
    const results = document.getElementById("resultsPanel");
    const empty = document.getElementById("resultsEmpty");
    error.style.display = "none";
    results.style.display = "none";
    empty.style.display = "flex";
    if (thickness === null || width === null || length === null) {
      error.style.display = "block";
      return;
    }

    const boardFeet = thickness * width * length / 12;
    const weight = boardFeet * POUNDS_PER_BOARD_FOOT;
    document.getElementById("boardFeet").textContent = boardFeet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById("weightLb").textContent = weight.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " lb";
    document.getElementById("weightKg").textContent = (weight * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kg";
    empty.style.display = "none";
    results.style.display = "block";
  });
})();
