-- ============================================================
-- BOATLY
-- Migration: Privacy & Data Governance Foundation
-- ============================================================
--
-- Purpose:
--   Create the data-governance foundation for:
--
--   - data-subject/privacy requests;
--   - append-only request history;
--   - consent grant/withdrawal evidence;
--   - versioned data-retention policies.
--
-- Important:
--   This schema supports privacy workflows but does not encode
--   a legal conclusion about whether a specific request must
--   ultimately be granted, rejected or partially fulfilled.
--
--   Retention periods are configuration/legal-policy data and
--   are intentionally not hard-coded in this migration.
--
-- Security:
--   RLS enabled immediately.
--   Authorization policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.privacy_request_type as enum (
  'ACCESS',
  'RECTIFICATION',
  'ERASURE',
  'RESTRICTION',
  'PORTABILITY',
  'OBJECTION',
  'AUTOMATED_DECISION_REVIEW',
  'OTHER'
);


create type public.privacy_request_status as enum (
  'RECEIVED',
  'VERIFYING_IDENTITY',
  'IN_REVIEW',
  'ACTION_IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'WITHDRAWN'
);


create type public.privacy_identity_verification_status as enum (
  'NOT_REQUIRED',
  'PENDING',
  'VERIFIED',
  'FAILED'
);


create type public.consent_action as enum (
  'GRANTED',
  'WITHDRAWN'
);


create type public.retention_policy_status as enum (
  'DRAFT',
  'ACTIVE',
  'RETIRED'
);


create type public.retention_action as enum (
  'DELETE',
  'ANONYMIZE',
  'REVIEW'
);


-- ============================================================
-- PRIVACY REQUESTS
-- ============================================================
--
-- Tracks requests concerning data-subject/privacy rights.
--
-- requester snapshots remain available even when a linked
-- application account or CRM customer is later removed.
--
-- response_due_at is intentionally supplied by the trusted
-- workflow instead of being calculated from a hard-coded legal
-- deadline in the schema.
-- ============================================================

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),

  requester_user_id uuid
    references auth.users(id)
    on delete set null,

  operator_id uuid
    references public.operators(id)
    on delete set null,

  operator_customer_id uuid
    references public.operator_customers(id)
    on delete set null,

  requester_name_snapshot text not null,
  requester_email_snapshot text not null,

  request_type public.privacy_request_type not null,

  status public.privacy_request_status
    not null default 'RECEIVED',

  identity_verification_status
    public.privacy_identity_verification_status
    not null default 'PENDING',

  scope text,

  assigned_to uuid
    references auth.users(id)
    on delete set null,

  received_at timestamptz not null default now(),

  response_due_at timestamptz,

  identity_verified_at timestamptz,

  resolved_at timestamptz,

  decision_summary text,

  response_storage_path text,
  response_hash_sha256 text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint privacy_requests_name_not_blank
    check (
      length(trim(requester_name_snapshot)) > 0
    ),

  constraint privacy_requests_email_lowercase
    check (
      requester_email_snapshot =
        lower(requester_email_snapshot)
    ),

  constraint privacy_requests_email_not_blank
    check (
      length(trim(requester_email_snapshot)) > 0
    ),

  constraint privacy_requests_scope_not_blank
    check (
      scope is null
      or length(trim(scope)) > 0
    ),

  constraint privacy_requests_decision_not_blank
    check (
      decision_summary is null
      or length(trim(decision_summary)) > 0
    ),

  constraint privacy_requests_rejected_reason
    check (
      status <> 'REJECTED'
      or (
        decision_summary is not null
        and length(trim(decision_summary)) > 0
      )
    ),

  constraint privacy_requests_resolution_consistency
    check (
      (
        status in (
          'COMPLETED',
          'REJECTED',
          'WITHDRAWN'
        )
        and resolved_at is not null
      )
      or
      (
        status not in (
          'COMPLETED',
          'REJECTED',
          'WITHDRAWN'
        )
        and resolved_at is null
      )
    ),

  constraint privacy_requests_identity_consistency
    check (
      (
        identity_verification_status = 'VERIFIED'
        and identity_verified_at is not null
      )
      or
      (
        identity_verification_status <> 'VERIFIED'
        and identity_verified_at is null
      )
    ),

  constraint privacy_requests_response_artifact_consistency
    check (
      (
        response_storage_path is null
        and response_hash_sha256 is null
      )
      or
      (
        response_storage_path is not null
        and response_hash_sha256 is not null
      )
    ),

  constraint privacy_requests_response_path_not_blank
    check (
      response_storage_path is null
      or length(trim(response_storage_path)) > 0
    ),

  constraint privacy_requests_response_hash_format
    check (
      response_hash_sha256 is null
      or response_hash_sha256 ~ '^[a-f0-9]{64}$'
    ),

  constraint privacy_requests_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);


