"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getSafeNext(value: FormDataEntryValue | null) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/account";
}

export async function signIn(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  const next = getSafeNext(formData.get("next"));

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string"
  ) {
    redirect("/sign-in?error=invalid-form");
  }

  const email = emailValue.trim().toLowerCase();
  const password = passwordValue;

  if (!email || !password) {
    redirect("/sign-in?error=invalid-form");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/sign-in?error=invalid-credentials");
  }

  redirect(next);
}