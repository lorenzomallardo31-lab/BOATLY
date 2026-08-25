-- ============================================================
-- BOATLY
-- Migration: Operator Workspace Bootstrap
-- ============================================================
--
-- Purpose:
--   Allow an authenticated Boatly user to atomically bootstrap
--   an operator workspace and become its OWNER.
--
-- Atomic result:
--
--   operators
--       +
--   operator_members (OWNER / ACTIVE)
--
-- No legal profile or location placeholder is created here.
-- Those records are created only when the corresponding
-- onboarding steps contain real user-provided information.
--
-- Security:
--
--   - authenticated users only;
--   - auth.uid() is authoritative;
--   - caller cannot choose another owner user;
--   - caller cannot choose another role;
--   - initial operator status is always DRAFT;
--   - function uses SECURITY DEFINER with empty search_path;
--   - direct INSERT grants on operators/operator_members remain
--     blocked by the C6 authorization model.
--
-- Idempotency:
--
--   Repeating the bootstrap with the same normalized name while
--   the caller already owns a matching DRAFT workspace returns
--   that workspace instead of creating a duplicate.
--
-- ============================================================

begin;


create or replace function public.bootstrap_operator_workspace(
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_name text;
  v_slug_base text;
  v_slug text;
  v_operator_id uuid;
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
  -- INPUT NORMALIZATION
  -- ----------------------------------------------------------

  v_name := pg_catalog.btrim(p_name);

  if v_name is null
     or pg_catalog.length(v_name) = 0
     or pg_catalog.length(v_name) > 120
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_operator_name';
  end if;


  -- ----------------------------------------------------------
  -- SERIALIZE BOOTSTRAP FOR THIS USER
  --
  -- Protects against duplicate rapid submissions from the same
  -- authenticated account.
  -- ----------------------------------------------------------

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_user_id::text,
      0
    )
  );


  -- ----------------------------------------------------------
  -- IDEMPOTENT RESUME
  --
  -- If this user already created a DRAFT workspace with the
  -- same normalized name and still owns it, return it.
  -- ----------------------------------------------------------

  select o.id
  into v_operator_id

  from public.operators o

  join public.operator_members om
    on om.operator_id = o.id
   and om.user_id = v_user_id

  where o.created_by = v_user_id

    and o.status =
      'DRAFT'::public.operator_status

    and om.role =
      'OWNER'::public.operator_member_role

    and om.status =
      'ACTIVE'::public.operator_member_status

    and pg_catalog.lower(
      pg_catalog.btrim(o.name)
    ) = pg_catalog.lower(v_name)

  limit 1;


  if v_operator_id is not null then
    return v_operator_id;
  end if;


  -- ----------------------------------------------------------
  -- PUBLIC SLUG
  --
  -- Create a readable base where possible and always append a
  -- random suffix so bootstrap does not depend on name
  -- uniqueness.
  -- ----------------------------------------------------------

  v_slug_base := pg_catalog.lower(
    pg_catalog.regexp_replace(
      v_name,
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  );

  v_slug_base := pg_catalog.regexp_replace(
    v_slug_base,
    '(^-+|-+$)',
    '',
    'g'
  );

  if v_slug_base is null
     or pg_catalog.length(v_slug_base) = 0
  then
    v_slug_base := 'operator';
  end if;

  v_slug :=
    pg_catalog.left(
      v_slug_base,
      80
    )
    || '-'
    || pg_catalog.substr(
      pg_catalog.replace(
        gen_random_uuid()::text,
        '-',
        ''
      ),
      1,
      8
    );


  -- ----------------------------------------------------------
  -- CREATE OPERATOR
  -- ----------------------------------------------------------

  insert into public.operators (
    name,
    slug,
    status,
    created_by
  )
  values (
    v_name,
    v_slug,
    'DRAFT'::public.operator_status,
    v_user_id
  )
  returning id
  into v_operator_id;


  -- ----------------------------------------------------------
  -- CREATE INITIAL OWNER MEMBERSHIP
  -- ----------------------------------------------------------

  insert into public.operator_members (
    operator_id,
    user_id,
    role,
    status
  )
  values (
    v_operator_id,
    v_user_id,
    'OWNER'::public.operator_member_role,
    'ACTIVE'::public.operator_member_status
  );


  return v_operator_id;

end;
$$;


-- ============================================================
-- FUNCTION PRIVILEGES
-- ============================================================

revoke execute
on function public.bootstrap_operator_workspace(text)
from public, anon;


grant execute
on function public.bootstrap_operator_workspace(text)
to authenticated;


comment on function public.bootstrap_operator_workspace(text) is
  'Atomically creates a DRAFT Boatly operator workspace and an ACTIVE OWNER membership for auth.uid(). Repeated matching DRAFT bootstrap requests are idempotently resumed.';


commit;