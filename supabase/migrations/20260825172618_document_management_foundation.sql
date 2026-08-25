-- ============================================================
-- BOATLY
-- Migration: Document Management Foundation
-- ============================================================
--
-- Purpose:
--   Create the private document-management foundation for:
--
--   - platform-controlled document taxonomy;
--   - operator documents;
--   - boat documents;
--   - document review and expiration metadata;
--   - immutable uploaded-file identity.
--
-- Files:
--   Actual document binaries live in private Supabase Storage.
--   PostgreSQL stores metadata and integrity hashes only.
--
-- Security:
--   RLS enabled immediately.
--   Policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.document_subject_type as enum (
  'OPERATOR',
  'BOAT',
  'SKIPPER'
);


create type public.document_status as enum (
  'UPLOADED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'REPLACED'
);


-- ============================================================
-- DOCUMENT TYPES
-- ============================================================
--
-- Platform-controlled taxonomy.
--
-- Example future catalog codes:
--
--   COMPANY_REGISTRATION
--   INSURANCE_POLICY
--   BOAT_REGISTRATION
--   SAFETY_CERTIFICATE
--   SKIPPER_LICENSE
--
-- Actual rows will be seeded separately.
-- ============================================================

create table public.document_types (
  id uuid primary key default gen_random_uuid(),

  code text not null,

  name text not null,

  description text,

  subject_type public.document_subject_type not null,

  requires_expiry_date boolean not null default false,

  is_active boolean not null default true,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint document_types_code_format
    check (
      code = upper(code)
      and code ~ '^[A-Z0-9_]+$'
    ),

  constraint document_types_name_not_blank
    check (
      length(trim(name)) > 0
    ),

  constraint document_types_sort_order_non_negative
    check (
      sort_order >= 0
    ),

  constraint document_types_code_subject_unique
    unique (
      code,
      subject_type
    ),

  constraint document_types_id_subject_unique
    unique (
      id,
      subject_type
    )
);


create index document_types_subject_active_idx
  on public.document_types(
    subject_type,
    is_active,
    sort_order
  );


create trigger document_types_set_updated_at
before update on public.document_types
for each row
execute function public.set_updated_at();


-- ============================================================
-- OPERATOR DOCUMENTS
-- ============================================================

create table public.operator_documents (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null
    references public.operators(id)
    on delete cascade,

  document_type_id uuid not null,

  subject_type public.document_subject_type
    not null default 'OPERATOR',

  storage_path text not null,

  original_filename text not null,

  mime_type text not null,

  file_size_bytes bigint not null,

  content_hash_sha256 text not null,

  issued_at date,
  expires_at date,

  status public.document_status
    not null default 'UPLOADED',

  replaces_document_id uuid,

  review_note text,

  uploaded_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint operator_documents_type_fk
    foreign key (
      document_type_id,
      subject_type
    )
    references public.document_types(
      id,
      subject_type
    )
    on delete restrict,

  constraint operator_documents_subject_type
    check (
      subject_type = 'OPERATOR'
    ),

  constraint operator_documents_storage_path_not_blank
    check (
      length(trim(storage_path)) > 0
    ),

  constraint operator_documents_filename_not_blank
    check (
      length(trim(original_filename)) > 0
    ),

  constraint operator_documents_mime_not_blank
    check (
      length(trim(mime_type)) > 0
    ),

  constraint operator_documents_size_positive
    check (
      file_size_bytes > 0
    ),

  constraint operator_documents_hash_format
    check (
      content_hash_sha256 ~ '^[a-f0-9]{64}$'
    ),

  constraint operator_documents_expiry_after_issue
    check (
      issued_at is null
      or expires_at is null
      or expires_at >= issued_at
    ),

  constraint operator_documents_review_note_not_blank
    check (
      review_note is null
      or length(trim(review_note)) > 0
    ),

  constraint operator_documents_review_consistency
    check (
      (
        status in (
          'APPROVED',
          'REJECTED'
        )
        and reviewed_by is not null
        and reviewed_at is not null
      )
      or
      (
        status not in (
          'APPROVED',
          'REJECTED'
        )
      )
    ),

  constraint operator_documents_operator_id_id_unique
    unique (
      operator_id,
      id
    ),

  constraint operator_documents_not_self_replacement
    check (
      replaces_document_id is null
      or replaces_document_id <> id
    )
);


alter table public.operator_documents
  add constraint operator_documents_replacement_fk
  foreign key (
    operator_id,
    replaces_document_id
  )
  references public.operator_documents(
    operator_id,
    id
  )
  on delete restrict;


create index operator_documents_operator_idx
  on public.operator_documents(operator_id);


create index operator_documents_type_idx
  on public.operator_documents(document_type_id);


create index operator_documents_status_idx
  on public.operator_documents(
    operator_id,
    status
  );


create index operator_documents_expiry_idx
  on public.operator_documents(expires_at)
  where expires_at is not null;


create trigger operator_documents_set_updated_at
before update on public.operator_documents
for each row
execute function public.set_updated_at();


-- ============================================================
-- BOAT DOCUMENTS
-- ============================================================

