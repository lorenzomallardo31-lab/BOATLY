-- ============================================================
-- BOATLY
-- Migration: Operator Documents Onboarding
-- ============================================================
--
-- Purpose:
--   Build the first private document-upload workflow for
--   professional operators during onboarding.
--
-- Includes:
--
--   - OPERATOR document-type seeds;
--   - private Storage bucket configuration;
--   - Storage RLS authorization;
--   - immutable object paths;
--   - safe cleanup of unregistered/orphan uploads;
--   - trusted operator_documents metadata registration;
--   - replacement/version chain support.
--
-- Storage object mutations are performed through the Supabase
-- Storage API. No application workflow directly inserts into
-- storage.objects.
--
-- ============================================================

begin;


-- ============================================================
-- OPERATOR DOCUMENT TYPES
-- ============================================================
--
-- These are Boatly MVP verification requirements.
--
-- They should not be interpreted as an exhaustive statement of
-- every document legally required from every Italian nautical
-- operator.
-- ============================================================

insert into public.document_types (
  code,
  name,
  description,
  subject_type,
  requires_expiry_date,
  is_active,
  sort_order
)
values

(
  'COMPANY_REGISTRY_EXTRACT',
  'Visura camerale / documento equivalente',
  'Documento utilizzato da Boatly per verificare i dati dell''impresa durante l''onboarding.',
  'OPERATOR'::public.document_subject_type,
  false,
  true,
  10
),

(
  'LEGAL_REPRESENTATIVE_ID',
  'Documento di identità del rappresentante legale',
  'Documento di identità in corso di validità del rappresentante legale indicato nell''onboarding.',
  'OPERATOR'::public.document_subject_type,
  true,
  true,
  20
)

on conflict (
  code,
  subject_type
)
do update
set
  name =
    excluded.name,

  description =
    excluded.description,

  requires_expiry_date =
    excluded.requires_expiry_date,

  is_active =
    excluded.is_active,

  sort_order =
    excluded.sort_order;


-- ============================================================
-- PRIVATE STORAGE BUCKET
-- ============================================================
--
-- Standard upload MVP:
--
--   max file size: 6 MiB
--
-- Allowed:
--
--   PDF
--   JPEG
--   PNG
--
-- Never public.
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'operator-documents',
  'operator-documents',
  false,
  6291456,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]::text[]
)

on conflict (id)
do update
set
  name =
    excluded.name,

  public =
    false,

  file_size_limit =
    excluded.file_size_limit,

  allowed_mime_types =
    excluded.allowed_mime_types;


-- ============================================================
-- UNIQUE STORAGE PATH
-- ============================================================
--
-- One Storage object must never be registered as two different
-- operator_documents rows.
-- ============================================================

create unique index if not exists
  operator_documents_storage_path_unique
on public.operator_documents(storage_path);


-- ============================================================
-- STORAGE AUTHORIZATION HELPER
-- ============================================================
--
-- Expected object path:
--
--   operator_id/document_type_id/random-file.ext
--
-- storage.foldername() therefore yields:
--
--   [operator_id, document_type_id]
--
-- READ:
--   OWNER
--   MANAGER
--   SUPER_ADMIN
--   ADMIN
--   COMPLIANCE
--
-- WRITE during current onboarding:
--   OWNER / MANAGER
--   operator must still be DRAFT
--   document type must be active OPERATOR type
--
-- ============================================================

