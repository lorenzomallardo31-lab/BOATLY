-- ============================================================
-- BOATLY
-- Migration: Marketplace Public Security Surface
-- ============================================================
--
-- Purpose:
--   Create the controlled public data surface used by the Boatly
--   marketplace without exposing raw operator/fleet tables.
--
-- Architecture:
--
--   private raw tables
--        ↓
--   eligibility helpers
--        ↓
--   SECURITY DEFINER public RPC projections
--        ↓
--   anon / authenticated marketplace consumers
--
-- Critical rule:
--
--   boats.status = ACTIVE
--
--   is NOT sufficient for marketplace publication.
--
-- Public supply requires:
--
--   - operator ACTIVE;
--   - latest operator verification APPROVED;
--   - boat ACTIVE;
--   - latest boat publication review APPROVED.
--
-- Raw operational, compliance, pricing-rule and occupancy data
-- remain private.
--
-- ============================================================

begin;


-- ============================================================
-- CURRENT REVIEW STATUS HELPERS
-- ============================================================


-- ------------------------------------------------------------
-- Current operator verification
--
-- Historical APPROVED reviews must not continue to authorize
-- publication after a newer review supersedes them.
-- ------------------------------------------------------------

create or replace function private.current_operator_verification_status(
  target_operator_id uuid
)
returns public.verification_review_status
language sql
stable
security definer
set search_path = ''
as $$
  select ov.status
  from public.operator_verifications ov
  where ov.operator_id = target_operator_id
  order by
    ov.submitted_at desc,
    ov.created_at desc,
    ov.id desc
  limit 1;
$$;


-- ------------------------------------------------------------
-- Current boat publication review
-- ------------------------------------------------------------

create or replace function private.current_boat_publication_status(
  target_boat_id uuid
)
returns public.verification_review_status
language sql
stable
security definer
set search_path = ''
as $$
  select br.status
  from public.boat_publication_reviews br
  where br.boat_id = target_boat_id
  order by
    br.submitted_at desc,
    br.created_at desc,
    br.id desc
  limit 1;
$$;


-- ============================================================
-- MARKETPLACE ELIGIBILITY HELPERS
-- ============================================================


create or replace function private.is_operator_marketplace_eligible(
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
    from public.operators o
    where o.id = target_operator_id
      and o.status = 'ACTIVE'::public.operator_status
      and private.current_operator_verification_status(o.id)
        = 'APPROVED'::public.verification_review_status
  );
$$;


create or replace function private.is_boat_marketplace_eligible(
  target_boat_id uuid
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
    where b.id = target_boat_id
      and b.status = 'ACTIVE'::public.boat_status

      and private.is_operator_marketplace_eligible(
        b.operator_id
      )

      and private.current_boat_publication_status(
        b.id
      ) = 'APPROVED'::public.verification_review_status
  );
$$;


-- ============================================================
-- PRIVATE HELPER PRIVILEGES
-- ============================================================
--
-- Marketplace clients do NOT need to call these directly.
-- They are implementation details used by trusted RPC functions.
-- ============================================================

revoke execute
on function private.current_operator_verification_status(uuid)
from public, anon, authenticated;

revoke execute
on function private.current_boat_publication_status(uuid)
from public, anon, authenticated;

revoke execute
on function private.is_operator_marketplace_eligible(uuid)
from public, anon, authenticated;

revoke execute
on function private.is_boat_marketplace_eligible(uuid)
from public, anon, authenticated;


-- ============================================================
-- HARDEN RAW MODERATION / VERIFICATION DATA
-- ============================================================

revoke all
on table
  public.operator_verifications,
  public.boat_publication_reviews,
  public.reviews
from anon;


-- ============================================================
-- PUBLIC MARKETPLACE OPERATOR PROJECTION
-- ============================================================
--
-- to_jsonb() is used intentionally for optional presentation
-- fields so that only explicitly allowlisted keys can ever be
-- returned.
--
-- No legal profile, VAT, PEC, verification notes or internal
-- status data is exposed.
-- ============================================================

