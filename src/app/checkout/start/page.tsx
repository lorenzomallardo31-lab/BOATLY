import { randomUUID } from "node:crypto";

import Link from "next/link";
import { redirect } from "next/navigation";

import MarketplaceHeader from "@/components/marketplace/marketplace-header";
import { stripeServerConfigured } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

import CheckoutPriceSummary from "./checkout-price-summary";
import { startMarketplaceCheckout } from "./actions";

type CheckoutPageProps = {
  searchParams: Promise<{
    boat?: string;
    date?: string;
    passengers?: string;
    error?: string;
  }>;
};

type CheckoutOption = {
  rate_plan_id: string;
  rate_plan_name: string;
  legal_offering_id: string;
  legal_type: string;
  skipper_mode: string;
  self_drive_allowed: boolean;
  minimum_driver_age: number | null;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  rental_price_cents: number;
  currency: string;
};

type CheckoutExtra = {
  extra_id: string;
  name: string;
  description: string | null;
  pricing_unit: string;
  price_cents: number;
  max_quantity: number | null;
};

type CheckoutData = {
  boat: {
    id: string;
    operator_id: string;
    name: string;
    slug: string;
    operator_name: string;
    passenger_limit: number;
    license_required: boolean | null;
    location_id: string;
    location_name: string;
    location_city: string | null;
    timezone: string;
    currency: string;
  };
  booking_date: string;
  passengers: number;
  booking_terms_ready: boolean;
  booking_terms_version_id: string | null;
  booking_terms: {
    id: string;
    title: string;
    version: string;
    document_key: string;
  } | null;
  commercial_ready: boolean;
  commercial: {
    ready: boolean;
    reason?: string;
    plan_code?: string;
  };
  stripe_ready: boolean;
  options: CheckoutOption[];
  extras: CheckoutExtra[];
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

function money(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(value));
}

