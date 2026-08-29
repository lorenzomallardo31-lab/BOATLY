"use server";

import {
  revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_OPERATOR_STATUSES = [
  "ACTIVE",
];

export async function saveBoatEssentials(formData: FormData) {
  const operatorId = readText(formData, "operator_id");
  const boatId = readText(formData, "boat_id");
  const name = readText(formData, "name");
  const internalCode = readText(formData, "internal_code");
  const boatTypeId = readText(formData, "boat_type_id");
  const primaryLocationId = readText(formData, "primary_location_id");
  const enginePowerHp = optionalNumber(readText(formData, "engine_power_hp"));
  const licenseRequired = optionalBoolean(readText(formData, "license_required"));

  if (!operatorId || !boatId) redirect("/operator/fleet");
  if (!name || name.length > 160) redirectWithError(boatId, operatorId, "invalid-name");
  if (internalCode.length > 80) redirectWithError(boatId, operatorId, "invalid-internal-code");
  if (enginePowerHp === undefined || enginePowerHp === null || enginePowerHp <= 0 || enginePowerHp > 100000) {
    redirectWithError(boatId, operatorId, "invalid-engine-power");
  }
  if (licenseRequired === undefined || licenseRequired === null) {
    redirectWithError(boatId, operatorId, "invalid-boolean-value");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims || typeof claimsData.claims.sub !== "string") {
    redirect(`/sign-in?next=${encodeURIComponent(`/operator/fleet/${boatId}?operator=${operatorId}`)}`);
  }

  const userId = claimsData.claims.sub;
  const [{ data: membership }, { data: operator }] = await Promise.all([
    supabase.from("operator_members").select("role").eq("operator_id", operatorId).eq("user_id", userId).eq("status", "ACTIVE").maybeSingle(),
    supabase.from("operators").select("status").eq("id", operatorId).is("deleted_at", null).maybeSingle(),
  ]);
  if (!membership || !["OWNER", "MANAGER"].includes(membership.role) || operator?.status !== "ACTIVE") {
    redirectWithError(boatId, operatorId, "not-allowed");
  }

  if (boatTypeId) {
    const { data } = await supabase.from("boat_types").select("id").eq("id", boatTypeId).eq("is_active", true).maybeSingle();
    if (!data) redirectWithError(boatId, operatorId, "invalid-boat-type");
  }
  if (primaryLocationId) {
    const { data } = await supabase.from("operator_locations").select("id").eq("id", primaryLocationId).eq("operator_id", operatorId).eq("is_active", true).maybeSingle();
    if (!data) redirectWithError(boatId, operatorId, "invalid-location");
  }

  const { error } = await supabase
    .from("boats")
    .update({
      name,
      internal_code: internalCode || null,
      boat_type_id: boatTypeId || null,
      primary_location_id: primaryLocationId || null,
      engine_power_hp: enginePowerHp,
      license_required: licenseRequired,
    })
    .eq("id", boatId)
    .eq("operator_id", operatorId)
    .is("deleted_at", null)
    .is("deletion_requested_at", null);

  if (error) {
    const code = error.code === "23505" ? "duplicate-value" : "save-failed";
    redirectWithError(boatId, operatorId, code);
  }

  revalidatePath("/operator/calendar");
  revalidatePath("/operator/fleet");
  revalidatePath(`/operator/fleet/${boatId}`);
  redirect(`/operator/fleet/${boatId}?operator=${encodeURIComponent(operatorId)}&saved=1`);
}

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

function nullableText(
  value: string,
) {
  return value || null;
}

function optionalInteger(
  value: string,
) {
  if (!value) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed)
  ) {
    return undefined;
  }

  return parsed;
}

function optionalNumber(
  value: string,
) {
  if (!value) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return undefined;
  }

  return parsed;
}

