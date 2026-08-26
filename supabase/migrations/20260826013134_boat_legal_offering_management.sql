-- ============================================================
-- BOATLY
-- Migration: Boat Legal Offering Management
-- ============================================================

begin;


-- ============================================================
-- ONE CONFIGURATION PER LEGAL TYPE / BOAT
-- ============================================================

create unique index if not exists
  boat_legal_offerings_boat_legal_type_unique_idx

on public.boat_legal_offerings (
  boat_id,
  legal_type
);


-- ============================================================
-- SAFE READ PROJECTION
-- ============================================================

create or replace function public.get_boat_legal_offerings(
  p_operator_id uuid,
  p_boat_id uuid
)
returns table (
  id uuid,
  legal_type public.boat_legal_offering_type,
  skipper_mode public.skipper_service_mode,
  self_drive_allowed boolean,
  minimum_driver_age smallint,
  navigation_limit_notes text,
  eligibility_notes text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  if not exists (
    select 1

    from public.operator_members om

    where om.operator_id =
        p_operator_id

      and om.user_id =
        v_user_id

      and om.status =
        'ACTIVE'::public.operator_member_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'boat_legal_offerings_read_not_allowed';
  end if;


  if not exists (
    select 1

    from public.boats b

    where b.id =
        p_boat_id

      and b.operator_id =
        p_operator_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'boat_not_found';
  end if;


  return query

  select
    blo.id,
    blo.legal_type,
    blo.skipper_mode,
    blo.self_drive_allowed,
    blo.minimum_driver_age,
    blo.navigation_limit_notes,
    blo.eligibility_notes,
    blo.is_active,
    blo.created_at,
    blo.updated_at

  from public.boat_legal_offerings blo

  where blo.boat_id =
    p_boat_id

  order by
    blo.legal_type::text;

end;
$$;


-- ============================================================
-- TRUSTED SAVE RPC
-- ============================================================

create or replace function public.save_boat_legal_offering(
  p_operator_id uuid,
  p_boat_id uuid,
  p_legal_type public.boat_legal_offering_type,
  p_payload jsonb
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

  v_skipper_mode public.skipper_service_mode;

  v_self_drive_allowed boolean;
  v_minimum_driver_age smallint;

  v_navigation_limit_notes text;
  v_eligibility_notes text;

  v_is_active boolean;

  v_offering_id uuid;

  v_boolean_text text;
  v_age_text text;
begin

  -- ==========================================================
  -- AUTH
  -- ==========================================================

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  -- ==========================================================
  -- PAYLOAD
  -- ==========================================================

  if
    p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_payload';
  end if;


  if exists (
    select 1

    from jsonb_object_keys(
      p_payload
    ) as payload_key(key)

    where payload_key.key not in (
      'skipper_mode',
      'self_drive_allowed',
      'minimum_driver_age',
      'navigation_limit_notes',
      'eligibility_notes',
      'is_active'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'unsupported_payload_field';
  end if;


  -- ==========================================================
  -- OWNER / MANAGER
  -- ==========================================================

  if not exists (
    select 1

    from public.operator_members om

    where om.operator_id =
        p_operator_id

      and om.user_id =
        v_user_id

      and om.status =
        'ACTIVE'::public.operator_member_status

      and om.role in (
        'OWNER'::public.operator_member_role,
        'MANAGER'::public.operator_member_role
      )
  ) then
    raise exception using
      errcode = '42501',
      message = 'boat_legal_offering_save_not_allowed';
  end if;


  -- ==========================================================
  -- OPERATOR + BOAT
  -- ==========================================================

  select
    o.status,
    b.status

  into
    v_operator_status,
    v_boat_status

  from public.boats b

  join public.operators o
    on o.id = b.operator_id

  where b.id =
      p_boat_id

    and b.operator_id =
      p_operator_id

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


  if v_boat_status =
    'ARCHIVED'::public.boat_status
  then
    raise exception using
      errcode = '22023',
      message = 'boat_archived';
  end if;


  -- ==========================================================
  -- SKIPPER MODE
  -- ==========================================================

  if coalesce(
    p_payload ->> 'skipper_mode',
    ''
  ) not in (
    'NOT_AVAILABLE',
    'OPTIONAL',
    'INCLUDED',
    'REQUIRED'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invalid_skipper_mode';
  end if;


  v_skipper_mode :=
    (
      p_payload
        ->> 'skipper_mode'
    )::public.skipper_service_mode;


  -- ==========================================================
  -- SELF DRIVE
  -- ==========================================================

  v_boolean_text :=
    p_payload
      ->> 'self_drive_allowed';


  if v_boolean_text = 'true' then

    v_self_drive_allowed :=
      true;

  elsif v_boolean_text = 'false' then

    v_self_drive_allowed :=
      false;

  else

    raise exception using
      errcode = '22023',
      message = 'invalid_self_drive_allowed';

  end if;


  -- ==========================================================
  -- MINIMUM DRIVER AGE
  -- ==========================================================

  v_age_text :=
    nullif(
      pg_catalog.btrim(
        coalesce(
          p_payload
            ->> 'minimum_driver_age',
          ''
        )
      ),
      ''
    );


  if v_age_text is null then

    v_minimum_driver_age :=
      null;

  else

    if v_age_text !~
      '^[0-9]+$'
    then
      raise exception using
        errcode = '22023',
        message = 'invalid_minimum_driver_age';
    end if;


    v_minimum_driver_age :=
      v_age_text::smallint;


    if v_minimum_driver_age < 18
    then
      raise exception using
        errcode = '22023',
        message = 'invalid_minimum_driver_age';
    end if;

  end if;


  if
    v_self_drive_allowed = false
    and v_minimum_driver_age is not null
  then
    raise exception using
      errcode = '22023',
      message = 'minimum_driver_age_requires_self_drive';
  end if;


  -- ==========================================================
  -- NOTES
  -- ==========================================================

  v_navigation_limit_notes :=
    nullif(
      pg_catalog.btrim(
        coalesce(
          p_payload
            ->> 'navigation_limit_notes',
          ''
        )
      ),
      ''
    );


  v_eligibility_notes :=
    nullif(
      pg_catalog.btrim(
        coalesce(
          p_payload
            ->> 'eligibility_notes',
          ''
        )
      ),
      ''
    );


  -- ==========================================================
  -- ACTIVE
  -- ==========================================================

  v_boolean_text :=
    p_payload
      ->> 'is_active';


  if v_boolean_text = 'true' then

    v_is_active :=
      true;

  elsif v_boolean_text = 'false' then

    v_is_active :=
      false;

  else

    raise exception using
      errcode = '22023',
      message = 'invalid_is_active';

  end if;


  -- ==========================================================
  -- UPSERT
  -- ==========================================================

  insert into public.boat_legal_offerings (
    boat_id,
    legal_type,
    skipper_mode,
    self_drive_allowed,
    minimum_driver_age,
    navigation_limit_notes,
    eligibility_notes,
    is_active
  )
  values (
    p_boat_id,
    p_legal_type,
    v_skipper_mode,
    v_self_drive_allowed,
    v_minimum_driver_age,
    v_navigation_limit_notes,
    v_eligibility_notes,
    v_is_active
  )

  on conflict (
    boat_id,
    legal_type
  )

  do update
  set
    skipper_mode =
      excluded.skipper_mode,

    self_drive_allowed =
      excluded.self_drive_allowed,

    minimum_driver_age =
      excluded.minimum_driver_age,

    navigation_limit_notes =
      excluded.navigation_limit_notes,

    eligibility_notes =
      excluded.eligibility_notes,

    is_active =
      excluded.is_active,

    updated_at =
      pg_catalog.now()

  returning id
  into v_offering_id;


  return
    v_offering_id;

end;
$$;


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke execute
on function public.get_boat_legal_offerings(
  uuid,
  uuid
)
from public, anon;


grant execute
on function public.get_boat_legal_offerings(
  uuid,
  uuid
)
to authenticated;


revoke execute
on function public.save_boat_legal_offering(
  uuid,
  uuid,
  public.boat_legal_offering_type,
  jsonb
)
from public, anon;


grant execute
on function public.save_boat_legal_offering(
  uuid,
  uuid,
  public.boat_legal_offering_type,
  jsonb
)
to authenticated;


commit;