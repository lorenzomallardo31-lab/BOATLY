-- ============================================================
-- BOATLY
-- Migration: Fleet Catalog Foundation
-- ============================================================
--
-- Purpose:
--   Create the core fleet/catalog structures for:
--
--   - boat taxonomy;
--   - physical boat records;
--   - legal offering configurations;
--   - boat images;
--   - amenities;
--   - operator extras;
--   - boat-to-amenity associations;
--   - boat-to-extra associations.
--
-- Security:
--   Row Level Security is enabled immediately.
--   Authorization policies remain deferred to C6.
--
-- Important legal architecture:
--
--   1. A boat's legal offering is separate from skipper mode.
--   2. license_required is declarative/reference data only.
--      It is NOT the legal eligibility source of truth.
--   3. Final driver eligibility will be determined by a
--      dedicated rule engine using the relevant boat, engine,
--      legal offering, navigation and customer facts.
--   4. Effective passenger capacity must later use the strictest
--      applicable technical, operator and legal limit.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================


-- ------------------------------------------------------------
-- Boat record lifecycle
-- ------------------------------------------------------------
--
-- This describes the operator's fleet record lifecycle.
--
-- It does NOT represent Boatly publication/compliance approval.
-- Publication review is modeled separately.
-- ------------------------------------------------------------

create type public.boat_status as enum (
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED'
);


-- ------------------------------------------------------------
-- Legal offering
-- ------------------------------------------------------------

create type public.boat_legal_offering_type as enum (
  'LOCAZIONE',
  'LOCAZIONE_WITH_COMMANDER',
  'NOLEGGIO'
);


-- ------------------------------------------------------------
-- Skipper / commander commercial mode
-- ------------------------------------------------------------
--
-- This enum must never be used by itself to infer the legal
-- contract type.
-- ------------------------------------------------------------

create type public.skipper_service_mode as enum (
  'NOT_AVAILABLE',
  'OPTIONAL',
  'INCLUDED',
  'REQUIRED'
);


-- ------------------------------------------------------------
-- Extra pricing unit
-- ------------------------------------------------------------

create type public.extra_pricing_unit as enum (
  'FIXED',
  'PER_PERSON',
  'PER_HOUR',
  'PER_DAY',
  'PER_UNIT'
);


-- ============================================================
-- BOAT TYPES
-- ============================================================
--
-- Platform-controlled taxonomy used by marketplace filters.
--
-- Examples may later include:
--   RIB
--   MOTORBOAT
--   SAILBOAT
--   CATAMARAN
--   YACHT
--
-- Actual catalog rows are data and will be seeded separately.
-- ============================================================

create table public.boat_types (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,
  slug text not null unique,

  description text,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_types_code_format
    check (
      code = upper(code)
      and code ~ '^[A-Z0-9_]+$'
    ),

  constraint boat_types_name_not_blank
    check (length(trim(name)) > 0),

  constraint boat_types_slug_format
    check (
      slug = lower(slug)
      and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),

  constraint boat_types_sort_order_non_negative
    check (sort_order >= 0)
);


create index boat_types_active_sort_idx
  on public.boat_types(
    is_active,
    sort_order
  );


create trigger boat_types_set_updated_at
before update on public.boat_types
for each row
execute function public.set_updated_at();


-- ============================================================
-- SUPPORT COMPOSITE FK FOR OPERATOR LOCATIONS
-- ============================================================
--
-- The composite key lets boats reference a location belonging
-- to the SAME operator.
--
-- Without this constraint, a programming error could associate
-- Operator A's boat with Operator B's location.
-- ============================================================

alter table public.operator_locations
  add constraint operator_locations_operator_id_id_key
  unique (operator_id, id);


-- ============================================================
-- BOATS
-- ============================================================
--
-- Physical units belonging to a professional operator.
--
-- Boats may be saved progressively as DRAFT records.
--
-- Publication eligibility is intentionally NOT encoded only by
-- boat.status. A separate Boatly publication/compliance review
-- workflow will determine whether the unit may go live.
-- ============================================================

