-- ============================================================
-- BOATLY
-- Migration: Pricing & Cancellation Foundation
-- ============================================================
--
-- Purpose:
--   Create the core commercial pricing structures for:
--
--   - reusable operator cancellation policies;
--   - structured cancellation refund windows;
--   - boat rate plans;
--   - conditional boat pricing rules.
--
-- Security:
--   Row Level Security is enabled immediately.
--   Authorization policies remain deferred to C6.
--
-- Money:
--   Monetary amounts are stored in integer cents.
--
-- Percentages:
--   Percentage adjustments and refunds are stored in basis
--   points, where:
--
--       10000 = 100%
--        1500 = 15%
--        -500 = -5%
--
-- Legal note:
--   Commercial cancellation policies modeled here must not be
--   treated as a substitute for statutory consumer rights or
--   Boatly's separate weather/safety cancellation workflows.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================


-- ------------------------------------------------------------
-- Rate plan duration mode
-- ------------------------------------------------------------

create type public.rate_plan_duration_mode as enum (
  'FIXED',
  'FLEXIBLE'
);


-- ------------------------------------------------------------
-- Pricing adjustment type
-- ------------------------------------------------------------

create type public.pricing_adjustment_type as enum (
  'OVERRIDE_PRICE',
  'FIXED_DELTA',
  'PERCENTAGE'
);


-- ============================================================
-- CANCELLATION POLICIES
-- ============================================================
--
-- Reusable commercial cancellation policies belonging to an
-- operator workspace.
--
-- A policy may later be assigned to one or more rate plans.
--
-- Policy configuration is separate from:
--
--   - statutory withdrawal rights;
--   - weather/safety cancellations;
--   - operator cancellations;
--   - Boatly administrative cancellations.
-- ============================================================

create table public.cancellation_policies (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  name text not null,
  description text,

  is_default boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cancellation_policies_name_not_blank
    check (length(trim(name)) > 0)
);


create index cancellation_policies_operator_id_idx
  on public.cancellation_policies(operator_id);


create index cancellation_policies_operator_active_idx
  on public.cancellation_policies(
    operator_id,
    is_active
  );


create unique index cancellation_policies_unique_name_per_operator_idx
  on public.cancellation_policies(
    operator_id,
    lower(name)
  );


create unique index cancellation_policies_one_default_per_operator_idx
  on public.cancellation_policies(operator_id)
  where is_default = true;


create trigger cancellation_policies_set_updated_at
before update on public.cancellation_policies
for each row
execute function public.set_updated_at();


-- Composite key used by operator-consistent foreign keys.

alter table public.cancellation_policies
  add constraint cancellation_policies_operator_id_id_key
  unique (operator_id, id);


-- ============================================================
-- CANCELLATION POLICY RULES
-- ============================================================
--
-- Defines refund rules according to the number of whole hours
-- remaining before the booking starts.
--
-- Example:
--
--   [0, 24)       -> 0% refund
--   [24, 72)      -> 50% refund
--   [72, infinity)-> 100% refund
--
-- The generated int8range is used by a GiST exclusion
-- constraint so windows belonging to the same policy cannot
-- overlap.
--
-- Upper bounds are exclusive.
-- ============================================================

create table public.cancellation_policy_rules (
  id uuid primary key default gen_random_uuid(),

  cancellation_policy_id uuid not null
    references public.cancellation_policies(id)
    on delete cascade,

  min_hours_before_start bigint not null default 0,
  max_hours_before_start bigint,

  lead_time_range int8range
    generated always as (
      int8range(
        min_hours_before_start,
        max_hours_before_start,
        '[)'
      )
    ) stored,

  refund_bps integer not null,

  cancellation_fee_cents integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cancellation_policy_rules_min_hours_non_negative
    check (min_hours_before_start >= 0),

  constraint cancellation_policy_rules_max_hours_valid
    check (
      max_hours_before_start is null
      or max_hours_before_start > min_hours_before_start
    ),

  constraint cancellation_policy_rules_refund_bps_range
    check (
      refund_bps between 0 and 10000
    ),

  constraint cancellation_policy_rules_fee_non_negative
    check (
      cancellation_fee_cents >= 0
    )
);


alter table public.cancellation_policy_rules
  add constraint cancellation_policy_rules_no_overlap
  exclude using gist (
    cancellation_policy_id with =,
    lead_time_range with &&
  );


create index cancellation_policy_rules_policy_idx
  on public.cancellation_policy_rules(
    cancellation_policy_id
  );


create trigger cancellation_policy_rules_set_updated_at
before update on public.cancellation_policy_rules
for each row
execute function public.set_updated_at();


comment on column public.cancellation_policy_rules.refund_bps is
  'Refund percentage expressed in basis points. 10000 equals 100%.';


comment on column public.cancellation_policy_rules.cancellation_fee_cents is
  'Optional commercial cancellation fee in integer cents. Final refund calculations must never produce a negative refund.';


-- ============================================================
-- SUPPORT COMPOSITE FK FOR BOAT LEGAL OFFERINGS
-- ============================================================
--
-- Allows a rate plan to reference an optional legal offering
-- while guaranteeing that the offering belongs to the same boat.
-- ============================================================

