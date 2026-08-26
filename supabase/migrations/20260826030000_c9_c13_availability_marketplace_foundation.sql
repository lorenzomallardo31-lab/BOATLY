-- ============================================================
-- BOATLY
-- C9-C13: Availability, Pricing, Publication & Marketplace
-- ============================================================
--
-- This migration closes the operator-side prerequisites needed
-- by the public marketplace while keeping raw operational data
-- private and all mutations behind trusted RPC workflows.
-- ============================================================

begin;


-- ============================================================
-- DESTINATION SEED — INITIAL CAMPANIA CLUSTER
-- ============================================================

insert into public.destinations (
  name,
  slug,
  country_code,
  administrative_area,
  center_point,
  search_radius_meters,
  is_active,
  sort_order
)
values
  (
    'Napoli',
    'napoli',
    'IT',
    'Campania',
    extensions.st_setsrid(
      extensions.st_makepoint(14.2681, 40.8518),
      4326
    )::extensions.geography,
    35000,
    true,
    10
  ),
  (
    'Capri',
    'capri',
    'IT',
    'Campania',
    extensions.st_setsrid(
      extensions.st_makepoint(14.2222, 40.5507),
      4326
    )::extensions.geography,
    15000,
    true,
    20
  ),
  (
    'Ischia',
    'ischia',
    'IT',
    'Campania',
    extensions.st_setsrid(
      extensions.st_makepoint(13.9029, 40.7270),
      4326
    )::extensions.geography,
    20000,
    true,
    30
  ),
  (
    'Procida',
    'procida',
    'IT',
    'Campania',
    extensions.st_setsrid(
      extensions.st_makepoint(14.0260, 40.7652),
      4326
    )::extensions.geography,
    10000,
    true,
    40
  ),
  (
    'Sorrento',
    'sorrento',
    'IT',
    'Campania',
    extensions.st_setsrid(
      extensions.st_makepoint(14.3758, 40.6263),
      4326
    )::extensions.geography,
    20000,
    true,
    50
  ),
  (
    'Amalfi',
    'amalfi',
    'IT',
    'Campania',
    extensions.st_setsrid(
      extensions.st_makepoint(14.6027, 40.6340),
      4326
    )::extensions.geography,
    20000,
    true,
    60
  )
on conflict (slug)
do update
set
  name = excluded.name,
  country_code = excluded.country_code,
  administrative_area = excluded.administrative_area,
  center_point = excluded.center_point,
  search_radius_meters = excluded.search_radius_meters,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;


-- ============================================================
-- GLOBAL PUBLIC BOAT SLUG
-- ============================================================
-- Public routes use /barche/[boatSlug], therefore marketplace
-- slugs must be globally unique rather than unique only inside
-- one operator workspace.
-- ============================================================

create unique index if not exists
  boats_public_slug_unique_idx
on public.boats (
  lower(slug)
)
where slug is not null;


