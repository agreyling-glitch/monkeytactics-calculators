"use strict";

(function initializeFocusMode() {
  const targets = [...document.querySelectorAll("[data-focus-mode]")];
  if (!targets.length) return;

  let activeTarget = null;

  function setFocusMode(target, enabled) {
    const button = target.querySelector(":scope > .focus-mode-toggle");
    const label = target.dataset.focusModeLabel || "tool";
    target.classList.toggle("is-focus-mode", enabled);
    document.body.classList.toggle("focus-mode-open", enabled);
    activeTarget = enabled ? target : null;
    button.setAttribute("aria-expanded", String(enabled));
    button.setAttribute("aria-label", `${enabled ? "Exit" : "Enter"} Focus Mode for ${label}`);
    button.title = enabled ? "Exit Focus Mode" : "Enter Focus Mode";
    button.focus();
  }

  targets.forEach((target) => {
    const label = target.dataset.focusModeLabel || "tool";
    const button = document.createElement("button");
    button.className = "focus-mode-toggle";
    button.type = "button";
    button.setAttribute("aria-label", `Enter Focus Mode for ${label}`);
    button.setAttribute("aria-expanded", "false");
    button.title = "Enter Focus Mode";
    button.innerHTML = '<svg class="focus-mode-expand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg><svg class="focus-mode-collapse-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"/></svg>';
    button.addEventListener("click", () => setFocusMode(target, !target.classList.contains("is-focus-mode")));
    target.prepend(button);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !activeTarget) return;
    event.preventDefault();
    setFocusMode(activeTarget, false);
  });
})();
