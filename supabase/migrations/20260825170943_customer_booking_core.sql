-- ============================================================
-- BOATLY
-- Migration: Customer & Booking Core
-- ============================================================
--
-- Purpose:
--   Create the core booking domain structures for:
--
--   - operator CRM customers;
--   - marketplace bookings;
--   - manual/off-platform bookings;
--   - immutable confirmed-booking snapshots;
--   - booking extras;
--   - booking price lines;
--   - append-only booking domain events;
--   - booking-to-occupancy linkage.
--
-- Critical business rules:
--
--   - MARKETPLACE and MANUAL bookings share the same booking
--     and availability infrastructure.
--
--   - MANUAL bookings carry zero Boatly marketplace commission.
--
--   - Confirmed and post-confirmation bookings preserve
--     immutable commercial/legal/customer/boat snapshots.
--
--   - Security deposits remain separate from Boatly revenue
--     and marketplace commission.
--
--   - Booking events are domain history and remain separate
--     from the Boatly administrative audit log.
--
-- Security:
--   Row Level Security is enabled immediately.
--   Detailed policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================


-- ------------------------------------------------------------
-- Booking source
-- ------------------------------------------------------------

create type public.booking_source as enum (
  'MARKETPLACE',
  'MANUAL'
);


-- ------------------------------------------------------------
-- Booking lifecycle status
-- ------------------------------------------------------------

create type public.booking_status as enum (
  'DRAFT',
  'PENDING_PAYMENT',
  'PAYMENT_PROCESSING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_OPERATOR',
  'CANCELLED_BY_BOATLY',
  'PAYMENT_FAILED',
  'REFUND_PENDING',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'NO_SHOW'
);


-- ------------------------------------------------------------
-- Booking price item type
-- ------------------------------------------------------------

create type public.booking_price_item_type as enum (
  'RENTAL',
  'EXTRA',
  'FEE',
  'DISCOUNT',
  'TAX',
  'SECURITY_DEPOSIT',
  'FUEL',
  'OTHER'
);


-- ------------------------------------------------------------
-- Booking event actor
-- ------------------------------------------------------------

create type public.booking_event_actor_type as enum (
  'CUSTOMER',
  'OPERATOR',
  'PLATFORM',
  'SYSTEM'
);


-- ============================================================
-- OPERATOR CUSTOMERS
-- ============================================================
--
-- Operator-specific CRM customer record.
--
-- A marketplace customer may therefore have one CRM record
-- for each operator with whom they have interacted.
--
-- user_id links the CRM record to a Supabase Auth account when
-- applicable.
--
-- Manual customers can exist without a Boatly user account.
-- ============================================================

