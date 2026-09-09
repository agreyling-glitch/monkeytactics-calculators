import test from "node:test";
import assert from "node:assert/strict";
import * as qr from "../apps/qr-studio/src/utils/payloadBuilders.ts";

test("builds escaped Wi-Fi payloads", () => {
  assert.equal(
    qr.buildPayload("wifi", { wifiSsid: "Home;5G", wifiPassword: "pass,word", wifiEncryption: "WPA", wifiHidden: true }),
    "WIFI:T:WPA;S:Home\\;5G;P:pass\\,word;H:true;;"
  );
});

test("builds a vCard 4.0 contact payload", () => {
  const photo = "data:image/jpeg;base64,abc123";
  const card = qr.buildPayload("vcard", {
    contactName: "Alex Morgan",
    contactPhone: "+1 (555) 123-4567",
    contactEmail: "alex@example.com",
    contactCompany: "Example, Inc.",
    contactAddress: "123 Main St; Saint Paul, MN",
    contactWebsite: "https://example.com",
    contactPhoto: photo,
  });
  assert.match(card, /^BEGIN:VCARD\r\nVERSION:4\.0/);
  assert.match(card, /TEL;TYPE=cell;VALUE=uri:tel:\+15551234567/);
  assert.match(card, /ORG:Example\\, Inc\./);
  assert.match(card, /PHOTO:data:image\/jpeg;base64,abc123/);
  assert.match(card, /END:VCARD$/);
});

test("builds email and SMS action payloads", () => {
  assert.equal(
    qr.buildPayload("email", { emailAddress: "someone@example.com", emailSubject: "Hello there", emailBody: "Line 1 & line 2" }),
    "mailto:someone@example.com?subject=Hello%20there&body=Line%201%20%26%20line%202"
  );
  assert.equal(qr.buildPayload("sms", { smsPhone: "+1 (555) 123-4567", smsMessage: "See you at 5" }), "sms:+15551234567?body=See%20you%20at%205");
});

test("builds geo and iCalendar event payloads", () => {
  assert.equal(qr.buildPayload("geo", { latitude: "44.9537", longitude: "-93.0900" }), "geo:44.9537,-93.09");
  const event = qr.buildPayload("calendar", {
    eventTitle: "Team, Meeting",
    eventStart: "2026-08-04T09:30",
    eventEnd: "2026-08-04T10:45",
    eventLocation: "Room A; West",
    eventDescription: "Review\nNext steps",
  });
  assert.match(event, /^BEGIN:VCALENDAR\r\nVERSION:2\.0/);
  assert.match(event, /SUMMARY:Team\\, Meeting/);
  assert.match(event, /DTSTART:20260804T093000/);
  assert.match(event, /DTEND:20260804T104500/);
  assert.match(event, /LOCATION:Room A\\; West/);
  assert.match(event, /DESCRIPTION:Review\\nNext steps/);
  assert.match(event, /END:VCALENDAR$/);
});

test("builds WhatsApp, Telegram, and Messenger deep links", () => {
  assert.equal(qr.buildPayload("social", { socialPlatform: "whatsapp", socialIdentity: "+1 (555) 123-4567" }), "https://wa.me/15551234567");
  assert.equal(qr.buildPayload("social", { socialPlatform: "telegram", socialIdentity: "@monkey_tactics" }), "https://t.me/monkey_tactics");
  assert.equal(qr.buildPayload("social", { socialPlatform: "messenger", socialIdentity: "monkey.tactics" }), "https://m.me/monkey.tactics");
});

test("rejects invalid required fields and ranges", () => {
  assert.throws(() => qr.buildPayload("vcard", {}), /Contact name/);
  assert.throws(() => qr.buildPayload("email", { emailAddress: "not-an-email" }), /valid email/);
  assert.throws(() => qr.buildPayload("geo", { latitude: "91", longitude: "0" }), /Latitude/);
  assert.throws(() => qr.buildPayload("calendar", { eventTitle: "Event", eventStart: "2026-08-04T10:00", eventEnd: "2026-08-04T09:00" }), /after its start/);
});

test("preserves significant text and Wi-Fi whitespace", () => {
  assert.equal(qr.buildPayload("text", { text: "  line one\nline two  " }), "  line one\nline two  ");
  assert.equal(qr.buildPayload("wifi", { wifiSsid: " Guest ", wifiPassword: " secret ", wifiEncryption: "WPA" }), "WIFI:T:WPA;S: Guest ;P: secret ;H:false;;");
  assert.equal(qr.buildPayload("wifi", { wifiSsid: "Guest", wifiPassword: "old-secret", wifiEncryption: "NONE" }), "WIFI:T:nopass;S:Guest;P:;H:false;;");
  assert.throws(() => qr.buildPayload("wifi", { wifiSsid: "Guest", wifiEncryption: "WPA" }), /password is required/);
});

