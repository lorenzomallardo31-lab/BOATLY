-- ============================================================
-- BOATLY
-- Migration: Reviews & Audit Foundation
-- ============================================================
--
-- Purpose:
--   Create:
--
--   - verified marketplace booking reviews;
--   - operator responses;
--   - review moderation state;
--   - platform/system audit trail.
--
-- Important:
--   Reviews are linked to completed MARKETPLACE bookings.
--
--   booking_events remain the booking-domain timeline.
--   audit_logs are the cross-platform operational/security
--   audit trail.
--
-- Security:
--   RLS enabled immediately.
--   Policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.review_moderation_status as enum (
  'PENDING',
  'PUBLISHED',
  'HIDDEN',
  'REJECTED'
);


create type public.audit_actor_type as enum (
  'CUSTOMER',
  'OPERATOR',
  'PLATFORM',
  'SYSTEM'
);


-- ============================================================
-- SUPPORT CUSTOMER-CONSISTENT BOOKING FK
-- ============================================================

alter table public.bookings
  add constraint bookings_operator_booking_boat_customer_key
  unique (
    operator_id,
    id,
    boat_id,
    customer_user_id
  );


-- ============================================================
-- REVIEWS
-- ============================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  boat_id uuid not null,

  customer_user_id uuid not null,

  rating smallint not null,

  title text,
  body text,

  moderation_status
    public.review_moderation_status
    not null default 'PENDING',

  published_at timestamptz,

  moderation_note text,

  moderated_by uuid
    references auth.users(id)
    on delete set null,

  moderated_at timestamptz,

  operator_response text,

  responded_by uuid
    references auth.users(id)
    on delete set null,

  responded_at timestamptz,

  submitted_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_booking_customer_fk
    foreign key (
      operator_id,
      booking_id,
      boat_id,
      customer_user_id
    )
    references public.bookings(
      operator_id,
      id,
      boat_id,
      customer_user_id
    )
    on delete restrict,

  constraint reviews_rating_range
    check (
      rating between 1 and 5
    ),

  constraint reviews_title_not_blank
    check (
      title is null
      or length(trim(title)) > 0
    ),

  constraint reviews_body_not_blank
    check (
      body is null
      or length(trim(body)) > 0
    ),

  constraint reviews_moderation_note_not_blank
    check (
      moderation_note is null
      or length(trim(moderation_note)) > 0
    ),

  constraint reviews_operator_response_not_blank
    check (
      operator_response is null
      or length(trim(operator_response)) > 0
    ),

  constraint reviews_response_consistency
    check (
      (
        operator_response is null
        and responded_by is null
        and responded_at is null
      )
      or
      (
        operator_response is not null
        and responded_by is not null
        and responded_at is not null
      )
    ),

  constraint reviews_moderation_consistency
    check (
      (
        moderation_status = 'PENDING'
      )
      or
      (
        moderation_status <> 'PENDING'
        and moderated_at is not null
      )
    ),

  constraint reviews_publication_consistency
    check (
      (
        moderation_status = 'PUBLISHED'
        and published_at is not null
      )
      or
      (
        moderation_status <> 'PUBLISHED'
        and published_at is null
      )
    )
);


create unique index reviews_one_per_booking_idx
  on public.reviews(booking_id);


create index reviews_boat_idx
  on public.reviews(boat_id);


create index reviews_operator_idx
  on public.reviews(operator_id);


create index reviews_customer_idx
  on public.reviews(customer_user_id);


create index reviews_public_boat_idx
  on public.reviews(
    boat_id,
    rating
  )
  where moderation_status = 'PUBLISHED';


create index reviews_moderation_status_idx
  on public.reviews(moderation_status);


create trigger reviews_set_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();


-- ============================================================
-- REVIEW ELIGIBILITY / STRUCTURAL PROTECTION
-- ============================================================

create or replace function public.validate_marketplace_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_source public.booking_source;
  linked_status public.booking_status;
