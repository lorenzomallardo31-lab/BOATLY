-- ============================================================
-- BOATLY
-- Migration: Refund reconciliation indexes
-- ============================================================

begin;

create index if not exists refunds_payment_booking_operator_idx
on public.refunds(payment_id, booking_id, operator_id);

create index if not exists refunds_last_stripe_event_id_idx
on public.refunds(last_stripe_event_id)
where last_stripe_event_id is not null;

commit;
