-- ============================================================
-- BOATLY
-- Migration: Platform Admin Cases Foundation
-- ============================================================
--
-- Purpose:
--   Create a unified Boatly internal case-management foundation
--   for support, moderation, compliance, finance, privacy, tax
--   and security-related operational workflows.
--
-- Important:
--   This is a workflow/case layer.
--
--   Domain-specific source tables remain authoritative:
--
--     privacy_requests
--     operator_verifications
--     boat_publication_reviews
--     payments/refunds
--     bookings
--     audit_logs
--
-- Security:
--   RLS enabled immediately.
--   Platform-role policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.platform_case_type as enum (
  'SUPPORT',
  'MODERATION',
  'COMPLIANCE',
  'FINANCE',
  'PRIVACY',
  'TAX',
  'SECURITY_INCIDENT',
  'OTHER'
);


create type public.platform_case_status as enum (
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED'
);


create type public.platform_case_priority as enum (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);


-- ============================================================
-- PLATFORM CASES
-- ============================================================

create table public.platform_cases (
  id uuid primary key default gen_random_uuid(),

  case_type public.platform_case_type not null,

  status public.platform_case_status
    not null default 'OPEN',

  priority public.platform_case_priority
    not null default 'NORMAL',

  subject text not null,

  description text,

  operator_id uuid
    references public.operators(id)
    on delete set null,

  booking_id uuid
    references public.bookings(id)
    on delete set null,

  boat_id uuid
    references public.boats(id)
    on delete set null,

  user_id uuid
    references auth.users(id)
    on delete set null,

  privacy_request_id uuid
    references public.privacy_requests(id)
    on delete set null,

  assigned_to_user_id uuid
    references auth.users(id)
    on delete set null,

  opened_by_user_id uuid
    references auth.users(id)
    on delete set null,

  resolution_summary text,

  metadata jsonb not null default '{}'::jsonb,

  resolved_at timestamptz,

  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint platform_cases_subject_not_blank
    check (
      length(trim(subject)) > 0
    ),

  constraint platform_cases_description_not_blank
    check (
      description is null
      or length(trim(description)) > 0
    ),

  constraint platform_cases_resolution_not_blank
    check (
      resolution_summary is null
      or length(trim(resolution_summary)) > 0
    ),

  constraint platform_cases_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    ),

  constraint platform_cases_closed_consistency
    check (
      status <> 'CLOSED'
      or (
        resolved_at is not null
        and closed_at is not null
      )
    ),

  constraint platform_cases_resolved_consistency
    check (
      status <> 'RESOLVED'
      or resolved_at is not null
    )
);


create index platform_cases_type_idx
  on public.platform_cases(case_type);


create index platform_cases_status_idx
  on public.platform_cases(status);


create index platform_cases_priority_idx
  on public.platform_cases(priority);


create index platform_cases_assignment_idx
  on public.platform_cases(
    assigned_to_user_id,
    status
  )
  where assigned_to_user_id is not null;


create index platform_cases_operator_idx
  on public.platform_cases(operator_id)
  where operator_id is not null;


create index platform_cases_booking_idx
  on public.platform_cases(booking_id)
  where booking_id is not null;


create index platform_cases_boat_idx
  on public.platform_cases(boat_id)
  where boat_id is not null;


create index platform_cases_privacy_request_idx
  on public.platform_cases(privacy_request_id)
  where privacy_request_id is not null;


create trigger platform_cases_set_updated_at
before update on public.platform_cases
for each row
execute function public.set_updated_at();


-- ============================================================
-- CASE STATUS TIMESTAMPS
-- ============================================================

create or replace function public.prepare_platform_case()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if new.status = 'RESOLVED'
     and new.resolved_at is null then

    new.resolved_at = now();

  end if;


  if new.status = 'CLOSED' then

    if new.resolved_at is null then
      new.resolved_at = now();
    end if;

    if new.closed_at is null then
      new.closed_at = now();
    end if;

  end if;


  if new.status <> 'CLOSED' then
    new.closed_at = null;
  end if;


  return new;
end;
$$;


create trigger platform_cases_prepare
before insert or update
on public.platform_cases
for each row
execute function public.prepare_platform_case();


-- ============================================================
-- PLATFORM CASE EVENTS
-- ============================================================
--
-- Append-only case timeline.
--
-- Examples:
--
--   CASE_OPENED
--   ASSIGNED
--   STATUS_CHANGED
--   INTERNAL_NOTE_ADDED
--   CUSTOMER_CONTACTED
--   CASE_RESOLVED
--
-- Security-sensitive administrative actions should additionally
-- be written to audit_logs where appropriate.
-- ============================================================

create table public.platform_case_events (
  id uuid primary key default gen_random_uuid(),

  platform_case_id uuid not null
    references public.platform_cases(id)
    on delete cascade,

  event_type text not null,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  message text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint platform_case_events_type_format
    check (
      event_type = upper(event_type)
      and event_type ~ '^[A-Z0-9_]+$'
    ),

  constraint platform_case_events_message_not_blank
    check (
      message is null
      or length(trim(message)) > 0
    ),

  constraint platform_case_events_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);


create index platform_case_events_case_idx
  on public.platform_case_events(
    platform_case_id,
    occurred_at
  );


create index platform_case_events_type_idx
  on public.platform_case_events(event_type);


create or replace function public.prevent_platform_case_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'Platform case events are append-only';
end;
$$;


create trigger platform_case_events_prevent_mutation
before update or delete
on public.platform_case_events
for each row
execute function public.prevent_platform_case_event_mutation();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.platform_cases
  enable row level security;

alter table public.platform_case_events
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.platform_cases is
  'Unified Boatly internal back-office cases for support, moderation, compliance, finance, privacy, tax and security workflows.';


comment on table public.platform_case_events is
  'Append-only operational timeline for Boatly platform cases. Sensitive administrative actions may additionally require audit_logs entries.';


commit;