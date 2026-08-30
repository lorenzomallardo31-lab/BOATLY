"use server";

import { redirect } from "next/navigation";

import {
  isValidStaffUsername,
  normalizeStaffUsername,
  staffAuthenticationEmail,
} from "@/lib/operator/staff-auth";
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
  const identifierValue = formData.get("identifier");
  const passwordValue = formData.get("password");

  const next = getSafeNext(formData.get("next"));

  if (
    typeof identifierValue !== "string" ||
    typeof passwordValue !== "string"
  ) {
    redirect("/sign-in?error=invalid-form");
  }

  const identifier = identifierValue.trim().toLowerCase();
  const password = passwordValue;
  const staffLogin = !identifier.includes("@");

  if (!identifier || !password || (staffLogin && !isValidStaffUsername(identifier))) {
    redirect("/sign-in?error=invalid-form");
  }

  const email = staffLogin
    ? staffAuthenticationEmail(normalizeStaffUsername(identifier))
    : identifier;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/sign-in?error=invalid-credentials");
  }

  if (staffLogin) {
    const { data: membership, error: membershipError } = await supabase
      .from("operator_members")
      .select("operator_id")
      .eq("user_id", data.user.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (membershipError || !membership) {
      await supabase.auth.signOut();
      redirect("/sign-in?error=staff-disabled");
    }

    redirect(`/operator/calendar?operator=${encodeURIComponent(membership.operator_id)}`);
  }

  redirect(next);
}
