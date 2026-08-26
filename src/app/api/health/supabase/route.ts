import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function healthResponse(ok: boolean, status: number) {
  return NextResponse.json(
    { ok },
    { status, headers: RESPONSE_HEADERS },
  );
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return healthResponse(false, 503);
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: publishableKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return healthResponse(false, 502);
    }

    return healthResponse(true, 200);
  } catch {
    return healthResponse(false, 502);
  }
}
