export type ManualPaymentRecordLike = {
  record_type: string;
  purpose: string;
  amount_cents: number;
  status: string;
};

export type ManualFinanceSummary = {
  commercialPaidCents: number;
  commercialRefundedCents: number;
  commercialNetCents: number;
  outstandingCents: number;
  securityPaidCents: number;
  securityRefundedCents: number;
  securityHeldCents: number;
};

export function parseMoneyToCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [units, fraction = ""] = normalized.split(".");
  const cents = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 1_000_000_000) {
    return null;
  }
  return cents;
}

export function summarizeManualFinance(
  records: ManualPaymentRecordLike[],
  bookingTotalCents: number,
): ManualFinanceSummary {
  let commercialPaidCents = 0;
  let commercialRefundedCents = 0;
  let securityPaidCents = 0;
  let securityRefundedCents = 0;

  for (const record of records) {
    if (record.status !== "RECORDED" || record.amount_cents <= 0) continue;
    const security = record.purpose === "SECURITY_DEPOSIT";
    if (record.record_type === "PAYMENT") {
      if (security) securityPaidCents += record.amount_cents;
      else commercialPaidCents += record.amount_cents;
    } else if (record.record_type === "REFUND") {
      if (security) securityRefundedCents += record.amount_cents;
      else commercialRefundedCents += record.amount_cents;
    }
  }

  const commercialNetCents = commercialPaidCents - commercialRefundedCents;
  return {
    commercialPaidCents,
    commercialRefundedCents,
    commercialNetCents,
    outstandingCents: Math.max(0, bookingTotalCents - commercialNetCents),
    securityPaidCents,
    securityRefundedCents,
    securityHeldCents: securityPaidCents - securityRefundedCents,
  };
}

export function manualPaymentPurposeLabel(value: string) {
  const labels: Record<string, string> = {
    DEPOSIT: "Acconto",
    BALANCE: "Saldo",
    FULL_PAYMENT: "Pagamento completo",
    SECURITY_DEPOSIT: "Cauzione",
    OTHER: "Altro",
  };
  return labels[value] ?? value;
}

export function manualPaymentMethodLabel(value: string) {
  const labels: Record<string, string> = {
    CASH: "Contanti",
    CARD_EXTERNAL: "POS esterno",
    BANK_TRANSFER: "Bonifico",
    OTHER: "Altro",
  };
  return labels[value] ?? value;
}
