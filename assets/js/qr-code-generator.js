/* ========================================================================
   MonkeyTactics.com — QR Code Generator logic
   Client-side QR generation using the qrcode.js library.
   ======================================================================== */

export function buildWifiPayload(options = {}) {
  const ssid = String(options.ssid || "").trim();
  const password = String(options.password || "").trim();
  const encryption = String(options.encryption || "WPA").toUpperCase();
  const hidden = Boolean(options.hidden);

  if (!ssid) {
    throw new Error("Wi-Fi SSID is required");
  }

  const escapedSsid = escapeWifiValue(ssid);
  const escapedPassword = escapeWifiValue(password);
  const networkType = encryption === "NONE" ? "nopass" : encryption;
  const parts = [`S:${escapedSsid}`, `T:${networkType}`, `P:${escapedPassword}`, `H:${hidden ? "true" : "false"}`];

  return `WIFI:${parts.join(";")};`;
}

export function createPayload(contentType, rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    throw new Error("Please enter a value to encode");
  }

  if (contentType === "wifi") {
    return value;
  }

  return value;
}

export function getContentLabel(contentType) {
  if (contentType === "wifi") return "Wi-Fi network";
  return "URL or text";
}

export function initQrCodeGenerator(root = document) {
  if (typeof window === "undefined" || !root?.getElementById) {
    return;
  }

  const contentTypeSelect = root.getElementById("content-type");
  const urlGroup = root.getElementById("url-group");
  const wifiGroup = root.getElementById("wifi-group");
  const contentInput = root.getElementById("content-input");
  const wifiSsidInput = root.getElementById("wifi-ssid");
  const wifiPasswordInput = root.getElementById("wifi-password");
  const wifiEncryptionSelect = root.getElementById("wifi-encryption");
  const wifiHiddenInput = root.getElementById("wifi-hidden");
  const previewOutput = root.getElementById("qr-output");
  const previewMessage = root.getElementById("qr-preview-message");
  const generateBtn = root.getElementById("generate-btn");
  const downloadPngBtn = root.getElementById("download-png-btn");
  const downloadSvgBtn = root.getElementById("download-svg-btn");

  if (!contentTypeSelect || !contentInput || !previewOutput || !generateBtn) {
    return;
  }

  const setActivePanel = () => {
    const isWifi = contentTypeSelect.value === "wifi";
    urlGroup.hidden = isWifi;
    wifiGroup.hidden = !isWifi;
  };

  const getPayload = () => {
    if (contentTypeSelect.value === "wifi") {
      return buildWifiPayload({
        ssid: wifiSsidInput?.value || "",
        password: wifiPasswordInput?.value || "",
        encryption: wifiEncryptionSelect?.value || "WPA",
        hidden: wifiHiddenInput?.checked || false,
      });
    }

    return createPayload("text", contentInput?.value || "");
  };

  const setPreviewMessage = (message) => {
    if (previewMessage) {
      previewMessage.textContent = message;
    }
  };

  const renderQrCode = async (format = "canvas") => {
    const payload = getPayload();
    if (!payload) {
      return;
    }

    const options = { width: 280, margin: 1, color: { dark: "#16a34a", light: "#ffffff" } };
    previewOutput.style.display = "block";

    if (!window.QRCode) {
      setPreviewMessage("QR library failed to load. Please refresh the page and try again.");
      return;
    }

    try {
      if (format === "svg") {
        const svg = await qrToStringAsync(payload, { ...options, type: "svg" });
        previewOutput.innerHTML = svg;
        previewOutput.style.display = "block";
        setPreviewMessage("SVG preview ready");
        return svg;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 280;
      canvas.height = 280;
      await qrToCanvasAsync(canvas, payload, options);
      previewOutput.innerHTML = "";
      previewOutput.appendChild(canvas);
      previewOutput.style.display = "block";
      setPreviewMessage("QR code generated");
      return canvas;
    } catch (error) {
      setPreviewMessage(error?.message || "Unable to generate the QR code right now.");
      throw error;
    }
  };

  const downloadFile = (blob, filename) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const downloadPng = async () => {
    const payload = getPayload();
    if (!payload) return;
    const dataUrl = await qrToDataUrlAsync(payload, { width: 1200, margin: 2, color: { dark: "#16a34a", light: "#ffffff" } });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qrcode-${Date.now()}.png`;
    link.click();
  };

  const downloadSvg = async () => {
    const payload = getPayload();
    if (!payload) return;
    const svg = await qrToStringAsync(payload, { width: 1200, margin: 2, type: "svg", color: { dark: "#16a34a", light: "#ffffff" } });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    downloadFile(blob, `qrcode-${Date.now()}.svg`);
  };

  contentTypeSelect.addEventListener("change", () => {
    setActivePanel();
    renderQrCode();
  });

  [contentInput, wifiSsidInput, wifiPasswordInput, wifiEncryptionSelect, wifiHiddenInput].forEach((element) => {
    if (element) {
      element.addEventListener("input", () => renderQrCode());
      element.addEventListener("change", () => renderQrCode());
    }
  });

  generateBtn.addEventListener("click", () => renderQrCode());
  downloadPngBtn?.addEventListener("click", () => downloadPng());
  downloadSvgBtn?.addEventListener("click", () => downloadSvg());

  setActivePanel();
  setPreviewMessage("Enter content and generate your QR code.");
  renderQrCode();
}

function escapeWifiValue(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/"/g, '\\"');
}

function qrToCanvasAsync(canvas, text, options) {
  return new Promise((resolve, reject) => {
    window.QRCode.toCanvas(canvas, text, options, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function qrToDataUrlAsync(text, options) {
  return new Promise((resolve, reject) => {
    window.QRCode.toDataURL(text, options, (error, dataUrl) => {
      if (error) reject(error);
      else resolve(dataUrl);
    });
  });
}

function qrToStringAsync(text, options) {
  return new Promise((resolve, reject) => {
    window.QRCode.toString(text, options, (error, svg) => {
      if (error) reject(error);
      else resolve(svg);
    });
  });
}
