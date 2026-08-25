import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { savePrimaryLocation } from "./actions";

type LocationPageProps = {
  searchParams: Promise<{
    operator?: string;
    error?: string;
  }>;
};

type OperatorSummary = {
  id: string;
  name: string;
  status: string;
};

type OperatorLocation = {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  country_code: string;
  timezone: string;
  phone: string | null;
  email: string | null;
  pickup_instructions: string | null;
  is_primary: boolean;
  is_public: boolean;
  is_active: boolean;
};

function getErrorMessage(
  error?: string,
) {
  switch (error) {
    case "invalid-name":
      return "Inserisci un nome valido per la sede.";

    case "invalid-address":
      return "Completa correttamente indirizzo, comune, provincia e CAP.";

    case "invalid-email":
      return "Controlla l'indirizzo email della sede.";

    case "invalid-phone":
      return "Controlla il numero di telefono inserito.";

    case "invalid-pickup-instructions":
      return "Le istruzioni di ritrovo sono troppo lunghe.";

    case "save-failed":
      return "Non è stato possibile salvare la sede. Riprova.";

    default:
      return null;
  }
}

export default async function LocationPage({
  searchParams,
}: LocationPageProps) {
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


  if (operatorIds.length === 0) {
    redirect("/operator/onboarding");
  }


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


  const operators =
    (operatorRows ?? []) as OperatorSummary[];


  const selectedOperator =
    params.operator
      ? operators.find(
          (operator) =>
            operator.id === params.operator,
        )
      : operators.find(
          (operator) =>
            operator.status === "DRAFT",
        );


  if (
    !selectedOperator ||
    selectedOperator.status !== "DRAFT"
  ) {
    redirect("/operator/onboarding");
  }


  const {
    data: legalProfile,
    error: legalProfileError,
  } = await supabase
    .from("operator_legal_profiles")
    .select("operator_id")
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .maybeSingle();


  if (legalProfileError) {
    throw new Error(
      "Unable to validate legal onboarding step.",
    );
  }


  if (!legalProfile) {
    redirect(
      `/operator/onboarding/legal?operator=${selectedOperator.id}`,
    );
  }


  const {
    data: locationRow,
    error: locationError,
  } = await supabase
    .from("operator_locations")
    .select(`
      id,
      name,
      address_line_1,
      address_line_2,
      city,
      administrative_area,
      postal_code,
      country_code,
      timezone,
      phone,
      email,
      pickup_instructions,
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


  const location =
    locationRow as OperatorLocation | null;


  const errorMessage =
    getErrorMessage(params.error);


  const inputClassName =
    "w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20";

  const labelClassName =
    "mb-2 block text-sm font-medium";


  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight"
          >
            Boatly
          </Link>

          <Link
            href={`/operator/onboarding?operator=${selectedOperator.id}`}
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Torna all&apos;onboarding
          </Link>
        </header>


        <div className="mt-10">
          <p className="text-sm font-semibold text-[#14B8A6]">
            Onboarding operatore · Passaggio 3 di 5
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Prima sede operativa
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
            Inserisci il primo punto da cui opera{" "}
            <strong className="text-[#0B1F33]">
              {selectedOperator.name}
            </strong>
            . Questa diventerà la sede principale utilizzata
            come riferimento iniziale per la flotta.
          </p>
        </div>


        {errorMessage ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}


        <form
          action={savePrimaryLocation}
          className="mt-8 space-y-6"
        >
          <input
            type="hidden"
            name="operator_id"
            value={selectedOperator.id}
          />


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Sede
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Informazioni principali
            </h2>

            <div className="mt-6">
              <label
                htmlFor="name"
                className={labelClassName}
              >
                Nome della sede *
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                maxLength={160}
                defaultValue={
                  location?.name ?? ""
                }
                placeholder="Es. Base Napoli Mergellina"
                className={inputClassName}
              />

              <p className="mt-2 text-xs leading-5 text-[#64748B]">
                Usa un nome facilmente riconoscibile nel
                gestionale e dal cliente.
              </p>
            </div>
          </section>


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Indirizzo
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Dove si trova la sede?
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <div className="sm:col-span-2">
                <label
                  htmlFor="address_line_1"
                  className={labelClassName}
                >
                  Indirizzo *
                </label>

                <input
                  id="address_line_1"
                  name="address_line_1"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={
                    location?.address_line_1 ?? ""
                  }
                  placeholder="Via, piazza, porto o marina"
                  className={inputClassName}
                />
              </div>


              <div className="sm:col-span-2">
                <label
                  htmlFor="address_line_2"
                  className={labelClassName}
                >
                  Dettagli indirizzo
                </label>

                <input
                  id="address_line_2"
                  name="address_line_2"
                  type="text"
                  defaultValue={
                    location?.address_line_2 ?? ""
                  }
                  placeholder="Pontile, molo, ingresso..."
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="city"
                  className={labelClassName}
                >
                  Comune *
                </label>

                <input
                  id="city"
                  name="city"
                  type="text"
                  required
                  maxLength={120}
                  defaultValue={
                    location?.city ?? ""
                  }
                  placeholder="Napoli"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="administrative_area"
                  className={labelClassName}
                >
                  Provincia *
                </label>

                <input
                  id="administrative_area"
                  name="administrative_area"
                  type="text"
                  required
                  maxLength={120}
                  defaultValue={
                    location?.administrative_area ??
                    ""
                  }
                  placeholder="NA"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="postal_code"
                  className={labelClassName}
                >
                  CAP *
                </label>

                <input
                  id="postal_code"
                  name="postal_code"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={5}
                  defaultValue={
                    location?.postal_code ?? ""
                  }
                  placeholder="80100"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="country_display"
                  className={labelClassName}
                >
                  Paese *
                </label>

                <input
                  id="country_display"
                  type="text"
                  value="Italia"
                  disabled
                  className={`${inputClassName} bg-[#F1F5F4] text-[#64748B]`}
                />
              </div>


              <div className="sm:col-span-2">
                <div className="rounded-xl bg-[#F1F5F4] p-4">
                  <p className="text-sm font-medium">
                    Posizione sulla mappa
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#64748B]">
                    La posizione geografica precisa verrà
                    associata quando integreremo Mapbox. Per ora
                    salviamo l&apos;indirizzo strutturato.
                  </p>
                </div>
              </div>

            </div>
          </section>


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Contatti
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Contatti della sede
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Sono facoltativi in questo passaggio, ma saranno
              utili per le comunicazioni operative.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="phone"
                  className={labelClassName}
                >
                  Telefono
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength={50}
                  defaultValue={
                    location?.phone ?? ""
                  }
                  placeholder="+39 081 0000000"
                  className={inputClassName}
                />
              </div>


              <div>
                <label
                  htmlFor="email"
                  className={labelClassName}
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={
                    location?.email ?? ""
                  }
                  placeholder="sede@example.com"
                  className={inputClassName}
                />
              </div>

            </div>
          </section>


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Ritrovo cliente
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Istruzioni di pickup
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Indica eventuali istruzioni utili per trovare
              facilmente il punto di consegna della barca.
            </p>

            <textarea
              id="pickup_instructions"
              name="pickup_instructions"
              rows={5}
              maxLength={2000}
              defaultValue={
                location?.pickup_instructions ?? ""
              }
              placeholder="Es. Presentarsi al pontile A almeno 15 minuti prima dell'orario di partenza."
              className={`${inputClassName} resize-y`}
            />
          </section>


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#14B8A6]">
              Impostazioni iniziali
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F1F5F4] p-4">
                <span>Sede principale</span>
                <strong>Sì</strong>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F1F5F4] p-4">
                <span>Visibile sul marketplace dopo l&apos;approvazione</span>
                <strong>Sì</strong>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F1F5F4] p-4">
                <span>Fuso orario</span>
                <strong>Europe/Rome</strong>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#64748B]">
              La sede non sarà comunque visibile pubblicamente
              finché l&apos;operatore non avrà superato la
              verifica Boatly.
            </p>
          </section>


          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

            <Link
              href={`/operator/onboarding?operator=${selectedOperator.id}`}
              className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 text-center text-sm font-semibold hover:bg-[#F1F5F4]"
            >
              Annulla
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Salva e continua
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}