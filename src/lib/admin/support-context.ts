import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AdminOperatorSupportContext = {
  sessionId: string;
  operatorId: string;
  operatorName: string;
  expiresAt: string;
};

type SupportRow = {
  session_id: string;
  operator_id: string;
  operator_name: string;
  expires_at: string;
};

export async function getAdminOperatorSupportContext(): Promise<AdminOperatorSupportContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_current_operator_support");

  if (error) {
    // The operator layout is shared by normal users. A missing or unavailable
    // support session must never prevent them from opening their workspace.
    return null;
  }

  const row = (Array.isArray(data) ? data[0] : null) as SupportRow | undefined;

  if (!row) return null;

  return {
    sessionId: row.session_id,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    expiresAt: row.expires_at,
  };
}
