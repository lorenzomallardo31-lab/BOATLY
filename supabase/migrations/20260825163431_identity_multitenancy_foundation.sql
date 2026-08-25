-- ============================================================
-- BOATLY
-- Migration: Identity & Multi-Tenancy Foundation
-- ============================================================
--
-- Purpose:
--   Create the foundational identity, platform-role,
--   operator-workspace, membership and invitation structures.
--
-- Security:
--   Row Level Security is enabled immediately.
--   Authorization policies are intentionally deferred to C6.
--
-- Authentication:
--   Supabase Auth remains the source of truth for user accounts.
--   Automatic profile creation is intentionally deferred to C5.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================


-- ------------------------------------------------------------
-- Operator member roles
-- ------------------------------------------------------------

create type public.operator_member_role as enum (
  'OWNER',
  'MANAGER',
  'EMPLOYEE',
  'SKIPPER'
);


-- ------------------------------------------------------------
-- Boatly platform roles
-- ------------------------------------------------------------

create type public.platform_role as enum (
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT',
  'FINANCE',
  'MODERATOR',
  'COMPLIANCE'
);


-- ------------------------------------------------------------
-- Operator lifecycle status
-- ------------------------------------------------------------

create type public.operator_status as enum (
  'DRAFT',
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'REJECTED'
);


-- ------------------------------------------------------------
-- Operator membership status
-- ------------------------------------------------------------

create type public.operator_member_status as enum (
  'ACTIVE',
  'SUSPENDED',
  'REMOVED'
);


-- ============================================================
-- SHARED UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- PROFILES
-- ============================================================
--
-- Public application profile linked 1:1 to Supabase auth.users.
--
-- auth.users remains the authentication source of truth.
-- We intentionally do not duplicate the authentication email.
-- ============================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  first_name text,
  last_name text,
  phone text,
  avatar_path text,

  locale text not null default 'it-IT',
  timezone text not null default 'Europe/Rome',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_first_name_not_blank
    check (
      first_name is null
      or length(trim(first_name)) > 0
    ),

  constraint profiles_last_name_not_blank
    check (
      last_name is null
      or length(trim(last_name)) > 0
    ),

  constraint profiles_timezone_not_blank
    check (length(trim(timezone)) > 0),

  constraint profiles_locale_not_blank
    check (length(trim(locale)) > 0)
);


create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


-- ============================================================
-- PLATFORM USER ROLES
-- ============================================================
--
-- Internal Boatly platform permissions.
--
-- A user may hold more than one platform role.
-- Detailed authorization rules are deferred to C6.
-- ============================================================

create table public.platform_user_roles (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role public.platform_role not null,

  granted_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  primary key (user_id, role)
);


create index platform_user_roles_role_idx
  on public.platform_user_roles(role);


-- ============================================================
-- OPERATORS
-- ============================================================
--
-- An operator is a professional rental-company workspace.
--
-- Legal/fiscal details are intentionally stored separately
-- in operator_legal_profiles in a later database checkpoint.
-- ============================================================

create table public.operators (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  slug text unique,

  status public.operator_status not null default 'DRAFT',

  country_code text not null default 'IT',
  timezone text not null default 'Europe/Rome',
  currency text not null default 'EUR',

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operators_name_not_blank
    check (length(trim(name)) > 0),

  constraint operators_slug_format
    check (
      slug is null
      or (
        slug = lower(slug)
        and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      )
    ),

  constraint operators_country_code_format
    check (
      country_code = upper(country_code)
      and length(country_code) = 2
    ),

  constraint operators_currency_format
    check (
      currency = upper(currency)
      and length(currency) = 3
    ),

  constraint operators_timezone_not_blank
    check (length(trim(timezone)) > 0)
);


create index operators_status_idx
  on public.operators(status);


create index operators_created_by_idx
  on public.operators(created_by);


create trigger operators_set_updated_at
before update on public.operators
for each row
execute function public.set_updated_at();


-- ============================================================
-- OPERATOR MEMBERS
-- ============================================================
--
-- Membership is the authorization boundary between a user
-- and an operator workspace.
--
-- A user may belong to multiple operators.
-- A user has one current role per operator workspace.
-- ============================================================

create table public.operator_members (
  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role public.operator_member_role not null,

  status public.operator_member_status not null default 'ACTIVE',

  invited_by uuid
    references auth.users(id)
    on delete set null,

  joined_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (operator_id, user_id)
);


create index operator_members_user_id_idx
  on public.operator_members(user_id);


create index operator_members_operator_role_idx
  on public.operator_members(operator_id, role);


create index operator_members_operator_status_idx
  on public.operator_members(operator_id, status);


create trigger operator_members_set_updated_at
before update on public.operator_members
for each row
execute function public.set_updated_at();


-- ============================================================
-- OPERATOR INVITATIONS
-- ============================================================
--
-- Pending invitations to an operator workspace.
--
-- Raw invitation tokens must never be stored.
-- Only a cryptographic token hash is persisted.
-- ============================================================

create table public.operator_invitations (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  email text not null,

  role public.operator_member_role not null,

  token_hash text not null unique,

  invited_by uuid not null
    references auth.users(id)
    on delete restrict,

  expires_at timestamptz not null,

  accepted_by uuid
    references auth.users(id)
    on delete set null,

  accepted_at timestamptz,

  revoked_at timestamptz,

  created_at timestamptz not null default now(),

  constraint operator_invitations_email_lowercase
    check (email = lower(email)),

  constraint operator_invitations_email_not_blank
    check (length(trim(email)) > 0),

  constraint operator_invitations_token_hash_not_blank
    check (length(trim(token_hash)) > 0),

  constraint operator_invitations_expiry_after_creation
    check (expires_at > created_at),

  constraint operator_invitations_acceptance_consistency
    check (
      (
        accepted_at is null
        and accepted_by is null
      )
      or
      (
        accepted_at is not null
        and accepted_by is not null
      )
    ),

  constraint operator_invitations_not_accepted_and_revoked
    check (
      not (
        accepted_at is not null
        and revoked_at is not null
      )
    )
);


create index operator_invitations_operator_id_idx
  on public.operator_invitations(operator_id);


create index operator_invitations_email_idx
  on public.operator_invitations(lower(email));


create index operator_invitations_expires_at_idx
  on public.operator_invitations(expires_at);


create unique index operator_invitations_unique_pending_email_idx
  on public.operator_invitations(
    operator_id,
    lower(email)
  )
  where accepted_at is null
    and revoked_at is null;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
--
-- RLS is deliberately enabled before any client-facing access.
--
-- C6 will introduce the authorization policies.
-- Until then these application tables remain default-deny
-- through the Supabase Data API.
-- ============================================================

alter table public.profiles
  enable row level security;

alter table public.platform_user_roles
  enable row level security;

alter table public.operators
  enable row level security;

alter table public.operator_members
  enable row level security;

alter table public.operator_invitations
  enable row level security;


-- ============================================================
-- TABLE COMMENTS
-- ============================================================

comment on table public.profiles is
  'Application profile linked one-to-one with Supabase Auth users.';

comment on table public.platform_user_roles is
  'Internal Boatly platform roles assigned to authenticated users.';

comment on table public.operators is
  'Professional boat-rental operator workspaces.';

comment on table public.operator_members is
  'User membership and role inside an operator workspace.';

comment on table public.operator_invitations is
  'Invitations to join an operator workspace. Raw invitation tokens are never stored.';


commit;