begin

  if tg_op = 'UPDATE' then

    if
      new.operator_id
        is distinct from old.operator_id

      or new.booking_id
        is distinct from old.booking_id

      or new.boat_id
        is distinct from old.boat_id

      or new.customer_user_id
        is distinct from old.customer_user_id

    then
      raise exception
        'Review booking identity cannot be changed';
    end if;

  end if;


  select
    b.source,
    b.status
  into
    linked_source,
    linked_status
  from public.bookings b
  where b.operator_id = new.operator_id
    and b.id = new.booking_id
    and b.boat_id = new.boat_id
    and b.customer_user_id = new.customer_user_id;


  if not found then
    raise exception
      'Linked customer booking does not exist';
  end if;


  if linked_source <> 'MARKETPLACE' then
    raise exception
      'Reviews require a MARKETPLACE booking';
  end if;


  if linked_status <> 'COMPLETED' then
    raise exception
      'Reviews require a COMPLETED booking';
  end if;


  if new.moderation_status = 'PUBLISHED'
     and new.published_at is null then
    new.published_at = now();
  end if;


  if new.moderation_status <> 'PUBLISHED' then
    new.published_at = null;
  end if;


  return new;
end;
$$;


create trigger reviews_validate_marketplace
before insert or update
on public.reviews
for each row
execute function public.validate_marketplace_review();


-- ============================================================
-- AUDIT LOGS
-- ============================================================
--
-- Cross-platform security / operational audit history.
--
-- Examples:
--
--   OPERATOR_SUSPENDED
--   BOAT_PUBLICATION_APPROVED
--   REFUND_MANUALLY_RECONCILED
--   USER_ROLE_GRANTED
--
-- Sensitive request metadata should be minimized.
--
-- UPDATE is prohibited.
-- Deletion remains reserved for future privileged retention
-- workflows rather than being permanently blocked by trigger.
-- ============================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_type public.audit_actor_type not null,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  operator_id uuid
    references public.operators(id)
    on delete set null,

  booking_id uuid
    references public.bookings(id)
    on delete set null,

  action text not null,

  entity_type text not null,

  entity_id text,

  request_id text,

  reason text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint audit_logs_action_format
    check (
      action = upper(action)
      and action ~ '^[A-Z0-9_]+$'
    ),

  constraint audit_logs_entity_type_format
    check (
      entity_type = upper(entity_type)
      and entity_type ~ '^[A-Z0-9_]+$'
    ),

  constraint audit_logs_entity_id_not_blank
    check (
      entity_id is null
      or length(trim(entity_id)) > 0
    ),

  constraint audit_logs_request_id_not_blank
    check (
      request_id is null
      or length(trim(request_id)) > 0
    ),

  constraint audit_logs_reason_not_blank
    check (
      reason is null
      or length(trim(reason)) > 0
    ),

  constraint audit_logs_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);


create index audit_logs_actor_user_idx
  on public.audit_logs(actor_user_id)
  where actor_user_id is not null;


create index audit_logs_operator_idx
  on public.audit_logs(operator_id)
  where operator_id is not null;


create index audit_logs_booking_idx
  on public.audit_logs(booking_id)
  where booking_id is not null;


create index audit_logs_action_idx
  on public.audit_logs(action);


create index audit_logs_entity_idx
  on public.audit_logs(
    entity_type,
    entity_id
  );


create index audit_logs_occurred_at_idx
  on public.audit_logs(occurred_at);


-- ============================================================
-- AUDIT LOG UPDATE IMMUTABILITY
-- ============================================================

create or replace function public.prevent_audit_log_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'Audit log records cannot be updated';
end;
$$;


create trigger audit_logs_prevent_update
before update
on public.audit_logs
for each row
execute function public.prevent_audit_log_update();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.reviews
  enable row level security;

alter table public.audit_logs
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.reviews is
  'Verified reviews linked to completed marketplace bookings. One review is permitted per booking.';


comment on table public.audit_logs is
  'Cross-platform operational and security audit trail, separate from booking-domain events.';


commit;