create table public.operator_customers (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  display_name text not null,

  first_name text,
  last_name text,

  email text,
  phone text,

  date_of_birth date,
  country_code text,

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operator_customers_display_name_not_blank
    check (
      length(trim(display_name)) > 0
    ),

  constraint operator_customers_first_name_not_blank
    check (
      first_name is null
      or length(trim(first_name)) > 0
    ),

  constraint operator_customers_last_name_not_blank
    check (
      last_name is null
      or length(trim(last_name)) > 0
    ),

  constraint operator_customers_email_lowercase
    check (
      email is null
      or email = lower(email)
    ),

  constraint operator_customers_email_not_blank
    check (
      email is null
      or length(trim(email)) > 0
    ),

  constraint operator_customers_country_code_format
    check (
      country_code is null
      or (
        country_code = upper(country_code)
        and length(country_code) = 2
      )
    ),

  constraint operator_customers_notes_not_blank
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


create index operator_customers_operator_id_idx
  on public.operator_customers(operator_id);


create index operator_customers_user_id_idx
  on public.operator_customers(user_id);


create index operator_customers_email_idx
  on public.operator_customers(
    operator_id,
    lower(email)
  )
  where email is not null;


create unique index operator_customers_unique_user_per_operator_idx
  on public.operator_customers(
    operator_id,
    user_id
  )
  where user_id is not null;


create trigger operator_customers_set_updated_at
before update on public.operator_customers
for each row
execute function public.set_updated_at();


alter table public.operator_customers
  add constraint operator_customers_operator_id_id_key
  unique (operator_id, id);


-- ============================================================
-- SUPPORT COMPOSITE KEY FOR RATE PLANS
-- ============================================================
--
-- Used so bookings can reference a rate plan while PostgreSQL
-- guarantees that operator, boat and rate plan are consistent.
-- ============================================================

alter table public.boat_rate_plans
  add constraint boat_rate_plans_operator_boat_id_key
  unique (
    operator_id,
    boat_id,
    id
  );


-- ============================================================
-- BOOKINGS
-- ============================================================
--
-- Central reservation record shared by:
--
--   MARKETPLACE bookings
--   MANUAL / off-platform bookings
--
-- Mutable source entities are referenced where useful, while
-- confirmed-booking facts are preserved through immutable
-- snapshots.
--
-- JSON snapshots intentionally complement normalized tables.
-- They are historical records, not replacements for the normal
-- relational model.
-- ============================================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  source public.booking_source not null,

  status public.booking_status not null default 'DRAFT',

  reference text,

  operator_customer_id uuid not null,

  customer_user_id uuid
    references auth.users(id)
    on delete set null,

  boat_id uuid not null,

  legal_offering_id uuid not null,

  pickup_location_id uuid not null,

  rate_plan_id uuid,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  passenger_count smallint not null,

  driver_is_customer boolean not null default true,

  customer_note text,
  operator_note text,

  currency_snapshot text,

  rental_subtotal_cents_snapshot integer,
  extras_total_cents_snapshot integer,
  discount_total_cents_snapshot integer,
  tax_total_cents_snapshot integer,
  customer_total_cents_snapshot integer,

  security_deposit_cents_snapshot integer,

  commission_base_cents_snapshot integer,
  commission_bps_snapshot integer,
  commission_amount_cents_snapshot integer,

  operator_amount_cents_snapshot integer,

  commercial_plan_code_snapshot text,

  customer_snapshot jsonb not null default '{}'::jsonb,
  boat_snapshot jsonb not null default '{}'::jsonb,
  legal_offering_snapshot jsonb not null default '{}'::jsonb,
  pickup_location_snapshot jsonb not null default '{}'::jsonb,
  driver_eligibility_snapshot jsonb not null default '{}'::jsonb,
  cancellation_policy_snapshot jsonb not null default '{}'::jsonb,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  commercial_snapshot jsonb not null default '{}'::jsonb,

  snapshot_locked_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_operator_fk
    foreign key (
      operator_id
    )
    references public.operators(id)
    on delete restrict,

  constraint bookings_operator_customer_fk
    foreign key (
      operator_id,
      operator_customer_id
    )
    references public.operator_customers(
      operator_id,
      id
    )
    on delete restrict,

  constraint bookings_boat_operator_fk
    foreign key (
      operator_id,
      boat_id
    )
    references public.boats(
      operator_id,
      id
    )
    on delete restrict,

  constraint bookings_legal_offering_boat_fk
    foreign key (
      boat_id,
      legal_offering_id
    )
    references public.boat_legal_offerings(
      boat_id,
      id
    )
    on delete restrict,

  constraint bookings_pickup_location_operator_fk
    foreign key (
      operator_id,
      pickup_location_id
    )
    references public.operator_locations(
      operator_id,
      id
    )
    on delete restrict,

  constraint bookings_rate_plan_operator_boat_fk
    foreign key (
      operator_id,
      boat_id,
      rate_plan_id
    )
    references public.boat_rate_plans(
      operator_id,
      boat_id,
      id
    )
    on delete restrict,

  constraint bookings_reference_format
    check (
      reference is null
      or (
        length(trim(reference)) > 0
        and reference = upper(reference)
        and reference ~ '^[A-Z0-9-]+$'
      )
    ),

  constraint bookings_time_window
    check (
      ends_at > starts_at
    ),

  constraint bookings_passenger_count_positive
    check (
      passenger_count > 0
    ),

  constraint bookings_customer_note_not_blank
    check (
      customer_note is null
      or length(trim(customer_note)) > 0
    ),

  constraint bookings_operator_note_not_blank
    check (
      operator_note is null
      or length(trim(operator_note)) > 0
    ),

  constraint bookings_currency_format
    check (
      currency_snapshot is null
      or (
        currency_snapshot = upper(currency_snapshot)
        and length(currency_snapshot) = 3
      )
    ),

  constraint bookings_rental_subtotal_non_negative
    check (
      rental_subtotal_cents_snapshot is null
      or rental_subtotal_cents_snapshot >= 0
    ),

  constraint bookings_extras_total_non_negative
    check (
      extras_total_cents_snapshot is null
      or extras_total_cents_snapshot >= 0
    ),

  constraint bookings_discount_total_non_negative
    check (
      discount_total_cents_snapshot is null
      or discount_total_cents_snapshot >= 0
    ),

  constraint bookings_tax_total_non_negative
    check (
      tax_total_cents_snapshot is null
      or tax_total_cents_snapshot >= 0
    ),

  constraint bookings_customer_total_non_negative
    check (
      customer_total_cents_snapshot is null
      or customer_total_cents_snapshot >= 0
    ),

  constraint bookings_security_deposit_non_negative
    check (
      security_deposit_cents_snapshot is null
      or security_deposit_cents_snapshot >= 0
    ),

  constraint bookings_commission_base_non_negative
    check (
      commission_base_cents_snapshot is null
      or commission_base_cents_snapshot >= 0
    ),

  constraint bookings_commission_bps_range
    check (
      commission_bps_snapshot is null
      or commission_bps_snapshot between 0 and 10000
    ),

  constraint bookings_commission_amount_non_negative
    check (
      commission_amount_cents_snapshot is null
      or commission_amount_cents_snapshot >= 0
    ),

  constraint bookings_operator_amount_non_negative
    check (
      operator_amount_cents_snapshot is null
      or operator_amount_cents_snapshot >= 0
    ),

  constraint bookings_commercial_plan_code_not_blank
    check (
      commercial_plan_code_snapshot is null
      or length(trim(commercial_plan_code_snapshot)) > 0
    ),

  constraint bookings_customer_snapshot_object
    check (
      jsonb_typeof(customer_snapshot) = 'object'
    ),

  constraint bookings_boat_snapshot_object
    check (
      jsonb_typeof(boat_snapshot) = 'object'
    ),

  constraint bookings_legal_offering_snapshot_object
    check (
      jsonb_typeof(legal_offering_snapshot) = 'object'
    ),

  constraint bookings_pickup_location_snapshot_object
    check (
      jsonb_typeof(pickup_location_snapshot) = 'object'
    ),

  constraint bookings_driver_eligibility_snapshot_object
    check (
      jsonb_typeof(driver_eligibility_snapshot) = 'object'
    ),

  constraint bookings_cancellation_policy_snapshot_object
    check (
      jsonb_typeof(cancellation_policy_snapshot) = 'object'
    ),

  constraint bookings_pricing_snapshot_object
    check (
      jsonb_typeof(pricing_snapshot) = 'object'
    ),

  constraint bookings_commercial_snapshot_object
    check (
      jsonb_typeof(commercial_snapshot) = 'object'
    ),

  constraint bookings_manual_marketplace_commission_zero
    check (
      source <> 'MANUAL'
      or (
        coalesce(
          commission_base_cents_snapshot,
          0
        ) = 0
        and coalesce(
          commission_bps_snapshot,
          0
        ) = 0
        and coalesce(
          commission_amount_cents_snapshot,
          0
        ) = 0
      )
    )
);


