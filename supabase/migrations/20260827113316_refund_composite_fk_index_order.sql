-- ============================================================
-- BOATLY
-- Migration: Match the refund composite FK column order
-- ============================================================

begin;

drop index if exists public.refunds_payment_booking_operator_idx;

create index refunds_operator_booking_payment_idx
on public.refunds(operator_id, booking_id, payment_id);

commit;
