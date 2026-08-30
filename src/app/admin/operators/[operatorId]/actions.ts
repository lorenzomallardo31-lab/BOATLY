"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlatformContext } from "@/lib/admin/context";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function operatorUrl(operatorId: string, parameter: string) {
  return `/admin/operators/${encodeURIComponent(operatorId)}?${parameter}`;
}

function fail(operatorId: string, scope: string, message?: string): never {
  const code = message?.includes("reason")
    ? "reason-required"
    : message?.includes("last_active_owner")
      ? "last-owner"
      : message?.includes("already_exists")
        ? "duplicate"
        : "save-failed";
  redirect(operatorUrl(operatorId, `error=${code}&scope=${encodeURIComponent(scope)}`));
}

function refreshOperator(operatorId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/operators");
  revalidatePath(`/admin/operators/${operatorId}`);
  revalidatePath("/operator");
}

export async function setOperatorStatus(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const status = text(formData, "status");
  const reason = text(formData, "reason");
  const decisions: Record<string, string> = {
    DRAFT: "PENDING",
    PENDING_VERIFICATION: "PENDING",
    ACTIVE: "CONFIRM",
    REJECTED: "REJECT",
  };

  if (!operatorId || !decisions[status] || decisions[status] === "PENDING") redirect("/admin/operators");
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_decide_operator", {
    p_operator_id: operatorId,
    p_decision: decisions[status],
    p_reason: reason,
  });

  if (error) fail(operatorId, "status", error.message);
  refreshOperator(operatorId);
  redirect(operatorUrl(operatorId, `saved=status-${status.toLowerCase()}`));
}

export async function toggleOperatorSuspension(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const suspended = text(formData, "suspended") === "1";
  if (!operatorId) redirect("/admin/operators");
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_decide_operator", {
    p_operator_id: operatorId,
    p_decision: suspended ? "SUSPEND" : "RESUME",
    p_reason: null,
  });

  if (error) fail(operatorId, "access", error.message);
  refreshOperator(operatorId);
  redirect(operatorUrl(operatorId, `saved=${suspended ? "suspended" : "resumed"}`));
}

export async function deleteOperatorAccount(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const reason = text(formData, "reason");
  const confirmation = text(formData, "confirmation");
  const expectedName = text(formData, "operator_name");

  if (!operatorId) redirect("/admin/operators");
  if (!expectedName || confirmation !== expectedName) {
    redirect(operatorUrl(operatorId, "error=confirmation-required&scope=delete"));
  }

  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_decide_operator", {
    p_operator_id: operatorId,
    p_decision: "DELETE",
    p_reason: reason,
  });

  if (error) fail(operatorId, "delete", error.message);
  refreshOperator(operatorId);
  redirect("/admin/operators?deleted=1");
}

export async function updateOperatorWorkspace(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  if (!operatorId) redirect("/admin/operators");
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_update_operator_workspace", {
    p_operator_id: operatorId,
    p_name: text(formData, "name"),
    p_country_code: text(formData, "country_code"),
    p_currency: text(formData, "currency"),
    p_timezone: text(formData, "timezone"),
    p_reason: text(formData, "reason"),
  });

  if (error) fail(operatorId, "workspace", error.message);
  refreshOperator(operatorId);
  redirect(operatorUrl(operatorId, "saved=workspace"));
}

export async function updateOperatorLegalProfile(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  if (!operatorId) redirect("/admin/operators");
  const fields = [
    "legal_name",
    "legal_form",
    "vat_number",
    "tax_code",
    "business_register_number",
    "rea_number",
    "pec_email",
    "sdi_code",
    "registered_address_line_1",
    "registered_address_line_2",
    "registered_city",
    "registered_administrative_area",
    "registered_postal_code",
    "registered_country_code",
    "legal_representative_first_name",
    "legal_representative_last_name",
  ];
  const profile = Object.fromEntries(fields.map((field) => [field, text(formData, field)]));
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_update_operator_legal_profile", {
    p_operator_id: operatorId,
    p_profile: profile,
    p_reason: text(formData, "reason"),
  });

  if (error) fail(operatorId, "legal", error.message);
  refreshOperator(operatorId);
  redirect(operatorUrl(operatorId, "saved=legal"));
}

export async function updateOperatorLocation(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const locationId = text(formData, "location_id");
  if (!operatorId || !locationId) redirect("/admin/operators");
  const location = {
    name: text(formData, "name"),
    address_line_1: text(formData, "address_line_1"),
    address_line_2: text(formData, "address_line_2"),
    city: text(formData, "city"),
    administrative_area: text(formData, "administrative_area"),
    postal_code: text(formData, "postal_code"),
    country_code: text(formData, "country_code"),
    timezone: text(formData, "timezone"),
    phone: text(formData, "phone"),
    email: text(formData, "email"),
    pickup_instructions: text(formData, "pickup_instructions"),
    is_primary: formData.get("is_primary") === "on",
    is_public: formData.get("is_public") === "on",
    is_active: formData.get("is_active") === "on",
  };
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_update_operator_location", {
    p_operator_id: operatorId,
    p_location_id: locationId,
    p_location: location,
    p_reason: text(formData, "reason"),
  });

  if (error) fail(operatorId, "location", error.message);
  refreshOperator(operatorId);
  redirect(operatorUrl(operatorId, `saved=location&location=${encodeURIComponent(locationId)}`));
}

export async function setOperatorMemberStatus(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const userId = text(formData, "user_id");
  const status = text(formData, "status");
  if (!operatorId || !userId || !["ACTIVE", "SUSPENDED", "REMOVED"].includes(status)) {
    redirect("/admin/operators");
  }
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_set_operator_member_status", {
    p_operator_id: operatorId,
    p_user_id: userId,
    p_status: status,
    p_reason: null,
  });

  if (error) fail(operatorId, "member-status", error.message);
  refreshOperator(operatorId);
  redirect(operatorUrl(operatorId, `saved=member-${status.toLowerCase()}`));
}

export async function updateOperatorMemberProfile(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const userId = text(formData, "user_id");
  if (!operatorId || !userId) redirect("/admin/operators");
  const { supabase } = await requirePlatformContext();
  const { error } = await supabase.rpc("admin_update_operator_member_profile", {
    p_operator_id: operatorId,
    p_user_id: userId,
    p_first_name: text(formData, "first_name"),
    p_last_name: text(formData, "last_name"),
    p_phone: text(formData, "phone"),
    p_reason: text(formData, "reason"),
  });

  if (error) fail(operatorId, "member-profile", error.message);
  refreshOperator(operatorId);
  redirect(operatorUrl(operatorId, "saved=member-profile"));
}
