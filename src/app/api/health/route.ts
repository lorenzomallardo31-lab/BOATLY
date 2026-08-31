import { NextResponse } from "next/server";

import { logServerEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request) {
  const startedAt = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const release = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local";
  const requestId = request.headers.get("x-vercel-id") ?? "local";

  if (!supabaseUrl || !publishableKey) {
    logServerEvent("error", "health_configuration_missing", {
      component: "supabase",
      requestId,
    });

    return NextResponse.json(
      {
        ok: false,
        service: "boatly-ops",
        release,
        checks: { configuration: false, supabaseAuth: false },
      },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const ok = response.ok;
    const durationMs = Date.now() - startedAt;

    logServerEvent(ok ? "info" : "error", "health_checked", {
      component: "supabase_auth",
      ok,
      status: response.status,
      durationMs,
      requestId,
    });

    return NextResponse.json(
      {
        ok,
        service: "boatly-ops",
        release,
        checks: { configuration: true, supabaseAuth: ok },
        durationMs,
      },
      { status: ok ? 200 : 502, headers: RESPONSE_HEADERS },
    );
  } catch {
    const durationMs = Date.now() - startedAt;

    logServerEvent("error", "health_dependency_timeout", {
      component: "supabase_auth",
      durationMs,
      requestId,
    });

    return NextResponse.json(
      {
        ok: false,
        service: "boatly-ops",
        release,
        checks: { configuration: true, supabaseAuth: false },
        durationMs,
      },
      { status: 502, headers: RESPONSE_HEADERS },
    );
  }
}
