// Concrete calculator
(function () {
  "use strict";

  const KG_PER_LB = 0.45359237;
  const BAG_YIELD_PER_LB = 0.0075;
  const POST_TYPES = {
    wood4: { dimension: 3.5, shape: "square", diameterRule: "post dimension + 4 in" },
    wood6: { dimension: 5.5, shape: "square", diameterRule: "post dimension + 4 in" },
    steel238: { dimension: 2.375, shape: "round", diameterRule: "3x post diameter" },
    steel3: { dimension: 3, shape: "round", diameterRule: "3x post diameter" }
  };
  const STOCK_POST_LENGTHS = [6, 8, 10, 12, 14, 16, 18, 20];

  const tabs = Array.from(document.querySelectorAll(".mode-tab"));
  const panels = {
    slab: document.getElementById("panel-slab"),
    fence: document.getElementById("panel-fence")
  };

  const slabFields = ["length", "width", "depth"];
  const slabButton = document.getElementById("calcBtn");
  const slabError = document.getElementById("calcError");
  const slabResults = document.getElementById("resultsPanel");
  const slabEmpty = document.getElementById("resultsEmpty");
  const depthSlider = document.getElementById("depthSlider");
  const depthInput = document.getElementById("depth");
  const depthValue = document.getElementById("depthVal");
  const slabBagWeight = document.getElementById("slabBagWeight");
  const slabVehiclePayload = document.getElementById("slabVehiclePayload");
  const presetGroups = document.getElementById("presetGroups");
  const presetData = JSON.parse(document.getElementById("concretePresetData").textContent);

  const fenceHeight = document.getElementById("fenceHeight");
  const postCountSlider = document.getElementById("postCountSlider");
  const postCount = document.getElementById("postCount");
  const postCountValue = document.getElementById("postCountVal");
  const postType = document.getElementById("postType");
  const frostLine = document.getElementById("frostLine");
  const bagWeight = document.getElementById("bagWeight");
  const vehiclePayload = document.getElementById("vehiclePayload");
  const fenceButton = document.getElementById("fenceCalcBtn");
  const fenceError = document.getElementById("fenceError");
  const fenceResults = document.getElementById("fenceResultsPanel");
  const fenceEmpty = document.getElementById("fenceResultsEmpty");
  const fencePresetGroups = document.getElementById("fencePresetGroups");
  const fencePresetData = JSON.parse(document.getElementById("fencePresetData").textContent);

  function readPositive(id) {
    const value = Number.parseFloat(document.getElementById(id).value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function formatNumber(value, maximumFractionDigits) {
    return value.toLocaleString(undefined, { maximumFractionDigits: maximumFractionDigits });
  }

  function formatDepth(value) {
    return formatNumber(value, 2) + " in";
  }

  function setActiveMode(mode, focusTab) {
    tabs.forEach(function (tab) {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
      if (active && focusTab) {
        tab.focus();
      }
    });

    Object.keys(panels).forEach(function (panelMode) {
      const active = panelMode === mode;
      panels[panelMode].classList.toggle("active", active);
      panels[panelMode].hidden = !active;
    });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      setActiveMode(tab.dataset.mode, false);
    });

    tab.addEventListener("keydown", function (event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      setActiveMode(tabs[nextIndex].dataset.mode, true);
    });
  });

  function calculateSlab(showErrors) {
    const values = slabFields.map(readPositive);
    const bagWeightPounds = Number.parseFloat(slabBagWeight.value);
    const vehiclePayloadPounds = Number.parseFloat(slabVehiclePayload.value);
    slabError.style.display = "none";
    slabResults.style.display = "none";
    slabEmpty.style.display = "flex";

    if (values.includes(null) ||
        !Number.isFinite(bagWeightPounds) || bagWeightPounds <= 0 ||
        !Number.isFinite(vehiclePayloadPounds) || vehiclePayloadPounds < 0 ||
        (vehiclePayloadPounds > 0 && vehiclePayloadPounds < bagWeightPounds)) {
      if (showErrors) slabError.style.display = "block";
      return false;
    }

    const cubicFeet = values[0] * values[1] * (values[2] / 12);
    const cubicYards = cubicFeet / 27;
    const bagYield = bagWeightPounds * BAG_YIELD_PER_LB;
    const bags = Math.ceil(cubicFeet / bagYield);
    const bagsPerTrip = vehiclePayloadPounds > 0 ? Math.floor(vehiclePayloadPounds / bagWeightPounds) : 0;
    const trips = bagsPerTrip > 0 ? Math.ceil(bags / bagsPerTrip) : 0;

    document.getElementById("cubicYards").textContent = cubicYards.toFixed(2);
    document.getElementById("slabBagLabel").textContent = "# bags needed (" + formatNumber(bagWeightPounds, 2) + " lb)";
    document.getElementById("slabBags").textContent = bags.toLocaleString();
    document.getElementById("slabBagDetails").textContent = formatNumber(bagYield, 4) + " ft\u00B3 yield each \u2022 " + formatNumber(bags * bagWeightPounds, 2) + " lb / " + formatNumber(bags * bagWeightPounds * KG_PER_LB, 1) + " kg" + (vehiclePayloadPounds > 0
      ? " \u2022 " + bagsPerTrip.toLocaleString() + (bagsPerTrip === 1 ? " bag" : " bags") + " per trip \u2022 " + trips.toLocaleString() + (trips === 1 ? " trip" : " trips")
      : "");
    slabEmpty.style.display = "none";
    slabResults.style.display = "block";
    return true;
  }

  function resetSlabResults() {
    slabError.style.display = "none";
    slabResults.style.display = "none";
    slabEmpty.style.display = "flex";
  }

  function selectSlabPreset(item, buttonElement) {
    document.getElementById("length").value = item.dimensions.lengthFeet;
    document.getElementById("width").value = item.dimensions.widthFeet;
    depthInput.value = item.depthInches;
    depthSlider.value = Math.max(1, Math.min(12, item.depthInches));
    depthValue.textContent = formatDepth(item.depthInches);
    presetGroups.querySelectorAll(".preset-button").forEach(function (button) {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    buttonElement.classList.add("active");
    buttonElement.setAttribute("aria-pressed", "true");
    resetSlabResults();
  }

  function renderSlabPresets() {
    presetData.forEach(function (group) {
      const groupElement = document.createElement("section");
      groupElement.className = "preset-group";

      const heading = document.createElement("h3");
      heading.textContent = group.group;
      groupElement.appendChild(heading);

      const itemsElement = document.createElement("div");
      itemsElement.className = "preset-items";

      group.items.forEach(function (item) {
        const buttonElement = document.createElement("button");
        buttonElement.type = "button";
        buttonElement.className = "preset-button";
        buttonElement.setAttribute("aria-pressed", "false");
        buttonElement.setAttribute("aria-label", "Use " + item.name + ": " + item.dimensions.lengthFeet + " by " + item.dimensions.widthFeet + " feet by " + item.depthInches + " inches");

        const nameElement = document.createElement("span");
        nameElement.className = "preset-name";
        nameElement.textContent = item.name;

        const dimensionsElement = document.createElement("span");
        dimensionsElement.className = "preset-dimensions";
        dimensionsElement.textContent = item.dimensions.lengthFeet + " x " + item.dimensions.widthFeet + " ft x " + item.depthInches + " in";

        buttonElement.appendChild(nameElement);
        buttonElement.appendChild(dimensionsElement);
        buttonElement.addEventListener("click", function () {
          selectSlabPreset(item, buttonElement);
        });
        itemsElement.appendChild(buttonElement);
      });

      groupElement.appendChild(itemsElement);
      presetGroups.appendChild(groupElement);
    });
  }

  function resetFenceResults() {
    fenceError.style.display = "none";
    fenceResults.style.display = "none";
    fenceEmpty.style.display = "flex";
  }

  function nextStockLength(requiredFeet) {
    const stockLength = STOCK_POST_LENGTHS.find(function (length) {
      return length >= requiredFeet;
    });
    return stockLength || Math.ceil(requiredFeet / 2) * 2;
  }

  function calculateFence(showErrors) {
    const heightFeet = Number.parseFloat(fenceHeight.value);
    const numberOfPosts = Number.parseFloat(postCount.value);
    const frostLineInches = Number.parseFloat(frostLine.value);
    const bagWeightPounds = Number.parseFloat(bagWeight.value);
    const vehiclePayloadPounds = Number.parseFloat(vehiclePayload.value);
    const selectedPost = POST_TYPES[postType.value];

    fenceError.style.display = "none";
    fenceResults.style.display = "none";
    fenceEmpty.style.display = "flex";

    if (!Number.isFinite(heightFeet) || heightFeet <= 0 ||
        !Number.isInteger(numberOfPosts) || numberOfPosts < 1 ||
        !Number.isFinite(frostLineInches) || frostLineInches < 0 ||
        !Number.isFinite(bagWeightPounds) || bagWeightPounds <= 0 ||
        !Number.isFinite(vehiclePayloadPounds) || vehiclePayloadPounds < 0 ||
        (vehiclePayloadPounds > 0 && vehiclePayloadPounds < bagWeightPounds) ||
        !selectedPost) {
      if (showErrors) fenceError.style.display = "block";
      return false;
    }

    const rawStructuralDepth = (heightFeet * 12 * 0.5) - 6;
    const structuralDepth = Math.ceil(Math.max(24, Math.min(48, rawStructuralDepth)));
    const frostDepth = Math.ceil(frostLineInches + 6);
    const setDepth = Math.max(structuralDepth, frostDepth);
    const holeDiameter = Math.ceil(selectedPost.shape === "square"
      ? selectedPost.dimension + 4
      : selectedPost.dimension * 3);
    const holeRadius = holeDiameter / 2;
    const holeVolume = Math.PI * holeRadius * holeRadius * setDepth / 1728;
    const postVolume = selectedPost.shape === "square"
      ? selectedPost.dimension * selectedPost.dimension * setDepth / 1728
      : Math.PI * Math.pow(selectedPost.dimension / 2, 2) * setDepth / 1728;
    const concretePerPost = Math.max(0, holeVolume - postVolume);
    const concreteVolume = concretePerPost * numberOfPosts;
    const bagYield = bagWeightPounds * BAG_YIELD_PER_LB;
    const bags = Math.ceil(concreteVolume / bagYield);
    const bagsPerTrip = vehiclePayloadPounds > 0 ? Math.floor(vehiclePayloadPounds / bagWeightPounds) : 0;
    const trips = bagsPerTrip > 0 ? Math.ceil(bags / bagsPerTrip) : 0;
    const requiredPostLength = heightFeet + (setDepth / 12);
    const stockLength = nextStockLength(requiredPostLength);
    const frostControls = frostDepth > structuralDepth;

    document.getElementById("fenceSetDepth").textContent = setDepth + " in";
    document.getElementById("fenceDepthRule").textContent = frostControls
      ? "6 in below the " + formatNumber(frostLineInches, 1) + " in frost line; dig " + (setDepth + 6) + " in including gravel"
      : "structural rule; dig " + (setDepth + 6) + " in including gravel";
    document.getElementById("fenceHoleDiameter").textContent = holeDiameter + " in";
    document.getElementById("fenceHoleRule").textContent = selectedPost.diameterRule;
    document.getElementById("fencePostLength").textContent = stockLength + " ft";
    document.getElementById("fenceConcreteVolume").textContent = concreteVolume.toFixed(2) + " ft\u00B3";
    document.getElementById("fenceConcreteBreakdown").textContent = numberOfPosts.toLocaleString() + (numberOfPosts === 1 ? " post \u00D7 " : " posts \u00D7 ") + concretePerPost.toFixed(2) + " ft\u00B3 each; post displacement subtracted";
    document.getElementById("fenceBagLabel").textContent = "# bags needed (" + formatNumber(bagWeightPounds, 2) + " lb)";
    document.getElementById("fenceBags").textContent = bags.toLocaleString();
    document.getElementById("fenceWeight").textContent = formatNumber(bags * bagWeightPounds, 2) + " lb / " + formatNumber(bags * bagWeightPounds * KG_PER_LB, 1) + " kg" + (vehiclePayloadPounds > 0
      ? " \u2022 " + bagsPerTrip.toLocaleString() + (bagsPerTrip === 1 ? " bag" : " bags") + " per trip \u2022 " + trips.toLocaleString() + (trips === 1 ? " trip" : " trips")
      : "");

    fenceEmpty.style.display = "none";
    fenceResults.style.display = "block";
    return true;
  }

  function selectFencePreset(item, buttonElement) {
    fenceHeight.value = item.heightFeet;
    postType.value = item.postType;
    frostLine.value = item.frostLineInches;
    fencePresetGroups.querySelectorAll(".preset-button").forEach(function (button) {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    });
    buttonElement.classList.add("active");
    buttonElement.setAttribute("aria-pressed", "true");
    resetFenceResults();
  }

  function renderFencePresets() {
    fencePresetData.forEach(function (item) {
      const buttonElement = document.createElement("button");
      buttonElement.type = "button";
      buttonElement.className = "preset-button";
      buttonElement.setAttribute("aria-pressed", "false");

      const nameElement = document.createElement("span");
      nameElement.className = "preset-name";
      nameElement.textContent = item.name;

      const dimensionsElement = document.createElement("span");
      dimensionsElement.className = "preset-dimensions";
      dimensionsElement.textContent = item.description;

      buttonElement.appendChild(nameElement);
      buttonElement.appendChild(dimensionsElement);
      buttonElement.addEventListener("click", function () {
        selectFencePreset(item, buttonElement);
      });
      fencePresetGroups.appendChild(buttonElement);
    });
  }

  depthSlider.addEventListener("input", function () {
    const value = Number.parseFloat(depthSlider.value);
    depthInput.value = value;
    depthValue.textContent = formatDepth(value);
    calculateSlab(false);
  });

  depthInput.addEventListener("input", function () {
    const value = Number.parseFloat(depthInput.value);
    if (Number.isFinite(value) && value > 0) {
      depthValue.textContent = formatDepth(value);
      depthSlider.value = Math.max(1, Math.min(12, value));
      calculateSlab(false);
    } else {
      resetSlabResults();
    }
  });

  slabButton.addEventListener("click", function () {
    calculateSlab(true);
  });

  ["length", "width"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", resetSlabResults);
  });

  [slabBagWeight, slabVehiclePayload].forEach(function (field) {
    field.addEventListener("input", resetSlabResults);
    field.addEventListener("change", resetSlabResults);
  });

  postCountSlider.addEventListener("input", function () {
    const value = Number.parseInt(postCountSlider.value, 10);
    postCount.value = value;
    postCountValue.textContent = value.toLocaleString() + (value === 1 ? " post" : " posts");
    resetFenceResults();
  });

  postCount.addEventListener("input", function () {
    const value = Number.parseFloat(postCount.value);
    if (Number.isInteger(value) && value >= 1) {
      postCountValue.textContent = value.toLocaleString() + (value === 1 ? " post" : " posts");
      postCountSlider.value = Math.max(1, Math.min(100, value));
    } else {
      postCountValue.textContent = "\u2014 posts";
    }
    resetFenceResults();
  });

  [fenceHeight, postType, frostLine, bagWeight, vehiclePayload].forEach(function (field) {
    field.addEventListener("input", resetFenceResults);
    field.addEventListener("change", resetFenceResults);
  });

  fenceButton.addEventListener("click", function () {
    calculateFence(true);
  });

  panels.slab.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && event.target.matches("input")) {
      calculateSlab(true);
    }
  });

  panels.fence.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && event.target.matches("input, select")) {
      calculateFence(true);
    }
  });

  renderSlabPresets();
  renderFencePresets();
  setActiveMode("slab", false);
})();
