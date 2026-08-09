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
    "mailto:someone@example.com?subject=Hello+there&body=Line+1+%26+line+2"
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