create unique index bookings_reference_unique_idx
  on public.bookings(reference)
  where reference is not null;


create index bookings_operator_id_idx
  on public.bookings(operator_id);


create index bookings_operator_customer_id_idx
  on public.bookings(operator_customer_id);


create index bookings_customer_user_id_idx
  on public.bookings(customer_user_id);


create index bookings_boat_id_idx
  on public.bookings(boat_id);


create index bookings_status_idx
  on public.bookings(status);


create index bookings_source_idx
  on public.bookings(source);


create index bookings_operator_status_idx
  on public.bookings(
    operator_id,
    status
  );


create index bookings_boat_starts_at_idx
  on public.bookings(
    boat_id,
    starts_at
  );


create index bookings_starts_at_idx
  on public.bookings(starts_at);


create trigger bookings_set_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();


alter table public.bookings
  add constraint bookings_operator_id_id_key
  unique (
    operator_id,
    id
  );


alter table public.bookings
  add constraint bookings_operator_id_id_boat_id_key
  unique (
    operator_id,
    id,
    boat_id
  );


alter table public.bookings
  add constraint bookings_id_boat_id_key
  unique (
    id,
    boat_id
  );


-- ============================================================
-- BOOKING SNAPSHOT LOCKING
-- ============================================================
--
-- A booking becomes snapshot-locked once it enters a status
-- that represents a confirmed or post-confirmation booking.
--
-- The application may still change operational status and
-- operational timestamps afterward.
--
-- The commercial/customer/boat/legal/pricing facts that were
-- accepted at confirmation cannot be rewritten.
-- ============================================================

