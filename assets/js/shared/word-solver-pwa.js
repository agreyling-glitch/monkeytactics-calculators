/* Installation is independent of the optional complete offline download. */
(() => {
  "use strict";
  const button = document.querySelector("#solver-install");
  const status = document.querySelector("#solver-install-status");
  if (!button || !status) return;
  let installPrompt;
  const installed = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const showInstalled = () => {
    button.hidden = true;
    status.textContent = "For offline searches, enable Offline Mode in the solver.";
  };
  if (installed()) showInstalled();
  else if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    status.textContent = "To install, open Safari’s Share menu and choose Add to Home Screen. For offline searches, enable Offline Mode in the solver.";
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    if (!installed()) button.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = undefined;
    showInstalled();
  });
  button.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = undefined;
    button.hidden = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") showInstalled();
    } catch (error) {
      console.warn("App installation was unavailable:", error);
    }
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/crossword-offline-sw.js", { scope: "/" })
      .catch((error) => console.warn("App service worker registration failed:", error));
  }
})();