create index privacy_requests_user_idx
  on public.privacy_requests(requester_user_id)
  where requester_user_id is not null;


create index privacy_requests_customer_idx
  on public.privacy_requests(operator_customer_id)
  where operator_customer_id is not null;


create index privacy_requests_operator_idx
  on public.privacy_requests(operator_id)
  where operator_id is not null;


create index privacy_requests_email_idx
  on public.privacy_requests(
    lower(requester_email_snapshot)
  );


create index privacy_requests_status_idx
  on public.privacy_requests(status);


create index privacy_requests_type_idx
  on public.privacy_requests(request_type);


create index privacy_requests_due_idx
  on public.privacy_requests(response_due_at)
  where response_due_at is not null
    and status not in (
      'COMPLETED',
      'REJECTED',
      'WITHDRAWN'
    );


create trigger privacy_requests_set_updated_at
before update on public.privacy_requests
for each row
execute function public.set_updated_at();


-- ============================================================
-- PRIVACY REQUEST PREPARATION / FINAL LOCK
-- ============================================================

create or replace function public.prepare_and_protect_privacy_request()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_operator_id uuid;
begin

  -- ----------------------------------------------------------
  -- Keep operator/customer relationship coherent when a CRM
  -- customer is linked.
  -- ----------------------------------------------------------

  if new.operator_customer_id is not null then

    select oc.operator_id
    into linked_operator_id
    from public.operator_customers oc
    where oc.id = new.operator_customer_id;


    if not found then
      raise exception
        'Linked operator customer does not exist';
    end if;


    if new.operator_id is null then
      new.operator_id = linked_operator_id;
    elsif new.operator_id <> linked_operator_id then
      raise exception
        'Privacy request operator/customer mismatch';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- Final requests cannot be rewritten.
  -- Event/history retention and eventual deletion remain
  -- separate privileged retention concerns.
  -- ----------------------------------------------------------

  if tg_op = 'UPDATE'
     and old.status in (
       'COMPLETED',
       'REJECTED',
       'WITHDRAWN'
     ) then

    raise exception
      'Final privacy request records cannot be updated';

  end if;


  if new.identity_verification_status = 'VERIFIED'
     and new.identity_verified_at is null then

    new.identity_verified_at = now();

  end if;


  if new.identity_verification_status <> 'VERIFIED' then
    new.identity_verified_at = null;
  end if;


  if new.status in (
    'COMPLETED',
    'REJECTED',
    'WITHDRAWN'
  )
  and new.resolved_at is null then

    new.resolved_at = now();

  end if;


  if new.status not in (
    'COMPLETED',
    'REJECTED',
    'WITHDRAWN'
  ) then

    new.resolved_at = null;

  end if;


  return new;
end;
$$;


create trigger privacy_requests_prepare_and_protect
before insert or update
on public.privacy_requests
for each row
execute function public.prepare_and_protect_privacy_request();


-- ============================================================
-- PRIVACY REQUEST EVENTS
-- ============================================================
--
-- Append-only operational history.
-- ============================================================

create table public.privacy_request_events (
  id uuid primary key default gen_random_uuid(),

  privacy_request_id uuid not null
    references public.privacy_requests(id)
    on delete cascade,

  event_type text not null,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  from_status public.privacy_request_status,
  to_status public.privacy_request_status,

  message text,

  metadata jsonb not null default '{}'::jsonb,

  occurred_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint privacy_request_events_type_format
    check (
      event_type = upper(event_type)
      and event_type ~ '^[A-Z0-9_]+$'
    ),

  constraint privacy_request_events_message_not_blank
    check (
      message is null
      or length(trim(message)) > 0
    ),

  constraint privacy_request_events_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);


