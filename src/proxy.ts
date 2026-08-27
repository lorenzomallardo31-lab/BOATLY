import { NextResponse, type NextRequest } from "next/server";

import {
  BETA_ACCESS_COOKIE,
  privateBetaEnabled,
  verifyBetaAccessCookie,
} from "@/lib/beta-access";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_BETA_PATHS = [
  "/accesso-beta",
  "/api/beta-access",
  "/api/health/supabase",
  "/api/stripe/webhook",
  "/auth/confirm",
  "/forgot-password",
  "/robots.txt",
  "/sign-in",
  "/update-password",
];

function isPublicBetaPath(pathname: string) {
  return PUBLIC_BETA_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function withPrivatePreviewHeaders<T extends NextResponse>(response: T) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function proxy(request: NextRequest) {
  const { response, authenticated } = await updateSession(request);

  if (!privateBetaEnabled()) {
    return withPrivatePreviewHeaders(response);
  }

  const pathname = request.nextUrl.pathname;
  const hasInvitation = verifyBetaAccessCookie(
    request.cookies.get(BETA_ACCESS_COOKIE)?.value,
  );

  if (authenticated || hasInvitation || isPublicBetaPath(pathname)) {
    return withPrivatePreviewHeaders(response);
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "private-beta-access-required" },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      },
    );
  }

  const destination = request.nextUrl.clone();
  const requestedPath = `${pathname}${request.nextUrl.search}`;

  destination.pathname = "/accesso-beta";
  destination.search = "";
  destination.searchParams.set("next", requestedPath);

  return withPrivatePreviewHeaders(NextResponse.redirect(destination));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
