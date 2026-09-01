import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type OperatorWorkspaceContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  operator: {
    id: string;
    name: string;
    status: string;
    currency: string;
    timezone: string;
  };
  membership: {
    role: string;
    status: string;
    supportSessionId: string | null;
  };
};

export async function requireOperatorWorkspaceContext(
  requestedOperatorId?: string,
): Promise<OperatorWorkspaceContext> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect("/sign-in?next=/operator/calendar");
  }

  const userId = claimsData.claims.sub;
  const { data: memberships, error: membershipsError } = await supabase
    .from("operator_members")
    .select("operator_id, role, status, support_session_id")
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  if (membershipsError || !memberships?.length) {
    redirect("/operator/onboarding");
  }

  const selectedMembership = requestedOperatorId
    ? memberships.find((item) => item.operator_id === requestedOperatorId)
    : memberships[0];

  if (!selectedMembership) {
    redirect("/operator/calendar");
  }

  if (selectedMembership.support_session_id) {
    const { data: supportData, error: supportError } = await supabase.rpc(
      "admin_current_operator_support",
    );
    const activeSupport = Array.isArray(supportData) ? supportData[0] : null;

    if (
      supportError ||
      !activeSupport ||
      activeSupport.session_id !== selectedMembership.support_session_id ||
      activeSupport.operator_id !== selectedMembership.operator_id
    ) {
      redirect(`/admin/operators/${selectedMembership.operator_id}?error=support-expired&scope=access`);
    }
  }

  const { data: operator, error: operatorError } = await supabase
    .from("operators")
    .select("id, name, status, currency, timezone")
    .eq("id", selectedMembership.operator_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (operatorError || !operator) {
    redirect("/operator/onboarding");
  }

  if (operator.status !== "ACTIVE") {
    redirect("/operator/onboarding");
  }

  return {
    supabase,
    userId,
    operator,
    membership: {
      role: selectedMembership.role,
      status: selectedMembership.status,
      supportSessionId: selectedMembership.support_session_id,
    },
  };
}
