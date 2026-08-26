import Link from "next/link";
import { redirect } from "next/navigation";

import OperatorNav from "@/components/operator/operator-nav";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

import { changeBookingStatus, resolveCancellationRequest } from "./actions";

type PageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ operator?: string; created?: string; changed?: string; requestResolved?: string; error?: string }>;
};

function money(cents: number | null, currency: string) {
  if (cents === null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
}

function when(value: string, timezone: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

export default async function OperatorBookingDetailPage({ params, searchParams }: PageProps) {
  const { bookingId } = await params;
  const query = await searchParams;
  const { supabase, operator, membership } = await requireOperatorWorkspaceContext(query.operator);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, operator_id, reference, source, status, starts_at, ends_at, passenger_count, operator_note, currency_snapshot, rental_subtotal_cents_snapshot, extras_total_cents_snapshot, customer_total_cents_snapshot, commission_amount_cents_snapshot, operator_amount_cents_snapshot, customer_snapshot, boat_snapshot, legal_offering_snapshot, pickup_location_snapshot, created_at, confirmed_at, cancelled_at, completed_at")
    .eq("id", bookingId)
    .eq("operator_id", operator.id)
    .maybeSingle();

  if (bookingError || !booking) redirect(`/operator/bookings?operator=${operator.id}`);

  const [{ data: events }, { data: requests }, { data: payments }] = await Promise.all([
    supabase.from("booking_events").select("id, event_type, actor_type, from_status, to_status, message, occurred_at").eq("booking_id", bookingId).order("occurred_at", { ascending: false }).limit(20),
    supabase.from("booking_cancellation_requests").select("id, status, reason, estimated_refund_cents, currency, requested_at, resolution_note").eq("booking_id", bookingId).order("requested_at", { ascending: false }),
    supabase.from("payments").select("id, status, amount_cents, amount_received_cents, amount_refunded_cents, platform_fee_cents, reconciliation_status, created_at").eq("booking_id", bookingId).order("created_at", { ascending: false }),
  ]);

  const customer = (booking.customer_snapshot ?? {}) as { display_name?: string; email?: string; phone?: string };
  const boat = (booking.boat_snapshot ?? {}) as { name?: string; manufacturer?: string; model?: string };
  const location = (booking.pickup_location_snapshot ?? {}) as { name?: string; city?: string };
  const legal = (booking.legal_offering_snapshot ?? {}) as { legal_type?: string; skipper_mode?: string };
  const canManageCancellation = membership.role === "OWNER" || membership.role === "MANAGER";
  const pendingRequest = (requests ?? []).find((request) => request.status === "PENDING");

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/operator/bookings?operator=${operator.id}`} className="text-sm font-semibold text-[#64748B]">← Prenotazioni</Link>

        <section className="mt-5 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#14B8A6]">{booking.reference ?? "Booking"} · {booking.source}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{boat.name ?? "Barca"}</h1>
              <p className="mt-2 text-sm text-[#64748B]">{customer.display_name ?? "Cliente"}</p>
            </div>
            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">{booking.status}</span>
          </div>
        </section>

        {query.created === "1" || query.changed || query.requestResolved ? <div className="mt-5 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm"><strong>Operazione completata.</strong> Lo stato operativo è aggiornato.</div> : null}
        {query.error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Operazione non riuscita: {query.error}</div> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Dettagli</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs font-semibold uppercase text-[#64748B]">Inizio</p><p className="mt-1 text-sm font-medium">{when(booking.starts_at, operator.timezone)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#64748B]">Fine</p><p className="mt-1 text-sm font-medium">{when(booking.ends_at, operator.timezone)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#64748B]">Passeggeri</p><p className="mt-1 text-sm font-medium">{booking.passenger_count}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#64748B]">Partenza</p><p className="mt-1 text-sm font-medium">{[location.name, location.city].filter(Boolean).join(" · ") || "—"}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#64748B]">Offerta</p><p className="mt-1 text-sm font-medium">{legal.legal_type ?? "—"} {legal.skipper_mode ? `· ${legal.skipper_mode}` : ""}</p></div>
                <div><p className="text-xs font-semibold uppercase text-[#64748B]">Cliente</p><p className="mt-1 text-sm font-medium">{customer.email ?? "—"}{customer.phone ? ` · ${customer.phone}` : ""}</p></div>
              </div>
              {booking.operator_note ? <div className="mt-5 rounded-2xl bg-[#F1F5F4] p-4 text-sm"><strong>Nota operatore:</strong> {booking.operator_note}</div> : null}
            </section>

            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Timeline</h2>
              <div className="mt-5 space-y-3">
                {(events ?? []).map((event) => <div key={event.id} className="rounded-2xl border border-[#DEE5E8] p-4"><div className="flex flex-wrap justify-between gap-3"><p className="text-sm font-semibold">{event.event_type}</p><p className="text-xs text-[#64748B]">{when(event.occurred_at, operator.timezone)}</p></div><p className="mt-1 text-xs text-[#64748B]">{event.actor_type}{event.from_status || event.to_status ? ` · ${event.from_status ?? "—"} → ${event.to_status ?? "—"}` : ""}</p>{event.message ? <p className="mt-2 text-sm">{event.message}</p> : null}</div>)}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Economia</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span>Rental</span><strong>{money(booking.rental_subtotal_cents_snapshot, booking.currency_snapshot ?? operator.currency)}</strong></div>
                <div className="flex justify-between"><span>Extra</span><strong>{money(booking.extras_total_cents_snapshot, booking.currency_snapshot ?? operator.currency)}</strong></div>
                <div className="flex justify-between border-t border-[#DEE5E8] pt-3"><span>Totale cliente</span><strong>{money(booking.customer_total_cents_snapshot, booking.currency_snapshot ?? operator.currency)}</strong></div>
                <div className="flex justify-between"><span>Commissione Boatly</span><strong>{money(booking.commission_amount_cents_snapshot, booking.currency_snapshot ?? operator.currency)}</strong></div>
                <div className="flex justify-between"><span>Quota operatore</span><strong>{money(booking.operator_amount_cents_snapshot, booking.currency_snapshot ?? operator.currency)}</strong></div>
              </div>
              {(payments ?? []).map((payment) => <div key={payment.id} className="mt-4 rounded-2xl bg-[#F1F5F4] p-4 text-xs"><p><strong>Stripe:</strong> {payment.status}</p><p className="mt-1">Reconciliation: {payment.reconciliation_status}</p></div>)}
            </section>

            {pendingRequest && canManageCancellation ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-lg font-semibold text-amber-950">Richiesta cancellazione</h2>
                <p className="mt-2 text-sm text-amber-900">{pendingRequest.reason ?? "Nessuna motivazione"}</p>
                <p className="mt-2 text-sm text-amber-900">Rimborso stimato: <strong>{money(pendingRequest.estimated_refund_cents, pendingRequest.currency)}</strong></p>
                <form action={resolveCancellationRequest} className="mt-4 space-y-3">
                  <input type="hidden" name="operator_id" value={operator.id} />
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <input type="hidden" name="request_id" value={pendingRequest.id} />
                  <textarea name="resolution_note" rows={2} placeholder="Nota decisione" className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm" />
                  <div className="flex gap-2"><button name="decision" value="APPROVE" className="rounded-xl bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-white">Approva</button><button name="decision" value="REJECT" className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold">Rifiuta</button></div>
                </form>
              </section>
            ) : null}

            {["CONFIRMED", "IN_PROGRESS"].includes(booking.status) ? (
              <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Stato operativo</h2>
                <form action={changeBookingStatus} className="mt-4 space-y-3">
                  <input type="hidden" name="operator_id" value={operator.id} />
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <textarea name="note" rows={2} placeholder="Nota opzionale" className="w-full rounded-xl border border-[#DEE5E8] px-3 py-2 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    {booking.status === "CONFIRMED" ? <button name="target_status" value="IN_PROGRESS" className="rounded-xl bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-white">Avvia</button> : null}
                    <button name="target_status" value="COMPLETED" className="rounded-xl border border-[#DEE5E8] px-4 py-2 text-sm font-semibold">Completa</button>
                    <button name="target_status" value="NO_SHOW" className="rounded-xl border border-[#DEE5E8] px-4 py-2 text-sm font-semibold">No show</button>
                    <button name="target_status" value="CANCELLED_BY_OPERATOR" className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Cancella</button>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
