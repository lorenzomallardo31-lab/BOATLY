import Link from "next/link";
import { redirect } from "next/navigation";

import MarketplaceHeader from "@/components/marketplace/marketplace-header";
import { createClient } from "@/lib/supabase/server";

type CustomerBooking = {
  id: string;
  reference: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  passenger_count: number;
  currency: string | null;
  customer_total_cents: number | null;
  boat: {
    name?: string;
    slug?: string;
    manufacturer?: string;
    model?: string;
  };
  location: {
    name?: string;
    city?: string;
  };
  created_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  has_pending_cancellation_request?: boolean;
  is_upcoming: boolean;
};

function money(cents: number | null, currency = "EUR") {
  if (cents === null) {
    return "—";
  }

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function bookingDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
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

export const metadata = {
  title: "Le mie prenotazioni",
  description: "Gestisci le tue prenotazioni Boatly.",
};

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect("/sign-in?next=/prenotazioni");
  }

  const { data, error } = await supabase.rpc("customer_bookings");

  if (error) {
    throw new Error(`Unable to load customer bookings: ${error.message}`);
  }

  const bookings = (Array.isArray(data) ? data : []) as CustomerBooking[];
  const upcoming = bookings.filter((booking) => booking.is_upcoming);
  const history = bookings.filter((booking) => !booking.is_upcoming);

  const renderBooking = (booking: CustomerBooking) => (
    <article
      key={booking.id}
      className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">
            {booking.reference ?? "Prenotazione Boatly"}
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {booking.boat?.name ?? "Barca"}
          </h2>
          <p className="mt-1 text-sm text-[#64748B]">
            {[booking.location?.name, booking.location?.city]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <span className="rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">
          {statusLabel(booking.status)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-[#475569] sm:grid-cols-3">
        <p>
          <strong className="block text-[#0B1F33]">Inizio</strong>
          {bookingDate(booking.starts_at)}
        </p>
        <p>
          <strong className="block text-[#0B1F33]">Persone</strong>
          {booking.passenger_count}
        </p>
        <p>
          <strong className="block text-[#0B1F33]">Totale</strong>
          {money(booking.customer_total_cents, booking.currency ?? "EUR")}
        </p>
      </div>

      {booking.has_pending_cancellation_request ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900">
          Richiesta di cancellazione in valutazione.
        </p>
      ) : null}

      <div className="mt-5 border-t border-[#DEE5E8] pt-5">
        <Link
          href={`/prenotazioni/${booking.id}`}
          className="inline-flex rounded-xl border border-[#DEE5E8] px-4 py-3 text-sm font-semibold hover:bg-[#F1F5F4]"
        >
          Dettagli prenotazione
        </Link>
      </div>
    </article>
  );

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <MarketplaceHeader />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">Area cliente</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Le mie prenotazioni
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              Pagamenti, dettagli del viaggio e richieste di cancellazione in un unico posto.
            </p>
          </div>

          <Link
            href="/cerca"
            className="rounded-xl bg-[#0B1F33] px-5 py-3 text-sm font-semibold text-white"
          >
            Cerca una barca
          </Link>
        </div>

        {bookings.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-[#DEE5E8] bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">Nessuna prenotazione</h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Quando prenoterai una barca, troverai qui tutti i dettagli.
            </p>
            <Link
              href="/cerca"
              className="mt-6 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Esplora Boatly
            </Link>
          </section>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <h2 className="text-2xl font-semibold">Prossime e in corso</h2>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {upcoming.length > 0 ? (
                  upcoming.map(renderBooking)
                ) : (
                  <p className="text-sm text-[#64748B]">Nessuna prenotazione futura.</p>
                )}
              </div>
            </section>

            {history.length > 0 ? (
              <section>
                <h2 className="text-2xl font-semibold">Storico</h2>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  {history.map(renderBooking)}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
