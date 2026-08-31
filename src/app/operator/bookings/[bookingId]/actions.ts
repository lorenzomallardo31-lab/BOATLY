"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { zonedDateTimeToIso } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type RescheduleActionState = {
  status: "idle" | "error" | "success";
  code?: string;
  bookingId?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function detailUrl(operatorId: string, bookingId: string, extra?: string) {
  const base = `/operator/bookings/${encodeURIComponent(bookingId)}?operator=${encodeURIComponent(operatorId)}`;
  return extra ? `${base}&${extra}` : base;
}

function rescheduleError(message: string) {
  const mappings: Array<[string, string]> = [
    ["reschedule_reason_required", "reason-required"],
    ["booking_not_found", "not-found"],
    ["booking_not_reschedulable", "not-reschedulable"],
    ["started_booking_not_reschedulable", "already-started"],
    ["paid_booking_requires_finance_workflow", "paid-booking"],
    ["invalid_booking_window", "invalid-window"],
    ["invalid_passenger_count", "invalid-passengers"],
    ["invalid_total", "invalid-total"],
    ["boat_must_be_active", "boat-inactive"],
    ["passenger_limit_exceeded", "passengers"],
    ["legal_offering_not_available", "offering"],
    ["pickup_location_not_available", "location"],
    ["customer_booking_overlap", "customer-overlap"],
    ["bookings_no_active_customer_overlap", "customer-overlap"],
    ["boat_booking_overlap", "boat-overlap"],
    ["boat_occupancies_no_active_overlap", "boat-overlap"],
    ["skipper_booking_overlap", "skipper-overlap"],
    ["booking_reschedule_not_allowed", "not-allowed"],
    ["operator_must_be_active", "operator-inactive"],
  ];
  return mappings.find(([needle]) => message.includes(needle))?.[1] ?? "save-failed";
}

export async function rescheduleManualBooking(
  _previousState: RescheduleActionState,
  formData: FormData,
): Promise<RescheduleActionState> {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  const boatId = text(formData, "boat_id");
  const offeringId = text(formData, "legal_offering_id");
  const locationId = text(formData, "pickup_location_id");
  const startsAtLocal = text(formData, "starts_at_local");
  const endsAtLocal = text(formData, "ends_at_local");
  const passengerCount = Number(text(formData, "passenger_count"));
  const total = Number(text(formData, "total").replace(",", "."));
  const operatorNote = text(formData, "operator_note");
  const reason = text(formData, "reason");

  if (!operatorId || !bookingId || !boatId || !offeringId || !locationId || !startsAtLocal || !endsAtLocal) {
    return { status: "error", code: "missing-fields" };
  }
  if (!reason) return { status: "error", code: "reason-required" };
  if (!Number.isInteger(passengerCount) || passengerCount <= 0) {
    return { status: "error", code: "invalid-passengers" };
  }
  if (!Number.isFinite(total) || total < 0) {
    return { status: "error", code: "invalid-total" };
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const startsAt = zonedDateTimeToIso(startsAtLocal, operator.timezone);
  const endsAt = zonedDateTimeToIso(endsAtLocal, operator.timezone);
  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return { status: "error", code: "invalid-window" };
  }

  const { data, error } = await supabase.rpc("operator_reschedule_manual_booking_with_internal_skipper", {
    p_operator_id: operator.id,
    p_booking_id: bookingId,
    p_boat_id: boatId,
    p_legal_offering_id: offeringId,
    p_pickup_location_id: locationId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_passenger_count: passengerCount,
    p_total_cents: Math.round(total * 100),
    p_operator_note: operatorNote || null,
    p_reason: reason,
  });

  if (error || typeof data !== "string") {
    return { status: "error", code: error ? rescheduleError(error.message) : "save-failed" };
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/calendar");
  revalidatePath("/operator/bookings");
  revalidatePath(`/operator/bookings/${bookingId}`);
  revalidatePath(`/operator/bookings/${data}`);
  if (text(formData, "calendar_mode") === "1") {
    return { status: "success", bookingId: data };
  }
  redirect(`/operator/bookings/${data}?operator=${encodeURIComponent(operator.id)}&rescheduled=1`);
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
    console.error("Unable to resolve cancellation request.", error);
    redirect(detailUrl(operatorId, bookingId, "error=cancellation-update-failed"));
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/bookings");
  revalidatePath(`/operator/bookings/${bookingId}`);
  redirect(detailUrl(operatorId, bookingId, "requestResolved=1"));
}
