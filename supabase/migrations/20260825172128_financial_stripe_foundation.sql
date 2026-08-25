-- ============================================================
-- BOATLY
-- Migration: Financial & Stripe Foundation
-- ============================================================
--
-- Purpose:
--   Create the financial persistence foundation for:
--
--   - Stripe Connect operator accounts;
--   - verified/idempotent Stripe webhook events;
--   - Stripe booking payments;
--   - off-platform/manual payment records;
--   - Stripe refunds;
--   - Stripe payouts;
--   - provider reconciliation state.
--
-- Important architectural rules:
--
--   - payment confirmation is server-side;
--   - a Stripe payment cannot become SUCCEEDED without a
--     verified Stripe event reference;
--   - webhook processing is idempotent;
--   - MANUAL bookings carry zero marketplace commission;
--   - manual payment records do not represent money held or
--     transferred by Boatly;
--   - security deposits are never commissionable;
--   - payout rows represent Stripe provider state, not an
--     internal Boatly wallet;
--   - provider/database mismatches are surfaced explicitly
--     through reconciliation state.
--
-- Security:
--   RLS is enabled immediately.
--   Policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================


create type public.stripe_connected_account_status as enum (
  'PENDING',
  'RESTRICTED',
  'ACTIVE',
  'DISABLED'
);


create type public.stripe_event_processing_status as enum (
  'RECEIVED',
  'PROCESSING',
  'PROCESSED',
  'FAILED',
  'IGNORED'
);


create type public.payment_provider as enum (
  'STRIPE'
);


create type public.payment_purpose as enum (
  'BOOKING_PAYMENT',
  'SECURITY_DEPOSIT'
);


create type public.payment_status as enum (
  'REQUIRES_PAYMENT_METHOD',
  'REQUIRES_CONFIRMATION',
  'REQUIRES_ACTION',
  'PROCESSING',
  'REQUIRES_CAPTURE',
  'SUCCEEDED',
  'CANCELLED',
  'PARTIALLY_REFUNDED',
  'REFUNDED'
);


create type public.financial_reconciliation_status as enum (
  'PENDING',
  'MATCHED',
  'MISMATCH',
  'RESOLVED'
);


create type public.manual_payment_record_type as enum (
  'PAYMENT',
  'REFUND'
);


create type public.manual_payment_method as enum (
  'CASH',
  'CARD_EXTERNAL',
  'BANK_TRANSFER',
  'OTHER'
);


create type public.manual_payment_record_status as enum (
  'RECORDED',
  'VOIDED'
);


create type public.refund_status as enum (
  'PENDING',
  'REQUIRES_ACTION',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);


create type public.payout_status as enum (
  'PENDING',
  'IN_TRANSIT',
  'PAID',
  'FAILED',
  'CANCELLED'
);


-- ============================================================
-- STRIPE EVENTS
-- ============================================================
--
-- Persistence layer for VERIFIED Stripe events.
--
-- stripe_event_id preserves the original Stripe Event ID.
--
-- idempotency_key is the logical deduplication key determined
-- by the webhook integration.
--
-- This matters because:
--
--   - the same event may be delivered more than once;
--   - different Stripe Event objects may occasionally describe
--     the same logical provider change;
--   - event delivery order must not be trusted.
--
-- Payload retention policy will be defined by the privacy and
-- operational retention workstream.
-- ============================================================