create or replace function public.marketplace_operators()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id',
        o.id,

      'name',
        coalesce(
          j -> 'public_name',
          j -> 'display_name',
          j -> 'name'
        ),

      'slug',
        j -> 'slug',

      'description',
        coalesce(
          j -> 'public_description',
          j -> 'description'
        ),

      'country_code',
        j -> 'country_code',

      'timezone',
        j -> 'timezone',

      'logo_storage_path',
        j -> 'logo_storage_path'
    )
  )

  from public.operators o

  cross join lateral (
    select to_jsonb(o) as j
  ) data

  where private.is_operator_marketplace_eligible(
    o.id
  );
$$;


-- ============================================================
-- PUBLIC OPERATOR LOCATIONS
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
      'id',
        ol.id,

      'operator_id',
        ol.operator_id,

      'name',
        j -> 'name',

      'address_line_1',
        j -> 'address_line_1',

      'address_line_2',
        j -> 'address_line_2',

      'city',
        j -> 'city',

      'postal_code',
        j -> 'postal_code',

      'country_code',
        j -> 'country_code',

      'timezone',
        j -> 'timezone',

      'pickup_instructions',
        j -> 'pickup_instructions',

      'geo_point',
        j -> 'geo_point'
    )
  )

  from public.operator_locations ol

  cross join lateral (
    select to_jsonb(ol) as j
  ) data

  where private.is_operator_marketplace_eligible(
    ol.operator_id
  )

  and coalesce(
    (j ->> 'is_public')::boolean,
    false
  ) = true

  and coalesce(
    (j ->> 'is_active')::boolean,
    false
  ) = true;
$$;


-- ============================================================
-- PUBLIC BOATS
-- ============================================================
--
-- Deliberately excluded:
--
--   internal_code
--   registration identifiers
--   HIN
--   internal operational metadata
--   publication/compliance review details
-- ============================================================

create or replace function public.marketplace_boats()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id',
        b.id,

      'operator_id',
        b.operator_id,

      'primary_location_id',
        b.primary_location_id,

      'boat_type_id',
        b.boat_type_id,

      'name',
        j -> 'name',

      'slug',
        j -> 'slug',

      'short_description',
        j -> 'short_description',

      'description',
        j -> 'description',

      'manufacturer',
        j -> 'manufacturer',

      'model',
        j -> 'model',

      'year',
        coalesce(
          j -> 'year',
          j -> 'year_built'
        ),

      'length_m',
        j -> 'length_m',

      'beam_m',
        j -> 'beam_m',

      'technical_passenger_capacity',
        j -> 'technical_passenger_capacity',

      'operator_passenger_limit',
        j -> 'operator_passenger_limit',

      'cabins',
        j -> 'cabins',

      'berths',
        j -> 'berths',

      'bathrooms',
        j -> 'bathrooms',

      'engine_count',
        j -> 'engine_count',

      'engine_manufacturer',
        j -> 'engine_manufacturer',

      'engine_model',
        j -> 'engine_model',

      'engine_installation',
        j -> 'engine_installation',

      'engine_fuel_type',
        j -> 'engine_fuel_type',

      'engine_power_kw',
        j -> 'engine_power_kw',

      'engine_power_hp',
        j -> 'engine_power_hp',

      'engine_displacement_cc',
        j -> 'engine_displacement_cc',

      'max_speed_knots',
        j -> 'max_speed_knots',

      'license_required',
        j -> 'license_required'
    )
  )

  from public.boats b

  cross join lateral (
    select to_jsonb(b) as j
  ) data

  where private.is_boat_marketplace_eligible(
    b.id
  );
$$;


-- ============================================================
-- PUBLIC BOAT IMAGES
-- ============================================================