alter table public.boat_legal_offerings
  add constraint boat_legal_offerings_boat_id_id_key
  unique (boat_id, id);


-- ============================================================
-- BOAT RATE PLANS
-- ============================================================
--
-- Defines the base commercial price configuration for a boat.
--
-- Rate plans support two duration models:
--
-- FIXED
--
--   Example:
--       240 minutes = EUR 300
--
-- FLEXIBLE
--
--   Example:
--       first 60 minutes = EUR 100
--       each additional 60 minutes = EUR 80
--       maximum duration = 480 minutes
--
-- The currency is inherited from the operator workspace.
-- Confirmed bookings will later preserve their own immutable
-- currency and price snapshots.
--
-- legal_offering_id is nullable:
--
--   NULL  -> rate plan may apply independently of a specific
--            legal offering;
--
--   value -> rate plan applies to that specific legal offering.
-- ============================================================

create table public.boat_rate_plans (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  boat_id uuid not null,

  legal_offering_id uuid,

  cancellation_policy_id uuid,

  name text not null,
  code text,

  duration_mode public.rate_plan_duration_mode not null,

  base_duration_minutes integer not null,
  base_price_cents integer not null,

  duration_step_minutes integer,
  additional_step_price_cents integer,
  max_duration_minutes integer,

  valid_from date,
  valid_to date,

  priority integer not null default 100,

  is_default boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_rate_plans_operator_fk
    foreign key (
      operator_id
    )
    references public.operators(id)
    on delete cascade,

  constraint boat_rate_plans_boat_operator_fk
    foreign key (
      operator_id,
      boat_id
    )
    references public.boats(
      operator_id,
      id
    )
    on delete cascade,

  constraint boat_rate_plans_legal_offering_boat_fk
    foreign key (
      boat_id,
      legal_offering_id
    )
    references public.boat_legal_offerings(
      boat_id,
      id
    )
    on delete restrict,

  constraint boat_rate_plans_cancellation_policy_operator_fk
    foreign key (
      operator_id,
      cancellation_policy_id
    )
    references public.cancellation_policies(
      operator_id,
      id
    )
    on delete restrict,

  constraint boat_rate_plans_name_not_blank
    check (length(trim(name)) > 0),

  constraint boat_rate_plans_code_not_blank
    check (
      code is null
      or length(trim(code)) > 0
    ),

  constraint boat_rate_plans_base_duration_positive
    check (base_duration_minutes > 0),

  constraint boat_rate_plans_base_price_non_negative
    check (base_price_cents >= 0),

  constraint boat_rate_plans_priority_non_negative
    check (priority >= 0),

  constraint boat_rate_plans_validity_range
    check (
      valid_from is null
      or valid_to is null
      or valid_to >= valid_from
    ),

  constraint boat_rate_plans_duration_configuration
    check (
      (
        duration_mode = 'FIXED'
        and duration_step_minutes is null
        and additional_step_price_cents is null
        and max_duration_minutes is null
      )
      or
      (
        duration_mode = 'FLEXIBLE'
        and duration_step_minutes is not null
        and duration_step_minutes > 0
        and additional_step_price_cents is not null
        and additional_step_price_cents >= 0
        and max_duration_minutes is not null
        and max_duration_minutes > base_duration_minutes
        and (
          (
            max_duration_minutes - base_duration_minutes
          ) % duration_step_minutes
        ) = 0
      )
    )
);


create index boat_rate_plans_operator_id_idx
  on public.boat_rate_plans(operator_id);


create index boat_rate_plans_boat_id_idx
  on public.boat_rate_plans(boat_id);


create index boat_rate_plans_cancellation_policy_id_idx
  on public.boat_rate_plans(cancellation_policy_id);


create index boat_rate_plans_boat_active_idx
  on public.boat_rate_plans(
    boat_id,
    is_active
  );


create index boat_rate_plans_validity_idx
  on public.boat_rate_plans(
    valid_from,
    valid_to
  );


create unique index boat_rate_plans_unique_code_per_boat_idx
  on public.boat_rate_plans(
    boat_id,
    lower(code)
  )
  where code is not null;


create unique index boat_rate_plans_one_generic_default_per_boat_idx
  on public.boat_rate_plans(boat_id)
  where is_default = true
    and legal_offering_id is null;


create unique index boat_rate_plans_one_default_per_legal_offering_idx
  on public.boat_rate_plans(
    boat_id,
    legal_offering_id
  )
  where is_default = true
    and legal_offering_id is not null;


create trigger boat_rate_plans_set_updated_at
before update on public.boat_rate_plans
for each row
execute function public.set_updated_at();


comment on column public.boat_rate_plans.base_price_cents is
  'Base price in integer cents for base_duration_minutes.';


comment on column public.boat_rate_plans.additional_step_price_cents is
  'For FLEXIBLE plans, the additional price in cents for each duration_step_minutes beyond the base duration.';


