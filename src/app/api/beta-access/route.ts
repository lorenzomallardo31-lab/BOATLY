import { NextResponse, type NextRequest } from "next/server";

import {
  BETA_ACCESS_COOKIE,
  BETA_ACCESS_MAX_AGE_SECONDS,
  betaAccessConfigured,
  betaAccessCookieValue,
  privateBetaEnabled,
  verifyBetaAccessToken,
} from "@/lib/beta-access";

export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function POST(request: NextRequest) {
  if (!privateBetaEnabled()) {
    return NextResponse.json(
      { ok: true, privateMode: false },
      { headers: RESPONSE_HEADERS },
    );
  }

  if (!betaAccessConfigured()) {
    return NextResponse.json(
      { ok: false, error: "beta-access-not-configured" },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-request" },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  const token =
    body && typeof body === "object" && "token" in body
      ? (body as { token?: unknown }).token
      : null;

  if (typeof token !== "string" || !verifyBetaAccessToken(token)) {
    return NextResponse.json(
      { ok: false, error: "invalid-invitation" },
      { status: 403, headers: RESPONSE_HEADERS },
    );
  }

  const cookieValue = betaAccessCookieValue();

  if (!cookieValue) {
    return NextResponse.json(
      { ok: false, error: "beta-access-not-configured" },
      { status: 503, headers: RESPONSE_HEADERS },
    );
  }

  const response = NextResponse.json(
    { ok: true, privateMode: true },
    { headers: RESPONSE_HEADERS },
  );

  response.cookies.set(BETA_ACCESS_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BETA_ACCESS_MAX_AGE_SECONDS,
  });

  return response;
}