function durationLabel(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "ora" : "ore"}`;
  }

  return `${minutes} min`;
}

function pricingUnitLabel(value: string) {
  const labels: Record<string, string> = {
    FIXED: "fisso",
    PER_PERSON: "per persona",
    PER_HOUR: "per ora",
    PER_DAY: "per giorno",
    PER_UNIT: "per unità",
  };

  return labels[value] ?? value;
}

function errorMessage(error?: string) {
  const messages: Record<string, string> = {
    "invalid-checkout": "I dati del checkout non sono validi.",
    "customer-name-required": "Inserisci nome e cognome.",
    "terms-required": "Devi accettare i termini di prenotazione per continuare.",
    "stripe-server-not-configured":
      "I pagamenti Boatly non sono ancora configurati su questo ambiente.",
    "slot-not-available":
      "Questo intervallo non è più disponibile. Seleziona nuovamente una soluzione.",
    "too-many-holds":
      "Hai già più checkout temporanei aperti. Attendi la loro scadenza o completa uno dei pagamenti.",
    "cancellation-policy-missing":
      "L'operatore deve completare la politica di cancellazione prima di accettare prenotazioni.",
    "commercial-not-ready":
      "Il piano commerciale dell'operatore non è ancora pronto per le prenotazioni marketplace.",
    "stripe-account-not-ready":
      "L'account pagamenti dell'operatore non è ancora pronto.",
    "driver-not-allowed":
      "La modalità selezionata non consente che il cliente conduca direttamente la barca.",
    "skipper-not-available":
      "La modalità selezionata non prevede uno skipper disponibile: il cliente deve risultare conducente quando consentito.",
    "driver-age-required": "Inserisci la data di nascita del conducente.",
    "driver-age-not-met": "Il conducente non soddisfa l'età minima prevista.",
    "license-required":
      "Per questa configurazione devi confermare il possesso della patente richiesta.",
    "invalid-extra-quantity": "La quantità scelta per uno degli extra non è valida.",
    "invalid-payment-amount": "Il totale della prenotazione deve essere maggiore di zero per procedere al pagamento.",
    "payment-setup-failed": "Non è stato possibile preparare il pagamento.",
    "stripe-checkout-failed":
      "Non è stato possibile aprire il checkout Stripe. Nessun addebito è stato effettuato.",
    "booking-create-failed": "Non è stato possibile creare la prenotazione.",
  };

  return error ? messages[error] ?? "Si è verificato un errore nel checkout." : null;
}

export const metadata = {
  title: "Checkout",
  description: "Completa la tua prenotazione Boatly.",
};

export default async function CheckoutStartPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const boat = params.boat?.trim() ?? "";
  const date = params.date?.trim() ?? "";
  const passengers = Math.max(1, Number(params.passengers) || 0);

  if (!boat || !/^\d{4}-\d{2}-\d{2}$/.test(date) || passengers <= 0) {
    redirect("/cerca");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    const next = `/checkout/start?${new URLSearchParams({
      boat,
      date,
      passengers: String(passengers),
    }).toString()}`;

    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  const userId = claimsData.claims.sub;

  const [{ data: optionsData, error: optionsError }, { data: profileRow }] =
    await Promise.all([
      supabase.rpc("marketplace_checkout_options", {
        p_boat_slug: boat,
        p_booking_date: date,
        p_passengers: passengers,
      }),
      supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  if (optionsError || !optionsData || typeof optionsData !== "object") {
    throw new Error(`Unable to prepare checkout: ${optionsError?.message ?? "unknown error"}`);
  }

  const checkout = optionsData as CheckoutData;
  const profile = (profileRow ?? null) as ProfileRow | null;
  const providerServerReady = stripeServerConfigured();
  const configurationReady =
    checkout.booking_terms_ready &&
    checkout.commercial_ready &&
    checkout.stripe_ready &&
    providerServerReady;
  const error = errorMessage(params.error);
  const checkoutRequestId = randomUUID();

  return (
    <main className="min-h-screen bg-[#FCFBF8] text-[#0B1F33]">
      <MarketplaceHeader />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-[#14B8A6]">Checkout sicuro</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {checkout.boat.name}
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              {[checkout.boat.location_name, checkout.boat.location_city]
                .filter(Boolean)
                .join(" · ")}
              {` · ${passengers} ${passengers === 1 ? "persona" : "persone"}`}
            </p>
          </div>

          <Link
            href={`/barche/${encodeURIComponent(checkout.boat.slug)}`}
            className="rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm font-semibold"
          >
            ← Torna alla barca
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {!configurationReady ? (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h2 className="font-semibold">Checkout non ancora abilitato</h2>
            <p className="mt-2 text-sm leading-6">
              La pagina è pronta, ma Boatly blocca correttamente i pagamenti finché tutti i prerequisiti commerciali, legali e Stripe non sono configurati.
            </p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p>{checkout.booking_terms_ready ? "✓" : "○"} Termini di prenotazione pubblicati</p>
              <p>{checkout.commercial_ready ? "✓" : "○"} Piano e commissione configurati</p>
              <p>{checkout.stripe_ready ? "✓" : "○"} Account Stripe Connect operatore pronto</p>
              <p>{providerServerReady ? "✓" : "○"} Segreti Stripe/server configurati</p>
            </div>
          </section>
        ) : null}

        <form action={startMarketplaceCheckout} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <input type="hidden" name="boat" value={boat} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="passengers" value={passengers} />
          <input type="hidden" name="checkout_request_id" value={checkoutRequestId} />

          <div className="space-y-6">
            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#14B8A6]">1. Soluzione</p>
              <h2 className="mt-2 text-xl font-semibold">Scegli orario e formula</h2>

              {checkout.options.length === 0 ? (
                <div className="mt-5 rounded-xl bg-[#F1F5F4] p-4 text-sm text-[#64748B]">
                  Nessuna soluzione disponibile per questa data.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {checkout.options.map((option, index) => (
                    <label
                      key={`${option.rate_plan_id}-${option.legal_offering_id}-${option.starts_at}`}
                      className="flex cursor-pointer items-start gap-4 rounded-2xl border border-[#DEE5E8] p-4 hover:border-[#14B8A6]"
                    >
                      <input
                        type="radio"
                        name="booking_option"
                        value={`${option.rate_plan_id}|${option.legal_offering_id}|${option.starts_at}|${option.ends_at}`}
                        defaultChecked={index === 0}
                        required
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{option.rate_plan_name}</p>
                            <p className="mt-1 text-sm text-[#64748B]">
                              {dateTime(option.starts_at)} → {dateTime(option.ends_at)}
                            </p>
                            <p className="mt-1 text-xs text-[#64748B]">
                              {durationLabel(option.duration_minutes)} · {option.legal_type.replaceAll("_", " ")}
                            </p>
                          </div>
                          <p className="text-lg font-semibold">
                            {money(option.rental_price_cents, option.currency)}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {checkout.extras.length > 0 ? (
              <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-[#14B8A6]">2. Extra</p>
                <h2 className="mt-2 text-xl font-semibold">Personalizza l’esperienza</h2>

                <div className="mt-5 space-y-3">
                  {checkout.extras.map((extra) => (
                    <div key={extra.extra_id} className="rounded-2xl border border-[#DEE5E8] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <label className="flex flex-1 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            name={`extra_${extra.extra_id}`}
                            className="mt-1 h-4 w-4"
                          />
                          <div>
                            <p className="font-semibold">{extra.name}</p>
                            {extra.description ? (
                              <p className="mt-1 text-sm text-[#64748B]">{extra.description}</p>
                            ) : null}
                            <p className="mt-2 text-sm font-medium">
                              {money(extra.price_cents, checkout.boat.currency)} · {pricingUnitLabel(extra.pricing_unit)}
                            </p>
                          </div>
                        </label>

                        {extra.pricing_unit === "PER_PERSON" || extra.pricing_unit === "PER_UNIT" ? (
                          <label className="text-xs font-medium text-[#64748B]">
                            Quantità
                            <input
                              type="number"
                              name={`quantity_${extra.extra_id}`}
                              min={1}
                              max={extra.max_quantity ?? undefined}
                              defaultValue={1}
                              className="mt-1 block w-20 rounded-lg border border-[#DEE5E8] px-3 py-2 text-[#0B1F33]"
                            />
                          </label>
                        ) : (
                          <input type="hidden" name={`quantity_${extra.extra_id}`} value="1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#14B8A6]">3. Dati cliente</p>
              <h2 className="mt-2 text-xl font-semibold">Chi effettua la prenotazione</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Nome *
                  <input
                    name="first_name"
                    required
                    defaultValue={profile?.first_name ?? ""}
                    className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium">
                  Cognome *
                  <input
                    name="last_name"
                    required
                    defaultValue={profile?.last_name ?? ""}
                    className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium">
                  Telefono
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={profile?.phone ?? ""}
                    className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium">
                  Data di nascita del conducente
                  <input
                    name="date_of_birth"
                    type="date"
                    className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Conduci personalmente la barca?
                  <select
                    name="driver_is_customer"
                    defaultValue="true"
                    className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  >
                    <option value="true">Sì</option>
                    <option value="false">No</option>
                  </select>
                </label>

                <label className="flex items-start gap-3 rounded-xl bg-[#F1F5F4] p-4 text-sm">
                  <input
                    type="checkbox"
                    name="driver_has_required_license"
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    Confermo di possedere l’eventuale patente nautica richiesta dalla configurazione scelta.
                  </span>
                </label>
              </div>

              <label className="mt-5 block text-sm font-medium">
                Nota per l’operatore
                <textarea
                  name="customer_note"
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  placeholder="Richieste o informazioni utili"
                />
              </label>
            </section>

            <section className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#14B8A6]">4. Condizioni</p>
              <h2 className="mt-2 text-xl font-semibold">Conferme prima del pagamento</h2>

              <label className="mt-5 flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  name="terms_accepted"
                  required
                  className="mt-1 h-4 w-4"
                />
                <span>
                  Accetto {checkout.booking_terms?.title ?? "i termini di prenotazione Boatly"}
                  {checkout.booking_terms?.version
                    ? `, versione ${checkout.booking_terms.version}`
                    : ""}
                  .
                </span>
              </label>

              <p className="mt-4 text-xs leading-5 text-[#64748B]">
                L’accettazione viene registrata lato server insieme alla versione del documento. I requisiti di guida restano soggetti alle condizioni effettive dell’unità e alla verifica dell’operatore.
              </p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-[#DEE5E8] bg-white p-6 shadow-lg">
              <p className="text-sm font-semibold text-[#14B8A6]">Riepilogo</p>
              <h2 className="mt-2 text-xl font-semibold">{checkout.boat.name}</h2>
              <p className="mt-2 text-sm text-[#64748B]">
                {date} · {passengers} {passengers === 1 ? "persona" : "persone"}
              </p>

              {checkout.options[0] ? (
                <CheckoutPriceSummary
                  options={checkout.options.map((option) => ({
                    value: `${option.rate_plan_id}|${option.legal_offering_id}|${option.starts_at}|${option.ends_at}`,
                    rentalPriceCents: option.rental_price_cents,
                    durationMinutes: option.duration_minutes,
                    currency: option.currency,
                  }))}
                  extras={checkout.extras.map((extra) => ({
                    id: extra.extra_id,
                    name: extra.name,
                    priceCents: extra.price_cents,
                    pricingUnit: extra.pricing_unit,
                  }))}
                  fallbackCurrency={checkout.boat.currency}
                />
              ) : null}

              <button
                type="submit"
                disabled={!configurationReady || checkout.options.length === 0}
                className="mt-6 w-full rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Vai al pagamento sicuro
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-[#64748B]">
                Dopo il click Boatly crea un hold temporaneo. La prenotazione diventa confermata solo dopo un evento Stripe verificato.
              </p>
            </div>
          </aside>
        </form>
      </section>
    </main>
  );
}
