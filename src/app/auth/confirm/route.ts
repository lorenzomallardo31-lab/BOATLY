import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.clone();

  const tokenHash = redirectTo.searchParams.get("token_hash");
  const type = redirectTo.searchParams.get(
    "type",
  ) as EmailOtpType | null;

  redirectTo.pathname = "/";

  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      redirectTo.searchParams.set(
        "email-confirmed",
        "1",
      );

      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.searchParams.set(
    "auth-error",
    "email-confirmation-failed",
  );

  return NextResponse.redirect(redirectTo);
}