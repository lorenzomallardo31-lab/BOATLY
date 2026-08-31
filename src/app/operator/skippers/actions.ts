"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function skipperUrl(operatorId: string, suffix: string) {
  return `/operator/skippers?operator=${encodeURIComponent(operatorId)}&${suffix}`;
}

function errorCode(message: string) {
  const mappings: Array<[string, string]> = [
    ["skipper_name_required", "name"],
    ["invalid_skipper_phone", "phone"],
    ["skipper_notes_too_long", "notes"],
    ["skipper_not_found", "not-found"],
    ["skipper_already_removed", "removed"],
    ["not_allowed", "not-allowed"],
  ];
  return mappings.find(([needle]) => message.includes(needle))?.[1] ?? "save";
}

function refresh(operatorId: string) {
  revalidatePath("/operator/skippers");
  revalidatePath("/operator/calendar");
  revalidatePath(`/operator/calendar?operator=${operatorId}`);
}

export async function saveInternalSkipper(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const skipperId = text(formData, "skipper_id") || null;
  const action = skipperId ? "UPDATE" : "CREATE";
  const displayName = text(formData, "display_name");
  const phone = text(formData, "phone");
  const notes = text(formData, "notes");

  if (!operatorId || displayName.length < 2) {
    redirect(operatorId ? skipperUrl(operatorId, "error=name") : "/operator/more");
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_manage_internal_skipper", {
    p_operator_id: operator.id,
    p_skipper_id: skipperId,
    p_action: action,
    p_display_name: displayName,
    p_phone: phone || null,
    p_notes: notes || null,
  });

  if (error) redirect(skipperUrl(operator.id, `error=${errorCode(error.message)}`));
  refresh(operator.id);
  redirect(skipperUrl(operator.id, `saved=${action.toLowerCase()}`));
}

export async function changeInternalSkipperStatus(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const skipperId = text(formData, "skipper_id");
  const action = text(formData, "skipper_action").toUpperCase();
  if (!operatorId || !skipperId || !["ACTIVATE", "DEACTIVATE", "REMOVE"].includes(action)) {
    redirect("/operator/more");
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_manage_internal_skipper", {
    p_operator_id: operator.id,
    p_skipper_id: skipperId,
    p_action: action,
    p_display_name: null,
    p_phone: null,
    p_notes: null,
  });

  if (error) redirect(skipperUrl(operator.id, `error=${errorCode(error.message)}`));
  refresh(operator.id);
  redirect(skipperUrl(operator.id, `saved=${action.toLowerCase()}`));
}
