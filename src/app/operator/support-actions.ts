"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlatformContext } from "@/lib/admin/context";

function value(formData: FormData, key: string) {
  const input = formData.get(key);
  return typeof input === "string" ? input.trim() : "";
}

export async function endAdminOperatorSupport(formData: FormData) {
  const operatorId = value(formData, "operator_id");
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_end_operator_support", {
    p_operator_id: operatorId || null,
  });

  if (error) {
    redirect(
      operatorId
        ? `/admin/operators/${encodeURIComponent(operatorId)}?error=support-exit&scope=access`
        : "/admin/operators?error=support-exit",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/operators");
  revalidatePath("/operator");

  redirect(
    operatorId
      ? `/admin/operators/${encodeURIComponent(operatorId)}?saved=support-ended`
      : "/admin/operators",
  );
}