create or replace function private.ensure_boat_public_slug(
  p_boat_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_existing_slug text;
  v_base text;
  v_candidate text;
begin
  select
    b.name,
    b.slug
  into
    v_name,
    v_existing_slug
  from public.boats b
  where b.id = p_boat_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;

  if v_existing_slug is not null then
    return v_existing_slug;
  end if;

  v_base := lower(
    regexp_replace(
      regexp_replace(
        pg_catalog.translate(
          v_name,
          'àáâäãåèéêëìíîïòóôöõùúûüýÿñçÀÁÂÄÃÅÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÝÑÇ',
          'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYNC'
        ),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      ),
      '(^-+|-+$)',
      '',
      'g'
    )
  );

  if v_base = '' then
    v_base := 'barca';
  end if;

  v_candidate := v_base;

  if exists (
    select 1
    from public.boats other_boat
    where other_boat.id <> p_boat_id
      and lower(other_boat.slug) = lower(v_candidate)
  ) then
    v_candidate :=
      v_base || '-' || left(p_boat_id::text, 8);
  end if;

  update public.boats
  set slug = v_candidate
  where id = p_boat_id;

  return v_candidate;
end;
$$;

revoke execute
on function private.ensure_boat_public_slug(uuid)
from public, anon, authenticated;


-- ============================================================
-- TRUSTED AVAILABILITY HELPERS
-- ============================================================

create or replace function private.boat_slot_within_availability(
  p_boat_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_starts_at is not null
    and p_ends_at is not null
    and p_ends_at > p_starts_at
    and exists (
      select 1
      from public.boat_availability_rules ar
      where ar.boat_id = p_boat_id
        and ar.is_active = true
        and extract(
          isodow from (
            p_starts_at at time zone ar.timezone
          )
        )::smallint = ar.weekday
        and (
          p_starts_at at time zone ar.timezone
        )::date = (
          p_ends_at at time zone ar.timezone
        )::date
        and (
          p_starts_at at time zone ar.timezone
        )::time >= ar.available_from
        and (
          p_ends_at at time zone ar.timezone
        )::time <= ar.available_to
        and (
          ar.valid_from is null
          or (
            p_starts_at at time zone ar.timezone
          )::date >= ar.valid_from
        )
        and (
          ar.valid_to is null
          or (
            p_starts_at at time zone ar.timezone
          )::date <= ar.valid_to
        )
    );
$$;


create or replace function private.boat_slot_is_free(
  p_boat_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ignore_occupancy_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_starts_at is not null
    and p_ends_at is not null
    and p_ends_at > p_starts_at
    and not exists (
      select 1
      from public.boat_occupancies bo
      where bo.boat_id = p_boat_id
        and bo.is_active = true
        and (
          p_ignore_occupancy_id is null
          or bo.id <> p_ignore_occupancy_id
        )
        and (
          bo.occupancy_type <> 'HOLD'::public.boat_occupancy_type
          or bo.hold_expires_at > pg_catalog.now()
        )
        and bo.occupancy_range && tstzrange(
          p_starts_at,
          p_ends_at,
          '[)'
        )
    );
$$;


create or replace function private.release_expired_boat_holds(
  p_boat_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.boat_occupancies
  set
    is_active = false,
    released_at = pg_catalog.now(),
    release_reason = 'HOLD_EXPIRED'
  where occupancy_type = 'HOLD'::public.boat_occupancy_type
    and is_active = true
    and hold_expires_at <= pg_catalog.now()
    and (
      p_boat_id is null
      or boat_id = p_boat_id
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


revoke execute
on function private.boat_slot_within_availability(uuid,timestamptz,timestamptz)
from public, anon, authenticated;

revoke execute
on function private.boat_slot_is_free(uuid,timestamptz,timestamptz,uuid)
from public, anon, authenticated;

revoke execute
on function private.release_expired_boat_holds(uuid)
from public, anon, authenticated;


-- ============================================================
-- AVAILABILITY READ
-- ============================================================

create or replace function public.get_boat_availability_rules(
  p_operator_id uuid,
  p_boat_id uuid
)
returns table (
  id uuid,
  weekday smallint,
  available_from time,
  available_to time,
  timezone text,
  valid_from date,
  valid_to date,
  is_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not (
    private.is_operator_member(p_operator_id)
    or private.is_platform_user()
  ) then
    raise exception using
      errcode = '42501',
      message = 'availability_read_not_allowed';
  end if;

  if not exists (
    select 1
    from public.boats b
    where b.id = p_boat_id
      and b.operator_id = p_operator_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;

  return query
  select
    ar.id,
    ar.weekday,
    ar.available_from,
    ar.available_to,
    ar.timezone,
    ar.valid_from,
    ar.valid_to,
    ar.is_active
  from public.boat_availability_rules ar
  where ar.operator_id = p_operator_id
    and ar.boat_id = p_boat_id
  order by
    ar.weekday,
    ar.available_from,
    ar.id;
end;
$$;


-- ============================================================
-- ATOMIC WEEKLY AVAILABILITY SAVE
-- ============================================================

create or replace function public.save_boat_weekly_availability(
  p_operator_id uuid,
  p_boat_id uuid,
  p_rules jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_operator_status public.operator_status;
  v_boat_status public.boat_status;
  v_saved integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in (
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'availability_save_not_allowed';
  end if;

  select
    o.status,
    b.status
  into
    v_operator_status,
    v_boat_status
  from public.boats b
  join public.operators o
    on o.id = b.operator_id
  where b.id = p_boat_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;

  if v_operator_status not in (
    'DRAFT'::public.operator_status,
    'PENDING_VERIFICATION'::public.operator_status,
    'ACTIVE'::public.operator_status
  ) then
    raise exception using
      errcode = '22023',
      message = 'operator_not_manageable';
  end if;

  if v_boat_status = 'ARCHIVED'::public.boat_status then
    raise exception using
      errcode = '22023',
      message = 'boat_archived';
  end if;

  if p_rules is null or jsonb_typeof(p_rules) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'invalid_availability_payload';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rules) item
    cross join lateral jsonb_object_keys(item) payload_key
    where payload_key not in (
      'weekday',
      'available_from',
      'available_to',
      'timezone',
      'valid_from',
      'valid_to'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'unsupported_availability_field';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rules) as r(
      weekday smallint,
      available_from time,
      available_to time,
      timezone text,
      valid_from date,
      valid_to date
    )
    where r.weekday not between 1 and 7
      or r.available_from is null
      or r.available_to is null
      or r.available_to <= r.available_from
      or coalesce(pg_catalog.btrim(r.timezone), '') = ''
      or (
        r.valid_from is not null
        and r.valid_to is not null
        and r.valid_to < r.valid_from
      )
      or not exists (
        select 1
        from pg_timezone_names tz
        where tz.name = r.timezone
      )
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_availability_rule';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(
      p_boat_id::text || ':availability-rules'
    )
  );

  delete from public.boat_availability_rules
  where operator_id = p_operator_id
    and boat_id = p_boat_id;

  insert into public.boat_availability_rules (
    operator_id,
    boat_id,
    weekday,
    available_from,
    available_to,
    timezone,
    valid_from,
    valid_to,
    is_active
  )
  select
    p_operator_id,
    p_boat_id,
    r.weekday,
    r.available_from,
    r.available_to,
    r.timezone,
    r.valid_from,
    r.valid_to,
    true
  from jsonb_to_recordset(p_rules) as r(
    weekday smallint,
    available_from time,
    available_to time,
    timezone text,
    valid_from date,
    valid_to date
  );

  get diagnostics v_saved = row_count;
  return v_saved;
end;
$$;


-- ============================================================
-- OPERATOR CALENDAR READ
-- ============================================================

create or replace function public.get_boat_calendar_occupancies(
  p_operator_id uuid,
  p_boat_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  id uuid,
  occupancy_type public.boat_occupancy_type,
  starts_at timestamptz,
  ends_at timestamptz,
  hold_expires_at timestamptz,
  title text,
  notes text,
  is_active boolean,
  released_at timestamptz,
  release_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not (
    private.is_operator_member(p_operator_id)
    or private.is_platform_user()
  ) then
    raise exception using
      errcode = '42501',
      message = 'calendar_read_not_allowed';
  end if;

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception using
      errcode = '22023',
      message = 'invalid_calendar_window';
  end if;

  if not exists (
    select 1
    from public.boats b
    where b.id = p_boat_id
      and b.operator_id = p_operator_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;

  return query
  select
    bo.id,
    bo.occupancy_type,
    bo.starts_at,
    bo.ends_at,
    bo.hold_expires_at,
    bo.title,
    bo.notes,
    bo.is_active,
    bo.released_at,
    bo.release_reason
  from public.boat_occupancies bo
  where bo.operator_id = p_operator_id
    and bo.boat_id = p_boat_id
    and bo.occupancy_range && tstzrange(
      p_from,
      p_to,
      '[)'
    )
  order by
    bo.starts_at,
    bo.id;
end;
$$;


-- ============================================================
-- OPERATOR BLOCK CREATION / RELEASE
-- ============================================================

create or replace function public.create_operator_boat_occupancy(
  p_operator_id uuid,
  p_boat_id uuid,
  p_occupancy_type public.boat_occupancy_type,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_title text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_operator_status public.operator_status;
  v_boat_status public.boat_status;
  v_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in (
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'occupancy_create_not_allowed';
  end if;

  if p_occupancy_type not in (
    'MAINTENANCE'::public.boat_occupancy_type,
    'TRANSFER'::public.boat_occupancy_type,
    'PRIVATE_USE'::public.boat_occupancy_type,
    'OPERATOR_BLOCK'::public.boat_occupancy_type,
    'OTHER'::public.boat_occupancy_type
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_operator_occupancy_type';
  end if;

  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception using
      errcode = '22023',
      message = 'invalid_occupancy_window';
  end if;

  select
    o.status,
    b.status
  into
    v_operator_status,
    v_boat_status
  from public.boats b
  join public.operators o
    on o.id = b.operator_id
  where b.id = p_boat_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;

  if v_operator_status not in (
    'DRAFT'::public.operator_status,
    'PENDING_VERIFICATION'::public.operator_status,
    'ACTIVE'::public.operator_status
  ) or v_boat_status = 'ARCHIVED'::public.boat_status then
    raise exception using
      errcode = '22023',
      message = 'resource_not_manageable';
  end if;

  perform private.release_expired_boat_holds(p_boat_id);

  begin
    insert into public.boat_occupancies (
      operator_id,
      boat_id,
      occupancy_type,
      starts_at,
      ends_at,
      title,
      notes,
      is_active,
      created_by
    )
    values (
      p_operator_id,
      p_boat_id,
      p_occupancy_type,
      p_starts_at,
      p_ends_at,
      nullif(pg_catalog.btrim(coalesce(p_title, '')), ''),
      nullif(pg_catalog.btrim(coalesce(p_notes, '')), ''),
      true,
      v_user_id
    )
    returning id into v_id;
  exception
    when exclusion_violation then
      raise exception using
        errcode = '23P01',
        message = 'boat_time_conflict';
  end;

  return v_id;
end;
$$;


create or replace function public.release_operator_boat_occupancy(
  p_operator_id uuid,
  p_boat_id uuid,
  p_occupancy_id uuid,
  p_reason text default 'RELEASED_BY_OPERATOR'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_type public.boat_occupancy_type;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in (
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'occupancy_release_not_allowed';
  end if;

  select bo.occupancy_type
  into v_type
  from public.boat_occupancies bo
  where bo.id = p_occupancy_id
    and bo.operator_id = p_operator_id
    and bo.boat_id = p_boat_id
    and bo.is_active = true
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'active_occupancy_not_found';
  end if;

  if v_type in (
    'BOOKING'::public.boat_occupancy_type,
    'MANUAL_BOOKING'::public.boat_occupancy_type,
    'HOLD'::public.boat_occupancy_type
  ) then
    raise exception using
      errcode = '42501',
      message = 'system_occupancy_cannot_be_released_here';
  end if;

  update public.boat_occupancies
  set
    is_active = false,
    released_at = pg_catalog.now(),
    released_by = v_user_id,
    release_reason = coalesce(
      nullif(pg_catalog.btrim(p_reason), ''),
      'RELEASED_BY_OPERATOR'
    )
  where id = p_occupancy_id;
end;
$$;


-- ============================================================
-- DEFAULT RATE PLAN
-- ============================================================

create unique index if not exists
  boat_rate_plans_one_active_default_idx
on public.boat_rate_plans (boat_id)
where is_default = true
  and is_active = true;


create or replace function public.save_boat_default_rate_plan(
  p_operator_id uuid,
  p_boat_id uuid,
  p_legal_offering_id uuid,
  p_name text,
  p_base_duration_minutes integer,
  p_base_price_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_operator_status public.operator_status;
  v_boat_status public.boat_status;
  v_plan_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in (
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'rate_plan_save_not_allowed';
  end if;

  select
    o.status,
    b.status
  into
    v_operator_status,
    v_boat_status
  from public.boats b
  join public.operators o
    on o.id = b.operator_id
  where b.id = p_boat_id
    and b.operator_id = p_operator_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;

  if v_operator_status not in (
    'DRAFT'::public.operator_status,
    'PENDING_VERIFICATION'::public.operator_status,
    'ACTIVE'::public.operator_status
  ) or v_boat_status = 'ARCHIVED'::public.boat_status then
    raise exception using
      errcode = '22023',
      message = 'resource_not_manageable';
  end if;

  if not exists (
    select 1
    from public.boat_legal_offerings blo
    where blo.id = p_legal_offering_id
      and blo.boat_id = p_boat_id
      and blo.is_active = true
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_legal_offering';
  end if;

  if coalesce(pg_catalog.btrim(p_name), '') = ''
    or p_base_duration_minutes <= 0
    or p_base_price_cents < 0
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_rate_plan';
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtext(
      p_boat_id::text || ':default-rate-plan'
    )
  );

  select rp.id
  into v_plan_id
  from public.boat_rate_plans rp
  where rp.boat_id = p_boat_id
    and rp.operator_id = p_operator_id
    and rp.is_default = true
    and rp.is_active = true
  order by rp.created_at
  limit 1
  for update;

  if v_plan_id is null then
    insert into public.boat_rate_plans (
      operator_id,
      boat_id,
      legal_offering_id,
      name,
      code,
      duration_mode,
      base_duration_minutes,
      base_price_cents,
      priority,
      is_default,
      is_active
    )
    values (
      p_operator_id,
      p_boat_id,
      p_legal_offering_id,
      pg_catalog.btrim(p_name),
      'DEFAULT',
      'FIXED'::public.rate_plan_duration_mode,
      p_base_duration_minutes,
      p_base_price_cents,
      0,
      true,
      true
    )
    returning id into v_plan_id;
  else
    update public.boat_rate_plans
    set
      legal_offering_id = p_legal_offering_id,
      name = pg_catalog.btrim(p_name),
      duration_mode = 'FIXED'::public.rate_plan_duration_mode,
      base_duration_minutes = p_base_duration_minutes,
      base_price_cents = p_base_price_cents,
      duration_step_minutes = null,
      additional_step_price_cents = null,
      max_duration_minutes = null,
      priority = 0,
      is_default = true,
      is_active = true
    where id = v_plan_id;
  end if;

  return v_plan_id;
end;
$$;


-- ============================================================
-- PUBLICATION SUBMISSION
-- ============================================================

create or replace function public.submit_boat_for_publication(
  p_operator_id uuid,
  p_boat_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_ready boolean;
  v_review_id uuid;
  v_slug text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.operator_members om
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.status = 'ACTIVE'::public.operator_member_status
      and om.role in (
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'publication_submit_not_allowed';
  end if;

  if not exists (
    select 1
    from public.boats b
    where b.id = p_boat_id
      and b.operator_id = p_operator_id
      and b.status = 'ACTIVE'::public.boat_status
  ) then
    raise exception using
      errcode = '22023',
      message = 'boat_must_be_active';
  end if;

  select r.ready_for_activation
  into v_ready
  from private.boat_fleet_readiness(p_boat_id) r;

  if coalesce(v_ready, false) = false then
    raise exception using
      errcode = '22023',
      message = 'boat_not_ready';
  end if;

  if not exists (
    select 1
    from public.boat_availability_rules ar
    where ar.boat_id = p_boat_id
      and ar.is_active = true
  ) then
    raise exception using
      errcode = '22023',
      message = 'availability_required';
  end if;

  if not exists (
    select 1
    from public.boat_rate_plans rp
    where rp.boat_id = p_boat_id
      and rp.is_active = true
  ) then
    raise exception using
      errcode = '22023',
      message = 'rate_plan_required';
  end if;

  select br.id
  into v_review_id
  from public.boat_publication_reviews br
  where br.boat_id = p_boat_id
    and br.status in (
      'PENDING'::public.verification_review_status,
      'IN_REVIEW'::public.verification_review_status,
      'NEEDS_CHANGES'::public.verification_review_status
    )
  order by br.submitted_at desc
  limit 1;

  if v_review_id is not null then
    return v_review_id;
  end if;

  v_slug := private.ensure_boat_public_slug(p_boat_id);

  insert into public.boat_publication_reviews (
    operator_id,
    boat_id,
    status,
    submission_snapshot,
    submitted_by,
    submitted_at
  )
  values (
    p_operator_id,
    p_boat_id,
    'PENDING'::public.verification_review_status,
    jsonb_build_object(
      'version', 1,
      'boat_slug', v_slug,
      'submitted_at', pg_catalog.now(),
      'readiness', (
        select to_jsonb(r)
        from private.boat_fleet_readiness(p_boat_id) r
      ),
      'active_availability_rules', (
        select count(*)
        from public.boat_availability_rules ar
        where ar.boat_id = p_boat_id
          and ar.is_active = true
      ),
      'active_rate_plans', (
        select count(*)
        from public.boat_rate_plans rp
        where rp.boat_id = p_boat_id
          and rp.is_active = true
      )
    ),
    v_user_id,
    pg_catalog.now()
  )
  returning id into v_review_id;

  return v_review_id;
end;
$$;


create or replace function public.get_boat_publication_status(
  p_operator_id uuid,
  p_boat_id uuid
)
returns table (
  review_id uuid,
  status public.verification_review_status,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decision_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if not (
    private.is_operator_member(p_operator_id)
    or private.is_platform_user()
  ) then
    raise exception using
      errcode = '42501',
      message = 'publication_status_read_not_allowed';
  end if;

  return query
  select
    br.id,
    br.status,
    br.submitted_at,
    br.reviewed_at,
    br.decision_note
  from public.boat_publication_reviews br
  where br.operator_id = p_operator_id
    and br.boat_id = p_boat_id
  order by
    br.submitted_at desc,
    br.created_at desc,
    br.id desc
  limit 1;
end;
$$;


-- ============================================================
-- MARKETPLACE PUBLIC IMAGE ACCESS FOR ELIGIBLE BOATS
-- ============================================================

create or replace function private.is_public_marketplace_boat_image_path(
  p_object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[];
  v_boat_id uuid;
begin
  if p_object_name is null then
    return false;
  end if;

  v_parts := pg_catalog.string_to_array(p_object_name, '/');

  if pg_catalog.array_length(v_parts, 1) <> 3 then
    return false;
  end if;

  if v_parts[2] !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return false;
  end if;

  v_boat_id := v_parts[2]::uuid;

  return private.is_boat_marketplace_eligible(v_boat_id)
    and exists (
      select 1
      from public.boat_images bi
      where bi.boat_id = v_boat_id
        and bi.storage_path = p_object_name
    );
end;
$$;

revoke execute
on function private.is_public_marketplace_boat_image_path(text)
from public;

grant execute
on function private.is_public_marketplace_boat_image_path(text)
to anon, authenticated;


drop policy if exists boat_images_storage_select
on storage.objects;

drop policy if exists boat_images_storage_select_public
on storage.objects;

drop policy if exists boat_images_storage_select_internal
on storage.objects;

create policy boat_images_storage_select_public
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'boat-images'
  and private.is_public_marketplace_boat_image_path(name)
);

create policy boat_images_storage_select_internal
on storage.objects
for select
to authenticated
using (
  bucket_id = 'boat-images'
  and private.can_access_boat_image_storage(name, false)
);


-- ============================================================
-- CORRECT / EXTEND PUBLIC SAFE PROJECTIONS
-- ============================================================

create or replace function public.marketplace_operator_locations()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', ol.id,
      'operator_id', ol.operator_id,
      'name', ol.name,
      'address_line_1', ol.address_line_1,
      'address_line_2', ol.address_line_2,
      'city', ol.city,
      'administrative_area', ol.administrative_area,
      'postal_code', ol.postal_code,
      'country_code', ol.country_code,
      'timezone', ol.timezone,
      'pickup_instructions', ol.pickup_instructions,
      'latitude',
        case
          when ol.geo_point is null then null
          else extensions.st_y(
            ol.geo_point::extensions.geometry
          )
        end,
      'longitude',
        case
          when ol.geo_point is null then null
          else extensions.st_x(
            ol.geo_point::extensions.geometry
          )
        end
    )
  )
  from public.operator_locations ol
  where private.is_operator_marketplace_eligible(ol.operator_id)
    and ol.is_public = true
    and ol.is_active = true;
$$;


create or replace function public.marketplace_boats()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', b.id,
      'operator_id', b.operator_id,
      'primary_location_id', b.primary_location_id,
      'boat_type_id', b.boat_type_id,
      'name', b.name,
      'slug', b.slug,
      'short_description', b.short_description,
      'description', b.description,
      'manufacturer', b.manufacturer,
      'model', b.model,
      'manufacture_year', b.manufacture_year,
      'length_m',
        case
          when b.length_cm is null then null
          else round(b.length_cm::numeric / 100, 2)
        end,
      'beam_m',
        case
          when b.beam_cm is null then null
          else round(b.beam_cm::numeric / 100, 2)
        end,
      'draft_m',
        case
          when b.draft_cm is null then null
          else round(b.draft_cm::numeric / 100, 2)
        end,
      'technical_passenger_capacity', b.technical_passenger_capacity,
      'operator_passenger_limit', b.operator_passenger_limit,
      'cabins', b.cabins,
      'berths', b.berths,
      'bathrooms', b.bathrooms,
      'engine_count', b.engine_count,
      'engine_manufacturer', b.engine_manufacturer,
      'engine_model', b.engine_model,
      'engine_installation', b.engine_installation,
      'engine_fuel_type', b.engine_fuel_type,
      'engine_power_kw', b.engine_power_kw,
      'engine_power_hp', b.engine_power_hp,
      'engine_displacement_cc', b.engine_displacement_cc,
      'max_speed_knots', b.max_speed_knots,
      'license_required', b.license_required
    )
  )
  from public.boats b
  where private.is_boat_marketplace_eligible(b.id);
$$;


-- ============================================================
-- PUBLIC MARKETPLACE SEARCH
-- ============================================================

create or replace function public.marketplace_search_boats_v2(
  p_query text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_passengers integer default null,
  p_boat_type_id uuid default null,
  p_license_required boolean default null
)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id', b.id,
      'slug', b.slug,
      'name', b.name,
      'operator_id', b.operator_id,
      'operator_name', o.name,
      'boat_type_id', b.boat_type_id,
      'boat_type_name', bt.name,
      'location_id', ol.id,
      'location_name', ol.name,
      'city', ol.city,
      'administrative_area', ol.administrative_area,
      'latitude',
        case
          when ol.geo_point is null then null
          else extensions.st_y(
            ol.geo_point::extensions.geometry
          )
        end,
      'longitude',
        case
          when ol.geo_point is null then null
          else extensions.st_x(
            ol.geo_point::extensions.geometry
          )
        end,
      'manufacturer', b.manufacturer,
      'model', b.model,
      'manufacture_year', b.manufacture_year,
      'length_m',
        case
          when b.length_cm is null then null
          else round(b.length_cm::numeric / 100, 2)
        end,
      'passenger_limit', b.operator_passenger_limit,
      'license_required', b.license_required,
      'short_description', b.short_description,
      'cover_storage_path', cover.storage_path,
      'from_price_cents', rate_plan.base_price_cents,
      'base_duration_minutes', rate_plan.base_duration_minutes,
      'rating', reviews.average_rating,
      'review_count', reviews.review_count,
      'available',
        case
          when p_starts_at is null and p_ends_at is null then true
          when p_starts_at is null or p_ends_at is null then false
          else
            private.boat_slot_within_availability(
              b.id,
              p_starts_at,
              p_ends_at
            )
            and private.boat_slot_is_free(
              b.id,
              p_starts_at,
              p_ends_at,
              null
            )
        end
    )
  )
  from public.boats b
  join public.operators o
    on o.id = b.operator_id
  left join public.boat_types bt
    on bt.id = b.boat_type_id
  left join public.operator_locations ol
    on ol.id = b.primary_location_id
   and ol.operator_id = b.operator_id
  left join lateral (
    select bi.storage_path
    from public.boat_images bi
    where bi.boat_id = b.id
    order by
      bi.is_cover desc,
      bi.sort_order asc,
      bi.created_at asc
    limit 1
  ) cover on true
  join lateral (
    select
      rp.base_price_cents,
      rp.base_duration_minutes
    from public.boat_rate_plans rp
    where rp.boat_id = b.id
      and rp.is_active = true
      and (
        p_starts_at is null
        or rp.valid_from is null
        or p_starts_at::date >= rp.valid_from
      )
      and (
        p_starts_at is null
        or rp.valid_to is null
        or p_starts_at::date <= rp.valid_to
      )
    order by
      rp.is_default desc,
      rp.priority asc,
      rp.base_price_cents asc,
      rp.id asc
    limit 1
  ) rate_plan on true
  left join lateral (
    select
      round(avg(r.rating)::numeric, 1) as average_rating,
      count(*)::integer as review_count
    from public.reviews r
    where r.boat_id = b.id
      and r.moderation_status = 'PUBLISHED'::public.review_moderation_status
  ) reviews on true
  where private.is_boat_marketplace_eligible(b.id)
    and b.slug is not null
    and exists (
      select 1
      from public.boat_legal_offerings blo
      where blo.boat_id = b.id
        and blo.is_active = true
    )
    and (
      p_query is null
      or pg_catalog.btrim(p_query) = ''
      or b.name ilike '%' || pg_catalog.btrim(p_query) || '%'
      or coalesce(b.manufacturer, '') ilike '%' || pg_catalog.btrim(p_query) || '%'
      or coalesce(b.model, '') ilike '%' || pg_catalog.btrim(p_query) || '%'
      or coalesce(ol.name, '') ilike '%' || pg_catalog.btrim(p_query) || '%'
      or coalesce(ol.city, '') ilike '%' || pg_catalog.btrim(p_query) || '%'
      or coalesce(ol.administrative_area, '') ilike '%' || pg_catalog.btrim(p_query) || '%'
    )
    and (
      p_passengers is null
      or p_passengers <= b.operator_passenger_limit
    )
    and (
      p_boat_type_id is null
      or b.boat_type_id = p_boat_type_id
    )
    and (
      p_license_required is null
      or b.license_required = p_license_required
    )
    and (
      (p_starts_at is null and p_ends_at is null)
      or (
        p_starts_at is not null
        and p_ends_at is not null
        and private.boat_slot_within_availability(
          b.id,
          p_starts_at,
          p_ends_at
        )
        and private.boat_slot_is_free(
          b.id,
          p_starts_at,
          p_ends_at,
          null
        )
      )
    )
  order by
    rate_plan.base_price_cents asc,
    b.name asc;
$$;


create or replace function public.marketplace_check_boat_availability(
  p_boat_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_passengers integer default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boats b
    where b.id = p_boat_id
      and private.is_boat_marketplace_eligible(b.id)
      and (
        p_passengers is null
        or p_passengers <= b.operator_passenger_limit
      )
      and private.boat_slot_within_availability(
        b.id,
        p_starts_at,
        p_ends_at
      )
      and private.boat_slot_is_free(
        b.id,
        p_starts_at,
        p_ends_at,
        null
      )
  );
$$;


-- ============================================================
-- MUTATION SURFACE HARDENING
-- ============================================================

revoke insert, update, delete
on table public.boat_availability_rules
from public, anon, authenticated;

revoke insert, update, delete
on table public.boat_occupancies
from public, anon, authenticated;

revoke insert, update, delete
on table public.boat_rate_plans
from public, anon, authenticated;

revoke insert, update, delete
on table public.boat_pricing_rules
from public, anon, authenticated;


-- ============================================================
-- RPC PRIVILEGES
-- ============================================================

revoke execute
on function public.get_boat_availability_rules(uuid,uuid)
from public, anon;
grant execute
on function public.get_boat_availability_rules(uuid,uuid)
to authenticated;

revoke execute
on function public.save_boat_weekly_availability(uuid,uuid,jsonb)
from public, anon;
grant execute
on function public.save_boat_weekly_availability(uuid,uuid,jsonb)
to authenticated;

revoke execute
on function public.get_boat_calendar_occupancies(uuid,uuid,timestamptz,timestamptz)
from public, anon;
grant execute
on function public.get_boat_calendar_occupancies(uuid,uuid,timestamptz,timestamptz)
to authenticated;

revoke execute
on function public.create_operator_boat_occupancy(uuid,uuid,public.boat_occupancy_type,timestamptz,timestamptz,text,text)
from public, anon;
grant execute
on function public.create_operator_boat_occupancy(uuid,uuid,public.boat_occupancy_type,timestamptz,timestamptz,text,text)
to authenticated;

revoke execute
on function public.release_operator_boat_occupancy(uuid,uuid,uuid,text)
from public, anon;
grant execute
on function public.release_operator_boat_occupancy(uuid,uuid,uuid,text)
to authenticated;

revoke execute
on function public.save_boat_default_rate_plan(uuid,uuid,uuid,text,integer,integer)
from public, anon;
grant execute
on function public.save_boat_default_rate_plan(uuid,uuid,uuid,text,integer,integer)
to authenticated;

revoke execute
on function public.submit_boat_for_publication(uuid,uuid)
from public, anon;
grant execute
on function public.submit_boat_for_publication(uuid,uuid)
to authenticated;

revoke execute
on function public.get_boat_publication_status(uuid,uuid)
from public, anon;
grant execute
on function public.get_boat_publication_status(uuid,uuid)
to authenticated;

revoke execute
on function public.marketplace_search_boats_v2(text,timestamptz,timestamptz,integer,uuid,boolean)
from public;
grant execute
on function public.marketplace_search_boats_v2(text,timestamptz,timestamptz,integer,uuid,boolean)
to anon, authenticated;

revoke execute
on function public.marketplace_check_boat_availability(uuid,timestamptz,timestamptz,integer)
from public;
grant execute
on function public.marketplace_check_boat_availability(uuid,timestamptz,timestamptz,integer)
to anon, authenticated;

-- Reassert public projection access after replacement.
revoke execute
on function public.marketplace_boats()
from public;
grant execute
on function public.marketplace_boats()
to anon, authenticated;

revoke execute
on function public.marketplace_operator_locations()
from public;
grant execute
on function public.marketplace_operator_locations()
to anon, authenticated;


commit;
