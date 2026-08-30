"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  isValidStaffUsername,
  normalizeStaffUsername,
  staffAuthenticationEmail,
} from "@/lib/operator/staff-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type StaffAccountActionState = {
  status: "idle" | "error" | "success";
  code?: string;
  username?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function secret(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function actionError(message: string) {
  const mappings: Array<[string, string]> = [
    ["staff_username_already_exists", "username-taken"],
    ["User already registered", "username-taken"],
    ["invalid_staff_username", "invalid-username"],
    ["staff_management_not_allowed", "not-allowed"],
    ["operator_must_be_active", "operator-inactive"],
  ];
  return mappings.find(([needle]) => message.includes(needle))?.[1] ?? "save-failed";
}

async function requireOwner(operatorId: string) {
  const context = await requireOperatorWorkspaceContext(operatorId);
  if (context.membership.role !== "OWNER") {
    redirect(`/operator/calendar?operator=${encodeURIComponent(context.operator.id)}`);
  }
  return context;
}

function refreshTeam(operatorId: string) {
  revalidatePath("/account");
  revalidatePath("/operator/team");
  revalidatePath("/operator/calendar");
  revalidatePath(`/admin/operators/${operatorId}`);
}

export async function createStaffAccount(
  _previousState: StaffAccountActionState,
  formData: FormData,
): Promise<StaffAccountActionState> {
  const operatorId = text(formData, "operator_id");
  const username = normalizeStaffUsername(text(formData, "username"));
  const password = secret(formData, "password");
  const passwordConfirmation = secret(formData, "password_confirmation");

  if (!operatorId || !isValidStaffUsername(username)) {
    return { status: "error", code: "invalid-username" };
  }
  if (password.length < 12) {
    return { status: "error", code: "password-too-short" };
  }
  if (password !== passwordConfirmation) {
    return { status: "error", code: "password-mismatch" };
  }

  const { supabase, operator } = await requireOwner(operatorId);
  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: staffAuthenticationEmail(username),
    password,
    email_confirm: true,
    app_metadata: { boatly_account_type: "OPERATOR_STAFF" },
  });

  if (authError || !created.user) {
    return { status: "error", code: actionError(authError?.message ?? "save-failed") };
  }

  const { error: membershipError } = await supabase.rpc("operator_register_staff_account", {
    p_operator_id: operator.id,
    p_user_id: created.user.id,
    p_username: username,
  });

  if (membershipError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { status: "error", code: actionError(membershipError.message) };
  }

  refreshTeam(operator.id);
  return { status: "success", username };
}

export async function updateStaffAccount(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const userId = text(formData, "user_id");
  const action = text(formData, "staff_action").toUpperCase();
  if (!operatorId || !userId || !new Set(["SUSPEND", "ACTIVATE", "REMOVE", "RESET_PASSWORD"]).has(action)) {
    redirect("/operator/team");
  }

  const { supabase, operator } = await requireOwner(operatorId);
  const admin = createAdminClient();
  const { data: staff, error: staffError } = await admin
    .from("operator_staff_accounts")
    .select("user_id")
    .eq("operator_id", operator.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (staffError || !staff) {
    redirect(`/operator/team?operator=${operator.id}&error=staff-not-found`);
  }

  if (action === "RESET_PASSWORD") {
    const password = secret(formData, "password");
    const confirmation = secret(formData, "password_confirmation");
    if (password.length < 12) redirect(`/operator/team?operator=${operator.id}&error=password-too-short`);
    if (password !== confirmation) redirect(`/operator/team?operator=${operator.id}&error=password-mismatch`);

    const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password });
    if (passwordError) redirect(`/operator/team?operator=${operator.id}&error=password-reset-failed`);

    const { error: auditError } = await supabase.rpc("operator_record_staff_password_reset", {
      p_operator_id: operator.id,
      p_user_id: userId,
    });
    if (auditError) redirect(`/operator/team?operator=${operator.id}&error=audit-failed`);

    refreshTeam(operator.id);
    redirect(`/operator/team?operator=${operator.id}&saved=password`);
  }

  if (action === "SUSPEND") {
    const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    if (banError) redirect(`/operator/team?operator=${operator.id}&error=access-update-failed`);
    const { error } = await supabase.rpc("operator_update_team_member", {
      p_operator_id: operator.id, p_user_id: userId, p_action: "SUSPEND", p_role: null, p_reason: null,
    });
    if (error) {
      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      redirect(`/operator/team?operator=${operator.id}&error=access-update-failed`);
    }
  }

  if (action === "ACTIVATE") {
    const { error } = await supabase.rpc("operator_update_team_member", {
      p_operator_id: operator.id, p_user_id: userId, p_action: "ACTIVATE", p_role: null, p_reason: null,
    });
    if (error) redirect(`/operator/team?operator=${operator.id}&error=access-update-failed`);
    const { error: unbanError } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
    if (unbanError) {
      await supabase.rpc("operator_update_team_member", {
        p_operator_id: operator.id, p_user_id: userId, p_action: "SUSPEND", p_role: null, p_reason: null,
      });
      redirect(`/operator/team?operator=${operator.id}&error=access-update-failed`);
    }
  }

  if (action === "REMOVE") {
    const { error } = await supabase.rpc("operator_update_team_member", {
      p_operator_id: operator.id, p_user_id: userId, p_action: "REMOVE", p_role: null, p_reason: null,
    });
    if (error) redirect(`/operator/team?operator=${operator.id}&error=remove-failed`);
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) redirect(`/operator/team?operator=${operator.id}&error=remove-failed`);
  }

  refreshTeam(operator.id);
  redirect(`/operator/team?operator=${operator.id}&saved=${action.toLowerCase()}`);
}