create table public.stripe_events (
  id uuid primary key default gen_random_uuid(),

  stripe_event_id text not null unique,

  idempotency_key text not null unique,

  event_type text not null,

  object_id text,

  connected_account_id text,

  api_version text,

  livemode boolean not null,

  signature_verified boolean not null default false,

  processing_status
    public.stripe_event_processing_status
    not null default 'RECEIVED',

  payload jsonb not null,

  delivery_count integer not null default 1,
  processing_attempt_count integer not null default 0,

  received_at timestamptz not null default now(),
  last_received_at timestamptz not null default now(),

  processed_at timestamptz,

  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stripe_events_event_id_not_blank
    check (
      length(trim(stripe_event_id)) > 0
    ),

  constraint stripe_events_idempotency_key_not_blank
    check (
      length(trim(idempotency_key)) > 0
    ),

  constraint stripe_events_event_type_not_blank
    check (
      length(trim(event_type)) > 0
    ),

  constraint stripe_events_object_id_not_blank
    check (
      object_id is null
      or length(trim(object_id)) > 0
    ),

  constraint stripe_events_connected_account_not_blank
    check (
      connected_account_id is null
      or length(trim(connected_account_id)) > 0
    ),

  constraint stripe_events_payload_object
    check (
      jsonb_typeof(payload) = 'object'
    ),

  constraint stripe_events_delivery_count_positive
    check (
      delivery_count > 0
    ),

  constraint stripe_events_attempt_count_non_negative
    check (
      processing_attempt_count >= 0
    ),

  constraint stripe_events_error_not_blank
    check (
      last_error is null
      or length(trim(last_error)) > 0
    ),

  constraint stripe_events_processed_consistency
    check (
      processing_status <> 'PROCESSED'
      or processed_at is not null
    )
);


create index stripe_events_event_type_idx
  on public.stripe_events(event_type);


create index stripe_events_object_id_idx
  on public.stripe_events(object_id)
  where object_id is not null;


create index stripe_events_connected_account_idx
  on public.stripe_events(connected_account_id)
  where connected_account_id is not null;


create index stripe_events_processing_status_idx
  on public.stripe_events(processing_status);


create index stripe_events_received_at_idx
  on public.stripe_events(received_at);


create trigger stripe_events_set_updated_at
before update on public.stripe_events
for each row
execute function public.set_updated_at();


-- ============================================================
-- STRIPE CONNECTED ACCOUNTS
-- ============================================================
--
-- One Stripe Connect account per Boatly operator workspace.
--
-- No Stripe secret, API key or account credential is stored
-- here.
--
-- requirements_snapshot and capabilities_snapshot preserve the
-- last provider state observed by the trusted server.
-- ============================================================

create table public.stripe_connected_accounts (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null unique
    references public.operators(id)
    on delete cascade,

  stripe_account_id text not null unique,

  status public.stripe_connected_account_status
    not null default 'PENDING',

  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,

  requirements_snapshot jsonb not null default '{}'::jsonb,
  capabilities_snapshot jsonb not null default '{}'::jsonb,

  onboarding_completed_at timestamptz,
  last_synced_at timestamptz,

  last_stripe_event_id uuid
    references public.stripe_events(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stripe_connected_accounts_id_not_blank
    check (
      length(trim(stripe_account_id)) > 0
    ),

  constraint stripe_connected_accounts_requirements_object
    check (
      jsonb_typeof(requirements_snapshot) = 'object'
    ),

  constraint stripe_connected_accounts_capabilities_object
    check (
      jsonb_typeof(capabilities_snapshot) = 'object'
    )
);


create index stripe_connected_accounts_status_idx
  on public.stripe_connected_accounts(status);


create trigger stripe_connected_accounts_set_updated_at
before update on public.stripe_connected_accounts
for each row
execute function public.set_updated_at();


alter table public.stripe_connected_accounts
  add constraint stripe_connected_accounts_operator_id_id_key
  unique (
    operator_id,
    id
  );


-- ============================================================
-- PAYMENTS
-- ============================================================
--
-- Stripe Connect payments initiated through Boatly.
--
-- Each row represents one provider PaymentIntent lifecycle.
--
-- Multiple attempts may therefore exist for the same booking.
--
-- The browser must never be the authority for SUCCEEDED state.
-- SUCCEEDED / refunded-success states require a reference to a
-- signature-verified Stripe event.
-- ============================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  stripe_connected_account_id uuid not null,

  provider public.payment_provider
    not null default 'STRIPE',

  purpose public.payment_purpose not null,

  provider_payment_intent_id text not null unique,

  provider_latest_charge_id text,

  provider_create_idempotency_key text not null unique,

  amount_cents integer not null,

  currency text not null,

  status public.payment_status not null,

  amount_received_cents integer not null default 0,
  amount_refunded_cents integer not null default 0,

  platform_fee_cents integer not null default 0,

  reconciliation_status
    public.financial_reconciliation_status
    not null default 'PENDING',

  reconciliation_note text,

  provider_status_raw text,

  provider_state_snapshot jsonb not null default '{}'::jsonb,

  failure_code text,
  failure_message text,

  succeeded_via_stripe_event_id uuid
    references public.stripe_events(id)
    on delete restrict,

  last_stripe_event_id uuid
    references public.stripe_events(id)
    on delete set null,

  succeeded_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payments_booking_operator_fk
    foreign key (
      operator_id,
      booking_id
    )
    references public.bookings(
      operator_id,
      id
    )
    on delete restrict,

  constraint payments_connected_account_operator_fk
    foreign key (
      operator_id,
      stripe_connected_account_id
    )
    references public.stripe_connected_accounts(
      operator_id,
      id
    )
    on delete restrict,

  constraint payments_intent_id_not_blank
    check (
      length(trim(provider_payment_intent_id)) > 0
    ),

  constraint payments_charge_id_not_blank
    check (
      provider_latest_charge_id is null
      or length(trim(provider_latest_charge_id)) > 0
    ),

  constraint payments_idempotency_key_not_blank
    check (
      length(trim(provider_create_idempotency_key)) > 0
    ),

  constraint payments_amount_positive
    check (
      amount_cents > 0
    ),

  constraint payments_currency_format
    check (
      currency = upper(currency)
      and length(currency) = 3
    ),

  constraint payments_received_non_negative
    check (
      amount_received_cents >= 0
      and amount_received_cents <= amount_cents
    ),

  constraint payments_refunded_non_negative
    check (
      amount_refunded_cents >= 0
      and amount_refunded_cents <= amount_received_cents
    ),

  constraint payments_platform_fee_non_negative
    check (
      platform_fee_cents >= 0
    ),

  constraint payments_security_deposit_not_commissioned
    check (
      purpose <> 'SECURITY_DEPOSIT'
      or platform_fee_cents = 0
    ),

  constraint payments_reconciliation_note_not_blank
    check (
      reconciliation_note is null
      or length(trim(reconciliation_note)) > 0
    ),

  constraint payments_provider_state_object
    check (
      jsonb_typeof(provider_state_snapshot) = 'object'
    )
);


