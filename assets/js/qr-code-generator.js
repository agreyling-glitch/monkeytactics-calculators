/* ========================================================================
   MonkeyTactics.com - QR Code Generator logic
   Client-side QR generation using qrcode 1.1.0.
   ======================================================================== */

export function buildWifiPayload(options = {}) {
  const ssid = clean(options.ssid);
  const password = clean(options.password);
  const encryption = clean(options.encryption || "WPA").toUpperCase();
  const hidden = Boolean(options.hidden);

  required(ssid, "Wi-Fi SSID is required");
  const networkType = encryption === "NONE" ? "nopass" : encryption;
  return `WIFI:S:${escapeWifiValue(ssid)};T:${networkType};P:${escapeWifiValue(password)};H:${hidden ? "true" : "false"};;`;
}

export function buildContactPayload(options = {}) {
  const format = clean(options.format || "vcard").toLowerCase();
  const name = clean(options.name);
  const phone = clean(options.phone);
  const email = clean(options.email);
  const company = clean(options.company);
  const address = clean(options.address);
  const website = clean(options.website);
  const photoDataUrl = clean(options.photoDataUrl);

  required(name, "Contact name is required");
  if (email) validateEmail(email);
  if (website) validateWebUrl(website, "Enter a complete contact website beginning with http:// or https://");

  if (format === "mecard") {
    const properties = [
      `N:${escapeMeCard(name)}`,
      phone && `TEL:${escapeMeCard(normalizePhone(phone))}`,
      email && `EMAIL:${escapeMeCard(email)}`,
      company && `ORG:${escapeMeCard(company)}`,
      address && `ADR:${escapeMeCard(address)}`,
      website && `URL:${escapeMeCard(website)}`,
    ].filter(Boolean);
    return `MECARD:${properties.join(";")};;`;
  }

  const lines = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `FN:${escapeVCard(name)}`,
    company && `ORG:${escapeVCard(company)}`,
    phone && `TEL;TYPE=cell;VALUE=uri:tel:${normalizePhone(phone)}`,
    email && `EMAIL:${escapeVCard(email)}`,
    address && `ADR;TYPE=home:;;${escapeVCard(address)};;;;`,
    website && `URL:${website}`,
    photoDataUrl && `PHOTO:${photoDataUrl}`,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function buildEmailPayload(options = {}) {
  const address = clean(options.address);
  const subject = clean(options.subject);
  const body = String(options.body || "").trim();
  required(address, "Email address is required");
  validateEmail(address);
  const query = [];
  if (subject) query.push(`subject=${encodeURIComponent(subject)}`);
  if (body) query.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${address}${query.length ? `?${query.join("&")}` : ""}`;
}

export function buildSmsPayload(options = {}) {
  const phone = normalizePhone(options.phone);
  const message = String(options.message || "").trim();
  required(phone, "SMS phone number is required");
  return `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
}

export function buildPhonePayload(options = {}) {
  const phone = normalizePhone(options.phone);
  required(phone, "Phone number is required");
  return `tel:${phone}`;
}

export function buildGeoPayload(options = {}) {
  const latitude = parseCoordinate(options.latitude, "Latitude", -90, 90);
  const longitude = parseCoordinate(options.longitude, "Longitude", -180, 180);
  return `geo:${latitude},${longitude}`;
}

export function buildEventPayload(options = {}) {
  const title = clean(options.title);
  const start = clean(options.start);
  const end = clean(options.end);
  const location = clean(options.location);
  const description = String(options.description || "").trim();

  required(title, "Event title is required");
  required(start, "Event start date and time are required");
  required(end, "Event end date and time are required");
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Enter valid event start and end times");
  }
  if (endDate <= startDate) throw new Error("Event end time must be after the start time");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MonkeyTactics//QR Code Generator//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${escapeIcs(title)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    location && `LOCATION:${escapeIcs(location)}`,
    description && `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function buildSocialPayload(options = {}) {
  const platform = clean(options.platform).toLowerCase();
  const value = clean(options.value).replace(/^@/, "");
  required(value, platform === "whatsapp" ? "WhatsApp phone number is required" : "Username is required");

  if (platform === "whatsapp") {
    const number = value.replace(/\D/g, "");
    required(number, "Enter a valid WhatsApp phone number including country code");
    return `https://wa.me/${number}`;
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) throw new Error("Username contains unsupported characters");
  if (platform === "telegram") return `https://t.me/${value}`;
  if (platform === "messenger") return `https://m.me/${value}`;
  throw new Error("Choose a supported messaging platform");
}

