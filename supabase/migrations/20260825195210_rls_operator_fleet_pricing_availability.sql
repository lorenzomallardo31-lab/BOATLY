-- ============================================================
-- BOATLY
-- Migration: Operator, Fleet, Pricing & Availability RLS
-- ============================================================
--
-- Purpose:
--   Introduce Row Level Security policies and explicit table
--   privileges for:
--
--   - operator legal/location data;
--   - public marketplace taxonomies;
--   - fleet catalog;
--   - pricing/cancellation configuration;
--   - recurring availability;
--   - concrete boat occupancies.
--
-- Authorization model:
--
--   OWNER / MANAGER
--     -> manage operational operator resources.
--
--   EMPLOYEE / SKIPPER
--     -> read operational resources only for now.
--
--   Platform users
--     -> internal read access.
--
--   anon
--     -> only active public taxonomies.
--
-- Important:
--   Customer marketplace access to boats, images, pricing and
--   availability is NOT introduced here. It will use publication
--   and marketplace-specific rules in a later RLS batch.
--
-- ============================================================

begin;


-- ============================================================
-- RESOURCE → OPERATOR LOOKUP HELPERS
-- ============================================================
--
-- Several child tables do not directly contain operator_id.
--
-- These SECURITY DEFINER helpers resolve ownership without
-- causing recursive RLS evaluation through the parent tables.
-- ============================================================


