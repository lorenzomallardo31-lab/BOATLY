"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function statusUrl(boatId: string, operatorId: string, extra?: string) {
  const base = `/operator/fleet/${encodeURIComponent(boatId)}/status?operator=${encodeURIComponent(operatorId)}`;
  return extra ? `${base}&${extra}` : base;
}

export async function changeBoatStatus(formData: FormData) {
  const operatorId = readText(formData, "operator_id");
  const boatId = readText(formData, "boat_id");
  const targetStatus = readText(formData, "target_status");

  if (!operatorId || !boatId) redirect("/operator/fleet");
  if (!new Set(["ACTIVE", "INACTIVE"]).has(targetStatus)) {
    redirect(statusUrl(boatId, operatorId, "error=invalid-status"));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_boat_fleet_status", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
    p_status: targetStatus,
  });

  if (error) {
    redirect(statusUrl(boatId, operatorId, "error=status-change-failed"));
  }

  revalidatePath("/operator/calendar");
  revalidatePath("/operator/fleet");
  revalidatePath(`/operator/fleet/${boatId}/status`);
  redirect(statusUrl(boatId, operatorId, `changed=${targetStatus}`));
}

export async function deleteBoat(formData: FormData) {
  const operatorId = readText(formData, "operator_id");
  const boatId = readText(formData, "boat_id");
  const confirmation = readText(formData, "confirmation");

  if (!operatorId || !boatId) redirect("/operator/fleet");

  const supabase = await createClient();
  const { error } = await supabase.rpc("operator_schedule_boat_deletion", {
    p_operator_id: operatorId,
    p_boat_id: boatId,
    p_confirmation: confirmation,
  });

  if (error) {
    const code = error.message.includes("confirmation")
      ? "delete-confirmation"
      : "delete-failed";
    redirect(statusUrl(boatId, operatorId, `error=${code}`));
  }

  revalidatePath("/operator/calendar");
  revalidatePath("/operator/fleet");
  redirect(`/operator/fleet?operator=${encodeURIComponent(operatorId)}&deleting=1`);
}
