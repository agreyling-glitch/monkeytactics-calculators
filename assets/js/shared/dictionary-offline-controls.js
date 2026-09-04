(() => {
  "use strict";
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5c2.7-.8 5.3-.3 8 1.4v14c-2.7-1.7-5.3-2.2-8-1.4zM20 4.5c-2.7-.8-5.3-.3-8 1.4v14c2.7-1.7 5.3-2.2 8-1.4z"></path><path d="M12 5.9v14"></path></svg>';

  function attachOfflineConfirmation(toggle, nativeProgress, toolName) {
    const dialog = document.createElement("dialog");
    dialog.className = "reference-offline-modal";
    dialog.innerHTML = `<div class="reference-offline-card"><header><div><span>OFFLINE ACCESS</span><h2>Enable Offline Mode?</h2></div></header><div class="reference-offline-body"><p>Download ${toolName} so its word searches and local definitions remain available without an internet connection.</p><dl><div><dt>Package</dt><dd>Complete solver · about 7 MB</dd></div><div><dt>Already downloaded</dt><dd>Existing cached files will be reused</dd></div><div><dt>Download required</dt><dd>Only missing or updated files</dd></div></dl><div class="reference-offline-warning"><strong>Unavailable while Offline Mode is enabled</strong><span>External dictionary links and related web guides</span></div><label class="reference-force-download"><input type="checkbox"> <span><strong>Download files again</strong><small>Ignore cached copies and download every file again.</small></span></label><div class="reference-download-progress" hidden><div><strong>Downloading…</strong><span>Preparing files</span></div><progress value="0" max="1"></progress></div></div><footer><button type="button" value="cancel">Cancel</button><button type="button" value="ok">OK</button></footer></div>`;
    document.body.append(dialog);
    const cancel = dialog.querySelector('[value="cancel"]');
    const ok = dialog.querySelector('[value="ok"]');
    const force = dialog.querySelector('input[type="checkbox"]');
    const progressWrap = dialog.querySelector(".reference-download-progress");
    const progress = progressWrap.querySelector("progress");
    const progressText = progressWrap.querySelector("span");
    let approved = false;
    toggle.addEventListener("click", (event) => {
      if (approved) { approved = false; return; }
      if (toggle.getAttribute("aria-checked") === "true") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dialog.showModal();
    }, true);
    cancel.addEventListener("click", () => dialog.close());
    ok.addEventListener("click", () => {
      approved = true;
      toggle.dataset.forceDownload = String(force.checked);
      progressWrap.hidden = false;
      cancel.disabled = true;
      ok.disabled = true;
      toggle.click();
    });
    if (nativeProgress) new MutationObserver(() => {
      progress.max = Number(nativeProgress.max) || 1;
      progress.value = Number(nativeProgress.value) || 0;
      progressText.textContent = `${progress.value} of ${progress.max} files`;
    }).observe(nativeProgress, { attributes: true, attributeFilter: ["value", "max"] });
    new MutationObserver(() => {
      if (toggle.getAttribute("aria-checked") !== "true" || !dialog.open) return;
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
    radios.forEach((radio) => { radio.checked = radio === standard; });
    selector.hidden = true;

    const controls = document.createElement("div");
    controls.className = "reference-word-controls";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "reference-dictionary-trigger";
    trigger.innerHTML = icon;
    trigger.title = "Dictionary selected: Standard (ENABLE)";
    trigger.setAttribute("aria-label", "Choose dictionary. Current: Standard (ENABLE)");

    const dialog = document.createElement("dialog");
    dialog.className = "reference-dictionary-modal";
    dialog.setAttribute("aria-labelledby", `reference-dictionary-title-${index}`);
    dialog.innerHTML = `<div class="reference-dictionary-card"><header><div><span>WORD LIST</span><h2 id="reference-dictionary-title-${index}">Choose A Dictionary</h2></div><button type="button" aria-label="Close dictionary selection">&times;</button></header><fieldset><legend>Dictionary options</legend><label class="is-selected"><span class="reference-flag" aria-hidden="true"><svg viewBox="0 0 28 18"><rect width="28" height="18" rx="1" fill="#fff"/><path fill="#c83b45" d="M0 0h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0z"/><path fill="#27477d" d="M0 0h12v10H0z"/></svg></span><span><strong>Standard</strong><small>ENABLE · Focused word-game vocabulary with fewer unusual results</small></span><span class="reference-check" aria-hidden="true">✓</span></label><label class="is-future" aria-disabled="true"><span class="reference-globe" aria-hidden="true">◎</span><span><strong>Expanded <em>Coming soon</em></strong><small>Standard plus regional, uncommon, historical, and specialist words from Wiktionary</small></span></label></fieldset></div>`;
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
      const future = document.createElement("div");
      future.className = "reference-offline-future";
      future.innerHTML = '<button type="button" class="offline-switch" role="switch" aria-checked="false" aria-label="Offline Mode, future capability" disabled><span class="offline-switch-track" aria-hidden="true"><span class="offline-switch-thumb"></span></span></button><strong>Offline Mode [Future]</strong>';
      controls.append(future);
    }
    selector.after(controls, dialog);
    standard.dispatchEvent(new Event("change", { bubbles: true }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".dictionary-selector").forEach(buildControls);
  });
})();
