import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

type CheckoutSession = {
  id: string;
  object: "checkout.session";
  url: string | null;
  expires_at: number;
  payment_intent: string | null;
  status: string | null;
  payment_status: string | null;
  amount_total: number | null;
  currency: string | null;
  metadata?: Record<string, string>;
};

type StripeErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  api_version?: string | null;
  account?: string | null;
  data: {
    object: Record<string, unknown>;
  };
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const WEBHOOK_TOLERANCE_SECONDS = 300;

function stripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY;

  if (!value) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  return value;
}

function stripeWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET;

  if (!value) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return value;
}

export function appBaseUrl() {
  const configured = process.env.APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error("APP_URL is not configured.");
}

export function stripeServerConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      (process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

async function stripePost<T>(
  path: string,
  params: URLSearchParams,
  idempotencyKey?: string,
): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : {}),
    },
    body: params,
    cache: "no-store",
  });

  const payload = (await response.json()) as T & StripeErrorResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message ??
        `Stripe request failed with HTTP ${response.status}.`,
    );
  }

  return payload;
}

export async function createStripeCheckoutSession(input: {
  bookingId: string;
  bookingReference: string;
  boatName: string;
  customerEmail?: string | null;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  connectedAccountId: string;
  checkoutRequestId: string;
}) {
  const baseUrl = appBaseUrl();
  const params = new URLSearchParams();

  params.set("mode", "payment");
  params.set(
    "success_url",
    `${baseUrl}/prenotazioni/${encodeURIComponent(input.bookingId)}?checkout=success`,
  );
  params.set(
    "cancel_url",
    `${baseUrl}/prenotazioni/${encodeURIComponent(input.bookingId)}?checkout=cancelled`,
  );
  params.set("client_reference_id", input.bookingId);
  params.set("expires_at", String(Math.floor(Date.now() / 1000) + 32 * 60));
  params.set("locale", "it");
  params.set("payment_method_types[0]", "card");

  if (input.customerEmail) {
    params.set("customer_email", input.customerEmail);
  }

  params.set("line_items[0][quantity]", "1");
  params.set(
    "line_items[0][price_data][currency]",
    input.currency.toLowerCase(),
  );
  params.set(
    "line_items[0][price_data][unit_amount]",
    String(input.amountCents),
  );
  params.set(
    "line_items[0][price_data][product_data][name]",
    `Prenotazione ${input.boatName}`,
  );
  params.set(
    "line_items[0][price_data][product_data][description]",
    `Boatly · ${input.bookingReference}`,
  );

  params.set(
    "payment_intent_data[application_fee_amount]",
    String(input.platformFeeCents),
  );
  params.set(
    "payment_intent_data[transfer_data][destination]",
    input.connectedAccountId,
  );
  params.set(
    "payment_intent_data[metadata][booking_id]",
    input.bookingId,
  );
  params.set(
    "payment_intent_data[metadata][booking_reference]",
    input.bookingReference,
  );

  params.set("metadata[booking_id]", input.bookingId);
  params.set("metadata[booking_reference]", input.bookingReference);
  params.set("metadata[checkout_request_id]", input.checkoutRequestId);

  return stripePost<CheckoutSession>(
    "/checkout/sessions",
    params,
    `booking:${input.bookingId}:checkout:${input.checkoutRequestId}`,
  );
}

export async function expireStripeCheckoutSession(sessionId: string) {
  return stripePost<CheckoutSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}/expire`,
    new URLSearchParams(),
  );
}

function parseStripeSignature(header: string) {
  const parts = header.split(",");
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);

    if (key === "t" && value && /^\d+$/.test(value)) {
      timestamp = Number(value);
    }

    if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
): StripeWebhookEvent {
  if (!signatureHeader) {
    throw new Error("Missing Stripe-Signature header.");
  }

  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid Stripe-Signature header.");
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);

  if (age > WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error("Stripe webhook timestamp is outside the tolerance window.");
  }

  const expected = createHmac("sha256", stripeWebhookSecret())
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const valid = signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return false;
    }

    const actualBuffer = Buffer.from(signature, "hex");

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  });

  if (!valid) {
    throw new Error("Stripe webhook signature verification failed.");
  }

  const parsed = JSON.parse(rawBody) as StripeWebhookEvent;

  if (!parsed?.id || !parsed?.type || !parsed?.data?.object) {
    throw new Error("Stripe webhook payload is malformed.");
  }

  return parsed;
}