export function createPayload(contentType, rawValue) {
  const value = clean(rawValue);
  required(value, "Please enter a value to encode");
  return value;
}

export function getContentLabel(contentType) {
  const labels = {
    wifi: "Wi-Fi network",
    contact: "contact card",
    email: "email",
    sms: "SMS message",
    phone: "phone call",
    geo: "location",
    event: "calendar event",
    social: "messaging link",
  };
  return labels[contentType] || "URL or text";
}

export function initQrCodeGenerator(root = document) {
  if (typeof window === "undefined" || !root?.getElementById) return;

  const byId = (id) => root.getElementById(id);
  const contentTypeSelect = byId("content-type");
  const panels = Array.from(root.querySelectorAll("[data-content-panel]"));
  const previewOutput = byId("qr-output");
  const previewMessage = byId("qr-preview-message");
  const previewCard = byId("previewCard");
  const resultsEmpty = byId("resultsEmpty");
  const errorBox = byId("calcError");
  const generateBtn = byId("generate-btn");
  const downloadPngBtn = byId("download-png-btn");
  const downloadSvgBtn = byId("download-svg-btn");
  const contactFormat = byId("contact-format");
  const contactPhotoGroup = byId("contact-photo-group");
  const contactPhotoInput = byId("contact-photo");
  const contactPhotoPreview = byId("contact-photo-preview");
  const contactPhotoStatus = byId("contact-photo-status");
  const socialPlatform = byId("social-platform");
  const socialValueLabel = byId("social-value-label");
  const socialValueInput = byId("social-value");

  if (!contentTypeSelect || !previewOutput || !generateBtn) return;

  let photoDataUrl = "";
  let renderTimer = 0;

  const value = (id) => byId(id)?.value || "";
  const checked = (id) => Boolean(byId(id)?.checked);

  const setError = (message = "") => {
    if (!errorBox) return;
    errorBox.textContent = message ? `Warning: ${message}` : "";
    errorBox.style.display = message ? "block" : "none";
  };

  const setPreviewMessage = (message) => {
    if (previewMessage) previewMessage.textContent = message;
  };

  const clearPreview = (message = "Complete the fields to generate your QR code.") => {
    previewOutput.innerHTML = "";
    if (previewCard) previewCard.style.display = "none";
    if (resultsEmpty) resultsEmpty.style.display = "flex";
    setPreviewMessage(message);
  };

  const syncContactFormat = () => {
    if (contactPhotoGroup) contactPhotoGroup.hidden = contactFormat?.value === "mecard";
  };

  const syncSocialFields = () => {
    const isWhatsApp = socialPlatform?.value === "whatsapp";
    if (socialValueLabel) socialValueLabel.textContent = isWhatsApp ? "Phone number" : "Username";
    if (socialValueInput) {
      socialValueInput.type = isWhatsApp ? "tel" : "text";
      socialValueInput.placeholder = isWhatsApp ? "+1 555 123 4567" : "username";
    }
  };

  const setActivePanel = () => {
    panels.forEach((panel) => { panel.hidden = panel.dataset.contentPanel !== contentTypeSelect.value; });
    syncContactFormat();
    syncSocialFields();
    setError();
    clearPreview();
  };

  const getPayload = () => {
    switch (contentTypeSelect.value) {
      case "wifi":
        return buildWifiPayload({ ssid: value("wifi-ssid"), password: value("wifi-password"), encryption: value("wifi-encryption"), hidden: checked("wifi-hidden") });
      case "contact":
        return buildContactPayload({ format: value("contact-format"), name: value("contact-name"), phone: value("contact-phone"), email: value("contact-email"), company: value("contact-company"), address: value("contact-address"), website: value("contact-website"), photoDataUrl });
      case "email":
        return buildEmailPayload({ address: value("email-address"), subject: value("email-subject"), body: value("email-body") });
      case "sms":
        return buildSmsPayload({ phone: value("sms-phone"), message: value("sms-message") });
      case "phone":
        return buildPhonePayload({ phone: value("call-phone") });
      case "geo":
        return buildGeoPayload({ latitude: value("geo-latitude"), longitude: value("geo-longitude") });
      case "event":
        return buildEventPayload({ title: value("event-title"), start: value("event-start"), end: value("event-end"), location: value("event-location"), description: value("event-description") });
      case "social":
        return buildSocialPayload({ platform: value("social-platform"), value: value("social-value") });
      default:
        return createPayload("text", value("content-input"));
    }
  };

  const renderQrCode = async (format = "canvas", showErrors = false) => {
    setError();
    let payload;
    try {
      payload = getPayload();
    } catch (error) {
      if (showErrors) setError(error.message);
      clearPreview(error.message);
      return null;
    }

    if (!window.QRCode) {
      setError("QR library failed to load. Refresh the page and try again.");
      return null;
    }

    const options = { width: 280, margin: 2, errorCorrectionLevel: "M", color: { dark: "#16a34a", light: "#ffffff" } };
    try {
      if (format === "svg") {
        const svg = await qrToStringAsync(payload, { ...options, type: "svg" });
        previewOutput.innerHTML = svg;
        revealPreview("SVG preview ready");
        return svg;
      }
      const canvas = document.createElement("canvas");
      await qrToCanvasAsync(canvas, payload, options);
      previewOutput.innerHTML = "";
      previewOutput.appendChild(canvas);
      revealPreview(`${getContentLabel(contentTypeSelect.value)} QR code generated`);
      return canvas;
    } catch (error) {
      const message = /too big|overflow|code length/i.test(error?.message || "")
        ? "This content is too large for one QR code. Shorten the text or remove the contact photo."
        : (error?.message || "Unable to generate the QR code right now.");
      setError(message);
      clearPreview(message);
      return null;
    }
  };

  const revealPreview = (message) => {
    if (resultsEmpty) resultsEmpty.style.display = "none";
    if (previewCard) previewCard.style.display = "block";
    setPreviewMessage(message);
  };

  const queueRender = () => {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => renderQrCode("canvas", false), 180);
  };

  const downloadFile = (blob, filename) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const downloadPng = async () => {
    try {
      const payload = getPayload();
      const dataUrl = await qrToDataUrlAsync(payload, { width: 1200, margin: 3, errorCorrectionLevel: "M", color: { dark: "#16a34a", light: "#ffffff" } });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${contentTypeSelect.value}-qrcode-${Date.now()}.png`;
      link.click();
    } catch (error) { setError(error.message || "Unable to download this QR code."); }
  };

  const downloadSvg = async () => {
    try {
      const payload = getPayload();
      const svg = await qrToStringAsync(payload, { width: 1200, margin: 3, type: "svg", errorCorrectionLevel: "M", color: { dark: "#16a34a", light: "#ffffff" } });
      downloadFile(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${contentTypeSelect.value}-qrcode-${Date.now()}.svg`);
    } catch (error) { setError(error.message || "Unable to download this QR code."); }
  };

  contentTypeSelect.addEventListener("change", setActivePanel);
  contactFormat?.addEventListener("change", () => { syncContactFormat(); queueRender(); });
  socialPlatform?.addEventListener("change", () => { syncSocialFields(); queueRender(); });
  root.querySelectorAll("[data-qr-input]").forEach((element) => {
    if (element === contactPhotoInput) return;
    element.addEventListener("input", queueRender);
    element.addEventListener("change", queueRender);
  });

  contactPhotoInput?.addEventListener("change", async () => {
    const file = contactPhotoInput.files?.[0];
    photoDataUrl = "";
    if (!file) {
      contactPhotoPreview?.removeAttribute("src");
      if (contactPhotoPreview) contactPhotoPreview.hidden = true;
      if (contactPhotoStatus) contactPhotoStatus.textContent = "Optional. A tiny optimized image will be embedded in vCard 4.0.";
      queueRender();
      return;
    }
    try {
      if (contactPhotoStatus) contactPhotoStatus.textContent = "Optimizing photo for QR capacity...";
      photoDataUrl = await optimizeContactPhoto(file);
      if (contactPhotoPreview) { contactPhotoPreview.src = photoDataUrl; contactPhotoPreview.hidden = false; }
      if (contactPhotoStatus) contactPhotoStatus.textContent = "Photo optimized and embedded. Remove it if the QR becomes too dense to scan.";
      queueRender();
    } catch (error) {
      contactPhotoInput.value = "";
      setError(error.message);
      if (contactPhotoStatus) contactPhotoStatus.textContent = "Choose a JPG, PNG, or WebP image.";
    }
  });

  generateBtn.addEventListener("click", () => renderQrCode("canvas", true));
  downloadPngBtn?.addEventListener("click", downloadPng);
  downloadSvgBtn?.addEventListener("click", downloadSvg);

  setActivePanel();
}

