import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createOperatorWorkspace } from "./actions";

type OperatorOnboardingPageProps = {
  searchParams: Promise<{
    operator?: string;
    created?: string;
    legalSaved?: string;
    locationSaved?: string;
    error?: string;
  }>;
};

type OperatorSummary = {
  id: string;
  name: string;
  status: string;
};

type LegalProfileSummary = {
  legal_name: string | null;
  legal_form: string | null;
  vat_number: string | null;
  tax_code: string | null;
  registered_address_line_1: string | null;
  registered_city: string | null;
  registered_administrative_area: string | null;
  registered_postal_code: string | null;
  registered_country_code: string;
  legal_representative_first_name: string | null;
  legal_representative_last_name: string | null;
};

type OperatorLocationSummary = {
  id: string;
  name: string;
  address_line_1: string | null;
  city: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  country_code: string;
  timezone: string;
  is_primary: boolean;
  is_public: boolean;
  is_active: boolean;
};

function getErrorMessage(
  error?: string,
) {
  switch (error) {
    case "invalid-name":
      return "Inserisci un nome valido per la tua attività.";

    case "bootstrap-failed":
      return "Non è stato possibile creare il workspace operatore. Riprova.";

    default:
      return null;
  }
}

function isLegalProfileComplete(
  profile: LegalProfileSummary | null,
) {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.legal_name?.trim() &&
      profile.legal_form?.trim() &&
      profile.vat_number?.trim() &&
      profile.tax_code?.trim() &&
      profile.registered_address_line_1?.trim() &&
      profile.registered_city?.trim() &&
      profile.registered_administrative_area?.trim() &&
      profile.registered_postal_code?.trim() &&
      profile.registered_country_code === "IT" &&
      profile.legal_representative_first_name?.trim() &&
      profile.legal_representative_last_name?.trim(),
  );
}

function isLocationComplete(
  location: OperatorLocationSummary | null,
) {
  if (!location) {
    return false;
  }

  return Boolean(
    location.name?.trim() &&
      location.address_line_1?.trim() &&
      location.city?.trim() &&
      location.administrative_area?.trim() &&
      location.postal_code?.trim() &&
      location.country_code === "IT" &&
      location.timezone === "Europe/Rome" &&
      location.is_primary &&
      location.is_public &&
      location.is_active,
  );
}

