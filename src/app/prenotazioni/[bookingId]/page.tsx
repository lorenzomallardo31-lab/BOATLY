import Link from "next/link";
import { redirect } from "next/navigation";

import MarketplaceHeader from "@/components/marketplace/marketplace-header";
import { createClient } from "@/lib/supabase/server";

import { requestBookingCancellation } from "./actions";

type BookingDetailPageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{
    checkout?: string;
    requested?: string;
    error?: string;
  }>;
};

type BookingDetail = {
  id: string;
  reference: string | null;
  status: string;
  source: string;
  starts_at: string;
  ends_at: string;
  passenger_count: number;
  driver_is_customer: boolean;
  customer_note: string | null;
  currency: string;
  rental_subtotal_cents: number;
  extras_total_cents: number;
  discount_total_cents: number;
  tax_total_cents: number;
  customer_total_cents: number;
  security_deposit_cents: number;
  boat: Record<string, unknown>;
  location: Record<string, unknown>;
  legal_offering: Record<string, unknown>;
  cancellation_policy: {
    name?: string;
    description?: string;
    rules?: Array<Record<string, unknown>>;
  };
  extras: Array<{
    id: string;
    name: string;
    pricing_unit: string;
    quantity: number;
    unit_price_cents: number;
    total_price_cents: number;
  }>;
  price_items: Array<{
    id: string;
    type: string;
    label: string;
    quantity: number;
    unit_amount_cents: number | null;
    amount_cents: number;
  }>;
  cancellation_request?: {
    id: string;
    status: string;
    reason: string | null;
    estimated_refund_cents: number;
    currency: string;
    requested_at: string;
    resolved_at?: string | null;
    resolution_note?: string | null;
  } | null;
  created_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  can_request_cancellation: boolean;
};

type BookingRefund = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  succeeded_at?: string | null;
  failed_at?: string | null;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Bozza",
    PENDING_PAYMENT: "In attesa di pagamento",
    PAYMENT_PROCESSING: "Pagamento in elaborazione",
    CONFIRMED: "Confermata",
    IN_PROGRESS: "In corso",
    COMPLETED: "Completata",
    CANCELLED_BY_CUSTOMER: "Cancellata dal cliente",
    CANCELLED_BY_OPERATOR: "Cancellata dall'operatore",
    CANCELLED_BY_BOATLY: "Cancellata da Boatly",
    PAYMENT_FAILED: "Pagamento non completato",
    REFUND_PENDING: "Rimborso in elaborazione",
    REFUNDED: "Rimborsata",
    PARTIALLY_REFUNDED: "Rimborso parziale",
    NO_SHOW: "No show",
  };

  return labels[status] ?? status;
}

