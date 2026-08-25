import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase environment variables are not configured.",
      },
      {
        status: 500,
      },
    );
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: publishableKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Supabase health check failed.",
          status: response.status,
        },
        {
          status: 502,
        },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      ok: true,
      service: data.name ?? "Supabase Auth",
      version: data.version ?? null,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to reach Supabase.",
      },
      {
        status: 502,
      },
    );
  }
}