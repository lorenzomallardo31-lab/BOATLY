import AdminNav from "@/components/admin/admin-nav";
import { requirePlatformContext } from "@/lib/admin/context";

import { createMarketplaceRefund } from "./actions";

type FinancePageProps = {
  searchParams: Promise<{
    refund?: string;
    error?: string;
  }>;
};

const REFUNDABLE_BOOKING_STATUSES = new Set([
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_OPERATOR",
  "CANCELLED_BY_BOATLY",
  "REFUND_PENDING",
  "PARTIALLY_REFUNDED",
]);

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function amountInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function errorMessage(code?: string) {
  const messages: Record<string, string> = {
    "refund-input-invalid":
      "Inserisci importo, motivazione e conferma esplicita.",
    booking_not_refundable:
      "La prenotazione deve essere cancellata o già in rimborso.",
    refundable_payment_not_found:
      "Non esiste un pagamento Stripe rimborsabile per questa prenotazione.",
    payment_already_fully_refunded:
      "Il pagamento è già stato rimborsato integralmente.",
    refund_amount_exceeds_remaining:
      "L’importo supera il residuo ancora rimborsabile.",
    refund_amount_invalid: "L’importo del rimborso non è valido.",
    refund_reason_required: "La motivazione finanziaria è obbligatoria.",
    refund_not_retryable:
      "Il rimborso non è più in uno stato che consente il retry.",
    "stripe-refund-failed":
      "Stripe non ha accettato il rimborso. Nessun nuovo rimborso è stato registrato.",
    "refund-record-failed":
      "Stripe ha ricevuto la richiesta, ma Boatly non ha registrato la risposta. Riprova: l’idempotenza impedisce un doppio rimborso.",
    "refund-setup-failed": "Non è stato possibile preparare il rimborso.",
    "refund-setup-invalid": "La risposta finanziaria non è valida.",
  };

  return code ? messages[code] ?? "Operazione di rimborso non riuscita." : null;
}

