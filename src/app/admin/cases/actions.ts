"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updatePlatformCase(formData: FormData) {
  const caseId = text(formData, "case_id");
  const status = text(formData, "status");
  const priority = text(formData, "priority");
  const resolution = text(formData, "resolution_summary");

  if (!caseId) redirect("/admin/cases?error=invalid-case");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_platform_case", {
    p_case_id: caseId,
    p_status: status,
    p_priority: priority,
    p_resolution_summary: resolution || null,
  });

  if (error) {
    console.error("Unable to update platform case.", error);
    redirect("/admin/cases?error=update-failed");
  }
  revalidatePath("/admin");
  revalidatePath("/admin/cases");
  redirect("/admin/cases?updated=1");
}
