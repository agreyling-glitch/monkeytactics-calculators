// Tile calculator
(function () {
  "use strict";
  const KG_PER_LB = 0.45359237;
  const tiles = {
    "6x6": { area: 0.25, perBox: 44, pounds: 0.95 },
    "12x12": { area: 1, perBox: 15, pounds: 3.8 },
    "12x24": { area: 2, perBox: 8, pounds: 7.6 },
    "24x24": { area: 4, perBox: 4, pounds: 15.2 }
  };

  function positive(id) {
    const number = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  document.getElementById("calcBtn").addEventListener("click", function () {
    const length = positive("length");
    const width = positive("width");
    const waste = Number.parseFloat(document.getElementById("waste").value);
    const tile = tiles[document.getElementById("tileSize").value];
    const error = document.getElementById("calcError");
    const results = document.getElementById("resultsPanel");
    const empty = document.getElementById("resultsEmpty");
    error.style.display = "none";
    results.style.display = "none";
    empty.style.display = "flex";
    if (length === null || width === null || !Number.isFinite(waste) || waste < 0 || waste > 100) {
      error.style.display = "block";
      return;
    }

    const adjustedArea = length * width * (1 + waste / 100);
    const tileCount = Math.ceil(adjustedArea / tile.area);
    const boxes = Math.ceil(tileCount / tile.perBox);
    const boxedTiles = boxes * tile.perBox;
    const weight = boxedTiles * tile.pounds;
    document.getElementById("area").textContent = adjustedArea.toLocaleString(undefined, { maximumFractionDigits: 1 });
    document.getElementById("tiles").textContent = tileCount.toLocaleString();
    document.getElementById("boxes").textContent = boxes.toLocaleString();
    document.getElementById("boxSize").textContent = tile.perBox + " tiles per box";
    document.getElementById("unitWeight").textContent = tile.pounds + " lb";
    document.getElementById("weightLb").textContent = weight.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " lb";
    document.getElementById("weightKg").textContent = (weight * KG_PER_LB).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " kg";
    empty.style.display = "none";
    results.style.display = "block";
  });
})();