create table public.boats (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  primary_location_id uuid,

  boat_type_id uuid
    references public.boat_types(id)
    on delete restrict,

  status public.boat_status not null default 'DRAFT',

  internal_code text,

  name text not null,
  slug text,

  short_description text,
  description text,

  manufacturer text,
  model text,
  manufacture_year integer,

  registration_number text,
  registration_country_code text,

  hull_identification_number text,

  length_cm integer,
  beam_cm integer,
  draft_cm integer,

  technical_passenger_capacity smallint,
  operator_passenger_limit smallint,

  cabins smallint,
  berths smallint,
  bathrooms smallint,

  engine_count smallint,

  engine_manufacturer text,
  engine_model text,

  engine_installation text,
  engine_fuel_type text,
  engine_combustion_cycle smallint,
  engine_direct_injection boolean,

  engine_power_kw numeric(8, 2),
  engine_power_hp numeric(8, 2),
  engine_displacement_cc integer,

  max_speed_knots numeric(6, 2),

  license_required boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boats_operator_location_fk
    foreign key (
      operator_id,
      primary_location_id
    )
    references public.operator_locations(
      operator_id,
      id
    )
    on delete restrict,

  constraint boats_name_not_blank
    check (length(trim(name)) > 0),

  constraint boats_internal_code_not_blank
    check (
      internal_code is null
      or length(trim(internal_code)) > 0
    ),

  constraint boats_slug_format
    check (
      slug is null
      or (
        slug = lower(slug)
        and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      )
    ),

  constraint boats_manufacture_year_range
    check (
      manufacture_year is null
      or manufacture_year between 1900 and 2100
    ),

  constraint boats_registration_country_code_format
    check (
      registration_country_code is null
      or (
        registration_country_code =
          upper(registration_country_code)
        and length(registration_country_code) = 2
      )
    ),

  constraint boats_length_positive
    check (
      length_cm is null
      or length_cm > 0
    ),

  constraint boats_beam_positive
    check (
      beam_cm is null
      or beam_cm > 0
    ),

  constraint boats_draft_non_negative
    check (
      draft_cm is null
      or draft_cm >= 0
    ),

  constraint boats_technical_capacity_positive
    check (
      technical_passenger_capacity is null
      or technical_passenger_capacity > 0
    ),

  constraint boats_operator_capacity_positive
    check (
      operator_passenger_limit is null
      or operator_passenger_limit > 0
    ),

  constraint boats_operator_capacity_not_above_technical
    check (
      technical_passenger_capacity is null
      or operator_passenger_limit is null
      or operator_passenger_limit <= technical_passenger_capacity
    ),

  constraint boats_cabins_non_negative
    check (
      cabins is null
      or cabins >= 0
    ),

  constraint boats_berths_non_negative
    check (
      berths is null
      or berths >= 0
    ),

  constraint boats_bathrooms_non_negative
    check (
      bathrooms is null
      or bathrooms >= 0
    ),

  constraint boats_engine_count_non_negative
    check (
      engine_count is null
      or engine_count >= 0
    ),

  constraint boats_engine_combustion_cycle
    check (
      engine_combustion_cycle is null
      or engine_combustion_cycle in (2, 4)
    ),

  constraint boats_engine_power_kw_non_negative
    check (
      engine_power_kw is null
      or engine_power_kw >= 0
    ),

  constraint boats_engine_power_hp_non_negative
    check (
      engine_power_hp is null
      or engine_power_hp >= 0
    ),

  constraint boats_engine_displacement_non_negative
    check (
      engine_displacement_cc is null
      or engine_displacement_cc >= 0
    ),

  constraint boats_max_speed_non_negative
    check (
      max_speed_knots is null
      or max_speed_knots >= 0
    )
);


create index boats_operator_id_idx
  on public.boats(operator_id);


create index boats_boat_type_id_idx
  on public.boats(boat_type_id);


create index boats_primary_location_id_idx
  on public.boats(primary_location_id);


create index boats_operator_status_idx
  on public.boats(
    operator_id,
    status
  );


create unique index boats_unique_internal_code_per_operator_idx
  on public.boats(
    operator_id,
    lower(internal_code)
  )
  where internal_code is not null;


create unique index boats_unique_slug_per_operator_idx
  on public.boats(
    operator_id,
    lower(slug)
  )
  where slug is not null;


create trigger boats_set_updated_at
before update on public.boats
for each row
execute function public.set_updated_at();


comment on column public.boats.license_required is
  'Operator/reference declaration only. This field is not the legal source of truth for driver eligibility.';


comment on column public.boats.technical_passenger_capacity is
  'Technical declared passenger capacity. Effective marketplace capacity must also consider applicable legal and operator limits.';