create unique index payments_provider_charge_unique_idx
  on public.payments(provider_latest_charge_id)
  where provider_latest_charge_id is not null;


create index payments_booking_id_idx
  on public.payments(booking_id);


create index payments_operator_id_idx
  on public.payments(operator_id);


create index payments_status_idx
  on public.payments(status);


create index payments_reconciliation_idx
  on public.payments(reconciliation_status);


create index payments_booking_status_idx
  on public.payments(
    booking_id,
    status
  );


create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();


alter table public.payments
  add constraint payments_operator_booking_id_key
  unique (
    operator_id,
    booking_id,
    id
  );


-- ============================================================
-- PAYMENT INTEGRITY TRIGGER
-- ============================================================
--
-- Enforces:
--
--   - MANUAL booking -> zero platform fee;
--   - Stripe payment currency compatibility with booking
--     snapshot when already available;
--   - successful state only through a verified Stripe event.
-- ============================================================

create or replace function public.validate_stripe_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_source public.booking_source;
  linked_currency text;
  success_event_verified boolean;
begin

  select
    b.source,
    b.currency_snapshot
  into
    linked_source,
    linked_currency
  from public.bookings b
  where b.id = new.booking_id
    and b.operator_id = new.operator_id;


  if not found then
    raise exception
      'Linked booking does not exist for this operator';
  end if;


  if linked_source = 'MANUAL'
     and new.platform_fee_cents <> 0 then

    raise exception
      'MANUAL bookings cannot carry a Boatly marketplace platform fee';

  end if;


  if linked_currency is not null
     and linked_currency <> new.currency then

    raise exception
      'Payment currency must match booking currency snapshot';

  end if;


  if new.status in (
    'SUCCEEDED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
  ) then

    if new.succeeded_via_stripe_event_id is null then
      raise exception
        'Successful Stripe payment state requires a verified Stripe event';
    end if;


    select se.signature_verified
    into success_event_verified
    from public.stripe_events se
    where se.id =
      new.succeeded_via_stripe_event_id;


    if not coalesce(
      success_event_verified,
      false
    ) then

      raise exception
        'Stripe payment success event is not signature verified';

    end if;


    if new.succeeded_at is null then
      new.succeeded_at = now();
    end if;

  end if;


  if new.status = 'CANCELLED'
     and new.cancelled_at is null then

    new.cancelled_at = now();

  end if;


  return new;
