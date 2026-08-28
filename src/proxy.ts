import { NextResponse, type NextRequest } from "next/server";

import {
  BETA_ACCESS_COOKIE,
  privateBetaEnabled,
  verifyBetaAccessCookie,
} from "@/lib/beta-access";
import { isMarketplacePath, marketplaceEnabled } from "@/lib/marketplace-mode";
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

function copyResponseCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  return destination;
}

function managementRedirect(request: NextRequest, response: NextResponse) {
  const destination = request.nextUrl.clone();
  destination.pathname = "/demo-gestionale";
  destination.search = "";

  const redirect = NextResponse.redirect(destination);
  redirect.headers.set("Cache-Control", "no-store, max-age=0");
  copyResponseCookies(response, redirect);

  return withPrivatePreviewHeaders(redirect);
}

export async function proxy(request: NextRequest) {
  const { response, authenticated } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const hasInvitation = verifyBetaAccessCookie(
    request.cookies.get(BETA_ACCESS_COOKIE)?.value,
  );

  if (privateBetaEnabled()) {
    const canAccessPrivateBeta =
      authenticated || hasInvitation || isPublicBetaPath(pathname);

    if (!canAccessPrivateBeta) {
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
  }

  if (!marketplaceEnabled() && isMarketplacePath(pathname)) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return NextResponse.json(
        { error: "marketplace-offline" },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, max-age=0",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        },
      );
    }

    return managementRedirect(request, response);
  }

  return withPrivatePreviewHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
