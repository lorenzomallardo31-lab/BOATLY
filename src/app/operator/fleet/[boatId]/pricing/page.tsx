import Link from "next/link";

import { requireOperatorBoatContext } from "@/lib/operator/context";

import { saveDefaultRatePlan } from "./actions";

type PageProps = {
  params: Promise<{ boatId: string }>;
  searchParams: Promise<{
    operator?: string;
    saved?: string;
    error?: string;
  }>;
};

type LegalOffering = {
  id: string;
  legal_type: string;
  skipper_mode: string;
  is_active: boolean;
};

type RatePlan = {
  id: string;
  legal_offering_id: string | null;
  name: string;
  duration_mode: string;
  base_duration_minutes: number;
  base_price_cents: number;
  is_default: boolean;
  is_active: boolean;
};

function money(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function errorMessage(error?: string) {
  switch (error) {
    case "invalid-rate":
      return "Controlla modalità legale, durata e prezzo del piano.";
    case "not-allowed":
      return "Non hai i permessi necessari per modificare i prezzi.";
    case "save-failed":
      return "Non è stato possibile salvare il piano tariffario.";
    default:
      return null;
  }
}

export default async function PricingPage({ params, searchParams }: PageProps) {
  const { boatId } = await params;
  const query = await searchParams;

  const { supabase, boat, operator, canManage } =
    await requireOperatorBoatContext(boatId, query.operator);

  const { data: offeringRows, error: offeringsError } = await supabase.rpc(
    "get_boat_legal_offerings",
    {
      p_operator_id: operator.id,
      p_boat_id: boat.id,
    },
  );

  if (offeringsError) {
    throw new Error(`Unable to load legal offerings: ${offeringsError.message}`);
  }

  const legalOfferings = (Array.isArray(offeringRows)
    ? offeringRows
    : []) as LegalOffering[];
  const activeOfferings = legalOfferings.filter((item) => item.is_active);

  const { data: rateRows, error: ratesError } = await supabase
    .from("boat_rate_plans")
    .select(
      "id, legal_offering_id, name, duration_mode, base_duration_minutes, base_price_cents, is_default, is_active",
    )
    .eq("operator_id", operator.id)
    .eq("boat_id", boat.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (ratesError) {
    throw new Error(`Unable to load rate plans: ${ratesError.message}`);
  }

  const ratePlans = (rateRows ?? []) as RatePlan[];
  const current = ratePlans.find((item) => item.is_default && item.is_active);
  const error = errorMessage(query.error);

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-2xl font-bold tracking-tight">
              Boatly
            </Link>
            <p className="mt-1 text-sm text-[#64748B]">Fleet Management</p>
          </div>
          <Link
            href={`/operator/fleet?operator=${operator.id}`}
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Torna alla flotta
          </Link>
        </header>

        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#14B8A6]">Prezzi</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Tariffa di {boat.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
            Configura la tariffa base usata dal marketplace. Le regole stagionali
            avanzate sono già supportate dal database e potranno essere estese
            senza cambiare il modello di prenotazione.
          </p>
        </section>

        {query.saved === "1" ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Tariffa salvata.</strong> Il prezzo base del marketplace è
            stato aggiornato.
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {current ? (
          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">
              Piano attuale
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
              <div>
                <h2 className="text-xl font-semibold">{current.name}</h2>
                <p className="mt-2 text-sm text-[#64748B]">
                  {current.base_duration_minutes / 60} ore · prezzo fisso
                </p>
              </div>
              <p className="text-3xl font-semibold">
                {money(current.base_price_cents)}
              </p>
            </div>
          </section>
        ) : null}

        <form
          action={saveDefaultRatePlan}
          className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="operator_id" value={operator.id} />
          <input type="hidden" name="boat_id" value={boat.id} />

          <h2 className="text-xl font-semibold">
            {current ? "Modifica tariffa base" : "Crea tariffa base"}
          </h2>

          {activeOfferings.length === 0 ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Prima di impostare il prezzo devi attivare almeno una modalità in
              “Offerta legale”.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Modalità legale
                <select
                  name="legal_offering_id"
                  required
                  defaultValue={
                    current?.legal_offering_id ?? activeOfferings[0]?.id ?? ""
                  }
                  disabled={!canManage}
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3"
                >
                  {activeOfferings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.legal_type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Nome piano
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={current?.name ?? "Giornata intera"}
                  disabled={!canManage}
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium">
                Durata base (ore)
                <input
                  name="duration_hours"
                  required
                  type="number"
                  min={1}
                  max={24}
                  step="0.5"
                  defaultValue={current ? current.base_duration_minutes / 60 : 8}
                  disabled={!canManage}
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium">
                Prezzo base (€)
                <input
                  name="price"
                  required
                  inputMode="decimal"
                  defaultValue={
                    current ? (current.base_price_cents / 100).toFixed(2) : ""
                  }
                  disabled={!canManage}
                  className="mt-2 w-full rounded-xl border border-[#DEE5E8] px-4 py-3"
                  placeholder="350,00"
                />
              </label>
            </div>
          )}

          {canManage && activeOfferings.length > 0 ? (
            <button
              type="submit"
              className="mt-6 rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Salva tariffa
            </button>
          ) : null}
        </form>
      </div>
    </main>
  );
}