end;
$$;


create trigger payments_validate_stripe
before insert or update
on public.payments
for each row
execute function public.validate_stripe_payment();


-- ============================================================
-- MANUAL / OFF-PLATFORM PAYMENT RECORDS
-- ============================================================
--
-- Records external financial activity reported by an operator.
--
-- Examples:
--
--   CASH payment
--   external POS payment
--   bank transfer
--   external refund
--
-- These rows do NOT mean Boatly held or transferred the money.
--
-- They are permitted only for MANUAL bookings.
-- ============================================================

create table public.manual_payment_records (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  record_type public.manual_payment_record_type not null,

  payment_method public.manual_payment_method not null,

  amount_cents integer not null,

  currency text not null,

  status public.manual_payment_record_status
    not null default 'RECORDED',

  external_reference text,

  note text,

  occurred_at timestamptz not null default now(),

  recorded_by uuid
    references auth.users(id)
    on delete set null,

  voided_at timestamptz,

  voided_by uuid
    references auth.users(id)
    on delete set null,

  void_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint manual_payment_records_booking_operator_fk
    foreign key (
      operator_id,
      booking_id
    )
    references public.bookings(
      operator_id,
      id
    )
    on delete restrict,

  constraint manual_payment_records_amount_positive
    check (
      amount_cents > 0
    ),

  constraint manual_payment_records_currency_format
    check (
      currency = upper(currency)
      and length(currency) = 3
    ),

  constraint manual_payment_records_reference_not_blank
    check (
      external_reference is null
      or length(trim(external_reference)) > 0
    ),

  constraint manual_payment_records_note_not_blank
    check (
      note is null
      or length(trim(note)) > 0
    ),

  constraint manual_payment_records_void_reason_not_blank
    check (
      void_reason is null
      or length(trim(void_reason)) > 0
    ),

  constraint manual_payment_records_void_consistency
    check (
      (
        status = 'RECORDED'
        and voided_at is null
        and voided_by is null
        and void_reason is null
      )
      or
      (
        status = 'VOIDED'
        and voided_at is not null
        and void_reason is not null
      )
    )
);


create index manual_payment_records_booking_id_idx
  on public.manual_payment_records(booking_id);


create index manual_payment_records_operator_id_idx
  on public.manual_payment_records(operator_id);


create index manual_payment_records_booking_status_idx
  on public.manual_payment_records(
    booking_id,
    status
  );


create trigger manual_payment_records_set_updated_at
before update on public.manual_payment_records
for each row
execute function public.set_updated_at();


-- ============================================================
-- MANUAL PAYMENT RECORD VALIDATION
-- ============================================================

create or replace function public.validate_manual_payment_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_source public.booking_source;
  linked_currency text;
begin

  select
    b.source,
    b.currency_snapshot
  into
    linked_source,
    linked_currency
  from public.bookings b
  where b.id = new.booking_id
    and b.operator_id = new.operator_id;


  if not found then
    raise exception
      'Linked booking does not exist for this operator';
  end if;


  if linked_source <> 'MANUAL' then
    raise exception
      'Manual payment records are allowed only for MANUAL bookings';
  end if;


  if linked_currency is not null
     and linked_currency <> new.currency then

    raise exception
      'Manual payment currency must match booking currency snapshot';

  end if;


  return new;
end;
$$;


create trigger manual_payment_records_validate
before insert or update
on public.manual_payment_records
for each row
execute function public.validate_manual_payment_record();


-- ============================================================
-- PROTECT MANUAL FINANCIAL RECORDS
-- ============================================================
--
-- Recorded financial facts cannot be rewritten.
--
-- A record may only transition from RECORDED to VOIDED.
-- ============================================================

