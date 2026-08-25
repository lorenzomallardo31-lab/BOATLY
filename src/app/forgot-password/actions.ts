"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(
  formData: FormData,
) {
  const emailValue = formData.get("email");

  if (typeof emailValue !== "string") {
    redirect(
      "/forgot-password?error=invalid-email",
    );
  }

  const email = emailValue.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(
      "/forgot-password?error=invalid-email",
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email,
    );

  if (error) {
    redirect(
      "/forgot-password?error=request-failed",
    );
  }

  redirect("/forgot-password?sent=1");
}