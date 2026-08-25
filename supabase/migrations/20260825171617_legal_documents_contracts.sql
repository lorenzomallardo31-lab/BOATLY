-- ============================================================
-- BOATLY
-- Migration: Legal Documents & Contracts
-- ============================================================
--
-- Purpose:
--   Preserve versioned legal documents, explicit user
--   acceptances and immutable booking-contract artifacts.
--
-- Principles:
--   - historical document versions are never overwritten;
--   - acceptance always references an exact document version;
--   - booking contracts preserve immutable artifacts;
--   - private contract files live in Supabase Storage, not DB.
--
-- Security:
--   RLS enabled immediately.
--   Authorization policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.legal_document_audience as enum (
  'CUSTOMER',
  'OPERATOR',
  'BOTH'
);


create type public.legal_document_status as enum (
  'DRAFT',
  'PUBLISHED',
  'RETIRED'
);


create type public.legal_acceptance_context as enum (
  'ACCOUNT',
  'OPERATOR_ONBOARDING',
  'BOOKING',
  'OTHER'
);


create type public.booking_contract_status as enum (
  'GENERATED',
  'FINAL'
);


-- ============================================================
-- LEGAL DOCUMENT VERSIONS
-- ============================================================
--
-- document_key is an extensible stable identifier such as:
--
--   CUSTOMER_TERMS
--   OPERATOR_TERMS
--   PRIVACY_POLICY
--   BOOKING_TERMS
--
-- We deliberately use a controlled text code instead of a
-- PostgreSQL enum so new legal documents do not require an enum
-- migration.
-- ============================================================

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),

  document_key text not null,

  version text not null,

  title text not null,

  audience public.legal_document_audience not null,

  jurisdiction_country_code text,

  language_code text not null default 'it',

  status public.legal_document_status not null default 'DRAFT',

  content_hash_sha256 text not null,

  storage_path text,

  effective_at timestamptz,

  published_at timestamptz,
  retired_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint legal_document_versions_key_format
    check (
      document_key = upper(document_key)
      and document_key ~ '^[A-Z0-9_]+$'
    ),

  constraint legal_document_versions_version_not_blank
    check (
      length(trim(version)) > 0
    ),

  constraint legal_document_versions_title_not_blank
    check (
      length(trim(title)) > 0
    ),

  constraint legal_document_versions_country_code_format
    check (
      jurisdiction_country_code is null
      or (
        jurisdiction_country_code =
          upper(jurisdiction_country_code)
        and length(jurisdiction_country_code) = 2
      )
    ),

  constraint legal_document_versions_language_not_blank
    check (
      length(trim(language_code)) > 0
    ),

  constraint legal_document_versions_hash_format
    check (
      content_hash_sha256 ~ '^[a-f0-9]{64}$'
    ),

  constraint legal_document_versions_storage_path_not_blank
    check (
      storage_path is null
      or length(trim(storage_path)) > 0
    ),

  constraint legal_document_versions_publish_consistency
    check (
      (
        status = 'DRAFT'
      )
      or
      (
        status in ('PUBLISHED', 'RETIRED')
        and published_at is not null
        and effective_at is not null
      )
    ),

  constraint legal_document_versions_retired_consistency
    check (
      (
        status <> 'RETIRED'
        and retired_at is null
      )
      or
      (
        status = 'RETIRED'
        and retired_at is not null
      )
    )
);


create unique index legal_document_versions_key_version_idx
  on public.legal_document_versions(
    document_key,
    version,
    language_code,
    coalesce(
      jurisdiction_country_code,
      ''
    )
  );


create index legal_document_versions_lookup_idx
  on public.legal_document_versions(
    document_key,
    status,
    effective_at
  );


create index legal_document_versions_audience_idx
  on public.legal_document_versions(audience);


comment on table public.legal_document_versions is
  'Immutable version records for Boatly legal documents and customer/operator disclosures.';


-- ============================================================
-- LEGAL DOCUMENT VERSION IMMUTABILITY
-- ============================================================
--
-- Draft metadata may evolve before publication.
--
-- Once a version has been published, its substantive identity
-- and hash cannot be rewritten. A changed document requires a
-- NEW version.
-- ============================================================

create or replace function public.protect_published_legal_document()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if old.status in ('PUBLISHED', 'RETIRED') then

    if
      new.document_key
        is distinct from old.document_key

      or new.version
        is distinct from old.version

      or new.title
        is distinct from old.title

      or new.audience
        is distinct from old.audience

      or new.jurisdiction_country_code
        is distinct from old.jurisdiction_country_code

      or new.language_code
        is distinct from old.language_code

      or new.content_hash_sha256
        is distinct from old.content_hash_sha256

      or new.storage_path
        is distinct from old.storage_path

      or new.effective_at
        is distinct from old.effective_at

      or new.published_at
        is distinct from old.published_at

      or new.created_by
        is distinct from old.created_by

    then
      raise exception
        'Published legal document versions are immutable';
    end if;

  end if;


  if old.status = 'RETIRED'
     and new.status <> 'RETIRED' then

    raise exception
      'Retired legal document versions cannot be reactivated';

  end if;


  return new;
end;
$$;


create trigger legal_document_versions_protect_published
before update
on public.legal_document_versions
for each row
execute function public.protect_published_legal_document();


