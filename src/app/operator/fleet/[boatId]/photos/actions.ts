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

function photosUrl(
  boatId: string,
  operatorId: string,
  extra?: string,
) {
  const base =
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}/photos?operator=${encodeURIComponent(
      operatorId,
    )}`;

  return extra
    ? `${base}&${extra}`
    : base;
}

export async function setBoatCover(
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

  const imageId =
    readText(
      formData,
      "image_id",
    );

  if (
    !operatorId ||
    !boatId ||
    !imageId
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.rpc(
    "set_boat_cover_image",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_image_id:
        imageId,
    },
  );

  if (error) {
    redirect(
      photosUrl(
        boatId,
        operatorId,
        "error=action-failed",
      ),
    );
  }

  revalidatePath(
    `/operator/fleet/${boatId}/photos`,
  );

  redirect(
    photosUrl(
      boatId,
      operatorId,
    ),
  );
}


export async function moveBoatImage(
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

  const imageId =
    readText(
      formData,
      "image_id",
    );

  const direction =
    readText(
      formData,
      "direction",
    );

  if (
    !operatorId ||
    !boatId ||
    !imageId ||
    (
      direction !== "UP" &&
      direction !== "DOWN"
    )
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  const supabase =
    await createClient();

  const {
    error,
  } = await supabase.rpc(
    "move_boat_image",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_image_id:
        imageId,

      p_direction:
        direction,
    },
  );

  if (error) {
    redirect(
      photosUrl(
        boatId,
        operatorId,
        "error=action-failed",
      ),
    );
  }

  revalidatePath(
    `/operator/fleet/${boatId}/photos`,
  );

  redirect(
    photosUrl(
      boatId,
      operatorId,
    ),
  );
}


export async function deleteBoatImage(
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

  const imageId =
    readText(
      formData,
      "image_id",
    );

  if (
    !operatorId ||
    !boatId ||
    !imageId
  ) {
    redirect(
      "/operator/fleet",
    );
  }

  const supabase =
    await createClient();

  const {
    data: storagePath,
    error: metadataError,
  } = await supabase.rpc(
    "delete_boat_image",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_image_id:
        imageId,
    },
  );

  if (
    metadataError ||
    typeof storagePath !==
      "string"
  ) {
    redirect(
      photosUrl(
        boatId,
        operatorId,
        "error=delete-failed",
      ),
    );
  }


  const {
    error: storageError,
  } = await supabase.storage
    .from("boat-images")
    .remove([
      storagePath,
    ]);


  revalidatePath(
    `/operator/fleet/${boatId}/photos`,
  );


  if (storageError) {
    console.error(
      "Boatly boat image orphan cleanup warning",
      storageError,
    );

    redirect(
      photosUrl(
        boatId,
        operatorId,
        "warning=storage-cleanup",
      ),
    );
  }


  redirect(
    photosUrl(
      boatId,
      operatorId,
    ),
  );
}