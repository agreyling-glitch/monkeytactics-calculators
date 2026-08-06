import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../assets/js/qr-code-generator.js", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const qr = await import(moduleUrl);

test("builds escaped Wi-Fi payloads", () => {
  assert.equal(
    qr.buildWifiPayload({ ssid: "Home;5G", password: "pass,word", encryption: "WPA", hidden: true }),
    "WIFI:S:Home\\;5G;T:WPA;P:pass\\,word;H:true;;"
  );
});

test("builds vCard 4.0 and MeCard contact payloads", () => {
  const photo = "data:image/jpeg;base64,abc123";
  const card = qr.buildContactPayload({
    format: "vcard",
    name: "Alex Morgan",
    phone: "+1 (555) 123-4567",
    email: "alex@example.com",
    company: "Example, Inc.",
    address: "123 Main St; Saint Paul, MN",
    website: "https://example.com",
    photoDataUrl: photo,
  });
  assert.match(card, /^BEGIN:VCARD\r\nVERSION:4\.0/);
  assert.match(card, /TEL;TYPE=cell;VALUE=uri:tel:\+15551234567/);
  assert.match(card, /ORG:Example\\, Inc\./);
  assert.match(card, /PHOTO:data:image\/jpeg;base64,abc123/);
  assert.match(card, /END:VCARD$/);

  assert.equal(
    qr.buildContactPayload({ format: "mecard", name: "Alex Morgan", phone: "+1 555 123 4567", email: "alex@example.com" }),
    "MECARD:N:Alex Morgan;TEL:+15551234567;EMAIL:alex@example.com;;"
  );
});

test("builds email, SMS, and phone action payloads", () => {
  assert.equal(
    qr.buildEmailPayload({ address: "someone@example.com", subject: "Hello there", body: "Line 1 & line 2" }),
    "mailto:someone@example.com?subject=Hello%20there&body=Line%201%20%26%20line%202"
  );
  assert.equal(qr.buildSmsPayload({ phone: "+1 (555) 123-4567", message: "See you at 5" }), "sms:+15551234567?body=See%20you%20at%205");
  assert.equal(qr.buildPhonePayload({ phone: "+1 (555) 123-4567" }), "tel:+15551234567");
});

test("builds geo and iCalendar event payloads", () => {
  assert.equal(qr.buildGeoPayload({ latitude: "44.9537", longitude: "-93.0900" }), "geo:44.9537,-93.09");
  const event = qr.buildEventPayload({
    title: "Team, Meeting",
    start: "2026-08-04T09:30",
    end: "2026-08-04T10:45",
    location: "Room A; West",
    description: "Review\nNext steps",
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
  assert.equal(qr.buildSocialPayload({ platform: "whatsapp", value: "+1 (555) 123-4567" }), "https://wa.me/15551234567");
  assert.equal(qr.buildSocialPayload({ platform: "telegram", value: "@monkey_tactics" }), "https://t.me/monkey_tactics");
  assert.equal(qr.buildSocialPayload({ platform: "messenger", value: "monkey.tactics" }), "https://m.me/monkey.tactics");
});

test("rejects invalid required fields and ranges", () => {
  assert.throws(() => qr.buildContactPayload({}), /Contact name/);
  assert.throws(() => qr.buildEmailPayload({ address: "not-an-email" }), /valid email/);
  assert.throws(() => qr.buildGeoPayload({ latitude: "91", longitude: "0" }), /Latitude/);
  assert.throws(() => qr.buildEventPayload({ title: "Event", start: "2026-08-04T10:00", end: "2026-08-04T09:00" }), /after the start/);
});