-- ============================================================
-- LEGAL ACCEPTANCES
-- ============================================================
--
-- Immutable evidence that a specific user accepted a specific
-- legal document version.
--
-- booking_id is populated when the acceptance belongs to a
-- booking-specific flow.
--
-- operator_id may identify the relevant operator workspace.
--
-- Privacy-sensitive request metadata is minimized.
-- ============================================================

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),

  legal_document_version_id uuid not null
    references public.legal_document_versions(id)
    on delete restrict,

  user_id uuid not null
    references auth.users(id)
    on delete restrict,

  context public.legal_acceptance_context not null,

  operator_id uuid
    references public.operators(id)
    on delete restrict,

  booking_id uuid
    references public.bookings(id)
    on delete restrict,

  acceptance_text_snapshot text,

  evidence jsonb not null default '{}'::jsonb,

  accepted_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint legal_acceptances_text_not_blank
    check (
      acceptance_text_snapshot is null
      or length(trim(acceptance_text_snapshot)) > 0
    ),

  constraint legal_acceptances_evidence_object
    check (
      jsonb_typeof(evidence) = 'object'
    ),

  constraint legal_acceptances_booking_context
    check (
      (
        context = 'BOOKING'
        and booking_id is not null
      )
      or
      (
        context <> 'BOOKING'
      )
    )
);


create index legal_acceptances_user_id_idx
  on public.legal_acceptances(user_id);


create index legal_acceptances_document_version_idx
  on public.legal_acceptances(
    legal_document_version_id
  );


create index legal_acceptances_booking_id_idx
  on public.legal_acceptances(booking_id)
  where booking_id is not null;


create index legal_acceptances_operator_id_idx
  on public.legal_acceptances(operator_id)
  where operator_id is not null;


create unique index legal_acceptances_unique_evidence_idx
  on public.legal_acceptances(
    legal_document_version_id,
    user_id,
    context,
    coalesce(operator_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );


-- ============================================================
-- LEGAL ACCEPTANCES ARE APPEND-ONLY
-- ============================================================

create or replace function public.prevent_legal_acceptance_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'Legal acceptances are append-only';
end;
$$;


create trigger legal_acceptances_prevent_mutation
before update or delete
on public.legal_acceptances
for each row
execute function public.prevent_legal_acceptance_mutation();


-- ============================================================
-- BOOKING CONTRACTS
-- ============================================================
--
-- Immutable generated booking contract artifacts.
--
-- Actual files are stored in the private booking-contracts
-- Storage bucket.
--
-- Multiple versions can exist during generation, but once a
-- contract is FINAL it cannot be altered.
-- ============================================================

create table public.booking_contracts (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  contract_type text not null,

  version_number integer not null default 1,

  status public.booking_contract_status not null
    default 'GENERATED',

  storage_path text not null,

  content_hash_sha256 text not null,

  metadata jsonb not null default '{}'::jsonb,

  generated_at timestamptz not null default now(),

  finalized_at timestamptz,

  generated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint booking_contracts_booking_operator_fk
    foreign key (
      operator_id,
      booking_id
    )
    references public.bookings(
      operator_id,
      id
    )
    on delete restrict,

  constraint booking_contracts_type_format
    check (
      contract_type = upper(contract_type)
      and contract_type ~ '^[A-Z0-9_]+$'
    ),

  constraint booking_contracts_version_positive
    check (
      version_number > 0
    ),

  constraint booking_contracts_storage_path_not_blank
    check (
      length(trim(storage_path)) > 0
    ),

  constraint booking_contracts_hash_format
    check (
      content_hash_sha256 ~ '^[a-f0-9]{64}$'
    ),

  constraint booking_contracts_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    ),

  constraint booking_contracts_final_consistency
    check (
      (
        status = 'GENERATED'
        and finalized_at is null
      )
      or
      (
        status = 'FINAL'
        and finalized_at is not null
      )
    )
);


create unique index booking_contracts_booking_type_version_idx
  on public.booking_contracts(
    booking_id,
    contract_type,
    version_number
  );


create index booking_contracts_booking_id_idx
  on public.booking_contracts(booking_id);


create index booking_contracts_operator_id_idx
  on public.booking_contracts(operator_id);


create unique index booking_contracts_one_final_type_idx
  on public.booking_contracts(
    booking_id,
    contract_type
  )
  where status = 'FINAL';


-- ============================================================
-- CONTRACT FINALIZATION / IMMUTABILITY
-- ============================================================

create or replace function public.protect_booking_contract()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if old.status = 'FINAL' then
    raise exception
      'Final booking contracts are immutable';
  end if;


  if new.status = 'FINAL'
     and new.finalized_at is null then
    new.finalized_at = now();
  end if;


  return new;
end;
$$;


create trigger booking_contracts_protect
before update
on public.booking_contracts
for each row
execute function public.protect_booking_contract();


-- ============================================================
-- RLS
-- ============================================================

alter table public.legal_document_versions
  enable row level security;

alter table public.legal_acceptances
  enable row level security;

alter table public.booking_contracts
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.legal_acceptances is
  'Append-only evidence that a user accepted a specific immutable legal-document version.';


comment on table public.booking_contracts is
  'Generated booking-contract artifact metadata. Final contracts are immutable and files live in private Storage.';


commit;