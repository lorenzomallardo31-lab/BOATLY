-- ============================================================
-- BOATLY
-- Migration: Availability & Occupancy Foundation
-- ============================================================
--
-- Purpose:
--   Create the core resource-availability structures for:
--
--   - recurring boat availability windows;
--   - marketplace bookings;
--   - manual/off-platform bookings;
--   - temporary checkout holds;
--   - maintenance;
--   - transfers;
--   - private use;
--   - operator blocks;
--   - other operational occupancy.
--
-- Critical integrity rule:
--
--   A boat may never have two ACTIVE occupancies whose time
--   ranges overlap.
--
--   This rule is enforced directly by PostgreSQL through a
--   GiST exclusion constraint.
--
-- Time model:
--
--   - recurring availability uses local civil time plus an
--     explicit IANA timezone;
--   - concrete occupancies use timestamptz;
--   - concrete occupancy ranges use tstzrange;
--   - ranges use [start, end), so back-to-back occupancies are
--     permitted.
--
-- Security:
--   Row Level Security is enabled immediately.
--   Authorization policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================


-- ------------------------------------------------------------
-- Boat occupancy type
-- ------------------------------------------------------------

create type public.boat_occupancy_type as enum (
  'BOOKING',
  'MANUAL_BOOKING',
  'HOLD',
  'MAINTENANCE',
  'TRANSFER',
  'PRIVATE_USE',
  'OPERATOR_BLOCK',
  'OTHER'
);


-- ============================================================
-- BOAT AVAILABILITY RULES
-- ============================================================
--
-- Recurring local-time windows in which a boat may normally
-- be offered for booking.
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
-- Examples:
--
--   Monday  09:00 -> 18:00
--   Monday  09:00 -> 13:00
--   Monday  15:00 -> 19:00
--
-- valid_from / valid_to allow seasonal rules.
--
-- A one-day availability window can also be represented using:
--
--   valid_from = target date
--   valid_to   = target date
--   weekday    = ISO weekday of that date
--
-- Concrete blocks and exceptions are represented through
-- boat_occupancies.
-- ============================================================

create table public.boat_availability_rules (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  boat_id uuid not null,

  weekday smallint not null,

  available_from time not null,
  available_to time not null,

  timezone text not null default 'Europe/Rome',

  valid_from date,
  valid_to date,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_availability_rules_operator_fk
    foreign key (
      operator_id
    )
    references public.operators(id)
    on delete cascade,

  constraint boat_availability_rules_boat_operator_fk
    foreign key (
      operator_id,
      boat_id
    )
    references public.boats(
      operator_id,
      id
    )
    on delete cascade,

  constraint boat_availability_rules_weekday_range
    check (
      weekday between 1 and 7
    ),

  constraint boat_availability_rules_time_window
    check (
      available_to > available_from
    ),

  constraint boat_availability_rules_timezone_not_blank
    check (
      length(trim(timezone)) > 0
    ),

  constraint boat_availability_rules_validity_range
    check (
      valid_from is null
      or valid_to is null
      or valid_to >= valid_from
    )
);


create index boat_availability_rules_operator_id_idx
  on public.boat_availability_rules(operator_id);


create index boat_availability_rules_boat_id_idx
  on public.boat_availability_rules(boat_id);


create index boat_availability_rules_boat_weekday_active_idx
  on public.boat_availability_rules(
    boat_id,
    weekday,
    is_active
  );


create index boat_availability_rules_validity_idx
  on public.boat_availability_rules(
    valid_from,
    valid_to
  );


create trigger boat_availability_rules_set_updated_at
before update on public.boat_availability_rules
for each row
execute function public.set_updated_at();


-- ============================================================
-- BOAT OCCUPANCIES
-- ============================================================
--
-- Single source of truth for concrete time periods during which
-- a boat is unavailable for another simultaneous use.
--
-- Every active occupancy blocks the SAME physical resource,
-- regardless of whether its source is:
--
--   - marketplace;
--   - manual/off-platform;
--   - checkout hold;
--   - maintenance;
--   - transfer;
--   - private use;
--   - operator block;
--   - another operational reason.
--
-- BOOKING linkage will be added when the booking tables are
-- introduced. Until then the occupancy ID itself is sufficient
-- as the resource-reservation identifier.
-- ============================================================

