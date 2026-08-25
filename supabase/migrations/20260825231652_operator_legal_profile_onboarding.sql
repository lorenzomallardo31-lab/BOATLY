-- ============================================================
-- BOATLY
-- Migration: Operator Legal Profile Onboarding
-- ============================================================
--
-- Purpose:
--   Provide the trusted write workflow for the business/legal
--   information step of operator onboarding.
--
-- Security:
--
--   - authenticated users only;
--   - caller identity comes exclusively from auth.uid();
--   - caller must be ACTIVE OWNER of the target workspace;
--   - target operator must still be DRAFT;
--   - direct client INSERT/UPDATE/DELETE on
--     operator_legal_profiles is removed;
--   - writes occur only through this controlled RPC;
--   - SECURITY DEFINER uses an empty search_path.
--
-- MVP jurisdiction:
--   Italy.
--
-- ============================================================

begin;


-- ============================================================
-- TRUSTED LEGAL PROFILE SAVE RPC
-- ============================================================

create or replace function public.save_operator_legal_profile(
  p_operator_id uuid,
  p_profile jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;

  v_legal_name text;
  v_legal_form text;
  v_vat_number text;
  v_tax_code text;
  v_business_register_number text;
  v_rea_number text;
  v_pec_email text;
  v_sdi_code text;

  v_registered_address_line_1 text;
  v_registered_address_line_2 text;
  v_registered_city text;
  v_registered_administrative_area text;
  v_registered_postal_code text;
  v_registered_country_code text;

  v_legal_representative_first_name text;
  v_legal_representative_last_name text;
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
      message = 'operator_legal_profile_not_allowed';
  end if;


  -- ----------------------------------------------------------
  -- PAYLOAD VALIDATION
  -- ----------------------------------------------------------

  if p_profile is null
     or jsonb_typeof(p_profile) <> 'object'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_legal_profile_payload';
  end if;


  if exists (
    select 1
    from jsonb_object_keys(p_profile) as key_name
    where key_name not in (
      'legal_name',
      'legal_form',
      'vat_number',
      'tax_code',
      'business_register_number',
      'rea_number',
      'pec_email',
      'sdi_code',
      'registered_address_line_1',
      'registered_address_line_2',
      'registered_city',
      'registered_administrative_area',
      'registered_postal_code',
      'registered_country_code',
      'legal_representative_first_name',
      'legal_representative_last_name'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'unknown_legal_profile_field';
  end if;


  -- ----------------------------------------------------------
  -- NORMALIZATION
  -- ----------------------------------------------------------

  v_legal_name :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'legal_name'
      ),
      ''
    );

  v_legal_form :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'legal_form'
      ),
      ''
    );

  v_vat_number :=
    pg_catalog.upper(
      nullif(
        pg_catalog.btrim(
          p_profile ->> 'vat_number'
        ),
        ''
      )
    );

  v_tax_code :=
    pg_catalog.upper(
      nullif(
        pg_catalog.btrim(
          p_profile ->> 'tax_code'
        ),
        ''
      )
    );

  v_business_register_number :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'business_register_number'
      ),
      ''
    );

  v_rea_number :=
    pg_catalog.upper(
      nullif(
        pg_catalog.btrim(
          p_profile ->> 'rea_number'
        ),
        ''
      )
    );

  v_pec_email :=
    pg_catalog.lower(
      nullif(
        pg_catalog.btrim(
          p_profile ->> 'pec_email'
        ),
        ''
      )
    );

  v_sdi_code :=
    pg_catalog.upper(
      nullif(
        pg_catalog.btrim(
          p_profile ->> 'sdi_code'
        ),
        ''
      )
    );

  v_registered_address_line_1 :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'registered_address_line_1'
      ),
      ''
    );

  v_registered_address_line_2 :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'registered_address_line_2'
      ),
      ''
    );

  v_registered_city :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'registered_city'
      ),
      ''
    );

  v_registered_administrative_area :=
    pg_catalog.upper(
      nullif(
        pg_catalog.btrim(
          p_profile ->> 'registered_administrative_area'
        ),
        ''
      )
    );

  v_registered_postal_code :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'registered_postal_code'
      ),
      ''
    );

  v_registered_country_code :=
    pg_catalog.upper(
      coalesce(
        nullif(
          pg_catalog.btrim(
            p_profile ->> 'registered_country_code'
          ),
          ''
        ),
        'IT'
      )
    );

  v_legal_representative_first_name :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'legal_representative_first_name'
      ),
      ''
    );

  v_legal_representative_last_name :=
    nullif(
      pg_catalog.btrim(
        p_profile ->> 'legal_representative_last_name'
      ),
      ''
    );


  -- ----------------------------------------------------------
  -- REQUIRED MVP FIELDS
  -- ----------------------------------------------------------

  if v_legal_name is null
     or pg_catalog.length(v_legal_name) > 200
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_legal_name';
  end if;


  if v_legal_form is null
     or pg_catalog.length(v_legal_form) > 100
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_legal_form';
  end if;


  if v_vat_number is null
     or v_vat_number !~ '^[0-9]{11}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_vat_number';
  end if;


  if v_tax_code is null
     or not (
       v_tax_code ~ '^[0-9]{11}$'
       or v_tax_code ~ '^[A-Z0-9]{16}$'
     )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_tax_code';
  end if;


  if v_registered_address_line_1 is null
     or pg_catalog.length(
       v_registered_address_line_1
     ) > 200
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_registered_address';
  end if;


  if v_registered_city is null
     or pg_catalog.length(v_registered_city) > 120
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_registered_city';
  end if;


  if v_registered_administrative_area is null
     or pg_catalog.length(
       v_registered_administrative_area
     ) > 120
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_registered_administrative_area';
  end if;


  if v_registered_postal_code is null
     or v_registered_postal_code !~ '^[0-9]{5}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_registered_postal_code';
  end if;


  if v_registered_country_code <> 'IT'
  then
    raise exception using
      errcode = '22023',
      message = 'unsupported_registered_country';
  end if;


  if v_legal_representative_first_name is null
     or pg_catalog.length(
       v_legal_representative_first_name
     ) > 120
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_legal_representative_first_name';
  end if;


  if v_legal_representative_last_name is null
     or pg_catalog.length(
       v_legal_representative_last_name
     ) > 120
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_legal_representative_last_name';
  end if;


  -- ----------------------------------------------------------
  -- OPTIONAL FIELD VALIDATION
  -- ----------------------------------------------------------

  if v_pec_email is not null
     and v_pec_email !~ '^[^@ ]+@[^@ ]+[.][^@ ]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_pec_email';
  end if;


  if v_sdi_code is not null
     and v_sdi_code !~ '^[A-Z0-9]{6,7}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_sdi_code';
  end if;


  -- ----------------------------------------------------------
  -- UPSERT
  --
  -- operator_id is the primary key, therefore there can be only
  -- one current legal profile per operator.
  -- ----------------------------------------------------------

  insert into public.operator_legal_profiles (
    operator_id,
    legal_name,
    legal_form,
    vat_number,
    tax_code,
    business_register_number,
    rea_number,
    pec_email,
    sdi_code,
    registered_address_line_1,
    registered_address_line_2,
    registered_city,
    registered_administrative_area,
    registered_postal_code,
    registered_country_code,
    legal_representative_first_name,
    legal_representative_last_name
  )
  values (
    p_operator_id,
    v_legal_name,
    v_legal_form,
    v_vat_number,
    v_tax_code,
    v_business_register_number,
    v_rea_number,
    v_pec_email,
    v_sdi_code,
    v_registered_address_line_1,
    v_registered_address_line_2,
    v_registered_city,
    v_registered_administrative_area,
    v_registered_postal_code,
    v_registered_country_code,
    v_legal_representative_first_name,
    v_legal_representative_last_name
  )

  on conflict (operator_id)
  do update
  set
    legal_name =
      excluded.legal_name,

    legal_form =
      excluded.legal_form,

    vat_number =
      excluded.vat_number,

    tax_code =
      excluded.tax_code,

    business_register_number =
      excluded.business_register_number,

    rea_number =
      excluded.rea_number,

    pec_email =
      excluded.pec_email,

    sdi_code =
      excluded.sdi_code,

    registered_address_line_1 =
      excluded.registered_address_line_1,

    registered_address_line_2 =
      excluded.registered_address_line_2,

    registered_city =
      excluded.registered_city,

    registered_administrative_area =
      excluded.registered_administrative_area,

    registered_postal_code =
      excluded.registered_postal_code,

    registered_country_code =
      excluded.registered_country_code,

    legal_representative_first_name =
      excluded.legal_representative_first_name,

    legal_representative_last_name =
      excluded.legal_representative_last_name;


  return p_operator_id;

end;
$$;


-- ============================================================
-- RPC PRIVILEGES
-- ============================================================

revoke execute
on function public.save_operator_legal_profile(
  uuid,
  jsonb
)
from public, anon;


grant execute
on function public.save_operator_legal_profile(
  uuid,
  jsonb
)
to authenticated;


-- ============================================================
-- REMOVE DIRECT CLIENT MUTATIONS
-- ============================================================
--
-- SELECT remains available through the existing C6 RLS policy.
--
-- Writes must now use save_operator_legal_profile().
-- ============================================================

revoke insert, update, delete
on table public.operator_legal_profiles
from anon, authenticated;


comment on function public.save_operator_legal_profile(
  uuid,
  jsonb
) is
  'Trusted Boatly operator-onboarding workflow for creating or updating the legal profile of a DRAFT workspace owned by auth.uid().';


commit;