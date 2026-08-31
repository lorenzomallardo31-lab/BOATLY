-- ============================================================
-- BOATLY OPS
-- Internal skippers without application accounts
-- ============================================================

begin;

create table public.operator_internal_skippers (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null
    references public.operators(id)
    on delete cascade,
  display_name text not null,
  phone text,
  notes text,
  is_active boolean not null default true,
  removed_at timestamptz,
  created_by uuid
    references auth.users(id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operator_internal_skippers_operator_id_id_key
    unique (operator_id, id),
  constraint operator_internal_skippers_name_valid
    check (
      display_name = pg_catalog.btrim(display_name)
      and pg_catalog.length(display_name) between 2 and 160
    ),
  constraint operator_internal_skippers_phone_valid
    check (
      phone is null
      or (
        phone = pg_catalog.btrim(phone)
        and pg_catalog.length(phone) between 3 and 40
      )
    ),
  constraint operator_internal_skippers_notes_valid
    check (
      notes is null
      or (
        notes = pg_catalog.btrim(notes)
        and pg_catalog.length(notes) between 1 and 2000
      )
    ),
  constraint operator_internal_skippers_removed_state
    check (removed_at is null or is_active = false)
);

create index operator_internal_skippers_operator_status_idx
  on public.operator_internal_skippers(operator_id, is_active, display_name)
  where removed_at is null;

create trigger operator_internal_skippers_set_updated_at
before update on public.operator_internal_skippers
for each row
execute function public.set_updated_at();

create table public.booking_internal_skipper_assignments (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  booking_id uuid not null unique,
  skipper_id uuid,
  assignment_state text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  skipper_name_snapshot text,
  skipper_phone_snapshot text,
  assigned_by uuid
    references auth.users(id)
    on delete set null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_internal_skipper_assignments_booking_fk
    foreign key (operator_id, booking_id)
    references public.bookings(operator_id, id)
    on delete cascade,
  constraint booking_internal_skipper_assignments_skipper_fk
    foreign key (operator_id, skipper_id)
    references public.operator_internal_skippers(operator_id, id)
    on delete restrict,
  constraint booking_internal_skipper_assignments_window
    check (ends_at > starts_at),
  constraint booking_internal_skipper_assignments_state
    check (assignment_state in ('UNASSIGNED', 'ASSIGNED', 'REMOVED')),
  constraint booking_internal_skipper_assignments_state_values
    check (
      (
        assignment_state = 'UNASSIGNED'
        and skipper_id is null
        and skipper_name_snapshot is null
        and skipper_phone_snapshot is null
        and removed_at is null
      )
      or (
        assignment_state = 'ASSIGNED'
        and skipper_id is not null
        and nullif(pg_catalog.btrim(skipper_name_snapshot), '') is not null
        and removed_at is null
      )
      or (
        assignment_state = 'REMOVED'
        and removed_at is not null
      )
    )
);

create index booking_internal_skipper_assignments_operator_idx
  on public.booking_internal_skipper_assignments(operator_id, starts_at);

create index booking_internal_skipper_assignments_skipper_idx
  on public.booking_internal_skipper_assignments(skipper_id, starts_at)
  where skipper_id is not null;

-- [start, end) allows two consecutive services while rejecting every
-- real overlap, including one minute. The database is the final arbiter,
-- so concurrent browser requests cannot double-assign a skipper.
alter table public.booking_internal_skipper_assignments
  add constraint booking_internal_skipper_no_active_overlap
  exclude using gist (
    operator_id with =,
    skipper_id with =,
    pg_catalog.tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (assignment_state = 'ASSIGNED' and skipper_id is not null);

create trigger booking_internal_skipper_assignments_set_updated_at
before update on public.booking_internal_skipper_assignments
for each row
execute function public.set_updated_at();

alter table public.operator_internal_skippers enable row level security;
alter table public.booking_internal_skipper_assignments enable row level security;

create policy operator_internal_skippers_select_workspace
on public.operator_internal_skippers
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

create policy booking_internal_skipper_assignments_select_workspace
on public.booking_internal_skipper_assignments
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

revoke all on table public.operator_internal_skippers
  from public, anon, authenticated;
revoke all on table public.booking_internal_skipper_assignments
  from public, anon, authenticated;
grant select on table public.operator_internal_skippers to authenticated;
grant select on table public.booking_internal_skipper_assignments to authenticated;

create or replace function private.boatly_validate_internal_skipper_phone(
  p_phone text
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
  v_key text;
begin
  if v_phone is null then
    return null;
  end if;

  v_key := private.boatly_normalize_phone(v_phone);
  if v_key is null or pg_catalog.length(v_key) not between 8 and 15 then
    raise exception using errcode = '22023', message = 'invalid_skipper_phone';
  end if;
  return v_phone;
end;
$$;

revoke all on function private.boatly_validate_internal_skipper_phone(text)
  from public, anon, authenticated;

create or replace function public.operator_manage_internal_skipper(
  p_operator_id uuid,
  p_skipper_id uuid,
  p_action text,
  p_display_name text default null,
  p_phone text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_action text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_action, '')));
  v_name text := nullif(pg_catalog.btrim(coalesce(p_display_name, '')), '');
  v_phone text;
  v_notes text := nullif(pg_catalog.btrim(coalesce(p_notes, '')), '');
  v_skipper public.operator_internal_skippers%rowtype;
begin
  if v_actor_id is null then
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
    raise exception using errcode = '42501', message = 'skipper_management_not_allowed';
  end if;
  if v_action not in ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'REMOVE') then
    raise exception using errcode = '22023', message = 'invalid_skipper_action';
  end if;

  if v_action in ('CREATE', 'UPDATE') then
    if v_name is null or pg_catalog.length(v_name) not between 2 and 160 then
      raise exception using errcode = '22023', message = 'skipper_name_required';
    end if;
    if v_notes is not null and pg_catalog.length(v_notes) > 2000 then
      raise exception using errcode = '22023', message = 'skipper_notes_too_long';
    end if;
    v_phone := private.boatly_validate_internal_skipper_phone(p_phone);
  end if;

  if v_action = 'CREATE' then
    insert into public.operator_internal_skippers (
      operator_id, display_name, phone, notes, created_by
    ) values (
      p_operator_id, v_name, v_phone, v_notes, v_actor_id
    ) returning * into v_skipper;
  else
    select * into v_skipper
    from public.operator_internal_skippers s
    where s.id = p_skipper_id
      and s.operator_id = p_operator_id
    for update;

    if not found then
      raise exception using errcode = '22023', message = 'skipper_not_found';
    end if;

    if v_skipper.removed_at is not null then
      raise exception using errcode = '22023', message = 'skipper_already_removed';
    end if;

    if v_action = 'UPDATE' then
      update public.operator_internal_skippers
      set display_name = v_name, phone = v_phone, notes = v_notes
      where id = v_skipper.id
      returning * into v_skipper;
    elsif v_action = 'ACTIVATE' then
      update public.operator_internal_skippers
      set is_active = true
      where id = v_skipper.id
      returning * into v_skipper;
    elsif v_action = 'DEACTIVATE' then
      update public.operator_internal_skippers
      set is_active = false
      where id = v_skipper.id
      returning * into v_skipper;
    else
      update public.operator_internal_skippers
      set is_active = false, removed_at = pg_catalog.now()
      where id = v_skipper.id
      returning * into v_skipper;
    end if;
  end if;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, action,
    entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type,
    v_actor_id,
    p_operator_id,
    'INTERNAL_SKIPPER_' || v_action,
    'INTERNAL_SKIPPER',
    v_skipper.id::text,
    pg_catalog.jsonb_build_object(
      'display_name', v_skipper.display_name,
      'is_active', v_skipper.is_active
    )
  );

  return v_skipper.id;