create or replace function public.marketplace_boat_images()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id',
        bi.id,

      'boat_id',
        bi.boat_id,

      'storage_path',
        j -> 'storage_path',

      'alt_text',
        j -> 'alt_text',

      'sort_order',
        j -> 'sort_order',

      'is_cover',
        j -> 'is_cover'
    )
  )

  from public.boat_images bi

  cross join lateral (
    select to_jsonb(bi) as j
  ) data

  where private.is_boat_marketplace_eligible(
    bi.boat_id
  );
$$;


-- ============================================================
-- PUBLIC LEGAL OFFERINGS
-- ============================================================
--
-- Legal offering and skipper mode remain separate concepts.
-- ============================================================

create or replace function public.marketplace_boat_legal_offerings()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id',
        blo.id,

      'boat_id',
        blo.boat_id,

      'legal_type',
        j -> 'legal_type',

      'skipper_mode',
        j -> 'skipper_mode',

      'self_drive_allowed',
        j -> 'self_drive_allowed',

      'minimum_driver_age',
        j -> 'minimum_driver_age'
    )
  )

  from public.boat_legal_offerings blo

  cross join lateral (
    select to_jsonb(blo) as j
  ) data

  where private.is_boat_marketplace_eligible(
    blo.boat_id
  )

  and coalesce(
    (j ->> 'is_active')::boolean,
    false
  ) = true;
$$;


-- ============================================================
-- PUBLIC BOAT AMENITY LINKS
-- ============================================================
--
-- Amenity taxonomy itself is already publicly readable through
-- C6.2.
-- ============================================================

create or replace function public.marketplace_boat_amenities()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'boat_id',
      ba.boat_id,

    'amenity_id',
      ba.amenity_id
  )

  from public.boat_amenities ba

  where private.is_boat_marketplace_eligible(
    ba.boat_id
  );
$$;


-- ============================================================
-- PUBLIC BOAT EXTRAS
-- ============================================================
--
-- Exposes only the effective marketplace-facing extra data.
--
-- Operator-internal relationships and unrelated extras remain
-- hidden.
-- ============================================================

create or replace function public.marketplace_boat_extras()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'boat_id',
        be.boat_id,

      'extra_id',
        be.extra_id,

      'name',
        ej -> 'name',

      'description',
        ej -> 'description',

      'pricing_unit',
        ej -> 'pricing_unit',

      'price_cents',
        to_jsonb(
          coalesce(
            nullif(
              bej ->> 'price_override_cents',
              ''
            )::integer,

            nullif(
              ej ->> 'price_cents',
              ''
            )::integer
          )
        ),

      'max_quantity',
        to_jsonb(
          coalesce(
            nullif(
              bej ->> 'max_quantity_override',
              ''
            )::integer,

            nullif(
              ej ->> 'max_quantity',
              ''
            )::integer
          )
        )
    )
  )

  from public.boat_extras be

  join public.extras e
    on e.id = be.extra_id

  cross join lateral (
    select to_jsonb(be) as bej
  ) boat_extra_data

  cross join lateral (
    select to_jsonb(e) as ej
  ) extra_data

  where private.is_boat_marketplace_eligible(
    be.boat_id
  )

  and coalesce(
    (ej ->> 'is_active')::boolean,
    false
  ) = true;
$$;


-- ============================================================
-- PUBLIC BASE RATE PLANS
-- ============================================================
--
-- This projection exposes public base pricing information only.
--
-- boat_pricing_rules remain private because final pricing must
-- be calculated by the trusted pricing engine.
-- ============================================================

create or replace function public.marketplace_boat_rate_plans()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id',
        rp.id,

      'boat_id',
        rp.boat_id,

      'legal_offering_id',
        j -> 'legal_offering_id',

      'name',
        j -> 'name',

      'duration_mode',
        j -> 'duration_mode',

      'base_duration_minutes',
        j -> 'base_duration_minutes',

      'base_price_cents',
        j -> 'base_price_cents',

      'duration_step_minutes',
        j -> 'duration_step_minutes',

      'additional_step_price_cents',
        j -> 'additional_step_price_cents',

      'max_duration_minutes',
        j -> 'max_duration_minutes',

      'valid_from',
        j -> 'valid_from',

      'valid_to',
        j -> 'valid_to'
    )
  )

  from public.boat_rate_plans rp

  cross join lateral (
    select to_jsonb(rp) as j
  ) data

  where private.is_boat_marketplace_eligible(
    rp.boat_id
  )

  and coalesce(
    (j ->> 'is_active')::boolean,
    false
  ) = true;
