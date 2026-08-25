-- ============================================================
-- BOATLY
-- Migration: Operator Primary Location Onboarding
-- ============================================================
--
-- Purpose:
--   Provide the trusted write workflow for the first operational
--   location step of operator onboarding.
--
-- Result:
--
--   operator_locations
--     - exactly one primary location for this onboarding flow;
--     - active;
--     - public-ready;
--     - Italy / Europe-Rome for MVP.
--
-- Opening hours:
--   NOT created here.
--
--   location_opening_hours represents physical location opening
--   hours and is not required to complete initial onboarding.
--
-- Geolocation:
--   geo_point is intentionally left unchanged / NULL for now.
--   Precise geocoding will be introduced with Mapbox.
--
-- Security:
--
--   - authenticated users only;
--   - caller identity comes from auth.uid();
--   - caller must be ACTIVE OWNER of the target workspace;
--   - target operator must still be DRAFT;
--   - direct client writes to operator_locations are removed;
--   - writes occur through this controlled RPC;
--   - SECURITY DEFINER with empty search_path.
--
-- ============================================================

begin;


create or replace function public.save_operator_primary_location(
  p_operator_id uuid,
  p_location jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_location_id uuid;

  v_name text;
  v_address_line_1 text;
  v_address_line_2 text;
  v_city text;
  v_administrative_area text;
  v_postal_code text;
  v_country_code text;
  v_timezone text;

  v_phone text;
  v_email text;
  v_pickup_instructions text;

  v_is_public boolean;
begin

  -- ----------------------------------------------------------
  -- AUTHENTICATION
  -- ----------------------------------------------------------

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  -- ----------------------------------------------------------
  -- WORKSPACE AUTHORIZATION
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.operator_members om
    join public.operators o
      on o.id = om.operator_id
    where om.operator_id = p_operator_id
      and om.user_id = v_user_id
      and om.role =
        'OWNER'::public.operator_member_role
      and om.status =
        'ACTIVE'::public.operator_member_status
      and o.status =
        'DRAFT'::public.operator_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'operator_location_not_allowed';
  end if;


  -- ----------------------------------------------------------
  -- PAYLOAD VALIDATION
  -- ----------------------------------------------------------

  if p_location is null
     or jsonb_typeof(p_location) <> 'object'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_payload';
  end if;


  if exists (
    select 1
    from jsonb_object_keys(p_location) as key_name
    where key_name not in (
      'name',
      'address_line_1',
      'address_line_2',
      'city',
      'administrative_area',
      'postal_code',
      'country_code',
      'timezone',
      'phone',
      'email',
      'pickup_instructions',
      'is_public'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'unknown_location_field';
  end if;


  if p_location ? 'is_public'
     and jsonb_typeof(
       p_location -> 'is_public'
     ) <> 'boolean'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_public_flag';
  end if;


  -- ----------------------------------------------------------
  -- NORMALIZATION
  -- ----------------------------------------------------------

  v_name :=
    nullif(
      pg_catalog.btrim(
        p_location ->> 'name'
      ),
      ''
    );


  v_address_line_1 :=
    nullif(
      pg_catalog.btrim(
        p_location ->> 'address_line_1'
      ),
      ''
    );


  v_address_line_2 :=
    nullif(
      pg_catalog.btrim(
        p_location ->> 'address_line_2'
      ),
      ''
    );


  v_city :=
    nullif(
      pg_catalog.btrim(
        p_location ->> 'city'
      ),
      ''
    );


  v_administrative_area :=
    pg_catalog.upper(
      nullif(
        pg_catalog.btrim(
          p_location ->> 'administrative_area'
        ),
        ''
      )
    );


  v_postal_code :=
    nullif(
      pg_catalog.btrim(
        p_location ->> 'postal_code'
      ),
      ''
    );


  v_country_code :=
    pg_catalog.upper(
      coalesce(
        nullif(
          pg_catalog.btrim(
            p_location ->> 'country_code'
          ),
          ''
        ),
        'IT'
      )
    );


  v_timezone :=
    coalesce(
      nullif(
        pg_catalog.btrim(
          p_location ->> 'timezone'
        ),
        ''
      ),
      'Europe/Rome'
    );


  v_phone :=
    nullif(
      pg_catalog.btrim(
        p_location ->> 'phone'
      ),
      ''
    );


  v_email :=
    pg_catalog.lower(
      nullif(
        pg_catalog.btrim(
          p_location ->> 'email'
        ),
        ''
      )
    );


  v_pickup_instructions :=
    nullif(
      pg_catalog.btrim(
        p_location ->> 'pickup_instructions'
      ),
      ''
    );


  v_is_public :=
    coalesce(
      (p_location ->> 'is_public')::boolean,
      true
    );


  -- ----------------------------------------------------------
  -- REQUIRED MVP FIELDS
  -- ----------------------------------------------------------

  if v_name is null
     or pg_catalog.length(v_name) > 160
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_name';
  end if;


  if v_address_line_1 is null
     or pg_catalog.length(
       v_address_line_1
     ) > 200
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_address';
  end if;


  if v_city is null
     or pg_catalog.length(v_city) > 120
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_city';
  end if;


  if v_administrative_area is null
     or pg_catalog.length(
       v_administrative_area
     ) > 120
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_administrative_area';
  end if;


  if v_postal_code is null
     or v_postal_code !~ '^[0-9]{5}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_postal_code';
  end if;


  if v_country_code <> 'IT'
  then
    raise exception using
      errcode = '22023',
      message = 'unsupported_location_country';
  end if;


  if v_timezone <> 'Europe/Rome'
  then
    raise exception using
      errcode = '22023',
      message = 'unsupported_location_timezone';
  end if;


  -- ----------------------------------------------------------
  -- OPTIONAL FIELD VALIDATION
  -- ----------------------------------------------------------

  if v_email is not null
     and v_email !~ '^[^@ ]+@[^@ ]+[.][^@ ]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_email';
  end if;


  if v_phone is not null
     and pg_catalog.length(v_phone) > 50
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_location_phone';
  end if;


  if v_pickup_instructions is not null
     and pg_catalog.length(
       v_pickup_instructions
     ) > 2000
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_pickup_instructions';
  end if;


  if v_is_public <> true then
    raise exception using
      errcode = '22023',
      message = 'primary_onboarding_location_must_be_public';
  end if;


  -- ----------------------------------------------------------
  -- SERIALIZE PRIMARY-LOCATION CREATION
  --
  -- Protect against two simultaneous submissions.
  -- ----------------------------------------------------------

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_operator_id::text,
      17
    )
  );


  -- ----------------------------------------------------------
  -- FIND EXISTING PRIMARY LOCATION
  -- ----------------------------------------------------------

  select ol.id
  into v_location_id
  from public.operator_locations ol
  where ol.operator_id = p_operator_id
    and ol.is_primary = true
  order by ol.created_at asc
  limit 1;


  -- ----------------------------------------------------------
  -- INSERT OR UPDATE
  -- ----------------------------------------------------------

  if v_location_id is null then

    insert into public.operator_locations (
      operator_id,
      name,
      address_line_1,
      address_line_2,
      city,
      administrative_area,
      postal_code,
      country_code,
      timezone,
      phone,
      email,
      pickup_instructions,
      is_primary,
      is_public,
      is_active
    )
    values (
      p_operator_id,
      v_name,
      v_address_line_1,
      v_address_line_2,
      v_city,
      v_administrative_area,
      v_postal_code,
      v_country_code,
      v_timezone,
      v_phone,
      v_email,
      v_pickup_instructions,
      true,
      true,
      true
    )
    returning id
    into v_location_id;

  else

    update public.operator_locations
    set
      name =
        v_name,

      address_line_1 =
        v_address_line_1,

      address_line_2 =
        v_address_line_2,

      city =
        v_city,

      administrative_area =
        v_administrative_area,

      postal_code =
        v_postal_code,

      country_code =
        v_country_code,

      timezone =
        v_timezone,

      phone =
        v_phone,

      email =
        v_email,

      pickup_instructions =
        v_pickup_instructions,

      is_primary =
        true,

      is_public =
        true,

      is_active =
        true

    where id = v_location_id
      and operator_id = p_operator_id;

  end if;


  return v_location_id;

end;
$$;


-- ============================================================
-- RPC PRIVILEGES
-- ============================================================

revoke execute
on function public.save_operator_primary_location(
  uuid,
  jsonb
)
from public, anon;


grant execute
on function public.save_operator_primary_location(
  uuid,
  jsonb
)
to authenticated;


-- ============================================================
-- REMOVE DIRECT CLIENT WRITES
-- ============================================================
--
-- Existing SELECT access through C6 RLS remains available.
--
-- Location writes now go through trusted workflows.
-- ============================================================

revoke insert, update, delete
on table public.operator_locations
from anon, authenticated;


comment on function public.save_operator_primary_location(
  uuid,
  jsonb
) is
  'Trusted Boatly onboarding workflow for creating or updating the active public primary location of a DRAFT operator owned by auth.uid().';


commit;