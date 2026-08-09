/*
 * Central ad configuration for MonkeyTactics.
 *
 * Update this file when the publisher ID, enabled state, or display-slot IDs
 * change. Pages only need an .ad-container placeholder and this script.
 */
(function () {
  "use strict";

  const ADSENSE_CLIENT_ID = "ca-pub-0000000000000000";
  const ADS_ENABLED = false;

  // Add the corresponding AdSense display-slot IDs when they are available.
  const AD_SLOT_IDS = {
    top: "",
    mid: "",
    bottom: ""
  };

  const SCRIPT_ID = "monkeytactics-adsense-script";
  const INITIALIZED = "data-ad-initialized";
  const isConfigured = () => ADS_ENABLED && !/0000000000000000/.test(ADSENSE_CLIENT_ID);
  document.documentElement.dataset.adsEnabled = String(isConfigured());

  function placementFor(container, index) {
    const text = container.textContent.toLowerCase();
    if (text.includes("mid")) return "mid";
    if (text.includes("bottom")) return "bottom";
    if (text.includes("top")) return "top";
    return index === 0 ? "top" : "bottom";
  }

  function addPlaceholderLabel(container) {
    if (!container.querySelector(".ad-slot__label")) {
      const label = document.createElement("span");
      label.className = "ad-slot__label";
      label.textContent = "Advertisement";
      container.appendChild(label);
    }
  }

  function createAdElement(container, placement) {
    const slotId = AD_SLOT_IDS[placement];
    if (!slotId) {
      addPlaceholderLabel(container);
      return null;
    }

    container.replaceChildren();
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = ADSENSE_CLIENT_ID;
    ad.dataset.adSlot = slotId;
    ad.dataset.adFormat = "auto";
    ad.dataset.fullWidthResponsive = "true";
    container.appendChild(ad);
    return ad;
  }

  function initializeSlots() {
    const containers = document.querySelectorAll(".ad-container");
    containers.forEach((container, index) => {
      let ad = container.querySelector(".adsbygoogle");
      if (!ad) ad = createAdElement(container, placementFor(container, index));
      if (!ad || ad.hasAttribute(INITIALIZED)) return;

      // The client ID is owned here even if a future page supplies its own slot.
      ad.dataset.adClient = ADSENSE_CLIENT_ID;
      ad.setAttribute(INITIALIZED, "");
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }

  function loadAds() {
    if (!isConfigured()) {
      document.querySelectorAll(".ad-container").forEach(addPlaceholderLabel);
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      initializeSlots();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT_ID);
    script.crossOrigin = "anonymous";
    script.addEventListener("load", initializeSlots, { once: true });
    document.head.appendChild(script);
  }

  window.MonkeyTacticsAds = { loadAds, ADSENSE_CLIENT_ID, ADS_ENABLED, AD_SLOT_IDS };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadAds, { once: true });
  } else {
    loadAds();
  }
})();