end;
$$;

revoke all on function public.operator_manage_internal_skipper(
  uuid, uuid, text, text, text, text
) from public, anon;
grant execute on function public.operator_manage_internal_skipper(
  uuid, uuid, text, text, text, text
) to authenticated, service_role;

create or replace function private.apply_internal_skipper_assignment(
  p_operator_id uuid,
  p_booking_id uuid,
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
declare
  v_actor_id uuid := auth.uid();
  v_mode text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_mode, 'NONE')));
  v_booking public.bookings%rowtype;
  v_skipper public.operator_internal_skippers%rowtype;
  v_assignment_id uuid;
  v_name text := nullif(pg_catalog.btrim(coalesce(p_new_skipper_name, '')), '');
  v_phone text;
  v_notes text := nullif(pg_catalog.btrim(coalesce(p_new_skipper_notes, '')), '');
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
    raise exception using errcode = '22023', message = 'booking_skipper_not_editable';
  end if;

  if v_mode = 'NONE' then
    delete from public.booking_internal_skipper_assignments a
    where a.booking_id = p_booking_id
      and a.operator_id = p_operator_id;

    insert into public.audit_logs (
      actor_type, actor_user_id, operator_id, booking_id,
      action, entity_type, entity_id, metadata
    ) values (
      'OPERATOR'::public.audit_actor_type, v_actor_id, p_operator_id, p_booking_id,
      'BOOKING_INTERNAL_SKIPPER_CLEARED', 'BOOKING', p_booking_id::text,
      pg_catalog.jsonb_build_object('mode', 'NONE')
    );
    return null;
  end if;

  if v_mode = 'UNASSIGNED' then
    insert into public.booking_internal_skipper_assignments (
      operator_id, booking_id, skipper_id, assignment_state,
      starts_at, ends_at, skipper_name_snapshot,
      skipper_phone_snapshot, assigned_by, assigned_at, removed_at
    ) values (
      p_operator_id, p_booking_id, null, 'UNASSIGNED',
      v_booking.starts_at, v_booking.ends_at, null,
      null, v_actor_id, pg_catalog.now(), null
    )
    on conflict (booking_id) do update
    set
      operator_id = excluded.operator_id,
      skipper_id = null,
      assignment_state = 'UNASSIGNED',
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      skipper_name_snapshot = null,
      skipper_phone_snapshot = null,
      assigned_by = excluded.assigned_by,
      assigned_at = excluded.assigned_at,
      removed_at = null
    returning id into v_assignment_id;
  else
    if v_mode = 'NEW' then
      if v_name is null or pg_catalog.length(v_name) not between 2 and 160 then
        raise exception using errcode = '22023', message = 'skipper_name_required';
      end if;
      if v_notes is not null and pg_catalog.length(v_notes) > 2000 then
        raise exception using errcode = '22023', message = 'skipper_notes_too_long';
      end if;
      v_phone := private.boatly_validate_internal_skipper_phone(p_new_skipper_phone);
      insert into public.operator_internal_skippers (
        operator_id, display_name, phone, notes, created_by
      ) values (
        p_operator_id, v_name, v_phone, v_notes, v_actor_id
      ) returning * into v_skipper;
    else
      select * into v_skipper
      from public.operator_internal_skippers s
      where s.id = p_skipper_id
        and s.operator_id = p_operator_id
        and s.is_active = true
        and s.removed_at is null
      for update;

      if not found then
        raise exception using errcode = '22023', message = 'skipper_not_available';
      end if;
    end if;

    insert into public.booking_internal_skipper_assignments (
      operator_id, booking_id, skipper_id, assignment_state,
      starts_at, ends_at, skipper_name_snapshot,
      skipper_phone_snapshot, assigned_by, assigned_at, removed_at
    ) values (
      p_operator_id, p_booking_id, v_skipper.id, 'ASSIGNED',
      v_booking.starts_at, v_booking.ends_at, v_skipper.display_name,
      v_skipper.phone, v_actor_id, pg_catalog.now(), null
    )
    on conflict (booking_id) do update
    set
      operator_id = excluded.operator_id,
      skipper_id = excluded.skipper_id,
      assignment_state = 'ASSIGNED',
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      skipper_name_snapshot = excluded.skipper_name_snapshot,
      skipper_phone_snapshot = excluded.skipper_phone_snapshot,
      assigned_by = excluded.assigned_by,
      assigned_at = excluded.assigned_at,
      removed_at = null
    returning id into v_assignment_id;
  end if;

  insert into public.audit_logs (
    actor_type, actor_user_id, operator_id, booking_id,
    action, entity_type, entity_id, metadata
  ) values (
    'OPERATOR'::public.audit_actor_type,
    v_actor_id,
    p_operator_id,
    p_booking_id,
    case when v_mode = 'UNASSIGNED'
      then 'BOOKING_INTERNAL_SKIPPER_UNASSIGNED'
      else 'BOOKING_INTERNAL_SKIPPER_ASSIGNED'
    end,
    'BOOKING',
    p_booking_id::text,
    pg_catalog.jsonb_build_object(
      'mode', v_mode,
      'skipper_id', v_skipper.id,
      'assignment_id', v_assignment_id
    )
  );

  return v_assignment_id;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'skipper_booking_overlap';
