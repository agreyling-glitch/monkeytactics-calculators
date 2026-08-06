import type { FormValues, QrType } from "../types";

const text = (values: FormValues, key: string) => String(values[key] ?? "").trim();
const requireValue = (value: string, message: string) => { if (!value) throw new Error(message); return value; };
const phone = (value: string) => {
  const normalized = `${value.trim().startsWith("+") ? "+" : ""}${value.replace(/\D/g, "")}`;
  if (normalized.replace(/\D/g, "").length < 3) throw new Error("Enter a valid phone number");
  return normalized;
};
const email = (value: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address");
  return value;
};
const webUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error();
    return parsed.href;
  } catch { throw new Error("Enter a complete URL beginning with http:// or https://"); }
};

export function buildPayload(type: QrType, values: FormValues): string {
  switch (type) {
    case "url": return webUrl(requireValue(text(values, "url"), "URL is required"));
    case "text": return requireValue(text(values, "text"), "Text is required");
    case "wifi": return buildWifi(values);
    case "vcard": return buildVCard(values);
    case "email": return buildEmail(values);
    case "sms": return buildSms(values);
    case "geo": return buildGeo(values);
    case "calendar": return buildCalendar(values);
    case "totp": return buildTotp(values);
    case "crypto": return buildCrypto(values);
    case "social": return buildSocial(values);
  }
}

function buildWifi(values: FormValues): string {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/([;,:"])/g, "\\$1");
  const ssid = requireValue(text(values, "wifiSsid"), "Wi-Fi network name is required");
  const encryption = text(values, "wifiEncryption") || "WPA";
  const password = text(values, "wifiPassword");
  return `WIFI:T:${encryption === "NONE" ? "nopass" : encryption};S:${escape(ssid)};P:${escape(password)};H:${Boolean(values.wifiHidden)};;`;
}

function buildVCard(values: FormValues): string {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([;,])/g, "\\$1");
  const name = requireValue(text(values, "contactName"), "Contact name is required");
  const website = text(values, "contactWebsite");
  const contactEmail = text(values, "contactEmail");
  return [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `FN:${escape(name)}`,
    text(values, "contactCompany") && `ORG:${escape(text(values, "contactCompany"))}`,
    text(values, "contactPhone") && `TEL;TYPE=cell;VALUE=uri:tel:${phone(text(values, "contactPhone"))}`,
    contactEmail && `EMAIL:${email(contactEmail)}`,
    text(values, "contactAddress") && `ADR;TYPE=home:;;${escape(text(values, "contactAddress"))};;;;`,
    website && `URL:${webUrl(website)}`,
    text(values, "contactPhoto") && `PHOTO:${text(values, "contactPhoto")}`,
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}

function buildEmail(values: FormValues): string {
  const address = email(requireValue(text(values, "emailAddress"), "Recipient email is required"));
  const query = new URLSearchParams();
  if (text(values, "emailSubject")) query.set("subject", text(values, "emailSubject"));
  if (text(values, "emailBody")) query.set("body", text(values, "emailBody"));
  return `mailto:${address}${query.size ? `?${query.toString()}` : ""}`;
}

function buildSms(values: FormValues): string {
  const number = phone(requireValue(text(values, "smsPhone"), "SMS phone number is required"));
  const message = text(values, "smsMessage");
  return `sms:${number}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
}

function buildGeo(values: FormValues): string {
  const latitude = Number(requireValue(text(values, "latitude"), "Latitude is required"));
  const longitude = Number(requireValue(text(values, "longitude"), "Longitude is required"));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("Latitude must be between -90 and 90");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Longitude must be between -180 and 180");
  return `geo:${latitude},${longitude}`;
}

function buildCalendar(values: FormValues): string {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([;,])/g, "\\$1");
  const title = requireValue(text(values, "eventTitle"), "Event title is required");
  const start = requireValue(text(values, "eventStart"), "Event start is required");
  const end = requireValue(text(values, "eventEnd"), "Event end is required");
  if (new Date(end) <= new Date(start)) throw new Error("Event end must be after its start");
  const format = (value: string) => value.replace(/[-:]/g, "") + (value.length === 16 ? "00" : "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MonkeyTactics//QR Studio//EN", "BEGIN:VEVENT",
    `SUMMARY:${escape(title)}`, `DTSTART:${format(start)}`, `DTEND:${format(end)}`,
    text(values, "eventLocation") && `LOCATION:${escape(text(values, "eventLocation"))}`,
    text(values, "eventDescription") && `DESCRIPTION:${escape(text(values, "eventDescription"))}`,
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function buildTotp(values: FormValues): string {
  const secret = requireValue(text(values, "totpSecret").replace(/[\s-]/g, "").toUpperCase(), "TOTP secret is required");
  if (!/^[A-Z2-7]+=*$/.test(secret)) throw new Error("TOTP secret must use Base32 characters A-Z and 2-7");
  const account = requireValue(text(values, "totpAccount"), "Account name is required");
  const issuer = text(values, "totpIssuer");
  const params = new URLSearchParams({ secret });
  if (issuer) params.set("issuer", issuer);
  params.set("algorithm", text(values, "totpAlgorithm") || "SHA1");
  params.set("digits", text(values, "totpDigits") || "6");
  params.set("period", text(values, "totpPeriod") || "30");
  return `otpauth://totp/${encodeURIComponent(issuer ? `${issuer}:${account}` : account)}?${params.toString()}`;
}

function buildCrypto(values: FormValues): string {
  const network = text(values, "cryptoNetwork") || "bitcoin";
  const address = requireValue(text(values, "cryptoAddress"), "Wallet address is required");
  const params = new URLSearchParams();
  if (text(values, "cryptoAmount")) params.set("amount", text(values, "cryptoAmount"));
  if (text(values, "cryptoLabel")) params.set("label", text(values, "cryptoLabel"));
  return `${network}:${address}${params.size ? `?${params.toString()}` : ""}`;
}

function buildSocial(values: FormValues): string {
  const platform = text(values, "socialPlatform") || "whatsapp";
  const identity = requireValue(text(values, "socialIdentity").replace(/^@/, ""), "Phone number or username is required");
  if (platform === "whatsapp") return `https://wa.me/${identity.replace(/\D/g, "")}`;
  if (!/^[a-zA-Z0-9_.-]+$/.test(identity)) throw new Error("Username contains unsupported characters");
  if (platform === "telegram") return `https://t.me/${identity}`;
  if (platform === "messenger") return `https://m.me/${identity}`;
  if (platform === "instagram") return `https://instagram.com/${identity}`;
  if (platform === "x") return `https://x.com/${identity}`;
  if (platform === "linkedin") return `https://linkedin.com/in/${identity}`;
  throw new Error("Choose a supported social profile");
}

export const INITIAL_VALUES: FormValues = {
  url: "https://monkeytactics.com",
  text: "",
  wifiEncryption: "WPA",
  wifiHidden: false,
  totpAlgorithm: "SHA1",
  totpDigits: "6",
  totpPeriod: "30",
  cryptoNetwork: "bitcoin",
  socialPlatform: "whatsapp",
};
