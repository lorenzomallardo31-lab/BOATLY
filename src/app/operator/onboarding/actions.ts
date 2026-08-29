"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function createOperatorWorkspace(
  formData: FormData,
) {
  const nameValue = formData.get("name");

  if (typeof nameValue !== "string") {
    redirect(
      "/operator/onboarding?error=invalid-name",
    );
  }

  const name = nameValue.trim();

  if (name.length < 1 || name.length > 120) {
    redirect(
      "/operator/onboarding?error=invalid-name",
    );
  }

  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(
      "/sign-in?next=/operator/onboarding",
    );
  }

  const { data, error } = await supabase.rpc(
    "bootstrap_operator_workspace",
    {
      p_name: name,
    },
  );

  if (error?.message.includes("operator_account_closed")) {
    redirect(
      "/operator/onboarding?error=account-closed",
    );
  }

  if (error?.message.includes("operator_workspace_already_exists")) {
    redirect(
      "/operator/onboarding?error=workspace-exists",
    );
  }

  if (error || typeof data !== "string") {
    redirect(
      "/operator/onboarding?error=bootstrap-failed",
    );
  }

  redirect(
    `/operator/onboarding?created=1&operator=${encodeURIComponent(data)}`,
  );
}
