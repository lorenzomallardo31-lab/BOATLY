import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { saveBoatDetails } from "./actions";

type BoatPageProps = {
  params: Promise<{
    boatId: string;
  }>;

  searchParams: Promise<{
    operator?: string;
    saved?: string;
    error?: string;
  }>;
};

type BoatRow = {
  id: string;
  operator_id: string;
  primary_location_id: string | null;
  boat_type_id: string | null;
  status: string;
  internal_code: string | null;
  name: string;
  short_description: string | null;
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  manufacture_year: number | null;
  registration_number: string | null;
  registration_country_code: string | null;
  hull_identification_number: string | null;
  length_cm: number | null;
  beam_cm: number | null;
  draft_cm: number | null;
  technical_passenger_capacity: number | null;
  operator_passenger_limit: number | null;
  cabins: number | null;
  berths: number | null;
  bathrooms: number | null;
  engine_count: number | null;
  engine_manufacturer: string | null;
  engine_model: string | null;
  engine_installation: string | null;
  engine_fuel_type: string | null;
  engine_combustion_cycle: number | null;
  engine_direct_injection: boolean | null;
  engine_power_kw: number | null;
  engine_power_hp: number | null;
  engine_displacement_cc: number | null;
  max_speed_knots: number | null;
  license_required: boolean | null;
};

type OperatorRow = {
  id: string;
  name: string;
  status: string;
};

type BoatTypeRow = {
  id: string;
  name: string;
};

type LocationRow = {
  id: string;
  name: string;
  city: string | null;
  is_primary: boolean;
};

const MANAGEABLE_OPERATOR_STATUSES = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "ACTIVE",
];

function errorMessage(
  error?: string,
) {
  switch (error) {
    case "invalid-name":
      return "Inserisci un nome valido per la barca.";

    case "missing-required-fields":
      return "Tipo di barca e sede principale sono obbligatori.";

    case "invalid-internal-code":
      return "Il codice interno non è valido.";

    case "short-description-too-long":
      return "La descrizione breve può contenere al massimo 280 caratteri.";

    case "invalid-manufacture-year":
      return "L'anno di costruzione non è valido.";

    case "invalid-registration-country":
      return "Il paese di registrazione deve essere un codice di due lettere, ad esempio IT.";

    case "invalid-length":
      return "La lunghezza deve essere maggiore di zero.";

    case "invalid-beam":
      return "La larghezza deve essere maggiore di zero.";

    case "invalid-draft":
      return "Il pescaggio non può essere negativo.";

    case "invalid-technical-capacity":
      return "La capacità tecnica deve essere maggiore di zero.";

    case "invalid-operator-capacity":
      return "Il limite passeggeri dell'operatore deve essere maggiore di zero.";

    case "operator-capacity-too-high":
      return "Il limite passeggeri dell'operatore non può superare la capacità tecnica.";

    case "invalid-non-negative-value":
      return "Uno dei valori numerici inseriti non è valido.";

    case "invalid-combustion-cycle":
      return "Il ciclo del motore deve essere 2 tempi o 4 tempi.";

    case "duplicate-value":
      return "Uno dei valori univoci inseriti è già utilizzato da un'altra barca.";

    case "not-allowed":
      return "Non hai i permessi necessari per modificare questa barca.";

    case "operator-not-manageable":
      return "In questo stato il workspace non può modificare la flotta.";

    case "boat-not-found":
      return "La barca non è stata trovata.";

    case "invalid-boat-type":
      return "Il tipo di barca selezionato non è valido.";

    case "invalid-location":
      return "La sede selezionata non è valida.";

    case "save-failed":
      return "Non è stato possibile salvare la barca. Riprova.";

    default:
      return null;
  }
}

function booleanValue(
  value: boolean | null,
) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "";
}

