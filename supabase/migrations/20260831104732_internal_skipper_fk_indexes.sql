-- Cover every foreign-key lookup introduced by internal skipper scheduling.
-- These indexes keep deletes and integrity checks predictable as the pilot grows.

begin;

create index booking_internal_skipper_assignments_booking_fk_idx
  on public.booking_internal_skipper_assignments(operator_id, booking_id);

create index booking_internal_skipper_assignments_skipper_fk_idx
  on public.booking_internal_skipper_assignments(operator_id, skipper_id)
  where skipper_id is not null;

create index booking_internal_skipper_assignments_assigned_by_idx
  on public.booking_internal_skipper_assignments(assigned_by)
  where assigned_by is not null;

create index operator_internal_skippers_created_by_idx
  on public.operator_internal_skippers(created_by)
  where created_by is not null;

commit;