function optionalBoolean(
  value: string,
) {
  if (!value) {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function redirectWithError(
  boatId: string,
  operatorId: string,
  error: string,
): never {
  redirect(
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}?operator=${encodeURIComponent(
      operatorId,
    )}&error=${encodeURIComponent(
      error,
    )}`,
  );
}

export async function saveBoatDetails(
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

  const name =
    readText(
      formData,
      "name",
    );

  const internalCode =
    readText(
      formData,
      "internal_code",
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

  const shortDescription =
    readText(
      formData,
      "short_description",
    );

  const description =
    readText(
      formData,
      "description",
    );

  const manufacturer =
    readText(
      formData,
      "manufacturer",
    );

  const model =
    readText(
      formData,
      "model",
    );

  const registrationNumber =
    readText(
      formData,
      "registration_number",
    );

  const registrationCountryCode =
    readText(
      formData,
      "registration_country_code",
    ).toUpperCase();

  const hullIdentificationNumber =
    readText(
      formData,
      "hull_identification_number",
    );

  const manufactureYear =
    optionalInteger(
      readText(
        formData,
        "manufacture_year",
      ),
    );

  const lengthCm =
    optionalInteger(
      readText(
        formData,
        "length_cm",
      ),
    );

  const beamCm =
    optionalInteger(
      readText(
        formData,
        "beam_cm",
      ),
    );

  const draftCm =
    optionalInteger(
      readText(
        formData,
        "draft_cm",
      ),
    );

  const technicalPassengerCapacity =
    optionalInteger(
      readText(
        formData,
        "technical_passenger_capacity",
      ),
    );

  const operatorPassengerLimit =
    optionalInteger(
      readText(
        formData,
        "operator_passenger_limit",
      ),
    );

  const cabins =
    optionalInteger(
      readText(
        formData,
        "cabins",
      ),
    );

  const berths =
    optionalInteger(
      readText(
        formData,
        "berths",
      ),
    );

  const bathrooms =
    optionalInteger(
      readText(
        formData,
        "bathrooms",
      ),
    );

  const engineCount =
    optionalInteger(
      readText(
        formData,
        "engine_count",
      ),
    );

  const engineManufacturer =
    readText(
      formData,
      "engine_manufacturer",
    );

  const engineModel =
    readText(
      formData,
      "engine_model",
    );

  const engineInstallation =
    readText(
      formData,
      "engine_installation",
    );

  const engineFuelType =
    readText(
      formData,
      "engine_fuel_type",
    );

  const engineCombustionCycle =
    optionalInteger(
      readText(
        formData,
        "engine_combustion_cycle",
      ),
    );

  const engineDirectInjection =
    optionalBoolean(
      readText(
        formData,
        "engine_direct_injection",
      ),
    );

  const enginePowerKw =
    optionalNumber(
      readText(
        formData,
        "engine_power_kw",
      ),
    );

  const enginePowerHp =
    optionalNumber(
      readText(
        formData,
        "engine_power_hp",
      ),
    );

  const engineDisplacementCc =
    optionalInteger(
      readText(
        formData,
        "engine_displacement_cc",
      ),
    );

  const maxSpeedKnots =
    optionalNumber(
      readText(
        formData,
        "max_speed_knots",
      ),
    );

  const licenseRequired =
    optionalBoolean(
      readText(
        formData,
        "license_required",
      ),
    );


  // ==========================================================
  // BASIC VALIDATION
  // ==========================================================

  if (
    !name ||
    name.length > 160
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-name",
    );
  }

  if (
    !boatTypeId ||
    !primaryLocationId
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "missing-required-fields",
    );
  }

  if (
    internalCode.length > 80
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-internal-code",
    );
  }

  if (
    shortDescription.length > 280
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "short-description-too-long",
    );
  }

  if (
    manufactureYear ===
      undefined ||
    (
      manufactureYear !== null &&
      (
        manufactureYear < 1900 ||
        manufactureYear > 2100
      )
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-manufacture-year",
    );
  }

  if (
    registrationCountryCode &&
    !/^[A-Z]{2}$/.test(
      registrationCountryCode,
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-registration-country",
    );
  }


  // ==========================================================
  // TECHNICAL VALIDATION
  // ==========================================================

  if (
    lengthCm === undefined ||
    (
      lengthCm !== null &&
      lengthCm <= 0
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-length",
    );
  }

  if (
    beamCm === undefined ||
    (
      beamCm !== null &&
      beamCm <= 0
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-beam",
    );
  }

  if (
    draftCm === undefined ||
    (
      draftCm !== null &&
      draftCm < 0
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-draft",
    );
  }

  if (
    technicalPassengerCapacity ===
      undefined ||
    (
      technicalPassengerCapacity !==
        null &&
      technicalPassengerCapacity <= 0
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-technical-capacity",
    );
  }

  if (
    operatorPassengerLimit ===
      undefined ||
    (
      operatorPassengerLimit !==
        null &&
      operatorPassengerLimit <= 0
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-operator-capacity",
    );
  }

  if (
    technicalPassengerCapacity !==
      null &&
    operatorPassengerLimit !==
      null &&
    technicalPassengerCapacity !==
      undefined &&
    operatorPassengerLimit !==
      undefined &&
    operatorPassengerLimit >
      technicalPassengerCapacity
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "operator-capacity-too-high",
    );
  }

  for (
    const value of [
      cabins,
      berths,
      bathrooms,
      engineCount,
      engineDisplacementCc,
    ]
  ) {
    if (
      value === undefined ||
      (
        value !== null &&
        value < 0
      )
    ) {
      redirectWithError(
        boatId,
        operatorId,
        "invalid-non-negative-value",
      );
    }
  }

  for (
    const value of [
      enginePowerKw,
      enginePowerHp,
      maxSpeedKnots,
    ]
  ) {
    if (
      value === undefined ||
      (
        value !== null &&
        value < 0
      )
    ) {
      redirectWithError(
        boatId,
        operatorId,
        "invalid-non-negative-value",
      );
    }
  }

  if (
    engineCombustionCycle ===
      undefined ||
    (
      engineCombustionCycle !==
        null &&
      engineCombustionCycle !== 2 &&
      engineCombustionCycle !== 4
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-combustion-cycle",
    );
  }

  if (
    engineDirectInjection ===
      undefined ||
    licenseRequired ===
      undefined
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-boolean-value",
    );
  }


  // ==========================================================
  // AUTH
  // ==========================================================

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
        `/operator/fleet/${boatId}?operator=${operatorId}`,
      )}`,
    );
  }

  const userId =
    claimsData.claims.sub;


  // ==========================================================
  // MEMBERSHIP
  // ==========================================================

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
      boatId,
      operatorId,
      "not-allowed",
    );
  }


  // ==========================================================
  // OPERATOR STATE
  // ==========================================================

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
      boatId,
      operatorId,
      "operator-not-manageable",
    );
  }


  // ==========================================================
  // BOAT OWNERSHIP
  // ==========================================================

  const {
    data: existingBoat,
    error: boatError,
  } = await supabase
    .from("boats")
    .select(
      "id, operator_id",
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
    !existingBoat
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "boat-not-found",
    );
  }


  // ==========================================================
  // BOAT TYPE
  // ==========================================================

  const {
    data: boatType,
    error: boatTypeError,
  } = await supabase
    .from("boat_types")
    .select("id")
    .eq(
      "id",
      boatTypeId,
    )
    .eq(
      "is_active",
      true,
    )
    .maybeSingle();

  if (
    boatTypeError ||
    !boatType
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-boat-type",
    );
  }


  // ==========================================================
  // LOCATION
  // ==========================================================

  const {
    data: location,
    error: locationError,
  } = await supabase
    .from("operator_locations")
    .select("id")
    .eq(
      "id",
      primaryLocationId,
    )
    .eq(
      "operator_id",
      operatorId,
    )
    .eq(
      "is_active",
      true,
    )
    .maybeSingle();

  if (
    locationError ||
    !location
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-location",
    );
  }


  // ==========================================================
  // UPDATE
  // ==========================================================

  const {
    error: updateError,
  } = await supabase
    .from("boats")
    .update({
      name,

      internal_code:
        nullableText(
          internalCode,
        ),

      boat_type_id:
        boatTypeId,

      primary_location_id:
        primaryLocationId,

      short_description:
        nullableText(
          shortDescription,
        ),

      description:
        nullableText(
          description,
        ),

      manufacturer:
        nullableText(
          manufacturer,
        ),

      model:
        nullableText(
          model,
        ),

      manufacture_year:
        manufactureYear,

      registration_number:
        nullableText(
          registrationNumber,
        ),

      registration_country_code:
        nullableText(
          registrationCountryCode,
        ),

      hull_identification_number:
        nullableText(
          hullIdentificationNumber,
        ),

      length_cm:
        lengthCm,

      beam_cm:
        beamCm,

      draft_cm:
        draftCm,

      technical_passenger_capacity:
        technicalPassengerCapacity,

      operator_passenger_limit:
        operatorPassengerLimit,

      cabins,

      berths,

      bathrooms,

      engine_count:
        engineCount,

      engine_manufacturer:
        nullableText(
          engineManufacturer,
        ),

      engine_model:
        nullableText(
          engineModel,
        ),

      engine_installation:
        nullableText(
          engineInstallation,
        ),

      engine_fuel_type:
        nullableText(
          engineFuelType,
        ),

      engine_combustion_cycle:
        engineCombustionCycle,

      engine_direct_injection:
        engineDirectInjection,

      engine_power_kw:
        enginePowerKw,

      engine_power_hp:
        enginePowerHp,

      engine_displacement_cc:
        engineDisplacementCc,

      max_speed_knots:
        maxSpeedKnots,

      license_required:
        licenseRequired,
    })
    .eq(
      "id",
      boatId,
    )
    .eq(
      "operator_id",
      operatorId,
    );

  if (updateError) {
    if (
      updateError.code === "23505"
    ) {
      redirectWithError(
        boatId,
        operatorId,
        "duplicate-value",
      );
    }

    redirectWithError(
      boatId,
      operatorId,
      "save-failed",
    );
  }

  revalidatePath(
    "/operator/fleet",
  );

  revalidatePath(
    `/operator/fleet/${boatId}`,
  );

  redirect(
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}?operator=${encodeURIComponent(
      operatorId,
    )}&saved=1`,
  );
}
