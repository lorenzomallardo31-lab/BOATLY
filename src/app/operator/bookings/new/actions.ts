"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { zonedDateTimeToIso } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type ManualBookingActionState = {
  status: "idle" | "error" | "success";
  code?: string;
  bookingId?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function errorCode(message: string) {
  const mappings: Array<[string, string]> = [
    ["operator_must_be_active", "operator-inactive"],
    ["boat_must_be_active", "boat-inactive"],
    ["invalid_booking_window", "invalid-window"],
    ["manual_booking_must_start_in_future", "past-window"],
    ["passenger_limit_exceeded", "passengers"],
    ["legal_offering_not_available", "offering"],
    ["pickup_location_not_available", "location"],
    ["customer_contact_required", "customer-contact"],
    ["invalid_customer_email", "customer-email"],
    ["invalid_customer_phone", "customer-phone"],
    ["customer_not_found", "customer-not-found"],
    ["customer_already_exists", "customer-exists"],
    ["customer_identity_conflict", "customer-conflict"],
    ["customer_booking_overlap", "customer-overlap"],
    ["bookings_no_active_customer_overlap", "customer-overlap"],
    ["boat_booking_overlap", "boat-overlap"],
    ["boat_occupancies_no_active_overlap", "boat-overlap"],
  ];
  return mappings.find(([needle]) => message.includes(needle))?.[1] ?? "save-failed";
}

export async function createManualBooking(
  _previousState: ManualBookingActionState,
  formData: FormData,
): Promise<ManualBookingActionState> {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const legalOfferingId = text(formData, "legal_offering_id");
  const pickupLocationId = text(formData, "pickup_location_id");
  const date = text(formData, "date");
  const startsAtLocal = `${date}T${text(formData, "start_time")}`;
  const endsAtLocal = `${date}T${text(formData, "end_time")}`;
  const passengerCount = Number(text(formData, "passenger_count"));
  const customerMode = text(formData, "customer_mode");
  const operatorCustomerId =
    customerMode === "EXISTING" ? text(formData, "operator_customer_id") : "";
  const customerName = text(formData, "customer_name");
  const customerEmail = text(formData, "customer_email");
  const customerPhone = text(formData, "customer_phone");
  const operatorNote = text(formData, "operator_note");
  const total = Number(text(formData, "total").replace(",", "."));

  if (
    !operatorId ||
    !boatId ||
    !legalOfferingId ||
    !pickupLocationId ||
    !date ||
    !text(formData, "start_time") ||
    !text(formData, "end_time")
  ) {
    return { status: "error", code: "missing-fields" };
  }

  if (
    !Number.isInteger(passengerCount) ||
    passengerCount <= 0 ||
    !Number.isFinite(total) ||
    total < 0
  ) {
    return { status: "error", code: "invalid-values" };
  }

  if (customerMode === "EXISTING" && !operatorCustomerId) {
    return { status: "error", code: "customer-not-found" };
  }

  if (
    customerMode !== "EXISTING" &&
    (!customerName || (!customerEmail && !customerPhone))
  ) {
    return { status: "error", code: customerName ? "customer-contact" : "customer-name" };
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const startsAt = zonedDateTimeToIso(startsAtLocal, operator.timezone);
  const endsAt = zonedDateTimeToIso(endsAtLocal, operator.timezone);

  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return { status: "error", code: "invalid-window" };
  }

  const { data, error } = await supabase.rpc("operator_create_manual_booking", {
    p_operator_id: operator.id,
    p_boat_id: boatId,
    p_legal_offering_id: legalOfferingId,
    p_pickup_location_id: pickupLocationId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_passenger_count: passengerCount,
    p_customer_name: customerName,
    p_customer_email: customerEmail || null,
    p_customer_phone: customerPhone || null,
    p_total_cents: Math.round(total * 100),
    p_operator_note: operatorNote || null,
    p_operator_customer_id: operatorCustomerId || null,
  });

  if (error || typeof data !== "string") {
    return {
      status: "error",
      code: error ? errorCode(error.message) : "save-failed",
    };
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/calendar");
  revalidatePath("/operator/bookings");
  revalidatePath("/operator/customers");
  if (text(formData, "calendar_mode") === "1") {
    return { status: "success", bookingId: data };
  }
  redirect(`/operator/bookings/${data}?operator=${encodeURIComponent(operator.id)}&created=1`);
}
