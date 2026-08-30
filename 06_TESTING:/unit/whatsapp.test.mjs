import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWhatsAppBookingMessage,
  buildWhatsAppBookingUrl,
  normalizeWhatsAppPhone,
} from "../../src/lib/operator/whatsapp.ts";

test("normalizes Italian local mobile numbers for wa.me", () => {
  assert.equal(normalizeWhatsAppPhone("333 123 4567", "IT"), "393331234567");
  assert.equal(normalizeWhatsAppPhone("+39 333 123 4567", "IT"), "393331234567");
});

test("preserves an explicit international prefix", () => {
  assert.equal(normalizeWhatsAppPhone("0044 7700 900123", "IT"), "447700900123");
});

test("builds a readable booking message in the operator timezone", () => {
  const message = buildWhatsAppBookingMessage({
    kind: "DEPARTURE_REMINDER",
    operatorName: "Noleggio Blu",
    customerName: "Mario Rossi",
    boatName: "Gommone 1",
    startsAt: "2026-09-01T07:00:00.000Z",
    endsAt: "2026-09-01T15:00:00.000Z",
    timezone: "Europe/Rome",
    passengers: 4,
  });

  assert.match(message, /Mario Rossi/);
  assert.match(message, /Gommone 1/);
  assert.match(message, /09:00 – 17:00/);
  assert.match(message, /Passeggeri: 4/);
  assert.match(message, /Noleggio Blu/);
});

test("creates an encoded WhatsApp deep link", () => {
  const url = buildWhatsAppBookingUrl("3331234567", "IT", {
    kind: "BOOKING_SUMMARY",
    operatorName: "Noleggio Blu",
    customerName: "Mario",
    boatName: "Gommone 1",
    startsAt: "2026-09-01T07:00:00.000Z",
    endsAt: "2026-09-01T15:00:00.000Z",
    timezone: "Europe/Rome",
    passengers: 2,
  });

  assert.ok(url?.startsWith("https://wa.me/393331234567?text="));
  assert.match(url ?? "", /Ciao%20Mario/);
});
