import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeNext(value: string | null) {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/";
}

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.clone();

  const tokenHash = redirectTo.searchParams.get("token_hash");

  const type = redirectTo.searchParams.get(
    "type",
  ) as EmailOtpType | null;

  const next = getSafeNext(
    redirectTo.searchParams.get("next"),
  );

  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      redirectTo.pathname = next;

      if (type === "email") {
        redirectTo.searchParams.set(
          "email-confirmed",
          "1",
        );
      }

      if (type === "recovery") {
        redirectTo.searchParams.set(
          "recovery",
          "1",
        );
      }

      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/sign-in";

  redirectTo.searchParams.set(
    "error",
    "confirmation-failed",
  );

  return NextResponse.redirect(redirectTo);
}