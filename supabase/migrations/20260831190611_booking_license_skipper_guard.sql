-- ============================================================
-- BOATLY OPS
-- Nautical-license answer and mandatory skipper guard (production-aligned)
-- ============================================================

begin;

create table public.booking_navigation_requirements (
  booking_id uuid primary key,
  operator_id uuid not null,
  boat_license_required_snapshot boolean not null,
  customer_has_required_license boolean,
  recorded_by uuid
    references auth.users(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_navigation_requirements_booking_fk
    foreign key (operator_id, booking_id)
    references public.bookings(operator_id, id)
    on delete cascade,
  constraint booking_navigation_requirements_answer_scope
    check (
      boat_license_required_snapshot
      or customer_has_required_license is null
    )
);

create index booking_navigation_requirements_operator_booking_idx
  on public.booking_navigation_requirements(operator_id, booking_id);

create index booking_navigation_requirements_recorded_by_idx
  on public.booking_navigation_requirements(recorded_by)
  where recorded_by is not null;

create trigger booking_navigation_requirements_set_updated_at
before update on public.booking_navigation_requirements
for each row
execute function public.set_updated_at();

alter table public.booking_navigation_requirements enable row level security;

create policy booking_navigation_requirements_select_workspace
on public.booking_navigation_requirements
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role,
      'EMPLOYEE'::public.operator_member_role
    ]
  )
);

revoke all on table public.booking_navigation_requirements
  from public, anon, authenticated;
grant select on table public.booking_navigation_requirements to authenticated;

-- Preserve known marketplace answers and explicitly mark older manual rows as
-- unknown. Historical rows remain readable; every new operator mutation below
-- requires a definite answer whenever the selected boat requires a licence.
insert into public.booking_navigation_requirements (
  booking_id,
  operator_id,
  boat_license_required_snapshot,
  customer_has_required_license,
  recorded_by,
  created_at,
  updated_at
)
select
  b.id,
  b.operator_id,
  coalesce(boat.license_required, false),
  case
    when coalesce(boat.license_required, false)
      and pg_catalog.jsonb_typeof(
        b.driver_eligibility_snapshot -> 'driver_has_required_license_confirmed'
      ) = 'boolean'
    then (b.driver_eligibility_snapshot ->> 'driver_has_required_license_confirmed')::boolean
    else null
  end,
  b.created_by,
  b.created_at,
  b.updated_at
from public.bookings b
join public.boats boat
  on boat.id = b.boat_id
 and boat.operator_id = b.operator_id
on conflict (booking_id) do nothing;

create or replace function private.record_booking_navigation_requirement(
  p_operator_id uuid,
  p_booking_id uuid,
  p_customer_has_required_license boolean,
  p_skipper_mode text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_license_required boolean;
  v_mode text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_skipper_mode, 'NONE')));
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if v_mode not in ('NONE', 'UNASSIGNED', 'EXISTING', 'NEW') then
    raise exception using errcode = '22023', message = 'invalid_skipper_assignment_mode';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'booking_not_found';
  end if;
  if v_booking.status not in (
    'DRAFT'::public.booking_status,
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status,
    'CONFIRMED'::public.booking_status,
    'IN_PROGRESS'::public.booking_status
  ) then
    raise exception using errcode = '22023', message = 'booking_navigation_not_editable';
  end if;

  select coalesce(b.license_required, false)
  into v_license_required
  from public.boats b
  where b.id = v_booking.boat_id
    and b.operator_id = p_operator_id
  for key share;

  if not found then
    raise exception using errcode = '22023', message = 'boat_not_found';
  end if;

  if v_license_required and p_customer_has_required_license is null then
    raise exception using errcode = '22023', message = 'customer_license_answer_required';
  end if;
  if v_license_required
     and p_customer_has_required_license = false
     and v_mode not in ('EXISTING', 'NEW') then
    raise exception using errcode = '22023', message = 'skipper_required_without_customer_license';
  end if;

  insert into public.booking_navigation_requirements (
    booking_id,
    operator_id,
    boat_license_required_snapshot,
    customer_has_required_license,
    recorded_by
  ) values (
    p_booking_id,
    p_operator_id,
    v_license_required,
    case when v_license_required then p_customer_has_required_license else null end,
    v_actor_id
  )
  on conflict (booking_id) do update
  set
    operator_id = excluded.operator_id,
    boat_license_required_snapshot = excluded.boat_license_required_snapshot,
    customer_has_required_license = excluded.customer_has_required_license,
    recorded_by = excluded.recorded_by;

  insert into public.audit_logs (
    actor_type,
    actor_user_id,
    operator_id,
    booking_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    'OPERATOR'::public.audit_actor_type,
    v_actor_id,
    p_operator_id,
    p_booking_id,
    'BOOKING_NAVIGATION_REQUIREMENT_SET',
    'BOOKING',
    p_booking_id::text,
    pg_catalog.jsonb_build_object(
      'boat_license_required', v_license_required,
      'customer_has_required_license',
        case when v_license_required then p_customer_has_required_license else null end,
      'skipper_mode', v_mode
    )
  );
