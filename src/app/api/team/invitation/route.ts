import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/lib/observability";

const HEADERS = { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive" };

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id") ?? "local";
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-request" }, { status: 400, headers: HEADERS }); }
  const input = body && typeof body === "object" ? body as { action?: unknown; token?: unknown } : {};
  if (typeof input.token !== "string" || input.token.length < 32 || input.token.length > 128 || !new Set(["preview", "accept"]).has(String(input.action))) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400, headers: HEADERS });
  }
  const tokenHash = createHash("sha256").update(input.token, "utf8").digest("hex");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    const admin = createAdminClient();
    const { data: invitation } = await admin
      .from("operator_invitations")
      .select("email")
      .eq("token_hash", tokenHash)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    logServerEvent("warn", "team_invitation_unauthenticated", { requestId, validInvitation: Boolean(invitation), durationMs: Date.now() - startedAt });
    return invitation
      ? NextResponse.json({ error: "authentication-required", valid: true, invitedEmail: invitation.email }, { status: 401, headers: HEADERS })
      : NextResponse.json({ error: "invitation-invalid" }, { status: 404, headers: HEADERS });
  }

  if (input.action === "preview") {
    const { data, error } = await supabase.rpc("operator_invitation_preview", { p_token_hash: tokenHash });
    const item = Array.isArray(data) ? data[0] : null;
    if (error || !item) {
      logServerEvent("warn", "team_invitation_preview_rejected", { requestId, durationMs: Date.now() - startedAt });
      return NextResponse.json({ error: "invitation-invalid" }, { status: 404, headers: HEADERS });
    }
    logServerEvent("info", "team_invitation_previewed", { requestId, durationMs: Date.now() - startedAt });
    return NextResponse.json({ preview: { operatorId: item.operator_id, operatorName: item.operator_name, email: item.invited_email, role: item.invited_role, expiresAt: item.expires_at } }, { headers: HEADERS });
  }

  const { data, error } = await supabase.rpc("operator_accept_invitation", { p_token_hash: tokenHash });
  if (error || typeof data !== "string") {
    logServerEvent("warn", "team_invitation_accept_rejected", { requestId, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: "invitation-not-accepted" }, { status: 409, headers: HEADERS });
  }
  logServerEvent("info", "team_invitation_accepted", { requestId, durationMs: Date.now() - startedAt });
  return NextResponse.json({ operatorId: data }, { headers: HEADERS });
}