export default async function OperatorOnboardingPage({
  searchParams,
}: OperatorOnboardingPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();


  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(
      "/sign-in?next=/operator/onboarding",
    );
  }


  const userId =
    claimsData.claims.sub;


  const {
    data: memberships,
    error: membershipsError,
  } = await supabase
    .from("operator_members")
    .select("operator_id")
    .eq("user_id", userId)
    .eq("role", "OWNER")
    .eq("status", "ACTIVE");


  if (membershipsError) {
    throw new Error(
      "Unable to load operator memberships.",
    );
  }


  const operatorIds = Array.from(
    new Set(
      (memberships ?? []).map(
        (membership) =>
          membership.operator_id,
      ),
    ),
  );


  let operators: OperatorSummary[] = [];


  if (operatorIds.length > 0) {
    const {
      data: operatorRows,
      error: operatorsError,
    } = await supabase
      .from("operators")
      .select("id, name, status")
      .in("id", operatorIds);


    if (operatorsError) {
      throw new Error(
        "Unable to load operator workspaces.",
      );
    }


    operators =
      (operatorRows ?? []) as OperatorSummary[];
  }


  const requestedOperator =
    params.operator
      ? operators.find(
          (operator) =>
            operator.id === params.operator,
        )
      : undefined;


  const draftOperator =
    operators.find(
      (operator) =>
        operator.status === "DRAFT",
    );


  const selectedOperator =
    requestedOperator ||
    draftOperator ||
    null;


  const errorMessage =
    getErrorMessage(params.error);


  if (!selectedOperator) {
    return (
      <main className="min-h-screen bg-[#FCFBF8] px-4 py-10 text-[#0B1F33] sm:py-14">
        <div className="mx-auto w-full max-w-3xl">

          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight"
            >
              Boatly
            </Link>

            <Link
              href="/account"
              className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
            >
              Torna al tuo account
            </Link>
          </div>


          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.8fr]">

            <section>
              <p className="text-sm font-semibold text-[#14B8A6]">
                Boatly per operatori
              </p>

              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Porta la tua flotta su Boatly.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-[#64748B]">
                Crea il workspace della tua attività. Nei
                prossimi passaggi inseriremo dati aziendali,
                sede operativa, documenti e informazioni
                necessarie alla verifica Boatly.
              </p>

              <div className="mt-8 rounded-2xl bg-[#F1F5F4] p-5">
                <p className="font-semibold">
                  Tutta la tua flotta. Un solo posto.
                </p>

                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Il workspace servirà anche per gestire
                  prenotazioni marketplace, prenotazioni
                  manuali, calendario, prezzi e team.
                </p>
              </div>
            </section>


            <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">

              <p className="text-sm font-medium text-[#14B8A6]">
                Primo passaggio
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Crea il workspace
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Inserisci il nome con cui identifichi la tua
                attività di noleggio.
              </p>


              {errorMessage ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {errorMessage}
                </div>
              ) : null}


              <form
                action={createOperatorWorkspace}
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium"
                  >
                    Nome attività
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={120}
                    autoComplete="organization"
                    placeholder="Es. Boatly Test Operator"
                    className="w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Crea workspace operatore
                </button>
              </form>

              <p className="mt-5 text-xs leading-5 text-[#64748B]">
                La creazione del workspace non pubblica
                automaticamente la tua attività sul marketplace.
                Prima sarà necessaria la verifica Boatly.
              </p>
            </section>

          </div>
        </div>
      </main>
    );
  }


  const {
    data: legalProfileRow,
    error: legalProfileError,
  } = await supabase
    .from("operator_legal_profiles")
    .select(`
      legal_name,
      legal_form,
      vat_number,
      tax_code,
      registered_address_line_1,
      registered_city,
      registered_administrative_area,
      registered_postal_code,
      registered_country_code,
      legal_representative_first_name,
      legal_representative_last_name
    `)
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .maybeSingle();


  if (legalProfileError) {
    throw new Error(
      "Unable to load operator legal profile.",
    );
  }


  const legalProfile =
    legalProfileRow as LegalProfileSummary | null;


  const legalComplete =
    isLegalProfileComplete(legalProfile);


  const {
    data: locationRow,
    error: locationError,
  } = await supabase
    .from("operator_locations")
    .select(`
      id,
      name,
      address_line_1,
      city,
      administrative_area,
      postal_code,
      country_code,
      timezone,
      is_primary,
      is_public,
      is_active
    `)
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .eq(
      "is_primary",
      true,
    )
    .maybeSingle();


  if (locationError) {
    throw new Error(
      "Unable to load operator primary location.",
    );
  }


  const primaryLocation =
    locationRow as OperatorLocationSummary | null;


  const locationComplete =
    legalComplete &&
    isLocationComplete(primaryLocation);


  const completedSteps =
    locationComplete
      ? 3
      : legalComplete
        ? 2
        : 1;


  const steps = [
    {
      number: "01",
      title: "Workspace operatore",
      description:
        "Il workspace e la tua membership OWNER sono stati creati.",
      status: "Completato",
      completed: true,
    },

    {
      number: "02",
      title: "Dati aziendali e legali",
      description:
        legalComplete
          ? "Le informazioni aziendali e legali sono state salvate."
          : "Inserisci le informazioni anagrafiche, fiscali e societarie dell'attività.",
      status:
        legalComplete
          ? "Completato"
          : "Da completare",
      completed:
        legalComplete,
    },

    {
      number: "03",
      title: "Prima sede operativa",
      description:
        locationComplete
          ? "La sede operativa principale è stata configurata."
          : "Configura il primo punto di partenza della flotta.",
      status:
        locationComplete
          ? "Completato"
          : "Da completare",
      completed:
        locationComplete,
    },

    {
      number: "04",
      title: "Documenti",
      description:
        "Caricheremo i documenti necessari alla verifica.",
      status: "Da completare",
      completed: false,
    },

    {
      number: "05",
      title: "Invio a Boatly",
      description:
        "Controlleremo i dati e invieremo la richiesta di verifica.",
      status: "Da completare",
      completed: false,
    },
  ];


  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight"
          >
            Boatly
          </Link>

          <Link
            href="/account"
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Il tuo account
          </Link>
        </header>


        {params.created === "1" ? (
          <div className="mt-8 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Workspace creato.</strong>{" "}
            Ora completiamo l&apos;onboarding della tua attività.
          </div>
        ) : null}


        {params.legalSaved === "1" ? (
          <div className="mt-8 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Dati aziendali salvati.</strong>{" "}
            Il passaggio 2 dell&apos;onboarding è completato.
          </div>
        ) : null}


        {params.locationSaved === "1" ? (
          <div className="mt-8 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>Sede operativa salvata.</strong>{" "}
            Il passaggio 3 dell&apos;onboarding è completato.
          </div>
        ) : null}


        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-wrap items-start justify-between gap-5">

            <div>
              <p className="text-sm font-semibold text-[#14B8A6]">
                Onboarding operatore
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {selectedOperator.name}
              </h1>

              <p className="mt-2 text-sm text-[#64748B]">
                Completa i passaggi necessari prima di inviare
                l&apos;attività alla verifica Boatly.
              </p>
            </div>


            <div className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {selectedOperator.status}
            </div>

          </div>


          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">

              <span className="font-medium">
                Avanzamento onboarding
              </span>

              <span className="text-[#64748B]">
                {completedSteps} di 5
              </span>

            </div>


            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F5F4]">
              <div
                className="h-full rounded-full bg-[#14B8A6]"
                style={{
                  width:
                    `${completedSteps * 20}%`,
                }}
              />
            </div>

          </div>
        </section>


        <section className="mt-6 space-y-3">

          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-4 rounded-2xl border border-[#DEE5E8] bg-white p-5 sm:items-center"
            >

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F5F4] text-sm font-semibold">
                {step.completed
                  ? "✓"
                  : step.number}
              </div>


              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center justify-between gap-2">

                  <h2 className="font-semibold">
                    {step.title}
                  </h2>

                  <span
                    className={
                      step.completed
                        ? "text-xs font-semibold text-[#14B8A6]"
                        : "text-xs font-medium text-[#64748B]"
                    }
                  >
                    {step.status}
                  </span>

                </div>


                <p className="mt-1 text-sm leading-6 text-[#64748B]">
                  {step.description}
                </p>

              </div>
            </div>
          ))}

        </section>


        {!legalComplete ? (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <p className="text-sm font-semibold">
              Prossimo passaggio
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Dati aziendali e legali
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Inserisci i dati societari, fiscali, la sede
              legale e il rappresentante legale dell&apos;attività.
            </p>

            <Link
              href={`/operator/onboarding/legal?operator=${selectedOperator.id}`}
              className="mt-5 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Continua con i dati aziendali
            </Link>

          </section>

        ) : !locationComplete ? (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <p className="text-sm font-semibold">
              Prossimo passaggio
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Prima sede operativa
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Configura il primo punto operativo da cui partirà
              la tua flotta.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">

              <Link
                href={`/operator/onboarding/legal?operator=${selectedOperator.id}`}
                className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 text-sm font-semibold hover:bg-[#F1F5F4]"
              >
                Modifica dati aziendali
              </Link>

              <Link
                href={`/operator/onboarding/location?operator=${selectedOperator.id}`}
                className="rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Continua con la sede
              </Link>

            </div>

          </section>

        ) : (

          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Passaggio 3 completato
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Prima sede operativa configurata
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              La sede principale è pronta. Potrai aggiungere
              ulteriori sedi e configurare gli orari nella
              gestione operativa.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">

              <Link
                href={`/operator/onboarding/location?operator=${selectedOperator.id}`}
                className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 text-sm font-semibold hover:bg-[#F1F5F4]"
              >
                Modifica sede
              </Link>

              <button
                type="button"
                disabled
                className="rounded-xl bg-[#DEE5E8] px-5 py-3 text-sm font-semibold text-[#64748B]"
              >
                Continua con i documenti — C7.5
              </button>

            </div>

          </section>

        )}

      </div>
    </main>
  );
}