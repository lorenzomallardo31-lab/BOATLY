import Link from "next/link";
import { redirect } from "next/navigation";

import ManualPaymentForm from "@/components/operator/manual-payment-form";
import OperatorNav from "@/components/operator/operator-nav";
import RescheduleBookingForm from "@/components/operator/reschedule-booking-form";
import {
  manualPaymentMethodLabel,
  manualPaymentPurposeLabel,
  summarizeManualFinance,
} from "@/lib/operator/finance";
import { localDateTimeInTimeZone } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

import { changeBookingStatus, resolveCancellationRequest } from "./actions";
import { voidManualPayment } from "../../finance/actions";

type PageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ operator?: string; created?: string; changed?: string; requestResolved?: string; rescheduled?: string; error?: string; finance?: string; financeError?: string }>;
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
    .select("id, operator_id, reference, source, status, starts_at, ends_at, passenger_count, operator_note, boat_id, legal_offering_id, pickup_location_id, currency_snapshot, rental_subtotal_cents_snapshot, extras_total_cents_snapshot, customer_total_cents_snapshot, commission_amount_cents_snapshot, operator_amount_cents_snapshot, customer_snapshot, boat_snapshot, legal_offering_snapshot, pickup_location_snapshot, created_at, confirmed_at, cancelled_at, completed_at")
    .eq("id", bookingId)
    .eq("operator_id", operator.id)
    .maybeSingle();

  if (bookingError || !booking) redirect(`/operator/bookings?operator=${operator.id}`);

  const [
    { data: events },
    { data: requests },
    { data: payments },
    { data: refunds },
    { data: manualPayments },
  ] = await Promise.all([
    supabase.from("booking_events").select("id, event_type, actor_type, from_status, to_status, message, occurred_at").eq("booking_id", bookingId).order("occurred_at", { ascending: false }).limit(20),
    supabase.from("booking_cancellation_requests").select("id, status, reason, estimated_refund_cents, currency, requested_at, resolution_note").eq("booking_id", bookingId).order("requested_at", { ascending: false }),
    supabase.from("payments").select("id, status, amount_cents, amount_received_cents, amount_refunded_cents, platform_fee_cents, reconciliation_status, created_at").eq("booking_id", bookingId).order("created_at", { ascending: false }),
    supabase.from("refunds").select("id, amount_cents, currency, status, reconciliation_status, created_at").eq("booking_id", bookingId).order("created_at", { ascending: false }),
    supabase.from("manual_payment_records").select("id, record_type, purpose, payment_method, amount_cents, currency, status, external_reference, note, occurred_at, void_reason, voided_at").eq("booking_id", bookingId).order("occurred_at", { ascending: false }),
  ]);

  const customer = (booking.customer_snapshot ?? {}) as { display_name?: string; email?: string; phone?: string };
  const boat = (booking.boat_snapshot ?? {}) as { name?: string; manufacturer?: string; model?: string };
  const location = (booking.pickup_location_snapshot ?? {}) as { name?: string; city?: string };
  const legal = (booking.legal_offering_snapshot ?? {}) as { legal_type?: string; skipper_mode?: string };
  const canManageCancellation = membership.role === "OWNER" || membership.role === "MANAGER";
  const canRecordManualFinance = ["OWNER", "MANAGER", "EMPLOYEE"].includes(membership.role);
  const canVoidManualFinance = ["OWNER", "MANAGER"].includes(membership.role);
  const pendingRequest = (requests ?? []).find((request) => request.status === "PENDING");
  const manualFinance = summarizeManualFinance(
    manualPayments ?? [],
    booking.customer_total_cents_snapshot ?? 0,
  );
  const hasActiveManualFinance = (manualPayments ?? []).some((payment) => payment.status === "RECORDED");
  const hasOutstandingPayment = (payments ?? []).some((payment) => (payment.amount_received_cents ?? 0) > (payment.amount_refunded_cents ?? 0)) || hasActiveManualFinance;
  const canReschedule = booking.source === "MANUAL" && booking.status === "CONFIRMED" && new Date(booking.starts_at) > new Date() && !hasOutstandingPayment;
  const financeErrorLabels: Record<string, string> = {
    "void-reason": "Per stornare un movimento serve una motivazione di almeno 5 caratteri.",
    "void-not-allowed": "Solo Owner e Manager possono stornare un movimento.",
    "already-voided": "Il movimento è già stato stornato.",
    "void-failed": "Storno non riuscito. Il registro non è stato modificato.",
  };

  const [{ data: activeBoats }, { data: activeLocations }] = canReschedule
    ? await Promise.all([
        supabase.from("boats").select("id, name, operator_passenger_limit").eq("operator_id", operator.id).eq("status", "ACTIVE").order("name"),
        supabase.from("operator_locations").select("id, name, city").eq("operator_id", operator.id).eq("is_active", true).order("is_primary", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const activeBoatIds = (activeBoats ?? []).map((item) => item.id);
  const { data: activeOfferings } = canReschedule && activeBoatIds.length
    ? await supabase.from("boat_legal_offerings").select("id, boat_id, legal_type, skipper_mode").in("boat_id", activeBoatIds).eq("is_active", true)
    : { data: [] };

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/operator/bookings?operator=${operator.id}`} className="text-sm font-semibold text-[#64748B]">← Prenotazioni</Link>

        <section className="mt-5 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#6D5DFB]">{booking.reference ?? "Booking"} · {booking.source}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{boat.name ?? "Barca"}</h1>
              <p className="mt-2 text-sm text-[#64748B]">{customer.display_name ?? "Cliente"}</p>
            </div>
            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">{booking.status}</span>
          </div>
        </section>

        {query.created === "1" || query.changed || query.requestResolved || query.rescheduled ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><strong>Operazione completata.</strong> Lo stato operativo è aggiornato.</div> : null}
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
              {(refunds ?? []).map((refund) => (
                <div
                  key={refund.id}
                  className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs"
                >
                  <p>
                    <strong>Rimborso:</strong>{" "}
                    {money(refund.amount_cents, refund.currency)} · {refund.status}
                  </p>
                  <p className="mt-1">
                    Reconciliation: {refund.reconciliation_status}
                  </p>
                </div>
              ))}
              {booking.source === "MANUAL" ? (
                <div className="mt-4 space-y-2 rounded-2xl border border-[#D8D5E5] bg-[#F8F7FC] p-4 text-sm">
                  <div className="flex justify-between"><span>Incassi diretti</span><strong>{money(manualFinance.commercialPaidCents, booking.currency_snapshot ?? operator.currency)}</strong></div>
                  <div className="flex justify-between"><span>Rimborsi diretti</span><strong>{money(manualFinance.commercialRefundedCents, booking.currency_snapshot ?? operator.currency)}</strong></div>
                  <div className="flex justify-between border-t border-[#D8D5E5] pt-2"><span>Saldo da incassare</span><strong className={manualFinance.outstandingCents > 0 ? "text-amber-700" : "text-emerald-700"}>{manualFinance.outstandingCents > 0 ? money(manualFinance.outstandingCents, booking.currency_snapshot ?? operator.currency) : "Saldato"}</strong></div>
                  <div className="flex justify-between"><span>Cauzione trattenuta</span><strong>{money(manualFinance.securityHeldCents, booking.currency_snapshot ?? operator.currency)}</strong></div>
                </div>
              ) : null}
            </section>

            {booking.source === "MANUAL" ? (
              <section id="manual-finance" className="scroll-mt-24 rounded-3xl border border-[#CFC8FF] bg-[#F4F1FF] p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6D5DFB]">Registro off-platform</p>
                <h2 className="mt-1 text-xl font-semibold">Incassi, rimborsi e cauzioni</h2>
                <p className="mt-2 text-sm leading-6 text-[#676B80]">Boatly registra il fatto contabile ma non muove denaro. Gli errori vengono stornati, mai cancellati.</p>

                {query.finance === "voided" ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Movimento stornato e saldi ricalcolati.</div> : null}
                {query.financeError ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{financeErrorLabels[query.financeError] ?? "Operazione finanziaria non riuscita."}</div> : null}

                {canRecordManualFinance ? (
                  <ManualPaymentForm
                    operatorId={operator.id}
                    bookingId={booking.id}
                    currency={booking.currency_snapshot ?? operator.currency}
                    defaultOccurredAt={localDateTimeInTimeZone(new Date(), operator.timezone)}
                    outstandingCents={manualFinance.outstandingCents}
                    refundableCommercialCents={manualFinance.commercialNetCents}
                    securityHeldCents={manualFinance.securityHeldCents}
                  />
                ) : <p className="mt-4 rounded-xl bg-white p-3 text-sm text-[#676B80]">Il tuo ruolo può consultare il registro ma non aggiungere movimenti.</p>}

                <div className="mt-6 border-t border-[#D8D5E5] pt-5">
                  <h3 className="font-semibold">Storico movimenti</h3>
                  {(manualPayments ?? []).length === 0 ? <p className="mt-3 text-sm text-[#676B80]">Nessun movimento registrato.</p> : (
                    <div className="mt-3 space-y-3">
                      {(manualPayments ?? []).map((payment) => (
                        <article key={payment.id} className={`rounded-2xl border p-4 ${payment.status === "VOIDED" ? "border-[#D8D5E5] bg-[#F1F0F6] opacity-75" : "border-white bg-white"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="font-semibold">{payment.record_type === "PAYMENT" ? "Incasso" : "Rimborso"} · {manualPaymentPurposeLabel(payment.purpose)}</p><p className="mt-1 text-xs text-[#676B80]">{manualPaymentMethodLabel(payment.payment_method)} · {when(payment.occurred_at, operator.timezone)}</p></div>
                            <div className="text-right"><p className={payment.record_type === "PAYMENT" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>{payment.record_type === "PAYMENT" ? "+" : "−"}{money(payment.amount_cents, payment.currency)}</p><p className="mt-1 text-[10px] font-bold text-[#676B80]">{payment.status}</p></div>
                          </div>
                          {payment.external_reference ? <p className="mt-3 text-xs text-[#676B80]">Riferimento: <strong>{payment.external_reference}</strong></p> : null}
                          {payment.note ? <p className="mt-2 rounded-xl bg-[#F8F7FC] p-3 text-sm">{payment.note}</p> : null}
                          {payment.status === "VOIDED" ? <p className="mt-2 text-xs text-rose-700">Stornato: {payment.void_reason ?? "motivazione registrata"}</p> : null}
                          {payment.status === "RECORDED" && canVoidManualFinance ? (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-xs font-semibold text-rose-700">Correggi con storno</summary>
                              <form action={voidManualPayment} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                                <input type="hidden" name="operator_id" value={operator.id} />
                                <input type="hidden" name="booking_id" value={booking.id} />
                                <input type="hidden" name="record_id" value={payment.id} />
                                <input name="reason" required minLength={5} maxLength={1000} placeholder="Motivazione obbligatoria" className="min-h-11 rounded-xl border border-rose-200 bg-white px-3 text-sm" />
                                <button className="min-h-11 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700">Storna</button>
                              </form>
                            </details>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

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
                  <div className="flex gap-2"><button name="decision" value="APPROVE" className="rounded-xl bg-[#6D5DFB] px-4 py-2 text-sm font-semibold text-white">Approva</button><button name="decision" value="REJECT" className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold">Rifiuta</button></div>
                </form>
              </section>
            ) : null}

            {canReschedule && (activeBoats ?? []).length && (activeOfferings ?? []).length && (activeLocations ?? []).length ? (
              <details className="rounded-3xl border border-[#CFC8FF] bg-white p-6 shadow-sm">
                <summary className="cursor-pointer text-lg font-semibold text-[#4C3FC2]">Riprogramma prenotazione</summary>
                <p className="mt-2 text-sm leading-6 text-[#676B80]">Cambia barca, formula, sede, date, valore o note senza perdere lo storico originale.</p>
                <RescheduleBookingForm
                  operatorId={operator.id}
                  bookingId={booking.id}
                  boats={(activeBoats ?? []).map((item) => ({ id: item.id, name: item.name, passengerLimit: item.operator_passenger_limit }))}
                  offerings={(activeOfferings ?? []).map((item) => ({ id: item.id, boatId: item.boat_id, label: `${item.legal_type} · ${item.skipper_mode}` }))}
                  locations={(activeLocations ?? []).map((item) => ({ id: item.id, label: `${item.name}${item.city ? ` · ${item.city}` : ""}` }))}
                  initial={{
                    boatId: booking.boat_id,
                    offeringId: booking.legal_offering_id,
                    locationId: booking.pickup_location_id,
                    startsAtLocal: localDateTimeInTimeZone(booking.starts_at, operator.timezone),
                    endsAtLocal: localDateTimeInTimeZone(booking.ends_at, operator.timezone),
                    passengerCount: booking.passenger_count,
                    total: ((booking.customer_total_cents_snapshot ?? 0) / 100).toFixed(2).replace(".", ","),
                    operatorNote: booking.operator_note ?? "",
                  }}
                />
              </details>
            ) : null}

            {["CONFIRMED", "IN_PROGRESS"].includes(booking.status) ? (
              <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Stato operativo</h2>
                <form action={changeBookingStatus} className="mt-4 space-y-3">
                  <input type="hidden" name="operator_id" value={operator.id} />
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <textarea name="note" rows={2} placeholder="Nota opzionale" className="w-full rounded-xl border border-[#DEE5E8] px-3 py-2 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    {booking.status === "CONFIRMED" ? <button name="target_status" value="IN_PROGRESS" className="rounded-xl bg-[#6D5DFB] px-4 py-2 text-sm font-semibold text-white">Avvia</button> : null}
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
