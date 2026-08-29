-- ============================================================
-- BOATLY OPS
-- One booking lifecycle, one calendar truth
--
-- Terminal bookings must never keep a boat occupied or be rendered as
-- operator blocks. Calendar deletion is intentionally limited to manual
-- bookings: marketplace bookings require their financial cancellation flow.
-- ============================================================

begin;

create or replace function private.release_terminal_booking_occupancies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status not in (
    'DRAFT'::public.booking_status,
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status,
    'CONFIRMED'::public.booking_status,
    'IN_PROGRESS'::public.booking_status
  ) then
    update public.boat_occupancies
    set
      is_active = false,
      released_at = coalesce(released_at, pg_catalog.now()),
      released_by = coalesce(released_by, auth.uid()),
      release_reason = coalesce(
        nullif(pg_catalog.btrim(release_reason), ''),
        'BOOKING_STATUS_' || new.status::text
      )
    where booking_id = new.id
      and is_active = true;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_release_terminal_occupancies
on public.bookings;

create trigger bookings_release_terminal_occupancies
after insert or update of status
on public.bookings
for each row
execute function private.release_terminal_booking_occupancies();

comment on function private.release_terminal_booking_occupancies() is
  'Keeps the fleet calendar consistent by releasing every active occupancy linked to a terminal booking status.';

create or replace function public.operator_cancel_calendar_booking(
  p_operator_id uuid,
  p_booking_id uuid
)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if not private.has_operator_role(
    p_operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  ) then
    raise exception using errcode = '42501', message = 'booking_cancellation_not_allowed';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;

  if v_booking.source <> 'MANUAL'::public.booking_source then
    raise exception using errcode = '22023', message = 'marketplace_booking_requires_financial_cancellation';
  end if;

  if v_booking.status = 'CANCELLED_BY_OPERATOR'::public.booking_status then
    update public.boat_occupancies
    set
      is_active = false,
      released_at = coalesce(released_at, pg_catalog.now()),
      released_by = coalesce(released_by, v_user_id),
      release_reason = coalesce(
        nullif(pg_catalog.btrim(release_reason), ''),
        'BOOKING_CANCELLED_BY_OPERATOR'
      )
    where booking_id = p_booking_id
      and is_active = true;

    return v_booking.status;
  end if;

  if v_booking.status not in (
    'DRAFT'::public.booking_status,
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status,
    'CONFIRMED'::public.booking_status,
    'IN_PROGRESS'::public.booking_status
  ) then
    raise exception using errcode = '22023', message = 'booking_not_cancellable';
  end if;

  update public.bookings
  set status = 'CANCELLED_BY_OPERATOR'::public.booking_status
  where id = p_booking_id;

  -- Kept explicit as well as trigger-backed so the RPC remains self-contained
  -- and safe if trigger configuration is ever inspected or repaired.
  update public.boat_occupancies
  set
    is_active = false,
    released_at = coalesce(released_at, pg_catalog.now()),
    released_by = coalesce(released_by, v_user_id),
    release_reason = coalesce(
      nullif(pg_catalog.btrim(release_reason), ''),
      'BOOKING_CANCELLED_BY_OPERATOR'
    )
  where booking_id = p_booking_id
    and is_active = true;

  insert into public.booking_events (
    operator_id,
    booking_id,
    event_type,
    actor_type,
    actor_user_id,
    from_status,
    to_status,
    message,
    metadata
  ) values (
    p_operator_id,
    p_booking_id,
    'OPERATOR_BOOKING_REMOVED_FROM_CALENDAR',
    'OPERATOR'::public.booking_event_actor_type,
    v_user_id,
    v_booking.status,
    'CANCELLED_BY_OPERATOR'::public.booking_status,
    null,
    pg_catalog.jsonb_build_object('surface', 'calendar')
  );

  return 'CANCELLED_BY_OPERATOR'::public.booking_status;
end;
$$;

revoke all on function public.operator_cancel_calendar_booking(uuid, uuid)
from public;

revoke execute on function public.operator_cancel_calendar_booking(uuid, uuid)
from anon;

grant execute on function public.operator_cancel_calendar_booking(uuid, uuid)
to authenticated, service_role;

comment on function public.operator_cancel_calendar_booking(uuid, uuid) is
  'Cancels an active manual booking, releases its boat atomically, and preserves the audit trail.';

-- Repair existing inconsistencies without deleting history. These rows remain
-- available for auditing but can no longer block or impersonate a calendar day.
update public.boat_occupancies bo
set
  is_active = false,
  released_at = coalesce(bo.released_at, pg_catalog.now()),
  release_reason = coalesce(
    nullif(pg_catalog.btrim(bo.release_reason), ''),
    'TERMINAL_BOOKING_RECONCILIATION'
  )
from public.bookings b
where b.id = bo.booking_id
  and bo.is_active = true
  and b.status not in (
    'DRAFT'::public.booking_status,
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status,
    'CONFIRMED'::public.booking_status,
    'IN_PROGRESS'::public.booking_status
  );

commit;
