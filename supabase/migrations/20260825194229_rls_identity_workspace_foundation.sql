-- ============================================================
-- BOATLY
-- Migration: RLS Identity & Workspace Foundation
-- ============================================================
--
-- Purpose:
--   Introduce the reusable authorization foundation for Boatly
--   Row Level Security.
--
-- This migration covers:
--
--   - private authorization helper functions;
--   - personal profile access;
--   - personal platform-role visibility;
--   - operator membership visibility;
--   - operator workspace visibility.
--
-- Security principles:
--
--   - default deny;
--   - authenticated role explicitly named;
--   - anon receives no access to these private tables;
--   - authorization helpers are SECURITY DEFINER;
--   - helpers live in a non-exposed private schema;
--   - helper search_path is empty;
--   - active operator membership is required;
--   - no user-controlled metadata is trusted for RBAC.
--
-- Mutation permissions for memberships/operators remain
-- intentionally deferred to later workflows.
-- ============================================================

begin;


-- ============================================================
-- PRIVATE AUTHORIZATION SCHEMA
-- ============================================================
--
-- This schema is intentionally not part of the Supabase Data API
-- exposed schemas.
--
-- The authenticated role receives USAGE so RLS policies may call
-- the helper functions.
-- ============================================================

create schema if not exists private;

revoke all
on schema private
from public;

grant usage
on schema private
to authenticated;


-- ============================================================
-- PLATFORM AUTHORIZATION HELPERS
-- ============================================================


-- ------------------------------------------------------------
-- Is the current user any Boatly platform user?
-- ------------------------------------------------------------

create or replace function private.is_platform_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_user_roles pur
    where pur.user_id = (select auth.uid())
  );
$$;


-- ------------------------------------------------------------
-- Does the current platform user have one of the requested
-- Boatly platform roles?
-- ------------------------------------------------------------

create or replace function private.has_platform_role(
  allowed_roles public.platform_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_user_roles pur
    where pur.user_id = (select auth.uid())
      and pur.role = any(allowed_roles)
  );
$$;


-- ============================================================
-- OPERATOR AUTHORIZATION HELPERS
-- ============================================================


-- ------------------------------------------------------------
-- Is the current user an ACTIVE member of this workspace?
-- ------------------------------------------------------------

create or replace function private.is_operator_member(
  target_operator_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator_members om
    where om.operator_id = target_operator_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
  );
$$;


-- ------------------------------------------------------------
-- Does the current ACTIVE operator member have one of the
-- requested workspace roles?
-- ------------------------------------------------------------

create or replace function private.has_operator_role(
  target_operator_id uuid,
  allowed_roles public.operator_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator_members om
    where om.operator_id = target_operator_id
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = any(allowed_roles)
  );
$$;


-- ============================================================
-- FUNCTION PRIVILEGES
-- ============================================================
--
-- PUBLIC and anon cannot call the helpers.
--
-- authenticated may execute them because RLS policies need them.
--
-- The private schema itself is not exposed through the normal
-- Supabase Data API.
-- ============================================================

revoke execute
on function private.is_platform_user()
from public, anon;

revoke execute
on function private.has_platform_role(
  public.platform_role[]
)
from public, anon;

revoke execute
on function private.is_operator_member(uuid)
from public, anon;

revoke execute
on function private.has_operator_role(
  uuid,
  public.operator_member_role[]
)
from public, anon;


grant execute
on function private.is_platform_user()
to authenticated;

grant execute
on function private.has_platform_role(
  public.platform_role[]
)
to authenticated;

grant execute
on function private.is_operator_member(uuid)
to authenticated;

grant execute
on function private.has_operator_role(
  uuid,
  public.operator_member_role[]
)
to authenticated;


-- ============================================================
-- TABLE PRIVILEGES
-- ============================================================
--
-- Remove broad API privileges first.
--
-- Then grant only the operations needed by this first RLS batch.
-- ============================================================


-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------

revoke all
on table public.profiles
from anon, authenticated;

grant select, update
on table public.profiles
to authenticated;


-- ------------------------------------------------------------
-- platform_user_roles
-- ------------------------------------------------------------

revoke all
on table public.platform_user_roles
from anon, authenticated;

grant select
on table public.platform_user_roles
to authenticated;


-- ------------------------------------------------------------
-- operator_members
-- ------------------------------------------------------------

revoke all
on table public.operator_members
from anon, authenticated;

grant select
on table public.operator_members
to authenticated;


-- ------------------------------------------------------------
-- operators
-- ------------------------------------------------------------

revoke all
on table public.operators
from anon, authenticated;

grant select
on table public.operators
to authenticated;


-- ============================================================
-- PROFILES RLS
-- ============================================================
--
-- A normal user sees their own profile.
--
-- Boatly platform users may read profiles for internal
-- operational purposes.
--
-- A normal user may update only their own profile.
-- ============================================================

create policy "profiles_select_own_or_platform"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_platform_user())
);


create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
)
with check (
  id = (select auth.uid())
);


-- ============================================================
-- PLATFORM USER ROLES RLS
-- ============================================================
--
-- An authenticated user may discover their own platform role.
--
-- Direct role administration is intentionally NOT enabled.
-- ============================================================

create policy "platform_roles_select_own"
on public.platform_user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
);


-- ============================================================
-- OPERATOR MEMBERS RLS
-- ============================================================
--
-- A user may read:
--
--   - their own memberships;
--   - all memberships of a workspace if they are an ACTIVE
--     OWNER or MANAGER there;
--   - memberships if they are Boatly platform staff.
--
-- EMPLOYEE and SKIPPER do not automatically receive the entire
-- team roster through this policy.
-- ============================================================

create policy "operator_members_select_allowed"
on public.operator_members
for select
to authenticated
using (
  user_id = (select auth.uid())

  or private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or (select private.is_platform_user())
);


-- ============================================================
-- OPERATORS RLS
-- ============================================================
--
-- Any ACTIVE member of the operator workspace may read the
-- workspace record.
--
-- Boatly platform users may also read it.
--
-- No direct INSERT / UPDATE / DELETE is granted yet.
-- ============================================================

create policy "operators_select_members_or_platform"
on public.operators
for select
to authenticated
using (
  private.is_operator_member(id)
  or (select private.is_platform_user())
);


-- ============================================================
-- COMMENTS
-- ============================================================

comment on schema private is
  'Non-exposed Boatly database schema for internal authorization helpers and other trusted database implementation details.';


comment on function private.is_platform_user() is
  'Returns true when auth.uid() has a Boatly platform role. Intended primarily for RLS authorization.';


comment on function private.has_platform_role(
  public.platform_role[]
) is
  'Returns true when auth.uid() has one of the requested Boatly platform roles. Intended primarily for RLS authorization.';


comment on function private.is_operator_member(uuid) is
  'Returns true when auth.uid() is an ACTIVE member of the requested Boatly operator workspace.';


comment on function private.has_operator_role(
  uuid,
  public.operator_member_role[]
) is
  'Returns true when auth.uid() is an ACTIVE member of the operator workspace with one of the requested roles.';


commit;