create or replace function private.location_operator_id(
  target_location_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ol.operator_id
  from public.operator_locations ol
  where ol.id = target_location_id;
$$;


create or replace function private.boat_operator_id(
  target_boat_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.operator_id
  from public.boats b
  where b.id = target_boat_id;
$$;


create or replace function private.cancellation_policy_operator_id(
  target_policy_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cp.operator_id
  from public.cancellation_policies cp
  where cp.id = target_policy_id;
$$;


create or replace function private.rate_plan_operator_id(
  target_rate_plan_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select rp.operator_id
  from public.boat_rate_plans rp
  where rp.id = target_rate_plan_id;
$$;


-- ============================================================
-- HELPER PRIVILEGES
-- ============================================================

revoke execute
on function private.location_operator_id(uuid)
from public, anon;

revoke execute
on function private.boat_operator_id(uuid)
from public, anon;

revoke execute
on function private.cancellation_policy_operator_id(uuid)
from public, anon;

revoke execute
on function private.rate_plan_operator_id(uuid)
from public, anon;


grant execute
on function private.location_operator_id(uuid)
to authenticated;

grant execute
on function private.boat_operator_id(uuid)
to authenticated;

grant execute
on function private.cancellation_policy_operator_id(uuid)
to authenticated;

grant execute
on function private.rate_plan_operator_id(uuid)
to authenticated;


-- ============================================================
-- RESET TABLE PRIVILEGES
-- ============================================================
--
-- RLS alone is not our only security layer.
--
-- We first remove Data API privileges and grant back only the
-- operations explicitly required by Boatly.
-- ============================================================

revoke all
on table
  public.operator_legal_profiles,
  public.operator_locations,
  public.location_opening_hours,
  public.destinations,
  public.boat_types,
  public.boats,
  public.boat_legal_offerings,
  public.boat_images,
  public.amenities,
  public.boat_amenities,
  public.extras,
  public.boat_extras,
  public.cancellation_policies,
  public.cancellation_policy_rules,
  public.boat_rate_plans,
  public.boat_pricing_rules,
  public.boat_availability_rules,
  public.boat_occupancies
from anon, authenticated;


-- ============================================================
-- PUBLIC TAXONOMY PRIVILEGES
-- ============================================================

grant select
on table
  public.destinations,
  public.boat_types,
  public.amenities
to anon, authenticated;


-- ============================================================
-- CORE OPERATOR RESOURCE PRIVILEGES
-- ============================================================
--
-- No physical DELETE permission for these resources.
--
-- They use status/is_active/history-preserving workflows.
-- ============================================================

grant select, insert, update
on table
  public.operator_legal_profiles,
  public.operator_locations,
  public.boats,
  public.boat_legal_offerings,
  public.extras,
  public.cancellation_policies,
  public.boat_rate_plans,
  public.boat_pricing_rules,
  public.boat_availability_rules,
  public.boat_occupancies
to authenticated;


-- ============================================================
-- REPLACEABLE / ASSOCIATION RESOURCE PRIVILEGES
-- ============================================================
--
-- Physical deletion is permitted only where the row is naturally
-- replaceable or represents a removable association/configuration
-- row.
-- ============================================================

grant select, insert, update, delete
on table
  public.location_opening_hours,
  public.boat_images,
  public.boat_amenities,
  public.boat_extras,
  public.cancellation_policy_rules
to authenticated;


-- ============================================================
-- PUBLIC TAXONOMY RLS
-- ============================================================
--
-- Anonymous and authenticated marketplace users see only active
-- taxonomy values.
--
-- Platform users may inspect inactive taxonomy values too.
-- ============================================================


-- ------------------------------------------------------------
-- destinations
-- ------------------------------------------------------------

create policy destinations_select_active_public
on public.destinations
for select
to anon, authenticated
using (
  is_active = true
);


create policy destinations_select_platform_all
on public.destinations
for select
to authenticated
using (
  (select private.is_platform_user())
);


-- ------------------------------------------------------------
-- boat_types
-- ------------------------------------------------------------

create policy boat_types_select_active_public
on public.boat_types
for select
to anon, authenticated
using (
  is_active = true
);


create policy boat_types_select_platform_all
on public.boat_types
for select
to authenticated
using (
  (select private.is_platform_user())
);


-- ------------------------------------------------------------
-- amenities
-- ------------------------------------------------------------

create policy amenities_select_active_public
on public.amenities
for select
to anon, authenticated
using (
  is_active = true
);


create policy amenities_select_platform_all
on public.amenities
for select
to authenticated
using (
  (select private.is_platform_user())
);


-- ============================================================
-- OPERATOR LEGAL PROFILE
-- ============================================================
--
-- Sensitive legal/company information.
--
-- OWNER:
--   read + manage.
--
-- MANAGER:
--   read only.
--
-- Selected Boatly internal roles:
--   read only.
-- ============================================================

create policy operator_legal_profiles_select_internal
on public.operator_legal_profiles
for select
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )

  or private.has_platform_role(
    array[
      'SUPER_ADMIN'::public.platform_role,
      'ADMIN'::public.platform_role,
      'FINANCE'::public.platform_role,
      'COMPLIANCE'::public.platform_role
    ]
  )
);


create policy operator_legal_profiles_manage_owner
on public.operator_legal_profiles
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- OPERATOR LOCATIONS
-- ============================================================

create policy operator_locations_select_internal
on public.operator_locations
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy operator_locations_manage
on public.operator_locations
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- LOCATION OPENING HOURS
-- ============================================================

create policy location_opening_hours_select_internal
on public.location_opening_hours
for select
to authenticated
using (
  private.is_operator_member(
    private.location_operator_id(
      operator_location_id
    )
  )

  or (select private.is_platform_user())
);


create policy location_opening_hours_manage
on public.location_opening_hours
for all
to authenticated
using (
  private.has_operator_role(
    private.location_operator_id(
      operator_location_id
    ),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    private.location_operator_id(
      operator_location_id
    ),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOATS
-- ============================================================

create policy boats_select_internal
on public.boats
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy boats_manage
on public.boats
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT LEGAL OFFERINGS
-- ============================================================
--
-- Operational skipper assignment remains separate from legal
-- offering type.
-- ============================================================

create policy boat_legal_offerings_select_internal
on public.boat_legal_offerings
for select
to authenticated
using (
  private.is_operator_member(
    private.boat_operator_id(boat_id)
  )

  or (select private.is_platform_user())
);


create policy boat_legal_offerings_manage
on public.boat_legal_offerings
for all
to authenticated
using (
  private.has_operator_role(
    private.boat_operator_id(boat_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    private.boat_operator_id(boat_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT IMAGES
-- ============================================================

create policy boat_images_select_internal
on public.boat_images
for select
to authenticated
using (
  private.is_operator_member(
    private.boat_operator_id(boat_id)
  )

  or (select private.is_platform_user())
);


create policy boat_images_manage
on public.boat_images
for all
to authenticated
using (
  private.has_operator_role(
    private.boat_operator_id(boat_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    private.boat_operator_id(boat_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT AMENITIES
-- ============================================================

create policy boat_amenities_select_internal
on public.boat_amenities
for select
to authenticated
using (
  private.is_operator_member(
    private.boat_operator_id(boat_id)
  )

  or (select private.is_platform_user())
);


create policy boat_amenities_manage
on public.boat_amenities
for all
to authenticated
using (
  private.has_operator_role(
    private.boat_operator_id(boat_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    private.boat_operator_id(boat_id),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- EXTRAS
-- ============================================================

create policy extras_select_internal
on public.extras
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy extras_manage
on public.extras
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT EXTRAS
-- ============================================================

create policy boat_extras_select_internal
on public.boat_extras
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy boat_extras_manage
on public.boat_extras
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- CANCELLATION POLICIES
-- ============================================================

create policy cancellation_policies_select_internal
on public.cancellation_policies
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy cancellation_policies_manage
on public.cancellation_policies
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- CANCELLATION POLICY RULES
-- ============================================================

create policy cancellation_policy_rules_select_internal
on public.cancellation_policy_rules
for select
to authenticated
using (
  private.is_operator_member(
    private.cancellation_policy_operator_id(
      cancellation_policy_id
    )
  )

  or (select private.is_platform_user())
);


create policy cancellation_policy_rules_manage
on public.cancellation_policy_rules
for all
to authenticated
using (
  private.has_operator_role(
    private.cancellation_policy_operator_id(
      cancellation_policy_id
    ),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    private.cancellation_policy_operator_id(
      cancellation_policy_id
    ),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT RATE PLANS
-- ============================================================

create policy boat_rate_plans_select_internal
on public.boat_rate_plans
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy boat_rate_plans_manage
on public.boat_rate_plans
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT PRICING RULES
-- ============================================================

create policy boat_pricing_rules_select_internal
on public.boat_pricing_rules
for select
to authenticated
using (
  private.is_operator_member(
    private.rate_plan_operator_id(
      rate_plan_id
    )
  )

  or (select private.is_platform_user())
);


create policy boat_pricing_rules_manage
on public.boat_pricing_rules
for all
to authenticated
using (
  private.has_operator_role(
    private.rate_plan_operator_id(
      rate_plan_id
    ),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    private.rate_plan_operator_id(
      rate_plan_id
    ),
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT AVAILABILITY RULES
-- ============================================================

create policy boat_availability_rules_select_internal
on public.boat_availability_rules
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy boat_availability_rules_manage
on public.boat_availability_rules
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- BOAT OCCUPANCIES
-- ============================================================
--
-- OWNER / MANAGER may manage operator-originated occupancies.
--
-- No direct DELETE grant is provided.
--
-- Marketplace checkout HOLD/BOOKING creation will later use
-- trusted server-side booking workflows rather than arbitrary
-- customer writes directly to this table.
-- ============================================================

create policy boat_occupancies_select_internal
on public.boat_occupancies
for select
to authenticated
using (
  private.is_operator_member(operator_id)
  or (select private.is_platform_user())
);


create policy boat_occupancies_manage
on public.boat_occupancies
for all
to authenticated
using (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
)
with check (
  private.has_operator_role(
    operator_id,
    array[
      'OWNER'::public.operator_member_role,
      'MANAGER'::public.operator_member_role
    ]
  )
);


-- ============================================================
-- COMMENTS
-- ============================================================

comment on function private.location_operator_id(uuid) is
  'Trusted RLS helper resolving the operator owning an operator location.';


comment on function private.boat_operator_id(uuid) is
  'Trusted RLS helper resolving the operator owning a boat.';


comment on function private.cancellation_policy_operator_id(uuid) is
  'Trusted RLS helper resolving the operator owning a cancellation policy.';


comment on function private.rate_plan_operator_id(uuid) is
  'Trusted RLS helper resolving the operator owning a boat rate plan.';


commit;