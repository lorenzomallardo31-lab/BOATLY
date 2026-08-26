"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function reviewOperatorVerification(formData: FormData) {
  const reviewId = text(formData, "review_id");
  const decision = text(formData, "decision");
  const note = text(formData, "note");

  if (!reviewId || !["APPROVED", "NEEDS_CHANGES", "REJECTED"].includes(decision)) {
    redirect("/admin/verifications?error=invalid-request");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_operator_verification", {
    p_verification_id: reviewId,
    p_decision: decision,
    p_note: note || null,
  });

  if (error) redirect(`/admin/verifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/admin/operators");
  revalidatePath("/admin/verifications");
  redirect(`/admin/verifications?reviewed=${decision}`);
}

export async function reviewBoatPublication(formData: FormData) {
  const reviewId = text(formData, "review_id");
  const decision = text(formData, "decision");
  const note = text(formData, "note");

  if (!reviewId || !["APPROVED", "NEEDS_CHANGES", "REJECTED"].includes(decision)) {
    redirect("/admin/verifications?error=invalid-request");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_boat_publication", {
    p_review_id: reviewId,
    p_decision: decision,
    p_note: note || null,
  });

  if (error) redirect(`/admin/verifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
  revalidatePath("/admin/verifications");
  redirect(`/admin/verifications?reviewed=${decision}`);
}
