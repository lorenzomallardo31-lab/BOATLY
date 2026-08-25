-- ============================================================
-- BOATLY
-- Migration: Operator Legal Profiles, Locations & Destinations
-- ============================================================
--
-- Purpose:
--   Extend the operator workspace foundation with:
--
--   - operator legal/company data;
--   - physical and operational locations;
--   - recurring location opening hours;
--   - Boatly marketplace destinations.
--
-- Security:
--   Row Level Security is enabled immediately.
--   Authorization policies remain deferred to C6.
--
-- Geography:
--   Geographic points use PostGIS geography(Point, 4326).
-- ============================================================

begin;


-- ============================================================
-- OPERATOR LEGAL PROFILES
-- ============================================================
--
-- One legal profile per operator workspace.
--
-- This table stores declared legal/company information.
--
-- It does NOT represent verification status.
-- Verification and compliance workflows are modeled separately.
--
-- Fields are intentionally nullable where appropriate so the
-- operator onboarding flow can be saved progressively.
-- ============================================================

create table public.operator_legal_profiles (
  operator_id uuid primary key
    references public.operators(id)
    on delete cascade,

  legal_name text,
  legal_form text,

  vat_number text,
  tax_code text,

  business_register_number text,
  rea_number text,

  pec_email text,
  sdi_code text,

  registered_address_line_1 text,
  registered_address_line_2 text,
  registered_city text,
  registered_administrative_area text,
  registered_postal_code text,
  registered_country_code text not null default 'IT',

  legal_representative_first_name text,
  legal_representative_last_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operator_legal_profiles_legal_name_not_blank
    check (
      legal_name is null
      or length(trim(legal_name)) > 0
    ),

  constraint operator_legal_profiles_legal_form_not_blank
    check (
      legal_form is null
      or length(trim(legal_form)) > 0
    ),

  constraint operator_legal_profiles_vat_number_not_blank
    check (
      vat_number is null
      or length(trim(vat_number)) > 0
    ),

  constraint operator_legal_profiles_tax_code_not_blank
    check (
      tax_code is null
      or length(trim(tax_code)) > 0
    ),

  constraint operator_legal_profiles_pec_email_lowercase
    check (
      pec_email is null
      or pec_email = lower(pec_email)
    ),

  constraint operator_legal_profiles_pec_email_not_blank
    check (
      pec_email is null
      or length(trim(pec_email)) > 0
    ),

  constraint operator_legal_profiles_country_code_format
    check (
      registered_country_code = upper(registered_country_code)
      and length(registered_country_code) = 2
    )
);


create trigger operator_legal_profiles_set_updated_at
before update on public.operator_legal_profiles
for each row
execute function public.set_updated_at();


-- ============================================================
-- OPERATOR LOCATIONS
-- ============================================================
--
-- Physical / operational locations belonging to an operator.
--
-- Examples:
--   - rental base;
--   - marina;
--   - pickup point;
--   - operational office.
--
-- A location may exist before geocoding is completed.
-- Geographic coordinates therefore remain nullable until the
-- relevant publication/compliance workflow requires them.
-- ============================================================

create table public.operator_locations (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  name text not null,

  address_line_1 text,
  address_line_2 text,

  city text,
  administrative_area text,
  postal_code text,

  country_code text not null default 'IT',
  timezone text not null default 'Europe/Rome',

  geo_point extensions.geography(Point, 4326),

  phone text,
  email text,

  pickup_instructions text,

  is_primary boolean not null default false,
  is_public boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operator_locations_name_not_blank
    check (length(trim(name)) > 0),

  constraint operator_locations_country_code_format
    check (
      country_code = upper(country_code)
      and length(country_code) = 2
    ),

  constraint operator_locations_timezone_not_blank
    check (length(trim(timezone)) > 0),

  constraint operator_locations_email_lowercase
    check (
      email is null
      or email = lower(email)
    ),

  constraint operator_locations_email_not_blank
    check (
      email is null
      or length(trim(email)) > 0
    )
);


create index operator_locations_operator_id_idx
  on public.operator_locations(operator_id);


create index operator_locations_operator_active_idx
  on public.operator_locations(
    operator_id,
    is_active
  );


create index operator_locations_geo_point_gist_idx
  on public.operator_locations
  using gist (geo_point);


