"use server";

import { revalidatePath } from "next/cache";

import { todayInTimeZone, zonedDayBounds } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type CalendarActionState = {
  status: "idle" | "error" | "success";
  code?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function refreshCalendar(operatorId: string) {
  revalidatePath("/operator/calendar");
  revalidatePath(`/operator/calendar?operator=${operatorId}`);
  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/fleet");
  revalidatePath("/operator/skippers");
}

export async function setCalendarBookingSkipper(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  const choice = text(formData, "skipper_choice");
  const newSkipperName = text(formData, "new_skipper_name");
  const newSkipperPhone = text(formData, "new_skipper_phone");
  const newSkipperNotes = text(formData, "new_skipper_notes");
  const licenseAnswer = text(formData, "customer_has_required_license").toUpperCase();
  const customerHasRequiredLicense = licenseAnswer === "YES"
    ? true
    : licenseAnswer === "NO"
      ? false
      : null;
  const mode = choice === "UNASSIGNED"
    ? "UNASSIGNED"
    : choice === "NEW"
      ? "NEW"
      : choice.startsWith("EXISTING:")
        ? "EXISTING"
        : "NONE";
  const skipperId = mode === "EXISTING"
    ? choice.slice("EXISTING:".length) || null
    : null;

  if (!operatorId || !bookingId) return { status: "error", code: "missing-fields" };
  if (mode === "EXISTING" && !skipperId) {
    return { status: "error", code: "skipper-unavailable" };
  }
  if (mode === "NEW" && newSkipperName.length < 2) {
    return { status: "error", code: "skipper-name" };
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_set_booking_navigation_and_skipper", {
    p_operator_id: operator.id,
    p_booking_id: bookingId,
    p_customer_has_required_license: customerHasRequiredLicense,
    p_mode: mode,
    p_skipper_id: skipperId,
    p_new_skipper_name: newSkipperName || null,
    p_new_skipper_phone: newSkipperPhone || null,
    p_new_skipper_notes: newSkipperNotes || null,
  });

  if (error) {
    const mappings: Array<[string, string]> = [
      ["skipper_booking_overlap", "skipper-overlap"],
      ["skipper_not_available", "skipper-unavailable"],
      ["skipper_name_required", "skipper-name"],
      ["invalid_skipper_phone", "skipper-phone"],
      ["booking_skipper_not_editable", "booking-not-editable"],
      ["booking_navigation_not_editable", "booking-not-editable"],
      ["customer_license_answer_required", "license-answer-required"],
      ["skipper_required_without_customer_license", "skipper-required"],
      ["not_allowed", "not-allowed"],
    ];
    return {
      status: "error",
      code: mappings.find(([needle]) => error.message.includes(needle))?.[1]
        ?? "skipper-save-failed",
    };
  }

  refreshCalendar(operator.id);
  return { status: "success", code: "skipper-saved" };
}