create or replace function public.booking_status_locks_snapshot(
  value public.booking_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value in (
    'CONFIRMED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED_BY_CUSTOMER',
    'CANCELLED_BY_OPERATOR',
    'CANCELLED_BY_BOATLY',
    'REFUND_PENDING',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
    'NO_SHOW'
  );
$$;


create or replace function public.prepare_and_protect_booking()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  -- ----------------------------------------------------------
  -- Permanently immutable structural identity
  -- ----------------------------------------------------------

  if tg_op = 'UPDATE' then

    if new.operator_id is distinct from old.operator_id then
      raise exception
        'Booking operator_id cannot be changed';
    end if;

    if new.source is distinct from old.source then
      raise exception
        'Booking source cannot be changed';
    end if;

    if new.created_by is distinct from old.created_by then
      raise exception
        'Booking created_by cannot be changed';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- Protect confirmed booking snapshots
  -- ----------------------------------------------------------

  if tg_op = 'UPDATE'
     and old.snapshot_locked_at is not null then

    if
      new.snapshot_locked_at
        is distinct from old.snapshot_locked_at

      or new.reference
        is distinct from old.reference

      or new.boat_id
        is distinct from old.boat_id

      or new.legal_offering_id
        is distinct from old.legal_offering_id

      or new.pickup_location_id
        is distinct from old.pickup_location_id

      or new.rate_plan_id
        is distinct from old.rate_plan_id

      or new.starts_at
        is distinct from old.starts_at

      or new.ends_at
        is distinct from old.ends_at

      or new.passenger_count
        is distinct from old.passenger_count

      or new.driver_is_customer
        is distinct from old.driver_is_customer

      or new.customer_note
        is distinct from old.customer_note

      or new.currency_snapshot
        is distinct from old.currency_snapshot

      or new.rental_subtotal_cents_snapshot
        is distinct from old.rental_subtotal_cents_snapshot

      or new.extras_total_cents_snapshot
        is distinct from old.extras_total_cents_snapshot

      or new.discount_total_cents_snapshot
        is distinct from old.discount_total_cents_snapshot

      or new.tax_total_cents_snapshot
        is distinct from old.tax_total_cents_snapshot

      or new.customer_total_cents_snapshot
        is distinct from old.customer_total_cents_snapshot

      or new.security_deposit_cents_snapshot
        is distinct from old.security_deposit_cents_snapshot

      or new.commission_base_cents_snapshot
        is distinct from old.commission_base_cents_snapshot

      or new.commission_bps_snapshot
        is distinct from old.commission_bps_snapshot

      or new.commission_amount_cents_snapshot
        is distinct from old.commission_amount_cents_snapshot

      or new.operator_amount_cents_snapshot
        is distinct from old.operator_amount_cents_snapshot

      or new.commercial_plan_code_snapshot
        is distinct from old.commercial_plan_code_snapshot

      or new.customer_snapshot
        is distinct from old.customer_snapshot

      or new.boat_snapshot
        is distinct from old.boat_snapshot

      or new.legal_offering_snapshot
        is distinct from old.legal_offering_snapshot

      or new.pickup_location_snapshot
        is distinct from old.pickup_location_snapshot

      or new.driver_eligibility_snapshot
        is distinct from old.driver_eligibility_snapshot

      or new.cancellation_policy_snapshot
        is distinct from old.cancellation_policy_snapshot

      or new.pricing_snapshot
        is distinct from old.pricing_snapshot

      or new.commercial_snapshot
        is distinct from old.commercial_snapshot

    then
      raise exception
        'Confirmed booking snapshot is immutable';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- Operational timestamps
  -- ----------------------------------------------------------

  if new.status = 'CONFIRMED'
     and new.confirmed_at is null then
    new.confirmed_at = now();
  end if;


  if new.status in (
    'CANCELLED_BY_CUSTOMER',
    'CANCELLED_BY_OPERATOR',
    'CANCELLED_BY_BOATLY'
  )
  and new.cancelled_at is null then
    new.cancelled_at = now();
  end if;


  if new.status = 'COMPLETED'
     and new.completed_at is null then
    new.completed_at = now();
  end if;


  -- ----------------------------------------------------------
  -- Lock snapshot when booking becomes confirmed/post-confirmed
  -- ----------------------------------------------------------

  if public.booking_status_locks_snapshot(new.status)
     and new.snapshot_locked_at is null then

    if new.reference is null then
      raise exception
        'Booking reference is required before snapshot lock';
    end if;

    if new.currency_snapshot is null then
      raise exception
        'Booking currency snapshot is required before snapshot lock';
    end if;

    if new.rental_subtotal_cents_snapshot is null
       or new.extras_total_cents_snapshot is null
       or new.discount_total_cents_snapshot is null
       or new.tax_total_cents_snapshot is null
       or new.customer_total_cents_snapshot is null
       or new.security_deposit_cents_snapshot is null
       or new.commission_base_cents_snapshot is null
       or new.commission_bps_snapshot is null
       or new.commission_amount_cents_snapshot is null
       or new.operator_amount_cents_snapshot is null then

      raise exception
        'Booking financial snapshots are incomplete';

    end if;


    if new.commercial_plan_code_snapshot is null then
      raise exception
        'Commercial plan snapshot is required before snapshot lock';
    end if;


    if new.customer_snapshot = '{}'::jsonb
       or new.boat_snapshot = '{}'::jsonb
       or new.legal_offering_snapshot = '{}'::jsonb
       or new.pickup_location_snapshot = '{}'::jsonb
       or new.driver_eligibility_snapshot = '{}'::jsonb
       or new.cancellation_policy_snapshot = '{}'::jsonb
       or new.pricing_snapshot = '{}'::jsonb
       or new.commercial_snapshot = '{}'::jsonb then

      raise exception
        'Booking snapshots are incomplete';

    end if;


    new.snapshot_locked_at = now();

  end if;


  return new;
end;
$$;


create trigger bookings_prepare_and_protect
before insert or update on public.bookings
for each row
execute function public.prepare_and_protect_booking();


-- ============================================================
-- BOOKING EXTRAS
-- ============================================================
--
-- Immutable-after-confirmation snapshot of extras selected for
-- the booking.
--
-- The source extra remains referenced for traceability, while
-- name, pricing unit and price are snapshotted.
-- ============================================================

create table public.booking_extras (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  boat_id uuid not null,

  extra_id uuid not null,

  extra_name_snapshot text not null,

  pricing_unit_snapshot public.extra_pricing_unit not null,

  quantity integer not null default 1,

  unit_price_cents integer not null,
  total_price_cents integer not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_extras_booking_operator_fk
    foreign key (
      operator_id,
      booking_id
    )
    references public.bookings(
      operator_id,
      id
    )
    on delete cascade,

  constraint booking_extras_booking_boat_fk
    foreign key (
      booking_id,
      boat_id
    )
    references public.bookings(
      id,
      boat_id
    )
    on delete cascade,

  constraint booking_extras_boat_extra_fk
    foreign key (
      boat_id,
      extra_id
    )
    references public.boat_extras(
      boat_id,
      extra_id
    )
    on delete restrict,

  constraint booking_extras_name_not_blank
    check (
      length(trim(extra_name_snapshot)) > 0
    ),

  constraint booking_extras_quantity_positive
    check (
      quantity > 0
    ),

  constraint booking_extras_unit_price_non_negative
    check (
      unit_price_cents >= 0
    ),

  constraint booking_extras_total_price_non_negative
    check (
      total_price_cents >= 0
    ),

  constraint booking_extras_total_matches_quantity
    check (
      total_price_cents =
        unit_price_cents * quantity
    )
);


create index booking_extras_booking_id_idx
  on public.booking_extras(booking_id);


create index booking_extras_extra_id_idx
  on public.booking_extras(extra_id);


create unique index booking_extras_unique_extra_per_booking_idx
  on public.booking_extras(
    booking_id,
    extra_id
  );


create trigger booking_extras_set_updated_at
before update on public.booking_extras
for each row
execute function public.set_updated_at();


-- ============================================================
-- BOOKING PRICE ITEMS
-- ============================================================
--
-- Detailed immutable-after-confirmation monetary line items.
--
-- Examples:
--
--   RENTAL
--   EXTRA
--   DISCOUNT
--   TAX
--   SECURITY_DEPOSIT
--
-- amount_cents is signed:
--
--   positive  -> charge
--   negative  -> discount
--
-- Security deposits, taxes and fuel are explicitly excluded
-- from commissionability at the schema level.
-- ============================================================

create table public.booking_price_items (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  item_type public.booking_price_item_type not null,

  code text,
  label text not null,

  quantity numeric(12, 2) not null default 1,

  unit_amount_cents integer,

  amount_cents integer not null,

  is_commissionable boolean not null default false,

  sort_order integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_price_items_booking_operator_fk
    foreign key (
      operator_id,
      booking_id
    )
    references public.bookings(
      operator_id,
      id
    )
    on delete cascade,

  constraint booking_price_items_code_not_blank
    check (
      code is null
      or length(trim(code)) > 0
    ),

  constraint booking_price_items_label_not_blank
    check (
      length(trim(label)) > 0
    ),

  constraint booking_price_items_quantity_positive
    check (
      quantity > 0
    ),

  constraint booking_price_items_sort_order_non_negative
    check (
      sort_order >= 0
    ),

  constraint booking_price_items_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    ),

  constraint booking_price_items_discount_sign
    check (
      (
        item_type = 'DISCOUNT'
        and amount_cents <= 0
      )
      or
      (
        item_type <> 'DISCOUNT'
        and amount_cents >= 0
      )
    ),

  constraint booking_price_items_non_commissionable_types
    check (
      item_type not in (
        'SECURITY_DEPOSIT',
        'TAX',
        'FUEL'
      )
      or is_commissionable = false
    )
);