-- ============================================================
-- BOAT PRICING RULES
-- ============================================================
--
-- Conditional adjustments applied to a boat rate plan.
--
-- Conditions may target:
--
--   - date ranges;
--   - weekdays;
--   - booking start-time windows;
--   - duration ranges.
--
-- Rules may:
--
--   - replace the calculated price;
--   - add/subtract a fixed amount;
--   - apply a percentage adjustment in basis points.
--
-- Overlapping rules are intentionally allowed because the
-- pricing engine will later resolve them through priority and
-- stackability.
--
-- Example:
--
--   August:
--       +20%
--
--   Saturday:
--       +10%
--
--   Ferragosto:
--       override price = EUR 500
-- ============================================================

create table public.boat_pricing_rules (
  id uuid primary key default gen_random_uuid(),

  rate_plan_id uuid not null
    references public.boat_rate_plans(id)
    on delete cascade,

  name text not null,

  valid_from date,
  valid_to date,

  weekdays smallint[],

  start_time_from time,
  start_time_to time,

  minimum_duration_minutes integer,
  maximum_duration_minutes integer,

  adjustment_type public.pricing_adjustment_type not null,

  price_override_cents integer,
  price_delta_cents integer,
  price_delta_bps integer,

  priority integer not null default 100,
  is_stackable boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_pricing_rules_name_not_blank
    check (length(trim(name)) > 0),

  constraint boat_pricing_rules_date_range
    check (
      valid_from is null
      or valid_to is null
      or valid_to >= valid_from
    ),

  constraint boat_pricing_rules_weekdays_valid
    check (
      weekdays is null
      or (
        cardinality(weekdays) > 0
        and weekdays <@
          array[1, 2, 3, 4, 5, 6, 7]::smallint[]
      )
    ),

  constraint boat_pricing_rules_time_window
    check (
      (
        start_time_from is null
        and start_time_to is null
      )
      or
      (
        start_time_from is not null
        and start_time_to is not null
        and start_time_to > start_time_from
      )
    ),

  constraint boat_pricing_rules_min_duration_positive
    check (
      minimum_duration_minutes is null
      or minimum_duration_minutes > 0
    ),

  constraint boat_pricing_rules_max_duration_positive
    check (
      maximum_duration_minutes is null
      or maximum_duration_minutes > 0
    ),

  constraint boat_pricing_rules_duration_range
    check (
      minimum_duration_minutes is null
      or maximum_duration_minutes is null
      or maximum_duration_minutes >= minimum_duration_minutes
    ),

  constraint boat_pricing_rules_priority_non_negative
    check (priority >= 0),

  constraint boat_pricing_rules_adjustment_configuration
    check (
      (
        adjustment_type = 'OVERRIDE_PRICE'
        and price_override_cents is not null
        and price_override_cents >= 0
        and price_delta_cents is null
        and price_delta_bps is null
      )
      or
      (
        adjustment_type = 'FIXED_DELTA'
        and price_override_cents is null
        and price_delta_cents is not null
        and price_delta_bps is null
      )
      or
      (
        adjustment_type = 'PERCENTAGE'
        and price_override_cents is null
        and price_delta_cents is null
        and price_delta_bps is not null
        and price_delta_bps between -10000 and 100000
      )
    )
);


create index boat_pricing_rules_rate_plan_id_idx
  on public.boat_pricing_rules(rate_plan_id);


create index boat_pricing_rules_rate_plan_active_idx
  on public.boat_pricing_rules(
    rate_plan_id,
    is_active
  );


create index boat_pricing_rules_priority_idx
  on public.boat_pricing_rules(
    rate_plan_id,
    priority
  );


create index boat_pricing_rules_date_idx
  on public.boat_pricing_rules(
    valid_from,
    valid_to
  );


create trigger boat_pricing_rules_set_updated_at
before update on public.boat_pricing_rules
for each row
execute function public.set_updated_at();


comment on column public.boat_pricing_rules.price_delta_bps is
  'Signed percentage adjustment in basis points. 1500 means +15%; -500 means -5%.';


comment on column public.boat_pricing_rules.is_stackable is
  'Indicates whether the pricing engine may combine this rule with other matching pricing rules.';


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
--
-- Tables remain default-deny through the Supabase Data API
-- until the explicit authorization grants and policies are
-- introduced in C6.
-- ============================================================

alter table public.cancellation_policies
  enable row level security;

alter table public.cancellation_policy_rules
  enable row level security;

alter table public.boat_rate_plans
  enable row level security;

alter table public.boat_pricing_rules
  enable row level security;


-- ============================================================
-- TABLE COMMENTS
-- ============================================================

comment on table public.cancellation_policies is
  'Reusable operator commercial cancellation policies. These policies do not replace statutory consumer-right analysis or dedicated weather/safety cancellation workflows.';

comment on table public.cancellation_policy_rules is
  'Non-overlapping cancellation refund windows measured in hours before booking start.';

comment on table public.boat_rate_plans is
  'Base pricing configurations for boats, optionally scoped to a legal offering and cancellation policy.';

comment on table public.boat_pricing_rules is
  'Conditional pricing adjustments for boat rate plans based on date, weekday, start time and/or duration.';


commit;