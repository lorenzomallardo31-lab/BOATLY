"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseMoneyToCents } from "@/lib/operator/finance";
import { zonedDateTimeToIso } from "@/lib/operator/date-time";
import { requireOperatorWorkspaceContext } from "@/lib/operator/workspace-context";

export type ManualPaymentActionState = {
  status: "idle" | "error" | "success";
  code?: string;
};

const RECORD_TYPES = new Set(["PAYMENT", "REFUND"]);
const PURPOSES = new Set([
  "DEPOSIT",
  "BALANCE",
  "FULL_PAYMENT",
  "SECURITY_DEPOSIT",
  "OTHER",
]);
const METHODS = new Set(["CASH", "CARD_EXTERNAL", "BANK_TRANSFER", "OTHER"]);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function paymentError(message: string) {
  const mappings: Array<[string, string]> = [
    ["manual_payment_record_not_allowed", "not-allowed"],
    ["operator_must_be_active", "operator-inactive"],
    ["manual_payment_classification_required", "classification"],
    ["invalid_manual_payment_amount", "invalid-amount"],
    ["invalid_manual_payment_date", "invalid-date"],
    ["manual_payment_reference_too_long", "reference-too-long"],
    ["manual_payment_note_too_long", "note-too-long"],
    ["booking_not_found", "booking-not-found"],
    ["manual_payment_requires_manual_booking", "manual-only"],
    ["booking_status_does_not_accept_payment", "booking-status"],
    ["manual_payment_exceeds_booking_total", "exceeds-total"],
    ["manual_refund_exceeds_recorded_payments", "exceeds-paid"],
  ];
  return mappings.find(([needle]) => message.includes(needle))?.[1] ?? "save-failed";
}

export async function recordManualPayment(
  _previousState: ManualPaymentActionState,
  formData: FormData,
): Promise<ManualPaymentActionState> {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  const recordType = text(formData, "record_type");
  const purpose = text(formData, "purpose");
  const method = text(formData, "payment_method");
  const amountCents = parseMoneyToCents(text(formData, "amount"));
  const occurredAtLocal = text(formData, "occurred_at_local");
  const externalReference = text(formData, "external_reference");
  const note = text(formData, "note");
  const confirmed = text(formData, "confirmed") === "yes";

  if (!operatorId || !bookingId) return { status: "error", code: "missing-fields" };
  if (!RECORD_TYPES.has(recordType) || !PURPOSES.has(purpose) || !METHODS.has(method)) {
    return { status: "error", code: "classification" };
  }
  if (amountCents === null) return { status: "error", code: "invalid-amount" };
  if (!confirmed) return { status: "error", code: "confirmation-required" };
  if (externalReference.length > 160) return { status: "error", code: "reference-too-long" };
  if (note.length > 1000) return { status: "error", code: "note-too-long" };

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const occurredAt = zonedDateTimeToIso(occurredAtLocal, operator.timezone);
  if (!occurredAt || new Date(occurredAt) > new Date(Date.now() + 5 * 60_000)) {
    return { status: "error", code: "invalid-date" };
  }

  const { error } = await supabase.rpc("operator_record_manual_payment", {
    p_operator_id: operator.id,
    p_booking_id: bookingId,
    p_record_type: recordType,
    p_purpose: purpose,
    p_payment_method: method,
    p_amount_cents: amountCents,
    p_occurred_at: occurredAt,
    p_external_reference: externalReference || null,
    p_note: note || null,
  });

  if (error) {
    return { status: "error", code: paymentError(error.message) };
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/calendar");
  revalidatePath("/operator/bookings");
  revalidatePath(`/operator/bookings/${bookingId}`);
  revalidatePath("/operator/finance");
  return { status: "success" };
}

export async function voidManualPayment(formData: FormData) {
  const operatorId = text(formData, "operator_id");
  const bookingId = text(formData, "booking_id");
  const recordId = text(formData, "record_id");
  const reason = text(formData, "reason");

  if (!operatorId || !bookingId || !recordId) redirect("/operator/finance");
  if (reason.length < 5 || reason.length > 1000) {
    redirect(`/operator/bookings/${encodeURIComponent(bookingId)}?operator=${encodeURIComponent(operatorId)}&financeError=void-reason#manual-finance`);
  }

  const { supabase, operator } = await requireOperatorWorkspaceContext(operatorId);
  const { error } = await supabase.rpc("operator_void_manual_payment", {
    p_operator_id: operator.id,
    p_record_id: recordId,
    p_reason: reason,
  });

  if (error) {
    const code = error.message.includes("manual_payment_void_not_allowed")
      ? "void-not-allowed"
      : error.message.includes("manual_payment_already_voided")
        ? "already-voided"
        : "void-failed";
    redirect(`/operator/bookings/${encodeURIComponent(bookingId)}?operator=${encodeURIComponent(operator.id)}&financeError=${code}#manual-finance`);
  }

  revalidatePath("/operator/dashboard");
  revalidatePath("/operator/calendar");
  revalidatePath(`/operator/bookings/${bookingId}`);
  revalidatePath("/operator/finance");
  redirect(`/operator/bookings/${encodeURIComponent(bookingId)}?operator=${encodeURIComponent(operator.id)}&finance=voided#manual-finance`);
}
