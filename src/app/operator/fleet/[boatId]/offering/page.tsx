import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { saveLegalOffering } from "./actions";

type OfferingPageProps = {
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
  name: string;
  status: string;
};

type OperatorRow = {
  id: string;
  name: string;
  status: string;
};

type OfferingRow = {
  id: string;
  legal_type: string;
  skipper_mode: string;
  self_drive_allowed: boolean;
  minimum_driver_age: number | null;
  navigation_limit_notes: string | null;
  eligibility_notes: string | null;
  is_active: boolean;
};

const LEGAL_TYPES = [
  {
    value: "LOCAZIONE",
    label: "Locazione",
    description:
      "Configura questa modalità sulla base dell'inquadramento effettivamente applicabile alla barca e all'attività.",
  },

  {
    value:
      "LOCAZIONE_WITH_COMMANDER",
    label:
      "Locazione con comandante",
    description:
      "Modalità distinta prevista dal modello dati Boatly. I requisiti devono essere verificati dall'operatore e, successivamente, dal workflow Compliance.",
  },

  {
    value: "NOLEGGIO",
    label: "Noleggio",
    description:
      "Configura le condizioni operative applicabili alla modalità di noleggio.",
  },
];

const MANAGEABLE_OPERATOR_STATUSES = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "ACTIVE",
];

function errorMessage(
  error?: string,
) {
  switch (error) {
    case "invalid-legal-type":
      return "La tipologia di offerta non è valida.";

    case "age-without-self-drive":
      return "L'età minima del conducente può essere impostata solo quando la guida autonoma è consentita.";

    case "invalid-age":
      return "L'età minima del conducente deve essere almeno 18 anni.";

    case "not-allowed":
      return "Non hai i permessi necessari per modificare questa configurazione.";

    case "save-failed":
      return "Non è stato possibile salvare la configurazione. Riprova.";

    default:
      return null;
  }
}

