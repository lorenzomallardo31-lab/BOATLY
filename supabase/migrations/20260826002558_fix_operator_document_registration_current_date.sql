-- ============================================================
-- BOATLY
-- Fix: Operator document metadata registration
-- ============================================================
--
-- Fixes incorrect qualification of CURRENT_DATE inside
-- public.register_operator_document_upload().
--
-- CURRENT_DATE is SQL syntax and must not be referenced as
-- pg_catalog.current_date.
--
-- No schema or authorization model changes are introduced.
-- ============================================================

begin;


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
       current_date
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
         current_date
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


commit;