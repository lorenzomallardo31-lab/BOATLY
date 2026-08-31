import Link from "next/link";

import OperatorNav from "@/components/operator/operator-nav";
import { isDateKey, todayInTimeZone } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

import { ManualBookingForm } from "./manual-booking-form";

type PageProps = {
  searchParams: Promise<{
    operator?: string;
    date?: string;
    boat?: string;
    customer?: string;
  }>;
};

function offeringLabel(legalType: string, skipperMode: string) {
  const legalLabels: Record<string, string> = {
    LOCAZIONE: "Locazione",
    NOLEGGIO: "Noleggio",
    CHARTER: "Charter",
  };
  const skipperLabels: Record<string, string> = {
    WITHOUT_SKIPPER: "senza skipper",
    WITH_SKIPPER: "con skipper",
    OPTIONAL_SKIPPER: "skipper opzionale",
  };
  return `${legalLabels[legalType] ?? legalType} · ${skipperLabels[skipperMode] ?? skipperMode}`;
}

export default async function NewManualBookingPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { supabase, operator } = await requireOperatorWorkspaceContext(query.operator);

  const [
    { data: boats, error: boatsError },
    { data: locations, error: locationsError },
    { data: customers, error: customersError },
    { data: skippers, error: skippersError },
  ] = await Promise.all([
    supabase
      .from("boats")
      .select("id, name, status, operator_passenger_limit")
      .eq("operator_id", operator.id)
      .eq("status", "ACTIVE")
      .order("name"),
    supabase
      .from("operator_locations")
      .select("id, name, city")
      .eq("operator_id", operator.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false }),
    supabase
      .from("operator_customers")
      .select("id, display_name, email, phone")
      .eq("operator_id", operator.id)
      .order("display_name")
      .limit(500),
    supabase
      .from("operator_internal_skippers")
      .select("id, display_name, phone")
      .eq("operator_id", operator.id)
      .eq("is_active", true)
      .is("removed_at", null)
      .order("display_name"),
  ]);

  if (boatsError || locationsError || customersError || skippersError) {
    throw new Error("Unable to load manual booking options.");
  }

  const boatIds = (boats ?? []).map((boat) => boat.id);
  const { data: offerings, error: offeringsError } = boatIds.length
    ? await supabase
        .from("boat_legal_offerings")
        .select("id, boat_id, legal_type, skipper_mode")
        .in("boat_id", boatIds)
        .eq("is_active", true)
    : { data: [], error: null };

  if (offeringsError) throw new Error("Unable to load legal offerings.");

  const today = todayInTimeZone(operator.timezone);
  const initialDate =
    isDateKey(query.date) && query.date >= today ? query.date : today;

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">
      <OperatorNav operatorId={operator.id} operatorName={operator.name} />
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={`/operator/bookings?operator=${operator.id}`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[#676B80] hover:text-[#4C3FC2]"
        >
          ← Torna alle prenotazioni
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#6D5DFB]">Prenotazione diretta</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Nuova prenotazione</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676B80]">
              Registra una richiesta ricevuta per telefono, WhatsApp o di persona. Boatly Ops verifica tutte le relazioni prima del salvataggio.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#EDE9FE] px-3 py-2 text-xs font-bold text-[#4C3FC2]">
            Commissione marketplace 0%
          </span>
        </div>

        {operator.status !== "ACTIVE" ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Il workspace è <strong>{operator.status}</strong>. Puoi consultare i dati, ma le nuove prenotazioni saranno abilitate solo dopo l’attivazione.
          </div>
        ) : null}

        {(boats ?? []).length === 0 ? (
          <section className="mt-7 rounded-3xl border border-dashed border-[#B8B2D7] bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">Prima serve una barca attiva</h2>
            <p className="mt-2 text-sm text-[#676B80]">Aggiungi o attiva un’imbarcazione dalla flotta.</p>
            <Link href={`/operator/fleet?operator=${operator.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#171A2B] px-5 text-sm font-semibold text-white">
              Apri la flotta
            </Link>
          </section>
        ) : (
          <div className="mt-7">
            <ManualBookingForm
              operatorId={operator.id}
              operatorActive={operator.status === "ACTIVE"}
              boats={(boats ?? []).map((boat) => ({
                id: boat.id,
                name: boat.name,
                passengerLimit: boat.operator_passenger_limit,
              }))}
              offerings={(offerings ?? []).map((offering) => ({
                id: offering.id,
                boatId: offering.boat_id,
                label: offeringLabel(offering.legal_type, offering.skipper_mode),
              }))}
              customers={(customers ?? []).map((customer) => ({
                id: customer.id,
                name: customer.display_name,
                email: customer.email,
                phone: customer.phone,
              }))}
              locations={(locations ?? []).map((location) => ({
                id: location.id,
                label: `${location.name}${location.city ? ` · ${location.city}` : ""}`,
              }))}
              skippers={(skippers ?? []).map((skipper) => ({
                id: skipper.id,
                name: skipper.display_name,
                phone: skipper.phone,
              }))}
              initialDate={initialDate}
              initialBoatId={query.boat}
              initialCustomerId={query.customer}
            />
          </div>
        )}
      </div>
    </main>
  );
}