export async function markCalendarBookingDeparted(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  if (!operatorId || !bookingId) return { status: "error", code: "missing-fields" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const todayBounds = zonedDayBounds(
    todayInTimeZone(operator.timezone),
    operator.timezone,
  );
  if (!todayBounds) return { status: "error", code: "departure-failed" };

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status, starts_at")
    .eq("id", bookingId)
    .eq("operator_id", operator.id)
    .maybeSingle();
  if (bookingError || !booking) return { status: "error", code: "departure-failed" };
  if (booking.status === "IN_PROGRESS") {
    refreshCalendar(operator.id);
    return { status: "success", code: "departed" };
  }
  const startsAt = new Date(booking.starts_at).getTime();
  if (
    booking.status !== "CONFIRMED"
    || !Number.isFinite(startsAt)
    || startsAt < new Date(todayBounds.start).getTime()
    || startsAt >= new Date(todayBounds.end).getTime()
  ) {
    return { status: "error", code: "outside-today" };
  }

  const { error } = await supabase.rpc("operator_change_booking_status", {
    p_operator_id: operator.id,
    p_booking_id: bookingId,
    p_status: "IN_PROGRESS",
    p_note: null,
  });

  if (error) {
    return {
      status: "error",
      code: error.message.includes("invalid_booking_status_transition")
        ? "already-updated"
        : error.message.includes("not_allowed")
          ? "not-allowed"
          : "departure-failed",
    };
  }

  refreshCalendar(operator.id);
  return { status: "success", code: "departed" };
}

export async function markCalendarBookingReturned(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  if (!operatorId || !bookingId) return { status: "error", code: "missing-fields" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("operator_id", operator.id)
    .maybeSingle();

  if (bookingError || !booking) return { status: "error", code: "return-failed" };
  if (booking.status === "COMPLETED") {
    refreshCalendar(operator.id);
    return { status: "success", code: "returned" };
  }
  if (booking.status !== "IN_PROGRESS") {
    return { status: "error", code: "return-not-allowed" };
  }

  const { error } = await supabase.rpc("operator_change_booking_status", {
    p_operator_id: operator.id,
    p_booking_id: bookingId,
    p_status: "COMPLETED",
    p_note: null,
  });

  if (error) {
    return {
      status: "error",
      code: error.message.includes("invalid_booking_status_transition")
        ? "already-updated"
        : error.message.includes("not_allowed")
          ? "not-allowed"
          : "return-failed",
    };
  }

  refreshCalendar(operator.id);
  return { status: "success", code: "returned" };
}

export async function blockCalendarDay(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const dayKey = text(formData, "day_key");
  const reason = text(formData, "reason");
  if (!operatorId || !boatId || !dayKey) return { status: "error", code: "missing-fields" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const bounds = zonedDayBounds(dayKey, operator.timezone);
  if (!bounds) return { status: "error", code: "invalid-day" };

  const { error } = await supabase.rpc("create_operator_boat_occupancy", {
    p_operator_id: operator.id,
    p_boat_id: boatId,
    p_occupancy_type: "OPERATOR_BLOCK",
    p_starts_at: bounds.start,
    p_ends_at: bounds.end,
    p_title: "Non disponibile",
    p_notes: reason || null,
  });

  if (error) {
    return {
      status: "error",
      code: error.message.includes("boat_time_conflict") || error.message.includes("overlap")
        ? "conflict"
        : error.message.includes("not_allowed")
          ? "not-allowed"
          : "save-failed",
    };
  }

  refreshCalendar(operator.id);
  return { status: "success" };
}

export async function releaseCalendarDay(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const operatorId = text(formData, "operator_id");
  const boatId = text(formData, "boat_id");
  const occupancyId = text(formData, "occupancy_id");
  const dayKey = text(formData, "day_key");
  const scope = text(formData, "scope").toUpperCase();
  if (
    !operatorId
    || !boatId
    || !occupancyId
    || !["ALL", "DAY"].includes(scope)
    || (scope === "DAY" && !dayKey)
  ) return { status: "error", code: "missing-fields" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const bounds = scope === "DAY" ? zonedDayBounds(dayKey, operator.timezone) : null;
  if (scope === "DAY" && !bounds) return { status: "error", code: "invalid-day" };

  const { error } = await supabase.rpc("operator_release_boat_occupancy_scope", {
    p_operator_id: operator.id,
    p_boat_id: boatId,
    p_occupancy_id: occupancyId,
    p_scope: scope,
    p_day_start: bounds?.start ?? null,
    p_day_end: bounds?.end ?? null,
  });
  if (error) return { status: "error", code: "release-failed" };

  refreshCalendar(operator.id);
  return { status: "success" };
}

export async function cancelCalendarBooking(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  if (!operatorId || !bookingId) return { status: "error", code: "missing-fields" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_cancel_calendar_booking", {
    p_operator_id: operator.id,
    p_booking_id: bookingId,
  });
  if (error) {
    return {
      status: "error",
      code: error.message.includes("marketplace_booking_requires_financial_cancellation")
        ? "financial-cancellation-required"
        : error.message.includes("booking_not_cancellable")
          ? "not-cancellable"
          : "cancel-failed",
    };
  }

  refreshCalendar(operator.id);
  return { status: "success" };
}
