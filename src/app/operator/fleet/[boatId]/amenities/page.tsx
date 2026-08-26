import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { saveBoatAmenities } from "./actions";

type AmenitiesPageProps = {
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

type AmenityRow = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  icon_name: string | null;
  sort_order: number;
};

type SelectedAmenityRow = {
  amenity_id: string;
  notes: string | null;
};

const MANAGEABLE_OPERATOR_STATUSES = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "ACTIVE",
];


const CATEGORY_LABELS:
  Record<string, string> = {
    NAVIGATION:
      "Navigazione",

    COMFORT:
      "Comfort",

    ENTERTAINMENT:
      "Intrattenimento",

    KITCHEN:
      "Cucina",

    ELECTRICAL:
      "Elettricità",

    WATER_SPORTS:
      "Sport acquatici",

    OTHER:
      "Altro",
  };


function errorMessage(
  error?: string,
) {
  switch (error) {
    case "not-allowed":
      return "Non hai i permessi necessari per modificare le dotazioni.";

    case "invalid-amenity":
      return "Una delle dotazioni selezionate non è più disponibile.";

    case "load-failed":
      return "Non è stato possibile caricare il catalogo delle dotazioni.";

    case "save-failed":
      return "Non è stato possibile salvare le dotazioni. Riprova.";

    default:
      return null;
  }
}


export default async function AmenitiesPage({
  params,
  searchParams,
}: AmenitiesPageProps) {
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
      `/operator/fleet/${boat.id}/amenities?operator=${boat.operator_id}`,
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
    data: amenityRows,
    error: amenitiesError,
  } = await supabase
    .from("amenities")
    .select(`
      id,
      code,
      name,
      category,
      icon_name,
      sort_order
    `)
    .eq(
      "is_active",
      true,
    )
    .order(
      "sort_order",
      {
        ascending: true,
      },
    )
    .order(
      "name",
      {
        ascending: true,
      },
    );


  if (amenitiesError) {
    throw new Error(
      "Unable to load amenities.",
    );
  }


  const amenities =
    (amenityRows ??
      []) as AmenityRow[];


  const {
    data: selectedRows,
    error: selectedError,
  } = await supabase.rpc(
    "get_boat_amenities",
    {
      p_operator_id:
        operator.id,

      p_boat_id:
        boat.id,
    },
  );


  if (selectedError) {
    throw new Error(
      "Unable to load boat amenities.",
    );
  }


  const selectedAmenities =
    (
      Array.isArray(
        selectedRows,
      )
        ? selectedRows
        : []
    ) as SelectedAmenityRow[];


  const selectedById =
    new Map(
      selectedAmenities.map(
        (item) => [
          item.amenity_id,
          item,
        ],
      ),
    );


  const groupedAmenities =
    new Map<
      string,
      AmenityRow[]
    >();


  for (
    const amenity of amenities
  ) {
    const category =
      amenity.category ??
      "OTHER";

    const current =
      groupedAmenities.get(
        category,
      ) ?? [];

    current.push(
      amenity,
    );

    groupedAmenities.set(
      category,
      current,
    );
  }


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

          <p className="text-sm font-semibold text-[#14B8A6]">
            Dotazioni
          </p>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">

            <div>

              <h1 className="text-3xl font-semibold tracking-tight">
                Dotazioni di {boat.name}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Seleziona i comfort e gli equipaggiamenti disponibili a bordo.
              </p>

            </div>


            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {selectedAmenities.length} selezionate
            </span>

          </div>

        </section>


        {query.saved ===
        "1" ? (
          <div className="mt-5 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/10 p-4 text-sm">
            <strong>
              Dotazioni salvate.
            </strong>{" "}
            La configurazione della barca è stata aggiornata.
          </div>
        ) : null}


        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : null}


        <form
          action={
            saveBoatAmenities
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


          {Array.from(
            groupedAmenities.entries(),
          ).map(
            ([
              category,
              categoryAmenities,
            ]) => (
              <section
                key={
                  category
                }
                className="rounded-2xl border border-[#DEE5E8] bg-white p-6 shadow-sm"
              >

                <h2 className="text-xl font-semibold">
                  {CATEGORY_LABELS[
                    category
                  ] ??
                    category}
                </h2>


                <div className="mt-5 grid gap-4 md:grid-cols-2">

                  {categoryAmenities.map(
                    (amenity) => {
                      const selected =
                        selectedById.get(
                          amenity.id,
                        );

                      return (
                        <div
                          key={
                            amenity.id
                          }
                          className="rounded-xl border border-[#DEE5E8] p-4"
                        >

                          <label className="flex cursor-pointer items-start gap-3">

                            <input
                              type="checkbox"
                              name={`amenity_${amenity.id}`}
                              defaultChecked={
                                Boolean(
                                  selected,
                                )
                              }
                              disabled={
                                !canManage
                              }
                              className="mt-1 h-4 w-4"
                            />

                            <div>

                              <p className="text-sm font-semibold">
                                {amenity.name}
                              </p>

                              <p className="mt-1 text-xs text-[#64748B]">
                                {
                                  amenity.code
                                }
                              </p>

                            </div>

                          </label>


                          <div className="mt-4">

                            <label
                              htmlFor={`notes_${amenity.id}`}
                              className="mb-2 block text-xs font-medium text-[#64748B]"
                            >
                              Nota opzionale
                            </label>

                            <input
                              id={`notes_${amenity.id}`}
                              name={`notes_${amenity.id}`}
                              type="text"
                              maxLength={300}
                              defaultValue={
                                selected?.notes ??
                                ""
                              }
                              disabled={
                                !canManage
                              }
                              className="w-full rounded-lg border border-[#DEE5E8] px-3 py-2 text-sm outline-none disabled:bg-[#F1F5F4] focus:border-[#14B8A6]"
                              placeholder="Es. modello, quantità o dettaglio utile"
                            />

                          </div>

                        </div>
                      );
                    },
                  )}

                </div>

              </section>
            ),
          )}


          {canManage ? (
            <div className="flex justify-end">

              <button
                type="submit"
                className="rounded-xl bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Salva dotazioni
              </button>

            </div>
          ) : null}

        </form>

      </div>

    </main>
  );
}