create index booking_price_items_booking_id_idx
  on public.booking_price_items(booking_id);


create index booking_price_items_type_idx
  on public.booking_price_items(item_type);


create index booking_price_items_booking_sort_idx
  on public.booking_price_items(
    booking_id,
    sort_order
  );


create trigger booking_price_items_set_updated_at
before update on public.booking_price_items
for each row
execute function public.set_updated_at();


-- ============================================================
-- PROTECT BOOKING CHILD FINANCIAL SNAPSHOTS
-- ============================================================
--
-- booking_extras and booking_price_items can be edited while
-- the booking is a draft/payment-in-progress record.
--
-- Once the parent booking snapshot is locked, they become
-- immutable.
-- ============================================================

create or replace function public.prevent_locked_booking_child_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_booking_locked boolean := false;
  new_booking_locked boolean := false;
begin

  if tg_op in ('UPDATE', 'DELETE') then
    select exists (
      select 1
      from public.bookings b
      where b.id = old.booking_id
        and b.snapshot_locked_at is not null
    )
    into old_booking_locked;
  end if;


  if tg_op in ('INSERT', 'UPDATE') then
    select exists (
      select 1
      from public.bookings b
      where b.id = new.booking_id
        and b.snapshot_locked_at is not null
    )
    into new_booking_locked;
  end if;


  if old_booking_locked or new_booking_locked then
    raise exception
      'Confirmed booking child snapshots are immutable';
  end if;


  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;