export default async function OfferingPage({
  params,
  searchParams,
}: OfferingPageProps) {
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
      `/operator/fleet/${boat.id}/offering?operator=${boat.operator_id}`,
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
    boat.status !== "ARCHIVED";

  const {
    data: offeringRows,
    error: offeringsError,
  } = await supabase.rpc(
    "get_boat_legal_offerings",
    {
      p_operator_id:
        operator.id,

      p_boat_id:
        boat.id,
    },
  );

  if (offeringsError) {
    throw new Error(
      "Unable to load boat legal offerings.",
    );
  }

  const offerings =
    (Array.isArray(
      offeringRows,
    )
      ? offeringRows
      : []) as OfferingRow[];

  const offeringByType =
    new Map(
      offerings.map(
        (offering) => [
          offering.legal_type,
          offering,
        ],
      ),
    );

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

          <p className="text-sm font-semibold text-[#14B8A6]">
            Offerta legale
          </p>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">

            <div>

              <h1 className="text-3xl font-semibold tracking-tight">
                {boat.name}
              </h1>

              <p className="mt-2 text-sm text-[#64748B]">
                Configura le modalità con cui questa unità potrà essere offerta.
              </p>

            </div>

            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {boat.status}
            </span>

          </div>

        </section>


        {query.saved ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Configurazione salvata.
            </strong>{" "}
            La modalità selezionata è stata aggiornata.
          </div>
        ) : null}


        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}


        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="text-sm font-semibold text-amber-900">
            Configurazione operativa
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900/80">
            Questi campi non costituiscono una determinazione automatica dell&apos;inquadramento giuridico. Devono riflettere la situazione reale dell&apos;unità e dell&apos;operatore.
          </p>

        </section>


        <div className="mt-6 space-y-6">

          {LEGAL_TYPES.map(
            (legalType) => {
              const existing =
                offeringByType.get(
                  legalType.value,
                );

              return (
                <form
                  key={
                    legalType.value
                  }
                  action={
                    saveLegalOffering
                  }
                  className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
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
                    name="legal_type"
                    value={
                      legalType.value
                    }
                  />


                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div className="max-w-2xl">

                      <h2 className="text-xl font-semibold">
                        {legalType.label}
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-[#64748B]">
                        {legalType.description}
                      </p>

                    </div>


                    <label className="flex items-center gap-3 rounded-xl bg-[#F1F5F4] px-4 py-3 text-sm font-semibold">

                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={
                          existing?.is_active ??
                          false
                        }
                        disabled={
                          !canManage
                        }
                        className="h-4 w-4"
                      />

                      Abilitata

                    </label>

                  </div>


                  <div className="mt-6 grid gap-5 sm:grid-cols-2">

                    <div>

                      <label
                        htmlFor={`${legalType.value}-skipper`}
                        className="mb-2 block text-sm font-medium"
                      >
                        Modalità skipper
                      </label>

                      <select
                        id={`${legalType.value}-skipper`}
                        name="skipper_mode"
                        defaultValue={
                          existing?.skipper_mode ??
                          "NOT_AVAILABLE"
                        }
                        disabled={
                          !canManage
                        }
                        className={
                          inputClassName
                        }
                      >

                        <option value="NOT_AVAILABLE">
                          Non disponibile
                        </option>

                        <option value="OPTIONAL">
                          Opzionale
                        </option>

                        <option value="INCLUDED">
                          Incluso
                        </option>

                        <option value="REQUIRED">
                          Obbligatorio
                        </option>

                      </select>

                    </div>


                    <div>

                      <label
                        htmlFor={`${legalType.value}-self-drive`}
                        className="mb-2 block text-sm font-medium"
                      >
                        Guida autonoma consentita
                      </label>

                      <select
                        id={`${legalType.value}-self-drive`}
                        name="self_drive_allowed"
                        defaultValue={
                          existing?.self_drive_allowed
                            ? "true"
                            : "false"
                        }
                        disabled={
                          !canManage
                        }
                        className={
                          inputClassName
                        }
                      >

                        <option value="false">
                          No
                        </option>

                        <option value="true">
                          Sì
                        </option>

                      </select>

                    </div>


                    <div>

                      <label
                        htmlFor={`${legalType.value}-age`}
                        className="mb-2 block text-sm font-medium"
                      >
                        Età minima conducente
                      </label>

                      <input
                        id={`${legalType.value}-age`}
                        name="minimum_driver_age"
                        type="number"
                        min={18}
                        defaultValue={
                          existing?.minimum_driver_age ??
                          ""
                        }
                        disabled={
                          !canManage
                        }
                        className={
                          inputClassName
                        }
                        placeholder="Es. 21"
                      />

                      <p className="mt-2 text-xs text-[#64748B]">
                        Compilabile solo quando la guida autonoma è consentita.
                      </p>

                    </div>

                  </div>


                  <div className="mt-5">

                    <label
                      htmlFor={`${legalType.value}-navigation`}
                      className="mb-2 block text-sm font-medium"
                    >
                      Limiti di navigazione
                    </label>

                    <textarea
                      id={`${legalType.value}-navigation`}
                      name="navigation_limit_notes"
                      rows={3}
                      defaultValue={
                        existing?.navigation_limit_notes ??
                        ""
                      }
                      disabled={
                        !canManage
                      }
                      className={
                        inputClassName
                      }
                      placeholder="Eventuali limiti operativi o geografici."
                    />

                  </div>


                  <div className="mt-5">

                    <label
                      htmlFor={`${legalType.value}-eligibility`}
                      className="mb-2 block text-sm font-medium"
                    >
                      Requisiti / note di idoneità
                    </label>

                    <textarea
                      id={`${legalType.value}-eligibility`}
                      name="eligibility_notes"
                      rows={3}
                      defaultValue={
                        existing?.eligibility_notes ??
                        ""
                      }
                      disabled={
                        !canManage
                      }
                      className={
                        inputClassName
                      }
                      placeholder="Eventuali requisiti aggiuntivi da verificare."
                    />

                  </div>


                  {canManage ? (
                    <div className="mt-6 border-t border-[#DEE5E8] pt-5">

                      <button
                        type="submit"
                        className="rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        Salva {legalType.label}
                      </button>

                    </div>
                  ) : null}

                </form>
              );
            },
          )}

        </div>

      </div>

    </main>
  );
}