create table public.boat_occupancies (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  boat_id uuid not null,

  occupancy_type public.boat_occupancy_type not null,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  occupancy_range tstzrange
    generated always as (
      tstzrange(
        starts_at,
        ends_at,
        '[)'
      )
    ) stored,

  hold_expires_at timestamptz,

  title text,
  notes text,

  is_active boolean not null default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  released_at timestamptz,

  released_by uuid
    references auth.users(id)
    on delete set null,

  release_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_occupancies_operator_fk
    foreign key (
      operator_id
    )
    references public.operators(id)
    on delete cascade,

  constraint boat_occupancies_boat_operator_fk
    foreign key (
      operator_id,
      boat_id
    )
    references public.boats(
      operator_id,
      id
    )
    on delete cascade,

  constraint boat_occupancies_time_window
    check (
      ends_at > starts_at
    ),

  constraint boat_occupancies_title_not_blank
    check (
      title is null
      or length(trim(title)) > 0
    ),

  constraint boat_occupancies_notes_not_blank
    check (
      notes is null
      or length(trim(notes)) > 0
    ),

  constraint boat_occupancies_release_reason_not_blank
    check (
      release_reason is null
      or length(trim(release_reason)) > 0
    ),

  constraint boat_occupancies_hold_expiry_consistency
    check (
      (
        occupancy_type = 'HOLD'
        and hold_expires_at is not null
      )
      or
      (
        occupancy_type <> 'HOLD'
        and hold_expires_at is null
      )
    ),

  constraint boat_occupancies_hold_expiry_after_creation
    check (
      occupancy_type <> 'HOLD'
      or hold_expires_at > created_at
    ),

  constraint boat_occupancies_release_consistency
    check (
      (
        is_active = true
        and released_at is null
      )
      or
      (
        is_active = false
        and released_at is not null
      )
    )
);


-- ============================================================
-- DATABASE-LEVEL DOUBLE-BOOKING PROTECTION
-- ============================================================
--
-- For active occupancies:
--
--   same boat
--   +
--   overlapping tstzrange
--   =
--   rejected by PostgreSQL
--
-- [start, end) means:
--
--   10:00 -> 12:00
--   12:00 -> 14:00
--
-- do NOT overlap and are therefore valid back-to-back periods.
--
-- Inactive historical occupancies do not block availability.
-- ============================================================

alter table public.boat_occupancies
  add constraint boat_occupancies_no_active_overlap
  exclude using gist (
    boat_id with =,
    occupancy_range with &&
  )
  where (is_active);


create index boat_occupancies_operator_id_idx
  on public.boat_occupancies(operator_id);


create index boat_occupancies_boat_id_idx
  on public.boat_occupancies(boat_id);


create index boat_occupancies_type_idx
  on public.boat_occupancies(occupancy_type);


create index boat_occupancies_boat_active_idx
  on public.boat_occupancies(
    boat_id,
    is_active
  );


create index boat_occupancies_active_hold_expiry_idx
  on public.boat_occupancies(hold_expires_at)
  where occupancy_type = 'HOLD'
    and is_active = true;


create index boat_occupancies_created_by_idx
  on public.boat_occupancies(created_by);


create trigger boat_occupancies_set_updated_at
before update on public.boat_occupancies
for each row
execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.boat_availability_rules
  enable row level security;

alter table public.boat_occupancies
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.boat_availability_rules is
  'Recurring local-time availability windows for boats. Concrete blocks and resource use are represented by boat_occupancies.';


comment on column public.boat_availability_rules.timezone is
  'IANA timezone used to interpret recurring local availability times, for example Europe/Rome.';


comment on table public.boat_occupancies is
  'Concrete boat resource occupancies. Active overlapping occupancies for the same boat are prohibited at database level.';


comment on column public.boat_occupancies.occupancy_range is
  'Generated half-open timestamptz range [starts_at, ends_at) used for availability and overlap enforcement.';


comment on column public.boat_occupancies.hold_expires_at is
  'Expiration timestamp for temporary HOLD occupancies. Expiration alone does not release the occupancy; application or scheduled cleanup must deactivate/release stale holds.';


comment on column public.boat_occupancies.is_active is
  'Only active occupancies participate in the database exclusion constraint and block the boat resource.';


commit;