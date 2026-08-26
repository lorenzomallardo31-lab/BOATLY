import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  archiveBoat,
  changeBoatStatus,
} from "./actions";


type StatusPageProps = {
  params: Promise<{
    boatId: string;
  }>;

  searchParams: Promise<{
    operator?: string;
    changed?: string;
    error?: string;
  }>;
};


type BoatRow = {
  id: string;
  operator_id: string;
  name: string;
  status: string;
};


type OperatorRow = {
  id: string;
  name: string;
  status: string;
};


type ReadinessRow = {
  boat_id: string;
  boat_status: string;

  identity_complete: boolean;
  descriptions_complete: boolean;
  technical_complete: boolean;
  legal_offering_complete: boolean;
  photos_complete: boolean;

  completed_checks: number;
  total_checks: number;
  completion_percent: number;

  ready_for_activation: boolean;

  active_legal_offerings: number;
  image_count: number;
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
    case "not-ready":
      return "La barca non è ancora completa e non può essere attivata.";

    case "not-allowed":
      return "Non hai i permessi necessari per modificare lo stato della barca.";

    case "invalid-status":
      return "Lo stato richiesto non è valido.";

    case "archive-confirmation":
      return "Per archiviare la barca devi scrivere esattamente il suo nome.";

    case "archive-failed":
      return "Non è stato possibile archiviare la barca.";

    case "boat-not-found":
      return "La barca non è stata trovata.";

    case "status-change-failed":
      return "Non è stato possibile modificare lo stato della barca.";

    default:
      return null;
  }
}


function statusDescription(
  status: string,
) {
  switch (status) {
    case "DRAFT":
      return "Bozza in preparazione. Completa la checklist prima di attivarla.";

    case "ACTIVE":
      return "Unità completa e attiva nella flotta dell'operatore.";

    case "INACTIVE":
      return "Unità completa ma temporaneamente disattivata.";

    case "ARCHIVED":
      return "Unità archiviata. Lo stato è definitivo.";

    default:
      return status;
  }
}