comment on column public.boats.operator_passenger_limit is
  'Optional operator-imposed passenger limit. Effective marketplace capacity must use the strictest applicable limit.';


-- Composite key used to enforce operator consistency in
-- operator-owned child associations.

alter table public.boats
  add constraint boats_operator_id_id_key
  unique (operator_id, id);


-- ============================================================
-- BOAT LEGAL OFFERINGS
-- ============================================================
--
-- One physical boat can support multiple legal offering modes.
--
-- Legal offering type and skipper/commander service mode remain
-- intentionally separate.
--
-- Driver eligibility must be calculated later by a dedicated
-- rule engine and must NOT rely only on license_required,
-- skipper_mode or legal_type.
-- ============================================================

create table public.boat_legal_offerings (
  id uuid primary key default gen_random_uuid(),

  boat_id uuid not null
    references public.boats(id)
    on delete cascade,

  legal_type public.boat_legal_offering_type not null,

  skipper_mode public.skipper_service_mode not null
    default 'NOT_AVAILABLE',

  self_drive_allowed boolean not null default false,

  minimum_driver_age smallint,

  navigation_limit_notes text,
  eligibility_notes text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_legal_offerings_minimum_driver_age
    check (
      minimum_driver_age is null
      or minimum_driver_age >= 18
    ),

  constraint boat_legal_offerings_self_drive_consistency
    check (
      self_drive_allowed = true
      or minimum_driver_age is null
    )
);


create unique index boat_legal_offerings_unique_type_per_boat_idx
  on public.boat_legal_offerings(
    boat_id,
    legal_type
  );


create index boat_legal_offerings_boat_active_idx
  on public.boat_legal_offerings(
    boat_id,
    is_active
  );


create trigger boat_legal_offerings_set_updated_at
before update on public.boat_legal_offerings
for each row
execute function public.set_updated_at();


-- ============================================================
-- BOAT IMAGES
-- ============================================================
--
-- Metadata for media stored in Supabase Storage.
--
-- The actual image binary is NOT stored in PostgreSQL.
--
-- storage_path is the path inside the Boatly boat-images bucket.
-- ============================================================

create table public.boat_images (
  id uuid primary key default gen_random_uuid(),

  boat_id uuid not null
    references public.boats(id)
    on delete cascade,

  storage_path text not null,

  alt_text text,

  sort_order integer not null default 0,

  is_cover boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_images_storage_path_not_blank
    check (length(trim(storage_path)) > 0),

  constraint boat_images_alt_text_not_blank
    check (
      alt_text is null
      or length(trim(alt_text)) > 0
    ),

  constraint boat_images_sort_order_non_negative
    check (sort_order >= 0)
);


create unique index boat_images_storage_path_unique_idx
  on public.boat_images(storage_path);


create index boat_images_boat_sort_idx
  on public.boat_images(
    boat_id,
    sort_order
  );


create unique index boat_images_one_cover_per_boat_idx
  on public.boat_images(boat_id)
  where is_cover = true;


create trigger boat_images_set_updated_at
before update on public.boat_images
for each row
execute function public.set_updated_at();


comment on column public.boat_images.storage_path is
  'Object path inside the Boatly boat-images Supabase Storage bucket.';


-- ============================================================
-- AMENITIES
-- ============================================================
--
-- Platform-controlled reusable amenity catalog.
--
-- Examples may later include:
--   GPS
--   SHOWER
--   SUNSHADE
--   BLUETOOTH
--   FRIDGE
--
-- Actual catalog rows are seeded separately.
-- ============================================================

create table public.amenities (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,

  category text,
  icon_name text,

  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint amenities_code_format
    check (
      code = upper(code)
      and code ~ '^[A-Z0-9_]+$'
    ),

  constraint amenities_name_not_blank
    check (length(trim(name)) > 0),

  constraint amenities_category_not_blank
    check (
      category is null
      or length(trim(category)) > 0
    ),

  constraint amenities_icon_name_not_blank
    check (
      icon_name is null
      or length(trim(icon_name)) > 0
    ),

  constraint amenities_sort_order_non_negative
    check (sort_order >= 0)
);


create index amenities_active_sort_idx
  on public.amenities(
    is_active,
    sort_order
  );


create trigger amenities_set_updated_at
before update on public.amenities
for each row
execute function public.set_updated_at();


-- ============================================================
-- BOAT AMENITIES
-- ============================================================

