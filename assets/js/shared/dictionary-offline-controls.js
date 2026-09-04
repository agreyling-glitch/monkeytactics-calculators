(() => {
  "use strict";
  const standardIcon = `<svg class="reference-active-flag" viewBox="0 0 28 18" aria-hidden="true"><rect width="28" height="18" rx="1" fill="#fff"/><path fill="#c83b45" d="M0 0h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0z"/><path fill="#27477d" d="M0 0h12v10H0z"/><path fill="#fff" d="m2 2 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zM4 6l.4 1.1h1.2l-1 .7L5 8.9l-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7L9 8.9l-1-.7-1 .7.4-1.1-1-.7h1.2z"/></svg>`;
  const choiceIcon = (name) => name === "Standard" ? standardIcon : `<span class="reference-active-symbol" aria-hidden="true">${name === "Expanded" ? "◎" : "⊕"}</span>`;
  const GENERIC_OFFLINE_VERSION = "20260904-wiktionary-2";
  const sizeActiveChoiceIcon = (trigger) => {
    const flag = trigger.querySelector(".reference-active-flag");
    if (flag) flag.style.cssText = "width:1.6rem;height:auto;fill:initial;stroke:none";
    const symbol = trigger.querySelector(".reference-active-symbol");
    if (symbol) symbol.style.cssText = "font-size:1.55rem;font-weight:700;line-height:1";
  };
  const GENERIC_CACHE_PREFIX = "monkeytactics-word-tool-offline-";
  const WORD_MANIFEST_URL = "/assets/data/words/manifest.wiktionary-v1.json";
  const WORD_CHUNK_BASE_URL = "/assets/data/words/";

  async function fetchJsonForOffline(cache, url) {
    const cached = await cache.match(url) || await caches.match(url);
    if (cached) return cached.json();
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Offline manifest could not be loaded: ${url}`);
    await cache.put(url, response.clone());
    return response.json();
  }

  async function cacheGenericOfflineUrl(cache, url, forceDownload) {
    const request = new Request(url, { credentials: "same-origin" });
    if (!forceDownload) {
      if (await cache.match(request)) return false;
      const shared = await caches.match(request);
      if (shared) {
        await cache.put(request, shared.clone());
        return false;
      }
    }
    const response = await fetch(new Request(url, { cache: "reload", credentials: "same-origin" }));
    if (!response.ok) throw new Error(`Offline download failed for ${url}`);
    await cache.put(request, response);
    return true;
  }

  async function buildGenericOfflineUrls(cache) {
    const manifest = await fetchJsonForOffline(cache, WORD_MANIFEST_URL);
    const pageAssets = [...document.querySelectorAll("script[src], link[href]")]
      .map((element) => element.src || element.href)
      .filter((url) => url && new URL(url, location.href).origin === location.origin);
    return [...new Set([
      location.pathname,
      "/crossword-offline-sw.js",
      ...pageAssets,
      "/assets/wasm/menu/menu.css?v=20260828-menu-manifest-v1",
      "/assets/wasm/menu/menu_bg.wasm?v=20260828-menu-manifest-v1",
      "/assets/wasm/menu/tools-manifest.json",
      "/assets/wasm/word-unscrambler/word_unscrambler_engine.js?v=20260827-wwf-1",
      "/assets/wasm/word-unscrambler/word_unscrambler_engine_bg.wasm?v=20260827-wwf-1",
      WORD_MANIFEST_URL,
      ...Object.values(manifest.chunks || {}).map(({ file }) => `${WORD_CHUNK_BASE_URL}${file}`)
    ])];
  }

  function attachGenericOfflineCapability(toggle, progress, status, toolId) {
    const storageKey = `monkeytactics.${toolId}.offline-cache`;
    const cacheName = `${GENERIC_CACHE_PREFIX}${toolId}-${GENERIC_OFFLINE_VERSION}`;
    let enabled = false;
    try { enabled = localStorage.getItem(storageKey) === cacheName; } catch (_error) { /* Storage may be unavailable. */ }
    const render = (message = "") => {
      toggle.setAttribute("aria-checked", String(enabled));
      toggle.title = enabled ? "Disable Offline Mode" : "Enable Offline Mode";
      status.textContent = message || `Offline Mode [${enabled ? "Enabled" : "Disabled"}]`;
    };
    render();

    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try {
        if (enabled) {
          localStorage.removeItem(storageKey);
          enabled = false;
          render();
          return;
        }
        if (!("serviceWorker" in navigator) || !("caches" in window)) throw new Error("Offline Mode is not supported by this browser.");
        await navigator.serviceWorker.register("/crossword-offline-sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const cache = await caches.open(cacheName);
        const urls = await buildGenericOfflineUrls(cache);
        const forceDownload = toggle.dataset.forceDownload === "true";
        delete toggle.dataset.forceDownload;
        progress.max = urls.length;
        progress.value = 0;
        progress.dataset.downloaded = "0";
        progress.dataset.reused = "0";
        let cursor = 0;
        let completed = 0;
        let downloaded = 0;
        const workers = Array.from({ length: Math.min(4, urls.length) }, async () => {
          while (cursor < urls.length) {
            if (await cacheGenericOfflineUrl(cache, urls[cursor++], forceDownload)) downloaded += 1;
            progress.value = ++completed;
            progress.dataset.downloaded = String(downloaded);
            progress.dataset.reused = String(completed - downloaded);
          }
        });
        await Promise.all(workers);
        const page = await cache.match(location.pathname);
        const missing = (await Promise.all(urls.map((url) => cache.match(url)))).filter((response) => !response);
        if (!page || missing.length) throw new Error("The offline package could not be verified.");
        await cache.put(`/tools/${toolId}`, page.clone());
        await cache.put(`/tools/${toolId}.html`, page.clone());
        localStorage.setItem(storageKey, cacheName);
        for (const name of await caches.keys()) {
          if (name.startsWith(`${GENERIC_CACHE_PREFIX}${toolId}-`) && name !== cacheName) await caches.delete(name);
        }
        enabled = true;
        try { await navigator.storage?.persist?.(); } catch (_error) { /* Persistence is optional. */ }
        render();
      } catch (error) {
        console.error("Unable to change Offline Mode:", error);
        status.textContent = "Offline Mode could not be changed. Check your connection and available storage.";
      } finally {
        delete toggle.dataset.forceDownload;
        toggle.disabled = false;
      }
    });

    if (enabled && "caches" in window) caches.has(cacheName).then((available) => {
      if (available) return;
      try { localStorage.removeItem(storageKey); } catch (_error) { /* Storage may be unavailable. */ }
      enabled = false;
      render();
    });
  }

  function attachOfflineConfirmation(toggle, nativeProgress, toolName) {
    const dialog = document.createElement("dialog");
    dialog.className = "reference-offline-modal";
    dialog.innerHTML = `<div class="reference-offline-card"><header><div><span>OFFLINE ACCESS</span><h2>Enable Offline Mode?</h2></div></header><div class="reference-offline-body"><p>Download the complete ${toolName} so word searches and local definitions remain available without an internet connection.</p><dl aria-live="polite"><div><dt>Package</dt><dd>Complete solver · about 7 MB</dd></div><div><dt>Already downloaded</dt><dd>Existing cached files will be reused</dd></div><div><dt>Download required</dt><dd>Only missing or updated files</dd></div></dl><section class="reference-offline-warning"><h3>While Offline Mode is enabled</h3><ul><li>External word-definition lookups are disabled.</li><li>External dictionary links are hidden.</li><li>Related online guides are hidden.</li></ul></section><label class="reference-force-download"><input type="checkbox" role="switch"><span class="reference-force-track" aria-hidden="true"><span></span></span><span><strong>Download files again</strong><small>Ignore saved copies and replace every Offline Mode file with a fresh download.</small></span></label><div class="reference-download-progress" hidden><div><strong>Downloading files</strong><span>Preparing files</span></div><progress value="0" max="1"></progress></div><p class="reference-offline-message" role="status" aria-live="polite"></p></div><footer><button type="button" value="cancel">Cancel</button><button type="button" value="ok">OK</button></footer></div>`;
    document.body.append(dialog);
    const cancel = dialog.querySelector('[value="cancel"]');
    const ok = dialog.querySelector('[value="ok"]');
    const force = dialog.querySelector('input[type="checkbox"]');
    const progressWrap = dialog.querySelector(".reference-download-progress");
    const progressHeading = progressWrap.querySelector("strong");
    const progress = progressWrap.querySelector("progress");
    const progressText = progressWrap.querySelector("span");
    const message = dialog.querySelector(".reference-offline-message");
    let approved = false;
    const resetDialog = () => {
      force.checked = false;
      force.disabled = false;
      progressWrap.hidden = true;
      progress.max = 1;
      progress.value = 0;
      progressHeading.textContent = "Checking files…";
      progressText.textContent = "Preparing files";
      message.textContent = "";
      cancel.disabled = false;
      cancel.textContent = "Cancel";
      ok.hidden = false;
      ok.disabled = false;
      ok.textContent = "OK";
    };
    toggle.addEventListener("click", (event) => {
      if (approved) { approved = false; return; }
      if (toggle.getAttribute("aria-checked") === "true") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      resetDialog();
      dialog.showModal();
    }, true);
    cancel.addEventListener("click", () => dialog.close());
    ok.addEventListener("click", () => {
      approved = true;
      toggle.dataset.forceDownload = String(force.checked);
      message.textContent = force.checked ? "Preparing download…" : "Checking saved files…";
      cancel.disabled = true;
      ok.disabled = true;
      toggle.click();
    });
    if (nativeProgress) new MutationObserver(() => {
      progress.max = Number(nativeProgress.max) || 1;
      progress.value = Number(nativeProgress.value) || 0;
      const downloaded = Number(nativeProgress.dataset.downloaded) || 0;
      const reused = Number(nativeProgress.dataset.reused) || 0;
      progressWrap.hidden = downloaded === 0;
      if (downloaded) message.textContent = "";
      progressHeading.textContent = downloaded ? "Downloading files…" : "Checking saved files…";
      progressText.textContent = downloaded
        ? `${downloaded} downloaded · ${reused} reused`
        : `${progress.value} of ${progress.max} files reused`;
    }).observe(nativeProgress, { attributes: true, attributeFilter: ["value", "max", "data-downloaded", "data-reused"] });
    new MutationObserver(() => {
      if (toggle.getAttribute("aria-checked") !== "true" || !dialog.open) return;
      if ((Number(progress.dataset.downloaded) || 0) === 0) {
        dialog.close();
        return;
      }
      progress.value = progress.max;
      progressText.textContent = "Download complete";
      cancel.disabled = false;
      cancel.textContent = "Close";
      ok.hidden = true;
    }).observe(toggle, { attributes: true, attributeFilter: ["aria-checked"] });
  }

  function buildControls(selector, index) {
    const radios = [...selector.querySelectorAll('input[name="dictionary"]')];
    const standard = radios.find((radio) => radio.value === "enable" || radio.value === "1") || radios[0];
    if (!standard) return;
    const initial = radios.find((radio) => radio.checked) || standard;
    initial.checked = true;
    selector.hidden = true;

    const controls = document.createElement("div");
    controls.className = "reference-word-controls";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "reference-dictionary-trigger";
    trigger.innerHTML = choiceIcon("Standard");
    sizeActiveChoiceIcon(trigger);
    const choices = [
      { values: ["enable", "1"], name: "Standard", detail: "ENABLE · Focused word-game vocabulary with fewer unusual results", icon: "reference-flag" },
      { values: ["expanded", "2"], name: "Expanded", detail: "Wiktionary · Regional, uncommon, historical, and specialist words", icon: "reference-globe" },
      { values: ["both", "3"], name: "Both", detail: "ENABLE + Wiktionary · The widest set of matches", icon: "reference-both" }
    ];

    const dialog = document.createElement("dialog");
    dialog.className = "reference-dictionary-modal";
    dialog.setAttribute("aria-labelledby", `reference-dictionary-title-${index}`);
    dialog.innerHTML = `<div class="reference-dictionary-card"><header><div><span>WORD LIST</span><h2 id="reference-dictionary-title-${index}">Choose A Dictionary</h2></div><button type="button" aria-label="Close dictionary selection">&times;</button></header><fieldset><legend>Dictionary options</legend>${choices.map((choice) => `<label data-values="${choice.values.join(",")}"><span class="${choice.icon}" aria-hidden="true">${choice.icon === "reference-flag" ? `<svg viewBox="0 0 28 18"><rect width="28" height="18" rx="1" fill="#fff"/><path fill="#c83b45" d="M0 0h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0z"/><path fill="#27477d" d="M0 0h12v10H0z"/><path fill="#fff" d="m2 2 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zM4 6l.4 1.1h1.2l-1 .7L5 8.9l-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7L9 8.9l-1-.7-1 .7.4-1.1-1-.7h1.2z"/></svg>` : choice.icon === "reference-globe" ? "◎" : "⊕"}</span><span><strong>${choice.name}</strong><small>${choice.detail}</small></span><span class="reference-check" aria-hidden="true">✓</span></label>`).join("")}</fieldset></div>`;
    const syncChoice = () => {
      const selected = radios.find((radio) => radio.checked) || standard;
      const choice = choices.find((item) => item.values.includes(selected.value)) || choices[0];
      dialog.querySelectorAll("[data-values]").forEach((label) => label.classList.toggle("is-selected", label.dataset.values.split(",").includes(selected.value)));
      trigger.title = `Dictionary selected: ${choice.name}`;
      trigger.setAttribute("aria-label", `Choose dictionary. Current: ${choice.name}`);
      trigger.innerHTML = choiceIcon(choice.name);
      sizeActiveChoiceIcon(trigger);
    };
    dialog.querySelectorAll("[data-values]").forEach((label) => label.addEventListener("click", () => {
      const radio = radios.find((item) => label.dataset.values.split(",").includes(item.value));
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      dialog.close();
    }));
    radios.forEach((radio) => radio.addEventListener("change", syncChoice));
    syncChoice();
    trigger.addEventListener("click", () => dialog.showModal());
    dialog.querySelector("header button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => trigger.focus());
    controls.append(trigger);

    const existingOffline = selector.parentElement?.querySelector(".word-tool-offline-control");
    if (existingOffline) {
      controls.append(existingOffline);
      existingOffline.classList.add("reference-real-offline");
      const toggle = existingOffline.querySelector('[role="switch"]');
      const copy = existingOffline.querySelector(".word-tool-offline-copy");
      const status = existingOffline.querySelector('[role="status"]');
      const heading = copy?.querySelector("strong");
      if (heading) heading.hidden = true;
      const syncLabel = () => {
        if (status && toggle) status.textContent = `Offline Mode [${toggle.getAttribute("aria-checked") === "true" ? "Enabled" : "Disabled"}]`;
      };
      syncLabel();
      if (toggle) new MutationObserver(syncLabel).observe(toggle, { attributes: true, attributeFilter: ["aria-checked"] });
      if (toggle) attachOfflineConfirmation(toggle, existingOffline.querySelector("progress"), document.title.split("|")[0].trim());
    }
    else {
      const offline = document.createElement("div");
      offline.className = "reference-generic-offline";
      offline.innerHTML = '<button type="button" class="offline-switch" role="switch" aria-checked="false" aria-label="Offline Mode"><span class="offline-switch-track" aria-hidden="true"><span class="offline-switch-thumb"></span></span></button><strong role="status">Offline Mode [Disabled]</strong><progress max="1" value="0" hidden></progress>';
      const toggle = offline.querySelector('[role="switch"]');
      const progress = offline.querySelector("progress");
      const status = offline.querySelector('[role="status"]');
      const toolId = location.pathname.split("/").filter(Boolean).pop()?.replace(/\.html$/, "") || `word-game-${index}`;
      controls.append(offline);
      attachGenericOfflineCapability(toggle, progress, status, toolId);
      attachOfflineConfirmation(toggle, progress, document.title.split("|")[0].trim());
    }
    selector.after(controls, dialog);
    standard.dispatchEvent(new Event("change", { bubbles: true }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".dictionary-selector").forEach(buildControls);
  });
})();
