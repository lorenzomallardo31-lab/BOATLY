import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import {
  manualPaymentMethodLabel,
  manualPaymentPurposeLabel,
  summarizeManualFinance,
  type ManualPaymentRecordLike,
} from "@/lib/operator/finance";
import {
  addMonths,
  isMonthKey,
  todayInTimeZone,
  zonedMonthBounds,
} from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = {
  searchParams: Promise<{ operator?: string; month?: string; balance?: string }>;
};

type BookingRow = {
  id: string;
  reference: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  customer_total_cents_snapshot: number | null;
  currency_snapshot: string | null;
  customer_snapshot: unknown;
  boat_snapshot: unknown;
};

type LedgerRow = ManualPaymentRecordLike & {
  id: string;
  booking_id: string;
  payment_method: string;
  external_reference: string | null;
  note: string | null;
  occurred_at: string;
  void_reason: string | null;
};

function recordValue(value: unknown, key: string, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const result = (value as Record<string, unknown>)[key];
  return typeof result === "string" && result.trim() ? result : fallback;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function when(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function financeHref(operatorId: string, month: string, balance?: string) {
  const params = new URLSearchParams({ operator: operatorId, month });
  if (balance) params.set("balance", balance);
  return `/operator/finance?${params.toString()}`;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export default async function OperatorFinancePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);
  const currentMonth = todayInTimeZone(operator.timezone).slice(0, 7);
  const selectedMonth = isMonthKey(query.month) ? query.month : currentMonth;
  const monthBounds = zonedMonthBounds(selectedMonth, operator.timezone);
  if (!monthBounds) throw new Error("Unable to resolve finance month.");

  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("id, reference, status, starts_at, ends_at, customer_total_cents_snapshot, currency_snapshot, customer_snapshot, boat_snapshot")
    .eq("operator_id", operator.id)
    .eq("source", "MANUAL")
    .gte("starts_at", monthBounds.start)
    .lt("starts_at", monthBounds.end)
    .order("starts_at")
    .limit(500);

  if (bookingError) throw new Error(`Unable to load finance bookings: ${bookingError.message}`);
  const bookings = (bookingData ?? []) as BookingRow[];
  const bookingIds = bookings.map((booking) => booking.id);
  const ledgerResults = await Promise.all(
    chunks(bookingIds, 100).map((ids) =>
      supabase
        .from("manual_payment_records")
        .select("id, booking_id, record_type, purpose, payment_method, amount_cents, status, external_reference, note, occurred_at, void_reason")
        .eq("operator_id", operator.id)
        .in("booking_id", ids)
        .order("occurred_at", { ascending: false }),
    ),
  );

  const ledger: LedgerRow[] = [];
  for (const result of ledgerResults) {
    if (result.error) throw new Error(`Unable to load finance ledger: ${result.error.message}`);
    ledger.push(...((result.data ?? []) as LedgerRow[]));
  }
  ledger.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const recordsByBooking = new Map<string, LedgerRow[]>();
  for (const record of ledger) {
    const current = recordsByBooking.get(record.booking_id);
    if (current) current.push(record);
    else recordsByBooking.set(record.booking_id, [record]);
  }

  const rows = bookings.map((booking) => {
    const totalCents = booking.customer_total_cents_snapshot ?? 0;
    return {
      booking,
      summary: summarizeManualFinance(recordsByBooking.get(booking.id) ?? [], totalCents),
      totalCents,
    };
  });
  const visibleRows = query.balance === "open"
    ? rows.filter((row) => row.summary.outstandingCents > 0)
    : rows;
  const liveStatuses = new Set(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"]);
  const commercialRows = rows.filter((row) => liveStatuses.has(row.booking.status));
  const contractValue = commercialRows.reduce((sum, row) => sum + row.totalCents, 0);
  const collected = rows.reduce((sum, row) => sum + row.summary.commercialNetCents, 0);
  const outstanding = commercialRows.reduce((sum, row) => sum + row.summary.outstandingCents, 0);
  const securityHeld = rows.reduce((sum, row) => sum + row.summary.securityHeldCents, 0);
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Cassa e incassi diretti</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Finanza operativa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">Saldi delle prenotazioni manuali. Le cauzioni sono separate dai ricavi e ogni correzione resta nello storico.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={financeHref(operator.id, addMonths(selectedMonth, -1))} className="inline-flex min-h-11 items-center rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold">← Mese</Link>
            <Link href={financeHref(operator.id, currentMonth)} className="inline-flex min-h-11 items-center rounded-xl bg-[#EDE9FE] px-4 text-sm font-semibold text-[#4C3FC2]">Oggi</Link>
            <Link href={financeHref(operator.id, addMonths(selectedMonth, 1))} className="inline-flex min-h-11 items-center rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold">Mese →</Link>
            <Link href={`/operator/finance/export?operator=${operator.id}&month=${selectedMonth}`} className="inline-flex min-h-11 items-center rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white">Esporta CSV</Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold capitalize">{monthLabel(selectedMonth)}</h2>
          <div className="flex gap-2 text-sm font-semibold">
            <Link href={financeHref(operator.id, selectedMonth)} className={`rounded-full px-4 py-2 ${query.balance !== "open" ? "bg-[#6D5DFB] text-white" : "border border-[#D8D5E5] bg-white"}`}>Tutte</Link>
            <Link href={financeHref(operator.id, selectedMonth, "open")} className={`rounded-full px-4 py-2 ${query.balance === "open" ? "bg-[#6D5DFB] text-white" : "border border-[#D8D5E5] bg-white"}`}>Saldi aperti</Link>
          </div>
        </div>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Valore prenotato", contractValue, "contratti del mese"],
            ["Incassato netto", collected, "escluse cauzioni"],
            ["Da incassare", outstanding, "saldi commerciali"],
            ["Cauzioni trattenute", securityHeld, "da restituire"],
          ].map(([label, value, note]) => (
            <article key={String(label)} className="rounded-2xl border border-[#E2DFEB] bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#676B80] sm:text-xs">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{money(Number(value), operator.currency)}</p>
              <p className="mt-1 text-xs text-[#676B80]">{note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">Scadenziario</p><h2 className="mt-1 text-xl font-semibold">Prenotazioni e saldi</h2></div>
            <span className="text-sm font-semibold text-[#676B80]">{visibleRows.length} righe</span>
          </div>
          {visibleRows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#D8D5E5] p-8 text-center text-sm text-[#676B80]">Nessuna prenotazione per questo filtro.</div>
          ) : (
            <div className="mt-5 space-y-3">
              {visibleRows.map(({ booking, summary, totalCents }) => {
                const customer = recordValue(booking.customer_snapshot, "display_name", "Cliente");
                const boat = recordValue(booking.boat_snapshot, "name", "Barca");
                const currency = booking.currency_snapshot ?? operator.currency;
                return (
                  <Link key={booking.id} href={`/operator/bookings/${booking.id}?operator=${operator.id}#manual-finance`} className="grid gap-4 rounded-2xl border border-[#E2DFEB] p-4 transition hover:border-[#8B7CF6] sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto] sm:items-center">
                    <div><p className="font-semibold">{boat} · {customer}</p><p className="mt-1 text-xs text-[#676B80]">{booking.reference ?? "—"} · {when(booking.starts_at, operator.timezone)}</p></div>
                    <div><p className="text-xs text-[#676B80]">Incassato / totale</p><p className="mt-1 text-sm font-semibold">{money(summary.commercialNetCents, currency)} / {money(totalCents, currency)}</p></div>
                    <div><p className="text-xs text-[#676B80]">Saldo</p><p className={`mt-1 text-sm font-semibold ${summary.outstandingCents > 0 ? "text-amber-700" : "text-emerald-700"}`}>{summary.outstandingCents > 0 ? money(summary.outstandingCents, currency) : "Saldato"}</p></div>
                    <span className="text-sm font-bold text-[#4C3FC2]">Gestisci →</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-[#E2DFEB] bg-white p-4 shadow-sm sm:p-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">Registro immutabile</p><h2 className="mt-1 text-xl font-semibold">Ultimi movimenti del mese</h2></div>
          {ledger.length === 0 ? <p className="mt-5 text-sm text-[#676B80]">Nessun movimento registrato.</p> : (
            <div className="mt-5 divide-y divide-[#ECEAF1]">
              {ledger.slice(0, 100).map((record) => {
                const booking = bookingById.get(record.booking_id);
                const currency = booking?.currency_snapshot ?? operator.currency;
                return (
                  <Link key={record.id} href={`/operator/bookings/${record.booking_id}?operator=${operator.id}#manual-finance`} className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                    <div><p className="font-semibold">{record.record_type === "PAYMENT" ? "Incasso" : "Rimborso"} · {manualPaymentPurposeLabel(record.purpose)}</p><p className="mt-1 text-xs text-[#676B80]">{manualPaymentMethodLabel(record.payment_method)} · {when(record.occurred_at, operator.timezone)}</p></div>
                    <p className="text-xs text-[#676B80]">{booking?.reference ?? "Prenotazione"}{record.external_reference ? ` · ${record.external_reference}` : ""}</p>
                    <div className="text-right"><p className={`font-semibold ${record.record_type === "PAYMENT" ? "text-emerald-700" : "text-rose-700"}`}>{record.record_type === "PAYMENT" ? "+" : "−"}{money(record.amount_cents, currency)}</p><p className="mt-1 text-[10px] font-bold text-[#676B80]">{record.status}</p></div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