end;
$$;

revoke all on function private.apply_internal_skipper_assignment(
  uuid, uuid, text, uuid, text, text, text
) from public, anon, authenticated;

create or replace function public.operator_set_booking_internal_skipper(
  p_operator_id uuid,
  p_booking_id uuid,
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
    raise exception using errcode = '42501', message = 'booking_skipper_not_allowed';
  end if;

  return private.apply_internal_skipper_assignment(
    p_operator_id, p_booking_id, p_mode, p_skipper_id,
    p_new_skipper_name, p_new_skipper_phone, p_new_skipper_notes
  );
end;
$$;

revoke all on function public.operator_set_booking_internal_skipper(
  uuid, uuid, text, uuid, text, text, text
) from public, anon;
grant execute on function public.operator_set_booking_internal_skipper(
  uuid, uuid, text, uuid, text, text, text
) to authenticated, service_role;

create or replace function public.operator_create_simple_calendar_booking_with_internal_skipper(
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
    p_operator_id, p_boat_id, p_starts_at, p_ends_at,
    p_passenger_count, p_customer_name, p_customer_email,
    p_customer_phone, p_total_cents, p_operator_note, p_legal_offering_id
  );

  perform private.apply_internal_skipper_assignment(
    p_operator_id, v_booking_id, p_skipper_mode, p_skipper_id,
    p_new_skipper_name, p_new_skipper_phone, p_new_skipper_notes
  );
  return v_booking_id;
end;
$$;

revoke all on function public.operator_create_simple_calendar_booking_with_internal_skipper(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, text, uuid, text, text, text
) from public, anon;
grant execute on function public.operator_create_simple_calendar_booking_with_internal_skipper(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, text, uuid, text, text, text
) to authenticated, service_role;

create or replace function public.operator_create_calendar_booking_with_internal_skipper(
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
    p_operator_id, p_boat_id, p_starts_at, p_ends_at,
    p_passenger_count, p_customer_name, p_customer_email,
    p_customer_phone, p_total_cents, p_operator_note,
    p_operator_customer_id, p_legal_offering_id
  );

  perform private.apply_internal_skipper_assignment(
    p_operator_id, v_booking_id, p_skipper_mode, p_skipper_id,
    p_new_skipper_name, p_new_skipper_phone, p_new_skipper_notes
  );
  return v_booking_id;
end;
$$;

revoke all on function public.operator_create_calendar_booking_with_internal_skipper(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, uuid, text, uuid, text, text, text
) from public, anon;
grant execute on function public.operator_create_calendar_booking_with_internal_skipper(
  uuid, uuid, timestamptz, timestamptz, integer, text, text, text,
  integer, text, uuid, uuid, text, uuid, text, text, text
) to authenticated, service_role;

create or replace function public.operator_reschedule_manual_booking_with_internal_skipper(
  p_operator_id uuid,
  p_booking_id uuid,
  p_boat_id uuid,
  p_legal_offering_id uuid,
  p_pickup_location_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passenger_count integer,
  p_total_cents integer,
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
  v_state text;
  v_skipper_id uuid;
  v_skipper_is_available boolean := false;
begin
  select a.assignment_state, a.skipper_id
  into v_state, v_skipper_id
  from public.booking_internal_skipper_assignments a
  where a.booking_id = p_booking_id
    and a.operator_id = p_operator_id
  for update;

  v_new_booking_id := public.operator_reschedule_manual_booking(
    p_operator_id, p_booking_id, p_boat_id, p_legal_offering_id,
    p_pickup_location_id, p_starts_at, p_ends_at, p_passenger_count,
    p_total_cents, p_operator_note, p_reason
  );

  if v_state = 'ASSIGNED' and v_skipper_id is not null then
    select exists (
      select 1
      from public.operator_internal_skippers s
      where s.id = v_skipper_id
        and s.operator_id = p_operator_id
        and s.is_active = true
        and s.removed_at is null
    ) into v_skipper_is_available;

    perform private.apply_internal_skipper_assignment(
      p_operator_id,
      v_new_booking_id,
      case when v_skipper_is_available then 'EXISTING' else 'UNASSIGNED' end,
      case when v_skipper_is_available then v_skipper_id else null end,
      null, null, null
    );
  elsif v_state = 'UNASSIGNED' then
    perform private.apply_internal_skipper_assignment(
      p_operator_id, v_new_booking_id, 'UNASSIGNED', null, null, null, null
    );
  end if;

  return v_new_booking_id;
end;
$$;

revoke all on function public.operator_reschedule_manual_booking_with_internal_skipper(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  integer, integer, text, text
) from public, anon;
grant execute on function public.operator_reschedule_manual_booking_with_internal_skipper(
  uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  integer, integer, text, text
) to authenticated, service_role;

create or replace function private.sync_internal_skipper_assignment_from_booking()
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
    update public.booking_internal_skipper_assignments
    set assignment_state = 'REMOVED', removed_at = coalesce(removed_at, pg_catalog.now())
    where booking_id = new.id
      and assignment_state <> 'REMOVED';
  elsif new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at then
    update public.booking_internal_skipper_assignments
    set starts_at = new.starts_at, ends_at = new.ends_at
    where booking_id = new.id
      and assignment_state <> 'REMOVED';
  end if;
  return new;
exception
  when exclusion_violation then
    raise exception using errcode = '23P01', message = 'skipper_booking_overlap';
end;
$$;

create trigger bookings_sync_internal_skipper_assignment
after update of status, starts_at, ends_at
on public.bookings
for each row
execute function private.sync_internal_skipper_assignment_from_booking();

comment on table public.operator_internal_skippers is
  'Operational skipper directory owned by a rental workspace. Entries have no login or application account.';
comment on table public.booking_internal_skipper_assignments is
  'Optional internal skipper assignment or explicit to-be-assigned marker for a booking, with atomic overlap protection.';

commit;