function errorMessage(error?: string) {
  const values: Record<string, string> = {
    "not-cancellable": "Questa prenotazione non può essere cancellata tramite questo flusso.",
    "already-started": "La prenotazione è già iniziata.",
    "already-pending": "Esiste già una richiesta di cancellazione in valutazione.",
    "cancellation-failed": "Non è stato possibile inviare la richiesta di cancellazione.",
  };

  return error ? values[error] ?? "Operazione non riuscita." : null;
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: BookingDetailPageProps) {
  const { bookingId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(`/sign-in?next=${encodeURIComponent(`/prenotazioni/${bookingId}`)}`);
  }

  const [
    { data, error },
    { data: refundData, error: refundError },
  ] = await Promise.all([
    supabase.rpc("customer_booking_detail", {
      p_booking_id: bookingId,
    }),
    supabase.rpc("customer_booking_refunds", {
      p_booking_id: bookingId,
    }),
  ]);

  if (
    error ||
    refundError ||
    !data ||
    typeof data !== "object" ||
    !Array.isArray(refundData)
  ) {
    redirect("/prenotazioni");
  }

  const booking = data as BookingDetail;
  const refunds = refundData as BookingRefund[];
  const boatName =
    typeof booking.boat.name === "string" ? booking.boat.name : "Barca";
  const boatSlug =
    typeof booking.boat.slug === "string" ? booking.boat.slug : null;
  const locationName =
    typeof booking.location.name === "string" ? booking.location.name : null;
  const locationCity =
    typeof booking.location.city === "string" ? booking.location.city : null;
  const canRequestCancellation = booking.can_request_cancellation;
  const errorText = errorMessage(query.error);

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <MarketplaceHeader />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">
              {booking.reference ?? "Prenotazione Boatly"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {boatName}
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              {[locationName, locationCity].filter(Boolean).join(" · ")}
            </p>
          </div>

          <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
            {statusLabel(booking.status)}
          </span>
        </div>

        {query.checkout === "success" ? (
          <div className="mt-6 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-5 text-sm">
            <strong>Pagamento inviato.</strong>{" "}
            Boatly confermerà la prenotazione solo dopo la verifica server-side dell&apos;evento Stripe. Se lo stato è ancora in elaborazione, aggiorna la pagina tra pochi secondi.
          </div>
        ) : null}

        {query.checkout === "cancelled" ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            Il checkout è stato interrotto. Nessun ritorno dal browser può confermare una prenotazione.
          </div>
        ) : null}

        {query.requested === "1" ? (
          <div className="mt-6 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-5 text-sm">
            Richiesta di cancellazione inviata all&apos;operatore.
          </div>
        ) : null}

        {errorText ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {errorText}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Dettagli viaggio</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Inizio</p>
                  <p className="mt-1 font-semibold">{dateTime(booking.starts_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Fine</p>
                  <p className="mt-1 font-semibold">{dateTime(booking.ends_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Persone</p>
                  <p className="mt-1 font-semibold">{booking.passenger_count}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#64748B]">Conducente</p>
                  <p className="mt-1 font-semibold">
                    {booking.driver_is_customer ? "Cliente" : "Configurazione con altro conducente/skipper"}
                  </p>
                </div>
              </div>

              {booking.customer_note ? (
                <div className="mt-5 rounded-xl bg-[#F1F5F4] p-4 text-sm text-[#475569]">
                  <strong>Nota:</strong> {booking.customer_note}
                </div>
              ) : null}
            </section>

            {booking.extras.length > 0 ? (
              <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Extra</h2>
                <div className="mt-4 space-y-3">
                  {booking.extras.map((extra) => (
                    <div key={extra.id} className="flex items-center justify-between gap-4 border-b border-[#DEE5E8] pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{extra.name}</p>
                        <p className="text-xs text-[#64748B]">Quantità {extra.quantity}</p>
                      </div>
                      <p className="font-semibold">{money(extra.total_price_cents, booking.currency)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Politica di cancellazione</h2>
              <p className="mt-3 font-medium">
                {booking.cancellation_policy?.name ?? "Politica applicabile alla prenotazione"}
              </p>
              {booking.cancellation_policy?.description ? (
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  {booking.cancellation_policy.description}
                </p>
              ) : null}
            </section>

            {booking.cancellation_request ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-xl font-semibold">Richiesta di cancellazione</h2>
                <p className="mt-2 text-sm text-amber-950/80">
                  Stato: <strong>{booking.cancellation_request.status}</strong>
                </p>
                <p className="mt-2 text-sm text-amber-950/80">
                  Rimborso commerciale stimato: <strong>{money(booking.cancellation_request.estimated_refund_cents, booking.cancellation_request.currency)}</strong>
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-950/70">
                  La cifra è una stima basata sullo snapshot della politica applicata alla prenotazione. Eventuali diritti inderogabili, condizioni meteo/sicurezza o altre eccezioni sono gestiti separatamente.
                </p>
              </section>
            ) : null}

            {refunds.length > 0 ? (
              <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Rimborsi</h2>
                <div className="mt-4 space-y-3">
                  {refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F1F5F4] p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {money(refund.amount_cents, refund.currency)}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          Richiesto il {dateTime(refund.created_at)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold">
                        {refund.status === "SUCCEEDED"
                          ? "Rimborsato"
                          : refund.status === "FAILED"
                            ? "Da verificare"
                            : "In elaborazione"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-[#64748B]">
                  Dopo la conferma possono essere necessari alcuni giorni
                  lavorativi perché l&apos;importo sia visibile sul metodo di
                  pagamento originario.
                </p>
              </section>
            ) : null}

            {canRequestCancellation ? (
              <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Richiedi cancellazione</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  La richiesta non libera automaticamente la barca e non avvia un rimborso dal browser. Verrà elaborata tramite il workflow Boatly.
                </p>

                <form action={requestBookingCancellation} className="mt-5">
                  <input type="hidden" name="booking_id" value={booking.id} />
                  <label className="block text-sm font-medium">
                    Motivo facoltativo
                    <textarea
                      name="reason"
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-4 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Invia richiesta
                  </button>
                </form>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold">Riepilogo prezzo</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">Noleggio</span>
                  <span>{money(booking.rental_subtotal_cents, booking.currency)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">Extra</span>
                  <span>{money(booking.extras_total_cents, booking.currency)}</span>
                </div>
                {booking.discount_total_cents ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-[#64748B]">Sconti</span>
                    <span>-{money(booking.discount_total_cents, booking.currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 border-t border-[#DEE5E8] pt-4 text-base font-semibold">
                  <span>Totale</span>
                  <span>{money(booking.customer_total_cents, booking.currency)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link
                  href="/prenotazioni"
                  className="block rounded-xl border border-[#DEE5E8] px-4 py-3 text-center text-sm font-semibold hover:bg-[#F1F5F4]"
                >
                  Tutte le prenotazioni
                </Link>
                {boatSlug ? (
                  <Link
                    href={`/barche/${boatSlug}`}
                    className="block rounded-xl bg-[#0B1F33] px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Vedi la barca
                  </Link>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
