import type { ChangeEvent, ReactNode } from "react";
import type { FormValues, QrType } from "../types";

interface Props {
  qrType: QrType;
  values: FormValues;
  error: string;
  onTypeChange: (type: QrType) => void;
  onValueChange: (key: string, value: string | boolean) => void;
}

const TYPES: Array<[QrType, string]> = [
  ["url", "URL"], ["text", "Text"], ["wifi", "Wi-Fi"], ["vcard", "vCard"],
  ["email", "Email"], ["sms", "SMS"], ["geo", "Geo"], ["calendar", "Calendar"],
  ["totp", "TOTP"], ["crypto", "Crypto"], ["social", "Social"],
];

export function SidebarContent({ qrType, values, error, onTypeChange, onValueChange }: Props) {
  const set = (key: string) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onValueChange(key, event.target.type === "checkbox" ? (event.target as HTMLInputElement).checked : event.target.value);
  };
  const value = (key: string) => String(values[key] ?? "");

  const contactPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return onValueChange("contactPhoto", "");
    if (file.size > 250_000) return onValueChange("contactPhoto", "");
    const reader = new FileReader();
    reader.onload = () => onValueChange("contactPhoto", String(reader.result));
    reader.readAsDataURL(file);
  };

  return <div className="qr-panel-content">
    <label className="qr-field">
      <span>QR type</span>
      <select value={qrType} onChange={(event) => onTypeChange(event.target.value as QrType)}>
        {TYPES.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
      </select>
    </label>

    <div className="qr-dynamic-form">{renderFields(qrType, values, value, set, contactPhoto)}</div>
    {error && <div className="qr-inline-error" role="alert">{error}</div>}
  </div>;
}

type Setter = (key: string) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

function renderFields(type: QrType, values: FormValues, value: (key: string) => string, set: Setter, contactPhoto: (event: ChangeEvent<HTMLInputElement>) => void) {
  switch (type) {
    case "url": return <Field label="Destination URL"><input type="url" value={value("url")} onChange={set("url")} placeholder="https://example.com" /></Field>;
    case "text": return <Field label="Plain text"><textarea rows={7} value={value("text")} onChange={set("text")} placeholder="Enter text to encode" /></Field>;
    case "wifi": return <>
      <Field label="Network name (SSID)"><input value={value("wifiSsid")} onChange={set("wifiSsid")} placeholder="Guest Wi-Fi" /></Field>
      <Field label="Password"><input type="password" value={value("wifiPassword")} onChange={set("wifiPassword")} /></Field>
      <div className="qr-field-row"><Field label="Encryption"><select value={value("wifiEncryption")} onChange={set("wifiEncryption")}><option>WPA</option><option>WEP</option><option value="NONE">Open</option></select></Field>
      <label className="qr-check"><input type="checkbox" checked={Boolean(values.wifiHidden)} onChange={set("wifiHidden")} /> Hidden network</label></div>
    </>;
    case "vcard": return <>
      <div className="qr-field-row"><Field label="Full name"><input value={value("contactName")} onChange={set("contactName")} /></Field><Field label="Company"><input value={value("contactCompany")} onChange={set("contactCompany")} /></Field></div>
      <div className="qr-field-row"><Field label="Phone"><input type="tel" value={value("contactPhone")} onChange={set("contactPhone")} /></Field><Field label="Email"><input type="email" value={value("contactEmail")} onChange={set("contactEmail")} /></Field></div>
      <Field label="Address"><input value={value("contactAddress")} onChange={set("contactAddress")} /></Field>
      <Field label="Website"><input type="url" value={value("contactWebsite")} onChange={set("contactWebsite")} /></Field>
      <Field label="Embedded photo"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={contactPhoto} /><small>Optional; keep below 250 KB. Large cards may exceed QR capacity.</small></Field>
    </>;
    case "email": return <>
      <Field label="Recipient"><input type="email" value={value("emailAddress")} onChange={set("emailAddress")} /></Field>
      <Field label="Subject"><input value={value("emailSubject")} onChange={set("emailSubject")} /></Field>
      <Field label="Message"><textarea rows={5} value={value("emailBody")} onChange={set("emailBody")} /></Field>
    </>;
    case "sms": return <><Field label="Phone number"><input type="tel" value={value("smsPhone")} onChange={set("smsPhone")} /></Field><Field label="Message"><textarea rows={5} value={value("smsMessage")} onChange={set("smsMessage")} /></Field></>;
    case "geo": return <div className="qr-field-row"><Field label="Latitude"><input type="number" step="any" value={value("latitude")} onChange={set("latitude")} placeholder="44.9537" /></Field><Field label="Longitude"><input type="number" step="any" value={value("longitude")} onChange={set("longitude")} placeholder="-93.0900" /></Field></div>;
    case "calendar": return <>
      <Field label="Event title"><input value={value("eventTitle")} onChange={set("eventTitle")} /></Field>
      <div className="qr-field-row"><Field label="Starts"><input type="datetime-local" value={value("eventStart")} onChange={set("eventStart")} /></Field><Field label="Ends"><input type="datetime-local" value={value("eventEnd")} onChange={set("eventEnd")} /></Field></div>
      <Field label="Location"><input value={value("eventLocation")} onChange={set("eventLocation")} /></Field>
      <Field label="Description"><textarea rows={4} value={value("eventDescription")} onChange={set("eventDescription")} /></Field>
    </>;
    case "totp": return <>
      <div className="qr-security-note">TOTP secrets are sensitive. Processing stays inside this browser.</div>
      <div className="qr-field-row"><Field label="Issuer"><input value={value("totpIssuer")} onChange={set("totpIssuer")} placeholder="MonkeyTactics" /></Field><Field label="Account"><input value={value("totpAccount")} onChange={set("totpAccount")} placeholder="name@example.com" /></Field></div>
      <Field label="Base32 secret"><input type="password" value={value("totpSecret")} onChange={set("totpSecret")} /></Field>
      <div className="qr-field-row"><Field label="Algorithm"><select value={value("totpAlgorithm")} onChange={set("totpAlgorithm")}><option>SHA1</option><option>SHA256</option><option>SHA512</option></select></Field><Field label="Digits"><select value={value("totpDigits")} onChange={set("totpDigits")}><option>6</option><option>8</option></select></Field><Field label="Period"><select value={value("totpPeriod")} onChange={set("totpPeriod")}><option>30</option><option>60</option></select></Field></div>
    </>;
    case "crypto": return <>
      <Field label="Network"><select value={value("cryptoNetwork")} onChange={set("cryptoNetwork")}><option value="bitcoin">Bitcoin</option><option value="ethereum">Ethereum</option><option value="solana">Solana</option><option value="litecoin">Litecoin</option></select></Field>
      <Field label="Wallet address"><input value={value("cryptoAddress")} onChange={set("cryptoAddress")} /></Field>
      <div className="qr-field-row"><Field label="Amount"><input inputMode="decimal" value={value("cryptoAmount")} onChange={set("cryptoAmount")} /></Field><Field label="Label"><input value={value("cryptoLabel")} onChange={set("cryptoLabel")} /></Field></div>
    </>;
    case "social": return <>
      <Field label="Platform"><select value={value("socialPlatform")} onChange={set("socialPlatform")}><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="messenger">Messenger</option><option value="instagram">Instagram</option><option value="x">X</option><option value="linkedin">LinkedIn</option></select></Field>
      <Field label={value("socialPlatform") === "whatsapp" ? "Phone with country code" : "Username"}><input value={value("socialIdentity")} onChange={set("socialIdentity")} /></Field>
    </>;
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="qr-field"><span>{label}</span>{children}</label>;
}
