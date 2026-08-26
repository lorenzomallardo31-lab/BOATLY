"use server";

import { redirect } from "next/navigation";

import {
  createStripeCheckoutSession,
  expireStripeCheckoutSession,
  stripeServerConfigured,
} from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function checkoutUrl(input: {
  boat: string;
  date: string;
  passengers: string;
  error?: string;
}) {
  const params = new URLSearchParams({
    boat: input.boat,
    date: input.date,
    passengers: input.passengers,
  });

  if (input.error) {
    params.set("error", input.error);
  }

  return `/checkout/start?${params.toString()}`;
}

function mapBookingError(message: string) {
  const mappings: Array<[string, string]> = [
    ["slot_not_available", "slot-not-available"],
    ["slot_outside_availability", "slot-not-available"],
    ["too_many_active_checkout_holds", "too-many-holds"],
    ["cancellation_policy_missing", "cancellation-policy-missing"],
    ["cancellation_policy_rules_missing", "cancellation-policy-missing"],
    ["booking_terms_not_accepted", "terms-required"],
    ["commercial_plan_missing", "commercial-not-ready"],
    ["commission_rule_missing", "commercial-not-ready"],
    ["stripe_account_not_ready", "stripe-account-not-ready"],
    ["self_drive_not_allowed", "driver-not-allowed"],
    ["skipper_not_available", "skipper-not-available"],
    ["driver_date_of_birth_required", "driver-age-required"],
    ["minimum_driver_age_not_met", "driver-age-not-met"],
    ["required_license_not_confirmed", "license-required"],
    ["extra_quantity_exceeds_passengers", "invalid-extra-quantity"],
    ["extra_quantity_exceeds_limit", "invalid-extra-quantity"],
    ["marketplace_payment_amount_must_be_positive", "invalid-payment-amount"],
  ];

  return (
    mappings.find(([needle]) => message.includes(needle))?.[1] ??
    "booking-create-failed"
  );
}

