"use server";

import {
  revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const LEGAL_TYPES = [
  "LOCAZIONE",
  "LOCAZIONE_WITH_COMMANDER",
  "NOLEGGIO",
] as const;

type LegalType =
  (typeof LEGAL_TYPES)[number];

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

function isLegalType(
  value: string,
): value is LegalType {
  return LEGAL_TYPES.includes(
    value as LegalType,
  );
}

function redirectWithError(
  boatId: string,
  operatorId: string,
  error: string,
): never {
  redirect(
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}/offering?operator=${encodeURIComponent(
      operatorId,
    )}&error=${encodeURIComponent(
      error,
    )}`,
  );
}

export async function saveLegalOffering(
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

  const legalType =
    readText(
      formData,
      "legal_type",
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
    !isLegalType(
      legalType,
    )
  ) {
    redirectWithError(
      boatId,
      operatorId,
      "invalid-legal-type",
    );
  }

  const skipperMode =
    readText(
      formData,
      "skipper_mode",
    );

  const selfDriveAllowed =
    readText(
      formData,
      "self_drive_allowed",
    );

  const minimumDriverAge =
    readText(
      formData,
      "minimum_driver_age",
    );

  const navigationLimitNotes =
    readText(
      formData,
      "navigation_limit_notes",
    );

  const eligibilityNotes =
    readText(
      formData,
      "eligibility_notes",
    );

  const isActive =
    formData.get(
      "is_active",
    ) === "on";

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
        `/operator/fleet/${boatId}/offering`,
      )}`,
    );
  }

  const {
    error,
  } = await supabase.rpc(
    "save_boat_legal_offering",
    {
      p_operator_id:
        operatorId,

      p_boat_id:
        boatId,

      p_legal_type:
        legalType,

      p_payload: {
        skipper_mode:
          skipperMode,

        self_drive_allowed:
          selfDriveAllowed,

        minimum_driver_age:
          minimumDriverAge,

        navigation_limit_notes:
          navigationLimitNotes,

        eligibility_notes:
          eligibilityNotes,

        is_active:
          isActive,
      },
    },
  );

  if (error) {
    let errorCode =
      "save-failed";

    if (
      error.message.includes(
        "minimum_driver_age_requires_self_drive",
      )
    ) {
      errorCode =
        "age-without-self-drive";
    }

    if (
      error.message.includes(
        "invalid_minimum_driver_age",
      )
    ) {
      errorCode =
        "invalid-age";
    }

    if (
      error.message.includes(
        "boat_legal_offering_save_not_allowed",
      )
    ) {
      errorCode =
        "not-allowed";
    }

    redirectWithError(
      boatId,
      operatorId,
      errorCode,
    );
  }

  revalidatePath(
    `/operator/fleet/${boatId}/offering`,
  );

  redirect(
    `/operator/fleet/${encodeURIComponent(
      boatId,
    )}/offering?operator=${encodeURIComponent(
      operatorId,
    )}&saved=${encodeURIComponent(
      legalType,
    )}`,
  );
}