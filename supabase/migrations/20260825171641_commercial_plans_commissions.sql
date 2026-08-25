-- ============================================================
-- BOATLY
-- Migration: Commercial Plans & Commission Rules
-- ============================================================
--
-- Purpose:
--   Create the Boatly B2B commercial model structures for:
--
--   - subscription plan catalog;
--   - operator plan history;
--   - future-effective marketplace commission rules.
--
-- Important:
--   - subscription billing itself is NOT implemented here;
--   - pilot subscriptions may be assigned administratively;
--   - MANUAL bookings remain zero marketplace commission;
--   - confirmed bookings preserve their own commercial snapshot.
--
-- Money:
--   integer cents.
--
-- Percentages:
--   basis points.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.operator_subscription_status as enum (
  'ACTIVE',
  'SCHEDULED',
  'CANCELLED',
  'EXPIRED'
);


create type public.subscription_assignment_source as enum (
  'ADMIN',
  'BILLING'
);


-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
--
-- Platform-controlled plan catalog.
--
-- Examples may later include:
--
--   FOUNDING_OPERATOR
--   STARTER
--   PRO
--   BUSINESS
--   ENTERPRISE
--
-- These are catalog DATA and will be seeded separately.
-- ============================================================

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  name text not null,
  description text,

  monthly_price_cents integer,

  suggested_boat_limit integer,

  features jsonb not null default '{}'::jsonb,

  is_public boolean not null default true,
  is_active boolean not null default true,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscription_plans_code_format
    check (
      code = upper(code)
      and code ~ '^[A-Z0-9_]+$'
    ),

  constraint subscription_plans_name_not_blank
    check (
      length(trim(name)) > 0
    ),

  constraint subscription_plans_monthly_price_non_negative
    check (
      monthly_price_cents is null
      or monthly_price_cents >= 0
    ),

  constraint subscription_plans_boat_limit_positive
    check (
      suggested_boat_limit is null
      or suggested_boat_limit > 0
    ),

  constraint subscription_plans_features_object
    check (
      jsonb_typeof(features) = 'object'
    ),

  constraint subscription_plans_sort_order_non_negative
    check (
      sort_order >= 0
    )
);


create index subscription_plans_active_sort_idx
  on public.subscription_plans(
    is_active,
    sort_order
  );


create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row
execute function public.set_updated_at();


-- ============================================================
-- OPERATOR SUBSCRIPTIONS
-- ============================================================
--
-- Historical assignment of a commercial plan to an operator.
--
-- Billing provider identifiers are intentionally deferred until
-- subscription billing is implemented.
--
-- valid_to is exclusive.
-- ============================================================

create table public.operator_subscriptions (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  subscription_plan_id uuid not null
    references public.subscription_plans(id)
    on delete restrict,

  status public.operator_subscription_status not null,

  assignment_source public.subscription_assignment_source
    not null default 'ADMIN',

  valid_from timestamptz not null,
  valid_to timestamptz,

  assigned_by uuid
    references auth.users(id)
    on delete set null,

  cancellation_reason text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operator_subscriptions_validity
    check (
      valid_to is null
      or valid_to > valid_from
    ),

  constraint operator_subscriptions_reason_not_blank
    check (
      cancellation_reason is null
      or length(trim(cancellation_reason)) > 0
    ),

  constraint operator_subscriptions_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);


create index operator_subscriptions_operator_id_idx
  on public.operator_subscriptions(operator_id);


create index operator_subscriptions_plan_id_idx
  on public.operator_subscriptions(subscription_plan_id);


create index operator_subscriptions_operator_status_idx
  on public.operator_subscriptions(
    operator_id,
    status
  );


-- Only one current ACTIVE subscription per operator.

create unique index operator_subscriptions_one_active_idx
  on public.operator_subscriptions(operator_id)
  where status = 'ACTIVE';


create trigger operator_subscriptions_set_updated_at
before update on public.operator_subscriptions
for each row
execute function public.set_updated_at();


-- ============================================================
-- COMMISSION RULES
-- ============================================================
--
-- Future-effective marketplace commission rules.
--
-- Scope precedence will later be resolved by the server-side
-- commission engine.
--
-- A rule can target:
--
--   specific operator + optional plan
--
-- or:
--
--   plan generally, with operator_id NULL
--
-- Rule history is preserved; confirmed bookings carry their own
-- immutable commission snapshot.
--
-- Only MARKETPLACE booking commission is modeled here.
-- MANUAL booking commission remains zero by booking constraint.
-- ============================================================

create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid
    references public.operators(id)
    on delete cascade,

  subscription_plan_id uuid
    references public.subscription_plans(id)
    on delete cascade,

  commission_bps integer not null,

  effective_from timestamptz not null,
  effective_to timestamptz,

  priority integer not null default 100,

  is_active boolean not null default true,

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint commission_rules_scope_required
    check (
      operator_id is not null
      or subscription_plan_id is not null
    ),

  constraint commission_rules_bps_range
    check (
      commission_bps between 0 and 10000
    ),

  constraint commission_rules_effective_range
    check (
      effective_to is null
      or effective_to > effective_from
    ),

  constraint commission_rules_priority_non_negative
    check (
      priority >= 0
    ),

  constraint commission_rules_notes_not_blank
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


create index commission_rules_operator_idx
  on public.commission_rules(operator_id)
  where operator_id is not null;


create index commission_rules_plan_idx
  on public.commission_rules(subscription_plan_id)
  where subscription_plan_id is not null;


create index commission_rules_effective_idx
  on public.commission_rules(
    effective_from,
    effective_to
  );


create index commission_rules_resolution_idx
  on public.commission_rules(
    operator_id,
    subscription_plan_id,
    is_active,
    priority
  );


create trigger commission_rules_set_updated_at
before update on public.commission_rules
for each row
execute function public.set_updated_at();


comment on table public.commission_rules is
  'Future-effective Boatly marketplace commission rules. Confirmed bookings preserve immutable commission snapshots and MANUAL bookings carry zero marketplace commission.';


-- ============================================================
-- RLS
-- ============================================================

alter table public.subscription_plans
  enable row level security;

alter table public.operator_subscriptions
  enable row level security;

alter table public.commission_rules
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.subscription_plans is
  'Boatly commercial subscription-plan catalog. Billing integration is separate.';


comment on table public.operator_subscriptions is
  'Historical operator commercial-plan assignments. Pilot plans may be assigned administratively.';


commit;