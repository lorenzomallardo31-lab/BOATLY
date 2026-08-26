import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  saveBoatExtras,
  saveOperatorExtra,
} from "./actions";

type ExtrasPageProps = {
  params: Promise<{
    boatId: string;
  }>;

  searchParams: Promise<{
    operator?: string;
    saved?: string;
    catalogSaved?: string;
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


type ExtraRow = {
  id: string;
  name: string;
  description: string | null;
  pricing_unit: string;
  price_cents: number;
  max_quantity: number | null;
  is_active: boolean;
};


type BoatExtraRow = {
  extra_id: string;
  price_override_cents:
    number | null;
  max_quantity_override:
    number | null;
  is_active: boolean;
};


const MANAGEABLE_OPERATOR_STATUSES = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "ACTIVE",
];


const PRICING_UNIT_LABELS:
  Record<string, string> = {
    FIXED:
      "Prezzo fisso",

    PER_PERSON:
      "Per persona",

    PER_HOUR:
      "Per ora",

    PER_DAY:
      "Per giorno",

    PER_UNIT:
      "Per unità",
  };


function centsToInput(
  cents: number | null,
) {
  if (cents === null) {
    return "";
  }

  return (
    cents / 100
  ).toFixed(2);
}


function centsToEuro(
  cents: number,
) {
  return new Intl.NumberFormat(
    "it-IT",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(
    cents / 100,
  );
}


function errorMessage(
  error?: string,
) {
  switch (error) {
    case "invalid-name":
      return "Inserisci un nome valido per l'extra.";

    case "invalid-unit":
      return "Seleziona un'unità di prezzo valida.";

    case "invalid-price":
      return "Inserisci un prezzo valido, ad esempio 25,00.";

    case "invalid-quantity":
      return "La quantità massima deve essere maggiore di zero.";

    case "duplicate-name":
      return "Esiste già un extra con questo nome.";

    case "invalid-override-price":
      return "Uno dei prezzi personalizzati non è valido.";

    case "invalid-override-quantity":
      return "Una delle quantità personalizzate non è valida.";

    case "not-allowed":
      return "Non hai i permessi necessari per modificare gli extra.";

    case "load-failed":
      return "Non è stato possibile caricare il catalogo extra.";

    case "catalog-save-failed":
      return "Non è stato possibile salvare l'extra.";

    case "boat-save-failed":
      return "Non è stato possibile aggiornare gli extra della barca.";

    default:
      return null;
  }
}


export default async function ExtrasPage({
  params,
  searchParams,
}: ExtrasPageProps) {
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
      `/operator/fleet/${boat.id}/extras?operator=${boat.operator_id}`,
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
    boat.status !==
      "ARCHIVED";


  const {
    data: extraRows,
    error: extrasError,
  } = await supabase.rpc(
    "get_operator_extras",
    {
      p_operator_id:
        operator.id,
    },
  );


  if (extrasError) {
    throw new Error(
      "Unable to load operator extras.",
    );
  }


  const extras =
    (
      Array.isArray(
        extraRows,
      )
        ? extraRows
        : []
    ) as ExtraRow[];


  const {
    data: boatExtraRows,
    error: boatExtrasError,
  } = await supabase.rpc(
    "get_boat_extras",
    {
      p_operator_id:
        operator.id,

      p_boat_id:
        boat.id,
    },
  );


  if (boatExtrasError) {
    throw new Error(
      "Unable to load boat extras.",
    );
  }


  const boatExtras =
    (
      Array.isArray(
        boatExtraRows,
      )
        ? boatExtraRows
        : []
    ) as BoatExtraRow[];


  const boatExtraById =
    new Map(
      boatExtras.map(
        (item) => [
          item.extra_id,
          item,
        ],
      ),
    );


  const activeExtras =
    extras.filter(
      (extra) =>
        extra.is_active,
    );


  const error =
    errorMessage(
      query.error,
    );


  const inputClassName =
    "w-full rounded-xl border border-[#DEE5E8] bg-white px-4 py-3 outline-none transition disabled:cursor-not-allowed disabled:bg-[#F1F5F4] focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20";


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
            Extra
          </p>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">

            <div>

              <h1 className="text-3xl font-semibold tracking-tight">
                Extra di {boat.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Crea il catalogo dei servizi aggiuntivi dell&apos;attività e scegli quali rendere disponibili su questa barca.
              </p>

            </div>


            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {boatExtras.length} associati
            </span>

          </div>

        </section>


        {query.catalogSaved ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Extra salvato.
            </strong>{" "}
            Il catalogo dell&apos;operatore è stato aggiornato.
          </div>
        ) : null}


        {query.saved === "1" ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Extra della barca salvati.
            </strong>{" "}
            La configurazione di {boat.name} è stata aggiornata.
          </div>
        ) : null}


        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}


        {/* ================================================
            NEW EXTRA
        ================================================= */}

        {canManage ? (
          <form
            action={
              saveOperatorExtra
            }
            className="mt-6 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
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
              name="extra_id"
              value=""
            />


            <p className="text-sm font-semibold text-[#14B8A6]">
              Catalogo operatore
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Crea un nuovo extra
            </h2>


            <div className="mt-6 grid gap-5 sm:grid-cols-2">

              <div>

                <label
                  htmlFor="new-extra-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Nome *
                </label>

                <input
                  id="new-extra-name"
                  name="name"
                  required
                  maxLength={120}
                  className={
                    inputClassName
                  }
                  placeholder="Es. SUP aggiuntivo"
                />

              </div>


              <div>

                <label
                  htmlFor="new-extra-unit"
                  className="mb-2 block text-sm font-medium"
                >
                  Unità di prezzo *
                </label>

                <select
                  id="new-extra-unit"
                  name="pricing_unit"
                  defaultValue="FIXED"
                  className={
                    inputClassName
                  }
                >

                  {Object.entries(
                    PRICING_UNIT_LABELS,
                  ).map(
                    ([
                      value,
                      label,
                    ]) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {label}
                      </option>
                    ),
                  )}

                </select>

              </div>


              <div>

                <label
                  htmlFor="new-extra-price"
                  className="mb-2 block text-sm font-medium"
                >
                  Prezzo base (€) *
                </label>

                <input
                  id="new-extra-price"
                  name="price"
                  required
                  inputMode="decimal"
                  className={
                    inputClassName
                  }
                  placeholder="25,00"
                />

              </div>


              <div>

                <label
                  htmlFor="new-extra-max"
                  className="mb-2 block text-sm font-medium"
                >
                  Quantità massima
                </label>

                <input
                  id="new-extra-max"
                  name="max_quantity"
                  type="number"
                  min={1}
                  className={
                    inputClassName
                  }
                  placeholder="Facoltativa"
                />

              </div>

            </div>


            <div className="mt-5">

              <label
                htmlFor="new-extra-description"
                className="mb-2 block text-sm font-medium"
              >
                Descrizione
              </label>

              <textarea
                id="new-extra-description"
                name="description"
                rows={3}
                className={
                  inputClassName
                }
                placeholder="Descrivi il servizio aggiuntivo."
              />

            </div>


            <label className="mt-5 flex items-center gap-3 text-sm font-semibold">

              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="h-4 w-4"
              />

              Extra attivo

            </label>


            <button
              type="submit"
              className="mt-6 rounded-xl bg-[#14B8A6] px-5 py-3 text-sm font-semibold text-white"
            >
              Crea extra
            </button>

          </form>
        ) : null}


        {/* ================================================
            CATALOG
        ================================================= */}

        {extras.length > 0 ? (
          <section className="mt-6">

            <div className="mb-4">

              <h2 className="text-xl font-semibold">
                Catalogo dell&apos;attività
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                Gli extra appartengono al workspace e possono essere riutilizzati su più barche.
              </p>

            </div>


            <div className="space-y-4">

              {extras.map(
                (extra) => (
                  <form
                    key={
                      extra.id
                    }
                    action={
                      saveOperatorExtra
                    }
                    className="rounded-2xl border border-[#DEE5E8] bg-white p-5 shadow-sm"
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
                      name="extra_id"
                      value={
                        extra.id
                      }
                    />


                    <div className="grid gap-4 md:grid-cols-2">

                      <div>

                        <label className="mb-2 block text-xs font-medium text-[#64748B]">
                          Nome
                        </label>

                        <input
                          name="name"
                          required
                          maxLength={120}
                          defaultValue={
                            extra.name
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

                        <label className="mb-2 block text-xs font-medium text-[#64748B]">
                          Unità prezzo
                        </label>

                        <select
                          name="pricing_unit"
                          defaultValue={
                            extra.pricing_unit
                          }
                          disabled={
                            !canManage
                          }
                          className={
                            inputClassName
                          }
                        >

                          {Object.entries(
                            PRICING_UNIT_LABELS,
                          ).map(
                            ([
                              value,
                              label,
                            ]) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {label}
                              </option>
                            ),
                          )}

                        </select>

                      </div>


                      <div>

                        <label className="mb-2 block text-xs font-medium text-[#64748B]">
                          Prezzo base (€)
                        </label>

                        <input
                          name="price"
                          required
                          inputMode="decimal"
                          defaultValue={
                            centsToInput(
                              extra.price_cents,
                            )
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

                        <label className="mb-2 block text-xs font-medium text-[#64748B]">
                          Quantità massima
                        </label>

                        <input
                          name="max_quantity"
                          type="number"
                          min={1}
                          defaultValue={
                            extra.max_quantity ??
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


                    <div className="mt-4">

                      <label className="mb-2 block text-xs font-medium text-[#64748B]">
                        Descrizione
                      </label>

                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={
                          extra.description ??
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


                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">

                      <label className="flex items-center gap-3 text-sm font-semibold">

                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={
                            extra.is_active
                          }
                          disabled={
                            !canManage
                          }
                          className="h-4 w-4"
                        />

                        Attivo

                      </label>


                      {canManage ? (
                        <button
                          type="submit"
                          className="rounded-xl border border-[#DEE5E8] px-4 py-2 text-sm font-semibold hover:bg-[#F1F5F4]"
                        >
                          Salva extra
                        </button>
                      ) : null}

                    </div>

                  </form>
                ),
              )}

            </div>

          </section>
        ) : null}


        {/* ================================================
            BOAT ASSOCIATION
        ================================================= */}

        <form
          action={
            saveBoatExtras
          }
          className="mt-8 rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
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


          <p className="text-sm font-semibold text-[#14B8A6]">
            Configurazione barca
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            Extra disponibili su {boat.name}
          </h2>


          {activeExtras.length ===
          0 ? (
            <p className="mt-4 text-sm text-[#64748B]">
              Crea almeno un extra attivo nel catalogo per poterlo associare alla barca.
            </p>
          ) : (
            <div className="mt-6 space-y-4">

              {activeExtras.map(
                (extra) => {
                  const association =
                    boatExtraById.get(
                      extra.id,
                    );

                  return (
                    <div
                      key={
                        extra.id
                      }
                      className="rounded-xl border border-[#DEE5E8] p-5"
                    >

                      <label className="flex items-start gap-3">

                        <input
                          type="checkbox"
                          name={`extra_${extra.id}`}
                          defaultChecked={
                            Boolean(
                              association,
                            )
                          }
                          disabled={
                            !canManage
                          }
                          className="mt-1 h-4 w-4"
                        />


                        <div className="flex-1">

                          <div className="flex flex-wrap items-center justify-between gap-3">

                            <div>

                              <p className="font-semibold">
                                {extra.name}
                              </p>

                              <p className="mt-1 text-sm text-[#64748B]">
                                {centsToEuro(
                                  extra.price_cents,
                                )}
                                {" · "}
                                {PRICING_UNIT_LABELS[
                                  extra.pricing_unit
                                ] ??
                                  extra.pricing_unit}
                              </p>

                            </div>


                            {extra.max_quantity ? (
                              <span className="rounded-full bg-[#F1F5F4] px-3 py-2 text-xs font-semibold">
                                Max {extra.max_quantity}
                              </span>
                            ) : null}

                          </div>


                          {extra.description ? (
                            <p className="mt-2 text-sm leading-6 text-[#64748B]">
                              {extra.description}
                            </p>
                          ) : null}

                        </div>

                      </label>


                      <div className="mt-5 grid gap-4 border-t border-[#DEE5E8] pt-4 sm:grid-cols-2">

                        <div>

                          <label className="mb-2 block text-xs font-medium text-[#64748B]">
                            Prezzo personalizzato (€)
                          </label>

                          <input
                            name={`price_override_${extra.id}`}
                            inputMode="decimal"
                            defaultValue={
                              centsToInput(
                                association?.price_override_cents ??
                                  null,
                              )
                            }
                            disabled={
                              !canManage
                            }
                            className={
                              inputClassName
                            }
                            placeholder={`Base: ${centsToInput(
                              extra.price_cents,
                            )}`}
                          />

                          <p className="mt-2 text-xs text-[#64748B]">
                            Lascia vuoto per usare il prezzo base.
                          </p>

                        </div>


                        <div>

                          <label className="mb-2 block text-xs font-medium text-[#64748B]">
                            Quantità massima personalizzata
                          </label>

                          <input
                            name={`quantity_override_${extra.id}`}
                            type="number"
                            min={1}
                            defaultValue={
                              association?.max_quantity_override ??
                              ""
                            }
                            disabled={
                              !canManage
                            }
                            className={
                              inputClassName
                            }
                            placeholder={
                              extra.max_quantity
                                ? `Base: ${extra.max_quantity}`
                                : "Nessun limite base"
                            }
                          />

                          <p className="mt-2 text-xs text-[#64748B]">
                            Lascia vuoto per usare la configurazione generale.
                          </p>

                        </div>

                      </div>

                    </div>
                  );
                },
              )}

            </div>
          )}


          {canManage &&
          activeExtras.length >
            0 ? (
            <div className="mt-6 flex justify-end">

              <button
                type="submit"
                className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white"
              >
                Salva extra della barca
              </button>

            </div>
          ) : null}

        </form>

      </div>

    </main>
  );
}