end;
$$;

revoke all on function private.record_booking_navigation_requirement(
  uuid, uuid, boolean, text
) from public, anon, authenticated;

create or replace function private.enforce_required_booking_skipper()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid := case when tg_op = 'DELETE' then old.booking_id else new.booking_id end;
  v_operator_id uuid := case when tg_op = 'DELETE' then old.operator_id else new.operator_id end;
  v_booking_status public.booking_status;
  v_requires_assigned_skipper boolean := false;
begin
  select b.status
  into v_booking_status
  from public.bookings b
  where b.id = v_booking_id
    and b.operator_id = v_operator_id;

  if not found or v_booking_status not in (
    'DRAFT'::public.booking_status,
    'PENDING_PAYMENT'::public.booking_status,
    'PAYMENT_PROCESSING'::public.booking_status,
    'CONFIRMED'::public.booking_status,
    'IN_PROGRESS'::public.booking_status
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select exists (
    select 1
    from public.booking_navigation_requirements r
    where r.booking_id = v_booking_id
      and r.operator_id = v_operator_id
      and r.boat_license_required_snapshot = true
      and r.customer_has_required_license = false
  ) into v_requires_assigned_skipper;

  if v_requires_assigned_skipper and (
    tg_op = 'DELETE'
    or new.assignment_state <> 'ASSIGNED'
    or new.skipper_id is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'skipper_required_without_customer_license';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_required_booking_skipper()
  from public, anon, authenticated;

create trigger booking_internal_skipper_required_guard
before insert or update or delete
on public.booking_internal_skipper_assignments
for each row
execute function private.enforce_required_booking_skipper();

create or replace function public.operator_set_booking_navigation_and_skipper(
  p_operator_id uuid,
  p_booking_id uuid,
  p_customer_has_required_license boolean,
  p_mode text,
  p_skipper_id uuid default null,
  p_new_skipper_name text default null,
  p_new_skipper_phone text default null,
  p_new_skipper_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
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
    raise exception using errcode = '42501', message = 'booking_navigation_not_allowed';
  end if;

  perform private.record_booking_navigation_requirement(
    p_operator_id,
    p_booking_id,
    p_customer_has_required_license,
    p_mode
  );

  return private.apply_internal_skipper_assignment(
    p_operator_id,
    p_booking_id,
    p_mode,
    p_skipper_id,
    p_new_skipper_name,
    p_new_skipper_phone,
    p_new_skipper_notes
  );
end;
$$;

revoke all on function public.operator_set_booking_navigation_and_skipper(
  uuid, uuid, boolean, text, uuid, text, text, text
) from public, anon;
grant execute on function public.operator_set_booking_navigation_and_skipper(
  uuid, uuid, boolean, text, uuid, text, text, text
) to authenticated, service_role;

create or replace function public.operator_create_simple_calendar_booking_with_navigation(
  p_operator_id uuid,
  p_boat_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_total_cents integer,
  p_operator_note text,
  p_legal_offering_id uuid,
  p_customer_has_required_license boolean,
  p_skipper_mode text default 'NONE',
  p_skipper_id uuid default null,
  p_new_skipper_name text default null,
  p_new_skipper_phone text default null,
  p_new_skipper_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
begin
  v_booking_id := public.operator_create_simple_calendar_booking(
    p_operator_id,
    p_boat_id,
    p_starts_at,
    p_ends_at,
    p_passenger_count,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_total_cents,
    p_operator_note,
    p_legal_offering_id
  );

  perform private.record_booking_navigation_requirement(
    p_operator_id,
    v_booking_id,
    p_customer_has_required_license,
    p_skipper_mode
  );
  perform private.apply_internal_skipper_assignment(
    p_operator_id,
    v_booking_id,
    p_skipper_mode,
    p_skipper_id,
    p_new_skipper_name,
    p_new_skipper_phone,
    p_new_skipper_notes
  );
  return v_booking_id;
end;
$$;

revoke all on function public.operator_create_simple_calendar_booking_with_navigation(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, boolean, text, uuid, text, text, text
) from public, anon;
grant execute on function public.operator_create_simple_calendar_booking_with_navigation(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, boolean, text, uuid, text, text, text
) to authenticated, service_role;

create or replace function public.operator_create_calendar_booking_with_navigation(
  p_operator_id uuid,
  p_boat_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_total_cents integer,
  p_operator_note text,
  p_operator_customer_id uuid,
  p_legal_offering_id uuid,
  p_customer_has_required_license boolean,
  p_skipper_mode text default 'NONE',
  p_skipper_id uuid default null,
  p_new_skipper_name text default null,
  p_new_skipper_phone text default null,
  p_new_skipper_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
begin
  v_booking_id := public.operator_create_calendar_booking(
    p_operator_id,
    p_boat_id,
    p_starts_at,
    p_ends_at,
    p_passenger_count,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_total_cents,
    p_operator_note,
    p_operator_customer_id,
    p_legal_offering_id
  );

  perform private.record_booking_navigation_requirement(
    p_operator_id,
    v_booking_id,
    p_customer_has_required_license,
    p_skipper_mode
  );
  perform private.apply_internal_skipper_assignment(
    p_operator_id,
    v_booking_id,
    p_skipper_mode,
    p_skipper_id,
    p_new_skipper_name,
    p_new_skipper_phone,
    p_new_skipper_notes
  );
  return v_booking_id;
end;
$$;

revoke all on function public.operator_create_calendar_booking_with_navigation(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, uuid, boolean, text, uuid, text, text, text
) from public, anon;
grant execute on function public.operator_create_calendar_booking_with_navigation(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, uuid, boolean, text, uuid, text, text, text
) to authenticated, service_role;

create or replace function public.operator_reschedule_manual_booking_with_navigation(
  p_operator_id uuid,
  p_booking_id uuid,
  p_boat_id uuid,
  p_legal_offering_id uuid,
  p_pickup_location_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_total_cents integer,
  p_customer_has_required_license boolean,
  p_skipper_mode text,
  p_skipper_id uuid,
  p_new_skipper_name text,
  p_new_skipper_phone text,
  p_new_skipper_notes text,
  p_operator_note text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_booking_id uuid;
begin
  v_new_booking_id := public.operator_reschedule_manual_booking(
    p_operator_id,
    p_booking_id,
    p_boat_id,
    p_legal_offering_id,
    p_pickup_location_id,
    p_starts_at,
    p_ends_at,
    p_passenger_count,
    p_total_cents,
    p_operator_note,
    p_reason
  );

  perform private.record_booking_navigation_requirement(
    p_operator_id,
    v_new_booking_id,
    p_customer_has_required_license,
    p_skipper_mode
  );
  perform private.apply_internal_skipper_assignment(
    p_operator_id,
    v_new_booking_id,
    p_skipper_mode,
    p_skipper_id,
    p_new_skipper_name,
    p_new_skipper_phone,
    p_new_skipper_notes
  );
  return v_new_booking_id;
end;
$$;

revoke all on function public.operator_reschedule_manual_booking_with_navigation(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer,
  integer, boolean, text, uuid, text, text, text, text, text
) from public, anon;
grant execute on function public.operator_reschedule_manual_booking_with_navigation(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, integer,
  integer, boolean, text, uuid, text, text, text, text, text
) to authenticated, service_role;

comment on table public.booking_navigation_requirements is
  'Operational licence answer captured for a booking. If the boat requires a licence and the customer has none, an assigned internal skipper is mandatory.';

commit;
