# Boatly marketplace refunds

## Scope

This workflow applies only to Stripe marketplace booking payments created as
destination charges. Manual/off-platform booking payments remain outside the
Stripe refund flow.

## Authorization and source of truth

- Only SUPER_ADMIN, ADMIN, and FINANCE users can prepare a refund.
- A booking must already be cancelled, marked REFUND_PENDING, or partially
  refunded.
- The database validates the requested amount against the remaining refundable
  payment balance.
- The database reserves the amount atomically before any Stripe request, so
  concurrent submissions cannot exceed the captured payment.
- Stripe receives a deterministic idempotency key.
- reverse_transfer=true returns the proportional destination transfer.
- refund_application_fee=true returns the proportional Boatly application fee.
- The synchronous Stripe API response records the request, but a
  signature-verified Stripe webhook is the authority for SUCCEEDED.

## Required Stripe webhook events

The production and test webhook endpoints must subscribe to:

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- refund.created
- refund.updated
- refund.failed

charge.refunded is not required for the refund projection because Stripe
recommends the dedicated refund events.

## Deployment order

1. Apply 20260827113051_marketplace_refund_execution.sql.
2. Confirm the new RPC privileges and run the Supabase advisors.
3. Deploy the application.
4. Add the three refund events to the Stripe TEST webhook.
5. Run one partial TEST refund.
6. Run the remaining TEST refund and verify the booking becomes REFUNDED.

Deploying the application before the migration can make refund webhook
processing fail because the refund RPC will not exist yet.

## Live safety gate

STRIPE_LIVE_REFUNDS_ENABLED defaults to disabled. A live Stripe key cannot
create refunds until the production launch has been approved and the variable
is explicitly set to true.

The TEST key continues to work without changing this variable.

## Retry and recovery

- A pending attempt can be retried from Finance. Boatly reuses its original
  idempotency key, so Stripe returns the original refund instead of creating a
  duplicate.
- Failed refund webhooks are stored as failed Stripe events and remain visible
  for financial reconciliation.
- Never mark a refund as successful manually without matching the provider
  state and verified event.
