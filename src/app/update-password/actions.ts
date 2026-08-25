"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function updatePassword(
  formData: FormData,
) {
  const passwordValue = formData.get("password");

  const confirmPasswordValue =
    formData.get("confirmPassword");

  if (
    typeof passwordValue !== "string" ||
    typeof confirmPasswordValue !== "string"
  ) {
    redirect(
      "/update-password?error=invalid-form",
    );
  }

  const password = passwordValue;
  const confirmPassword = confirmPasswordValue;

  if (password.length < 8) {
    redirect(
      "/update-password?error=password-too-short",
    );
  }

  if (password !== confirmPassword) {
    redirect(
      "/update-password?error=password-mismatch",
    );
  }

  const supabase = await createClient();

  const { data, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !data?.claims) {
    redirect(
      "/forgot-password?error=invalid-recovery-session",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(
      "/update-password?error=update-failed",
    );
  }

  await supabase.auth.signOut({
    scope: "local",
  });

  redirect("/sign-in?passwordUpdated=1");
}