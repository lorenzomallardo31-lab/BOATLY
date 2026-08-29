import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_OPERATOR_STATUSES = new Set([
  "ACTIVE",
]);

export type OperatorBoatContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  boat: {
    id: string;
    operator_id: string;
    name: string;
    slug: string | null;
    status: string;
    primary_location_id: string | null;
  };
  operator: {
    id: string;
    name: string;
    status: string;
  };
  membership: {
    role: string;
    status: string;
  };
  canManage: boolean;
};

export async function requireOperatorBoatContext(
  boatId: string,
  requestedOperatorId?: string,
): Promise<OperatorBoatContext> {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        `/operator/fleet/${boatId}`,
      )}`,
    );
  }

  const userId = claimsData.claims.sub;

  const {
    data: boatRow,
    error: boatError,
  } = await supabase
    .from("boats")
    .select("id, operator_id, name, slug, status, primary_location_id")
    .eq("id", boatId)
    .is("deleted_at", null)
    .is("deletion_requested_at", null)
    .maybeSingle();

  if (boatError || !boatRow) {
    redirect("/operator/fleet");
  }

  if (
    requestedOperatorId &&
    requestedOperatorId !== boatRow.operator_id
  ) {
    redirect(
      `/operator/fleet/${boatId}?operator=${boatRow.operator_id}`,
    );
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("operator_members")
    .select("role, status")
    .eq("operator_id", boatRow.operator_id)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (membershipError || !membership) {
    redirect("/operator/fleet");
  }

  const {
    data: operatorRow,
    error: operatorError,
  } = await supabase
    .from("operators")
    .select("id, name, status")
    .eq("id", boatRow.operator_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (operatorError || !operatorRow) {
    redirect("/operator/fleet");
  }

  const canManage =
    (membership.role === "OWNER" || membership.role === "MANAGER") &&
    MANAGEABLE_OPERATOR_STATUSES.has(operatorRow.status) &&
    ["ACTIVE", "INACTIVE"].includes(boatRow.status);

  return {
    supabase,
    userId,
    boat: boatRow,
    operator: operatorRow,
    membership,
    canManage,
  };
}
