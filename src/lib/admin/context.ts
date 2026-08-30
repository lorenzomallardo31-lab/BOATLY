import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type PlatformRole = "SUPER_ADMIN";

export async function requirePlatformContext() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect("/sign-in?next=/admin");
  }

  const userId = claimsData.claims.sub;
  const { data: roleRows, error: rolesError } = await supabase
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    throw new Error(`Unable to load platform roles: ${rolesError.message}`);
  }

  const roles = (roleRows ?? []).map((row) => row.role as PlatformRole);

  if (!roles.includes("SUPER_ADMIN")) {
    redirect("/account");
  }

  return {
    supabase,
    userId,
    roles,
    email:
      typeof claimsData.claims.email === "string"
        ? claimsData.claims.email
        : "Boatly staff",
  };
}
