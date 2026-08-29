import Link from "next/link";
import { redirect } from "next/navigation";

import OperatorNav from "@/components/operator/operator-nav";
import { createClient } from "@/lib/supabase/server";

type FleetPageProps = {
  searchParams: Promise<{
    operator?: string;
    created?: string;
    deleting?: string;
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

type BoatRow = {
  id: string;
  name: string;
  status: string;
  internal_code: string | null;
  manufacturer: string | null;
  model: string | null;
  manufacture_year: number | null;
  technical_passenger_capacity: number | null;
  operator_passenger_limit: number | null;
  primary_location_id: string | null;
  boat_type_id: string | null;
  updated_at: string;
  deleted_at: string | null;
  deletion_requested_at: string | null;
};

type BoatTypeRow = {
  id: string;
  name: string;
};

type LocationRow = {
  id: string;
  name: string;
  city: string | null;
};

const MANAGEABLE_OPERATOR_STATUSES = [
  "ACTIVE",
];

export default async function FleetPage({
  searchParams,
}: FleetPageProps) {
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
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(
      "/sign-in?next=/operator/fleet",
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
      "/operator/onboarding",
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
            operator.id === params.operator,
        )
      : operators[0];

  if (!selectedOperator) {
    redirect(
      "/operator/onboarding",
    );
  }

  const membership =
    memberships.find(
      (item) =>
        item.operator_id ===
        selectedOperator.id,
    );

  if (!membership) {
    redirect(
      "/operator/fleet",
    );
  }

  const canManage =
    (
      membership.role === "OWNER" ||
      membership.role === "MANAGER"
    ) &&
    MANAGEABLE_OPERATOR_STATUSES.includes(
      selectedOperator.status,
    );

  const {
    data: boatRows,
    error: boatsError,
  } = await supabase
    .from("boats")
    .select(`
      id,
      name,
      status,
      internal_code,
      manufacturer,
      model,
      manufacture_year,
      technical_passenger_capacity,
      operator_passenger_limit,
      primary_location_id,
      boat_type_id,
      updated_at,
      deleted_at,
      deletion_requested_at
    `)
    .eq(
      "operator_id",
      selectedOperator.id,
    )
    .is("deleted_at", null)
    .order(
      "updated_at",
      {
        ascending: false,
      },
    );

  if (boatsError) {
    throw new Error(
      "Unable to load fleet.",
    );
  }

  const boats =
    (boatRows ??
      []) as BoatRow[];

  const boatTypeIds =
    Array.from(
      new Set(
        boats
          .map(
            (boat) =>
              boat.boat_type_id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    );

  const locationIds =
    Array.from(
      new Set(
        boats
          .map(
            (boat) =>
              boat.primary_location_id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    );

  let boatTypes:
    BoatTypeRow[] = [];

  if (
    boatTypeIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("boat_types")
      .select(
        "id, name",
      )
      .in(
        "id",
        boatTypeIds,
      );

    if (error) {
      throw new Error(
        "Unable to load boat types.",
      );
    }

    boatTypes =
      (data ??
        []) as BoatTypeRow[];
  }

  let locations:
    LocationRow[] = [];

  if (
    locationIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "operator_locations",
      )
      .select(
        "id, name, city",
      )
      .in(
        "id",
        locationIds,
      );

    if (error) {
      throw new Error(
        "Unable to load fleet locations.",
      );
    }

    locations =
      (data ??
        []) as LocationRow[];
  }

  const boatTypeById =
    new Map(
      boatTypes.map(
        (boatType) => [
          boatType.id,
          boatType.name,
        ],
      ),
    );

  const locationById =
    new Map(
      locations.map(
        (location) => [
          location.id,
          location,
        ],
      ),
    );

  return (
    <main className="min-h-screen bg-[#F7F6FB] pb-28 text-[#171A2B] lg:pb-12">

      <OperatorNav operatorId={selectedOperator.id} operatorName={selectedOperator.name} />

      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">

        {params.created === "1" ? (
          <div className="mt-8 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Barca creata.
            </strong>{" "}
            La nuova unità è disponibile e può ricevere prenotazioni.
          </div>
        ) : null}

        {params.deleting === "1" ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Eliminazione avviata.</strong>{" "}
            La barca è già non disponibile e sparirà definitivamente entro due minuti.
          </div>
        ) : null}


        <section className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm sm:p-8">

          <div className="flex flex-wrap items-start justify-between gap-5">

            <div>

              <p className="text-sm font-semibold text-[#14B8A6]">
                La tua flotta
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {selectedOperator.name}
              </h1>

              <p className="mt-2 text-sm text-[#64748B]">
                Gestisci le unità associate al workspace.
              </p>

            </div>

            <div className="flex flex-wrap items-center gap-2">

              <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
                Confermato
              </span>

              <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
                {membership.role === "OWNER" ? "Proprietario" : "Collaboratore"}
              </span>

            </div>

          </div>


          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="text-2xl font-semibold">
                {boats.length}
              </p>

              <p className="text-sm text-[#64748B]">
                {boats.length === 1
                  ? "barca in flotta"
                  : "barche in flotta"}
              </p>

            </div>

            {canManage ? (
              <Link
                href={`/operator/fleet/new?operator=${selectedOperator.id}`}
                className="rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Aggiungi una barca
              </Link>
            ) : null}

          </div>

        </section>


        {!canManage ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            In questo stato del workspace puoi consultare la flotta, ma non aggiungere nuove barche.
          </div>
        ) : null}


        {boats.length === 0 ? (

          <section className="mt-6 rounded-2xl border border-dashed border-[#DEE5E8] bg-white p-8 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F4] text-xl">
              ⚓
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              La flotta è ancora vuota
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#64748B]">
              Aggiungi la prima barca. Potrai completare successivamente specifiche tecniche, servizi, foto, dotazioni ed extra.
            </p>

            {canManage ? (
              <Link
                href={`/operator/fleet/new?operator=${selectedOperator.id}`}
                className="mt-6 inline-flex rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
              >
                Aggiungi la prima barca
              </Link>
            ) : null}

          </section>

        ) : (

          <section className="mt-6 grid gap-4 md:grid-cols-2">

            {boats.map(
              (boat) => {
                const location =
                  boat.primary_location_id
                    ? locationById.get(
                        boat.primary_location_id,
                      )
                    : undefined;

                return (
                  <article
                    key={boat.id}
                    className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wide text-[#14B8A6]">
                          {boat.boat_type_id
                            ? boatTypeById.get(
                                boat.boat_type_id,
                              ) ??
                              "Tipo barca"
                            : "Tipo da configurare"}
                        </p>

                        <h2 className="mt-2 text-xl font-semibold">
                          {boat.name}
                        </h2>

                        {boat.internal_code ? (
                          <p className="mt-1 text-xs text-[#64748B]">
                            Codice interno:{" "}
                            {boat.internal_code}
                          </p>
                        ) : null}

                      </div>

                      <span className="rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">
                        {boat.deletion_requested_at
                          ? "Eliminazione in corso"
                          : boat.status === "ACTIVE"
                            ? "Disponibile"
                            : "Non disponibile"}
                      </span>

                    </div>


                    <div className="mt-5 space-y-2 text-sm text-[#64748B]">

                      <p>
                        {boat.manufacturer ||
                        boat.model
                          ? [
                              boat.manufacturer,
                              boat.model,
                              boat.manufacture_year,
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : "Marca e modello da configurare"}
                      </p>

                      <p>
                        {location
                          ? `${location.name}${location.city ? ` · ${location.city}` : ""}`
                          : "Sede da configurare"}
                      </p>

                      <p>
                        {boat.operator_passenger_limit
                          ? `${boat.operator_passenger_limit} passeggeri`
                          : boat.technical_passenger_capacity
                            ? `${boat.technical_passenger_capacity} posti tecnici`
                            : "Capacità da configurare"}
                      </p>

                    </div>


                    <div className="mt-6 border-t border-[#DEE5E8] pt-5">

                      <Link
                        href={`/operator/fleet/${boat.id}?operator=${selectedOperator.id}`}
                        className="inline-flex rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 text-sm font-semibold transition hover:bg-[#F1F5F4]"
                      >
                        Gestisci barca
                      </Link>

                    </div>

                  </article>
                );
              },
            )}

          </section>

        )}

      </div>

    </main>
  );
}
