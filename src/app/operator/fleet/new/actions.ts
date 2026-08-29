"use server";

import {
  revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_OPERATOR_STATUSES = [
  "ACTIVE",
];

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

function redirectWithError(
  operatorId: string,
  error: string,
): never {
  redirect(
    `/operator/fleet/new?operator=${encodeURIComponent(
      operatorId,
    )}&error=${encodeURIComponent(
      error,
    )}`,
  );
}

export async function createBoatDraft(
  formData: FormData,
) {
  const operatorId =
    readText(
      formData,
      "operator_id",
    );

  const name =
    readText(
      formData,
      "name",
    );

  const boatTypeId =
    readText(
      formData,
      "boat_type_id",
    );

  const primaryLocationId =
    readText(
      formData,
      "primary_location_id",
    );

  const internalCode =
    readText(
      formData,
      "internal_code",
    );

  const enginePowerHp = Number(
    readText(formData, "engine_power_hp").replace(",", "."),
  );

  const licenseRequiredRaw = readText(
    formData,
    "license_required",
  );

  if (!operatorId) {
    redirect(
      "/operator/fleet",
    );
  }

  if (
    !name ||
    name.length > 160
  ) {
    redirectWithError(
      operatorId,
      "invalid-name",
    );
  }

  if (!Number.isFinite(enginePowerHp) || enginePowerHp <= 0 || enginePowerHp > 100000) {
    redirectWithError(
      operatorId,
      "invalid-engine-power",
    );
  }

  if (licenseRequiredRaw !== "true" && licenseRequiredRaw !== "false") {
    redirectWithError(
      operatorId,
      "invalid-license-required",
    );
  }

  if (
    internalCode.length > 80
  ) {
    redirectWithError(
      operatorId,
      "invalid-internal-code",
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
    !claimsData?.claims ||
    typeof claimsData.claims.sub !==
      "string"
  ) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/fleet/new?operator=${operatorId}`,
      )}`,
    );
  }

  const userId =
    claimsData.claims.sub;

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
      operatorId,
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
    !membership ||
    (
      membership.role !== "OWNER" &&
      membership.role !== "MANAGER"
    )
  ) {
    redirectWithError(
      operatorId,
      "not-allowed",
    );
  }

  const {
    data: operator,
    error: operatorError,
  } = await supabase
    .from("operators")
    .select(
      "id, status",
    )
    .eq(
      "id",
      operatorId,
    )
    .maybeSingle();

  if (
    operatorError ||
    !operator ||
    !MANAGEABLE_OPERATOR_STATUSES.includes(
      operator.status,
    )
  ) {
    redirectWithError(
      operatorId,
      "operator-not-manageable",
    );
  }

  if (boatTypeId) {
    const { data: boatType, error: boatTypeError } = await supabase
      .from("boat_types")
      .select("id")
      .eq("id", boatTypeId)
      .eq("is_active", true)
      .maybeSingle();

    if (boatTypeError || !boatType) {
      redirectWithError(operatorId, "invalid-boat-type");
    }
  }

  if (primaryLocationId) {
    const { data: location, error: locationError } = await supabase
      .from("operator_locations")
      .select("id")
      .eq("id", primaryLocationId)
      .eq("operator_id", operatorId)
      .eq("is_active", true)
      .maybeSingle();

    if (locationError || !location) {
      redirectWithError(operatorId, "invalid-location");
    }
  }

  const {
    data: boatId,
    error: insertError,
  } = await supabase.rpc("operator_create_operational_boat", {
    p_operator_id: operatorId,
    p_name: name,
    p_engine_power_hp: enginePowerHp,
    p_license_required: licenseRequiredRaw === "true",
    p_internal_code: internalCode || null,
    p_boat_type_id: boatTypeId || null,
    p_primary_location_id: primaryLocationId || null,
  });

  if (insertError) {
    if (
      insertError.code ===
      "23505"
    ) {
      redirectWithError(
        operatorId,
        "duplicate-internal-code",
      );
    }

    redirectWithError(
      operatorId,
      "create-failed",
    );
  }

  if (!boatId) {
    redirectWithError(
      operatorId,
      "create-failed",
    );
  }

  revalidatePath(
    "/operator/fleet",
  );

  redirect(
    `/operator/fleet?operator=${encodeURIComponent(
      operatorId,
    )}&created=1&boat=${encodeURIComponent(
      boatId,
    )}`,
  );
}
