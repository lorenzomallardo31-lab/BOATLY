"use server";

import {
  revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function readText(
  formData: FormData,
  field: string,
) {
  const value =
    formData.get(field);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function amenitiesUrl(
  boatId: string,
  operatorId: string,
  extra?: string,
) {
  const base =
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}/amenities?operator=${encodeURIComponent(
      operatorId,
    )}`;

  return extra
    ? `${base}&${extra}`
    : base;
}


export async function saveBoatAmenities(
  formData: FormData,
) {
  const operatorId =
    readText(
      formData,
      "operator_id",
    );

  const boatId =
    readText(
      formData,
      "boat_id",
    );


  if (
    !operatorId ||
    !boatId
  ) {
    redirect(
      "/operator/fleet",
    );
  }


  const supabase =
    await createClient();


  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();


  if (
    claimsError ||
    !claimsData?.claims
  ) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/fleet/${boatId}/amenities`,
      )}`,
    );
  }


  const {
    data: amenityRows,
    error: amenitiesError,
  } = await supabase
    .from("amenities")
    .select("id")
    .eq(
      "is_active",
      true,
    );


  if (amenitiesError) {
    redirect(
      amenitiesUrl(
        boatId,
        operatorId,
        "error=load-failed",
      ),
    );
  }


  const items =
    (amenityRows ?? [])
      .filter(
        (amenity) =>
          formData.get(
            `amenity_${amenity.id}`,
          ) === "on",
      )
      .map(
        (amenity) => {
          const notes =
            readText(
              formData,
              `notes_${amenity.id}`,
            );

          return {
            amenity_id:
              amenity.id,

            notes:
              notes || null,
          };
        },
      );


  const {
    error,
  } = await supabase.rpc(
    "save_boat_amenities",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_items:
        items,
    },
  );


  if (error) {
    let errorCode =
      "save-failed";


    if (
      error.message.includes(
        "boat_amenities_save_not_allowed",
      )
    ) {
      errorCode =
        "not-allowed";
    }


    if (
      error.message.includes(
        "inactive_or_unknown_amenity",
      )
    ) {
      errorCode =
        "invalid-amenity";
    }


    redirect(
      amenitiesUrl(
        boatId,
        operatorId,
        `error=${encodeURIComponent(
          errorCode,
        )}`,
      ),
    );
  }


  revalidatePath(
    `/operator/fleet/${boatId}/amenities`,
  );


  redirect(
    amenitiesUrl(
      boatId,
      operatorId,
      "saved=1",
    ),
  );
}