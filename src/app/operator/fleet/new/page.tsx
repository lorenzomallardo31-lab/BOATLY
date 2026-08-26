import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createBoatDraft } from "./actions";

type NewBoatPageProps = {
  searchParams: Promise<{
    operator?: string;
    error?: string;
  }>;
};

type MembershipRow = {
  operator_id: string;
  role: string;
};

type OperatorRow = {
  id: string;
  name: string;
  status: string;
};

type BoatTypeRow = {
  id: string;
  name: string;
  description: string | null;
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

    case "invalid-boat-type":
      return "Seleziona un tipo di barca valido.";

    case "invalid-location":
      return "Seleziona una sede operativa valida.";

    case "invalid-internal-code":
      return "Il codice interno inserito è troppo lungo.";

    case "duplicate-internal-code":
      return "Esiste già una barca con questo codice interno.";

    case "operator-not-manageable":
      return "In questo stato il workspace non può aggiungere nuove barche.";

    case "not-allowed":
      return "Non hai i permessi necessari per aggiungere una barca.";

    case "create-failed":
      return "Non è stato possibile creare la barca. Riprova.";

    default:
      return null;
  }
}

export default async function NewBoatPage({
  searchParams,
}: NewBoatPageProps) {
  const params =
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
      "/sign-in?next=/operator/fleet/new",
    );
  }

  const userId =
    claimsData.claims.sub;

  const {
    data: membershipRows,
    error: membershipsError,
  } = await supabase
    .from("operator_members")
    .select(
      "operator_id, role",
    )
    .eq(
      "user_id",
      userId,
    )
    .eq(
      "status",
      "ACTIVE",
    )
    .in(
      "role",
      [
        "OWNER",
        "MANAGER",
      ],
    );

  if (membershipsError) {
    throw new Error(
      "Unable to load operator memberships.",
    );
  }

  const memberships =
    (membershipRows ??
      []) as MembershipRow[];

  if (
    memberships.length === 0
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  const operatorIds =
    Array.from(
      new Set(
        memberships.map(
          (membership) =>
            membership.operator_id,
        ),
      ),
    );

  const {
    data: operatorRows,
    error: operatorsError,
  } = await supabase
    .from("operators")
    .select(
      "id, name, status",
    )
    .in(
      "id",
      operatorIds,
    );

  if (operatorsError) {
    throw new Error(
      "Unable to load operator workspaces.",
    );
  }

  const operators =
    (operatorRows ??
      []) as OperatorRow[];

  const selectedOperator =
    params.operator
      ? operators.find(
          (operator) =>
            operator.id ===
            params.operator,
        )
      : operators.find(
          (operator) =>
            MANAGEABLE_OPERATOR_STATUSES.includes(
              operator.status,
            ),
        );

  if (
    !selectedOperator ||
    !MANAGEABLE_OPERATOR_STATUSES.includes(
      selectedOperator.status,
    )
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  const {
    data: boatTypeRows,
    error: boatTypesError,
  } = await supabase
    .from("boat_types")
    .select(
      "id, name, description",
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

  if (
    boatTypes.length === 0
  ) {
    throw new Error(
      "Boat type taxonomy is not configured.",
    );
  }

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
      selectedOperator.id,
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
      params.error,
    );

  const inputClassName =
    "w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20";

  return (
    <main className="min-h-screen bg-[#FCFBF8] px-4 py-8 text-[#0B1F33] sm:px-6 sm:py-10">

      <div className="mx-auto max-w-3xl">

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
            href={`/operator/fleet?operator=${selectedOperator.id}`}
            className="text-sm font-medium text-[#64748B] hover:text-[#0B1F33]"
          >
            Torna alla flotta
          </Link>

        </header>


        <div className="mt-10">

          <p className="text-sm font-semibold text-[#14B8A6]">
            Nuova barca
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Aggiungi una barca alla flotta
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#64748B]">
            Iniziamo dalle informazioni essenziali.
            La barca verrà creata come bozza e potrai completarla nei passaggi successivi.
          </p>

        </div>


        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}


        <form
          action={
            createBoatDraft
          }
          className="mt-8 space-y-6"
        >

          <input
            type="hidden"
            name="operator_id"
            value={
              selectedOperator.id
            }
          />


          <section className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Informazioni iniziali
            </p>

            <div className="mt-6 space-y-5">

              <div>

                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Nome della barca *
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={160}
                  placeholder="Es. Blu Mediterraneo"
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
                  type="text"
                  maxLength={80}
                  placeholder="Es. NA-001"
                  className={
                    inputClassName
                  }
                />

                <p className="mt-2 text-xs text-[#64748B]">
                  Facoltativo. Utile per riconoscere rapidamente la barca nel gestionale.
                </p>

              </div>


              <div>

                <label
                  htmlFor="boat_type_id"
                  className="mb-2 block text-sm font-medium"
                >
                  Tipo di barca *
                </label>

                <select
                  id="boat_type_id"
                  name="boat_type_id"
                  required
                  defaultValue=""
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
                        {
                          boatType.name
                        }
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
                    locations.find(
                      (location) =>
                        location.is_primary,
                    )?.id ?? ""
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

            </div>

          </section>


          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">

            <Link
              href={`/operator/fleet?operator=${selectedOperator.id}`}
              className="rounded-xl border border-[#DEE5E8] bg-white px-5 py-3 text-center text-sm font-semibold hover:bg-[#F1F5F4]"
            >
              Annulla
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Crea barca
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}