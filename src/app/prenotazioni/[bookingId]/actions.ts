"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export async function requestBookingCancellation(formData: FormData) {
  const bookingId = readText(formData, "booking_id");
  const reason = readText(formData, "reason");

  if (!bookingId) {
    redirect("/prenotazioni");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(`/sign-in?next=${encodeURIComponent(`/prenotazioni/${bookingId}`)}`);
  }

  const { error } = await supabase.rpc(
    "request_customer_booking_cancellation",
    {
      p_booking_id: bookingId,
      p_reason: reason || null,
    },
  );

  if (error) {
    let code = "cancellation-failed";

    if (error.message.includes("booking_not_cancellable")) {
      code = "not-cancellable";
    } else if (error.message.includes("booking_already_started")) {
      code = "already-started";
    } else if (error.message.includes("cancellation_request_already_pending")) {
      code = "already-pending";
    }

    redirect(
      `/prenotazioni/${encodeURIComponent(bookingId)}?error=${encodeURIComponent(code)}`,
    );
  }

  revalidatePath("/prenotazioni");
  revalidatePath(`/prenotazioni/${bookingId}`);

  redirect(`/prenotazioni/${encodeURIComponent(bookingId)}?requested=1`);
}
