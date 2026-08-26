import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import {
  deleteBoatImage,
  moveBoatImage,
  setBoatCover,
} from "./actions";

import PhotoUploadForm from "./photo-upload-form";

type PhotosPageProps = {
  params: Promise<{
    boatId: string;
  }>;

  searchParams: Promise<{
    operator?: string;
    error?: string;
    warning?: string;
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

type BoatImageRow = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
  updated_at: string;
};

type ImageWithUrl =
  BoatImageRow & {
    signedUrl: string | null;
  };

const MANAGEABLE_OPERATOR_STATUSES = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "ACTIVE",
];

export default async function PhotosPage({
  params,
  searchParams,
}: PhotosPageProps) {
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
      `/operator/fleet/${boat.id}/photos?operator=${boat.operator_id}`,
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
    data: imageRows,
    error: imagesError,
  } = await supabase.rpc(
    "get_boat_images",
    {
      p_operator_id:
        operator.id,

      p_boat_id:
        boat.id,
    },
  );


  if (imagesError) {
    throw new Error(
      "Unable to load boat images.",
    );
  }


  const images =
    (
      Array.isArray(
        imageRows,
      )
        ? imageRows
        : []
    ) as BoatImageRow[];


  const imagesWithUrls:
    ImageWithUrl[] =
      await Promise.all(
        images.map(
          async (
            image,
          ) => {
            const {
              data,
              error,
            } =
              await supabase.storage
                .from(
                  "boat-images",
                )
                .createSignedUrl(
                  image.storage_path,
                  600,
                );


            if (error) {
              console.error(
                "Unable to sign boat image",
                error,
              );
            }


            return {
              ...image,

              signedUrl:
                data?.signedUrl ??
                null,
            };
          },
        ),
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
            Galleria
          </p>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">

            <div>

              <h1 className="text-3xl font-semibold tracking-tight">
                Foto di {boat.name}
              </h1>

              <p className="mt-2 text-sm text-[#64748B]">
                Gestisci immagini, copertina e ordine di visualizzazione.
              </p>

            </div>


            <span className="rounded-full bg-[#F1F5F4] px-4 py-2 text-xs font-semibold">
              {images.length}{" "}
              {images.length === 1
                ? "foto"
                : "foto"}
            </span>

          </div>

        </section>


        {query.error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Non è stato possibile completare l&apos;operazione sulla foto.
          </div>
        ) : null}


        {query.warning ===
        "storage-cleanup" ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            La foto è stata rimossa dalla galleria, ma la pulizia del file Storage dovrà essere verificata nell&apos;audit finale.
          </div>
        ) : null}


        {canManage ? (
          <div className="mt-6">

            <PhotoUploadForm
              operatorId={
                operator.id
              }
              boatId={
                boat.id
              }
            />

          </div>
        ) : null}


        {imagesWithUrls.length ===
        0 ? (

          <section className="mt-6 rounded-2xl border border-dashed border-[#DEE5E8] bg-white p-8 text-center">

            <h2 className="text-xl font-semibold">
              Nessuna foto caricata
            </h2>

            <p className="mt-2 text-sm text-[#64748B]">
              Carica la prima immagine della barca.
              Diventerà automaticamente la copertina.
            </p>

          </section>

        ) : (

          <section className="mt-6 grid gap-5 sm:grid-cols-2">

            {imagesWithUrls.map(
              (
                image,
                index,
              ) => (
                <article
                  key={
                    image.id
                  }
                  className="overflow-hidden rounded-2xl border border-[#DEE5E8] bg-white shadow-sm"
                >

                  <div
                    className="relative aspect-[4/3] bg-[#F1F5F4] bg-cover bg-center"
                    style={
                      image.signedUrl
                        ? {
                            backgroundImage:
                              `url("${image.signedUrl}")`,
                          }
                        : undefined
                    }
                  >

                    {image.is_cover ? (
                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-2 text-xs font-semibold shadow">
                        Copertina
                      </span>
                    ) : null}

                    {!image.signedUrl ? (
                      <div className="flex h-full items-center justify-center text-sm text-[#64748B]">
                        Anteprima non disponibile
                      </div>
                    ) : null}

                  </div>


                  <div className="p-5">

                    <p className="text-sm font-semibold">
                      Foto {index + 1}
                    </p>

                    <p className="mt-1 min-h-5 text-xs text-[#64748B]">
                      {image.alt_text ??
                        "Nessun testo alternativo"}
                    </p>


                    {canManage ? (
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#DEE5E8] pt-4">

                        {!image.is_cover ? (
                          <form
                            action={
                              setBoatCover
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
                              name="image_id"
                              value={
                                image.id
                              }
                            />

                            <button
                              type="submit"
                              className="rounded-lg border border-[#DEE5E8] px-3 py-2 text-xs font-semibold hover:bg-[#F1F5F4]"
                            >
                              Imposta copertina
                            </button>

                          </form>
                        ) : null}


                        {index > 0 ? (
                          <form
                            action={
                              moveBoatImage
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
                              name="image_id"
                              value={
                                image.id
                              }
                            />

                            <input
                              type="hidden"
                              name="direction"
                              value="UP"
                            />

                            <button
                              type="submit"
                              className="rounded-lg border border-[#DEE5E8] px-3 py-2 text-xs font-semibold hover:bg-[#F1F5F4]"
                            >
                              ← Prima
                            </button>

                          </form>
                        ) : null}


                        {index <
                        imagesWithUrls.length -
                          1 ? (
                          <form
                            action={
                              moveBoatImage
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
                              name="image_id"
                              value={
                                image.id
                              }
                            />

                            <input
                              type="hidden"
                              name="direction"
                              value="DOWN"
                            />

                            <button
                              type="submit"
                              className="rounded-lg border border-[#DEE5E8] px-3 py-2 text-xs font-semibold hover:bg-[#F1F5F4]"
                            >
                              Dopo →
                            </button>

                          </form>
                        ) : null}


                        <form
                          action={
                            deleteBoatImage
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
                            name="image_id"
                            value={
                              image.id
                            }
                          />

                          <button
                            type="submit"
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Elimina
                          </button>

                        </form>

                      </div>
                    ) : null}

                  </div>

                </article>
              ),
            )}

          </section>

        )}

      </div>

    </main>
  );
}