function clean(value) {
  return String(value || "").trim();
}

function required(value, message) {
  if (!value) throw new Error(message);
}

function validateEmail(value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address");
}

function validateWebUrl(value, message) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch (_) { throw new Error(message); }
}

function normalizePhone(value) {
  const raw = clean(value);
  const normalized = `${raw.startsWith("+") ? "+" : ""}${raw.replace(/\D/g, "")}`;
  if (normalized.replace(/\D/g, "").length < 3) throw new Error("Enter a valid phone number");
  return normalized;
}

function parseCoordinate(value, label, min, max) {
  const raw = clean(value);
  required(raw, `${label} is required`);
  const number = Number(raw);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${label} must be between ${min} and ${max}`);
  return String(number);
}

function formatIcsDate(value) {
  return clean(value).replace(/[-:]/g, "").replace("T", "T") + (clean(value).length === 16 ? "00" : "");
}

function escapeWifiValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/"/g, '\\"');
}

function escapeVCard(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function escapeMeCard(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/([;,:])/g, "\\$1").replace(/\r?\n/g, " ");
}

function escapeIcs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function optimizeContactPhoto(file) {
  if (!file.type?.startsWith("image/")) return Promise.reject(new Error("Contact photo must be an image file"));
  if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error("Contact photo must be smaller than 8 MB"));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The contact photo could not be read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The contact photo is not a supported image"));
      image.onload = () => {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size, size);
        const crop = Math.min(image.naturalWidth, image.naturalHeight);
        const sx = (image.naturalWidth - crop) / 2;
        const sy = (image.naturalHeight - crop) / 2;
        context.drawImage(image, sx, sy, crop, crop, 0, 0, size, size);
        const qualities = [0.55, 0.42, 0.3];
        let result = "";
        for (const quality of qualities) {
          result = canvas.toDataURL("image/jpeg", quality);
          if (result.length <= 1800) break;
        }
        if (result.length > 2200) reject(new Error("This photo cannot be compressed enough for a reliable QR code"));
        else resolve(result);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function qrToCanvasAsync(canvas, text, options) {
  return new Promise((resolve, reject) => window.QRCode.toCanvas(canvas, text, options, (error) => error ? reject(error) : resolve()));
}

function qrToDataUrlAsync(text, options) {
  return new Promise((resolve, reject) => window.QRCode.toDataURL(text, options, (error, dataUrl) => error ? reject(error) : resolve(dataUrl)));
}

function qrToStringAsync(text, options) {
  return new Promise((resolve, reject) => window.QRCode.toString(text, options, (error, svg) => error ? reject(error) : resolve(svg)));
}
