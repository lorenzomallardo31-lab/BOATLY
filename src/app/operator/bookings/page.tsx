import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = {
  searchParams: Promise<{ operator?: string; status?: string; source?: string }>;
};

function money(cents: number | null, currency: string) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function when(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function recordValue(value: unknown, key: string, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const result = (value as Record<string, unknown>)[key];
  return typeof result === "string" && result.trim() ? result : fallback;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Bozza",
    PENDING_PAYMENT: "In attesa pagamento",
    PAYMENT_PROCESSING: "Pagamento in corso",
    CONFIRMED: "Confermata",
    IN_PROGRESS: "In corso",
    COMPLETED: "Completata",
    CANCELLED_BY_CUSTOMER: "Cancellata dal cliente",
    CANCELLED_BY_OPERATOR: "Cancellata dal gestore",
    CANCELLED_BY_BOATLY: "Cancellata da Boatly",
    PAYMENT_FAILED: "Pagamento fallito",
    REFUND_PENDING: "Rimborso in corso",
    REFUNDED: "Rimborsata",
    PARTIALLY_REFUNDED: "Rimborso parziale",
    NO_SHOW: "No show",
  };
  return labels[status] ?? status;
}

function statusTone(status: string) {
  if (["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["DRAFT", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "REFUND_PENDING"].includes(status)) {
    return "bg-[#FFF0D6] text-[#A14B08]";
  }
  return "bg-rose-50 text-rose-700";
}

export default async function OperatorBookingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);

  let request = supabase
    .from("bookings")
    .select("id, reference, source, status, starts_at, ends_at, passenger_count, currency_snapshot, customer_total_cents_snapshot, operator_amount_cents_snapshot, boat_snapshot, customer_snapshot, created_at")
    .eq("operator_id", operator.id)
    .order("starts_at", { ascending: false })
    .limit(200);

  if (query.status) request = request.eq("status", query.status);
  if (query.source) request = request.eq("source", query.source);

  const { data: bookings, error } = await request;
  if (error) throw new Error(`Unable to load bookings: ${error.message}`);

  const filterHref = (filters: { status?: string; source?: string }) => {
    const params = new URLSearchParams({ operator: operator.id });
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    return `/operator/bookings?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Booking operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Prenotazioni</h1>
            <p className="mt-2 text-sm text-[#676B80]">Tutte le operazioni del workspace, dirette e future marketplace.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/operator/calendar?operator=${operator.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#D8D5E5] bg-white px-4 text-sm font-semibold">
              Calendario
            </Link>
            <Link href={`/operator/bookings/new?operator=${operator.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171A2B] px-4 text-sm font-semibold text-white">
              + Nuova
            </Link>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 text-sm">
          {[
            [filterHref({}), "Tutte", !query.status && !query.source],
            [filterHref({ status: "CONFIRMED" }), "Confermate", query.status === "CONFIRMED"],
            [filterHref({ status: "IN_PROGRESS" }), "In corso", query.status === "IN_PROGRESS"],
            [filterHref({ status: "COMPLETED" }), "Completate", query.status === "COMPLETED"],
            [filterHref({ status: "REFUND_PENDING" }), "Rimborsi", query.status === "REFUND_PENDING"],
            [filterHref({ source: "MANUAL" }), "Dirette", query.source === "MANUAL"],
          ].map(([href, label, active]) => (
            <Link
              key={String(label)}
              href={String(href)}
              className={`shrink-0 rounded-full border px-4 py-2.5 font-semibold transition ${active ? "border-[#6D5DFB] bg-[#EDE9FE] text-[#4C3FC2]" : "border-[#D8D5E5] bg-white text-[#676B80] hover:border-[#8B7CF6]"}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{(bookings ?? []).length} risultati</p>
          {(query.status || query.source) ? <Link href={filterHref({})} className="text-sm font-semibold text-[#4C3FC2]">Azzera filtri</Link> : null}
        </div>

        {(bookings ?? []).length === 0 ? (
          <section className="mt-5 rounded-3xl border border-dashed border-[#B8B2D7] bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">Nessuna prenotazione</h2>
            <p className="mt-2 text-sm text-[#676B80]">Non ci sono operazioni per i filtri selezionati.</p>
          </section>
        ) : (
          <section className="mt-5 grid gap-3">
            {(bookings ?? []).map((booking) => {
              const boat = recordValue(booking.boat_snapshot, "name", "Barca");
              const customer = recordValue(booking.customer_snapshot, "display_name", "Cliente");
              const email = recordValue(booking.customer_snapshot, "email", "");

              return (
                <Link key={booking.id} href={`/operator/bookings/${booking.id}?operator=${operator.id}`} className="rounded-2xl border border-[#E2DFEB] bg-white p-4 shadow-sm transition hover:border-[#8B7CF6] hover:shadow-md sm:p-5 lg:grid lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center lg:gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{boat}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone(booking.status)}`}>{statusLabel(booking.status)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#676B80]">{booking.reference ?? "—"} · {booking.source === "MANUAL" ? "Diretta" : "Marketplace"}</p>
                  </div>

                  <div className="mt-4 lg:mt-0">
                    <p className="text-sm font-semibold">{customer}</p>
                    <p className="mt-1 truncate text-xs text-[#676B80]">{email || `${booking.passenger_count} passeggeri`}</p>
                  </div>

                  <div className="mt-4 rounded-xl bg-[#F8F7FC] p-3 text-sm lg:mt-0 lg:bg-transparent lg:p-0">
                    <p className="font-semibold">{when(booking.starts_at, operator.timezone)}</p>
                    <p className="mt-1 text-xs text-[#676B80]">fino a {when(booking.ends_at, operator.timezone)}</p>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-4 border-t border-[#ECEAF1] pt-4 lg:mt-0 lg:block lg:border-0 lg:pt-0 lg:text-right">
                    <div>
                      <p className="text-xs text-[#676B80]">Totale</p>
                      <p className="font-semibold">{money(booking.customer_total_cents_snapshot, booking.currency_snapshot ?? operator.currency)}</p>
                    </div>
                    <span className="text-sm font-bold text-[#4C3FC2]">Apri →</span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