test("email encodes spaces, plus signs, ampersands, and CRLF body lines", () => {
  assert.equal(qr.buildPayload("email", { emailAddress: "a@example.com", emailSubject: "A + B", emailBody: "first\nsecond & third" }), "mailto:a@example.com?subject=A%20%2B%20B&body=first%0D%0Asecond%20%26%20third");
});

test("calendar rejects impossible and malformed dates and includes import identifiers", () => {
  for (const start of ["invalid", "2026-02-30T10:00", "2026-01-01T25:00"]) {
    assert.throws(() => qr.buildPayload("calendar", { eventTitle: "Test", eventStart: start, eventEnd: "2026-03-01T11:00" }), /valid event/);
  }
  const event = qr.buildPayload("calendar", { eventTitle: "Test", eventStart: "2028-02-29T10:00", eventEnd: "2028-02-29T11:00" });
  assert.match(event, /UID:[0-9a-f-]+@monkeytactics.com/);
  assert.match(event, /DTSTAMP:\d{8}T\d{6}Z/);
});

test("authenticator settings normalize Base32 and reject unsupported parameters", () => {
  const values = { totpSecret: "jbsw y3dp ehpk 3pxp", totpIssuer: "Example", totpAccount: "a@example.com" };
  const uri = new URL(qr.buildPayload("totp", values));
  assert.equal(uri.searchParams.get("secret"), "JBSWY3DPEHPK3PXP");
  assert.equal(uri.searchParams.get("algorithm"), "SHA1");
  assert.equal(uri.searchParams.get("digits"), "6");
  assert.equal(uri.searchParams.get("period"), "30");
  for (const patch of [{ totpAlgorithm: "MD5" }, { totpDigits: "9" }, { totpPeriod: "0" }, { totpIssuer: "A:B" }, { totpSecret: "A" }]) assert.throws(() => qr.buildPayload("totp", { ...values, ...patch }));
});

test("native coin requests use correct units without floating point rounding", () => {
  const address = "0x0000000000000000000000000000000000000001";
  assert.equal(qr.buildPayload("crypto", { cryptoNetwork: "ethereum", cryptoAddress: address, cryptoAmount: "1.000000000000000001", cryptoLabel: "ignored" }), `ethereum:${address}?value=1000000000000000001`);
  assert.equal(qr.buildPayload("crypto", { cryptoNetwork: "solana", cryptoAddress: "11111111111111111111111111111111", cryptoAmount: "0.000000001", cryptoLabel: "Test name" }), "solana:11111111111111111111111111111111?amount=0.000000001&label=Test%20name");
  for (const network of ["bitcoin", "litecoin"]) assert.equal(qr.buildPayload("crypto", { cryptoNetwork: network, cryptoAddress: "abc123", cryptoAmount: "0.1" }), `${network}:abc123?amount=0.1`);
  for (const amount of ["-1", "NaN", "1e3", "0.0000000000000000001"]) assert.throws(() => qr.buildPayload("crypto", { cryptoNetwork: "ethereum", cryptoAddress: address, cryptoAmount: amount }), /amount/);
  assert.throws(() => qr.buildPayload("crypto", { cryptoNetwork: "ethereum", cryptoAddress: "wrong" }), /Ethereum address/);
  assert.throws(() => qr.buildPayload("crypto", { cryptoNetwork: "bitcoin", cryptoAddress: "abc?amount=5" }), /wallet address/);
});

test("social and phone validation cannot silently turn letters into a different recipient", () => {
  for (const identity of ["hello", "+1abc5551234567", "0000000000", "123"]) assert.throws(() => qr.buildPayload("social", { socialPlatform: "whatsapp", socialIdentity: identity }));
  assert.throws(() => qr.buildPayload("sms", { smsPhone: "123abc456" }), /valid phone/);
  for (const [platform, expected] of [["instagram", "https://instagram.com/example"], ["x", "https://x.com/example"], ["linkedin", "https://linkedin.com/in/example"]]) assert.equal(qr.buildPayload("social", { socialPlatform: platform, socialIdentity: "example" }), expected);
});