create trigger booking_extras_protect_locked_booking
before insert or update or delete
on public.booking_extras
for each row
execute function public.prevent_locked_booking_child_mutation();


create trigger booking_price_items_protect_locked_booking
before insert or update or delete
on public.booking_price_items
for each row
execute function public.prevent_locked_booking_child_mutation();


-- ============================================================
-- BOOKING EVENTS
-- ============================================================
--
-- Append-only domain event history for an individual booking.
--
-- This is NOT the Boatly administrator audit log.
--
-- Example events:
--
--   BOOKING_CREATED
--   STATUS_CHANGED
--   HOLD_CREATED
--   HOLD_RELEASED
--   PAYMENT_CONFIRMED
--   CUSTOMER_CANCELLED
--   OPERATOR_CANCELLED
--
-- event_type remains an extensible uppercase code instead of a
-- PostgreSQL enum because domain-event vocabulary will evolve.
-- ============================================================

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  event_type text not null,

  actor_type public.booking_event_actor_type not null,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  from_status public.booking_status,
  to_status public.booking_status,

  message text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint booking_events_booking_operator_fk
    foreign key (
      operator_id,
      booking_id
    )
    references public.bookings(
      operator_id,
      id
    )
    on delete cascade,

  constraint booking_events_event_type_format
    check (
      event_type = upper(event_type)
      and event_type ~ '^[A-Z0-9_]+$'
    ),

  constraint booking_events_message_not_blank
    check (
      message is null
      or length(trim(message)) > 0
    ),

  constraint booking_events_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);