create table public.boat_documents (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  boat_id uuid not null,

  document_type_id uuid not null,

  subject_type public.document_subject_type
    not null default 'BOAT',

  storage_path text not null,

  original_filename text not null,

  mime_type text not null,

  file_size_bytes bigint not null,

  content_hash_sha256 text not null,

  issued_at date,
  expires_at date,

  status public.document_status
    not null default 'UPLOADED',

  replaces_document_id uuid,

  review_note text,

  uploaded_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boat_documents_boat_operator_fk
    foreign key (
      operator_id,
      boat_id
    )
    references public.boats(
      operator_id,
      id
    )
    on delete cascade,

  constraint boat_documents_type_fk
    foreign key (
      document_type_id,
      subject_type
    )
    references public.document_types(
      id,
      subject_type
    )
    on delete restrict,

  constraint boat_documents_subject_type
    check (
      subject_type = 'BOAT'
    ),

  constraint boat_documents_storage_path_not_blank
    check (
      length(trim(storage_path)) > 0
    ),

  constraint boat_documents_filename_not_blank
    check (
      length(trim(original_filename)) > 0
    ),

  constraint boat_documents_mime_not_blank
    check (
      length(trim(mime_type)) > 0
    ),

  constraint boat_documents_size_positive
    check (
      file_size_bytes > 0
    ),

  constraint boat_documents_hash_format
    check (
      content_hash_sha256 ~ '^[a-f0-9]{64}$'
    ),

  constraint boat_documents_expiry_after_issue
    check (
      issued_at is null
      or expires_at is null
      or expires_at >= issued_at
    ),

  constraint boat_documents_review_note_not_blank
    check (
      review_note is null
      or length(trim(review_note)) > 0
    ),

  constraint boat_documents_review_consistency
    check (
      (
        status in (
          'APPROVED',
          'REJECTED'
        )
        and reviewed_by is not null
        and reviewed_at is not null
      )
      or
      (
        status not in (
          'APPROVED',
          'REJECTED'
        )
      )
    ),

  constraint boat_documents_operator_boat_id_unique
    unique (
      operator_id,
      boat_id,
      id
    ),

  constraint boat_documents_not_self_replacement
    check (
      replaces_document_id is null
      or replaces_document_id <> id
    )
);


alter table public.boat_documents
  add constraint boat_documents_replacement_fk
  foreign key (
    operator_id,
    boat_id,
    replaces_document_id
  )
  references public.boat_documents(
    operator_id,
    boat_id,
    id
  )
  on delete restrict;


create index boat_documents_operator_idx
  on public.boat_documents(operator_id);


create index boat_documents_boat_idx
  on public.boat_documents(boat_id);


create index boat_documents_type_idx
  on public.boat_documents(document_type_id);


create index boat_documents_status_idx
  on public.boat_documents(
    boat_id,
    status
  );


create index boat_documents_expiry_idx
  on public.boat_documents(expires_at)
  where expires_at is not null;


create trigger boat_documents_set_updated_at
before update on public.boat_documents
for each row
execute function public.set_updated_at();


-- ============================================================
-- FILE ARTIFACT IMMUTABILITY
-- ============================================================
--
-- A different file must become a NEW document row.
--
-- Review status and review metadata may evolve, but the uploaded
-- artifact itself cannot silently be replaced in-place.
-- ============================================================

create or replace function public.protect_operator_document_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if
    new.operator_id
      is distinct from old.operator_id

    or new.document_type_id
      is distinct from old.document_type_id

    or new.subject_type
      is distinct from old.subject_type

    or new.storage_path
      is distinct from old.storage_path

    or new.original_filename
      is distinct from old.original_filename

    or new.mime_type
      is distinct from old.mime_type

    or new.file_size_bytes
      is distinct from old.file_size_bytes

    or new.content_hash_sha256
      is distinct from old.content_hash_sha256

    or new.uploaded_by
      is distinct from old.uploaded_by

    or new.replaces_document_id
      is distinct from old.replaces_document_id

  then
    raise exception
      'Uploaded operator document artifact identity is immutable';
  end if;


  return new;
end;
$$;


create trigger operator_documents_protect_identity
before update
on public.operator_documents
for each row
execute function public.protect_operator_document_identity();


create or replace function public.protect_boat_document_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if
    new.operator_id
      is distinct from old.operator_id

    or new.boat_id
      is distinct from old.boat_id

    or new.document_type_id
      is distinct from old.document_type_id

    or new.subject_type
      is distinct from old.subject_type

    or new.storage_path
      is distinct from old.storage_path

    or new.original_filename
      is distinct from old.original_filename

    or new.mime_type
      is distinct from old.mime_type

    or new.file_size_bytes
      is distinct from old.file_size_bytes

    or new.content_hash_sha256
      is distinct from old.content_hash_sha256

    or new.uploaded_by
      is distinct from old.uploaded_by

    or new.replaces_document_id
      is distinct from old.replaces_document_id

  then
    raise exception
      'Uploaded boat document artifact identity is immutable';
  end if;


  return new;
end;
$$;


create trigger boat_documents_protect_identity
before update
on public.boat_documents
for each row
execute function public.protect_boat_document_identity();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.document_types
  enable row level security;

alter table public.operator_documents
  enable row level security;

alter table public.boat_documents
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.document_types is
  'Boatly-controlled taxonomy of compliance/document types. Actual catalog rows are seeded separately.';


comment on table public.operator_documents is
  'Private operator-document metadata. Actual files live in private Supabase Storage.';


comment on table public.boat_documents is
  'Private boat-document metadata. Actual files live in private Supabase Storage.';


commit;