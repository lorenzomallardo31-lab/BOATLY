import assert from "node:assert/strict";
import test from "node:test";

import { skipperWhatsAppHref } from "../../src/lib/operator/skipper-contact.ts";

test("creates a WhatsApp link from an Italian mobile number", () => {
  assert.equal(skipperWhatsAppHref("333 123 4567"), "https://wa.me/393331234567");
});

test("keeps explicit international prefixes and rejects invalid values", () => {
  assert.equal(skipperWhatsAppHref("+34 612 345 678"), "https://wa.me/34612345678");
  assert.equal(skipperWhatsAppHref("123"), null);
  assert.equal(skipperWhatsAppHref(null), null);
});
