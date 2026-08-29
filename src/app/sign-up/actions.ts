"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string"
  ) {
    redirect("/sign-up?error=invalid-form");
  }

  const email = emailValue.trim().toLowerCase();
  const password = passwordValue;

  if (!email || !email.includes("@")) {
    redirect("/sign-up?error=invalid-email");
  }

  if (password.length < 12) {
    redirect("/sign-up?error=password-too-short");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect("/sign-up?error=signup-failed");
  }

  redirect("/sign-up?checkEmail=1");
}