create or replace function private.can_access_operator_document_storage(
  p_object_name text,
  p_write boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folders text[];
  v_operator_id uuid;
  v_document_type_id uuid;
  v_user_id uuid;
  v_operator_status public.operator_status;
begin

  v_user_id := auth.uid();

  if v_user_id is null
     or p_object_name is null
  then
    return false;
  end if;


  v_folders :=
    storage.foldername(
      p_object_name
    );


  if coalesce(
       pg_catalog.array_length(
         v_folders,
         1
       ),
       0
     ) <> 2
  then
    return false;
  end if;


  select
    o.id,
    o.status
  into
    v_operator_id,
    v_operator_status
  from public.operators o
  where o.id::text =
    v_folders[1]
  limit 1;


  if v_operator_id is null then
    return false;
  end if;


  select dt.id
  into v_document_type_id
  from public.document_types dt
  where dt.id::text =
      v_folders[2]

    and dt.subject_type =
      'OPERATOR'::public.document_subject_type

    and (
      p_write = false
      or dt.is_active = true
    )

  limit 1;


  if v_document_type_id is null then
    return false;
  end if;


  -- ----------------------------------------------------------
  -- WRITE
  -- ----------------------------------------------------------

  if p_write then

    if v_operator_status <>
      'DRAFT'::public.operator_status
    then
      return false;
    end if;


    return exists (
      select 1
      from public.operator_members om
      where om.operator_id =
          v_operator_id

        and om.user_id =
          v_user_id

        and om.status =
          'ACTIVE'::public.operator_member_status

        and om.role in (
          'OWNER'::public.operator_member_role,
          'MANAGER'::public.operator_member_role
        )
    );

  end if;


  -- ----------------------------------------------------------
  -- READ
  -- ----------------------------------------------------------

  return

    exists (
      select 1
      from public.operator_members om
      where om.operator_id =
          v_operator_id

        and om.user_id =
          v_user_id

        and om.status =
          'ACTIVE'::public.operator_member_status

        and om.role in (
          'OWNER'::public.operator_member_role,
          'MANAGER'::public.operator_member_role
        )
    )

    or exists (
      select 1
      from public.platform_user_roles pur
      where pur.user_id =
          v_user_id

        and pur.role in (
          'SUPER_ADMIN'::public.platform_role,
          'ADMIN'::public.platform_role,
          'COMPLIANCE'::public.platform_role
        )
    );

end;
$$;


revoke execute
on function private.can_access_operator_document_storage(
  text,
  boolean
)
from public, anon;


grant execute
on function private.can_access_operator_document_storage(
  text,
  boolean
)
to authenticated;


-- ============================================================
-- UNREGISTERED OBJECT CLEANUP HELPER
-- ============================================================
--
-- Registered documents are immutable from the client.
--
-- DELETE is permitted only when:
--
--   1. user could upload to that path;
--   2. no operator_documents metadata row references it.
--
-- This lets the uploader clean up a Storage object if metadata
-- registration fails, without allowing deletion of historical
-- documents already registered with Boatly.
-- ============================================================

create or replace function private.can_delete_unregistered_operator_document(
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select

    private.can_access_operator_document_storage(
      p_object_name,
      true
    )

    and not exists (
      select 1
      from public.operator_documents od
      where od.storage_path =
        p_object_name
    );

$$;


revoke execute
on function private.can_delete_unregistered_operator_document(
  text
)
from public, anon;


grant execute
on function private.can_delete_unregistered_operator_document(
  text
)
to authenticated;


-- ============================================================
-- STORAGE POLICIES
-- ============================================================

drop policy if exists
  operator_documents_storage_select
on storage.objects;


drop policy if exists
  operator_documents_storage_insert
on storage.objects;


drop policy if exists
  operator_documents_storage_delete_unregistered
on storage.objects;


create policy operator_documents_storage_select
on storage.objects
for select
to authenticated

using (
  bucket_id =
    'operator-documents'

  and private.can_access_operator_document_storage(
    name,
    false
  )
);


create policy operator_documents_storage_insert
on storage.objects
for insert
to authenticated

with check (
  bucket_id =
    'operator-documents'

  and private.can_access_operator_document_storage(
    name,
    true
  )
);


create policy operator_documents_storage_delete_unregistered
on storage.objects
for delete
to authenticated

using (
  bucket_id =
    'operator-documents'

  and private.can_delete_unregistered_operator_document(
    name
  )
);


-- ============================================================
-- TRUSTED METADATA REGISTRATION RPC
-- ============================================================

create or replace function public.register_operator_document_upload(
  p_operator_id uuid,
  p_document_type_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_content_hash_sha256 text,
  p_issued_at date default null,
  p_expires_at date default null,
  p_replaces_document_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_document_id uuid;

  v_original_filename text;
  v_mime_type text;
  v_hash text;

  v_requires_expiry_date boolean;
  v_latest_document_id uuid;

  v_storage_folders text[];
  v_extension text;
begin

  -- ----------------------------------------------------------
  -- AUTHENTICATION
  -- ----------------------------------------------------------

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;


  -- ----------------------------------------------------------
  -- WORKSPACE AUTHORIZATION
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.operator_members om

    join public.operators o
      on o.id =
        om.operator_id

    where om.operator_id =
        p_operator_id

      and om.user_id =
        v_user_id

      and om.role =
        'OWNER'::public.operator_member_role

      and om.status =
        'ACTIVE'::public.operator_member_status

      and o.status =
        'DRAFT'::public.operator_status
  ) then
    raise exception using
      errcode = '42501',
      message = 'operator_document_not_allowed';
  end if;


  -- ----------------------------------------------------------
  -- DOCUMENT TYPE
  -- ----------------------------------------------------------

  select
    dt.requires_expiry_date
  into
    v_requires_expiry_date

  from public.document_types dt

  where dt.id =
      p_document_type_id

    and dt.subject_type =
      'OPERATOR'::public.document_subject_type

    and dt.is_active =
      true;


  if not found then
    raise exception using
      errcode = '22023',
      message = 'invalid_operator_document_type';
  end if;


  -- ----------------------------------------------------------
  -- NORMALIZATION
  -- ----------------------------------------------------------

  v_original_filename :=
    nullif(
      pg_catalog.btrim(
        p_original_filename
      ),
      ''
    );


  v_mime_type :=
    pg_catalog.lower(
      nullif(
        pg_catalog.btrim(
          p_mime_type
        ),
        ''
      )
    );


  v_hash :=
    pg_catalog.lower(
      nullif(
        pg_catalog.btrim(
          p_content_hash_sha256
        ),
        ''
      )
    );


  -- ----------------------------------------------------------
  -- FILE VALIDATION
  -- ----------------------------------------------------------

  if v_original_filename is null
     or pg_catalog.length(
       v_original_filename
     ) > 255
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_original_filename';
  end if;


  if v_mime_type not in (
    'application/pdf',
    'image/jpeg',
    'image/png'
  )
  then
    raise exception using
      errcode = '22023',
      message = 'unsupported_document_mime_type';
  end if;


  if p_file_size_bytes is null
     or p_file_size_bytes <= 0
     or p_file_size_bytes > 6291456
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_document_file_size';
  end if;


  if v_hash is null
     or v_hash !~ '^[a-f0-9]{64}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_document_sha256';
  end if;


  -- ----------------------------------------------------------
  -- DATE VALIDATION
  -- ----------------------------------------------------------

  if p_issued_at is not null
     and p_issued_at >
       pg_catalog.current_date
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_document_issue_date';
  end if;


  if p_expires_at is not null
     and p_issued_at is not null
     and p_expires_at <
       p_issued_at
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_document_expiry_date';
  end if;


  if v_requires_expiry_date
     and (
       p_expires_at is null
       or p_expires_at <
         pg_catalog.current_date
     )
  then
    raise exception using
      errcode = '22023',
      message = 'valid_expiry_date_required';
  end if;


  -- ----------------------------------------------------------
  -- STORAGE PATH VALIDATION
  --
  -- Exactly:
  --
  -- operator_id/document_type_id/file.ext
  -- ----------------------------------------------------------

  v_storage_folders :=
    storage.foldername(
      p_storage_path
    );


  if coalesce(
       pg_catalog.array_length(
         v_storage_folders,
         1
       ),
       0
     ) <> 2

     or v_storage_folders[1] <>
       p_operator_id::text

     or v_storage_folders[2] <>
       p_document_type_id::text

  then
    raise exception using
      errcode = '22023',
      message = 'invalid_operator_document_storage_path';
  end if;


  v_extension :=
    pg_catalog.lower(
      storage.extension(
        p_storage_path
      )
    );


  if (
       v_mime_type = 'application/pdf'
       and v_extension <> 'pdf'
     )

     or (
       v_mime_type = 'image/jpeg'
       and v_extension not in (
         'jpg',
         'jpeg'
       )
     )

     or (
       v_mime_type = 'image/png'
       and v_extension <> 'png'
     )

  then
    raise exception using
      errcode = '22023',
      message = 'document_extension_mismatch';
  end if;


  -- ----------------------------------------------------------
  -- STORAGE OBJECT MUST EXIST
  --
  -- Read-only verification of Storage metadata.
  --
  -- owner_id proves the object was uploaded under the current
  -- authenticated user session.
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from storage.objects so

    where so.bucket_id =
        'operator-documents'

      and so.name =
        p_storage_path

      and so.owner_id =
        v_user_id::text
  )
  then
    raise exception using
      errcode = '22023',
      message = 'storage_object_not_found_or_not_owned';
  end if;


  -- ----------------------------------------------------------
  -- VERSION CHAIN
  --
  -- The newest existing document of this type must be the
  -- document referenced by replaces_document_id.
  -- ----------------------------------------------------------

  select od.id
  into v_latest_document_id

  from public.operator_documents od

  where od.operator_id =
      p_operator_id

    and od.document_type_id =
      p_document_type_id

  order by
    od.created_at desc,
    od.id desc

  limit 1;


  if v_latest_document_id is null then

    if p_replaces_document_id is not null
    then
      raise exception using
        errcode = '22023',
        message = 'unexpected_document_replacement';
    end if;

  else

    if p_replaces_document_id is null
       or p_replaces_document_id <>
         v_latest_document_id
    then
      raise exception using
        errcode = '22023',
        message = 'latest_document_must_be_replaced';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- REGISTER METADATA
  -- ----------------------------------------------------------

  insert into public.operator_documents (
    operator_id,
    document_type_id,
    subject_type,
    storage_path,
    original_filename,
    mime_type,
    file_size_bytes,
    content_hash_sha256,
    issued_at,
    expires_at,
    replaces_document_id,
    uploaded_by
  )
  values (
    p_operator_id,
    p_document_type_id,
    'OPERATOR'::public.document_subject_type,
    p_storage_path,
    v_original_filename,
    v_mime_type,
    p_file_size_bytes,
    v_hash,
    p_issued_at,
    p_expires_at,
    p_replaces_document_id,
    v_user_id
  )

  returning id
  into v_document_id;


  return v_document_id;

end;
$$;


-- ============================================================
-- RPC PRIVILEGES
-- ============================================================

revoke execute
on function public.register_operator_document_upload(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text,
  date,
  date,
  uuid
)
from public, anon;


grant execute
on function public.register_operator_document_upload(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text,
  date,
  date,
  uuid
)
to authenticated;


-- ============================================================
-- REINFORCE RAW METADATA LOCKDOWN
-- ============================================================

revoke insert, update, delete
on table public.operator_documents
from anon, authenticated;


comment on function public.register_operator_document_upload(
  uuid,
  uuid,
  text,
  text,
  text,
  bigint,
  text,
  date,
  date,
  uuid
) is
  'Registers metadata for an authenticated operator document after the object has been uploaded through the private operator-documents Storage bucket.';


commit;