"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlatformContext } from "@/lib/admin/context";
import { createStripeRefund } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RefundSetup = {
  refund_id: string;
  booking_id: string;
  booking_reference: string | null;
  payment_id: string;
  payment_intent_id: string;
  amount_cents: number;
  currency: string;
  reason: string;
  idempotency_key: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseMoneyToCents(value: string) {
  const compact = value.replace(/[\s€]/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function isRefundSetup(value: unknown): value is RefundSetup {
  if (!value || typeof value !== "object") {
    return false;
  }

  const setup = value as Partial<RefundSetup>;

  return (
    typeof setup.refund_id === "string" &&
    typeof setup.booking_id === "string" &&
    (typeof setup.booking_reference === "string" || setup.booking_reference === null) &&
    typeof setup.payment_id === "string" &&
    typeof setup.payment_intent_id === "string" &&
    typeof setup.amount_cents === "number" &&
    typeof setup.currency === "string" &&
    typeof setup.reason === "string" &&
    typeof setup.idempotency_key === "string"
  );
}

function setupErrorCode(message: string) {
  const knownCodes = [
    "booking_not_refundable",
    "refundable_payment_not_found",
    "payment_already_fully_refunded",
    "refund_amount_exceeds_remaining",
    "refund_amount_invalid",
    "refund_reason_required",
    "refund_not_retryable",
  ];

  return knownCodes.find((code) => message.includes(code)) ?? "refund-setup-failed";
}

export async function createMarketplaceRefund(formData: FormData) {
  const refundId = text(formData, "refund_id");
  const bookingId = text(formData, "booking_id");
  const reason = text(formData, "reason");
  const amountCents = parseMoneyToCents(text(formData, "amount"));
  const confirmed = text(formData, "confirm") === "CONFIRM";
  const isRetry = Boolean(refundId);

  if (
    !confirmed ||
    (isRetry ? !refundId : !bookingId || !reason || !amountCents)
  ) {
    redirect("/admin/finance?error=refund-input-invalid");
  }

  const { supabase } = await requirePlatformContext(["SUPER_ADMIN"]);

  const { data, error } = isRetry
    ? await supabase.rpc("admin_marketplace_refund_retry_setup", {
        p_refund_id: refundId,
      })
    : await supabase.rpc("admin_marketplace_refund_setup", {
        p_booking_id: bookingId,
        p_amount_cents: amountCents,
        p_reason: reason,
      });

  if (error || !isRefundSetup(data)) {
    console.error("Unable to prepare marketplace refund.", error);
    const code = error
      ? setupErrorCode(error.message)
      : "refund-setup-invalid";
    redirect(`/admin/finance?error=${encodeURIComponent(code)}`);
  }

  let stripeRefund;

  try {
    stripeRefund = await createStripeRefund({
      refundId: data.refund_id,
      bookingId: data.booking_id,
      bookingReference: data.booking_reference,
      paymentId: data.payment_id,
      paymentIntentId: data.payment_intent_id,
      amountCents: data.amount_cents,
      reason: data.reason,
      idempotencyKey: data.idempotency_key,
    });
  } catch (error) {
    console.error("Stripe refund creation failed.", error);
    redirect("/admin/finance?error=stripe-refund-failed");
  }

  const admin = createAdminClient();
  const { error: recordError } = await admin.rpc(
    "record_marketplace_refund_creation",
    {
      p_refund_id: data.refund_id,
      p_booking_id: data.booking_id,
      p_payment_id: data.payment_id,
      p_provider_refund_id: stripeRefund.id,
      p_idempotency_key: data.idempotency_key,
      p_amount_cents: stripeRefund.amount,
      p_currency: stripeRefund.currency.toUpperCase(),
      p_provider_status: stripeRefund.status ?? "pending",
      p_provider_state: stripeRefund,
    },
  );

  if (recordError) {
    console.error("Unable to persist Stripe refund response.", recordError);
    redirect("/admin/finance?error=refund-record-failed");
  }

  revalidatePath("/admin/finance");
  revalidatePath(`/prenotazioni/${data.booking_id}`);
  revalidatePath(`/operator/bookings/${data.booking_id}`);

  redirect("/admin/finance?refund=requested");
}