export async function startMarketplaceCheckout(formData: FormData) {
  const boat = readText(formData, "boat");
  const date = readText(formData, "date");
  const passengers = readText(formData, "passengers");
  const selectedOption = readText(formData, "booking_option");
  const firstName = readText(formData, "first_name");
  const lastName = readText(formData, "last_name");
  const phone = readText(formData, "phone");
  const dateOfBirth = readText(formData, "date_of_birth");
  const customerNote = readText(formData, "customer_note");
  const driverIsCustomer = readText(formData, "driver_is_customer") === "true";
  const driverHasRequiredLicense =
    formData.get("driver_has_required_license") === "on";
  const termsAccepted = formData.get("terms_accepted") === "on";
  const checkoutRequestId = readText(formData, "checkout_request_id");

  const backUrl = checkoutUrl({ boat, date, passengers });

  if (
    !boat ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^[1-9][0-9]*$/.test(passengers) ||
    !checkoutRequestId ||
    !selectedOption
  ) {
    redirect(`${backUrl}&error=invalid-checkout`);
  }

  if (!firstName || !lastName) {
    redirect(`${backUrl}&error=customer-name-required`);
  }

  if (!termsAccepted) {
    redirect(`${backUrl}&error=terms-required`);
  }

  if (!stripeServerConfigured()) {
    redirect(`${backUrl}&error=stripe-server-not-configured`);
  }

  const [ratePlanId, legalOfferingId, startsAt, endsAt] =
    selectedOption.split("|");

  if (!ratePlanId || !legalOfferingId || !startsAt || !endsAt) {
    redirect(`${backUrl}&error=invalid-checkout`);
  }

  const extras: Array<{ extra_id: string; quantity: number }> = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("extra_") || value !== "on") {
      continue;
    }

    const extraId = key.slice("extra_".length);
    const quantityRaw = readText(formData, `quantity_${extraId}`);
    const quantity = /^[1-9][0-9]*$/.test(quantityRaw)
      ? Number(quantityRaw)
      : 1;

    extras.push({
      extra_id: extraId,
      quantity,
    });
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (
    claimsError ||
    !claimsData?.claims ||
    typeof claimsData.claims.sub !== "string"
  ) {
    redirect(`/sign-in?next=${encodeURIComponent(backUrl)}`);
  }

  const { data: bookingData, error: bookingError } = await supabase.rpc(
    "create_marketplace_booking_hold",
    {
      p_boat_slug: boat,
      p_rate_plan_id: ratePlanId,
      p_legal_offering_id: legalOfferingId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_passengers: Number(passengers),
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: phone || null,
      p_date_of_birth: dateOfBirth || null,
      p_driver_is_customer: driverIsCustomer,
      p_driver_has_required_license: driverHasRequiredLicense,
      p_customer_note: customerNote || null,
      p_extra_items: extras,
      p_terms_accepted: termsAccepted,
      p_checkout_idempotency_key: checkoutRequestId,
    },
  );

  if (bookingError || !bookingData || typeof bookingData !== "object") {
    const errorCode = mapBookingError(bookingError?.message ?? "");
    redirect(`${backUrl}&error=${encodeURIComponent(errorCode)}`);
  }

  const booking = bookingData as {
    booking_id?: string;
    reference?: string;
  };

  if (!booking.booking_id || !booking.reference) {
    redirect(`${backUrl}&error=booking-create-failed`);
  }

  const { data: paymentSetupData, error: paymentSetupError } = await supabase.rpc(
    "get_marketplace_payment_setup",
    {
      p_booking_id: booking.booking_id,
    },
  );

  if (
    paymentSetupError ||
    !paymentSetupData ||
    typeof paymentSetupData !== "object"
  ) {
    await supabase.rpc("abandon_marketplace_booking_checkout", {
      p_booking_id: booking.booking_id,
      p_reason: "PAYMENT_SETUP_FAILED",
    });

    redirect(`${backUrl}&error=payment-setup-failed`);
  }

  const paymentSetup = paymentSetupData as {
    amount_cents?: number;
    platform_fee_cents?: number;
    currency?: string;
    boat_name?: string;
    stripe_account_id?: string;
    operator_id?: string;
  };

  if (
    typeof paymentSetup.amount_cents !== "number" ||
    typeof paymentSetup.platform_fee_cents !== "number" ||
    !paymentSetup.currency ||
    !paymentSetup.boat_name ||
    !paymentSetup.stripe_account_id ||
    !paymentSetup.operator_id
  ) {
    await supabase.rpc("abandon_marketplace_booking_checkout", {
      p_booking_id: booking.booking_id,
      p_reason: "PAYMENT_SETUP_INCOMPLETE",
    });

    redirect(`${backUrl}&error=payment-setup-failed`);
  }

  const email =
    typeof claimsData.claims.email === "string"
      ? claimsData.claims.email
      : null;

  let stripeSession: Awaited<ReturnType<typeof createStripeCheckoutSession>> | null =
    null;

  try {
    stripeSession = await createStripeCheckoutSession({
      bookingId: booking.booking_id,
      bookingReference: booking.reference,
      boatName: paymentSetup.boat_name,
      customerEmail: email,
      amountCents: paymentSetup.amount_cents,
      currency: paymentSetup.currency,
      platformFeeCents: paymentSetup.platform_fee_cents,
      connectedAccountId: paymentSetup.stripe_account_id,
      checkoutRequestId,
    });

    if (!stripeSession.url) {
      throw new Error("Stripe Checkout Session did not return a redirect URL.");
    }

    const admin = createAdminClient();
    const { error: sessionInsertError } = await admin
      .from("payment_checkout_sessions")
      .insert({
        operator_id: paymentSetup.operator_id,
        booking_id: booking.booking_id,
        provider: "STRIPE",
        provider_session_id: stripeSession.id,
        provider_payment_intent_id: stripeSession.payment_intent,
        status: "OPEN",
        checkout_url: stripeSession.url,
        expires_at: new Date(stripeSession.expires_at * 1000).toISOString(),
        provider_state_snapshot: stripeSession,
      });

    if (sessionInsertError) {
      throw new Error(`Unable to persist checkout session: ${sessionInsertError.message}`);
    }
  } catch (error) {
    if (stripeSession?.id) {
      try {
        await expireStripeCheckoutSession(stripeSession.id);
      } catch (expireError) {
        console.error("Unable to expire Stripe Checkout Session", expireError);
      }
    }

    await supabase.rpc("abandon_marketplace_booking_checkout", {
      p_booking_id: booking.booking_id,
      p_reason: "STRIPE_CHECKOUT_CREATION_FAILED",
    });

    console.error("Marketplace checkout creation failed", error);
    redirect(`${backUrl}&error=stripe-checkout-failed`);
  }

  redirect(stripeSession.url);
}
