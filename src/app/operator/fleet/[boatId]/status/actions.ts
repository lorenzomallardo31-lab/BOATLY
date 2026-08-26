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


function statusUrl(
  boatId: string,
  operatorId: string,
  extra?: string,
) {
  const base =
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}/status?operator=${encodeURIComponent(
      operatorId,
    )}`;

  return extra
    ? `${base}&${extra}`
    : base;
}


export async function changeBoatStatus(
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

  const targetStatus =
    readText(
      formData,
      "target_status",
    );


  if (
    !operatorId ||
    !boatId
  ) {
    redirect(
      "/operator/fleet",
    );
  }


  if (
    targetStatus !== "ACTIVE" &&
    targetStatus !== "INACTIVE"
  ) {
    redirect(
      statusUrl(
        boatId,
        operatorId,
        "error=invalid-status",
      ),
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
        `/operator/fleet/${boatId}/status`,
      )}`,
    );
  }


  const {
    error,
  } = await supabase.rpc(
    "set_boat_fleet_status",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_status:
        targetStatus,
    },
  );


  if (error) {
    let errorCode =
      "status-change-failed";


    if (
      error.message.includes(
        "boat_not_ready_for_activation",
      ) ||
      error.message.includes(
        "active_boat_must_remain_complete",
      )
    ) {
      errorCode =
        "not-ready";
    }


    if (
      error.message.includes(
        "boat_status_change_not_allowed",
      )
    ) {
      errorCode =
        "not-allowed";
    }


    redirect(
      statusUrl(
        boatId,
        operatorId,
        `error=${encodeURIComponent(
          errorCode,
        )}`,
      ),
    );
  }


  revalidatePath(
    "/operator/fleet",
  );

  revalidatePath(
    `/operator/fleet/${boatId}`,
  );

  revalidatePath(
    `/operator/fleet/${boatId}/status`,
  );


  redirect(
    statusUrl(
      boatId,
      operatorId,
      `changed=${encodeURIComponent(
        targetStatus,
      )}`,
    ),
  );
}


export async function archiveBoat(
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

  const confirmation =
    readText(
      formData,
      "confirmation",
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
        `/operator/fleet/${boatId}/status`,
      )}`,
    );
  }


  const {
    data: boat,
    error: boatError,
  } = await supabase
    .from("boats")
    .select(
      "id, operator_id, name",
    )
    .eq(
      "id",
      boatId,
    )
    .eq(
      "operator_id",
      operatorId,
    )
    .maybeSingle();


  if (
    boatError ||
    !boat
  ) {
    redirect(
      statusUrl(
        boatId,
        operatorId,
        "error=boat-not-found",
      ),
    );
  }


  if (
    confirmation !==
      boat.name
  ) {
    redirect(
      statusUrl(
        boatId,
        operatorId,
        "error=archive-confirmation",
      ),
    );
  }


  const {
    error,
  } = await supabase.rpc(
    "set_boat_fleet_status",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_status:
        "ARCHIVED",
    },
  );


  if (error) {
    redirect(
      statusUrl(
        boatId,
        operatorId,
        "error=archive-failed",
      ),
    );
  }


  revalidatePath(
    "/operator/fleet",
  );

  revalidatePath(
    `/operator/fleet/${boatId}/status`,
  );


  redirect(
    statusUrl(
      boatId,
      operatorId,
      "changed=ARCHIVED",
    ),
  );
}