create index booking_events_booking_id_idx
  on public.booking_events(booking_id);


create index booking_events_booking_occurred_at_idx
  on public.booking_events(
    booking_id,
    occurred_at
  );


create index booking_events_event_type_idx
  on public.booking_events(event_type);


-- ============================================================
-- BOOKING EVENTS ARE APPEND-ONLY
-- ============================================================

create or replace function public.prevent_booking_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'Booking events are append-only';
end;
$$;


create trigger booking_events_prevent_mutation
before update or delete
on public.booking_events
for each row
execute function public.prevent_booking_event_mutation();


-- ============================================================
-- LINK BOOKINGS TO BOAT OCCUPANCIES
-- ============================================================
--
-- C4.7 created the physical resource calendar before bookings
-- existed.
--
-- We now link an occupancy to a booking.
--
-- BOOKING and MANUAL_BOOKING occupancies MUST have a booking.
--
-- HOLD may have a booking when checkout has already created a
-- booking record, but may also temporarily exist before one.
--
-- Operational occupancies such as maintenance must NOT point
-- to a booking.
-- ============================================================

alter table public.boat_occupancies
  add column booking_id uuid;


alter table public.boat_occupancies
  add constraint boat_occupancies_booking_operator_boat_fk
  foreign key (
    operator_id,
    booking_id,
    boat_id
  )
  references public.bookings(
    operator_id,
    id,
    boat_id
  )
  on delete restrict;