create index privacy_request_events_request_idx
  on public.privacy_request_events(
    privacy_request_id,
    occurred_at
  );


create index privacy_request_events_type_idx
  on public.privacy_request_events(event_type);


create or replace function public.prevent_privacy_request_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'Privacy request events are append-only';
end;
$$;


create trigger privacy_request_events_prevent_mutation
before update or delete
on public.privacy_request_events
for each row
execute function public.prevent_privacy_request_event_mutation();


-- ============================================================
-- CONSENT RECORDS
-- ============================================================
--
-- Append-only evidence of a consent grant or withdrawal.
--
-- Consent is deliberately separate from legal_acceptances:
--
--   legal_acceptances -> acceptance/evidence of a document;
--   consent_records   -> revocable consent event history.
--
-- subject_key_hash provides a pseudonymous stable correlation
-- key even if a linked Auth/CRM record is later removed.
-- ============================================================

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),

  subject_key_hash text not null,

  subject_user_id uuid
    references auth.users(id)
    on delete set null,

  operator_id uuid
    references public.operators(id)
    on delete set null,

  operator_customer_id uuid
    references public.operator_customers(id)
    on delete set null,

  purpose_code text not null,

  action public.consent_action not null,

  legal_document_version_id uuid
    references public.legal_document_versions(id)
    on delete restrict,

  evidence jsonb not null default '{}'::jsonb,

  recorded_by uuid
    references auth.users(id)
    on delete set null,

  occurred_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint consent_records_subject_hash_format
    check (
      subject_key_hash ~ '^[a-f0-9]{64}$'
    ),

  constraint consent_records_purpose_format
    check (
      purpose_code = upper(purpose_code)
      and purpose_code ~ '^[A-Z0-9_]+$'
    ),

  constraint consent_records_evidence_object
    check (
      jsonb_typeof(evidence) = 'object'
    )
);


create index consent_records_subject_purpose_idx
  on public.consent_records(
    subject_key_hash,
    purpose_code,
    occurred_at
  );


create index consent_records_user_idx
  on public.consent_records(subject_user_id)
  where subject_user_id is not null;


create index consent_records_customer_idx
  on public.consent_records(operator_customer_id)
  where operator_customer_id is not null;


create index consent_records_operator_idx
  on public.consent_records(operator_id)
  where operator_id is not null;


create or replace function public.prepare_consent_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_operator_id uuid;
begin

  if new.operator_customer_id is not null then

    select oc.operator_id
    into linked_operator_id
    from public.operator_customers oc
    where oc.id = new.operator_customer_id;


    if not found then
      raise exception
        'Linked operator customer does not exist';
    end if;


    if new.operator_id is null then
      new.operator_id = linked_operator_id;
    elsif new.operator_id <> linked_operator_id then
      raise exception
        'Consent record operator/customer mismatch';
    end if;

  end if;


  return new;
end;
$$;


create trigger consent_records_prepare
before insert
on public.consent_records
for each row
execute function public.prepare_consent_record();


create or replace function public.prevent_consent_record_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'Consent records are append-only';
end;
$$;


create trigger consent_records_prevent_mutation
before update or delete
on public.consent_records
for each row
execute function public.prevent_consent_record_mutation();


-- ============================================================
-- DATA RETENTION POLICIES
-- ============================================================
--
-- Versioned governance/configuration records.
--
-- No specific retention duration is seeded by this migration.
--
-- retention_period_days may remain NULL when the policy depends
-- on criteria expressed in retention_rule rather than a simple
-- fixed number of days.
-- ============================================================

