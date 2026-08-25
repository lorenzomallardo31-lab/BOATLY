-- ============================================================
-- BOATLY
-- Migration: Staff & Skipper Foundation
-- ============================================================
--
-- Purpose:
--   Create operational staff/skipper structures for:
--
--   - operator staff profiles;
--   - skipper-specific profiles;
--   - skipper compliance documents;
--   - skipper assignment to bookings.
--
-- Important:
--   A skipper assignment is operational information.
--   It must never be used by itself to infer the legal
--   classification of the booking/offering.
--
-- Security:
--   RLS enabled immediately.
--   Authorization policies remain deferred to C6.
-- ============================================================

begin;


-- ============================================================
-- SUPPORT ROLE-AWARE MEMBERSHIP FK
-- ============================================================

alter table public.operator_members
  add constraint operator_members_operator_user_role_key
  unique (
    operator_id,
    user_id,
    role
  );


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.skipper_assignment_status as enum (
  'ASSIGNED',
  'CONFIRMED',
  'DECLINED',
  'REMOVED'
);


-- ============================================================
-- OPERATOR STAFF PROFILES
-- ============================================================
--
-- Operational metadata for a user belonging to an operator.
--
-- Authentication remains in auth.users.
-- Authorization remains in operator_members.
-- ============================================================

create table public.operator_staff_profiles (
  operator_id uuid not null,

  user_id uuid not null,

  display_name text not null,

  phone text,
  job_title text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    operator_id,
    user_id
  ),

  constraint operator_staff_profiles_membership_fk
    foreign key (
      operator_id,
      user_id
    )
    references public.operator_members(
      operator_id,
      user_id
    )
    on delete cascade,

  constraint operator_staff_profiles_display_name_not_blank
    check (
      length(trim(display_name)) > 0
    ),

  constraint operator_staff_profiles_phone_not_blank
    check (
      phone is null
      or length(trim(phone)) > 0
    ),

  constraint operator_staff_profiles_job_title_not_blank
    check (
      job_title is null
      or length(trim(job_title)) > 0
    ),

  constraint operator_staff_profiles_notes_not_blank
    check (
      notes is null
      or length(trim(notes)) > 0
    )
);


create index operator_staff_profiles_user_idx
  on public.operator_staff_profiles(user_id);


create trigger operator_staff_profiles_set_updated_at
before update on public.operator_staff_profiles
for each row
execute function public.set_updated_at();


-- ============================================================
-- SKIPPER PROFILES
-- ============================================================
--
-- Exists only for an operator member whose role is SKIPPER.
--
-- Legal/licence evidence belongs in skipper_documents rather
-- than being reduced to an unverified boolean field.
-- ============================================================

create table public.skipper_profiles (
  operator_id uuid not null,

  user_id uuid not null,

  member_role public.operator_member_role
    not null default 'SKIPPER',

  professional_name text,

  bio text,

  languages text[],

  years_experience smallint,

  is_bookable boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    operator_id,
    user_id
  ),

  constraint skipper_profiles_staff_fk
    foreign key (
      operator_id,
      user_id
    )
    references public.operator_staff_profiles(
      operator_id,
      user_id
    )
    on delete cascade,

  constraint skipper_profiles_membership_role_fk
    foreign key (
      operator_id,
      user_id,
      member_role
    )
    references public.operator_members(
      operator_id,
      user_id,
      role
    )
    on delete restrict,

  constraint skipper_profiles_role
    check (
      member_role = 'SKIPPER'
    ),

  constraint skipper_profiles_professional_name_not_blank
    check (
      professional_name is null
      or length(trim(professional_name)) > 0
    ),

  constraint skipper_profiles_bio_not_blank
    check (
      bio is null
      or length(trim(bio)) > 0
    ),

  constraint skipper_profiles_years_non_negative
    check (
      years_experience is null
      or years_experience >= 0
    ),

  constraint skipper_profiles_languages_non_empty
    check (
      languages is null
      or cardinality(languages) > 0
    )
);


create index skipper_profiles_bookable_idx
  on public.skipper_profiles(
    operator_id,
    is_bookable
  );


create trigger skipper_profiles_set_updated_at
before update on public.skipper_profiles
for each row
execute function public.set_updated_at();


-- ============================================================
-- SKIPPER DOCUMENTS
-- ============================================================
--
-- Actual files remain in private Supabase Storage.
-- ============================================================