create unique index operator_locations_unique_name_per_operator_idx
  on public.operator_locations(
    operator_id,
    lower(name)
  );


create unique index operator_locations_one_primary_per_operator_idx
  on public.operator_locations(operator_id)
  where is_primary = true;


create trigger operator_locations_set_updated_at
before update on public.operator_locations
for each row
execute function public.set_updated_at();


-- ============================================================
-- LOCATION OPENING HOURS
-- ============================================================
--
-- Recurring weekly opening hours for an operator location.
--
-- ISO weekday convention:
--
--   1 = Monday
--   2 = Tuesday
--   3 = Wednesday
--   4 = Thursday
--   5 = Friday
--   6 = Saturday
--   7 = Sunday
--
-- Multiple non-overlapping time intervals per day can be stored,
-- allowing patterns such as:
--
--   09:00 - 13:00
--   15:00 - 19:00
--
-- A closed day is represented by one row with:
--
--   is_closed = true
--   opens_at  = null
--   closes_at = null
-- ============================================================

create table public.location_opening_hours (
  id uuid primary key default gen_random_uuid(),

  operator_location_id uuid not null
    references public.operator_locations(id)
    on delete cascade,

  weekday smallint not null,

  opens_at time,
  closes_at time,

  is_closed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint location_opening_hours_weekday_range
    check (
      weekday between 1 and 7
    ),

  constraint location_opening_hours_time_consistency
    check (
      (
        is_closed = true
        and opens_at is null
        and closes_at is null
      )
      or
      (
        is_closed = false
        and opens_at is not null
        and closes_at is not null
        and closes_at > opens_at
      )
    )
);


create index location_opening_hours_location_idx
  on public.location_opening_hours(operator_location_id);


create index location_opening_hours_location_weekday_idx
  on public.location_opening_hours(
    operator_location_id,
    weekday
  );


create unique index location_opening_hours_unique_closed_day_idx
  on public.location_opening_hours(
    operator_location_id,
    weekday
  )
  where is_closed = true;


create unique index location_opening_hours_unique_interval_idx
  on public.location_opening_hours(
    operator_location_id,
    weekday,
    opens_at,
    closes_at
  )
  where is_closed = false;


create trigger location_opening_hours_set_updated_at
before update on public.location_opening_hours
for each row
execute function public.set_updated_at();


-- ============================================================
-- DESTINATIONS
-- ============================================================
--
-- Boatly-curated marketplace destinations.
--
-- Destinations are independent from operator locations.
--
-- Examples:
--   Capri
--   Ischia
--   Amalfi
--   Positano
--
-- They provide geographic anchors for marketplace discovery,
-- landing pages, search and future SEO.
-- ============================================================

create table public.destinations (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null unique,

  country_code text not null default 'IT',
  administrative_area text,

  center_point extensions.geography(Point, 4326) not null,

  search_radius_meters integer not null default 25000,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint destinations_name_not_blank
    check (length(trim(name)) > 0),

  constraint destinations_slug_format
    check (
      slug = lower(slug)
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),

  constraint destinations_country_code_format
    check (
      country_code = upper(country_code)
      and length(country_code) = 2
    ),

  constraint destinations_search_radius_positive
    check (search_radius_meters > 0),

  constraint destinations_sort_order_non_negative
    check (sort_order >= 0)
);


create index destinations_active_sort_idx
  on public.destinations(
    is_active,
    sort_order
  );


create index destinations_center_point_gist_idx
  on public.destinations
  using gist (center_point);


create trigger destinations_set_updated_at
before update on public.destinations
for each row
execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.operator_legal_profiles
  enable row level security;

alter table public.operator_locations
  enable row level security;

alter table public.location_opening_hours
  enable row level security;

alter table public.destinations
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.operator_legal_profiles is
  'Declared legal and company data for an operator workspace. Verification state is modeled separately.';

comment on table public.operator_locations is
  'Physical and operational locations belonging to professional rental operators.';

comment on column public.operator_locations.geo_point is
  'PostGIS geographic point in WGS84 / SRID 4326.';

comment on table public.location_opening_hours is
  'Recurring weekly opening intervals for operator locations using ISO weekdays 1-7.';

comment on table public.destinations is
  'Boatly-curated geographic destinations used for marketplace discovery and search.';

comment on column public.destinations.center_point is
  'PostGIS geographic center point in WGS84 / SRID 4326.';


commit;