create table public.data_retention_policies (
  id uuid primary key default gen_random_uuid(),

  policy_code text not null,

  version text not null,

  data_category text not null,

  purpose text not null,

  legal_basis_reference text,

  jurisdiction_country_code text not null default 'IT',

  retention_period_days integer,

  retention_rule text not null,

  post_retention_action public.retention_action not null,

  status public.retention_policy_status
    not null default 'DRAFT',

  effective_at timestamptz,

  retired_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint data_retention_policies_code_format
    check (
      policy_code = upper(policy_code)
      and policy_code ~ '^[A-Z0-9_]+$'
    ),

  constraint data_retention_policies_version_not_blank
    check (
      length(trim(version)) > 0
    ),

  constraint data_retention_policies_category_format
    check (
      data_category = upper(data_category)
      and data_category ~ '^[A-Z0-9_]+$'
    ),

  constraint data_retention_policies_purpose_not_blank
    check (
      length(trim(purpose)) > 0
    ),

  constraint data_retention_policies_legal_basis_not_blank
    check (
      legal_basis_reference is null
      or length(trim(legal_basis_reference)) > 0
    ),

  constraint data_retention_policies_country_format
    check (
      jurisdiction_country_code =
        upper(jurisdiction_country_code)
      and length(jurisdiction_country_code) = 2
    ),

  constraint data_retention_policies_period_positive
    check (
      retention_period_days is null
      or retention_period_days > 0
    ),

  constraint data_retention_policies_rule_not_blank
    check (
      length(trim(retention_rule)) > 0
    ),

  constraint data_retention_policies_active_consistency
    check (
      status <> 'ACTIVE'
      or effective_at is not null
    ),

  constraint data_retention_policies_retired_consistency
    check (
      (
        status = 'RETIRED'
        and retired_at is not null
      )
      or
      (
        status <> 'RETIRED'
        and retired_at is null
      )
    )
);


create unique index data_retention_policies_code_version_idx
  on public.data_retention_policies(
    policy_code,
    version,
    jurisdiction_country_code
  );


create unique index data_retention_policies_one_active_idx
  on public.data_retention_policies(
    policy_code,
    jurisdiction_country_code
  )
  where status = 'ACTIVE';


create index data_retention_policies_category_idx
  on public.data_retention_policies(data_category);


create index data_retention_policies_status_idx
  on public.data_retention_policies(status);


create trigger data_retention_policies_set_updated_at
before update on public.data_retention_policies
for each row
execute function public.set_updated_at();


-- ============================================================
-- RETENTION POLICY VERSION PROTECTION
-- ============================================================

create or replace function public.prepare_and_protect_retention_policy()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if tg_op = 'UPDATE'
     and old.status in (
       'ACTIVE',
       'RETIRED'
     ) then

    if
      new.policy_code
        is distinct from old.policy_code

      or new.version
        is distinct from old.version

      or new.data_category
        is distinct from old.data_category

      or new.purpose
        is distinct from old.purpose

      or new.legal_basis_reference
        is distinct from old.legal_basis_reference

      or new.jurisdiction_country_code
        is distinct from old.jurisdiction_country_code

      or new.retention_period_days
        is distinct from old.retention_period_days

      or new.retention_rule
        is distinct from old.retention_rule

      or new.post_retention_action
        is distinct from old.post_retention_action

      or new.effective_at
        is distinct from old.effective_at

      or new.created_by
        is distinct from old.created_by

    then
      raise exception
        'Active or retired retention policy versions are immutable';
    end if;

  end if;


  if tg_op = 'UPDATE'
     and old.status = 'RETIRED'
     and new.status <> 'RETIRED' then

    raise exception
      'Retired retention policy versions cannot be reactivated';

  end if;


  if new.status = 'ACTIVE'
     and new.effective_at is null then

    new.effective_at = now();

  end if;


  if new.status = 'RETIRED'
     and new.retired_at is null then

    new.retired_at = now();

  end if;


  if new.status <> 'RETIRED' then
    new.retired_at = null;
  end if;


  return new;
end;
$$;


create trigger data_retention_policies_prepare_and_protect
before insert or update
on public.data_retention_policies
for each row
execute function public.prepare_and_protect_retention_policy();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.privacy_requests
  enable row level security;

alter table public.privacy_request_events
  enable row level security;

alter table public.consent_records
  enable row level security;

alter table public.data_retention_policies
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.privacy_requests is
  'Privacy/data-subject request workflow. Final legal outcome is determined by the applicable validated privacy process, not solely by request type.';


comment on table public.privacy_request_events is
  'Append-only operational history for privacy/data-subject requests.';


comment on table public.consent_records is
  'Append-only grant/withdrawal consent evidence, separate from legal-document acceptances.';


comment on table public.data_retention_policies is
  'Versioned data-retention governance configuration. Concrete retention periods are not hard-coded by schema migration.';


commit;