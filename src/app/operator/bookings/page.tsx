import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

type PageProps = {
  searchParams: Promise<{ operator?: string; status?: string; source?: string }>;
};

function money(cents: number | null, currency: string) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

function when(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

export default async function OperatorBookingsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);

  let request = supabase
    .from("bookings")
    .select("id, reference, source, status, starts_at, ends_at, passenger_count, currency_snapshot, customer_total_cents_snapshot, operator_amount_cents_snapshot, boat_snapshot, customer_snapshot, created_at")
    .eq("operator_id", operator.id)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (query.status) request = request.eq("status", query.status);
  if (query.source) request = request.eq("source", query.source);

  const { data: bookings, error } = await request;
  if (error) throw new Error(`Unable to load bookings: ${error.message}`);

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">Booking Operations</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Prenotazioni</h1>
            <p className="mt-2 text-sm text-[#64748B]">Marketplace e manuali nello stesso flusso operativo.</p>
          </div>
          <Link href={`/operator/bookings/new?operator=${operator.id}`} className="rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white">Nuova manuale</Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <Link href={`/operator/bookings?operator=${operator.id}`} className="rounded-full border border-[#DEE5E8] bg-white px-4 py-2 font-semibold">Tutte</Link>
          {[
            ["CONFIRMED", "Confermate"],
            ["IN_PROGRESS", "In corso"],
            ["COMPLETED", "Completate"],
            ["REFUND_PENDING", "Rimborso"],
          ].map(([value, label]) => (
            <Link key={value} href={`/operator/bookings?operator=${operator.id}&status=${value}`} className="rounded-full border border-[#DEE5E8] bg-white px-4 py-2 font-semibold">{label}</Link>
          ))}
          <Link href={`/operator/bookings?operator=${operator.id}&source=MANUAL`} className="rounded-full border border-[#DEE5E8] bg-white px-4 py-2 font-semibold">Manuali</Link>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-[#DEE5E8] bg-white shadow-sm">
          {(bookings ?? []).length === 0 ? (
            <div className="p-10 text-center text-sm text-[#64748B]">Nessuna prenotazione per questi filtri.</div>
          ) : (
            <div className="divide-y divide-[#DEE5E8]">
              {(bookings ?? []).map((booking) => {
                const boat = (booking.boat_snapshot ?? {}) as { name?: string };
                const customer = (booking.customer_snapshot ?? {}) as { display_name?: string; email?: string };
                return (
                  <Link key={booking.id} href={`/operator/bookings/${booking.id}?operator=${operator.id}`} className="grid gap-4 p-5 transition hover:bg-[#FCFBF8] md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold">{boat.name ?? "Barca"}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{booking.reference ?? "—"} · {booking.source}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{customer.display_name ?? "Cliente"}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{customer.email ?? ""}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{when(booking.starts_at, operator.timezone)}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{booking.passenger_count} persone</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{money(booking.customer_total_cents_snapshot, booking.currency_snapshot ?? operator.currency)}</p>
                      <span className="mt-1 inline-flex rounded-full bg-[#F1F5F4] px-3 py-1 text-xs font-semibold">{booking.status}</span>
                    </div>
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