create table public.boat_amenities (
  boat_id uuid not null
    references public.boats(id)
    on delete cascade,

  amenity_id uuid not null
    references public.amenities(id)
    on delete restrict,

  notes text,

  created_at timestamptz not null default now(),

  primary key (
    boat_id,
    amenity_id
  ),

  constraint boat_amenities_notes_not_blank
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


create index boat_amenities_amenity_id_idx
  on public.boat_amenities(amenity_id);


-- ============================================================
-- EXTRAS
-- ============================================================
--
-- Reusable extras belonging to an operator workspace.
--
-- Examples:
--   ice box;
--   snorkeling kit;
--   SUP;
--   additional equipment;
--   operator-defined services.
--
-- Extras are not security deposits and are not used as a
-- replacement for the booking pricing engine.
-- ============================================================

create table public.extras (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  name text not null,
  description text,

  pricing_unit public.extra_pricing_unit not null
    default 'FIXED',

  price_cents integer not null default 0,

  max_quantity integer,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint extras_name_not_blank
    check (length(trim(name)) > 0),

  constraint extras_price_non_negative
    check (price_cents >= 0),

  constraint extras_max_quantity_positive
    check (
      max_quantity is null
      or max_quantity > 0
    )
);


create index extras_operator_id_idx
  on public.extras(operator_id);


create index extras_operator_active_idx
  on public.extras(
    operator_id,
    is_active
  );


create unique index extras_unique_name_per_operator_idx
  on public.extras(
    operator_id,
    lower(name)
  );


create trigger extras_set_updated_at
before update on public.extras
for each row
execute function public.set_updated_at();


alter table public.extras
  add constraint extras_operator_id_id_key
  unique (operator_id, id);


-- ============================================================
-- BOAT EXTRAS
-- ============================================================
--
-- Assigns reusable operator extras to individual boats.
--
-- operator_id is intentionally present so PostgreSQL can enforce
-- that both the boat and the extra belong to the SAME operator.
-- ============================================================

create table public.boat_extras (
  boat_id uuid not null,

  extra_id uuid not null,

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  price_override_cents integer,

  max_quantity_override integer,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    boat_id,
    extra_id
  ),

  constraint boat_extras_boat_operator_fk
    foreign key (
      operator_id,
      boat_id
    )
    references public.boats(
      operator_id,
      id
    )
    on delete cascade,

  constraint boat_extras_extra_operator_fk
    foreign key (
      operator_id,
      extra_id
    )
    references public.extras(
      operator_id,
      id
    )
    on delete cascade,

  constraint boat_extras_price_override_non_negative
    check (
      price_override_cents is null
      or price_override_cents >= 0
    ),

  constraint boat_extras_max_quantity_override_positive
    check (
      max_quantity_override is null
      or max_quantity_override > 0
    )
);


create index boat_extras_extra_id_idx
  on public.boat_extras(extra_id);


create index boat_extras_operator_id_idx
  on public.boat_extras(operator_id);


create trigger boat_extras_set_updated_at
before update on public.boat_extras
for each row
execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
--
-- As in previous migrations, all application tables are created
-- default-deny.
--
-- Detailed customer, operator and platform policies arrive in C6.
-- ============================================================

alter table public.boat_types
  enable row level security;

alter table public.boats
  enable row level security;

alter table public.boat_legal_offerings
  enable row level security;

alter table public.boat_images
  enable row level security;

alter table public.amenities
  enable row level security;

alter table public.boat_amenities
  enable row level security;

alter table public.extras
  enable row level security;

alter table public.boat_extras
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.boat_types is
  'Boatly-controlled boat taxonomy used by fleet configuration and marketplace filters.';

comment on table public.boats is
  'Physical boat units belonging to professional rental operator workspaces.';

comment on table public.boat_legal_offerings is
  'Legal/commercial offering modes available for a boat. Legal type and skipper mode are intentionally separate.';

comment on table public.boat_images is
  'Boat image metadata referencing objects stored in Supabase Storage.';

comment on table public.amenities is
  'Boatly-controlled reusable amenity catalog.';

comment on table public.boat_amenities is
  'Many-to-many association between boats and amenities.';

comment on table public.extras is
  'Reusable paid or free extras configured by an operator.';

comment on table public.boat_extras is
  'Assignment of operator-owned extras to boats belonging to the same operator.';


commit;