export default async function AdminFinancePage({
  searchParams,
}: FinancePageProps) {
  const query = await searchParams;
  const { supabase } = await requirePlatformContext(["SUPER_ADMIN"]);

  const [accounts, payments, refunds, payouts] = await Promise.all([
    supabase
      .from("stripe_connected_accounts")
      .select(
        "id, operator_id, stripe_account_id, status, charges_enabled, payouts_enabled, details_submitted, last_synced_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("payments")
      .select(
        "id, operator_id, booking_id, status, amount_cents, amount_received_cents, amount_refunded_cents, platform_fee_cents, currency, reconciliation_status, reconciliation_note, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("refunds")
      .select(
        "id, operator_id, booking_id, payment_id, amount_cents, currency, status, reason_code, provider_status_raw, reconciliation_status, reconciliation_note, created_at, succeeded_at, failed_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("payouts")
      .select(
        "id, operator_id, amount_cents, currency, status, reconciliation_status, arrival_date, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const firstError = [accounts, payments, refunds, payouts].find(
    (result) => result.error,
  )?.error;

  if (firstError) {
    throw new Error("Unable to load finance dashboard: " + firstError.message);
  }

  const paymentRows = payments.data ?? [];
  const refundRows = refunds.data ?? [];
  const bookingIds = [...new Set(paymentRows.map((payment) => payment.booking_id))];
  const bookingById = new Map<
    string,
    { reference: string | null; status: string }
  >();

  if (bookingIds.length > 0) {
    const { data: bookingRows, error: bookingError } = await supabase
      .from("bookings")
      .select("id, reference, status")
      .in("id", bookingIds);

    if (bookingError) {
      throw new Error("Unable to load finance bookings: " + bookingError.message);
    }

    for (const booking of bookingRows ?? []) {
      bookingById.set(booking.id, {
        reference: booking.reference,
        status: booking.status,
      });
    }
  }

  const netReceived = paymentRows.reduce(
    (sum, payment) =>
      sum + payment.amount_received_cents - payment.amount_refunded_cents,
    0,
  );
  const grossFees = paymentRows.reduce(
    (sum, payment) => sum + payment.platform_fee_cents,
    0,
  );
  const mismatches = [
    ...paymentRows,
    ...refundRows,
    ...(payouts.data ?? []),
  ].filter((row) => row.reconciliation_status === "MISMATCH").length;
  const feedback = errorMessage(query.error);

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <AdminNav />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-[#14B8A6]">
          Financial operations
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Finance</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748B]">
          I rimborsi partono soltanto da questa area autorizzata. Stripe esegue
          il movimento e il webhook verificato aggiorna lo stato definitivo.
        </p>

        {query.refund === "requested" ? (
          <div className="mt-6 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Rimborso richiesto.</strong> Lo stato definitivo verrà
            riconciliato dal webhook Stripe.
          </div>
        ) : null}

        {feedback ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {feedback}
          </div>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Incasso netto registrato", money(netReceived, "EUR")],
            ["Fee lorde registrate", money(grossFees, "EUR")],
            ["Mismatch", String(mismatches)],
            ["Connect account", String((accounts.data ?? []).length)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-[#DEE5E8] bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase text-[#64748B]">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Pagamenti e rimborsi</h2>
          <div className="mt-4 divide-y divide-[#DEE5E8]">
            {paymentRows.map((payment) => {
              const booking = bookingById.get(payment.booking_id);
              const remaining = Math.max(
                0,
                payment.amount_received_cents - payment.amount_refunded_cents,
              );
              const canRefund =
                remaining > 0 &&
                ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status) &&
                Boolean(
                  booking && REFUNDABLE_BOOKING_STATUSES.has(booking.status),
                );

              return (
                <article key={payment.id} className="py-5">
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
                    <div>
                      <p className="text-sm font-semibold">
                        {money(payment.amount_received_cents, payment.currency)}
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {booking?.reference ?? payment.booking_id}
                      </p>
                    </div>
                    <p className="text-sm">
                      {payment.status}
                      {booking ? " · " + booking.status : ""}
                    </p>
                    <p className="text-sm">
                      Reconciliation:{" "}
                      <strong>{payment.reconciliation_status}</strong>
                    </p>
                    <div className="text-right text-xs text-[#64748B]">
                      <p>Residuo {money(remaining, payment.currency)}</p>
                      <p className="mt-1">
                        Fee {money(payment.platform_fee_cents, payment.currency)}
                      </p>
                    </div>
                  </div>

                  {canRefund ? (
                    <form
                      action={createMarketplaceRefund}
                      className="mt-5 grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:items-end"
                    >
                      <input
                        type="hidden"
                        name="booking_id"
                        value={payment.booking_id}
                      />
                      <label className="text-xs font-semibold text-amber-950">
                        Importo da rimborsare
                        <input
                          name="amount"
                          inputMode="decimal"
                          required
                          defaultValue={amountInput(remaining)}
                          className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="text-xs font-semibold text-amber-950">
                        Motivazione finanziaria
                        <input
                          name="reason"
                          required
                          maxLength={500}
                          placeholder="Es. cancellazione approvata secondo policy"
                          className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                      <div>
                        <label className="flex items-center gap-2 text-xs text-amber-950">
                          <input
                            type="checkbox"
                            name="confirm"
                            value="CONFIRM"
                            required
                          />
                          Confermo il rimborso reale
                        </label>
                        <button className="mt-2 w-full rounded-xl bg-[#0B1F33] px-4 py-2 text-sm font-semibold text-white">
                          Esegui rimborso
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Rimborsi</h2>
            <div className="mt-4 space-y-3">
              {refundRows.map((refund) => (
                <div
                  key={refund.id}
                  className="rounded-2xl bg-[#F1F5F4] p-4 text-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <strong>
                        {money(refund.amount_cents, refund.currency)}
                      </strong>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {bookingById.get(refund.booking_id)?.reference ??
                          refund.booking_id}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">
                      {refund.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#64748B]">
                    Reconciliation: {refund.reconciliation_status}
                  </p>
                  {refund.reconciliation_note ? (
                    <p className="mt-2 text-xs text-red-700">
                      {refund.reconciliation_note}
                    </p>
                  ) : null}
                  {["PENDING", "REQUIRES_ACTION"].includes(refund.status) ? (
                    <form
                      action={createMarketplaceRefund}
                      className="mt-3 rounded-xl border border-amber-200 bg-white p-3"
                    >
                      <input type="hidden" name="refund_id" value={refund.id} />
                      <label className="flex items-center gap-2 text-xs text-amber-950">
                        <input
                          type="checkbox"
                          name="confirm"
                          value="CONFIRM"
                          required
                        />
                        Confermo il retry della stessa richiesta
                      </label>
                      <button className="mt-2 rounded-lg bg-[#0B1F33] px-3 py-2 text-xs font-semibold text-white">
                        Riprova in modo idempotente
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
              {refundRows.length === 0 ? (
                <p className="text-sm text-[#64748B]">Nessun rimborso.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Payout</h2>
            <div className="mt-4 space-y-3">
              {(payouts.data ?? []).map((payout) => (
                <div
                  key={payout.id}
                  className="rounded-2xl bg-[#F1F5F4] p-4 text-sm"
                >
                  <strong>{money(payout.amount_cents, payout.currency)}</strong>
                  {" · " + payout.status}
                  <p className="mt-1 text-xs text-[#64748B]">
                    Arrivo {payout.arrival_date ?? "—"} ·{" "}
                    {payout.reconciliation_status}
                  </p>
                </div>
              ))}
              {(payouts.data ?? []).length === 0 ? (
                <p className="text-sm text-[#64748B]">Nessun payout.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