create table public.skipper_documents (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  skipper_user_id uuid not null,

  document_type_id uuid not null,

  subject_type public.document_subject_type
    not null default 'SKIPPER',

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

  constraint skipper_documents_skipper_fk
    foreign key (
      operator_id,
      skipper_user_id
    )
    references public.skipper_profiles(
      operator_id,
      user_id
    )
    on delete cascade,

  constraint skipper_documents_type_fk
    foreign key (
      document_type_id,
      subject_type
    )
    references public.document_types(
      id,
      subject_type
    )
    on delete restrict,

  constraint skipper_documents_subject_type
    check (
      subject_type = 'SKIPPER'
    ),

  constraint skipper_documents_storage_path_not_blank
    check (
      length(trim(storage_path)) > 0
    ),

  constraint skipper_documents_filename_not_blank
    check (
      length(trim(original_filename)) > 0
    ),

  constraint skipper_documents_mime_not_blank
    check (
      length(trim(mime_type)) > 0
    ),

  constraint skipper_documents_size_positive
    check (
      file_size_bytes > 0
    ),

  constraint skipper_documents_hash_format
    check (
      content_hash_sha256 ~ '^[a-f0-9]{64}$'
    ),

  constraint skipper_documents_expiry_after_issue
    check (
      issued_at is null
      or expires_at is null
      or expires_at >= issued_at
    ),

  constraint skipper_documents_review_note_not_blank
    check (
      review_note is null
      or length(trim(review_note)) > 0
    ),

  constraint skipper_documents_review_consistency
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

  constraint skipper_documents_operator_skipper_id_unique
    unique (
      operator_id,
      skipper_user_id,
      id
    ),

  constraint skipper_documents_not_self_replacement
    check (
      replaces_document_id is null
      or replaces_document_id <> id
    )
);


alter table public.skipper_documents
  add constraint skipper_documents_replacement_fk
  foreign key (
    operator_id,
    skipper_user_id,
    replaces_document_id
  )
  references public.skipper_documents(
    operator_id,
    skipper_user_id,
    id
  )
  on delete restrict;


create index skipper_documents_operator_idx
  on public.skipper_documents(operator_id);


create index skipper_documents_skipper_idx
  on public.skipper_documents(skipper_user_id);


create index skipper_documents_type_idx
  on public.skipper_documents(document_type_id);


create index skipper_documents_expiry_idx
  on public.skipper_documents(expires_at)
  where expires_at is not null;


create index skipper_documents_status_idx
  on public.skipper_documents(
    operator_id,
    status
  );


create trigger skipper_documents_set_updated_at
before update on public.skipper_documents
for each row
execute function public.set_updated_at();


-- ============================================================
-- SKIPPER DOCUMENT ARTIFACT IMMUTABILITY
-- ============================================================

create or replace function public.protect_skipper_document_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  if
    new.operator_id
      is distinct from old.operator_id

    or new.skipper_user_id
      is distinct from old.skipper_user_id

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
      'Uploaded skipper document artifact identity is immutable';
  end if;


  return new;
end;
$$;


create trigger skipper_documents_protect_identity
before update
on public.skipper_documents
for each row
execute function public.protect_skipper_document_identity();


-- ============================================================
-- BOOKING SKIPPER ASSIGNMENTS
-- ============================================================
--
-- Operational assignment of a skipper to a booking.
--
-- This table does NOT determine the booking's legal offering.
-- ============================================================

create table public.booking_skipper_assignments (
  id uuid primary key default gen_random_uuid(),

  operator_id uuid not null,

  booking_id uuid not null,

  skipper_user_id uuid not null,

  status public.skipper_assignment_status
    not null default 'ASSIGNED',

  notes text,

  assigned_by uuid
    references auth.users(id)
    on delete set null,

  assigned_at timestamptz not null default now(),

  responded_at timestamptz,

  removed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint booking_skipper_assignments_booking_fk
    foreign key (
      operator_id,
      booking_id
    )
    references public.bookings(
      operator_id,
      id
    )
    on delete cascade,

  constraint booking_skipper_assignments_skipper_fk
    foreign key (
      operator_id,
      skipper_user_id
    )
    references public.skipper_profiles(
      operator_id,
      user_id
    )
    on delete restrict,

  constraint booking_skipper_assignments_notes_not_blank
    check (
      notes is null
      or length(trim(notes)) > 0
    ),

  constraint booking_skipper_assignments_response_consistency
    check (
      status not in (
        'CONFIRMED',
        'DECLINED'
      )
      or responded_at is not null
    ),

  constraint booking_skipper_assignments_removed_consistency
    check (
      (
        status = 'REMOVED'
        and removed_at is not null
      )
      or
      (
        status <> 'REMOVED'
        and removed_at is null
      )
    )
);


create index booking_skipper_assignments_booking_idx
  on public.booking_skipper_assignments(booking_id);


create index booking_skipper_assignments_skipper_idx
  on public.booking_skipper_assignments(skipper_user_id);


create index booking_skipper_assignments_status_idx
  on public.booking_skipper_assignments(status);


create unique index booking_skipper_assignments_one_active_idx
  on public.booking_skipper_assignments(booking_id)
  where status in (
    'ASSIGNED',
    'CONFIRMED'
  );


create trigger booking_skipper_assignments_set_updated_at
before update on public.booking_skipper_assignments
for each row
execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.operator_staff_profiles
  enable row level security;

alter table public.skipper_profiles
  enable row level security;

alter table public.skipper_documents
  enable row level security;

alter table public.booking_skipper_assignments
  enable row level security;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.operator_staff_profiles is
  'Operational staff metadata layered on operator membership and authorization.';


comment on table public.skipper_profiles is
  'Operator-specific skipper profile. Licence/compliance evidence is stored separately in skipper_documents.';


comment on table public.skipper_documents is
  'Private skipper compliance-document metadata. Actual files live in private Storage.';


comment on table public.booking_skipper_assignments is
  'Operational skipper assignment to a booking. Assignment does not infer or alter the booking legal offering.';


commit;