export default async function BoatPage({
  params,
  searchParams,
}: BoatPageProps) {
  const {
    boatId,
  } =
    await params;

  const query =
    await searchParams;

  const supabase =
    await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !==
      "string"
  ) {
    redirect(
      "/sign-in?next=/operator/fleet",
    );
  }

  const userId =
    claimsData.claims.sub;

  const {
    data: boatRow,
    error: boatError,
  } = await supabase
    .from("boats")
    .select(`
      id,
      operator_id,
      primary_location_id,
      boat_type_id,
      status,
      internal_code,
      name,
      short_description,
      description,
      manufacturer,
      model,
      manufacture_year,
      registration_number,
      registration_country_code,
      hull_identification_number,
      length_cm,
      beam_cm,
      draft_cm,
      technical_passenger_capacity,
      operator_passenger_limit,
      cabins,
      berths,
      bathrooms,
      engine_count,
      engine_manufacturer,
      engine_model,
      engine_installation,
      engine_fuel_type,
      engine_combustion_cycle,
      engine_direct_injection,
      engine_power_kw,
      engine_power_hp,
      engine_displacement_cc,
      max_speed_knots,
      license_required
    `)
    .eq(
      "id",
      boatId,
    )
    .maybeSingle();

  if (
    boatError ||
    !boatRow
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  const boat =
    boatRow as BoatRow;

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("operator_members")
    .select(
      "role, status",
    )
    .eq(
      "operator_id",
      boat.operator_id,
    )
    .eq(
      "user_id",
      userId,
    )
    .eq(
      "status",
      "ACTIVE",
    )
    .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  if (
    query.operator &&
    query.operator !==
      boat.operator_id
  ) {
    redirect(
      `/operator/fleet/${boat.id}?operator=${boat.operator_id}`,
    );
  }

  const {
    data: operatorRow,
    error: operatorError,
  } = await supabase
    .from("operators")
    .select(
      "id, name, status",
    )
    .eq(
      "id",
      boat.operator_id,
    )
    .maybeSingle();

  if (
    operatorError ||
    !operatorRow
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  const operator =
    operatorRow as OperatorRow;

  const canManage =
    (
      membership.role === "OWNER" ||
      membership.role === "MANAGER"
    ) &&
    MANAGEABLE_OPERATOR_STATUSES.includes(
      operator.status,
    );

  const {
    data: boatTypeRows,
    error: boatTypesError,
  } = await supabase
    .from("boat_types")
    .select(
      "id, name",
    )
    .eq(
      "is_active",
      true,
    )
    .order(
      "sort_order",
      {
        ascending: true,
      },
    );

  if (boatTypesError) {
    throw new Error(
      "Unable to load boat types.",
    );
  }

  const boatTypes =
    (boatTypeRows ??
      []) as BoatTypeRow[];

  const {
    data: locationRows,
    error: locationsError,
  } = await supabase
    .from("operator_locations")
    .select(
      "id, name, city, is_primary",
    )
    .eq(
      "operator_id",
      operator.id,
    )
    .eq(
      "is_active",
      true,
    )
    .order(
      "is_primary",
      {
        ascending: false,
      },
    )
    .order(
      "name",
      {
        ascending: true,
      },
    );

  if (locationsError) {
    throw new Error(
      "Unable to load operator locations.",
    );
  }

  const locations =
    (locationRows ??
      []) as LocationRow[];

  const error =
    errorMessage(
      query.error,
    );

  const inputClassName =
    "w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition disabled:cursor-not-allowed disabled:bg-[#F1F5F4] disabled:text-[#64748B] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20";

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">

      <div className="mx-auto max-w-5xl">

        <header className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight"
            >
              Boatly
            </Link>

            <p className="mt-1 text-sm text-[#64748B]">
              Fleet Management
            </p>
          </div>

          <Link
            href={`/operator/fleet?operator=${operator.id}`}
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Torna alla flotta
          </Link>

        </header>


        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-wrap items-start justify-between gap-5">

            <div>

              <p className="text-sm font-semibold text-[#14B8A6]">
                Scheda barca
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {boat.name}
              </h1>

              <p className="mt-2 text-sm text-[#64748B]">
                {operator.name}
              </p>

            </div>

            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {boat.status}
            </span>

          </div>

        </section>


        {query.saved === "1" ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Modifiche salvate.
            </strong>{" "}
            La scheda della barca è stata aggiornata.
          </div>
        ) : null}


        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}


        {!canManage ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Puoi consultare questa barca, ma il workspace non consente modifiche in questo momento.
          </div>
        ) : null}


        <form
          action={
            saveBoatDetails
          }
          className="mt-6 space-y-6"
        >

          <input
            type="hidden"
            name="operator_id"
            value={
              operator.id
            }
          />

          <input
            type="hidden"
            name="boat_id"
            value={
              boat.id
            }
          />


          {/* ==================================================
              IDENTITÀ
          ================================================== */}

          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Informazioni principali
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Identità della barca
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <div>

                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Nome *
                </label>

                <input
                  id="name"
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={
                    boat.name
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="internal_code"
                  className="mb-2 block text-sm font-medium"
                >
                  Codice interno
                </label>

                <input
                  id="internal_code"
                  name="internal_code"
                  maxLength={80}
                  defaultValue={
                    boat.internal_code ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="boat_type_id"
                  className="mb-2 block text-sm font-medium"
                >
                  Tipo *
                </label>

                <select
                  id="boat_type_id"
                  name="boat_type_id"
                  required
                  defaultValue={
                    boat.boat_type_id ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                >

                  <option
                    value=""
                    disabled
                  >
                    Seleziona il tipo
                  </option>

                  {boatTypes.map(
                    (boatType) => (
                      <option
                        key={
                          boatType.id
                        }
                        value={
                          boatType.id
                        }
                      >
                        {boatType.name}
                      </option>
                    ),
                  )}

                </select>

              </div>


              <div>

                <label
                  htmlFor="primary_location_id"
                  className="mb-2 block text-sm font-medium"
                >
                  Sede principale *
                </label>

                <select
                  id="primary_location_id"
                  name="primary_location_id"
                  required
                  defaultValue={
                    boat.primary_location_id ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                >

                  <option
                    value=""
                    disabled
                  >
                    Seleziona la sede
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {location.name}
                        {location.city
                          ? ` · ${location.city}`
                          : ""}
                        {location.is_primary
                          ? " · Principale"
                          : ""}
                      </option>
                    ),
                  )}

                </select>

              </div>


              <div>

                <label
                  htmlFor="manufacturer"
                  className="mb-2 block text-sm font-medium"
                >
                  Cantiere / produttore
                </label>

                <input
                  id="manufacturer"
                  name="manufacturer"
                  defaultValue={
                    boat.manufacturer ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                  placeholder="Es. Jeanneau"
                />

              </div>


              <div>

                <label
                  htmlFor="model"
                  className="mb-2 block text-sm font-medium"
                >
                  Modello
                </label>

                <input
                  id="model"
                  name="model"
                  defaultValue={
                    boat.model ?? ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                  placeholder="Es. Cap Camarat 7.5"
                />

              </div>


              <div>

                <label
                  htmlFor="manufacture_year"
                  className="mb-2 block text-sm font-medium"
                >
                  Anno di costruzione
                </label>

                <input
                  id="manufacture_year"
                  name="manufacture_year"
                  type="number"
                  min={1900}
                  max={2100}
                  defaultValue={
                    boat.manufacture_year ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>

            </div>


            <div className="mt-5">

              <label
                htmlFor="short_description"
                className="mb-2 block text-sm font-medium"
              >
                Descrizione breve
              </label>

              <textarea
                id="short_description"
                name="short_description"
                rows={3}
                maxLength={280}
                defaultValue={
                  boat.short_description ??
                  ""
                }
                disabled={
                  !canManage
                }
                className={
                  inputClassName
                }
                placeholder="Una breve presentazione della barca."
              />

            </div>


            <div className="mt-5">

              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Descrizione completa
              </label>

              <textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={
                  boat.description ??
                  ""
                }
                disabled={
                  !canManage
                }
                className={
                  inputClassName
                }
                placeholder="Descrivi caratteristiche, comfort e utilizzo ideale della barca."
              />

            </div>

          </section>


          {/* ==================================================
              REGISTRAZIONE
          ================================================== */}

          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Identificazione
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Registrazione
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <div>

                <label
                  htmlFor="registration_number"
                  className="mb-2 block text-sm font-medium"
                >
                  Numero di registrazione
                </label>

                <input
                  id="registration_number"
                  name="registration_number"
                  defaultValue={
                    boat.registration_number ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="registration_country_code"
                  className="mb-2 block text-sm font-medium"
                >
                  Paese di registrazione
                </label>

                <input
                  id="registration_country_code"
                  name="registration_country_code"
                  maxLength={2}
                  defaultValue={
                    boat.registration_country_code ??
                    "IT"
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                  placeholder="IT"
                />

              </div>


              <div className="sm:col-span-2">

                <label
                  htmlFor="hull_identification_number"
                  className="mb-2 block text-sm font-medium"
                >
                  Hull Identification Number / CIN
                </label>

                <input
                  id="hull_identification_number"
                  name="hull_identification_number"
                  defaultValue={
                    boat.hull_identification_number ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>

            </div>

          </section>


          {/* ==================================================
              DIMENSIONI E CAPACITÀ
          ================================================== */}

          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Specifiche tecniche
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Dimensioni e capacità
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              <div>

                <label
                  htmlFor="length_cm"
                  className="mb-2 block text-sm font-medium"
                >
                  Lunghezza (cm)
                </label>

                <input
                  id="length_cm"
                  name="length_cm"
                  type="number"
                  min={1}
                  defaultValue={
                    boat.length_cm ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="beam_cm"
                  className="mb-2 block text-sm font-medium"
                >
                  Larghezza (cm)
                </label>

                <input
                  id="beam_cm"
                  name="beam_cm"
                  type="number"
                  min={1}
                  defaultValue={
                    boat.beam_cm ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="draft_cm"
                  className="mb-2 block text-sm font-medium"
                >
                  Pescaggio (cm)
                </label>

                <input
                  id="draft_cm"
                  name="draft_cm"
                  type="number"
                  min={0}
                  defaultValue={
                    boat.draft_cm ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="technical_passenger_capacity"
                  className="mb-2 block text-sm font-medium"
                >
                  Capacità tecnica
                </label>

                <input
                  id="technical_passenger_capacity"
                  name="technical_passenger_capacity"
                  type="number"
                  min={1}
                  defaultValue={
                    boat.technical_passenger_capacity ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="operator_passenger_limit"
                  className="mb-2 block text-sm font-medium"
                >
                  Limite passeggeri Boatly
                </label>

                <input
                  id="operator_passenger_limit"
                  name="operator_passenger_limit"
                  type="number"
                  min={1}
                  defaultValue={
                    boat.operator_passenger_limit ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

                <p className="mt-2 text-xs text-[#64748B]">
                  Non può superare la capacità tecnica.
                </p>

              </div>


              <div>

                <label
                  htmlFor="cabins"
                  className="mb-2 block text-sm font-medium"
                >
                  Cabine
                </label>

                <input
                  id="cabins"
                  name="cabins"
                  type="number"
                  min={0}
                  defaultValue={
                    boat.cabins ?? ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="berths"
                  className="mb-2 block text-sm font-medium"
                >
                  Posti letto
                </label>

                <input
                  id="berths"
                  name="berths"
                  type="number"
                  min={0}
                  defaultValue={
                    boat.berths ?? ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="bathrooms"
                  className="mb-2 block text-sm font-medium"
                >
                  Bagni
                </label>

                <input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  min={0}
                  defaultValue={
                    boat.bathrooms ?? ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>

            </div>

          </section>


          {/* ==================================================
              MOTORE
          ================================================== */}

          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Propulsione
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Motore
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

              <div>

                <label
                  htmlFor="engine_count"
                  className="mb-2 block text-sm font-medium"
                >
                  Numero motori
                </label>

                <input
                  id="engine_count"
                  name="engine_count"
                  type="number"
                  min={0}
                  defaultValue={
                    boat.engine_count ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="engine_manufacturer"
                  className="mb-2 block text-sm font-medium"
                >
                  Produttore motore
                </label>

                <input
                  id="engine_manufacturer"
                  name="engine_manufacturer"
                  defaultValue={
                    boat.engine_manufacturer ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                  placeholder="Es. Yamaha"
                />

              </div>


              <div>

                <label
                  htmlFor="engine_model"
                  className="mb-2 block text-sm font-medium"
                >
                  Modello motore
                </label>

                <input
                  id="engine_model"
                  name="engine_model"
                  defaultValue={
                    boat.engine_model ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="engine_installation"
                  className="mb-2 block text-sm font-medium"
                >
                  Installazione
                </label>

                <select
                  id="engine_installation"
                  name="engine_installation"
                  defaultValue={
                    boat.engine_installation ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                >

                  <option value="">
                    Non specificata
                  </option>

                  <option value="FUORIBORDO">
                    Fuoribordo
                  </option>

                  <option value="ENTROBORDO">
                    Entrobordo
                  </option>

                  <option value="ENTROFUORIBORDO">
                    Entrofuoribordo
                  </option>

                  <option value="JET">
                    Jet
                  </option>

                  <option value="ALTRO">
                    Altro
                  </option>

                </select>

              </div>


              <div>

                <label
                  htmlFor="engine_fuel_type"
                  className="mb-2 block text-sm font-medium"
                >
                  Alimentazione
                </label>

                <select
                  id="engine_fuel_type"
                  name="engine_fuel_type"
                  defaultValue={
                    boat.engine_fuel_type ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                >

                  <option value="">
                    Non specificata
                  </option>

                  <option value="BENZINA">
                    Benzina
                  </option>

                  <option value="DIESEL">
                    Diesel
                  </option>

                  <option value="ELETTRICO">
                    Elettrico
                  </option>

                  <option value="IBRIDO">
                    Ibrido
                  </option>

                  <option value="ALTRO">
                    Altro
                  </option>

                </select>

              </div>


              <div>

                <label
                  htmlFor="engine_combustion_cycle"
                  className="mb-2 block text-sm font-medium"
                >
                  Ciclo motore
                </label>

                <select
                  id="engine_combustion_cycle"
                  name="engine_combustion_cycle"
                  defaultValue={
                    boat.engine_combustion_cycle?.toString() ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                >

                  <option value="">
                    Non specificato
                  </option>

                  <option value="2">
                    2 tempi
                  </option>

                  <option value="4">
                    4 tempi
                  </option>

                </select>

              </div>


              <div>

                <label
                  htmlFor="engine_direct_injection"
                  className="mb-2 block text-sm font-medium"
                >
                  Iniezione diretta
                </label>

                <select
                  id="engine_direct_injection"
                  name="engine_direct_injection"
                  defaultValue={
                    booleanValue(
                      boat.engine_direct_injection,
                    )
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                >

                  <option value="">
                    Non specificato
                  </option>

                  <option value="true">
                    Sì
                  </option>

                  <option value="false">
                    No
                  </option>

                </select>

              </div>


              <div>

                <label
                  htmlFor="engine_power_hp"
                  className="mb-2 block text-sm font-medium"
                >
                  Potenza (CV / HP)
                </label>

                <input
                  id="engine_power_hp"
                  name="engine_power_hp"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    boat.engine_power_hp ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="engine_power_kw"
                  className="mb-2 block text-sm font-medium"
                >
                  Potenza (kW)
                </label>

                <input
                  id="engine_power_kw"
                  name="engine_power_kw"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    boat.engine_power_kw ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="engine_displacement_cc"
                  className="mb-2 block text-sm font-medium"
                >
                  Cilindrata (cc)
                </label>

                <input
                  id="engine_displacement_cc"
                  name="engine_displacement_cc"
                  type="number"
                  min={0}
                  defaultValue={
                    boat.engine_displacement_cc ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>


              <div>

                <label
                  htmlFor="max_speed_knots"
                  className="mb-2 block text-sm font-medium"
                >
                  Velocità massima (nodi)
                </label>

                <input
                  id="max_speed_knots"
                  name="max_speed_knots"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={
                    boat.max_speed_knots ??
                    ""
                  }
                  disabled={
                    !canManage
                  }
                  className={
                    inputClassName
                  }
                />

              </div>

            </div>

          </section>


          {/* ==================================================
              PATENTE
          ================================================== */}

          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Requisiti
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Patente nautica
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Questo valore deve essere configurato sulla base delle caratteristiche effettive dell&apos;unità e delle regole applicabili. Boatly non lo deduce automaticamente dalla sola potenza del motore.
            </p>

            <div className="mt-5 max-w-md">

              <label
                htmlFor="license_required"
                className="mb-2 block text-sm font-medium"
              >
                Patente richiesta
              </label>

              <select
                id="license_required"
                name="license_required"
                defaultValue={
                  booleanValue(
                    boat.license_required,
                  )
                }
                disabled={
                  !canManage
                }
                className={
                  inputClassName
                }
              >

                <option value="">
                  Da verificare
                </option>

                <option value="true">
                  Sì
                </option>

                <option value="false">
                  No
                </option>

              </select>

            </div>

          </section>


          {canManage ? (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">

              <Link
                href={`/operator/fleet?operator=${operator.id}`}
                className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 text-center text-sm font-semibold hover:bg-[#F1F5F4]"
              >
                Torna alla flotta
              </Link>

              <button
                type="submit"
                className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Salva modifiche
              </button>

            </div>
          ) : null}

        </form>

      </div>

    </main>
  );
}