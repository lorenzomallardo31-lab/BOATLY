"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type InvitationActionState = {
  status: "idle" | "error" | "success";
  code?: string;
  invitationUrl?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function baseUrl() {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (configured?.startsWith("https://") || configured?.startsWith("http://localhost")) return configured;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return production ? `https://${production}` : "http://localhost:3000";
}

function invitationError(message: string) {
  const mappings: Array<[string, string]> = [
    ["invalid_invitation_email", "invalid-email"],
    ["team_member_already_active", "already-member"],
    ["team_invitation_already_pending", "already-pending"],
    ["team_role_escalation_not_allowed", "role-not-allowed"],
    ["team_invitation_not_allowed", "not-allowed"],
    ["operator_must_be_active", "operator-inactive"],
  ];
  return mappings.find(([needle]) => message.includes(needle))?.[1] ?? "create-failed";
}

export async function createTeamInvitation(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const operatorId = text(formData, "operator_id");
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role");
  if (!operatorId || !email.includes("@")) return { status: "error", code: "invalid-email" };
  if (!new Set(["MANAGER", "EMPLOYEE", "SKIPPER"]).has(role)) return { status: "error", code: "role-not-allowed" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.rpc("operator_create_invitation", {
    p_operator_id: operator.id,
    p_email: email,
    p_role: role,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });

  if (error) return { status: "error", code: invitationError(error.message) };
  revalidatePath("/operator/team");
  return {
    status: "success",
    invitationUrl: `${baseUrl()}/team/invite#token=${encodeURIComponent(rawToken)}`,
  };
}

export async function revokeTeamInvitation(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const invitationId = text(formData, "invitation_id");
  const reason = text(formData, "reason");
  if (!operatorId || !invitationId) redirect("/operator/team");
  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_revoke_invitation", {
    p_operator_id: operator.id,
    p_invitation_id: invitationId,
    p_reason: reason,
  });
  revalidatePath("/operator/team");
  redirect(`/operator/team?operator=${operator.id}&${error ? "error=revoke-failed" : "saved=revoked"}`);
}

export async function updateTeamMember(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const userId = text(formData, "user_id");
  const action = text(formData, "member_action");
  const role = text(formData, "role");
  const reason = text(formData, "reason");
  if (!operatorId || !userId) redirect("/operator/team");
  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_update_team_member", {
    p_operator_id: operator.id,
    p_user_id: userId,
    p_action: action,
    p_role: role || null,
    p_reason: reason,
  });
  revalidatePath("/operator/team");
  redirect(`/operator/team?operator=${operator.id}&${error ? "error=member-update-failed" : "saved=member"}`);
}