create or replace function public.protect_manual_payment_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if old.status = 'VOIDED' then
    raise exception
      'Voided manual payment records are immutable';
  end if;


  if
    new.operator_id
      is distinct from old.operator_id

    or new.booking_id
      is distinct from old.booking_id

    or new.record_type
      is distinct from old.record_type

    or new.payment_method
      is distinct from old.payment_method

    or new.amount_cents
      is distinct from old.amount_cents

    or new.currency
      is distinct from old.currency

    or new.external_reference
      is distinct from old.external_reference

    or new.occurred_at
      is distinct from old.occurred_at

    or new.recorded_by
      is distinct from old.recorded_by

  then
    raise exception
      'Recorded manual financial facts are immutable';
  end if;


  if old.status = 'RECORDED'
     and new.status = 'VOIDED' then

    if new.void_reason is null then
      raise exception
        'Void reason is required';
    end if;

    if new.voided_at is null then
      new.voided_at = now();
    end if;

    return new;

  end if;


  if new.status is distinct from old.status then
    raise exception
      'Invalid manual payment record status transition';
  end if;


  return new;
end;
$$;


create trigger manual_payment_records_protect
before update
on public.manual_payment_records
for each row
execute function public.protect_manual_payment_record();


-- ============================================================
-- REFUNDS
-- ============================================================
--
-- Stripe refund objects linked to Boatly Stripe payments.
--
-- Stripe refund behavior may depend on the eventual Connect
-- charge model. Provider-specific options are therefore kept in
-- provider_state_snapshot instead of hard-coding a destination
-- charge or separate-charge-and-transfer model here.
-- ============================================================

create table public.refunds (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  payment_id uuid not null,

  provider_refund_id text not null unique,

  provider_create_idempotency_key text not null unique,

  amount_cents integer not null,

  currency text not null,

  status public.refund_status not null default 'PENDING',

  reason_code text,

  provider_status_raw text,

  provider_state_snapshot jsonb not null default '{}'::jsonb,

  reconciliation_status
    public.financial_reconciliation_status
    not null default 'PENDING',

  reconciliation_note text,

  last_stripe_event_id uuid
    references public.stripe_events(id)
    on delete set null,

  succeeded_at timestamptz,
  failed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint refunds_payment_booking_operator_fk
    foreign key (
      operator_id,
      booking_id,
      payment_id
    )
    references public.payments(
      operator_id,
      booking_id,
      id
    )
    on delete restrict,

  constraint refunds_provider_id_not_blank
    check (
      length(trim(provider_refund_id)) > 0
    ),

  constraint refunds_idempotency_key_not_blank
    check (
      length(trim(provider_create_idempotency_key)) > 0
    ),

  constraint refunds_amount_positive
    check (
      amount_cents > 0
    ),

  constraint refunds_currency_format
    check (
      currency = upper(currency)
      and length(currency) = 3
    ),

  constraint refunds_reason_not_blank
    check (
      reason_code is null
      or length(trim(reason_code)) > 0
    ),

  constraint refunds_provider_state_object
    check (
      jsonb_typeof(provider_state_snapshot) = 'object'
    ),

  constraint refunds_reconciliation_note_not_blank
    check (
      reconciliation_note is null
      or length(trim(reconciliation_note)) > 0
    )
);


create index refunds_payment_id_idx
  on public.refunds(payment_id);


create index refunds_booking_id_idx
  on public.refunds(booking_id);


create index refunds_status_idx
  on public.refunds(status);


create index refunds_reconciliation_idx
  on public.refunds(reconciliation_status);


create trigger refunds_set_updated_at
before update on public.refunds
for each row
execute function public.set_updated_at();


-- ============================================================
-- REFUND PAYMENT VALIDATION
-- ============================================================

create or replace function public.validate_stripe_refund()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  payment_currency text;
  payment_received integer;
begin

  select
    p.currency,
    p.amount_received_cents
  into
    payment_currency,
    payment_received
  from public.payments p
  where p.id = new.payment_id
    and p.operator_id = new.operator_id
    and p.booking_id = new.booking_id;


  if not found then
    raise exception
      'Linked Stripe payment does not exist';
  end if;


  if new.currency <> payment_currency then
    raise exception
      'Refund currency must match payment currency';
  end if;


  if new.amount_cents > payment_received then
    raise exception
      'Single refund amount cannot exceed received payment amount';
  end if;


  if new.status = 'SUCCEEDED'
     and new.succeeded_at is null then
    new.succeeded_at = now();
  end if;


  if new.status = 'FAILED'
     and new.failed_at is null then
    new.failed_at = now();
  end if;


  return new;
