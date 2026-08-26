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

function submissionErrorCode(
  message: string,
) {
  if (
    message.includes(
      "operator_legal_profile_incomplete",
    )
  ) {
    return "legal-incomplete";
  }

  if (
    message.includes(
      "operator_primary_location_incomplete",
    )
  ) {
    return "location-incomplete";
  }

  if (
    message.includes(
      "operator_required_documents_incomplete",
    )
  ) {
    return "documents-incomplete";
  }

  if (
    message.includes(
      "operator_verification_already_submitted",
    ) ||
    message.includes(
      "operator_verification_already_open",
    )
  ) {
    return "already-submitted";
  }

  if (
    message.includes(
      "operator_verification_submit_not_allowed",
    )
  ) {
    return "not-allowed";
  }

  return "submit-failed";
}

export async function submitVerification(
  formData: FormData,
) {
  const operatorId =
    readText(
      formData,
      "operator_id",
    );

  if (!operatorId) {
    redirect(
      "/operator/onboarding",
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
        `/operator/onboarding/submit?operator=${operatorId}`,
      )}`,
    );
  }

  const {
    data: verificationId,
    error,
  } = await supabase.rpc(
    "submit_operator_verification",
    {
      p_operator_id:
        operatorId,
    },
  );

  if (
    error ||
    typeof verificationId !==
      "string"
  ) {
    const errorCode =
      submissionErrorCode(
        error?.message ?? "",
      );

    redirect(
      `/operator/onboarding/submit?operator=${encodeURIComponent(
        operatorId,
      )}&error=${encodeURIComponent(
        errorCode,
      )}`,
    );
  }

  revalidatePath(
    "/operator/onboarding",
  );

  revalidatePath(
    "/operator/onboarding/submit",
  );

  revalidatePath(
    "/operator/onboarding/legal",
  );

  revalidatePath(
    "/operator/onboarding/location",
  );

  revalidatePath(
    "/operator/onboarding/documents",
  );

  redirect(
    `/operator/onboarding?operator=${encodeURIComponent(
      operatorId,
    )}&submitted=1`,
  );
}