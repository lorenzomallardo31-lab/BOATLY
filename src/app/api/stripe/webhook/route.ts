import { NextResponse } from "next/server";

import { verifyStripeWebhook } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: ReturnType<typeof verifyStripeWebhook>;

  try {
    event = verifyStripeWebhook(rawBody, signature);
  } catch (error) {
    console.error("Rejected Stripe webhook", error);

    return NextResponse.json(
      { received: false },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const stripeObject = event.data.object;
  const objectId =
    typeof stripeObject.id === "string" ? stripeObject.id : null;

  let eventRowId: string | null = null;

  const { data: inserted, error: insertError } = await admin
    .from("stripe_events")
    .insert({
      stripe_event_id: event.id,
      idempotency_key: event.id,
      event_type: event.type,
      object_id: objectId,
      connected_account_id: event.account ?? null,
      api_version: event.api_version ?? null,
      livemode: event.livemode,
      signature_verified: true,
      processing_status: "RECEIVED",
      payload: event,
      delivery_count: 1,
      processing_attempt_count: 0,
      received_at: new Date().toISOString(),
      last_received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!insertError && inserted?.id) {
    eventRowId = inserted.id;
  } else if (insertError?.code === "23505") {
    const { data: existing, error: existingError } = await admin
      .from("stripe_events")
      .select("id, delivery_count, processing_status")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingError || !existing) {
      console.error("Unable to recover duplicate Stripe event", existingError);
      return NextResponse.json({ received: false }, { status: 500 });
    }

    eventRowId = existing.id;

    await admin
      .from("stripe_events")
      .update({
        delivery_count: Math.max(1, Number(existing.delivery_count) || 1) + 1,
        last_received_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (existing.processing_status === "PROCESSED" || existing.processing_status === "IGNORED") {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } else {
    console.error("Unable to persist Stripe event", insertError);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  if (!eventRowId) {
    return NextResponse.json({ received: false }, { status: 500 });
  }

  const { data: result, error: processError } = await admin.rpc(
    "process_marketplace_stripe_event",
    {
      p_stripe_event_row_id: eventRowId,
    },
  );

  if (processError) {
    console.error("Stripe event processing RPC failed", processError);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  const processed =
    result && typeof result === "object" && "processed" in result
      ? Boolean((result as { processed?: unknown }).processed)
      : false;

  if (!processed) {
    console.error("Stripe event was not processed", result);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