end;
$$;


create trigger refunds_validate
before insert or update
on public.refunds
for each row
execute function public.validate_stripe_refund();


-- ============================================================
-- PAYOUTS
-- ============================================================
--
-- Stripe payout visibility for an operator's connected account.
--
-- These rows represent Stripe provider payout state.
--
-- They do NOT represent a custom Boatly wallet or internal
-- customer-fund balance.
-- ============================================================

create table public.payouts (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  stripe_connected_account_id uuid not null,

  provider_payout_id text not null unique,

  amount_cents integer not null,

  currency text not null,

  status public.payout_status not null,

  arrival_date date,

  failure_code text,
  failure_message text,

  provider_state_snapshot jsonb not null default '{}'::jsonb,

  reconciliation_status
    public.financial_reconciliation_status
    not null default 'PENDING',

  reconciliation_note text,

  last_stripe_event_id uuid
    references public.stripe_events(id)
    on delete set null,

  paid_at timestamptz,
  failed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payouts_connected_account_operator_fk
    foreign key (
      operator_id,
      stripe_connected_account_id
    )
    references public.stripe_connected_accounts(
      operator_id,
      id
    )
    on delete restrict,

  constraint payouts_provider_id_not_blank
    check (
      length(trim(provider_payout_id)) > 0
    ),

  constraint payouts_amount_positive
    check (
      amount_cents > 0
    ),

  constraint payouts_currency_format
    check (
      currency = upper(currency)
      and length(currency) = 3
    ),

  constraint payouts_provider_state_object
    check (
      jsonb_typeof(provider_state_snapshot) = 'object'
    ),

  constraint payouts_reconciliation_note_not_blank
    check (
      reconciliation_note is null
      or length(trim(reconciliation_note)) > 0
    )
);


create index payouts_operator_id_idx
  on public.payouts(operator_id);


create index payouts_connected_account_idx
  on public.payouts(stripe_connected_account_id);


create index payouts_status_idx
  on public.payouts(status);


create index payouts_arrival_date_idx
  on public.payouts(arrival_date);


create index payouts_reconciliation_idx
  on public.payouts(reconciliation_status);


create trigger payouts_set_updated_at
before update on public.payouts
for each row
execute function public.set_updated_at();


create or replace function public.prepare_payout_status_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if new.status = 'PAID'
     and new.paid_at is null then
    new.paid_at = now();
  end if;


  if new.status = 'FAILED'
     and new.failed_at is null then
    new.failed_at = now();
  end if;


  return new;
end;
$$;


create trigger payouts_prepare_status
before insert or update
on public.payouts
for each row
execute function public.prepare_payout_status_timestamps();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.stripe_events
  enable row level security;

alter table public.stripe_connected_accounts
  enable row level security;

alter table public.payments
  enable row level security;

alter table public.manual_payment_records
  enable row level security;

alter table public.refunds
  enable row level security;

alter table public.payouts
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.stripe_events is
  'Verified Stripe event persistence and webhook idempotency/reconciliation state. No webhook secret is stored.';


comment on table public.stripe_connected_accounts is
  'Stripe Connect account mapping and observed onboarding/capability state for Boatly operators.';


comment on table public.payments is
  'Stripe Connect booking payments. Successful payment state requires a signature-verified Stripe event.';


comment on column public.payments.platform_fee_cents is
  'Actual Boatly platform fee associated with this provider payment. MANUAL bookings and security-deposit payments must carry zero platform fee.';


comment on table public.manual_payment_records is
  'Operator-recorded off-platform payment/refund activity for MANUAL bookings. These records do not represent money held or moved by Boatly.';


comment on table public.refunds is
  'Stripe refunds linked to Stripe booking payments. Provider mismatch is represented explicitly through reconciliation state.';


comment on table public.payouts is
  'Observed Stripe payout state for operator connected accounts. This table is not a Boatly wallet or stored-value balance.';


commit;