$$;


-- ============================================================
-- PUBLIC REVIEWS
-- ============================================================
--
-- Raw reviews are NOT directly exposed.
--
-- Deliberately excluded:
--
--   customer_user_id
--   booking_id
--   moderation_note
--   moderated_by
--   moderated_at
--
-- ============================================================

create or replace function public.marketplace_reviews()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'id',
        r.id,

      'operator_id',
        r.operator_id,

      'boat_id',
        r.boat_id,

      'rating',
        j -> 'rating',

      'title',
        j -> 'title',

      'body',
        j -> 'body',

      'operator_response',
        j -> 'operator_response',

      'responded_at',
        j -> 'responded_at',

      'submitted_at',
        j -> 'submitted_at',

      'published_at',
        j -> 'published_at'
    )
  )

  from public.reviews r

  cross join lateral (
    select to_jsonb(r) as j
  ) data

  where r.moderation_status =
    'PUBLISHED'::public.review_moderation_status

  and private.is_boat_marketplace_eligible(
    r.boat_id
  );
$$;


-- ============================================================
-- PUBLIC RPC PRIVILEGES
-- ============================================================
--
-- PostgreSQL functions may otherwise inherit EXECUTE for PUBLIC.
-- Remove it first, then explicitly allow only anon/authenticated.
-- ============================================================

revoke all
on function public.marketplace_operators()
from public;

revoke all
on function public.marketplace_operator_locations()
from public;

revoke all
on function public.marketplace_boats()
from public;

revoke all
on function public.marketplace_boat_images()
from public;

revoke all
on function public.marketplace_boat_legal_offerings()
from public;

revoke all
on function public.marketplace_boat_amenities()
from public;

revoke all
on function public.marketplace_boat_extras()
from public;

revoke all
on function public.marketplace_boat_rate_plans()
from public;

revoke all
on function public.marketplace_reviews()
from public;


grant execute
on function public.marketplace_operators()
to anon, authenticated;

grant execute
on function public.marketplace_operator_locations()
to anon, authenticated;

grant execute
on function public.marketplace_boats()
to anon, authenticated;

grant execute
on function public.marketplace_boat_images()
to anon, authenticated;

grant execute
on function public.marketplace_boat_legal_offerings()
to anon, authenticated;

grant execute
on function public.marketplace_boat_amenities()
to anon, authenticated;

grant execute
on function public.marketplace_boat_extras()
to anon, authenticated;

grant execute
on function public.marketplace_boat_rate_plans()
to anon, authenticated;

grant execute
on function public.marketplace_reviews()
to anon, authenticated;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on function private.current_operator_verification_status(uuid) is
  'Returns the most recent operator verification status. Historical approvals do not independently authorize marketplace publication.';


comment on function private.current_boat_publication_status(uuid) is
  'Returns the most recent boat publication-review status. Historical approvals do not independently authorize marketplace publication.';


comment on function private.is_operator_marketplace_eligible(uuid) is
  'Returns true only when an operator is ACTIVE and its latest verification review is APPROVED.';


comment on function private.is_boat_marketplace_eligible(uuid) is
  'Returns true only when the boat is ACTIVE, its operator is marketplace-eligible, and the latest boat publication review is APPROVED.';


comment on function public.marketplace_boats() is
  'Public-safe Boatly marketplace boat projection. Raw boats remain protected by RLS.';


comment on function public.marketplace_reviews() is
  'Public-safe projection of PUBLISHED reviews for currently marketplace-eligible boats.';


commit;