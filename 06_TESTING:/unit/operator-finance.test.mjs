import assert from "node:assert/strict";
import test from "node:test";

import {
  parseMoneyToCents,
  summarizeManualFinance,
} from "../../src/lib/operator/finance.ts";

test("parses euro input without floating point rounding", () => {
  assert.equal(parseMoneyToCents("350"), 35000);
  assert.equal(parseMoneyToCents("350,50"), 35050);
  assert.equal(parseMoneyToCents("0.01"), 1);
  assert.equal(parseMoneyToCents("1.234"), null);
  assert.equal(parseMoneyToCents("0"), null);
  assert.equal(parseMoneyToCents("not-money"), null);
});

test("separates commercial receipts from security deposits", () => {
  const summary = summarizeManualFinance([
    { record_type: "PAYMENT", purpose: "DEPOSIT", amount_cents: 30000, status: "RECORDED" },
    { record_type: "PAYMENT", purpose: "BALANCE", amount_cents: 20000, status: "RECORDED" },
    { record_type: "REFUND", purpose: "OTHER", amount_cents: 5000, status: "RECORDED" },
    { record_type: "PAYMENT", purpose: "SECURITY_DEPOSIT", amount_cents: 25000, status: "RECORDED" },
    { record_type: "REFUND", purpose: "SECURITY_DEPOSIT", amount_cents: 10000, status: "RECORDED" },
  ], 50000);

  assert.deepEqual(summary, {
    commercialPaidCents: 50000,
    commercialRefundedCents: 5000,
    commercialNetCents: 45000,
    outstandingCents: 5000,
    securityPaidCents: 25000,
    securityRefundedCents: 10000,
    securityHeldCents: 15000,
  });
});

test("ignores voided records and never exposes a negative outstanding balance", () => {
  const summary = summarizeManualFinance([
    { record_type: "PAYMENT", purpose: "FULL_PAYMENT", amount_cents: 60000, status: "RECORDED" },
    { record_type: "REFUND", purpose: "OTHER", amount_cents: 10000, status: "VOIDED" },
  ], 50000);

  assert.equal(summary.commercialNetCents, 60000);
  assert.equal(summary.outstandingCents, 0);
});
