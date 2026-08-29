"use server";

import { revalidatePath } from "next/cache";

import { zonedDayBounds } from "@/lib/operator/date-time";
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
  revalidatePath("/operator/fleet");
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
  if (!operatorId || !boatId || !occupancyId) return { status: "error", code: "missing-fields" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("release_operator_boat_occupancy", {
    p_operator_id: operator.id,
    p_boat_id: boatId,
    p_occupancy_id: occupancyId,
    p_reason: "RELEASED_FROM_CALENDAR",
  });
  if (error) return { status: "error", code: "release-failed" };

  refreshCalendar(operator.id);
  return { status: "success" };
}

export async function changeCalendarBookingStatus(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  const targetStatus = text(formData, "target_status");
  const note = text(formData, "note");
  if (!operatorId || !bookingId) return { status: "error", code: "missing-fields" };
  if (!["IN_PROGRESS", "COMPLETED", "CANCELLED_BY_OPERATOR", "NO_SHOW"].includes(targetStatus)) {
    return { status: "error", code: "invalid-status" };
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_change_booking_status", {
    p_operator_id: operator.id,
    p_booking_id: bookingId,
    p_status: targetStatus,
    p_note: note || null,
  });
  if (error) return { status: "error", code: "status-failed" };

  refreshCalendar(operator.id);
  return { status: "success" };
}