alter table public.boat_occupancies
  add constraint boat_occupancies_booking_link_consistency
  check (
    (
      occupancy_type in (
        'BOOKING',
        'MANUAL_BOOKING'
      )
      and booking_id is not null
    )
    or
    (
      occupancy_type = 'HOLD'
    )
    or
    (
      occupancy_type not in (
        'BOOKING',
        'MANUAL_BOOKING',
        'HOLD'
      )
      and booking_id is null
    )
  );


create index boat_occupancies_booking_id_idx
  on public.boat_occupancies(booking_id);


create unique index boat_occupancies_one_active_per_booking_idx
  on public.boat_occupancies(booking_id)
  where booking_id is not null
    and is_active = true;


-- ============================================================
-- VALIDATE BOOKING / OCCUPANCY SOURCE RELATIONSHIP
-- ============================================================
--
-- MARKETPLACE confirmed occupancies use BOOKING.
--
-- MANUAL confirmed occupancies use MANUAL_BOOKING.
--
-- HOLD remains source-neutral because it can temporarily
-- protect either flow.
-- ============================================================

create or replace function public.validate_booking_occupancy_link()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_source public.booking_source;
  linked_boat_id uuid;
begin

  if new.booking_id is null then
    return new;
  end if;


  select
    b.source,
    b.boat_id
  into
    linked_source,
    linked_boat_id
  from public.bookings b
  where b.id = new.booking_id
    and b.operator_id = new.operator_id;


  if not found then
    raise exception
      'Linked booking does not exist for this operator';
  end if;


  if linked_boat_id is distinct from new.boat_id then
    raise exception
      'Booking and occupancy must reference the same boat';
  end if;


  if new.occupancy_type = 'BOOKING'
     and linked_source <> 'MARKETPLACE' then

    raise exception
      'BOOKING occupancy requires MARKETPLACE booking source';

  end if;


  if new.occupancy_type = 'MANUAL_BOOKING'
     and linked_source <> 'MANUAL' then

    raise exception
      'MANUAL_BOOKING occupancy requires MANUAL booking source';

  end if;


  return new;
end;
$$;


create trigger boat_occupancies_validate_booking_link
before insert or update
on public.boat_occupancies
for each row
execute function public.validate_booking_occupancy_link();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.operator_customers
  enable row level security;

alter table public.bookings
  enable row level security;

alter table public.booking_extras
  enable row level security;

alter table public.booking_price_items
  enable row level security;

alter table public.booking_events
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.operator_customers is
  'Operator-specific CRM customer records. Manual customers may exist without a Boatly Auth user.';


comment on table public.bookings is
  'Central marketplace/manual booking record containing immutable post-confirmation customer, boat, legal, pricing and commercial snapshots.';


comment on column public.bookings.snapshot_locked_at is
  'Timestamp after which confirmed-booking commercial and contractual snapshots cannot be modified.';


comment on column public.bookings.security_deposit_cents_snapshot is
  'Security deposit snapshot stored separately from Boatly revenue and marketplace commission.';


comment on column public.bookings.commission_bps_snapshot is
  'Boatly marketplace commission snapshot in basis points. MANUAL bookings must carry zero marketplace commission.';


comment on table public.booking_extras is
  'Snapshot of extras selected for a booking. Immutable once the parent booking snapshot is locked.';


comment on table public.booking_price_items is
  'Detailed booking price lines. Security deposits, taxes and fuel are non-commissionable by schema.';


comment on table public.booking_events is
  'Append-only domain event history for a booking. Separate from the platform administrative audit log.';


comment on column public.boat_occupancies.booking_id is
  'Optional booking link. Required for BOOKING and MANUAL_BOOKING occupancies; optional for HOLD; forbidden for non-booking operational occupancy types.';


commit;