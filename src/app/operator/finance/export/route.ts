import { NextRequest, NextResponse } from "next/server";

import { summarizeManualFinance, type ManualPaymentRecordLike } from "@/lib/operator/finance";
import { isMonthKey, todayInTimeZone, zonedMonthBounds } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

function valueFromSnapshot(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const item = (value as Record<string, unknown>)[key];
  return typeof item === "string" ? item : "";
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export async function GET(request: NextRequest) {
  const operatorId = request.nextUrl.searchParams.get("operator") ?? undefined;
  const requestedMonth = request.nextUrl.searchParams.get("month") ?? undefined;
  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const currentMonth = todayInTimeZone(operator.timezone).slice(0, 7);
  const month = isMonthKey(requestedMonth) ? requestedMonth : currentMonth;
  const bounds = zonedMonthBounds(month, operator.timezone);
  if (!bounds) return NextResponse.json({ error: "invalid_month" }, { status: 400 });

  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id, reference, status, starts_at, ends_at, customer_total_cents_snapshot, currency_snapshot, customer_snapshot, boat_snapshot")
    .eq("operator_id", operator.id)
    .eq("source", "MANUAL")
    .gte("starts_at", bounds.start)
    .lt("starts_at", bounds.end)
    .order("starts_at")
    .limit(500);

  if (bookingError) return NextResponse.json({ error: "export_unavailable" }, { status: 500 });
  const ids = (bookings ?? []).map((booking) => booking.id);
  const ledgerResults = await Promise.all(
    chunks(ids, 100).map((batch) =>
      supabase
        .from("manual_payment_records")
        .select("booking_id, record_type, purpose, amount_cents, status")
        .eq("operator_id", operator.id)
        .in("booking_id", batch),
    ),
  );

  const ledgerByBooking = new Map<string, ManualPaymentRecordLike[]>();
  for (const result of ledgerResults) {
    if (result.error) return NextResponse.json({ error: "export_unavailable" }, { status: 500 });
    for (const row of result.data ?? []) {
      const current = ledgerByBooking.get(row.booking_id);
      if (current) current.push(row);
      else ledgerByBooking.set(row.booking_id, [row]);
    }
  }

  const header = [
    "Riferimento", "Stato", "Inizio ISO", "Fine ISO", "Barca", "Cliente",
    "Valuta", "Totale centesimi", "Incassato centesimi", "Rimborsato centesimi",
    "Netto centesimi", "Saldo centesimi", "Cauzione trattenuta centesimi",
  ];
  const lines = [header.map(csvCell).join(",")];

  for (const booking of bookings ?? []) {
    const total = booking.customer_total_cents_snapshot ?? 0;
    const summary = summarizeManualFinance(ledgerByBooking.get(booking.id) ?? [], total);
    lines.push([
      booking.reference ?? "",
      booking.status,
      booking.starts_at,
      booking.ends_at,
      valueFromSnapshot(booking.boat_snapshot, "name"),
      valueFromSnapshot(booking.customer_snapshot, "display_name"),
      booking.currency_snapshot ?? operator.currency,
      total,
      summary.commercialPaidCents,
      summary.commercialRefundedCents,
      summary.commercialNetCents,
      summary.outstandingCents,
      summary.securityHeldCents,
    ].map(csvCell).join(","));
  }

  return new NextResponse(`\uFEFF${lines.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="boatly-finance-${month}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