export default async function StatusPage({
  params,
  searchParams,
}: StatusPageProps) {
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
    .select(
      "id, operator_id, name, status",
    )
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


  if (
    query.operator &&
    query.operator !==
      boat.operator_id
  ) {
    redirect(
      `/operator/fleet/${boat.id}/status?operator=${boat.operator_id}`,
    );
  }


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


  const {
    data: readinessRows,
    error: readinessError,
  } = await supabase.rpc(
    "get_boat_fleet_readiness",
    {
      p_operator_id:
        operator.id,

      p_boat_id:
        boat.id,
    },
  );


  if (
    readinessError ||
    !Array.isArray(
      readinessRows,
    ) ||
    readinessRows.length !== 1
  ) {
    throw new Error(
      "Unable to load boat readiness.",
    );
  }


  const readiness =
    readinessRows[0] as ReadinessRow;


  const canManage =
    (
      membership.role ===
        "OWNER" ||
      membership.role ===
        "MANAGER"
    ) &&
    MANAGEABLE_OPERATOR_STATUSES.includes(
      operator.status,
    ) &&
    boat.status !==
      "ARCHIVED";


  const checklist = [
    {
      key: "identity",
      label:
        "Identità della barca",

      description:
        "Tipo, sede, produttore, modello e anno di costruzione.",

      complete:
        readiness.identity_complete,

      href:
        `/operator/fleet/${boat.id}`,
    },

    {
      key: "descriptions",
      label:
        "Presentazione",

      description:
        "Descrizione breve e descrizione completa.",

      complete:
        readiness.descriptions_complete,

      href:
        `/operator/fleet/${boat.id}`,
    },

    {
      key: "technical",
      label:
        "Dati tecnici essenziali",

      description:
        "Dimensioni, capacità e requisito patente configurati.",

      complete:
        readiness.technical_complete,

      href:
        `/operator/fleet/${boat.id}`,
    },

    {
      key: "legal",
      label:
        "Offerta legale",

      description:
        readiness.active_legal_offerings === 1
          ? "1 modalità attiva."
          : `${readiness.active_legal_offerings} modalità attive.`,

      complete:
        readiness.legal_offering_complete,

      href:
        `/operator/fleet/${boat.id}/offering`,
    },

    {
      key: "photos",
      label:
        "Galleria",

      description:
        readiness.image_count === 1
          ? "1 foto caricata."
          : `${readiness.image_count} foto caricate.`,

      complete:
        readiness.photos_complete,

      href:
        `/operator/fleet/${boat.id}/photos`,
    },
  ];


  const error =
    errorMessage(
      query.error,
    );


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
                Stato Fleet
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {boat.name}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748B]">
                {statusDescription(
                  boat.status,
                )}
              </p>

            </div>


            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {boat.status}
            </span>

          </div>

        </section>


        {query.changed ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Stato aggiornato.
            </strong>{" "}
            La barca è ora {query.changed}.
          </div>
        ) : null}


        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}


        {operator.status !==
        "ACTIVE" ? (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">

            <p className="text-sm font-semibold text-amber-900">
              Workspace non ancora attivo sul marketplace
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              Puoi completare e attivare internamente la barca nella Fleet. Questo non la rende pubblica su Boatly: la pubblicazione marketplace richiederà separatamente l&apos;abilitazione dell&apos;operatore e gli altri controlli previsti.
            </p>

          </section>
        ) : null}


        {/* ================================================
            PROGRESS
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <p className="text-sm font-semibold text-[#14B8A6]">
                Completamento
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {readiness.completion_percent}%
              </h2>

              <p className="mt-2 text-sm text-[#64748B]">
                {readiness.completed_checks} di{" "}
                {readiness.total_checks} requisiti completati
              </p>

            </div>


            <span
              className={
                readiness.ready_for_activation
                  ? "rounded-full bg-[#14B8A6]/10 px-4 py-2 text-xs font-semibold text-[#0F766E]"
                  : "rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold text-[#64748B]"
              }
            >
              {readiness.ready_for_activation
                ? "Pronta per l'attivazione"
                : "Configurazione incompleta"}
            </span>

          </div>


          <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#F1F5F4]">

            <div
              className="h-full rounded-full bg-[#14B8A6]"
              style={{
                width:
                  `${readiness.completion_percent}%`,
              }}
            />

          </div>

        </section>


        {/* ================================================
            CHECKLIST
        ================================================= */}

        <section className="mt-6">

          <h2 className="text-xl font-semibold">
            Checklist
          </h2>

          <div className="mt-4 space-y-3">

            {checklist.map(
              (item) => (
                <Link
                  key={
                    item.key
                  }
                  href={
                    item.href
                  }
                  className="flex items-start justify-between gap-4 rounded-2xl border border-[#DEE5E8] bg-white p-5 shadow-sm transition hover:border-[#14B8A6]/50"
                >

                  <div className="flex items-start gap-4">

                    <div
                      className={
                        item.complete
                          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/10 text-sm font-bold text-[#0F766E]"
                          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F4] text-sm font-bold text-[#64748B]"
                      }
                    >
                      {item.complete
                        ? "✓"
                        : "·"}
                    </div>


                    <div>

                      <p className="font-semibold">
                        {item.label}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-[#64748B]">
                        {item.description}
                      </p>

                    </div>

                  </div>


                  <span className="text-sm font-semibold text-[#14B8A6]">
                    Gestisci
                  </span>

                </Link>
              ),
            )}

          </div>

        </section>


        {/* ================================================
            OPTIONAL
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

          <p className="text-sm font-semibold text-[#64748B]">
            Configurazioni facoltative
          </p>

          <div className="mt-4 flex flex-wrap gap-3">

            <Link
              href={`/operator/fleet/${boat.id}/amenities`}
              className="rounded-xl border border-[#DEE5E8] px-4 py-3 text-sm font-semibold hover:bg-[#F1F5F4]"
            >
              Dotazioni
            </Link>

            <Link
              href={`/operator/fleet/${boat.id}/extras`}
              className="rounded-xl border border-[#DEE5E8] px-4 py-3 text-sm font-semibold hover:bg-[#F1F5F4]"
            >
              Extra
            </Link>

          </div>

        </section>


        {/* ================================================
            STATUS ACTION
        ================================================= */}

        {canManage ? (
          <section className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-[#14B8A6]">
              Stato operativo
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Gestisci disponibilità nella Fleet
            </h2>


            {boat.status ===
            "DRAFT" ? (
              <div className="mt-5">

                {readiness.ready_for_activation ? (
                  <form
                    action={
                      changeBoatStatus
                    }
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

                    <input
                      type="hidden"
                      name="target_status"
                      value="ACTIVE"
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white"
                    >
                      Attiva barca
                    </button>

                  </form>
                ) : (
                  <p className="text-sm leading-6 text-[#64748B]">
                    Completa tutti i requisiti della checklist prima di attivare la barca.
                  </p>
                )}

              </div>
            ) : null}


            {boat.status ===
            "ACTIVE" ? (
              <form
                action={
                  changeBoatStatus
                }
                className="mt-5"
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

                <input
                  type="hidden"
                  name="target_status"
                  value="INACTIVE"
                />

                <button
                  type="submit"
                  className="rounded-xl border border-[#DEE5E8] bg-white px-6 py-3 text-sm font-semibold hover:bg-[#F1F5F4]"
                >
                  Metti inattiva
                </button>

              </form>
            ) : null}


            {boat.status ===
            "INACTIVE" ? (
              <div className="mt-5">

                {readiness.ready_for_activation ? (
                  <form
                    action={
                      changeBoatStatus
                    }
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

                    <input
                      type="hidden"
                      name="target_status"
                      value="ACTIVE"
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white"
                    >
                      Riattiva barca
                    </button>

                  </form>
                ) : (
                  <p className="text-sm leading-6 text-[#64748B]">
                    La configurazione non è più completa. Risolvi i requisiti mancanti prima di riattivarla.
                  </p>
                )}

              </div>
            ) : null}

          </section>
        ) : null}


        {/* ================================================
            ARCHIVE
        ================================================= */}

        {canManage ? (
          <section className="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-red-700">
              Zona archivio
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Archivia barca
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              L&apos;archiviazione è definitiva. Una barca archiviata non può essere riportata a DRAFT, ACTIVE o INACTIVE.
            </p>


            <form
              action={
                archiveBoat
              }
              className="mt-5 max-w-lg"
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


              <label
                htmlFor="confirmation"
                className="mb-2 block text-sm font-medium"
              >
                Scrivi{" "}
                <strong>
                  {boat.name}
                </strong>{" "}
                per confermare
              </label>

              <input
                id="confirmation"
                name="confirmation"
                required
                autoComplete="off"
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />


              <button
                type="submit"
                className="mt-4 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Archivia definitivamente
              </button>

            </form>

          </section>
        ) : null}

      </div>

    </main>
  );
}