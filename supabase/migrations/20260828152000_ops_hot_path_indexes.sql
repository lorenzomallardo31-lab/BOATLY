-- ============================================================
-- BOATLY OPS
-- Cover the foreign keys and read paths exercised by calendar,
-- CRM, booking details, finance and team administration.
-- ============================================================

begin;

create index if not exists bookings_operator_boat_fk_idx
  on public.bookings(operator_id, boat_id);
create index if not exists bookings_boat_offering_fk_idx
  on public.bookings(boat_id, legal_offering_id);
create index if not exists bookings_operator_customer_fk_idx
  on public.bookings(operator_id, operator_customer_id);
create index if not exists bookings_operator_pickup_location_fk_idx
  on public.bookings(operator_id, pickup_location_id);
create index if not exists bookings_operator_boat_rate_plan_fk_idx
  on public.bookings(operator_id, boat_id, rate_plan_id);

create index if not exists boat_occupancies_operator_boat_fk_idx
  on public.boat_occupancies(operator_id, boat_id);
create index if not exists boat_occupancies_booking_operator_boat_fk_idx
  on public.boat_occupancies(operator_id, booking_id, boat_id);

create index if not exists booking_cancellation_requests_operator_booking_fk_idx
  on public.booking_cancellation_requests(operator_id, booking_id);
create index if not exists booking_events_operator_booking_occurred_idx
  on public.booking_events(operator_id, booking_id, occurred_at desc);
create index if not exists booking_price_items_operator_booking_fk_idx
  on public.booking_price_items(operator_id, booking_id);
create index if not exists manual_payment_records_operator_booking_fk_idx
  on public.manual_payment_records(operator_id, booking_id);

create index if not exists boats_operator_primary_location_fk_idx
  on public.boats(operator_id, primary_location_id);
create index if not exists operator_customers_created_by_idx
  on public.operator_customers(created_by);
create index if not exists operator_invitations_accepted_by_idx
  on public.operator_invitations(accepted_by);
create index if not exists operator_invitations_invited_by_idx
  on public.operator_invitations(invited_by);
create index if not exists operator_members_invited_by_idx
  on public.operator_members(invited_by);

drop index if exists public.boat_legal_offerings_boat_legal_type_unique_idx;

commit;
