"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function detailUrl(operatorId: string, bookingId: string, extra?: string) {
  const base = `/operator/bookings/${encodeURIComponent(bookingId)}?operator=${encodeURIComponent(operatorId)}`;
  return extra ? `${base}&${extra}` : base;
}

export async function changeBookingStatus(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  const targetStatus = text(formData, "target_status");
  const note = text(formData, "note");

  if (!operatorId || !bookingId) redirect("/operator/bookings");
  if (!["IN_PROGRESS", "COMPLETED", "CANCELLED_BY_OPERATOR", "NO_SHOW"].includes(targetStatus)) {
    redirect(detailUrl(operatorId, bookingId, "error=invalid-status"));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("operator_change_booking_status", {
    p_operator_id: operatorId,
    p_booking_id: bookingId,
    p_status: targetStatus,
    p_note: note || null,
  });

  if (error) {
    redirect(detailUrl(operatorId, bookingId, `error=${encodeURIComponent(error.message)}`));
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/bookings");
  revalidatePath(`/operator/bookings/${bookingId}`);
  redirect(detailUrl(operatorId, bookingId, `changed=${targetStatus}`));
}

export async function resolveCancellationRequest(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  const requestId = text(formData, "request_id");
  const decision = text(formData, "decision");
  const note = text(formData, "resolution_note");

  if (!operatorId || !bookingId || !requestId) redirect("/operator/bookings");

  const supabase = await createClient();
  const { error } = await supabase.rpc("operator_resolve_cancellation_request", {
    p_operator_id: operatorId,
    p_request_id: requestId,
    p_approve: decision === "APPROVE",
    p_note: note || null,
  });

  if (error) {
    redirect(detailUrl(operatorId, bookingId, `error=${encodeURIComponent(error.message)}`));
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/bookings");
  revalidatePath(`/operator/bookings/${bookingId}`);
  redirect(detailUrl(operatorId, bookingId, "requestResolved=1"));
}
